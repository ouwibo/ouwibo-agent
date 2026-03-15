/**
 * ============================================================
 * Ouwibo Agent — Cloudflare Worker
 * ============================================================
 * 1. Validates every request against a Cloudflare Access JWT
 *    (Cf-Access-Jwt-Assertion header, verified with JWKs).
 * 2. Proxies approved requests to the Vercel backend.
 *
 * Required environment variables (set in wrangler.toml or
 * Cloudflare dashboard → Workers → Settings → Variables):
 *   VERCEL_URL  – e.g. https://ouwibo-agent.vercel.app
 *
 * Cloudflare Access details:
 *   Team domain : https://ouwibo.cloudflareaccess.com
 *   Audience    : 102c461315b1d19e61c3cac74b2bb6f0d238f0cbce2726e1fc7b9f70e4b748e5
 *   JWKs URL    : https://ouwibo.cloudflareaccess.com/cdn-cgi/access/certs
 * ============================================================
 */

// ── Cloudflare Access configuration ──────────────────────────
const CF_ACCESS_TEAM_DOMAIN = "https://ouwibo.cloudflareaccess.com";
const CF_ACCESS_AUD =
  "102c461315b1d19e61c3cac74b2bb6f0d238f0cbce2726e1fc7b9f70e4b748e5";
const CF_ACCESS_CERTS_URL = `${CF_ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`;

// ── Paths that bypass JWT validation ─────────────────────────
// /health is intentionally public for uptime monitors.
// All other paths require a valid Access JWT.
const BYPASS_PATHS = new Set(["/health"]);

// ── In-memory JWK cache (refreshed every 10 minutes) ─────────
let _cachedKeys = null;
let _cacheExpiresAt = 0;

// ─────────────────────────────────────────────────────────────
// JWK helpers
// ─────────────────────────────────────────────────────────────

/**
 * Fetch (and cache) the public keys from Cloudflare Access.
 * @returns {Promise<JsonWebKey[]>}
 */
async function getPublicKeys() {
  const now = Date.now();
  if (_cachedKeys && now < _cacheExpiresAt) {
    return _cachedKeys;
  }

  const res = await fetch(CF_ACCESS_CERTS_URL, {
    cf: { cacheTtl: 600, cacheEverything: true },
  });

  if (!res.ok) {
    throw new Error(
      `Failed to fetch JWKs: ${res.status} ${res.statusText}`
    );
  }

  const { keys } = await res.json();

  if (!Array.isArray(keys) || keys.length === 0) {
    throw new Error("JWKs endpoint returned no keys");
  }

  _cachedKeys = keys;
  _cacheExpiresAt = now + 10 * 60 * 1000; // 10 min
  return _cachedKeys;
}

/**
 * Decode a Base64-URL encoded string into a Uint8Array.
 * @param {string} b64url
 * @returns {Uint8Array}
 */
function base64UrlDecode(b64url) {
  const base64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Import a JWK and return a CryptoKey suitable for verification.
 * Supports RS256 (RSASSA-PKCS1-v1_5 / SHA-256) and
 *         ES256 (ECDSA / P-256 / SHA-256).
 * @param {JsonWebKey} jwk
 * @returns {Promise<CryptoKey>}
 */
async function importJwk(jwk) {
  if (jwk.kty === "EC" || jwk.alg === "ES256") {
    return crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"]
    );
  }

  // Default: RSA-based (RS256)
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
}

/**
 * Verify a signature against one or more CryptoKeys.
 * @param {string}     algorithm  – 'RSASSA-PKCS1-v1_5' | 'ECDSA'
 * @param {CryptoKey}  cryptoKey
 * @param {Uint8Array} signature
 * @param {Uint8Array} data
 * @returns {Promise<boolean>}
 */
async function verifySig(algorithm, cryptoKey, signature, data) {
  const algoParams =
    algorithm === "ECDSA"
      ? { name: "ECDSA", hash: "SHA-256" }
      : { name: "RSASSA-PKCS1-v1_5" };

  return crypto.subtle.verify(algoParams, cryptoKey, signature, data);
}

// ─────────────────────────────────────────────────────────────
// JWT validation
// ─────────────────────────────────────────────────────────────

/**
 * Full Cloudflare Access JWT validation:
 *   • Structure check (3 parts)
 *   • Audience (aud) check
 *   • Expiry   (exp) check
 *   • Issuer   (iss) check
 *   • Signature verification (tries every key in the JWKS)
 *
 * @param {string} token – raw JWT string
 * @returns {Promise<{ valid: boolean, payload?: object, error?: string }>}
 */
async function verifyAccessJWT(token) {
  // 1. Split
  const parts = token.split(".");
  if (parts.length !== 3) {
    return { valid: false, error: "Malformed JWT — expected 3 parts" };
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  // 2. Decode header (to get alg / kid)
  let header;
  try {
    header = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(headerB64))
    );
  } catch {
    return { valid: false, error: "Cannot decode JWT header" };
  }

  // 3. Decode payload
  let payload;
  try {
    payload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(payloadB64))
    );
  } catch {
    return { valid: false, error: "Cannot decode JWT payload" };
  }

  // 4. Audience check
  const aud = payload.aud;
  const audMatch = Array.isArray(aud)
    ? aud.includes(CF_ACCESS_AUD)
    : aud === CF_ACCESS_AUD;

  if (!audMatch) {
    return {
      valid: false,
      error: `Audience mismatch — got: ${JSON.stringify(aud)}`,
    };
  }

  // 5. Expiry check
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === "number" && payload.exp < now) {
    return { valid: false, error: "JWT has expired" };
  }

  // 6. Issuer check
  const expectedIss = CF_ACCESS_TEAM_DOMAIN;
  if (payload.iss && payload.iss !== expectedIss) {
    return {
      valid: false,
      error: `Issuer mismatch — expected: ${expectedIss}, got: ${payload.iss}`,
    };
  }

  // 7. Signature verification
  const sigBytes = base64UrlDecode(signatureB64);
  const dataBytes = new TextEncoder().encode(`${headerB64}.${payloadB64}`);

  let keys;
  try {
    keys = await getPublicKeys();
  } catch (e) {
    return { valid: false, error: `Cannot fetch JWKs: ${e.message}` };
  }

  // Try each key (rotation-safe)
  for (const jwk of keys) {
    // If the JWT header carries a kid, only try the matching key
    if (header.kid && jwk.kid && header.kid !== jwk.kid) {
      continue;
    }

    try {
      const cryptoKey = await importJwk(jwk);
      const algoName =
        jwk.kty === "EC" || jwk.alg === "ES256"
          ? "ECDSA"
          : "RSASSA-PKCS1-v1_5";

      const ok = await verifySig(algoName, cryptoKey, sigBytes, dataBytes);
      if (ok) {
        return { valid: true, payload };
      }
    } catch {
      // Key import / verify failed — try next key
    }
  }

  return { valid: false, error: "Signature verification failed" };
}

// ─────────────────────────────────────────────────────────────
// Response helpers
// ─────────────────────────────────────────────────────────────

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

/**
 * Standard CORS headers for OPTIONS pre-flight responses.
 */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, Cf-Access-Jwt-Assertion",
  "Access-Control-Max-Age": "86400",
};

// ─────────────────────────────────────────────────────────────
// Main fetch handler
// ─────────────────────────────────────────────────────────────

export default {
  /**
   * @param {Request}         request
   * @param {{ VERCEL_URL: string }} env
   * @param {ExecutionContext} ctx
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ── CORS pre-flight ───────────────────────────────────────
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // ── Access JWT validation ─────────────────────────────────
    const bypassAuth = BYPASS_PATHS.has(url.pathname);

    if (!bypassAuth) {
      const token = request.headers.get("Cf-Access-Jwt-Assertion");

      if (!token) {
        return jsonError(
          401,
          "Cloudflare Access token missing. " +
            "Authenticate at " +
            CF_ACCESS_TEAM_DOMAIN
        );
      }

      const { valid, error } = await verifyAccessJWT(token);

      if (!valid) {
        return jsonError(
          403,
          `Cloudflare Access JWT invalid: ${error}`
        );
      }
    }

    // ── Proxy to Vercel ───────────────────────────────────────
    const vercelOrigin = (env.VERCEL_URL ?? "").replace(/\/$/, "");

    if (!vercelOrigin) {
      return jsonError(
        503,
        "VERCEL_URL is not configured. " +
          "Set it in Worker environment variables."
      );
    }

    const targetUrl = new URL(url.pathname + url.search, vercelOrigin);

    // Build forwarded headers
    const fwdHeaders = new Headers(request.headers);
    fwdHeaders.set("X-Forwarded-Host", url.hostname);
    fwdHeaders.set("X-Forwarded-Proto", "https");
    fwdHeaders.set(
      "X-Real-IP",
      request.headers.get("CF-Connecting-IP") ?? ""
    );
    // Signal to the Vercel app that traffic comes through the Worker
    fwdHeaders.set("X-Via-Cloudflare-Worker", "1");

    const proxyReq = new Request(targetUrl.toString(), {
      method: request.method,
      headers: fwdHeaders,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      redirect: "follow",
    });

    try {
      const resp = await fetch(proxyReq);

      // Pass response through, tagging it for observability
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
