# core/planner.py
import logging
import re
from typing import Any

from .config import LLM_MAX_TOKENS, LLM_TEMPERATURE, MODELS

logger = logging.getLogger(__name__)


class Planner:
    def __init__(self, client: Any):
        self.client = client

    def plan(self, task: str, history: list[dict[str, str]] = None) -> list[str]:
        history_context = ""
        if history:
            history_context = "\nCONVERSATION HISTORY & TOOL RESULTS:\n"
            for msg in history:
                role = msg["role"].upper()
                content = msg["content"]
                history_context += f"{role}: {content}\n"

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
- weather[city]              → Current weather.
- news[topic]                → Latest news.
- wikipedia[topic]           → Wikipedia summary.
- currency[amount FROM to TO] → Currency conversion.
- datetime[timezone]         → Get current date/time.
- read_url[url]              → Read content of a webpage.
- finish[final_answer]       → Provide the actual, final answer based on tool results.

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
