from flask import Blueprint, request, jsonify
import sqlite3
import bcrypt
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from utils.memory import init_db, DB_FILE

auth_bp = Blueprint("auth", __name__)


def _get_user_by_email(email: str):
    init_db()
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT id, name, email, password_hash FROM users WHERE email=?", (email,))
    row = c.fetchone()
    conn.close()
    return row


def _create_user(name: str, email: str, password: str) -> int:
    init_db()
    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute(
        "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
        (name, email, password_hash)
    )
    conn.commit()
    user_id = c.lastrowid
    conn.close()
    return user_id


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid JSON body."}), 400

    name  = (data.get("name", "") or "").strip()
    email = (data.get("email", "") or "").strip().lower()
    password = (data.get("password", "") or "").strip()

    if not name or not email or not password:
        return jsonify({"error": "Name, email, and password are required."}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters."}), 400

    if _get_user_by_email(email):
        return jsonify({"error": "An account with this email already exists."}), 409

    user_id = _create_user(name, email, password)
    token = create_access_token(identity=str(user_id))
    return jsonify({"token": token, "user": {"id": user_id, "name": name, "email": email}}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid JSON body."}), 400

    email    = (data.get("email", "") or "").strip().lower()
    password = (data.get("password", "") or "").strip()

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    row = _get_user_by_email(email)
    if not row:
        return jsonify({"error": "Invalid email or password."}), 401

    user_id, name, user_email, password_hash = row
    if not bcrypt.checkpw(password.encode(), password_hash.encode()):
        return jsonify({"error": "Invalid email or password."}), 401

    token = create_access_token(identity=str(user_id))
    return jsonify({"token": token, "user": {"id": user_id, "name": name, "email": user_email}}), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user_id = int(get_jwt_identity())
    init_db()
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT id, name, email FROM users WHERE id=?", (user_id,))
    row = c.fetchone()
    conn.close()
    if not row:
        return jsonify({"error": "User not found."}), 404
    return jsonify({"user": {"id": row[0], "name": row[1], "email": row[2]}})


@auth_bp.route("/profile", methods=["GET"])
@jwt_required()
def get_profile():
    """Return the user's saved preferences (currency, income)."""
    from utils.memory import load_memory
    user_id = int(get_jwt_identity())
    memory = load_memory(user_id=user_id)
    profile = memory.get("profile", {})

    init_db()
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT id, name, email FROM users WHERE id=?", (user_id,))
    row = c.fetchone()
    conn.close()
    if not row:
        return jsonify({"error": "User not found."}), 404

    return jsonify({
        "id": row[0], "name": row[1], "email": row[2],
        "currency": profile.get("currency", "₹"),
        "income": profile.get("income", ""),
    })


@auth_bp.route("/profile", methods=["PUT"])
@jwt_required()
def update_profile_route():
    """Update user name and financial preferences."""
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    new_name     = (data.get("name", "") or "").strip()
    new_currency = (data.get("currency", "") or "₹").strip()
    new_income   = data.get("income", "")

    if new_name:
        init_db()
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("UPDATE users SET name=? WHERE id=?", (new_name, user_id))
        conn.commit()
        conn.close()

    # Update currency and income in the profile JSON blob
    from utils.memory import load_memory, save_profile, save_memory
    memory = load_memory(user_id=user_id)
    profile = memory.get("profile", {})
    if new_currency:
        profile["currency"] = new_currency
    if new_income != "":
        profile["income"] = new_income
    save_profile(profile)

    return jsonify({"success": True, "message": "Profile updated."})

