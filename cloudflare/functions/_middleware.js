/**
 * Cloudflare Pages Middleware
 * Proxies all backend API routes to the Vercel deployment.
 *
 * Set VERCEL_URL in Cloudflare Pages dashboard:
 *   Settings → Environment variables → VERCEL_URL
 *   Example: https://ouwibo-agent.vercel.app
 */

const API_ROUTES = [
  '/chat',
  '/search',
  '/sessions',
  '/health',
  '/tools',
  '/docs',
  '/redoc',
  '/openapi.json',
  '/auth',
];

/**
 * Returns true if the request path should be proxied to Vercel.
 */
function shouldProxy(pathname) {
  return API_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/') || pathname.startsWith(route + '?')
  );
}

export async function onRequest(context) {
  const { request, env, next } = context;

  const url = new URL(request.url);

  // ── Pass static assets directly to Pages ─────────────────────
  if (!shouldProxy(url.pathname)) {
    return next();
  }

  // ── Proxy to Vercel ───────────────────────────────────────────
  const vercelUrl = (env.VERCEL_URL || '').replace(/\/$/, '');

  if (!vercelUrl) {
    return new Response(
      JSON.stringify({
        detail:
          'VERCEL_URL is not configured. ' +
          'Set it in Cloudflare Pages → Settings → Environment variables.',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Build target URL
  const target = new URL(url.pathname + url.search, vercelUrl);

  // Clone request with new URL, forward all headers
  const proxyRequest = new Request(target.toString(), {
    method: request.method,
    headers: request.headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'follow',
  });

  // Add forwarding headers
  const forwardedHeaders = new Headers(proxyRequest.headers);
  forwardedHeaders.set('X-Forwarded-Host', url.hostname);
  forwardedHeaders.set('X-Forwarded-Proto', url.protocol.replace(':', ''));
  forwardedHeaders.set('X-Real-IP', request.headers.get('CF-Connecting-IP') || '');

  const finalRequest = new Request(target.toString(), {
    method: proxyRequest.method,
    headers: forwardedHeaders,
    body: proxyRequest.body,
    redirect: 'follow',
  });

  try {
    const response = await fetch(finalRequest);

    // Re-stream response, adding CORS headers if needed
    const newHeaders = new Headers(response.headers);
    newHeaders.set('X-Proxied-By', 'Cloudflare-Pages');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ detail: `Proxy error: ${err.message}` }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
