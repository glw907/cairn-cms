// cairn-cms: `cloudflare:workers` exists only where a Worker runs, so the one engine module that
// imports it (`sveltekit/workers-env.js`) must stay out of every entry a Node process loads: the
// root barrel, `/admin`, `/public`, `/vite`, `/cloudflare`, `/auth-crypto`, `/log`, and the bins.
// This walks the built `dist` (the tree `npm pack` ships) from each of those entries, following
// every relative static and dynamic import in `.js` and `.svelte` files, plus every self-referencing
// bare specifier (`@glw907/cairn-cms`, `@glw907/cairn-cms/<subpath>`) resolved through the root
// `exports` map, and fails if any walk reaches the module. The `/sveltekit` entry is the positive control: its walk must reach the
// module, so a walk that resolves nothing cannot pass by finding nothing.
import { afterAll, describe, it, expect } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const DIST = resolve(ROOT, 'dist');
const WORKERS_ENV = resolve(DIST, 'sveltekit/workers-env.js');

interface ExportsTarget {
  types?: string;
  svelte?: string;
  worker?: string;
  default?: string;
}

interface Manifest {
  exports: Record<string, ExportsTarget | string>;
  bin: Record<string, string>;
}

// `import x from './a.js'`, `export * from './b.js'`, `import './c.svelte'`, and `import('./d.js')`
// all load a module at some point in the entry's life, so each is an edge. A specifier is either
// relative or a self-reference to this package; any other bare specifier is an external dependency.
const SELF = '@glw907/cairn-cms';
const SPECIFIER = `(\\.{1,2}\\/[^'"]+|${SELF.replace(/[/@-]/g, '\\$&')}(?:\\/[^'"]+)?)`;
const SPECIFIERS = [
  new RegExp(`\\b(?:import|export)\\b[^'"\`;]*?\\bfrom\\s*['"]${SPECIFIER}['"]`, 'g'),
  new RegExp(`\\bimport\\s*['"]${SPECIFIER}['"]`, 'g'),
  new RegExp(`\\bimport\\s*\\(\\s*['"]${SPECIFIER}['"]\\s*\\)`, 'g'),
];

/** A package root and its parsed manifest, the pair every resolution needs. */
interface Pkg {
  root: string;
  manifest: Manifest;
}

/** The runtime file a Node process loads for one `exports` key, by the `svelte` then `default` conditions. */
function exportTarget({ root, manifest }: Pkg, key: string): string {
  const value = manifest.exports[key];
  if (value === undefined) throw new Error(`exports["${key}"] is not declared`);
  if (typeof value === 'string') return resolve(root, value);
  const target = value.svelte ?? value.default;
  if (!target) throw new Error(`exports["${key}"] names no runtime file`);
  return resolve(root, target);
}

/** Resolve one specifier found in `file` to an absolute path. */
function resolveSpecifier(pkg: Pkg, file: string, specifier: string): string {
  if (specifier.startsWith('.')) return resolve(dirname(file), specifier);
  return exportTarget(pkg, `.${specifier.slice(SELF.length)}`);
}

/** Every module `file` loads, resolved to an absolute path. */
function edges(pkg: Pkg, file: string): string[] {
  const source = readFileSync(file, 'utf8');
  const out = new Set<string>();
  for (const pattern of SPECIFIERS) {
    for (const match of source.matchAll(pattern)) out.add(resolveSpecifier(pkg, file, match[1]));
  }
  return [...out];
}

/** Every module reachable from `entry`, `entry` included. */
function reach(pkg: Pkg, entry: string): Set<string> {
  const seen = new Set<string>();
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.shift() as string;
    if (seen.has(file) || !existsSync(file)) continue;
    // Only script modules carry imports; a stylesheet or JSON edge ends here.
    seen.add(file);
    if (!/\.(js|svelte)$/.test(file)) continue;
    queue.push(...edges(pkg, file));
  }
  return seen;
}

const NODE_CONTEXT_KEYS = ['.', './admin', './public', './vite', './cloudflare', './auth-crypto', './log'];

describe('workers-env stays out of every Node-context entry', () => {
  if (!existsSync(WORKERS_ENV)) {
    it('needs the built package', () => {
      throw new Error('dist/sveltekit/workers-env.js is missing; run `npm run package` before `npm test`.');
    });
    return;
  }
  const manifest = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')) as Manifest;
  const pkg: Pkg = { root: ROOT, manifest };
  const entries: [string, string][] = [
    ...NODE_CONTEXT_KEYS.map((key): [string, string] => [key, exportTarget(pkg, key)]),
    ...Object.entries(manifest.bin).map(([name, path]): [string, string] => [`bin ${name}`, resolve(ROOT, path)]),
  ];
  const counts: Record<string, number> = {};

  it.each(entries)('%s never reaches workers-env', (label, entry) => {
    const reached = reach(pkg, entry);
    counts[label] = reached.size;
    expect(reached.size, `${label} resolved no modules from ${relative(ROOT, entry)}`).toBeGreaterThan(0);
    expect(reached.has(WORKERS_ENV)).toBe(false);
  });

  it('./sveltekit reaches workers-env (the positive control)', () => {
    const reached = reach(pkg, exportTarget(pkg, './sveltekit'));
    counts['./sveltekit'] = reached.size;
    expect(reached.has(WORKERS_ENV)).toBe(true);
    console.log('workers-env reach, modules per entry:', counts);
  });
});

describe('the walk follows self-referencing specifiers', () => {
  const cache = join(homedir(), '.cache');
  mkdirSync(cache, { recursive: true });
  const scratch = mkdtempSync(join(cache, 'reach-'));
  const write = (path: string, body: string) => {
    mkdirSync(dirname(join(scratch, path)), { recursive: true });
    writeFileSync(join(scratch, path), body);
  };
  write('dist/entry.js', `import { x } from '${SELF}/inner';\nexport { x };\n`);
  write('dist/dynamic.js', `export const load = () => import('${SELF}');\n`);
  write('dist/inner/index.js', `export * from './leaf.js';\n`);
  write('dist/inner/leaf.js', `import '${SELF}';\nexport const x = 1;\n`);
  write('dist/index.js', `import { env } from './sveltekit/workers-env.js';\nexport { env };\n`);
  write('dist/sveltekit/workers-env.js', `export const env = {};\n`);
  write('dist/clean.js', `import { y } from 'some-dependency';\nexport { y };\n`);
  const fixture: Pkg = {
    root: scratch,
    manifest: {
      bin: {},
      exports: {
        '.': { svelte: './dist/index.js', default: './dist/other.js' },
        './inner': { default: './dist/inner/index.js' },
      },
    },
  };
  const target = resolve(scratch, 'dist/sveltekit/workers-env.js');

  afterAll(() => rmSync(scratch, { recursive: true, force: true }));

  it('reaches a module that is only named through a self-referencing static import', () => {
    expect(reach(fixture, resolve(scratch, 'dist/entry.js')).has(target)).toBe(true);
  });

  it('reaches a module that is only named through a self-referencing dynamic import', () => {
    expect(reach(fixture, resolve(scratch, 'dist/dynamic.js')).has(target)).toBe(true);
  });

  it('resolves the root specifier by the svelte condition before default', () => {
    expect(exportTarget(fixture, '.')).toBe(resolve(scratch, 'dist/index.js'));
  });

  it('does not walk an external dependency', () => {
    expect(reach(fixture, resolve(scratch, 'dist/clean.js')).has(target)).toBe(false);
  });

  it('fails loudly on a self-reference the exports map does not declare', () => {
    write('dist/bad.js', `import '${SELF}/missing';\n`);
    expect(() => reach(fixture, resolve(scratch, 'dist/bad.js'))).toThrow(/not declared/);
  });
});
