# Cairn Rebuild 00: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up an isolated rebuild worktree with a modernized package manifest, the May-2026 toolchain, and a layered test harness running against a real local D1, so every later subsystem plan can be built test-first.

**Architecture:** Topology A from the spec. The rebuild happens in a git worktree off `cairn-cms` `main`, leaving the live branch and the two consumer sites untouched. The current `src/` is preserved under `legacy/` for porting (the render pipeline, GitHub commit, frontmatter, slug, and nav modules are largely sound and get ported under test in later plans). A fresh `src/lib` skeleton is created, and the better-auth and Drizzle artifacts are removed. The test harness gains two working layers in this plan: a node `unit` project and an `integration` project that runs code in workerd via `@cloudflare/vitest-pool-workers` against a real miniflare D1. The browser (`vitest-browser-svelte`) and Playwright layers arrive in Plan 05, where the first components exist to drive.

**Tech Stack:** Svelte 5.55, `@sveltejs/kit` 2.61, `@sveltejs/package` 2, TypeScript 6.0, Vite 8, Vitest 4.1, `@cloudflare/vitest-pool-workers` 0.16, Wrangler 4. No better-auth, no Drizzle, no better-sqlite3.

**Source spec:** `docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md` (sections 4, 5, 9, 11).

**Scope of this plan:** package manifest, build and test config, the worktree, the legacy move, the first real unit module (`env.ts`), the D1 integration harness, and CI. It deliberately does not build auth, content, GitHub, render, or UI; those are Plans 01 through 07.

---

## File structure (created or changed in this plan)

| Path | Responsibility |
|---|---|
| `legacy/` (moved from `src/`) | Frozen previous implementation, kept for porting. Not built, not tested. |
| `package.json` | Modernized manifest: 2026 deps, three subpath exports, no better-auth or Drizzle. |
| `tsconfig.json` | TypeScript 6 strict config (verified, adjusted if needed). |
| `svelte.config.js` | Unchanged (`vitePreprocess`). |
| `wrangler.test.jsonc` | Test-only Worker config: the `AUTH_DB` D1 binding for pool-workers. |
| `vitest.config.ts` | Two projects: `unit` (node) and `integration` (workers and D1). |
| `migrations/` | Emptied of Drizzle output; the auth schema migration arrives in Plan 01. |
| `src/lib/index.ts`, `src/lib/sveltekit/index.ts`, `src/lib/components/index.ts` | Empty export stubs so `svelte-package` and `svelte-check` pass. |
| `src/lib/env.ts` | First real module: `requireOrigin(env)` (origin-from-config, spec 7.1 and risk H3). |
| `src/tests/unit/env.test.ts` | First unit test. |
| `src/tests/integration/apply-migrations.ts` | `beforeAll` that applies committed D1 migrations. |
| `src/tests/integration/d1-harness.test.ts` | Proves the workers and D1 layer runs. |
| `.github/workflows/test.yml` | CI: install, `svelte-check`, `vitest run`, `svelte-package`. |

---

## Task 1: Create the isolated rebuild worktree

**Files:** none yet (worktree creation only).

- [ ] **Step 1: Invoke the worktree skill**

Use the `superpowers:using-git-worktrees` skill to create a worktree off `cairn-cms` `main`. Name the branch `rebuild`. The intended result is a sibling working directory (for example `~/Projects/cairn/cairn-cms-rebuild`) on branch `rebuild`, with the live `~/Projects/cairn/cairn-cms` checkout and the npm-workspace symlink untouched.

- [ ] **Step 2: Confirm the worktree and branch**

Run (from the worktree directory):
```bash
git rev-parse --abbrev-ref HEAD
git worktree list
```
Expected: HEAD is `rebuild`; `git worktree list` shows the new path alongside the main checkout.

- [ ] **Step 3: Confirm site dev is unaffected**

Run:
```bash
ls -l ~/Projects/cairn/node_modules/@glw907/cairn-cms
```
Expected: the symlink still resolves to `~/Projects/cairn/cairn-cms` (the main checkout), not the worktree. It stays isolated until cutover (Plan 07).

> All remaining tasks run **inside the worktree directory**.

---

## Task 2: Preserve legacy code and create the fresh skeleton

**Files:**
- Move: `src/` to `legacy/src`
- Create: `src/lib/index.ts`, `src/lib/sveltekit/index.ts`, `src/lib/components/index.ts`

- [ ] **Step 1: Move the current source aside**

Run:
```bash
mkdir -p legacy
git mv src legacy/src
```
This freezes the previous implementation for porting and clears the way for fresh internals. `legacy/` is never built or published (it is excluded from `files` in Task 3 and from `tsconfig` includes).

- [ ] **Step 2: Create the empty export-stub files**

Create `src/lib/index.ts`:
```ts
// Engine entry. Populated by Plans 01 through 06 (auth, content, github, render, nav).
export {};
```

Create `src/lib/sveltekit/index.ts`:
```ts
// SvelteKit server logic (load and action functions) consumed by site route shims.
export {};
```

Create `src/lib/components/index.ts`:
```ts
// Admin Svelte components. Populated by Plan 05.
export {};
```

- [ ] **Step 3: Commit the move**

```bash
git add -A
git commit -m "chore: freeze previous src under legacy, add fresh skeleton"
```

---

## Task 3: Rewrite the package manifest

**Files:**
- Modify: `package.json` (full replacement)
- Delete: `drizzle.config.ts`, `auth.cli.ts`

- [ ] **Step 1: Remove the better-auth and Drizzle config files**

Run:
```bash
git rm drizzle.config.ts auth.cli.ts
```

- [ ] **Step 2: Replace `package.json` with the modernized manifest**

Write `package.json`:
```json
{
  "name": "@glw907/cairn-cms",
  "version": "0.5.1",
  "description": "Embedded, magic-link, GitHub-committing CMS for SvelteKit/Cloudflare sites.",
  "type": "module",
  "sideEffects": [
    "**/*.svelte",
    "**/*.css"
  ],
  "license": "MIT",
  "author": "Geoff Wright",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/glw907/cairn-cms.git"
  },
  "keywords": [
    "cms",
    "sveltekit",
    "cloudflare",
    "github",
    "magic-link",
    "markdown"
  ],
  "scripts": {
    "package": "svelte-package",
    "prepublishOnly": "svelte-package",
    "check": "svelte-check --tsconfig ./tsconfig.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:unit": "vitest run --project unit",
    "test:integration": "vitest run --project integration"
  },
  "exports": {
    ".": {
      "types": "./src/lib/index.ts",
      "svelte": "./src/lib/index.ts",
      "default": "./src/lib/index.ts"
    },
    "./sveltekit": {
      "types": "./src/lib/sveltekit/index.ts",
      "svelte": "./src/lib/sveltekit/index.ts",
      "default": "./src/lib/sveltekit/index.ts"
    },
    "./components": {
      "types": "./src/lib/components/index.ts",
      "svelte": "./src/lib/components/index.ts",
      "default": "./src/lib/components/index.ts"
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
      "./sveltekit": {
        "types": "./dist/sveltekit/index.d.ts",
        "svelte": "./dist/sveltekit/index.js",
        "default": "./dist/sveltekit/index.js"
      },
      "./components": {
        "types": "./dist/components/index.d.ts",
        "svelte": "./dist/components/index.js",
        "default": "./dist/components/index.js"
      },
      "./package.json": "./package.json"
    }
  },
  "files": [
    "dist",
    "src/lib"
  ],
  "peerDependencies": {
    "@sveltejs/kit": "^2",
    "carta-md": "^4.11",
    "svelte": "^5.0.0"
  },
  "dependencies": {
    "@types/hast": "^3.0.4",
    "@types/mdast": "^4.0.4",
    "gray-matter": "^4",
    "hastscript": "^9.0.1",
    "mdast-util-directive": "^3.1.0",
    "rehype-raw": "^7.0.0",
    "rehype-slug": "^6.0.0",
    "rehype-stringify": "^10.0.1",
    "remark-directive": "^4.0.0",
    "remark-gfm": "^4",
    "remark-parse": "^11.0.0",
    "remark-rehype": "^11.1.2",
    "unified": "^11.0.5",
    "unist-util-visit": "^5.1.0",
    "yaml": "^2"
  },
  "devDependencies": {
    "@cloudflare/vitest-pool-workers": "^0.16",
    "@cloudflare/workers-types": "^4.20260501.0",
    "@sveltejs/kit": "^2.61",
    "@sveltejs/package": "^2",
    "@sveltejs/vite-plugin-svelte": "^7.1",
    "carta-md": "^4.11",
    "svelte": "^5.55",
    "svelte-check": "^4",
    "typescript": "^6.0.3",
    "vite": "^8.0",
    "vitest": "^4.1",
    "wrangler": "^4"
  }
}
```

Changes from the shipped manifest. Both the `./auth` export and its `publishConfig` twin are gone, since auth now lives inside the engine and `/sveltekit`. Six packages drop out, namely `better-auth`, `@better-auth/cli`, `drizzle-orm`, `drizzle-kit`, `better-sqlite3`, and `@types/better-sqlite3`. Three come in for the real-D1 test harness, `@cloudflare/vitest-pool-workers`, `vite`, and `wrangler`. The `auth:schema` and `auth:sql` scripts give way to `check`, `test:unit`, and `test:integration`. `bits-ui`, `svelte-sortable-list`, `vitest-browser-svelte`, `@vitest/browser`, and `@playwright/test` are intentionally not added here; Plan 05 adds them when the first component needs them.

- [ ] **Step 3: Commit the manifest**

```bash
git add package.json
git commit -m "chore: modernize manifest, drop better-auth and Drizzle"
```

---

## Task 4: Install dependencies and verify the skeleton builds

**Files:** none changed (verification task; produces `package-lock.json` and `node_modules`).

- [ ] **Step 1: Clean install**

Run (from the worktree):
```bash
rm -rf node_modules package-lock.json
npm install
```
Expected: install completes with no peer-dependency errors mentioning `better-auth` or `drizzle`.

- [ ] **Step 2: Verify TypeScript config is strict (TS 6 default)**

Read `tsconfig.json`. Confirm it extends the SvelteKit or svelte-package base and that `compilerOptions.strict` is `true` (TypeScript 6 defaults strict on; an explicit `"strict": true` is fine). Confirm `include` does not pull in `legacy/`. If `legacy/` is included, add `"exclude": ["legacy", "dist", "node_modules"]`.

- [ ] **Step 3: Verify `svelte-check` passes on the skeleton**

Run:
```bash
npm run check
```
Expected: 0 errors, 0 warnings. The empty stub `index.ts` files type-check cleanly.

- [ ] **Step 4: Verify the package builds**

Run:
```bash
npm run package
```
Expected: `svelte-package` emits `dist/` with `index.js`, `sveltekit/index.js`, `components/index.js` and their `.d.ts` files, with no errors.

- [ ] **Step 5: Commit the lockfile**

```bash
git add package-lock.json
git commit -m "chore: install modernized dependency set"
```

---

## Task 5: Unit test layer (`env.ts` and the `unit` vitest project)

**Files:**
- Create: `vitest.config.ts` (replaces the existing single-environment config)
- Create: `src/tests/unit/env.test.ts`
- Create: `src/lib/env.ts`

- [ ] **Step 1: Write `vitest.config.ts` with the `unit` project**

Write `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

// The `integration` project (workers and D1) is added in Task 6.
// The `component` (browser) project is added in Plan 05.
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
    ],
  },
});
```

- [ ] **Step 2: Write the failing unit test**

Create `src/tests/unit/env.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { requireOrigin } from '../../lib/env.js';

describe('requireOrigin', () => {
  it('returns the configured origin', () => {
    expect(requireOrigin({ PUBLIC_ORIGIN: 'https://ecnordic.ski' })).toBe('https://ecnordic.ski');
  });

  it('throws when the origin is unset', () => {
    expect(() => requireOrigin({})).toThrow(/PUBLIC_ORIGIN/);
  });

  it('throws when the origin is empty', () => {
    expect(() => requireOrigin({ PUBLIC_ORIGIN: '' })).toThrow(/PUBLIC_ORIGIN/);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run:
```bash
npm run test:unit
```
Expected: FAIL, because `requireOrigin` cannot be imported from `../../lib/env.js` (module does not exist).

- [ ] **Step 4: Write the minimal implementation**

Create `src/lib/env.ts`:
```ts
/**
 * Returns the site's public origin from configuration.
 *
 * The origin is always config-derived, never read from a request header, so a
 * forged Host header cannot redirect a magic link (spec 7.1, risk H3).
 *
 * @throws Error when `PUBLIC_ORIGIN` is unset or empty.
 */
export function requireOrigin(env: { PUBLIC_ORIGIN?: string }): string {
  const origin = env.PUBLIC_ORIGIN;
  if (!origin) {
    throw new Error('PUBLIC_ORIGIN is not configured');
  }
  return origin;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run:
```bash
npm run test:unit
```
Expected: PASS, 3 tests green.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts src/tests/unit/env.test.ts src/lib/env.ts
git commit -m "test: add unit test layer and requireOrigin"
```

---

## Task 6: Integration test layer (real D1 via vitest-pool-workers)

**Files:**
- Create: `wrangler.test.jsonc`
- Modify: `vitest.config.ts` (add the `integration` project)
- Create: `src/tests/integration/apply-migrations.ts`
- Create: `src/tests/integration/d1-harness.test.ts`
- Delete: the Drizzle-generated files under `migrations/`

- [ ] **Step 1: Reconnaissance, confirm the current pool-workers config API**

`@cloudflare/vitest-pool-workers` changed its config API in 0.13.0 (the old `defineWorkersConfig` export was removed in favor of a `cloudflareTest()` Vite plugin), and the `env` and `applyD1Migrations` import paths have moved between `cloudflare:test` and `cloudflare:workers` across versions. Before writing config, run:
```bash
sed -n '1,120p' node_modules/@cloudflare/vitest-pool-workers/README.md
node -e "console.log(Object.keys(require('@cloudflare/vitest-pool-workers')))"
```
Confirm the exported plugin and helper names, whether `readD1Migrations` is imported from `@cloudflare/vitest-pool-workers/config`, and whether `env` and `applyD1Migrations` come from `cloudflare:test` or `cloudflare:workers`. Use the names the installed version actually exports in Steps 2 through 4 below; the code blocks reflect the 0.16 API as documented in May 2026.

- [ ] **Step 2: Clear the Drizzle migrations**

Run:
```bash
git rm -r migrations
mkdir migrations
touch migrations/.gitkeep
git add migrations/.gitkeep
```
The hand-written auth schema migration (`0000_auth.sql`) is created in Plan 01. This layer must work with zero migrations present.

- [ ] **Step 3: Write the test-only Worker config**

Create `wrangler.test.jsonc`:
```jsonc
{
  // Test-only Worker config consumed by @cloudflare/vitest-pool-workers.
  // This package is a library and is never deployed; this file exists solely
  // to give the integration tests a real miniflare D1 binding.
  "name": "cairn-cms-test",
  "compatibility_date": "2026-05-28",
  "compatibility_flags": ["nodejs_compat"],
  "d1_databases": [
    {
      "binding": "AUTH_DB",
      "database_name": "cairn-test",
      "database_id": "00000000-0000-0000-0000-000000000000"
    }
  ]
}
```
Email is faked at the module boundary (an injected sender) in Plan 01, so no `send_email` binding is needed here.

- [ ] **Step 4: Add the `integration` project to `vitest.config.ts`**

Replace `vitest.config.ts` with:
```ts
import { defineConfig } from 'vitest/config';
import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { readD1Migrations } from '@cloudflare/vitest-pool-workers/config';
import path from 'node:path';

// Read committed SQL migrations from Node context (workerd cannot read the FS).
const migrations = await readD1Migrations(path.resolve('migrations'));

// The `component` (browser) project is added in Plan 05.
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
    ],
  },
});
```
If Step 1 showed different export names, substitute them here verbatim.

- [ ] **Step 5: Write the migrations applier setup file**

Create `src/tests/integration/apply-migrations.ts`:
```ts
import { env, applyD1Migrations } from 'cloudflare:test';
import { beforeAll } from 'vitest';

// Apply committed SQL migrations to the per-suite miniflare D1 before any test.
// Idempotent and safe with zero migrations present (this plan ships none yet).
beforeAll(async () => {
  await applyD1Migrations(env.AUTH_DB, env.TEST_MIGRATIONS);
});
```
If Step 1 showed `env` is exported from `cloudflare:workers`, split the imports accordingly.

- [ ] **Step 6: Write the failing D1 harness test**

Create `src/tests/integration/d1-harness.test.ts`:
```ts
import { env } from 'cloudflare:test';
import { it, expect } from 'vitest';

it('exposes a working AUTH_DB binding', async () => {
  const row = await env.AUTH_DB.prepare('SELECT 1 AS ok').first<{ ok: number }>();
  expect(row?.ok).toBe(1);
});

it('can create and read a table (proves migration-style DDL works)', async () => {
  await env.AUTH_DB.prepare('CREATE TABLE IF NOT EXISTS _probe (id INTEGER PRIMARY KEY, v TEXT)').run();
  await env.AUTH_DB.prepare('INSERT INTO _probe (v) VALUES (?)').bind('hello').run();
  const row = await env.AUTH_DB.prepare('SELECT v FROM _probe WHERE v = ?').bind('hello').first<{ v: string }>();
  expect(row?.v).toBe('hello');
});
```

- [ ] **Step 7: Run the integration project**

Run:
```bash
npm run test:integration
```
Expected: PASS, both tests green, proving workerd runs the code, the `AUTH_DB` D1 binding resolves, queries work, and `applyD1Migrations` runs without error against an empty migration set.

If pool-workers reports it cannot run without a Worker entry, add `"main": "src/tests/integration/worker-entry.ts"` to `wrangler.test.jsonc` and create that file with `export default { fetch() { return new Response('test'); } };`. The reconnaissance in Step 1 indicates whether a `main` is required for the installed version.

- [ ] **Step 8: Run the full suite**

Run:
```bash
npm test
```
Expected: both projects (`unit`, `integration`) run and pass.

- [ ] **Step 9: Commit**

```bash
git add vitest.config.ts wrangler.test.jsonc src/tests/integration migrations/.gitkeep
git commit -m "test: add real-D1 integration layer via vitest-pool-workers"
```

---

## Task 7: Continuous integration

**Files:**
- Modify or create: `.github/workflows/test.yml`

- [ ] **Step 1: Inspect the existing workflows**

Run:
```bash
ls .github/workflows
```
Note any existing workflow that runs the old `vitest run`, so this replaces rather than duplicates it.

- [ ] **Step 2: Write the CI workflow**

Write `.github/workflows/test.yml`:
```yaml
name: test

on:
  push:
    branches: [main, rebuild]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          # Pin Node 22 LTS: vitest-pool-workers has a known console bug on Node 24.
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run check
      - run: npm test
      - run: npm run package
```

- [ ] **Step 3: Remove any superseded workflow**

If Step 1 found an old test workflow with a different name that runs the previous suite, delete it:
```bash
git rm .github/workflows/<old-workflow>.yml
```
Skip this step if no superseded workflow exists.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows
git commit -m "ci: run check, full vitest suite, and package build"
```

---

## Task 8: Exit criteria

**Files:** none (verification only).

- [ ] **Step 1: Confirm the full gate is green**

Run, from the worktree:
```bash
npm ci
npm run check
npm test
npm run package
```
Expected: clean install; `svelte-check` 0/0; both vitest projects pass; `dist/` builds.

- [ ] **Step 2: Confirm the legacy code is preserved and excluded**

Run:
```bash
test -d legacy/src && echo "legacy preserved"
npm run check 2>&1 | grep -i legacy && echo "LEAK" || echo "legacy excluded from check"
```
Expected: "legacy preserved" and "legacy excluded from check".

- [ ] **Step 3: Confirm better-auth and Drizzle are gone**

Run:
```bash
grep -rn "better-auth\|drizzle" package.json && echo "STILL PRESENT" || echo "removed from manifest"
test -f drizzle.config.ts && echo "STILL PRESENT" || echo "drizzle.config.ts removed"
test -f auth.cli.ts && echo "STILL PRESENT" || echo "auth.cli.ts removed"
```
Expected: "removed from manifest", "drizzle.config.ts removed", "auth.cli.ts removed".

**Plan 00 is complete when all three steps pass.** The worktree now has a modernized manifest, a green two-layer test harness on real D1, the legacy code parked for porting, and CI. Plan 01 (self-owned auth on D1) builds on this. It writes `migrations/0000_auth.sql`, the auth modules under `src/lib/auth/`, and the integration tests for the magic-link flow against the harness this plan established.

---

## Self-review notes

- **Spec coverage (this plan's slice):** worktree and topology A (spec 11) are Task 1; the modernized stack and versions (spec 4) are Tasks 3 and 4; the unit and integration test layers with real D1 and `applyD1Migrations` (spec 9) are Tasks 5 and 6; CI is Task 7. Browser and Playwright layers (spec 9) are deferred to Plan 05 by design, noted in the header.
- **Reversal coverage:** the better-auth and Drizzle removal (spec 4 and 7.1) is enacted in Tasks 3 and 6 and verified in Task 8 Step 3.
- **No forward references:** `requireOrigin` (Task 5) is the only engine symbol introduced and is self-contained. The stub `index.ts` files export nothing yet.
- **Known-fast-moving surface:** the pool-workers config API has a reconnaissance step (Task 6 Step 1) because its export names and `cloudflare:test` versus `cloudflare:workers` import split moved across 2026 releases. Its code blocks reflect the 0.16 documented API, and the step says to substitute the installed names.

---

## Execution record (2026-05-28)

Plan 00 executed end to end in one session. All eight tasks done; exit criteria
all pass. Final state on branch `rebuild`: `npm ci` clean, `svelte-check` 0
errors, `npm test` 5/5 green (3 unit, 2 integration), `npm run package` builds
12 files into `dist/`. Legacy preserved under `legacy/src` and excluded from the
check; better-auth and Drizzle gone from the manifest and the config files
deleted. Worktree lives at `~/Projects/cairn/cairn-cms-rebuild`, branched from
local `main` HEAD (which is three commits ahead of `origin/main` and carries the
spec and this plan); the workspace symlink still points at the live checkout.

Resolved versions matched the locked floor: pool-workers 0.16.10, vite 8.0.14,
vitest 4.1.7, svelte 5.55.10, kit 2.61.1, typescript 6.0.3, wrangler 4.95.0.

**Deviations from the drafted plan, all from Task 6's reconnaissance step doing
its job:**

- **pool-workers import path.** In 0.16.10 both `cloudflareTest` and
  `readD1Migrations` export from the package entry; there is no `/config`
  subpath. So the plan's `import { readD1Migrations } from
  '@cloudflare/vitest-pool-workers/config'` collapsed to a single import from
  the entry. Both the `cloudflareTest({ wrangler, miniflare })` call shape and
  the `cloudflare:test` `env`/`applyD1Migrations` imports were correct as
  drafted.
- **Added `src/tests/cloudflare-test.d.ts`.** Not in the plan. Integration
  tests sit under `src/tests`, which `tsconfig` includes, so `svelte-check`
  type-checks them. Without ambient types, `cloudflare:test` would not resolve
  and `env.AUTH_DB`/`env.TEST_MIGRATIONS` would error. This shim references
  `@cloudflare/workers-types` and the `cloudflare:test` module decl, and
  augments `Cloudflare.Env` (this pool-workers version types `env` as
  `Cloudflare.Env`, not a `ProvidedEnv` interface).
- **tsconfig `rootDir`.** Set `"rootDir": "src"` to silence a TypeScript 6
  output-layout advisory that would otherwise print on every `check`. That
  `src/lib/**/*.svelte` include glob stays; `svelte-check` warns once that no
  svelte files match, which is intrinsic to the skeleton stage and clears when
  Plan 05 adds the first component.
- **CI action versions.** Used `actions/checkout@v5` and `setup-node@v5` to
  match the repo's existing `publish.yml` rather than the plan's `@v4`. Node 22
  pin kept.
- **`.dev.vars` gitignored.** Folded in from the cloudflare-workers-reviewer
  gate: `.env*` globs miss Wrangler's local secret file, which Plans 01+ will
  populate with the GitHub App key and session secret.

**Notes for later plans:**

- Integration tests passed on the local Node 24 despite CI pinning Node 22; the
  flagged pool-workers console bug did not surface in 0.16.10. Node 22 is not
  installed locally (nvm has 20 and 24). A `.nvmrc` to align local dev with CI
  is a reasonable future nicety (cloudflare reviewer suggestion, deferred).
- `requireOrigin` is intentionally not re-exported yet; Plan 01 wires it into
  the auth surface.

Review gate: code-simplifier found nothing to change; cloudflare-workers-reviewer
returned no blockers (one warning, since fixed, plus minor deferred suggestions).
Plan 01 (self-owned magic-link auth on D1) builds on this harness: it writes
`migrations/0000_auth.sql`, the `src/lib/auth/` modules, and the magic-link
integration tests.
