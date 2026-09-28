// cairn-cms: check-dev-package.mjs is the gate that reads packages/cairn-cms-dev/package.json,
// so the version-match rule (the cairn-release skill has no step enforcing that the root
// package.json and the dev-package manifest carry the same version) lives here rather than in
// check-version.mjs, which never reads the dev-package manifest at all. This test drives the
// pure comparison function directly.
import { describe, it, expect } from 'vitest';
import { checkVersionMatch } from '../../../scripts/checks/check-dev-package.mjs';

describe('checkVersionMatch', () => {
  it('fails a planted mismatch and names both versions', () => {
    const result = checkVersionMatch('0.97.0', '0.96.0');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/0\.97\.0/);
      expect(result.error).toMatch(/0\.96\.0/);
    }
  });

  it('passes when the two versions are equal', () => {
    expect(checkVersionMatch('0.97.0', '0.97.0')).toEqual({ ok: true });
  });
});
