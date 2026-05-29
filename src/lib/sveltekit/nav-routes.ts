// The admin nav-editing routes: the load and save a site's /admin/nav shim calls. A factory closes
// over the composed runtime and the GitHub token mint, mirroring createContentRoutes, so the read
// and commit paths are unit-testable against a fetch double with an injected token.
import { redirect, error } from '@sveltejs/kit';
import { appCredentials, type GithubKeyEnv } from '../github/credentials.js';
import { installationToken } from '../github/signing.js';
import { listMarkdown, readRaw, commitFile } from '../github/repo.js';
import { CommitConflictError } from '../github/types.js';
import { parseSiteConfig, extractMenu, validateNavTree, setMenu, type NavNode } from '../nav/site-config.js';
import type { CairnRuntime } from '../content/types.js';
import type { ContentEvent } from './content-routes.js';
import type { Editor } from '../auth/types.js';

/** One page option for the URL picker datalist. */
export interface NavPageOption {
  label: string;
  url: string;
}

/** The nav editor's load data: the menu meta, the current tree, page options, and flags. */
export interface NavLoadData {
  menu: { name: string; label: string; maxDepth: number };
  tree: NavNode[];
  pages: NavPageOption[];
  saved: boolean;
  error: string | null;
}

/** Injectable dependencies; tests stub the token mint to avoid signing a real key. */
export interface NavRoutesDeps {
  mintToken?: (env: GithubKeyEnv) => Promise<string>;
}

/** The signed-in editor the guard resolved, or a login redirect. */
function sessionOf(event: ContentEvent): Editor {
  const editor = event.locals.editor;
  if (!editor) throw redirect(303, '/admin/login');
  return editor;
}

/** Match a commit conflict by class and by name (bundling can alias the class identity). */
function isConflict(err: unknown): boolean {
  return err instanceof CommitConflictError || (err as { name?: string } | null)?.name === 'CommitConflictError';
}

export function createNavRoutes(runtime: CairnRuntime, deps: NavRoutesDeps = {}) {
  const mintToken =
    deps.mintToken ?? ((env: GithubKeyEnv) => installationToken(appCredentials(runtime.backend, env)));

  /** List page-like concepts (routable, not dated) for the URL picker. Best-effort per concept. */
  async function pageOptions(token: string): Promise<NavPageOption[]> {
    const pageConcepts = runtime.concepts.filter((c) => c.routing.routable && !c.routing.dated);
    const lists = await Promise.all(
      pageConcepts.map(async (c) => {
        try {
          const files = await listMarkdown(runtime.backend, c.dir, token);
          return files.map((f): NavPageOption => ({ label: f.id, url: `/${f.id}` }));
        } catch {
          return [];
        }
      }),
    );
    return lists.flat();
  }

  /** Load the nav editor. A missing or unparsable config degrades to an empty tree so it still opens. */
  async function navLoad(event: ContentEvent): Promise<NavLoadData> {
    sessionOf(event);
    const config = runtime.navMenu;
    if (!config) throw error(404, 'No navigation menu configured');
    const maxDepth = config.maxDepth ?? 2;
    const menu = { name: config.menuName, label: config.label, maxDepth };

    let token: string;
    try {
      token = await mintToken(event.platform?.env ?? {});
    } catch {
      return { menu, tree: [], pages: [], saved: false, error: 'Could not authenticate with GitHub.' };
    }

    let tree: NavNode[] = [];
    try {
      const raw = await readRaw(runtime.backend, config.configPath, token);
      if (raw !== null) tree = extractMenu(parseSiteConfig(raw), config.menuName, maxDepth);
    } catch {
      // A malformed or unreadable config degrades to an empty tree; the first save writes a clean menu.
      tree = [];
    }

    return {
      menu,
      tree,
      pages: await pageOptions(token),
      saved: event.url.searchParams.get('saved') === '1',
      error: event.url.searchParams.get('error'),
    };
  }

  /** Save the nav tree: validate, then read-modify-commit the one menu with the session editor as author. */
  async function navSave(event: ContentEvent): Promise<never> {
    const editor = sessionOf(event);
    const config = runtime.navMenu;
    if (!config) throw error(404, 'No navigation menu configured');
    const maxDepth = config.maxDepth ?? 2;

    const form = await event.request.formData();
    let tree: NavNode[];
    try {
      tree = validateNavTree(JSON.parse(String(form.get('tree') ?? '[]')), maxDepth);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid navigation';
      throw redirect(303, `/admin/nav?error=${encodeURIComponent(message)}`);
    }

    const token = await mintToken(event.platform?.env ?? {});
    const raw = await readRaw(runtime.backend, config.configPath, token);
    if (raw === null) throw error(404, `Site config not found at ${config.configPath}`);

    try {
      await commitFile(
        runtime.backend,
        config.configPath,
        setMenu(raw, config.menuName, tree),
        { message: `Update ${config.label.toLowerCase()}`, author: { name: editor.displayName, email: editor.email } },
        token,
      );
    } catch (err) {
      if (isConflict(err)) {
        const message = 'The site config changed since you opened it. Reload and reapply your edits.';
        throw redirect(303, `/admin/nav?error=${encodeURIComponent(message)}`);
      }
      throw err;
    }

    throw redirect(303, '/admin/nav?saved=1');
  }

  return { navLoad, navSave, mintToken, sessionOf, isConflict };
}
