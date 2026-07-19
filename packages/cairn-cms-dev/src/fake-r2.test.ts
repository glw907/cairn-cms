import { expect, test } from 'vitest';
import { createFakeR2 } from './fake-r2.js';

// The seed-then-stream path the Media Library delivery route exercises: seedObject stores a valid
// PNG under a key, and a full get returns an object whose body streams those bytes back. The
// PNG signature is the first eight bytes, enough to pin that real seeded bytes flow through.
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** One PNG chunk as read off the wire: its four-letter type and its data payload. */
interface PngChunk {
  type: string;
  data: Uint8Array;
}

/**
 * Walk a PNG's chunk stream after the eight-byte signature. Each chunk is a big-endian length, a
 * four-byte ASCII type, the data, then a four-byte CRC this reader does not verify (a browser's own
 * decoder is the structural authority; this test only proves the seeded bytes are shaped like a PNG).
 */
function readChunks(bytes: Uint8Array): PngChunk[] {
  const chunks: PngChunk[] = [];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 8;
  while (offset < bytes.length) {
    const length = view.getUint32(offset, false);
    const type = new TextDecoder('ascii').decode(bytes.subarray(offset + 4, offset + 8));
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    chunks.push({ type, data });
    offset += 8 + length + 4;
  }
  return chunks;
}

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

test('every seeded object is a structurally valid PNG with a distinct color per key', async () => {
  const bucket = createFakeR2();
  const keys = [
    'media/aa/aa00bb11cc22dd33.png',
    'media/11/1111222233334444.png',
    'media/55/5555666677778888.png',
  ];
  for (const key of keys) bucket.seedObject(key);

  const bodies = await Promise.all(
    keys.map(async (key) => {
      const obj = await bucket.get(key);
      return readStream(obj!.body!);
    }),
  );

  for (const bytes of bodies) {
    expect([...bytes.subarray(0, PNG_SIGNATURE.length)]).toEqual(PNG_SIGNATURE);

    const chunks = readChunks(bytes);
    expect(chunks[0]?.type).toBe('IHDR');
    expect(chunks[0]?.data.length).toBe(13);
    expect(chunks.some((c) => c.type === 'IDAT')).toBe(true);
    expect(chunks.at(-1)?.type).toBe('IEND');
  }

  // Distinct keys read as distinct colors: the raw bytes differ, not just the key-derived etag.
  expect(bodies[0]).not.toEqual(bodies[1]);
  expect(bodies[1]).not.toEqual(bodies[2]);
  expect(bodies[0]).not.toEqual(bodies[2]);
});
