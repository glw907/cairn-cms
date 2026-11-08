import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { packEngineTemplate } from './pack-engine-template.mjs';
import { parsePackFilePaths } from '../checks/check-package-files.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('the engine tarball lists the template catalog and the composed Waymark tree', async () => {
  await packEngineTemplate();
  const stdout = execFileSync('npm', ['pack', '--ignore-scripts', '--dry-run', '--json'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  const packed = new Set(parsePackFilePaths(stdout));
  for (const required of ['template/catalog.json', 'template/waymark/gitignore', 'template/waymark/.dev.vars.example']) {
    assert.ok(packed.has(required), `the packed tarball is missing ${required}`);
  }
  assert.ok(!packed.has('template/waymark/.gitignore'));
  const lines = readFileSync(path.join(root, 'template/waymark/gitignore'), 'utf8').split('\n');
  assert.ok(lines.includes('!.dev.vars.example'), 'template/waymark/gitignore lacks !.dev.vars.example');
});
