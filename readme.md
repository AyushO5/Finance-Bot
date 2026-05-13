# 💰 AI Financial Advisor

An industry-grade, AI-powered financial assistant that analyzes expenses, provides budgeting advice, fetches real-time stock market data, and generates personalized financial insights using LLMs and RAG (Retrieval-Augmented Generation).

---

## ✨ Features

- **💬 Interactive Chat & Memory:** Seamless ChatGPT-style interface with persistent conversation memory stored locally.
- **📈 Live Stock & Sentiment Engine:** Fetches real-time stock data and latest news using Yahoo Finance (`yfinance`), analyzed by AI for bullish/bearish sentiment.
- **📊 Interactive Data Visualization:** Dynamic, animated Stock Comparison line charts and Expense Breakdown pie charts powered by Recharts.
- **🎯 Persistent Goal Tracking:** Add, track, and delete your financial goals. Your progress is saved securely in a local SQLite database.
- **🧾 OCR & CSV Expense Analysis:** Upload receipt images or expense CSVs. The backend uses OCR and AI to categorize your spending instantly.
- **📚 RAG-based Financial Knowledge:** Embedded financial best practices using ChromaDB and Sentence Transformers.
- **🎨 Neon Cyberpunk UI:** A visually stunning frontend built with React and Vite, featuring glassmorphism, glowing accents, and modern typography.

---

## 🛠 Tech Stack

### Frontend
- **Framework:** React + Vite
- **Styling:** Vanilla CSS (Neon Cyberpunk Theme)
- **Charts:** Recharts
- **Icons:** Lucide-React
- **Markdown:** React-Markdown

### Backend
- **Framework:** Flask (with Flask-CORS and Rate Limiting)
- **AI Model:** Cohere (command-r-plus)
- **Embeddings:** Sentence Transformers (all-MiniLM-L6-v2)
- **Vector DB:** ChromaDB
- **Database:** SQLite (`memory.db` for chats, user profiles, and goals)
- **Market Data:** `yfinance`

---

## 🚀 How to Run Locally

### 1. Backend Setup
Ensure you have Python 3.10+ installed.

```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
pip install flask-cors yfinance plotly

# Export your API keys
export COHERE_API_KEY="your-api-key"

# Start the Flask API server
python app.py
```
The backend will run on `http://127.0.0.1:5000`.

### 2. Frontend Setup
Make sure you have Node.js and `npm` installed.

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```
The frontend will run on `http://localhost:5173`. Open this URL in your browser to start using the app.

---

## 🔄 Architecture Flow

1. **User Input:** User types a query, asks for a stock comparison, or uploads an expense receipt.
2. **React Frontend:** Sends a REST API request to the Flask backend.
3. **Backend Routing:** Flask routes the request to the appropriate service (LLM, Finance API, or OCR/CSV parser).
4. **Data Fetching:** 
   - Uses `yfinance` for real-time stock data.
   - Queries ChromaDB for local RAG knowledge.
   - Connects to SQLite to fetch previous chat history and goals.
5. **AI Synthesis:** Cohere's LLM interprets the data and generates actionable insights.
6. **Response Generation:** The backend returns structured JSON containing textual advice and chart-ready datasets, securely saving the interaction to `memory.db`.
7. **UI Rendering:** React renders the markdown text and beautifully animates the Recharts data.

---

## 📁 Project Structure

```
├── app.py                  # Main Flask application
├── memory.db               # SQLite database for persistence
├── frontend/               # React + Vite frontend application
│   ├── src/
│   │   ├── App.jsx         # Main UI component and state management
│   │   └── index.css       # Neon cyberpunk styling
│   └── package.json
├── routes/                 # Flask API endpoints (chat, upload, memory)
├── services/               # Core business logic (LLM, RAG, Finance APIs)
├── utils/                  # Helper functions (Database interaction, OCR)
└── data/                   # RAG knowledge base text files
```