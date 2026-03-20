# core/auth.py
"""
Authentication module for Ouwibo Agent API.

Strategy: Static Bearer token via ACCESS_TOKEN environment variable.
- Set ACCESS_TOKEN in your .env or Vercel environment variables.
- If ACCESS_TOKEN is NOT set, auth is disabled (development mode).
- Clients must send: Authorization: Bearer <token>
"""

import logging
import os

from fastapi import Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Security scheme (used for /docs OpenAPI "Authorize" button)
# ---------------------------------------------------------------------------
_bearer_scheme = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------------
# Lazy-load token so it's read at request time (Vercel injects env at runtime)
# ---------------------------------------------------------------------------
def _get_required_token() -> str | None:
    return os.environ.get("ACCESS_TOKEN", "").strip() or None


# ---------------------------------------------------------------------------
# Dependency — inject into any route you want to protect
# ---------------------------------------------------------------------------
async def require_auth(
    credentials: HTTPAuthorizationCredentials | None = Header(
        default=None, include_in_schema=False
    ),
    authorization: str | None = Header(default=None),
) -> None:
    """
    FastAPI dependency that validates the Bearer token.

    Usage:
        @app.post("/chat")
        async def chat(body: ChatRequest, _: None = Depends(require_auth)):
            ...

    If ACCESS_TOKEN env var is empty / not set → auth is skipped (dev mode).
    """
    required = _get_required_token()

    # Dev mode — no token configured, skip auth entirely
    if required is None:
        logger.debug("[auth] ACCESS_TOKEN not set — auth disabled (dev mode).")
        return

    # Extract raw token from Authorization header
    token: str | None = None

    if authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1]
        elif len(parts) == 1:
            # Bare token without "Bearer" prefix — accept it too
            token = parts[0]

    if not token:
        logger.warning("[auth] Missing or malformed Authorization header.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Constant-time comparison to prevent timing attacks
    if not _secure_compare(token, required):
        logger.warning("[auth] Invalid token supplied.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    logger.debug("[auth] Token validated successfully.")


# ---------------------------------------------------------------------------
# Constant-time string comparison (avoids timing side-channels)
# ---------------------------------------------------------------------------
def _secure_compare(a: str, b: str) -> bool:
    """Compare two strings in constant time to prevent timing attacks."""
    import hmac

    return hmac.compare_digest(a.encode(), b.encode())


# ---------------------------------------------------------------------------
# Helper — check if auth is currently active (useful for /health responses)
# ---------------------------------------------------------------------------
def auth_enabled() -> bool:
    """Return True if ACCESS_TOKEN is configured and auth is active."""
    return _get_required_token() is not None
