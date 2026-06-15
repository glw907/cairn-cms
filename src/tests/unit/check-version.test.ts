import { describe, it, expect } from 'vitest';
import { checkVersion } from '../../../scripts/check-version.mjs';

// The marker the rule reserves for a deliberate minor or major release.
const MINOR_MARK = '<!-- release-size: minor -->';
const MAJOR_MARK = '<!-- release-size: major -->';

// A two-entry changelog: a top heading at `top`, a previous heading at `prev`, with `body` text
// (markers and prose) sitting under the top heading.
function changelog(top: string, prev: string, body = '') {
  return `# Changelog\n\n## ${top}\n\n${body}\n\n## ${prev}\n\nolder notes.\n`;
}

describe('checkVersion', () => {
  it('passes a patch with no marker', () => {
    const result = checkVersion('0.56.2', changelog('0.56.2', '0.56.1', 'a refinement.'));
    expect(result).toEqual({ ok: true, bump: 'patch' });
  });

  it('fails a patch carrying a minor marker', () => {
    const result = checkVersion('0.56.2', changelog('0.56.2', '0.56.1', MINOR_MARK));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/patch/i);
  });

  it('passes a minor with the minor marker', () => {
    const result = checkVersion('0.57.0', changelog('0.57.0', '0.56.1', `new subsystem.\n${MINOR_MARK}`));
    expect(result).toEqual({ ok: true, bump: 'minor' });
  });

  it('fails a minor with no marker', () => {
    const result = checkVersion('0.57.0', changelog('0.57.0', '0.56.1', 'a minor without justification.'));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/minor/i);
  });

  it('passes a major with the major marker', () => {
    const result = checkVersion('1.0.0', changelog('1.0.0', '0.56.1', `breaking.\n${MAJOR_MARK}`));
    expect(result).toEqual({ ok: true, bump: 'major' });
  });

  it('fails when the version does not match the top heading', () => {
    const result = checkVersion('0.56.3', changelog('0.56.2', '0.56.1', 'a refinement.'));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/0\.56\.3/);
      expect(result.error).toMatch(/0\.56\.2/);
    }
  });

  it('fails when the top entry equals the previous version (none)', () => {
    const result = checkVersion('0.56.1', changelog('0.56.1', '0.56.1', 'no advance.'));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/advance|none/i);
  });

  it('passes a single-heading changelog (initial)', () => {
    const result = checkVersion('0.1.0', '# Changelog\n\n## 0.1.0\n\nfirst release.\n');
    expect(result).toEqual({ ok: true, bump: 'initial' });
  });
});
