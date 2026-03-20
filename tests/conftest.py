import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_all, text
from sqlalchemy.orm import sessionmaker
from api import app, get_db
from database import Base, engine
from unittest.mock import MagicMock

# Mock LLM Client
@pytest.fixture
def mock_llm_client():
    client = MagicMock()
    client.chat.completions.create.return_value.choices[0].message.content = "Mocked AI Response"
    return client

# Database for testing
TEST_DATABASE_URL = "sqlite:///./test_agent.db"

@pytest.fixture(scope="session")
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    # Cleanup after session if needed
    # Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db_session(setup_db):
    connection = engine.connect()
    transaction = connection.begin()
    session = sessionmaker(bind=connection)()
    yield session
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
