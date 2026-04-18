// Permissive CORS for the extension origin (chrome-extension://<id>) and any
// workers.dev subdomain. The API is anonymous for v1; JWT verification lands
// in v1.1.

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Max-Age': '86400',
};

export const withCors = (response: Response): Response => {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

export const corsPreflight = (): Response =>
  new Response(null, { status: 204, headers: CORS_HEADERS });

export const jsonResponse = (body: unknown, status = 200): Response =>
  withCors(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    }),
  );

export const errorResponse = (message: string, status: number): Response =>
  jsonResponse({ error: message }, status);
