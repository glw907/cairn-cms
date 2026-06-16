import { describe, it, expect } from 'vitest';
import {
  uploadOutcome,
  type UploadOutcome,
} from '../../lib/components/media-upload-outcome.js';
import type { MediaEntry } from '../../lib/media/manifest.js';
import type { UploadResult } from '../../lib/sveltekit/content-routes.js';

function record(overrides: Partial<MediaEntry> = {}): MediaEntry {
  return {
    hash: '0123456789abcdef',
    sha256: 'f'.repeat(64),
    slug: 'blue-shoes',
    displayName: 'Blue shoes',
    originalFilename: 'blue-shoes.png',
    alt: 'Blue running shoes',
    ext: 'webp',
    contentType: 'image/webp',
    bytes: 1234,
    width: 800,
    height: 600,
    createdAt: '2026-06-16T00:00:00.000Z',
    ...overrides,
  };
}

function result(overrides: Partial<UploadResult> = {}): UploadResult {
  return {
    reference: 'media:blue-shoes.0123456789abcdef',
    record: record(),
    reused: false,
    mismatch: false,
    ...overrides,
  };
}

describe('uploadOutcome from a success envelope', () => {
  it('yields an inserted outcome carrying the reference and the record', () => {
    const out: UploadOutcome = uploadOutcome({
      type: 'success',
      status: 200,
      data: result(),
    });
    expect(out.kind).toBe('inserted');
    if (out.kind !== 'inserted') throw new Error('expected inserted');
    expect(out.reference).toBe('media:blue-shoes.0123456789abcdef');
    expect(out.record.hash).toBe('0123456789abcdef');
    expect(out.reused).toBe(false);
  });

  it('flags a dedup reuse with reused true', () => {
    const out = uploadOutcome({
      type: 'success',
      status: 200,
      data: result({ reused: true }),
    });
    expect(out.kind).toBe('inserted');
    if (out.kind !== 'inserted') throw new Error('expected inserted');
    expect(out.reused).toBe(true);
  });
});

describe('uploadOutcome from a failure envelope', () => {
  it('maps too-large to the too-large failure kind', () => {
    const out = uploadOutcome({ type: 'failure', status: 413, data: { error: 'too-large' } });
    expect(out.kind).toBe('failed');
    if (out.kind !== 'failed') throw new Error('expected failed');
    expect(out.failure).toBe('too-large');
  });

  it('maps unsupported-type to the decode-unsupported failure kind', () => {
    const out = uploadOutcome({
      type: 'failure',
      status: 415,
      data: { error: 'unsupported-type' },
    });
    expect(out.kind).toBe('failed');
    if (out.kind !== 'failed') throw new Error('expected failed');
    expect(out.failure).toBe('decode-unsupported');
  });

  it('maps session-expired to a session-expired outcome', () => {
    const out = uploadOutcome({
      type: 'failure',
      status: 401,
      data: { error: 'session-expired' },
    });
    expect(out.kind).toBe('session-expired');
  });

  it('maps an unrecognized refuse reason to a generic failure', () => {
    const out = uploadOutcome({
      type: 'failure',
      status: 503,
      data: { error: 'binding-missing' },
    });
    expect(out.kind).toBe('failed');
    if (out.kind !== 'failed') throw new Error('expected failed');
    expect(out.failure).toBe('generic');
  });

  it('treats a missing error field as a generic failure', () => {
    const out = uploadOutcome({ type: 'failure', status: 500, data: undefined });
    expect(out.kind).toBe('failed');
    if (out.kind !== 'failed') throw new Error('expected failed');
    expect(out.failure).toBe('generic');
  });
});

describe('uploadOutcome from a redirect (expired session)', () => {
  it('treats an opaqueredirect response as session-expired', () => {
    expect(uploadOutcome({ type: 'opaqueredirect', status: 0 }).kind).toBe('session-expired');
  });

  it('treats a status-0 response as session-expired', () => {
    expect(uploadOutcome({ type: 'error', status: 0 }).kind).toBe('session-expired');
  });
});

describe('uploadOutcome from an unexpected envelope', () => {
  it('treats a redirect-typed action result as session-expired', () => {
    expect(uploadOutcome({ type: 'redirect', status: 303 }).kind).toBe('session-expired');
  });

  it('treats an error-typed action result with a non-zero status as a generic failure', () => {
    const out = uploadOutcome({ type: 'error', status: 500 });
    expect(out.kind).toBe('failed');
    if (out.kind !== 'failed') throw new Error('expected failed');
    expect(out.failure).toBe('generic');
  });
});
