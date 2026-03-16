/**
 * ============================================================
 * Ouwibo Agent — Cloudflare Worker (Public Proxy)
 * ============================================================
 * Simple reverse-proxy to the Vercel backend.
 * No authentication required — the app handles its own auth
 * via ACCESS_TOKEN Bearer tokens on the API endpoints.
 *
 * Required environment variable:
 *   VERCEL_URL  — e.g. https://ouwibo-agent.vercel.app
 *
 * Set it in Cloudflare Dashboard:
 *   Workers & Pages → agent → Settings → Variables and Secrets
 * ============================================================
 */

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

/**
 * Build a JSON error response.
 * @param {number} status
 * @param {string} detail
 * @returns {Response}
 */
function jsonError(status, detail) {
  return new Response(JSON.stringify({ error: true, detail }), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

/** CORS headers for OPTIONS pre-flight */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

// ---------------------------------------------------------------------------
// Main fetch handler
// ---------------------------------------------------------------------------

export default {
  /**
   * @param {Request}                    request
   * @param {{ VERCEL_URL?: string }}    env
   * @param {ExecutionContext}           ctx
   * @returns {Promise<Response>}
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ── CORS pre-flight ─────────────────────────────────────────────────────
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // ── Resolve Vercel origin ────────────────────────────────────────────────
    const vercelOrigin = (env.VERCEL_URL ?? "").replace(/\/$/, "");

    if (!vercelOrigin) {
      return jsonError(
        503,
        "VERCEL_URL is not configured. " +
          "Set it in Workers & Pages → agent → Settings → Variables."
      );
    }

    // ── Build target URL ─────────────────────────────────────────────────────
    const targetUrl = new URL(url.pathname + url.search, vercelOrigin);

    // ── Forward headers ──────────────────────────────────────────────────────
    const fwdHeaders = new Headers(request.headers);
    fwdHeaders.set("X-Forwarded-Host", url.hostname);
    fwdHeaders.set("X-Forwarded-Proto", "https");
    fwdHeaders.set(
      "X-Real-IP",
      request.headers.get("CF-Connecting-IP") ?? ""
    );
    // Let the backend know this came through the Cloudflare Worker
    fwdHeaders.set("X-Via-Cloudflare-Worker", "1");

    // ── Proxy request ────────────────────────────────────────────────────────
    const proxyReq = new Request(targetUrl.toString(), {
      method: request.method,
      headers: fwdHeaders,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      redirect: "follow",
    });

    try {
      const resp = await fetch(proxyReq);

      // Pass the response through, tagging it for observability
      const respHeaders = new Headers(resp.headers);
      respHeaders.set("X-Served-By", "ouwibo-cloudflare-worker");

      return new Response(resp.body, {
        status: resp.status,
        statusText: resp.statusText,
        headers: respHeaders,
      });
    } catch (err) {
      return jsonError(502, `Upstream proxy error: ${err.message}`);
    }
  },
};
