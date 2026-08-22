// cairn-cms: the `/sveltekit` barrel is server logic a raw, non-Vite bundler may reach directly,
// the aksailingclub-org 0.95.0 adoption finding (docs/internal/docs-friction-log.md). A site can
// bundle a single barrel export (for example `createD1AuditSink`, wired into a Cloudflare Cron
// handler outside SvelteKit's own build, per scripts/wire-scheduled-handler.mjs's own pattern)
// with Wrangler's own plain esbuild pass, which has no SvelteKit Vite plugin to resolve a virtual
// module. Importing one name from a barrel pulls in every other export's own top-level imports
// too, so a module reachable from the barrel's entry that statically imports `$app/*` or `$env/*`
// breaks that consumer's build even though `npm run check`, `npm test`, and `npm run build` never
// invoke Wrangler's own bundler and so never see it. This test walks the built barrel's real,
// transitive static-import graph (dynamic `import()` calls do not count, since those resolve at
// runtime inside a real SvelteKit app, never at Wrangler's bundle time) and fails if any reachable
// module carries one. It needs `dist/sveltekit/index.js`; skipIf when the package has not been
// built, the same precedent as packaging-boundary.test.ts.
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { readFileSync as readJsonFile } from 'node:fs';

const ROOT = resolve(process.cwd());
const ENTRY = resolve(ROOT, 'dist/sveltekit/index.js');
const built = existsSync(ENTRY);

/**
 * Match a static `import ... from '...'` or `export ... from '...'` statement's specifier,
 * including a bare side-effect `import '...'`. Deliberately does not match a dynamic `import(...)`
 * call, which never carries a `from` clause and so never matches either pattern.
 */
const STATIC_FROM = /(?:^|\n)[ \t]*(?:import|export)\s[^;\n]*?\bfrom\s+(['"])([^'"]+)\1/g;
const SIDE_EFFECT_IMPORT = /(?:^|\n)[ \t]*import\s+(['"])([^'"]+)\1\s*;/g;

/** Every specifier a static import or re-export statement in `source` names. */
function staticSpecifiers(source: string): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  STATIC_FROM.lastIndex = 0;
  while ((m = STATIC_FROM.exec(source))) out.push(m[2]);
  SIDE_EFFECT_IMPORT.lastIndex = 0;
  while ((m = SIDE_EFFECT_IMPORT.exec(source))) out.push(m[2]);
  return out;
}

/** Resolve a relative specifier from `fromFile` to a real dist file, or null if none exists. */
function resolveRelative(fromFile: string, spec: string): string | null {
  const p = resolve(dirname(fromFile), spec);
  if (existsSync(p) && !existsSync(p + '/')) return p;
  if (existsSync(p + '.js')) return p + '.js';
  if (existsSync(join(p, 'index.js'))) return join(p, 'index.js');
  return null;
}

/**
 * Walk every module reachable from `entry` through a static import/export edge, returning the
 * full set of bare (non-relative) specifiers the graph names. A relative specifier that fails to
 * resolve to a real file is itself reported (prefixed), rather than silently dropped, so a broken
 * edge cannot hide a real one past it.
 */
function walkStaticImportGraph(entry: string): Set<string> {
  const visited = new Set<string>();
  const external = new Set<string>();
  const stack = [entry];
  while (stack.length > 0) {
    const file = stack.pop() as string;
    if (visited.has(file)) continue;
    visited.add(file);
    if (!existsSync(file)) continue;
    const source = readFileSync(file, 'utf8');
    for (const spec of staticSpecifiers(source)) {
      if (spec.startsWith('.')) {
        const resolved = resolveRelative(file, spec);
        if (resolved) stack.push(resolved);
        else external.add(`${spec} (unresolved from ${file})`);
      } else {
        external.add(spec);
      }
    }
  }
  return external;
}

describe('the /sveltekit barrel (needs dist/sveltekit/index.js; run npm run package to unskip)', () => {
  it.skipIf(!built)('statically imports no $app/ or $env/ specifier anywhere in its transitive graph', () => {
    const external = walkStaticImportGraph(ENTRY);
    const offenders = [...external].filter((s) => s.startsWith('$app/') || s.startsWith('$env/'));
    expect(offenders).toEqual([]);
  });
});

describe('the other exported subpaths (needs their dist entries; run npm run package to unskip)', () => {
  // A survey, not a gate: `./components` and `./reproductions` both carry a static `$app/`
  // import today (through client-only .svelte components that Wrangler's own esbuild pass never
  // touches, since it cannot even parse a .svelte file without the SvelteKit Vite plugin), so
  // this is informational rather than asserted. `./sveltekit` is the one subpath a raw,
  // server-side, non-Vite bundler is documented to reach directly.
  it.skipIf(!built)('reports which barrels carry a static $app/ or $env/ import today', () => {
    const pkg = JSON.parse(readJsonFile(resolve(ROOT, 'package.json'), 'utf8')) as {
      exports: Record<string, { types?: string; svelte?: string; default?: string; worker?: string } | string>;
    };
    const report: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(pkg.exports)) {
      if (!value || typeof value !== 'object' || typeof value.types !== 'string') continue;
      const jsEntry = value.svelte ?? value.default ?? value.worker;
      if (!jsEntry) continue;
      const entryPath = resolve(ROOT, jsEntry);
      if (!existsSync(entryPath)) continue;
      const external = walkStaticImportGraph(entryPath);
      const offenders = [...external].filter((s) => s.startsWith('$app/') || s.startsWith('$env/'));
      if (offenders.length > 0) report[key] = offenders;
    }
    // Not an assertion on the report's contents (that would just re-encode today's known
    // exceptions as a second gate); printing it is what makes a future regression visible in a
    // test log without failing the whole suite over a subpath this task deliberately leaves alone.
    console.log('static $app/$env import survey:', report);
    expect(report['./sveltekit']).toBeUndefined();
  });
});
