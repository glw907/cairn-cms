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

/** Ordinary `x.y.z` comparison: negative when `a` precedes `b`, zero when equal. */
function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

describe('audit promotion-version tripwire', () => {
  it('reads a constant out of source text', () => {
    // Non-vacuity for the scan: the pattern finds a constant when one is written.
    expect(constantsIn('x.ts', "export const SAMPLE_PROMOTION_VERSION = '1.2.3';")).toEqual([
      { file: 'x.ts', name: 'SAMPLE_PROMOTION_VERSION', version: '1.2.3' },
    ]);
  });

  it('holds no constant for the promoted 0.99.0 findings', () => {
    const names = findPromotionConstants().map((constant) => constant.name);
    expect(names).not.toContain('RADIUS_SCALE_PROMOTION_VERSION');
    expect(names).not.toContain('RETIRED_PATCH_PROMOTION_VERSION');
  });

  it('fails a constant whose named version is at or below the package version', () => {
    const version = packageVersion();
    const due = findPromotionConstants().filter(
      (constant) => compareVersions(constant.version, version) <= 0
    );
    if (due.length === 0) return;
    const message = due
      .map(
        (constant) =>
          `${constant.file}: ${constant.name} names ${constant.version}, at or below the ` +
          `package version ${version}. Promote the finding to error and delete the constant, ` +
          'or re-date it with a disclosed changelog line.'
      )
      .join('\n');
    throw new Error(message);
  });
});
