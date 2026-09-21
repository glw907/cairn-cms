// createLogger is the generic factory the /log subpath exports, and the engine's own `log`
// instance in src/lib/log/emit.ts is built from it. These tests prove the contract a consumer
// site can rely on: the record shape, the envelope-key order, and whole-key redaction, plus the
// compile-time proof that CAIRN_LOG_EVENTS and CairnLogEvent stay in lockstep.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createLogger, REDACTED_LOG_KEYS } from '../../../lib/log/create.js';
import { CAIRN_LOG_EVENTS } from '../../../lib/log/events-list.js';
import type { CairnLogEvent } from '../../../lib/log/events.js';

type TestEvent = 'widget.created' | 'widget.deleted';

describe('createLogger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('refuses an event outside its own union at compile time', () => {
    const logger = createLogger<TestEvent>();
    // @ts-expect-error an event string outside the TestEvent union must not type-check
    logger.info('not.a.member');
    expect(true).toBe(true);
  });

  it('writes info records through console.log', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = createLogger<TestEvent>();
    logger.info('widget.created');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('writes warn records through console.warn', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logger = createLogger<TestEvent>();
    logger.warn('widget.created');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('writes error records through console.error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logger = createLogger<TestEvent>();
    logger.error('widget.created');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('places level, event, and timestamp last, in that order, even when fields carries those keys', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = createLogger<TestEvent>();
    logger.info('widget.created', { level: 'bogus', event: 'bogus', timestamp: 'bogus', id: '1' });
    const record = spy.mock.calls[0][0] as Record<string, unknown>;
    const keys = Object.keys(record);
    expect(keys.slice(-3)).toEqual(['level', 'event', 'timestamp']);
    expect(record.level).toBe('info');
    expect(record.event).toBe('widget.created');
    expect(record.id).toBe('1');
  });

  it('redacts a field named token, case-insensitively', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = createLogger<TestEvent>();
    logger.info('widget.created', { Token: 'raw-value' });
    const record = spy.mock.calls[0][0] as Record<string, unknown>;
    expect(record.Token).toBe('<redacted>');
  });

  it('redacts sessionId and session_id', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = createLogger<TestEvent>();
    logger.info('widget.created', { sessionId: 'abc', session_id: 'def' });
    const record = spy.mock.calls[0][0] as Record<string, unknown>;
    expect(record.sessionId).toBe('<redacted>');
    expect(record.session_id).toBe('<redacted>');
  });

  it('leaves tokens, tokenLength, and hasSession untouched, since redaction matches a whole key only', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = createLogger<TestEvent>();
    logger.info('widget.created', { tokens: 2, tokenLength: 3, hasSession: true });
    const record = spy.mock.calls[0][0] as Record<string, unknown>;
    expect(record.tokens).toBe(2);
    expect(record.tokenLength).toBe(3);
    expect(record.hasSession).toBe(true);
  });

  it('exposes REDACTED_LOG_KEYS as the documented list, one spelling per name', () => {
    expect(REDACTED_LOG_KEYS).toEqual([
      'token',
      'secret',
      'password',
      'cookie',
      'set-cookie',
      'authorization',
      'bearer',
      'jwt',
      'session_id',
      'session_token',
      'access_token',
      'refresh_token',
      'auth_token',
      'api_key',
      'private_key',
      'client_secret',
      'webhook_secret',
      'csrf',
      'csrf_token',
    ]);
  });

  it('redacts csrf and csrf_token, both listed since whole-key normalization maps csrf_token to csrftoken', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = createLogger<TestEvent>();
    logger.info('widget.created', { csrf: 'raw', csrfToken: 'raw' });
    const record = spy.mock.calls[0][0] as Record<string, unknown>;
    expect(record.csrf).toBe('<redacted>');
    expect(record.csrfToken).toBe('<redacted>');
  });

  it('matches a key in any separator spelling, since both sides normalize', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = createLogger<TestEvent>();
    logger.info('widget.created', {
      'x-api-key': 'raw',
      apiKey: 'raw',
      'session-id': 'raw',
      SetCookie: 'raw',
      accessToken: 'raw',
    });
    const record = spy.mock.calls[0][0] as Record<string, unknown>;
    expect(record.apiKey).toBe('<redacted>');
    expect(record['session-id']).toBe('<redacted>');
    expect(record.SetCookie).toBe('<redacted>');
    expect(record.accessToken).toBe('<redacted>');
    // `x-api-key` normalizes to `xapikey`, not `apikey`, so a prefixed header name is not a match:
    // the comparison is against the whole key even after separators are stripped.
    expect(record['x-api-key']).toBe('raw');
  });

  it('redacts a secret nested one level down, inside a headers bag', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = createLogger<TestEvent>();
    logger.info('widget.created', { headers: { authorization: 'Bearer abc', accept: 'json' } });
    const record = spy.mock.calls[0][0] as Record<string, unknown>;
    expect(record.headers).toEqual({ authorization: '<redacted>', accept: 'json' });
  });

  it('redacts a secret inside an array of objects', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = createLogger<TestEvent>();
    logger.info('widget.created', { rows: [{ id: '1', token: 'abc' }] });
    const record = spy.mock.calls[0][0] as Record<string, unknown>;
    expect(record.rows).toEqual([{ id: '1', token: '<redacted>' }]);
  });

  it('leaves a key deeper than the three-level cap as written', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = createLogger<TestEvent>();
    logger.info('widget.created', { a: { b: { c: { token: 'abc' } } } });
    const record = spy.mock.calls[0][0] as Record<string, unknown>;
    // Levels one through three are walked; this token sits at level four, the documented cap.
    expect(record.a).toEqual({ b: { c: { token: 'abc' } } });
  });

  it('survives a cycle in the fields, marking the repeat rather than recursing', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = createLogger<TestEvent>();
    const node: Record<string, unknown> = { name: 'root' };
    node.self = node;
    logger.info('widget.created', { node });
    const record = spy.mock.calls[0][0] as Record<string, unknown>;
    expect(record.node).toEqual({ name: 'root', self: '<repeated>' });
  });

  it('emits a minimal envelope instead of throwing when a getter two levels down throws', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = createLogger<TestEvent>();
    // `fields.headers` is level one; the getter fires when `redactObject` reads `headers`'s own
    // enumerable properties at level two, inside the walk `buildRecord` runs on every call.
    const headers = {
      get poison(): string {
        throw new Error('boom');
      },
    };
    expect(() => logger.info('widget.created', { headers })).not.toThrow();
    const record = spy.mock.calls[0][0] as Record<string, unknown>;
    expect(record.level).toBe('info');
    expect(record.event).toBe('widget.created');
    expect(typeof record.timestamp).toBe('string');
    expect(record.fields).toBe('<unserializable>');
  });

  it('keeps an own __proto__ field in the record rather than dropping it', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = createLogger<TestEvent>();
    logger.info('widget.created', JSON.parse('{"__proto__": "posted"}') as Record<string, unknown>);
    const record = spy.mock.calls[0][0] as Record<string, unknown>;
    expect(Object.prototype.hasOwnProperty.call(record, '__proto__')).toBe(true);
    expect(Object.getOwnPropertyDescriptor(record, '__proto__')?.value).toBe('posted');
  });

  it('unions a site own redactKeys with the defaults rather than replacing them', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = createLogger<TestEvent>({ redactKeys: ['memberNumber'] });
    logger.info('widget.created', { memberNumber: '4471', token: 'abc', household: 'Alvarez' });
    const record = spy.mock.calls[0][0] as Record<string, unknown>;
    expect(record.memberNumber).toBe('<redacted>');
    expect(record.token).toBe('<redacted>');
    expect(record.household).toBe('Alvarez');
  });

  it('freezes both public arrays, so a push throws rather than corrupting the list', () => {
    expect(() => (REDACTED_LOG_KEYS as string[]).push('extra')).toThrow(TypeError);
    expect(() => (CAIRN_LOG_EVENTS as unknown as string[]).push('extra')).toThrow(TypeError);
  });

  it('lists auth.link.requested in CAIRN_LOG_EVENTS', () => {
    expect(CAIRN_LOG_EVENTS).toContain('auth.link.requested');
  });

  it('keeps CairnLogEvent and CAIRN_LOG_EVENTS in lockstep at compile time', () => {
    // The type-level assertion in events-list.ts fails `npm run check` if a member is added to
    // either side without the other; this runtime check proves the array is non-empty and
    // assignable to the union at the value level too.
    const sample: CairnLogEvent = CAIRN_LOG_EVENTS[0];
    expect(typeof sample).toBe('string');
    expect(CAIRN_LOG_EVENTS.length).toBeGreaterThan(0);
  });
});
