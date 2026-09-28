// The promotion-version tripwire. Every rule that reports a consumer-facing finding at advisory
// tier for a fixed window names its own promotion release through a `*PROMOTION_VERSION`
// constant, the way `log-event-grammar.ts` and
// `stock-default-hazards.ts`'s guarded-retirement arm already do. This test reads those constants
// as source text, never through a git ref (CI checks out at depth 1), so it holds regardless of
// how the working tree got here.
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
function findPromotionConstants(): PromotionConstant[] {
  const found: PromotionConstant[] = [];
  for (const file of walk(AUDIT_DIR, (name) => name.endsWith('.ts'))) {
    const source = readFileSync(file, 'utf8');
    CONSTANT_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = CONSTANT_PATTERN.exec(source))) {
      found.push({ file: relative(ROOT, file), name: match[1], version: match[2] });
    }
  }
  return found;
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
  it('finds at least one PROMOTION_VERSION constant', () => {
    // Non-vacuity: a run that found nothing proves nothing about the promises below.
    expect(findPromotionConstants().length).toBeGreaterThan(0);
  });

  it('finds both new constants by name while the package version is below 0.99.0', () => {
    const version = packageVersion();
    if (compareVersions(version, '0.99.0') >= 0) return;
    const names = findPromotionConstants().map((constant) => constant.name);
    expect(names).toContain('RADIUS_SCALE_PROMOTION_VERSION');
    expect(names).toContain('RETIRED_PATCH_PROMOTION_VERSION');
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
