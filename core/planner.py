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
5. Use ONLY the commands listed below.
6. The LAST step MUST be: finish[your final answer]

COMMAND REFERENCE:
- think[your reasoning]          → internal reasoning, no external call
- calculate[math expression]     → safely evaluates math, e.g. calculate[200 * 0.15]
- search[query]                  → web search, e.g. search[latest AI news]
- weather[city]                  → current weather, e.g. weather[Jakarta]
- news[topic]                    → latest news articles, e.g. news[technology 2025]
- wikipedia[topic]               → Wikipedia summary, e.g. wikipedia[Elon Musk]
- currency[amount FROM to TO]    → currency conversion, e.g. currency[100 USD to IDR]
- datetime[timezone]             → current date & time, e.g. datetime[Asia/Jakarta]
- read_url[url]                  → read content from a URL, e.g. read_url[https://example.com]
- finish[answer]                 → ends the task and returns the final answer

EXAMPLES:

Task: What is 15% of 200?
think[I need to calculate 15% of 200]
calculate[200 * 0.15]
finish[15% of 200 is 30]

Task: What is the weather in Tokyo?
weather[Tokyo]
think[I now have the weather data for Tokyo]
finish[Here is the current weather in Tokyo: (weather result)]

Task: What is 1 USD worth in Indonesian Rupiah?
currency[1 USD to IDR]
think[I have the exchange rate result]
finish[1 USD equals approximately (result) IDR]

Task: What time is it in London right now?
datetime[Europe/London]
finish[The current time in London is (result)]

Task: Who is Nikola Tesla?
wikipedia[Nikola Tesla]
think[I now have a Wikipedia summary about Nikola Tesla]
finish[(summary from Wikipedia)]

Task: What are the latest news about SpaceX?
news[SpaceX 2025]
think[I have the latest SpaceX news articles]
finish[(summary of news articles)]

Task: Who is the current CEO of OpenAI?
search[current CEO of OpenAI]
think[Based on search results I can determine the answer]
finish[The CEO of OpenAI is Sam Altman]

Task: Summarize the content of https://openai.com
read_url[https://openai.com]
think[I have the page content, I can now summarize it]
finish[(summary of the page)]

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
