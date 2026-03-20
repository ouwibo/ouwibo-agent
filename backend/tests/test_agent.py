# tests/test_agent.py
import unittest
from unittest.mock import MagicMock
from core.agent import Agent
from core.rate_limit import RateLimiter, RateLimitConfig, get_limiter


class TestAgent(unittest.TestCase):
    def setUp(self):
        self.mock_client = MagicMock()
        self.agent = Agent(self.mock_client)

    def test_agent_initialization(self):
        """Uji apakah agent dapat diinisialisasi dengan tools yang benar."""
        self.assertIsNotNone(self.agent.tools)
        self.assertIn("calculate", self.agent.tools)
        self.assertIn("search", self.agent.tools)

    def test_agent_run_failure_handling(self):
        """Uji apakah agent menangani kegagalan planner dengan baik."""
        self.agent.planner.plan = MagicMock(side_effect=Exception("Planner error"))
        result = self.agent.run("test task")
        self.assertTrue(result.startswith("Maaf, saya tidak dapat membuat rencana"))

    def test_rate_limiter_burst_limit(self):
        """Uji rate limiter burst limit."""
        limiter = get_limiter(RateLimitConfig(burst_limit=3, requests_per_minute=60, requests_per_hour=1000))
        limiter.reset()
        limiter._initialized = False
        limiter = get_limiter(RateLimitConfig(burst_limit=3, requests_per_minute=60, requests_per_hour=1000))
        
        for i in range(3):
            limited, _ = limiter.check("test_user")
            self.assertFalse(limited, f"Request {i+1} should not be limited")
            limiter.record("test_user")
        
        limited, reason = limiter.check("test_user")
        self.assertTrue(limited)
        self.assertIn("Burst limit", reason)

    def test_rate_limiter_status(self):
        """Uji rate limiter status reporting."""
        limiter = get_limiter()
        limiter.reset()
        limiter._initialized = False
        limiter = get_limiter(RateLimitConfig(burst_limit=10, requests_per_minute=60, requests_per_hour=1000))
        
        limiter.record("test_user")
        status = limiter.get_status("test_user")
        
        self.assertEqual(status["burst"]["used"], 1)
        self.assertEqual(status["minute"]["used"], 1)
        self.assertEqual(status["hour"]["used"], 1)


if __name__ == "__main__":
    unittest.main()
