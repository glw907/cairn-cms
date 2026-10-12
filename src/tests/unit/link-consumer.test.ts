import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { consumerPackages } from '../../../scripts/lab/link-consumer.mjs';

/** Run `consumerPackages` against a temp consumer whose `package.json` is the given object. */
function packagesFor(manifest: object): string[] {
  const dir = mkdtempSync(join(tmpdir(), 'link-consumer-test-'));
  try {
    writeFileSync(join(dir, 'package.json'), JSON.stringify(manifest));
    return consumerPackages(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('consumerPackages', () => {
  it('adds both packages for a fresh site that declares neither', () => {
    expect(packagesFor({})).toEqual(['@glw907/cairn-cms', '@glw907/cairn-cms-dev']);
  });

  it('keeps to the packages a consumer already declares', () => {
    expect(packagesFor({ dependencies: { '@glw907/cairn-cms': '^1.0.0' } })).toEqual([
      '@glw907/cairn-cms',
    ]);
  });
});
