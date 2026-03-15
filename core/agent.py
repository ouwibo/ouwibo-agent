# core/agent.py
import logging
import re
from typing import Any

from .memory import Memory
from .planner import Planner
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
                return f"Maaf, terjadi kesalahan saat merencanakan langkah. Error: {e}"

            if not plan:
                logger.warning("[Agent] Planner mengembalikan rencana kosong.")
                return "Maaf, saya tidak dapat memahami tugas tersebut atau tidak mendapatkan rencana langkah selanjutnya."

            # 2. Eksekusi semua langkah dalam rencana (biasanya satu atau dua per iterasi)
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
                    self.memory.add("assistant", arg)
                    return arg

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
                    except Exception as e:
                        logger.error(f"[Agent] Tool '{command}' error: {e}")
                        self.memory.add("assistant", f"[{command} error] {e}")
                    continue

                logger.warning(f"[Agent] Perintah tidak dikenal: {command!r}")

        logger.warning("[Agent] Mencapai batas iterasi maksimal tanpa 'finish'.")
        return "Saya telah mencoba melakukan beberapa langkah, tetapi belum berhasil memberikan jawaban akhir. Coba tanyakan hal yang lebih spesifik."
