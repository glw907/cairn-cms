// The setup token chapter 3 asks for carries no D1 or R2 permission: only the build token does,
// and that one is handed to Cloudflare for builds, never called with here. So no source file may
// name a D1 or R2 API route, since a call through one would fail on a real install with a token
// the gate (which hands the tool a wider token) never exercises.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('../src/', import.meta.url));

/**
 * List every non-test source file under a directory, recursively.
 * @param {string} dir the directory to walk
 * @returns {Promise<string[]>} absolute paths of every `.mjs` file that is not a `*.test.mjs`
 */
async function sourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.mjs') && !entry.name.endsWith('.test.mjs'))
    .map((entry) => path.join(entry.parentPath, entry.name));
}

test('no source file under src names a D1 or R2 route', async () => {
  const files = await sourceFiles(SRC);
  assert.ok(files.some((file) => file.endsWith(path.join('cloudflare', 'api.mjs'))), 'the walk must reach api.mjs');

  const hits = [];
  for (const file of files) {
    const lines = (await readFile(file, 'utf8')).split('\n');
    lines.forEach((line, index) => {
      if (line.includes('/d1') || line.includes('/r2/')) {
        hits.push(`${path.relative(SRC, file)}:${index + 1}: ${line.trim()}`);
      }
    });
  }
  assert.deepEqual(hits, []);
});
