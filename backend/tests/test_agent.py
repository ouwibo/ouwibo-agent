import pytest
from unittest.mock import MagicMock
from core.agent import Agent
from core.rate_limit import RateLimiter, RateLimitConfig, get_limiter

@pytest.fixture
def agent(mock_llm_client):
    return Agent(mock_llm_client)

def test_agent_initialization(agent):
    """Uji apakah agent dapat diinisialisasi dengan tools yang benar."""
    assert agent.tools is not None
    assert "calculate" in agent.tools
    assert "search" in agent.tools

def test_agent_run_failure_handling(agent):
    """Uji apakah agent menangani kegagalan planner dengan baik."""
    agent.planner.plan = MagicMock(side_effect=Exception("Planner error"))
    result = agent.run("test task")
    assert result.startswith("Maaf, saya tidak dapat membuat rencana")

def test_rate_limiter_burst_limit():
    """Uji rate limiter burst limit."""
    limiter = get_limiter(RateLimitConfig(burst_limit=3, requests_per_minute=60, requests_per_hour=1000))
    limiter.reset()
    limiter._initialized = False
    limiter = get_limiter(RateLimitConfig(burst_limit=3, requests_per_minute=60, requests_per_hour=1000))
    
    for i in range(3):
        limited, _ = limiter.check("test_user")
        assert not limited, f"Request {i+1} should not be limited"
        limiter.record("test_user")
    
    limited, reason = limiter.check("test_user")
    assert limited
    assert "Burst limit" in reason

def test_rate_limiter_status():
    """Uji rate limiter status reporting."""
    limiter = get_limiter()
    limiter.reset()
    limiter._initialized = False
    limiter = get_limiter(RateLimitConfig(burst_limit=10, requests_per_minute=60, requests_per_hour=1000))
    
    limiter.record("test_user")
    status = limiter.get_status("test_user")
    
    assert status["burst"]["used"] == 1
    assert status["minute"]["used"] == 1
    assert status["hour"]["used"] == 1

def test_health_endpoint(client):
    """Uji endpoint health check."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data
    assert "config" in data
