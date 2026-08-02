import { describe, it, expect, vi, afterEach } from 'vitest';
import { verifyTurnstile } from '../../lib/cloudflare/turnstile.js';

const ENDPOINT = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('verifyTurnstile', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns true on a success: true body', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ success: true })));
    expect(await verifyTurnstile('tok', 'sec')).toBe(true);
  });

  it('returns false on a routine success: false body (invalid-input-response) and logs nothing', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({ success: false, 'error-codes': ['invalid-input-response'] }),
      ),
    );
    expect(await verifyTurnstile('tok', 'sec')).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it('returns false on a routine success: false body (timeout-or-duplicate) and logs nothing', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ success: false, 'error-codes': ['timeout-or-duplicate'] })),
    );
    expect(await verifyTurnstile('tok', 'sec')).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it('returns false on a bare success: false body with no error-codes and logs nothing', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ success: false })));
    expect(await verifyTurnstile('tok', 'sec')).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it('logs turnstile.verify_failed with reason rejected on a configuration error code', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({ success: false, 'error-codes': ['invalid-input-secret'] }),
      ),
    );
    expect(await verifyTurnstile('tok', 'sec')).toBe(false);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'turnstile.verify_failed',
        reason: 'rejected',
        codes: ['invalid-input-secret'],
      }),
    );
  });

  it('returns false on a success value that is not a boolean (a spoofed truthy body)', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ success: 'false' })));
    expect(await verifyTurnstile('tok', 'sec')).toBe(false);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'turnstile.verify_failed', reason: 'unparseable' }),
    );
  });

  it('fails closed on a non-200 response even when the body says success: true', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ success: true }, 500)));
    expect(await verifyTurnstile('tok', 'sec')).toBe(false);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'turnstile.verify_failed', reason: 'bad_status' }),
    );
  });

  it('returns false when the body is not JSON', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => new Response('not json', { status: 200 })));
    expect(await verifyTurnstile('tok', 'sec')).toBe(false);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'turnstile.verify_failed', reason: 'unparseable' }),
    );
  });

  it('returns false when the body is JSON but not an object', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse('a bare string')));
    expect(await verifyTurnstile('tok', 'sec')).toBe(false);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'turnstile.verify_failed', reason: 'unparseable' }),
    );
  });

  it('returns false, never throwing, when fetch rejects', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }),
    );
    await expect(verifyTurnstile('tok', 'sec')).resolves.toBe(false);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'turnstile.verify_failed', reason: 'request_failed' }),
    );
  });

  it('returns false, never throwing, when fetch rejects with an abort (a hung request timing out)', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new DOMException('The operation timed out.', 'TimeoutError');
      }),
    );
    await expect(verifyTurnstile('tok', 'sec')).resolves.toBe(false);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'turnstile.verify_failed', reason: 'request_failed' }),
    );
  });

  it('drives the fetch with an abort signal, so a hung request cannot hang forever', async () => {
    let capturedInit: RequestInit | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
        capturedInit = init;
        return jsonResponse({ success: true });
      }),
    );
    await verifyTurnstile('tok', 'sec');
    expect(capturedInit?.signal).toBeInstanceOf(AbortSignal);
  });

  it('returns false without calling fetch for a blank token', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await verifyTurnstile('', 'sec')).toBe(false);
    expect(await verifyTurnstile('   ', 'sec')).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns false without calling fetch for a blank secret', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await verifyTurnstile('tok', '')).toBe(false);
    expect(await verifyTurnstile('tok', '   ')).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns false without calling fetch for a null token, the shape a widget that never rendered supplies', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await verifyTurnstile(null as any, 'sec')).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns false without calling fetch for a token past the 2048-character Turnstile maximum', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await verifyTurnstile('a'.repeat(2049), 'sec')).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('calls fetch for a token at exactly the 2048-character maximum', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ success: true })));
    expect(await verifyTurnstile('a'.repeat(2048), 'sec')).toBe(true);
  });

  it('posts form-urlencoded to the siteverify endpoint, omitting an unsupplied remoteip', async () => {
    let capturedUrl: string | undefined;
    let capturedInit: RequestInit | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        capturedUrl = String(input);
        capturedInit = init;
        return jsonResponse({ success: true });
      }),
    );
    await verifyTurnstile('tok', 'sec');
    expect(capturedUrl).toBe(ENDPOINT);
    expect(capturedInit?.method).toBe('POST');
    expect(capturedInit?.headers).toMatchObject({
      'content-type': 'application/x-www-form-urlencoded',
    });
    const params = new URLSearchParams(capturedInit?.body as string);
    expect(params.get('secret')).toBe('sec');
    expect(params.get('response')).toBe('tok');
    expect(params.has('remoteip')).toBe(false);
    expect(capturedInit?.redirect).toBe('manual');
  });

  it('carries remoteip only when opts.ip is supplied', async () => {
    let capturedInit: RequestInit | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
        capturedInit = init;
        return jsonResponse({ success: true });
      }),
    );
    await verifyTurnstile('tok', 'sec', { ip: '203.0.113.7' });
    const params = new URLSearchParams(capturedInit?.body as string);
    expect(params.get('remoteip')).toBe('203.0.113.7');
  });

  describe('hostname narrowing', () => {
    it('returns false when opts.hostname differs from the response hostname', async () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => jsonResponse({ success: true, hostname: 'other.example' })),
      );
      expect(await verifyTurnstile('tok', 'sec', { hostname: 'site.example' })).toBe(false);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'turnstile.verify_failed', reason: 'hostname_mismatch' }),
      );
    });

    it('returns true when opts.hostname matches the response hostname', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => jsonResponse({ success: true, hostname: 'site.example' })),
      );
      expect(await verifyTurnstile('tok', 'sec', { hostname: 'site.example' })).toBe(true);
    });

    it('returns true when opts.hostname and the response hostname differ only by case', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => jsonResponse({ success: true, hostname: 'Site.Example' })),
      );
      expect(await verifyTurnstile('tok', 'sec', { hostname: 'site.example' })).toBe(true);
    });
  });

  describe('action narrowing', () => {
    it('returns false when opts.action differs from the response action', async () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ success: true, action: 'other' })));
      expect(await verifyTurnstile('tok', 'sec', { action: 'signup' })).toBe(false);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'turnstile.verify_failed', reason: 'action_mismatch' }),
      );
    });

    it('returns true when opts.action matches the response action', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ success: true, action: 'signup' })));
      expect(await verifyTurnstile('tok', 'sec', { action: 'signup' })).toBe(true);
    });
  });

  it('returns true when neither hostname nor action is supplied, whatever the response carries', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ success: true, hostname: 'anything', action: 'anything' })),
    );
    expect(await verifyTurnstile('tok', 'sec')).toBe(true);
  });

  it('never logs the secret, and on a mismatch logs no response field beyond hostname/action', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          success: true,
          hostname: 'other.example',
          challenge_ts: '2026-08-01T00:00:00Z',
        }),
      ),
    );
    await verifyTurnstile('tok', 'this-is-the-secret-value', { hostname: 'site.example' });
    expect(spy).toHaveBeenCalled();
    const allowedFields = new Set(['level', 'event', 'timestamp', 'reason', 'expected', 'actual']);
    for (const call of spy.mock.calls) {
      const [record] = call as [Record<string, unknown>];
      for (const field of Object.keys(record)) {
        expect(allowedFields.has(field)).toBe(true);
      }
      const serialized = JSON.stringify(call);
      expect(serialized).not.toContain('this-is-the-secret-value');
      expect(serialized).not.toContain('challenge_ts');
    }
  });
});
