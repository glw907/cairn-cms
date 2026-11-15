import { execFile } from 'node:child_process';
import { cp, mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { emitTemplate, STARTER_OVERLAY_DIR } from '../../../scripts/build/emit-template.mjs';
import { stripLayIn } from '../../../scripts/build/bake-template.mjs';
import { layIn } from '../../../scripts/theme/lay-in.mjs';

const showcase = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const COPY_PREFIX = 'cairn-home-copy-';

/** The directory under a copy that the Cloudflare adapter writes, and `wrangler dev` would serve. */
const OUTPUT_SUBDIR = path.join('.svelte-kit', 'cloudflare');

/** The frozen route files a base-routes copy lays over its emitted routes. */
export const BASE_ROUTES_DIR = path.join(showcase, 'e2e', 'fixtures', 'home-base-routes');

/** The golden `/` of a copy with no `home` page, normalized by {@link normalizeBuildNoise}. */
export const HOME_GOLDEN_FILE = path.join(showcase, 'e2e', 'fixtures', 'home-golden', 'index.html');

/** The title the helper writes into `home.md`. */
export const HOME_TITLE = 'Welcome to the fixture site';

/** A post the helper writes, newest first. */
export interface FixturePost {
  /** The file name stem, which the dated routing reads as the post's date and slug. */
  stem: string;
  title: string;
  date: string;
  draft: boolean;
}

/**
 * The posts a copy holds unless `posts` is `false`: four published and one draft, newest first.
 * The draft is the newest, so a list that leaked it would show it first.
 */
export const FIXTURE_POSTS: readonly FixturePost[] = [
  {
    stem: '2026-10-05-the-unfinished-draft',
    title: 'The unfinished draft',
    date: '2026-10-05',
    draft: true,
  },
  {
    stem: '2026-10-04-the-fourth-report',
    title: 'The fourth report',
    date: '2026-10-04',
    draft: false,
  },
  {
    stem: '2026-10-03-the-third-report',
    title: 'The third report',
    date: '2026-10-03',
    draft: false,
  },
  {
    stem: '2026-10-02-the-second-report',
    title: 'The second report',
    date: '2026-10-02',
    draft: false,
  },
  {
    stem: '2026-10-01-the-first-report',
    title: 'The first report',
    date: '2026-10-01',
    draft: false,
  },
];

/** What a copy holds beyond the template's routes and its `contact` page. */
export interface HomeCopyOptions {
  /** The markdown body of `src/content/pages/home.md`; absent writes no `home` page. */
  home?: string;
  /** Whether to write {@link FIXTURE_POSTS}; true when omitted. */
  posts?: boolean;
  /** Whether to lay the frozen routes from {@link BASE_ROUTES_DIR} over the emitted ones. */
  baseRoutes?: boolean;
}

/** Lists every file under `dir`, as paths relative to it. */
async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(dir, path.join(entry.parentPath, entry.name)));
}

function postFile(post: FixturePost): string {
  const lines = ['---', `title: ${post.title}`, `date: ${post.date}`];
  if (post.draft) lines.push('draft: true');
  lines.push('---', `This is ${post.title.toLowerCase()}, written for the home page fixture.`, '');
  return lines.join('\n');
}

/**
 * Builds a template copy the way a new site gets it, with content the helper owns, and returns
 * the build's output directory (the one `wrangler dev` serves). Starts no server.
 * @remarks
 * The copy is the showcase's emit plus the starter overlay, with Waymark laid in and the lay-in
 * stripped from its scripts, and the showcase's `node_modules` symlinked in. The starter posts and
 * the `about` and `author` pages are removed: they link to one another, and the crawl fails on a
 * dangling link. The `contact` page stays. Copies share that one `node_modules`, so build them one
 * after another. The build runs under `TZ=UTC` and without `VITE_CAIRN_E2E` so that a capture and
 * a later test build the same thing. The engine's `dist` must be built.
 * Pass the returned directory to {@link removeCopy} when done.
 */
export async function buildHomeCopy(options: HomeCopyOptions = {}): Promise<string> {
  const { home, posts = true, baseRoutes = false } = options;
  const root = await mkdtemp(path.join(tmpdir(), COPY_PREFIX));
  try {
    await emitTemplate({
      from: showcase,
      to: root,
      engineSpec: 'file:../..',
      devSpec: 'file:../../packages/cairn-cms-dev',
      starterOverlay: STARTER_OVERLAY_DIR,
    });
    layIn(path.join(showcase, '../../themes/waymark'), root);
    const packagePath = path.join(root, 'package.json');
    const pkg = JSON.parse(await readFile(packagePath, 'utf8'));
    stripLayIn(pkg);
    await writeFile(packagePath, JSON.stringify(pkg, null, 2) + '\n');
    await symlink(path.join(showcase, 'node_modules'), path.join(root, 'node_modules'));

    const content = path.join(root, 'src', 'content');
    await rm(path.join(content, 'posts'), { recursive: true, force: true });
    await rm(path.join(content, 'pages', 'about.md'), { force: true });
    await rm(path.join(content, 'pages', 'author.md'), { force: true });
    if (posts) {
      await mkdir(path.join(content, 'posts'));
      for (const post of FIXTURE_POSTS) {
        await writeFile(path.join(content, 'posts', `${post.stem}.md`), postFile(post));
      }
    }
    if (home !== undefined) {
      await writeFile(
        path.join(content, 'pages', 'home.md'),
        ['---', `title: ${HOME_TITLE}`, '---', home, ''].join('\n'),
      );
    }
    if (baseRoutes) {
      for (const rel of await walk(BASE_ROUTES_DIR)) {
        if (!rel.endsWith('.fixture')) continue;
        await cp(
          path.join(BASE_ROUTES_DIR, rel),
          path.join(root, 'src', 'routes', rel.slice(0, -'.fixture'.length)),
        );
      }
    }

    const env: NodeJS.ProcessEnv = { ...process.env, TZ: 'UTC' };
    delete env.VITE_CAIRN_E2E;
    const run = promisify(execFile);
    for (const script of ['cairn:manifest', 'build']) {
      await run('npm', ['run', script], { cwd: root, env, maxBuffer: 64 * 1024 * 1024 });
    }
    return path.join(root, OUTPUT_SUBDIR);
  } catch (error) {
    await rm(root, { recursive: true, force: true });
    throw error;
  }
}

/**
 * Deletes the copy whose output directory {@link buildHomeCopy} returned.
 * @throws When `output` is not a copy's output directory, so a wrong path never deletes a tree.
 */
export async function removeCopy(output: string): Promise<void> {
  const root = path.resolve(output, '..', '..');
  if (
    !path.basename(root).startsWith(COPY_PREFIX) ||
    path.relative(root, output) !== OUTPUT_SUBDIR
  ) {
    throw new Error(`not a home copy output directory: ${output}`);
  }
  await rm(root, { recursive: true, force: true });
}

/**
 * Replaces what two builds of the same tree differ in, so that two such builds compare equal byte
 * for byte.
 * @remarks
 * Four things vary: the content hash in a name under `/_app/immutable/`, the app `version`
 * string, the per-build `__sveltekit_<id>` global, and the hash-named comments Svelte writes for
 * head hydration. Each becomes a placeholder rather than being dropped, so a file's base name
 * (`ArticleView.HASH.css`) and every tag that names a file stay in place. The
 * `rel="modulepreload"` link lines are dropped whole: they are hints for the bundler's chunk
 * graph, which moves whenever any module the build reaches changes (a theme component, say),
 * while the page itself does not. The plain block markers `<!--[-->`, `<!--[-1-->`, `<!--]-->`,
 * and `<!---->` are dropped too: they are invisible hydration anchors, and wrapping markup in a
 * new `{#if}` branch adds or moves a pair without changing what renders. The numbered branch
 * markers `<!--[0-->` and `<!--[1-->` stay, since they record which branch rendered.
 */
export function normalizeBuildNoise(html: string): string {
  return html
    .replace(/^[ \t]*<link [^>\n]*rel="modulepreload"[^>\n]*>\r?\n/gm, '')
    .replace(
      /(_app\/immutable\/[a-z]+\/)(?:([^/"'.\s]+)\.)?[A-Za-z0-9_-]{6,12}\.(js|css)/g,
      (_match, dir: string, name: string | undefined, ext: string) =>
        `${dir}${name ? `${name}.` : ''}HASH.${ext}`,
    )
    .replace(/version: "\d+"/g, 'version: "VERSION"')
    .replace(/__sveltekit_[a-z0-9]+/g, '__sveltekit_ID')
    .replace(/<!--[a-z0-9]{5,}-->/g, '<!--HASH-->')
    .replace(/<!--(?:\[|\[-1|\]|)-->/g, '');
}
