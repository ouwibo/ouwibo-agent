# api.py
import sys
import os
# Force current directory into path for IDE and local execution
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import logging
import os
import time
from typing import Any, Callable, Generator

import slowapi  # type: ignore[import-untyped]
from dotenv import load_dotenv  # type: ignore[import-untyped]
from fastapi import Depends, FastAPI, HTTPException, Request, Response, Query as QueryParam  # type: ignore[import-untyped]
from fastapi.middleware.cors import CORSMiddleware  # type: ignore[import-untyped]
from fastapi.staticfiles import StaticFiles  # type: ignore[import-untyped]
from fastapi.responses import FileResponse, StreamingResponse  # type: ignore[import-untyped]
import uvicorn  # type: ignore[import-untyped]
from openai import OpenAI, APIError, AuthenticationError  # type: ignore[import-untyped]
from pydantic import BaseModel, Field  # type: ignore[import-untyped]
from slowapi import Limiter  # type: ignore[import-untyped]
from slowapi.errors import RateLimitExceeded  # type: ignore[import-untyped]
from slowapi.util import get_remote_address  # type: ignore[import-untyped]
from sqlalchemy import text  # type: ignore[import-untyped]
from sqlalchemy.orm import Session  # type: ignore[import-untyped]

try:
    from backend import models, database
    from backend.database import SessionLocal, engine
    from backend.core.agent import Agent
    from backend.core.auth import auth_enabled, require_auth
    from backend.core.config import (
        MAX_MESSAGE_LENGTH,
        MAX_SESSION_ID_LENGTH,
        DASHSCOPE_BASE_URL,
        get_env,
        EnvValidationError,
    )
    from backend.core import schemas
    from backend.core.tools import WebSearch
    from backend.core.logger import get_logger
except (ImportError, ValueError):
    try:
        from core.config import (
            MAX_MESSAGE_LENGTH,
            MAX_SESSION_ID_LENGTH,
            DASHSCOPE_BASE_URL,
            get_env,
            EnvValidationError,
        )
    except ImportError:
        # Fallback for direct execution
        import os
        def get_env(): return os.environ
        MAX_MESSAGE_LENGTH = 32000
        MAX_SESSION_ID_LENGTH = 64
        DASHSCOPE_BASE_URL = ""
    
    # Always ensure EnvValidationError is defined for the catch block
    if 'EnvValidationError' not in locals():
        class EnvValidationError(Exception): pass
    
    import models
    import database
    from database import SessionLocal, engine
    from core.agent import Agent
    from core.auth import auth_enabled, require_auth
    from core import schemas
    from core.tools import WebSearch
    from core.logger import get_logger

# ---------------------------------------------------------------------------
# Setup & Database
# ---------------------------------------------------------------------------
load_dotenv()

logger = get_logger(__name__)

# Simple metrics (Task 8)
STATS = {"requests": 0, "errors": 0}

# Validate required environment variables at startup
try:
    env_config = get_env()
    logger.info("Environment variables validated successfully")
except EnvValidationError as env_err:
    logger.error(f"Environment validation failed: {env_err}")
    raise RuntimeError(f"Missing required environment variables: {env_err}")

# Ensure tables are created
models.Base.metadata.create_all(bind=engine)

# ---------------------------------------------------------------------------
# AI Client Configuration (Advanced Rotation)
# ---------------------------------------------------------------------------

class KeyRotator:
    """Manages Alibaba Cloud DashScope API keys with auto-rotation."""
    def __init__(self):
        self.keys = []
        # Support multiple keys: DASHSCOPE_API_KEY, DASHSCOPE_API_KEY_2, DASHSCOPE_API_KEY_3, etc.
        env_names = ["DASHSCOPE_API_KEY"] + [f"DASHSCOPE_API_KEY_{i}" for i in range(2, 6)]
        for env_name in env_names:
            val = (os.getenv(env_name) or "").strip()
            if val and val not in self.keys:
                self.keys.append(val)
        
        self.idx = 0
        self.clients = [OpenAI(api_key=k, base_url=DASHSCOPE_BASE_URL, timeout=60.0) for k in self.keys]
        
        if self.clients:
            logger.info(f"KeyRotator initialized with {len(self.clients)} DashScope keys.")
        else:
            logger.warning("No DashScope API keys found. Agent will run in FREE mode (DDGS).")

    def get_current_client(self) -> Any:
        if not self.clients:
            return None
        return self.clients[self.idx]

    def rotate(self) -> bool:
        """Switch to the next available key. Returns False if cycled back to start."""
        if not self.clients:
            return False
        self.idx = (self.idx + 1) % len(self.clients)
        logger.warning(f"Switched to API Key #{self.idx + 1}")
        return self.idx != 0

rotator = KeyRotator()

# Free AI Wrapper for DuckDuckGo
class FreeAIClient:
    """A client that mimics the Alibaba/OpenAI interface using DuckDuckGo AI (Free)."""
    class Chat:
        class Completions:
            def create(self, messages, model="gpt-4o-mini", **kwargs):
                from ddgs import DDGS  # type: ignore[import-untyped]
                prompt = messages[-1]["content"]
                with DDGS() as ddgs:
                    ddgs_model = "gpt-4o-mini"
                    if "llama" in str(model).lower(): ddgs_model = "llama-3.1-70b"
                    response = ddgs.chat(prompt, model=ddgs_model)
                    
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
    description="API for Ouwibo AI Agent.",
    version="1.0.1",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.state.limiter = limiter


# Definisi handler secara lokal agar Zed tidak komplain tentang akses member privat (_)
def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    """Custom handler for rate limit exceeded errors."""
    from fastapi.responses import JSONResponse  # type: ignore[import-untyped]
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
# Endpoints — System & Search
# ---------------------------------------------------------------------------
@app.get("/auth/verify", tags=["Auth"])
async def verify_token(_: None = Depends(require_auth)):
    return {"valid": True}


@app.get("/api/health", tags=["System"], response_model=schemas.HealthResponse)
@app.get("/health", tags=["System"], response_model=schemas.HealthResponse)
async def health_check(db: Session = Depends(get_db)) -> schemas.HealthResponse:
    """Check the health of the API, database, and AI service."""
    db_status: str = "ok"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = "error"

    ai_key_configured = bool(rotator.keys)
    access_token_configured = bool((os.getenv("ACCESS_TOKEN") or "").strip())
    search_provider = (os.getenv("SEARCH_PROVIDER") or "auto").strip().lower()

    return schemas.HealthResponse(
        status="ok" if db_status == "ok" else "degraded",
        version="1.0.1",
        database=db_status,
        auth=auth_enabled(),
        ai_client="ready" if rotator.clients else "free",
        config=schemas.HealthConfig(
            ai_key_configured=ai_key_configured,
            active_key_index=rotator.idx if rotator.clients else -1,
            total_keys=len(rotator.keys),
            access_token_configured=access_token_configured,
            search_provider=search_provider,
        ),
    )


@app.get("/api/tools", tags=["Tools"])
@app.get("/tools", tags=["Tools"])
async def list_tools(_: Any = Depends(require_auth)) -> dict[str, Any]:
    """List all available tools for the agent."""
    from core.tools import ALL_TOOLS  # type: ignore[import-untyped]

    return {
        "count": len(ALL_TOOLS),
        "tools": [{"name": c.name, "description": c.description} for c in ALL_TOOLS],
    }


@app.post("/api/tools/execute", tags=["Tools"])
@limiter.limit("30/minute")
async def execute_tool(
    request: Request,
    body: schemas.ToolExecuteRequest,
    _: Any = Depends(require_auth),
) -> dict[str, Any]:
    """Execute a tool directly (used by the Tools UI 'Run' button)."""
    from core.tools import ALL_TOOLS  # type: ignore[import-untyped]

    tool_name = (body.tool or "").strip().lower()
    if not tool_name:
        raise HTTPException(status_code=400, detail="Missing tool name.")

    cls_map: dict[str, Any] = {c.name: c for c in ALL_TOOLS if getattr(c, "name", None)}  # type: ignore[union-attr]
    tool_cls: Any = cls_map.get(tool_name)
    if tool_cls is None:
        raise HTTPException(status_code=404, detail="Tool not found.")

    try:
        tool: Any = tool_cls()
        out = tool.execute(body.arg or "")
        return {"tool": tool_name, "output": out}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Tool execute error ({tool_name}): {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Tool execution failed.")


@app.get("/api/skills", tags=["Skills"])
async def list_skills(_: Any = Depends(require_auth)) -> dict[str, Any]:
    """List available skills loaded from skills/<id>/SKILL.md."""
    from core.skills import list_skills as _list  # type: ignore[import-untyped]

    skills = _list()
    return {
        "count": len(skills),
        "skills": [
            {"id": s.slug, "title": s.title, "description": s.description}
            for s in skills
        ],
    }


@app.get("/api/skills/{skill_id}", tags=["Skills"])
async def get_skill(skill_id: str, _: Any = Depends(require_auth)) -> dict[str, Any]:
    """Get one skill (metadata + markdown content)."""
    from core.skills import get_skill as _get  # type: ignore[import-untyped]

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
        elapsed: float = round(time.perf_counter() - t0, 3)  # type: ignore[assignment]
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
@app.post("/api/chat", tags=["Chat"])
@app.post("/chat", tags=["Chat"])
@limiter.limit("15/minute")
async def chat_with_agent(
    request: Request,
    body: schemas.ChatRequest,
    db: Session = Depends(get_db),
    _: None = Depends(require_auth),
):
    # Use DashScope client if available, otherwise fall back to FreeAIClient
    client = rotator.get_current_client() or free_ai_client
    client_type = "DashScope" if rotator.clients else "FreeAI (DuckDuckGo)"
    
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
        # Auto mode: if no skill specified (null), agent uses its full capabilities
        # without being constrained to any specific skill context.
        skill_id = (body.skill or "").strip().lower()
        skill_context = ""
        if skill_id:
            try:
                from core.skills import get_skill as _get_skill  # type: ignore[import-untyped]
                skill_context = _get_skill(skill_id).content
            except FileNotFoundError:
                if (body.skill or "").strip():
                    raise HTTPException(status_code=404, detail="Selected skill not found.")
                skill_context = ""
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))

        try:
            agent_response = agent.run(body.message, skill_context=skill_context)
        except Exception as e:
            # If current key fails (Rate limit or Auth), try rotating
            if rotator.clients:
                logger.warning(f"Active API key failed: {e}. Rotating...")
                if rotator.rotate():
                    # Try again with new key
                    agent = Agent(client=rotator.get_current_client())
                    for h in history: agent.memory.add(h.role, h.content)
                    agent_response = agent.run(body.message, skill_context=skill_context)
                else:
                    logger.warning("All API keys failed or cycled. Falling back to Free AI...")
                    agent = Agent(client=free_ai_client)
                    for h in history: agent.memory.add(h.role, h.content)
                    agent_response = agent.run(body.message, skill_context=skill_context)
            else:
                raise e

        # 4. Save both messages in one transaction
        db.add(models.ChatMessage(session_id=body.session_id, role="user", content=body.message))
        db.add(models.ChatMessage(session_id=body.session_id, role="assistant", content=agent_response))
        db.commit()

        return {"response": agent_response}

    except AuthenticationError as e:
        db.rollback()
        logger.error(f"AI Authentication Error: {e}")
        # If we failed auth, rotate and suggest retry
        rotator.rotate()
        raise HTTPException(status_code=401, detail="AI authentication failed. We've rotated the key, please try again.")

    except APIError as e:
        db.rollback()
        logger.error(f"AI API Error: {e}")
        # Handle Rate Limit specifically if needed (though Agent handles it via MODELS fallback)
        if "rate limit" in str(e).lower():
            raise HTTPException(status_code=429, detail="AI rate limit reached. Please try again in a moment.")
        raise HTTPException(status_code=502, detail="AI provider returned an error.")

    except Exception as e:
        db.rollback()
        logger.error(f"Chat error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="An internal error occurred while processing your request.",
        )


@app.post("/api/chat/stream", tags=["Chat"])
async def chat_with_agent_stream(
    request: Request,
    body: schemas.ChatRequest,
    db: Session = Depends(get_db),
    _: None = Depends(require_auth),
):
    """Streaming version of chat_with_agent using Server-Sent Events (SSE)."""
    import json
    client = rotator.get_current_client() or free_ai_client
    
    # Init agent & restore memory
    history = (
        db.query(models.ChatMessage)
        .filter_by(session_id=body.session_id)
        .order_by(models.ChatMessage.id)
        .all()
    )
    agent = Agent(client=client)
    for h in history:
        agent.memory.add(h.role, h.content)

    skill_id = (body.skill or "").strip().lower()
    skill_context = ""
    if skill_id:
        try:
            from core.skills import get_skill as _get_skill  # type: ignore[import-untyped]
            skill_context = _get_skill(skill_id).content
        except Exception:
            pass

    async def event_generator():
        full_response_parts: list[str] = []
        try:
            for chunk in agent.run_stream(body.message, skill_context=skill_context, session_id=body.session_id):
                yield chunk
                
                if "chunk" in chunk:
                    try:
                        data = json.loads(chunk.replace("data: ", "").strip())
                        next_chunk = data.get("chunk")
                        if isinstance(next_chunk, str):
                            full_response_parts.append(next_chunk)
                    except Exception:
                        pass
            
            if full_response_parts:
                full_response = "".join(full_response_parts)
                db.add(models.ChatMessage(session_id=body.session_id, role="user", content=body.message))
                db.add(models.ChatMessage(session_id=body.session_id, role="assistant", content=full_response))
                db.commit()
        except Exception as e:
            logger.error(f"Stream error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# ---------------------------------------------------------------------------
# Metadata (8004 Scan, etc.)
# ---------------------------------------------------------------------------
@app.get("/8004.json", tags=["Metadata"])
async def get_8004_json():
    # For Vercel, the file is usually at the root relative to api/
    return FileResponse(os.path.join(os.path.dirname(__file__), "..", "8004.json"))


@app.get("/.well-known/agent-card.json", tags=["Metadata"])
async def get_agent_card_json():
    return FileResponse(os.path.join(os.path.dirname(__file__), "..", ".well-known", "agent-card.json"))


# ---------------------------------------------------------------------------
# Static Files & Fallback
# ---------------------------------------------------------------------------
app.mount("/", StaticFiles(directory="static", html=True), name="static")


if __name__ == "__main__":
    # Load port from .env
    port = int(os.getenv("PORT", 8001))
    # logger.info(f"Ouwibo Agent starting on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
