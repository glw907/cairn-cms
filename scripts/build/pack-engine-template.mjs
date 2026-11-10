// Writes the root `template/` tree the engine tarball packs: `template/waymark/` is the composed
// Waymark template (bake, the theme lay-in, and the repo overlay) with the setup overlay on top, and
// `template/catalog.json` is the theme catalog. The tree is gitignored and rebuilt on every run.
// npm's packlist drops any file literally named `.gitignore`, so the composed tree's `.gitignore`
// is renamed to `gitignore` last, after the overlay has appended to it.
import { cp, mkdir, readFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { composeTemplate } from './emit-template-dir.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** The setup overlay, copied over the composed tree; its README documents the directory only. */
export const SETUP_OVERLAY_DIR = path.join(repoRoot, 'scripts/build/setup-overlay');

/**
 * Write `template/` under the repo root.
 * @param {{ engineSpec?: string, devSpec?: string }} [options] the specs default to the bake's
 *  own caret specs from the package versions
 * @returns {Promise<string>} the `template/` directory written
 */
export async function packEngineTemplate({ engineSpec, devSpec } = {}) {
  const out = path.join(repoRoot, 'template');
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  const catalogPath = path.join(repoRoot, 'templates/catalog.json');
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  for (const entry of catalog.themes) {
    if (entry.source !== 'engine') {
      throw new Error(`pack-engine-template: catalog entry ${entry.id} has source ${JSON.stringify(entry.source)}, expected "engine"`);
    }
    const scratch = await composeTemplate({ engineSpec, devSpec, theme: entry.id });
    try {
      const dest = path.join(out, entry.path);
      await cp(scratch, dest, { recursive: true });
      await cp(SETUP_OVERLAY_DIR, dest, {
        recursive: true,
        filter: (source) => path.relative(SETUP_OVERLAY_DIR, source) !== 'README.md',
      });
      await rename(path.join(dest, '.gitignore'), path.join(dest, 'gitignore'));
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  }
  await cp(catalogPath, path.join(out, 'catalog.json'));
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // A dev snapshot pins both packages exactly: a caret on `0.99.0-dev.<n>` resolves to the highest
  // 0.99.0 prerelease on the registry, and `dev` sorts below `rc`, so it would pick an rc's backend.
  const { values } = parseArgs({ options: { 'engine-spec': { type: 'string' }, 'dev-spec': { type: 'string' } } });
  const out = await packEngineTemplate({ engineSpec: values['engine-spec'], devSpec: values['dev-spec'] });
  console.log(`pack-engine-template: wrote ${path.relative(repoRoot, out)}/`);
}
