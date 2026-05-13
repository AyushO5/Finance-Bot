import chromadb
import hashlib
import os
from sentence_transformers import SentenceTransformer

print("🔥 Loading RAG model...")
model = SentenceTransformer('all-MiniLM-L6-v2')
print("✅ Model loaded successfully")

# Fix #19: Use PersistentClient (replaces deprecated Settings(persist_directory=...))
client = chromadb.PersistentClient(path="data/chroma")
collection = client.get_or_create_collection("finance")

FINANCE_FILE = "data/finance.json"
HASH_FILE    = "data/finance.hash"


def _get_file_hash(filepath: str) -> str:
    """MD5 hash of the knowledge file for reliable change detection."""
    try:
        with open(filepath, "rb") as f:
            return hashlib.md5(f.read()).hexdigest()
    except Exception:
        return ""


def _get_stored_hash() -> str:
    try:
        with open(HASH_FILE, "r") as f:
            return f.read().strip()
    except Exception:
        return ""


def _save_hash(hash_val: str):
    os.makedirs("data", exist_ok=True)
    with open(HASH_FILE, "w") as f:
        f.write(hash_val)


def load_data():
    import json
    with open(FINANCE_FILE, "r") as f:
        docs_json = json.load(f)

    file_hash = _get_file_hash(FINANCE_FILE)
    stored_hash = _get_stored_hash()

    if stored_hash == file_hash and collection.count() == len(docs_json):
        print("⚡ Data already loaded, skipping...")
        return

    print(f"📄 Rebuilding finance knowledge base ({collection.count()} → {len(docs_json)} entries)...")

    existing_count = collection.count()
    if existing_count > 0:
        old_ids = collection.get()["ids"]
        collection.delete(ids=old_ids)

    for i, doc in enumerate(docs_json):
        content = doc["content"]
        category = doc["category"]
        embedding = model.encode(content).tolist()
        collection.add(
            documents=[content],
            embeddings=[embedding],
            metadatas=[{"category": category}],
            ids=[str(i)]
        )

    _save_hash(file_hash)
    print("✅ Knowledge base rebuilt and persisted")


def detect_intent(query):
    query = query.lower()
    if "rent" in query:
        return "rent"
    elif any(w in query for w in ["tax", "itr", "80c", "deduction"]):
        return "tax"
    elif any(w in query for w in ["crypto", "bitcoin", "ethereum", "web3", "nft"]):
        return "crypto"
    elif any(w in query for w in ["real estate", "property", "reit", "rental", "house"]):
        return "real_estate"
    elif any(w in query for w in ["retire", "retirement", "fire", "epf", "pension", "corpus"]):
        return "retirement"
    elif any(w in query for w in ["save", "saving", "emergency", "fund"]):
        return "saving"
    elif any(w in query for w in ["invest", "investment", "mutual", "sip", "index", "stock", "equity"]):
        return "investment"
    elif any(w in query for w in ["loan", "emi", "debt", "mortgage", "credit"]):
        return "loan"
    elif any(w in query for w in ["insurance", "health", "term", "ulip"]):
        return "insurance"
    else:
        return "general"


def query_rag(query):
    if not query:
        return ""
    intent = detect_intent(query)
    query_embedding = model.encode(query).tolist()

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=5
    )

    docs = results.get("documents", [[]])[0]
    if not docs:
        return ""

    keyword_map = {
        "rent": "rent", "tax": "tax", "crypto": "crypto",
        "real_estate": "real estate", "retirement": "retire",
        "saving": "sav", "investment": "invest",
        "loan": "loan", "insurance": "insur",
    }
    if intent in keyword_map:
        kw = keyword_map[intent]
        boosted = [d for d in docs if kw in d.lower()]
        rest    = [d for d in docs if kw not in d.lower()]
        docs = boosted + rest

    return "\n".join(docs[:3])
