# ouwibo_agent/config.py

# ---------------------------------------------------------------------------
# LLM Models (fallback chain — attempted in order; fails over to the next)
# ---------------------------------------------------------------------------
MODELS = [
    "qvq-max-2025-03-25",  # Strongest for reasoning
    "qwen-max",            # Strongest for general tasks
    "qwen-plus",           # Good balance of speed & quality
    "qwen-turbo"           # High speed (fallback)
]

# Alibaba Cloud DashScope base URL (OpenAI compatible)
# Dashboard: https://dashscope.console.aliyun.com
DASHSCOPE_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"

LLM_TEMPERATURE = 0.1  # Low temperature for deterministic planning output
LLM_MAX_TOKENS = 1024  # Output token limit for the planner

# ---------------------------------------------------------------------------
# Memory
# ---------------------------------------------------------------------------
MAX_MEMORY_MESSAGES = 20  # Maximum number of messages retained in agent memory

# ---------------------------------------------------------------------------
# Tools — Calculator
# ---------------------------------------------------------------------------
CALCULATOR_MAX_LEN = 200  # Maximum length of expressions accepted by the calculator

# ---------------------------------------------------------------------------
# Tools — WebSearch
# ---------------------------------------------------------------------------
MAX_SEARCH_RESULTS = 8  # Number of web search results returned

# ---------------------------------------------------------------------------
# API / Validation
# ---------------------------------------------------------------------------
MAX_MESSAGE_LENGTH = 4000  # Maximum user message length (characters)
MAX_SESSION_ID_LENGTH = 64  # Maximum session_id length
