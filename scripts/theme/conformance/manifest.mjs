// Regenerate the conformance set's content manifest and site facts: `node
// scripts/theme/conformance/manifest.mjs`. The set's `src/content/.cairn/` is committed, generated
// output, and `cairn-manifest` reads a site's concepts from its adapter, so this builds a scratch
// copy of the showcase (its adapter and theme, installed dependencies linked in, its own content
// left out), puts the set's content in it, runs `dist/vite/bin.js` there, and returns the written
// `.cairn/` files. Run `npm run package` first. The conformance test imports `buildManifest` to
// compare the result with the committed files; run as a script, this writes them.
import { execFile } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const showcase = path.join(repoRoot, 'examples', 'showcase');
const SKIPPED = ['node_modules', '.svelte-kit', 'src/content'];

/**
 * Build the manifest and site facts for a content directory in a scratch showcase.
 * @param {string} contentDir A `src/content` directory, its `.cairn/` left out.
 * @returns {Promise<{ 'index.json': string, 'site-facts.json': string }>} The generated file texts.
 */
export async function buildManifest(contentDir) {
  const scratch = await mkdtemp(path.join(tmpdir(), 'cairn-conformance-manifest-'));
  try {
    await cp(showcase, scratch, {
      recursive: true,
      filter: (src) => !SKIPPED.includes(path.relative(showcase, src).split(path.sep).join('/')),
    });
    await symlink(path.join(showcase, 'node_modules'), path.join(scratch, 'node_modules'));
    await cp(contentDir, path.join(scratch, 'src', 'content'), {
      recursive: true,
      filter: (src) => path.relative(contentDir, src) !== '.cairn',
    });
    await mkdir(path.join(scratch, 'src', 'content', '.cairn'), { recursive: true });
    await promisify(execFile)(process.execPath, [path.join(repoRoot, 'dist', 'vite', 'bin.js')], { cwd: scratch });
    const written = path.join(scratch, 'src', 'content', '.cairn');
    return {
      'index.json': await readFile(path.join(written, 'index.json'), 'utf8'),
      'site-facts.json': await readFile(path.join(written, 'site-facts.json'), 'utf8'),
    };
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { writeFile } = await import('node:fs/promises');
  const contentDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'src', 'content');
  const built = await buildManifest(contentDir);
  await mkdir(path.join(contentDir, '.cairn'), { recursive: true });
  for (const [file, text] of Object.entries(built)) await writeFile(path.join(contentDir, '.cairn', file), text);
}
