// The promotion-version tripwire. A rule that reports a consumer-facing finding at advisory tier
// for a fixed window names its promotion release through a `*PROMOTION_VERSION` constant under
// `src/lib/audit`. This test reads those constants as source text, never through a git ref (CI
// checks out at depth 1), and fails once the package version reaches one. With no such constant
// in the tree it passes at every version, so a promoted rule leaves nothing to re-date.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { walk } from '../../../../scripts/walk-files.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUDIT_DIR = resolve(ROOT, 'src/lib/audit');
const PACKAGE_JSON = resolve(ROOT, 'package.json');

interface PromotionConstant {
  file: string;
  name: string;
  version: string;
}

const CONSTANT_PATTERN = /(\w*PROMOTION_VERSION)\s*=\s*'([^']+)'/g;

/** Every `*PROMOTION_VERSION = '<x>'` constant under `src/lib/audit`, read as plain source text. */
function constantsIn(file: string, source: string): PromotionConstant[] {
  const found: PromotionConstant[] = [];
  CONSTANT_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = CONSTANT_PATTERN.exec(source))) {
    found.push({ file, name: match[1], version: match[2] });
  }
  return found;
}

function findPromotionConstants(): PromotionConstant[] {
  return walk(AUDIT_DIR, (name) => name.endsWith('.ts')).flatMap((file) =>
    constantsIn(relative(ROOT, file), readFileSync(file, 'utf8'))
  );
}

function packageVersion(): string {
  return (JSON.parse(readFileSync(PACKAGE_JSON, 'utf8')) as { version: string }).version;
}

/**
 * Ordinary `x.y.z` comparison: negative when `a` precedes `b`, zero when equal. A prerelease
 * suffix (`0.99.0-rc.1`) is dropped, so a release candidate compares by its numeric core.
 */
function compareVersions(a: string, b: string): number {
  const partsA = a.split('-')[0].split('.').map(Number);
  const partsB = b.split('-')[0].split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** The constants whose named version the package version has reached: equal to it or below it. */
function dueConstants(constants: PromotionConstant[], version: string): PromotionConstant[] {
  return constants.filter((constant) => compareVersions(constant.version, version) <= 0);
}

function dueMessage(due: PromotionConstant[], version: string): string {
  return due
    .map(
      (constant) =>
        `${constant.file}: ${constant.name} names ${constant.version}, at or below the ` +
        `package version ${version}. Promote the finding to error and delete the constant, ` +
        'or re-date it with a disclosed changelog line.'
    )
    .join('\n');
}

const sample = (version: string): PromotionConstant => ({
  file: 'x.ts',
  name: 'SAMPLE_PROMOTION_VERSION',
  version,
});

describe('audit promotion-version tripwire', () => {
  it('reads a constant out of source text', () => {
    // Non-vacuity for the scan: the pattern finds a constant when one is written.
    expect(constantsIn('x.ts', "export const SAMPLE_PROMOTION_VERSION = '1.2.3';")).toEqual([
      sample('1.2.3'),
    ]);
  });

  it('walks at least one .ts file under the audit directory', () => {
    // An empty walk would make the live check below pass for the wrong reason.
    expect(walk(AUDIT_DIR, (name) => name.endsWith('.ts')).length).toBeGreaterThan(0);
  });

  it('holds no constant for the promoted 0.99.0 findings', () => {
    const names = findPromotionConstants().map((constant) => constant.name);
    expect(names).not.toContain('RADIUS_SCALE_PROMOTION_VERSION');
    expect(names).not.toContain('RETIRED_PATCH_PROMOTION_VERSION');
  });

  it('treats a constant above the package version as not due', () => {
    expect(dueConstants([sample('0.99.0')], '0.98.0')).toEqual([]);
  });

  it('treats a constant equal to the package version as due', () => {
    expect(dueConstants([sample('0.99.0')], '0.99.0')).toEqual([sample('0.99.0')]);
  });

  it('treats a constant below the package version as due', () => {
    expect(dueConstants([sample('0.98.0')], '0.99.0')).toEqual([sample('0.98.0')]);
  });

  it('compares a prerelease package version by its numeric core', () => {
    expect(dueConstants([sample('0.99.0')], '0.99.0-rc.1')).toEqual([sample('0.99.0')]);
    expect(dueConstants([sample('1.0.0')], '0.99.0-rc.1')).toEqual([]);
  });

  it('names the file, constant, and versions in the failure message', () => {
    expect(dueMessage([sample('0.99.0')], '0.99.0')).toContain(
      'x.ts: SAMPLE_PROMOTION_VERSION names 0.99.0, at or below the package version 0.99.0'
    );
  });

  it('fails a constant whose named version is at or below the package version', () => {
    const version = packageVersion();
    const due = dueConstants(findPromotionConstants(), version);
    if (due.length === 0) return;
    throw new Error(dueMessage(due, version));
  });
});
