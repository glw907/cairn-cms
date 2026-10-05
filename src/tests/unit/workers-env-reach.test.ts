// cairn-cms: `cloudflare:workers` exists only where a Worker runs, so the one engine module that
// imports it (`sveltekit/workers-env.js`) must stay out of every entry a Node process loads: the
// root barrel, `/admin`, `/public`, `/vite`, `/cloudflare`, `/auth-crypto`, `/log`, and the bins.
// This walks the built `dist` (the tree `npm pack` ships) from each of those entries, following
// every relative static and dynamic import in `.js` and `.svelte` files, and fails if any walk
// reaches the module. The `/sveltekit` entry is the positive control: its walk must reach the
// module, so a walk that resolves nothing cannot pass by finding nothing.
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

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
// all load a module at some point in the entry's life, so each is an edge.
const SPECIFIERS = [
  /\b(?:import|export)\b[^'"`;]*?\bfrom\s*['"](\.{1,2}\/[^'"]+)['"]/g,
  /\bimport\s*['"](\.{1,2}\/[^'"]+)['"]/g,
  /\bimport\s*\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g,
];

/** Every relative module `file` loads, resolved to an absolute path. */
function edges(file: string): string[] {
  const source = readFileSync(file, 'utf8');
  const out = new Set<string>();
  for (const pattern of SPECIFIERS) {
    for (const match of source.matchAll(pattern)) out.add(resolve(dirname(file), match[1]));
  }
  return [...out];
}

/** Every module reachable from `entry`, `entry` included. */
function reach(entry: string): Set<string> {
  const seen = new Set<string>();
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.shift() as string;
    if (seen.has(file) || !existsSync(file)) continue;
    // Only script modules carry imports; a stylesheet or JSON edge ends here.
    seen.add(file);
    if (!/\.(js|svelte)$/.test(file)) continue;
    queue.push(...edges(file));
  }
  return seen;
}

/** The runtime file a Node process loads for one `exports` key. */
function exportTarget(manifest: Manifest, key: string): string {
  const value = manifest.exports[key];
  if (typeof value === 'string') return resolve(ROOT, value);
  const target = value.default ?? value.svelte ?? value.worker;
  if (!target) throw new Error(`exports["${key}"] names no runtime file`);
  return resolve(ROOT, target);
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
  const entries: [string, string][] = [
    ...NODE_CONTEXT_KEYS.map((key): [string, string] => [key, exportTarget(manifest, key)]),
    ...Object.entries(manifest.bin).map(([name, path]): [string, string] => [`bin ${name}`, resolve(ROOT, path)]),
  ];
  const counts: Record<string, number> = {};

  it.each(entries)('%s never reaches workers-env', (label, entry) => {
    const reached = reach(entry);
    counts[label] = reached.size;
    expect(reached.size, `${label} resolved no modules from ${relative(ROOT, entry)}`).toBeGreaterThan(0);
    expect(reached.has(WORKERS_ENV)).toBe(false);
  });

  it('./sveltekit reaches workers-env (the positive control)', () => {
    const reached = reach(exportTarget(manifest, './sveltekit'));
    counts['./sveltekit'] = reached.size;
    expect(reached.has(WORKERS_ENV)).toBe(true);
    console.log('workers-env reach, modules per entry:', counts);
  });
});
