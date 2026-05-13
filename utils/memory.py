import json
import os
import re
import sqlite3

DB_FILE = "data/memory.db"

def init_db():
    os.makedirs("data", exist_ok=True)
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    # ── Users table ── #
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS profile (id INTEGER PRIMARY KEY, user_id INTEGER DEFAULT 1, data TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY, user_id INTEGER DEFAULT 1, current_chat_id INTEGER)''')
    c.execute('''CREATE TABLE IF NOT EXISTS chats (id INTEGER PRIMARY KEY, user_id INTEGER DEFAULT 1, title TEXT, messages TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER DEFAULT 1,
        name TEXT NOT NULL,
        target REAL NOT NULL,
        saved REAL DEFAULT 0,
        currency TEXT DEFAULT "₹",
        deadline DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS quality_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER DEFAULT 1,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        question TEXT,
        verdict TEXT,
        overall REAL,
        scores TEXT
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER DEFAULT 1,
        date DATE DEFAULT CURRENT_DATE,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        source_file TEXT
    )''')

    # Init default state if empty
    c.execute("SELECT count(*) FROM state")
    if c.fetchone()[0] == 0:
        c.execute("INSERT INTO state (id, current_chat_id) VALUES (1, 1)")
        c.execute("INSERT INTO profile (id, data) VALUES (1, '{}')")

    # Fix #13: Migrate existing goals table to add deadline/created_at if missing
    c.execute("PRAGMA table_info(goals)")
    existing_cols = {row[1] for row in c.fetchall()}
    if "deadline" not in existing_cols:
        c.execute("ALTER TABLE goals ADD COLUMN deadline DATE")
    if "created_at" not in existing_cols:
        c.execute("ALTER TABLE goals ADD COLUMN created_at TIMESTAMP")

    conn.commit()
    conn.close()


def delete_chat(memory, chat_id):
    memory["chats"] = [c for c in memory["chats"] if c["id"] != chat_id]
    if memory["current_chat_id"] == chat_id:
        if memory["chats"]:
            memory["current_chat_id"] = memory["chats"][0]["id"]
        else:
            new_chat = {"id": 1, "title": "New Chat", "messages": []}
            memory["chats"] = [new_chat]
            memory["current_chat_id"] = 1
    return memory


def get_current_chat(memory):
    if not memory.get("chats"):
        return None
    for chat in memory["chats"]:
        if chat["id"] == memory.get("current_chat_id"):
            return chat
    return memory["chats"][0]


def create_new_chat(memory):
    if memory["chats"]:
        max_id = max(chat["id"] for chat in memory["chats"])
        new_id = max_id + 1
    else:
        new_id = 1
    new_chat = {"id": new_id, "title": "New Chat", "messages": []}
    memory["chats"].append(new_chat)
    memory["current_chat_id"] = new_id
    return memory


def get_chat_title(chat):
    title = chat.get("title", "")
    if title and title != "New Chat":
        return title
    for msg in chat.get("messages", []):
        if msg["role"] == "user":
            text = msg["content"].strip()
            if len(text) > 30:
                return text[:27] + "..."
            return text
    return "New Chat"


def update_chat_title(memory):
    chat = get_current_chat(memory)
    if chat and (chat.get("title", "New Chat") == "New Chat"):
        chat["title"] = get_chat_title(chat)
    return memory


def switch_chat(memory, chat_id):
    memory["current_chat_id"] = chat_id
    return memory


def load_memory(user_id=1):
    init_db()
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()

    c.execute("SELECT current_chat_id FROM state WHERE id=1 AND user_id=?", (user_id,))
    row = c.fetchone()
    current_chat_id = row[0] if row else 1

    c.execute("SELECT data FROM profile WHERE id=1 AND user_id=?", (user_id,))
    row = c.fetchone()
    profile = json.loads(row[0]) if row else {}

    c.execute("SELECT id, title, messages FROM chats WHERE user_id=?", (user_id,))
    chats = []
    for row in c.fetchall():
        chats.append({
            "id": row[0],
            "title": row[1],
            "messages": json.loads(row[2])
        })

    conn.close()

    if not chats:
        chats = [{"id": 1, "title": "New Chat", "messages": []}]
        current_chat_id = 1

    return {
        "current_chat_id": current_chat_id,
        "profile": profile,
        "chats": chats
    }


def save_memory(memory, user_id=1):
    """Fix #1: Use INSERT OR REPLACE instead of DELETE+INSERT to prevent race conditions."""
    init_db()
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()

    c.execute("UPDATE state SET current_chat_id=? WHERE id=1 AND user_id=?", (memory.get("current_chat_id", 1), user_id))
    c.execute("UPDATE profile SET data=? WHERE id=1 AND user_id=?", (json.dumps(memory.get("profile", {})), user_id))

    # Fix #1: INSERT OR REPLACE instead of DELETE + re-INSERT
    for chat in memory.get("chats", []):
        c.execute(
            """INSERT INTO chats (id, user_id, title, messages) VALUES (?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET title=excluded.title, messages=excluded.messages""",
            (chat["id"], user_id, chat.get("title", "New Chat"), json.dumps(chat.get("messages", [])))
        )

    # Remove any chats that no longer exist in memory
    current_ids = [chat["id"] for chat in memory.get("chats", [])]
    if current_ids:
        placeholders = ",".join("?" * len(current_ids))
        c.execute(f"DELETE FROM chats WHERE user_id=? AND id NOT IN ({placeholders})", [user_id] + current_ids)

    conn.commit()
    conn.close()


def save_single_chat(chat_id: int, title: str, messages: list, user_id: int = 1):
    """Fix #10: Update only one chat row instead of rewriting all chats."""
    init_db()
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute(
        """INSERT INTO chats (id, user_id, title, messages) VALUES (?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET title=excluded.title, messages=excluded.messages""",
        (chat_id, user_id, title, json.dumps(messages))
    )
    conn.commit()
    conn.close()


def update_profile(user_input, profile):
    """Fix #16: Extract and persist user profile facts from their messages."""
    user_input_lower = user_input.lower()
    # Use 4-7 digit range for income (same fix as finance.py)
    income_match = re.search(r'\b(\d{4,7})\b', user_input)
    if any(kw in user_input_lower for kw in ["earn", "salary", "income", "make per month"]) and income_match:
        profile["income"] = int(income_match.group(1))
    if "buy" in user_input_lower:
        profile["goal"] = user_input
    if "save" in user_input_lower:
        profile["saving_intent"] = True
    return profile


def save_profile(profile: dict):
    """Persist updated profile to DB."""
    init_db()
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("UPDATE profile SET data=? WHERE id=1", (json.dumps(profile),))
    conn.commit()
    conn.close()


# ── Goal Tracking ── #
def load_goals(user_id: int = 1) -> list:
    init_db()
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT id, name, target, saved, currency, deadline, created_at FROM goals WHERE user_id=?", (user_id,))
    goals = [
        {
            "id": row[0], "name": row[1], "target": row[2],
            "saved": row[3], "currency": row[4],
            "deadline": row[5], "created_at": row[6]
        }
        for row in c.fetchall()
    ]
    conn.close()
    return goals


def add_goal(name: str, target: float, currency: str = "₹", deadline: str = None, user_id: int = 1) -> dict:
    init_db()
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute(
        "INSERT INTO goals (name, target, saved, currency, deadline, user_id) VALUES (?, ?, 0, ?, ?, ?)",
        (name, target, currency, deadline, user_id)
    )
    conn.commit()
    goal_id = c.lastrowid
    conn.close()
    return {"id": goal_id, "name": name, "target": target, "saved": 0, "currency": currency, "deadline": deadline}


def update_goal_saved(goal_id: int, saved: float):
    init_db()
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("UPDATE goals SET saved=? WHERE id=?", (saved, goal_id))
    conn.commit()
    conn.close()


def delete_goal(goal_id: int):
    init_db()
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("DELETE FROM goals WHERE id=?", (goal_id,))
    conn.commit()
    conn.close()


def log_quality_score(question: str, score: dict, user_id: int = 1):
    """Fix #8: Persist llm_judge scores to quality_log table."""
    init_db()
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute(
        "INSERT INTO quality_log (user_id, question, verdict, overall, scores) VALUES (?, ?, ?, ?, ?)",
        (user_id, question[:200], score.get("verdict"), score.get("overall"), json.dumps(score))
    )
    conn.commit()
    conn.close()


# ── Expense History Tracking ── #
def save_expenses(expenses: dict, source_file: str, user_id: int = 1):
    init_db()
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    for category, amount in expenses.items():
        c.execute(
            "INSERT INTO expenses (user_id, category, amount, source_file) VALUES (?, ?, ?, ?)",
            (user_id, category, amount, source_file)
        )
    conn.commit()
    conn.close()

def load_monthly_expenses(user_id: int = 1) -> list:
    init_db()
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("""
        SELECT strftime('%Y-%m', date) as month, category, SUM(amount)
        FROM expenses
        WHERE user_id=?
        GROUP BY month, category
        ORDER BY month ASC
    """, (user_id,))
    
    results = {}
    for row in c.fetchall():
        month, cat, amt = row
        if month not in results:
            results[month] = {}
        results[month][cat] = amt
    conn.close()
    
    formatted = []
    for month, categories in results.items():
        entry = {"name": month}
        entry.update(categories)
        formatted.append(entry)
    return formatted


def load_expenses_by_range(range_param: str = "month", user_id: int = 1) -> list:
    """Load expenses grouped by appropriate time bucket for the selected range."""
    init_db()
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()

    if range_param == "week":
        # Last 7 days — group by day
        c.execute("""
            SELECT strftime('%Y-%m-%d', date) as bucket, category, SUM(amount)
            FROM expenses
            WHERE user_id=? AND date >= date('now', '-7 days')
            GROUP BY bucket, category
            ORDER BY bucket ASC
        """, (user_id,))
    elif range_param == "month":
        # Last 30 days — group by week number
        c.execute("""
            SELECT strftime('%Y-W%W', date) as bucket, category, SUM(amount)
            FROM expenses
            WHERE user_id=? AND date >= date('now', '-30 days')
            GROUP BY bucket, category
            ORDER BY bucket ASC
        """, (user_id,))
    else:
        # Last 12 months (year) — group by month
        c.execute("""
            SELECT strftime('%Y-%m', date) as bucket, category, SUM(amount)
            FROM expenses
            WHERE user_id=? AND date >= date('now', '-365 days')
            GROUP BY bucket, category
            ORDER BY bucket ASC
        """, (user_id,))

    results = {}
    for row in c.fetchall():
        bucket, cat, amt = row
        if bucket not in results:
            results[bucket] = {}
        results[bucket][cat] = round(amt, 2)
    conn.close()

    formatted = []
    for bucket, categories in results.items():
        entry = {"name": bucket}
        entry.update(categories)
        formatted.append(entry)
    return formatted