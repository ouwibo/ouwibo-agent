# core/agent.py
import logging
import re
from itertools import islice
from typing import Any

from .config import MAX_MESSAGE_LENGTH, MAX_SESSION_ID_LENGTH
from .memory import Memory
from .planner import Planner
from .config import MODELS
from .rate_limit import RateLimiter, get_limiter, RateLimitConfig
from .tools import AGENT_TOOLS, Tool

logger = logging.getLogger(__name__)


class Agent:
    def __init__(self, client: Any):
        self.client = client
        self.memory = Memory()
        self.planner = Planner(client)
        self.limiter = get_limiter(RateLimitConfig(
            requests_per_minute=60,
            requests_per_hour=1000,
            burst_limit=10
        ))
        # Specialist Tools only
        self.tools = {}
        for tool_cls in AGENT_TOOLS:
            name = getattr(tool_cls, "name", None)
            if name:
                self.tools[name] = tool_cls()

    _UNCERTAIN_RE = re.compile(
        r"\b("
        r"tidak\s+tahu|gak\s+tahu|nggak\s+tahu|kurang\s+tahu|mungkin|"
        r"tidak\s+yakin|ga\s+yakin|nggak\s+yakin|belum\s+yakin|"
        r"i\s+don'?t\s+know|not\s+sure|uncertain|looking\s+up|"
        r"cannot\s+find|can't\s+find|no\s+information|maaf"
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

    def _best_effort_answer(self, task: str, context: str = "", skill_context: str = "") -> str:
        """
        Direct answer mode: use the LLM normally (no tool-format constraints).
        Falls back to a short apology if the client call fails.
        """
        sys = (
            "You are the **Ouwibo Crypto Professional Agent**, an elite assistant specializing in "
            "blockchain intelligence, DeFi, and market research.\n\n"
            "### YOUR PERSONA\n"
            "- **Professional & Analytical**: Your goal is to provide deep insights, not just surface-level info.\n"
            "- **Specialist**: You focus strictly on Crypto. If asked about general topics (weather, etc.), "
            "provide a brief answer but steer the conversation back to crypto value.\n"
            "- **Security-First**: You prepare transactions but NEVER sign them. You always warn users to verify "
            "everything before signing.\n\n"
            "### RULES\n"
            "- Speak both **Indonesian** and **English** (Bilingual Support).\n"
            "- If you recommend a swap or bridge, you MUST include the trigger: `[ACTION: CONNECT_WALLET]`."
        )
        sc = (skill_context or "").strip()
        if sc:
            if len(sc) > 3500:
                sc = "".join(islice(sc, 3500)).rstrip() + "\n[skill truncated]"
            sys = sys + "\n\nSKILL INSTRUCTIONS (follow unless they conflict with the user request):\n" + sc
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

    def _search_read_and_summarize(self, task: str, skill_context: str = "") -> str:
        """Auto-search + optional read_url for top results, then summarize."""
        # Avoid hitting the network in unit tests where the client is mocked.
        if type(self.client).__module__.startswith("unittest.mock"):
            return self._best_effort_answer(task, skill_context=skill_context)

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
        urls = list(islice(urls, 2))

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
            for r in islice(results, 8):
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
            self.memory.add("assistant", f"[auto_search context]\n{''.join(islice(context, 3500))}")
            return self._best_effort_answer(task, context=context, skill_context=skill_context)

        return self._best_effort_answer(task, skill_context=skill_context)

    def run(self, task: str, skill_context: str = "", session_id: str = "default") -> str:
        # Rate limiting check
        limited, reason = self.limiter.check(session_id)
        if limited:
            logger.warning(f"[Agent] Rate limited: {reason}")
            return f"Maaf, terlalu banyak permintaan. Silakan tunggu sebentar. ({reason})"

        if len(task) > MAX_MESSAGE_LENGTH:
            return f"Pesan terlalu panjang (maksimal {MAX_MESSAGE_LENGTH} karakter)."

        if len(session_id) > MAX_SESSION_ID_LENGTH:
            session_id = session_id[:MAX_SESSION_ID_LENGTH]

        logger.info(f"[Agent] Task diterima: {task!r}")
        self.memory.add("user", task)

        # Iterative Loop (ReAct)
        max_iterations = 8
        for i in range(max_iterations):
            logger.info(f"[Agent] Iterasi {i + 1}/{max_iterations}")

            # 1. Panggil Planner dengan riwayat saat ini
            try:
                plan = self.planner.plan(task, self.memory.get_history(), skill_context=skill_context)
            except Exception as e:
                logger.error(f"[Agent] Planner gagal di iterasi {i + 1}: {e}", exc_info=True)
                prefix = f"Maaf, saya tidak dapat membuat rencana langkah. Saya akan coba jawab langsung. Error: {e}"
                direct = self._search_read_and_summarize(task, skill_context=skill_context)
                self.limiter.record(session_id)
                return f"{prefix}\n\n{direct}"

            if not plan:
                logger.warning("[Agent] Planner mengembalikan rencana kosong.")
                result = self._search_read_and_summarize(task, skill_context=skill_context)
                self.limiter.record(session_id)
                return result

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
                        final = self._search_read_and_summarize(task, skill_context=skill_context)
                    self.memory.add("assistant", final)
                    self.limiter.record(session_id)
                    return final

                # --- think ---
                if command == "think":
                    logger.info(f"[Agent] Berpikir: {arg}")
                    # Jangan tambahkan "think" ke memori jika sudah ada agar tidak duplikat di prompt
                    continue

                # --- tool call ---
                if command == "auto_search":
                    try:
                        result = self._search_read_and_summarize(arg, skill_context=skill_context)
                        preview = "".join(islice(result, 200)) + "..." if len(result) > 200 else result
                        logger.info(f"[Agent] 'auto_search' selesai. Hasil: {preview}")
                        self.memory.add("assistant", f"[auto_search result] {result}")
                        progressed = True
                    except Exception as e:
                        logger.error(f"[Agent] 'auto_search' error: {e}")
                        self.memory.add("assistant", f"[auto_search error] {e}")
                    continue

                if command in self.tools:
                    try:
                        result = self.tools[command].execute(arg)
                        preview = "".join(islice(result, 200)) + "..." if len(result) > 200 else result
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
                result = self._search_read_and_summarize(task, skill_context=skill_context)
                self.limiter.record(session_id)
                return result

        logger.warning("[Agent] Mencapai batas iterasi maksimal tanpa 'finish'.")
        result = self._search_read_and_summarize(task, skill_context=skill_context)
        self.limiter.record(session_id)
        return result
    def run_stream(self, task: str, skill_context: str = "", session_id: str = "default"):
        """Generator version of run() for streaming responses (SSE)."""
        import json

        # Rate limiting check
        limited, reason = self.limiter.check(session_id)
        if limited:
            yield f"data: {json.dumps({'error': f'Rate limited: {reason}'})}\n\n"
            return

        if len(task) > MAX_MESSAGE_LENGTH:
            yield f"data: {json.dumps({'error': 'Message too long'})}\n\n"
            return

        self.memory.add("user", task)
        
        # Iterative Loop
        max_iterations = 8
        for i in range(max_iterations):
            yield f"data: {json.dumps({'status': f'Iterasi {i+1}/{max_iterations}'})}\n\n"
            
            try:
                plan = self.planner.plan(task, self.memory.get_history(), skill_context=skill_context)
            except Exception as e:
                yield f"data: {json.dumps({'status': 'Planner failed, trying direct answer...'})}\n\n"
                direct = self._search_read_and_summarize(task, skill_context=skill_context)
                yield f"data: {json.dumps({'chunk': direct})}\n\n"
                self.memory.add("assistant", direct)
                self.limiter.record(session_id)
                return

            if not plan:
                direct = self._search_read_and_summarize(task, skill_context=skill_context)
                yield f"data: {json.dumps({'chunk': direct})}\n\n"
                self.memory.add("assistant", direct)
                self.limiter.record(session_id)
                return

            progressed = False
            for step in plan:
                step = step.strip()
                if not step: continue
                
                match = re.match(r"^(\w+)\[(.+)\]$", step, re.DOTALL)
                if not match: continue

                command = match.group(1).lower()
                arg = match.group(2).strip()

                if command == "think":
                    yield f"data: {json.dumps({'thought': arg})}\n\n"
                    continue

                if command == "finish":
                    final = arg
                    if self._looks_uncertain(final):
                        final = self._search_read_and_summarize(task, skill_context=skill_context)
                    
                    # Yield final answer in chunks if it's long? 
                    # For now just yield as one chunk for simplicity, 
                    # but the architecture is ready for token streaming.
                    yield f"data: {json.dumps({'chunk': final})}\n\n"
                    self.memory.add("assistant", final)
                    self.limiter.record(session_id)
                    yield "data: [DONE]\n\n"
                    return

                # Tool calls
                yield f"data: {json.dumps({'status': f'Memanggil tool {command}...'})}\n\n"
                try:
                    if command == "auto_search":
                        result = self._search_read_and_summarize(arg, skill_context=skill_context)
                    elif command in self.tools:
                        result = self.tools[command].execute(arg)
                    else:
                        result = f"Error: Tool {command} not found."
                    
                    self.memory.add("assistant", f"[{command} result] {result}")
                    progressed = True
                except Exception as e:
                    self.memory.add("assistant", f"[{command} error] {e}")
            
            if not progressed:
                direct = self._search_read_and_summarize(task, skill_context=skill_context)
                yield f"data: {json.dumps({'chunk': direct})}\n\n"
                self.memory.add("assistant", direct)
                self.limiter.record(session_id)
                yield "data: [DONE]\n\n"
                return

        yield f"data: {json.dumps({'chunk': 'Mencapai batas iterasi tanpa jawaban final.'})}\n\n"
        yield "data: [DONE]\n\n"
