// Emit a deployable cairn-starter template from examples/showcase. The showcase is the single
// source (Reversal 2); this script copies it out, drops the paths the emission manifest excludes,
// and rewrites the workspace-relative engine/dev dependency specs to a packaged engine. CI runs it
// against npm-packed tarballs to prove the scaffolded output still builds (the rot gate). Part C's
// generator reuses the manifest and this transform.
import { cp, readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Rewrite the emitted package.json: rename, repoint the engine and dev-backend specs.
 * @param pkg the parsed showcase package.json
 * @param opts.name the scaffolded site name
 * @param opts.engineSpec the spec to install @glw907/cairn-cms from
 * @param opts.devSpec the spec to install @glw907/cairn-cms-dev from
 */
export function transformPackageJson(pkg, { name, engineSpec, devSpec }) {
  const out = structuredClone(pkg);
  out.name = name;
  if (out.dependencies?.['@glw907/cairn-cms']) out.dependencies['@glw907/cairn-cms'] = engineSpec;
  if (out.devDependencies?.['@glw907/cairn-cms-dev']) out.devDependencies['@glw907/cairn-cms-dev'] = devSpec;
  return out;
}

/** True when rel is an excluded path or sits under an excluded directory. */
export function shouldExclude(rel, exclude) {
  const norm = rel.split(path.sep).join('/');
  return exclude.some((ex) => norm === ex || norm.startsWith(ex + '/'));
}

/**
 * Emit the template tree.
 * @param opts.from the showcase dir
 * @param opts.to the target dir (must not exist or be empty)
 * @param opts.engineSpec @param opts.devSpec @param opts.name passed to transformPackageJson
 */
export async function emitTemplate({ from, to, engineSpec, devSpec, name = 'cairn-site' }) {
  const manifest = JSON.parse(await readFile(path.join(from, '.cairn-template.json'), 'utf8'));
  const exclude = manifest.exclude ?? [];
  // node_modules, the build outputs, and the wrangler/playwright caches are all gitignored generated
  // artifacts; the manifest file itself is consumed by the emitter, not shipped.
  const alwaysSkip = ['node_modules', '.svelte-kit', 'build', '.wrangler', 'test-results', 'playwright-report', '.cairn-template.json'];
  await rm(to, { recursive: true, force: true });
  await mkdir(to, { recursive: true });
  await cp(from, to, {
    recursive: true,
    filter: (src) => {
      const rel = path.relative(from, src);
      if (rel === '') return true;
      const top = rel.split(path.sep)[0];
      if (alwaysSkip.includes(top)) return false;
      return !shouldExclude(rel, exclude);
    },
  });
  const pkg = JSON.parse(await readFile(path.join(from, 'package.json'), 'utf8'));
  await writeFile(
    path.join(to, 'package.json'),
    JSON.stringify(transformPackageJson(pkg, { name, engineSpec, devSpec }), null, 2) + '\n',
  );
  // The lockfile is showcase-specific (file:../.. paths); the emitted site resolves fresh on install.
  if (existsSync(path.join(to, 'package-lock.json'))) await rm(path.join(to, 'package-lock.json'));
  return to;
}

// CLI: node scripts/emit-template.mjs <to> <engineSpec> <devSpec> [name]
if (import.meta.url === `file://${process.argv[1]}`) {
  const [to, engineSpec, devSpec, name] = process.argv.slice(2);
  if (!to || !engineSpec || !devSpec) {
    console.error('usage: emit-template.mjs <to> <engineSpec> <devSpec> [name]');
    process.exit(1);
  }
  const from = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'examples', 'showcase');
  await emitTemplate({ from, to, engineSpec, devSpec, name });
  console.log(`emitted template to ${to}`);
}
