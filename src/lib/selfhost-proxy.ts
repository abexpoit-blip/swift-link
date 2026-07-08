function getBackendApiBase(request: Request): string {
  const requestOrigin = new URL(request.url).origin;
  const configured = process.env.BACKEND_SUPABASE_URL || process.env.SUPABASE_URL || process.env.API_EXTERNAL_URL || "https://api.adspx.com";
  const backend = configured.replace(/\/$/, "");

  // Same-origin browser builds use adspx.com as the public API origin. Never
  // proxy back to the same host, or auth/rest requests recurse into the app.
  if (backend === requestOrigin) return "https://api.adspx.com";
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
  const targetUrl = new URL(`${getBackendApiBase(request)}${proxiedPath(request)}`);
  const method = request.method.toUpperCase();
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