// cairn-cms: the `/sveltekit` barrel is server logic a raw, non-Vite bundler may reach directly,
// the aksailingclub-org 0.95.0 adoption finding (docs/internal/docs-friction-log.md). A site can
// bundle a single barrel export (for example `createD1AuditSink`, wired into a Cloudflare Cron
// handler outside SvelteKit's own build, per scripts/wire-scheduled-handler.mjs's own pattern)
// with Wrangler's own plain esbuild pass, which has no SvelteKit Vite plugin to resolve a virtual
// module. Importing one name from a barrel pulls in every other export's own top-level imports
// too, so a module reachable from the barrel's entry that names `$app/*` or `$env/*` anywhere in
// its build graph breaks that consumer's build, even though `npm run check`, `npm test`, and
// `npm run build` never invoke Wrangler's own bundler and so never see it. A syntax-level walk of
// the static import graph is not the right test for this: esbuild resolves a bare, uncaught
// dynamic `import()` literal the same way it resolves a static import at bundle time (its own
// documented behavior), so a regression can reappear as a dynamic import that a static-import
// grep would miss entirely. This test instead reproduces the real consumer failure mode directly:
// it runs esbuild's own bundler over the built barrel, the same way Wrangler's build does, and
// asserts the bundle succeeds. It needs `dist/sveltekit/index.js`; unlike the older
// static-import-graph version of this test (and packaging-boundary.test.ts, which still uses the
// skip precedent), it fails hard rather than skipping when the package has not been built, so a
// CI run that forgets to package first cannot silently pass this gate.
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { build } from 'esbuild';

const ROOT = resolve(process.cwd());
const ENTRY = resolve(ROOT, 'dist/sveltekit/index.js');

/** The subset of an `exports` map entry this survey reads: whichever runtime condition wins. */
interface ExportsTarget {
  types?: string;
  svelte?: string;
  default?: string;
  worker?: string;
}

/**
 * Bundle `dist/sveltekit/index.js` with esbuild, `platform: 'neutral'` (no built-in externals of
 * its own, so nothing is excused by a platform default), the same way Wrangler's own plain esbuild
 * pass bundles a Worker. `$app/*` and `$env/*` are deliberately never in the external list: they
 * are the exact specifiers a raw esbuild pass cannot resolve (no SvelteKit Vite plugin to supply
 * the virtual module), so marking them external would hide the very regression this test exists to
 * catch. Every other external is a real Node builtin or workers-only npm package the barrel's
 * dependency graph reaches for reasons unrelated to `$app`/`$env` (`gray-matter`'s `fs` read,
 * `@anthropic-ai/sdk`'s `node:*` credential-chain probes and its `standardwebhooks` dependency),
 * each one resolvable in a real Wrangler/workerd bundle (`node:*` through `nodejs_compat`,
 * `standardwebhooks` through `node_modules`) but irrelevant to the question this test asks.
 */
async function bundleBarrel() {
  return build({
    entryPoints: [ENTRY],
    bundle: true,
    platform: 'neutral',
    write: false,
    logLevel: 'silent',
    external: ['node:*', 'fs', 'standardwebhooks'],
  });
}

describe('the /sveltekit barrel bundles cleanly with a plain, non-Vite esbuild pass', () => {
  it('reproduces the real consumer failure mode: esbuild --bundle over dist/sveltekit/index.js resolves $app/environment (or fails closed)', async () => {
    if (!existsSync(ENTRY)) {
      throw new Error(
        'dist/sveltekit/index.js is missing; run `npm run package` before `npm test`. This gate ' +
          'fails hard rather than skipping, so a CI run that forgets to package first cannot pass it silently.',
      );
    }

    const result = await bundleBarrel();
    expect(result.errors).toEqual([]);
  });
});

describe('the other exported subpaths (informational only, not gated)', () => {
  // `./components` and `./reproductions` both carry a static `$app/` import today, reached only
  // through client-only `.svelte` components a raw esbuild pass cannot even parse without the
  // SvelteKit Vite plugin (so their bundle fails for an unrelated reason, and the `$app`/`$env`
  // filter below reports nothing for them). `./sveltekit` is the one subpath a raw, server-side,
  // non-Vite bundler is documented to reach directly, and it is the describe block above's own
  // gate, not this survey's. This is a log, not an assertion, so a future subpath carrying its own
  // reachable `$app`/`$env` import is visible in a test run without failing the whole suite over a
  // subpath this task deliberately leaves alone.
  it('reports which barrels still fail to bundle over an unresolved $app/ or $env/ specifier', async () => {
    if (!existsSync(ENTRY)) return;
    const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')) as {
      exports: Record<string, ExportsTarget | string>;
    };
    const report: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(pkg.exports)) {
      if (!value || typeof value !== 'object' || typeof value.types !== 'string') continue;
      const jsEntry = value.svelte ?? value.default ?? value.worker;
      if (!jsEntry) continue;
      const entryPath = resolve(ROOT, jsEntry);
      if (!existsSync(entryPath)) continue;
      try {
        await build({
          entryPoints: [entryPath],
          bundle: true,
          platform: 'neutral',
          write: false,
          logLevel: 'silent',
          external: ['node:*', 'fs', 'standardwebhooks'],
        });
      } catch (e) {
        const errors = (e as { errors?: { text: string }[] }).errors ?? [];
        const offenders = errors.filter((m) => /Could not resolve "(\$app|\$env)\//.test(m.text)).map((m) => m.text);
        if (offenders.length > 0) report[key] = offenders;
      }
    }
    console.log('esbuild $app/$env bundle survey:', report);
    expect(report['./sveltekit']).toBeUndefined();
  });
});
