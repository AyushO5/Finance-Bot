import cohere
import os
from dotenv import load_dotenv

load_dotenv()

co = cohere.Client(os.getenv("COHERE_API_KEY"))


def generate_ai_insights(breakdown):

    prompt = f"""
You are a financial advisor analyzing expenses.

----------------------
Expense Breakdown:
{chr(10).join(breakdown)}

----------------------

Instructions:

- Use numerical reasoning (percentages or proportions)
- If any category is high (like rent), mention rule (e.g., 40%)
- Avoid vague phrases like "significant" or "moderate"
- Be specific and actionable
- Do NOT give generic advice

----------------------

Output Format:

1. Insights:
- Include numbers or percentages

2. Suggestions:
- Practical and specific actions

3. Warning:
- If any category exceeds safe limits
- Otherwise: None

----------------------

Rules:

- Keep under 100 words
- Be direct and specific

"""
# chr(10) is used instead of \n inside the f-string to avoid syntax issues with backslashes
    response = co.chat(
        model="command-r-plus-08-2024",
        message=prompt,
        temperature=0.4 # Low temperature for more consistent, structured output
    )

    return response.text.strip()

import json

def extract_expenses_from_ocr(raw_text):
    prompt = f"""
You are a receipt parsing assistant.
I have extracted raw OCR text from an image of a receipt or invoice. 

Raw Text:
{raw_text}

Extract the individual line items and their prices. Categorize them into one of the following categories: 
Food, Shopping, Travel, Rent, Utilities, Other.

Respond with ONLY a valid JSON object in the exact format:
{{
    "Food": 150.5,
    "Shopping": 20.0
}}

Combine totals for each category. Do not include any text outside the JSON.
"""
    response = co.chat(
        model="command-r-plus-08-2024",
        message=prompt,
        temperature=0.1
    )
    
    try:
        # Strip markdown json blocks if present
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return json.loads(text.strip())
    except Exception:
        return {}
