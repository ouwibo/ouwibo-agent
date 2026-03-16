# api.py
import logging
import os
import time
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
# .strip() is CRITICAL to prevent "Illegal header value" errors from .env
_api_key = (os.getenv("API_KEY") or os.getenv("GROQ_API_KEY") or os.getenv("GROQ_API_KEY2") or "").strip()
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
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

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


# Definisi handler secara lokal agar Zed tidak komplain tentang akses member privat (_)
def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    """Custom handler for rate limit exceeded errors."""
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=429,
        content={
            "detail": f"Rate limit exceeded: {exc.detail}",
            "error": "rate_limit_exceeded",
        },
    )


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


# Handle CORS more robustly
_raw_origins = os.getenv("ALLOWED_ORIGINS", "*")
if _raw_origins == "*":
    _allowed_origins = ["*"]
else:
    _allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

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
    # Optional: skill id loaded from skills/<id>/SKILL.md (default: "general" if exists)
    skill: str | None = Field(default=None, min_length=1, max_length=64)


class ToolExecuteRequest(BaseModel):
    tool: str = Field(..., min_length=1, max_length=64)
    arg: str = Field(default="", max_length=4000)


# ---------------------------------------------------------------------------
# Endpoints — System & Search
# ---------------------------------------------------------------------------
@app.get("/auth/verify", tags=["Auth"])
async def verify_token(_: None = Depends(require_auth)):
    return {"valid": True}


@app.get("/health", tags=["System"])
async def health_check(db: Session = Depends(get_db)) -> dict[str, Any]:
    """Check the health of the API, database, and AI service."""
    db_status: str = "ok"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = "error"

    ai_key_configured = bool((os.getenv("API_KEY") or os.getenv("GROQ_API_KEY") or "").strip())
    access_token_configured = bool((os.getenv("ACCESS_TOKEN") or "").strip())
    search_provider = (os.getenv("SEARCH_PROVIDER") or "auto").strip().lower()

    missing = []
    if not ai_key_configured:
        missing.append("API_KEY")
    if not access_token_configured:
        missing.append("ACCESS_TOKEN")

    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "version": "1.0.1",
        "database": db_status,
        "auth": auth_enabled(),
        "ai_client": "ready" if groq_client else "free",
        "config": {
            "ai_key_configured": ai_key_configured,
            "access_token_configured": access_token_configured,
            "search_provider": search_provider,
            "missing": missing,
        },
    }


@app.get("/tools", tags=["Tools"])
async def list_tools(_: Any = Depends(require_auth)) -> dict[str, Any]:
    """List all available tools for the agent."""
    from core.tools import ALL_TOOLS

    return {
        "count": len(ALL_TOOLS),
        "tools": [{"name": c.name, "description": c.description} for c in ALL_TOOLS],
    }


@app.post("/tools/execute", tags=["Tools"])
@limiter.limit("30/minute")
async def execute_tool(
    request: Request,
    body: ToolExecuteRequest,
    _: Any = Depends(require_auth),
) -> dict[str, Any]:
    """Execute a tool directly (used by the Tools UI 'Run' button)."""
    from core.tools import ALL_TOOLS

    tool_name = (body.tool or "").strip().lower()
    if not tool_name:
        raise HTTPException(status_code=400, detail="Missing tool name.")

    cls_map = {c.name: c for c in ALL_TOOLS if getattr(c, "name", None)}
    tool_cls = cls_map.get(tool_name)
    if tool_cls is None:
        raise HTTPException(status_code=404, detail="Tool not found.")

    try:
        tool = tool_cls()
        out = tool.execute(body.arg or "")
        return {"tool": tool_name, "output": out}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Tool execute error ({tool_name}): {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Tool execution failed.")


@app.get("/skills", tags=["Skills"])
async def list_skills(_: Any = Depends(require_auth)) -> dict[str, Any]:
    """List available skills loaded from skills/<id>/SKILL.md."""
    from core.skills import list_skills as _list

    skills = _list()
    return {
        "count": len(skills),
        "skills": [
            {"id": s.slug, "title": s.title, "description": s.description}
            for s in skills
        ],
    }


@app.get("/skills/{skill_id}", tags=["Skills"])
async def get_skill(skill_id: str, _: Any = Depends(require_auth)) -> dict[str, Any]:
    """Get one skill (metadata + markdown content)."""
    from core.skills import get_skill as _get

    try:
        s = _get(skill_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Skill not found.")
    return {"id": s.slug, "title": s.title, "description": s.description, "content": s.content}


@app.get("/search", tags=["Search"])
@limiter.limit("30/minute")
async def global_search(
    request: Request,
    q: str = QueryParam(..., min_length=1),
    type: str = QueryParam("all", min_length=1),
    provider: str = QueryParam("auto", min_length=1),
    max_results: int = 10,
    _: None = Depends(require_auth),
):
    try:
        t0 = time.perf_counter()
        results = WebSearch().search_raw(q, max_results=max_results, kind=type, provider=provider)
        elapsed = round(time.perf_counter() - t0, 3)
        return {
            "query": q,
            "type": type,
            "provider": provider,
            "count": len(results),
            "time": elapsed,
            "results": results,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(
            status_code=500, detail="Search service temporarily unavailable."
        )


# ---------------------------------------------------------------------------
# Endpoints — Sessions
# ---------------------------------------------------------------------------
@app.get("/sessions", tags=["Sessions"])
async def list_sessions(db: Session = Depends(get_db), _: None = Depends(require_auth)):
    rows = db.query(models.ChatMessage.session_id).distinct().all()
    return {"sessions": [r[0] for r in rows]}


@app.get("/sessions/{session_id}/history", tags=["Sessions"])
async def get_history(
    session_id: str, db: Session = Depends(get_db), _: None = Depends(require_auth)
):
    messages = (
        db.query(models.ChatMessage)
        .filter_by(session_id=session_id)
        .order_by(models.ChatMessage.id)
        .all()
    )
    return {
        "messages": [
            {"role": m.role, "content": m.content, "time": m.created_at}
            for m in messages
        ]
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
    _: None = Depends(require_auth),
):
    global groq_client
    # Use Groq client if available, otherwise fall back to FreeAIClient
    client = groq_client if groq_client else free_ai_client
    client_type = "Groq" if groq_client else "FreeAI (DuckDuckGo)"
    
    logger.info(f"[/chat] session={body.session_id} client={client_type}")
    try:
        # 1. Load history for context
        history = (
            db.query(models.ChatMessage)
            .filter_by(session_id=body.session_id)
            .order_by(models.ChatMessage.id)
            .all()
        )

        # 2. Init agent & restore memory
        agent = Agent(client=client)
        for h in history:
            agent.memory.add(h.role, h.content)

        # 3. Get AI Response
        # Load optional skill instructions (default: "general" if exists)
        skill_id = (body.skill or "").strip().lower() or "general"
        skill_context = ""
        if skill_id:
            try:
                from core.skills import get_skill as _get_skill

                skill_context = _get_skill(skill_id).content
            except FileNotFoundError:
                # If user explicitly requested a skill that doesn't exist, reject.
                if (body.skill or "").strip():
                    raise HTTPException(status_code=404, detail="Selected skill not found.")
                skill_context = ""
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))

        try:
            agent_response = agent.run(body.message, skill_context=skill_context)
        except Exception as e:
            if groq_client:
                logger.warning(f"Groq failed: {e}. Falling back to Free AI...")
                agent = Agent(client=free_ai_client)  # Re-init with free client
                # Re-add history
                for h in history:
                    agent.memory.add(h.role, h.content)
                agent_response = agent.run(body.message, skill_context=skill_context)
            else:
                raise e

        # 4. Save both messages in one transaction
        db.add(
            models.ChatMessage(
                session_id=body.session_id, role="user", content=body.message
            )
        )
        db.add(
            models.ChatMessage(
                session_id=body.session_id, role="assistant", content=agent_response
            )
        )
        db.commit()

        return {"response": agent_response}

    except AuthenticationError:
        db.rollback()
        logger.error("Groq Authentication Error: Invalid API Key.")
        # Disable Groq for subsequent requests and fall back to free mode.
        groq_client = None
        raise HTTPException(
            status_code=401, detail="AI authentication failed. Check your API key."
        )

    except (APIStatusError, APIError) as e:
        db.rollback()
        logger.error(f"Groq API Error: {e}")
        raise HTTPException(status_code=502, detail="AI provider returned an error.")

    except Exception as e:
        db.rollback()
        logger.error(f"Chat error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="An internal error occurred while processing your request.",
        )


# ---------------------------------------------------------------------------
# Static Files & Fallback
# ---------------------------------------------------------------------------
# Mount static files at the end to avoid intercepting API routes
app.mount("/", StaticFiles(directory="static", html=True), name="static")
