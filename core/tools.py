# core/tools.py
import ast
import json
import logging
import operator
import os
import re
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from urllib.parse import urlparse
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from translate import Translator as PyTranslator
import yfinance as yf

from .config import CALCULATOR_MAX_LEN, MAX_SEARCH_RESULTS

logger = logging.getLogger(__name__)

try:
    from ddgs import DDGS  # type: ignore
except Exception:  # pragma: no cover
    DDGS = None

try:
    from googlesearch import search as gsearch  # type: ignore
except Exception:  # pragma: no cover
    gsearch = None


def _urls_to_results(urls: list[str], kind: str, provider: str) -> list[dict]:
    results = []
    for url in urls:
        url = (url or "").strip()
        if not url:
            continue
        try:
            parsed = urlparse(url)
            domain = parsed.netloc.replace("www.", "")
            path = parsed.path[:60] if parsed.path else ""
        except Exception:
            domain = ""
            path = ""
        results.append(
            {
                "title": url,
                "snippet": "",
                "url": url,
                "domain": domain,
                "path": path,
                "type": kind,
                "provider": provider,
            }
        )
    return results


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

    def _default_provider(self) -> str:
        # "free google" in this project means using googlesearch-python (URLs only).
        return (os.getenv("SEARCH_PROVIDER") or "auto").strip().lower()

    def execute(self, arg: str) -> str:
        query = arg.strip()
        if not query:
            return "Error: Empty search query."

        provider = self._default_provider()

        try:
            # Prefer Google, fallback to DDG on rate-limit/errors.
            if provider in ("auto", "google", "g"):
                if gsearch:
                    try:
                        urls = [u for u in gsearch(query, num_results=MAX_SEARCH_RESULTS)]
                        if urls:
                            return "Found these links on Google:\n" + "\n".join(urls)
                    except Exception as e:
                        logger.warning(f"Google search failed; falling back to DDG: {e}")

            if provider in ("ddg", "duckduckgo"):
                if DDGS is None:
                    raise RuntimeError("DuckDuckGo search provider is not available (missing dependency).")
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

            if provider == "auto":
                return "No search results found."

            return f"Error: Unsupported search provider '{provider}'. Use 'auto', 'google', or 'ddg'."
        except Exception as e:
            logger.error(f"WebSearch error: {e}", exc_info=True)
            return f"Web search error: {e}"

    def search_raw(
        self,
        query: str,
        max_results: int = MAX_SEARCH_RESULTS,
        kind: str = "text",
        provider: str = "google",
    ) -> list:
        """Structured results for the /search API endpoint.

        kind: text | news | images | videos | all
        """
        query = query.strip()
        kind = (kind or "text").strip().lower()
        provider = (provider or "auto").strip().lower()
        if not query:
            return []

        if kind == "all":
            kind = "text"

        allowed = {"text", "news", "images", "videos"}
        if kind not in allowed:
            raise ValueError(f"Unsupported search type: {kind}")

        # Google provider: supports only type=text (URLs only).
        if provider in ("auto", "google", "g"):
            if kind == "text" and gsearch:
                try:
                    urls = [u for u in gsearch(query, num_results=max_results)]
                    if urls:
                        return _urls_to_results(urls, kind="text", provider="google")
                except Exception as e:
                    logger.warning(f"Google search failed; falling back to DDG: {e}")
            # For non-text kinds, or if Google fails: fall back to DDG if available.
            provider = "ddg"

        if provider not in ("ddg", "duckduckgo"):
            raise ValueError(f"Unsupported search provider: {provider}")

        if DDGS is None:
            raise RuntimeError("DuckDuckGo search provider is not available (missing dependency).")

        def _pick_url(row: dict) -> str:
            return (
                row.get("href")
                or row.get("url")
                or row.get("link")
                or row.get("page")
                or row.get("source")
                or ""
            ).strip()

        def _pick_title(row: dict) -> str:
            return (row.get("title") or row.get("heading") or row.get("text") or "").strip()

        def _pick_snippet(row: dict) -> str:
            return (
                row.get("body")
                or row.get("snippet")
                or row.get("description")
                or row.get("content")
                or row.get("excerpt")
                or ""
            ).strip()

        results = []
        with DDGS() as ddgs:
            if kind == "text":
                iterator = ddgs.text(query, max_results=max_results)
            elif kind == "news":
                iterator = ddgs.news(query, max_results=max_results)
            elif kind == "images":
                iterator = ddgs.images(query, max_results=max_results)
            else:  # videos
                iterator = ddgs.videos(query, max_results=max_results)

            for r in iterator:
                url = _pick_url(r)
                try:
                    parsed = urlparse(url)
                    domain = parsed.netloc.replace("www.", "")
                    path = parsed.path[:60] if parsed.path else ""
                except Exception:
                    domain = ""
                    path = ""

                item = {
                    "title": _pick_title(r) or url,
                    "snippet": _pick_snippet(r),
                    "url": url,
                    "domain": domain,
                    "path": path,
                    "type": kind,
                }

                # Enrich media results where available (frontend may ignore).
                if kind == "images":
                    item["image"] = (r.get("image") or r.get("thumbnail") or "").strip()
                    item["thumbnail"] = (r.get("thumbnail") or "").strip()
                    item["source"] = (r.get("source") or "").strip()
                if kind == "videos":
                    item["thumbnail"] = (r.get("images") or r.get("thumbnail") or "").strip()
                    item["duration"] = (r.get("duration") or "").strip()
                    item["published"] = (r.get("published") or r.get("date") or "").strip()

                results.append(item)

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
# Wikipedia — Multi-language support (ID/EN)
# ---------------------------------------------------------------------------
class Wikipedia(Tool):
    name = "wikipedia"
    description = "Look up a topic on Wikipedia (Auto-detects Indonesian/English)."
    example = "wikipedia[Kecerdasan Buatan]"

    def _get(self, lang: str, params: dict) -> dict:
        api_url = f"https://{lang}.wikipedia.org/w/api.php"
        qs = urllib.parse.urlencode(params)
        url = f"{api_url}?{qs}"
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "OuwiboAgent/1.0 (https://github.com/ouwibo)"},
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8"))

    def execute(self, arg: str) -> str:
        query = arg.strip()
        if not query:
            return "Error: A search query is required."
        
        # Simple language detection: if query has common ID words, use 'id', else 'en'
        id_keywords = ["apa", "siapa", "dimana", "yang", "adalah", "dan", "di", "itu", "dari"]
        lang = "id" if any(word in query.lower().split() for word in id_keywords) else "en"
        
        try:
            # Step 1 — find the best matching title
            search_data = self._get(lang,
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
                # If ID fails, try EN as fallback
                if lang == "id":
                    return self.execute(query + " (fallback en)")
                return f"No Wikipedia article found for: '{query}'"

            title = hits[0]["title"]

            # Step 2 — fetch plain-text intro
            extract_data = self._get(lang,
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
                
                summary = extract[:1500]
                if len(extract) > 1500:
                    summary += "…"
                
                slug = title.replace(" ", "_")
                link = f"https://{lang}.wikipedia.org/wiki/{urllib.parse.quote(slug)}"
                return f"**{title} ({lang.upper()})**\n\n{summary}\n\nSource: {link}"

            return f"Could not retrieve article for '{title}'."
        except Exception as e:
            logger.error(f"Wikipedia error: {e}", exc_info=True)
            return f"Wikipedia error: {e}"


# ---------------------------------------------------------------------------
# PhindSearch — Specialized for code and scripts
# ---------------------------------------------------------------------------
class PhindSearch(Tool):
    name = "phind"
    description = "Pro developer search for scripts, debugging, and code logic."
    example = "phind[python script to encrypt folder with password]"

    def execute(self, arg: str) -> str:
        query = arg.strip()
        if not query:
            return "Error: Provide a coding topic."
        
        # Crafting a query that forces high-quality dev results
        # Phind often gives the best answers for these sites
        dev_query = f"{query} site:stackoverflow.com OR site:github.com OR site:docs.python.org OR site:npmjs.com"
        
        try:
            results = []
            with DDGS() as ddgs:
                # We use 'text' search but filter for code-heavy sites
                for r in ddgs.text(dev_query, max_results=4):
                    title = r.get("title", "").strip()
                    url = r.get("href", "").strip()
                    snippet = r.get("body", "").strip()
                    results.append(f"🔹 **{title}**\n   {url}\n   _{snippet}_")
            
            if not results:
                return f"No code solutions found for '{query}'."
            
            header = f"🚀 **Phind-Style Dev Results for:** _{query}_\n\n"
            return header + "\n\n".join(results)
        except Exception as e:
            return f"Phind search error: {e}"


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

            return f"URL from {url}:\n\n{snippet}"
        except Exception as e:
            logger.error(f"URLReader error for '{url}': {e}", exc_info=True)
            return f"URL read error: {e}"


# ---------------------------------------------------------------------------
# GoogleSearch — Google Search (via googlesearch-python)
# ---------------------------------------------------------------------------
class GoogleSearch(Tool):
    name = "google_search"
    description = "Search the web using Google."
    example = "google_search[latest news about AI]"

    def search_raw(self, query: str, max_results: int = MAX_SEARCH_RESULTS) -> list[dict]:
        query = query.strip()
        if not query:
            return []
        if not gsearch:
            raise RuntimeError("Google search provider is not available (missing dependency).")
        urls = [u for u in gsearch(query, num_results=max_results)]
        return _urls_to_results(urls, kind="text", provider="google")

    def execute(self, arg: str) -> str:
        query = arg.strip()
        if not query:
            return "Error: Empty search query."
        try:
            results = []
            # Fetch up to 5 results
            if not gsearch:
                return "Google search provider is not available (missing dependency)."
            for url in gsearch(query, num_results=MAX_SEARCH_RESULTS):
                results.append(f"URL: {url}")
            
            if not results:
                return "No Google search results found."
            return "Found these links on Google:\n" + "\n".join(results)
        except Exception as e:
            logger.error(f"GoogleSearch error: {e}", exc_info=True)
            return f"Google search error: {e}"


# ---------------------------------------------------------------------------
# Translator — Multi-language translation
# ---------------------------------------------------------------------------
class Translator(Tool):
    name = "translate"
    description = "Translate text between languages. Format: 'TEXT to LANGUAGE' or 'TEXT (from LANG to LANG)'."
    example = "translate[Halo dunia to English]"

    def execute(self, arg: str) -> str:
        arg = arg.strip()
        if not arg:
            return "Error: Provide text to translate. Example: translate[Apple to Indonesian]"
        
        # Simple pattern: "TEXT to LANGUAGE"
        m = re.match(r"^(.*)\s+to\s+([a-zA-Z\s]+)$", arg, re.IGNORECASE)
        if m:
            text = m.group(1).strip()
            to_lang = m.group(2).strip()
            try:
                translator = PyTranslator(to_lang=to_lang)
                translation = translator.translate(text)
                return f"Translation ({to_lang}): {translation}"
            except Exception as e:
                return f"Translation error: {e}"
        
        return "Error: Use format 'TEXT to LANGUAGE', e.g., translate[Coffee to Japanese]"


# ---------------------------------------------------------------------------
# Dictionary — Word definitions
# ---------------------------------------------------------------------------
class Dictionary(Tool):
    name = "dictionary"
    description = "Get the definition and meaning of an English word."
    example = "dictionary[resilience]"

    _API = "https://api.dictionaryapi.dev/api/v2/entries/en/"

    def execute(self, arg: str) -> str:
        word = arg.strip().lower()
        if not word:
            return "Error: A word is required. Example: dictionary[resilience]"
        try:
            url = f"{self._API}{urllib.parse.quote(word)}"
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "OuwiboAgent/1.0"},
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            
            if not data or not isinstance(data, list):
                return f"No definition found for '{word}'"
            
            entry = data[0]
            word = entry.get("word", word)
            phonetics = entry.get("phonetic", "")
            
            meanings = entry.get("meanings", [])
            if not meanings:
                return f"No definition found for '{word}'"
            
            results = []
            if phonetics:
                results.append(f"**{word}** {phonetics}")
            else:
                results.append(f"**{word}**")
            
            for meaning in meanings[:2]:  # Limit to 2 meanings
                part_of_speech = meaning.get("partOfSpeech", "")
                definitions = meaning.get("definitions", [])
                
                if part_of_speech and definitions:
                    results.append(f"\n*{part_of_speech}*:")
                    for i, defn in enumerate(definitions[:2], 1):  # Limit to 2 definitions
                        definition = defn.get("definition", "")
                        example = defn.get("example", "")
                        results.append(f"  {i}. {definition}")
                        if example:
                            results.append(f"     Example: {example}")
            
            return "\n".join(results)
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return f"Word '{word}' not found in dictionary."
            return f"Dictionary error: {e}"
        except Exception as e:
            logger.error(f"Dictionary error: {e}", exc_info=True)
            return f"Dictionary error: {e}"


# ---------------------------------------------------------------------------
# StockMarket — Stock and Crypto prices
# ---------------------------------------------------------------------------
class StockMarket(Tool):
    name = "stocks"
    description = "Get real-time price and info for stocks (e.g. AAPL, TSLA) or crypto (e.g. BTC-USD)."
    example = "stocks[AAPL]"

    def execute(self, arg: str) -> str:
        symbol = arg.strip().upper()
        if not symbol:
            return "Error: Provide a symbol like AAPL or BTC-USD."
        try:
            ticker = yf.Ticker(symbol)
            
            # Use currentPrice from regular info
            data = ticker.info
            last_price = data.get("currentPrice") or data.get("regularMarketPrice") or data.get("price")

            if last_price is None:
                return f"Could not find price data for symbol '{symbol}'."
            
            currency = data.get("currency", "USD")
            name = data.get("longName") or symbol
            
            return (
                f"**{name} ({symbol})**\n"
                f"Price: {last_price:,.2f} {currency}"
            )
        except Exception as e:
            return f"Stock/Crypto error: {e}"


# ---------------------------------------------------------------------------
# Crypto — CoinGecko (free, no API key)
# ---------------------------------------------------------------------------
class CryptoMarket(Tool):
    name = "crypto"
    description = "Get crypto market data via CoinGecko (no API key). Supports: price, top N, trending."
    example = "crypto[btc usd] or crypto[top 10 usd] or crypto[trending]"

    _BASE = "https://api.coingecko.com/api/v3"

    def _get_json(self, url: str, timeout: int = 12) -> Any:
        req = urllib.request.Request(url, headers={"User-Agent": "OuwiboAgent/1.0"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))

    def _resolve_coin_id(self, query: str) -> tuple[str, str]:
        """Return (coin_id, display_name)."""
        q = (query or "").strip()
        if not q:
            raise ValueError("Empty coin query.")
        url = f"{self._BASE}/search?query={urllib.parse.quote(q)}"
        data = self._get_json(url)
        coins = data.get("coins") or []
        if not coins:
            raise ValueError(f"No coin found for query: {q}")

        # Prefer exact symbol match if possible.
        sym = q.lower().replace("-", "").strip()
        best = None
        for c in coins[:10]:
            csym = (c.get("symbol") or "").lower().replace("-", "")
            if csym == sym and csym:
                best = c
                break
        if best is None:
            best = coins[0]

        cid = (best.get("id") or "").strip()
        name = (best.get("name") or cid).strip()
        if not cid:
            raise ValueError("CoinGecko search returned an invalid coin id.")
        return cid, name

    def execute(self, arg: str) -> str:
        raw = (arg or "").strip()
        if not raw:
            return "Error: Provide a coin symbol/name. Example: crypto[btc usd] or crypto[top 10 usd] or crypto[trending]"

        parts = raw.split()
        cmd = parts[0].lower()

        try:
            if cmd == "trending":
                data = self._get_json(f"{self._BASE}/search/trending")
                coins = data.get("coins") or []
                if not coins:
                    return "No trending data found."
                out = ["**Trending (CoinGecko):**"]
                for i, wrap in enumerate(coins[:10], 1):
                    item = wrap.get("item") or {}
                    name = item.get("name") or "?"
                    sym = item.get("symbol") or "?"
                    score = item.get("score")
                    out.append(f"{i}. {name} ({sym})" + (f" — score {score}" if score is not None else ""))
                return "\n".join(out)

            if cmd == "top":
                n = 10
                vs = "usd"
                if len(parts) >= 2 and parts[1].isdigit():
                    n = max(1, min(50, int(parts[1])))
                if len(parts) >= 3:
                    vs = parts[2].lower()
                url = (
                    f"{self._BASE}/coins/markets?"
                    f"vs_currency={urllib.parse.quote(vs)}&order=market_cap_desc&per_page={n}&page=1&"
                    f"sparkline=false&price_change_percentage=24h"
                )
                data = self._get_json(url)
                if not isinstance(data, list) or not data:
                    return "No market data returned."
                out = [f"**Top {n} by market cap (vs {vs.upper()}):**"]
                for i, c in enumerate(data[:n], 1):
                    name = c.get("name") or "?"
                    sym = (c.get("symbol") or "?").upper()
                    price = c.get("current_price")
                    chg = c.get("price_change_percentage_24h")
                    out.append(f"{i}. {name} ({sym}) — {price} {vs.upper()}" + (f" ({chg:+.2f}%)" if isinstance(chg, (int, float)) else ""))
                return "\n".join(out)

            # Default: crypto[<coin> [vs]]
            coin_query = parts[0]
            vs = parts[1].lower() if len(parts) >= 2 else "usd"
            cid, name = self._resolve_coin_id(coin_query)
            url = (
                f"{self._BASE}/simple/price?"
                f"ids={urllib.parse.quote(cid)}&vs_currencies={urllib.parse.quote(vs)}&"
                f"include_24hr_change=true&include_last_updated_at=true"
            )
            data = self._get_json(url)
            row = data.get(cid) or {}
            price = row.get(vs)
            chg = row.get(f"{vs}_24h_change")
            updated = row.get("last_updated_at")
            if price is None:
                return f"No price found for {name} (id={cid})."

            line = f"**{name}** — {price} {vs.upper()}"
            if isinstance(chg, (int, float)):
                line += f" ({chg:+.2f}% / 24h)"
            if isinstance(updated, (int, float)):
                try:
                    ts = datetime.fromtimestamp(int(updated), tz=timezone.utc).isoformat()
                    line += f"\nUpdated: {ts}"
                except Exception:
                    pass
            return line

        except Exception as e:
            logger.error(f"CryptoMarket error: {e}", exc_info=True)
            return f"CryptoMarket error: {e}"


# ---------------------------------------------------------------------------
# ENS — Resolve ENS name or address (free, no API key)
# ---------------------------------------------------------------------------
class ENSResolve(Tool):
    name = "ens"
    description = "Resolve an ENS name to address (or reverse by address) via a public API."
    example = "ens[vitalik.eth] or ens[0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045]"

    _API = "https://api.ensideas.com/ens/resolve/"

    def execute(self, arg: str) -> str:
        q = (arg or "").strip()
        if not q:
            return "Error: Provide an ENS name or address. Example: ens[vitalik.eth]"
        try:
            url = self._API + urllib.parse.quote(q)
            req = urllib.request.Request(url, headers={"User-Agent": "OuwiboAgent/1.0"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            name = (data.get("displayName") or data.get("name") or "").strip()
            addr = (data.get("address") or "").strip()
            avatar = (data.get("avatar") or "").strip()
            if not addr and not name:
                return "No ENS data found."
            out = []
            if name:
                out.append(f"Name: {name}")
            if addr:
                out.append(f"Address: {addr}")
            if avatar:
                out.append(f"Avatar: {avatar}")
            return "\n".join(out)
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return "ENS not found."
            return f"ENS error: HTTP {e.code}"
        except Exception as e:
            logger.error(f"ENSResolve error: {e}", exc_info=True)
            return f"ENSResolve error: {e}"


# ---------------------------------------------------------------------------
# Wallet — read-only helpers (no private keys)
# ---------------------------------------------------------------------------
class Wallet(Tool):
    name = "wallet"
    description = "Wallet utilities (read-only). Supports: balance <address_or_ens> [eth|base]."
    example = "wallet[balance vitalik.eth eth]"

    _RPC = {
        "eth": "https://cloudflare-eth.com",
        "ethereum": "https://cloudflare-eth.com",
        "base": "https://mainnet.base.org",
    }

    def _post_json(self, url: str, payload: dict, timeout: int = 12) -> Any:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json", "User-Agent": "OuwiboAgent/1.0"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))

    def _resolve_address(self, s: str) -> str:
        q = (s or "").strip()
        if not q:
            raise ValueError("Empty address/ENS.")
        if q.lower().endswith(".eth"):
            data = ENSResolve().execute(q)
            # Parse "Address: 0x..."
            for line in data.splitlines():
                if line.lower().startswith("address:"):
                    return line.split(":", 1)[1].strip()
            raise ValueError("Could not resolve ENS name.")
        return q

    def execute(self, arg: str) -> str:
        raw = (arg or "").strip()
        if not raw:
            return "Error: Provide a command. Example: wallet[balance vitalik.eth eth]"

        parts = raw.split()
        sub = parts[0].lower()
        if sub != "balance":
            return "Error: Unsupported wallet command. Use: balance <address_or_ens> [eth|base]"
        if len(parts) < 2:
            return "Error: Missing address/ENS. Example: wallet[balance vitalik.eth eth]"

        chain = parts[2].lower() if len(parts) >= 3 else "eth"
        rpc = self._RPC.get(chain)
        if not rpc:
            return "Error: Unsupported chain. Use: eth or base"

        try:
            addr = self._resolve_address(parts[1])
            payload = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "eth_getBalance",
                "params": [addr, "latest"],
            }
            resp = self._post_json(rpc, payload)
            bal_hex = (resp.get("result") or "").strip()
            if not bal_hex.startswith("0x"):
                return f"Wallet error: unexpected RPC response."
            wei = int(bal_hex, 16)
            eth = wei / 1e18
            return f"Address: {addr}\nChain: {chain}\nBalance: {eth:.8f} ETH"
        except Exception as e:
            logger.error(f"Wallet error: {e}", exc_info=True)
            return f"Wallet error: {e}"


# ---------------------------------------------------------------------------
# Social Search — targeted web search for social platforms
# ---------------------------------------------------------------------------
class SocialSearch(Tool):
    name = "social_search"
    description = "Search across social platforms (X/Twitter, Instagram, TikTok, LinkedIn) using web search."
    example = "social_search[ouwibo agent]"

    def execute(self, arg: str) -> str:
        q = (arg or "").strip()
        if not q:
            return "Error: Provide a query. Example: social_search[viral hooks for coffee shop]"

        sites = [
            "x.com",
            "twitter.com",
            "instagram.com",
            "tiktok.com",
            "linkedin.com",
            "facebook.com",
            "reddit.com",
            "youtube.com",
        ]
        site_query = " OR ".join([f"site:{s}" for s in sites])
        query = f"{q} ({site_query})"

        try:
            ws = WebSearch()
            results = []
            if hasattr(ws, "search_raw"):
                results = ws.search_raw(query, max_results=8, kind="text", provider="auto")
            if not results:
                # Fallback to human-readable output
                return ws.execute(query)

            out = ["**Social search results:**"]
            for r in results[:8]:
                title = (r.get("title") or "").strip()
                url = (r.get("url") or "").strip()
                domain = (r.get("domain") or "").strip()
                if url:
                    out.append(f"- {title or domain}\n  {url}")
            return "\n".join(out)
        except Exception as e:
            logger.error(f"SocialSearch error: {e}", exc_info=True)
            return f"SocialSearch error: {e}"
# ---------------------------------------------------------------------------
# CodeSearch — Find scripts, code snippets, and programming tutorials
# ---------------------------------------------------------------------------
class CodeSearch(Tool):
    name = "find_script"
    description = "Search for programming scripts, code snippets, and tutorials (Python, JS, etc.)."
    example = "find_script[python script for web scraping with beautifulsoup]"

    def execute(self, arg: str) -> str:
        query = arg.strip()
        if not query:
            return "Error: Provide a script topic to search."
        
        # We use a targeted query to find code
        search_query = f"{query} script code snippet site:github.com OR site:stackoverflow.com OR site:gist.github.com"
        
        try:
            results = []
            with DDGS() as ddgs:
                for r in ddgs.text(search_query, max_results=3):
                    title = r.get("title", "").strip()
                    url = r.get("href", "").strip()
                    snippet = r.get("body", "").strip()
                    results.append(f"Source: {title}\nURL: {url}\nSnippet: {snippet}")
            
            if not results:
                return f"Could not find any scripts for '{query}'."
            
            return "**Found Scripts/Code:**\n\n" + "\n---\n".join(results)
        except Exception as e:
            return f"CodeSearch error: {e}"


# ---------------------------------------------------------------------------
# Registry — all available tools with metadata (for the /tools API & UI)
# ---------------------------------------------------------------------------
ALL_TOOLS: list[type[Tool]] = [
    Calculator,
    WebSearch,
    GoogleSearch,
    DateTime,
    Weather,
    Wikipedia,
    NewsSearch,
    CurrencyConverter,
    Translator,
    Dictionary,
    StockMarket,
    CryptoMarket,
    ENSResolve,
    Wallet,
    SocialSearch,
    CodeSearch,
    PhindSearch,
    URLReader,
]
