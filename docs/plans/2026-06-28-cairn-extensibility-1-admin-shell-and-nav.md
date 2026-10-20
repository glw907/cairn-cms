# Developer Extensibility Plan 1: Admin Shell and Custom-Screen Seam

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a developer add a custom admin screen as a normal concrete SvelteKit route under `/admin/`, rendered inside cairn's chrome, behind the editor login, with a data-only sidebar entry, without forking the catch-all or editing the `CairnAdmin` view switch.

**Architecture:** Relocate cairn's admin chrome from inside `CairnAdmin` to a shared `/admin/+layout.svelte`. The chrome component (today's already-exported `AdminLayout`, renamed `CairnAdminShell`) consumes a shell payload produced by a new `admin.shellLoad` wired to `/admin/+layout.server.ts`; it already takes a `children` snippet and already hands a CSRF-token getter to descendant forms through Svelte context. The per-view `admin.load` stops re-loading the shell data and returns only its view payload, rendered bare by `CairnAdmin` inside the shell. A concrete route like `/admin/signups` wins over the `/admin/[...path]` catch-all, inherits the guard (so `locals.editor` is populated), and renders its own content inside the same shell. A data-only `adminNav` config adds the custom sidebar entry.

**Tech Stack:** TypeScript, Svelte 5 (runes, snippets, context), SvelteKit 2 (layout loads, streamed promises, named form actions), Cloudflare D1, Vitest (node unit + chromium browser component), Playwright e2e (Vite preview harness), `svelte-package`, DaisyUI 5 / Tailwind 4, Lucide icons.

## Global Constraints

- **Charter, premise-checked.** cairn owns the admin frame and serves everything else with a thin seam. No principal/scopes/member/permissions substrate, no component dispatcher/registry, no `query()` on the content backend. A custom screen is the developer's own route; cairn provides chrome + a data-only nav entry + the identity contract only. Source: `CLAUDE.md` "What cairn is" and `docs/internal/what-cairn-is-and-is-not.md`.
- **DX is high-priority (Geoff's steer).** cairn must be an easy, non-restrictive starting point to extend. Low boilerplate, no silent footguns, clear errors. But "non-restrictive" is low-friction, not "accommodate every universe"; do not let a DX want re-grow scope.
- **Owner/editor only.** Auth gates the admin. `locals.editor` is the identity contract. No new actor.
- **Lean shell load — never block on GitHub.** `shellLoad` must not synchronously await `listBranches`; the pending-publish count streams as a deferred promise so a custom route and the login page never pay a GitHub round-trip up front. The public (login/auth) path returns early and never calls `listBranches` at all.
- **Data-only nav.** `adminNav` is `{ label, icon, href, ownerOnly? }` with `icon` a typed Lucide name from a fixed allowlist (never an arbitrary Svelte component). `ownerOnly` hides the link only; the route must still gate server-side.
- **One collision authority.** A custom `adminNav` href is valid only if `parseAdminPath(href, concepts)` returns `null` (genuinely unclaimed). That one predicate already covers reserved segments, the `media` view, the `index` redirect, and every concept route — do not reimplement a partial reserved-segment list (it would miss `media`/`index`).
- **Layering.** `src/lib/content/*` must not import from `src/lib/components/*` or `src/lib/sveltekit/*`. `adminNav` validation that needs `parseAdminPath` (a `/sveltekit` symbol) and the icon-name set lives in the `/sveltekit` layer, not in `compose.ts`.
- **Version floor:** svelte `^5.56.3`, `@sveltejs/kit ^2.12` (unchanged). This is breaking-within-0.x (the consumer mount gains two files, `AdminLayout` is renamed, per-view `AdminData` drops `layout`); bump per `check:version` (minor). Hold the release: Plan 2 (enforcement) ships in the same minor; do not publish until both land.
- **Gate before done (each task):** the task's targeted test, then `npm run check` (svelte-check 0/0), then `npm test` (exit 0). The worktree must `npm run package` before `npm test` if dist-importing components are touched (the `cairn-worktree-needs-dist-build` note). The full pass-end gate (`check:comments`, the four doc gates, `check:reference`, `check:package`, `check:version`, reviewer fan-out, from-scratch consumer build + e2e) runs at pass close.

---

## File structure

| File | Responsibility |
| --- | --- |
| `src/lib/sveltekit/guard.ts` (modify) | Narrow `requireOwner` to the minimal `{ locals: { editor } }`; export `isPublicAdminPath`. |
| `src/lib/sveltekit/index.ts` (modify) | Re-export `isPublicAdminPath`; export `shellLoad` types `AdminShellData`, `AdminNavEntry`, `AdminNavIcon`, `ResolvedNavEntry`. |
| `src/lib/sveltekit/admin-nav.ts` (create) | `ADMIN_NAV_ICON_NAMES` (runtime-free name list), `AdminNavIcon`, `AdminNavEntry`, `ResolvedNavEntry`, and `normalizeAdminNav(entries, concepts)` (validate icon + `parseAdminPath` collision; throw actionable errors). |
| `src/lib/sveltekit/cairn-admin.ts` (modify) | Add `shellLoad` to the `createCairnAdmin` return; call `normalizeAdminNav` at construction; drop `layout` from the authed `AdminData` members and from `load`; ensure `'index'` is in the global-action allow-sets. |
| `src/lib/sveltekit/content-routes.ts` (modify) | Add `shellPayload` (lean shell fields + streamed `pendingEntries` + public early-return + resolved `customNav`); define `AdminShellData`; delete `layoutLoad` once no view uses it. |
| `src/lib/content/types.ts` (modify) | Add `adminNav?: AdminNavEntry[]` to `CairnAdapter.editor`; add `adminNav?: AdminNavEntry[]` (raw) to `CairnRuntime`. |
| `src/lib/content/compose.ts` (modify) | Pass `adapter.editor?.adminNav` through to `runtime.adminNav` (no validation here — layering). |
| `src/lib/components/CairnAdminShell.svelte` (rename from `AdminLayout.svelte`) | The exported chrome shell: bare when `public`; sidebar (concepts + custom + help), header, palette, breadcrumbs, theme wrapper, `children` slot, the existing CSRF-context provider; absolute-path global actions; streamed pending count; custom nav icons via the allowlist map. |
| `src/lib/components/admin-nav-icons.ts` (create) | The `AdminNavIcon` name → Lucide component map + fallback (rendering only; imported by the shell, never by `content`). |
| `src/lib/components/CairnAdmin.svelte` (modify) | Render each view bare (drop the `<AdminLayout>` wrap); pass `siteName` to `EditPage` from `page.data.shell`. |
| `src/lib/components/index.ts` (modify) | Export `CairnAdminShell` (replacing `AdminLayout`). |
| `packages/cairn-cms-dev/src/fake-app-db.ts` (create) | A fake `APP_DB` D1 double for the showcase e2e (mirrors `fake-auth-db.ts`). |
| `packages/cairn-cms-dev/src/handle.ts` (modify) | Expose `APP_DB` on `platform.env` under the admin branch. |
| `packages/cairn-cms-dev/src/handle.test.ts` (modify) | Update the asserted binding set to include `APP_DB`. |
| `examples/showcase/src/routes/admin/+layout.server.ts` / `+layout.svelte` (create) | The shared shell mount. |
| `examples/showcase/src/routes/admin/[...path]/+page.svelte` (modify) | `CairnAdmin` renders bare (chrome now from the parent layout). |
| `examples/showcase/src/routes/admin/signups/+page.server.ts` / `+page.svelte` (create) | The custom screen: `requireOwner`, read/write `APP_DB`, a bare-`CsrfField` `create` action and an owner-gated `delete` action. |
| `examples/showcase/src/lib/cairn.config.ts` (modify) | Add `editor.adminNav` with the Signups entry. |
| `examples/showcase/src/app.d.ts` (modify) | Add `APP_DB` to `App.Platform.env` (so the custom route typechecks). |
| `examples/showcase/wrangler.jsonc` (modify) | Add the `APP_DB` binding (documents the real-deploy shape; the e2e uses the dev double). |
| `examples/showcase/e2e/custom-screen.spec.ts` (create) | The end-to-end proof (render-in-shell, identity, nav entry, absolute logout action, live D1 create + owner-gated delete). |
| `src/tests/...` (modify/rename) | The coupled-test migration — enumerated in Task 2 Step 12. |
| `docs/reference/components.md`, `docs/reference/sveltekit.md`, `docs/reference/core.md` (modify) | New exports + the identity contract. |
| `docs/guides/add-a-custom-admin-screen.md` (create) | The four-file mount, identity, CSRF, binding typing, styling, reserved shortcuts, `ownerOnly`. |
| `CHANGELOG.md` (modify) | The Plan 1 entry with the "Consumers must" mount note. |

---

## Task 1: Narrow `requireOwner`; export `isPublicAdminPath`

A custom route's `+page.server.ts` must call `requireOwner(event)` with a standard load event. Today `requireOwner` demands the full `RequestContext` (cookies, `setHeaders`, `platform.env: AuthEnv`) even though it only reads `editor.role`. Narrow it to the minimal structural param `requireSession` already uses. Export the public-path predicate so `shellPayload` reuses one source of truth.

**Files:**
- Modify: `src/lib/sveltekit/guard.ts` (`requireOwner` 132–136; export `isPublicAdminPath` 15–17)
- Modify: `src/lib/sveltekit/index.ts` (re-export `isPublicAdminPath`)
- Test: `src/tests/unit/guard.test.ts`

**Interfaces:**
- Produces: `requireOwner(event: { locals: { editor?: Editor | null } }): Editor`. `isPublicAdminPath(pathname: string): boolean`.

- [ ] **Step 1: Write the behavior + type test.** In `src/tests/unit/guard.test.ts`:

```ts
import { requireOwner } from '../../lib/sveltekit/guard.js';
const owner = { email: 'o@x.test', displayName: 'O', role: 'owner' as const };
const editor = { email: 'e@x.test', displayName: 'E', role: 'editor' as const };

it('requireOwner accepts a minimal { locals: { editor } } and returns an owner', () => {
  expect(requireOwner({ locals: { editor: owner } })).toBe(owner);
});
it('requireOwner rejects a non-owner with 403', () => {
  expect(() => requireOwner({ locals: { editor } })).toThrow(/Owner access required/);
});
it('requireOwner redirects when no editor', () => {
  expect(() => requireOwner({ locals: { editor: null } })).toThrow();
});
```

- [ ] **Step 2: Run the type-check to see the failure.** `npm test` strips types, so the failure surfaces in the type-checker, not vitest: a `{ locals: { editor } }` literal does not satisfy the current `RequestContext` param.

Run: `npm run check`
Expected: FAIL — `guard.test.ts` argument not assignable to `RequestContext` (missing `url`/`request`/`cookies`/`setHeaders`).

- [ ] **Step 3: Narrow the signature.** In `guard.ts`:

```ts
export function requireOwner(event: { locals: { editor?: Editor | null } }): Editor {
  const editor = requireSession(event);
  if (editor.role !== 'owner') throw error(403, 'Owner access required');
  return editor;
}
```

- [ ] **Step 4: Export `isPublicAdminPath`.** Add `export` to the declaration at `guard.ts:15`.

- [ ] **Step 5: Re-export from `/sveltekit`.** In `src/lib/sveltekit/index.ts`, add `isPublicAdminPath` to the guard export line (3).

- [ ] **Step 6: Run the gate.** `npm run check` (now 0/0; every existing wider caller still satisfies the narrower-accepting param) then `npx vitest run src/tests/unit/guard.test.ts` (PASS).

- [ ] **Step 7: Commit.**

```bash
git add src/lib/sveltekit/guard.ts src/lib/sveltekit/index.ts src/tests/unit/guard.test.ts
git commit -m "feat: narrow requireOwner to a minimal event; export isPublicAdminPath"
```

---

## Task 2: Relocate the admin chrome to a shared `/admin` layout

The core refactor. Move the chrome out of `CairnAdmin` into a shared `/admin/+layout.svelte`. Add `admin.shellLoad`; stream the pending-publish count; render bare for public paths; make the global chrome actions post to absolute paths; drop the now-redundant `layout` field from the per-view `admin.load`; rewire the one view (`EditPage`) that read a layout field; migrate the coupled tests.

**Files:**
- Modify: `content-routes.ts` (`LayoutData` 73–95, `layoutLoad` 721–755): add `AdminShellData` + `shellPayload`; delete `layoutLoad` once unused.
- Modify: `cairn-admin.ts` (`AdminData` 62–71; `load` 116–166; `createCairnAdmin` return ~250; `anyView`/`authedViews` 186–188).
- Rename + rewire: `AdminLayout.svelte` → `CairnAdminShell.svelte`.
- Modify: `CairnAdmin.svelte`, `components/index.ts`.
- Create: the two showcase mount files; modify the catch-all `+page.svelte`.
- Tests: `src/tests/unit/cairn-admin-shell-load.test.ts` (create), `src/tests/component/cairn-admin-shell.test.ts` (create), plus the migration in Step 12.

**Interfaces:**
- Produces:
  - `AdminShellData = | { public: true; siteName: string } | { public: false; siteName: string; user: { displayName: string; email: string; role: Role }; concepts: NavConcept[]; customNav: ResolvedNavEntry[]; pathname: string; canManageEditors: boolean; navLabel: string | null; theme: 'cairn-admin' | 'cairn-admin-dark'; collapsedNav: string[]; csrf: string; pendingEntries: Promise<{ concept: string; id: string }[] | null> }` — mirrors the real `LayoutData` (content-routes.ts:73–95) field-for-field, adds the `public` discriminant + `customNav`, and turns `pendingEntries` into a streamed promise.
  - `createCairnAdmin(...)` returns `{ load, actions, shellLoad }`; `shellLoad(event: AdminEvent): Promise<{ shell: AdminShellData }>`.
  - Per-view authed `AdminData` members drop `layout`: `{ view: 'list'; page: ListData }`, `{ view: 'edit'; page: EditData }`, etc. `login`/`confirm` unchanged.
- Consumes: `isPublicAdminPath` (Task 1); `ResolvedNavEntry` (Task 3 — use `customNav: []` until Task 3 wires `normalizeAdminNav`).

- [ ] **Step 1: Write the failing `shellLoad` test.** Create `src/tests/unit/cairn-admin-shell-load.test.ts` (reuse the runtime/event stub from `src/tests/unit/cairn-admin-load.test.ts`):

```ts
it('shellLoad returns the lean shell payload for an authed admin path', async () => {
  const { shellLoad } = createCairnAdmin(runtime, {});
  const { shell } = await shellLoad(eventFor('/admin/posts'));
  if (shell.public) throw new Error('expected authed shell');
  expect(shell.user.email).toBe('editor@test');
  expect(shell.concepts.map((c) => c.id)).toContain('posts');
  expect(typeof shell.pendingEntries.then).toBe('function');   // streamed, not awaited
});
it('shellLoad returns a public payload for /admin/login and never calls listBranches', async () => {
  const spy = vi.spyOn(backend, 'listBranches');
  const { shellLoad } = createCairnAdmin(runtime, {});
  const { shell } = await shellLoad(eventFor('/admin/login'));
  expect(shell.public).toBe(true);
  expect(spy).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run it; verify it fails (no `shellLoad`).** `npx vitest run src/tests/unit/cairn-admin-shell-load.test.ts` → FAIL.

- [ ] **Step 3: Add `AdminShellData` + `shellPayload` in `content-routes.ts`.** Define `AdminShellData` (the union above). Add `shellPayload(deps)` returning `(event) => { shell }`: on `isPublicAdminPath(event.url.pathname)` return `{ shell: { public: true, siteName: deps.runtime.siteName } }`; else `requireSession(event)` and build the authed shell reusing `layoutLoad`'s existing derivations of `theme`, `collapsedNav`, `csrf`, `concepts`, `navLabel`, `canManageEditors`, and set `pendingEntries: deps.backend.listBranches(PENDING_PREFIX).then(toPendingEntries).catch(() => null)` **unawaited**, and `customNav: []` (Task 3 fills it).

- [ ] **Step 4: Expose `shellLoad`.** In `cairn-admin.ts`, add `const shellLoad = (event: AdminEvent) => content.shellPayload(adminEvent(event));` and return `{ load, actions, shellLoad }`.

- [ ] **Step 5: Run the `shellLoad` test; verify pass.** `npx vitest run src/tests/unit/cairn-admin-shell-load.test.ts` → PASS.

- [ ] **Step 6: Drop `layout` from per-view `AdminData` + `load`.** Remove `layout: LayoutData` from the authed members (63–71). In `load` (126–164), each authed case returns `{ view, page: await <viewLoad>(delegated) }` with no `layoutLoad` call. `login`/`confirm`/`index` unchanged.

- [ ] **Step 7: Make the global chrome actions absolute.** The shell's `logout`/`publishAll` forms now render on every `/admin/**` route, so they must post to the catch-all, not the current route. Ensure `'index'` is present in **both** `anyView` (logout) and `authedViews` (publishAll) at `cairn-admin.ts:186–188` (add to whichever lacks it). `viewAction` re-parses `/admin` → `{ view: 'index' }`; the `indexRedirect` only fires on a GET `load`, so a POST to `/admin?/logout` or `/admin?/publishAll` runs the action. The forms move to absolute actions in Step 8.

- [ ] **Step 8: Rename and rewire the shell.**

```bash
git mv src/lib/components/AdminLayout.svelte src/lib/components/CairnAdminShell.svelte
```

In `CairnAdminShell.svelte`: change `Props` to `{ data: AdminShellData; children: Snippet }`. Wrap the whole body in `{#if data.public}{@render children()}{:else} …existing chrome reading data.* … {@render children()} …{/if}`. **Keep the existing CSRF-context `setContext(CSRF_CONTEXT_KEY, () => data.csrf)`** in the authed branch (it is what lets a descendant `<CsrfField />` work tokenless). Change the two global forms to absolute actions:

```svelte
<form method="POST" action="/admin?/logout" class="mt-4">
  <CsrfField token={data.csrf} /> …
</form>
```
```svelte
<form method="POST" action="/admin?/publishAll" class="mt-4 flex justify-end gap-2">
  <CsrfField token={data.csrf} /> …
</form>
```

Consume the streamed pending count:

```svelte
{#await data.pendingEntries then pending}
  {#if pending && pending.length > 0 && !isDeskRoute}
    <button type="button" onclick={() => publishAllDialog?.showModal()} class="btn btn-sm btn-primary">
      Publish site ({pending.length})
    </button>
  {/if}
{/await}
```

- [ ] **Step 9: `CairnAdmin` renders bare + rewires `EditPage`'s `siteName`.** In `CairnAdmin.svelte`, the `{:else}` branch (53–75) drops `<AdminLayout>` and renders the per-view component directly. `EditPage` requires `data: EditData & { siteName: string }` (EditPage.svelte:75); the `siteName` no longer rides `data.layout`, so read it from the shell: `import { page } from '$app/state'` and pass `siteName={(page.data.shell as AdminShellData & { public: false }).siteName}`. The `login`/`confirm` branches (50–52) are unchanged.

- [ ] **Step 10: Export `CairnAdminShell`.** In `components/index.ts`, replace the `AdminLayout` re-export with `CairnAdminShell`.

- [ ] **Step 11: Wire the showcase mount.** Create `examples/showcase/src/routes/admin/+layout.server.ts`:
```ts
import { admin } from '$lib/cairn.server.js';
export const load = admin.shellLoad;
```
Create `examples/showcase/src/routes/admin/+layout.svelte`:
```svelte
<script lang="ts">
  import { CairnAdminShell } from '@glw907/cairn-cms/components';
  import type { AdminShellData } from '@glw907/cairn-cms/sveltekit';
  import type { Snippet } from 'svelte';
  let { data, children }: { data: { shell: AdminShellData }; children: Snippet } = $props();
</script>
<CairnAdminShell data={data.shell}>{@render children()}</CairnAdminShell>
```
The catch-all `+page.svelte`'s `<CairnAdmin … render registry icons />` call is unchanged (it keeps threading the edit-view preview wiring); it just no longer carries chrome.

- [ ] **Step 12: Migrate the coupled tests.** These existing tests assert the old `data.layout` shape, the `AdminLayout` name/export, or a resolved `pendingEntries` array; update each:
  - `src/tests/component/AdminLayout.test.ts`: `git mv` to `CairnAdminShell.test.ts`; update its `pendingEntries` fixtures to a resolved-promise (`Promise.resolve([...])`) and assert through the `{#await}`; add the public-bare and absolute-`/admin?/logout` assertions.
  - `src/tests/component/AdminLayoutDeskHarness.svelte`, `src/tests/component/admin-layout-help-nav.test.ts`: update to `CairnAdminShell` + `AdminShellData`.
  - `src/tests/component/CairnAdmin.test.ts`: `CairnAdmin` no longer wraps the layout — drop chrome assertions, keep the view-switch ones; supply `page.data.shell` for the edit case.
  - `src/tests/component/components-barrel.test.ts`: assert `CairnAdminShell` exported, `AdminLayout` gone.
  - `src/tests/unit/content-routes-layout.test.ts`: retarget from `layoutLoad` to `shellPayload` (or fold into the new shell-load test) and assert the streamed `pendingEntries` + public early-return.
  - `src/tests/unit/cairn-admin-load.test.ts`, `cairn-admin-actions.test.ts`: drop `data.layout` from the expected per-view shape.
  - `src/tests/unit/engine-isolation.test.ts`: update any `AdminLayout` reference.
  - `src/tests/component/EditPage.test.ts`, `edit-page-field-hint.test.ts`, `edit-page-v2-fields.test.ts`, `EditPageDesk.svelte`, `DeskChild.svelte`: supply `siteName` to `EditPage` directly (these mount `EditPage` outside `CairnAdmin`, so they already pass props; confirm they pass `siteName` — they do today via the harness, unaffected by the relocation).

- [ ] **Step 13: Write the shell component test.** Create `src/tests/component/cairn-admin-shell.test.ts`, mirroring the harness of the existing `AdminLayout.test.ts` (the `vitest-browser-svelte` chromium pattern). Assert: an authed `AdminShellData` renders the sidebar concept entries + the help link; a `{ public: true }` payload renders only the children (no sidebar); the logout form `action` is exactly `/admin?/logout`.

- [ ] **Step 14: Delete `layoutLoad`.** Once Step 6 removed every view caller and Step 12 retargeted its test, delete `layoutLoad` from `content-routes.ts` (and its export). The end state: `shellPayload` is the only producer of shell data; no view load returns shell fields.

- [ ] **Step 15: Run the gate.** `npm run package && npm run check && npm test` → svelte-check 0/0; suite exit 0.

- [ ] **Step 16: Commit.**

```bash
git add -A
git commit -m "refactor: relocate admin chrome to a shared /admin layout (CairnAdminShell + shellLoad)"
```

---

## Task 3: `adminNav` data-only custom sidebar entry

A developer declares a custom screen's sidebar entry as config data. It flows adapter → runtime → `createCairnAdmin` (validated there, in the `/sveltekit` layer) → shell payload, and the shell renders it in the sidebar, the command palette, and the breadcrumb source. The icon is a typed Lucide name from a fixed allowlist; the href is valid only if `parseAdminPath` does not already claim it.

**Files:**
- Create: `src/lib/sveltekit/admin-nav.ts`, `src/lib/components/admin-nav-icons.ts`
- Modify: `src/lib/content/types.ts`, `src/lib/content/compose.ts`, `src/lib/sveltekit/cairn-admin.ts`, `src/lib/sveltekit/content-routes.ts` (`shellPayload`'s `customNav`), `src/lib/sveltekit/index.ts`, `src/lib/components/CairnAdminShell.svelte`
- Test: `src/tests/unit/admin-nav.test.ts` (create); extend `src/tests/component/cairn-admin-shell.test.ts`

**Interfaces:**
- Produces (in `admin-nav.ts`, runtime-free except `parseAdminPath`):
  - `const ADMIN_NAV_ICON_NAMES = ['anchor','calendar','clipboard-list','list','users','package','inbox','table','wrench'] as const` (the bundled set; align the exact names with `admin-nav-icons.ts`).
  - `type AdminNavIcon = (typeof ADMIN_NAV_ICON_NAMES)[number]`.
  - `interface AdminNavEntry { label: string; icon: AdminNavIcon; href: string; ownerOnly?: boolean }`.
  - `interface ResolvedNavEntry { label: string; iconName: AdminNavIcon; href: string; ownerOnly: boolean }`.
  - `function normalizeAdminNav(entries: AdminNavEntry[] | undefined, concepts: ConceptDescriptor[]): ResolvedNavEntry[]` — for each entry: assert `ADMIN_NAV_ICON_NAMES.includes(entry.icon)` else throw; assert `parseAdminPath(entry.href, concepts) === null` else throw; default `ownerOnly` to `false`.
- Consumes: `parseAdminPath` (admin-dispatch); `AdminShellData.customNav` (Task 2).

- [ ] **Step 1: The icon map (rendering only).** Create `src/lib/components/admin-nav-icons.ts`:
```ts
import { AnchorIcon, CalendarIcon, ClipboardListIcon, ListIcon, UsersIcon, PackageIcon, InboxIcon, TableIcon, WrenchIcon } from '@lucide/svelte';
import type { Component } from 'svelte';
import type { AdminNavIcon } from '../sveltekit/admin-nav.js';

export const ADMIN_NAV_ICONS: Record<AdminNavIcon, Component> = {
  anchor: AnchorIcon, calendar: CalendarIcon, 'clipboard-list': ClipboardListIcon,
  list: ListIcon, users: UsersIcon, package: PackageIcon, inbox: InboxIcon, table: TableIcon, wrench: WrenchIcon,
};
export const ADMIN_NAV_FALLBACK_ICON = ListIcon;
```
(Confirm the import path matches `src/lib/components/admin-icons.ts`.)

- [ ] **Step 2: Write the failing validation test.** Create `src/tests/unit/admin-nav.test.ts`:
```ts
import { normalizeAdminNav } from '../../lib/sveltekit/admin-nav.js';
const concepts = [{ id: 'posts', label: 'Posts' }, { id: 'pages', label: 'Pages' }] as never;

it('normalizes a valid entry, defaulting ownerOnly', () => {
  expect(normalizeAdminNav([{ label: 'Signups', icon: 'inbox', href: '/admin/signups' }], concepts))
    .toEqual([{ label: 'Signups', iconName: 'inbox', href: '/admin/signups', ownerOnly: false }]);
});
it('rejects a reserved-segment href', () => {
  expect(() => normalizeAdminNav([{ label: 'X', icon: 'list', href: '/admin/settings' }], concepts)).toThrow(/settings/);
});
it('rejects the media view href (parseAdminPath claims it)', () => {
  expect(() => normalizeAdminNav([{ label: 'X', icon: 'list', href: '/admin/media' }], concepts)).toThrow(/media/);
});
it('rejects a concept-route href', () => {
  expect(() => normalizeAdminNav([{ label: 'P2', icon: 'list', href: '/admin/posts' }], concepts)).toThrow(/posts/);
});
it('rejects an unknown icon', () => {
  expect(() => normalizeAdminNav([{ label: 'X', icon: 'rocket' as never, href: '/admin/x' }], concepts)).toThrow(/icon/);
});
```

- [ ] **Step 3: Run it; verify it fails.** `npx vitest run src/tests/unit/admin-nav.test.ts` → FAIL (module missing).

- [ ] **Step 4: Implement `admin-nav.ts`.** Write the types + `normalizeAdminNav`. The href parse: extract the path (strip a query/hash), call `parseAdminPath(path, concepts)`; a non-null result means the segment is claimed — throw `\`adminNav href "${href}" collides with cairn's built-in "${parsed.view}" view; choose an unclaimed /admin/<segment>\``. Unknown icon throws `\`adminNav icon "${icon}" is not one of ${ADMIN_NAV_ICON_NAMES.join(', ')}\``.

- [ ] **Step 5: Run the test; verify pass.** `npx vitest run src/tests/unit/admin-nav.test.ts` → PASS.

- [ ] **Step 6: Thread the config.** In `content/types.ts`, add `adminNav?: AdminNavEntry[]` to `CairnAdapter.editor` (~247) and `adminNav?: AdminNavEntry[]` to `CairnRuntime` (~340) (raw; importing the type from `../sveltekit/admin-nav.js` is a type-only import — allowed across the layer). In `compose.ts`, copy `adapter.editor?.adminNav` onto `runtime.adminNav` (no validation here).

- [ ] **Step 7: Validate at construction.** In `cairn-admin.ts`, at the top of `createCairnAdmin`, compute `const adminNav = normalizeAdminNav(runtime.adminNav, runtime.concepts);` (throws on a bad config at server start) and pass it to `shellPayload` (store on the content deps or close over it).

- [ ] **Step 8: Resolve into the shell payload.** In `content-routes.ts` `shellPayload`, set `customNav: adminNav.filter((e) => !e.ownerOnly || editor.role === 'owner')` (replacing Task 2's `[]`).

- [ ] **Step 9: Render in the shell.** In `CairnAdminShell.svelte`, append the custom entries after the concept entries in `coreItems`: `...data.customNav.map((e) => ({ label: e.label, icon: ADMIN_NAV_ICONS[e.iconName] ?? ADMIN_NAV_FALLBACK_ICON, href: e.href }))`. `paletteCommands` already maps `coreItems` (palette inclusion follows). Extend the `crumbs` lookup (206–214) to resolve a custom `href` to its label alongside `data.concepts`.

- [ ] **Step 10: Export the types.** In `src/lib/sveltekit/index.ts`, export `type AdminNavEntry, AdminNavIcon, ResolvedNavEntry` and `normalizeAdminNav` is internal (not exported).

- [ ] **Step 11: Extend the component test.** In `cairn-admin-shell.test.ts`: a `customNav` entry renders a sidebar link to its `href`; an `ownerOnly` entry is absent for an editor-role payload.

- [ ] **Step 12: Gate + commit.** `npm run package && npm run check && npm test`
```bash
git add -A
git commit -m "feat: adminNav data-only custom sidebar entry (typed icon allowlist, parseAdminPath collision)"
```

---

## Task 4: The showcase custom-screen proof (`Signups`)

Prove the seam end-to-end against the **actual** showcase e2e harness, which runs `vite preview` of a `VITE_CAIRN_E2E=1` build with the `cms-dev` backend handle supplying `platform.env` (there is no `wrangler dev` and no real D1). So the proof's `APP_DB` is a fake D1 double injected by that handle, mirroring the existing `AUTH_DB` fake.

**Files:**
- Create: `packages/cairn-cms-dev/src/fake-app-db.ts`; modify `packages/cairn-cms-dev/src/handle.ts`, `packages/cairn-cms-dev/src/handle.test.ts`
- Create: `examples/showcase/src/routes/admin/signups/+page.server.ts`, `+page.svelte`; `examples/showcase/e2e/custom-screen.spec.ts`
- Modify: `examples/showcase/src/lib/cairn.config.ts`, `src/app.d.ts`, `wrangler.jsonc`

**Interfaces:**
- Consumes: `requireOwner`, `CsrfField` (bare/context), `AdminShellData`, `adminNav` (Tasks 1–3); the guard-populated `locals.editor`; the `cms-dev` handle's `platform.env`.

- [ ] **Step 1: Add the fake `APP_DB` double.** Create `packages/cairn-cms-dev/src/fake-app-db.ts` mirroring `fake-auth-db.ts` (a hand-rolled `D1Database` subset: `prepare/bind/all/run/first`), backed by an in-memory `signups` array, seeded empty. Implement the two statements the screen uses (`SELECT … ORDER BY id DESC`, `INSERT … VALUES (?, ?)`, `DELETE FROM signups WHERE id = ?`).

- [ ] **Step 2: Inject it on `platform.env`.** In `packages/cairn-cms-dev/src/handle.ts` (~70–82), add `APP_DB: createFakeAppDb()` to the `platform.env` object under the admin branch (alongside `AUTH_DB`). Update `packages/cairn-cms-dev/src/handle.test.ts` (~7–22), which asserts the exact binding set, to include `APP_DB`. (This rides entirely inside the already-dynamic, `dev`-gated `devBackendHandle`, so the cms-dev fence invariant is unaffected — no static import, no new engine surface.)

- [ ] **Step 3: Type + declare the binding.** Add `APP_DB: D1Database;` to `examples/showcase/src/app.d.ts` `App.Platform.env`. Add the `APP_DB` binding to `examples/showcase/wrangler.jsonc` `d1_databases` (documents the real-deploy shape; the e2e uses the dev double, so no `database_id` need be real):
```jsonc
{ "binding": "APP_DB", "database_name": "cairn-showcase-app", "database_id": "00000000-0000-0000-0000-000000000001" }
```

- [ ] **Step 4: Write the custom screen.** `examples/showcase/src/routes/admin/signups/+page.server.ts`:
```ts
import { requireOwner } from '@glw907/cairn-cms/sveltekit';
import { fail } from '@sveltejs/kit';

export const load = async (event) => {
  requireOwner(event);                                 // owner-gated; ownerOnly nav is cosmetic only
  const { results } = await event.platform!.env.APP_DB
    .prepare('SELECT id, name, email FROM signups ORDER BY id DESC').all();
  return { signups: results };
};

export const actions = {
  create: async (event) => {
    requireOwner(event);
    const form = await event.request.formData();        // the guard already rejected a tokenless POST
    const name = String(form.get('name') ?? '').trim();
    const email = String(form.get('email') ?? '').trim();
    if (!name || !email) return fail(400, { error: 'missing' });
    await event.platform!.env.APP_DB.prepare('INSERT INTO signups (name, email) VALUES (?, ?)').bind(name, email).run();
    return { created: true };
  },
  remove: async (event) => {
    requireOwner(event);                                // the owner-gated destructive action the spec requires
    const id = Number((await event.request.formData()).get('id'));
    await event.platform!.env.APP_DB.prepare('DELETE FROM signups WHERE id = ?').bind(id).run();
    return { removed: true };
  },
};
```
`examples/showcase/src/routes/admin/signups/+page.svelte` — note the **bare** `<CsrfField />` (the shell provides the token via context):
```svelte
<script lang="ts">
  import { CsrfField } from '@glw907/cairn-cms/components';
  let { data } = $props();
</script>
<h1 class="text-2xl font-semibold">Signups</h1>
<form method="POST" action="?/create" class="my-4 flex gap-2">
  <CsrfField />
  <input name="name" placeholder="Name" class="input input-bordered" />
  <input name="email" placeholder="Email" class="input input-bordered" />
  <button class="btn btn-primary">Add</button>
</form>
<table class="table"><tbody>
  {#each data.signups as s}
    <tr><td>{s.name}</td><td>{s.email}</td>
      <td><form method="POST" action="?/remove"><CsrfField /><input type="hidden" name="id" value={s.id} /><button class="btn btn-ghost btn-xs">Delete</button></form></td>
    </tr>
  {/each}
</tbody></table>
```

- [ ] **Step 5: Register the nav entry.** In `examples/showcase/src/lib/cairn.config.ts` `editor` group: `adminNav: [{ label: 'Signups', icon: 'inbox', href: '/admin/signups' }],`.

- [ ] **Step 6: Write the e2e proof.** Create `examples/showcase/e2e/custom-screen.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('a custom admin screen renders in the shell, reads identity, and writes its own D1', async ({ page }) => {
  await page.goto('/admin/signups');
  await expect(page.locator('a[href="/admin/signups"]')).toBeVisible();          // registered nav entry, in the shell
  await expect(page.getByRole('heading', { name: 'Signups' })).toBeVisible();    // the custom screen content
  await page.fill('input[name="name"]', 'Ada');
  await page.fill('input[name="email"]', 'ada@test');
  await page.getByRole('button', { name: 'Add' }).click();                       // bare CsrfField + guard CSRF
  await expect(page.getByRole('cell', { name: 'Ada' })).toBeVisible();           // round-trips through the fake APP_DB
  await page.getByRole('button', { name: 'Delete' }).click();                    // owner-gated destructive action
  await expect(page.getByRole('cell', { name: 'Ada' })).toHaveCount(0);
});

test("the shell's global logout action targets the absolute catch-all path from a custom route", async ({ page }) => {
  await page.goto('/admin/signups');
  await expect(page.locator('form[action="/admin?/logout"]')).toHaveCount(1);
});
```
(The fake `APP_DB` is per-process in-memory and seeded empty, so the create-then-delete is self-contained; no migration step exists or is needed.)

- [ ] **Step 7: Run the suites.** `cd packages/cairn-cms-dev && npm test` (the handle test now expects `APP_DB`); then the showcase e2e via its real command: `cd examples/showcase && npm run test:e2e` (Vite preview).

- [ ] **Step 8: Commit.**
```bash
git add -A
git commit -m "test: showcase Signups custom admin screen proves the extension seam end-to-end"
```

---

## Task 5: Documentation

Docs are a pass dimension. Document the new exports and the four-file mount, footguns called out.

**Files:** modify `docs/reference/components.md` (`CairnAdminShell`), `docs/reference/sveltekit.md` (`shellLoad`, `AdminShellData`, `AdminNavEntry`, `AdminNavIcon`, `ResolvedNavEntry`, `isPublicAdminPath`, the narrowed `requireOwner`), `docs/reference/core.md` (the `Editor`/`Role` identity contract + the `./ambient` `locals.editor` note); create `docs/guides/add-a-custom-admin-screen.md`; modify `CHANGELOG.md`.

- [ ] **Step 1: Reference pages.** A one-line-minimum doc entry per new export so `check:reference` passes. Mark each in its tier (Extension API vs Scaffold API) — the tier *gate* lands in Plan 2; write the labels now so Plan 2 only adds the assertion.

- [ ] **Step 2: The guide.** `docs/guides/add-a-custom-admin-screen.md` (Google developer-docs style, Vale-clean): the concrete route under `/admin/`; the four-file mount (`+layout.server.ts`, `+layout.svelte`, the catch-all pair); reading identity via `locals.editor` and gating with `requireSession`/`requireOwner`; that `ownerOnly` nav is cosmetic and the route must gate (show the `requireOwner` call); the **bare** `<CsrfField />` pattern (the shell provides the token via context; the guard fail-closes a tokenless POST); typing the developer's own binding in `app.d.ts` `App.Platform.env`; using the admin design tokens inside the shell; the reserved shortcuts (Cmd+K palette, Cmd+B sidebar) and that client interactivity rides the developer's own client code or `./islands`.

- [ ] **Step 3: CHANGELOG.** Add the entry with the `<!-- release-size: minor -->` marker and a **Consumers must** block: add `/admin/+layout.server.ts` (`export const load = admin.shellLoad`) and `/admin/+layout.svelte` (render `<CairnAdminShell>`); `AdminLayout` is renamed `CairnAdminShell`; per-view `AdminData` members no longer carry `layout`; `requireOwner` now accepts a minimal event (non-breaking). Note the hold (released with Plan 2).

- [ ] **Step 4: Doc gates + commit.** `npm run check:reference && npm run check:comments`
```bash
git add -A
git commit -m "docs: reference + guide for the custom-admin-screen seam"
```

---

## Self-review

- **Spec coverage.** Seam 1 chrome → Task 2; nav registration → Task 3; identity contract + `requireOwner` → Tasks 1, 4, 5; CSRF reuse (bare `CsrfField` via context) → Tasks 2, 4; global absolute actions → Task 2 (Steps 7–8); lean `shellLoad` / no-blocking-`listBranches` → Task 2 (streamed `pendingEntries` + public early-return); single-source predicates → Tasks 1, 3 (`parseAdminPath` collision authority); showcase proof incl. live D1 write + owner-gated destructive action → Task 4; docs → Task 5. Plan 2 (enforcement: `check:surface`, attw, tier gate, doctor mount-shape) stays out.
- **Type consistency.** `AdminShellData` (Task 2) mirrors the real `LayoutData` and is consumed by `CairnAdminShell` + the showcase layout; `ResolvedNavEntry`/`customNav` (Task 3) is produced by `normalizeAdminNav` and read in `shellPayload`; `requireOwner`'s narrowed param (Task 1) is used by the showcase screen (Task 4); `AdminNavIcon` names (admin-nav.ts) and the icon map (admin-nav-icons.ts) share the same key set.
- **Harness reality (folded from the plan review).** The showcase e2e is Vite-preview + the `cms-dev` handle, so the live D1 proof uses a fake `APP_DB` double injected by that handle (Task 4 Steps 1–2), not `wrangler dev` or a migration. The `data.layout` removal rewires `EditPage`'s `siteName` (Task 2 Step 9) and migrates 14 coupled tests (Step 12). The `adminNav` collision check uses `parseAdminPath` as the one authority (catches `media`/`index`), and validation lives in the `/sveltekit` layer to respect the content-layer import rule (Task 3).
- **Decisions resolved (no placeholders):** the global-action target is `/admin?/<action>` with `'index'` in both allow-sets (verified POST-only, the redirect is GET-only); CSRF is the bare context-backed `<CsrfField />`; `layoutLoad` is deleted (end state, Step 14), not left transitional.

---

## Post-mortem (2026-06-28, landed on the worktree, merged to main)

**Status: COMPLETE.** All five tasks shipped test-first on the `worktree-extensibility-plan-1` branch
(8 commits, `6c5fe54`..`868d303`), fast-forwarded to `main`. The package version is `0.77.0`, held
unpublished until Plan 2 (enforcement) lands; the two plans ship as one minor.

### What was built

- **Task 1 (`6c5fe54`).** `requireOwner` narrowed from `RequestContext` to `{ locals: { editor } }`
  (the same structural param `requireSession` takes), so a custom route's standard load event satisfies
  it. `isPublicAdminPath` exported from `/sveltekit`. The narrowing is a widening of the accepted
  argument, so every existing caller still type-checks.
- **Task 2 (`4490895`).** The core refactor: the admin chrome moved out of `CairnAdmin` into a shared
  `/admin/+layout.svelte` rendering the renamed `CairnAdminShell`. New `shellLoad`/`shellPayload`
  produce a discriminated `AdminShellData` (a `{ public: true }` bare payload vs the authed chrome),
  with `pendingEntries` streamed as a deferred promise (no `listBranches` on the login path or up
  front). The global logout/publishAll forms post to the absolute `/admin?/...` catch-all (`'index'`
  added to `authedViews`). `layoutLoad` deleted; 14 coupled tests migrated.
- **Task 3 (`cc5bbf7`).** `adminNav` data-only sidebar entries: `normalizeAdminNav` validates the icon
  against a fixed Lucide allowlist and the href against `parseAdminPath` (the one collision authority,
  catching reserved segments, `media`, `index`, and concept routes), throwing at construction. Threaded
  adapter → runtime → `createContentRoutes` (validated in the `/sveltekit` layer; the content-layer
  import is type-only). Rendered in the sidebar, the command palette, and the breadcrumb source.
- **Task 4 (`c8ea141`, `45b990b`).** The showcase `Signups` custom screen proves the seam end-to-end:
  a concrete `/admin/signups` route, owner-gated, reading and writing its own `APP_DB` D1 binding (a
  fake double injected by the `cms-dev` handle, since the e2e harness is Vite-preview, not
  `wrangler dev`), with a bare `<CsrfField/>` and a registered nav entry. Two e2e specs.
- **Task 5 (`dc47582`).** Reference pages for every new export, the `add-a-custom-admin-screen.md`
  guide, the `0.77.0` CHANGELOG entry with the four-step `Consumers must` block, and the version bump.
  Surfaced and fixed two pre-existing signature drifts (`shellPayload`, a `composeRuntime` param).

### Verified with evidence

- Full gate green at consolidation: `npm run check` 0 errors / 0 warnings (1223 files); `npm test`
  260 files / 2737 tests, exit 0; `check:comments`, `check:reference`, `check:reference:signatures`,
  `check:docs` (88 files), `check:package`, `check:version` (minor) all pass.
- The custom-screen e2e runs against the **worktree** engine (a from-scratch `npm install` in the
  worktree showcase repointed the `file:` deps off the main checkout) and passes 2/2 under `CI=1`.
- `code-simplifier` found the seam code already clean (no changes).
- Reviewer fan-out (svelte, web-auth-security, daisyui-a11y): no blocker, no high. The web-auth review
  confirmed the two load-bearing claims, the `requireOwner` narrowing is safe and a custom `/admin`
  POST is genuinely CSRF-protected in production by the path-generic handle guard. Folded fixes
  (`6f8beff`): sr-only labels + a table header on the canonical example and its guide snippet, a
  softened e2e comment (the dev handle replaces the real guard, so the e2e proves token plumbing, not
  the guard's rejection path), and a louder `ownerOnly`-is-cosmetic note.

### Decisions locked

- The shell payload is a discriminated union on `public`, narrowed once in the component via
  `shell = $derived(data.public ? null : data)` with defensive `shell?.` reads (Svelte evaluates all
  `$derived` regardless of the rendered branch). The streamed `pendingEntries` wraps `resolveBackend`
  inside the promise chain so a synchronous token-mint throw degrades to `null`, preserving the old
  fail-safe.
- `LayoutData` is now dead but stays exported (removing it is a breaking surface change); deferred to
  Plan 2 with a `Consumers must` line. The `mintToken` reference-prose drift is filed in the friction
  log for a later cleanup.

### Carry-forwards

- **Live admin smoke owed before release.** The browser e2e proves the shell + custom screen + CSRF +
  D1 round-trip; the `wrangler dev` + real-D1 smoke is owed at the Plan-1+2 pre-release point, not per
  plan, since the release is held.
- **Plan 2 (enforcement)** is the next pass: `check:surface` `.d.ts` snapshot gate; the `check:reference`
  tier-marker assertion plus the Scaffold-API labels; the `cairn-doctor` mount-shape heuristic; the
  breaking-in-0.x release signal; and the `LayoutData` removal. Then the release covering both.
