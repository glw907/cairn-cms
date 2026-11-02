import { describe, it, expect } from 'vitest';
import { normalizeMedia, MAX_UPLOAD_BYTES, ALLOWED_TYPES } from '../../lib/media/config.js';
import type { MediaConfig } from '../../lib/content/types.js';

describe('normalizeMedia', () => {
  it('carries the bucket binding and nothing else', () => {
    expect(normalizeMedia({ bucketBinding: 'MEDIA_BUCKET' })).toEqual({
      enabled: true,
      bucketBinding: 'MEDIA_BUCKET',
    });
  });

  it('throws cairn: for a present block missing bucketBinding', () => {
    expect(() => normalizeMedia({} as MediaConfig)).toThrow(/cairn:/);
  });

  it('returns disabled media when no media block is declared', () => {
    expect(normalizeMedia(undefined)).toEqual({ enabled: false });
  });

  it('fixes the upload cap at 25 MB and the stored types at the five web image types', () => {
    expect(MAX_UPLOAD_BYTES).toBe(25 * 1024 * 1024);
    expect(ALLOWED_TYPES).toEqual(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);
  });
});
