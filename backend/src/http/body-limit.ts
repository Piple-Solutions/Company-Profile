// Streaming request-body cap. Content-Length is used only as an early reject:
// the actual bytes are always counted while reading, so omitted or forged
// length headers cannot bypass the limit. The bounded body is then replayed
// for Hono's JSON parser.
import type { Context, Next } from 'hono';
import { fail } from './errors.ts';

export const PAYLOAD_TOO_LARGE = 'Ukuran permintaan terlalu besar.';

export function requestBodyLimit(maxBytes: number) {
  return async (c: Context, next: Next) => {
    const req = c.req.raw;
    const declared = req.headers.get('content-length');
    if (declared !== null) {
      if (!/^\d+$/.test(declared) || Number(declared) > maxBytes) {
        return fail(c, 'VALIDATION_ERROR', PAYLOAD_TOO_LARGE, 413);
      }
    }
    if (!req.body) return next();

    const reader = req.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > maxBytes) {
          try { await reader.cancel(); } catch { /* already closed */ }
          return fail(c, 'VALIDATION_ERROR', PAYLOAD_TOO_LARGE, 413);
        }
        chunks.push(value);
      }
    } finally {
      try { reader.releaseLock(); } catch { /* already released */ }
    }

    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk);
        controller.close();
      },
    });
    c.req.raw = new Request(req, { body, duplex: 'half' } as RequestInit & { duplex: 'half' });
    await next();
  };
}
