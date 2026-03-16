# ouwibo_agent/config.py

# ---------------------------------------------------------------------------
# LLM Models (fallback chain — pertama dicoba dulu, kalau gagal lanjut ke berikutnya)
# ---------------------------------------------------------------------------
MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
]

LLM_TEMPERATURE = 0.1  # Rendah agar output planning deterministik
LLM_MAX_TOKENS = 1024  # Batas token output dari planner

# ---------------------------------------------------------------------------
# Memory
# ---------------------------------------------------------------------------
MAX_MEMORY_MESSAGES = 20  # Jumlah pesan maksimal yang disimpan di memory agent

# ---------------------------------------------------------------------------
# Tools — Calculator
# ---------------------------------------------------------------------------
CALCULATOR_MAX_LEN = 200  # Panjang maksimal ekspresi yang diterima kalkulator

# ---------------------------------------------------------------------------
# Tools — WebSearch
# ---------------------------------------------------------------------------
MAX_SEARCH_RESULTS = 8  # Jumlah hasil pencarian web yang dikembalikan

# ---------------------------------------------------------------------------
# API / Validation
# ---------------------------------------------------------------------------
MAX_MESSAGE_LENGTH = 4000  # Panjang maksimal pesan dari user (karakter)
MAX_SESSION_ID_LENGTH = 64  # Panjang maksimal session_id
