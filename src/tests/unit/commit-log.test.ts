// commitFailure is the shared commit-catch every read-modify-commit action calls: a conflict
// answers in place with fail(409, payload), the caller's own screen shape; anything else rethrows
// unchanged, so a genuine backend fault still reaches the caller's own unexpected-failure handling.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { commitFailure, logCommitFailed } from '../../lib/sveltekit/commit-log.js';
import { CommitConflictError } from '../../lib/github/types.js';

const fields = { concept: 'posts', id: 'hi', editor: 'ed@t' };

afterEach(() => vi.restoreAllMocks());

describe('commitFailure', () => {
  it('answers a conflict in place with fail(409, payload), never a redirect', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const payload = { error: 'This file changed since you opened it.', brokenLinks: [], body: 'b' };
    const result = commitFailure(fields, new CommitConflictError('src/content/posts/hi.md'), payload);
    expect(result.status).toBe(409);
    expect(result.data).toBe(payload);
  });

  it('rethrows a non-conflict error unchanged, so an unexpected backend fault still propagates', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('GitHub is unreachable');
    expect(() => commitFailure(fields, err, { error: 'reload' })).toThrow(err);
  });
});

describe('logCommitFailed', () => {
  it('warns with a conflict reason for a conflict, without throwing', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logCommitFailed(fields, new CommitConflictError('src/content/posts/hi.md'));
    expect(warnSpy).toHaveBeenCalledOnce();
    const [record] = warnSpy.mock.calls[0] as [{ reason?: string }];
    expect(record.reason).toBe('conflict');
  });

  it('logs at error for anything else, carrying the stringified cause', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logCommitFailed(fields, new Error('GitHub is unreachable'), 'publish.failed');
    expect(errorSpy).toHaveBeenCalledOnce();
    const [record] = errorSpy.mock.calls[0] as [{ error?: string; event?: string }];
    expect(record.error).toMatch(/GitHub is unreachable/);
  });
});
