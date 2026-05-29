# Admin UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build cairn's admin surface: the SvelteKit server route functions (list, create, edit, save, the role-gated layout, and `/admin/healthz`) and the DaisyUI admin components (shell, login, confirm, concept list, editor, manage-editors), all on the rebuilt content model and self-owned auth, locked by unit, integration, and real-browser component tests.

**Architecture:** The engine stays fat and the site stays thin. `createContentRoutes(runtime)` returns the `load`/action functions a site's `/admin/**` route shims call, composed against the `CairnRuntime` from Plan 02 and the GitHub backend from Plan 03. Token minting is injected (mirroring Plan 01's `send` injection) so the read/commit functions are unit-testable against a `fetch` double without signing a real key. Components in the `/components` barrel are Svelte 5 runes dressed in DaisyUI v5 and scoped to a self-contained `[data-theme="cairn-admin"]` theme, so the admin looks identical on every host. The save action is where Plan 03's carried follow-ups land: a path confined to the concept directory, an author taken from the verified session, and a fail-safe 409.

**Tech Stack:** SvelteKit 2 (classic `load`/actions), Svelte 5 runes, DaisyUI 5 + Tailwind 4, Carta (behind the `MarkdownEditor` seam, client-only), vitest (node `unit` + workerd `integration` projects), `vitest-browser-svelte` on the Playwright provider (new `component` project).

---

## Background

An admin UI already exists, production-proven, under `legacy/src/lib/`. This plan ports it onto the rebuilt foundation rather than redesigning it. Three things changed underneath it since the legacy build, and every ported file must absorb the change:

| Concern | Legacy | Rebuild (this plan targets) |
|---|---|---|
| Content shape | `adapter.collections[]`, `collection.type`, `collection.kind: 'page' \| 'story'` | `CairnRuntime.concepts[]` (`ConceptDescriptor`: `id`, `label`, `dir`, `routing`, `fields`, `validate`); no `kind` discriminator |
| Auth | better-auth (`better-auth/svelte`, `createAuthClient`, `magicLinkClient`) | self-owned magic-link: login is a form POST to `/admin/auth/request`; confirm is the POST-confirm page from Plan 01 |
| Validation | `collection.validate(...)` **throws** on bad input | `concept.validate(...)` returns a `ValidationResult` (`{ ok: true; data } \| { ok: false; errors }`); the save bounces on `!ok` |
| Edit route | `/admin/edit/[type]/[id]` plus a separate `/admin/save` POST route | `/admin/[concept]/[id]` with a `save` form action on the same route |
| Token mint | `saveCommit` read `env.GITHUB_APP_*` directly | `appCredentials(runtime.backend, env)` plus `installationToken(...)` from Plan 03, injected for tests |

### What already exists (do not re-build)

From Plan 01 (`src/lib/auth/`, `src/lib/sveltekit/`):
- `createAuthGuard()`, `requireSession(event)`, `requireOwner(event)` in `guard.ts`.
- `createAuthRoutes({ branding, send })` in `auth-routes.ts`, returning `requestAction`, `confirmLoad`, `confirmAction`, `logoutAction`. This plan **extends** it with `loginLoad` and widens `confirmLoad`'s return.
- `createEditorRoutes()` in `editors-routes.ts`, returning `editorsLoad`, `addEditorAction`, `removeEditorAction`, `setRoleAction`. The server side of manage-editors is done; this plan adds only the component.
- `RequestContext`, `CookieJar`, `HandleInput` in `types.ts`.

From Plan 02 (`src/lib/content/`):
- `composeRuntime(adapter)` returns a `CairnRuntime` (`siteName`, `concepts`, `backend`, `sender`, `renderPreview`, `registry?`, `navMenu?`, `assets?`).
- `findConcept(concepts, id)`, `frontmatterFromForm(fields, form)`, `validateFields`, `serializeMarkdown`, `parseMarkdown`, `dateInputValue`, `isValidId`, `filenameFromId`, `slugify`.
- Types: `CairnRuntime`, `ConceptDescriptor`, `FrontmatterField`, `ValidationResult`.

From Plan 03 (`src/lib/github/`):
- `listMarkdown(repo, dir, token?)`, `readRaw(repo, path, token?)`, `commitFile(repo, path, content, { message, author }, token)`, which throws `CommitConflictError` on a stale-sha 409.
- `appCredentials(backend, env)` returns `AppCredentials`; `installationToken(creds)` returns a token; `signingSelfTest(appId, privateKeyB64)` returns `{ ok, detail? }`.

From Plan 04 (`src/lib/render/`): the render engine, used by a site's `renderPreview`, not directly here.

### What this plan adds, in dependency order

- `src/tests/component/**` plus the `component` (browser) project in `vitest.config.ts`: the test infrastructure for Svelte components.
- `loginLoad` plus a widened `confirmLoad` in `src/lib/sveltekit/auth-routes.ts`.
- `src/lib/sveltekit/content-routes.ts`: `createContentRoutes(runtime, deps?)` with `layoutLoad`, `indexRedirect`, `listLoad`, `createAction`, `editLoad`, `saveAction`.
- `src/lib/sveltekit/health.ts`: `healthLoad(event, runtime)`.
- `src/lib/components/cairn-admin.css`: the Warm Stone theme.
- `src/lib/components/*.svelte`: `AdminLayout`, `LoginPage`, `ConfirmPage`, `ConceptList`, `MarkdownEditor`, `ComponentPalette`, `EditPage`, `ManageEditors`.
- The `src/lib/components/index.ts` barrel and the `src/lib/sveltekit/index.ts` exports.

### Conventions to match (verified in the current tree)

- Unit tests live at `src/tests/unit/<name>.test.ts`, integration at `src/tests/integration/<name>.test.ts`, and (new) component tests at `src/tests/component/<name>.test.ts`. Tests import implementation with the `.js` extension on the `.ts` path (NodeNext): `import { x } from '../../lib/sveltekit/content-routes.js'`.
- Source modules import siblings with `.js` (`import { findConcept } from '../content/concepts.js'`).
- Svelte components carry a top-of-file `<!-- @component -->` doc comment (spec §12) and JSDoc on each `Props` member.
- Comments explain why, not what; the writing voice is plain (spec §12). `prose-guard` gates prose, so no em dashes in any file.

### Design decisions locked for this plan

1. **Factory, not free functions, for content routes.** The spec sketches `editLoad(event, cairn)`, but the auth layer already uses a factory (`createAuthRoutes`) to inject the email `send` for tests. Content routes mirror it: `createContentRoutes(runtime, { mintToken? })`. A site's shim is still one line: `export const load = routes.editLoad`. The factory closes over `runtime` and the token mint, so unit tests inject a stub token and a `fetch` double instead of signing a real key.

2. **Token minting is injected.** `deps.mintToken ?? ((env) => installationToken(appCredentials(runtime.backend, env)))`. The default does the real crypto inside the request handler (respecting the 1-second startup limit, spec §7.8); tests pass `() => Promise.resolve('test-token')`.

3. **Theme is a self-contained stylesheet, not a host-built DaisyUI theme block.** DaisyUI v5 reads `var(--color-*)` at point of use, so a plain `[data-theme="cairn-admin"] { --color-…: … }` block fully overrides the host's theme through CSS inheritance, with no `@plugin "daisyui/theme"` and no host build cooperation. `AdminLayout` sets `data-theme="cairn-admin"` on its root and imports the stylesheet; the CSS ships as a package side effect (`package.json` already lists `**/*.css` in `sideEffects`). This satisfies spec §7.6 ("every token declared, nothing bleeds in") while keeping the package drop-in.

4. **The editor route owns its save action.** `/admin/[concept]/[id]` has a `?/save` action calling `saveAction`, and a `?/create` action on `/admin/[concept]` calling `createAction`. No separate `/admin/save` route. This is cleaner than the legacy split and keeps the redirect targets concept-shaped.

5. **Playwright E2E (acceptance scenario 14, the golden save path) is deferred to cutover (Plan 07).** The library repo has no host SvelteKit app to run a full browser flow against; the route shims live in the consumer sites. The save path is covered here by `saveAction` unit tests against the `fetch` double, and end-to-end by the manual Firefox smoke (spec §9). Component tests (`vitest-browser-svelte`) cover the components in a real browser.

### Shared data shapes (defined once, referenced by tasks)

These are the `load` return types the components consume. They are declared in `content-routes.ts` (Tasks 3 through 6) and imported type-only by the components.

```typescript
import type { Role } from '../auth/types.js';
import type { FrontmatterField } from '../content/types.js';

/** A sidebar concept entry: just enough to render the nav without shipping validators to the client. */
export interface NavConcept {
  id: string;
  label: string;
}

/** The admin layout's data: site identity, the signed-in user, the nav, and the active path. */
export interface LayoutData {
  siteName: string;
  user: { displayName: string; role: Role };
  concepts: NavConcept[];
  pathname: string;
  /** True for an owner; gates the manage-editors nav entry (spec §7.6). */
  canManageEditors: boolean;
}

/** One row in a concept's list view. */
export interface EntrySummary {
  id: string;
  title: string;
  date: string | null;
  draft: boolean;
}

/** The concept list view's data. */
export interface ListData {
  conceptId: string;
  label: string;
  /** Posts carry a date in the new-entry form; pages do not (concept routing, spec §7.2). */
  dated: boolean;
  entries: EntrySummary[];
  /** A listing failure degrades to an inline message rather than a thrown 500. */
  error: string | null;
  /** A create-form bounce error read from `?error`. */
  formError: string | null;
}

/** The editor's data. `frontmatter` holds form-ready values (dates already `YYYY-MM-DD`). */
export interface EditData {
  conceptId: string;
  id: string;
  label: string;
  fields: FrontmatterField[];
  frontmatter: Record<string, unknown>;
  body: string;
  title: string;
  isNew: boolean;
  saved: boolean;
  error: string | null;
}

/** The `/admin/healthz` payload: never carries secrets, only pass/fail and a coarse detail. */
export interface HealthData {
  ok: boolean;
  checks: { githubAppSigning: { ok: boolean; detail?: string } };
}
```

---

## Task 1: Component test project (real browser)

Stand up the `vitest-browser-svelte` project so later tasks can test Svelte components in a real browser (Svelte 5 fine-grained reactivity is wrong under jsdom, spec §9).

**Files:**
- Modify: `package.json` (devDependencies, scripts)
- Modify: `vitest.config.ts`
- Create: `src/tests/component/Smoke.svelte`
- Create: `src/tests/component/smoke.test.ts`

- [ ] **Step 1: Add the browser test dependencies**

Run:
```bash
npm install -D vitest-browser-svelte @vitest/browser @vitest/browser-playwright playwright
npx playwright install chromium
```
Expected: the four packages land in `devDependencies`; Chromium downloads. `@vitest/browser-playwright` carries the provider factory: vitest 4.1 dropped the old `provider: 'playwright'` string in favor of a factory import (see Step 2).

- [ ] **Step 2: Add the `component` project to `vitest.config.ts`**

Add the svelte plugin import at the top and a third project entry. The full file becomes:

```typescript
import { defineConfig } from 'vitest/config';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { playwright } from '@vitest/browser-playwright';
import path from 'node:path';

// Read committed SQL migrations from Node context (workerd cannot read the FS).
const migrations = await readD1Migrations(path.resolve('migrations'));

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['src/tests/unit/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        plugins: [
          cloudflareTest({
            wrangler: { configPath: './wrangler.test.jsonc' },
            miniflare: { bindings: { TEST_MIGRATIONS: migrations } },
          }),
        ],
        test: {
          name: 'integration',
          include: ['src/tests/integration/**/*.test.ts'],
          setupFiles: ['./src/tests/integration/apply-migrations.ts'],
        },
      },
      {
        plugins: [svelte()],
        test: {
          name: 'component',
          include: ['src/tests/component/**/*.test.ts'],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
```

- [ ] **Step 3: Add a `test:component` script to `package.json`**

In the `scripts` block, after `"test:integration"`, add:
```json
    "test:component": "vitest run --project component"
```

- [ ] **Step 4: Write the smoke component and its failing test**

Create `src/tests/component/Smoke.svelte`:
```svelte
<!-- @component A trivial component proving the browser test project renders Svelte 5. -->
<script lang="ts">
  let { label }: { label: string } = $props();
  let count = $state(0);
</script>

<button onclick={() => count++}>{label}: {count}</button>
```

Create `src/tests/component/smoke.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Smoke from './Smoke.svelte';

describe('component test project', () => {
  it('renders a Svelte 5 component and reacts to a click', async () => {
    const screen = render(Smoke, { label: 'clicks' });
    const button = screen.getByRole('button');
    await expect.element(button).toHaveTextContent('clicks: 0');
    await button.click();
    await expect.element(button).toHaveTextContent('clicks: 1');
  });
});
```

- [ ] **Step 5: Run the component project**

Run: `npm run test:component`
Expected: PASS (1 test). If Playwright complains about a missing browser, re-run `npx playwright install chromium`.

- [ ] **Step 6: Confirm the other projects still pass**

Run: `npm test`
Expected: unit + integration + component all green; the prior 126 tests plus the new smoke.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/tests/component/Smoke.svelte src/tests/component/smoke.test.ts
git commit -m "test(admin): stand up the vitest-browser-svelte component project"
```

---

## Task 2: Auth-page loads (login plus widened confirm)

The login and confirm pages render outside the authed layout, so they need their own `siteName` and an error read from the URL. The branding lives in `createAuthRoutes`, so the loads belong there.

**Files:**
- Modify: `src/lib/sveltekit/auth-routes.ts`
- Test: `src/tests/unit/auth-page-loads.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/unit/auth-page-loads.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { createAuthRoutes } from '../../lib/sveltekit/auth-routes.js';

const branding = { siteName: 'Test Site', from: 'cms@test' };

function event(search = '') {
  const headers: Record<string, string> = {};
  return {
    url: new URL(`https://test.example/admin/login${search}`),
    request: new Request('https://test.example/admin/login'),
    cookies: { get: () => undefined, set() {}, delete() {} },
    locals: {},
    platform: { env: {} },
    setHeaders: (h: Record<string, string>) => Object.assign(headers, h),
    _headers: headers,
  };
}

describe('auth page loads', () => {
  it('loginLoad returns the site name and no error by default', async () => {
    const { loginLoad } = createAuthRoutes({ branding });
    expect(await loginLoad(event() as never)).toEqual({ siteName: 'Test Site', error: null });
  });

  it('loginLoad surfaces the expired error from the query', async () => {
    const { loginLoad } = createAuthRoutes({ branding });
    const data = await loginLoad(event('?error=expired') as never);
    expect(data.error).toBe('expired');
  });

  it('confirmLoad returns the token, site name, error, and sets Referrer-Policy', async () => {
    const { confirmLoad } = createAuthRoutes({ branding });
    const ev = event('?token=abc');
    const data = await confirmLoad(ev as never);
    expect(data).toEqual({ token: 'abc', siteName: 'Test Site', error: null });
    expect(ev._headers['Referrer-Policy']).toBe('no-referrer');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/auth-page-loads.test.ts`
Expected: FAIL. `loginLoad` is not a function; `confirmLoad` returns only `{ token }`.

- [ ] **Step 3: Add `loginLoad` and widen `confirmLoad`**

In `src/lib/sveltekit/auth-routes.ts`, inside `createAuthRoutes`, add `loginLoad` and replace `confirmLoad`:

```typescript
  /** GET /admin/login. Public. Carries the site name and an optional `?error` for the form. */
  function loginLoad(event: RequestContext): { siteName: string; error: string | null } {
    return { siteName: config.branding.siteName, error: event.url.searchParams.get('error') };
  }

  /**
   * GET /admin/auth/confirm. Renders the confirm page and consumes nothing; only the POST
   * verifies. Sets Referrer-Policy: no-referrer so the token does not leak to a referrer.
   */
  function confirmLoad(
    event: RequestContext,
  ): { token: string; siteName: string; error: string | null } {
    event.setHeaders({ 'Referrer-Policy': 'no-referrer' });
    return {
      token: event.url.searchParams.get('token') ?? '',
      siteName: config.branding.siteName,
      error: event.url.searchParams.get('error'),
    };
  }
```

Then add `loginLoad` to the returned object: `return { loginLoad, requestAction, confirmLoad, confirmAction, logoutAction };`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/auth-page-loads.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Confirm the Plan 01 auth tests still pass**

Run: `npx vitest run --project integration`
Expected: the existing auth-confirm integration tests still green (the widened return is additive).

- [ ] **Step 6: Commit**

```bash
git add src/lib/sveltekit/auth-routes.ts src/tests/unit/auth-page-loads.test.ts
git commit -m "feat(admin): add loginLoad and widen confirmLoad with site branding"
```

---

## Task 3: Content routes: module, layout load, index redirect

Create the content-routes factory with its first two functions: the layout load (nav data, role-gated) and the `/admin` index redirect to the first concept.

**Files:**
- Create: `src/lib/sveltekit/content-routes.ts`
- Test: `src/tests/unit/content-routes-layout.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/unit/content-routes-layout.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import type { CairnRuntime } from '../../lib/content/types.js';

function runtime(): CairnRuntime {
  const ok = () => ({ ok: true as const, data: {} });
  return {
    siteName: 'Test Site',
    concepts: [
      { id: 'posts', label: 'Posts', dir: 'src/content/posts', routing: { routable: true, dated: true, inFeeds: true }, fields: [], validate: ok },
      { id: 'pages', label: 'Pages', dir: 'src/content/pages', routing: { routable: true, dated: false, inFeeds: false }, fields: [], validate: ok },
    ],
    backend: { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' },
    sender: { from: 'cms@test' },
    renderPreview: (md) => md,
  };
}

function event(pathname: string, role: 'owner' | 'editor') {
  return {
    url: new URL(`https://test.example${pathname}`),
    params: {},
    request: new Request('https://test.example'),
    locals: { editor: { email: 'e@test', displayName: 'Ed', role } },
    platform: { env: {} },
  };
}

describe('layoutLoad', () => {
  it('returns nav concepts, the user, the active path, and owner capability', () => {
    const routes = createContentRoutes(runtime());
    const data = routes.layoutLoad(event('/admin/posts', 'owner') as never);
    expect(data.siteName).toBe('Test Site');
    expect(data.user).toEqual({ displayName: 'Ed', role: 'owner' });
    expect(data.concepts).toEqual([
      { id: 'posts', label: 'Posts' },
      { id: 'pages', label: 'Pages' },
    ]);
    expect(data.pathname).toBe('/admin/posts');
    expect(data.canManageEditors).toBe(true);
  });

  it('denies the manage-editors capability to an editor', () => {
    const routes = createContentRoutes(runtime());
    const data = routes.layoutLoad(event('/admin/pages', 'editor') as never);
    expect(data.canManageEditors).toBe(false);
  });
});

describe('indexRedirect', () => {
  it('redirects /admin to the first concept', () => {
    const routes = createContentRoutes(runtime());
    expect(() => routes.indexRedirect()).toThrow();
    try {
      routes.indexRedirect();
    } catch (e) {
      expect((e as { status: number; location: string }).status).toBe(307);
      expect((e as { location: string }).location).toBe('/admin/posts');
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/content-routes-layout.test.ts`
Expected: FAIL. Cannot resolve `content-routes.js`.

- [ ] **Step 3: Create the module with `createContentRoutes`, `layoutLoad`, `indexRedirect`**

Create `src/lib/sveltekit/content-routes.ts`. Start with only the imports this task needs (`redirect`, `error`, `findConcept`, and the types); Task 4 restores the rest as it adds the read/commit functions.
```typescript
// The admin content routes: the load and action functions a site's /admin/** shims call.
// A factory closes over the composed runtime and the GitHub token mint, so the read and
// commit paths are unit-testable against a fetch double with an injected token, mirroring the
// email `send` injection in auth-routes. A shim stays one line: `export const load = routes.editLoad`.
import { redirect, error } from '@sveltejs/kit';
import { findConcept } from '../content/concepts.js';
import { appCredentials, type GithubKeyEnv } from '../github/credentials.js';
import { installationToken } from '../github/signing.js';
import type { CairnRuntime, ConceptDescriptor, FrontmatterField } from '../content/types.js';
import type { Editor, Role } from '../auth/types.js';

/** A sidebar concept entry: just enough to render the nav without shipping validators to the client. */
export interface NavConcept {
  id: string;
  label: string;
}

/** The admin layout's data: site identity, the signed-in user, the nav, and the active path. */
export interface LayoutData {
  siteName: string;
  user: { displayName: string; role: Role };
  concepts: NavConcept[];
  pathname: string;
  canManageEditors: boolean;
}

/** One row in a concept's list view. */
export interface EntrySummary {
  id: string;
  title: string;
  date: string | null;
  draft: boolean;
}

/** The concept list view's data. */
export interface ListData {
  conceptId: string;
  label: string;
  dated: boolean;
  entries: EntrySummary[];
  error: string | null;
  formError: string | null;
}

/** The editor's data. `frontmatter` holds form-ready values (dates already `YYYY-MM-DD`). */
export interface EditData {
  conceptId: string;
  id: string;
  label: string;
  fields: FrontmatterField[];
  frontmatter: Record<string, unknown>;
  body: string;
  title: string;
  isNew: boolean;
  saved: boolean;
  error: string | null;
}

/** The structural event the content routes read; a real SvelteKit RequestEvent satisfies it. */
export interface ContentEvent {
  url: URL;
  params: Record<string, string>;
  request: Request;
  locals: { editor?: Editor | null };
  platform?: { env?: GithubKeyEnv };
}

/** Injectable dependencies; tests stub the token mint to avoid signing a real key. */
export interface ContentRoutesDeps {
  /** Mint a GitHub App installation token from the Worker env. Defaults to the real signer. */
  mintToken?: (env: GithubKeyEnv) => Promise<string>;
}

/** The signed-in editor the guard resolved, or a login redirect. Kept local to decouple event shapes. */
function sessionOf(event: ContentEvent): Editor {
  const editor = event.locals.editor;
  if (!editor) throw redirect(303, '/admin/login');
  return editor;
}

/** Look up the concept named by the `[concept]` route param, or a 404. */
function conceptOf(runtime: CairnRuntime, params: Record<string, string>): ConceptDescriptor {
  const concept = findConcept(runtime.concepts, params.concept ?? '');
  if (!concept) throw error(404, `Unknown content type: ${params.concept ?? ''}`);
  return concept;
}

export function createContentRoutes(runtime: CairnRuntime, deps: ContentRoutesDeps = {}) {
  const mintToken =
    deps.mintToken ?? ((env: GithubKeyEnv) => installationToken(appCredentials(runtime.backend, env)));

  /** Layout load for every admin page: the nav, the user, and the active path. */
  function layoutLoad(event: ContentEvent): LayoutData {
    const editor = sessionOf(event);
    return {
      siteName: runtime.siteName,
      user: { displayName: editor.displayName, role: editor.role },
      concepts: runtime.concepts.map((c) => ({ id: c.id, label: c.label })),
      pathname: event.url.pathname,
      canManageEditors: editor.role === 'owner',
    };
  }

  /** Redirect /admin to the first concept's list (spec §7.6: land on the first concept). */
  function indexRedirect(): never {
    const first = runtime.concepts[0];
    if (!first) throw error(404, 'No content types configured');
    throw redirect(307, `/admin/${first.id}`);
  }

  return { layoutLoad, indexRedirect, mintToken };
}
```

> Note: `mintToken`, `conceptOf`, and `sessionOf` are used by the functions Tasks 4 through 6 add to this same factory; `conceptOf`/`sessionOf` are file-scope helpers, `mintToken` is closed over. `mintToken` is returned only so later functions can reach it within the closure; the barrel does not re-export it.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/content-routes-layout.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Run `svelte-check`**

Run: `npm run check`
Expected: no errors. `conceptOf` is unused until Task 4; if `svelte-check` flags it, prefix it with a line comment noting Task 4 consumes it, or add Task 4's `listLoad` in the same pass. Prefer landing Task 4 immediately after so the helper is live.

- [ ] **Step 6: Commit**

```bash
git add src/lib/sveltekit/content-routes.ts src/tests/unit/content-routes-layout.test.ts
git commit -m "feat(admin): content-routes factory with layout load and index redirect"
```

---

## Task 4: Content routes: list load and create action

`listLoad` lists a concept's markdown files through the Git Trees API, then reads each file's frontmatter for the row's title/date/draft, degrading gracefully. `createAction` validates a new entry's id and redirects to the editor, refusing to clobber an existing file.

**Files:**
- Modify: `src/lib/sveltekit/content-routes.ts`
- Test: `src/tests/unit/content-routes-list.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/unit/content-routes-list.test.ts`:
```typescript
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import type { CairnRuntime } from '../../lib/content/types.js';

function runtime(): CairnRuntime {
  const ok = () => ({ ok: true as const, data: {} });
  return {
    siteName: 'T',
    concepts: [
      { id: 'posts', label: 'Posts', dir: 'src/content/posts', routing: { routable: true, dated: true, inFeeds: true }, fields: [], validate: ok },
    ],
    backend: { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' },
    sender: { from: 'cms@test' },
    renderPreview: (md) => md,
  };
}

const deps = { mintToken: () => Promise.resolve('test-token') };

function listEvent(params: Record<string, string>, search = '') {
  return {
    url: new URL(`https://t.example/admin/posts${search}`),
    params,
    request: new Request('https://t.example'),
    locals: { editor: { email: 'e@t', displayName: 'E', role: 'editor' as const } },
    platform: { env: { GITHUB_APP_PRIVATE_KEY_B64: 'x' } },
  };
}

afterEach(() => vi.restoreAllMocks());

describe('listLoad', () => {
  it('lists entries with title, date, and draft from each file frontmatter', async () => {
    const tree = {
      tree: [
        { path: 'src/content/posts/2026-05-hello.md', type: 'blob' },
        { path: 'src/content/posts/2026-04-older.md', type: 'blob' },
      ],
      truncated: false,
    };
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/git/trees/')) return new Response(JSON.stringify(tree), { status: 200 });
      if (url.includes('hello')) return new Response('---\ntitle: Hello\ndate: 2026-05-01\ndraft: true\n---\nbody', { status: 200 });
      return new Response('---\ntitle: Older\ndate: 2026-04-01\n---\nbody', { status: 200 });
    }));

    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.listLoad(listEvent({ concept: 'posts' }) as never);
    expect(data.conceptId).toBe('posts');
    expect(data.dated).toBe(true);
    expect(data.entries[0]).toMatchObject({ id: '2026-05-hello', title: 'Hello', date: '2026-05-01', draft: true });
    expect(data.entries[1]).toMatchObject({ id: '2026-04-older', title: 'Older', draft: false });
    expect(data.error).toBeNull();
  });

  it('degrades to an inline error when the listing fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('boom', { status: 500 })));
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.listLoad(listEvent({ concept: 'posts' }) as never);
    expect(data.entries).toEqual([]);
    expect(data.error).toMatch(/could not load/i);
  });

  it('surfaces a create-form error from the query', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ tree: [], truncated: false }), { status: 200 })));
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.listLoad(listEvent({ concept: 'posts' }, '?error=Bad+slug') as never);
    expect(data.formError).toBe('Bad slug');
  });
});

describe('createAction', () => {
  function createEvent(form: Record<string, string>) {
    const body = new URLSearchParams(form);
    return {
      url: new URL('https://t.example/admin/posts'),
      params: { concept: 'posts' },
      request: new Request('https://t.example/admin/posts', { method: 'POST', body }),
      locals: { editor: { email: 'e@t', displayName: 'E', role: 'editor' as const } },
      platform: { env: { GITHUB_APP_PRIVATE_KEY_B64: 'x' } },
    };
  }

  it('redirects to the editor for a fresh slug', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Not Found', { status: 404 })));
    const routes = createContentRoutes(runtime(), deps);
    try {
      await routes.createAction(createEvent({ title: 'Hello World', slug: '2026-05-hello-world', date: '2026-05-01' }) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { status: number }).status).toBe(303);
      expect((e as { location: string }).location).toBe('/admin/posts/2026-05-hello-world?new=1');
    }
  });

  it('bounces back with an error for an invalid slug', async () => {
    const routes = createContentRoutes(runtime(), deps);
    try {
      await routes.createAction(createEvent({ title: 'X', slug: 'Bad Slug!' }) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { status: number }).status).toBe(303);
      expect((e as { location: string }).location).toMatch(/\/admin\/posts\?error=/);
    }
  });

  it('refuses to clobber an existing file', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('exists', { status: 200 })));
    const routes = createContentRoutes(runtime(), deps);
    try {
      await routes.createAction(createEvent({ title: 'X', slug: '2026-05-existing' }) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { location: string }).location).toMatch(/error=.*already%20exists/i);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/content-routes-list.test.ts`
Expected: FAIL. `listLoad`/`createAction` are not functions.

- [ ] **Step 3: Add the imports and `listLoad`, `createAction`**

In `content-routes.ts`, add these imports below the existing ones:
```typescript
import { parseMarkdown, dateInputValue } from '../content/frontmatter.js';
import { isValidId, slugify, filenameFromId } from '../content/ids.js';
import { listMarkdown, readRaw } from '../github/repo.js';
```
Inside `createContentRoutes`, before the `return`, add:

```typescript
  /** Read a file's frontmatter for its list row, degrading to the id on any read failure. */
  async function summarize(file: { id: string; path: string }, token: string): Promise<EntrySummary> {
    try {
      const raw = await readRaw(runtime.backend, file.path, token);
      if (raw === null) return { id: file.id, title: file.id, date: null, draft: false };
      const { frontmatter } = parseMarkdown(raw);
      const title = typeof frontmatter.title === 'string' && frontmatter.title.trim() ? frontmatter.title : file.id;
      const date = dateInputValue(frontmatter.date) || null;
      return { id: file.id, title, date, draft: frontmatter.draft === true };
    } catch {
      return { id: file.id, title: file.id, date: null, draft: false };
    }
  }

  /** List a concept's entries. A listing failure degrades to an inline error, not a thrown 500. */
  async function listLoad(event: ContentEvent): Promise<ListData> {
    sessionOf(event);
    const concept = conceptOf(runtime, event.params);
    const formError = event.url.searchParams.get('error');
    const base = { conceptId: concept.id, label: concept.label, dated: concept.routing.dated, formError };
    let token: string;
    try {
      token = await mintToken(event.platform?.env ?? {});
    } catch {
      return { ...base, entries: [], error: 'Could not authenticate with GitHub.' };
    }
    try {
      const files = await listMarkdown(runtime.backend, concept.dir, token);
      const entries = await Promise.all(files.map((f) => summarize(f, token)));
      return { ...base, entries, error: null };
    } catch {
      return { ...base, entries: [], error: 'Could not load this content type from GitHub.' };
    }
  }

  /** Create a new entry: validate the slug, refuse to clobber, and redirect to the editor. */
  async function createAction(event: ContentEvent): Promise<never> {
    sessionOf(event);
    const concept = conceptOf(runtime, event.params);
    const form = await event.request.formData();
    const raw = String(form.get('slug') ?? '').trim() || slugify(String(form.get('title') ?? ''));
    const bounce = (msg: string): never => {
      throw redirect(303, `/admin/${concept.id}?error=${encodeURIComponent(msg)}`);
    };
    if (!isValidId(raw)) bounce('Enter a valid slug: lowercase letters, numbers, and hyphens.');

    const token = await mintToken(event.platform?.env ?? {});
    const existing = await readRaw(runtime.backend, `${concept.dir}/${filenameFromId(raw)}`, token);
    if (existing !== null) bounce('An entry with that slug already exists.');

    throw redirect(303, `/admin/${concept.id}/${raw}?new=1`);
  }
```

Add `listLoad` and `createAction` to the returned object.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/content-routes-list.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/sveltekit/content-routes.ts src/tests/unit/content-routes-list.test.ts
git commit -m "feat(admin): content list load and create action"
```

---

## Task 5: Content routes: edit load

`editLoad` opens a file for editing: it reads the raw markdown, parses frontmatter into form-ready values, and handles the `?new=1` blank-document case without a 404.

**Files:**
- Modify: `src/lib/sveltekit/content-routes.ts`
- Test: `src/tests/unit/content-routes-edit.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/unit/content-routes-edit.test.ts`:
```typescript
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import type { CairnRuntime } from '../../lib/content/types.js';

function runtime(): CairnRuntime {
  const ok = () => ({ ok: true as const, data: {} });
  return {
    siteName: 'T',
    concepts: [
      {
        id: 'posts', label: 'Posts', dir: 'src/content/posts',
        routing: { routable: true, dated: true, inFeeds: true },
        fields: [
          { type: 'text', name: 'title', label: 'Title', required: true },
          { type: 'date', name: 'date', label: 'Date' },
        ],
        validate: ok,
      },
    ],
    backend: { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' },
    sender: { from: 'cms@test' },
    renderPreview: (md) => md,
  };
}

const deps = { mintToken: () => Promise.resolve('test-token') };

function editEvent(id: string, search = '') {
  return {
    url: new URL(`https://t.example/admin/posts/${id}${search}`),
    params: { concept: 'posts', id },
    request: new Request('https://t.example'),
    locals: { editor: { email: 'e@t', displayName: 'E', role: 'editor' as const } },
    platform: { env: { GITHUB_APP_PRIVATE_KEY_B64: 'x' } },
  };
}

afterEach(() => vi.restoreAllMocks());

describe('editLoad', () => {
  it('loads an existing file with parsed, form-ready frontmatter and body', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('---\ntitle: Hello\ndate: 2026-05-01\n---\nThe body.', { status: 200 })));
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.editLoad(editEvent('2026-05-hello') as never);
    expect(data).toMatchObject({
      conceptId: 'posts', id: '2026-05-hello', label: 'Posts', title: 'Hello',
      body: 'The body.', isNew: false, saved: false, error: null,
    });
    expect(data.frontmatter.title).toBe('Hello');
    expect(data.frontmatter.date).toBe('2026-05-01');
  });

  it('returns a blank document for ?new=1 when the file is missing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Not Found', { status: 404 })));
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.editLoad(editEvent('2026-05-fresh', '?new=1') as never);
    expect(data.isNew).toBe(true);
    expect(data.body).toBe('');
    expect(data.title).toBe('2026-05-fresh');
  });

  it('404s an unknown existing file that is not new', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Not Found', { status: 404 })));
    const routes = createContentRoutes(runtime(), deps);
    await expect(routes.editLoad(editEvent('missing') as never)).rejects.toMatchObject({ status: 404 });
  });

  it('rejects an invalid id with a 400', async () => {
    const routes = createContentRoutes(runtime(), deps);
    await expect(routes.editLoad(editEvent('Bad Id!') as never)).rejects.toMatchObject({ status: 400 });
  });

  it('reads saved and error flags from the query', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('---\ntitle: Hi\n---\nx', { status: 200 })));
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.editLoad(editEvent('hi', '?saved=1&error=Nope') as never);
    expect(data.saved).toBe(true);
    expect(data.error).toBe('Nope');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/content-routes-edit.test.ts`
Expected: FAIL. `editLoad` is not a function.

- [ ] **Step 3: Add `editLoad`**

In `content-routes.ts`, inside `createContentRoutes`, add:

```typescript
  /** Coerce parsed frontmatter to the form-ready values the editor inputs expect. */
  function formValues(fields: FrontmatterField[], frontmatter: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const field of fields) {
      const value = frontmatter[field.name];
      if (field.type === 'date') out[field.name] = dateInputValue(value);
      else if (field.type === 'boolean') out[field.name] = value === true;
      else if (field.type === 'tags' || field.type === 'freetags') out[field.name] = Array.isArray(value) ? value.map(String) : [];
      else out[field.name] = typeof value === 'string' ? value : value == null ? '' : String(value);
    }
    return out;
  }

  /** Open a file for editing. A `?new=1` miss yields a blank document; any other miss is a 404. */
  async function editLoad(event: ContentEvent): Promise<EditData> {
    sessionOf(event);
    const concept = conceptOf(runtime, event.params);
    const id = event.params.id ?? '';
    if (!isValidId(id)) throw error(400, 'Invalid entry id');
    const isNew = event.url.searchParams.get('new') === '1';
    const token = await mintToken(event.platform?.env ?? {});
    const raw = await readRaw(runtime.backend, `${concept.dir}/${filenameFromId(id)}`, token);
    if (raw === null && !isNew) throw error(404, 'Entry not found');

    const parsed = raw === null ? { frontmatter: {}, body: '' } : parseMarkdown(raw);
    const title = typeof parsed.frontmatter.title === 'string' && parsed.frontmatter.title.trim() ? parsed.frontmatter.title : id;
    return {
      conceptId: concept.id,
      id,
      label: concept.label,
      fields: concept.fields,
      frontmatter: formValues(concept.fields, parsed.frontmatter),
      body: parsed.body,
      title,
      isNew,
      saved: event.url.searchParams.get('saved') === '1',
      error: event.url.searchParams.get('error'),
    };
  }
```

Add `editLoad` to the returned object.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/content-routes-edit.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/sveltekit/content-routes.ts src/tests/unit/content-routes-edit.test.ts
git commit -m "feat(admin): content edit load with blank-new and 404 paths"
```

---

## Task 6: Content routes: save action (Plan 03 follow-ups land here)

`saveAction` is the commit path. It absorbs Plan 03's three carried follow-ups: the commit `path` is confined to `${concept.dir}/${filenameFromId(id)}` built from an `isValidId` id (the App token can write anywhere, so an unvalidated path could overwrite CI config); the `author` comes from the verified session, never request input; and the 409 is matched both by `instanceof CommitConflictError` and by `err.name === 'CommitConflictError'` as a bundling-alias fallback. Validation uses the `ValidationResult` contract: `!ok` bounces to the form and never reaches git.

**Files:**
- Modify: `src/lib/sveltekit/content-routes.ts`
- Test: `src/tests/unit/content-routes-save.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/unit/content-routes-save.test.ts`:
```typescript
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import { CommitConflictError } from '../../lib/github/types.js';
import type { CairnRuntime, ValidationResult } from '../../lib/content/types.js';

function runtime(validate: (fm: Record<string, unknown>, body: string) => ValidationResult): CairnRuntime {
  return {
    siteName: 'T',
    concepts: [
      {
        id: 'posts', label: 'Posts', dir: 'src/content/posts',
        routing: { routable: true, dated: true, inFeeds: true },
        fields: [{ type: 'text', name: 'title', label: 'Title', required: true }],
        validate,
      },
    ],
    backend: { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' },
    sender: { from: 'cms@test' },
    renderPreview: (md) => md,
  };
}

const deps = { mintToken: () => Promise.resolve('test-token') };

function saveEvent(id: string, form: Record<string, string>) {
  const body = new URLSearchParams(form);
  return {
    url: new URL(`https://t.example/admin/posts/${id}`),
    params: { concept: 'posts', id },
    request: new Request(`https://t.example/admin/posts/${id}`, { method: 'POST', body }),
    locals: { editor: { email: 'ed@t', displayName: 'Ed Editor', role: 'editor' as const } },
    platform: { env: { GITHUB_APP_PRIVATE_KEY_B64: 'x' } },
  };
}

afterEach(() => vi.restoreAllMocks());

describe('saveAction', () => {
  it('commits a valid edit with the session editor as author, then redirects to saved', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (init?.method === 'PUT') return new Response(JSON.stringify({ commit: { sha: 'abc' } }), { status: 200 });
      return new Response('Not Found', { status: 404 }); // fileSha lookup: new file
    }));
    const routes = createContentRoutes(runtime(() => ({ ok: true, data: { title: 'Hi' } })), deps);
    try {
      await routes.saveAction(saveEvent('2026-05-hi', { title: 'Hi', body: 'Hello' }) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { location: string }).location).toBe('/admin/posts/2026-05-hi?saved=1');
    }
    const put = calls.find((c) => c.init?.method === 'PUT')!;
    expect(put.url).toContain('src/content/posts/2026-05-hi.md');
    const sent = JSON.parse(String(put.init!.body));
    expect(sent.author).toEqual({ name: 'Ed Editor', email: 'ed@t' });
    expect(sent).not.toHaveProperty('committer');
  });

  it('bounces invalid frontmatter back to the form and never commits', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const routes = createContentRoutes(runtime(() => ({ ok: false, errors: { title: 'Title is required' } })), deps);
    try {
      await routes.saveAction(saveEvent('2026-05-x', { title: '', body: 'b' }) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { status: number }).status).toBe(303);
      expect((e as { location: string }).location).toMatch(/error=.*Title/);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects an invalid id before any commit', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const routes = createContentRoutes(runtime(() => ({ ok: true, data: {} })), deps);
    await expect(routes.saveAction(saveEvent('Bad Id!', { title: 'x', body: 'b' }) as never)).rejects.toMatchObject({ status: 400 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports a 409 conflict as a reload prompt without overwriting', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'PUT') return new Response('conflict', { status: 409 });
      return new Response(JSON.stringify({ sha: 'old' }), { status: 200 });
    }));
    const routes = createContentRoutes(runtime(() => ({ ok: true, data: { title: 'Hi' } })), deps);
    try {
      await routes.saveAction(saveEvent('2026-05-hi', { title: 'Hi', body: 'b' }) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { location: string }).location).toMatch(/error=.*changed%20since/i);
    }
  });

  it('matches a conflict by name even if the class identity differs', async () => {
    const routes = createContentRoutes(runtime(() => ({ ok: true, data: { title: 'Hi' } })), {
      mintToken: () => Promise.resolve('t'),
    });
    // Throw a look-alike: a plain Error carrying the class name, to exercise the name-based branch.
    vi.stubGlobal('fetch', vi.fn(async () => {
      const e = new Error('x') as Error & { name: string };
      e.name = 'CommitConflictError';
      throw e;
    }));
    try {
      await routes.saveAction(saveEvent('2026-05-hi', { title: 'Hi', body: 'b' }) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { location?: string }).location).toMatch(/error=.*changed%20since/i);
    }
  });
});

it('CommitConflictError is importable for the instanceof branch', () => {
  expect(new CommitConflictError('p')).toBeInstanceOf(Error);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/content-routes-save.test.ts`
Expected: FAIL. `saveAction` is not a function.

- [ ] **Step 3: Add the imports and `saveAction`**

In `content-routes.ts`, add to the imports:
```typescript
import { frontmatterFromForm, serializeMarkdown } from '../content/frontmatter.js';
import { commitFile } from '../github/repo.js';
import { CommitConflictError } from '../github/types.js';
```
(Combine the `frontmatter.js` and `repo.js` imports with the existing ones rather than duplicating the module specifiers.) Inside `createContentRoutes`, add:

```typescript
  /** Match a commit conflict by class and by name (bundling can alias the class identity). */
  function isConflict(err: unknown): boolean {
    return err instanceof CommitConflictError || (err as { name?: string } | null)?.name === 'CommitConflictError';
  }

  /** Save an edit: validate, then commit with the session editor as author. Fails safe on 409. */
  async function saveAction(event: ContentEvent): Promise<never> {
    const editor = sessionOf(event);
    const concept = conceptOf(runtime, event.params);
    const id = event.params.id ?? '';
    // Confine the commit path to the concept dir, built from a validated id (the App token can
    // write anywhere in the repo). Reject before touching GitHub.
    if (!isValidId(id)) throw error(400, 'Invalid entry id');
    const path = `${concept.dir}/${filenameFromId(id)}`;

    const form = await event.request.formData();
    const body = String(form.get('body') ?? '');
    const isNew = form.get('new') === '1';
    const suffix = isNew ? '&new=1' : '';

    const result = concept.validate(frontmatterFromForm(concept.fields, form), body);
    if (!result.ok) {
      const message = Object.values(result.errors)[0] ?? 'Invalid frontmatter';
      throw redirect(303, `/admin/${concept.id}/${id}?error=${encodeURIComponent(message)}${suffix}`);
    }

    const markdown = serializeMarkdown(result.data, body);
    const token = await mintToken(event.platform?.env ?? {});
    try {
      await commitFile(
        runtime.backend,
        path,
        markdown,
        { message: `Update ${concept.label.toLowerCase()}: ${id}`, author: { name: editor.displayName, email: editor.email } },
        token,
      );
    } catch (err) {
      if (isConflict(err)) {
        const message = 'This file changed since you opened it. Reload and reapply your edits.';
        throw redirect(303, `/admin/${concept.id}/${id}?error=${encodeURIComponent(message)}${suffix}`);
      }
      throw err;
    }
    throw redirect(303, `/admin/${concept.id}/${id}?saved=1`);
  }
```

Add `saveAction` to the returned object.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/content-routes-save.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Run the full unit project and `svelte-check`**

Run: `npx vitest run --project unit && npm run check`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/sveltekit/content-routes.ts src/tests/unit/content-routes-save.test.ts
git commit -m "feat(admin): save action with confined path, session author, and 409 fail-safe"
```

---

## Task 7: Health check load

`/admin/healthz` signs a dummy JWT through the real signing path so a broken PKCS#1-to-PKCS#8 conversion is caught early (spec §7.8, scenario 21). It returns pass/fail only, never the key.

**Files:**
- Create: `src/lib/sveltekit/health.ts`
- Test: `src/tests/unit/health.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/unit/health.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { healthLoad } from '../../lib/sveltekit/health.js';
import type { CairnRuntime } from '../../lib/content/types.js';

function runtime(): CairnRuntime {
  return {
    siteName: 'T',
    concepts: [],
    backend: { owner: 'o', repo: 'r', branch: 'main', appId: '123', installationId: '2' },
    sender: { from: 'cms@test' },
    renderPreview: (md) => md,
  };
}

function event(env: Record<string, unknown>) {
  return { platform: { env } };
}

describe('healthLoad', () => {
  it('reports a failure when the key is unset, without throwing', async () => {
    const data = await healthLoad(event({}) as never, runtime());
    expect(data.ok).toBe(false);
    expect(data.checks.githubAppSigning.ok).toBe(false);
  });

  it('reports a failure with a coarse detail for a bad key, never the key itself', async () => {
    const data = await healthLoad(event({ GITHUB_APP_PRIVATE_KEY_B64: 'bm90LWEta2V5' }) as never, runtime());
    expect(data.ok).toBe(false);
    expect(data.checks.githubAppSigning.detail).toBeTruthy();
    expect(JSON.stringify(data)).not.toContain('bm90LWEta2V5');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/health.test.ts`
Expected: FAIL. Cannot resolve `health.js`.

- [ ] **Step 3: Create `health.ts`**

Create `src/lib/sveltekit/health.ts`:
```typescript
// GET /admin/healthz. Signs a dummy JWT through the real App-signing path so a broken
// PKCS#1-to-PKCS#8 conversion is caught early (spec §7.8). The payload is pass/fail and a
// coarse detail only; it never carries the key or a token.
import { signingSelfTest } from '../github/signing.js';
import type { CairnRuntime } from '../content/types.js';
import type { GithubKeyEnv } from '../github/credentials.js';

/** The `/admin/healthz` payload. */
export interface HealthData {
  ok: boolean;
  checks: { githubAppSigning: { ok: boolean; detail?: string } };
}

/** Run the signing self-test against the configured App id and the Worker's key secret. */
export async function healthLoad(
  event: { platform?: { env?: GithubKeyEnv } },
  runtime: CairnRuntime,
): Promise<HealthData> {
  const key = event.platform?.env?.GITHUB_APP_PRIVATE_KEY_B64;
  const githubAppSigning = key
    ? await signingSelfTest(runtime.backend.appId, key)
    : { ok: false, detail: 'GITHUB_APP_PRIVATE_KEY_B64 is not configured' };
  return { ok: githubAppSigning.ok, checks: { githubAppSigning } };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/health.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/sveltekit/health.ts src/tests/unit/health.test.ts
git commit -m "feat(admin): healthz load via the App signing self-test"
```

---

## Task 8: Carta server-boundary guard test

Before any component imports Carta, lock the rule that no server-reachable module imports `carta-md`, so Carta and Shiki stay client-only and off the Worker (spec §7.8, scenario 19).

**Files:**
- Test: `src/tests/unit/carta-boundary.test.ts`

- [ ] **Step 1: Write the test (it passes immediately, then guards future tasks)**

Create `src/tests/unit/carta-boundary.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

// Server-reachable engine code: everything a Worker can import. The components barrel and the
// .svelte files are client-only and excluded; Carta belongs there, not here.
const SERVER_DIRS = ['src/lib/sveltekit', 'src/lib/github', 'src/lib/auth', 'src/lib/content', 'src/lib/render'];

function tsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...tsFiles(full));
    else if (name.endsWith('.ts')) out.push(full);
  }
  return out;
}

describe('Carta stays off the server', () => {
  it('no server-reachable module imports carta-md', () => {
    const offenders: string[] = [];
    for (const dir of SERVER_DIRS) {
      for (const file of tsFiles(dir)) {
        if (/from\s+['"]carta-md['"]/.test(readFileSync(file, 'utf8'))) offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the engine entry does not import carta-md', () => {
    expect(/from\s+['"]carta-md['"]/.test(readFileSync('src/lib/index.ts', 'utf8'))).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/carta-boundary.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 3: Commit**

```bash
git add src/tests/unit/carta-boundary.test.ts
git commit -m "test(admin): guard the Carta server boundary"
```

---

## Task 9: Warm Stone theme plus AdminLayout shell

The theme is a self-contained `[data-theme="cairn-admin"]` stylesheet; `AdminLayout` sets `data-theme` on its root, imports the stylesheet, and renders the DaisyUI drawer-and-navbar shell with a data-driven, role-gated nav.

**Files:**
- Create: `src/lib/components/cairn-admin.css`
- Create: `src/lib/components/AdminLayout.svelte`
- Test: `src/tests/component/AdminLayout.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/component/AdminLayout.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { createRawSnippet } from 'svelte';
import AdminLayout from '../../lib/components/AdminLayout.svelte';

const child = createRawSnippet(() => ({ render: () => '<p>page body</p>' }));

function data(canManageEditors: boolean) {
  return {
    siteName: 'Test Site',
    user: { displayName: 'Ed', role: canManageEditors ? ('owner' as const) : ('editor' as const) },
    concepts: [{ id: 'posts', label: 'Posts' }, { id: 'pages', label: 'Pages' }],
    pathname: '/admin/posts',
    canManageEditors,
  };
}

describe('AdminLayout', () => {
  it('applies the cairn-admin theme and renders the concept nav and child', async () => {
    const screen = render(AdminLayout, { data: data(true), children: child });
    await expect.element(screen.getByText('page body')).toBeInTheDocument();
    await expect.element(screen.getByRole('link', { name: 'Posts' })).toBeInTheDocument();
    await expect.element(screen.getByRole('link', { name: 'Pages' })).toBeInTheDocument();
    expect(document.querySelector('[data-theme="cairn-admin"]')).not.toBeNull();
  });

  it('shows the manage-editors link to an owner', async () => {
    const screen = render(AdminLayout, { data: data(true), children: child });
    await expect.element(screen.getByRole('link', { name: /editors/i })).toBeInTheDocument();
  });

  it('hides the manage-editors link from an editor', async () => {
    const screen = render(AdminLayout, { data: data(false), children: child });
    await expect.element(screen.getByRole('link', { name: /editors/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project component src/tests/component/AdminLayout.test.ts`
Expected: FAIL. Cannot resolve `AdminLayout.svelte`.

- [ ] **Step 3: Create the theme stylesheet**

Create `src/lib/components/cairn-admin.css` (Warm Stone: warm-gray neutrals at OKLCH hue near 75, violet accent, light only; every v5 token declared so nothing bleeds in from the host):
```css
/* Warm Stone: the cairn admin theme. Self-contained, since DaisyUI v5 reads these vars at point
   of use, so this fully overrides the host's theme with no @plugin and no host build step. */
[data-theme='cairn-admin'] {
  color-scheme: light;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;

  --color-base-100: oklch(98.5% 0.004 75);
  --color-base-200: oklch(96% 0.005 75);
  --color-base-300: oklch(92% 0.008 75);
  --color-base-content: oklch(28% 0.012 75);

  --color-primary: oklch(52% 0.2 293);
  --color-primary-content: oklch(98% 0.012 293);
  --color-secondary: oklch(45% 0.02 75);
  --color-secondary-content: oklch(98% 0.004 75);
  --color-accent: oklch(58% 0.16 300);
  --color-accent-content: oklch(98% 0.012 300);
  --color-neutral: oklch(32% 0.012 75);
  --color-neutral-content: oklch(96% 0.004 75);

  --color-info: oklch(60% 0.12 240);
  --color-info-content: oklch(98% 0.012 240);
  --color-success: oklch(58% 0.12 150);
  --color-success-content: oklch(98% 0.012 150);
  --color-warning: oklch(75% 0.15 70);
  --color-warning-content: oklch(26% 0.05 70);
  --color-error: oklch(58% 0.2 25);
  --color-error-content: oklch(98% 0.012 25);

  --radius-selector: 0.5rem;
  --radius-field: 0.5rem;
  --radius-box: 0.75rem;
  --size-selector: 0.25rem;
  --size-field: 0.25rem;
  --border: 1px;
  --depth: 1;
  --noise: 0;
}
```

- [ ] **Step 4: Create `AdminLayout.svelte`**

Create `src/lib/components/AdminLayout.svelte`:
```svelte
<!--
@component
The admin shell: a DaisyUI drawer-and-navbar that wraps every authed admin page. The nav is
data-driven from the enabled concepts and role-gated (owners see the manage-editors entry). The
root sets `data-theme="cairn-admin"` and imports the self-contained Warm Stone theme, so the
admin looks identical on every host regardless of the site's own theme.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { LayoutData } from '../sveltekit/content-routes.js';
  import './cairn-admin.css';

  interface Props {
    /** The layout load's data: site name, user, nav concepts, active path, owner capability. */
    data: LayoutData;
    /** The page body. */
    children: Snippet;
  }

  let { data, children }: Props = $props();

  interface NavItem {
    href: string;
    label: string;
    owner?: boolean;
  }

  const navItems: NavItem[] = $derived([
    ...data.concepts.map((c) => ({ href: `/admin/${c.id}`, label: c.label })),
    { href: '/admin/editors', label: 'Editors', owner: true },
  ]);

  const visibleNav = $derived(navItems.filter((item) => !item.owner || data.canManageEditors));

  function isActive(href: string): boolean {
    return data.pathname === href || data.pathname.startsWith(`${href}/`);
  }
</script>

<div data-theme="cairn-admin" class="drawer lg:drawer-open min-h-screen bg-base-200 text-base-content">
  <input id="cairn-drawer" type="checkbox" class="drawer-toggle" />

  <div class="drawer-content flex flex-col">
    <div class="navbar bg-base-100 border-b border-base-300">
      <div class="flex-none lg:hidden">
        <label for="cairn-drawer" aria-label="Open menu" class="btn btn-square btn-ghost">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </label>
      </div>
      <div class="flex-1 px-2 font-semibold">{data.siteName}</div>
      <div class="flex-none px-2 text-sm opacity-70">{data.user.displayName}</div>
    </div>

    <main class="flex-1 p-4 lg:p-8">
      {@render children()}
    </main>
  </div>

  <div class="drawer-side">
    <label for="cairn-drawer" aria-label="Close menu" class="drawer-overlay"></label>
    <nav class="bg-base-100 min-h-full w-64 border-r border-base-300 p-4">
      <div class="menu-title mb-2 px-2 text-xs uppercase tracking-wide opacity-60">Content</div>
      <ul class="menu menu-lg w-full">
        {#each visibleNav as item (item.href)}
          <li>
            <a href={item.href} class:menu-active={isActive(item.href)} aria-current={isActive(item.href) ? 'page' : undefined}>
              {item.label}
            </a>
          </li>
        {/each}
      </ul>
      <form method="POST" action="/admin/auth/logout" class="mt-6 px-2">
        <button type="submit" class="btn btn-ghost btn-sm btn-block">Sign out</button>
      </form>
    </nav>
  </div>
</div>
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run --project component src/tests/component/AdminLayout.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/cairn-admin.css src/lib/components/AdminLayout.svelte src/tests/component/AdminLayout.test.ts
git commit -m "feat(admin): Warm Stone theme and the drawer-navbar shell"
```

---

## Task 10: LoginPage and ConfirmPage

The login page is a plain form POST to the page's default action (`requestAction`), showing a neutral success message that never leaks allowlist membership. The confirm page renders the scanner-safe POST-confirm button from Plan 01.

**Files:**
- Create: `src/lib/components/LoginPage.svelte`
- Create: `src/lib/components/ConfirmPage.svelte`
- Test: `src/tests/component/LoginPage.test.ts`
- Test: `src/tests/component/ConfirmPage.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/tests/component/LoginPage.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import LoginPage from '../../lib/components/LoginPage.svelte';

describe('LoginPage', () => {
  it('renders an email form posting to the request action', async () => {
    const screen = render(LoginPage, { data: { siteName: 'Test Site', error: null }, form: null });
    await expect.element(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: /send|sign in/i })).toBeInTheDocument();
  });

  it('shows a neutral success message after a request', async () => {
    const screen = render(LoginPage, { data: { siteName: 'Test Site', error: null }, form: { sent: true } });
    await expect.element(screen.getByText(/check your email/i)).toBeInTheDocument();
  });
});
```

Create `src/tests/component/ConfirmPage.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ConfirmPage from '../../lib/components/ConfirmPage.svelte';

describe('ConfirmPage', () => {
  it('renders a POST confirm form carrying the token', async () => {
    const screen = render(ConfirmPage, { data: { token: 'tok123', siteName: 'Test Site', error: null } });
    await expect.element(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    expect(document.querySelector('input[name="token"]')).toHaveValue('tok123');
  });

  it('shows an error when the link was invalid', async () => {
    const screen = render(ConfirmPage, { data: { token: '', siteName: 'Test Site', error: 'expired' } });
    await expect.element(screen.getByText(/expired|invalid/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run --project component src/tests/component/LoginPage.test.ts src/tests/component/ConfirmPage.test.ts`
Expected: FAIL. Components not found.

- [ ] **Step 3: Create `LoginPage.svelte`**

Create `src/lib/components/LoginPage.svelte`:
```svelte
<!--
@component
The magic-link sign-in page. A plain form POST to the page's default action (the engine's
`requestAction`); no client SDK. The success message is identical whether or not the email is on
the allowlist, so the page never leaks membership (spec §7.1).
-->
<script lang="ts">
  import './cairn-admin.css';

  interface Props {
    /** The login load's data: the site name and an optional error. */
    data: { siteName: string; error: string | null };
    /** The action result: `sent` is true once a request was accepted. */
    form: { sent?: boolean } | null;
  }

  let { data, form }: Props = $props();
</script>

<div data-theme="cairn-admin" class="bg-base-200 text-base-content flex min-h-screen items-center justify-center p-4">
  <div class="rounded-box border border-base-300 bg-base-100 w-full max-w-sm p-6 shadow">
    <h1 class="mb-1 text-lg font-semibold">Sign in to {data.siteName}</h1>
    <p class="mb-4 text-sm opacity-70">Enter your email and we'll send a sign-in link.</p>

    {#if form?.sent}
      <div role="status" class="alert alert-success text-sm">
        Check your email for a sign-in link. It expires in 10 minutes.
      </div>
    {:else}
      {#if data.error}
        <div role="alert" class="alert alert-error mb-3 text-sm">That link expired. Request a new one.</div>
      {/if}
      <form method="POST" class="flex flex-col gap-3">
        <label class="form-control">
          <span class="label-text mb-1">Email</span>
          <input
            type="email"
            name="email"
            required
            autocomplete="email"
            aria-label="Email"
            class="input input-bordered w-full"
            placeholder="you@example.com"
          />
        </label>
        <button type="submit" class="btn btn-primary">Send sign-in link</button>
      </form>
    {/if}
  </div>
</div>
```

- [ ] **Step 4: Create `ConfirmPage.svelte`**

Create `src/lib/components/ConfirmPage.svelte`:
```svelte
<!--
@component
The scanner-safe confirm page. A GET renders this static "Confirm sign-in" button with the token
in a hidden field and consumes nothing; only the explicit POST verifies (spec §7.1). JS-free.
-->
<script lang="ts">
  import './cairn-admin.css';

  interface Props {
    /** The confirm load's data: the token to submit, the site name, and an optional error. */
    data: { token: string; siteName: string; error: string | null };
  }

  let { data }: Props = $props();
</script>

<div data-theme="cairn-admin" class="bg-base-200 text-base-content flex min-h-screen items-center justify-center p-4">
  <div class="rounded-box border border-base-300 bg-base-100 w-full max-w-sm p-6 text-center shadow">
    <h1 class="mb-4 text-lg font-semibold">Sign in to {data.siteName}</h1>
    {#if data.error || !data.token}
      <div role="alert" class="alert alert-error text-sm">This sign-in link is invalid or expired.</div>
      <a href="/admin/login" class="btn btn-ghost btn-sm mt-4">Request a new link</a>
    {:else}
      <form method="POST">
        <input type="hidden" name="token" value={data.token} />
        <button type="submit" class="btn btn-primary btn-block">Confirm sign-in</button>
      </form>
    {/if}
  </div>
</div>
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run --project component src/tests/component/LoginPage.test.ts src/tests/component/ConfirmPage.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/LoginPage.svelte src/lib/components/ConfirmPage.svelte src/tests/component/LoginPage.test.ts src/tests/component/ConfirmPage.test.ts
git commit -m "feat(admin): login and confirm pages on self-owned auth"
```

---

## Task 11: ConceptList

The concept list view shows each entry as a link with its metadata, plus a new-entry form whose slug auto-derives from the title until the author edits it.

**Files:**
- Create: `src/lib/components/ConceptList.svelte`
- Test: `src/tests/component/ConceptList.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/component/ConceptList.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ConceptList from '../../lib/components/ConceptList.svelte';

function data(over = {}) {
  return {
    conceptId: 'posts',
    label: 'Posts',
    dated: true,
    entries: [
      { id: '2026-05-hello', title: 'Hello', date: '2026-05-01', draft: false },
      { id: '2026-04-draft', title: 'Draft Post', date: '2026-04-01', draft: true },
    ],
    error: null,
    formError: null,
    ...over,
  };
}

describe('ConceptList', () => {
  it('lists entries linking to their editor and flags drafts', async () => {
    const screen = render(ConceptList, { data: data() });
    await expect.element(screen.getByRole('link', { name: /Hello/ })).toHaveAttribute('href', '/admin/posts/2026-05-hello');
    await expect.element(screen.getByText('Draft', { exact: true })).toBeInTheDocument();
  });

  it('auto-derives the slug from the title until edited', async () => {
    const screen = render(ConceptList, { data: data({ entries: [] }) });
    const title = screen.getByLabelText(/title/i);
    await title.fill('My New Post');
    const slug = screen.getByLabelText(/slug/i);
    await expect.element(slug).toHaveValue('my-new-post');
  });

  it('shows an inline error when listing failed', async () => {
    const screen = render(ConceptList, { data: data({ error: 'Could not load this content type from GitHub.', entries: [] }) });
    await expect.element(screen.getByText(/could not load/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project component src/tests/component/ConceptList.test.ts`
Expected: FAIL. Component not found.

- [ ] **Step 3: Create `ConceptList.svelte`**

Create `src/lib/components/ConceptList.svelte`:
```svelte
<!--
@component
One concept's list view: every entry as a link to its editor, with title, date, and a draft badge,
plus a new-entry form. The slug auto-derives from the title until the author edits the slug field.
-->
<script lang="ts">
  import { slugify } from '../content/ids.js';
  import type { ListData } from '../sveltekit/content-routes.js';

  interface Props {
    /** The list load's data: the concept, its entries, and any inline or form errors. */
    data: ListData;
  }

  let { data }: Props = $props();

  let title = $state('');
  let slug = $state('');
  let slugEdited = $state(false);

  const derivedSlug = $derived(slugEdited ? slug : slugify(title));
  const slugPlaceholder = $derived(data.dated ? '2026-05-my-entry' : 'about-us');
</script>

<header class="mb-4 flex items-center justify-between">
  <h1 class="text-xl font-semibold">{data.label}</h1>
</header>

{#if data.formError}
  <div role="alert" class="alert alert-error mb-4 text-sm">{data.formError}</div>
{/if}

{#if data.error}
  <div role="alert" class="alert alert-warning mb-4 text-sm">{data.error}</div>
{/if}

<div class="rounded-box border border-base-300 bg-base-100 mb-6">
  {#if data.entries.length === 0}
    <p class="p-4 text-sm opacity-70">No entries yet.</p>
  {:else}
    <ul class="menu w-full">
      {#each data.entries as entry (entry.id)}
        <li>
          <a href={`/admin/${data.conceptId}/${entry.id}`} class="flex items-center justify-between">
            <span>{entry.title}</span>
            <span class="flex items-center gap-2 text-xs opacity-70">
              {#if entry.date}<span>{entry.date}</span>{/if}
              {#if entry.draft}<span class="badge badge-warning badge-sm">Draft</span>{/if}
            </span>
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<form method="POST" action="?/create" class="rounded-box border border-base-300 bg-base-100 flex flex-col gap-3 p-4">
  <h2 class="text-sm font-semibold">New entry</h2>
  <label class="form-control">
    <span class="label-text mb-1">Title</span>
    <input class="input input-bordered" name="title" aria-label="Title" bind:value={title} required />
  </label>
  <label class="form-control">
    <span class="label-text mb-1">Slug</span>
    <input
      class="input input-bordered"
      name="slug"
      aria-label="Slug"
      placeholder={slugPlaceholder}
      value={derivedSlug}
      oninput={(e) => { slugEdited = true; slug = e.currentTarget.value; }}
    />
  </label>
  {#if data.dated}
    <label class="form-control">
      <span class="label-text mb-1">Date</span>
      <input class="input input-bordered" type="date" name="date" aria-label="Date" />
    </label>
  {/if}
  <button type="submit" class="btn btn-primary self-start">Create</button>
</form>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project component src/tests/component/ConceptList.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/ConceptList.svelte src/tests/component/ConceptList.test.ts
git commit -m "feat(admin): concept list view with slug auto-derivation"
```

---

## Task 12: MarkdownEditor seam (Carta wrapper)

The `MarkdownEditor` seam (spec §6, seam 5) wraps Carta behind a thin interface: a bindable value and a cursor-insert callback. Carta is client-only, so the component renders the editor only after mount. Swapping to a bare CodeMirror editor would be a one-file change.

**Files:**
- Create: `src/lib/components/MarkdownEditor.svelte`
- Test: `src/tests/component/MarkdownEditor.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/component/MarkdownEditor.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MarkdownEditor from '../../lib/components/MarkdownEditor.svelte';

describe('MarkdownEditor', () => {
  it('mirrors the bindable value into a hidden field named for the form', async () => {
    const screen = render(MarkdownEditor, { value: 'hello world', name: 'body' });
    // The seam exposes the current value through a hidden form field named `body`.
    await expect.element(screen.container.querySelector('input[name="body"]')!).toHaveValue('hello world');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project component src/tests/component/MarkdownEditor.test.ts`
Expected: FAIL. Component not found.

- [ ] **Step 3: Create `MarkdownEditor.svelte`**

Create `src/lib/components/MarkdownEditor.svelte`. The seam keeps the bindable `value` mirrored to a hidden field named by `name`, so the value submits with the surrounding form even before the heavy editor mounts. `registerInsert` hands a cursor-insertion function to the parent (the component palette calls it).
```svelte
<!--
@component
The `MarkdownEditor` seam (spec §6, seam 5): a thin wrapper over Carta exposing a bindable value
and a cursor-insert callback. Carta and Shiki are client-only, so the editor mounts after the
component does; until then the hidden field still carries the value so the form submits correctly.
Swapping Carta for a bare CodeMirror editor stays a one-file change.
-->
<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    /** The markdown source; bindable so the parent reads edits back. */
    value: string;
    /** The hidden field name the value is mirrored to for form submit. */
    name: string;
    /** Carta preview plugins from the adapter, for the design-accurate preview. */
    plugins?: unknown[];
    /** Receives a `(text) => void` that inserts at the cursor; the palette calls it. */
    registerInsert?: (insert: (text: string) => void) => void;
  }

  let { value = $bindable(), name, plugins = [], registerInsert }: Props = $props();

  let mounted = $state(false);
  // The Carta instance and its Svelte component are imported only in the browser, after mount,
  // so the server bundle never pulls Carta or Shiki (guarded by the carta-boundary test).
  let Editor = $state<unknown>(null);
  let carta = $state<unknown>(null);

  onMount(async () => {
    const { Carta, MarkdownEditor } = await import('carta-md');
    carta = new Carta({ extensions: plugins as never });
    Editor = MarkdownEditor;
    // A minimal cursor insert: append for the fallback editor; Carta's input API refines it later.
    registerInsert?.((text: string) => {
      value = value ? `${value}\n\n${text}` : text;
    });
    mounted = true;
  });
</script>

<input type="hidden" {name} value={value} />

{#if mounted && Editor}
  {@const EditorComponent = Editor as never}
  <EditorComponent {carta} bind:value theme="default" mode="tabs" />
{:else}
  <textarea class="textarea textarea-bordered min-h-64 w-full font-mono text-sm" bind:value aria-label="Markdown source"></textarea>
{/if}
```

> Note for the implementer: `carta-md`'s exact prop names (`carta`, `theme`, `mode`) and the cursor-insert API (`carta.input.insertAt`) should be confirmed against the installed `carta-md@4.11` types during this task; refine `registerInsert` to use the real cursor API if available, keeping the append fallback for the pre-mount textarea. The test only asserts the hidden-field mirror, which holds regardless.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project component src/tests/component/MarkdownEditor.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Confirm the Carta boundary test still passes**

Run: `npx vitest run --project unit src/tests/unit/carta-boundary.test.ts`
Expected: PASS. Carta is imported only in a `.svelte` file, not a server module.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/MarkdownEditor.svelte src/tests/component/MarkdownEditor.test.ts
git commit -m "feat(admin): MarkdownEditor seam wrapping Carta client-only"
```

---

## Task 13: ComponentPalette

The palette derives its catalog from the site's component registry (seam 3) and inserts a component's template at the cursor through the `MarkdownEditor` seam's insert callback. It renders nothing when no registry is configured.

**Files:**
- Create: `src/lib/components/ComponentPalette.svelte`
- Test: `src/tests/component/ComponentPalette.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/component/ComponentPalette.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ComponentPalette from '../../lib/components/ComponentPalette.svelte';

const registry = {
  defs: [
    { name: 'card', label: 'Card', description: 'A card', insertTemplate: ':::card\n## Title\n:::', build: (n: unknown) => n },
    { name: 'grid', label: 'Grid', description: 'A grid', insertTemplate: ':::grid\n:::', build: (n: unknown) => n },
  ],
};

describe('ComponentPalette', () => {
  it('lists registry components and inserts a template on click', async () => {
    const insert = vi.fn();
    const screen = render(ComponentPalette, { registry: registry as never, insert });
    await screen.getByRole('button', { name: /card/i }).click();
    expect(insert).toHaveBeenCalledWith(':::card\n## Title\n:::');
  });

  it('renders nothing without a registry', async () => {
    const screen = render(ComponentPalette, { registry: undefined, insert: () => {} });
    expect(screen.container.textContent?.trim()).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project component src/tests/component/ComponentPalette.test.ts`
Expected: FAIL. Component not found.

- [ ] **Step 3: Create `ComponentPalette.svelte`**

Create `src/lib/components/ComponentPalette.svelte`:
```svelte
<!--
@component
The insert-component palette: a dropdown listing the site's registered directive components
(seam 3). Picking one inserts its template at the cursor through the editor's insert callback.
Renders nothing when the site configures no registry.
-->
<script lang="ts">
  import type { ComponentRegistry } from '../render/registry.js';

  interface Props {
    /** The site's component registry; the palette derives its catalog from it. */
    registry?: ComponentRegistry;
    /** Insert a template at the editor's cursor. */
    insert: (template: string) => void;
  }

  let { registry, insert }: Props = $props();

  const defs = $derived(registry?.defs ?? []);
</script>

{#if defs.length > 0}
  <div class="dropdown">
    <button type="button" class="btn btn-sm btn-ghost" tabindex="0">Insert</button>
    <ul class="dropdown-content menu rounded-box border border-base-300 bg-base-100 z-10 w-56 shadow">
      {#each defs as def (def.name)}
        <li>
          <button type="button" onclick={() => insert(def.insertTemplate)}>
            <span class="flex flex-col items-start">
              <span class="font-medium">{def.label}</span>
              <span class="text-xs opacity-60">{def.description}</span>
            </span>
          </button>
        </li>
      {/each}
    </ul>
  </div>
{/if}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project component src/tests/component/ComponentPalette.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/ComponentPalette.svelte src/tests/component/ComponentPalette.test.ts
git commit -m "feat(admin): component palette deriving from the registry"
```

---

## Task 14: EditPage

The editor composes the per-concept frontmatter form (driven by `data.fields`), the `MarkdownEditor` seam, the component palette, and a preview toggle persisted to `localStorage`. The whole thing is one form posting to the `?/save` action.

**Files:**
- Create: `src/lib/components/EditPage.svelte`
- Test: `src/tests/component/EditPage.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/component/EditPage.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import EditPage from '../../lib/components/EditPage.svelte';

function postProps(over = {}) {
  return {
    data: {
      conceptId: 'posts',
      id: '2026-05-hello',
      label: 'Posts',
      fields: [
        { type: 'text', name: 'title', label: 'Title', required: true },
        { type: 'date', name: 'date', label: 'Date' },
        { type: 'boolean', name: 'draft', label: 'Draft' },
      ],
      frontmatter: { title: 'Hello', date: '2026-05-01', draft: false },
      body: 'The body.',
      title: 'Hello',
      isNew: false,
      saved: false,
      error: null,
      siteName: 'Test Site',
      ...over,
    },
    registry: undefined,
    preview: [],
  };
}

function pageProps() {
  const base = postProps();
  return {
    ...base,
    data: {
      ...base.data,
      conceptId: 'pages',
      fields: [{ type: 'text', name: 'title', label: 'Title', required: true }],
      frontmatter: { title: 'About' },
    },
  };
}

describe('EditPage', () => {
  it('renders the rich frontmatter fields for a post', async () => {
    const screen = render(EditPage, postProps());
    await expect.element(screen.getByLabelText(/title/i)).toHaveValue('Hello');
    await expect.element(screen.getByLabelText(/date/i)).toBeInTheDocument();
    await expect.element(screen.getByLabelText(/draft/i)).toBeInTheDocument();
  });

  it('renders only the minimal field for a page', async () => {
    const screen = render(EditPage, pageProps());
    await expect.element(screen.getByLabelText(/title/i)).toBeInTheDocument();
    await expect.element(screen.getByLabelText(/date/i)).not.toBeInTheDocument();
  });

  it('toggles the preview pane', async () => {
    const screen = render(EditPage, postProps());
    await screen.getByRole('button', { name: /show preview/i }).click();
    await expect.element(screen.getByRole('region', { name: /preview/i })).toBeInTheDocument();
  });

  it('shows a saved confirmation', async () => {
    const screen = render(EditPage, postProps({ saved: true }));
    await expect.element(screen.getByText(/saved/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project component src/tests/component/EditPage.test.ts`
Expected: FAIL. Component not found.

- [ ] **Step 3: Create `EditPage.svelte`**

Create `src/lib/components/EditPage.svelte`:
```svelte
<!--
@component
The differentiated editor: the per-concept frontmatter form (from `data.fields`) beside the Carta
markdown editor and a live, design-accurate preview. The whole surface is one form posting to the
`?/save` action; the preview toggle persists per user in localStorage (spec §7.6).
-->
<script lang="ts">
  import MarkdownEditor from './MarkdownEditor.svelte';
  import ComponentPalette from './ComponentPalette.svelte';
  import type { ComponentRegistry } from '../render/registry.js';
  import type { EditData } from '../sveltekit/content-routes.js';

  interface Props {
    /** The edit load's data, plus the site name for the heading. */
    data: EditData & { siteName: string };
    /** The site's component registry, for the insert palette. */
    registry?: ComponentRegistry;
    /** Carta preview plugins from the adapter, for the design-accurate preview. */
    preview?: unknown[];
  }

  let { data, registry, preview = [] }: Props = $props();

  let body = $state(data.body);
  let showPreview = $state(false);
  let previewHtml = $state('');
  let insert = $state<(text: string) => void>(() => {});

  const PREVIEW_KEY = 'cairn-admin:preview';

  $effect(() => {
    // Restore the per-user preference once, on mount.
    showPreview = localStorage.getItem(PREVIEW_KEY) === '1';
  });

  function togglePreview() {
    showPreview = !showPreview;
    localStorage.setItem(PREVIEW_KEY, showPreview ? '1' : '0');
  }
</script>

<header class="mb-4 flex items-center justify-between gap-2">
  <div>
    <h1 class="text-xl font-semibold">{data.title}</h1>
    <p class="text-xs opacity-60">{data.label}: {data.id}</p>
  </div>
  <div class="flex items-center gap-2">
    <ComponentPalette {registry} insert={(t) => insert(t)} />
    <button type="button" class="btn btn-sm btn-ghost" aria-pressed={showPreview} onclick={togglePreview}>
      {showPreview ? 'Hide preview' : 'Show preview'}
    </button>
  </div>
</header>

{#if data.saved}
  <div role="status" class="alert alert-success mb-4 text-sm">Saved.</div>
{/if}
{#if data.error}
  <div role="alert" class="alert alert-error mb-4 text-sm">{data.error}</div>
{/if}

<form method="POST" action="?/save" class="lg:grid lg:grid-cols-[1fr_20rem] lg:gap-6">
  {#if data.isNew}<input type="hidden" name="new" value="1" />{/if}

  <div class="lg:order-1">
    <div class="rounded-box border border-base-300 bg-base-100 overflow-hidden">
      <MarkdownEditor bind:value={body} name="body" plugins={preview} registerInsert={(fn) => (insert = fn)} />
    </div>
    {#if showPreview}
      <section
        aria-label="Preview"
        class="rounded-box border border-base-300 bg-base-100 prose mt-4 max-w-none p-4"
      >
        {@html previewHtml}
      </section>
    {/if}
  </div>

  <aside class="lg:order-2 mt-4 lg:mt-0">
    <fieldset class="rounded-box border border-base-300 bg-base-100 flex flex-col gap-3 p-4">
      {#each data.fields as field (field.name)}
        {#if field.type === 'textarea'}
          <label class="form-control">
            <span class="label-text mb-1">{field.label}</span>
            <textarea class="textarea textarea-bordered" name={field.name} aria-label={field.label} rows={field.rows ?? 3}>{data.frontmatter[field.name] ?? ''}</textarea>
          </label>
        {:else if field.type === 'date'}
          <label class="form-control">
            <span class="label-text mb-1">{field.label}</span>
            <input class="input input-bordered" type="date" name={field.name} aria-label={field.label} value={data.frontmatter[field.name] ?? ''} />
          </label>
        {:else if field.type === 'boolean'}
          <label class="label cursor-pointer justify-start gap-2">
            <input class="checkbox checkbox-sm" type="checkbox" name={field.name} aria-label={field.label} checked={data.frontmatter[field.name] === true} />
            <span class="label-text">{field.label}</span>
          </label>
        {:else if field.type === 'tags'}
          <fieldset class="form-control">
            <span class="label-text mb-1">{field.label}</span>
            <div class="flex flex-wrap gap-2">
              {#each field.options as option (option)}
                <label class="label cursor-pointer justify-start gap-2">
                  <input class="checkbox checkbox-sm" type="checkbox" name={field.name} value={option} checked={Array.isArray(data.frontmatter[field.name]) && (data.frontmatter[field.name] as string[]).includes(option)} />
                  <span class="label-text">{option}</span>
                </label>
              {/each}
            </div>
          </fieldset>
        {:else if field.type === 'freetags'}
          <label class="form-control">
            <span class="label-text mb-1">{field.label}</span>
            <input class="input input-bordered" name={field.name} aria-label={field.label} placeholder={field.placeholder} value={Array.isArray(data.frontmatter[field.name]) ? (data.frontmatter[field.name] as string[]).join(', ') : ''} />
          </label>
        {:else}
          <label class="form-control">
            <span class="label-text mb-1">{field.label}</span>
            <input class="input input-bordered" name={field.name} aria-label={field.label} value={data.frontmatter[field.name] ?? ''} required={field.required} />
          </label>
        {/if}
      {/each}
      <button type="submit" class="btn btn-primary mt-2">Save</button>
    </fieldset>
  </aside>
</form>
```

> Note: the live preview (`previewHtml`) is wired to the adapter's `renderPreview` during cutover (Plan 07), since `renderPreview` is a site function passed through `data` or context. For this plan the preview pane renders the last computed HTML (empty until wired); the toggle, the `aria-label="Preview"` region, and the layout are what the component test locks. Keep `previewHtml` and the `preview` plugins prop as the seam. The `id` is carried by the route, so the save action reads it from `params`, not a hidden field.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project component src/tests/component/EditPage.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/EditPage.svelte src/tests/component/EditPage.test.ts
git commit -m "feat(admin): differentiated editor with field form and preview toggle"
```

---

## Task 15: ManageEditors

The owner-gated editor management surface: a table of editors with role and remove controls, an add-editor form, and self-targeted buttons disabled (the anti-lockout rule is enforced server-side in `editors-routes.ts`).

**Files:**
- Create: `src/lib/components/ManageEditors.svelte`
- Test: `src/tests/component/ManageEditors.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/component/ManageEditors.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ManageEditors from '../../lib/components/ManageEditors.svelte';

function data() {
  return {
    editors: [
      { email: 'owner@t', displayName: 'Owner One', role: 'owner' as const },
      { email: 'ed@t', displayName: 'Ed Two', role: 'editor' as const },
    ],
    self: 'owner@t',
    siteName: 'Test Site',
  };
}

describe('ManageEditors', () => {
  it('lists editors with their roles', async () => {
    const screen = render(ManageEditors, { data: data(), form: null });
    await expect.element(screen.getByText('Owner One')).toBeInTheDocument();
    await expect.element(screen.getByText('Ed Two')).toBeInTheDocument();
  });

  it('disables the remove control for the acting owner (anti-lockout affordance)', async () => {
    const screen = render(ManageEditors, { data: data(), form: null });
    const selfRemove = screen.getByRole('button', { name: /remove owner one/i });
    await expect.element(selfRemove).toBeDisabled();
  });

  it('renders an add-editor form', async () => {
    const screen = render(ManageEditors, { data: data(), form: null });
    await expect.element(screen.getByRole('button', { name: /add editor/i })).toBeInTheDocument();
  });

  it('surfaces an action error', async () => {
    const screen = render(ManageEditors, { data: data(), form: { error: 'That editor already exists' } });
    await expect.element(screen.getByText(/already exists/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project component src/tests/component/ManageEditors.test.ts`
Expected: FAIL. Component not found.

- [ ] **Step 3: Create `ManageEditors.svelte`**

Create `src/lib/components/ManageEditors.svelte`:
```svelte
<!--
@component
The owner-gated editor management surface: a table of editors with role-flip and remove actions,
and an add-editor form. The acting owner's own row disables its destructive controls; the
last-owner anti-lockout rule itself is enforced server-side (editors-routes). Actions post to the
named `?/setRole`, `?/remove`, and `?/add` actions.
-->
<script lang="ts">
  import type { Editor } from '../auth/types.js';

  interface Props {
    /** The editors load's data, plus the site name. */
    data: { editors: Editor[]; self: string; siteName: string };
    /** The last action's result (an error message when it failed). */
    form: { error?: string; ok?: boolean } | null;
  }

  let { data, form }: Props = $props();
</script>

<header class="mb-4">
  <h1 class="text-xl font-semibold">Editors</h1>
</header>

{#if form?.error}
  <div role="alert" class="alert alert-error mb-4 text-sm">{form.error}</div>
{/if}

<div class="overflow-x-auto rounded-box border border-base-300 bg-base-100 mb-6">
  <table class="table">
    <thead>
      <tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr>
    </thead>
    <tbody>
      {#each data.editors as editor (editor.email)}
        {@const isSelf = editor.email === data.self}
        <tr>
          <td>{editor.displayName}</td>
          <td>{editor.email}</td>
          <td>
            <span class="badge {editor.role === 'owner' ? 'badge-primary' : 'badge-ghost'}">{editor.role}</span>
          </td>
          <td class="flex justify-end gap-2">
            <form method="POST" action="?/setRole">
              <input type="hidden" name="email" value={editor.email} />
              <input type="hidden" name="role" value={editor.role === 'owner' ? 'editor' : 'owner'} />
              <button type="submit" class="btn btn-ghost btn-xs" disabled={isSelf} aria-label={`Toggle role for ${editor.displayName}`}>
                {editor.role === 'owner' ? 'Make editor' : 'Make owner'}
              </button>
            </form>
            <form method="POST" action="?/remove">
              <input type="hidden" name="email" value={editor.email} />
              <button type="submit" class="btn btn-ghost btn-xs text-error" disabled={isSelf} aria-label={`Remove ${editor.displayName}`}>
                Remove
              </button>
            </form>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<form method="POST" action="?/add" class="rounded-box border border-base-300 bg-base-100 grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
  <label class="form-control">
    <span class="label-text mb-1">Name</span>
    <input class="input input-bordered" name="name" aria-label="Name" required />
  </label>
  <label class="form-control">
    <span class="label-text mb-1">Email</span>
    <input class="input input-bordered" type="email" name="email" aria-label="Email" autocomplete="off" required />
  </label>
  <label class="form-control">
    <span class="label-text mb-1">Role</span>
    <select class="select select-bordered" name="role" aria-label="Role">
      <option value="editor">editor</option>
      <option value="owner">owner</option>
    </select>
  </label>
  <button type="submit" class="btn btn-primary">Add editor</button>
</form>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project component src/tests/component/ManageEditors.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/ManageEditors.svelte src/tests/component/ManageEditors.test.ts
git commit -m "feat(admin): owner-gated manage-editors surface"
```

---

## Task 16: Barrel exports and the export boundary

Wire the new components into the `/components` barrel and the new server functions into the `/sveltekit` barrel, and lock the export surface with a boundary test (matching Plan 04's `render-exports` pattern).

**Files:**
- Modify: `src/lib/components/index.ts`
- Modify: `src/lib/sveltekit/index.ts`
- Test: `src/tests/unit/admin-exports.test.ts`
- Test: `src/tests/component/components-barrel.test.ts`

- [ ] **Step 1: Write the failing server-exports test**

Create `src/tests/unit/admin-exports.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import * as sveltekit from '../../lib/sveltekit/index.js';

describe('sveltekit barrel', () => {
  it('exports the auth, editor, content, and health route factories', () => {
    expect(typeof sveltekit.createAuthGuard).toBe('function');
    expect(typeof sveltekit.createAuthRoutes).toBe('function');
    expect(typeof sveltekit.createEditorRoutes).toBe('function');
    expect(typeof sveltekit.createContentRoutes).toBe('function');
    expect(typeof sveltekit.healthLoad).toBe('function');
    expect(typeof sveltekit.requireSession).toBe('function');
    expect(typeof sveltekit.requireOwner).toBe('function');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/admin-exports.test.ts`
Expected: FAIL. `createContentRoutes`/`healthLoad` are not exported.

- [ ] **Step 3: Extend the `/sveltekit` barrel**

Replace `src/lib/sveltekit/index.ts` with:
```typescript
// SvelteKit server logic consumed by site route shims: the guard plus the auth, editor,
// content, and health route factories and functions.
export { createAuthGuard, requireSession, requireOwner } from './guard.js';
export { createAuthRoutes, type AuthRoutesConfig } from './auth-routes.js';
export { createEditorRoutes } from './editors-routes.js';
export { createContentRoutes } from './content-routes.js';
export type {
  NavConcept,
  LayoutData,
  EntrySummary,
  ListData,
  EditData,
  ContentEvent,
  ContentRoutesDeps,
} from './content-routes.js';
export { healthLoad, type HealthData } from './health.js';
export type { RequestContext, CookieJar, HandleInput } from './types.js';
```

- [ ] **Step 4: Run the server-exports test**

Run: `npx vitest run --project unit src/tests/unit/admin-exports.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Write the failing components-barrel test**

Create `src/tests/component/components-barrel.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import * as components from '../../lib/components/index.js';

describe('components barrel', () => {
  it('exports every admin component', () => {
    for (const name of ['AdminLayout', 'LoginPage', 'ConfirmPage', 'ConceptList', 'EditPage', 'ManageEditors', 'MarkdownEditor', 'ComponentPalette']) {
      expect(components).toHaveProperty(name);
    }
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npx vitest run --project component src/tests/component/components-barrel.test.ts`
Expected: FAIL. The barrel is empty.

- [ ] **Step 7: Populate the `/components` barrel**

Replace `src/lib/components/index.ts` with:
```typescript
// Admin Svelte components (Plan 05). The Warm Stone theme ships as a CSS side effect imported
// by the components that set `data-theme="cairn-admin"`.
export { default as AdminLayout } from './AdminLayout.svelte';
export { default as LoginPage } from './LoginPage.svelte';
export { default as ConfirmPage } from './ConfirmPage.svelte';
export { default as ConceptList } from './ConceptList.svelte';
export { default as EditPage } from './EditPage.svelte';
export { default as ManageEditors } from './ManageEditors.svelte';
export { default as MarkdownEditor } from './MarkdownEditor.svelte';
export { default as ComponentPalette } from './ComponentPalette.svelte';
```

- [ ] **Step 8: Run the components-barrel test**

Run: `npx vitest run --project component src/tests/component/components-barrel.test.ts`
Expected: PASS (1 test).

- [ ] **Step 9: Full suite and check**

Run: `npm test && npm run check`
Expected: unit + integration + component all green; `svelte-check` clean.

- [ ] **Step 10: Commit**

```bash
git add src/lib/components/index.ts src/lib/sveltekit/index.ts src/tests/unit/admin-exports.test.ts src/tests/component/components-barrel.test.ts
git commit -m "feat(admin): wire the components and sveltekit barrels"
```

---

## Self-review

**Spec coverage (§7.4, §7.6, §7.8, scenarios 10 through 15, 19, 21):**
- Scenario 10 (list enabled concepts, per-concept list) maps to Tasks 3, 4, 9, 11.
- Scenario 11 (rich post form vs minimal page form) maps to Task 14 (field-driven, both tested).
- Scenario 12 (live preview through the site pipeline) maps to the preview seam in Tasks 12 and 14; full wiring deferred to cutover, since `renderPreview` is a site function (noted).
- Scenario 13 (invalid frontmatter bounces, writes nothing) maps to Task 6 (the `!ok` path, fetch asserted not called).
- Scenario 14 (valid save: editor author, bot committer, clean diff) maps to Task 6 (author asserted, committer omitted); full browser E2E deferred to Plan 07.
- Scenario 15 (conflict, no overwrite) maps to Task 6 (409 path, both `instanceof` and name).
- Scenario 19 (no server module imports carta-md) maps to Task 8.
- Scenario 21 (healthz signs a dummy JWT) maps to Task 7.
- §7.6 theme, shell, concepts-first nav, role gating, preview toggle, accessible widgets map to Tasks 9 and 14; DaisyUI throughout, `aria-label` on icon buttons, `aria-current` on the active nav link.

**Deferred, with reason (not gaps):** Bits UI dialog/combobox and svelte-sortable-list (spec §7.6 "where a widget needs real keyboard semantics") are not used here. Plan 05's surfaces (drawer, menu, table, forms, dropdown) are pure DaisyUI with native semantics. A sortable nav tree is Plan 06; the page-picker combobox and command palette are deferred features (spec §3). Live-preview render wiring and the Playwright golden-path E2E are deferred to cutover (Plan 07), where a host app exists to run them. These are recorded so a reader does not mistake them for omissions.

**Type consistency:** `LayoutData`, `ListData`, `EditData`, `EntrySummary`, `NavConcept`, `ContentEvent`, `ContentRoutesDeps`, `HealthData` are declared once (Tasks 3 through 7) and imported type-only by components and the barrel (Task 16). `mintToken` has one signature `(env: GithubKeyEnv) => Promise<string>` across the factory and its tests. Route paths are consistently `/admin/<concept>` and `/admin/<concept>/<id>` with `?/create` and `?/save` actions.

**Plan 03 carried follow-ups, closed in Task 6:** path confined to `${concept.dir}/${filenameFromId(id)}` from an `isValidId` id; author from the session, never input; conflict matched by `instanceof` and by `name`. Install-token KV caching remains a later availability follow-up, not in this plan.

---

## Execution post-mortem

_(Filled in at pass-end per the cairn-pass consolidation ritual: what was built, what was verified with evidence, decisions locked, and any blockers. Update the `cairn-rebuild-initiative` memory to match.)_
