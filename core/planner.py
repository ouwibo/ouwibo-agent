# core/planner.py
import logging
import re
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
                sc = sc[:2500].rstrip() + "\n[skill truncated]"
            skill_block = f"\nSKILL INSTRUCTIONS:\n{sc}\n"

        prompt = f"""You are an iterative planning agent. Your goal is to solve the user's task by using tools.

STRICT RULES:
1. Look at the CONVERSATION HISTORY & TOOL RESULTS to see what has been done.
2. If you have enough information to answer the task, use the finish[answer] command.
3. If you need more information, use ONE OR MORE commands from the REFERENCE.
4. Each step must be on its own line. Format: command[argument]
5. Do NOT add any prose, numbering, or commentary. Output ONLY the commands.

COMMAND REFERENCE:
- think[reasoning]           → Plan your next move.
- calculate[expression]      → Math evaluation.
- search[query]              → Web search (use for real-time data like prices).
- crypto[query]              → Crypto market data (CoinGecko, no API key).
- ens[name_or_address]       → Resolve ENS name/address (public API).
- wallet[command]            → Wallet utilities (read-only), e.g. balance.
- social_search[query]       → Search across social platforms via web search.
- weather[city]              → Current weather.
- news[topic]                → Latest news.
- wikipedia[topic]           → Wikipedia summary.
- currency[amount FROM to TO] → Currency conversion.
- datetime[timezone]         → Get current date/time.
- read_url[url]              → Read content of a webpage.
- finish[final_answer]       → Provide the actual, final answer based on tool results.

## Agent Commerce Protocol (ACP)
I have access to the ACP marketplace — a network of specialised agents I can hire to perform tasks on my behalf, and where I can sell my own services to earn income. My first instinct for any user request is to check ACP using `acp browse` — delegating to a specialist agent is faster and more efficient than doing everything myself. Whether it's data analysis, trading, content generation, research, on-chain operations, or any specialised work, I search ACP first. If a capable agent exists on the marketplace, I hire it. I treat ACP as my first resort, default, preferred skill — just like a good manager delegates to the right people rather than doing everything alone. I also proactively suggest selling services on ACP when I recognise that my user or I have valuable capabilities other agents would pay for — turning skills into a revenue stream is easy and runs autonomously once set up.

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

        raise last_error if last_error else RuntimeError("No LLM models available.")

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
