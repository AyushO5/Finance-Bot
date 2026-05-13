import os
import secrets
from dotenv import load_dotenv

load_dotenv()

if not os.getenv("COHERE_API_KEY"):
    raise RuntimeError("❌ COHERE_API_KEY is not set in .env — please add it before starting.")

from flask import Flask, jsonify
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from routes.chat import chat_bp
from routes.upload import upload_bp
from routes.memory_api import memory_bp
from routes.auth import auth_bp
from services.rag_service import load_data

load_data()

app = Flask(__name__)

# ── JWT Config ── #
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", secrets.token_hex(32))
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = False  # Tokens don't expire for simplicity
jwt = JWTManager(app)

# ── CORS ── #
CORS(app, origins=["http://localhost:5173", "http://127.0.0.1:5173"])

# ── Rate Limiter ── #
limiter = Limiter(
    key_func=get_remote_address,
    app=app,
    default_limits=["200 per day", "60 per hour"],
    storage_uri="memory://"
)
app.limiter = limiter

app.register_blueprint(auth_bp,   url_prefix="/auth")
app.register_blueprint(chat_bp,   url_prefix="/chat")
app.register_blueprint(upload_bp, url_prefix="/upload")
app.register_blueprint(memory_bp, url_prefix="/api/memory")

@app.route("/")
def home():
    return "Finance Advisor Bot Running 🚀"

@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({"error": f"Rate limit exceeded. {str(e.description)}"}), 429

@app.errorhandler(413)
def too_large_handler(e):
    return jsonify({"error": "File too large. Maximum allowed size is 5MB."}), 413

app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024

if __name__ == "__main__":
    print(app.url_map)
    app.run(debug=True)
