# Extract cairn-core to the cairn-cms package — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the framework-agnostic cairn-core logic (six `.ts` modules) out of `ecnordic-ski/src/lib/cairn/` into the `cairn-cms` workspace package, packaged the canonical SvelteKit way (`@sveltejs/package` → `dist/`), repoint ecnordic to import from `cairn-cms`, and verify ecnordic still builds, type-checks, tests, and serves `/admin` unchanged.

**Architecture:** `cairn-cms` becomes a real, ecosystem-correct SvelteKit library using the **`publishConfig` swap** pattern (the one battle-tested in Skeleton and other Svelte monorepos — see "Why this shape"). The checked-in `package.json` `exports` points **every** condition (`types`/`svelte`/`default`) at raw `./src/lib/index.ts` **source**, so in the workspace every tool — Vite (dev *and* the sites' production worker build), `svelte-check`, vitest — resolves straight to source: genuinely instant, no build step, no custom conditions. A `publishConfig.exports` block overrides those to `./dist/**` **only at `npm publish`**, and `svelte-package` (run at `prepublishOnly`, not on install) produces that `dist/` — so published/CI consumers (a Pass F concern) get compiled output, and the package is already shaped to ship the admin `.svelte` components Pass F adds. The npm-workspace symlink (`node_modules/cairn-cms` → `../cairn-cms`) is auto-bundled by Vite (linked deps are noExternal by default), so the sites' worker builds transpile cairn-cms source directly — no `dist`, no `ssr.noExternal`, no `customConditions`, no consumer config at all.

This is a pure move + rewire of logic — no behavior change. The admin **routes and Svelte components stay in ecnordic** for now (SvelteKit routes / design-coupled UI); only the design-free `.ts` core moves. The existing test suites are the safety net.

**Tech Stack:** SvelteKit · `@sveltejs/package` (publish-only) · Vite 8 · TypeScript 6 · Vitest 4 · npm workspaces · gray-matter · unified · @cloudflare/workers-types

---

## Scope

**In:** Set up `cairn-cms` as a `svelte-package` library with the dev/prod conditional exports; extract the six logic modules + their unit tests; repoint every ecnordic importer; verify ecnordic (check + build + tests + live `/admin` smoke), exercising **both** dev-source resolution and build-dist resolution.

**Out (deferred to the 907-life onboarding pass):** Sharing the admin **Svelte components**/routes (907-life restyles to ET Book — the component-sharing call belongs to that pass, and the package shape now supports it); private-repo read-token threading; removing `static/admin/`; ROADMAP entry. The locked-decision **"slug codec" seam is not added** — the admin is filename-based (`[id]` is the bare filename stem), so day-bearing and dayless filenames already flow through the Pass D abstraction unchanged.

## Why this package shape (research-backed)

The SvelteKit packaging docs say libraries ship a compiled `dist/` from `svelte-package` (with `svelte`/`types` conditions, `.svelte` uncompiled) — so cairn-cms is set up to produce `dist/` for publish, ready for the Pass F admin shell. But `svelte-package` is *not* first-class in monorepos, and three things were confirmed by primary-source research:

1. **A `development` export condition cannot drive TypeScript.** TS *always* matches `"types"` and `"default"` first, regardless of object order, and ignores custom conditions for type resolution ([TS modules reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html#packagejson-exports)). So `customConditions: ["development"]` + `types → dist` forces a `dist` build just to type-check — defeating "instant dev." The `development`-condition approach is a dead end for the type layer.
2. **The proven pattern is the `publishConfig` swap** (Skeleton et al.): checked-in `exports` point all conditions at `src` source; `publishConfig.exports` swaps to `dist` at publish. Every workspace tool resolves source directly — no conditions, no `customConditions`, no build to dev/test/typecheck. TS happily uses a `.ts` file as a `"types"` target.
3. **Source resolves everywhere we need it.** Symlinked workspace deps are bundled (noExternal by default), so the sites' Cloudflare worker `vite build` transpiles cairn-cms source directly — `dist` is only for published/CI consumers (Pass F). gray-matter's `fs` require is a non-issue: Pass C already ran `serializeMarkdown` live in the worker. Vitest's conditional-exports bugs don't apply — no test imports the bare `cairn-cms` specifier (the package's own tests import relative source).

Validate the whole setup with one module (Task 1) before moving the rest.

## File map

**`cairn-cms/` (the package — code lands here):**
- Create `src/lib/{auth,email,github,carta,content,adapter}.ts` — moved verbatim from ecnordic (relative `./` cross-imports unchanged; they stay siblings).
- Create `src/lib/index.ts` — the public barrel (`export *` of all six).
- Create `svelte.config.js` — `vitePreprocess` so `svelte-package` runs at publish.
- Create `vitest.config.ts` — node env, `src/tests/**`.
- Create `src/tests/{auth,github,github-commit,carta-preview,content,adapter}.test.ts` — moved from `ecnordic-ski/src/tests/cairn/`.
- Modify `package.json` — source-pointing `exports` + `publishConfig.exports` swap to dist, `svelte-package` scripts (`prepublishOnly`, not `prepare`), runtime/type/build deps, `vitest`.
- Modify `.gitignore` — ignore `dist/`.

**`ecnordic-ski/` (the consumer — rewire lands here):**
- Delete `src/lib/cairn/` (all six modules) and `src/tests/cairn/` (all six tests).
- Modify the 10 importers (below) — `$lib/cairn/<mod>` → `cairn-cms`.
- **No** `tsconfig.json`, `vite.config.ts`, or `vitest.config.ts` changes needed — source-pointing exports + the workspace symlink mean every tool resolves cairn-cms source with zero consumer config.

**Importers to rewrite (grep-verified):** `src/app.d.ts`, `src/hooks.server.ts`, `src/lib/cairn.config.ts`, `src/routes/admin/+layout.server.ts`, `src/routes/admin/+page.server.ts`, `src/routes/admin/save/+server.ts`, `src/routes/admin/edit/[type]/[id]/+page.server.ts`, `src/routes/admin/edit/[type]/[id]/+page.svelte`, `src/routes/admin/auth/request/+server.ts`, `src/routes/admin/auth/callback/+server.ts`, `src/routes/admin/auth/logout/+server.ts`.

**Root:** run `npm install` after the package gains real exports/scripts — refreshes the `node_modules/cairn-cms` symlink and runs the package `prepare` (builds `dist/`).

---

## Task 1: Walking skeleton — package setup proven with one module (`content.ts`)

This task carries all the wiring risk. It must prove, with one module, before anything else moves: (a) the workspace symlink resolves `import … from 'cairn-cms'` to **source** under `svelte-check`, the site's `vite build`, and `vite dev`; (b) the package's own `vitest` runs against relative source; (c) `svelte-package` produces a valid `dist/` for the publish path.

**Files:**
- Create: `cairn-cms/src/lib/content.ts`, `cairn-cms/src/lib/index.ts`, `cairn-cms/svelte.config.js`, `cairn-cms/vitest.config.ts`, `cairn-cms/src/tests/content.test.ts`
- Modify: `cairn-cms/package.json`, `cairn-cms/.gitignore`
- Delete: `ecnordic-ski/src/lib/cairn/content.ts`, `ecnordic-ski/src/tests/cairn/content.test.ts`
- Modify: `ecnordic-ski/src/routes/admin/save/+server.ts` (import only)

- [ ] **Step 1: Move `content.ts` into the package**

`cairn-cms/src/lib/content.ts` — verbatim copy of `ecnordic-ski/src/lib/cairn/content.ts`:

```typescript
// cairn-core: reassemble a markdown file from frontmatter + body for committing.
//
// The inverse of the gray-matter parse the edit loader does on read. Kept as its own seam
// so a site adapter can own the on-disk serialization contract (quoting, key order)
// without the save endpoint reaching for gray-matter directly.
import matter from 'gray-matter';

/** Serialize frontmatter data + markdown body back into a file string. */
export function serializeMarkdown(frontmatter: object, body: string): string {
  return matter.stringify(body, frontmatter);
}
```

- [ ] **Step 2: Create the barrel**

`cairn-cms/src/lib/index.ts`:

```typescript
// cairn-cms public API. Consumers import everything from 'cairn-cms'.
export * from './content';
```

- [ ] **Step 3: svelte-package config + package.json**

`cairn-cms/svelte.config.js`:

```javascript
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
export default {
  preprocess: vitePreprocess(),
};
```

Rewrite `cairn-cms/package.json` (keep `name`, `description`, `license`, `private`, `type`). The checked-in `exports` point all conditions at **source**; `publishConfig.exports` swaps to `dist` at publish only. `svelte-package` runs at `prepublishOnly` — **not** `prepare` — so `npm install` never needs a `dist` build (avoids install-order failure). The `./package.json` subpath export is publint-recommended:

```json
{
  "name": "cairn-cms",
  "version": "0.0.0",
  "description": "Embedded, magic-link, GitHub-committing CMS for SvelteKit/Cloudflare sites.",
  "type": "module",
  "license": "UNLICENSED",
  "private": true,
  "scripts": {
    "package": "svelte-package",
    "package:watch": "svelte-package --watch",
    "prepublishOnly": "svelte-package",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "exports": {
    ".": {
      "types": "./src/lib/index.ts",
      "svelte": "./src/lib/index.ts",
      "default": "./src/lib/index.ts"
    },
    "./package.json": "./package.json"
  },
  "publishConfig": {
    "exports": {
      ".": {
        "types": "./dist/index.d.ts",
        "svelte": "./dist/index.js",
        "default": "./dist/index.js"
      },
      "./package.json": "./package.json"
    }
  },
  "files": ["dist", "src/lib"],
  "peerDependencies": {
    "svelte": "^5.0.0"
  },
  "dependencies": {
    "gray-matter": "^4"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20260405.1",
    "@sveltejs/package": "^2",
    "@sveltejs/vite-plugin-svelte": "^7",
    "svelte": "^5",
    "svelte-check": "^4",
    "typescript": "^6.0.3",
    "unified": "^11.0.5",
    "vitest": "^4.1.6"
  }
}
```

`cairn-cms/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/tests/**/*.test.ts'],
    environment: 'node',
  },
});
```

Add `dist` to `cairn-cms/.gitignore` (append a line `dist`).

- [ ] **Step 4: Move the content test**

Move `ecnordic-ski/src/tests/cairn/content.test.ts` → `cairn-cms/src/tests/content.test.ts`, rewriting the module-under-test import to the relative source path (tests import source directly, not via the package name):

```typescript
// was: import { serializeMarkdown } from '$lib/cairn/content';
import { serializeMarkdown } from '../lib/content';
```

(Leave the test body unchanged.)

- [ ] **Step 5: Install — refresh the symlink**

```bash
cd /home/glw907/Projects/cairn && npm install
```

Expected: completes with no `dist` build (no `prepare` hook). Confirm the symlink: `ls -l node_modules/cairn-cms` → `../cairn-cms`.

- [ ] **Step 6: Package test stands alone**

```bash
cd /home/glw907/Projects/cairn/cairn-cms && npm test
```

Expected: PASS — the 2 content round-trip tests run against `../lib/content`.

- [ ] **Step 7: Repoint ecnordic's one importer**

In `ecnordic-ski/src/routes/admin/save/+server.ts`, line 5:

```typescript
// was: import { serializeMarkdown } from '$lib/cairn/content';
import { serializeMarkdown } from 'cairn-cms';
```

Then delete `ecnordic-ski/src/lib/cairn/content.ts`. No tsconfig/vite/vitest changes — the source-pointing exports + symlink resolve everywhere.

- [ ] **Step 8: GATE — verify every resolution path against source + the publish path**

```bash
cd /home/glw907/Projects/cairn/ecnordic-ski && npm run check && npm run build && npm test
cd /home/glw907/Projects/cairn/cairn-cms && npm run package && ls dist
```

Expected:
- `svelte-check` 0 errors / 0 warnings — proves TS resolves `cairn-cms` → source `.ts` via the `types` condition (no `dist` needed).
- Cloudflare build succeeds — proves `vite build` bundles the symlinked package's **source** into the worker (linked deps are noExternal by default).
- vitest green — ecnordic's suites unaffected (they don't import `cairn-cms`).
- `npm run package` emits `dist/{index.js,index.d.ts,content.js,content.d.ts}` — proves the publish path (`publishConfig` → dist) is valid, even though dev/build never use it.

> **This is the gate.** Do not proceed to Task 2 until all four are green. If `vite dev` source resolution is in doubt, spot-check: `npm run dev`, confirm the app boots, then stop. **If source-pointing exports fight the worker build** (e.g. `vite build` refuses to bundle the symlinked `.ts`): fall back to building `dist` and pointing the checked-in `exports` at it, with `npm run package:watch` running in `cairn-cms` during dev (the watch model). Decide here, before moving more modules.

- [ ] **Step 9: Commit both repos**

```bash
cd /home/glw907/Projects/cairn/cairn-cms && git add src/lib/content.ts src/lib/index.ts src/tests/content.test.ts svelte.config.js vitest.config.ts package.json .gitignore && git commit -m "Extract: stand up svelte-package library with content module

Co-Authored-By: Claude <noreply@anthropic.com>"
cd /home/glw907/Projects/cairn/ecnordic-ski && git add src/routes/admin/save/+server.ts src/lib/cairn/content.ts && git commit -m "Extract: consume serializeMarkdown from cairn-cms package

Co-Authored-By: Claude <noreply@anthropic.com>"
```

(The cairn-cms package-lock lives at the workspace root, which is not a git repo — nothing to commit there. `git add` of the deleted `content.ts` stages its removal.)

---

## Task 2: Move the remaining five modules + repoint every importer

Mechanism proven, move `auth`, `email`, `github`, `carta`, `adapter` as a group (their relative `./` cross-imports keep them self-consistent inside the package), expand the barrel, rewrite all remaining importers. Mechanical repetition of Task 1's pattern.

**Files:**
- Create: `cairn-cms/src/lib/{auth,email,github,carta,adapter}.ts`
- Create: `cairn-cms/src/tests/{auth,github,github-commit,carta-preview,adapter}.test.ts`
- Modify: `cairn-cms/src/lib/index.ts`
- Delete: `ecnordic-ski/src/lib/cairn/` and `ecnordic-ski/src/tests/cairn/` (now-empty)
- Modify: the remaining 9 importers

- [ ] **Step 1: Move the five module files verbatim**

Read each `ecnordic-ski/src/lib/cairn/<m>.ts` (`auth`, `email`, `github`, `carta`, `adapter`) and write it unchanged to `cairn-cms/src/lib/<m>.ts`, then delete the ecnordic original. Their relative cross-imports already resolve as siblings: `github.ts` imports `./auth`; `adapter.ts` imports `./carta` and `./github`. Afterward verify the package imports no site aliases:

```bash
grep -rn "\$lib" cairn-cms/src/lib   # expected: no output
```

- [ ] **Step 2: Expand the barrel**

`cairn-cms/src/lib/index.ts`:

```typescript
// cairn-cms public API. Consumers import everything from 'cairn-cms'.
export * from './auth';
export * from './email';
export * from './github';
export * from './carta';
export * from './content';
export * from './adapter';
```

(No export-name collisions across modules — each module's exported identifiers are distinct, so a flat `export *` is safe.)

- [ ] **Step 3: Move the five test files**

Move each `ecnordic-ski/src/tests/cairn/<name>.test.ts` → `cairn-cms/src/tests/<name>.test.ts` (`auth`, `github`, `github-commit`, `carta-preview`, `adapter`), rewriting each module-under-test import from `$lib/cairn/<mod>` to relative `../lib/<mod>` (matching Task 1 Step 4).

- [ ] **Step 4: Run the package suite (+ verify the publish build)**

```bash
cd /home/glw907/Projects/cairn/cairn-cms && npm test && npm run package && ls dist
```

Expected: vitest PASS — all moved suites green (auth crypto/single-use/session, github read, github-commit JWT/commit-body, carta-preview wiring, adapter, content); `npm run package` emits all six modules + `.d.ts` to `dist/` (publish-path sanity — dev/test never use it).

- [ ] **Step 5: Repoint the remaining nine ecnordic importers**

Rewrite each `$lib/cairn/<mod>` import to the same named bindings from `cairn-cms`:

- `src/app.d.ts`: `import type { Editor, EmailSender } from 'cairn-cms';`
- `src/hooks.server.ts`: `import { verifySession, SESSION_COOKIE } from 'cairn-cms';`
- `src/lib/cairn.config.ts`: `import type { CairnAdapter } from 'cairn-cms';`
- `src/routes/admin/+layout.server.ts`, `src/routes/admin/+page.server.ts`, `src/routes/admin/save/+server.ts`, `src/routes/admin/edit/[type]/[id]/+page.server.ts`, `src/routes/admin/edit/[type]/[id]/+page.svelte`, `src/routes/admin/auth/request/+server.ts`, `src/routes/admin/auth/callback/+server.ts`, `src/routes/admin/auth/logout/+server.ts`: replace each `from '$lib/cairn/<mod>'` with `from 'cairn-cms'`, keeping the same `{ … }` bindings.

Confirm none remain:

```bash
grep -rn "\$lib/cairn" ecnordic-ski/src   # expected: no output
```

- [ ] **Step 6: Delete the emptied ecnordic dirs**

```bash
rmdir ecnordic-ski/src/lib/cairn ecnordic-ski/src/tests/cairn
```

- [ ] **Step 7: Verify ecnordic — check, build, full test suite**

```bash
cd /home/glw907/Projects/cairn/ecnordic-ski && npm run check && npm run build && npm test
```

Expected: `svelte-check` 0/0; Cloudflare build succeeds (Carta still client-only, no SSR/Shiki breakage); vitest green (ecnordic's remaining suites — directives, icons, motion, content-schema — minus the six that moved to the package).

- [ ] **Step 8: Live `/admin` smoke (module resolution under the worker runtime)**

Extraction changes how modules resolve under the Cloudflare build — smoke it (Pass D skipped a live run). With `.dev.vars` present and a minted session (`scripts/mint-session.mjs`):

```bash
cd /home/glw907/Projects/cairn/ecnordic-ski && npx wrangler dev
```

Expected (separate shell): anon `GET /admin` → 303 `/admin/login`; authed `GET /admin` → 200 listing Posts + Pages from the live repo; `GET /admin/edit/pages/training` → 200. No save needed — Pass C verified the write path; this only confirms the moved imports load in-worker. Stop `wrangler dev` after.

- [ ] **Step 9: Commit both repos**

```bash
cd /home/glw907/Projects/cairn/cairn-cms && git add src/lib src/tests && git commit -m "Extract: move auth, email, github, carta, adapter into the package

Co-Authored-By: Claude <noreply@anthropic.com>"
cd /home/glw907/Projects/cairn/ecnordic-ski && git add -- src/ && git commit -m "Extract: consume cairn-core from the cairn-cms package; drop in-tree copy

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Update PLAN.md — record the reorg and the extraction

Docs-only; no code-simplifier needed.

**Files:**
- Modify: `cairn-cms/docs/PLAN.md`

- [ ] **Step 1: Rewrite the Pass E/F lines to reflect the reorg**

In "Phased passes", replace Pass E and Pass F with:

```markdown
- **Pass E — Extract cairn-core to the package** (reordered: was the extraction half of
  the old Pass F, pulled ahead of 907-life onboarding to avoid throwaway duplication).
  Move the six `.ts` modules into `cairn-cms` using the `publishConfig`-swap shape
  (checked-in `exports`→source for zero-config instant dev across the workspace;
  `publishConfig.exports`→`dist` for publish; `svelte-package` builds dist at
  `prepublishOnly`, ready for the Pass F admin `.svelte` shell). Repoint ecnordic to
  `import … from 'cairn-cms'`; verify check/build/tests/`/admin`. Admin routes + components
  stay per-site for now. No behavior change.
- **Pass F — Onboard 907.life** (reordered: the old Pass E, now built against the real
  package). Write 907-life's adapter (filename-based ids — no slug codec needed; plain
  `remark-html` preview; its frontmatter + a new validator), its `admin/**` routes, KV/EMAIL
  bindings, the guard, and private-repo read-token threading. Decide here whether to extract
  the shared admin Svelte shell into the package (the design difference forces the call).
  Plus the old-Pass-F cleanup: remove `static/admin/`, close backlog #4, update
  STATUS/architecture/ROADMAP.
```

- [ ] **Step 2: Append a Pass E progress-log entry**

Under "Notes / progress log", add `### Pass E — extract cairn-core to the package (2026-05-25)` recording: the clean boundary (six modules; only `gray-matter` runtime + `unified`/workers-types type-only externally); the **`publishConfig`-swap package shape** (checked-in `exports`→source, `publishConfig.exports`→`dist`, `svelte-package` at `prepublishOnly`) and *why* it beat the `development`-condition approach I first drafted — research (TS modules ref) confirmed TypeScript always matches `types`/`default` regardless of order, so a `development` condition can't drive `svelte-check`; the Skeleton-style `publishConfig` swap is the proven pattern and resolves source with zero consumer config — or the `--watch` fallback if Task 1 Step 8 forced it; the barrel-export API; the importers rewired; verification evidence (package `npm test`; `npm run package` dist; ecnordic check/build/test; live `/admin` smoke). Note that gray-matter's `fs` require is already retired by Pass C's live worker run. Note the deferrals to Pass F. Record the finding: **the locked-decision slug-codec seam is unneeded — the admin is filename-based — so the abstraction is cleaner than planned.**

- [ ] **Step 3: Commit**

```bash
cd /home/glw907/Projects/cairn/cairn-cms && git add docs/PLAN.md docs/plans/2026-05-25-extract-cairn-core.md && git commit -m "Pass E: reorder E/F; log cairn-core extraction to the package

Co-Authored-By: Claude <noreply@anthropic.com>"
```

(Push both repos only when the user asks — same as the Pass D close-out.)

---

## Self-review notes

- **Spec coverage:** all six modules + six test files mapped; all 10 importers (grep-verified) listed; package deps cover every external import (`gray-matter` runtime; `unified` + workers-types type-only) plus the `svelte-package` toolchain; the `publishConfig`-swap shape resolves source with zero consumer config, gated and validated in Task 1 Step 8 (check/build/test/package) with a `--watch` fallback.
- **No placeholders:** every code step shows full file content; the only branch is Task 1 Step 8's fallback, a genuine decision point, not a deferred detail.
- **Type consistency:** flat `export *` barrel; every named binding used at the ecnordic call sites (`verifySession`, `SESSION_COOKIE`, `Editor`, `EmailSender`, `CairnAdapter`, `serializeMarkdown`, `findCollection`, `frontmatterFromForm`, `installationToken`, `commitFile`, `listMarkdown`, `readRaw`, `previewCartaOptions`, `bytesToB64url`) originates in exactly one module — no collisions.
- **Ecosystem conformance:** checked-in `exports` point at source (Skeleton-style); `publishConfig.exports` carries the `types`/`svelte`/`default`→dist shape the SvelteKit packaging docs prescribe for publish; `./package.json` export added per publint; `files` ships `dist` + `src/lib`; `dist` gitignored; `svelte-package` is wired so Pass F can drop in uncompiled `.svelte` admin components with no re-shaping.
- **Research provenance:** the `development`-condition approach was drafted then rejected after primary-source research (TS always matches `types`/`default` regardless of order → can't drive `svelte-check`; Vitest condition bugs; gray-matter `fs` already retired by Pass C). The `publishConfig` swap is the pattern proven in Skeleton's monorepo. Full findings logged in PLAN.md Pass E note (Task 3).
