// cairn-cms: rot-proof the /delivery plain-Node guarantee against the EMITTED dist.
// delivery-entry-boundary.test.ts walks the SOURCE import graph, which stays clean even if
// svelte-package rewrites, inlines, or re-paths an import. This file walks the built .js graph for a
// static @sveltejs/kit or .svelte import, because importing dist cannot fail on kit while kit
// resolves from this repo's node_modules. It then imports /delivery and /internal in a fresh
// plain-Node process, outside the vitest transform, so a packaging regression surfaces as a non-zero
// spawn. It needs dist, so it fails when the package has not been built.
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const ROOT = process.cwd();
const DELIVERY = resolve(ROOT, 'dist/delivery/index.js');
const INTERNAL = resolve(ROOT, 'dist/internal.js');

/** The module specifiers of a file's static import and export declarations, dynamic imports excluded. */
function staticSpecifiers(file: string): string[] {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest);
  const specifiers: string[] = [];
  for (const statement of source.statements) {
    if (
      (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) &&
      statement.moduleSpecifier &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      specifiers.push(statement.moduleSpecifier.text);
    }
  }
  return specifiers;
}

function spawnNode(script: string) {
  return spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: tmpdir(),
    env: { PATH: process.env.PATH },
    encoding: 'utf8',
  });
}

describe('packaged /delivery and /internal under plain Node (run npm run package first)', () => {
  it('has the built entries', () => {
    expect(existsSync(DELIVERY), 'missing dist/delivery/index.js; run "npm run package" first').toBe(true);
    expect(existsSync(INTERNAL), 'missing dist/internal.js; run "npm run package" first').toBe(true);
  });

  it('reaches no static @sveltejs/kit or .svelte import from dist/delivery/index.js', () => {
    const seen = new Set<string>();
    const queue = [DELIVERY];
    const offenders: string[] = [];
    while (queue.length > 0) {
      const file = queue.pop() as string;
      if (seen.has(file)) continue;
      seen.add(file);
      for (const specifier of staticSpecifiers(file)) {
        if (specifier === '@sveltejs/kit' || specifier.startsWith('@sveltejs/kit/') || specifier.endsWith('.svelte')) {
          offenders.push(`${relative(ROOT, file)} imports ${specifier}`);
        } else if (specifier.startsWith('.')) {
          queue.push(resolve(dirname(file), specifier));
        }
      }
    }
    expect(offenders).toEqual([]);
    // The walk must cross into the route loaders, the one module that reaches kit at all.
    expect(seen.has(resolve(ROOT, 'dist/delivery/public-routes.js'))).toBe(true);
    expect(seen.size).toBeGreaterThan(10);
  });

  it('imports /delivery with the route loaders and the projections as functions', () => {
    const script = `const d = await import(${JSON.stringify(pathToFileURL(DELIVERY).href)}); if (typeof d.createPublicRoutes !== 'function' || typeof d.buildSiteManifest !== 'function') { console.error('missing export'); process.exit(3); } console.log('DELIVERY_OK');`;
    const out = spawnNode(script);
    expect(out.stderr).toBe('');
    expect(out.status).toBe(0);
    expect(out.stdout).toContain('DELIVERY_OK');
  });

  it('imports /internal with all nine names', () => {
    const script = `const i = await import(${JSON.stringify(pathToFileURL(INTERNAL).href)}); console.log(JSON.stringify({ keys: Object.keys(i).sort(), regexes: [i.HASH_RE, i.R2_EXT_RE].every((r) => r instanceof RegExp), functions: [i.buildSiteManifest, i.formatManifest, i.verifyEntries, i.verifyManifest, i.verifyReferences, i.parseMediaManifest, i.r2Key].every((f) => typeof f === 'function') }));`;
    const out = spawnNode(script);
    expect(out.stderr).toBe('');
    expect(out.status).toBe(0);
    expect(JSON.parse(out.stdout)).toEqual({
      keys: [
        'HASH_RE',
        'R2_EXT_RE',
        'buildSiteManifest',
        'formatManifest',
        'parseMediaManifest',
        'r2Key',
        'verifyEntries',
        'verifyManifest',
        'verifyReferences',
      ],
      regexes: true,
      functions: true,
    });
  });
});
