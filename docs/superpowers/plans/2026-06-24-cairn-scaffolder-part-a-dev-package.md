# cairn-cms-dev package (scaffolder Part A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended)
> or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.
> In cairn-cms the default executor is `cairn-implementer` (pinned Sonnet); the main loop reviews each
> diff and verifies the gate between dispatches.

**Goal:** Extract cairn's local-dev fake backend (the in-memory GitHub/D1/R2/Anthropic doubles and the
magic-link auth bypass) out of the showcase into a separate, fenced, fail-closed dev-only package
`@glw907/cairn-cms-dev`, so the showcase, the future template, and the tutorial import one blessed
implementation instead of hand-pasting fixtures, and no auth bypass ships in the production engine.

**Architecture:** A new workspace package under `packages/cairn-cms-dev/`. It owns the four fakes
(currently in `examples/showcase/src/lib/fake-*.ts`) and a blessed `devBackendHandle()` SvelteKit
`Handle` factory that installs them and the owner-session bypass. A consumer activates it from its
`hooks.server.ts` only behind a three-layer fence: the build-foldable `dev` flag from `$app/environment`
(primary, eliminates the branch and the dynamic import from a production build), the package being a
`devDependency` (structural, absent under `npm ci --omit=dev`, so the import throws in prod rather than
bypassing), and a fail-closed tripwire in the engine's `createAuthGuard` that refuses and logs
`guard.rejected` reason `dev_backend_in_prod` if the flag is ever set in a non-dev runtime. The canonical
flag is `CAIRN_DEV_BACKEND`, retiring the showcase's `SHOWCASE_FAKE_BACKEND`.

**Tech Stack:** TypeScript, SvelteKit 2 (`Handle`, `$app/environment`), npm workspaces, Vitest. The dev
package depends on `@glw907/cairn-cms` for engine types only; it ships no runtime engine code.

## Global Constraints

- **This is Part A of the scaffolder initiative.** The design spec is
  `docs/superpowers/specs/2026-06-24-cairn-scaffolder-design.md` (read its "Part A" and "What the
  adversarial review changed / Reversal 1" sections). Parts B and C follow; do not build them here.
- **Run on a fresh git worktree off `main`,** not the main checkout. Create it with
  `git worktree add ../cairn-cms-part-a -b feat/cairn-cms-dev main`, symlink node_modules
  (`ln -s /home/glw907/Projects/cairn-cms/node_modules ../cairn-cms-part-a/node_modules`), and make every
  edit and command under the worktree path. See the `worktree-edits-target-worktree-path` and
  `cairn-worktree-needs-dist-build` memories.
- **Adding a workspace changes install resolution.** After adding `packages/cairn-cms-dev` to the root
  `workspaces`, the symlinked node_modules is not enough: run a real `npm install` at the worktree root
  once so npm links the new workspace into node_modules. Then `npm run package` before any `npm test`
  (the dist-build gotcha: the component project imports from `dist`).
- **The gate is** `npm run check` (svelte-check, 0 errors / 0 warnings), `npm test` (exits 0 via
  PIPESTATUS, not just a passing assertion count), `npm run check:comments` (TSDoc + em-dash over
  `src/lib`), and `npm run check:package` (entry-point shapes). The dev package, once it has exports,
  must also pass `publint`/`attw` if wired into `check:package`.
- **Comments follow TSDoc, no em dash** (the `house/no-em-dash-in-comments` ESLint rule over `src/lib`).
  The dev package's own comments follow the same standard.
- **Two risk tiers, documented and kept distinct.** The auth bypass (mints an owner session with no email
  loop) is an authentication breach if it reaches prod; the fake-GitHub/R2/D1/Anthropic doubles degrade
  to "saves do not persist." The bypass earns the strictest fence; never relax it by analogy to the mock.
- **Security review is mandatory** at the end: dispatch `web-auth-security-reviewer` over the fence, the
  tripwire, and the bypass before calling Part A done.

## File structure

- Create `packages/cairn-cms-dev/package.json` — the dev package manifest (`@glw907/cairn-cms-dev`).
- Create `packages/cairn-cms-dev/tsconfig.json` — extends the repo's TS config.
- Create `packages/cairn-cms-dev/src/index.ts` — the package's public exports.
- Create `packages/cairn-cms-dev/src/handle.ts` — `devBackendHandle()`, the blessed `Handle` factory.
- Move `examples/showcase/src/lib/fake-github.ts`, `fake-auth-db.ts`, `fake-r2.ts`, `fake-anthropic.ts`
  into `packages/cairn-cms-dev/src/` (adjust their engine-type imports; keep behavior identical).
- Create `packages/cairn-cms-dev/src/*.test.ts` — the moved fakes' behavior tests and the handle test.
- Modify root `package.json` — add `"workspaces": ["packages/*"]`.
- Modify `examples/showcase/src/hooks.server.ts` — replace the inline fixture wiring with the fenced
  import of `devBackendHandle()`; retire `SHOWCASE_FAKE_BACKEND` for `CAIRN_DEV_BACKEND`.
- Modify `examples/showcase/src/lib/cairn.server.ts` — import the fakes from the dev package, not `$lib`.
- Modify `examples/showcase/package.json` — add `@glw907/cairn-cms-dev` as a `devDependency`
  (`file:../../packages/cairn-cms-dev` in-repo).
- Modify `examples/showcase/playwright.config.ts` — set `CAIRN_DEV_BACKEND=1` (was `SHOWCASE_FAKE_BACKEND`).
- Modify `src/lib/sveltekit/guard.ts` — add the `dev_backend_in_prod` tripwire in `createAuthGuard`.
- Modify `docs/reference/log-events.md` — document the `guard.rejected` reason `dev_backend_in_prod`.

---

### Task 1: Scaffold the workspace and the empty dev package

**Files:**
- Modify: root `package.json` (add `workspaces`)
- Create: `packages/cairn-cms-dev/package.json`, `packages/cairn-cms-dev/tsconfig.json`,
  `packages/cairn-cms-dev/src/index.ts`, `packages/cairn-cms-dev/src/index.test.ts`

**Interfaces:**
- Produces: the package `@glw907/cairn-cms-dev` resolving from the workspace, with a placeholder export
  `devPackageReady: true` that Task 2 replaces.

- [ ] **Step 1: Add the workspace to the root `package.json`.** Add the top-level key
  `"workspaces": ["packages/*"]`. Leave `examples/showcase` out of workspaces in Part A (its
  workspace-ification and dual-resolution is Part B); it keeps its `file:../..` engine dep untouched.

- [ ] **Step 2: Create `packages/cairn-cms-dev/package.json`:**

```json
{
  "name": "@glw907/cairn-cms-dev",
  "version": "0.0.0",
  "description": "Local-development fake backend for cairn-cms sites. Never install in production.",
  "type": "module",
  "license": "MIT",
  "exports": {
    ".": { "types": "./src/index.ts", "svelte": "./src/index.ts", "default": "./src/index.ts" }
  },
  "peerDependencies": { "@glw907/cairn-cms": "*", "@sveltejs/kit": "^2.61.0" },
  "devDependencies": { "@glw907/cairn-cms": "file:../.." }
}
```

(The package ships TypeScript source consumed by a SvelteKit build, the same `svelte`-condition shape the
engine uses; no separate build step in Part A. Confirm against the engine's `package.json` exports that
the `svelte` condition is the right one for a source-shipping subpackage.)

- [ ] **Step 3: Create `packages/cairn-cms-dev/tsconfig.json`** extending the repo config:

```json
{ "extends": "../../tsconfig.json", "include": ["src/**/*.ts"] }
```

- [ ] **Step 4: Write the failing smoke test** `packages/cairn-cms-dev/src/index.test.ts`:

```ts
import { expect, test } from 'vitest';
import { devPackageReady } from './index.js';

test('the dev package resolves from the workspace', () => {
  expect(devPackageReady).toBe(true);
});
```

- [ ] **Step 5: Run it to confirm it fails** (the export does not exist yet). The test runner config may
  need to include `packages/**`; check `vitest.config.ts`/the test project globs and add `packages/**` to
  the unit project's `include` if the test is not picked up. Expected: FAIL (module/export missing).

- [ ] **Step 6: Create `packages/cairn-cms-dev/src/index.ts`** with the placeholder:

```ts
/** Placeholder export proving the workspace resolves; Task 2 replaces it with the real surface. */
export const devPackageReady = true;
```

- [ ] **Step 7: Install and run.** From the worktree root: `npm install` (links the new workspace), then
  `npm run test:unit` (or the targeted vitest for the new file). Expected: PASS.

- [ ] **Step 8: Commit.**

```bash
git add package.json packages/cairn-cms-dev
git commit -m "feat(dev-pkg): scaffold the @glw907/cairn-cms-dev workspace package"
```

---

### Task 2: Move the four fakes into the package

**Files:**
- Move into `packages/cairn-cms-dev/src/`: `fake-github.ts`, `fake-auth-db.ts`, `fake-r2.ts`,
  `fake-anthropic.ts` (from `examples/showcase/src/lib/`)
- Create/move their tests alongside (port any existing showcase tests; otherwise pin the key behaviors)
- Modify `packages/cairn-cms-dev/src/index.ts` to re-export them
- Modify `examples/showcase/src/lib/cairn.server.ts` to import the fakes from `@glw907/cairn-cms-dev`

**Interfaces:**
- Produces: `installFakeGitHub`, `seedMediaLibrary`, `SEED_MEDIA_KEYS` (from `fake-github`),
  `createFakeAuthDb` (from `fake-auth-db`), `createFakeR2` (from `fake-r2`), and the fake Anthropic
  client, all re-exported from the package root. Keep the exact names the showcase already uses (see
  `examples/showcase/src/hooks.server.ts` and `cairn.server.ts` for the current import list).

- [ ] **Step 1: Read the four current fakes** in `examples/showcase/src/lib/` to learn their exact
  exports and engine-type imports. They import engine types via `@glw907/cairn-cms/...` subpaths, which
  resolve the same from the dev package (it peer-depends on the engine).

- [ ] **Step 2: Move the files** into `packages/cairn-cms-dev/src/` verbatim. Fix only the relative
  imports that break (a `$lib/...` import becomes a sibling `./...`; engine subpath imports are
  unchanged). Do not change behavior.

- [ ] **Step 3: Re-export from `src/index.ts`.** Replace the placeholder with the real surface:

```ts
export * from './fake-github.js';
export * from './fake-auth-db.js';
export * from './fake-r2.js';
export * from './fake-anthropic.js';
```

- [ ] **Step 4: Port/confirm the fakes' tests.** Move any `fake-*.test.ts` from the showcase, or write
  the behavior pins they lack (the in-memory repo round-trips a put/get, the auth-db resolves a seeded
  session, the R2 double streams a seeded object). Run them; expected: PASS.

- [ ] **Step 5: Repoint the showcase's `cairn.server.ts`** fake imports from `$lib/fake-*` to
  `@glw907/cairn-cms-dev`. Add the `devDependency` to `examples/showcase/package.json`:
  `"@glw907/cairn-cms-dev": "file:../../packages/cairn-cms-dev"`. Run `npm install`.

- [ ] **Step 6: Gate.** `npm run check` (0/0) and `npm run test:unit`. Expected: PASS. (The showcase
  `hooks.server.ts` still imports `$lib/fake-github.js` at this point; Task 3 rewires it. If the moved
  file is gone and the import breaks, that is expected and Task 3 fixes it; keep this task's gate to the
  unit project plus check, and finish the wiring in Task 3 before the full `npm test`.)

- [ ] **Step 7: Commit.**

```bash
git add packages/cairn-cms-dev examples/showcase/src/lib/cairn.server.ts examples/showcase/package.json
git commit -m "refactor(dev-pkg): move the fake GitHub/D1/R2/Anthropic doubles into the dev package"
```

---

### Task 3: The blessed `devBackendHandle()` factory and the content-seeding seam

**Files:**
- Create: `packages/cairn-cms-dev/src/handle.ts`, `packages/cairn-cms-dev/src/handle.test.ts`
- Modify: `packages/cairn-cms-dev/src/index.ts` (export `devBackendHandle`)

**Interfaces:**
- Produces: `devBackendHandle(options?: { seedContent?: boolean }): Handle`. It installs the fake GitHub
  (and optionally seeds the media library), creates one fake auth-db and one fake R2 for the process
  lifetime, and returns a SvelteKit `Handle` that, on `/admin` and `/media` paths, sets `event.platform.env`
  to the binding doubles and (on `/admin`) sets `event.locals.editor` to an owner session. This is the
  behavior currently inline in `examples/showcase/src/hooks.server.ts`; move it here verbatim, parameterized.
- The content-seeding seam: `devBackendHandle` reads the consumer's committed content so the template
  seeds its own starter posts rather than the showcase's hard-coded `SEED_POST` (the red-team's Finding 5).
  Expose seeding as an explicit option; if Part A keeps the current media-only seed, leave a typed
  `seedContent` hook documented for Part B to fill.

- [ ] **Step 1: Write the failing test** `packages/cairn-cms-dev/src/handle.test.ts`:

```ts
import { expect, test, vi } from 'vitest';
import { devBackendHandle } from './handle.js';

test('the handle sets an owner editor on an /admin request', async () => {
  const handle = devBackendHandle();
  const event = { url: new URL('http://localhost/admin'), locals: {}, platform: undefined } as any;
  await handle({ event, resolve: async () => new Response('ok') });
  expect(event.locals.editor).toEqual({ email: expect.any(String), displayName: expect.any(String), role: 'owner' });
  expect(event.platform.env.AUTH_DB).toBeTruthy();
});

test('the handle does not touch a public (non-admin, non-media) request', async () => {
  const handle = devBackendHandle();
  const event = { url: new URL('http://localhost/about'), locals: {}, platform: undefined } as any;
  await handle({ event, resolve: async () => new Response('ok') });
  expect(event.locals.editor).toBeUndefined();
  expect(event.platform).toBeUndefined();
});
```

- [ ] **Step 2: Run it to confirm it fails** (no `handle.ts` yet). Expected: FAIL.

- [ ] **Step 3: Implement `handle.ts`** by lifting the install/seed/bypass logic out of the showcase's
  current `hooks.server.ts` (read it first; it is the reference). Wrap it in `devBackendHandle(options)`:
  call `installFakeGitHub()` once, optionally `seedMediaLibrary()`, create the lifetime `fakeAuthDb` and
  `fakeR2` (seed its objects), and return the `Handle` that sets `platform.env` and the owner `editor`
  exactly as today. Keep the editor identity (`editor@…`, `Demo Editor`, `owner`) and the path checks.

- [ ] **Step 4: Run the tests.** Expected: PASS. Then `npm run check` (0/0) and `npm run check:comments`.

- [ ] **Step 5: Export it** from `src/index.ts`: `export { devBackendHandle } from './handle.js';`

- [ ] **Step 6: Commit.**

```bash
git add packages/cairn-cms-dev/src/handle.ts packages/cairn-cms-dev/src/handle.test.ts packages/cairn-cms-dev/src/index.ts
git commit -m "feat(dev-pkg): blessed devBackendHandle factory with the owner-session bypass"
```

---

### Task 4: Fence the consumer and add the engine prod tripwire

**Files:**
- Modify: `examples/showcase/src/hooks.server.ts` (the fenced import; retire `SHOWCASE_FAKE_BACKEND`)
- Modify: `examples/showcase/playwright.config.ts` (`CAIRN_DEV_BACKEND=1`)
- Modify: `src/lib/sveltekit/guard.ts` (the `dev_backend_in_prod` tripwire)
- Modify/Test: `src/lib/sveltekit/guard.test.ts` (the tripwire test) and the existing guard tests

**Interfaces:**
- Consumes: `devBackendHandle` (Task 3); the engine's `createAuthGuard` (`src/lib/sveltekit/guard.ts:40`).
- Produces: a consumer `hooks.server.ts` whose dev backend is eliminated from a production build, and an
  engine guard that refuses with `guard.rejected` reason `dev_backend_in_prod` when the flag is set.

- [ ] **Step 1: Rewrite the showcase `hooks.server.ts`** to the fenced form. The production handle is the
  real guard; the dev backend replaces it only in a dev build with the flag:

```ts
import { dev } from '$app/environment';
import { sequence } from '@sveltejs/kit/hooks';
import { createAuthGuard } from '@glw907/cairn-cms/sveltekit';
import type { Handle } from '@sveltejs/kit';

// The dev backend activates only in a dev build (the `dev` constant folds to false in a production
// build, so this branch and the dynamic import are eliminated) AND with CAIRN_DEV_BACKEND=1. The
// package is a devDependency, absent under `npm ci --omit=dev`, so even a forced import throws in
// production rather than installing the bypass.
let handle: Handle;
if (dev && process.env.CAIRN_DEV_BACKEND === '1') {
  const { devBackendHandle } = await import('@glw907/cairn-cms-dev');
  handle = devBackendHandle();
} else {
  handle = createAuthGuard();
}
export { handle };
```

(Confirm the import surface: `createAuthGuard` is exported from the engine's `/sveltekit` subpath. If the
showcase composes a site hook with the guard, use `sequence(siteHook, …)`; the showcase currently exports
only the fixture handle, so the production arm is `createAuthGuard()`.)

- [ ] **Step 2: Update `playwright.config.ts`** to set `CAIRN_DEV_BACKEND: '1'` in the preview server's
  `env` (replacing `SHOWCASE_FAKE_BACKEND`). Grep the repo for any other `SHOWCASE_FAKE_BACKEND` use and
  retire each.

- [ ] **Step 3: Write the failing tripwire test** in `src/lib/sveltekit/guard.test.ts`:

```ts
test('the guard refuses and logs when CAIRN_DEV_BACKEND is set in the runtime', async () => {
  const handle = createAuthGuard();
  const event = {
    url: new URL('https://example.com/admin'),
    request: new Request('https://example.com/admin'),
    platform: { env: { AUTH_DB: {}, CAIRN_DEV_BACKEND: '1' } },
    cookies: { get: () => undefined },
    locals: {},
  } as any;
  const res = await handle({ event, resolve: async () => new Response('ok') });
  expect(res.status).toBeGreaterThanOrEqual(500); // refused, not resolved
  // and assert the captured log carries event 'guard.rejected' reason 'dev_backend_in_prod'
});
```

(Match the repo's existing guard-test harness for capturing `log` events; see the other
`guard.rejected` assertions in the suite.)

- [ ] **Step 4: Run it to confirm it fails.** Expected: FAIL (the guard resolves normally today).

- [ ] **Step 5: Add the tripwire** at the top of the `handle` returned by `createAuthGuard`
  (`src/lib/sveltekit/guard.ts`), before the non-admin branch, reading the structurally-typed env:

```ts
// Fail closed if the dev-backend flag is ever set in a deployed runtime. In a correct production
// build the dev backend was already eliminated (the consumer gates it on the build-foldable `dev`),
// so a set flag signals a polluted environment; refuse loudly rather than run the production guard
// under a dangerous flag.
const env = event.platform?.env ?? {};
if (env.CAIRN_DEV_BACKEND === '1' || env.CAIRN_DEV_BACKEND === true) {
  log.error('guard.rejected', { reason: 'dev_backend_in_prod', path: pathname });
  return new Response('cairn: the dev backend flag is set in a deployed environment. Unset CAIRN_DEV_BACKEND.', { status: 503 });
}
```

(Add `CAIRN_DEV_BACKEND` to the structural env type the guard reads if the type is enumerated; otherwise
the structural `Record` access is fine.)

- [ ] **Step 6: Run the tripwire test and the full guard suite.** Expected: PASS, with the existing guard
  tests still green.

- [ ] **Step 7: Build dist and run the full gate.** `npm run package`, then `npm run check` (0/0),
  `npm test` (EXIT=0 via PIPESTATUS, all projects including the browser component project and the showcase
  e2e through the dev backend), `npm run check:comments`. Fix any fallout.

- [ ] **Step 8: Commit.**

```bash
git add examples/showcase/src/hooks.server.ts examples/showcase/playwright.config.ts src/lib/sveltekit/guard.ts src/lib/sveltekit/guard.test.ts
git commit -m "feat(dev-pkg): fence the dev backend on dev+flag and add the prod tripwire"
```

---

### Task 5: Docs, the log-event row, and the security review

**Files:**
- Create: `packages/cairn-cms-dev/README.md`
- Modify: `docs/reference/log-events.md` (the `dev_backend_in_prod` reason)
- Modify: the package-shape gate config if the dev package is wired into `check:package`

- [ ] **Step 1: Document the `guard.rejected` reason `dev_backend_in_prod`** in
  `docs/reference/log-events.md`: its trigger (the flag set in a deployed runtime) and fields
  (`reason`, `path`). Match the table's existing row format.

- [ ] **Step 2: Write `packages/cairn-cms-dev/README.md`:** what the package is, the hard rule that it is
  a `devDependency` never installed in production, the three-layer fence, and the two risk tiers (the
  auth bypass vs the fake-backend mock). State that the flag name is `CAIRN_DEV_BACKEND`.

- [ ] **Step 3: Run the doc and package gates.** `npm run check:docs`, `npm run check:package`,
  and (if reference coverage applies to the new package) `npm run check:reference`. Expected: all exit 0.

- [ ] **Step 4: Commit.**

```bash
git add packages/cairn-cms-dev/README.md docs/reference/log-events.md
git commit -m "docs(dev-pkg): document the dev-backend fence, risk tiers, and the prod-tripwire event"
```

- [ ] **Step 5: Security review (mandatory).** Dispatch `web-auth-security-reviewer` over the diff
  (`git diff main`), focused on: the three-layer fence (does the `dev` gate actually eliminate the branch
  in a production build; is the devDependency truly dev-only; does the tripwire fail closed), the bypass's
  owner-session minting, and whether any path lets the bypass activate in a production build. Fold in the
  findings. This is the Part A exit gate.

---

## Pre-Part-B note (do not implement here)

Part B begins with the small fix-before-bake DX slot: the `AuthEnv` root re-export, the `media.json`
graceful-degrade, and the `runtime.publicMediaResolver` ergonomic, then the showcase factoring,
the `frontend-design` pass, the tokens layer and its separate adversarial review, and the feature set.
See the design spec's "Sequencing and the pre-Part-B DX slot" and "Part B" sections.

## Self-review

- **Spec coverage:** Part A's spec bullets all map to a task: the package and the moved fakes (Tasks 1-2),
  the blessed handle and the content-seeding seam (Task 3), the `dev`+flag fence and the deleted heuristics
  and the fail-closed tripwire and the risk-tier split (Task 4 and the constraints), the docs and the
  security gate (Task 5). The `web-auth-security-reviewer` gate is Task 5 Step 5.
- **Watch items for the executor:** the workspace+symlinked-node_modules interaction (run a real
  `npm install` after adding the workspace); `npm run package` before `npm test`; confirming the engine's
  `/sveltekit` export of `createAuthGuard` and the `svelte` export condition; and matching the guard
  test's log-capture harness. None blocks the design; each is a "read the real code first" step already
  called out in the relevant task.
