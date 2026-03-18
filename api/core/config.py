# ouwibo_agent/config.py
import os
from dataclasses import dataclass
from typing import Optional

# ---------------------------------------------------------------------------
# Environment Validation
# ---------------------------------------------------------------------------
REQUIRED_ENV_VARS: list[str] = ["DASHSCOPE_API_KEY"]
OPTIONAL_ENV_VARS: dict[str, str] = {
    "SEARCH_PROVIDER": "auto",
    "LOG_LEVEL": "INFO",
    "SESSION_SECRET": "",
}

class EnvValidationError(Exception):
    pass

@dataclass
class EnvConfig:
    DASHSCOPE_API_KEY: str
    SEARCH_PROVIDER: str
    LOG_LEVEL: str
    SESSION_SECRET: str

def load_env() -> EnvConfig:
    missing = [v for v in REQUIRED_ENV_VARS if not os.getenv(v)]
    if missing:
        raise EnvValidationError(f"Missing required environment variables: {', '.join(missing)}")

    return EnvConfig(
        DASHSCOPE_API_KEY=os.environ["DASHSCOPE_API_KEY"],
        SEARCH_PROVIDER=os.getenv("SEARCH_PROVIDER", OPTIONAL_ENV_VARS["SEARCH_PROVIDER"]),
        LOG_LEVEL=os.getenv("LOG_LEVEL", OPTIONAL_ENV_VARS["LOG_LEVEL"]),
        SESSION_SECRET=os.getenv("SESSION_SECRET", ""),
    )

_env_config: Optional[EnvConfig] = None

def get_env() -> EnvConfig:
    global _env_config
    if _env_config is None:
        _env_config = load_env()
    return _env_config

# ---------------------------------------------------------------------------
# LLM Models (fallback chain — attempted in order; fails over to the next)
# ---------------------------------------------------------------------------
MODELS = [
    "qwen-max",            # Strongest for general tasks & reasoning
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
