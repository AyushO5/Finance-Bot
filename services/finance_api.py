import yfinance as yf
from cachetools import cached, TTLCache

# Cache stock prices and info for 10 minutes (600 seconds)
finance_cache = TTLCache(maxsize=100, ttl=600)

COMMON_INDICES = {
    "NIFTY 50": "^NSEI",
    "NIFTY":    "^NSEI",
    "NIFTY50":  "^NSEI",
    "SENSEX":   "^BSESN",
    "BANK NIFTY": "^NSEBANK",
    "S&P 500":  "^GSPC",
    "NASDAQ":   "^IXIC",
    "DOW JONES": "^DJI"
}

# Fix #18: Known US tickers — skip the .NS fallback for these
US_TICKERS = {
    "AAPL","MSFT","GOOGL","GOOG","AMZN","META","TSLA","NVDA","BRK","JPM",
    "V","JNJ","WMT","PG","MA","UNH","HD","DIS","PYPL","NFLX","INTC",
    "VZ","T","CMCSA","PFE","KO","PEP","MRK","ABT","TMO","NKE","ORCL",
    "CSCO","ADBE","CRM","AVGO","QCOM","TXN","ACN","MDT","UPS","HON","LIN"
}


def _resolve(ticker: str) -> str:
    """Map human names to yfinance tickers; return as-is for unknown symbols."""
    return COMMON_INDICES.get(ticker.upper(), ticker.upper())


def _fetch_with_fallback(fetch_fn, raw_ticker: str):
    """Fix #18: Try the direct ticker first; only attempt .NS fallback if not a known US ticker."""
    t = _resolve(raw_ticker)
    try:
        return fetch_fn(t)
    except Exception:
        # Skip .NS fallback for index symbols (^) and known US tickers
        if t.startswith("^") or t in US_TICKERS or "." in t:
            raise
        return fetch_fn(f"{t}.NS")


@cached(cache=finance_cache)
def get_stock_price(ticker: str) -> str:
    def fetch(t):
        stock = yf.Ticker(t)
        hist = stock.history(period='1d')
        if hist.empty:
            raise ValueError("No price data found")
        price = hist['Close'].iloc[-1]
        currency = stock.info.get('currency', 'INR' if ('.NS' in t or '.BO' in t or t.startswith('^NSE')) else 'USD')
        return f"The current price of {ticker.upper()} is {price:.2f} {currency}."

    try:
        return _fetch_with_fallback(fetch, ticker)
    except Exception:
        return f"Could not fetch price for {ticker}. Please check the symbol."


@cached(cache=finance_cache)
def get_currency_rate(base: str, target: str) -> str:
    try:
        pair = yf.Ticker(f"{base}{target}=X")
        rate = pair.history(period='1d')['Close'].iloc[-1]
        return f"1 {base.upper()} is equal to {rate:.4f} {target.upper()}."
    except Exception:
        return f"Could not fetch exchange rate for {base} to {target}."


@cached(cache=finance_cache)
def get_stock_performance(ticker: str, period: str = "6mo") -> str:
    def fetch(t):
        stock = yf.Ticker(t)
        hist = stock.history(period=period)
        if hist.empty or len(hist) < 2:
            raise ValueError("No historical price data found")
        start_price = hist['Close'].iloc[0]
        end_price   = hist['Close'].iloc[-1]
        currency = stock.info.get('currency', 'INR' if '.NS' in t else 'USD')
        diff = end_price - start_price
        pct  = (diff / start_price) * 100
        direction = "increased" if diff >= 0 else "decreased"
        return f"Over the last {period}, {ticker.upper()} has {direction} by {abs(pct):.2f}%. It went from {start_price:.2f} to {end_price:.2f} {currency}."

    try:
        return _fetch_with_fallback(fetch, ticker)
    except Exception:
        return f"Could not fetch historical performance for {ticker}. Please check the symbol."


@cached(cache=finance_cache)
def get_stock_news(ticker: str) -> dict:
    def fetch(t):
        stock = yf.Ticker(t)
        news = stock.news
        if not news:
            raise ValueError("No news found")
        return news

    try:
        news = _fetch_with_fallback(fetch, ticker)
        headlines = []
        for item in news[:5]:
            title = (item.get("content", {}).get("title") or item.get("title") or "")
            if title:
                headlines.append(title)
        return {"ticker": ticker.upper(), "headlines": headlines}
    except Exception as e:
        return {"ticker": ticker.upper(), "headlines": [], "error": str(e)}


@cached(cache=finance_cache)
def get_stock_comparison_data(ticker1: str, ticker2: str, period: str = "6mo") -> dict:
    def fetch_history(t):
        stock = yf.Ticker(t)
        hist = stock.history(period=period)["Close"]
        if hist.empty:
            raise ValueError(f"No data for {t}")
        normalized = (hist / hist.iloc[0] * 100).round(2)
        normalized.index = normalized.index.strftime('%Y-%m-%d')
        return normalized

    results = {}
    for raw_ticker in [ticker1, ticker2]:
        try:
            results[raw_ticker.upper()] = _fetch_with_fallback(fetch_history, raw_ticker).to_dict()
        except Exception:
            results[raw_ticker.upper()] = {}

    return {"period": period, "data": results}
