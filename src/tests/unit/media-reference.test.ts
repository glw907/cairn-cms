import { describe, it, expect } from 'vitest';
import { parseMediaToken, mediaToken } from '../../lib/media/reference.js';

const HASH = 'a1b2c3d4e5f6a7b8';

describe('parseMediaToken', () => {
  it('round-trips a slug.hash token', () => {
    const ref = parseMediaToken(`media:blue-running-shoes.${HASH}`);
    expect(ref).toEqual({ slug: 'blue-running-shoes', hash: HASH });
    expect(mediaToken(ref!)).toBe(`media:blue-running-shoes.${HASH}`);
  });
  it('parses and round-trips the bare hash form to a null slug', () => {
    const ref = parseMediaToken(`media:${HASH}`);
    expect(ref).toEqual({ slug: null, hash: HASH });
    expect(mediaToken(ref!)).toBe(`media:${HASH}`);
  });
  it('keeps a hyphenated slug', () => {
    expect(parseMediaToken(`media:blue-running-shoes.${HASH}`)).toEqual({
      slug: 'blue-running-shoes',
      hash: HASH,
    });
  });
  it('returns null for a non-media href', () => {
    expect(parseMediaToken('cairn:posts/foo')).toBeNull();
    expect(parseMediaToken('https://example.com/x.png')).toBeNull();
  });
  it('returns null for a malformed token', () => {
    expect(parseMediaToken('media:a1b2c3d4e5f6a7b')).toBeNull(); // 15-hex hash
    expect(parseMediaToken('media:a1b2c3d4e5f6a7b8c')).toBeNull(); // 17-hex hash
    expect(parseMediaToken('media:a1b2c3d4e5f6a7bg')).toBeNull(); // non-hex hash
    expect(parseMediaToken(`media:${HASH.toUpperCase()}`)).toBeNull(); // uppercase hash
    expect(parseMediaToken('media:')).toBeNull(); // empty token
  });
  it('rejects a slug carrying a dot', () => {
    expect(parseMediaToken(`media:foo.bar.${HASH}`)).toBeNull();
  });
});

describe('mediaToken', () => {
  it('writes the slug.hash form', () => {
    expect(mediaToken({ slug: 'blue-running-shoes', hash: HASH })).toBe(
      `media:blue-running-shoes.${HASH}`,
    );
  });
  it('writes the bare hash form for a null slug', () => {
    expect(mediaToken({ slug: null, hash: HASH })).toBe(`media:${HASH}`);
  });
});
