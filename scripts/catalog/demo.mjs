// The demo build: a theme's public pages over a content set, built as a site and left as a static
// assets directory with the Wrangler file that deploys it. The Worker has no script, so only the
// prerendered pages are served and an unmatched path answers 404. Nothing here reaches a Cloudflare
// API; the publish step deploys what this leaves.
//
//   DEMO_WORKER=cairn-demo-{id} node scripts/catalog/demo.mjs <themeDir> --out <dir>
//
// The Wrangler file is written only into the output directory and never into the repository.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { isMap, isSeq, parseDocument } from 'yaml';
import { repoRoot } from '../repo-root.mjs';
import { buildSite, composeSite, readManifest } from '../theme/viewer/site.mjs';

/** The name of the release marker each demo page's head carries, which the demo check reads. */
export const MARKER_NAME = 'cairn-theme-release';

/**
 * Write the release marker into a site's `src/app.html`, ahead of SvelteKit's head placeholder, so
 * every rendered page carries it.
 * @param {string} siteDir
 * @param {string} release the `<id>@<version>` the marker names
 */
export function writeMarker(siteDir, release) {
  const file = path.join(siteDir, 'src/app.html');
  const text = readFileSync(file, 'utf8');
  const placeholder = '%sveltekit.head%';
  if (!text.includes(placeholder)) throw new Error(`demo: ${file} has no ${placeholder} to put the release marker before`);
  writeFileSync(file, text.replace(placeholder, `<meta name="${MARKER_NAME}" content="${release}" />\n    ${placeholder}`));
}

/**
 * Whether a menu address points into the admin, which a demo does not have.
 * @param {unknown} url
 * @returns {boolean}
 */
function isAdmin(url) {
  return typeof url === 'string' && (url === '/admin' || url.startsWith('/admin/'));
}

/**
 * Drop every admin entry from a menu list and from each entry's children.
 * @param {import('yaml').YAMLSeq} seq
 */
function pruneMenu(seq) {
  seq.items = seq.items.filter((item) => !(isMap(item) && isAdmin(item.get('url'))));
  for (const item of seq.items) {
    const children = isMap(item) ? item.get('children') : undefined;
    if (isSeq(children)) pruneMenu(children);
  }
}

/**
 * Remove every menu entry whose address is the admin from a site's `src/site/site.config.yaml`.
 * @param {string} siteDir
 */
export function removeAdminMenus(siteDir) {
  const file = path.join(siteDir, 'src/site/site.config.yaml');
  const doc = parseDocument(readFileSync(file, 'utf8'));
  const menus = doc.get('menus');
  if (isMap(menus)) {
    for (const pair of menus.items) if (isSeq(pair.value)) pruneMenu(pair.value);
  }
  writeFileSync(file, doc.toString());
}

/**
 * The patterns of an `.assetsignore` file, each as a test on a path relative to the assets
 * directory. A pattern follows `.gitignore`: one with no inner slash matches a name at any depth,
 * `*` stops at a slash, and a trailing slash is dropped. A negation is refused, since the adapter
 * writes none and a wrong reading would deploy a file the adapter meant to keep back.
 * @param {string} text
 * @returns {RegExp[]}
 */
function ignorePatterns(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'))
    .map((line) => {
      if (line.startsWith('!')) throw new Error(`demo: .assetsignore has the negation "${line}", which the demo build does not apply`);
      const pattern = line.replace(/\/+$/, '');
      const anchored = pattern.replace(/^\/+/, '').includes('/') || pattern.startsWith('/');
      const body = pattern
        .replace(/^\/+/, '')
        .split(/(\*\*|\*|\?)/)
        .map((part) => (part === '**' ? '.*' : part === '*' ? '[^/]*' : part === '?' ? '[^/]' : part.replace(/[.+^${}()|[\]\\]/g, '\\$&')))
        .join('');
      return new RegExp(`${anchored ? '^' : '(?:^|/)'}${body}(?:/|$)`);
    });
}

/**
 * Copy the adapter's output to the assets directory, leaving out what its `.assetsignore` names.
 * @param {string} from the adapter's output directory
 * @param {string} to the assets directory, created fresh
 */
function copyAssets(from, to) {
  const patterns = ignorePatterns(readFileSync(path.join(from, '.assetsignore'), 'utf8'));
  rmSync(to, { recursive: true, force: true });
  cpSync(from, to, {
    recursive: true,
    filter: (source) => {
      const rel = path.relative(from, source).split(path.sep).join('/');
      return rel === '' || !patterns.some((pattern) => pattern.test(rel));
    },
  });
}

/**
 * The compatibility date the site's own Wrangler file sets, so the demo runs on the same one.
 * @param {string} siteDir
 * @returns {string}
 */
function compatibilityDate(siteDir) {
  const text = readFileSync(path.join(siteDir, 'wrangler.jsonc'), 'utf8');
  const date = /"compatibility_date"\s*:\s*"(\d{4}-\d{2}-\d{2})"/.exec(text)?.[1];
  if (!date) throw new Error(`demo: ${siteDir}/wrangler.jsonc sets no compatibility_date`);
  return date;
}

/**
 * Build a theme's demo into `out`: `assets/`, the public pages, and `wrangler.json`, a static-assets
 * Worker with no script, no route, and no `workers.dev` or preview address. A deploy with a
 * per-Worker Editor token is refused when the file names a route, so the custom domain is attached
 * once by hand and every deploy leaves it in place.
 * @param {object} options
 * @param {string} options.root the repository root
 * @param {string} options.themeDir the theme directory
 * @param {string} options.out the output directory; its `assets/` and `wrangler.json` are replaced
 * @param {string} options.worker the Worker's name, with `{id}` standing for the theme id
 * @param {string[]} [options.contentDirs] the content the pages show; the starter overlay when omitted
 * @returns {{ release: string, assets: string, wrangler: string }}
 */
export function buildDemo({ root, themeDir, out, worker, contentDirs = [path.join(root, 'scripts/build/starter-overlay')] }) {
  const manifest = readManifest(themeDir);
  const release = `${manifest.id}@${manifest.version}`;
  const site = composeSite({ root, themeDir, contentDirs });
  try {
    writeMarker(site.dir, release);
    removeAdminMenus(site.dir);
    buildSite(site.dir);
    mkdirSync(out, { recursive: true });
    const assets = path.join(out, 'assets');
    copyAssets(path.join(site.dir, '.svelte-kit/cloudflare'), assets);
    const wrangler = path.join(out, 'wrangler.json');
    const config = {
      name: worker.replaceAll('{id}', manifest.id),
      compatibility_date: compatibilityDate(site.dir),
      assets: { directory: './assets' },
      workers_dev: false,
      preview_urls: false,
    };
    writeFileSync(wrangler, `${JSON.stringify(config, null, 2)}\n`);
    return { release, assets, wrangler };
  } finally {
    site.remove();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { positionals, values } = parseArgs({ allowPositionals: true, options: { out: { type: 'string' } } });
  const worker = process.env.DEMO_WORKER;
  if (positionals.length !== 1 || !values.out || !worker) {
    console.error('usage: DEMO_WORKER=<name, {id} for the theme id> demo.mjs <themeDir> --out <dir>');
    process.exit(2);
  }
  const { release, assets } = buildDemo({ root: repoRoot(import.meta.url), themeDir: path.resolve(positionals[0]), out: path.resolve(values.out), worker });
  console.log(`demo: built ${release} into ${assets}`);
}
