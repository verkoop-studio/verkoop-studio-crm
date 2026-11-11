// Response security headers for every CRM request.
//
// `frame-ancestors`/`X-Frame-Options` are the load-bearing part: without them
// /oauth/consent can be framed by a hostile page and clickjacked into granting
// an OAuth client full lead access.
//
// `script-src` still carries 'unsafe-inline' because Start injects inline
// bootstrap and hydration scripts. Moving those to a per-request nonce is a
// follow-up; until then CSP is defence in depth here, not an XSS boundary.

function supabaseConnectSources() {
  const configured = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"] || "";
  if (!configured) return [];
  try {
    const url = new URL(configured);
    // Realtime uses a WebSocket on the same host.
    return [url.origin, `wss://${url.host}`];
  } catch {
    return [];
  }
}

export function contentSecurityPolicy() {
  const connect = ["'self'", ...supabaseConnectSources()].join(" ");
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self' https://fonts.gstatic.com data:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "script-src 'self' 'unsafe-inline'",
    `connect-src ${connect}`,
    "upgrade-insecure-requests",
  ].join("; ");
}

export function securityHeaders(): Record<string, string> {
  return {
    "content-security-policy": contentSecurityPolicy(),
    // Browsers ignore HSTS over plain http, so it is safe to send in dev too.
    "strict-transport-security": "max-age=31536000; includeSubDomains",
    "x-frame-options": "DENY",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
    // allow-popups keeps redirect/popup OAuth flows working.
    "cross-origin-opener-policy": "same-origin-allow-popups",
  };
}
