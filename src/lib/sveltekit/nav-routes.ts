// The admin nav-editing routes: the load and save a site's /admin/nav shim calls. A factory closes
// over the composed runtime, mirroring createContentRoutes, so the read and commit paths are
// unit-testable against a fetch double riding the event's locals.backend seam.
import { redirect, error } from '@sveltejs/kit';
import { log } from '../log/index.js';
import { parseSiteConfig, extractMenu, validateNavTree, setMenu, type NavNode } from '../nav/site-config.js';
import { requireEditor, requireEngineAccess } from './guard.js';
import { commitFailure } from './commit-log.js';
import type { CairnRuntime } from '../content/types.js';
import type { Backend } from '../github/backend.js';
import type { ContentEvent } from './content-routes.js';

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

/** Build the nav editor's load and save functions, closed over the composed runtime. */
export function createNavRoutes(runtime: CairnRuntime) {
  /**
   * Resolve the live content backend for one request: the dev double's `event.locals.backend`,
   *  else the production `runtime.backend.connect(env)`. A test rides the same `locals.backend`
   *  seam the dev double uses, so the read and commit paths run with no real token mint.
   */
  function resolveBackend(event: ContentEvent): Backend {
    return event.locals.backend ?? runtime.backend.connect(event.platform?.env ?? {});
  }

  /** List page-like concepts (routable, not dated) for the URL picker. Best-effort per concept. */
  async function pageOptions(backend: Backend): Promise<NavPageOption[]> {
    const pageConcepts = runtime.concepts.filter((c) => c.routing.routable && !c.routing.dated);
    const lists = await Promise.all(
      pageConcepts.map(async (c) => {
        try {
          const files = await backend.readEntries(c.dir, backend.defaultBranch);
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
    const editor = requireEditor(event);
    requireEngineAccess(runtime.access, editor, 'nav');
    const config = runtime.navMenu;
    if (!config) throw error(404, 'No navigation menu configured');
    const maxDepth = config.maxDepth ?? 2;
    const menu = { name: config.menuName, label: config.label, maxDepth };

    const backend = resolveBackend(event);

    let tree: NavNode[] = [];
    let raw: string | null = null;
    try {
      raw = await backend.readFile(config.configPath, backend.defaultBranch);
    } catch {
      // An unreadable config degrades to an empty tree; the first save writes a clean menu.
      raw = null;
    }
    if (raw !== null) {
      try {
        tree = extractMenu(parseSiteConfig(raw), config.menuName, maxDepth);
      } catch (err) {
        // A malformed config keeps the same degrade (the nav page failing closed would be worse
        // for the editor), but the swallow names the operator fault in the log.
        log.error('config.invalid', {
          conditionId: 'config.site-config-invalid',
          error: String(err),
        });
        tree = [];
      }
    }

    return {
      menu,
      tree,
      pages: await pageOptions(backend),
      saved: event.url.searchParams.get('saved') === '1',
      error: event.url.searchParams.get('error'),
    };
  }

  /** Save the nav tree: validate, then read-modify-commit the one menu with the session editor as author. */
  async function navSave(event: ContentEvent): Promise<never> {
    const editor = requireEditor(event);
    requireEngineAccess(runtime.access, editor, 'nav');
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

    const backend = resolveBackend(event);
    // Read the head BEFORE the content, so this expectedHead is at-or-before the bytes the commit
    // merges. The nav write lands on the default branch and triggers a deploy, so it is fail-closed:
    // a concurrent commit to the config moves the head off this value and the commit throws a
    // conflict, surfacing the reload-and-reapply prompt below rather than a silent last-writer-wins.
    const head = await backend.branchHead(backend.defaultBranch);
    const raw = await backend.readFile(config.configPath, backend.defaultBranch);
    if (raw === null) throw error(404, 'Site config not found');

    const commitFields = { concept: 'nav', id: 'site-config', editor: editor.email };
    try {
      await backend.commit(
        backend.defaultBranch,
        [{ path: config.configPath, content: setMenu(raw, config.menuName, tree) }],
        { name: editor.displayName, email: editor.email },
        `Update ${config.label.toLowerCase()}`,
        head ?? undefined,
      );
      log.info('commit.succeeded', commitFields);
    } catch (err) {
      commitFailure(
        commitFields,
        err,
        '/admin/nav',
        'The site config changed since you opened it. Reload and reapply your edits.',
      );
    }

    throw redirect(303, '/admin/nav?saved=1');
  }

  return { navLoad, navSave };
}
