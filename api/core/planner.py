# core/planner.py
import logging
import re
import urllib.error
from itertools import islice
import urllib.parse
from typing import Any

from .config import LLM_MAX_TOKENS, LLM_TEMPERATURE, MODELS

logger = logging.getLogger(__name__)


class Planner:
    def __init__(self, client: Any):
        self.client = client

    def plan(
        self,
        task: str,
        history: list[dict[str, str]] | None = None,
        skill_context: str = "",
    ) -> list[str]:
        history_context = ""
        if history:
            history_context = "\nCONVERSATION HISTORY & TOOL RESULTS:\n"
            for msg in history:
                role = msg["role"].upper()
                content = msg["content"]
                history_context += f"{role}: {content}\n"

        skill_block = ""
        sc = (skill_context or "").strip()
        if sc:
            if len(sc) > 2500:
                sc = "".join(islice(sc, 2500)).rstrip() + "\n[skill truncated]"
            skill_block = f"\nSKILL INSTRUCTIONS:\n{sc}\n"

        prompt = f"""You are Ouwibo Agent's Iterative Planner. Your goal is to solve the user's task efficiently.

STRICT RULES:
1. Look at the CONVERSATION HISTORY & TOOL RESULTS to see what has been done.
2. If you have enough information to answer the task, use the finish[answer] command.
3. If you need more information, use the most targeted tool from the REFERENCE.
4. Use `auto_search[query]` for broad information gathering (it searches, reads, and summarizes).
5. Each step must be on its own line. Format: command[argument]
6. Do NOT output any prose or commentary. ONLY the commands.

COMMAND REFERENCE:
- think[reasoning]           → Plan your next move.
- auto_search[query]         → Automatically search, read top links, and summarize results.
- calculate[expression]      → Math evaluation.
- search[query]              → Simple web search (URLs & snippets).
- google_search[query]       → Search using Google.
- crypto[query]              → Crypto market data.
- stocks[symbol]             → Stock/Crypto prices.
- dictionary[word]           → Get English word definitions.
- ens[name_or_address]       → Resolve ENS name/address.
- wallet[command]            → Wallet utilities (read-only).
- social_search[query]       → Search social platforms (X, IG, etc.).
- find_script[topic]         → Search for code scripts and tutorials.
- phind[coding_query]        → Developer search for code/debugging.
- weather[city]              → Current weather.
- news[topic]                → Latest news.
- wikipedia[topic]           → Wikipedia summary.
- currency[amount FROM to TO] → Currency conversion.
- datetime[timezone]         → Get current date/time.
- read_url[url]              → Read full text content of a webpage.
- acp[command]               → Interact with ACP marketplace.
- finish[final_answer]       → Provide the final answer based on tool results.

## Agent Capabilities
You have general intelligence and answer global questions directly. Only use ACP (`acp browse`) if the task requires specialised external agents.

{skill_block}
TASK: {task}
{history_context}
"""

        last_error = None
        for model in MODELS:
            try:
                logger.info(f"Planner using model: {model}")
                response = self.client.chat.completions.create(
                    messages=[{"role": "user", "content": prompt}],
                    model=model,
                    temperature=LLM_TEMPERATURE,
                    max_tokens=LLM_MAX_TOKENS,
                )
                raw = response.choices[0].message.content.strip()
                steps = self._parse_steps(raw)
                return steps
            except Exception as e:
                logger.warning(f"Model '{model}' failed: {e}")
                last_error = e
                continue

        if last_error is not None:
            from typing import cast
            raise cast(BaseException, last_error)
        raise RuntimeError("No LLM models available.")

    def _parse_steps(self, raw: str) -> list[str]:
        steps = []
        for line in raw.splitlines():
            line = line.strip()
            if not line:
                continue
            line = re.sub(r"^\d+[.)]\s*", "", line)
            line = re.sub(r"^[-*•>]\s*", "", line)
            line = line.strip()
            if re.match(r"^\w+\[.+\]$", line, re.DOTALL):
                steps.append(line)
        return steps
