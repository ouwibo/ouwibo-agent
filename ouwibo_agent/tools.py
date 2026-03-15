# ouwibo_agent/tools.py
import ast
import logging
import operator
from urllib.parse import urlparse

from ddgs import DDGS

from .config import CALCULATOR_MAX_LEN, MAX_SEARCH_RESULTS

logger = logging.getLogger(__name__)


class Tool:
    def execute(self, arg: str) -> str:
        raise NotImplementedError


# ---------------------------------------------------------------------------
# Calculator — AST-based safe evaluator (no eval())
# ---------------------------------------------------------------------------
class Calculator(Tool):
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
            raise ValueError(f"Tipe tidak didukung: {type(node.value)}")
        if isinstance(node, ast.BinOp):
            op_type = type(node.op)
            if op_type not in self._OPERATORS:
                raise ValueError(f"Operator tidak didukung: {op_type.__name__}")
            return self._OPERATORS[op_type](
                self._safe_eval(node.left), self._safe_eval(node.right)
            )
        if isinstance(node, ast.UnaryOp):
            op_type = type(node.op)
            if op_type not in self._OPERATORS:
                raise ValueError(f"Operator unary tidak didukung: {op_type.__name__}")
            return self._OPERATORS[op_type](self._safe_eval(node.operand))
        raise ValueError(f"Ekspresi tidak diizinkan: {ast.dump(node)}")

    def execute(self, arg: str) -> str:
        arg = arg.strip()
        if not arg:
            return "Error: Ekspresi kosong."
        if len(arg) > CALCULATOR_MAX_LEN:
            return (
                f"Error: Ekspresi terlalu panjang (maks {CALCULATOR_MAX_LEN} karakter)."
            )
        try:
            tree = ast.parse(arg, mode="eval")
            result = self._safe_eval(tree.body)
            if isinstance(result, float) and result.is_integer():
                return str(int(result))
            return str(result)
        except ZeroDivisionError:
            return "Error: Pembagian dengan nol."
        except (ValueError, TypeError) as e:
            return f"Error: {e}"
        except SyntaxError:
            return "Error: Sintaks ekspresi tidak valid."
        except Exception as e:
            logger.error(f"Calculator unexpected error: {e}", exc_info=True)
            return f"Error tidak terduga: {e}"


# ---------------------------------------------------------------------------
# WebSearch — DuckDuckGo
# ---------------------------------------------------------------------------
class WebSearch(Tool):
    def execute(self, arg: str) -> str:
        """Plain-text result for agent use."""
        query = arg.strip()
        if not query:
            return "Error: Query pencarian kosong."
        try:
            results = []
            with DDGS() as ddgs:
                for r in ddgs.text(query, max_results=MAX_SEARCH_RESULTS):
                    title = r.get("title", "").strip()
                    snippet = r.get("body", "").strip()
                    url = r.get("href", "").strip()
                    results.append(
                        f"Judul  : {title}\nSnippet: {snippet}\nSumber : {url}"
                    )
            if not results:
                return "Tidak ada hasil pencarian yang ditemukan."
            return "\n---\n".join(results)
        except Exception as e:
            logger.error(f"WebSearch.execute error: {e}", exc_info=True)
            return f"Error saat melakukan pencarian web: {e}"

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
