import { describe, it, expect, vi, afterEach } from 'vitest';
import { log } from '../../lib/log/index.js';

afterEach(() => vi.restoreAllMocks());

describe('log', () => {
  it('writes info to console.log with the envelope and the fields', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    log.info('commit.succeeded', { id: 'x' });
    expect(spy).toHaveBeenCalledTimes(1);
    const record = spy.mock.calls[0][0] as Record<string, unknown>;
    expect(record).toMatchObject({ level: 'info', event: 'commit.succeeded', id: 'x' });
    expect(typeof record.timestamp).toBe('string');
    // The timestamp round-trips as an ISO 8601 string.
    expect(new Date(record.timestamp as string).toISOString()).toBe(record.timestamp);
  });

  it('maps warn and error to the matching console method', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    log.warn('commit.failed', { reason: 'conflict' });
    log.error('auth.link.send_failed', { error: 'boom' });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
    expect((warn.mock.calls[0][0] as Record<string, unknown>).level).toBe('warn');
    expect((error.mock.calls[0][0] as Record<string, unknown>).level).toBe('error');
  });

  it('lets the envelope keys win over a clashing field', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    log.info('commit.succeeded', { level: 'bogus', event: 'nope', timestamp: 'nope' } as Record<string, unknown>);
    const record = spy.mock.calls[0][0] as Record<string, unknown>;
    expect(record.level).toBe('info');
    expect(record.event).toBe('commit.succeeded');
    expect(record.timestamp).not.toBe('nope');
  });

  it('emits a record with no fields when none are passed', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    log.info('auth.session.destroyed');
    const record = spy.mock.calls[0][0] as Record<string, unknown>;
    expect(record).toMatchObject({ level: 'info', event: 'auth.session.destroyed' });
  });
});

describe('media events', () => {
  it('emits media.uploaded at info with the asset fields', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    log.info('media.uploaded', { editor: 'a@b.test', hash: 'abc123', bytes: 4096, ext: 'png' });
    const record = spy.mock.calls[0][0] as Record<string, unknown>;
    expect(record).toMatchObject({
      level: 'info',
      event: 'media.uploaded',
      editor: 'a@b.test',
      hash: 'abc123',
      bytes: 4096,
      ext: 'png',
    });
  });

  it('emits media.upload_failed at warn with reason and code', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    log.warn('media.upload_failed', { editor: 'a@b.test', reason: 'oversize', code: 'E_TOO_LARGE' });
    const record = spy.mock.calls[0][0] as Record<string, unknown>;
    expect(record).toMatchObject({
      level: 'warn',
      event: 'media.upload_failed',
      editor: 'a@b.test',
      reason: 'oversize',
      code: 'E_TOO_LARGE',
    });
  });

  it('emits media.upload_failed without the optional code', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    log.warn('media.upload_failed', { editor: 'a@b.test', reason: 'wrong-type' });
    const record = spy.mock.calls[0][0] as Record<string, unknown>;
    expect(record).toMatchObject({ level: 'warn', event: 'media.upload_failed', reason: 'wrong-type' });
    expect(record).not.toHaveProperty('code');
  });

  it('emits media.deleted at info with editor and hash', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    log.info('media.deleted', { editor: 'a@b.test', hash: 'abc123' });
    const record = spy.mock.calls[0][0] as Record<string, unknown>;
    expect(record).toMatchObject({
      level: 'info',
      event: 'media.deleted',
      editor: 'a@b.test',
      hash: 'abc123',
    });
  });

  it('emits media.delete_blocked at warn with foundIn as a count', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    log.warn('media.delete_blocked', { editor: 'a@b.test', hash: 'abc123', foundIn: 3 });
    const record = spy.mock.calls[0][0] as Record<string, unknown>;
    expect(record).toMatchObject({
      level: 'warn',
      event: 'media.delete_blocked',
      editor: 'a@b.test',
      hash: 'abc123',
      foundIn: 3,
    });
    expect(typeof record.foundIn).toBe('number');
  });
});
