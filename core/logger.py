import json
import logging
import sys
from datetime import datetime
from typing import Any, Dict, Tuple, cast

class JSONFormatter(logging.Formatter):
    """Custom JSON formatter for structured logging."""
    def format(self, record: logging.LogRecord) -> str:
        log_data: Dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(record.created).isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
            "file": record.pathname,
            "line": record.lineno,
        }
        if record.exc_info is not None:
            # Cast to satisfy strict type checkers
            exc_info = cast(Tuple[Any, Any, Any], record.exc_info)
            log_data["exception"] = self.formatException(exc_info)
        
        # Add extra fields if available
        if hasattr(record, "extra"):
            log_data.update(record.extra) # type: ignore
            
        return json.dumps(log_data)

def get_logger(name: str) -> logging.Logger:
    """Get a structured JSON logger."""
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JSONFormatter())
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger
