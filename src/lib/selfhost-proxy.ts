// Explicit allowlist of hostnames we're willing to proxy to.
// Anything else (localhost, private IPs, arbitrary domains) is refused
// so a misconfigured BACKEND_SUPABASE_URL cannot become an SSRF vector.
const ALLOWED_BACKEND_HOSTS = new Set<string>([
  "api.adspx.com",
]);

const PRIVATE_HOST_RE =
  /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0|::1|fc00:|fe80:)/i;

function isBackendAllowed(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const host = u.hostname.toLowerCase();
    if (PRIVATE_HOST_RE.test(host)) return false;
    return ALLOWED_BACKEND_HOSTS.has(host);
  } catch {
    return false;
  }
}

function getBackendApiBase(request: Request): string {
  const requestOrigin = new URL(request.url).origin;
  const configured = process.env.BACKEND_SUPABASE_URL || process.env.SUPABASE_URL || process.env.API_EXTERNAL_URL || "https://api.adspx.com";
  const backend = configured.replace(/\/$/, "");

  // Same-origin browser builds use adspx.com as the public API origin. Never
  // proxy back to the same host, or auth/rest requests recurse into the app.
  if (backend === requestOrigin) return "https://api.adspx.com";
  // Fail closed: if env is misconfigured to a private/unknown host, force default.
  if (!isBackendAllowed(backend)) return "https://api.adspx.com";
  return backend;
}

function cleanRequestHeaders(request: Request): Headers {
  const headers = new Headers(request.headers);
  headers.delete("connection");
  headers.delete("content-length");
  headers.delete("host");
  headers.delete("accept-encoding");
  return headers;
}

function proxiedPath(request: Request): string {
  const url = new URL(request.url);
  return `${url.pathname}${url.search}`;
}

export async function proxySelfhostBackend(request: Request): Promise<Response> {
  const method = request.method.toUpperCase();
  const legacyStatsResponse = await handleLegacyClicksStatsProxy(request, method);
  if (legacyStatsResponse) return legacyStatsResponse;

  const targetUrl = new URL(`${getBackendApiBase(request)}${proxiedPath(request)}`);
  const hasBody = method !== "GET" && method !== "HEAD";
  // Buffer the body so Node's fetch doesn't need `duplex: 'half'`.
  // Streaming request.body directly returns 500 Internal Server Error.
  const body = hasBody ? await request.arrayBuffer() : undefined;

  const response = await fetch(targetUrl, {
    method,
    headers: cleanRequestHeaders(request),
    body,
    redirect: "manual",
  });

  const responseHeaders = new Headers(response.headers);
  responseHeaders.set("cache-control", "no-store");
  responseHeaders.set("x-adspx-backend-proxy", "selfhost");
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export function handleSelfhostBackendOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD",
      "access-control-allow-headers": "authorization,apikey,content-type,x-client-info,x-supabase-api-version,prefer",
      "access-control-max-age": "86400",
      "cache-control": "no-store",
      "x-adspx-backend-proxy": "selfhost",
    },
  });
}

function isLegacyClicksStatsRequest(url: URL, method: string): boolean {
  if (url.pathname !== "/rest/v1/clicks") return false;
  if (method !== "GET" && method !== "HEAD") return false;
  const select = decodeURIComponent(url.searchParams.get("select") || "").toLowerCase();
  return select.includes("country") && select.includes("referer_host") && select.includes("links!inner");
}

function copyStatsFilter(src: URLSearchParams, dst: URLSearchParams, key: string) {
  const value = src.get(key);
  if (value) dst.set(key, value);
}

async function handleLegacyClicksStatsProxy(request: Request, method: string): Promise<Response | null> {
  const url = new URL(request.url);
  if (!isLegacyClicksStatsRequest(url, method)) return null;

  const userFilter = url.searchParams.get("links.user_id") || url.searchParams.get("user_id");
  if (!userFilter?.startsWith("eq.")) return null;

  const rewritten = new URL(`${getBackendApiBase(request)}/rest/v1/traffic_logs`);
  rewritten.searchParams.set("select", "decision,country,referer,created_at");
  rewritten.searchParams.set("user_id", userFilter);
  copyStatsFilter(url.searchParams, rewritten.searchParams, "created_at");
  copyStatsFilter(url.searchParams, rewritten.searchParams, "limit");
  copyStatsFilter(url.searchParams, rewritten.searchParams, "offset");
  copyStatsFilter(url.searchParams, rewritten.searchParams, "order");

  const upstream = await fetch(rewritten, {
    method,
    headers: cleanRequestHeaders(request),
    redirect: "manual",
  });

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.set("cache-control", "no-store");
  responseHeaders.set("x-adspx-backend-proxy", "selfhost");
  responseHeaders.set("x-adspx-legacy-clicks-stats", "traffic_logs");
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");

  if (!upstream.ok || method === "HEAD") {
    return new Response(method === "HEAD" ? null : upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  }

  const data = await upstream.json().catch(() => []);
  const rows = Array.isArray(data)
    ? data.map((row: any) => ({
        country: row.country ?? null,
        referer_host: row.referer ?? null,
        is_bot: row.decision !== "money",
        created_at: row.created_at,
      }))
    : [];

  responseHeaders.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(rows), {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}