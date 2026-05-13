"""
Conversation Summarizer: Compresses long chat histories into a memory block.
Prevents context window overflow in long conversations.
"""
import cohere
import os
from dotenv import load_dotenv

load_dotenv()
co = cohere.Client(os.getenv("COHERE_API_KEY"))

SUMMARIZE_THRESHOLD = 20  # summarize when history exceeds this many messages
KEEP_RECENT = 6           # always keep the last N messages verbatim


def should_summarize(history: list) -> bool:
    """Returns True if the history is long enough to warrant summarization."""
    return len(history) > SUMMARIZE_THRESHOLD


def summarize_history(history: list) -> tuple[str, list]:
    """
    Summarizes older messages into a compact memory block.
    Returns (summary_text, recent_messages_to_keep).

    The summary replaces old messages in context, while the most recent
    messages are kept verbatim so the AI maintains immediate context.
    """
    if not should_summarize(history):
        return "", history

    # Split: old messages get summarized, recent ones stay
    old_messages = history[:-KEEP_RECENT]
    recent_messages = history[-KEEP_RECENT:]

    # Format old messages for summarization
    conversation_text = ""
    for msg in old_messages:
        role = "User" if msg["role"] == "user" else "Advisor"
        conversation_text += f"{role}: {msg['content']}\n"

    prompt = f"""Summarize this financial advisory conversation into a compact memory block.
Extract the key facts: user's income, expenses, goals, risk tolerance, debts, 
investment preferences, and any specific advice given.

Conversation:
{conversation_text}

Write a concise summary (max 150 words) starting with "Earlier in this conversation:".
Focus only on financially relevant facts. Do not include greetings or filler.
"""
    try:
        response = co.chat(
            model="command-r-plus-08-2024",
            message=prompt,
            temperature=0.2
        )
        summary = response.text.strip()
        return summary, recent_messages
    except Exception:
        # If summarization fails, just trim old messages
        return "", recent_messages


def get_effective_history(history: list) -> tuple[str, list]:
    """
    Returns (summary_block, recent_messages).
    If history is short, summary_block is empty and all messages are returned.
    """
    if not should_summarize(history):
        return "", history
    return summarize_history(history)
