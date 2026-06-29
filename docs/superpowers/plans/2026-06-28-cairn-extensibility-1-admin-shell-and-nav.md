# Developer Extensibility Plan 1: Admin Shell and Custom-Screen Seam

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a developer add a custom admin screen as a normal concrete SvelteKit route under `/admin/`, rendered inside cairn's chrome, behind the editor login, with a data-only sidebar entry, without forking the catch-all or editing the `CairnAdmin` view switch.

**Architecture:** Relocate cairn's admin chrome from inside `CairnAdmin` to a shared `/admin/+layout.svelte`. The chrome component (today's already-exported `AdminLayout`, renamed `CairnAdminShell`) consumes a shell payload produced by a new `admin.shellLoad` wired to `/admin/+layout.server.ts`; it already takes a `children` snippet. The per-view `admin.load` stops re-loading the shell data and returns only its view payload, rendered bare by `CairnAdmin` inside the shell. A concrete route like `/admin/signups` wins over the `/admin/[...path]` catch-all, inherits the guard (so `locals.editor` is populated), and renders its own content inside the same shell. A data-only `adminNav` config adds the custom sidebar entry.

**Tech Stack:** TypeScript, Svelte 5 (runes, snippets), SvelteKit 2 (layout loads, streamed promises, named form actions), Cloudflare D1, Vitest (node unit + chromium browser component), Playwright e2e, `svelte-package`, DaisyUI 5 / Tailwind 4, Lucide icons.

## Global Constraints

- **Charter, premise-checked.** cairn owns the admin frame and serves everything else with a thin seam. No principal/scopes/member/permissions substrate, no component dispatcher/registry, no `query()` on the content backend. A custom screen is the developer's own route; cairn provides chrome + a data-only nav entry + the identity contract only. Source: `CLAUDE.md` "What cairn is" and `docs/internal/what-cairn-is-and-is-not.md`.
- **DX is high-priority (Geoff's steer).** cairn must be an easy, non-restrictive starting point to extend. Low boilerplate, no silent footguns, clear errors. But "non-restrictive" is low-friction, not "accommodate every universe"; do not let a DX want re-grow scope.
- **Owner/editor only.** Auth gates the admin. `locals.editor` is the identity contract. No new actor.
- **Lean shell load — never block on GitHub.** `shellLoad` must not synchronously await `listBranches`; the pending-publish count streams as a deferred promise so a custom route and the login page never pay a GitHub round-trip up front.
- **Data-only nav.** `adminNav` is `{ label, icon, href, ownerOnly? }` with `icon` a typed Lucide-name from a fixed allowlist (never an arbitrary Svelte component). `ownerOnly` hides the link only; the route must still gate server-side.
- **Single source of truth.** Reuse the guard's public-path predicate and the dispatcher's reserved-segment set; never mirror them.
- **Version floor:** svelte `^5.56.3`, `@sveltejs/kit ^2.12` (unchanged). This is breaking-within-0.x (the consumer mount gains two files); bump per `check:version` (minor). Hold the release: Plan 2 (enforcement) ships in the same minor; do not publish until both land.
- **Gate before done (each task):** the task's targeted test, then `npm run check` (svelte-check 0/0), then `npm test` (exit 0). The worktree must `npm run package` before `npm test` if dist-importing components are touched (see the `cairn-worktree-needs-dist-build` note). The full pass-end gate (`check:comments`, the four doc gates, `check:reference`, `check:package`, `check:version`, reviewer fan-out, from-scratch consumer build + e2e) runs at pass close.

---

## File structure

| File | Responsibility |
| --- | --- |
| `src/lib/sveltekit/guard.ts` (modify) | Narrow `requireOwner` to the minimal `{ locals: { editor } }`; export `isPublicAdminPath`. |
| `src/lib/sveltekit/admin-dispatch.ts` (modify) | Export `isReservedAdminSegment(segment)` over the existing `RESERVED_SEGMENTS`. |
| `src/lib/sveltekit/index.ts` (modify) | Re-export `isPublicAdminPath`, `isReservedAdminSegment`; add `shellLoad` types `AdminShellData`, `AdminNavEntry`, `AdminNavIcon`. |
| `src/lib/sveltekit/cairn-admin.ts` (modify) | Add `shellLoad` to the `createCairnAdmin` return; drop `layout` from the authed `AdminData` members and from `load`'s per-view returns. |
| `src/lib/sveltekit/content-routes.ts` (modify) | Factor the shell payload out of `layoutLoad`; stream `pendingEntries` as a deferred promise; merge `adminNav` (normalized) into the shell payload; add a public-path early return. |
| `src/lib/content/types.ts` (modify) | Add `adminNav?: AdminNavEntry[]` to `CairnAdapter.editor`; add `adminNav?` to `CairnRuntime`. |
| `src/lib/content/compose.ts` (modify) | Normalize/validate `adminNav` (icon allowlist, reserved-segment + concept collision) in `composeRuntime`. |
| `src/lib/components/CairnAdminShell.svelte` (rename from `AdminLayout.svelte`) | The exported chrome shell: sidebar (core + custom + help), header, palette, breadcrumbs, theme wrapper, `children` slot; bare when `public`; absolute-path global actions; streamed pending count; custom nav icons via the Lucide allowlist. |
| `src/lib/components/admin-nav-icons.ts` (create) | The `AdminNavIcon` name → Lucide component allowlist + fallback. |
| `src/lib/components/CairnAdmin.svelte` (modify) | Render each view bare (drop the `<AdminLayout>` wrap); keep the bare `login`/`confirm` branches. |
| `src/lib/components/index.ts` (modify) | Export `CairnAdminShell` (replacing `AdminLayout`). |
| `examples/showcase/src/routes/admin/+layout.server.ts` (create) | `export const load = admin.shellLoad`. |
| `examples/showcase/src/routes/admin/+layout.svelte` (create) | Render `<CairnAdminShell data={data.shell}>{@render children()}</CairnAdminShell>`. |
| `examples/showcase/src/routes/admin/[...path]/+page.svelte` (modify) | `CairnAdmin` renders bare (chrome now from the parent layout). |
| `examples/showcase/src/routes/admin/signups/+page.server.ts` (create) | The custom screen: `requireOwner`, read/write `APP_DB`, a `CsrfField`-guarded `create` action. |
| `examples/showcase/src/routes/admin/signups/+page.svelte` (create) | The custom screen markup, inside the inherited shell. |
| `examples/showcase/src/lib/cairn.config.ts` (modify) | Add `editor.adminNav` with the Signups entry. |
| `examples/showcase/wrangler.jsonc` (modify) | Add the `APP_DB` D1 binding. |
| `examples/showcase/migrations-app/0001_signups.sql` (create) | The `signups` table. |
| `examples/showcase/src/app.d.ts` (modify) | Add `APP_DB` to `App.Platform.env`. |
| `examples/showcase/e2e/custom-screen.spec.ts` (create) | The end-to-end proof. |
| `src/tests/unit/guard.test.ts` (modify) | `requireOwner` minimal-param tests. |
| `src/tests/unit/cairn-admin-shell-load.test.ts` (create) | `shellLoad` payload, public early-return, streamed pending. |
| `src/tests/unit/compose-admin-nav.test.ts` (create) | `adminNav` normalization + collision validation. |
| `src/tests/component/cairn-admin-shell.test.ts` (create) | Custom nav entry in sidebar + palette; bare when public; absolute action paths. |
| `docs/reference/components.md`, `docs/reference/sveltekit.md`, `docs/reference/core.md` (modify) | New exports + the identity contract. |
| `docs/guides/add-a-custom-admin-screen.md` (create) | The four-file mount, identity, CSRF, binding typing, styling, reserved shortcuts, `ownerOnly`. |
| `CHANGELOG.md` (modify) | The Plan 1 entry with the "Consumers must" mount note. |

---

## Task 1: Narrow `requireOwner`; export the shared predicates

A custom route's `+page.server.ts` must be able to call `requireOwner(event)` with a standard load event. Today `requireOwner` demands the full `RequestContext` (cookies, `setHeaders`, `platform.env: AuthEnv`) even though it only reads `editor.role`. Narrow it to the same minimal structural param as `requireSession`. Also export the public-path predicate and a reserved-segment helper so `shellLoad` and `adminNav` validation reuse one source of truth.

**Files:**
- Modify: `src/lib/sveltekit/guard.ts` (`requireOwner` at 132–136; export `isPublicAdminPath` at 15–17)
- Modify: `src/lib/sveltekit/admin-dispatch.ts` (`RESERVED_SEGMENTS` at 31; add `isReservedAdminSegment`)
- Modify: `src/lib/sveltekit/index.ts` (re-export both)
- Test: `src/tests/unit/guard.test.ts`

**Interfaces:**
- Produces: `requireOwner(event: { locals: { editor?: Editor | null } }): Editor` (was `RequestContext`). `isPublicAdminPath(pathname: string): boolean`. `isReservedAdminSegment(segment: string): boolean`.

- [ ] **Step 1: Write the failing test for the narrowed `requireOwner`.**

In `src/tests/unit/guard.test.ts`, add:

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

- [ ] **Step 2: Run it; verify it fails to compile/type (requireOwner wants RequestContext).**

Run: `npx vitest run src/tests/unit/guard.test.ts -t requireOwner`
Expected: FAIL (type error on the minimal arg, or runtime if types are loose).

- [ ] **Step 3: Narrow the signature.**

In `src/lib/sveltekit/guard.ts`, change `requireOwner`:

```ts
export function requireOwner(event: { locals: { editor?: Editor | null } }): Editor {
  const editor = requireSession(event);
  if (editor.role !== 'owner') throw error(403, 'Owner access required');
  return editor;
}
```

- [ ] **Step 4: Export `isPublicAdminPath`.**

In `src/lib/sveltekit/guard.ts`, add `export` to the declaration at line 15:

```ts
export function isPublicAdminPath(pathname: string): boolean {
  return pathname === '/admin/login' || pathname.startsWith('/admin/auth/');
}
```

- [ ] **Step 5: Add and export `isReservedAdminSegment`.**

In `src/lib/sveltekit/admin-dispatch.ts`, after `RESERVED_SEGMENTS` (line 31):

```ts
/**
 * Report whether a single path segment is reserved by a cairn admin view, so a custom `adminNav`
 *  href cannot collide with `login`, `auth`, `editors`, `nav`, `settings`, or `help`. The one source
 *  of truth is {@link RESERVED_SEGMENTS}; reuse this rather than mirroring the set.
 */
export function isReservedAdminSegment(segment: string): boolean {
  return RESERVED_SEGMENTS.has(segment);
}
```

- [ ] **Step 6: Re-export both from `/sveltekit`.**

In `src/lib/sveltekit/index.ts`, add `isPublicAdminPath` to the guard export line (3) and `isReservedAdminSegment` to the admin-dispatch export line (34).

- [ ] **Step 7: Run the test + gate.**

Run: `npx vitest run src/tests/unit/guard.test.ts` then `npm run check`
Expected: PASS; svelte-check 0/0 (every existing `requireOwner` caller still satisfies the wider-accepting signature).

- [ ] **Step 8: Commit.**

```bash
git add src/lib/sveltekit/guard.ts src/lib/sveltekit/admin-dispatch.ts src/lib/sveltekit/index.ts src/tests/unit/guard.test.ts
git commit -m "feat: narrow requireOwner to a minimal event; export admin path predicates"
```

---

## Task 2: Relocate the admin chrome to a shared `/admin` layout

The core refactor. Move the chrome out of `CairnAdmin` into a shared `/admin/+layout.svelte` so cairn's own views and a developer's custom routes render inside one shell. Add `admin.shellLoad`; stream the pending-publish count; render bare for public paths; make the global chrome actions post to absolute paths; drop the now-redundant `layout` field from the per-view `admin.load`.

**Files:**
- Modify: `src/lib/sveltekit/content-routes.ts` (`layoutLoad` 721–755, `LayoutData` 73–95): factor a `shellPayload(event)`; stream `pendingEntries`; public early-return.
- Modify: `src/lib/sveltekit/cairn-admin.ts` (`createCairnAdmin` return 250; `AdminData` 62–71; `load` 116–166; `anyView`/`authedViews` 186–188): add `shellLoad`; drop `layout` from authed members; add `'index'` to the global-action allowed sets.
- Rename: `src/lib/components/AdminLayout.svelte` → `src/lib/components/CairnAdminShell.svelte`; modify its props to `{ data: AdminShellData; children: Snippet }`, bare-when-public, streamed pending, absolute action paths.
- Modify: `src/lib/components/CairnAdmin.svelte` (switch 49–76): render each view bare.
- Modify: `src/lib/components/index.ts`: export `CairnAdminShell`.
- Create: `examples/showcase/src/routes/admin/+layout.server.ts`, `+layout.svelte`.
- Modify: `examples/showcase/src/routes/admin/[...path]/+page.svelte`.
- Test: `src/tests/unit/cairn-admin-shell-load.test.ts`, `src/tests/component/cairn-admin-shell.test.ts`.

**Interfaces:**
- Produces:
  - `AdminShellData = { public: false; siteName: string; user: { email: string; displayName: string; role: Role }; concepts: NavConcept[]; customNav: ResolvedNavEntry[]; pathname: string; canManageEditors: boolean; navLabel: string | null; theme: 'cairn-admin' | 'cairn-admin-dark'; collapsedNav: boolean; csrf: string; pendingEntries: Promise<PendingEntry[] | null> } | { public: true; siteName: string }`.
  - `createCairnAdmin(...)` now returns `{ load, actions, shellLoad }`, where `shellLoad(event: AdminEvent): Promise<{ shell: AdminShellData }>`.
  - The per-view authed `AdminData` members lose `layout`: `{ view: 'list'; page: ListData }`, etc. `login`/`confirm` unchanged.
- Consumes: `isPublicAdminPath` (Task 1); `CairnAdminShell` consumes `AdminShellData`.

- [ ] **Step 1: Write the failing `shellLoad` test.**

Create `src/tests/unit/cairn-admin-shell-load.test.ts`. Build a runtime stub (mirror the existing `cairn-admin` test setup; reuse the helper from `src/tests/unit/cairn-admin-load.test.ts` if present) and assert:

```ts
it('shellLoad returns the lean shell payload for an authed admin path', async () => {
  const { shellLoad } = createCairnAdmin(runtime, {});
  const { shell } = await shellLoad(eventFor('/admin/posts'));
  expect(shell.public).toBe(false);
  if (shell.public) throw new Error('unreachable');
  expect(shell.user.email).toBe('editor@test');
  expect(shell.concepts.map((c) => c.id)).toContain('posts');
  // pendingEntries is a deferred promise, not an awaited value
  expect(typeof shell.pendingEntries.then).toBe('function');
});

it('shellLoad returns a public payload for the login path and never calls listBranches', async () => {
  const spy = vi.spyOn(backend, 'listBranches');
  const { shellLoad } = createCairnAdmin(runtime, {});
  const { shell } = await shellLoad(eventFor('/admin/login'));
  expect(shell.public).toBe(true);
  expect(spy).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run it; verify it fails (no `shellLoad`).**

Run: `npx vitest run src/tests/unit/cairn-admin-shell-load.test.ts`
Expected: FAIL — `shellLoad` is not a function.

- [ ] **Step 3: Factor the shell payload in `content-routes.ts`.**

Split `layoutLoad` so the cheap shell fields compute synchronously and `pendingEntries` is returned as an un-awaited promise. Add a public early-return using `isPublicAdminPath`. Sketch:

```ts
export function shellPayload(deps: ContentRoutesDeps) {
  return (event: ContentEvent): { shell: AdminShellData } => {
    if (isPublicAdminPath(event.url.pathname)) {
      return { shell: { public: true, siteName: deps.runtime.siteName } };
    }
    const editor = requireSession(event);
    const concepts = deps.runtime.concepts.map((c) => ({ id: c.id, label: c.label }));
    return {
      shell: {
        public: false,
        siteName: deps.runtime.siteName,
        user: editor,
        concepts,
        customNav: resolveAdminNav(deps.runtime.adminNav, editor),   // Task 3 fills this; '[]' for now
        pathname: event.url.pathname,
        canManageEditors: editor.role === 'owner',
        navLabel: deps.runtime.navMenu?.label ?? null,
        theme: readTheme(event),          // reuse the existing theme/collapsed cookie reads from layoutLoad
        collapsedNav: readCollapsed(event),
        csrf: issueCsrf(event),           // reuse layoutLoad's existing csrf derivation
        pendingEntries: deps.backend.listBranches(PENDING_PREFIX).then(toPendingEntries).catch(() => null),
      },
    };
  };
}
```

Keep `layoutLoad` working during the transition (the per-view loads still import it until Step 6), or have `layoutLoad` delegate to `shellPayload` and re-await `pendingEntries` for any caller that still needs the resolved value. Pick whichever keeps the suite green; the end state is that only `shellLoad` produces shell data.

- [ ] **Step 4: Expose `shellLoad` from `createCairnAdmin`.**

In `cairn-admin.ts`, instantiate `const shellLoad = (event: AdminEvent) => content.shellLoad(adminEvent(event))` and add it to the returned object at line 250: `return { load, actions, shellLoad };`.

- [ ] **Step 5: Run the `shellLoad` test; verify pass.**

Run: `npx vitest run src/tests/unit/cairn-admin-shell-load.test.ts`
Expected: PASS.

- [ ] **Step 6: Drop `layout` from the per-view `AdminData` and `load`.**

In `cairn-admin.ts`: change the authed `AdminData` members (63–71) to drop `layout` (e.g. `{ view: 'list'; page: ListData }`). In `load` (126–164), each authed case stops the `Promise.all([content.layoutLoad, viewLoad])` and returns just `{ view, page: await viewLoad(delegated) }`. The `login`/`confirm`/`index` cases are unchanged.

- [ ] **Step 7: Add `'index'` to the global-action allowed sets.**

So the shell's absolute global actions (`/admin?/logout`, `/admin?/publishAll`) resolve. In `cairn-admin.ts`, add `'index'` to `anyView` (188) and `authedViews` (186). (`viewAction` re-parses `/admin` → `{ view: 'index' }`; the action then runs.)

- [ ] **Step 8: Rename `AdminLayout.svelte` → `CairnAdminShell.svelte` and rewire it.**

```bash
git mv src/lib/components/AdminLayout.svelte src/lib/components/CairnAdminShell.svelte
```

In `CairnAdminShell.svelte`: change `Props` to `{ data: AdminShellData; children: Snippet }`. Add an early bare render when `data.public`:

```svelte
{#if data.public}
  {@render children()}
{:else}
  <!-- existing chrome, now reading data.* (was the LayoutData fields) -->
  <div data-theme={theme} bind:this={rootEl}> … {@render children()} … </div>
{/if}
```

Change the two global forms to absolute actions (they post from any `/admin/**` route now):

```svelte
<form method="POST" action="/admin?/logout" class="mt-4">
  <CsrfField token={data.csrf} />
  …
</form>
```
```svelte
<form method="POST" action="/admin?/publishAll" class="mt-4 flex justify-end gap-2">
  <CsrfField token={data.csrf} />
  …
</form>
```

Change `pendingCount` to consume the streamed promise:

```svelte
{#await data.pendingEntries then pending}
  {#if pending && pending.length > 0 && !isDeskRoute}
    <button type="button" onclick={() => publishAllDialog?.showModal()} class="btn btn-sm btn-primary">
      Publish site ({pending.length})
    </button>
  {/if}
{/await}
```

- [ ] **Step 9: Make `CairnAdmin` render each view bare.**

In `CairnAdmin.svelte`, the `{:else}` branch (53–75) drops the `<AdminLayout>` wrapper and renders the per-view component directly. The `login`/`confirm` branches (50–52) are unchanged (the shell renders them bare via `data.public`).

- [ ] **Step 10: Export `CairnAdminShell`; remove `AdminLayout` from the barrel.**

In `src/lib/components/index.ts`, replace the `AdminLayout` re-export with `CairnAdminShell`.

- [ ] **Step 11: Wire the showcase mount.**

Create `examples/showcase/src/routes/admin/+layout.server.ts`:
```ts
import { admin } from '$lib/cairn.server.js';
export const load = admin.shellLoad;
```
Create `examples/showcase/src/routes/admin/+layout.svelte`:
```svelte
<script lang="ts">
  import { CairnAdminShell } from '@glw907/cairn-cms/components';
  import type { AdminShellData } from '@glw907/cairn-cms/sveltekit';
  let { data, children }: { data: { shell: AdminShellData }; children: import('svelte').Snippet } = $props();
</script>
<CairnAdminShell data={data.shell}>{@render children()}</CairnAdminShell>
```
Modify `examples/showcase/src/routes/admin/[...path]/+page.svelte`: the `<CairnAdmin … />` call is unchanged but no longer carries chrome (the parent layout does).

- [ ] **Step 12: Write the shell component test.**

Create `src/tests/component/cairn-admin-shell.test.ts` (chromium browser test; mirror an existing component test's harness). Assert: an authed `AdminShellData` renders the sidebar with the concept entries and the help link; a `{ public: true }` payload renders only the children with no sidebar; the logout form's `action` attribute is exactly `/admin?/logout`.

- [ ] **Step 13: Run the gate.**

Run: `npm run package && npm run check && npm test`
Expected: svelte-check 0/0; full suite exit 0 (the existing `golden-path` and other admin tests pass through the relocated chrome). Fix any test that asserted the old `data.layout` shape.

- [ ] **Step 14: Commit.**

```bash
git add -A
git commit -m "refactor: relocate admin chrome to a shared /admin layout (CairnAdminShell + shellLoad)"
```

---

## Task 3: `adminNav` data-only custom sidebar entry

A developer declares a custom screen's sidebar entry as config data. It flows adapter → runtime → shell payload, and the shell renders it in the sidebar, the command palette, and the breadcrumb source. The icon is a typed Lucide name from a fixed allowlist; the href is validated against reserved segments and concept routes at compose time with a clear error.

**Files:**
- Modify: `src/lib/content/types.ts` (`CairnAdapter.editor` ~247; `CairnRuntime` ~340)
- Modify: `src/lib/content/compose.ts` (`composeRuntime`)
- Create: `src/lib/components/admin-nav-icons.ts`
- Modify: `src/lib/sveltekit/content-routes.ts` (`resolveAdminNav` + `AdminShellData.customNav`)
- Modify: `src/lib/components/CairnAdminShell.svelte` (merge `customNav` into `coreItems`, `paletteCommands`, `crumbs`)
- Modify: `src/lib/sveltekit/index.ts` (export `AdminNavEntry`, `AdminNavIcon`)
- Test: `src/tests/unit/compose-admin-nav.test.ts`; extend `src/tests/component/cairn-admin-shell.test.ts`

**Interfaces:**
- Produces:
  - `type AdminNavIcon = 'anchor' | 'calendar' | 'clipboard-list' | 'list' | 'users' | 'package' | 'inbox' | 'table' | 'wrench'` (the bundled allowlist; finalize the exact set in Step 1).
  - `interface AdminNavEntry { label: string; icon: AdminNavIcon; href: string; ownerOnly?: boolean }` (the config shape).
  - `interface ResolvedNavEntry { label: string; iconName: AdminNavIcon; href: string; ownerOnly: boolean }` (normalized, on the runtime + `AdminShellData.customNav`).
- Consumes: `isReservedAdminSegment` (Task 1); `AdminShellData` (Task 2).

- [ ] **Step 1: Define the icon allowlist.**

Create `src/lib/components/admin-nav-icons.ts`:
```ts
import { AnchorIcon, CalendarIcon, ClipboardListIcon, ListIcon, UsersIcon, PackageIcon, InboxIcon, TableIcon, WrenchIcon } from '@lucide/svelte';
import type { Component } from 'svelte';

/** Accepted `adminNav.icon` names. A custom nav entry picks one; cairn forbids passing a component. */
export const ADMIN_NAV_ICONS = {
  anchor: AnchorIcon, calendar: CalendarIcon, 'clipboard-list': ClipboardListIcon,
  list: ListIcon, users: UsersIcon, package: PackageIcon, inbox: InboxIcon,
  table: TableIcon, wrench: WrenchIcon,
} satisfies Record<string, Component>;

export type AdminNavIcon = keyof typeof ADMIN_NAV_ICONS;

/** The fallback glyph for an unknown name (defensive; compose-time validation should prevent this). */
export const ADMIN_NAV_FALLBACK_ICON = ListIcon;
```
(Confirm the import path matches the project's Lucide usage in `admin-icons.ts`.)

- [ ] **Step 2: Write the failing compose/validation test.**

Create `src/tests/unit/compose-admin-nav.test.ts`:
```ts
it('normalizes a valid adminNav entry', () => {
  const rt = composeRuntime({ adapter: adapterWith({ editor: { adminNav: [
    { label: 'Signups', icon: 'inbox', href: '/admin/signups' },
  ] } }), siteConfig });
  expect(rt.adminNav).toEqual([{ label: 'Signups', iconName: 'inbox', href: '/admin/signups', ownerOnly: false }]);
});

it('rejects an adminNav href that collides with a reserved segment', () => {
  expect(() => composeRuntime({ adapter: adapterWith({ editor: { adminNav: [
    { label: 'X', icon: 'list', href: '/admin/settings' },
  ] } }), siteConfig })).toThrow(/reserved/i);
});

it('rejects an adminNav href that collides with a concept route', () => {
  expect(() => composeRuntime({ adapter: adapterWith({ editor: { adminNav: [
    { label: 'Posts2', icon: 'list', href: '/admin/posts' },
  ] } }), siteConfig })).toThrow(/concept/i);
});

it('rejects an unknown icon name', () => {
  expect(() => composeRuntime({ adapter: adapterWith({ editor: { adminNav: [
    { label: 'X', icon: 'rocket' as never, href: '/admin/x' },
  ] } }), siteConfig })).toThrow(/icon/i);
});
```

- [ ] **Step 3: Run it; verify it fails.**

Run: `npx vitest run src/tests/unit/compose-admin-nav.test.ts`
Expected: FAIL — `rt.adminNav` undefined / no validation.

- [ ] **Step 4: Add the config + runtime types.**

In `src/lib/content/types.ts`, add to `CairnAdapter.editor` (~247): `adminNav?: AdminNavEntry[];` and add `adminNav?: ResolvedNavEntry[];` to `CairnRuntime` (~340). Define/import `AdminNavEntry`, `AdminNavIcon`, `ResolvedNavEntry` (icon types from `../components/admin-nav-icons.js`).

- [ ] **Step 5: Validate + normalize in `composeRuntime`.**

In `compose.ts`, fold `adapter.editor?.adminNav` into `runtime.adminNav`: for each entry, assert `icon in ADMIN_NAV_ICONS` (else throw "unknown adminNav icon"), parse the href's first segment under `/admin/`, assert `!isReservedAdminSegment(seg)` (else throw "reserved segment") and the segment is not a concept id (else throw "collides with concept route"), and default `ownerOnly` to `false`. Produce `ResolvedNavEntry`.

- [ ] **Step 6: Resolve into the shell payload.**

In `content-routes.ts`, implement `resolveAdminNav(entries, editor)`: return `entries.filter((e) => !e.ownerOnly || editor.role === 'owner')`. Assign to `AdminShellData.customNav` in `shellPayload` (replacing the `[]` placeholder from Task 2 Step 3).

- [ ] **Step 7: Render custom entries in the shell.**

In `CairnAdminShell.svelte`, after the concept entries in `coreItems` (and before Settings/Editors, or in a labeled "Custom" group), append `data.customNav.map((e) => ({ label: e.label, icon: ADMIN_NAV_ICONS[e.iconName] ?? ADMIN_NAV_FALLBACK_ICON, href: e.href }))`. The `paletteCommands` derivation already maps `coreItems`, so palette inclusion follows; verify breadcrumbs (`crumbs`) resolve a custom `href` to its label (extend the lookup to check `data.customNav` alongside `data.concepts`).

- [ ] **Step 8: Export the config types.**

In `src/lib/sveltekit/index.ts`, export `type AdminNavEntry, AdminNavIcon` (and `AdminShellData`, `ResolvedNavEntry` if not already from Task 2).

- [ ] **Step 9: Extend the component test.**

In `src/tests/component/cairn-admin-shell.test.ts`, add: an `AdminShellData` with one `customNav` entry renders a sidebar link to its `href` with its label; an `ownerOnly` entry is absent for an editor-role payload.

- [ ] **Step 10: Run the gate + commit.**

Run: `npm run package && npm run check && npm test`
```bash
git add -A
git commit -m "feat: adminNav data-only custom sidebar entry (typed icon allowlist, collision validation)"
```

---

## Task 4: The showcase custom-screen proof (`Signups`)

Prove the whole seam end-to-end: a concrete `/admin/signups` route reading `locals.editor`, gated by `requireOwner`, rendering inside the inherited shell, registering an `adminNav` entry, and writing its own D1 binding through a `CsrfField`-guarded action.

**Files:**
- Modify: `examples/showcase/wrangler.jsonc` (add `APP_DB`); `examples/showcase/src/app.d.ts` (type it); `examples/showcase/src/lib/cairn.config.ts` (`editor.adminNav`)
- Create: `examples/showcase/migrations-app/0001_signups.sql`; `examples/showcase/src/routes/admin/signups/+page.server.ts`, `+page.svelte`; `examples/showcase/e2e/custom-screen.spec.ts`

**Interfaces:**
- Consumes: `requireOwner`, `CsrfField`, `AdminShellData`, `adminNav` (Tasks 1–3); the guard-populated `locals.editor`.

- [ ] **Step 1: Add the `APP_DB` binding + migration.**

`examples/showcase/wrangler.jsonc` — add to `d1_databases`:
```jsonc
{ "binding": "APP_DB", "database_name": "cairn-showcase-app", "database_id": "00000000-0000-0000-0000-000000000001" }
```
Create `examples/showcase/migrations-app/0001_signups.sql`:
```sql
CREATE TABLE IF NOT EXISTS signups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```
Add `APP_DB: D1Database;` to the `App.Platform.env` block in `examples/showcase/src/app.d.ts`. (Document the local-apply command in the guide: `wrangler d1 migrations apply cairn-showcase-app --local`.)

- [ ] **Step 2: Write the custom screen.**

`examples/showcase/src/routes/admin/signups/+page.server.ts`:
```ts
import { requireOwner } from '@glw907/cairn-cms/sveltekit';
import { fail } from '@sveltejs/kit';
import { verifyCsrf } from '$lib/cairn.server.js';   // or the documented CSRF check helper

export const load = async (event) => {
  requireOwner(event);                                // owner-gated; ownerOnly nav is cosmetic only
  const { results } = await event.platform!.env.APP_DB.prepare(
    'SELECT id, name, email, created_at FROM signups ORDER BY id DESC',
  ).all();
  return { signups: results };
};

export const actions = {
  create: async (event) => {
    if (!(await verifyCsrf(event))) return fail(403, { error: 'csrf' });
    const form = await event.request.formData();
    const name = String(form.get('name') ?? '').trim();
    const email = String(form.get('email') ?? '').trim();
    if (!name || !email) return fail(400, { error: 'missing' });
    await event.platform!.env.APP_DB.prepare('INSERT INTO signups (name, email) VALUES (?, ?)').bind(name, email).run();
    return { created: true };
  },
};
```
(Step 4 of this task confirms the exact CSRF verification entry point; if no public helper exists, the guide documents that the guard already enforces CSRF on the POST and the action only needs the `<CsrfField>` in the form — verify against `guard.ts` whether the action must re-check or the guard already rejected.)

`examples/showcase/src/routes/admin/signups/+page.svelte`:
```svelte
<script lang="ts">
  import { CsrfField } from '@glw907/cairn-cms/components';
  let { data, form } = $props();
  // csrf token comes from the parent shell layout data
  import { page } from '$app/state';
</script>
<h1 class="text-2xl font-semibold">Signups</h1>
<form method="POST" action="?/create" class="my-4 flex gap-2">
  <CsrfField token={page.data.shell.csrf} />
  <input name="name" placeholder="Name" class="input input-bordered" />
  <input name="email" placeholder="Email" class="input input-bordered" />
  <button class="btn btn-primary">Add</button>
</form>
<table class="table"><tbody>
  {#each data.signups as s}<tr><td>{s.name}</td><td>{s.email}</td></tr>{/each}
</tbody></table>
```

- [ ] **Step 3: Register the nav entry.**

In `examples/showcase/src/lib/cairn.config.ts`, add to the `editor` group:
```ts
adminNav: [{ label: 'Signups', icon: 'inbox', href: '/admin/signups' }],
```

- [ ] **Step 4: Confirm the CSRF action contract.**

Read `src/lib/sveltekit/guard.ts` to confirm whether the guard rejects a tokenless POST to `/admin/signups` before the action runs (it should: `/admin/**`, unsafe method). If so, the action's own check is belt-and-suspenders; document the `<CsrfField token={shell.csrf} />` requirement as the real contract. Adjust the screen to the verified mechanism.

- [ ] **Step 5: Write the e2e proof.**

Create `examples/showcase/e2e/custom-screen.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('a custom admin screen renders in the shell, reads identity, and writes its own D1', async ({ page }) => {
  await page.goto('/admin/signups');
  // inherits the shell: the sidebar with the registered nav entry is present
  await expect(page.locator('a[href="/admin/signups"]')).toBeVisible();
  // the custom screen renders its own content
  await expect(page.getByRole('heading', { name: 'Signups' })).toBeVisible();
  // the CSRF-guarded create action writes APP_DB
  await page.fill('input[name="name"]', 'Ada');
  await page.fill('input[name="email"]', 'ada@test');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByRole('cell', { name: 'Ada' })).toBeVisible();
});

test('a global chrome action (logout) fires from the custom route', async ({ page }) => {
  await page.goto('/admin/signups');
  // the shell's logout form targets the absolute catch-all path, not /admin/signups
  await expect(page.locator('form[action="/admin?/logout"]')).toHaveCount(1);
});
```
(Confirm the showcase e2e harness applies the `APP_DB` migration before the run; if the test setup provisions D1, add the `migrations-app` apply to it.)

- [ ] **Step 6: Run e2e locally + commit.**

Run the showcase e2e per its README (the `wrangler dev` + Playwright flow).
```bash
git add -A
git commit -m "test: showcase Signups custom admin screen proves the extension seam end-to-end"
```

---

## Task 5: Documentation

Docs are a pass dimension. Document the new exports and the four-file mount, with the footguns called out.

**Files:**
- Modify: `docs/reference/components.md` (`CairnAdminShell`), `docs/reference/sveltekit.md` (`shellLoad`, `AdminShellData`, `AdminNavEntry`, `AdminNavIcon`, `isPublicAdminPath`, `isReservedAdminSegment`, the narrowed `requireOwner`), `docs/reference/core.md` (the `Editor`/`Role` identity contract + the `./ambient` `locals.editor` note)
- Create: `docs/guides/add-a-custom-admin-screen.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Reference pages.** Add a one-line-minimum doc entry for each new export so `check:reference` passes. Mark each in its tier (Extension API vs Scaffold API — the tier labels/gate land in Plan 2, but write the labels now so Plan 2 only adds the assertion).

- [ ] **Step 2: The guide.** Write `docs/guides/add-a-custom-admin-screen.md` (Google developer-docs style, Vale-clean) covering: the concrete route under `/admin/`; the four-file mount (`+layout.server.ts`, `+layout.svelte`, the catch-all pair); reading identity via `locals.editor` and gating with `requireSession`/`requireOwner`; that `ownerOnly` nav is cosmetic and the route must gate; the `<CsrfField token={shell.csrf} />` pattern for custom actions; typing the developer's own binding in `app.d.ts` `App.Platform.env`; using the admin design tokens inside the shell; the reserved shortcuts (Cmd+K palette, Cmd+B sidebar) and that client interactivity rides the developer's own client code or `./islands`.

- [ ] **Step 3: CHANGELOG.** Add the entry with the `<!-- release-size: minor -->` marker and a **Consumers must** block: add `/admin/+layout.server.ts` and `/admin/+layout.svelte` (the two new mount files); `AdminLayout` is renamed `CairnAdminShell`; per-view `AdminData` members no longer carry `layout`. Note the hold (released with Plan 2).

- [ ] **Step 4: Doc gates + commit.**

Run: `npm run check:reference && npm run check:comments`
```bash
git add -A
git commit -m "docs: reference + guide for the custom-admin-screen seam"
```

---

## Self-review

- **Spec coverage.** Seam 1 chrome → Task 2; nav registration → Task 3; identity contract + `requireOwner` → Tasks 1, 4, 5; CSRF reuse → Task 4; global absolute actions → Task 2 (Steps 7–8); lean `shellLoad`/no-blocking-`listBranches` → Task 2 (streamed `pendingEntries`); single-source predicates → Task 1; showcase proof → Task 4; docs → Task 5. Seam 3 (enforcement: `check:surface`, tier gate, doctor mount-shape, upgrade disclosure) is **Plan 2**, deliberately out of this plan.
- **Type consistency.** `AdminShellData` (Task 2) is consumed by `CairnAdminShell` and the showcase layout; `customNav: ResolvedNavEntry[]` (Task 3) is produced in `composeRuntime` and read in `shellPayload`; `requireOwner`'s narrowed param (Task 1) is used by the showcase screen (Task 4). Names align across tasks.
- **Open items deferred to execution (flagged, not placeheld):** the exact CSRF verification entry point (Task 4 Step 4 resolves it against `guard.ts`); the final `AdminNavIcon` set (Task 3 Step 1); whether `layoutLoad` is deleted or delegates during the Task 2 transition (keep-green choice). Each is a concrete decision the implementer makes against the code, not an unspecified requirement.
