# api.py
import logging
import os
from typing import Any, Callable, Generator

import slowapi
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi import Query as QueryParam
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from groq import APIError, APIStatusError, AuthenticationError, Groq
from pydantic import BaseModel, Field
from slowapi import Limiter  # type: ignore
from slowapi.errors import RateLimitExceeded  # type: ignore
from slowapi.util import get_remote_address  # type: ignore
from sqlalchemy import text
from sqlalchemy.orm import Session

import models
from core.agent import Agent
from core.auth import auth_enabled, require_auth
from core.config import MAX_MESSAGE_LENGTH, MAX_SESSION_ID_LENGTH
from core.tools import WebSearch
from database import SessionLocal, engine

# ---------------------------------------------------------------------------
# Setup & Database
# ---------------------------------------------------------------------------
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Ensure tables are created
models.Base.metadata.create_all(bind=engine)

# ---------------------------------------------------------------------------
# AI Client Configuration
# ---------------------------------------------------------------------------
_api_key: str = (os.getenv("API_KEY") or os.getenv("GROQ_API_KEY") or "").strip()
groq_client: Groq | None = None

if not _api_key:
    logger.warning("API_KEY is missing. Falling back to FREE AI (DuckDuckGo).")
else:
    try:
        groq_client = Groq(api_key=_api_key, timeout=55.0)
        logger.info("Groq client successfully initialized.")
    except Exception as e:
        logger.error(f"Failed to init Groq: {e}")

# Free AI Wrapper for DuckDuckGo
class FreeAIClient:
    """A client that mimics the Groq/OpenAI interface using DuckDuckGo AI (Free)."""
    class Chat:
        class Completions:
            def create(self, messages, model="gpt-4o-mini", **kwargs):
                from ddgs import DDGS
                # We use the last user message as the prompt for simplicity in free mode
                prompt = messages[-1]["content"]
                with DDGS() as ddgs:
                    # Model options: gpt-4o-mini, claude-3-haiku, llama-3-70b, mixtral-8x7b
                    # Map project models to DDGS models
                    ddgs_model = "gpt-4o-mini"
                    if "llama" in str(model).lower(): ddgs_model = "llama-3.1-70b"
                    
                    response = ddgs.chat(prompt, model=ddgs_model)
                    
                    # Mock OpenAI response object
                    class MockResponse:
                        class Choice:
                            class Message:
                                def __init__(self, content): self.content = content
                            def __init__(self, content): self.message = self.Message(content)
                        def __init__(self, content): self.choices = [self.Choice(content)]
                    
                    return MockResponse(response)
        completions = Completions()
    chat = Chat()

free_ai_client = FreeAIClient()

# ---------------------------------------------------------------------------
# Rate Limiter
# ---------------------------------------------------------------------------
limiter: Limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

# ---------------------------------------------------------------------------
# FastAPI App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Ouwibo AI Agent",
    description="API for Ouwibo AI Agent — powered by Groq + LLaMA.",
    version="1.0.1",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.state.limiter = limiter

def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> Response:
    """Custom handler for rate limit exceeded errors."""
    return slowapi._rate_limit_exceeded_handler(request, exc)  # type: ignore

app.add_exception_handler(RateLimitExceeded, rate_limit_handler)

# ---------------------------------------------------------------------------
# Security & CORS
# ---------------------------------------------------------------------------
@app.middleware("http")
async def security_headers(request: Request, call_next: Callable[[Request], Any]) -> Response:
    """Adds security headers to every response."""
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

_raw_origins: str = os.getenv("ALLOWED_ORIGINS", "*")
_allowed_origins: list[str] = ["*"] if _raw_origins == "*" else [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True if _allowed_origins != ["*"] else False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------
def get_db() -> Generator[Session, None, None]:
    """Dependency for database session."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=MAX_MESSAGE_LENGTH)
    session_id: str = Field(..., min_length=1, max_length=MAX_SESSION_ID_LENGTH)

# ---------------------------------------------------------------------------
# Endpoints — System & Search
# ---------------------------------------------------------------------------
@app.get("/health", tags=["System"])
async def health_check(db: Session = Depends(get_db)) -> dict[str, Any]:
    """Check the health of the API, database, and AI service."""
    db_status: str = "ok"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = "error"

    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "version": "1.0.1",
        "database": db_status,
        "auth": auth_enabled(),
        "ai_client": "ready" if groq_client else "missing_key"
    }

@app.get("/tools", tags=["Tools"])
async def list_tools(_: Any = Depends(require_auth)) -> dict[str, Any]:
    """List all available tools for the agent."""
    from core.tools import ALL_TOOLS
    return {
        "count": len(ALL_TOOLS),
        "tools": [{"name": c.name, "description": c.description} for c in ALL_TOOLS]
    }

@app.get("/search", tags=["Search"])
@limiter.limit("30/minute")
async def global_search(
    request: Request,
    q: str = QueryParam(..., min_length=1),
    max_results: int = 10,
    _: Any = Depends(require_auth),
) -> dict[str, Any]:
    """Global web search endpoint."""
    try:
        results: list[dict[str, Any]] = WebSearch().search_raw(q, max_results=max_results)
        return {"query": q, "results": results}
    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail="Search service temporarily unavailable.")

# ---------------------------------------------------------------------------
# Endpoints — Sessions
# ---------------------------------------------------------------------------
@app.get("/sessions", tags=["Sessions"])
async def list_sessions(db: Session = Depends(get_db), _: Any = Depends(require_auth)) -> dict[str, list[str]]:
    """List all unique session IDs."""
    rows: list[Any] = db.query(models.ChatMessage.session_id).distinct().all()
    return {"sessions": [r[0] for r in rows]}

@app.get("/sessions/{session_id}/history", tags=["Sessions"])
async def get_history(
    session_id: str, 
    db: Session = Depends(get_db), 
    _: Any = Depends(require_auth)
) -> dict[str, list[dict[str, Any]]]:
    """Get the message history for a specific session."""
    messages: list[models.ChatMessage] = db.query(models.ChatMessage).filter_by(
        session_id=session_id
    ).order_by(models.ChatMessage.id).all()
    return {
        "messages": [{"role": m.role, "content": m.content, "time": m.created_at} for m in messages]
    }

# ---------------------------------------------------------------------------
# Endpoint — Chat
# ---------------------------------------------------------------------------
@app.post("/chat", tags=["Chat"])
@limiter.limit("15/minute")
async def chat_with_agent(
    request: Request,
    body: ChatRequest,
    db: Session = Depends(get_db),
    _: Any = Depends(require_auth),
) -> dict[str, str]:
    """Chat with the AI agent. Falls back to Free AI if Groq is missing/limited."""
    # Use Groq if available, otherwise fallback to Free AI (DuckDuckGo)
    selected_client = groq_client if groq_client else free_ai_client

    logger.info(f"[/chat] session={body.session_id} using {'Groq' if groq_client else 'FreeAI'}")
    try:
        # 1. Load history for context
        history: list[models.ChatMessage] = db.query(models.ChatMessage).filter_by(
            session_id=body.session_id
        ).order_by(models.ChatMessage.id).all()
        
        # 2. Init agent & restore memory
        agent: Agent = Agent(client=selected_client)
        for h in history:
            agent.memory.add(h.role, h.content)

        # 3. Get AI Response
        try:
            agent_response: str = agent.run(body.message)
        except Exception as e:
            if groq_client:
                logger.warning(f"Groq failed: {e}. Falling back to Free AI...")
                agent = Agent(client=free_ai_client) # Re-init with free client
                # Re-add history
                for h in history: agent.memory.add(h.role, h.content)
                agent_response = agent.run(body.message)
            else:
                raise e

        # 4. Save both messages in one transaction
        db.add(models.ChatMessage(session_id=body.session_id, role="user", content=body.message))
        db.add(models.ChatMessage(session_id=body.session_id, role="assistant", content=agent_response))
        db.commit()

        return {"response": agent_response}

    except AuthenticationError:
        db.rollback()
        logger.error("Groq Authentication Error: Invalid API Key.")
        raise HTTPException(status_code=401, detail="AI authentication failed. Check your API key.")
    
    except (APIStatusError, APIError) as e:
        db.rollback()
        logger.error(f"Groq API Error: {e}")
        raise HTTPException(status_code=502, detail="AI provider returned an error.")

    except Exception as e:
        db.rollback()
        logger.error(f"Chat error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred while processing your request.")

# ---------------------------------------------------------------------------
# Static Files & Fallback
# ---------------------------------------------------------------------------
# Mount static files at the end to avoid intercepting API routes
app.mount("/", StaticFiles(directory="static", html=True), name="static")
