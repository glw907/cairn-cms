import { describe, it, expect } from 'vitest';
import { extractMediaRefs } from '../../lib/content/media-refs.js';
import type { NamedField } from '../../lib/content/types.js';

const imageField: NamedField = { name: 'image', label: 'Hero', type: 'image' };

describe('extractMediaRefs', () => {
  it('returns the hero hash from a frontmatter image.src', () => {
    const fm = { image: { src: 'media:hello-hero.00112233445566aa', alt: 'A cairn' } };
    expect(extractMediaRefs(fm, '', [imageField])).toEqual(['00112233445566aa']);
  });

  it('returns body-image hashes from a media: image token', () => {
    const body = '![A ridge](media:ridge.aabbccddeeff0011)\n';
    expect(extractMediaRefs({}, body, [])).toEqual(['aabbccddeeff0011']);
  });

  it('returns a 3a figure inner image hash', () => {
    // A 3a :::figure wraps a real image node, so the body-image visitor catches it.
    const body = ':::figure\n![A waymark](media:waymark.1122334455667788)\n\nA caption.\n:::\n';
    expect(extractMediaRefs({}, body, [])).toEqual(['1122334455667788']);
  });

  it('dedupes an asset referenced twice in one entry', () => {
    const body = '![One](media:one.0011223344556677)\n\n![Again](media:again.0011223344556677)\n';
    expect(extractMediaRefs({}, body, [])).toEqual(['0011223344556677']);
  });

  it('keys by hash, so a bare hash and a slug.hash for the same bytes collapse to one', () => {
    const body = '![bare](media:00112233445566aa)\n\n![slugged](media:hero.00112233445566aa)\n';
    const fm = { image: { src: 'media:00112233445566aa', alt: 'A cairn' } };
    expect(extractMediaRefs(fm, body, [imageField])).toEqual(['00112233445566aa']);
  });

  it('skips a non-media image without throwing', () => {
    const body = '![remote](https://example.com/x.png)\n\n![local](/static/y.png)\n';
    expect(extractMediaRefs({}, body, [])).toEqual([]);
  });

  it('skips a malformed media token without throwing', () => {
    // A short hash and a dot-bearing slug both fail parseMediaToken and are skipped.
    const body = '![bad](media:not-a-hash)\n\n![worse](media:a.b.0011223344556677.zz)\n';
    expect(extractMediaRefs({}, body, [])).toEqual([]);
  });

  it('ignores a frontmatter image field that is absent or not an object with a string src', () => {
    expect(extractMediaRefs({}, '', [imageField])).toEqual([]);
    expect(extractMediaRefs({ image: 'media:x.0011223344556677' }, '', [imageField])).toEqual([]);
    expect(extractMediaRefs({ image: { alt: 'no src' } }, '', [imageField])).toEqual([]);
  });

  it('reads both the frontmatter hero and the body images', () => {
    const fm = { image: { src: 'media:hero.aaaaaaaaaaaaaaaa', alt: 'Hero' } };
    const body = '![inline](media:inline.bbbbbbbbbbbbbbbb)\n';
    expect(extractMediaRefs(fm, body, [imageField]).sort()).toEqual([
      'aaaaaaaaaaaaaaaa',
      'bbbbbbbbbbbbbbbb',
    ]);
  });
});
