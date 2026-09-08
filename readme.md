# AI Financial Advisor

A full-stack AI financial assistant that combines LLM reasoning, retrieval-augmented generation, expense analysis, market data, OCR, persistent goals, and an interactive dashboard.

> Built to explore how an AI application can combine real-world data, structured backend services, retrieval, and a user-facing product instead of being only a chatbot wrapper.

## What it does

- **AI financial chat** with persistent local conversation memory
- **RAG** over a curated financial knowledge base using ChromaDB and Sentence Transformers
- **Expense intelligence** from CSV files and receipt images
- **Market analysis** using `yfinance`, including stock comparisons and AI-generated sentiment
- **Goal tracking** persisted in SQLite
- **Interactive visualizations** for expenses and market data
- **Evaluation tooling** for measuring response quality and hallucination behavior
- **React + Vite frontend** with a custom dashboard-style interface

## Architecture

```text
React + Vite
     │
     │ REST API
     ▼
Flask API
 ┌───┼───────────────┐
 │   │               │
 ▼   ▼               ▼
LLM  RAG          Finance/OCR
 │   │               │
 └───┼───────────────┘
     ▼
 SQLite persistence
```

A typical request flows through the Flask routes into focused services. Depending on the request, the backend can retrieve financial context, fetch external market data, process uploaded expenses, persist user state, and ask the LLM to synthesize the final response.

## AI / ML components

| Component | Purpose |
| --- | --- |
| Cohere | Natural-language generation and financial reasoning |
| Sentence Transformers | Embedding financial knowledge for semantic retrieval |
| ChromaDB | Vector storage and retrieval |
| RAG pipeline | Grounds answers in curated financial guidance |
| Evaluation script | Measures accuracy and hallucination-oriented behavior |

## Backend components

- Flask REST API
- Modular route and service layers
- SQLite persistence for conversations, profiles, and goals
- `yfinance` market-data integration
- OCR pipeline for receipt extraction
- CSV parsing and expense categorization
- Rate limiting and CORS support

## Frontend

Built with React and Vite. The UI includes:

- Chat interface
- Expense upload and breakdown charts
- Stock comparison charts
- Financial goal tracking
- Markdown-rendered AI responses

## Run locally

### Backend

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt

# Set your API key in the environment
# Windows PowerShell
$env:COHERE_API_KEY="your-api-key"

# macOS / Linux
export COHERE_API_KEY="your-api-key"

python app.py
```

The Flask API runs on port `5000` by default.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The Vite development server normally runs on port `5173`.

## Example workflow

```text
Upload expense CSV / receipt
          ↓
   Parse and categorize
          ↓
  Build spending summary
          ↓
Retrieve relevant guidance ───┐
          ↓                   │
   LLM synthesizes advice ←──┘
          ↓
   Structured response
          ↓
Dashboard + charts + chat
```

## Project structure

```text
Finance-Bot/
├── app.py
├── routes/                  # HTTP endpoints
├── services/                # LLM, RAG, finance and AI services
├── utils/                   # Database/OCR helpers
├── data/                    # Retrieval knowledge base
├── frontend/                # React + Vite application
├── evaluate.py              # Evaluation experiments
├── sample_expenses.csv      # Sample input data
└── requirements.txt
```

## Engineering notes

The interesting part of this project is the orchestration between multiple systems: external financial data, local persistence, retrieval, document/receipt processing, and an LLM. The repository is intentionally structured so these responsibilities are separated rather than concentrated in a single prompt-serving function.

## Limitations

This project is an educational AI application, not a regulated financial-advice product. Market data can change, model output can be incorrect, and generated financial guidance should not be treated as professional advice.

## License

Add a project license before publishing this as a reusable open-source package.
