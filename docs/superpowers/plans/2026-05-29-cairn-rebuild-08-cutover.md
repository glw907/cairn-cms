# Site cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repoint both consumer sites (907-life, then ecnordic-ski) from the old pre-rebuild `@glw907/cairn-cms` API onto the published `0.6.0-rc.0` engine, with self-owned D1 auth and a public-render sanitize floor, then merge `rebuild` to `cairn-cms` `main`.

**Architecture:** The rebuilt engine exposes route factories (`createContentRoutes`, `createAuthRoutes`, `createEditorRoutes`, `createNavRoutes`), a `createAuthGuard()` hook, and a `content: { posts?, pages? }` adapter shape. Each site builds the handlers once in a `$lib/cairn.server.ts` module; every `+page.server.ts` is a thin re-export. Auth moves from better-auth on Drizzle to three D1 tables (`editor`, `magic_token`, `session`). The public render gains a `rehype-sanitize` floor. 907-life is the canary; ecnordic follows; the merge comes last.

**Tech Stack:** SvelteKit 2 (classic load/actions), Svelte 5 runes, Cloudflare Workers + D1, `@glw907/cairn-cms@0.6.0-rc.0`, `rehype-sanitize`, vitest, `wrangler`, the Cloudflare MCP for D1.

---

## Background

This is the second half of the original "distribution and site cutover" pass. Plan 07 made the engine consumable and published the RC. This plan repoints the live sites.

| Plan | Goal |
|---|---|
| 07 (done) | Engine readiness: packaging gates, preview + sanitize, `CairnExtension` contract, the showcase app, the golden-path E2E, RC publish. |
| 08 (this) | Site cutover: both adapters and all `/admin` shims to the new API, D1 auth migration, sanitize floor, repoint, merge `rebuild` to `main`. |
| 09 | `CairnExtension` machinery: site-registered admin panels, custom concept and field types. |
| 10 | `create-cairn-site` scaffolder and the first templates. |

The canonical sources are the functional spec at `docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md` and the cutover design at `docs/superpowers/specs/2026-05-29-cairn-cutover-design.md`.

### Repos and working directories

This plan spans three repos. Each task names its repo. Site tasks honor that repo's own `CLAUDE.md`, svelte-check, and vitest gate.

- 907-life: `/home/glw907/Projects/cairn/907-life`
- ecnordic-ski: `/home/glw907/Projects/cairn/ecnordic-ski`
- cairn-cms worktree (merge only): `/home/glw907/Projects/cairn/cairn-cms-rebuild`

### Credentials (machine-local, from the workspace `CLAUDE.md`)

- GitHub App ID `3847496`, installation ID `135372268`. These are not secret and move into each adapter's `backend` config. The private key stays the Worker secret `GITHUB_APP_PRIVATE_KEY_B64`.
- D1 `AUTH_DB`: 907-life = `cairn-907-auth` `93aa929d-0228-4f8b-8d1e-5e7e0d755617`; ecnordic = `cairn-ecnordic-auth` `83178db3-0aae-4c1d-b6ad-1626193ebefd`.
- Cloudflare account `glw907`, `120c269ad6d3dfbe6d63a0bb53758ca0`.

### What the rebuilt engine exposes (confirmed against source)

Imports resolve from three entry points: `.`, `/sveltekit`, `/components`. There is no `/auth` subpath.

- Root: `composeRuntime(adapter)`, types `CairnAdapter` / `ValidationResult` / `Editor`, `dateInputValue`, and the render exports `createRenderer` / `defineRegistry` plus the hast helpers (ecnordic only).
- `/sveltekit`: `createAuthGuard()`, `createAuthRoutes({ branding, send? })` → `{ loginLoad, requestAction, confirmLoad, confirmAction, logoutAction }`, `createEditorRoutes()` → `{ editorsLoad, addEditorAction, removeEditorAction, setRoleAction }`, `createContentRoutes(runtime, deps?)` → `{ layoutLoad, indexRedirect, listLoad, createAction, editLoad, saveAction }`, `createNavRoutes(runtime, deps?)` → `{ navLoad, navSave }`, `healthLoad(event, runtime)`, and the types `LayoutData` / `ListData` / `EditData` / `ContentEvent`.
- `/components`: `AdminLayout`, `ConceptList`, `EditPage`, `ManageEditors`, `LoginPage`, `ConfirmPage`, `NavTree`.

Route factories that touch GitHub default their `mintToken` to the live App signer (`installationToken(appCredentials(runtime.backend, env))`), so the real site shims pass no `mintToken`. `AdminLayout` hardcodes the sidebar hrefs `/admin/<conceptId>`, `/admin/nav`, and `/admin/editors`, which fixes the route directory names. Component form targets are fixed too: `ManageEditors` posts `?/add` / `?/remove` / `?/setRole`; `NavTree` posts `?/save`; `LoginPage` and `ConfirmPage` post their page's default action; the logout form posts `/admin/auth/logout`.

### New adapter shape

```typescript
const cairn: CairnAdapter = {
  siteName: '...',
  content: { posts: { dir, label, fields, validate }, pages: { ... } },  // not collections[]
  backend: { owner, repo, branch, appId, installationId },                // appId/installationId added
  sender: { from },                                                       // not a bare string
  renderPreview: (md) => string,                                          // not preview plugin arrays
  navMenu: { configPath, menuName, label, maxDepth },
  registry,                                                               // ecnordic only (directive palette)
};
```

Each concept's `validate(frontmatter, body)` returns `{ ok: true, data }` or `{ ok: false, errors: Record<string,string> }`. It never throws.

### Locked decisions (from the design, approved 2026-05-29)

1. 907-life cuts over first as the canary; ecnordic follows; the merge is last.
2. Public render gets a `rehype-sanitize` floor on both sites. ecnordic's schema allowlists the directive output and the `<a class="download-link">` anchor.
3. Routes adopt the canonical names: `[concept]`, `edit/[concept]/[id]`, `/admin/editors`. The standalone `admin/save/+server.ts` is deleted. No alias shims.
4. The editor allowlist seeds from the live better-auth rows so no current editor loses access.
5. `rebuild` merges to `main` with `git merge --no-ff`.

### Shared shim reference

These files are byte-identical between the two sites, because both consume the same engine API through the same `$lib` paths. Phase 1 creates them for 907-life and Phase 2 creates the same files for ecnordic. They are collected here once so the per-site tasks stay short; the per-site tasks restate the paths.

**`src/lib/cairn.server.ts`** (the one place that composes the runtime and builds the handlers):
```typescript
// The server-side engine wiring: compose the runtime once and build every admin route
// handler from it. Each +page.server.ts re-exports from here, so the engine is composed a
// single time per worker and the route files stay one line each.
import { composeRuntime } from '@glw907/cairn-cms';
import {
  createContentRoutes,
  createAuthRoutes,
  createEditorRoutes,
  createNavRoutes,
} from '@glw907/cairn-cms/sveltekit';
import { cairn } from './cairn.config.js';

export const runtime = composeRuntime(cairn);
export const content = createContentRoutes(runtime);
export const auth = createAuthRoutes({ branding: { siteName: cairn.siteName, from: cairn.sender.from } });
export const editors = createEditorRoutes();
export const nav = createNavRoutes(runtime);
```

**`src/hooks.server.ts`**:
```typescript
import { createAuthGuard } from '@glw907/cairn-cms/sveltekit';

export const handle = createAuthGuard();
```

**Directory structure (important).** The authed pages sit in a URL-transparent `(app)` group so the session-gated layout load never runs for the public login and auth pages. The `(app)` parentheses do not appear in URLs, so `/admin`, `/admin/<concept>`, `/admin/editors`, and `/admin/nav` are unchanged.

```
src/routes/
  healthz/+server.ts                      <- root, OUTSIDE the /admin guard
  admin/
    +layout.server.ts                     <- bare: export const prerender = false (no load)
    +layout.svelte                        <- bare passthrough (no shell)
    login/+page.{server.ts,svelte}        <- public, no authed shell
    auth/confirm/+page.{server.ts,svelte} <- public
    auth/logout/+server.ts                <- public (guard allows /admin/auth/*)
    (app)/
      +layout.server.ts                   <- load = content.layoutLoad (requireSession)
      +layout.svelte                      <- AdminLayout shell
      +page.server.ts                     <- content.indexRedirect  (URL: /admin)
      [concept]/+page.{server.ts,svelte}        <- list   (URL: /admin/<concept>)
      [concept]/[id]/+page.{server.ts,svelte}   <- editor (URL: /admin/<concept>/<id>)
      editors/+page.{server.ts,svelte}
      nav/+page.{server.ts,svelte}
```

The editor is nested at `[concept]/[id]`, NOT a separate `edit/` segment. `ConceptList` links entries to `/admin/<concept>/<id>` and every content-route redirect (save `?saved=1`, new `?new=1`, errors) targets the same path, so the editor must live there. The showcase's `/admin/edit/[type]/[id]` did not match those links (its E2E navigated by direct URL and missed the break). The engine reads `params.concept` and `params.id`, both supplied natively by `[concept]/[id]`, so no alias is needed.

**`src/routes/admin/+layout.server.ts`** (bare prerender guard; the load lives in `(app)`):
```typescript
// /admin must never be prerendered (dynamic auth and content). The authed shell load lives in
// the (app) group, so login and auth do not run the session-requiring layout load and cannot loop.
export const prerender = false;
```

**`src/routes/admin/+layout.svelte`** (bare passthrough; the shell wraps only `(app)`):
```svelte
<script lang="ts">
  let { children } = $props();
</script>

{@render children()}
```

**`src/routes/admin/(app)/+layout.server.ts`**:
```typescript
import { content } from '$lib/cairn.server.js';

export const load = content.layoutLoad;
```

**`src/routes/admin/(app)/+layout.svelte`** (the admin shell, wrapping only authed pages):
```svelte
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { AdminLayout } from '@glw907/cairn-cms/components';
  import type { LayoutData } from '@glw907/cairn-cms/sveltekit';

  let { data, children }: { data: LayoutData; children: Snippet } = $props();
</script>

<AdminLayout {data}>
  {@render children()}
</AdminLayout>
```

**`src/routes/admin/(app)/+page.server.ts`** (the `[concept]`, `edit/[concept]/[id]`, `editors`, and `nav` route files below also live under `(app)/`):
```typescript
import { content } from '$lib/cairn.server.js';

export const load = content.indexRedirect;
```

**`src/routes/admin/[concept]/+page.server.ts`**:
```typescript
import { content } from '$lib/cairn.server.js';

export const load = content.listLoad;
export const actions = { create: content.createAction };
```

**`src/routes/admin/[concept]/+page.svelte`**:
```svelte
<script lang="ts">
  import { ConceptList } from '@glw907/cairn-cms/components';
  import type { ListData } from '@glw907/cairn-cms/sveltekit';

  let { data }: { data: ListData } = $props();
</script>

<ConceptList {data} />
```

**`src/routes/admin/(app)/[concept]/[id]/+page.server.ts`** (the editor, nested under the concept):
```typescript
import { content } from '$lib/cairn.server.js';

export const load = content.editLoad;
export const actions = { save: content.saveAction };
```

**`src/routes/admin/(app)/[concept]/[id]/+page.svelte`**:
```svelte
<script lang="ts">
  import { EditPage } from '@glw907/cairn-cms/components';
  import type { EditData } from '@glw907/cairn-cms/sveltekit';
  import { cairn } from '$lib/cairn.config.js';

  let { data }: { data: EditData } = $props();
</script>

<EditPage data={{ ...data, siteName: cairn.siteName }} renderPreview={cairn.renderPreview} />
```

**`src/routes/admin/editors/+page.server.ts`**:
```typescript
import { editors } from '$lib/cairn.server.js';

export const load = editors.editorsLoad;
export const actions = {
  add: editors.addEditorAction,
  remove: editors.removeEditorAction,
  setRole: editors.setRoleAction,
};
```

**`src/routes/admin/editors/+page.svelte`**:
```svelte
<script lang="ts">
  import { ManageEditors } from '@glw907/cairn-cms/components';

  let { data, form } = $props();
</script>

<ManageEditors {data} {form} />
```

**`src/routes/admin/nav/+page.server.ts`**:
```typescript
import { nav } from '$lib/cairn.server.js';

export const load = nav.navLoad;
export const actions = { save: nav.navSave };
```

**`src/routes/admin/nav/+page.svelte`** (NavTree takes `data` only; it manages its own form state, unlike `LoginPage` / `ManageEditors`):
```svelte
<script lang="ts">
  import { NavTree } from '@glw907/cairn-cms/components';

  let { data } = $props();
</script>

<NavTree {data} />
```

**`src/routes/admin/login/+page.server.ts`**:
```typescript
import { auth } from '$lib/cairn.server.js';

export const load = auth.loginLoad;
export const actions = { default: auth.requestAction };
```

**`src/routes/admin/login/+page.svelte`**:
```svelte
<script lang="ts">
  import { LoginPage } from '@glw907/cairn-cms/components';

  let { data, form } = $props();
</script>

<LoginPage {data} {form} />
```

**`src/routes/admin/auth/confirm/+page.server.ts`**:
```typescript
import { auth } from '$lib/cairn.server.js';

export const load = auth.confirmLoad;
export const actions = { default: auth.confirmAction };
```

**`src/routes/admin/auth/confirm/+page.svelte`**:
```svelte
<script lang="ts">
  import { ConfirmPage } from '@glw907/cairn-cms/components';

  let { data }: { data: { token: string; siteName: string; error: string | null } } = $props();
</script>

<ConfirmPage {data} />
```

**`src/routes/admin/auth/logout/+server.ts`**:
```typescript
import type { RequestHandler } from './$types.js';
import { auth } from '$lib/cairn.server.js';

export const POST: RequestHandler = (event) => auth.logoutAction(event);
```

**`src/routes/healthz/+server.ts`** (site root, OUTSIDE `/admin` so the guard does not gate it):
```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { healthLoad } from '@glw907/cairn-cms/sveltekit';
import { runtime } from '$lib/cairn.server.js';

// A site that defaults to prerender=true must force this dynamic, or the endpoint gets
// prerendered to a build-time ok:false (no env at build) and can 404 at runtime.
export const prerender = false;

export const GET: RequestHandler = async (event) => {
  try {
    return json(await healthLoad(event, runtime));
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return json({ ok: false, checks: { githubAppSigning: { ok: false, detail } } });
  }
};
```

**`src/app.d.ts`** Locals block changes to:
```typescript
import type { Editor } from '@glw907/cairn-cms';
// ...
declare global {
  namespace App {
    interface Locals {
      editor: Editor | null;
    }
    // Platform.env keeps AUTH_DB, EMAIL, the GitHub App secrets; see Task 1.10 / 2.10.
  }
}
```

---

## Phase 0: Prerequisite (owner-run)

## Task 0: Publish the RC

**This is owner action and blocks every other task.** The model cannot trigger the publish workflow.

- [ ] **Step 1: Owner publishes `0.6.0-rc.0`**

The owner triggers the publish workflow (`.github/workflows/publish.yml`) from the `rebuild` branch under the `rc` dist-tag, per the Plan 07 key-rotation runbook.

- [ ] **Step 2: Verify the RC is on npm**

Run (any repo):
```bash
npm view @glw907/cairn-cms@0.6.0-rc.0 version dist-tags --json
```
Expected: `version` is `0.6.0-rc.0` and `dist-tags.rc` is `0.6.0-rc.0`. `latest` stays `0.5.1`. If this fails, stop; the rest of the plan cannot proceed.

---

## Phase 1: 907-life canary

Working directory for every Phase 1 task: `/home/glw907/Projects/cairn/907-life`. Honor that repo's `CLAUDE.md` and run its gate (`npm run check` plus `npm test`).

## Task 1.1: Pin and reinstall the RC

**Files:**
- Modify: `package.json` (dependencies)

- [ ] **Step 1: Pin the exact RC version**

Edit `package.json` so the dependency reads:
```json
"@glw907/cairn-cms": "0.6.0-rc.0",
```

- [ ] **Step 2: Reinstall against the registry, not the workspace symlink**

Run from the site dir:
```bash
npm install --install-links
```
Expected: `node_modules/@glw907/cairn-cms/package.json` reports version `0.6.0-rc.0`. Verify:
```bash
node -e "console.log(require('@glw907/cairn-cms/package.json').version)"
```
Expected output: `0.6.0-rc.0`. If it prints anything else, the workspace symlink is still shadowing; remove `node_modules/@glw907/cairn-cms` and reinstall.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: pin cairn-cms to 0.6.0-rc.0"
```

## Task 1.2: Rewrite the frontmatter validator to a ValidationResult

The old `validatePostFrontmatter(data, source)` throws on the first error and coerces in place. The new contract returns a `ValidationResult` and never throws.

**Files:**
- Modify: `src/lib/content-schema.ts`
- Test: `src/tests/content-schema.test.ts` (create or extend)

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { validatePostFrontmatter } from '../lib/content-schema.js';

describe('validatePostFrontmatter (ValidationResult)', () => {
  it('rejects a missing title with a field error, no throw', () => {
    const result = validatePostFrontmatter({ date: '2026-05-29' }, 'body');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.title).toBeTruthy();
  });

  it('accepts a valid post and returns normalized data', () => {
    const result = validatePostFrontmatter(
      { title: '  Hi  ', date: '2026-05-29', tags: ['a', ' b '], draft: false },
      'body',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.title).toBe('Hi');
      expect(result.data.tags).toEqual(['a', 'b']);
    }
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- content-schema`
Expected: FAIL (the function still throws / returns void).

- [ ] **Step 3: Rewrite the validator**

```typescript
import type { ValidationResult } from '@glw907/cairn-cms';
import { dateInputValue } from '@glw907/cairn-cms';

export function validatePostFrontmatter(
  frontmatter: Record<string, unknown>,
  _body: string,
): ValidationResult {
  const errors: Record<string, string> = {};

  const title = typeof frontmatter.title === 'string' ? frontmatter.title.trim() : '';
  if (!title) errors.title = 'Title is required';

  const date = dateInputValue(frontmatter.date); // '' when missing/unparseable
  if (!date) errors.date = 'A valid date is required';

  const rawTags = frontmatter.tags;
  const tags = Array.isArray(rawTags)
    ? rawTags.map((t) => String(t).trim()).filter(Boolean)
    : [];

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: { ...frontmatter, title, date, tags, draft: frontmatter.draft === true } };
}
```

Reconcile any additional rules the existing validator enforced (description length and so on) into the same `errors` shape. Preserve every rule; only the return shape changes.

- [ ] **Step 4: Run it and watch it pass**

Run: `npm test -- content-schema`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/content-schema.ts src/tests/content-schema.test.ts
git commit -m "refactor(cms): return ValidationResult from the post validator"
```

## Task 1.3: Rewrite the adapter to the new shape

**Files:**
- Modify: `src/lib/cairn.config.ts`

- [ ] **Step 1: Rewrite `cairn.config.ts`**

```typescript
import type { CairnAdapter } from '@glw907/cairn-cms';
import { validatePostFrontmatter } from './content-schema.js';
import { renderPostHtml } from './posts.js'; // the sanitized public renderer from Task 1.4
import { siteConfig } from './config.js';

export const cairn: CairnAdapter = {
  siteName: siteConfig.siteName ?? '907 life',
  content: {
    posts: {
      dir: 'src/content/posts',
      label: 'Posts',
      fields: [
        { type: 'text', name: 'title', label: 'Title', required: true },
        { type: 'date', name: 'date', label: 'Date' },
        { type: 'textarea', name: 'description', label: 'Description' },
        { type: 'freetags', name: 'tags', label: 'Tags' },
        { type: 'boolean', name: 'draft', label: 'Draft' },
      ],
      validate: validatePostFrontmatter,
    },
  },
  backend: {
    owner: 'glw907',
    repo: '907-life',
    branch: 'main',
    appId: '3847496',
    installationId: '135372268',
  },
  sender: { from: siteConfig.email?.sender ?? 'noreply@907.life' },
  renderPreview: (md) => renderPostHtml(md),
  navMenu: { configPath: 'src/lib/site.config.yaml', menuName: 'primary', label: 'Navigation', maxDepth: 2 },
};
```

Match the exact `fields` to the site's current post form (the survey lists title, date, description, freetags, draft). `renderPreview` reuses the sanitized public renderer so the editor preview matches the published page.

- [ ] **Step 2: Type-check (no commit yet; `posts.ts` changes next)**

Run: `npm run check 2>&1 | head -20`
Expected: the only remaining errors point at `renderPostHtml` not yet existing in `posts.ts`. That is closed in Task 1.4. Do not commit a red tree; this task commits together with Task 1.4.

## Task 1.4: Add the public-render sanitize floor

The public render uses `remark-html` at its default, which passes raw HTML through into `{@html}`. Replace it with an explicit rehype chain that sanitizes.

**Files:**
- Modify: `src/lib/posts.ts`
- Modify: `src/tests/markdown/characterization.test.ts`
- Modify: `package.json` (add render deps)

- [ ] **Step 1: Add the render dependencies**

Run:
```bash
npm install remark-rehype rehype-sanitize rehype-stringify
```

- [ ] **Step 2: Write the failing sanitize test**

Add to `src/tests/markdown/characterization.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { renderPostHtml } from '../../lib/posts.js';

describe('renderPostHtml sanitize floor', () => {
  it('strips a script tag from authored markdown', async () => {
    const html = await renderPostHtml('Hello\n\n<script>alert(1)</script>');
    expect(html).not.toContain('<script>');
  });

  it('keeps ordinary markdown', async () => {
    const html = await renderPostHtml('# Title\n\nA **bold** word.');
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<strong>bold</strong>');
  });
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `npm test -- characterization`
Expected: FAIL (`renderPostHtml` is not exported yet).

- [ ] **Step 4: Add the sanitized renderer and route the existing render through it**

In `src/lib/posts.ts`, replace the `remark().use(remarkGfm).use(remarkHtml)` render with:
```typescript
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';

/** Render a post body to sanitized HTML for the public page and the admin preview. */
export async function renderPostHtml(markdown: string): Promise<string> {
  const file = await remark()
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSanitize)
    .use(rehypeStringify)
    .process(markdown);
  return String(file);
}
```
Change `getPost()` to `html: await renderPostHtml(content)`. Remove the now-unused `remark-html` import.

- [ ] **Step 5: Regenerate the characterization snapshot intentionally**

The output formatting shifts from `remark-html` to the rehype chain. Run the suite, inspect the snapshot diff, and confirm every change is formatting or the dropped raw HTML, never lost content:
```bash
npm test -- characterization 2>&1 | head -40
```
If the only diffs are whitespace and the sanitized hostile input, update the snapshot:
```bash
npm test -- characterization -u
```

- [ ] **Step 6: Run the targeted tests and the type-check**

Run: `npm test -- characterization && npm run check`
Expected: PASS and 0/0.

- [ ] **Step 7: Commit Tasks 1.3 and 1.4 together**

```bash
git add src/lib/cairn.config.ts src/lib/posts.ts src/lib/content-schema.ts src/tests package.json package-lock.json
git commit -m "feat(cms): new adapter shape and a rehype-sanitize public render floor"
```

## Task 1.5: Swap the auth hook and Locals

**Files:**
- Replace: `src/hooks.server.ts`
- Modify: `src/app.d.ts`

- [ ] **Step 1: Replace `hooks.server.ts`**

Use the Shared shim reference `src/hooks.server.ts` (the two-line `createAuthGuard()` export). Remove the old `createAuth` / `loadSession` per-request wiring and the public-path allowlist (the guard owns the allowlist now).

- [ ] **Step 2: Update `app.d.ts` Locals**

Change `Locals` to `{ editor: Editor | null }` per the Shared shim reference, importing `Editor` from `@glw907/cairn-cms`. Remove the `Auth` / `CairnUser` imports. Keep `Platform.env` for now; Task 1.10 prunes it.

- [ ] **Step 3: Type-check**

Run: `npm run check 2>&1 | head -20`
Expected: remaining errors point only at the not-yet-rewritten admin routes (closed in Tasks 1.6 to 1.9).

## Task 1.6: Wire the content, layout, and healthz route shims

**Files:**
- Create: `src/lib/cairn.server.ts`
- Replace: `src/routes/admin/+layout.server.ts`, `src/routes/admin/+layout.svelte`, `src/routes/admin/+page.server.ts`, `src/routes/admin/healthz/+server.ts`
- Create: `src/routes/admin/[concept]/+page.server.ts`, `src/routes/admin/[concept]/+page.svelte`, `src/routes/admin/edit/[concept]/[id]/+page.server.ts`, `src/routes/admin/edit/[concept]/[id]/+page.svelte`
- Delete: `src/routes/admin/[collection]/` (whole dir), `src/routes/admin/save/+server.ts`, `src/routes/admin/edit/[type]/` (whole dir)

- [ ] **Step 1: Create `src/lib/cairn.server.ts`**

Use the Shared shim reference exactly.

- [ ] **Step 2: Create and replace the content, layout, and healthz files**

Create each file from the Shared shim reference: the two `+layout` files, `+page.server.ts` (index redirect), the `[concept]` list pair, the `edit/[concept]/[id]` pair, and `healthz/+server.ts`.

- [ ] **Step 3: Delete the old-shape routes**

```bash
git rm -r src/routes/admin/[collection] src/routes/admin/save src/routes/admin/edit/[type]
```

- [ ] **Step 4: Type-check**

Run: `npm run check 2>&1 | head -20`
Expected: remaining errors point only at the auth, editors, and nav routes (closed next).

## Task 1.7: Wire the auth route shims

**Files:**
- Create: `src/routes/admin/login/+page.server.ts`
- Replace: `src/routes/admin/login/+page.svelte`, `src/routes/admin/auth/confirm/+page.server.ts`, `src/routes/admin/auth/confirm/+page.svelte`, `src/routes/admin/auth/logout/+server.ts`
- Delete: any `src/routes/api/auth/` better-auth catch-all

- [ ] **Step 1: Create and replace the auth files**

Create each from the Shared shim reference: `login/+page.server.ts`, `login/+page.svelte`, `auth/confirm/+page.server.ts`, `auth/confirm/+page.svelte`, `auth/logout/+server.ts`.

- [ ] **Step 2: Delete the better-auth API catch-all**

```bash
git rm -r src/routes/api/auth 2>/dev/null || echo "no api/auth route to remove"
```

- [ ] **Step 3: Type-check**

Run: `npm run check 2>&1 | head -20`
Expected: remaining errors point only at the editors and nav routes.

## Task 1.8: Wire the editors route (rename admins → editors)

**Files:**
- Create: `src/routes/admin/editors/+page.server.ts`, `src/routes/admin/editors/+page.svelte`
- Delete: `src/routes/admin/admins/` (whole dir)

- [ ] **Step 1: Create the editors pair from the Shared shim reference**

- [ ] **Step 2: Delete the old admins route**

```bash
git rm -r src/routes/admin/admins
```

- [ ] **Step 3: Type-check**

Run: `npm run check 2>&1 | head -20`
Expected: remaining errors point only at the nav route.

## Task 1.9: Wire the nav route shim

**Files:**
- Replace: `src/routes/admin/nav/+page.server.ts`, `src/routes/admin/nav/+page.svelte`

- [ ] **Step 1: Replace the nav pair from the Shared shim reference**

- [ ] **Step 2: Full type-check**

Run: `npm run check`
Expected: 0 errors, 0 warnings.

- [ ] **Step 3: Commit Tasks 1.5 to 1.9**

```bash
git add src/lib/cairn.server.ts src/hooks.server.ts src/app.d.ts src/routes/admin
git commit -m "feat(admin): repoint the admin tree to the rebuilt route factories"
```

## Task 1.10: wrangler and env cleanup

**Files:**
- Modify: `wrangler.toml`
- Modify: `.dev.vars` (local only, not committed)
- Modify: `src/app.d.ts` (Platform.env prune)

- [ ] **Step 1: Set `PUBLIC_ORIGIN` and drop the better-auth vars**

In `wrangler.toml`, under `[vars]`, remove `BETTER_AUTH_URL` and add:
```toml
PUBLIC_ORIGIN = "https://907.life"
```
Remove the `AUTH_SECRET` reference from config and from the Worker secret list at deploy time (the new auth needs no shared signing secret). Remove `migrations_dir = "drizzle/migrations"` from the `[[d1_databases]]` block, or repoint it at the cairn migration directory (Task 1.12 applies the migration directly, so removal is fine). Leave the legacy `[[kv_namespaces]] AUTH_KV` in place for canary rollback grace.

- [ ] **Step 2: Set `PUBLIC_ORIGIN` for local dev**

In `.dev.vars`, add `PUBLIC_ORIGIN = "http://localhost:5173"` (match the dev port). Keep `GITHUB_APP_PRIVATE_KEY_B64` present locally for the healthz check.

- [ ] **Step 3: Prune `Platform.env` types**

In `src/app.d.ts`, remove `AUTH_SECRET` and `BETTER_AUTH_URL`, add `PUBLIC_ORIGIN: string`. Keep `AUTH_DB`, `EMAIL`, the `SEND_EMAIL` contact binding, and the three GitHub App vars.

- [ ] **Step 4: Type-check and commit**

Run: `npm run check`
Expected: 0/0.
```bash
git add wrangler.toml src/app.d.ts
git commit -m "build(cms): configure PUBLIC_ORIGIN and drop the better-auth env"
```

## Task 1.11: Local full-suite gate

- [ ] **Step 1: Run the whole gate**

Run:
```bash
npm run check && npm test
```
Expected: `check` 0/0 and `npm test` exits 0. Fix every failure before moving on. A passing assertion count is not enough; the process must exit 0.

## Task 1.12: Apply the auth migration and seed the allowlist (live D1)

This is operational. It runs against the live `cairn-907-auth` database through the Cloudflare MCP. There is no failing test; the verification is the row read-back.

**Files:**
- Reference only: the engine's `migrations/0000_auth.sql` (the three-table schema)

- [ ] **Step 1: Read the current editor allowlist from the live DB**

Use the Cloudflare MCP `d1_database_query` against `cairn-907-auth` to read the existing better-auth users and roles. Inspect the actual table and column names first:
```sql
SELECT name FROM sqlite_master WHERE type='table';
```
Then read the rows that hold the allowlist (email, name, role). Record them as evidence.

- [ ] **Step 2: Create the new tables**

Apply the engine's `migrations/0000_auth.sql` (the `editor`, `magic_token`, `session` tables and their indexes) to `cairn-907-auth` via `d1_database_query`. The new names do not collide with the better-auth tables, so this is additive.

- [ ] **Step 3: Seed `editor` from the rows read in Step 1**

Insert one `editor` row per current editor, preserving email and display name, geoff as `owner`. Epoch-millisecond `created_at`. Example shape:
```sql
INSERT INTO editor (email, display_name, role, created_at)
VALUES ('geoff-login@907.life', 'Geoff', 'owner', 1748534400000);
```

- [ ] **Step 4: Verify**

Run a `SELECT email, role FROM editor;` and confirm every current editor is present with the right role and exactly one owner. Record the result as evidence in the plan progress log.

## Task 1.13: Deploy dry-run

- [ ] **Step 1: Build guard**

Run from the site dir:
```bash
npx wrangler deploy --dry-run
```
Expected: a clean build with no unresolved bindings or import errors. Fix any before deploying.

## Task 1.14: Deploy and live smoke

Operational. Evidence-gathering, not TDD.

- [ ] **Step 1: Deploy**

```bash
npx wrangler deploy
```

- [ ] **Step 2: Confirm the signer is healthy live**

```bash
curl -s https://907.life/admin/healthz | head
```
Expected: JSON with `ok: true`. A `false` here means the production `GITHUB_APP_PRIVATE_KEY_B64` secret is missing or wrong; set it with `npx wrangler secret put GITHUB_APP_PRIVATE_KEY_B64` and redeploy.

- [ ] **Step 3: Live admin smoke**

Mint a session by inserting a `session` row directly through the Cloudflare MCP (id, your editor email, an `expires_at` an hour out, epoch-ms `created_at`), set the session cookie in the browser, and walk: list a concept, open the editor, see the sanitized preview, save a trivial edit (confirm the commit lands as `cairn-cms[bot]` with you as author), open `/admin/nav` and reorder one item and save, open `/admin/editors`. The magic-link request-and-click stays a manual browser step. Record results as evidence.

- [ ] **Step 4: Record the canary outcome**

Append the live-smoke evidence to this plan's progress log before starting Phase 2.

---

## Phase 1 canary lessons (apply to Phase 2)

The 907-life canary surfaced reconciliations the survey did not predict. Expect the same on ecnordic and handle them:

- **No test runner is wired in the site repos.** 907-life had an orphan characterization test, no `vitest` dep, and no `test` script. Wire vitest (add the dep, a `"test": "vitest run"` script, a `vitest.config.ts` with a `$lib` alias) before the TDD tasks. ecnordic already ships a vitest setup; confirm it runs and reuse it.
- **Preserve existing custom hook logic with `sequence()`.** The bare `createAuthGuard()` shim drops anything the site's old `hooks.server.ts` did beyond auth. 907-life injected the saved theme into the SSR'd `<html data-theme>`; the fix was `export const handle = sequence(theme, createAuthGuard())`. Read ecnordic's current `hooks.server.ts` first and keep every non-auth behavior (Turnstile, redirects, headers) the same way.
- **The 0.6 engine types ripple into pre-existing files.** `SiteConfig` now surfaces `settings` / `email` through an index signature typed `unknown`, which breaks any site file that read them loosely (907-life's `config.ts` and an unrelated page load). `EmailSender` is no longer a root export; type the `EMAIL` binding as `NonNullable<AuthEnv['EMAIL']>`. The 0/0 gate forces these fixes even though they sit outside the admin tree.
- **`NavTree` takes `{ data }` only** (it owns its form state). `LoginPage` and `ManageEditors` take `{ data, form }`. `ManageEditors` declares an unused `data.siteName` in its Props; the untyped shim compiles without it and the component never reads it, so leave it.
- **Dead deps linger.** `better-auth`, `drizzle-orm`, `remark-html`, and `carta-md` fall out of use. Removing them is a later cleanup, not a cutover task.
- **Login loops unless the authed shell sits in its own group.** The engine's `layoutLoad` calls `requireSession` and redirects a sessionless visitor to `/admin/login`. With login under that same layout the redirect is infinite. The showcase never hit this (its fake auth gave every request a session). Fix: put the authed pages and the `AdminLayout` shell in a URL-transparent `(app)` group, and keep `login` and `auth` as siblings under a bare `admin/+layout` that only sets `prerender = false`. See the corrected Shared shim reference structure.
- **Health check lives at `/healthz`, not `/admin/healthz`.** The guard gates the whole `/admin` tree, so an unauthenticated deploy-time health check cannot live there. Put the route at the site root, `src/routes/healthz/+server.ts`. (The Plan 07 showcase put it under `/admin`, which only worked because its E2E ran authenticated.)
- **Build before every deploy.** `wrangler deploy` uploads the prebuilt `.svelte-kit/cloudflare` output; it does not build. After any code or route-structure change, run `npm run build` first, then `npx wrangler deploy`. A stale build silently ships the old route tree (it masked the login loop with a prerendered login page).
- **The live `AUTH_DB` already has a `session` table** (better-auth's, with different columns), colliding with the cairn schema's `session`. Before applying the migration, `ALTER TABLE session RENAME TO ba_session` to free the name and keep the old rows for rollback. `editor` and `magic_token` are new and do not collide.
- **The editor lives at `/admin/[concept]/[id]`, not `/admin/edit/...`.** `ConceptList` links and the save/new/error redirects all target `/admin/<concept>/<id>`. Nest the editor under the concept (see the structure block). The showcase's `edit/` segment is wrong.
- **Force `prerender = false` on the `/healthz` endpoint.** A site that defaults to `prerender = true` (907-life does) will prerender the health check to a build-time `ok:false` and it can 404 at runtime. The `/admin` subtree gets `prerender = false` from `admin/+layout.server.ts`, but the root `/healthz` needs its own.

## Phase 2: ecnordic-ski

Working directory for every Phase 2 task: `/home/glw907/Projects/cairn/ecnordic-ski`. Honor that repo's `CLAUDE.md` and gate. The route shims are identical to Phase 1 (Shared shim reference). The site-specific work is the two-concept adapter, the directive sanitize schema, and the directive `renderPreview`.

## Task 2.1: Pin and reinstall the RC

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Pin the exact RC**

Set `"@glw907/cairn-cms": "0.6.0-rc.0"` in `package.json`.

- [ ] **Step 2: Reinstall and verify**

```bash
npm install --install-links
node -e "console.log(require('@glw907/cairn-cms/package.json').version)"
```
Expected: `0.6.0-rc.0`. Remove `node_modules/@glw907/cairn-cms` and reinstall if the symlink shadows.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: pin cairn-cms to 0.6.0-rc.0"
```

## Task 2.2: Rewrite both validators to ValidationResult

ecnordic declares `posts` and `pages`, so both `validatePostFrontmatter` and `validatePageFrontmatter` change shape.

**Files:**
- Modify: `src/lib/content-schema.ts`
- Test: `src/tests/content-schema.test.ts` (create or extend)

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import { validatePostFrontmatter, validatePageFrontmatter } from '../lib/content-schema.js';

describe('validators return a ValidationResult', () => {
  it('post: missing title is a field error', () => {
    const r = validatePostFrontmatter({ date: '2026-05-29' }, 'b');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.title).toBeTruthy();
  });

  it('post: valid input normalizes', () => {
    const r = validatePostFrontmatter({ title: ' Hi ', date: '2026-05-29' }, 'b');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.title).toBe('Hi');
  });

  it('page: title only, missing title fails', () => {
    expect(validatePageFrontmatter({}, 'b').ok).toBe(false);
    expect(validatePageFrontmatter({ title: 'About' }, 'b').ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run and watch fail**

Run: `npm test -- content-schema`
Expected: FAIL.

- [ ] **Step 3: Rewrite both validators**

```typescript
import type { ValidationResult } from '@glw907/cairn-cms';
import { dateInputValue } from '@glw907/cairn-cms';

export function validatePostFrontmatter(
  frontmatter: Record<string, unknown>,
  _body: string,
): ValidationResult {
  const errors: Record<string, string> = {};
  const title = typeof frontmatter.title === 'string' ? frontmatter.title.trim() : '';
  if (!title) errors.title = 'Title is required';
  const date = dateInputValue(frontmatter.date);
  if (!date) errors.date = 'A valid date is required';
  const rawTags = frontmatter.tags;
  const tags = Array.isArray(rawTags) ? rawTags.map((t) => String(t).trim()).filter(Boolean) : [];
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: { ...frontmatter, title, date, tags, draft: frontmatter.draft === true } };
}

export function validatePageFrontmatter(
  frontmatter: Record<string, unknown>,
  _body: string,
): ValidationResult {
  const title = typeof frontmatter.title === 'string' ? frontmatter.title.trim() : '';
  if (!title) return { ok: false, errors: { title: 'Title is required' } };
  return { ok: true, data: { ...frontmatter, title } };
}
```
Carry over any extra rules the existing validators enforced into the `errors` map.

- [ ] **Step 4: Run and watch pass**

Run: `npm test -- content-schema`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/content-schema.ts src/tests/content-schema.test.ts
git commit -m "refactor(cms): return ValidationResult from both validators"
```

## Task 2.3: Build the directive sanitize schema and floor

This is the highest-risk task. ecnordic's public render runs through the engine's `createRenderer` (raw HTML passes through via `rehype-raw`). Sanitize the engine's output string with a custom schema that allowlists the directive output and the `<a class="download-link">` anchor.

**Files:**
- Create: `src/lib/markdown/sanitize.ts`
- Modify: `src/lib/markdown/render.ts` (or `src/lib/utils.ts`, wherever `markdownToHtml` lives)
- Modify: the public-render characterization test
- Modify: `package.json` (add `rehype-sanitize`, `rehype-parse`, `rehype-stringify`, `unified` if not already direct deps)

- [ ] **Step 1: Add the sanitize deps**

```bash
npm install rehype-sanitize rehype-parse rehype-stringify unified
```

- [ ] **Step 2: Write the failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '../../lib/markdown/sanitize.js';

describe('ecnordic sanitize floor', () => {
  it('strips a script and an onclick handler', async () => {
    const out = await sanitizeHtml('<p onclick="x()">hi</p><script>alert(1)</script>');
    expect(out).not.toContain('<script>');
    expect(out).not.toContain('onclick');
  });

  it('keeps the directive classes and the download-link anchor', async () => {
    const out = await sanitizeHtml(
      '<section class="ec-card"><a class="download-link" href="/x.pdf">Get</a></section>',
    );
    expect(out).toContain('class="ec-card"');
    expect(out).toContain('class="download-link"');
    expect(out).toContain('href="/x.pdf"');
  });

  it('keeps a glyph svg path', async () => {
    const out = await sanitizeHtml('<svg viewBox="0 0 24 24"><path d="M0 0h24"/></svg>');
    expect(out).toContain('<svg');
    expect(out).toContain('<path');
  });
});
```

- [ ] **Step 3: Run and watch fail**

Run: `npm test -- sanitize`
Expected: FAIL (`sanitizeHtml` not exported).

- [ ] **Step 4: Implement the schema and the sanitize pass**

```typescript
// A defense-in-depth floor over the engine's rendered HTML. The engine's directive output is
// engine-controlled, but rehype-raw passes authored raw HTML through, so an editor could commit
// a <script>. This sanitizes the final string while allowlisting every element and attribute the
// directive vocabulary emits. Classes are allowed globally (they do not execute) so directive
// class names survive without enumerating each element; scripts, event handlers, and unsafe URL
// schemes are dropped by the default schema's core rules.
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeStringify from 'rehype-stringify';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

const schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'section', 'svg', 'path'],
  attributes: {
    ...defaultSchema.attributes,
    '*': [...(defaultSchema.attributes?.['*'] ?? []), 'className'],
    a: [...(defaultSchema.attributes?.a ?? []), 'className', 'download'],
    svg: ['xmlns', 'viewBox', 'fill', 'stroke', 'strokeWidth', 'strokeLinecap', 'strokeLinejoin', 'width', 'height', 'ariaHidden', 'role', 'className'],
    path: ['d', 'fill', 'stroke', 'strokeWidth', 'strokeLinecap', 'strokeLinejoin', 'className'],
  },
};

const processor = unified()
  .use(rehypeParse, { fragment: true })
  .use(rehypeSanitize, schema)
  .use(rehypeStringify);

/** Sanitize a rendered HTML fragment, keeping the directive output and dropping hostile markup. */
export async function sanitizeHtml(html: string): Promise<string> {
  return String(await processor.process(html));
}
```

- [ ] **Step 5: Route the public renderer through the floor**

Where `markdownToHtml` returns the engine output, wrap it:
```typescript
import { sanitizeHtml } from './sanitize.js';
// ...
export async function markdownToHtml(md: string): Promise<string> {
  const rendered = await renderMarkdown(md); // existing engine call
  return sanitizeHtml(rendered);
}
```

- [ ] **Step 6: Tune the schema against the real characterization fixtures**

Run the public-render characterization suite. Inspect the diff element by element. Every directive (card, grid, alert, cta, split, panel, passage) and every glyph must still render; the download-link anchor and its class must survive. If a legitimate element or attribute is stripped, add it to the schema and rerun. Only update the snapshot once the diff is purely the dropped hostile markup and intended formatting:
```bash
npm test -- characterization 2>&1 | head -60
# inspect, tune the schema, then:
npm test -- characterization -u
```

- [ ] **Step 7: Run the targeted tests**

Run: `npm test -- sanitize characterization && npm run check`
Expected: PASS and 0/0.

- [ ] **Step 8: Commit**

```bash
git add src/lib/markdown package.json package-lock.json src/tests
git commit -m "feat(cms): sanitize floor over the directive render, allowlisting the directive output"
```

## Task 2.4: Rewrite the adapter (two concepts, directive preview)

**Files:**
- Modify: `src/lib/cairn.config.ts`

- [ ] **Step 1: Rewrite `cairn.config.ts`**

```typescript
import type { CairnAdapter } from '@glw907/cairn-cms';
import { validatePostFrontmatter, validatePageFrontmatter } from './content-schema.js';
import { ecnordicRegistry } from './markdown/components.js';
import { markdownToHtml } from './markdown/render.js'; // the sanitized renderer from Task 2.3
import { siteConfig } from './config.js';

export const cairn: CairnAdapter = {
  siteName: siteConfig.siteName ?? 'EC Nordic',
  content: {
    posts: {
      dir: 'src/content/posts',
      label: 'Posts',
      fields: [
        { type: 'text', name: 'title', label: 'Title', required: true },
        { type: 'date', name: 'date', label: 'Date' },
        { type: 'textarea', name: 'description', label: 'Description' },
        { type: 'tags', name: 'tags', label: 'Tags' },
        { type: 'boolean', name: 'draft', label: 'Draft' },
      ],
      validate: validatePostFrontmatter,
    },
    pages: {
      dir: 'src/content/pages',
      label: 'Pages',
      fields: [{ type: 'text', name: 'title', label: 'Title', required: true }],
      validate: validatePageFrontmatter,
    },
  },
  backend: {
    owner: 'glw907',
    repo: 'ecnordic-ski',
    branch: 'main',
    appId: '3847496',
    installationId: '135372268',
  },
  sender: { from: siteConfig.email?.sender ?? 'noreply@ecnordic.ski' },
  renderPreview: (md) => markdownToHtml(md),
  registry: ecnordicRegistry,
  navMenu: { configPath: 'src/lib/site.config.yaml', menuName: 'primary', label: 'Navigation', maxDepth: 2 },
};
```

Match the `posts` fields to ecnordic's current post form (controlled `tags`, per the survey). `registry` keeps the insert-component palette working in the editor. `renderPreview` runs the same sanitized directive render as the public page.

- [ ] **Step 2: Type-check**

Run: `npm run check 2>&1 | head -20`
Expected: remaining errors point only at the not-yet-rewritten admin routes (next tasks).

## Task 2.5: Swap the auth hook and Locals

**Files:**
- Replace: `src/hooks.server.ts`
- Modify: `src/app.d.ts`

- [ ] **Step 1: Replace `hooks.server.ts`** with the Shared shim reference `createAuthGuard()` export.

- [ ] **Step 2: Change `Locals`** to `{ editor: Editor | null }`, importing `Editor` from `@glw907/cairn-cms`; drop `Auth` / `CairnUser`.

- [ ] **Step 3: Type-check**

Run: `npm run check 2>&1 | head -20`
Expected: remaining errors point only at the admin routes.

## Task 2.6: Wire the content, layout, and healthz route shims

**Files:**
- Create: `src/lib/cairn.server.ts`
- Replace: `src/routes/admin/+layout.server.ts`, `+layout.svelte`, `+page.server.ts`, `healthz/+server.ts`
- Create: `src/routes/admin/[concept]/+page.server.ts`, `+page.svelte`, `src/routes/admin/edit/[concept]/[id]/+page.server.ts`, `+page.svelte`
- Delete: `src/routes/admin/[collection]/`, `src/routes/admin/save/+server.ts`, `src/routes/admin/edit/[type]/`

- [ ] **Step 1: Create `src/lib/cairn.server.ts`** from the Shared shim reference.

- [ ] **Step 2: Create and replace the content, layout, and healthz files** from the Shared shim reference.

- [ ] **Step 3: Delete the old-shape routes**

```bash
git rm -r src/routes/admin/[collection] src/routes/admin/save src/routes/admin/edit/[type]
```

- [ ] **Step 4: Type-check**

Run: `npm run check 2>&1 | head -20`
Expected: remaining errors point only at auth, editors, and nav.

## Task 2.7: Wire the auth route shims

**Files:**
- Create: `src/routes/admin/login/+page.server.ts`
- Replace: `src/routes/admin/login/+page.svelte`, `src/routes/admin/auth/confirm/+page.server.ts`, `+page.svelte`, `src/routes/admin/auth/logout/+server.ts`
- Delete: any `src/routes/api/auth/`

- [ ] **Step 1: Create and replace the auth files** from the Shared shim reference.

- [ ] **Step 2: Delete the better-auth API catch-all**

```bash
git rm -r src/routes/api/auth 2>/dev/null || echo "no api/auth route to remove"
```

- [ ] **Step 3: Type-check**

Run: `npm run check 2>&1 | head -20`
Expected: remaining errors point only at editors and nav.

## Task 2.8: Wire the editors route

**Files:**
- Create: `src/routes/admin/editors/+page.server.ts`, `+page.svelte`
- Delete: `src/routes/admin/admins/`

- [ ] **Step 1: Create the editors pair** from the Shared shim reference.

- [ ] **Step 2: Delete the old admins route**

```bash
git rm -r src/routes/admin/admins
```

- [ ] **Step 3: Type-check**

Run: `npm run check 2>&1 | head -20`
Expected: remaining errors point only at nav.

## Task 2.9: Wire the nav route shim

**Files:**
- Replace: `src/routes/admin/nav/+page.server.ts`, `+page.svelte`

- [ ] **Step 1: Replace the nav pair** from the Shared shim reference.

- [ ] **Step 2: Full type-check**

Run: `npm run check`
Expected: 0/0.

- [ ] **Step 3: Commit Tasks 2.4 to 2.9**

```bash
git add src/lib/cairn.config.ts src/lib/cairn.server.ts src/hooks.server.ts src/app.d.ts src/routes/admin
git commit -m "feat(admin): repoint the admin tree to the rebuilt route factories"
```

## Task 2.10: wrangler and env cleanup

**Files:**
- Modify: `wrangler.toml`, `.dev.vars`, `src/app.d.ts`

- [ ] **Step 1: Set `PUBLIC_ORIGIN`, drop better-auth vars**

In `wrangler.toml`, remove `BETTER_AUTH_URL`, add `PUBLIC_ORIGIN = "https://ecnordic.ski"` under `[vars]`, remove the Drizzle `migrations_dir`, and leave `AUTH_KV` for rollback grace. Drop `AUTH_SECRET` from the deploy-time secret list.

- [ ] **Step 2: Local dev origin**

In `.dev.vars`, add `PUBLIC_ORIGIN = "http://localhost:5173"`. Keep `GITHUB_APP_PRIVATE_KEY_B64`.

- [ ] **Step 3: Prune `Platform.env`**

Remove `AUTH_SECRET` and `BETTER_AUTH_URL`, add `PUBLIC_ORIGIN: string`. Keep `AUTH_DB`, `EMAIL`, `SEND_EMAIL`, the GitHub App vars, and the site's own `TURNSTILE_SECRET_KEY` / `CONTACT_EMAIL`.

- [ ] **Step 4: Type-check and commit**

Run: `npm run check`
Expected: 0/0.
```bash
git add wrangler.toml src/app.d.ts
git commit -m "build(cms): configure PUBLIC_ORIGIN and drop the better-auth env"
```

## Task 2.11: Local full-suite gate

- [ ] **Step 1: Run the whole gate**

Run: `npm run check && npm test`
Expected: 0/0 and `npm test` exits 0. Fix every failure.

## Task 2.12: Apply the auth migration and seed the allowlist (live D1)

Operational, against `cairn-ecnordic-auth` through the Cloudflare MCP.

- [ ] **Step 1: Read the current allowlist** from `cairn-ecnordic-auth` (inspect `sqlite_master`, then read the editor rows). Record as evidence.

- [ ] **Step 2: Free the colliding name, then apply the migration.** Better-auth's `session` table collides with the cairn schema. First `ALTER TABLE session RENAME TO ba_session` (preserves the rows for rollback), then apply `migrations/0000_auth.sql` (the three tables and indexes) via `d1_database_query`.

- [ ] **Step 3: Seed `editor`** from Step 1's rows, geoff as `owner`, epoch-ms `created_at`.

- [ ] **Step 4: Verify** with `SELECT email, role FROM editor;`; confirm every editor is present, exactly one owner. Record as evidence.

## Task 2.13: Deploy dry-run

- [ ] **Step 1: Build guard**

Run: `npm run build && npx wrangler deploy --dry-run`
Expected: clean build, no unresolved bindings. Fix any before deploying. (`wrangler deploy` does not build; always `npm run build` first or it ships a stale route tree.)

## Task 2.14: Deploy and live smoke

- [ ] **Step 1: Build and deploy**

Run: `npm run build && npx wrangler deploy`

- [ ] **Step 2: Healthz**

Run: `curl -s https://ecnordic.ski/admin/healthz | head`
Expected: JSON `ok: true`. Set the production `GITHUB_APP_PRIVATE_KEY_B64` secret and redeploy if `false`.

- [ ] **Step 3: Live admin smoke**

Mint a session row through the Cloudflare MCP, then walk both concepts: list posts and pages, open the editor, confirm the directive preview renders sanitized, save a trivial edit (commit as `cairn-cms[bot]`, you as author), reorder and save `/admin/nav`, open `/admin/editors`. Confirm a public page still renders its CTA download link after the sanitize floor. Record evidence.

- [ ] **Step 4: Record the outcome** in this plan's progress log.

---

## Phase 3: Merge

Working directory: `/home/glw907/Projects/cairn/cairn-cms-rebuild`.

## Task 3.1: Merge rebuild to main

- [ ] **Step 1: Confirm both sites run the RC in production**

Both live `/admin/healthz` endpoints return `ok: true` and both live smokes passed. Do not merge before this.

- [ ] **Step 2: Push the branches first (at the user's request)**

The `rebuild` branch is many commits ahead of `origin/rebuild`. Push it before merging so the history is backed up:
```bash
git push origin rebuild
```

- [ ] **Step 3: Merge with --no-ff**

```bash
git fetch origin
git checkout main
git merge --no-ff rebuild -m "merge: rebuild the cairn-cms engine (plans 00-08)"
```
Resolve conflicts if any (the live `main` carried the pre-rebuild `src/`; the rebuild froze it under `legacy/`, so the trees should be largely disjoint). Run `npm run check && npm test` on `main` after the merge.

- [ ] **Step 4: Push main (at the user's request)**

```bash
git push origin main
```

## Task 3.2: Update tracking

- [ ] **Step 1: Append the Plan 08 post-mortem** to this file: what landed, the live-smoke evidence per site, decisions confirmed or changed, and any carried follow-ups.

- [ ] **Step 2: Update the `cairn-rebuild-initiative` memory** to mark Plan 08 landed and set the next pass (Plan 09 `CairnExtension` machinery). Do not write cairn state into a site's `STATUS.md`.

---

## Self-review notes

- **Spec coverage:** Phase 0 covers the RC publish prerequisite. The pin and the workspace-symlink shadowing land in Tasks .1. The adapter, validators, and sanitize floor land in Tasks .2 to .4. The full route rewrite and the canonical renames span Tasks .5 to .9. wrangler and env cleanup is Tasks .10. The D1 auth migration and the editor seed are Tasks .12. Dry-run, deploy, healthz, and the live smoke including `/admin/nav` are Tasks .13 and .14. Phase 3 carries the `--no-ff` merge. Every design section maps to a task.
- **Operational vs test-first:** Tasks .2 to .4 are test-first. Tasks .1, .5 to .11, .12 to .14, and Phase 3 are operational or mechanical (route wiring proven by the engine's own unit tests plus the live smoke), and say so.
- **First real auth wiring:** the sites are the first consumers to wire `createAuthRoutes` / `createEditorRoutes` / `createNavRoutes`. The live smoke (Tasks 1.14 / 2.14) is the end-to-end proof the showcase could not give.
</content>
