import { describe, it, expect } from 'vitest';
import { CommitConflictError, type RepoRef } from '../../lib/github/types.js';

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
  it('accepts a GitHub App config wherever a RepoRef is wanted', () => {
    const config = {
      owner: 'glw907',
      repo: 'ecnordic-ski',
      branch: 'main',
      appId: '1',
      installationId: '2',
    };
    // The App config is structurally a RepoRef; this assignment must type-check.
    const ref: RepoRef = config;
    expect(ref.owner).toBe('glw907');
  });
});
