import { describe, it, expect } from 'vitest';
import { CommitConflictError, type RepoRef } from '../../lib/github/types.js';
import type { BackendConfig } from '../../lib/content/types.js';

describe('CommitConflictError', () => {
  it('carries the path and a stable name, and is an Error', () => {
    const err = new CommitConflictError('src/content/posts/x.md');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(CommitConflictError);
    expect(err.name).toBe('CommitConflictError');
    expect(err.path).toBe('src/content/posts/x.md');
    expect(err.message).toContain('src/content/posts/x.md');
  });
});

describe('RepoRef', () => {
  it('accepts a BackendConfig wherever a RepoRef is wanted', () => {
    const backend: BackendConfig = {
      owner: 'glw907',
      repo: 'ecnordic-ski',
      branch: 'main',
      appId: '1',
      installationId: '2',
    };
    // A BackendConfig is structurally a RepoRef; this assignment must type-check.
    const ref: RepoRef = backend;
    expect(ref.owner).toBe('glw907');
  });
});
