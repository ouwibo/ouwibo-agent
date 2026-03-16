# core/agent.py
import logging
import re
from typing import Any

from .memory import Memory
from .planner import Planner
from .config import MODELS
from .tools import (
    Calculator,
    CurrencyConverter,
    DateTime,
    NewsSearch,
    URLReader,
    Weather,
    WebSearch,
    Wikipedia,
)

logger = logging.getLogger(__name__)


class Agent:
    def __init__(self, client: Any):
        self.client = client
        self.memory = Memory()
        self.planner = Planner(client)
        self.tools = {
            "calculate": Calculator(),
            "search": WebSearch(),
            "datetime": DateTime(),
            "weather": Weather(),
            "wikipedia": Wikipedia(),
            "news": NewsSearch(),
            "currency": CurrencyConverter(),
            "read_url": URLReader(),
        }

    _UNCERTAIN_RE = re.compile(
        r"\b("
        r"tidak\s+tahu|gak\s+tahu|nggak\s+tahu|kurang\s+tahu|"
        r"tidak\s+yakin|ga\s+yakin|nggak\s+yakin|"
        r"i\s+don'?t\s+know|not\s+sure|uncertain|"
        r"cannot\s+find|can't\s+find|no\s+information"
        r")\b",
        re.IGNORECASE,
    )

    def _extract_llm_text(self, response: Any) -> str:
        try:
            text = response.choices[0].message.content
        except Exception:
            return ""
        if text is None:
            return ""
        return str(text).strip()

    def _best_effort_answer(self, task: str, context: str = "") -> str:
        """
        Direct answer mode: use the LLM normally (no tool-format constraints).
        Falls back to a short apology if the client call fails.
        """
        sys = (
            "You are Ouwibo Agent. Answer the user's question as best as you can. "
            "Be practical and specific. If you use web snippets provided, cite URLs inline. "
            "If you are uncertain, propose a reasonable next step rather than stopping."
        )
        user = task if not context else f"{task}\n\nCONTEXT:\n{context}"
        messages = [{"role": "system", "content": sys}]
        # Include recent memory (keeps continuity without exploding prompt)
        try:
            messages.extend(self.memory.get_history()[-8:])
        except Exception:
            pass
        messages.append({"role": "user", "content": user})

        last_err = None
        for model in MODELS:
            try:
                resp = self.client.chat.completions.create(
                    messages=messages,
                    model=model,
                    temperature=0.3,
                    max_tokens=900,
                )
                text = self._extract_llm_text(resp)
                if text:
                    return text
            except Exception as e:
                last_err = e
                continue

        if last_err:
            logger.warning(f"[Agent] best-effort LLM call failed: {last_err}")
        return "Maaf, aku lagi kesulitan menjawab itu sekarang. Coba ulangi dengan sedikit konteks tambahan atau pertanyaan yang lebih spesifik."

    def _looks_uncertain(self, text: str) -> bool:
        return bool(self._UNCERTAIN_RE.search(text or ""))

    def _search_read_and_summarize(self, task: str) -> str:
        """Auto-search + optional read_url for top results, then summarize."""
        # Avoid hitting the network in unit tests where the client is mocked.
        if type(self.client).__module__.startswith("unittest.mock"):
            return self._best_effort_answer(task)

        ws = self.tools.get("search")
        rr = self.tools.get("read_url")
        results = []
        try:
            if hasattr(ws, "search_raw"):
                results = ws.search_raw(task, max_results=8, kind="text", provider="auto")  # type: ignore[attr-defined]
        except Exception as e:
            logger.warning(f"[Agent] auto-search failed: {e}")

        urls = []
        for r in results:
            url = (r.get("url") or "").strip()
            if url:
                urls.append(url)
        urls = urls[:2]

        reads = []
        if rr and urls:
            for url in urls:
                try:
                    reads.append(rr.execute(url))
                except Exception as e:
                    reads.append(f"URL read error: {e}")

        context_parts = []
        if results:
            context_parts.append("SEARCH RESULTS:")
            for r in results[:8]:
                title = (r.get("title") or "").strip()
                url = (r.get("url") or "").strip()
                snip = (r.get("snippet") or "").strip()
                context_parts.append(f"- {title}\n  {url}\n  {snip}")
        if reads:
            context_parts.append("\nREAD_URL SNIPPETS:")
            for txt in reads:
                context_parts.append(txt)

        context = "\n".join(context_parts).strip()
        if context:
            # Keep tool results in memory so future turns can reuse them.
            self.memory.add("assistant", f"[auto-search context]\n{context[:3500]}")
            return self._best_effort_answer(task, context=context)

        return self._best_effort_answer(task)

    def run(self, task: str) -> str:
        logger.info(f"[Agent] Task diterima: {task!r}")
        self.memory.add("user", task)

        # Iterative Loop (ReAct)
        max_iterations = 8
        for i in range(max_iterations):
            logger.info(f"[Agent] Iterasi {i + 1}/{max_iterations}")

            # 1. Panggil Planner dengan riwayat saat ini
            try:
                plan = self.planner.plan(task, self.memory.get_history())
            except Exception as e:
                logger.error(f"[Agent] Planner gagal di iterasi {i + 1}: {e}", exc_info=True)
                prefix = f"Maaf, saya tidak dapat membuat rencana langkah. Saya akan coba jawab langsung. Error: {e}"
                direct = self._search_read_and_summarize(task)
                return f"{prefix}\n\n{direct}"

            if not plan:
                logger.warning("[Agent] Planner mengembalikan rencana kosong.")
                return self._search_read_and_summarize(task)

            # 2. Eksekusi semua langkah dalam rencana (biasanya satu atau dua per iterasi)
            progressed = False
            for step in plan:
                step = step.strip()
                if not step: continue

                match = re.match(r"^(\w+)\[(.+)\]$", step, re.DOTALL)
                if not match:
                    logger.warning(f"[Agent] Format langkah tidak valid: {step!r}")
                    continue

                command = match.group(1).lower()
                arg = match.group(2).strip()

                # --- finish ---
                if command == "finish":
                    logger.info(f"[Agent] Selesai. Jawaban: {arg!r}")
                    final = arg
                    # If the model bails out, force an auto-search pass.
                    if self._looks_uncertain(final):
                        final = self._search_read_and_summarize(task)
                    self.memory.add("assistant", final)
                    return final

                # --- think ---
                if command == "think":
                    logger.info(f"[Agent] Berpikir: {arg}")
                    # Jangan tambahkan "think" ke memori jika sudah ada agar tidak duplikat di prompt
                    continue

                # --- tool call ---
                if command in self.tools:
                    try:
                        result = self.tools[command].execute(arg)
                        preview = result[:200] + "..." if len(result) > 200 else result
                        logger.info(f"[Agent] Tool '{command}' selesai. Hasil: {preview}")
                        # Simpan hasil tool ke memori agar Planner melihatnya di iterasi berikutnya
                        self.memory.add("assistant", f"[{command} result] {result}")
                        progressed = True
                    except Exception as e:
                        logger.error(f"[Agent] Tool '{command}' error: {e}")
                        self.memory.add("assistant", f"[{command} error] {e}")
                    continue

                logger.warning(f"[Agent] Perintah tidak dikenal: {command!r}")

            if not progressed:
                # Planner output didn't produce a usable tool call or finish step.
                logger.warning("[Agent] No progress from planner steps; using direct fallback.")
                return self._search_read_and_summarize(task)

        logger.warning("[Agent] Mencapai batas iterasi maksimal tanpa 'finish'.")
        return self._search_read_and_summarize(task)
