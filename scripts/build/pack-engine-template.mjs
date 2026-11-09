// Writes the root `template/` tree the engine tarball packs: `template/waymark/` is the composed
// Waymark template (bake plus the repo overlay) with the setup overlay on top, and
// `template/catalog.json` is the theme catalog. The tree is gitignored and rebuilt on every run.
// npm's packlist drops any file literally named `.gitignore`, so the composed tree's `.gitignore`
// is renamed to `gitignore` last, after the overlay has appended to it.
import { cp, mkdir, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { composeTemplate } from '../../packages/create-cairn-site/scripts/emit-template-dir.mjs';

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
  const scratch = await composeTemplate({ engineSpec, devSpec });
  try {
    const waymark = path.join(out, 'waymark');
    await mkdir(out, { recursive: true });
    await cp(scratch, waymark, { recursive: true });
    await cp(SETUP_OVERLAY_DIR, waymark, {
      recursive: true,
      filter: (source) => path.relative(SETUP_OVERLAY_DIR, source) !== 'README.md',
    });
    await rename(path.join(waymark, '.gitignore'), path.join(waymark, 'gitignore'));
    await cp(path.join(repoRoot, 'templates/catalog.json'), path.join(out, 'catalog.json'));
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = await packEngineTemplate();
  console.log(`pack-engine-template: wrote ${path.relative(repoRoot, out)}/`);
}
