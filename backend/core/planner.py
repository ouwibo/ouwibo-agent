# core/planner.py
import sys
import os
# Force backend and root into path
curr = os.path.dirname(os.path.abspath(__file__))
parent = os.path.dirname(curr) # backend/
root = os.path.dirname(parent) # ouwibo-agent/
for p in [root, parent, curr]:
    if p not in sys.path: sys.path.insert(0, p)

import logging
import re
import urllib.error
from itertools import islice
import urllib.parse
from typing import Any

try:
    from backend.core.config import LLM_MAX_TOKENS, LLM_TEMPERATURE, MODELS
except ImportError:
    from core.config import LLM_MAX_TOKENS, LLM_TEMPERATURE, MODELS

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

        prompt = f"""You are the **Ouwibo Crypto Specialist Planner**. Your goal is to provide professional-grade blockchain intelligence and DeFi assistance.

### OPERATIONAL GUIDELINES:
1. **Persona**: You are an elite crypto analyst. Your tone is technical, precise, and high-status.
2. **Analysis**: Use `auto_search` or `read_url` for deep research on protocols, whitepapers, or market-moving events.
3. **DeFi Ops**: Use the `dex` tool to prepare swaps/bridges. Remember: Ouwibo prepares, the user signs.
4. **Efficiency**: If you have the data, finish immediately. If not, use the most specialist tool.

COMMAND REFERENCE:
- think[reasoning]           → Plan your analytical approach.
- auto_search[query]         → Deep research: searches web, reads top links, and provides a multi-source summary. 
- news[topic]                → Get the latest market-moving headlines and crypto news.
- crypto[query]              → Get real-time crypto prices, volume, and market stats.
- read_url[url]              → Deep-dive: read the full content of a specific whitepaper, article, or documentation.
- dex[params]                → Prepare a secure swap or bridge transaction.
- ens[name_or_address]       → Resolve Web3 identities (ENS/Address).
- wallet[command]            → Check on-chain balances or transaction status.
- tempo[command]             → Access specialized Tempo crypto features.
- finish[final_answer]       → Provide your professional conclusion. 

### FORMAT RULES:
- One command per line: `command[arg]`
- NO prose or commentary. ONLY the commands.
- If you recommend a swap, the final answer MUST include: `[ACTION: CONNECT_WALLET]`.

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
