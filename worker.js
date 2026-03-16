/**
 * ================================================================
 * Ouwibo Agent — Cloudflare Worker v2
 * ================================================================
 *
 * Bindings used:
 *   env.ASSETS      — Static file serving (HTML/CSS/JS from /static)
 *   env.CACHE       — KV Namespace for edge-level API response caching
 *   env.VERCEL_URL  — Backend origin (Vercel)
 *   env.ALLOWED_ORIGINS  — CORS allowed origins
 *   env.EDGE_CACHE_TTL   — Seconds to cache GET /api/skills, /api/tools
 *   env.RATE_LIMIT_RPM   — Max requests per minute per IP
 *   env.APP_NAME / APP_ENV / APP_VERSION — App metadata
 *
 * Architecture:
 *   1. OPTIONS  → CORS pre-flight response
 *   2. /api/*   → Proxy to Vercel backend
 *   3. All else → Serve from ASSETS (static CDN)
 * ================================================================
 */

// ── Constants ─────────────────────────────────────────────────────────────────

/** API routes that must always be proxied to Vercel — never served as assets */
const API_PREFIX = "/api/";

/** Auth routes also proxied to Vercel */
const AUTH_ROUTES = ["/auth/verify"];

/** Cacheable GET API paths (cached at edge in KV) */
const CACHEABLE_PATHS = ["/api/skills", "/api/tools"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function jsonResponse(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extra,
    },
  });
}

function jsonError(status, detail) {
  return jsonResponse({ error: true, detail }, status);
}

function getCorsHeaders(env, origin) {
  const allowed = (env.ALLOWED_ORIGINS ?? "*").trim();
  const allowOrigin =
    allowed === "*"
      ? "*"
      : allowed.split(",").map((o) => o.trim()).includes(origin)
      ? origin
      : "";

  return {
    "Access-Control-Allow-Origin": allowOrigin || "null",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

/** Security headers added to every response */
function securityHeaders() {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  };
}

/** Merge headers from a Response into a new Headers object */
function cloneHeaders(resp, extra = {}) {
  const h = new Headers(resp.headers);
  for (const [k, v] of Object.entries(extra)) h.set(k, v);
  return h;
}

// ── Rate Limiter (edge, per-IP, stored in KV) ─────────────────────────────────

async function checkRateLimit(env, ip) {
  if (!env.CACHE) return false; // No KV → skip
  const rpm = parseInt(env.RATE_LIMIT_RPM ?? "60", 10);
  const key = `rl:${ip}:${Math.floor(Date.now() / 60000)}`;
  const current = parseInt((await env.CACHE.get(key)) ?? "0", 10);
  if (current >= rpm) return true; // Rate limited
  await env.CACHE.put(key, String(current + 1), { expirationTtl: 120 });
  return false;
}

// ── Edge Cache (KV) ───────────────────────────────────────────────────────────

async function getCached(env, key) {
  if (!env.CACHE) return null;
  const cached = await env.CACHE.get(key, { type: "text" });
  return cached;
}

async function setCached(env, key, value, ttl) {
  if (!env.CACHE || !ttl || ttl <= 0) return;
  await env.CACHE.put(key, value, { expirationTtl: ttl });
}

// ── Main Handler ──────────────────────────────────────────────────────────────

export default {
  /**
   * @param {Request} request
   * @param {Env}     env
   * @param {ExecutionContext} ctx
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") ?? "";
    const ip =
      request.headers.get("CF-Connecting-IP") ??
      request.headers.get("X-Forwarded-For") ??
      "unknown";

    const corsHeaders = getCorsHeaders(env, origin);
    const secHeaders = securityHeaders();

    // ── 1. CORS pre-flight ────────────────────────────────────────────────────
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: { ...corsHeaders, ...secHeaders },
      });
    }

    // ── 2. Rate limiting ──────────────────────────────────────────────────────
    const isRateLimited = await checkRateLimit(env, ip);
    if (isRateLimited) {
      return jsonResponse(
        { error: true, detail: "Too many requests. Please slow down." },
        429,
        { "Retry-After": "60", ...corsHeaders, ...secHeaders }
      );
    }

    const isApiRoute =
      url.pathname.startsWith(API_PREFIX) ||
      AUTH_ROUTES.some((r) => url.pathname.startsWith(r));

    // ── 3. Static assets — serve from Cloudflare CDN (very fast) ─────────────
    if (!isApiRoute && env.ASSETS) {
      try {
        const assetResp = await env.ASSETS.fetch(request);
        const h = cloneHeaders(assetResp, {
          ...secHeaders,
          "X-Served-By": "ouwibo-cloudflare-assets",
        });
        return new Response(assetResp.body, {
          status: assetResp.status,
          statusText: assetResp.statusText,
          headers: h,
        });
      } catch (_) {
        // Fall through to Vercel if asset not found
      }
    }

    // ── 4. API routes — proxy to Vercel ───────────────────────────────────────
    const vercelOrigin = (env.VERCEL_URL ?? "").replace(/\/$/, "");
    if (!vercelOrigin) {
      return jsonError(
        503,
        "VERCEL_URL is not configured. Set it in Workers & Pages → Settings → Variables."
      );
    }

    const targetUrl = new URL(url.pathname + url.search, vercelOrigin);

    // ── 4a. Edge cache for safe GET API responses ─────────────────────────────
    const ttl = parseInt(env.EDGE_CACHE_TTL ?? "0", 10);
    const isCacheable =
      request.method === "GET" &&
      CACHEABLE_PATHS.some((p) => url.pathname.startsWith(p)) &&
      ttl > 0;

    if (isCacheable) {
      const cacheKey = `api:${url.pathname}${url.search}`;
      const cached = await getCached(env, cacheKey);
      if (cached) {
        return new Response(cached, {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "X-Served-By": "ouwibo-cloudflare-kv-cache",
            "X-Cache": "HIT",
            ...corsHeaders,
            ...secHeaders,
          },
        });
      }
    }

    // ── 4b. Forward request to Vercel ─────────────────────────────────────────
    const fwdHeaders = new Headers(request.headers);
    fwdHeaders.set("X-Forwarded-Host", url.hostname);
    fwdHeaders.set("X-Forwarded-Proto", "https");
    fwdHeaders.set("X-Real-IP", ip);
    fwdHeaders.set("X-Via-Cloudflare-Worker", "1");
    fwdHeaders.set("X-App-Name", env.APP_NAME ?? "ouwibo-agent");
    fwdHeaders.set("X-App-Env", env.APP_ENV ?? "production");

    const proxyReq = new Request(targetUrl.toString(), {
      method: request.method,
      headers: fwdHeaders,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      redirect: "follow",
    });

    try {
      const resp = await fetch(proxyReq);

      const respHeaders = cloneHeaders(resp, {
        ...corsHeaders,
        ...secHeaders,
        "X-Served-By": "ouwibo-cloudflare-worker",
        "X-Cache": "MISS",
        "X-App-Version": env.APP_VERSION ?? "unknown",
      });

      // ── 4c. Store cacheable response in KV ───────────────────────────────
      if (isCacheable && resp.ok) {
        const body = await resp.text();
        const cacheKey = `api:${url.pathname}${url.search}`;
        ctx.waitUntil(setCached(env, cacheKey, body, ttl));
        return new Response(body, {
          status: resp.status,
          statusText: resp.statusText,
          headers: respHeaders,
        });
      }

      return new Response(resp.body, {
        status: resp.status,
        statusText: resp.statusText,
        headers: respHeaders,
      });
    } catch (err) {
      return jsonError(502, `Upstream error: ${err.message}`);
    }
  },
};
