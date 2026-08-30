import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { diffSurface, findHomeViolations } from '../../../scripts/checks/check-surface.mjs';

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

// The canonical-home rule (ratified foundations A). A name published from two subpaths is a
// duplicate unless the second publication is recorded with its home and the signature that requires
// it; the record is `scripts/checks/check-surface-reexports.json`. These drive the pure core with a
// crafted model so the rule is proven in both directions, not only by the committed record passing.
describe('findHomeViolations', () => {
  const record = {
    reexports: [{ name: 'NavLayout', subpath: '.', home: '/sveltekit', reason: 'CairnAdapter names it.' }],
    layeredBarrels: [{ wider: '/delivery', narrower: '/delivery/data', reason: 'One home.' }],
  };

  it('passes a name published from one subpath only', () => {
    const model = { '.': { fields: '{ text: F }' }, '/sveltekit': { requireOwner: '(e) => E' } };
    expect(findHomeViolations(model, { reexports: [], layeredBarrels: [] })).toEqual({
      unrecorded: [],
      stale: [],
      misfiled: [],
    });
  });

  it('passes a duplicate whose second publication is recorded', () => {
    const model = { '.': { NavLayout: 'N[]' }, '/sveltekit': { NavLayout: 'N[]' } };
    expect(findHomeViolations(model, record).unrecorded).toEqual([]);
  });

  it('fails an unrecorded duplicate, naming both open subpaths', () => {
    const model = { '.': { SiteRender: '(i) => P' }, '/media': { SiteRender: '(i) => P' } };
    expect(findHomeViolations(model, record).unrecorded).toEqual([
      { name: 'SiteRender', subpaths: ['.', '/media'] },
    ]);
  });

  it('fails a third publication of an already-recorded name', () => {
    const model = {
      '.': { NavLayout: 'N[]' },
      '/media': { NavLayout: 'N[]' },
      '/sveltekit': { NavLayout: 'N[]' },
    };
    expect(findHomeViolations(model, record).unrecorded).toEqual([
      { name: 'NavLayout', subpaths: ['/media', '/sveltekit'] },
    ]);
  });

  it('treats a layered pair as one home, and still fails a wider-only duplicate', () => {
    const shared = {
      '/delivery': { buildRssFeed: '(c) => string' },
      '/delivery/data': { buildRssFeed: '(c) => string' },
    };
    expect(findHomeViolations(shared, record).unrecorded).toEqual([]);
    const widerOnly = {
      '.': { glyph: '(n) => E' },
      '/delivery': { glyph: '(n) => E' },
      '/delivery/data': {},
    };
    expect(findHomeViolations(widerOnly, record).unrecorded).toEqual([
      { name: 'glyph', subpaths: ['.', '/delivery'] },
    ]);
  });

  // The record shrinks as foundations B narrows `/sveltekit`; an entry that outlives its
  // publication is drift the gate reports rather than carrying forever.
  it('reports a record entry the surface no longer carries', () => {
    const model = { '/sveltekit': { NavLayout: 'N[]' } };
    expect(findHomeViolations(model, record).stale).toEqual([{ name: 'NavLayout', subpath: '.' }]);
  });

  // The record's `home` field is a claim about the surface, not a comment. Without this check a
  // wrong home string reads as settled while pointing at a subpath that declares nothing.
  it('reports a record entry whose stated home the surface does not declare', () => {
    const model = { '.': { NavLayout: 'N[]' }, '/media': { NavLayout: 'N[]' } };
    expect(findHomeViolations(model, record).misfiled).toEqual([
      { name: 'NavLayout', home: '/sveltekit', open: ['/media'] },
    ]);
  });

  // Every publication recorded means no publication declares the name: the duplicate check counts
  // open subpaths, so this shape slips past it with nothing left to be the home.
  it('reports a name whose every publication is recorded', () => {
    const model = { '.': { NavLayout: 'N[]' } };
    expect(findHomeViolations(model, record).misfiled).toEqual([
      { name: 'NavLayout', home: '/sveltekit', open: [] },
    ]);
  });

  // A name the surface dropped entirely is stale, once, and not also a missing home.
  it('does not report a home for a name the surface no longer exports at all', () => {
    const model = { '/media': { glyph: '(n) => E' } };
    const result = findHomeViolations(model, record);
    expect(result.stale).toEqual([{ name: 'NavLayout', subpath: '.' }]);
    expect(result.misfiled).toEqual([]);
  });
});
