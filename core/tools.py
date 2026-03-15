# core/tools.py
import ast
import json
import logging
import operator
import re
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from urllib.parse import urlparse
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from ddgs import DDGS

from .config import CALCULATOR_MAX_LEN, MAX_SEARCH_RESULTS

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Base
# ---------------------------------------------------------------------------
class Tool:
    name: str = ""
    description: str = ""
    example: str = ""

    def execute(self, arg: str) -> str:
        raise NotImplementedError


# ---------------------------------------------------------------------------
# Calculator — AST-based safe evaluator (no eval())
# ---------------------------------------------------------------------------
class Calculator(Tool):
    name = "calculate"
    description = "Evaluate a math expression safely."
    example = "calculate[200 * 0.15]"

    _OPERATORS = {
        ast.Add: operator.add,
        ast.Sub: operator.sub,
        ast.Mult: operator.mul,
        ast.Div: operator.truediv,
        ast.Pow: operator.pow,
        ast.Mod: operator.mod,
        ast.FloorDiv: operator.floordiv,
        ast.USub: operator.neg,
        ast.UAdd: operator.pos,
    }

    def _safe_eval(self, node):
        if isinstance(node, ast.Constant):
            if isinstance(node.value, (int, float)):
                return node.value
            raise ValueError(f"Unsupported type: {type(node.value)}")
        if isinstance(node, ast.BinOp):
            op_type = type(node.op)
            if op_type not in self._OPERATORS:
                raise ValueError(f"Unsupported operator: {op_type.__name__}")
            return self._OPERATORS[op_type](
                self._safe_eval(node.left), self._safe_eval(node.right)
            )
        if isinstance(node, ast.UnaryOp):
            op_type = type(node.op)
            if op_type not in self._OPERATORS:
                raise ValueError(f"Unsupported unary operator: {op_type.__name__}")
            return self._OPERATORS[op_type](self._safe_eval(node.operand))
        raise ValueError(f"Disallowed expression: {ast.dump(node)}")

    def execute(self, arg: str) -> str:
        arg = arg.strip()
        if not arg:
            return "Error: Empty expression."
        if len(arg) > CALCULATOR_MAX_LEN:
            return f"Error: Expression too long (max {CALCULATOR_MAX_LEN} chars)."
        try:
            tree = ast.parse(arg, mode="eval")
            result = self._safe_eval(tree.body)
            if isinstance(result, float) and result.is_integer():
                return str(int(result))
            return str(round(result, 10))
        except ZeroDivisionError:
            return "Error: Division by zero."
        except (ValueError, TypeError) as e:
            return f"Error: {e}"
        except SyntaxError:
            return "Error: Invalid expression syntax."
        except Exception as e:
            logger.error(f"Calculator unexpected error: {e}", exc_info=True)
            return f"Unexpected error: {e}"


# ---------------------------------------------------------------------------
# WebSearch — DuckDuckGo text search
# ---------------------------------------------------------------------------
class WebSearch(Tool):
    name = "search"
    description = "Search the web using DuckDuckGo."
    example = "search[latest news about AI]"

    def execute(self, arg: str) -> str:
        query = arg.strip()
        if not query:
            return "Error: Empty search query."
        try:
            results = []
            with DDGS() as ddgs:
                for r in ddgs.text(query, max_results=MAX_SEARCH_RESULTS):
                    title = r.get("title", "").strip()
                    snippet = r.get("body", "").strip()
                    url = r.get("href", "").strip()
                    results.append(
                        f"Title  : {title}\nSnippet: {snippet}\nURL    : {url}"
                    )
            if not results:
                return "No search results found."
            return "\n---\n".join(results)
        except Exception as e:
            logger.error(f"WebSearch error: {e}", exc_info=True)
            return f"Web search error: {e}"

    def search_raw(self, query: str, max_results: int = MAX_SEARCH_RESULTS) -> list:
        """Structured results for the /search API endpoint."""
        query = query.strip()
        if not query:
            return []
        results = []
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=max_results):
                url = r.get("href", "")
                try:
                    parsed = urlparse(url)
                    domain = parsed.netloc.replace("www.", "")
                    path = parsed.path[:60] if parsed.path else ""
                except Exception:
                    domain = ""
                    path = ""
                results.append(
                    {
                        "title": r.get("title", "").strip(),
                        "snippet": r.get("body", "").strip(),
                        "url": url,
                        "domain": domain,
                        "path": path,
                    }
                )
        return results


# ---------------------------------------------------------------------------
# DateTime — current date/time with optional timezone
# ---------------------------------------------------------------------------
class DateTime(Tool):
    name = "datetime"
    description = "Get the current date and time. Optionally specify a timezone (e.g. Asia/Jakarta, America/New_York, UTC)."
    example = "datetime[Asia/Jakarta]"

    def execute(self, arg: str) -> str:
        arg = arg.strip()

        # No arg or generic keywords → local + UTC
        if not arg or arg.lower() in ("now", "today", "current", "time", "date"):
            now_utc = datetime.now(timezone.utc)
            now_local = datetime.now()
            return (
                f"Current date & time:\n"
                f"  UTC   : {now_utc.strftime('%A, %d %B %Y  %H:%M:%S')} UTC\n"
                f"  Local : {now_local.strftime('%A, %d %B %Y  %H:%M:%S')}"
            )

        # Try named timezone
        try:
            tz = ZoneInfo(arg)
            now = datetime.now(tz)
            return (
                f"Date & time in {arg}:\n"
                f"  {now.strftime('%A, %d %B %Y  %H:%M:%S %Z (UTC%z)')}"
            )
        except ZoneInfoNotFoundError:
            # Fallback: treat arg as a city hint, still return UTC
            now_utc = datetime.now(timezone.utc)
            return (
                f"Timezone '{arg}' not recognised. Current UTC time:\n"
                f"  {now_utc.strftime('%A, %d %B %Y  %H:%M:%S')} UTC\n"
                f"Tip: use IANA timezone names, e.g. Asia/Jakarta, Europe/London, US/Eastern."
            )
        except Exception as e:
            return f"DateTime error: {e}"


# ---------------------------------------------------------------------------
# Weather — wttr.in (free, no API key)
# ---------------------------------------------------------------------------
class Weather(Tool):
    name = "weather"
    description = "Get current weather for any city or location."
    example = "weather[Jakarta]"

    def execute(self, arg: str) -> str:
        city = arg.strip()
        if not city:
            return "Error: City name is required. Example: weather[London]"
        try:
            encoded = urllib.parse.quote(city)
            url = f"https://wttr.in/{encoded}?format=4"
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "OuwiboAgent/1.0 (curl/7.0)"},
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                result = resp.read().decode("utf-8").strip()

            if result:
                return f"Weather in {city}:\n{result}"
            return f"Could not retrieve weather for '{city}'."
        except Exception as e:
            logger.error(f"Weather error for '{city}': {e}", exc_info=True)
            return f"Weather error: {e}"


# ---------------------------------------------------------------------------
# Wikipedia — English Wikipedia summary
# ---------------------------------------------------------------------------
class Wikipedia(Tool):
    name = "wikipedia"
    description = "Look up a topic on Wikipedia and return a summary."
    example = "wikipedia[Artificial Intelligence]"

    _API = "https://en.wikipedia.org/w/api.php"

    def _get(self, params: dict) -> dict:
        qs = urllib.parse.urlencode(params)
        url = f"{self._API}?{qs}"
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "OuwiboAgent/1.0"},
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8"))

    def execute(self, arg: str) -> str:
        query = arg.strip()
        if not query:
            return "Error: A search query is required."
        try:
            # Step 1 — find the best matching title
            search_data = self._get(
                {
                    "action": "query",
                    "list": "search",
                    "srsearch": query,
                    "format": "json",
                    "srlimit": 1,
                }
            )
            hits = search_data.get("query", {}).get("search", [])
            if not hits:
                return f"No Wikipedia article found for: '{query}'"

            title = hits[0]["title"]

            # Step 2 — fetch plain-text intro
            extract_data = self._get(
                {
                    "action": "query",
                    "titles": title,
                    "prop": "extracts",
                    "exintro": True,
                    "explaintext": True,
                    "format": "json",
                }
            )
            pages = extract_data.get("query", {}).get("pages", {})
            for page in pages.values():
                extract = page.get("extract", "").strip()
                if not extract:
                    return f"Article '{title}' has no summary text."
                # Trim to 1 200 characters
                summary = extract[:1200]
                if len(extract) > 1200:
                    summary += "…"
                slug = title.replace(" ", "_")
                link = f"https://en.wikipedia.org/wiki/{urllib.parse.quote(slug)}"
                return f"**{title}**\n\n{summary}\n\nSource: {link}"

            return f"Could not retrieve article for '{title}'."
        except Exception as e:
            logger.error(f"Wikipedia error: {e}", exc_info=True)
            return f"Wikipedia error: {e}"


# ---------------------------------------------------------------------------
# NewsSearch — DuckDuckGo news
# ---------------------------------------------------------------------------
class NewsSearch(Tool):
    name = "news"
    description = "Get the latest news articles on any topic."
    example = "news[AI breakthroughs 2025]"

    def execute(self, arg: str) -> str:
        query = arg.strip()
        if not query:
            return "Error: A topic is required. Example: news[technology]"
        try:
            articles = []
            with DDGS() as ddgs:
                for r in ddgs.news(query, max_results=5):
                    title = r.get("title", "").strip()
                    body = r.get("body", "").strip()
                    source = r.get("source", "").strip()
                    url = r.get("url", "").strip()
                    date = r.get("date", "").strip()
                    articles.append(
                        f"📰 {title}\n"
                        f"   {body[:200]}{'…' if len(body) > 200 else ''}\n"
                        f"   {source}  {date}\n"
                        f"   {url}"
                    )
            if not articles:
                return f"No news found for: '{query}'"
            return "\n\n".join(articles)
        except Exception as e:
            logger.error(f"NewsSearch error: {e}", exc_info=True)
            return f"News search error: {e}"


# ---------------------------------------------------------------------------
# CurrencyConverter — Frankfurter.app (ECB data, free, no API key)
# ---------------------------------------------------------------------------
class CurrencyConverter(Tool):
    name = "currency"
    description = (
        "Convert between currencies. Format: 'AMOUNT FROM to TO' or 'FROM to TO'."
    )
    example = "currency[100 USD to IDR]"

    _API = "https://api.frankfurter.app/latest"

    def execute(self, arg: str) -> str:
        arg = arg.strip().upper()
        if not arg:
            return "Error: Provide a conversion like '100 USD to IDR'."

        # Parse patterns
        m = re.match(r"^(\d+(?:[.,]\d+)?)\s+([A-Z]{3})\s+(?:TO\s+)?([A-Z]{3})$", arg)
        if m:
            amount = float(m.group(1).replace(",", "."))
            from_cur = m.group(2)
            to_cur = m.group(3)
        else:
            m2 = re.match(r"^([A-Z]{3})\s+(?:TO\s+)?([A-Z]{3})$", arg)
            if m2:
                amount = 1.0
                from_cur = m2.group(1)
                to_cur = m2.group(2)
            else:
                return (
                    "Error: Could not parse conversion.\n"
                    "Use format: '100 USD to IDR' or 'EUR to JPY'"
                )

        if from_cur == to_cur:
            return f"{amount} {from_cur} = {amount} {to_cur} (same currency)"

        try:
            qs = urllib.parse.urlencode(
                {
                    "amount": amount,
                    "from": from_cur,
                    "to": to_cur,
                }
            )
            url = f"{self._API}?{qs}"
            req = urllib.request.Request(url, headers={"User-Agent": "OuwiboAgent/1.0"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))

            if "rates" not in data:
                msg = data.get("message", "Unknown error")
                return f"Conversion failed: {msg}"

            rate = data["rates"].get(to_cur)
            if rate is None:
                return f"Currency '{to_cur}' is not supported."

            base_rate = rate / amount if amount else rate
            return (
                f"{amount:,.2f} {from_cur} = **{rate:,.4f} {to_cur}**\n"
                f"Rate: 1 {from_cur} = {base_rate:,.6f} {to_cur}\n"
                f"Source: European Central Bank (via frankfurter.app)"
            )
        except Exception as e:
            logger.error(f"CurrencyConverter error: {e}", exc_info=True)
            return f"Currency conversion error: {e}"


# ---------------------------------------------------------------------------
# URLReader — fetch and extract readable text from any URL
# ---------------------------------------------------------------------------
class _TextExtractor(HTMLParser):
    """Minimal HTML → plain text extractor."""

    _SKIP_TAGS = {
        "script",
        "style",
        "noscript",
        "nav",
        "footer",
        "header",
        "aside",
        "form",
        "head",
    }

    def __init__(self):
        super().__init__()
        self._skip_depth = 0
        self._parts: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() in self._SKIP_TAGS:
            self._skip_depth += 1

    def handle_endtag(self, tag):
        if tag.lower() in self._SKIP_TAGS and self._skip_depth > 0:
            self._skip_depth -= 1

    def handle_data(self, data):
        if self._skip_depth == 0:
            text = data.strip()
            if text:
                self._parts.append(text)

    def get_text(self) -> str:
        return " ".join(self._parts)


class URLReader(Tool):
    name = "read_url"
    description = "Fetch and read the main text content of any URL."
    example = "read_url[https://example.com/article]"

    _MAX_CHARS = 3000

    def execute(self, arg: str) -> str:
        url = arg.strip()
        if not url:
            return "Error: A URL is required."
        if not url.startswith(("http://", "https://")):
            url = "https://" + url
        try:
            req = urllib.request.Request(
                url,
                headers={
                    "User-Agent": (
                        "Mozilla/5.0 (compatible; OuwiboAgent/1.0; "
                        "+https://github.com/ouwibo)"
                    ),
                    "Accept": "text/html,application/xhtml+xml,*/*",
                },
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                content_type = resp.headers.get("Content-Type", "")
                if "html" not in content_type and "text" not in content_type:
                    return f"Cannot read non-text content ({content_type}) at {url}"
                raw = resp.read(500_000).decode("utf-8", errors="replace")

            extractor = _TextExtractor()
            extractor.feed(raw)
            text = extractor.get_text()

            # Collapse whitespace
            text = re.sub(r"\s{3,}", "  ", text).strip()

            if not text:
                return f"No readable text found at {url}"

            snippet = text[: self._MAX_CHARS]
            if len(text) > self._MAX_CHARS:
                snippet += "…"

            return f"Content from {url}:\n\n{snippet}"
        except Exception as e:
            logger.error(f"URLReader error for '{url}': {e}", exc_info=True)
            return f"URL read error: {e}"


# ---------------------------------------------------------------------------
# Registry — all available tools with metadata (for the /tools API & UI)
# ---------------------------------------------------------------------------
ALL_TOOLS: list[type[Tool]] = [
    Calculator,
    WebSearch,
    DateTime,
    Weather,
    Wikipedia,
    NewsSearch,
    CurrencyConverter,
    URLReader,
]
