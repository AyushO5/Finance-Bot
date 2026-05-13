from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils.csv_parser import parse_csv
from utils.image_parser import parse_image
from utils.pdf_parser import parse_pdf
from utils.expense_analyzer import analyze_expenses
from services.expense_ai_service import generate_ai_insights, extract_expenses_from_ocr

upload_bp = Blueprint("upload", __name__)

ALLOWED_EXTENSIONS = {'.csv', '.png', '.jpg', '.jpeg', '.pdf'}
MAX_CSV_ROWS = 1000

@upload_bp.route("/", methods=["POST"])
@jwt_required()
def upload():
    uid = int(get_jwt_identity())
    # ── Rate limit: 10 uploads per minute per IP ── #
    limiter = current_app.limiter
    limiter.limit("10 per minute")(lambda: None)()

    # ── Validation: File must be present ── #
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded. Please attach a CSV or image file."}), 400

    file = request.files["file"]

    # ── Validation: File must have a name ── #
    if not file.filename or file.filename.strip() == "":
        return jsonify({"error": "Uploaded file has no filename."}), 400

    filename = file.filename.lower().strip()

    # ── Validation: Check file extension ── #
    ext = next((e for e in ALLOWED_EXTENSIONS if filename.endswith(e)), None)
    if not ext:
        return jsonify({
            "error": f"Unsupported file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        }), 415

    try:
        if ext in ('.png', '.jpg', '.jpeg'):
            # ── Image/OCR path ── #
            raw_text = parse_image(file)

            if not raw_text or len(raw_text.strip()) < 10:
                return jsonify({
                    "error": "Could not read text from the image. Please upload a clearer photo of the receipt."
                }), 400

            expenses = extract_expenses_from_ocr(raw_text)

            if not expenses:
                return jsonify({
                    "error": "Could not extract expense categories from the image. Ensure the receipt shows item names and prices."
                }), 400

        elif ext == '.pdf':
            # ── PDF path ── #
            raw_text = parse_pdf(file)

            if not raw_text or len(raw_text.strip()) < 10:
                return jsonify({
                    "error": "Could not read text from the PDF. It might be a scanned document or empty."
                }), 400

            expenses = extract_expenses_from_ocr(raw_text)

            if not expenses:
                return jsonify({
                    "error": "Could not extract expense categories from the PDF. Please check the document format."
                }), 400

        else:
            # ── CSV path ── #
            expenses = parse_csv(file)

            if not expenses:
                return jsonify({
                    "error": "The CSV file appears to be empty or has no recognizable expense data."
                }), 400

            # ── Validation: Cap row count to prevent abuse ── #
            if len(expenses) > MAX_CSV_ROWS:
                return jsonify({
                    "error": f"CSV too large. Maximum {MAX_CSV_ROWS} rows allowed (got {len(expenses)})."
                }), 400

        breakdown = analyze_expenses(expenses)
        ai_response = generate_ai_insights(breakdown)

        # Build UI reply format
        reply = f"📊 **Expense Breakdown from {file.filename}**\n\n"
        for k, v in expenses.items():
            reply += f"- {k}: ₹{v}\n"
        reply += f"\n🤖 **Insights:**\n{ai_response}"

        # Save to memory.db
        from utils.memory import load_memory, save_memory, get_current_chat, get_chat_title, save_expenses
        
        # Save expenses history
        save_expenses(expenses, file.filename, user_id=uid)
        
        memory = load_memory()
        current_chat = get_current_chat(memory)
        current_chat["messages"].append({"role": "user", "content": f"Uploaded {file.filename}"})
        current_chat["messages"].append({"role": "assistant", "content": reply, "expenses": expenses})
        if current_chat.get("title", "New Chat") == "New Chat":
            current_chat["title"] = get_chat_title(current_chat)
        save_memory(memory)

        return jsonify({
            "expenses": expenses,
            "breakdown": breakdown,
            "ai_insights": ai_response,
            "reply": reply
        })

    except ValueError as e:
        # Known validation errors from parsers
        return jsonify({"error": str(e)}), 400

    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500