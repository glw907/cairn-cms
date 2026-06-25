# Scaffolder Part B1: the factoring

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** factor `examples/showcase` into the single deployable `cairn-starter` reference: a real `adapter-cloudflare` + `wrangler.jsonc` Cloudflare site whose test/spike/demo routes are excluded from emission, with a CI gate that emits and builds the scaffolded output every commit.

**Architecture:** swap the showcase from `adapter-node` to `@sveltejs/adapter-cloudflare`, modeled on the live 907-life site, and add a real `wrangler.jsonc` (D1 `AUTH_DB`, `EMAIL`, R2 `MEDIA_BUCKET`, observability) plus the auth migration. The Playwright e2e stays green because the dev backend fabricates `event.platform.env` (`packages/cairn-cms-dev/src/handle.ts:62`), overriding the new miniflare platform proxy; only the dev-backend-elimination grep retargets from `build/` to `.svelte-kit/cloudflare/`. An emission manifest (`.cairn-template.json`) names the excluded test/spike/demo routes, an `emit-template.mjs` script copies the showcase out with the dependency paths transformed to a packaged engine, and a new CI job builds that emitted output as the rot gate.

**Tech stack:** built on SvelteKit 2, `@sveltejs/adapter-cloudflare` ^7, `wrangler` ^4, Vite 8 / Rolldown, `@glw907/cairn-cms` (engine, `file:../..`), `@glw907/cairn-cms-dev` (dev backend, `devDependency`), Playwright, GitHub Actions, Node 22.

## Global constraints

- **Node 22** everywhere in CI (`vitest-pool-workers` has a console bug on Node 24). Copied verbatim from `test.yml`.
- **Adapter + wrangler floors:** `@sveltejs/adapter-cloudflare` ^7 (907-life runs ^7.2.8), `wrangler` ^4 (907-life runs ^4.93.1).
- **`adapter({ platformProxy: { remoteBindings: false } })` is mandatory.** Without it the CI prerender (no Cloudflare auth) fails with "Failed to start the remote proxy session." Copied from 907-life's `svelte.config.js`.
- **The showcase config is `wrangler.jsonc`, not `.toml`** (the spec's "from the `.test.jsonc` shape"; the engine root already uses `wrangler.test.jsonc`).
- **`AuthEnv` imports from `@glw907/cairn-cms/sveltekit`**, the now-correct subpath (resolved 2026-06-13), never the root. The showcase's new `app.d.ts` models the template-quality `Platform.env`.
- **The dev-backend fence stays intact.** The build-foldable `(dev || import.meta.env.VITE_CAIRN_E2E === '1') && process.env.CAIRN_DEV_BACKEND === '1'` gate in `hooks.server.ts` is unchanged; the elimination grep must target the deployable Worker output, not `.svelte-kit/output` (which carries a dead unreferenced chunk). See the `cairn-dev-backend-build-elimination` memory.
- **Lockfile discipline.** A graph-changing `examples/showcase/package.json` edit regenerates and commits `examples/showcase/package-lock.json` in the same commit; CI installs it with `npm ci --prefix examples/showcase`. See the `cairn-root-lockfile-drift-npm-ci` memory.
- **Worktree edits target the worktree path.** Every Edit/Write uses the worktree checkout, never the main checkout. Run `npm run package` (root) before any `npm test` so the dist the showcase consumes is current. See the `worktree-edits-target-worktree-path` and `cairn-worktree-needs-dist-build` memories.
- **No public-API change.** B1 is internal factoring; no new package export, so `check:reference` coverage is unaffected. Friction-log entries are updated, not the reference pages.

## Setup before Task 1

Run once at the start of the pass, from the main checkout at `/home/glw907/Projects/cairn-cms`:

```bash
git worktree add ../cairn-cms-part-b1 -b feat/scaffolder-b1-factoring main
cd ../cairn-cms-part-b1
ln -s /home/glw907/Projects/cairn-cms/node_modules node_modules   # reuse the engine's installed deps
npm run package                                                    # build the dist the showcase consumes
```

Baseline the gate before changing anything (all must pass): `npm run check` (1147 files, 0/0), `npm test` (EXIT 0), and the showcase e2e `npm --prefix examples/showcase run test:e2e` (30/30). If the e2e baseline is not green on `adapter-node`, stop and report; the swap must not be blamed for a pre-existing failure.

All paths below are relative to the worktree root `../cairn-cms-part-b1`.

---

### Task 1: swap the showcase to `adapter-cloudflare` with a real `wrangler.jsonc`

**Files:**
- Modify: `examples/showcase/package.json` (drop `@sveltejs/adapter-node`, add `@sveltejs/adapter-cloudflare` ^7 and `wrangler` ^4)
- Modify: `examples/showcase/package-lock.json` (regenerated, committed)
- Modify: `examples/showcase/svelte.config.js`
- Create: `examples/showcase/wrangler.jsonc`
- Create: `examples/showcase/migrations/0000_auth.sql` (copy of the engine root's `migrations/0000_auth.sql`)
- Modify: `examples/showcase/src/app.d.ts`

**Interfaces:**
- Produces: a deployable Cloudflare build at `examples/showcase/.svelte-kit/cloudflare/_worker.js` and a `Platform.env` typed by `AuthEnv` from `@glw907/cairn-cms/sveltekit`. Task 2 retargets its elimination grep at `.svelte-kit/cloudflare/`.

- [ ] **Step 1: Swap the adapter dependency**

Edit `examples/showcase/package.json`: remove `"@sveltejs/adapter-node": "^5"`, add `"@sveltejs/adapter-cloudflare": "^7"` and `"wrangler": "^4"` to `devDependencies`. Then regenerate the lockfile:

```bash
npm install --prefix examples/showcase
```

- [ ] **Step 2: Point `svelte.config.js` at adapter-cloudflare**

Replace `examples/showcase/svelte.config.js` with (the prerender policy keeps the existing `handleHttpError: 'warn'` plus the `cairnManifest` note already in the file's comment):

```js
import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  kit: {
    // remoteBindings: false keeps the build-time platform proxy from connecting to Cloudflare
    // during prerender, which has no account credentials in CI.
    adapter: adapter({ platformProxy: { remoteBindings: false } }),
    // handleHttpError: 'warn' downgrades a prerender error to a warning. The cairnManifest() plugin
    // verifies the manifest in buildStart, outside the prerender lifecycle, so a stale manifest still
    // fails the build red even under this policy.
    prerender: { handleHttpError: 'warn' },
  },
};
```

- [ ] **Step 3: Add the showcase `wrangler.jsonc`**

Create `examples/showcase/wrangler.jsonc`. The ids are placeholders (the showcase is a template and test harness, never deployed); a scaffolded site swaps the names and ids:

```jsonc
{
  // The deployable template's Cloudflare Worker config. A scaffolded site keeps this shape and
  // swaps the names and ids. Modeled on the live 907-life cairn site.
  "name": "cairn-showcase",
  "compatibility_date": "2026-05-28",
  "compatibility_flags": ["nodejs_compat"],
  "main": ".svelte-kit/cloudflare/_worker.js",
  "observability": { "enabled": true },
  "assets": { "directory": ".svelte-kit/cloudflare", "binding": "ASSETS" },
  // Email Sending binding for magic links (arbitrary recipients). A real site sets remote = true
  // so `wrangler dev` sends real mail; the dev backend fakes it locally.
  "send_email": [{ "name": "EMAIL" }],
  // cairn-cms self-owned magic-link auth store (editor allowlist, sessions, tokens).
  "d1_databases": [
    {
      "binding": "AUTH_DB",
      "database_name": "cairn-showcase-auth",
      "database_id": "00000000-0000-0000-0000-000000000000"
    }
  ],
  // R2 bucket backing the media library; the /media route streams content-addressed bytes from here.
  "r2_buckets": [{ "binding": "MEDIA_BUCKET", "bucket_name": "cairn-showcase-media" }],
  "vars": {
    // Canonical origin for magic-link confirmation links, never read from a request header.
    "PUBLIC_ORIGIN": "http://localhost:4173"
  }
}
```

- [ ] **Step 4: Ship the auth migration with the template**

Copy the engine's auth migration so a scaffolded site can provision its `AUTH_DB`:

```bash
mkdir -p examples/showcase/migrations
cp migrations/0000_auth.sql examples/showcase/migrations/0000_auth.sql
```

- [ ] **Step 5: Replace `app.d.ts` with the template-quality `Platform.env`**

Replace `examples/showcase/src/app.d.ts` (the loose `Record<string, unknown>` becomes the real shape; `@cloudflare/workers-types` is now resolvable through the adapter dependency):

```ts
// See https://svelte.dev/docs/kit/types#app.d.ts
import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
// AuthEnv ships from the /sveltekit subpath (since 0.51); the app.d.ts Platform block names it there.
import type { AuthEnv } from '@glw907/cairn-cms/sveltekit';
// App.Locals.editor (set by the engine's auth guard) ships with the engine.
import '@glw907/cairn-cms/ambient';

declare global {
  namespace App {
    interface Platform {
      env: {
        // cairn-cms self-owned magic-link auth store (editor allowlist, sessions, tokens).
        AUTH_DB: D1Database;
        // Email Sending binding for magic links (arbitrary recipients).
        EMAIL: NonNullable<AuthEnv['EMAIL']>;
        // Canonical origin for magic-link confirmation links (never from a request header).
        PUBLIC_ORIGIN: string;
        // R2 bucket backing the media library; the /media route streams bytes from here.
        MEDIA_BUCKET: R2Bucket;
        // GitHub App credentials for the commit signer.
        GITHUB_APP_ID: string;
        GITHUB_APP_INSTALLATION_ID: string;
        GITHUB_APP_PRIVATE_KEY_B64: string;
      };
      context: ExecutionContext;
      caches: CacheStorage & { default: Cache };
    }
  }
}

export {};
```

- [ ] **Step 6: Build and verify the Worker output exists**

Run: `npm --prefix examples/showcase run build`
Expected: build succeeds; `examples/showcase/.svelte-kit/cloudflare/_worker.js` exists. Verify:

```bash
test -f examples/showcase/.svelte-kit/cloudflare/_worker.js && echo "OK worker emitted" || echo "FAIL no worker"
```

If the build fails on prerender with a remote-proxy error, confirm Step 2's `remoteBindings: false` is present.

- [ ] **Step 7: Typecheck the showcase**

Run: `npm --prefix examples/showcase run check`
Expected: 0 errors, 0 warnings. The `Platform.env` block now typechecks against `AuthEnv`.

- [ ] **Step 8: Commit**

```bash
git add examples/showcase/package.json examples/showcase/package-lock.json examples/showcase/svelte.config.js examples/showcase/wrangler.jsonc examples/showcase/migrations/0000_auth.sql examples/showcase/src/app.d.ts
git commit -m "feat(showcase): factor onto adapter-cloudflare with a real wrangler.jsonc"
```

---

### Task 2: keep the e2e green on adapter-cloudflare, retarget the elimination grep

**Files:**
- Modify: `.github/workflows/e2e.yml` (the grep target path)
- Verify (no edit expected): `examples/showcase/playwright.config.ts`, `examples/showcase/src/hooks.server.ts`

**Interfaces:**
- Consumes: Task 1's `.svelte-kit/cloudflare/` Worker output.
- Produces: a green e2e suite and a dev-backend-elimination assertion that targets the deployable Worker.

- [ ] **Step 1: Run the e2e against the new adapter**

The webServer (`examples/showcase/playwright.config.ts`) is `VITE_CAIRN_E2E=1 npm run build && npm run preview -- --port 4173` with `env: { CAIRN_DEV_BACKEND: '1' }`. The dev backend's `handle.ts` sets `event.platform = { env: { ...doubles } }`, overriding the adapter's miniflare proxy, so the suite should behave as on adapter-node.

Run: `npm --prefix examples/showcase run test:e2e`
Expected: PASS (30/30, matching the baseline).

If `vite preview` does not serve under adapter-cloudflare, the proven fallback is a `wrangler dev`-based webServer; record the divergence in the post-mortem and adjust `playwright.config.ts`'s `command` to `VITE_CAIRN_E2E=1 npm run build && npx wrangler dev --port 4173` before continuing. Do not loosen the dev-backend gate to make the suite pass.

- [ ] **Step 2: Confirm the deployable Worker carries no dev-backend symbol**

The flagged build the e2e runs includes the dev backend by design. A DEFAULT build must not. Run:

```bash
npm --prefix examples/showcase run build
grep -rl -e 'editor@showcase.test' -e 'installFakeGitHub' -e 'devBackendHandle' -e 'cairn-cms-dev' -e 'dev-token' -e 'sk-showcase-stub' -e 'createFakeAuthDb' -e 'createFakeR2' -e 'createFakeAnthropic' -e 'lastRecordedCommit' examples/showcase/.svelte-kit/cloudflare 2>/dev/null && echo "FAIL dev-backend in worker" || echo "OK clean worker"
```

Expected: `OK clean worker`. (A default `npm run build` has no `VITE_CAIRN_E2E`, so the gate folds the dev import away; the adapter's Rollup pass prunes the orphan chunk from `.svelte-kit/cloudflare/`.)

- [ ] **Step 3: Retarget the CI elimination grep**

In `.github/workflows/e2e.yml`, the "Assert the dev backend is eliminated" step greps `examples/showcase/build`. Change the grep path to `examples/showcase/.svelte-kit/cloudflare` and update the step's comment to name the new deployable output. Replace the comment block and the `grep -rl ... examples/showcase/build` path accordingly:

```yaml
      - name: Assert the dev backend is eliminated from the default build
        # Grep the deployable Cloudflare Worker (.svelte-kit/cloudflare), not .svelte-kit/output: the
        # latter always carries a dead, unreferenced split chunk for the gated dynamic import, which
        # the adapter prunes from the deployable Worker.
        run: |
          if grep -rl -e 'editor@showcase.test' -e 'installFakeGitHub' -e 'devBackendHandle' -e 'cairn-cms-dev' -e 'dev-token' -e 'sk-showcase-stub' -e 'createFakeAuthDb' -e 'createFakeR2' -e 'createFakeAnthropic' -e 'lastRecordedCommit' examples/showcase/.svelte-kit/cloudflare 2>/dev/null; then
            echo "FAIL: dev-backend artifact in the deployable Worker"; exit 1
          fi
          echo "OK: no dev-backend artifact in the deployable Worker"
```

Note the default-build step (`npm --prefix examples/showcase run build`) in `e2e.yml` still runs before this grep; keep it.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/e2e.yml
git commit -m "test(showcase): keep the e2e green on adapter-cloudflare, retarget the elimination grep"
```

---

### Task 3: restore a working `npm run dev` for the showcase

**Files:**
- Modify: `examples/showcase/vite.config.ts`

**Interfaces:**
- Produces: a showcase `npm run dev` that serves `/admin` without a 500, so a developer's first hour has a live dev loop.

- [ ] **Step 1: Reproduce the failure**

Run: `npm --prefix examples/showcase run dev` then request `/admin` (in another shell: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/admin`). Stop the server.
Expected (the bug): 500. The `file:../..` dist resolves a second `@sveltejs/kit` instance, so a thrown `redirect` fails the engine's `instanceof Redirect` check, and `server.fs.allow` rejects the engine's dist client assets. (Recorded in the friction log under "Scaffolder Part A pass.")

- [ ] **Step 2: Add the dedupe and fs.allow fix**

Edit `examples/showcase/vite.config.ts` to add `resolve.dedupe` and `server.fs.allow` (keep the existing `plugins` and `ssr.noExternal`):

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { cairnManifest } from '@glw907/cairn-cms/vite';

export default defineConfig({
  plugins: [
    sveltekit(),
    cairnManifest({
      configModule: '/src/lib/cairn.config.ts',
      content: { posts: '/src/content/posts/*.md', pages: '/src/content/pages/*.md' },
      manifestPath: '/src/content/.cairn/index.json',
    }),
  ],
  // The engine ships Svelte and TS source inside dist through its `svelte` export condition; let Vite process it.
  ssr: { noExternal: ['@glw907/cairn-cms'] },
  // The showcase consumes the engine through a file:../.. dist symlink. dedupe keeps Vite from
  // resolving a second @sveltejs/kit instance (which breaks the engine's `instanceof Redirect`
  // check), and fs.allow lets the dev server read the engine's dist client assets one level up.
  resolve: { dedupe: ['@sveltejs/kit'] },
  server: { fs: { allow: ['..', '../..'] } },
});
```

- [ ] **Step 3: Verify `/admin` serves in dev**

Run `npm --prefix examples/showcase run dev`, then with the dev backend on:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/admin
```

Note: `/admin` requires the dev backend for an authenticated editor. Start dev with `CAIRN_DEV_BACKEND=1 npm --prefix examples/showcase run dev` and expect a 200 (or a 302 to the editor sign-in handled by the dev backend), not a 500. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add examples/showcase/vite.config.ts
git commit -m "fix(showcase): restore npm run dev under the file:../.. dist link"
```

---

### Task 4: the emission manifest and emit script

**Files:**
- Create: `examples/showcase/.cairn-template.json` (the emission manifest)
- Create: `scripts/emit-template.mjs` (copies the showcase out, excludes, transforms deps)
- Create: `scripts/emit-template.test.mjs` (unit test over the transform)
- Modify: `package.json` (root: add a `test:emit` script and an `emit-template` script)

**Interfaces:**
- Produces: `emitTemplate({ from, to, engineSpec, devSpec, manifestPath })` writing a buildable template tree to `to`. Task 5's CI job calls it with tarball specs. The Part C generator (later) reads the same `.cairn-template.json`.

- [ ] **Step 1: Write the emission manifest**

Create `examples/showcase/.cairn-template.json`. It names the paths excluded from a scaffolded site (the test/spike fixtures the e2e needs but a user does not, the demo route, the e2e harness, and the regenerated build manifest):

```json
{
  "exclude": [
    "src/routes/test",
    "src/routes/spike",
    "src/routes/(site)/calendar",
    "e2e",
    "playwright.config.ts",
    "src/content/.cairn/index.json"
  ]
}
```

- [ ] **Step 2: Write the failing transform test**

Create `scripts/emit-template.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transformPackageJson, shouldExclude } from './emit-template.mjs';

test('transformPackageJson rewrites the engine and dev specs and renames the package', () => {
  const input = {
    name: 'cairn-showcase',
    private: true,
    dependencies: { '@glw907/cairn-cms': 'file:../..' },
    devDependencies: { '@glw907/cairn-cms-dev': 'file:../../packages/cairn-cms-dev', vite: '^8' },
  };
  const out = transformPackageJson(input, {
    name: 'my-cairn-site',
    engineSpec: 'file:/tmp/glw907-cairn-cms-0.64.0.tgz',
    devSpec: 'file:/tmp/glw907-cairn-cms-dev-0.64.0.tgz',
  });
  assert.equal(out.name, 'my-cairn-site');
  assert.equal(out.dependencies['@glw907/cairn-cms'], 'file:/tmp/glw907-cairn-cms-0.64.0.tgz');
  assert.equal(out.devDependencies['@glw907/cairn-cms-dev'], 'file:/tmp/glw907-cairn-cms-dev-0.64.0.tgz');
  assert.equal(out.devDependencies.vite, '^8');
});

test('shouldExclude matches an excluded dir and its children, not a prefix sibling', () => {
  const exclude = ['src/routes/test', 'playwright.config.ts'];
  assert.equal(shouldExclude('src/routes/test', exclude), true);
  assert.equal(shouldExclude('src/routes/test/last-commit/+server.ts', exclude), true);
  assert.equal(shouldExclude('playwright.config.ts', exclude), true);
  assert.equal(shouldExclude('src/routes/testimonials/+page.svelte', exclude), false);
  assert.equal(shouldExclude('src/routes/(site)/+page.svelte', exclude), false);
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `node --test scripts/emit-template.test.mjs`
Expected: FAIL — `Cannot find module './emit-template.mjs'` (or the named exports are undefined).

- [ ] **Step 4: Write `emit-template.mjs`**

Create `scripts/emit-template.mjs`:

```js
// Emit a deployable cairn-starter template from examples/showcase. The showcase is the single
// source (Reversal 2); this script copies it out, drops the paths the emission manifest excludes,
// and rewrites the workspace-relative engine/dev dependency specs to a packaged engine. CI runs it
// against npm-packed tarballs to prove the scaffolded output still builds (the rot gate). Part C's
// generator reuses the manifest and this transform.
import { cp, readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Rewrite the emitted package.json: rename, repoint the engine and dev-backend specs.
 * @param pkg the parsed showcase package.json
 * @param opts.name the scaffolded site name
 * @param opts.engineSpec the spec to install @glw907/cairn-cms from
 * @param opts.devSpec the spec to install @glw907/cairn-cms-dev from
 */
export function transformPackageJson(pkg, { name, engineSpec, devSpec }) {
  const out = structuredClone(pkg);
  out.name = name;
  if (out.dependencies?.['@glw907/cairn-cms']) out.dependencies['@glw907/cairn-cms'] = engineSpec;
  if (out.devDependencies?.['@glw907/cairn-cms-dev']) out.devDependencies['@glw907/cairn-cms-dev'] = devSpec;
  return out;
}

/** True when rel is an excluded path or sits under an excluded directory. */
export function shouldExclude(rel, exclude) {
  const norm = rel.split(path.sep).join('/');
  return exclude.some((ex) => norm === ex || norm.startsWith(ex + '/'));
}

/**
 * Emit the template tree.
 * @param opts.from the showcase dir
 * @param opts.to the target dir (must not exist or be empty)
 * @param opts.engineSpec @param opts.devSpec @param opts.name passed to transformPackageJson
 */
export async function emitTemplate({ from, to, engineSpec, devSpec, name = 'cairn-site' }) {
  const manifest = JSON.parse(await readFile(path.join(from, '.cairn-template.json'), 'utf8'));
  const exclude = manifest.exclude ?? [];
  const alwaysSkip = ['node_modules', '.svelte-kit', 'build', '.cairn-template.json'];
  await rm(to, { recursive: true, force: true });
  await mkdir(to, { recursive: true });
  await cp(from, to, {
    recursive: true,
    filter: (src) => {
      const rel = path.relative(from, src);
      if (rel === '') return true;
      const top = rel.split(path.sep)[0];
      if (alwaysSkip.includes(top)) return false;
      return !shouldExclude(rel, exclude);
    },
  });
  const pkg = JSON.parse(await readFile(path.join(from, 'package.json'), 'utf8'));
  await writeFile(
    path.join(to, 'package.json'),
    JSON.stringify(transformPackageJson(pkg, { name, engineSpec, devSpec }), null, 2) + '\n',
  );
  // The lockfile is showcase-specific (file:../.. paths); the emitted site resolves fresh on install.
  if (existsSync(path.join(to, 'package-lock.json'))) await rm(path.join(to, 'package-lock.json'));
  return to;
}

// CLI: node scripts/emit-template.mjs <to> <engineSpec> <devSpec> [name]
if (import.meta.url === `file://${process.argv[1]}`) {
  const [to, engineSpec, devSpec, name] = process.argv.slice(2);
  if (!to || !engineSpec || !devSpec) {
    console.error('usage: emit-template.mjs <to> <engineSpec> <devSpec> [name]');
    process.exit(1);
  }
  const from = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'examples', 'showcase');
  await emitTemplate({ from, to, engineSpec, devSpec, name });
  console.log(`emitted template to ${to}`);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node --test scripts/emit-template.test.mjs`
Expected: PASS (both tests).

- [ ] **Step 6: Wire the root scripts**

In the root `package.json` `scripts`, add:

```json
    "emit-template": "node scripts/emit-template.mjs",
    "test:emit": "node --test scripts/emit-template.test.mjs",
```

Run `npm run test:emit`. Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add examples/showcase/.cairn-template.json scripts/emit-template.mjs scripts/emit-template.test.mjs package.json
git commit -m "feat(scaffolder): emission manifest and emit-template script"
```

---

### Task 5: build the scaffolded output in CI

**Files:**
- Create: `.github/workflows/scaffold.yml`

**Interfaces:**
- Consumes: `scripts/emit-template.mjs`, the engine `npm pack`, the dev-package `npm pack`.
- Produces: a CI job that fails if the emitted template does not install, typecheck, build, or if it leaks the dev backend into the deployable Worker.

- [ ] **Step 1: Write the workflow**

Create `.github/workflows/scaffold.yml`. It packs the engine and the dev package, emits the template against those tarballs (the published-shape resolution, proven without the registry), then installs, typechecks, builds, and re-runs the dev-backend-elimination grep on the emitted output:

```yaml
name: scaffold

on:
  push:
    branches: [main, rebuild]
  pull_request:

jobs:
  scaffold:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 22
      - run: npm ci
      # Build and pack the engine and the dev backend into tarballs the emitted template installs,
      # which mirrors a scaffolded user's npm-range resolution without needing the registry.
      - run: npm run package
      - name: Pack the engine and dev backend
        id: pack
        run: |
          ENGINE_TGZ="$PWD/$(npm pack --silent)"
          DEV_TGZ="$PWD/$(npm pack --silent ./packages/cairn-cms-dev)"
          echo "engine=$ENGINE_TGZ" >> "$GITHUB_OUTPUT"
          echo "dev=$DEV_TGZ" >> "$GITHUB_OUTPUT"
      - name: Emit the scaffolded template
        run: node scripts/emit-template.mjs /tmp/cairn-emitted "file:${{ steps.pack.outputs.engine }}" "file:${{ steps.pack.outputs.dev }}" emitted-site
      - name: Install, typecheck, and build the emitted template
        working-directory: /tmp/cairn-emitted
        run: |
          npm install
          npm run check
          npm run build
      - name: Assert the dev backend is eliminated from the emitted Worker
        run: |
          if grep -rl -e 'editor@showcase.test' -e 'installFakeGitHub' -e 'devBackendHandle' -e 'cairn-cms-dev' -e 'dev-token' -e 'sk-showcase-stub' -e 'createFakeAuthDb' -e 'createFakeR2' -e 'createFakeAnthropic' -e 'lastRecordedCommit' /tmp/cairn-emitted/.svelte-kit/cloudflare 2>/dev/null; then
            echo "FAIL: dev-backend artifact in the emitted Worker"; exit 1
          fi
          echo "OK: emitted template builds clean"
```

- [ ] **Step 2: Dry-run the emission and build locally**

Reproduce the CI job locally to confirm the emitted template builds before trusting CI:

```bash
npm run package
ENGINE_TGZ="$PWD/$(npm pack --silent)"
DEV_TGZ="$PWD/$(npm pack --silent ./packages/cairn-cms-dev)"
node scripts/emit-template.mjs /tmp/cairn-emitted "file:$ENGINE_TGZ" "file:$DEV_TGZ" emitted-site
( cd /tmp/cairn-emitted && npm install && npm run check && npm run build )
test -f /tmp/cairn-emitted/.svelte-kit/cloudflare/_worker.js && echo "OK emitted build" || echo "FAIL emitted build"
```

Expected: `check` 0/0, build succeeds, `OK emitted build`. If the emitted `npm run check` fails on a path the showcase resolved through the symlink but the emitted tree resolves through the tarball, fix the cause in the showcase source (not by special-casing the emit script) and re-run.

- [ ] **Step 3: Clean up the packed tarballs**

```bash
rm -f glw907-cairn-cms-*.tgz glw907-cairn-cms-dev-*.tgz
git status --porcelain   # confirm no stray tarball is staged
```

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/scaffold.yml
git commit -m "ci: build the scaffolded template output every commit"
```

---

### Task 6: update the friction log and STATUS carry-forwards

**Files:**
- Modify: `docs/internal/docs-friction-log.md`
- Modify: `docs/STATUS.md`

**Interfaces:**
- Produces: the resolved-finding records for the three Part A friction items B1 closes, and a STATUS pointer to B2.

- [ ] **Step 1: Record the resolved friction items**

In `docs/internal/docs-friction-log.md`, under a new `## Scaffolder Part B1 pass: resolutions (2026-06-25)` heading, record that the broken showcase `npm run dev` is fixed (Task 3), the showcase now models a real `app.d.ts` Platform type (the "showcase models a loose app.d.ts" design-pass finding, Task 1), and the showcase is now a real adapter-cloudflare deployable. Keep each entry to its perspective and a one-line note, matching the file's style.

- [ ] **Step 2: Point STATUS at B2**

Add a new "Immediate next action" block at the top of `docs/STATUS.md` recording B1 complete on `feat/scaffolder-b1-factoring` and naming B2 (the design foundation) as next, per the four-pass decomposition in the scaffolder spec. Follow the existing STATUS block format.

- [ ] **Step 3: Verify the doc gates**

Run: `npm run check:docs`
Expected: PASS (no broken internal links).

- [ ] **Step 4: Commit**

```bash
git add docs/internal/docs-friction-log.md docs/STATUS.md
git commit -m "docs: record Part B1 resolutions and point STATUS at B2"
```

---

## Final gate

From the worktree root, all must pass:

- [ ] `npm run package` then `npm test` — engine suite EXIT 0 (the dev-package unit tests included).
- [ ] `npm run check` — 0 errors, 0 warnings.
- [ ] `npm --prefix examples/showcase run check` — 0/0.
- [ ] `npm --prefix examples/showcase run test:e2e` — green, matching the baseline count.
- [ ] The local emitted-template dry-run (Task 5 Step 2) — builds clean.
- [ ] `npm run check:docs`, `npm run check:comments` — clean.

The `cloudflare-workers-reviewer` gate runs over `wrangler.jsonc`, the adapter config, and the bindings before the pass closes (the spec's B1 gate). The `cairn-pass` pass-end ritual then runs `code-simplifier` over the changed scripts, updates the spec/STATUS/memory, and merges `feat/scaffolder-b1-factoring` to `main`.

## Self-review notes

- **Spec coverage.** B1's spec scope (real `adapter-cloudflare` + `wrangler.jsonc` from the `.test.jsonc` shape, the dev backend from Part A's package, the `test`/`spike`/demo routes separated, dual-resolution, CI that builds the scaffolded output every commit) maps to Tasks 1-5. The `app.d.ts` "loose Platform" design-pass finding and the broken `npm run dev` Part A finding are folded into Tasks 1 and 3. The `media.json` graceful-degrade is already shipped (0.64.0), so no task is needed.
- **Dual-resolution.** Realized as the emit transform (Task 4) plus the CI tarball install (Task 5): `file:../..` in-repo, a packed tarball standing in for the npm range in CI. The Part C generator substitutes the real version range, reading the same `.cairn-template.json`.
- **Out of scope (later sub-passes).** Editorial design, tokens, DaisyUI/Tailwind on the public side (B2); the feature pages and sample content (B3); the four options and the empty state (B4). B1 changes no public CSS and adds no public page.
- **Empirical risk.** Task 2 Step 1 carries the one unverified mechanism (the e2e under `vite preview` on adapter-cloudflare); 907-life proves `vite preview` works for a cairn adapter-cloudflare site, and the dev backend's `event.platform` fabrication is confirmed in `handle.ts:62`. The documented fallback is a `wrangler dev` webServer.

## Post-mortem (2026-06-25)

**Outcome.** Part B1 landed on `feat/scaffolder-b1-factoring` (off `main` at `ff5d262`), all gates green and held unpushed. The showcase is now the single deployable `cairn-starter` reference: `@sveltejs/adapter-cloudflare` ^7 with a real `wrangler.jsonc`, the real `AuthEnv` `app.d.ts`, a working `npm run dev`, the `.cairn-template.json` emission manifest, and a `scaffold.yml` CI job that emits and builds the scaffolded output every commit.

**Commits, in order:**
- `5312b66` Task 1: adapter-cloudflare + wrangler.jsonc + 0000_auth migration + app.d.ts
- `6fb9133` dev-package type fix (the strict `App.Platform` consequence, below)
- `3441429` Task 2: e2e green on adapter-cloudflare, elimination grep retargeted to `.svelte-kit/cloudflare`
- `623c131` gitignore `.wrangler`
- `22dee6d` Task 3: `npm run dev` (vite `dedupe` + `fs.allow`)
- `5ef9a5a` Task 4: emission manifest + `emit-template.mjs` (+ unit test)
- `c96626b` showcase standalone fixes (`@types/node` + ship the content manifest)
- `5c3bfa5` Task 5: `scaffold.yml`
- `ea80b89` Task 6: friction log + STATUS
- `20cdad4` gitignore `.dev.vars` (cloudflare-workers-reviewer W1)
- `2ff4c90` code-simplifier: drop the redundant `existsSync` guard in the emitter

**Verified (final gate).** `npm test` 2482 EXIT 0; `npm run check` 1147 0/0; `check:comments` OK; `check:docs` OK; `test:emit` 2/2; showcase check 0 errors in `src/` (the residual out-of-`src/` errors are worktree-symlink dual-copy noise, absent in a fresh install); showcase e2e 30/30 on adapter-cloudflare (no `wrangler dev` fallback needed); the local emitted-template dry-run: install OK, `npm run check` 0/0 (443 files), build OK, `_worker.js` emitted, the ten-needle dev-backend grep clean. `cloudflare-workers-reviewer`: approve.

**Three things the plan under-specified, resolved in the main loop:**
1. **The strict `app.d.ts` broke the dev backend's platform cast.** The accurate `App.Platform` (`env` plus `context` plus `caches`) made `event.platform = { env } as App.Platform` a non-overlapping cast. Fixed with `as unknown as App.Platform` in `handle.ts`, and a latent implicit-any in `fake-anthropic.ts` typed from the client contract. The dev package ships raw TypeScript, so these are checked wherever it is imported (an isolated `tsc` test confirmed errors in `node_modules/*.ts` are reported); the Task 5 emitted-template check is the gate that now covers it.
2. **The emitted template was not standalone (Task 5 dry-run, red first, the plan's anticipated risk).** Two gaps the showcase's symlinked dev tree masked: no declared `@types/node` (44 Node-globals errors on a fresh install), and the committed content manifest `src/content/.cairn/index.json` was excluded though the `cairn-manifest` plugin *reads and verifies* it in `buildStart` (committed source, not a regenerated artifact). Fixed by declaring `@types/node` (matching the engine's `^22.19.19`) and removing the manifest from the exclude list. Also hardened the `npm pack` capture: the engine's `prepare` build hook prints to stdout, so the tarball name needs `tail -n1` (in `scaffold.yml` and the dry-run).
3. **`.wrangler` and `.dev.vars` were not gitignored.** The adapter-cloudflare swap generates `.wrangler`; the template's `.gitignore` propagates to scaffolded sites, so `.dev.vars` (the GitHub App key) needed an ignore (cloudflare-workers-reviewer W1).

**Carry-forwards (Part C / later B-series):**
- The `EMAIL` binding ships without `remote = true` (correct for the test harness, which fakes mail; a scaffolded site wants it on). Part C should set `remote: true` on `EMAIL` (reviewer W2).
- `compatibility_date` is frozen at `2026-05-28`; Part C should template it to the scaffold moment (reviewer W3).
- A dedicated `check:dev-package` gate is still owed before Part C publishes `@glw907/cairn-cms-dev` (Part A finding); the emitted-template check now gives indirect type coverage.
