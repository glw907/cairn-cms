// What the starter overlay's tests check, as plain functions over markdown text and source text,
// so a test can show each check failing on a fixture as well as passing on the real overlay.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { walk } from '../walk-files.mjs';
import { STARTER_OVERLAY_DIR } from './emit-template.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** The showcase's own content directory, which the starter overlay replaces in an emitted template. */
export const SHOWCASE_CONTENT_DIR = path.join(repoRoot, 'examples', 'showcase', 'src', 'content');

/**
 * The routes a new site's starter content serves, each prerendered by the template's build.
 * The home page is archive page one, so it covers the archive.
 */
export const EXPECTED_STARTER_ROUTES = [
  '/',
  '/about',
  '/author',
  '/contact',
  '/posts/write-your-first-post',
  '/posts/add-a-page',
  '/posts/add-an-image',
  '/posts/link-to-another-page',
  '/posts/invite-an-editor',
  '/posts/restore-an-earlier-version',
  '/posts/every-element-on-this-site',
];

/**
 * The markdown files under a content directory, as paths relative to it.
 * @param {string} contentDir a `src/content` directory
 * @returns {string[]} relative paths, sorted
 */
export function markdownFilesUnder(contentDir) {
  return walk(contentDir, (file) => file.endsWith('.md'))
    .map((file) => path.relative(contentDir, file).split(path.sep).join('/'))
    .sort();
}

/** The starter overlay's `src/content` directory. */
export const OVERLAY_CONTENT_DIR = path.join(STARTER_OVERLAY_DIR, 'src', 'content');

/**
 * The image sources in a markdown file that point at another host: a markdown image, an HTML
 * `img`, or an `image.src` in the front matter whose address starts with `http(s):` or `//`.
 * @param {string} markdown a content file's text
 * @returns {string[]} each offending address
 */
export function externalImageSources(markdown) {
  const found = [];
  for (const match of markdown.matchAll(/!\[[^\]]*\]\(\s*<?((?:https?:)?\/\/[^)\s>]+)/g)) found.push(match[1]);
  for (const match of markdown.matchAll(/<img\b[^>]*\bsrc=["']((?:https?:)?\/\/[^"']+)/gi)) found.push(match[1]);
  for (const match of markdown.matchAll(/^\s*src:\s*["']?((?:https?:)?\/\/\S+?)["']?\s*$/gm)) found.push(match[1]);
  return found;
}

/**
 * How many times each named directive opens in a markdown file, ignoring fenced code, where a
 * directive can only be shown and never runs.
 * @param {string} markdown a content file's text
 * @param {string[]} names the directive names to count
 * @returns {Map<string, number>} the count for each name
 */
export function directiveCounts(markdown, names) {
  const counts = new Map(names.map((name) => [name, 0]));
  let fence = null;
  for (const line of markdown.split('\n')) {
    const marker = /^\s*(`{3,}|~{3,})/.exec(line)?.[1];
    if (marker) {
      if (fence === null) fence = marker[0];
      else if (marker[0] === fence) fence = null;
      continue;
    }
    if (fence !== null) continue;
    const opened = /^\s*:{2,}([a-z][a-z0-9-]*)/.exec(line)?.[1];
    if (opened && counts.has(opened)) counts.set(opened, (counts.get(opened) ?? 0) + 1);
  }
  return counts;
}

/**
 * The directive names a site's markdown can use: the engine's reserved built-ins, read from the
 * render registry's source, plus every block the showcase's theme registers, read from its
 * `defineBlock` calls. Reading source keeps the list from drifting when either one changes.
 * @returns {Promise<string[]>} the names, in source order
 */
export async function engineDirectiveNames() {
  const registry = await readFile(path.join(repoRoot, 'src', 'lib', 'render', 'registry.ts'), 'utf8');
  const reserved = /RESERVED_DIRECTIVE_NAMES\s*=\s*new Set\(\[([^\]]*)\]\)/.exec(registry)?.[1];
  const builtIns = [...(reserved ?? '').matchAll(/'([^']+)'/g)].map((m) => m[1]);
  const theme = await readFile(
    path.join(repoRoot, 'examples', 'showcase', 'src', 'theme', 'markdown-blocks.ts'),
    'utf8',
  );
  const registered = [...theme.matchAll(/defineBlock\(\{\s*name:\s*'([^']+)'/g)].map((m) => m[1]);
  if (builtIns.length === 0 || registered.length === 0) {
    throw new Error('engineDirectiveNames: read no directive names from the registry or the theme');
  }
  return [...registered, ...builtIns];
}
