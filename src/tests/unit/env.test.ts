import { describe, it, expect } from 'vitest';
import type { D1Database } from '@cloudflare/workers-types';
import { requireOrigin, requireDb, requireBucket } from '../../lib/env.js';
import { CairnError } from '../../lib/diagnostics/index.js';

describe('requireOrigin', () => {
  it('returns the configured origin', () => {
    expect(requireOrigin({ PUBLIC_ORIGIN: 'https://ecnordic.ski' })).toBe('https://ecnordic.ski');
  });

  it('throws when the origin is unset', () => {
    expect(() => requireOrigin({})).toThrow(/PUBLIC_ORIGIN/);
  });

  it('throws when the origin is empty', () => {
    expect(() => requireOrigin({ PUBLIC_ORIGIN: '' })).toThrow(/PUBLIC_ORIGIN/);
  });

  it('allows http on localhost for dev', () => {
    expect(requireOrigin({ PUBLIC_ORIGIN: 'http://localhost:5173' })).toBe('http://localhost:5173');
  });

  it('throws on a non-https origin that is not local', () => {
    expect(() => requireOrigin({ PUBLIC_ORIGIN: 'http://ecnordic.ski' })).toThrow(/https/);
  });

  it('rejects a lookalike localhost host', () => {
    expect(() => requireOrigin({ PUBLIC_ORIGIN: 'http://localhost.evil.com' })).toThrow(/https/);
  });

  it('names the public-origin condition on each of the three faults', () => {
    const faults: { PUBLIC_ORIGIN?: string }[] = [
      {},
      { PUBLIC_ORIGIN: 'not a url' },
      { PUBLIC_ORIGIN: 'http://ecnordic.ski' },
    ];
    for (const env of faults) {
      let thrown: unknown;
      try {
        requireOrigin(env);
      } catch (err) {
        thrown = err;
      }
      expect(thrown, JSON.stringify(env)).toBeInstanceOf(CairnError);
      expect((thrown as CairnError).conditionId).toBe('config.public-origin-invalid');
    }
  });
});

describe('requireDb', () => {
  it('returns the configured binding', () => {
    const db = {} as D1Database;
    expect(requireDb({ AUTH_DB: db })).toBe(db);
  });

  it('throws when the binding is missing', () => {
    expect(() => requireDb({})).toThrow(/AUTH_DB/);
  });

  it('names the registered bindings condition on the missing-binding throw', () => {
    let thrown: unknown;
    try {
      requireDb({});
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(CairnError);
    expect((thrown as CairnError).conditionId).toBe('config.bindings-missing');
  });
});

describe('requireBucket', () => {
  it('returns the binding when it carries a callable get', () => {
    const bucket = { get() {} };
    expect(requireBucket({ MEDIA_BUCKET: bucket }, 'MEDIA_BUCKET')).toBe(bucket as never);
  });

  it('throws config.bindings-missing when the binding is absent', () => {
    let thrown: unknown;
    try {
      requireBucket({}, 'MEDIA_BUCKET');
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(CairnError);
    expect((thrown as CairnError).conditionId).toBe('config.bindings-missing');
  });

  it('throws config.bindings-missing for a wrong-type binding (a string var, a KV namespace)', () => {
    // A truthy non-R2 value: a string env var or a KV namespace (which has no `get` in this shape).
    const wrongValues: unknown[] = ['some-string', { put() {}, list() {} }, 42, true];
    for (const value of wrongValues) {
      let thrown: unknown;
      try {
        requireBucket({ MEDIA_BUCKET: value }, 'MEDIA_BUCKET');
      } catch (err) {
        thrown = err;
      }
      expect(thrown, JSON.stringify(value)).toBeInstanceOf(CairnError);
      expect((thrown as CairnError).conditionId).toBe('config.bindings-missing');
    }
  });
});
