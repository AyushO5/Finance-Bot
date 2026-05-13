from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from services.lm_service import get_ai_response
import threading

chat_bp = Blueprint("chat", __name__)

MAX_MESSAGE_LENGTH = 1000  # characters
MAX_HISTORY_MESSAGES = 50  # number of messages


def _async_judge(original_input: str, reply: str):
    """Fix #8: Run llm_judge quality scoring in background — doesn't block the response."""
    try:
        from services.llm_judge import judge_response
        from utils.memory import log_quality_score
        score = judge_response(original_input, reply)
        log_quality_score(original_input, score)
        print(f"[Judge] verdict={score.get('verdict')} overall={score.get('overall')}")
    except Exception as e:
        print(f"[Judge] Failed: {e}")


@chat_bp.route("/", methods=["POST"])
@jwt_required()
def chat():
    uid = int(get_jwt_identity())
    # ── Rate limit: 30 chat messages per minute per IP ── #
    limiter = current_app.limiter
    limiter.limit("30 per minute")(lambda: None)()

    data = request.get_json(silent=True)

    if not data:
        return jsonify({"error": "Invalid request. Expected JSON body."}), 400

    # Fix #3: Keep original input for DB storage
    original_input = data.get("message", "").strip()
    history = data.get("history", [])
    profile = data.get("profile", {})
    insights = data.get("insights", "")

    if not original_input:
        return jsonify({"error": "Message is required and cannot be empty."}), 400

    if len(original_input) > MAX_MESSAGE_LENGTH:
        return jsonify({
            "error": f"Message too long. Maximum {MAX_MESSAGE_LENGTH} characters allowed (got {len(original_input)})."
        }), 400

    if not isinstance(history, list):
        return jsonify({"error": "History must be a list."}), 400

    if len(history) > MAX_HISTORY_MESSAGES:
        history = history[-MAX_HISTORY_MESSAGES:]

    for item in history:
        if not isinstance(item, dict) or "role" not in item or "content" not in item:
            return jsonify({"error": "Each history item must have 'role' and 'content' fields."}), 400
        if item["role"] not in ("user", "assistant"):
            return jsonify({"error": "History role must be 'user' or 'assistant'."}), 400

    if not isinstance(profile, dict):
        profile = {}

    # Fix #3: Use a separate variable for the LLM prompt rewrite — never overwrite original_input
    llm_input = original_input
    if len(original_input.split()) <= 3:
        llm_input = f"User said: '{original_input}'. Continue the previous conversation appropriately."

    from flask import Response, stream_with_context
    import json

    @stream_with_context
    def generate():
        full_reply = ""
        extra = {}
        
        try:
            # get_ai_response now yields json strings
            for chunk_str in get_ai_response(llm_input, history, profile, insights):
                try:
                    chunk = json.loads(chunk_str)
                    if chunk["type"] == "text":
                        full_reply += chunk.get("text", "")
                    elif chunk["type"] == "extra":
                        extra = chunk.get("data", {})
                except:
                    pass
                yield chunk_str
        finally:
            from utils.memory import load_memory, save_single_chat, get_current_chat, get_chat_title, update_profile, save_profile
            memory = load_memory(user_id=uid)
            current_chat = get_current_chat(memory)

            current_chat["messages"].append({"role": "user", "content": original_input})
            current_chat["messages"].append({"role": "assistant", "content": full_reply.strip(), "extra": extra})

            if current_chat.get("title", "New Chat") == "New Chat":
                current_chat["title"] = get_chat_title(current_chat)

            save_single_chat(current_chat["id"], current_chat["title"], current_chat["messages"], user_id=uid)

            updated_profile = update_profile(original_input, memory.get("profile", {}))
            save_profile(updated_profile)

            threading.Thread(target=_async_judge, args=(original_input, full_reply.strip()), daemon=True).start()

    return Response(generate(), mimetype='application/x-ndjson')