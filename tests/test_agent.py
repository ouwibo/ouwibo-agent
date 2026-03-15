# tests/test_agent.py
import unittest
from unittest.mock import MagicMock
from core.agent import Agent

class TestAgent(unittest.TestCase):
    def setUp(self):
        # Mocking client agar tidak perlu koneksi internet/API key
        self.mock_client = MagicMock()
        self.agent = Agent(self.mock_client)

    def test_agent_initialization(self):
        """Uji apakah agent dapat diinisialisasi dengan tools yang benar."""
        self.assertIsNotNone(self.agent.tools)
        self.assertIn("calculate", self.agent.tools)
        self.assertIn("search", self.agent.tools)

    def test_agent_run_failure_handling(self):
        """Uji apakah agent menangani kegagalan planner dengan baik."""
        # Planner mengembalikan Exception
        self.agent.planner.plan = MagicMock(side_effect=Exception("Planner error"))
        result = self.agent.run("test task")
        self.assertTrue(result.startswith("Maaf, saya tidak dapat membuat rencana"))

if __name__ == "__main__":
    unittest.main()
