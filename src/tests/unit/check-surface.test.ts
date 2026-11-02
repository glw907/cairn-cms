import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { moduleExports } from '../../../scripts/checks/dts-exports.mjs';
import { diffSurface, findHomeViolations, formatHomeViolations, renderExport, surfaceSubpaths } from '../../../scripts/checks/check-surface.mjs';

const SNAPSHOT = resolve(
  fileURLToPath(new URL('../../../scripts/checks/api-surface.md', import.meta.url)),
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

// An index signature (`[key: string]: T`) is part of an interface's declared shape: dropping one
// changes what a consumer can assign or index into, the same class of drift a renamed named field
// causes. `getPropertiesOfType` alone never sees it, so the rendered listing must fold it in
// explicitly (renderExport is the fixture-testable seam; renderInterface is not exported).
describe('renderExport (index signatures)', () => {
  const tmpDirs: string[] = [];
  afterEach(() => {
    for (const dir of tmpDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  function writeFixture(source: string) {
    const dir = mkdtempSync(join(tmpdir(), 'check-surface-'));
    tmpDirs.push(dir);
    const dtsPath = join(dir, 'fixture.d.ts');
    writeFileSync(dtsPath, source);
    return dtsPath;
  }

  it('renders a string index signature, and differs from the same interface without one', () => {
    const dtsPath = writeFixture(
      [
        'export interface WithIndex {',
        '  known: string;',
        '  [key: string]: unknown;',
        '}',
        'export interface WithoutIndex {',
        '  known: string;',
        '}',
      ].join('\n'),
    );
    const { checker, symbols } = moduleExports(dtsPath);
    const withIndex = symbols.find((s) => s.name === 'WithIndex')!;
    const withoutIndex = symbols.find((s) => s.name === 'WithoutIndex')!;
    const renderedWithIndex = renderExport(checker, withIndex);
    const renderedWithoutIndex = renderExport(checker, withoutIndex);
    expect(renderedWithIndex).toContain('[key: string]: unknown');
    expect(renderedWithIndex).not.toBe(renderedWithoutIndex);
  });

  it('renders a readonly number index signature', () => {
    const dtsPath = writeFixture(
      ['export interface Rows {', '  readonly [index: number]: string;', '}'].join('\n'),
    );
    const { checker, symbols } = moduleExports(dtsPath);
    const rows = symbols.find((s) => s.name === 'Rows')!;
    expect(renderExport(checker, rows)).toContain('readonly [key: number]: string');
  });

  it('renders a symbol index signature', () => {
    const dtsPath = writeFixture(
      ['export interface Tagged {', '  [key: symbol]: unknown;', '}'].join('\n'),
    );
    const { checker, symbols } = moduleExports(dtsPath);
    const tagged = symbols.find((s) => s.name === 'Tagged')!;
    expect(renderExport(checker, tagged)).toContain('[key: symbol]: unknown');
  });
});

describe('surfaceSubpaths', () => {
  it('leaves the internal entry out of the snapshot', () => {
    const subpaths = surfaceSubpaths().map((entry) => entry.subpath);
    expect(subpaths).toContain('/delivery');
    expect(subpaths).not.toContain('/internal');
  });
});

// The one-path rule: a name on two subpaths fails, with no record to excuse it. These drive the pure
// core with a crafted model so the rule is proven in both directions.
describe('findHomeViolations', () => {
  it('passes a name published from one subpath only', () => {
    const model = { '.': { fields: '{ text: F }' }, '/sveltekit': { requireOwner: '(e) => E' } };
    expect(findHomeViolations(model)).toEqual([]);
  });

  it('reports a name on two subpaths, naming both', () => {
    const model = { '.': { SiteRender: '(i) => P' }, '/media': { SiteRender: '(i) => P' } };
    expect(findHomeViolations(model)).toEqual([{ name: 'SiteRender', subpaths: ['.', '/media'] }]);
  });

  it('names every subpath of a name on three', () => {
    const model = {
      '.': { NavLayout: 'N[]' },
      '/media': { NavLayout: 'N[]' },
      '/sveltekit': { NavLayout: 'N[]' },
    };
    expect(findHomeViolations(model)).toEqual([
      { name: 'NavLayout', subpaths: ['.', '/media', '/sveltekit'] },
    ]);
  });
});

describe('formatHomeViolations', () => {
  it('names the duplicate and its subpaths', () => {
    const message = formatHomeViolations([{ name: 'SiteRender', subpaths: ['.', '/media'] }]);
    expect(message).toContain('SiteRender');
    expect(message).toContain('., /media');
  });
});
