from flask import Blueprint, jsonify, request, Response
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils.memory import (
    load_memory, save_memory, create_new_chat, delete_chat,
    switch_chat, load_goals, add_goal, update_goal_saved, delete_goal
)

memory_bp = Blueprint("memory", __name__)


def _uid():
    """Extract integer user_id from JWT token, default to 1 if unauthenticated."""
    try:
        return int(get_jwt_identity())
    except Exception:
        return 1


@memory_bp.route("/", methods=["GET"])
@jwt_required()
def get_memory():
    uid = _uid()
    memory = load_memory(user_id=uid)
    goals = load_goals(user_id=uid)
    return jsonify({"memory": memory, "goals": goals})


@memory_bp.route("/expenses", methods=["GET"])
@jwt_required()
def get_expenses():
    from utils.memory import load_expenses_by_range
    uid = _uid()
    range_param = request.args.get("range", "month")
    data = load_expenses_by_range(range_param, user_id=uid)
    return jsonify({"success": True, "data": data, "range": range_param})


@memory_bp.route("/expenses/summary", methods=["GET"])
@jwt_required()
def get_expenses_summary():
    """Generate an AI insight comparing this month vs last month spending."""
    import sqlite3
    from utils.memory import init_db, DB_FILE
    import cohere, os
    uid = _uid()
    init_db()
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    # Current month totals
    c.execute("""
        SELECT category, SUM(amount) FROM expenses
        WHERE user_id=? AND strftime('%Y-%m', date) = strftime('%Y-%m', 'now')
        GROUP BY category
    """, (uid,))
    current = {row[0]: row[1] for row in c.fetchall()}
    # Last month totals
    c.execute("""
        SELECT category, SUM(amount) FROM expenses
        WHERE user_id=? AND strftime('%Y-%m', date) = strftime('%Y-%m', date('now', '-1 month'))
        GROUP BY category
    """, (uid,))
    last = {row[0]: row[1] for row in c.fetchall()}
    conn.close()

    if not current and not last:
        return jsonify({"insight": None})

    # Build a diff string for Cohere
    all_cats = set(list(current.keys()) + list(last.keys()))
    lines = []
    for cat in all_cats:
        cur_amt = current.get(cat, 0)
        lst_amt = last.get(cat, 0)
        if lst_amt > 0:
            change = ((cur_amt - lst_amt) / lst_amt) * 100
            direction = "more" if change > 0 else "less"
            lines.append(f"{cat}: ₹{cur_amt:.0f} this month vs ₹{lst_amt:.0f} last month ({abs(change):.0f}% {direction})")
        else:
            lines.append(f"{cat}: ₹{cur_amt:.0f} this month (new category)")

    summary_text = "\n".join(lines)

    try:
        co = cohere.Client(os.getenv("COHERE_API_KEY"))
        prompt = f"""You are a financial advisor. Here is a user's spending comparison:

{summary_text}

Give 2 short, direct, actionable sentences analyzing the key change and one recommendation. No bullet points, no headers. Be specific with numbers."""
        response = co.chat(model="command-r-plus-08-2024", message=prompt, temperature=0.3)
        insight = response.text.strip()
    except Exception as e:
        insight = f"This month's top category: {max(current, key=current.get) if current else 'N/A'}."

    return jsonify({"insight": insight, "current": current, "last": last})


@memory_bp.route("/chats/new", methods=["POST"])
@jwt_required()
def new_chat():
    uid = _uid()
    memory = load_memory(user_id=uid)
    memory = create_new_chat(memory)
    save_memory(memory, user_id=uid)
    return jsonify({"success": True, "memory": memory})


@memory_bp.route("/chats/<int:chat_id>", methods=["DELETE"])
@jwt_required()
def remove_chat(chat_id):
    uid = _uid()
    memory = load_memory(user_id=uid)
    memory = delete_chat(memory, chat_id)
    save_memory(memory, user_id=uid)
    return jsonify({"success": True, "memory": memory})


@memory_bp.route("/chats/switch", methods=["POST"])
@jwt_required()
def change_chat():
    uid = _uid()
    data = request.json
    chat_id = data.get("chat_id")
    memory = load_memory(user_id=uid)
    memory = switch_chat(memory, chat_id)
    save_memory(memory, user_id=uid)
    return jsonify({"success": True, "memory": memory})


@memory_bp.route("/chats/<int:chat_id>/export", methods=["GET"])
@jwt_required()
def export_chat(chat_id):
    uid = _uid()
    fmt = request.args.get("format", "txt")
    memory = load_memory(user_id=uid)
    chat = next((c for c in memory["chats"] if c["id"] == chat_id), None)
    if not chat:
        return jsonify({"error": "Chat not found"}), 404

    from utils.export import export_chat_to_pdf, export_chat_to_text
    title = chat.get("title", f"Chat {chat_id}")

    if fmt == "pdf":
        pdf_bytes = export_chat_to_pdf(chat["messages"], title=title)
        return Response(pdf_bytes, mimetype="application/pdf",
                        headers={"Content-Disposition": f"attachment; filename=chat_{chat_id}.pdf"})
    else:
        text = export_chat_to_text(chat["messages"], title=title)
        return Response(text, mimetype="text/plain",
                        headers={"Content-Disposition": f"attachment; filename=chat_{chat_id}.txt"})


@memory_bp.route("/goals", methods=["POST"])
@jwt_required()
def create_goal():
    uid = _uid()
    data = request.json
    add_goal(data["name"], data["target"], data.get("currency", "₹"), data.get("deadline", None), user_id=uid)
    return jsonify({"success": True, "goals": load_goals(user_id=uid)})


@memory_bp.route("/goals/<int:goal_id>", methods=["PUT"])
@jwt_required()
def update_goal(goal_id):
    uid = _uid()
    data = request.json
    update_goal_saved(goal_id, data["saved"])
    return jsonify({"success": True, "goals": load_goals(user_id=uid)})


@memory_bp.route("/goals/<int:goal_id>", methods=["DELETE"])
@jwt_required()
def remove_goal(goal_id):
    uid = _uid()
    delete_goal(goal_id)
    return jsonify({"success": True, "goals": load_goals(user_id=uid)})
