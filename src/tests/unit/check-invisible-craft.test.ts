import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { CSS_FILES, SCAN_SCOPE } from '../../../scripts/check-invisible-craft.mjs';

// The rule fixtures for motion-band, gap-scale, and token-colors (the three rules this gate
// graduated into) already carry their own exhaustive behavioral coverage under
// src/tests/unit/audit/rules/, and the wrapper's shared report restriction is pinned at
// src/tests/unit/audit-gate.test.ts. What is specific to this gate is the ground it walks: a gate
// that runs the right rules over less ground than it used to is still a coverage regression, and
// this one silently stopped walking the showcase when it inherited the engine's consumer-shaped
// default scope.
describe('SCAN_SCOPE', () => {
  it('keeps walking the showcase roots the pre-graduation gate walked', () => {
    expect(SCAN_SCOPE).toContain('examples/showcase/src/chassis');
    expect(SCAN_SCOPE).toContain('examples/showcase/src/routes');
    expect(SCAN_SCOPE).toContain('examples/showcase/src/theme');
  });

  it('keeps walking the admin surfaces', () => {
    expect(SCAN_SCOPE).toContain('src/lib/components');
    expect(SCAN_SCOPE).toContain('src/lib/admin-toolkit');
  });

  it('names only directories the tree actually has, so a rename fails loudly', () => {
    for (const dir of SCAN_SCOPE) {
      expect(existsSync(resolve(process.cwd(), dir)), dir).toBe(true);
    }
  });
});

// The declared-palette-site concept (config.ts's paletteCssFiles) only protects a file this gate
// actually names as a consumer CSS file; a rename here that CSS_FILES does not track would go
// back to being unscanned entirely, the same silent narrowing SCAN_SCOPE guards against above.
describe('CSS_FILES', () => {
  it('names the showcase theme\'s own palette declaration site', () => {
    expect(CSS_FILES).toContain('examples/showcase/src/theme/theme.css');
  });

  it('names only files the tree actually has, so a rename fails loudly', () => {
    for (const file of CSS_FILES) {
      expect(existsSync(resolve(process.cwd(), file)), file).toBe(true);
    }
  });
});
