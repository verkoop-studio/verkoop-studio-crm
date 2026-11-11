// Request limits for the /mcp transport.
//
// The streamable HTTP transport hands the whole request to the JSON-RPC layer
// without bounding its size or a batch's length, so one oversized or
// deeply-batched POST from any seat holder can exhaust the server process for
// every company on the instance. These caps run before the transport sees it.

export const MAX_MCP_BODY_BYTES = 256 * 1024;
export const MAX_MCP_BATCH = 20;

const tooLarge = () =>
  Response.json(
    { jsonrpc: "2.0", id: null, error: { code: -32600, message: "Request too large" } },
    { status: 413 },
  );

const malformed = () =>
  Response.json(
    { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
    { status: 400 },
  );

// Reads at most `max` bytes. Returns null once the body exceeds that, so a
// chunked request with no content-length cannot read unbounded.
async function readBounded(body: ReadableStream<Uint8Array>, max: number) {
  const reader = body.getReader();
  const chunks: Array<Uint8Array> = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > max) return null;
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const joined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(joined);
}

/**
 * Returns a replayable Request to hand to the transport, or a Response to send
 * back instead when the request breaches a limit.
 */
export async function limitMcpRequest(request: Request): Promise<Request | Response> {
  if (request.method !== "POST" || !request.body) return request;

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > MAX_MCP_BODY_BYTES) return tooLarge();

  const text = await readBounded(request.body, MAX_MCP_BODY_BYTES);
  if (text === null) return tooLarge();

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return malformed();
  }
  if (Array.isArray(parsed) && parsed.length > MAX_MCP_BATCH) return tooLarge();

  // The body is consumed; rebuild so the transport can read it.
  return new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: text,
  });
}
