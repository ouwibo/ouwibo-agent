# api.py
import logging
import os
import time

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request, Security
from fastapi import Query as QueryParam
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from groq import Groq
from pydantic import BaseModel, Field
from slowapi import (  # type: ignore[import-untyped]
    Limiter,
    _rate_limit_exceeded_handler,
)
from slowapi.errors import RateLimitExceeded  # type: ignore[import-untyped]
from slowapi.util import get_remote_address  # type: ignore[import-untyped]
from sqlalchemy.orm import Session

import models
from core.agent import Agent
from core.auth import auth_enabled, require_auth
from core.config import MAX_MESSAGE_LENGTH, MAX_SESSION_ID_LENGTH
from core.tools import WebSearch
from database import SessionLocal, engine

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
)
logger = logging.getLogger(__name__)

models.Base.metadata.create_all(bind=engine)

# ---------------------------------------------------------------------------
# Rate Limiter
# ---------------------------------------------------------------------------
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

# ---------------------------------------------------------------------------
# FastAPI App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Ouwibo AI Agent",
    description="API untuk Ouwibo AI Agent — didukung oleh Groq + LLaMA.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ---------------------------------------------------------------------------
# Security Headers Middleware
# ---------------------------------------------------------------------------
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    return response


# ---------------------------------------------------------------------------
# CORS — baca dari env, default * untuk development
# ---------------------------------------------------------------------------
_allowed_origins = [
    o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",") if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# ---------------------------------------------------------------------------
# Groq Client
# ---------------------------------------------------------------------------
_api_key = os.getenv("API_KEY") or os.getenv("GROQ_API_KEY")
if not _api_key:
    raise RuntimeError("API_KEY belum di-set. Tambahkan ke file .env.")

groq_client = Groq(
    api_key=_api_key,
    timeout=55.0,
)
logger.info("Groq client berhasil diinisialisasi.")


# ---------------------------------------------------------------------------
# Database Dependency
# ---------------------------------------------------------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------
class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=MAX_MESSAGE_LENGTH)
    session_id: str = Field(..., min_length=1, max_length=MAX_SESSION_ID_LENGTH)


# ---------------------------------------------------------------------------
# Endpoints — System
# ---------------------------------------------------------------------------
@app.get("/health", tags=["System"], summary="Health check")
async def health_check():
    return {"status": "ok", "version": "1.0.0", "auth": auth_enabled()}


@app.get("/auth/verify", tags=["Auth"], summary="Verifikasi token")
async def verify_token(_: None = Depends(require_auth)):
    """Endpoint khusus untuk memverifikasi apakah Bearer token valid."""
    return {"authenticated": True}


# ---------------------------------------------------------------------------
# Endpoints — Tools
# ---------------------------------------------------------------------------
@app.get("/tools", tags=["Tools"], summary="Daftar semua skill / tool agent")
async def list_tools(_: None = Depends(require_auth)):
    """Kembalikan metadata semua tool yang tersedia di agent."""
    from core.tools import ALL_TOOLS

    return {
        "count": len(ALL_TOOLS),
        "tools": [
            {
                "name": cls.name,
                "description": cls.description,
                "example": cls.example,
            }
            for cls in ALL_TOOLS
        ],
    }


# ---------------------------------------------------------------------------
# Endpoints — Search
# ---------------------------------------------------------------------------
@app.get("/search", tags=["Search"], summary="Pencarian web global")
@limiter.limit("30/minute")
async def global_search(
    request: Request,
    q: str = QueryParam(
        ..., min_length=1, max_length=500, description="Query pencarian"
    ),
    max_results: int = QueryParam(
        default=10, ge=1, le=20, description="Jumlah hasil maks"
    ),
    _: None = Depends(require_auth),
):
    """Lakukan pencarian web menggunakan DuckDuckGo dan kembalikan hasil terstruktur."""
    start = time.perf_counter()
    try:
        tool = WebSearch()
        results = tool.search_raw(q, max_results=max_results)
        elapsed = round(time.perf_counter() - start, 2)
        logger.info(f"[/search] q={q!r} results={len(results)} time={elapsed}s")
        return {"query": q, "count": len(results), "time": elapsed, "results": results}
    except Exception as e:
        logger.error(f"[/search] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Pencarian gagal: {str(e)}")


# ---------------------------------------------------------------------------
# Endpoints — Sessions
# ---------------------------------------------------------------------------
@app.get("/sessions", tags=["Sessions"], summary="Daftar semua sesi")
@limiter.limit("60/minute")
async def list_sessions(
    request: Request,
    db: Session = Depends(get_db),
    _: None = Depends(require_auth),
):
    rows = (
        db.query(models.ChatMessage.session_id)
        .distinct()
        .order_by(models.ChatMessage.session_id)
        .all()
    )
    return {"sessions": [r[0] for r in rows]}


@app.get(
    "/sessions/{session_id}/history", tags=["Sessions"], summary="Riwayat satu sesi"
)
@limiter.limit("60/minute")
async def get_session_history(
    request: Request,
    session_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(require_auth),
):
    messages = (
        db.query(models.ChatMessage)
        .filter(models.ChatMessage.session_id == session_id)
        .order_by(models.ChatMessage.id)
        .all()
    )
    return {
        "session_id": session_id,
        "count": len(messages),
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "created_at": m.created_at.isoformat()
                if m.created_at is not None
                else None,
            }
            for m in messages
        ],
    }


@app.delete("/sessions/{session_id}", tags=["Sessions"], summary="Hapus satu sesi")
@limiter.limit("30/minute")
async def delete_session(
    request: Request,
    session_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(require_auth),
):
    deleted_count = (
        db.query(models.ChatMessage)
        .filter(models.ChatMessage.session_id == session_id)
        .delete()
    )
    db.commit()
    logger.info(f"Sesi '{session_id}' dihapus ({deleted_count} pesan).")
    return {"session_id": session_id, "deleted_messages": deleted_count}


# ---------------------------------------------------------------------------
# Endpoints — Chat
# ---------------------------------------------------------------------------
@app.post("/chat", tags=["Chat"], summary="Kirim pesan ke agent")
@limiter.limit("15/minute")
async def chat_with_agent(
    request: Request,
    body: ChatRequest,
    db: Session = Depends(get_db),
    _: None = Depends(require_auth),
):
    """Terima pesan, muat riwayat sesi, jalankan agent, simpan hasil."""
    logger.info(f"[/chat] session={body.session_id!r} msg={body.message[:80]!r}")

    try:
        # 1. Muat riwayat sesi
        history_records = (
            db.query(models.ChatMessage)
            .filter(models.ChatMessage.session_id == body.session_id)
            .order_by(models.ChatMessage.id)
            .all()
        )

        # 2. Init agent + restore memory
        agent = Agent(client=groq_client)
        for record in history_records:
            agent.memory.add(str(record.role), str(record.content))

        # 3. Simpan pesan user
        db_user = models.ChatMessage(
            session_id=body.session_id,
            role="user",
            content=body.message,
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)

        # 4. Jalankan agent
        agent_response = agent.run(body.message)

        # 5. Simpan respons agent
        db_agent = models.ChatMessage(
            session_id=body.session_id,
            role="assistant",
            content=agent_response,
        )
        db.add(db_agent)
        db.commit()
        db.refresh(db_agent)

        logger.info(f"[/chat] OK session={body.session_id!r}")
        return {"response": agent_response}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[/chat] Error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Terjadi kesalahan internal: {str(e)}"
        )


# ---------------------------------------------------------------------------
# Static Files — HARUS paling akhir
# ---------------------------------------------------------------------------
app.mount("/", StaticFiles(directory="static", html=True), name="static")
