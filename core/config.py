# ouwibo_agent/config.py

# ---------------------------------------------------------------------------
# LLM Models (fallback chain — pertama dicoba dulu, kalau gagal lanjut ke berikutnya)
# ---------------------------------------------------------------------------
MODELS = [
    "qvq-max-2025-03-25",  # Terkuat untuk reasoning
    "qwen-max",            # Terkuat untuk general task
    "qwen-plus",           # Keseimbangan kecepatan & kualitas
    "qwen-turbo"           # Kecepatan tinggi (fallback)
]

# Alibaba Cloud DashScope base URL (OpenAI compatible)
# Dashboard: https://dashscope.console.aliyun.com
DASHSCOPE_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"

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
