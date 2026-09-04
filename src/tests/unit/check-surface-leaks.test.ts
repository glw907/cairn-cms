import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { moduleExports } from '../../../scripts/checks/reference-coverage.mjs';
import {
  collectReachableNames,
  collectDeclaredTypeNames,
  extractLiteralUnionSet,
  shapeContainsLiteralUnion,
  deriveRendererLeaks,
  findLeakViolations,
  formatLeakViolations,
} from '../../../scripts/checks/check-surface-leaks.mjs';

// The type-checker model, proven against a real compile-only fixture (the move record's own
// technique, `docs/internal/record/2026-08-30-retires-move-record.md`): a two-hop nested shape,
// the exact `AdvisoryAction` proof case (invisible to the renderer, which expands one member
// level; `EditData.advisories[].actions[]` needs a second hop into `AdvisoryNotice`'s own,
// separately unexported, members).
describe('collectReachableNames (the type-checker model)', () => {
  const tmpFiles: string[] = [];
  afterEach(() => {
    for (const dir of tmpFiles.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  function compileFixture(source: string) {
    const dir = mkdtempSync(join(tmpdir(), 'check-surface-leaks-'));
    tmpFiles.push(dir);
    const dtsPath = join(dir, 'fixture.d.ts');
    writeFileSync(dtsPath, source);
    return { dir, dtsPath };
  }

  it('finds a name reachable two hops deep, past an unexported one-hop carrier', () => {
    const { dir, dtsPath } = compileFixture(
      [
        'export interface KeepParent {',
        '  advisories: AdvisoryNotice[];',
        '}',
        'interface AdvisoryNotice {',
        '  kind: string;',
        '  actions?: AdvisoryAction[];',
        '}',
        'interface AdvisoryAction {',
        '  label: string;',
        '}',
      ].join('\n'),
    );
    const { checker, symbols } = moduleExports(dtsPath);
    const keepParent = symbols.find((s) => s.name === 'KeepParent');
    expect(keepParent).toBeDefined();
    const rootType = checker.getDeclaredTypeOfSymbol(keepParent!);
    const names = collectReachableNames(checker, [rootType], dir);
    // The one-hop carrier is reachable too (a real leak in its own right, per the move record).
    expect(names.has('AdvisoryNotice')).toBe(true);
    // The two-hop name: what a renderer limited to one member level of expansion cannot see.
    expect(names.has('AdvisoryAction')).toBe(true);
  });

  it('does not stop exploring a type reached again at a shallower depth (the bestDepth fix)', () => {
    // Two roots reach the SAME nested type at different depths; a first (deep) visit that hits
    // MAX_DEPTH must not permanently block the second (shallow) root's own full exploration.
    const { dir, dtsPath } = compileFixture(
      [
        'export interface Wide { chain: L1; }',
        'export interface Shallow { target: Deep; }',
        'interface L1 { next: L2 }',
        'interface L2 { next: L3 }',
        'interface L3 { next: L4 }',
        'interface L4 { next: L5 }',
        'interface L5 { next: L6 }',
        'interface L6 { next: L7 }',
        'interface L7 { next: L8 }',
        'interface L8 { next: L9 }',
        'interface L9 { next: L10 }',
        'interface L10 { next: L11 }',
        'interface L11 { next: L12 }',
        'interface L12 { next: Deep }',
        'interface Deep { marker: DeepPayload }',
        'interface DeepPayload { value: string }',
      ].join('\n'),
    );
    const { checker, symbols } = moduleExports(dtsPath);
    const wide = symbols.find((s) => s.name === 'Wide');
    const shallow = symbols.find((s) => s.name === 'Shallow');
    const wideType = checker.getDeclaredTypeOfSymbol(wide!);
    const shallowType = checker.getDeclaredTypeOfSymbol(shallow!);
    // `Wide` visits first and reaches `Deep` past MAX_DEPTH (12); `Shallow` reaches it directly.
    const names = collectReachableNames(checker, [wideType, shallowType], dir);
    expect(names.has('DeepPayload')).toBe(true);
  });
});

describe('collectDeclaredTypeNames (the known type universe)', () => {
  it('finds a top-level type/interface/enum declaration whether or not it is exported', () => {
    const fileA = '/a.ts';
    const texts = new Map([
      [fileA, 'export interface Exported {}\ninterface Internal {}\nexport type Alias = string;\nenum Kind { A }\n'],
    ]);
    expect(collectDeclaredTypeNames([fileA], texts)).toEqual(new Set(['Exported', 'Internal', 'Alias', 'Kind']));
  });

  it('ignores a non-declaration line', () => {
    const fileA = '/a.ts';
    const texts = new Map([[fileA, 'const type = 1;\nfunction typeOf() {}\n']]);
    expect(collectDeclaredTypeNames([fileA], texts)).toEqual(new Set());
  });
});

describe('extractLiteralUnionSet', () => {
  it('extracts a pure string-literal union, canonically sorted', () => {
    expect(extractLiteralUnionSet('"b" | "a" | "c"')).toEqual(['a', 'b', 'c']);
  });

  it('tolerates the open-string escape hatch', () => {
    expect(extractLiteralUnionSet('"a" | "b" | (string & {})')).toEqual(['a', 'b']);
  });

  it('returns null for a non-literal member', () => {
    expect(extractLiteralUnionSet('"a" | string')).toBeNull();
  });

  it('returns null for an object shape', () => {
    expect(extractLiteralUnionSet('{ a: string }')).toBeNull();
  });
});

describe('shapeContainsLiteralUnion', () => {
  it('matches a member nested inside an object shape, regardless of member order', () => {
    const shape =
      '{ label: string; icon: "image" | "anchor" | "banknote"; href: string }';
    expect(shapeContainsLiteralUnion(shape, ['anchor', 'banknote', 'image'])).toBe(true);
  });

  it('does not match when the set differs', () => {
    const shape = '{ icon: "image" | "anchor" }';
    expect(shapeContainsLiteralUnion(shape, ['anchor', 'banknote', 'image'])).toBe(false);
  });
});

// The renderer model's per-subpath clause: proven against the real `NavIcon` shape (reordered, as
// TypeScript's own dts-bundling artifact reorders it across subpaths), plus `SlotKind` as the
// absent-everywhere control the renderer model structurally cannot attempt (no subpath exports it,
// so there is no canonical shape to compare against).
describe('deriveRendererLeaks (the renderer model, the per-subpath clause)', () => {
  it('finds NavIcon expanded inline on root while named on /sveltekit', () => {
    const model = {
      '.': {
        NavLayoutEntry:
          '{ label: string; icon: "image" | "anchor" | "banknote"; href: string }',
      },
      '/sveltekit': {
        NavIcon: '"anchor" | "banknote" | "image"',
      },
    };
    const leaks = deriveRendererLeaks(model);
    expect(leaks).toEqual([
      { name: 'NavIcon', subpath: '.', model: 'renderer', foundIn: 'NavLayoutEntry' },
    ]);
  });

  it('finds EngineScreenId the same way, tolerating the open-string escape hatch', () => {
    const model = {
      '.': {
        NavLayoutEngineRef: '{ screen: "help" | "settings" | (string & {}) }',
      },
      '/sveltekit': {
        EngineScreenId: '"settings" | "help" | (string & {})',
      },
    };
    const leaks = deriveRendererLeaks(model);
    expect(leaks).toEqual([
      { name: 'EngineScreenId', subpath: '.', model: 'renderer', foundIn: 'NavLayoutEngineRef' },
    ]);
  });

  it('does not attempt a name absent from every subpath (the SlotKind control)', () => {
    const model = {
      '.': { SlotDef: '{ kind: "inline" | "markdown" | "repeatable" }' },
      '/sveltekit': { SlotDef: '{ kind: "markdown" | "inline" | "repeatable" }' },
    };
    // Neither subpath exports `SlotKind` by name, so the renderer model has no home shape to read
    // a comparison set from; it structurally cannot find this leak (the type-checker model does).
    expect(deriveRendererLeaks(model)).toEqual([]);
  });

  it('does not flag a name exported from every subpath that names it', () => {
    const model = {
      '.': { Shared: '"a" | "b"' },
      '/sveltekit': { Shared: '"a" | "b"' },
    };
    expect(deriveRendererLeaks(model)).toEqual([]);
  });
});

// The failing-first proof: an unrecorded leak the derivation finds must fail the gate.
describe('findLeakViolations / formatLeakViolations (the failing-first proof)', () => {
  const derivedLeak = { name: 'SyntheticLeak', subpath: '/sveltekit', model: 'type-checker' as const };

  it('fails a derived leak with no registry entry', () => {
    const result = findLeakViolations([derivedLeak], []);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.unrecorded).toEqual([derivedLeak]);
    const message = formatLeakViolations(result);
    expect(message).toContain('SyntheticLeak');
    expect(message).toContain('UNRECORDED');
  });

  it('passes once a reasoned entry covers it (the delisted-then-relisted proof)', () => {
    const redRun = findLeakViolations([derivedLeak], []);
    expect(redRun.ok).toBe(false);
    const greenRun = findLeakViolations(
      [derivedLeak],
      [{ name: 'SyntheticLeak', subpath: '/sveltekit', model: 'type-checker', 'sanctioned-by': 'a ledger row' }],
    );
    expect(greenRun.ok).toBe(true);
  });

  it('rejects a registry entry with neither reason kind', () => {
    const result = findLeakViolations(
      [derivedLeak],
      [{ name: 'SyntheticLeak', subpath: '/sveltekit', model: 'type-checker' }],
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.unreasoned).toHaveLength(1);
  });

  it('rejects a registry entry carrying BOTH reason kinds at once', () => {
    const result = findLeakViolations(
      [derivedLeak],
      [
        {
          name: 'SyntheticLeak',
          subpath: '/sveltekit',
          model: 'type-checker',
          'sanctioned-by': 'x',
          'standing-unverdicted': 'y',
        },
      ],
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.unreasoned).toHaveLength(1);
  });

  it('fails a registry entry the derivation no longer produces (a resolved leak left stale)', () => {
    const stale = { name: 'Resolved', subpath: '.', model: 'renderer', 'sanctioned-by': 'x' };
    const result = findLeakViolations([], [stale]);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.stale).toEqual([stale]);
    expect(formatLeakViolations(result)).toContain('STALE');
  });
});
