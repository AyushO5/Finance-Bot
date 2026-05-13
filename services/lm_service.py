import cohere
import os
import re
from dotenv import load_dotenv
from utils.finance import extract_income, calculate_budget
from services.rag_service import query_rag
from services.finance_api import (
    get_stock_price, get_currency_rate,
    get_stock_performance, get_stock_news, get_stock_comparison_data
)
from services.summarizer import get_effective_history

load_dotenv()
co = cohere.Client(os.getenv("COHERE_API_KEY"))


# ── Language Detection ── #
def detect_language(text: str) -> str:
    if re.search(r'[\u0900-\u097F]', text): return "Hindi"
    if re.search(r'[\u0B80-\u0BFF]', text): return "Tamil"
    if re.search(r'[\u0C00-\u0C7F]', text): return "Telugu"
    if re.search(r'[\u0980-\u09FF]', text): return "Bengali"
    return "English"


# Fix #2: Keyword-proximity extraction replaces fragile position-based approach
def _find_amount_near(keyword: str, text: str) -> int | None:
    """Find the number that appears immediately after a financial keyword."""
    pattern = rf'{keyword}[^0-9]{{0,25}}(\d{{3,7}}(?:,\d{{3}})*)'
    match = re.search(pattern, text)
    if match:
        return int(match.group(1).replace(',', ''))
    return None


def extract_financial_data(text: str):
    """
    Fix #2: Extract financial amounts by keyword proximity, not positional order.
    'I am 28 years old and earn 80000' → income=80000 (not 28).
    """
    text_lower = text.lower()

    # Only proceed if explicit income keywords are present
    if not any(kw in text_lower for kw in ["earn", "income", "salary", "make per month", "monthly income"]):
        return None

    income = (
        _find_amount_near(r'earn', text_lower) or
        _find_amount_near(r'income\s*(?:is|of|:)?', text_lower) or
        _find_amount_near(r'salary\s*(?:is|of|:)?', text_lower)
    )
    if not income:
        return None

    rent     = _find_amount_near(r'rent', text_lower) or _find_amount_near(r'house', text_lower) or 0
    food     = _find_amount_near(r'food', text_lower) or _find_amount_near(r'groceries', text_lower) or 0
    shopping = _find_amount_near(r'shopping', text_lower) or _find_amount_near(r'clothes', text_lower) or 0
    travel   = _find_amount_near(r'travel', text_lower) or _find_amount_near(r'transport', text_lower) or 0

    # Need income + at least 2 meaningful expenses to be worth analyzing
    found_expenses = sum(1 for e in [rent, food, shopping, travel] if e > 0)
    if found_expenses < 2:
        return None

    return {
        "income": income, "rent": rent, "food": food,
        "shopping": shopping, "travel": travel, "others": 0
    }


def analyze_finances(data: dict) -> dict:
    income = data["income"]
    def pct(x): return round((x / income) * 100, 1) if income else 0
    total_spent = sum(data[k] for k in ["rent", "food", "shopping", "travel", "others"])
    return {
        "rent": pct(data["rent"]),
        "food": pct(data["food"]),
        "shopping": pct(data["shopping"]),
        "travel": pct(data["travel"]),
        "others": pct(data["others"]),
        "savings": round(((income - total_spent) / income) * 100, 1) if income else 0
    }


# ── Helpers ── #
def format_headings(text):
    text = text.replace("## Summary", "1. Summary")
    text = text.replace("## Investment Suggestions", "2. Key Points")
    text = text.replace("## Risk Level", "3. Risk Level")
    text = text.replace("## Action Steps", "4. Action Steps")
    text = text.replace("## Follow-up Question", "5. Follow-up Question")
    return text


def fix_risk_level(text):
    text = text.replace("Medium to High", "Medium")
    text = text.replace("Low to Medium", "Low")
    text = text.replace("High to Medium", "High")
    return text


# ── Main AI Function ── #
def get_ai_response(user_input: str, history: list, profile: dict, insights: str):
    extra_data = {}

    # Fix #2: Use improved keyword-proximity extraction
    data = extract_financial_data(user_input)
    financial_keywords = ["earn", "income", "salary", "rent", "food", "spend", "expense"]

    if data is not None and any(word in user_input.lower() for word in financial_keywords):
        analysis = analyze_finances(data)
        currency = profile.get("currency", "₹")

        prompt = f"""You are a financial advisor.

Analyze this financial data:
Income: {currency}{data["income"]}
Rent: {currency}{data["rent"]}
Food: {currency}{data["food"]}
Shopping: {currency}{data["shopping"]}
Travel: {currency}{data["travel"]}
Other: {currency}{data["others"]}

Percentages:
- Rent: {analysis["rent"]}%
- Savings: {analysis["savings"]}%
- Shopping: {analysis["shopping"]}%

Give:
1. Summary
2. Key Points
3. Risk Level
4. Action Steps
5. Follow-up Question
"""
        response = co.chat(model="command-r-plus-08-2024", message=prompt, temperature=0.3)
        return response.text.strip(), extra_data

    # ── History + Summarization ── #
    language = detect_language(user_input)
    summary_block, effective_history = get_effective_history(history)

    history_text = ""
    if summary_block:
        history_text += f"[Conversation Summary]\n{summary_block}\n\n[Recent Messages]\n"
    for msg in effective_history[-6:]:
        role = "User" if msg["role"] == "user" else "Assistant"
        history_text += f"{role}: {msg['content']}\n"

    # ── Profile Context ── #
    profile_text = f"""User Profile:
- Income: {profile.get("income", "Unknown")}
- Goal: {profile.get("goal", "Not specified")}
"""

    # ── Budget (only if new income mentioned) ── #
    income = extract_income(user_input)
    currency = profile.get("currency", "₹")
    if income:
        needs, wants, savings = calculate_budget(income)
        budget_section = f"""Budget Breakdown:
- Needs: {currency}{needs}
- Wants: {currency}{wants}
- Savings: {currency}{savings}
"""
    else:
        budget_section = ""

    # ── Smart RAG ── #
    if len(user_input.split()) > 5:
        context = query_rag(user_input)
    else:
        last_msg = next(
            (m["content"] for m in reversed(history) if m["role"] == "user" and len(m["content"].split()) > 3),
            ""
        )
        context = query_rag(last_msg) if last_msg else ""

    # ── Define Tools ── #
    tools = [
        {
            "name": "get_stock_price",
            "description": "Get the current live price of a stock or index.",
            "parameter_definitions": {
                "ticker": {"description": "The stock ticker symbol (e.g., AAPL, RELIANCE, NIFTY 50)", "type": "str", "required": True}
            }
        },
        {
            "name": "get_stock_performance",
            "description": "Get historical performance data for a stock over a specific period.",
            "parameter_definitions": {
                "ticker": {"description": "The stock ticker symbol", "type": "str", "required": True},
                "period": {"description": "Period (e.g., '1mo', '6mo', '1y', '5y')", "type": "str", "required": True}
            }
        },
        {
            "name": "get_currency_rate",
            "description": "Get the live exchange rate between two currencies.",
            "parameter_definitions": {
                "base": {"description": "Base currency code (e.g., USD)", "type": "str", "required": True},
                "target": {"description": "Target currency code (e.g., INR)", "type": "str", "required": True}
            }
        },
        {
            "name": "get_stock_news",
            "description": "Get the latest news headlines for a specific stock or index.",
            "parameter_definitions": {
                "ticker": {"description": "The stock ticker symbol", "type": "str", "required": True}
            }
        },
        {
            "name": "get_stock_comparison_data",
            "description": "Fetch normalized comparison data for two stocks over a given period to prepare a chart.",
            "parameter_definitions": {
                "ticker1": {"description": "First stock ticker", "type": "str", "required": True},
                "ticker2": {"description": "Second stock ticker", "type": "str", "required": True},
                "period": {"description": "Period (e.g., '6mo', '1y')", "type": "str", "required": True}
            }
        }
    ]

    tool_map = {
        "get_stock_price": get_stock_price,
        "get_stock_performance": get_stock_performance,
        "get_currency_rate": get_currency_rate,
        "get_stock_news": get_stock_news,
        "get_stock_comparison_data": get_stock_comparison_data
    }

    # First pass: Ask model if it needs tools
    pre_prompt = f"User asked: {user_input}\nUse tools if you need live market data. Otherwise, say nothing."
    
    try:
        tool_response = co.chat(
            model="command-r-plus-08-2024",
            message=pre_prompt,
            tools=tools,
            temperature=0.1
        )
        
        tool_results = []
        if tool_response.tool_calls:
            for call in tool_response.tool_calls:
                func = tool_map.get(call.name)
                if func:
                    try:
                        res = func(**call.parameters)
                        tool_results.append({"call": call, "outputs": [{"result": res}]})
                        
                        if call.name == "get_stock_comparison_data":
                            extra_data["comparison_data"] = res
                            extra_data["comparison_tickers"] = (call.parameters.get("ticker1"), call.parameters.get("ticker2"))
                            context += f"\n\nStock Comparison data fetched successfully for {call.parameters.get('ticker1')} and {call.parameters.get('ticker2')}."
                        elif call.name == "get_stock_news":
                            headlines = res.get("headlines", [])
                            if headlines:
                                # Quick sentiment analysis on the headlines
                                sentiment_prompt = f"Analyze these headlines for {res.get('ticker')}:\n" + "\n".join(headlines) + "\nIs the overall sentiment Bullish, Bearish, or Neutral? Reply with EXACTLY one of those three words."
                                sentiment_response = co.chat(model="command-r-plus-08-2024", message=sentiment_prompt, temperature=0.1)
                                sentiment = sentiment_response.text.strip().capitalize()
                                
                                extra_data["sentiment_data"] = {
                                    "ticker": res.get("ticker"),
                                    "sentiment": sentiment,
                                    "headlines": headlines
                                }
                                context += f"\n\nLive News for {res.get('ticker')}: {headlines}\nSentiment: {sentiment}"
                            else:
                                context += f"\n\nLive News for {res.get('ticker')}: No recent news found."
                        else:
                            context += f"\n\nLive Data ({call.name}):\n{res}"
                    except Exception as e:
                        tool_results.append({"call": call, "outputs": [{"error": str(e)}]})
                        
    except Exception as e:
        print("Tool call failed:", e)

    print("RAG & LIVE CONTEXT:", context)

    # ── Final Prompt ── #
    prompt = f"""
{profile_text}

Previous Conversation:
{history_text}

You are a practical financial advisor.

LANGUAGE RULE: The user is writing in {language}. You MUST respond in {language}.

----------------------
Financial Knowledge:
{context}

User Financial Data:
{insights}
----------------------

CRITICAL RULES:
- TOPIC RESTRICTION: You MUST ONLY answer financial, economic, budgeting, investing, or market-related questions.
- If the user asks about an UNRELATED topic (e.g. coding, health, casual chatter), politely decline, state that you are exclusively an AI Financial Advisor, and offer to help with a financial topic instead.
- If you are declining an unrelated topic, DO NOT use the 5-point structure below. Just output a short rejection sentence.

- If "User Financial Data" is provided:
    - MUST identify highest expense category
    - MUST give advice based on that category
    - MUST include percentage or number from data
    - MUST NOT give generic advice

- Rent > 40% → risky
- Saving < 20% → insufficient
- Emergency fund → 3–6 months
- SIP → good for beginners

- ALWAYS use previous context
- NEVER ignore user-provided numbers

----------------------

Instructions:
- Be short, direct, practical
- NO vague advice
- If amount given → give exact {currency} allocation that sums correctly
- If goal → give monthly saving plan
- If short reply → continue previous topic
- For budgeting → use 50/30/20 rule, give 2 cost-cutting actions
- For factual queries → use exact numbers from context
- Always give at least 1 personalized insight based on user data

----------------------

Output Format:

1. Summary:
(2 lines)

2. Key Points:
(Use numbers if possible)

3. Risk Level:
(reason)

4. Action Steps:
- Highly specific, step-by-step instructions
- Avoid generic advice like "diversify" or "do research"
- Tell the user exactly what to do

5. Follow-up Question:

----------------------

User Query:
{user_input}
"""

    response_stream = co.chat_stream(model="command-r-plus-08-2024", message=prompt, temperature=0.3)
    
    if extra_data:
        import json
        yield json.dumps({"type": "extra", "data": extra_data}) + "\n"
        
    if budget_section:
        import json
        yield json.dumps({"type": "text", "text": budget_section + "\n"}) + "\n"

    for event in response_stream:
        if event.event_type == "text-generation":
            # Just yield the raw text chunks; we will handle markdown formatting on frontend
            import json
            yield json.dumps({"type": "text", "text": event.text}) + "\n"