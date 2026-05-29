# Nav-tree editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an author edit a site's navigation menu, stored in a git-committed YAML site-config, through a keyboard-accessible reorder tree that commits back through the same GitHub-App pipeline as content.

**Architecture:** Three layers mirror the content stack. A pure, I/O-free `src/lib/nav/` module parses and validates the YAML menu and rewrites one named menu while preserving the rest of the file. A `createNavRoutes(runtime, deps?)` factory returns the `navLoad` and `navSave` functions a site's `/admin/nav` shim calls, built on the same injected token mint and 409 fail-safe as `createContentRoutes`. A `NavTree` Svelte 5 component edits a flat working copy and posts the whole tree as JSON.

**Tech Stack:** SvelteKit 2 (classic `load`/actions), Svelte 5 runes, DaisyUI 5 + Tailwind 4, `@rodrigodagostino/svelte-sortable-list` 2.x (Svelte 5 native, keyboard-accessible reorder), `yaml` 2.x (already a dependency), vitest (node `unit` + workerd `integration` + browser `component` projects).

---

## Background

The first build shipped a nav editor under `legacy/src/lib/` (`nav.ts`, `components/NavTree.svelte`, and the `navLoad`/`navSave` pair in `sveltekit/index.ts`). That build only ever received smoke tests, not real authoring use, so it is a behavioral reference and an accelerator, not a proven artifact to preserve. This plan ports the pure logic (where the YAML key-preserving rewrite is fiddly enough that a working reference saves time) and re-derives the route layer and the component clean against the rebuilt foundation, proving everything with our own tests.

Three things changed under the legacy editor, and the port absorbs each:

| Concern | Legacy | Rebuild (this plan targets) |
|---|---|---|
| Content shape | `adapter.collections[]` filtered by `kind === 'page'` | `runtime.concepts[]`; page-like means `routing.routable && !routing.dated` |
| Permission | `requireCapability(user, 'nav:manage')` | `requireSession` (any signed-in editor), reading `event.locals.editor` |
| Token mint | `installationToken` read `env.GITHUB_APP_*` directly | `mintToken` injected, defaulting to `installationToken(appCredentials(runtime.backend, env))` |
| Reorder UX | native HTML5 drag (`draggable`/`ondrop`), no keyboard path | `svelte-sortable-list` (mouse and keyboard), Indent/Outdent for depth |
| Styling | DaisyUI v4 (`input-bordered`) | DaisyUI v5 (borders by default) |

### What already exists (do not rebuild)

- `NavMenuConfig` in `src/lib/content/types.ts` (`configPath`, `menuName`, `label`, `maxDepth?`), and `runtime.navMenu` on `CairnRuntime` (Plan 02).
- `readRaw(repo, path, token?)`, `listMarkdown(repo, dir, token?)`, `commitFile(repo, path, content, { message, author }, token)`, and `CommitConflictError` (Plan 03).
- `appCredentials(backend, env)`, `installationToken(creds)`, and the `GithubKeyEnv` type (Plan 03).
- `ContentEvent` (the structural event shape) exported from `src/lib/sveltekit/content-routes.ts`, and the `createContentRoutes` patterns this plan mirrors (Plan 05).
- The `component` browser test project and the `cairn-admin` theme (Plan 05).
- `yaml` 2.x is already in `dependencies`.

### Design decisions locked for this plan

1. **Reorder uses `@rodrigodagostino/svelte-sortable-list` 2.x.** It is Svelte 5 / runes native, has no dependencies, and gives keyboard reorder (Space to lift, arrows to move, Space to drop, Escape to cancel), closing the accessibility gap legacy's native drag left. Task 1 verifies it in this toolchain before the component is built.
2. **Depth stays separate from order.** Vertical order comes from the sortable list; nesting depth comes from Indent and Outdent buttons capped at `maxDepth`. The flat-rows-with-depth working model (kept from legacy) rebuilds the nested tree from order plus depth at submit time.
3. **Any signed-in editor may edit the nav**, consistent with content editing. Only editor management stays owner-gated.
4. **The save reuses the content save contract:** validate first (bounce on failure, never touching git), then read-modify-commit with the session editor as author and the 409 fail-safe.
5. **The page picker stays a native `<datalist>`** fed from the page-like concepts. The richer combobox is a deferred feature (spec section 3).

### Shared data shapes (defined once)

Declared in `nav-routes.ts` (Task 3), imported type-only by the component.

```typescript
import type { NavNode } from '../nav/site-config.js';

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
```

---

## Task 1: Verify svelte-sortable-list under Svelte 5

Install the reorder library and prove it mounts and reorders in this toolchain (NodeNext, the browser `component` project) before the `NavTree` component depends on it.

**Files:**
- Modify: `package.json` (dependencies)
- Create: `src/tests/component/sortable-list.test.ts`

- [ ] **Step 1: Install the library**

Run:
```bash
npm install @rodrigodagostino/svelte-sortable-list
```
Expected: it lands in `dependencies` (version 2.x). It has zero transitive dependencies.

- [ ] **Step 2: Check for a required stylesheet**

Run:
```bash
node -e "const p=require('@rodrigodagostino/svelte-sortable-list/package.json'); console.log(JSON.stringify(p.exports,null,2))"
```
Expected: the `exports` map. If it exposes a stylesheet subpath (for example `./styles.css`), note it. Task 5 imports it inside `NavTree.svelte` if one exists; if the package ships no separate stylesheet, no import is needed.

- [ ] **Step 3: Write the compatibility test**

Create `src/tests/component/sortable-list.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { sortItems } from '@rodrigodagostino/svelte-sortable-list';
import SortableProbe from './SortableProbe.svelte';

describe('svelte-sortable-list under Svelte 5', () => {
  it('mounts a sortable list and renders its items', async () => {
    const screen = render(SortableProbe);
    await expect.element(screen.getByText('Alpha')).toBeInTheDocument();
    await expect.element(screen.getByText('Bravo')).toBeInTheDocument();
  });

  it('sortItems moves an item from one index to another', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(sortItems(items, 0, 2).map((i) => i.id)).toEqual(['b', 'c', 'a']);
  });
});
```

Create `src/tests/component/SortableProbe.svelte`:
```svelte
<!-- @component A minimal sortable list proving the library mounts under Svelte 5 runes. -->
<script lang="ts">
  import { SortableList, sortItems } from '@rodrigodagostino/svelte-sortable-list';

  let items = $state([
    { id: 'a', text: 'Alpha' },
    { id: 'b', text: 'Bravo' },
  ]);

  function handleDragEnd(e: { draggedItemIndex: number; targetItemIndex: number | null; isCanceled: boolean }) {
    if (!e.isCanceled && typeof e.targetItemIndex === 'number' && e.draggedItemIndex !== e.targetItemIndex) {
      items = sortItems(items, e.draggedItemIndex, e.targetItemIndex);
    }
  }
</script>

<SortableList.Root ondragend={handleDragEnd}>
  {#each items as item, index (item.id)}
    <SortableList.Item id={item.id} {index}>
      <span>{item.text}</span>
    </SortableList.Item>
  {/each}
</SortableList.Root>
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run --project component src/tests/component/sortable-list.test.ts`
Expected: PASS (2 tests). If the library fails to mount under Svelte 5 (a runes or import error), STOP and report BLOCKED. The fallback is a dependency-free reorder built from Move-up and Move-down buttons (each row gets `aria-label`ed up/down buttons that swap it with its neighbor in the `rows` array); that is keyboard-accessible and needs no library. Do not silently switch; surface the spike result so the component task can be revised.

- [ ] **Step 5: Confirm the other projects still pass**

Run: `npm test`
Expected: unit, integration, and component all green; `npm test` exits 0.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/tests/component/SortableProbe.svelte src/tests/component/sortable-list.test.ts
git commit -m "test(nav): verify svelte-sortable-list mounts under Svelte 5"
```

---

## Task 2: Nav logic module (parse, validate, setMenu)

Port the pure, I/O-free nav logic: validate an untrusted tree, parse the YAML site-config, extract one named menu, and rewrite one menu while preserving every other top-level key.

**Files:**
- Create: `src/lib/nav/site-config.ts`
- Test: `src/tests/unit/nav-site-config.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/unit/nav-site-config.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import {
  validateNavTree,
  NavValidationError,
  parseSiteConfig,
  SiteConfigError,
  extractMenu,
  setMenu,
} from '../../lib/nav/site-config.js';

describe('validateNavTree', () => {
  it('normalizes a nested tree and keeps only known keys', () => {
    const tree = validateNavTree(
      [{ label: 'Home', url: '/', junk: 1 }, { label: 'Guides', children: [{ label: 'Start', url: '/start' }] }],
      2,
    );
    expect(tree).toEqual([
      { label: 'Home', url: '/' },
      { label: 'Guides', children: [{ label: 'Start', url: '/start' }] },
    ]);
  });

  it('keeps a label-only node (no url) as a grouping header', () => {
    expect(validateNavTree([{ label: 'Section' }], 1)).toEqual([{ label: 'Section' }]);
  });

  it('rejects a non-array', () => {
    expect(() => validateNavTree({}, 1)).toThrow(NavValidationError);
  });

  it('rejects an item with no label', () => {
    expect(() => validateNavTree([{ url: '/x' }], 1)).toThrow(/needs a label/);
  });

  it('rejects nesting deeper than maxDepth', () => {
    expect(() => validateNavTree([{ label: 'A', children: [{ label: 'B' }] }], 1)).toThrow(/deeper than 1/);
  });

  it('drops an empty children array rather than keeping the key', () => {
    expect(validateNavTree([{ label: 'A', children: [] }], 2)).toEqual([{ label: 'A' }]);
  });
});

describe('parseSiteConfig', () => {
  it('parses a mapping with a siteName', () => {
    expect(parseSiteConfig('siteName: My Site\n')).toMatchObject({ siteName: 'My Site' });
  });

  it('throws on a non-mapping root', () => {
    expect(() => parseSiteConfig('- a\n- b\n')).toThrow(SiteConfigError);
  });

  it('throws when siteName is missing', () => {
    expect(() => parseSiteConfig('description: x\n')).toThrow(/needs a siteName/);
  });
});

describe('extractMenu', () => {
  it('returns the named menu validated', () => {
    const config = parseSiteConfig('siteName: S\nmenus:\n  primary:\n    - label: Home\n      url: /\n');
    expect(extractMenu(config, 'primary', 2)).toEqual([{ label: 'Home', url: '/' }]);
  });

  it('returns an empty array when the menu is absent', () => {
    expect(extractMenu(parseSiteConfig('siteName: S\n'), 'primary', 2)).toEqual([]);
  });
});

describe('setMenu', () => {
  it('replaces one menu and preserves every other top-level key', () => {
    const raw = 'siteName: S\ndescription: keep me\nmenus:\n  primary:\n    - label: Old\n  footer:\n    - label: Privacy\n      url: /privacy\n';
    const out = setMenu(raw, 'primary', [{ label: 'Home', url: '/' }]);
    const reparsed = parseSiteConfig(out);
    expect(reparsed.description).toBe('keep me');
    expect(extractMenu(reparsed, 'primary', 2)).toEqual([{ label: 'Home', url: '/' }]);
    expect(extractMenu(reparsed, 'footer', 2)).toEqual([{ label: 'Privacy', url: '/privacy' }]);
  });

  it('creates the menus map when the file has none yet', () => {
    const out = setMenu('siteName: S\n', 'primary', [{ label: 'Home', url: '/' }]);
    expect(extractMenu(parseSiteConfig(out), 'primary', 2)).toEqual([{ label: 'Home', url: '/' }]);
  });

  it('throws when the root has no siteName', () => {
    expect(() => setMenu('description: x\n', 'primary', [])).toThrow(SiteConfigError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/nav-site-config.test.ts`
Expected: FAIL. Cannot resolve `site-config.js`.

- [ ] **Step 3: Create `src/lib/nav/site-config.ts`**

```typescript
// The navigation tree and its YAML site-config. A menu lives in the site's git-committed config
// under `menus.<name>`, read at build time by the public layout and edited from /admin/nav, which
// commits the file back through the GitHub-App pipeline. This module is pure: parse, validate, and
// rewrite only. The engine returns data; each site renders the tree with its own markup.
import { parse as parseYaml, parseDocument } from 'yaml';

/** One navigation node. An omitted or empty `url` is a label-only grouping header; no `children` is a leaf. */
export interface NavNode {
  label: string;
  url?: string;
  children?: NavNode[];
}

/** Total node cap across the whole tree, a guard against a runaway payload. */
export const MAX_NAV_NODES = 200;

export class NavValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NavValidationError';
  }
}

/**
 * Validate and normalize an untrusted value into a NavNode[]: arrays only, non-empty labels, depth
 * within `maxDepth` (1 is flat), a bounded node count, and only the three known keys kept. Throws
 * NavValidationError on any violation. Used by navSave before writing.
 */
export function validateNavTree(value: unknown, maxDepth: number): NavNode[] {
  let count = 0;

  function walk(nodes: unknown, depth: number): NavNode[] {
    if (!Array.isArray(nodes)) throw new NavValidationError('Navigation must be a list of items');
    if (depth > maxDepth) throw new NavValidationError(`Navigation is nested deeper than ${maxDepth} levels`);
    return nodes.map((raw) => {
      if (typeof raw !== 'object' || raw === null) throw new NavValidationError('Each item must be an object');
      const item = raw as Record<string, unknown>;
      const label = typeof item.label === 'string' ? item.label.trim() : '';
      if (!label) throw new NavValidationError('Each item needs a label');
      if (++count > MAX_NAV_NODES) throw new NavValidationError('Too many navigation items');
      const node: NavNode = { label };
      if (typeof item.url === 'string' && item.url.trim()) node.url = item.url.trim();
      if (item.children !== undefined) {
        const children = walk(item.children, depth + 1);
        if (children.length) node.children = children;
      }
      return node;
    });
  }

  return walk(value, 1);
}

/**
 * Shape of the YAML site-config file. Unknown keys are ignored so the file can grow without an
 * engine change. Read at build time by the public site.
 */
export interface SiteConfig {
  siteName: string;
  description?: string;
  author?: string;
  url?: string;
  locale?: string;
  /** Named navigation menus, each a NavNode[] (normalized by extractMenu). */
  menus?: Record<string, unknown>;
  [key: string]: unknown;
}

export class SiteConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SiteConfigError';
  }
}

/** Parse the YAML site-config text into a typed object. Throws SiteConfigError on a malformed root. */
export function parseSiteConfig(raw: string): SiteConfig {
  const parsed = parseYaml(raw) as unknown;
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new SiteConfigError('Site config must be a YAML mapping');
  }
  const { siteName } = parsed as SiteConfig;
  if (typeof siteName !== 'string' || !siteName.trim()) {
    throw new SiteConfigError('Site config needs a siteName');
  }
  return parsed as SiteConfig;
}

/** Extract one named menu from a parsed config and validate it. Returns [] when the menu is absent. */
export function extractMenu(config: SiteConfig, name: string, maxDepth: number): NavNode[] {
  const menu = config.menus?.[name];
  if (menu === undefined) return [];
  return validateNavTree(menu, maxDepth);
}

/**
 * Replace one named menu in the YAML site-config text and reserialize, preserving every other
 * top-level key (siteName, other menus, settings). Parses into a Document so the rest of the file
 * round-trips. YAML comments are not preserved (an accepted trade); data keys are. A leaf node
 * serializes without `url`/`children` keys.
 */
export function setMenu(raw: string, name: string, tree: NavNode[]): string {
  const doc = parseDocument(raw);
  if (doc.get('siteName') === undefined) {
    throw new SiteConfigError('Site config must be a mapping with a siteName');
  }
  doc.setIn(['menus', name], tree);
  return doc.toString();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/nav-site-config.test.ts`
Expected: PASS (15 tests).

- [ ] **Step 5: Run svelte-check**

Run: `npm run check`
Expected: 0 errors, 0 warnings.

- [ ] **Step 6: Commit**

```bash
git add src/lib/nav/site-config.ts src/tests/unit/nav-site-config.test.ts
git commit -m "feat(nav): add the YAML site-config parse, validate, and setMenu logic"
```

---

## Task 3: Nav routes factory and navLoad

Create the `createNavRoutes` factory with its read side: `navLoad` reads the committed config, degrades to an empty tree on any read failure, and lists page-like concepts for the URL picker.

**Files:**
- Create: `src/lib/sveltekit/nav-routes.ts`
- Test: `src/tests/unit/nav-routes-load.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/unit/nav-routes-load.test.ts`:
```typescript
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createNavRoutes } from '../../lib/sveltekit/nav-routes.js';
import type { CairnRuntime } from '../../lib/content/types.js';

function runtime(navMenu: CairnRuntime['navMenu']): CairnRuntime {
  const ok = () => ({ ok: true as const, data: {} });
  return {
    siteName: 'T',
    concepts: [
      { id: 'posts', label: 'Posts', dir: 'src/content/posts', routing: { routable: true, dated: true, inFeeds: true }, fields: [], validate: ok },
      { id: 'pages', label: 'Pages', dir: 'src/content/pages', routing: { routable: true, dated: false, inFeeds: false }, fields: [], validate: ok },
    ],
    backend: { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' },
    sender: { from: 'cms@test' },
    renderPreview: (md) => md,
    navMenu,
  };
}

const NAV = { configPath: 'src/lib/site.config.yaml', menuName: 'primary', label: 'Primary nav', maxDepth: 2 };
const deps = { mintToken: () => Promise.resolve('test-token') };

function loadEvent(search = '') {
  return {
    url: new URL(`https://t.example/admin/nav${search}`),
    params: {},
    request: new Request('https://t.example/admin/nav'),
    locals: { editor: { email: 'e@t', displayName: 'E', role: 'editor' as const } },
    platform: { env: { GITHUB_APP_PRIVATE_KEY_B64: 'x' } },
  };
}

afterEach(() => vi.restoreAllMocks());

describe('navLoad', () => {
  it('reads the menu and lists page-like concepts for the picker', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('site.config.yaml')) {
        return new Response('siteName: S\nmenus:\n  primary:\n    - label: Home\n      url: /\n', { status: 200 });
      }
      if (url.includes('/git/trees/')) {
        return new Response(JSON.stringify({ tree: [{ path: 'src/content/pages/about.md', type: 'blob' }], truncated: false }), { status: 200 });
      }
      return new Response('Not Found', { status: 404 });
    }));
    const routes = createNavRoutes(runtime(NAV), deps);
    const data = await routes.navLoad(loadEvent() as never);
    expect(data.menu).toEqual({ name: 'primary', label: 'Primary nav', maxDepth: 2 });
    expect(data.tree).toEqual([{ label: 'Home', url: '/' }]);
    expect(data.pages).toEqual([{ label: 'about', url: '/about' }]);
    expect(data.error).toBeNull();
  });

  it('degrades to an empty tree when the config is missing', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/git/trees/')) return new Response(JSON.stringify({ tree: [], truncated: false }), { status: 200 });
      return new Response('Not Found', { status: 404 });
    }));
    const routes = createNavRoutes(runtime(NAV), deps);
    const data = await routes.navLoad(loadEvent() as never);
    expect(data.tree).toEqual([]);
    expect(data.error).toBeNull();
  });

  it('degrades to an empty tree when the config is unparsable', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('site.config.yaml')) return new Response(': not valid yaml :\n', { status: 200 });
      if (url.includes('/git/trees/')) return new Response(JSON.stringify({ tree: [], truncated: false }), { status: 200 });
      return new Response('Not Found', { status: 404 });
    }));
    const routes = createNavRoutes(runtime(NAV), deps);
    const data = await routes.navLoad(loadEvent() as never);
    expect(data.tree).toEqual([]);
  });

  it('reads the saved flag from the query', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/git/trees/')) return new Response(JSON.stringify({ tree: [], truncated: false }), { status: 200 });
      return new Response('Not Found', { status: 404 });
    }));
    const routes = createNavRoutes(runtime(NAV), deps);
    const data = await routes.navLoad(loadEvent('?saved=1') as never);
    expect(data.saved).toBe(true);
  });

  it('404s when no navMenu is configured', async () => {
    const routes = createNavRoutes(runtime(undefined), deps);
    await expect(routes.navLoad(loadEvent() as never)).rejects.toMatchObject({ status: 404 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/nav-routes-load.test.ts`
Expected: FAIL. Cannot resolve `nav-routes.js`.

- [ ] **Step 3: Create `src/lib/sveltekit/nav-routes.ts`**

```typescript
// The admin nav-editing routes: the load and save a site's /admin/nav shim calls. A factory closes
// over the composed runtime and the GitHub token mint, mirroring createContentRoutes, so the read
// and commit paths are unit-testable against a fetch double with an injected token.
import { redirect, error } from '@sveltejs/kit';
import { appCredentials, type GithubKeyEnv } from '../github/credentials.js';
import { installationToken } from '../github/signing.js';
import { listMarkdown, readRaw, commitFile } from '../github/repo.js';
import { CommitConflictError } from '../github/types.js';
import { parseSiteConfig, extractMenu, setMenu, validateNavTree, type NavNode } from '../nav/site-config.js';
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

  return { navLoad, mintToken, sessionOf, isConflict };
}
```

> Note: `mintToken`, `sessionOf`, and `isConflict` are returned so Task 4's `navSave` can reach them within the closure (the same pattern Plan 05 used for `mintToken`). The barrel re-exports only `createNavRoutes` and the data types.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/nav-routes-load.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/sveltekit/nav-routes.ts src/tests/unit/nav-routes-load.test.ts
git commit -m "feat(nav): nav-routes factory with the read-side navLoad"
```

---

## Task 4: navSave

Add the commit path. `navSave` validates the posted tree (bouncing to the form on failure, never touching git), then read-modify-commits the one menu with the session editor as author and the 409 fail-safe.

**Files:**
- Modify: `src/lib/sveltekit/nav-routes.ts`
- Test: `src/tests/unit/nav-routes-save.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/unit/nav-routes-save.test.ts`:
```typescript
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createNavRoutes } from '../../lib/sveltekit/nav-routes.js';
import type { CairnRuntime } from '../../lib/content/types.js';

function runtime(): CairnRuntime {
  const ok = () => ({ ok: true as const, data: {} });
  return {
    siteName: 'T',
    concepts: [],
    backend: { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' },
    sender: { from: 'cms@test' },
    renderPreview: (md) => md,
    navMenu: { configPath: 'src/lib/site.config.yaml', menuName: 'primary', label: 'Primary nav', maxDepth: 2 },
  };
}

const deps = { mintToken: () => Promise.resolve('test-token') };

function saveEvent(treeJson: string) {
  const body = new URLSearchParams({ tree: treeJson });
  return {
    url: new URL('https://t.example/admin/nav'),
    params: {},
    request: new Request('https://t.example/admin/nav', { method: 'POST', body }),
    locals: { editor: { email: 'ed@t', displayName: 'Ed Editor', role: 'editor' as const } },
    platform: { env: { GITHUB_APP_PRIVATE_KEY_B64: 'x' } },
  };
}

afterEach(() => vi.restoreAllMocks());

describe('navSave', () => {
  it('commits the menu with the session editor as author, then redirects to saved', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (init?.method === 'PUT') return new Response(JSON.stringify({ commit: { sha: 'abc' } }), { status: 200 });
      return new Response('siteName: S\nmenus:\n  primary:\n    - label: Old\n', { status: 200 });
    }));
    const routes = createNavRoutes(runtime(), deps);
    try {
      await routes.navSave(saveEvent(JSON.stringify([{ label: 'Home', url: '/' }])) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { location: string }).location).toBe('/admin/nav?saved=1');
    }
    const put = calls.find((c) => c.init?.method === 'PUT')!;
    expect(put.url).toContain('site.config.yaml');
    const sent = JSON.parse(String(put.init!.body));
    expect(sent.author).toEqual({ name: 'Ed Editor', email: 'ed@t' });
    expect(sent).not.toHaveProperty('committer');
  });

  it('bounces an invalid tree back to the form and never commits', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const routes = createNavRoutes(runtime(), deps);
    try {
      await routes.navSave(saveEvent(JSON.stringify([{ url: '/no-label' }])) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { status: number }).status).toBe(303);
      expect((e as { location: string }).location).toMatch(/\/admin\/nav\?error=.*label/i);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('404s when the config file is gone at save time', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Not Found', { status: 404 })));
    const routes = createNavRoutes(runtime(), deps);
    await expect(routes.navSave(saveEvent(JSON.stringify([{ label: 'Home' }])) as never)).rejects.toMatchObject({ status: 404 });
  });

  it('reports a 409 conflict as a reload prompt without overwriting', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'PUT') return new Response('conflict', { status: 409 });
      return new Response('siteName: S\nmenus:\n  primary:\n    - label: Old\n', { status: 200 });
    }));
    const routes = createNavRoutes(runtime(), deps);
    try {
      await routes.navSave(saveEvent(JSON.stringify([{ label: 'Home', url: '/' }])) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { location: string }).location).toMatch(/error=.*changed%20since/i);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/nav-routes-save.test.ts`
Expected: FAIL. `navSave` is not a function.

- [ ] **Step 3: Add `navSave` to the factory**

In `src/lib/sveltekit/nav-routes.ts`, inside `createNavRoutes`, before the `return`, add:

```typescript
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
```

Add `navSave` to the returned object: `return { navLoad, navSave, mintToken, sessionOf, isConflict };`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/nav-routes-save.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Run the full unit project and svelte-check**

Run: `npx vitest run --project unit && npm run check`
Expected: all green; svelte-check 0 errors, 0 warnings.

- [ ] **Step 6: Commit**

```bash
git add src/lib/sveltekit/nav-routes.ts src/tests/unit/nav-routes-save.test.ts
git commit -m "feat(nav): save action with validation, session author, and 409 fail-safe"
```

---

## Task 5: NavTree component

Build the editor: a flat working model of rows with explicit depth, vertical reorder through `svelte-sortable-list`, Indent/Outdent for depth capped at `maxDepth`, add and remove, the datalist page picker, and a hidden field carrying the rebuilt tree as JSON.

**Files:**
- Create: `src/lib/components/NavTree.svelte`
- Test: `src/tests/component/NavTree.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/component/NavTree.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import NavTree from '../../lib/components/NavTree.svelte';

function data(over = {}) {
  return {
    menu: { name: 'primary', label: 'Primary nav', maxDepth: 2 },
    tree: [
      { label: 'Home', url: '/' },
      { label: 'Guides', children: [{ label: 'Start', url: '/start' }] },
    ],
    pages: [{ label: 'about', url: '/about' }],
    saved: false,
    error: null,
    ...over,
  };
}

function treeFromForm(container: HTMLElement): unknown {
  const field = container.querySelector<HTMLInputElement>('input[name="tree"]')!;
  return JSON.parse(field.value);
}

describe('NavTree', () => {
  it('renders a row per node with its label and url', async () => {
    const screen = render(NavTree, { data: data() });
    await expect.element(screen.getByDisplayValue('Home')).toBeInTheDocument();
    await expect.element(screen.getByDisplayValue('Guides')).toBeInTheDocument();
    await expect.element(screen.getByDisplayValue('Start')).toBeInTheDocument();
  });

  it('serializes the flat rows back into a nested tree in the hidden field', async () => {
    const screen = render(NavTree, { data: data() });
    expect(treeFromForm(screen.container)).toEqual([
      { label: 'Home', url: '/' },
      { label: 'Guides', children: [{ label: 'Start', url: '/start' }] },
    ]);
  });

  it('adds a row', async () => {
    const screen = render(NavTree, { data: data({ tree: [], pages: [] }) });
    await screen.getByRole('button', { name: /add item/i }).click();
    await expect.element(screen.getByDisplayValue('New item')).toBeInTheDocument();
  });

  it('outdent on the nested child flattens it in the serialized tree', async () => {
    const screen = render(NavTree, { data: data() });
    // Two Outdent buttons exist (one per row); the second row is the nested "Start".
    const outdents = screen.container.querySelectorAll<HTMLButtonElement>('button[aria-label="Outdent"]');
    outdents[2].click();
    await expect.poll(() => treeFromForm(screen.container)).toEqual([
      { label: 'Home', url: '/' },
      { label: 'Guides' },
      { label: 'Start', url: '/start' },
    ]);
  });

  it('shows a saved confirmation', async () => {
    const screen = render(NavTree, { data: data({ saved: true }) });
    await expect.element(screen.getByText(/navigation saved/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project component src/tests/component/NavTree.test.ts`
Expected: FAIL. Cannot resolve `NavTree.svelte`.

- [ ] **Step 3: Create `src/lib/components/NavTree.svelte`**

If Task 1 found the library ships a stylesheet subpath, add its import (for example `import '@rodrigodagostino/svelte-sortable-list/styles.css';`) below the component import. If it ships none, omit that line.

```svelte
<!--
@component
The navigation tree editor. It edits a flat working copy of the menu (each row carries an explicit
depth) and posts the whole tree as JSON to the save action. Vertical order comes from
svelte-sortable-list (mouse, and keyboard with Space to lift, arrows to move, Space to drop); depth
comes from the Indent and Outdent buttons, capped at the menu's maxDepth. The engine validates on save.
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import { SortableList, sortItems } from '@rodrigodagostino/svelte-sortable-list';
  import type { NavLoadData } from '../sveltekit/nav-routes.js';
  import type { NavNode } from '../nav/site-config.js';

  interface Props {
    /** The nav load's data: the menu meta, the current tree, page options, and flags. */
    data: NavLoadData;
  }

  let { data }: Props = $props();

  // A flat, ordered working model is simpler to reorder than a recursive one: each row carries an
  // explicit depth, and the nested tree is rebuilt from order plus depth only at submit time.
  interface Row {
    id: string;
    depth: number;
    label: string;
    url: string;
  }

  let nextId = 1;
  function flatten(nodes: NavNode[], depth: number, out: Row[]): Row[] {
    for (const n of nodes) {
      out.push({ id: `row-${nextId++}`, depth, label: n.label, url: n.url ?? '' });
      if (n.children?.length) flatten(n.children, depth + 1, out);
    }
    return out;
  }

  let rows = $state<Row[]>(untrack(() => flatten(data.tree, 0, [])));
  const maxDepthIndex = $derived(data.menu.maxDepth - 1); // depth is 0-based here

  // Rebuild the nested tree from the flat rows by depth, then serialize for the hidden field.
  function toTree(list: Row[]): NavNode[] {
    const root: NavNode[] = [];
    const stack: { depth: number; node: NavNode }[] = [];
    for (const r of list) {
      const node: NavNode = { label: r.label.trim() };
      if (r.url.trim()) node.url = r.url.trim();
      while (stack.length && stack[stack.length - 1].depth >= r.depth) stack.pop();
      if (stack.length) (stack[stack.length - 1].node.children ??= []).push(node);
      else root.push(node);
      stack.push({ depth: r.depth, node });
    }
    return root;
  }

  const treeJson = $derived(JSON.stringify(toTree(rows)));

  function addRow() {
    rows = [...rows, { id: `row-${nextId++}`, depth: 0, label: 'New item', url: '' }];
  }
  function removeRow(id: string) {
    rows = rows.filter((r) => r.id !== id);
  }
  function indent(i: number) {
    // A row may nest at most one level deeper than the row above it, and never past the cap.
    if (i === 0) return;
    const ceiling = Math.min(rows[i - 1].depth + 1, maxDepthIndex);
    if (rows[i].depth < ceiling) rows[i].depth += 1;
  }
  function outdent(i: number) {
    if (rows[i].depth > 0) rows[i].depth -= 1;
  }

  function handleDragEnd(e: { draggedItemIndex: number; targetItemIndex: number | null; isCanceled: boolean }) {
    const { draggedItemIndex, targetItemIndex, isCanceled } = e;
    if (!isCanceled && typeof targetItemIndex === 'number' && draggedItemIndex !== targetItemIndex) {
      rows = sortItems(rows, draggedItemIndex, targetItemIndex);
    }
  }
</script>

<header class="mb-4 flex items-center justify-between">
  <h1 class="text-xl font-semibold">{data.menu.label}</h1>
  <button type="button" class="btn btn-sm" onclick={addRow}>Add item</button>
</header>

{#if data.saved}
  <div role="status" class="alert alert-success mb-4 text-sm">Navigation saved.</div>
{/if}
{#if data.error}
  <div role="alert" class="alert alert-error mb-4 text-sm">{data.error}</div>
{/if}

<form method="POST" action="?/save">
  <input type="hidden" name="tree" value={treeJson} />

  <SortableList.Root ondragend={handleDragEnd}>
    {#each rows as row, index (row.id)}
      <SortableList.Item id={row.id} {index}>
        <div class="flex items-center gap-2 p-2" style={`margin-left:${row.depth * 1.5}rem`}>
          <input class="input input-sm flex-1" placeholder="Label" aria-label="Label" bind:value={row.label} />
          <input
            class="input input-sm flex-1"
            placeholder="/path or https://example.com"
            list="cairn-nav-pages"
            aria-label="URL"
            bind:value={row.url}
          />
          <button type="button" class="btn btn-xs btn-ghost" onclick={() => outdent(index)} aria-label="Outdent">&larr;</button>
          <button type="button" class="btn btn-xs btn-ghost" onclick={() => indent(index)} aria-label="Indent">&rarr;</button>
          <button type="button" class="btn btn-xs btn-ghost text-error" onclick={() => removeRow(row.id)} aria-label={`Remove ${row.label}`}>&times;</button>
        </div>
      </SortableList.Item>
    {/each}
  </SortableList.Root>

  <datalist id="cairn-nav-pages">
    {#each data.pages as p (p.url)}
      <option value={p.url}>{p.label}</option>
    {/each}
  </datalist>

  <div class="mt-4">
    <button type="submit" class="btn btn-primary btn-sm">Save navigation</button>
  </div>
</form>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project component src/tests/component/NavTree.test.ts`
Expected: PASS (5 tests). If `svelte-sortable-list`'s markup nests the slot content so the inputs are not found by `getByDisplayValue`, the query still reaches them (they are real `<input>` elements in the DOM); adjust the `treeFromForm` selector only if the hidden field is not a direct child of the form (it is).

- [ ] **Step 5: Confirm svelte-check and the carta boundary**

Run: `npm run check && npx vitest run --project unit src/tests/unit/carta-boundary.test.ts`
Expected: svelte-check 0/0; the carta boundary still passes (NavTree imports no server module and no carta).

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/NavTree.svelte src/tests/component/NavTree.test.ts
git commit -m "feat(nav): the reorderable nav-tree editor component"
```

---

## Task 6: Admin nav entry, barrels, and export boundary

Wire the nav route into the sidebar, export the new surface from the barrels and the package entry (sites read the menu at build time with these functions), and lock the export surface with a boundary test.

**Files:**
- Modify: `src/lib/sveltekit/content-routes.ts` (add `navLabel` to `LayoutData` and `layoutLoad`)
- Modify: `src/tests/unit/content-routes-layout.test.ts`
- Modify: `src/lib/components/AdminLayout.svelte`
- Modify: `src/tests/component/AdminLayout.test.ts`
- Modify: `src/lib/sveltekit/index.ts`, `src/lib/components/index.ts`, `src/lib/index.ts`
- Test: `src/tests/unit/nav-exports.test.ts`

- [ ] **Step 1: Add `navLabel` to the layout data (write the failing assertion first)**

In `src/tests/unit/content-routes-layout.test.ts`, the `runtime()` helper returns no `navMenu`, so `navLabel` is null there. Add to the first `layoutLoad` test (the one asserting the owner case), after the `canManageEditors` assertion:
```typescript
    expect(data.navLabel).toBeNull();
```
Then add a focused test after the existing `layoutLoad` describe block body:
```typescript
  it('exposes the nav label when a navMenu is configured', () => {
    const rt = runtime();
    rt.navMenu = { configPath: 'x.yaml', menuName: 'primary', label: 'Primary nav', maxDepth: 2 };
    const data = createContentRoutes(rt).layoutLoad(event('/admin/nav', 'editor') as never);
    expect(data.navLabel).toBe('Primary nav');
  });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/content-routes-layout.test.ts`
Expected: FAIL. `navLabel` is undefined.

- [ ] **Step 3: Add `navLabel` to `LayoutData` and `layoutLoad`**

In `src/lib/sveltekit/content-routes.ts`, add the field to the `LayoutData` interface after `canManageEditors`:
```typescript
  /** The nav menu's label when the site configures one; gates the Navigation nav entry. Null otherwise. */
  navLabel: string | null;
```
In `layoutLoad`, add to the returned object after `canManageEditors`:
```typescript
      navLabel: runtime.navMenu?.label ?? null,
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/content-routes-layout.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the Navigation entry to `AdminLayout` (test first)**

In `src/tests/component/AdminLayout.test.ts`, extend the `data()` helper to include `navLabel` (default null), then add a test:
```typescript
  it('shows the navigation link when a nav menu is configured', async () => {
    const screen = render(AdminLayout, { data: { ...data(false), navLabel: 'Primary nav' }, children: child });
    await expect.element(screen.getByRole('link', { name: 'Primary nav' })).toBeInTheDocument();
  });
```
Update the `data()` helper's returned object to include `navLabel: null` so the existing tests still type-check and pass.

- [ ] **Step 6: Run it to verify it fails**

Run: `npx vitest run --project component src/tests/component/AdminLayout.test.ts`
Expected: FAIL. No "Primary nav" link.

- [ ] **Step 7: Render the entry in `AdminLayout.svelte`**

In `src/lib/components/AdminLayout.svelte`, the `LayoutData` import already carries `navLabel`. Change the `navItems` derivation to include the nav entry (any editor) when `data.navLabel` is set:
```typescript
  const navItems: NavItem[] = $derived([
    ...data.concepts.map((c) => ({ href: `/admin/${c.id}`, label: c.label })),
    ...(data.navLabel ? [{ href: '/admin/nav', label: data.navLabel }] : []),
    { href: '/admin/editors', label: 'Editors', owner: true },
  ]);
```

- [ ] **Step 8: Run it to verify it passes**

Run: `npx vitest run --project component src/tests/component/AdminLayout.test.ts`
Expected: PASS.

- [ ] **Step 9: Write the export-boundary test**

Create `src/tests/unit/nav-exports.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import * as sveltekit from '../../lib/sveltekit/index.js';
import * as pkg from '../../lib/index.js';

describe('nav exports', () => {
  it('the sveltekit barrel exports createNavRoutes', () => {
    expect(typeof sveltekit.createNavRoutes).toBe('function');
  });

  it('the package entry exports the nav site-config helpers', () => {
    expect(typeof pkg.parseSiteConfig).toBe('function');
    expect(typeof pkg.extractMenu).toBe('function');
    expect(typeof pkg.setMenu).toBe('function');
    expect(typeof pkg.validateNavTree).toBe('function');
  });
});
```

- [ ] **Step 10: Run it to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/nav-exports.test.ts`
Expected: FAIL. The exports are missing.

- [ ] **Step 11: Extend the barrels and the package entry**

In `src/lib/sveltekit/index.ts`, add after the content-routes exports:
```typescript
export { createNavRoutes } from './nav-routes.js';
export type { NavLoadData, NavPageOption, NavRoutesDeps } from './nav-routes.js';
```
In `src/lib/components/index.ts`, add:
```typescript
export { default as NavTree } from './NavTree.svelte';
```
In `src/lib/index.ts` (the package entry), add the nav site-config surface that sites read the menu with at build time:
```typescript
export {
  parseSiteConfig,
  extractMenu,
  setMenu,
  validateNavTree,
  MAX_NAV_NODES,
  NavValidationError,
  SiteConfigError,
} from './nav/site-config.js';
export type { NavNode, SiteConfig } from './nav/site-config.js';
```

- [ ] **Step 12: Run it to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/nav-exports.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 13: Full suite and check**

Run: `npm test && npm run check`
Expected: unit, integration, and component all green; `npm test` exits 0; svelte-check 0 errors, 0 warnings.

- [ ] **Step 14: Commit**

```bash
git add src/lib/sveltekit/content-routes.ts src/tests/unit/content-routes-layout.test.ts src/lib/components/AdminLayout.svelte src/tests/component/AdminLayout.test.ts src/lib/sveltekit/index.ts src/lib/components/index.ts src/lib/index.ts src/tests/unit/nav-exports.test.ts
git commit -m "feat(nav): wire the nav entry, barrels, and export boundary"
```

---

## Self-review

**Spec coverage (section 7.7):**
- YAML site-config read through the contents API, degrading to an empty tree on a missing or unparsable file: Task 3 (`navLoad`, the catch arms), Task 2 (`parseSiteConfig`/`extractMenu`).
- The `NavTree` component edits the menu: Task 5.
- `navSave` validates, mints a token, reads the current file, applies `setMenu` (replace one menu, preserve other top-level keys), commits with the same author and committer attribution and the same 409 fail-safe: Task 4 (route) and Task 2 (`setMenu`). The committer is `cairn-cms[bot]` because `commitFile` omits the committer (Plan 03), asserted in Task 4 by `not.toHaveProperty('committer')`.
- YAML comments not preserved, data keys preserved: Task 2 `setMenu` doc comment and the round-trip test.
- Keyboard-accessible reorder (spec section 7.6, `svelte-sortable-list`): Task 1 (verification) and Task 5 (use).

**Placeholder scan:** No TBD or TODO. The one conditional (the optional library stylesheet import in Task 5) is resolved by Task 1's `exports` inspection and stated as a concrete yes/no, not a placeholder.

**Type consistency:** `NavNode`, `NavLoadData`, and `NavPageOption` are declared once (Tasks 2 and 3) and imported type-only by the component (Task 5). `mintToken` has one signature, `(env: GithubKeyEnv) => Promise<string>`, shared with `createContentRoutes`. `validateNavTree(value, maxDepth)`, `parseSiteConfig(raw)`, `extractMenu(config, name, maxDepth)`, and `setMenu(raw, name, tree)` keep the same signatures across the module, the routes, and the tests. The route paths are `/admin/nav` with a `?/save` action throughout.

**Legacy discipline:** the pure logic (`site-config.ts`) is ported from `legacy/src/lib/nav.ts` and locked with fresh unit tests. The route layer follows the rebuilt `content-routes` patterns, not legacy's `index.ts`. The component is re-derived clean on DaisyUI v5 with a keyboard-accessible reorder, rather than copying legacy's v4 markup and native drag.

**Deferred, with reason:** the page-picker combobox and command palette (spec section 3); rendering the live nav (sites render their own header from the committed YAML at build time); the site `configPath` wiring (Plan 07 cutover). A future hardening pass can add a per-row validation hint; the engine validates the whole tree on save today.

---

## Execution post-mortem

_(Filled in at pass-end per the cairn-pass consolidation ritual: what was built, what was verified with evidence, decisions locked, and any blockers. Update the `cairn-rebuild-initiative` memory to match.)_
