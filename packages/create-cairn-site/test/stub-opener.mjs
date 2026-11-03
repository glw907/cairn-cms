// A directory of stand-in browser openers for a test that runs bin.mjs as a child process. It goes
// first on the child's PATH so the tool's openBrowser never reaches a real xdg-open, and each
// stand-in records its arguments so a test can assert what would have been opened.
import { mkdtemp, rm, writeFile, readFile, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const STAND_IN = '#!/bin/sh\nprintf \'%s\\n\' "$*" >> "$(dirname "$0")/opened.log"\nexit 0\n';

/**
 * Create the stub opener directory and register its cleanup.
 * @param {import('node:test').TestContext} t the running test's context
 * @returns {Promise<{ dir: string, opened: () => Promise<string[]> }>} the directory to put first on PATH, and a reader for the lines the stand-ins recorded
 */
export async function makeStubOpenerDir(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'xdg-stub-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  for (const name of ['xdg-open', 'open', 'cmd']) {
    const file = path.join(dir, name);
    await writeFile(file, STAND_IN);
    await chmod(file, 0o755);
  }
  return {
    dir,
    async opened() {
      const text = await readFile(path.join(dir, 'opened.log'), 'utf8').catch(() => '');
      return text.split('\n').filter(Boolean);
    },
  };
}
