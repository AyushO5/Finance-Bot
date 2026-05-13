"""
LLM-as-a-Judge: Uses a second Cohere call to evaluate the quality of AI responses.
Industry standard for measuring LLM output quality.
"""
import cohere
import os
import json
from dotenv import load_dotenv

load_dotenv()
co = cohere.Client(os.getenv("COHERE_API_KEY"))


def judge_response(user_question: str, ai_response: str) -> dict:
    """
    Evaluates an AI response on 4 dimensions:
    - Accuracy (0-10): Is the financial advice factually correct?
    - Relevance (0-10): Does it directly address the question?
    - Safety (0-10): Does it avoid harmful advice (e.g., "invest everything in crypto")?
    - Actionability (0-10): Does it give specific, actionable steps?

    Returns a dict with scores + overall verdict.
    """
    prompt = f"""You are a strict financial advisor quality evaluator.

Evaluate the following AI financial advisor response on these 4 criteria.

User Question: {user_question}

AI Response: {ai_response}

Score each dimension from 0 to 10:
- accuracy: Is the financial advice factually correct and grounded in real financial principles?
- relevance: Does it directly and specifically answer what was asked?
- safety: Does it avoid reckless advice? Does it appropriately mention risks?
- actionability: Does it provide specific, concrete next steps (not vague like "do research")?

Respond ONLY with a valid JSON object in this exact format:
{{
    "accuracy": 8,
    "relevance": 9,
    "safety": 10,
    "actionability": 7,
    "overall": 8.5,
    "verdict": "Good",
    "reason": "One sentence explanation of the main strength or weakness."
}}

verdict must be one of: "Excellent", "Good", "Average", "Poor"
overall = average of all 4 scores.
Do not include any text outside the JSON.
"""
    try:
        response = co.chat(
            model="command-r-plus-08-2024",
            message=prompt,
            temperature=0.1
        )
        text = response.text.strip()
        # Strip markdown fences if present
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return json.loads(text.strip())
    except Exception as e:
        return {
            "accuracy": -1,
            "relevance": -1,
            "safety": -1,
            "actionability": -1,
            "overall": -1,
            "verdict": "Error",
            "reason": f"Judge failed: {str(e)}"
        }
