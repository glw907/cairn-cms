import { afterEach, beforeEach, expect, test } from 'vitest';
import { installFakeGitHub, committedFile } from './fake-github.js';

// installFakeGitHub patches globalThis.fetch in place and is idempotent, so the patch persists for
// the process once installed. Snapshot the real fetch and restore it after each test so the pin does
// not leak the intercept into other unit files sharing the worker.
let realFetch: typeof globalThis.fetch;

beforeEach(() => {
  realFetch = globalThis.fetch;
  installFakeGitHub();
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

test('the in-memory repo round-trips a committed file through the Contents API', async () => {
  const path = 'src/content/posts/2026-06-roundtrip.md';
  const markdown = '---\ntitle: Round trip\ndate: 2026-06-20\n---\nWritten through the double.\n';

  // commitFile's PUT shape: the engine sends the content base64-encoded with the target branch, the
  // way src/lib/github/repo.ts does; the double base64-decodes it into the branch tree.
  const res = await fetch('https://api.github.com/repos/o/r/contents/' + path, {
    method: 'PUT',
    body: JSON.stringify({
      message: 'add a post',
      content: Buffer.from(markdown, 'utf-8').toString('base64'),
      branch: 'main',
      author: { name: 'Demo Editor', email: 'editor@showcase.test' },
    }),
  });
  expect(res.ok).toBe(true);

  // committedFile reads the same branch tree back, so a put is visible to a subsequent get.
  expect(committedFile('main', path)).toBe(markdown);
});
