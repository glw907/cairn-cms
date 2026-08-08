import { describe, it, expect } from 'vitest';
import { checkVersion, compareVersions } from '../../../scripts/checks/check-version.mjs';

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

// A three-entry changelog, for the prerelease cases: `top`, then `mid`, then `prev`.
function changelog3(top: string, mid: string, prev: string, body = '') {
  return `# Changelog\n\n## ${top}\n\n${body}\n\n## ${mid}\n\nnotes.\n\n## ${prev}\n\nolder notes.\n`;
}

describe('compareVersions', () => {
  it('orders by numeric core first', () => {
    expect(compareVersions('0.94.0', '0.93.0')).toBeGreaterThan(0);
    expect(compareVersions('0.93.9', '1.0.0')).toBeLessThan(0);
    expect(compareVersions('0.93.0', '0.93.0')).toBe(0);
  });

  it('ranks a prerelease below the release it leads to', () => {
    expect(compareVersions('0.94.0-rc.1', '0.94.0')).toBeLessThan(0);
    expect(compareVersions('0.94.0', '0.94.0-rc.1')).toBeGreaterThan(0);
    // Still above the previous stable, which is what makes the RC a legal advance.
    expect(compareVersions('0.94.0-rc.1', '0.93.0')).toBeGreaterThan(0);
  });

  it('compares prerelease identifiers numerically, then lexically', () => {
    expect(compareVersions('0.94.0-rc.2', '0.94.0-rc.10')).toBeLessThan(0);
    expect(compareVersions('1.0.0-beta.1', '1.0.0-rc.1')).toBeLessThan(0);
    // A numeric identifier ranks below an alphanumeric one at the same position.
    expect(compareVersions('1.0.0-1', '1.0.0-alpha')).toBeLessThan(0);
    // More identifiers wins when every shared field is equal.
    expect(compareVersions('1.0.0-rc.1', '1.0.0-rc.1.1')).toBeLessThan(0);
  });
});

describe('checkVersion: prerelease headings', () => {
  it('passes an RC whose core is a minor over the last stable, with the marker', () => {
    const result = checkVersion(
      '0.94.0-rc.1',
      changelog('0.94.0-rc.1', '0.93.0', `a new subsystem.\n${MINOR_MARK}`),
    );
    expect(result).toEqual({ ok: true, bump: 'minor' });
  });

  it('fails an RC whose core is a minor with no marker', () => {
    const result = checkVersion('0.94.0-rc.1', changelog('0.94.0-rc.1', '0.93.0', 'no marker.'));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/minor/i);
  });

  it('sizes the promotion against the last stable, skipping its own RC line', () => {
    const result = checkVersion(
      '0.94.0',
      changelog3('0.94.0', '0.94.0-rc.1', '0.93.0', `a new subsystem.\n${MINOR_MARK}`),
    );
    expect(result).toEqual({ ok: true, bump: 'minor' });
  });

  it('passes a second RC on the same line without redeclaring the size', () => {
    const result = checkVersion(
      '0.94.0-rc.2',
      changelog3('0.94.0-rc.2', '0.94.0-rc.1', '0.93.0', `a fix to the candidate.\n${MINOR_MARK}`),
    );
    expect(result).toEqual({ ok: true, bump: 'minor' });
  });

  it('treats a line with no earlier differing core as a prerelease step', () => {
    const result = checkVersion(
      '0.94.0-rc.2',
      changelog('0.94.0-rc.2', '0.94.0-rc.1', 'a fix to the candidate.'),
    );
    expect(result).toEqual({ ok: true, bump: 'prerelease' });
  });

  it('fails an RC that does not advance over the heading below it', () => {
    const result = checkVersion(
      '0.94.0-rc.1',
      changelog('0.94.0-rc.1', '0.94.0', 'the promotion already shipped.'),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/advance/i);
  });

  it('simulates an Unreleased window above an RC as that RC\'s promotion', () => {
    const result = checkVersion(
      '0.94.0-rc.1',
      changelogWithUnreleased('the next window.', '0.94.0-rc.1', '0.93.0'),
    );
    // The simulated cut is 0.94.0, a minor over 0.93.0, so an unmarked window fails the rule.
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Unreleased/);
  });
});

// A `## Unreleased` window sits above the top published heading, so nothing above enforces it
// until this heading is renamed at a real cut. These cases exercise that window in isolation: a
// two-entry changelog with an Unreleased window pushed above `top`, so `checkVersion` still
// matches pkgVersion against the top PUBLISHED heading, `top`, not the Unreleased one.
function changelogWithUnreleased(unreleasedBody: string, top: string, prev: string) {
  return `# Changelog\n\n## Unreleased\n\n${unreleasedBody}\n\n## ${top}\n\nnotes.\n\n## ${prev}\n\nolder notes.\n`;
}

describe('checkVersion: the Unreleased window', () => {
  it('leaves a changelog with no Unreleased heading unaffected (today\'s CHANGELOG.md shape)', () => {
    const result = checkVersion('0.56.2', changelog('0.56.2', '0.56.1', 'a refinement.'));
    expect(result).toEqual({ ok: true, bump: 'patch' });
  });

  it('passes an Unreleased window with no marker (presumed patch-worthy)', () => {
    const result = checkVersion(
      '0.56.2',
      changelogWithUnreleased('some prose, no marker yet.', '0.56.2', '0.56.1'),
    );
    expect(result).toEqual({ ok: true, bump: 'patch' });
  });

  it('passes an Unreleased window carrying exactly one marker', () => {
    const result = checkVersion(
      '0.56.2',
      changelogWithUnreleased(`a new subsystem.\n${MINOR_MARK}`, '0.56.2', '0.56.1'),
    );
    expect(result).toEqual({ ok: true, bump: 'patch' });
  });

  it('fails an Unreleased window carrying two markers', () => {
    const result = checkVersion(
      '0.56.2',
      changelogWithUnreleased(`${MINOR_MARK}\n${MAJOR_MARK}`, '0.56.2', '0.56.1'),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/Unreleased/);
      expect(result.error).toMatch(/2 release-size markers/);
    }
  });
});
