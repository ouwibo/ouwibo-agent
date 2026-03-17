# core/rate_limit.py
import time
import threading
from collections import defaultdict
from dataclasses import dataclass
from typing import Optional


@dataclass
class RateLimitConfig:
    requests_per_minute: int = 60
    requests_per_hour: int = 1000
    burst_limit: int = 10


class RateLimiter:
    _instance: Optional["RateLimiter"] = None
    _lock = threading.Lock()

    def __new__(cls, config: Optional[RateLimitConfig] = None):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self, config: Optional[RateLimitConfig] = None):
        if self._initialized:
            return
        self.config = config or RateLimitConfig()
        self._minute_buckets: dict[str, list[float]] = defaultdict(list)
        self._hour_buckets: dict[str, list[float]] = defaultdict(list)
        self._burst_buckets: dict[str, list[float]] = defaultdict(list)
        self._minute_lock = threading.Lock()
        self._hour_lock = threading.Lock()
        self._burst_lock = threading.Lock()
        self._initialized = True

    def _clean_old(self, buckets: dict[str, list[float]], window: float, lock: threading.Lock) -> None:
        now = time.time()
        cutoff = now - window
        with lock:
            for key in list(buckets.keys()):
                buckets[key] = [ts for ts in buckets[key] if ts > cutoff]
                if not buckets[key]:
                    del buckets[key]

    def _is_rate_limited(self, key: str) -> tuple[bool, str]:
        now = time.time()
        minute_window = 60.0
        hour_window = 3600.0
        burst_window = 10.0

        self._clean_old(self._minute_buckets, minute_window, self._minute_lock)
        self._clean_old(self._hour_buckets, hour_window, self._hour_lock)
        self._clean_old(self._burst_buckets, burst_window, self._burst_lock)

        with self._burst_lock:
            burst_count = len(self._burst_buckets.get(key, []))
            if burst_count >= self.config.burst_limit:
                return True, f"Burst limit exceeded ({self.config.burst_limit} requests per 10s)"

        with self._minute_lock:
            minute_count = len(self._minute_buckets.get(key, []))
            if minute_count >= self.config.requests_per_minute:
                return True, f"Minute limit exceeded ({self.config.requests_per_minute} requests per minute)"

        with self._hour_lock:
            hour_count = len(self._hour_buckets.get(key, []))
            if hour_count >= self.config.requests_per_hour:
                return True, f"Hourly limit exceeded ({self.config.requests_per_hour} requests per hour)"

        return False, ""

    def check(self, key: str = "default") -> tuple[bool, str]:
        return self._is_rate_limited(key)

    def record(self, key: str = "default") -> None:
        now = time.time()
        with self._minute_lock:
            self._minute_buckets[key].append(now)
        with self._hour_lock:
            self._hour_buckets[key].append(now)
        with self._burst_lock:
            self._burst_buckets[key].append(now)

    def get_status(self, key: str = "default") -> dict:
        now = time.time()
        self._clean_old(self._minute_buckets, 60.0, self._minute_lock)
        self._clean_old(self._hour_buckets, 3600.0, self._hour_lock)
        self._clean_old(self._burst_buckets, 10.0, self._burst_lock)

        with self._minute_lock:
            minute_count = len(self._minute_buckets.get(key, []))
        with self._hour_lock:
            hour_count = len(self._hour_buckets.get(key, []))
        with self._burst_lock:
            burst_count = len(self._burst_buckets.get(key, []))

        return {
            "burst": {"used": burst_count, "limit": self.config.burst_limit},
            "minute": {"used": minute_count, "limit": self.config.requests_per_minute},
            "hour": {"used": hour_count, "limit": self.config.requests_per_hour},
        }

    @classmethod
    def reset(cls) -> None:
        with cls._lock:
            cls._instance = None


def get_limiter(config: Optional[RateLimitConfig] = None) -> RateLimiter:
    return RateLimiter(config)
