import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { moduleExports } from '../../../scripts/checks/dts-exports.mjs';
import {
  collectReachableNames,
  collectDeclaredTypeNames,
  deriveLeaks,
  selectLeakedNames,
  findLeakViolations,
  formatLeakViolations,
  isPlainTypeExport,
} from '../../../scripts/checks/check-surface-leaks.mjs';

// The type-checker model, proven against a real compile-only fixture (the move record's own
// technique, `https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/record/2026-08-30-retires-move-record.md`): a two-hop nested shape,
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

// F-1's `/admin` clause (Task 9, internals-C): whether a barrel export is a plain type
// export (an interface, type alias, or enum with no value side) or a runtime value export (a
// function, a const, or a Svelte component's `declare const X: Component<...>` default), read
// off real TypeScript symbol flags rather than asserted in prose. Proven against real dist
// declarations too, below: `dist/admin/index.d.ts` carries no plain-type exports and classifies
// its three component exports as `false`, which is what lets `deriveTypeCheckerLeaks` walk the former without ever
// descending into a component's own Props/Events/Slots type graph.
describe('isPlainTypeExport (the /admin mechanical split)', () => {
  const tmpFiles: string[] = [];
  afterEach(() => {
    for (const dir of tmpFiles.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  function compileFixture(source: string) {
    const dir = mkdtempSync(join(tmpdir(), 'check-surface-leaks-plain-type-'));
    tmpFiles.push(dir);
    const dtsPath = join(dir, 'fixture.d.ts');
    writeFileSync(dtsPath, source);
    return dtsPath;
  }

  it('is true for a bare interface or type alias export, erased at compile time', () => {
    const dtsPath = compileFixture(
      ['export interface PlainInterface { x: string }', 'export type PlainAlias = { y: number };'].join('\n'),
    );
    const { symbols } = moduleExports(dtsPath);
    for (const name of ['PlainInterface', 'PlainAlias']) {
      const sym = symbols.find((s) => s.name === name);
      expect(sym).toBeDefined();
      expect(isPlainTypeExport(sym!)).toBe(true);
    }
  });

  it('is false for a value export (a function, a const, or an enum), which all compile to real JS', () => {
    // An `enum`, unlike a bare `interface`/`type`, compiles to a real runtime object, so
    // TypeScript's own `SymbolFlags.Value` includes its `RegularEnum` bit; it belongs with the
    // value exports here, not the erased-at-compile-time plain types above.
    const dtsPath = compileFixture(
      [
        'export declare function plainFunction(): void;',
        'export declare const plainConst: { x: string };',
        'export enum PlainEnum { A, B }',
      ].join('\n'),
    );
    const { symbols } = moduleExports(dtsPath);
    for (const name of ['plainFunction', 'plainConst', 'PlainEnum']) {
      const sym = symbols.find((s) => s.name === name);
      expect(sym).toBeDefined();
      expect(isPlainTypeExport(sym!)).toBe(false);
    }
  });

  it('classifies the real dist/admin/index.d.ts barrel (0 plain-type, 3 component)', () => {
    // `npm ci`'s `prepare` hook and CI's own `npm run package` step both build `dist/` ahead of
    // `npm test`, so a real built barrel is available here without this suite building one itself.
    const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
    const dtsPath = join(repoRoot, 'dist/admin/index.d.ts');
    const { checker, symbols } = moduleExports(dtsPath);
    // Mirrors check-surface-leaks.mjs's own `resolveAlias`: `moduleExports` returns barrel-level
    // symbols, most of which are re-export ALIAS symbols whose Interface/TypeAlias/Value flags
    // live on the aliased target, not on the alias itself.
    const resolved = symbols.map((sym) =>
      sym.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(sym) : sym,
    );
    const plainTypeNames = resolved.filter((sym) => isPlainTypeExport(sym)).map((sym) => sym.name);
    const componentNames = resolved.filter((sym) => !isPlainTypeExport(sym)).map((sym) => sym.name);
    expect(plainTypeNames).toEqual([]);
    expect(componentNames).toHaveLength(3);
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

// The cross-subpath half of the leak gate: a reachable name exported from any subpath is nameable,
// so the gate follows a type across subpaths and a name the barrels drop from everywhere still fails.
describe('selectLeakedNames', () => {
  const universe = new Set(['MediaResolve', 'SlotKind']);

  it('does not count a type exported only from root as a leak on another subpath', () => {
    const model = { '.': { MediaResolve: '(ref) => R' }, '/delivery': { SiteResolver: '{ }' } };
    expect(selectLeakedNames(['MediaResolve'], universe, model)).toEqual([]);
  });

  it('counts a type exported from no subpath as a leak', () => {
    const model = { '.': { MediaResolve: '(ref) => R' } };
    expect(selectLeakedNames(['SlotKind'], universe, model)).toEqual(['SlotKind']);
  });

  it('skips a reachable name outside our own declared types', () => {
    expect(selectLeakedNames(['Promise'], universe, {})).toEqual([]);
  });
});

// A literal union expanded inline on one subpath and named on another is legal: the one-path rule
// covers where the name imports from.
describe('deriveLeaks', () => {
  it('holds no renderer-model entry for a union inlined across subpaths', () => {
    const model = {
      '.': {
        NavLayoutEntry:
          '{ label: string; icon: "image" | "anchor" | "banknote"; href: string }',
      },
      '/sveltekit': {
        NavIcon: '"anchor" | "banknote" | "image"',
      },
    };
    const leaks = deriveLeaks(model);
    expect(leaks.filter((leak) => leak.model === 'renderer')).toEqual([]);
    expect(leaks.some((leak) => leak.name === 'NavIcon' && leak.subpath === '.')).toBe(false);
  }, 60_000);
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
    const stale = { name: 'Resolved', subpath: '.', model: 'type-checker', 'sanctioned-by': 'x' };
    const result = findLeakViolations([], [stale]);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.stale).toEqual([stale]);
    expect(formatLeakViolations(result)).toContain('STALE');
  });
});
