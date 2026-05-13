import re

# Fix #6: import re was duplicated; removed duplicate
def extract_income(text):
    text = text.lower()

    income_keywords = ["salary", "income", "earn", "per month", "monthly"]

    if not any(word in text for word in income_keywords):
        return None

    # Fix #6: Use 4-7 digit range to avoid grabbing zip codes, ages, phone numbers
    match = re.search(r'\b(\d{4,7})\b', text)

    if match:
        return int(match.group(1))

    return None

def calculate_budget(income):
    # Splits income using the 50/30/20 rule: 50% needs, 30% wants, 20% savings
    needs = int(income * 0.5)
    wants = int(income * 0.3)
    savings = int(income * 0.2)

    return needs, wants, savings
