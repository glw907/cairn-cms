import { expect, test } from 'vitest';
import { createFakeR2 } from './fake-r2.js';

// The seed-then-stream path the Media Library delivery route exercises: seedObject stores a tiny
// real PNG under a key, and a full get returns an object whose body streams those bytes back. The
// PNG signature is the first eight bytes, enough to pin that real seeded bytes flow through.
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

async function readStream(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

test('a seeded object streams its bytes from a full get', async () => {
  const bucket = createFakeR2();
  const key = 'media/aa/aa00bb11cc22dd33.png';

  bucket.seedObject(key);

  const obj = await bucket.get(key);
  expect(obj).not.toBeNull();
  expect(obj?.body).toBeDefined();

  const bytes = await readStream(obj!.body!);
  expect([...bytes.subarray(0, PNG_SIGNATURE.length)]).toEqual(PNG_SIGNATURE);
});

test('an unseeded key resolves to null', async () => {
  const bucket = createFakeR2();

  expect(await bucket.get('media/zz/never-seeded.png')).toBeNull();
});
