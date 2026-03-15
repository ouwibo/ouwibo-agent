# ouwibo_agent/agent.py
import logging
import re

from .memory import Memory
from .planner import Planner
from .tools import Calculator, WebSearch

logger = logging.getLogger(__name__)


class Agent:
    def __init__(self, client):
        self.client = client
        self.memory = Memory()
        self.planner = Planner(client)
        self.tools = {
            "calculate": Calculator(),
            "search": WebSearch(),
        }

    def run(self, task: str) -> str:
        logger.info(f"[Agent] Task diterima: {task!r}")

        # --- Planning ---
        try:
            plan = self.planner.plan(task)
        except Exception as e:
            logger.error(f"[Agent] Planner gagal: {e}", exc_info=True)
            return f"Maaf, saya tidak dapat membuat rencana untuk tugas ini. Error: {e}"

        if not plan:
            logger.warning("[Agent] Planner mengembalikan rencana kosong.")
            return (
                "Maaf, saya tidak dapat memahami tugas tersebut. Coba rumuskan ulang."
            )

        logger.info(f"[Agent] Rencana ({len(plan)} langkah): {plan}")
        self.memory.add("user", task)

        # --- Execution loop ---
        for i, step in enumerate(plan):
            step = step.strip()
            if not step:
                continue

            logger.info(f"[Agent] Langkah {i + 1}/{len(plan)}: {step!r}")

            # Strict match: command[argument]
            match = re.match(r"^(\w+)\[(.+)\]$", step, re.DOTALL)
            if not match:
                logger.warning(
                    f"[Agent] Format langkah tidak valid, dilewati: {step!r}"
                )
                continue

            command = match.group(1).lower()
            arg = match.group(2).strip()

            # --- finish ---
            if command == "finish":
                logger.info(f"[Agent] Selesai. Jawaban: {arg!r}")
                self.memory.add("assistant", arg)
                return arg

            # --- think ---
            if command == "think":
                logger.info(f"[Agent] Berpikir: {arg}")
                self.memory.add("assistant", f"[thinking] {arg}")
                continue

            # --- tool call ---
            if command in self.tools:
                try:
                    result = self.tools[command].execute(arg)
                    preview = result[:300] + "..." if len(result) > 300 else result
                    logger.info(f"[Agent] Tool '{command}' selesai. Hasil: {preview}")
                    self.memory.add("assistant", f"[{command} result] {result}")
                except Exception as e:
                    logger.error(
                        f"[Agent] Tool '{command}' error untuk arg {arg!r}: {e}",
                        exc_info=True,
                    )
                    self.memory.add("assistant", f"[{command} error] {e}")
                continue

            # --- unknown command ---
            logger.warning(f"[Agent] Perintah tidak dikenal: {command!r}")
            self.memory.add("assistant", f"[unknown command] {command}")

        logger.warning("[Agent] Semua langkah selesai tanpa perintah 'finish'.")
        return "Saya telah menyelesaikan semua langkah, tetapi tidak menghasilkan jawaban akhir."
