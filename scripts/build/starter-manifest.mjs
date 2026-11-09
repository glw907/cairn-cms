// Regenerate the starter overlay's content manifest and site facts: `node
// scripts/build/starter-manifest.mjs`. The overlay's `src/content/.cairn/` is committed, generated
// output, and `cairn-manifest` reads a site's concepts from its adapter, so this builds a scratch
// copy of the showcase (its adapter and theme, installed dependencies linked in, its own content
// left out), puts the overlay's content in it, runs `dist/vite/bin.js` there, and copies the
// written `.cairn/` files back. Run `npm run package` first. Run it after any change to the
// overlay's markdown.
import { execFile } from 'node:child_process';
import { cp, mkdir, mkdtemp, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { STARTER_OVERLAY_DIR } from './emit-template.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const showcase = path.join(repoRoot, 'examples', 'showcase');
const SKIPPED = ['node_modules', '.svelte-kit', 'src/content'];

const scratch = await mkdtemp(path.join(tmpdir(), 'cairn-starter-manifest-'));
try {
  await cp(showcase, scratch, {
    recursive: true,
    filter: (src) => !SKIPPED.includes(path.relative(showcase, src).split(path.sep).join('/')),
  });
  await symlink(path.join(showcase, 'node_modules'), path.join(scratch, 'node_modules'));
  const overlayContent = path.join(STARTER_OVERLAY_DIR, 'src', 'content');
  await cp(overlayContent, path.join(scratch, 'src', 'content'), {
    recursive: true,
    filter: (src) => path.relative(overlayContent, src) !== '.cairn',
  });
  await mkdir(path.join(scratch, 'src', 'content', '.cairn'), { recursive: true });
  const { stdout } = await promisify(execFile)(process.execPath, [path.join(repoRoot, 'dist', 'vite', 'bin.js')], {
    cwd: scratch,
  });
  process.stdout.write(stdout);
  await cp(path.join(scratch, 'src', 'content', '.cairn'), path.join(overlayContent, '.cairn'), { recursive: true });
} finally {
  await rm(scratch, { recursive: true, force: true });
}
