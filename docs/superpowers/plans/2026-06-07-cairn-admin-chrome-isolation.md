# Admin chrome isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Isolate the cairn admin from host chrome so the admin never renders inside a site's nav, footer, or width-constraining container, and teach the route pattern that guarantees it.

**Architecture:** A dev-only structural guard in the two admin root components walks the ancestor chain on mount and logs one precise error when host chrome wraps the admin. The canonical route pattern (a bare, chrome-free root layout plus a URL-transparent `(site)` group holding the public chrome and `app.css`) is documented and demonstrated on the framework-free showcase. The global at-rule leak carried from plan 1 is closed by this isolation rather than by name-mangling, pinned by a boundary test that confirms the admin stylesheet is imported only by the admin roots, so it loads only on `/admin`.

**Tech Stack:** Svelte 5 runes, SvelteKit 2, vitest (browser and unit projects), the engine's self-styled scoped admin CSS.

This is plan 3 of the admin-stands-alone initiative. The design is settled in `docs/superpowers/specs/2026-06-07-cairn-admin-stands-alone-design.md` (sections 3, 4, 5, and the "Resolved for plan 3 (2026-06-07)" block). The work is engine-only. The two production-site retrofits (907.life, ecnordic.ski) are separate `site-pass` work that runs after this engine version publishes.

**Scope boundary on the tutorial.** The tutorial gains a focused teaching subsection on the rule and a forward-pointer, not a full restructuring of its public-page milestones into a `(site)` group. The canonical pattern lives in `docs/admin-route-structure.md`; the tutorial points there.

**Pass-end ritual.** STATUS.md, the memory refresh, the plan post-mortem, and the publish decision are handled by the `cairn-pass` consolidation ritual after the tasks land, not as numbered tasks here.

---

### Task 1: The chrome-leak detection function

A pure function over the DOM that decides whether host chrome wraps the admin root. Pure so a test builds either ancestor shape and asserts the result directly, without rendering a component.

**Files:**
- Create: `src/lib/components/chrome-guard.ts`
- Test: `src/tests/component/chrome-guard.test.ts`

The test lives in the component (browser) project because it needs a real `getComputedStyle` to read an ancestor's `max-width`. The unit project runs in node and does not compute styles.

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/component/chrome-guard.test.ts
import { describe, it, expect, afterEach } from 'vitest';
import { detectChromeWrap } from '../../lib/components/chrome-guard.js';

function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.body.querySelector<HTMLElement>('[data-admin-root]')!;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('detectChromeWrap', () => {
  it('flags a width-constraining ancestor between the admin root and body', () => {
    const root = mount('<main style="max-width: 64rem"><div data-admin-root></div></main>');
    const msg = detectChromeWrap(root);
    expect(msg).toMatch(/width-constraining ancestor/);
    expect(msg).toMatch(/max-width:/);
    expect(msg).toContain('docs/admin-route-structure.md');
  });

  it('stays silent when the admin root is a direct child of body', () => {
    const root = mount('<div data-admin-root></div>');
    expect(detectChromeWrap(root)).toBeNull();
  });

  it('notes host siblings as context when chrome wraps the admin', () => {
    const root = mount(
      '<header class="site-nav"></header><main style="max-width: 70rem"><div data-admin-root></div></main>',
    );
    const msg = detectChromeWrap(root)!;
    expect(msg).toContain('beside the admin');
    expect(msg).toContain('site-nav');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/tests/component/chrome-guard.test.ts`
Expected: FAIL, cannot resolve `../../lib/components/chrome-guard.js` (the module does not exist yet).

- [ ] **Step 3: Write the module**

```ts
// src/lib/components/chrome-guard.ts
// Dev-only structural check that catches a host mounting the admin inside its own chrome. Every admin
// rule is scoped and the admin self-styles, but a host whose root layout wraps the admin in a
// width-constraining container (a `<main class="container">`) or renders its nav and footer around it
// breaks the full-bleed admin shell. The engine cannot prevent that layout mistake, so it names it.
// The check walks the ancestor chain once on mount and emits one console.error that points at the
// route-structure doc. The public entry runs only under import.meta.env.DEV, never throws, and changes
// no rendering.

const DOC = 'docs/admin-route-structure.md';

function describe(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const cls = el.getAttribute('class');
  return cls ? `<${tag} class="${cls}">` : `<${tag}>`;
}

/**
 * Inspect the admin root's ancestor chain for host chrome. Returns a diagnostic when a
 * width-constraining ancestor sits between the root and <body>, else null. Pure over the DOM so a
 * test can build either shape. The sibling signal (host elements outside the admin subtree) is folded
 * into the message as context rather than raised on its own, because it is the noisier of the two.
 */
export function detectChromeWrap(root: HTMLElement): string | null {
  const body = root.ownerDocument.body;
  let constrainer: HTMLElement | null = null;
  for (let el = root.parentElement; el && el !== body; el = el.parentElement) {
    const maxWidth = getComputedStyle(el).maxWidth;
    if (maxWidth && maxWidth !== 'none') {
      constrainer = el;
      break;
    }
  }
  if (!constrainer) return null;

  const maxWidth = getComputedStyle(constrainer).maxWidth;
  const siblings = [...body.children].filter((el) => !el.contains(root) && !root.contains(el) && el !== root);
  const siblingNote = siblings.length
    ? ` Host elements also sit beside the admin in <body> (${siblings.map(describe).join(', ')}).`
    : '';
  return (
    `[cairn-cms] The admin is rendering inside host chrome. A width-constraining ancestor ` +
    `${describe(constrainer)} (max-width: ${maxWidth}) sits between the admin root and <body>, so the ` +
    `admin shell cannot fill the viewport.${siblingNote} Keep the host root layout chrome-free and move ` +
    `your nav, footer, and app.css into a (site) route group. See ${DOC}.`
  );
}

/** Run the check in dev and log one error when host chrome is detected. A no-op in production. */
export function warnIfChromeWrapped(root: HTMLElement): void {
  if (!import.meta.env.DEV) return;
  const problem = detectChromeWrap(root);
  if (problem) console.error(problem);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/tests/component/chrome-guard.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/chrome-guard.ts src/tests/component/chrome-guard.test.ts
git commit -m "Add the dev-only chrome-wrap detection function"
```

---

### Task 2: Wire the guard into the admin roots

Both admin root components call the guard on mount against their own root element. The root element is the bare `data-theme` wrapper that already exists in each.

**Files:**
- Modify: `src/lib/components/AdminLayout.svelte`
- Modify: `src/lib/components/LoginPage.svelte`
- Test: `src/tests/component/AdminLayout.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test to `src/tests/component/AdminLayout.test.ts`. It mounts the real shell and asserts the wired guard does not false-fire on a clean mount (no width-constraining ancestor around the render container). Add `vi` to the existing vitest import at the top of the file (`import { describe, it, expect, beforeEach, vi } from 'vitest';`).

```ts
  it('does not warn about host chrome on a clean mount', async () => {
    const errors: string[] = [];
    const spy = vi.spyOn(console, 'error').mockImplementation((...args) => {
      errors.push(args.join(' '));
    });
    render(AdminLayout, { data: data(true), children: child });
    await new Promise((resolve) => setTimeout(resolve, 0)); // let onMount run
    spy.mockRestore();
    expect(errors.join(' ')).not.toContain('rendering inside host chrome');
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/tests/component/AdminLayout.test.ts -t "host chrome"`
Expected: FAIL, `render` mounts the shell but the guard is not wired, so the test references behavior that does not exist yet. The assertion may pass vacuously, so confirm the failure is the missing wiring by checking the next step compiles. If the assertion passes before wiring, treat Step 4 as the real gate and proceed; the test exists to lock the clean-mount contract once the guard is wired.

- [ ] **Step 3: Wire the guard in `AdminLayout.svelte`**

In the `<script>`, add `onMount` to the existing svelte import and import the guard. The current import line is:

```ts
  import { untrack, type Component, type Snippet } from 'svelte';
```

Change it to:

```ts
  import { onMount, untrack, type Component, type Snippet } from 'svelte';
```

Add the guard import beside the other local imports (for example under the `cairn-favicon` import):

```ts
  import { warnIfChromeWrapped } from './chrome-guard.js';
```

Add the root ref and the mount call. Put this near the other top-level `$state` and lifecycle declarations in the script:

```ts
  // The bare data-theme wrapper is the admin root the dev chrome-guard measures from.
  let rootEl = $state<HTMLElement>();
  onMount(() => {
    if (rootEl) warnIfChromeWrapped(rootEl);
  });
```

Bind the root element. The current wrapper opening tag is:

```svelte
<div data-theme={theme}>
```

Change it to:

```svelte
<div data-theme={theme} bind:this={rootEl}>
```

- [ ] **Step 4: Wire the guard in `LoginPage.svelte`**

In the `<script>`, add the imports. The current first import is `import './cairn-admin.css';`. Add below the existing imports:

```ts
  import { onMount } from 'svelte';
  import { warnIfChromeWrapped } from './chrome-guard.js';
```

Add the root ref and mount call after the `let { data, form }: Props = $props();` line:

```ts
  let rootEl = $state<HTMLElement>();
  onMount(() => {
    if (rootEl) warnIfChromeWrapped(rootEl);
  });
```

Bind the root element. The current wrapper opening tag is:

```svelte
<div data-theme="cairn-admin">
```

Change it to:

```svelte
<div data-theme="cairn-admin" bind:this={rootEl}>
```

- [ ] **Step 5: Run the tests and the type check**

Run: `npx vitest run src/tests/component/AdminLayout.test.ts`
Expected: PASS, all AdminLayout tests including the new clean-mount test.

Run: `npm run check`
Expected: `0 ERRORS 0 WARNINGS`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/AdminLayout.svelte src/lib/components/LoginPage.svelte src/tests/component/AdminLayout.test.ts
git commit -m "Wire the chrome-guard into the admin and login roots"
```

---

### Task 3: The at-rule boundary test

Pin the boundary that closes the global at-rule leak: the compiled admin stylesheet, which carries the global `@keyframes` and `@property` rules, is imported only by the two admin root components, so it loads only on `/admin` routes and never co-occurs with a host's own CSS on a host page. A regression that imports it elsewhere fails this test.

**Files:**
- Modify: `src/tests/unit/engine-isolation.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test inside the `describe('engine isolation', ...)` block in `src/tests/unit/engine-isolation.test.ts`. The `files` array and the `readFileSync` import already exist at the top of the file.

```ts
  it('imports the admin stylesheet only from the admin root components, so it loads only on /admin', () => {
    // The compiled cairn-admin.css carries DaisyUI @keyframes and Tailwind @property rules that are
    // document-global by CSS spec. They cannot collide with a host's CSS because the sheet is
    // code-split to the routes that import it, and only the two admin roots do, so it never loads on a
    // host page. Chrome isolation keeps host CSS off /admin from the other side. This pins that
    // boundary; importing the sheet anywhere else would leak the globals onto host pages.
    const importers = files
      .filter((f) => f.endsWith('.svelte'))
      .filter((f) => /import\s+['"]\.\/cairn-admin\.css['"]/.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(f.lastIndexOf('/') + 1))
      .sort();
    expect(importers).toEqual(['AdminLayout.svelte', 'LoginPage.svelte']);
  });
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run src/tests/unit/engine-isolation.test.ts`
Expected: PASS. This is a pinning test over the current import graph, so it passes immediately and guards against future drift.

- [ ] **Step 3: Commit**

```bash
git add src/tests/unit/engine-isolation.test.ts
git commit -m "Pin the admin stylesheet to the admin roots, so its globals stay off host pages"
```

---

### Task 4: The showcase `(site)` group

Demonstrate the pattern. The showcase root layout is already bare. Add a `(site)` group with plain-CSS chrome and move the public routes into it. The admin stays outside the group, so it proves the admin self-styles and stands alone on a site that uses neither Tailwind nor DaisyUI.

**Files:**
- Create: `examples/showcase/src/routes/(site)/+layout.svelte`
- Create: `examples/showcase/src/routes/(site)/site.css`
- Move: `examples/showcase/src/routes/+page.svelte` and `+page.server.ts` into `(site)/`
- Move: `examples/showcase/src/routes/[...path]/` into `(site)/[...path]/`
- Move: `examples/showcase/src/routes/calendar/` into `(site)/calendar/`
- Modify: `examples/showcase/src/routes/(site)/+page.svelte` (drop the inline nav after the move)

- [ ] **Step 1: Move the public routes into the group**

```bash
cd examples/showcase/src/routes
mkdir -p '(site)'
git mv '+page.svelte' '(site)/+page.svelte'
git mv '+page.server.ts' '(site)/+page.server.ts'
git mv '[...path]' '(site)/[...path]'
git mv 'calendar' '(site)/calendar'
cd -
```

Expected: the four moves succeed. The endpoints (`feed.json`, `feed.xml`, `healthz`, `robots.txt`, `sitemap.xml`, `test`) and `admin/` stay at the route root. The root `+layout.svelte` stays bare.

- [ ] **Step 2: Create the group's plain-CSS chrome**

```css
/* examples/showcase/src/routes/(site)/site.css
   Plain CSS for the public chrome, no Tailwind and no DaisyUI. This is the point of the showcase: the
   admin renders fully styled on a site whose own pages use neither framework. The chrome lives in the
   (site) group, so it never wraps /admin. */
.site-header {
  display: flex;
  gap: 1.25rem;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e7e5e4;
  font-family: system-ui, sans-serif;
}
.site-header a {
  color: #44403c;
  text-decoration: none;
  font-weight: 600;
}
.site-header a:hover {
  text-decoration: underline;
}
.site-main {
  max-width: 48rem;
  margin: 0 auto;
  padding: 2rem 1.5rem;
  font-family: system-ui, sans-serif;
}
.site-footer {
  border-top: 1px solid #e7e5e4;
  padding: 1.5rem;
  text-align: center;
  color: #78716c;
  font-family: system-ui, sans-serif;
}
```

- [ ] **Step 3: Create the group layout**

```svelte
<!-- examples/showcase/src/routes/(site)/+layout.svelte -->
<!-- @component The public chrome for the showcase: a plain-CSS nav and footer in a (site) route group.
     The group is URL-transparent, so these pages keep their paths, and the chrome never wraps /admin,
     which lives outside the group. This proves the admin self-styles: it renders fully styled on a site
     whose own pages use neither Tailwind nor DaisyUI. -->
<script lang="ts">
  import './site.css';
  let { children } = $props();
</script>

<header class="site-header">
  <a href="/">cairn showcase</a>
  <a href="/calendar">Calendar</a>
  <a href="/admin">Admin</a>
</header>
<main class="site-main">
  {@render children()}
</main>
<footer class="site-footer">A cairn-cms showcase site.</footer>
```

- [ ] **Step 4: Drop the inline nav from the home page**

The home page's inline `<nav>` is now in the group chrome. Edit `examples/showcase/src/routes/(site)/+page.svelte` to remove it. The current top of the markup is:

```svelte
<h1>cairn showcase</h1>
<nav>
  <a href="/calendar">Calendar (a non-cairn feature)</a>
  <a href="/admin">Admin</a>
</nav>

<ul class="post-list">
```

Change it to:

```svelte
<h1>cairn showcase</h1>

<ul class="post-list">
```

- [ ] **Step 5: Rebuild the package and the showcase, then verify both surfaces render**

```bash
npm run package
cd examples/showcase && npm run build && cd -
```

Expected: both builds exit 0. The `(site)` group resolves the public pages at their unchanged URLs, and `/admin` builds outside the group.

- [ ] **Step 6: Smoke the running preview**

```bash
cd examples/showcase
SHOWCASE_FAKE_BACKEND=1 npm run preview -- --host 127.0.0.1 --port 4173 &
sleep 5
curl -s -o /dev/null -w 'home %{http_code}\n' http://localhost:4173/
curl -s -o /dev/null -w 'admin %{http_code}\n' http://localhost:4173/admin/posts
curl -s http://localhost:4173/ | grep -c 'site-header'
fuser -k 4173/tcp
cd -
```

Expected: `home 200`, `admin 200`, and the home HTML contains the `site-header` chrome (count `1` or more). The admin page renders without the `site-header` chrome.

- [ ] **Step 7: Commit**

```bash
git add examples/showcase/src/routes
git commit -m "Add a (site) group to the showcase to prove the admin stands outside host chrome"
```

---

### Task 5: Document the chrome-isolation rule

Add the canonical rule to the existing route-structure doc: a chrome-free root layout plus the `(site)` group, with the before and after tree, and the known-limitation note that keeps the at-rule globals confined.

**Files:**
- Modify: `docs/admin-route-structure.md`

- [ ] **Step 1: Add the new section**

Insert this section immediately after the opening paragraph (before the `## Why the `(app)` group` section) in `docs/admin-route-structure.md`:

````markdown
## The root layout must be chrome-free

The host root layout wraps every route, including `/admin`. If it renders site chrome (a nav, a
footer, a width-constraining container) or imports the host's `app.css`, that chrome wraps the admin,
and the admin shell cannot fill the viewport. The admin self-styles and does not need the host's CSS,
so the fix is to keep the root layout bare and move all public chrome plus `app.css` into a
URL-transparent `(site)` group.

```
src/routes/
  +layout.svelte        bare: {@render children()} and nothing else
  (site)/               URL-transparent group; the public URLs do not change
    +layout.svelte      imports app.css, renders the nav, <main>, and footer
    +page.svelte ...    the home page and the public pages, moved in
  admin/   ...          unchanged; now outside the chrome
  feed.xml/ sitemap.xml/ robots.txt/ healthz/   endpoints; no layout, stay at the root
```

Group folders are invisible in the URL, so moving the public pages into `(site)/` changes no paths.
Endpoints render no layout, so they stay at the root. The admin sits outside the group, so the host
chrome never wraps it.

A dev-only guard in the admin backs this rule. In development, `AdminLayout` and `LoginPage` walk their
ancestor chain on mount, and when a width-constraining ancestor sits between the admin root and
`<body>` they log one `console.error` that names the ancestor and points here. The guard compiles out
of production and changes no rendering.

**A known limitation this rule contains.** The compiled admin stylesheet carries DaisyUI `@keyframes`
and Tailwind `@property` rules that are document-global by CSS spec; a selector scope cannot bound them.
They cause no collision because the sheet is code-split to the routes that import it, and only the admin
roots import it, so it loads only on `/admin`, where this rule keeps the host's CSS away. Two things
preserve that boundary: keep `app.css` in the `(site)` group so it never loads on `/admin`, and do not
import the engine's admin components onto a host page.

The scaffolder (Plan 10) emits this shape from the start: a bare root layout and a `(site)` group for
the public chrome.
````

- [ ] **Step 2: Run the docs link gate**

Run: `npm run check:docs`
Expected: exit 0, no dead links or stale anchors.

- [ ] **Step 3: Commit**

```bash
git add docs/admin-route-structure.md
git commit -m "Document the chrome-free root layout and the (site) group"
```

---

### Task 6: Teach the rule in the tutorial

Add a focused teaching subsection where the tutorial wires the admin, plus a forward-pointer at the root-layout step. This teaches the rule without restructuring the tutorial's public-page milestones.

**Files:**
- Modify: `docs/tutorial/build-your-first-cairn-site.md`

- [ ] **Step 1: Add a forward-pointer at the root-layout step**

Find this paragraph in Milestone 1 (it precedes the root `+layout.svelte` code block):

```markdown
Import that stylesheet once from your root layout, `src/routes/+layout.svelte`:
```

Insert this sentence immediately after that paragraph's code block (after the closing ` ``` ` of the `+layout.svelte` snippet):

```markdown
This keeps the root layout almost bare, which matters later: the root layout wraps `/admin` too, so a
real site keeps its nav, footer, and `app.css` out of the root and in a `(site)` route group instead.
Milestone 8 covers the rule, and [the admin route structure](../admin-route-structure.md) has the full
pattern.
```

- [ ] **Step 2: Add the teaching subsection in Milestone 8**

Find this paragraph in Milestone 8 (it explains the `(app)` group, near the start of "Wire the admin routes"):

```markdown
The route tree splits in two. The login and auth pages sit directly under `admin/`, and the authed shell sits in an `(app)` group whose layout requires a session.
```

Insert this subsection immediately before that paragraph:

```markdown
### Keep host chrome out of /admin

The host root layout wraps every route, `/admin` included. If it renders a nav, a footer, or a
width-constraining container, that chrome wraps the admin and the admin shell cannot fill the viewport.
The admin self-styles and does not need the host's CSS, so keep the root layout bare and put the public
chrome plus `app.css` in a URL-transparent `(site)` group. The group folder does not change any public
URL, and the admin, which sits outside the group, renders on its own. A dev-only guard in the admin logs
a `console.error` when it detects host chrome wrapping it. See
[the admin route structure](../admin-route-structure.md) for the full tree and the reasoning.

```

- [ ] **Step 3: Run the docs link gate**

Run: `npm run check:docs`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add docs/tutorial/build-your-first-cairn-site.md
git commit -m "Teach the chrome-isolation rule in the tutorial"
```

---

### Task 7: Version, changelog, and upgrade guide

Bump the minor in the held window and record the change. The route-structure change carries a `Consumers must:` line, because a site that hosts the admin under a chrome-bearing root layout has to adopt the `(site)` group to get the standalone admin.

**Files:**
- Modify: `package.json` (version)
- Modify: `CHANGELOG.md`
- Modify: `docs/guides/upgrade-cairn.md`

- [ ] **Step 1: Bump the version**

In `package.json`, change `"version": "0.32.0"` to `"version": "0.33.0"`.

- [ ] **Step 2: Add the changelog entry**

Insert this entry at the top of `CHANGELOG.md`, directly under the `most recent first.` line and above the `## 0.32.0` entry:

```markdown
## 0.33.0

The admin isolates itself from host chrome. A dev-only guard in the admin and login roots walks the
ancestor chain on mount and logs one `console.error` when a width-constraining ancestor sits between the
admin root and `<body>`, the sign that a site's root layout is wrapping the admin in its own nav, footer,
or container. The guard compiles out of production and changes no rendering. The canonical route pattern
is documented and demonstrated: a chrome-free root layout plus a URL-transparent `(site)` group that
holds the public chrome and `app.css`, so the host chrome never wraps `/admin`. The showcase gains a
`(site)` group with plain-CSS chrome, which proves the admin renders fully styled on a site that uses
neither Tailwind nor DaisyUI.

This closes the global at-rule note carried since the self-styling foundation. The compiled admin sheet
holds DaisyUI `@keyframes` and Tailwind `@property` rules that are document-global by CSS spec, but the
sheet is code-split to the admin roots that import it, so it loads only on `/admin`, and the route pattern
keeps the host's CSS off `/admin` from the other side. A boundary test pins that the admin sheet is
imported only by the two admin roots.

Consumers must: keep the host root layout chrome-free and move the public chrome plus `app.css` into a
`(site)` route group, so the host chrome never wraps `/admin`. A site already on this structure needs no
change. The dev guard names the problem in the console if a root layout still wraps the admin.
```

- [ ] **Step 3: Add the upgrade-guide entry**

Append this section to the end of `docs/guides/upgrade-cairn.md`:

```markdown
## 0.33.0: the host root layout must be chrome-free

The admin now isolates itself from host chrome, and a dev-only guard logs a console error when a site's
root layout wraps the admin in its own nav, footer, or width-constraining container. Consumers must:
keep the root layout bare and move the public chrome plus `app.css` into a URL-transparent `(site)`
route group. Group folders do not change any URL, so the public pages keep their paths, and the admin,
which sits outside the group, renders standalone. A site already on this structure needs no change.
```

- [ ] **Step 4: Run the full gate**

```bash
npm run check && npm test && npm run check:reference && npm run check:package && npm run check:docs
```

Expected: `npm run check` 0 errors and 0 warnings; `npm test` exits 0 (every project green); the three doc and package gates exit 0. If `delivery-*-split` times out under parallel load, re-run that file in isolation to confirm it is the known flake and not a real failure.

- [ ] **Step 5: Commit**

```bash
git add package.json CHANGELOG.md docs/guides/upgrade-cairn.md
git commit -m "Release 0.33.0: admin chrome isolation"
```

---

## Self-review notes

- **Spec coverage.** Section 3 (dev guard) maps to Tasks 1 and 2; section 4 (route pattern) to Tasks 5 and 6; section 5 (showcase proof) to Task 4; the resolved at-rule decision to Task 3 and the doc note in Task 5; versioning to Task 7.
- **Verification surface.** The admin isolated from host chrome: the guard's detection test (Task 1), the wired clean-mount test (Task 2), the boundary test (Task 3), and the showcase `(site)` proof with both surfaces rendering (Task 4).
- **Out of scope.** The two production-site retrofits run as separate `site-pass` work after this version publishes. STATUS.md, the memory refresh, the post-mortem, and the publish decision are the `cairn-pass` pass-end ritual.
