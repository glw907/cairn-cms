import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { generateOptionPaths, checkOptionDocs } from '../../../scripts/checks/check-options.mjs';

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

// Write each named declaration file into a fresh temp directory and return the walker's input: one
// subpath per file, in the order given, rooted at that directory. The fixtures are synthetic, never
// the real dist.
function fixture(files: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), 'check-options-'));
  dirs.push(dir);
  for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), body);
  const subpaths = Object.keys(files)
    .filter((name) => !name.includes('.svelte.'))
    .map((name) => ({ subpath: name === 'index.d.ts' ? '.' : `/${name.replace('.d.ts', '')}`, dts: join(dir, name) }));
  return { subpaths, declRoot: dir };
}

const keys = (result: { paths: { key: string }[] }) => result.paths.map((p) => p.key);
const find = (result: { paths: { key: string; exportName: string }[] }, key: string) =>
  result.paths.find((p) => p.key === key);

const ADAPTER = `
export interface NavMenuConfig { menu: string; }
export interface PublishActionEntry { label: string; href: string; }
export interface CairnAdapter {
  title: string;
  editor?: {
    nav?: NavMenuConfig;
    supportContact?: string;
    publishActions?: PublishActionEntry[];
  };
}
export declare function defineAdapter<A extends CairnAdapter>(adapter: A): A;
`;

describe('generateOptionPaths', () => {
  it('keys a member of an inline literal by its path from the declaring type, and lists the literal itself', () => {
    const result = generateOptionPaths(fixture({ 'index.d.ts': ADAPTER }));
    expect(result.failures).toEqual([]);
    expect(keys(result)).toEqual(
      expect.arrayContaining([
        'CairnAdapter.title',
        'CairnAdapter.editor',
        'CairnAdapter.editor.nav',
        'CairnAdapter.editor.supportContact',
        'CairnAdapter.editor.publishActions',
      ]),
    );
    expect(find(result, 'CairnAdapter.editor.nav')).toMatchObject({ exportName: 'defineAdapter', subpath: '.' });
  });

  it('reaches a named type nested under an inline literal, keyed by that type', () => {
    const result = generateOptionPaths(fixture({ 'index.d.ts': ADAPTER }));
    expect(keys(result)).toContain('NavMenuConfig.menu');
  });

  it('reaches a type only through an array element', () => {
    const result = generateOptionPaths(fixture({ 'index.d.ts': ADAPTER }));
    expect(find(result, 'PublishActionEntry.label')).toMatchObject({ exportName: 'defineAdapter' });
    expect(keys(result)).toContain('PublishActionEntry.href');
  });

  it('reaches a type only through a generic constraint', () => {
    const result = generateOptionPaths(
      fixture({
        'index.d.ts': `
          export interface Inner { secret: string; }
          export declare function defineThing<T extends Inner>(thing: T): T;
        `,
      }),
    );
    expect(find(result, 'Inner.secret')).toMatchObject({ exportName: 'defineThing' });
  });

  it('reaches a type only through Partial of a named type', () => {
    const result = generateOptionPaths(
      fixture({
        'index.d.ts': `
          export interface Named { a: string; b?: number; }
          export interface Cfg { part?: Partial<Named>; }
          export declare function defineCfg(cfg: Cfg): Cfg;
        `,
      }),
    );
    expect(keys(result)).toEqual(expect.arrayContaining(['Cfg.part', 'Named.a', 'Named.b']));
  });

  it('reaches a type only through a Record value', () => {
    const result = generateOptionPaths(
      fixture({
        'index.d.ts': `
          export interface Named { leaf: string; }
          export interface Cfg { byId: Record<string, Named>; }
          export declare function defineCfg(cfg: Cfg): Cfg;
        `,
      }),
    );
    expect(keys(result)).toContain('Named.leaf');
  });

  it('reaches a type through an index signature, a union arm, and an intersection', () => {
    const result = generateOptionPaths(
      fixture({
        'index.d.ts': `
          export interface ViaIndex { i: string; }
          export interface ViaUnion { u: string; }
          export interface ViaIntersection { n: string; }
          export interface Cfg {
            map: { [key: string]: ViaIndex };
            either: ViaUnion | string | null;
            both: ViaIntersection & { extra: string };
          }
          export declare function defineCfg(cfg: Cfg): Cfg;
        `,
      }),
    );
    expect(keys(result)).toEqual(
      expect.arrayContaining(['ViaIndex.i', 'ViaUnion.u', 'ViaIntersection.n', 'Cfg.both.extra']),
    );
  });

  it('reaches a type through a tuple element without listing the tuple positions', () => {
    const result = generateOptionPaths(
      fixture({
        'index.d.ts': `
          export interface Named { x: string; }
          export interface Cfg { pair: [Named, string]; rest: readonly [string, ...Named[]]; }
          export declare function defineCfg(cfg: Cfg): Cfg;
        `,
      }),
    );
    expect(result.failures).toEqual([]);
    expect(keys(result)).toEqual(['Cfg.pair', 'Cfg.rest', 'Named.x']);
  });

  it('yields two rows for two inline literals that share a member name', () => {
    const result = generateOptionPaths(
      fixture({
        'index.d.ts': `
          export interface Cfg { first?: { size: number }; second?: { size: number }; }
          export declare function defineCfg(cfg: Cfg): Cfg;
        `,
      }),
    );
    expect(keys(result)).toEqual(expect.arrayContaining(['Cfg.first.size', 'Cfg.second.size']));
  });

  it('lists a type reached from several roots once, and stops on a cycle', () => {
    const result = generateOptionPaths(
      fixture({
        'index.d.ts': `
          export interface Shared { label: string; }
          export interface Tree { shared: Shared; children: Tree[]; }
          export interface One { shared: Shared; }
          export declare function defineOne(one: One): One;
          export declare function defineTree(tree: Tree): Tree;
        `,
      }),
    );
    expect(result.failures).toEqual([]);
    expect(keys(result).filter((key) => key === 'Shared.label')).toHaveLength(1);
    expect(find(result, 'Shared.label')?.exportName).toBe('defineOne');
    expect(keys(result)).toContain('Tree.children');
  });

  it('leaves a *Data member and an engine component prop type out of the generated set', () => {
    const result = generateOptionPaths(
      fixture({
        'index.d.ts': `
          import type { Shape } from './Widget.svelte';
          export interface PageData { title: string; }
          export interface PanelProps { heading: string; }
          export interface Cfg { page: PageData; panel: PanelProps; widget: Shape; keep: string; }
          export declare function defineCfg(cfg: Cfg): Cfg;
        `,
        'Widget.svelte.d.ts': 'export interface Shape { hidden: string; }',
      }),
    );
    expect(result.failures).toEqual([]);
    expect(keys(result)).toEqual(expect.arrayContaining(['Cfg.page', 'Cfg.panel', 'Cfg.widget', 'Cfg.keep']));
    expect(keys(result)).not.toContain('PageData.title');
    expect(keys(result)).not.toContain('PanelProps.heading');
    expect(keys(result)).not.toContain('Shape.hidden');
  });

  it('treats a function, a built-in, and an externally declared type as a leaf', () => {
    const result = generateOptionPaths(
      fixture({
        'index.d.ts': `
          export interface Cfg { onSave: (id: string) => void; when: Date; bag: Map<string, string>; }
          export declare function defineCfg(cfg: Cfg): Cfg;
        `,
      }),
    );
    expect(result.failures).toEqual([]);
    expect(keys(result)).toEqual(['Cfg.bag', 'Cfg.onSave', 'Cfg.when']);
  });

  it('walks only define* and create* functions and the named extras, and only their parameters', () => {
    const result = generateOptionPaths(
      fixture({
        'index.d.ts': `
          export interface InCfg { a: string; }
          export interface OutShape { b: string; }
          export interface Other { c: string; }
          export declare function createThing(cfg: InCfg): OutShape;
          export declare function loadThing(other: Other): void;
        `,
      }),
    );
    expect(keys(result)).toEqual(['InCfg.a']);
  });

  it('keys an inline parameter literal by the function and parameter names', () => {
    const result = generateOptionPaths(
      fixture({
        'index.d.ts': 'export declare function defineBag(bag: { items: string[]; }): void;',
      }),
    );
    expect(keys(result)).toEqual(['defineBag.bag.items']);
  });

  it('fails a member whose type cannot be resolved, naming the root export and subpath', () => {
    const result = generateOptionPaths(
      fixture({
        'index.d.ts': `
          export interface Cfg { ok: string; broken: Missing; }
          export declare function defineCfg(cfg: Cfg): Cfg;
        `,
      }),
    );
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toContain('Cfg.broken');
    expect(result.failures[0]).toContain('defineCfg');
    expect(result.failures[0]).toContain('subpath .');
  });

  it('reports every unresolvable member in a root, not only the first', () => {
    const result = generateOptionPaths(
      fixture({
        'index.d.ts': `
          export interface Cfg { a: Missing[]; f: { g: Missing }; }
          export declare function defineCfg(cfg: Cfg): Cfg;
        `,
      }),
    );
    expect(result.failures).toHaveLength(2);
    expect(result.failures.some((failure) => failure.startsWith('Cfg.a:'))).toBe(true);
    expect(result.failures.some((failure) => failure.startsWith('Cfg.f.g:'))).toBe(true);
  });

  it('names the export and subpath first reached in subpath order', () => {
    const result = generateOptionPaths(
      fixture({
        'index.d.ts': `
          export interface Cfg { shared: Shared; }
          export interface Shared { deep: string; }
          export declare function defineCfg(cfg: Cfg): Cfg;
        `,
        'extra.d.ts': `
          export interface Shared { deep: string; }
          export declare function createExtra(shared: Shared): void;
        `,
      }),
    );
    expect(find(result, 'Shared.deep')).toMatchObject({ exportName: 'defineCfg', subpath: '.' });
  });
});

describe('generateOptionPaths doc comments', () => {
  it('marks a member with a doc comment documented and a bare member not', () => {
    const result = generateOptionPaths(
      fixture({
        'index.d.ts': `
          export interface Cfg {
            /** The label a site shows. */
            label: string;
            bare: string;
            /** @deprecated */
            tagOnly?: string;
          }
          export declare function defineCfg(cfg: Cfg): Cfg;
        `,
      }),
    );
    expect(result.paths.map((p: { key: string; documented: boolean }) => `${p.key}=${p.documented}`)).toEqual([
      'Cfg.bare=false',
      'Cfg.label=true',
      'Cfg.tagOnly=false',
    ]);
  });
});

describe('checkOptionDocs', () => {
  const path = (key: string, documented: boolean) => ({ key, exportName: 'defineCfg', subpath: '.', file: 'x.d.ts', documented });

  it('passes when every member is documented or excluded with a reason', () => {
    const generated = [path('Cfg.label', true), path('Cfg.type', false)];
    expect(checkOptionDocs({ generated, exclusions: { 'Cfg.type': 'a builder sets it' } })).toEqual([]);
  });

  it('fails an undocumented option member, naming the path, its export, and the subpath', () => {
    const failures = checkOptionDocs({ generated: [path('Cfg.label', true), path('Cfg.bare', false)], exclusions: {} });
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain('Cfg.bare');
    expect(failures[0]).toContain('defineCfg');
    expect(failures[0]).toContain('subpath .');
  });

  it('fails an exclusion with no reason', () => {
    const failures = checkOptionDocs({ generated: [path('Cfg.type', false)], exclusions: { 'Cfg.type': ' ' } });
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain('reason');
  });

  it('fails an exclusion for a path the walker no longer generates', () => {
    const failures = checkOptionDocs({ generated: [], exclusions: { 'Gone.member': 'removed' } });
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain('Gone.member');
  });
});
