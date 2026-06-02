// Regenerate the committed content manifest from the corpus on disk. Run with `npm run cairn:manifest`.
// It reads the markdown files with fs, builds the manifest with the engine's builder, and writes the
// canonical file the build verifies against. Node 24 runs the TypeScript adapter natively.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializeManifest, parseManifest, parseSiteConfig } from '@glw907/cairn-cms';

// The `@glw907/cairn-cms/delivery` barrel re-exports a `.svelte` component, which plain Node cannot
// load, so reach the builder through the resolved dist path instead (the build still imports it from
// the barrel via Vite). Resolve the package's main entry, then swap to its sibling manifest module.
const distMain = import.meta.resolve('@glw907/cairn-cms');
const { buildSiteManifest } = await import(new URL('./delivery/manifest.js', distMain).href);

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const { cairn } = await import(join(root, 'src/lib/cairn.config.ts'));
const config = parseSiteConfig(readFileSync(join(root, 'src/lib/site.config.yaml'), 'utf8'));

function globOf(dir, prefix) {
  const out = {};
  for (const name of readdirSync(join(root, dir)).filter((n) => n.endsWith('.md'))) {
    out[`${prefix}/${name}`] = readFileSync(join(root, dir, name), 'utf8');
  }
  return out;
}

const globs = {
  posts: globOf('src/content/posts', '/src/content/posts'),
  pages: globOf('src/content/pages', '/src/content/pages'),
};
const manifest = buildSiteManifest(cairn, config, globs);
const out = join(root, 'src/content/.cairn/index.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, serializeManifest(manifest));
parseManifest(readFileSync(out, 'utf8')); // sanity: the file round-trips
console.log(`wrote ${out} with ${manifest.entries.length} entries`);
