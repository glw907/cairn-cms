import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { diffSurface } from '../../../scripts/check-surface.mjs';

const SNAPSHOT = resolve(
  fileURLToPath(new URL('../../../docs/internal/api-surface.md', import.meta.url)),
);

// Build a one-section snapshot string in the gate's serialized form: a banner, a subpath header, and
// one `name: shape` line per export. The diff core parses this back, so a crafted snapshot drives
// the core without touching a real `.d.ts`, keeping the test fast and hermetic.
function snapshot(subpath: string, exports: Record<string, string>) {
  const lines = ['GENERATED', '', `## \`${subpath}\``, ''];
  for (const name of Object.keys(exports)) lines.push(`- \`${name}\`: ${exports[name]}`);
  return lines.join('\n') + '\n';
}

describe('diffSurface', () => {
  it('returns ok on identical input', () => {
    const snap = snapshot('/sveltekit', {
      AdminShellData: '{ public: boolean; siteName: string }',
      requireOwner: '(event: { locals: {} }) => Editor',
    });
    expect(diffSurface(snap, snap)).toEqual({ ok: true });
  });

  it('reports an added export per subpath', () => {
    const before = snapshot('/sveltekit', { AdminShellData: '{ public: boolean }' });
    const after = snapshot('/sveltekit', {
      AdminShellData: '{ public: boolean }',
      CsrfField: '{ ... }',
    });
    const result = diffSurface(before, after);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.drift).toHaveLength(1);
      expect(result.drift[0].subpath).toBe('/sveltekit');
      expect(result.drift[0].added).toEqual(['CsrfField']);
      expect(result.drift[0].removed).toEqual([]);
      expect(result.drift[0].changed).toEqual([]);
    }
  });

  it('reports a removed export per subpath', () => {
    const before = snapshot('/sveltekit', {
      AdminShellData: '{ public: boolean }',
      LayoutData: '{ user: User }',
    });
    const after = snapshot('/sveltekit', { AdminShellData: '{ public: boolean }' });
    const result = diffSurface(before, after);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.drift[0].removed).toEqual(['LayoutData']);
      expect(result.drift[0].added).toEqual([]);
    }
  });

  it('reports a changed callable signature per subpath', () => {
    const before = snapshot('/sveltekit', { requireOwner: '(event: E) => Editor' });
    const after = snapshot('/sveltekit', { requireOwner: '(event: E) => Editor | null' });
    const result = diffSurface(before, after);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.drift[0].changed).toHaveLength(1);
      expect(result.drift[0].changed[0].name).toBe('requireOwner');
    }
  });

  // The central guarantee: a changed FIELD on a non-callable interface shape drifts the snapshot,
  // not only an added/removed/renamed export or a changed callable signature. This is the gap the
  // signatures gate cannot see, and the reason the snapshot records full shapes.
  it('reports a changed field on an interface shape', () => {
    const before = snapshot('/sveltekit', {
      AdminShellData: '{ public: boolean; siteName: string; csrf: string }',
    });
    const after = snapshot('/sveltekit', {
      // `csrf: string` was retyped to `csrf: string | null`: one field changed, nothing added or
      // removed. The gate must catch this.
      AdminShellData: '{ public: boolean; siteName: string; csrf: string | null }',
    });
    const result = diffSurface(before, after);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.drift).toHaveLength(1);
      expect(result.drift[0].added).toEqual([]);
      expect(result.drift[0].removed).toEqual([]);
      expect(result.drift[0].changed).toHaveLength(1);
      expect(result.drift[0].changed[0].name).toBe('AdminShellData');
      expect(result.drift[0].changed[0].before).toContain('csrf: string');
      expect(result.drift[0].changed[0].after).toContain('csrf: string | null');
    }
  });

  // A callable export must render its real signature, never its own bare name. A type alias for a
  // function (`type SiteRender = (input) => …`) once rendered as the tautology `SiteRender:
  // SiteRender`, which hid every signature drift from both this gate and the signatures gate. This
  // reads the committed snapshot and fails on any `name: name` line, locking the rendering fix across
  // every subpath, not only the five aliases that surfaced it.
  it('the committed snapshot has no tautology (name renders as its own bare name)', () => {
    const tautologies = readFileSync(SNAPSHOT, 'utf8')
      .split('\n')
      .map((line) => line.match(/^- `([^`]+)`: (.+)$/))
      .filter((m): m is RegExpMatchArray => m !== null && m[1] === m[2].trim())
      .map((m) => m[1]);
    expect(tautologies).toEqual([]);
  });

  it('reports drift across multiple subpaths', () => {
    const before =
      snapshot('.', { fields: '{ text: F }' }) + snapshot('/sveltekit', { requireOwner: '(e) => E' });
    const after =
      snapshot('.', { fields: '{ text: F; icon: F }' }) +
      snapshot('/sveltekit', { requireOwner: '(e) => E' });
    const result = diffSurface(before, after);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.drift).toHaveLength(1);
      expect(result.drift[0].subpath).toBe('.');
      expect(result.drift[0].changed[0].name).toBe('fields');
    }
  });
});
