# ouwibo_agent/planner.py
import logging
import re

from .config import LLM_MAX_TOKENS, LLM_TEMPERATURE, MODELS

logger = logging.getLogger(__name__)


class Planner:
    def __init__(self, client):
        self.client = client

    def plan(self, task: str) -> list[str]:
        prompt = f"""You are a planning agent. Break down the given task into a sequence of atomic steps.

STRICT RULES:
1. Each step must be on its own line.
2. Each step must follow EXACTLY this format: command[argument]
3. Do NOT number or bullet the steps.
4. Do NOT add any explanation or commentary — output ONLY the commands.
5. Available commands: think, calculate, search, finish
6. The LAST step MUST be: finish[your final answer]

COMMAND REFERENCE:
- think[your reasoning]      → internal reasoning, no external call
- calculate[math expression] → evaluates a math expression, e.g. calculate[200 * 0.15]
- search[query]              → web search, e.g. search[capital of France]
- finish[answer]             → ends the task and returns the answer

EXAMPLES:

Task: What is 15% of 200?
think[I need to calculate 15% of 200, which is 200 * 0.15]
calculate[200 * 0.15]
finish[15% of 200 is 30]

Task: Who is the current CEO of OpenAI?
search[current CEO of OpenAI 2024]
think[Based on search results I can determine the answer]
finish[The CEO of OpenAI is Sam Altman]

Task: What is the square root of 144?
think[I need to compute sqrt(144) = 12]
calculate[144 ** 0.5]
finish[The square root of 144 is 12]

Task: {task}
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
                logger.debug(f"Raw planner output:\n{raw}")
                steps = self._parse_steps(raw)
                logger.info(f"Parsed {len(steps)} steps: {steps}")
                return steps
            except Exception as e:
                logger.warning(f"Model '{model}' failed: {e}")
                last_error = e
                continue

        raise last_error if last_error else RuntimeError("No LLM models available.")

    def _parse_steps(self, raw: str) -> list[str]:
        """
        Parse raw LLM output into a clean list of command[argument] steps.

        Handles common LLM quirks:
        - Numbered lines:  "1. think[...]" or "1) think[...]"
        - Bulleted lines:  "- think[...]" or "* think[...]"
        - Blank lines / extra whitespace
        - Lines with only prose (no command pattern) are silently dropped
        """
        steps = []
        for line in raw.splitlines():
            line = line.strip()
            if not line:
                continue

            # Strip leading numbering: "1.", "2)", etc.
            line = re.sub(r"^\d+[.)]\s*", "", line)
            # Strip leading bullets: "-", "*", "•", ">"
            line = re.sub(r"^[-*•>]\s*", "", line)

            line = line.strip()

            # Only accept lines that strictly match the command[argument] pattern
            if re.match(r"^\w+\[.+\]$", line, re.DOTALL):
                steps.append(line)
            else:
                logger.debug(f"Planner skipped unrecognised line: {line!r}")

        return steps
