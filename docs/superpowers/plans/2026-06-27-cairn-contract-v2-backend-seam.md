# Contract v2 Backend Seam Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: this repo executes plans main-loop
> orchestrate-and-verify (see `CLAUDE.md`). Dispatch well-specified tasks to `cairn-implementer`
> (Sonnet), review each diff, and confirm the full gate (`npm run check` 0/0, `npm test` exit 0)
> before the next dispatch. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the GitHub-App config blob with a `Backend` interface and a `githubApp(...)` default
provider, and reshape the local-dev double from a `fetch` interceptor into a conforming `Backend`.

**Architecture:** A seven-method `Backend` interface (read, commit, branch over files; no `query`). The
adapter holds a `BackendProvider` from `githubApp(...)` that `connect(env)`s to a live `Backend`, with
the installation token minted and cached behind the seam. The engine resolves one `Backend` per request
(`locals.backend ?? runtime.backend.connect(env)`), so the dev double slots in via `locals.backend`
behind the existing dev fence, and the global-`fetch` monkeypatch is retired.

**Tech Stack:** TypeScript, SvelteKit 2, Svelte 5 runes, Cloudflare Workers, Vitest, the GitHub REST and
Git Data APIs.

**Spec:** `docs/superpowers/specs/2026-06-27-cairn-contract-v2-backend-seam-design.md` (read it; this
plan implements it and the spec is the source of truth for every interface shape and the rationale).

## Global Constraints

- **Breaking within 0.x.** Target version **0.74.0** (minor bump; held unpublished, window 0.69.0+).
- **One atomic compile unit.** `npm run check` is a zero-warning gate, so Task 2 retypes the adapter and
  deletes consumers' old call shape with no mid-migration green. Task 1 is additive and gates green
  alone; Task 2 gates green only at its final step.
- **The dev fence is inviolable.** No static import of `@glw907/cairn-cms-dev` may reach the engine or
  the committed adapter. The dev backend rides `event.locals.backend` set by the already-fenced
  `devBackendHandle`. The `build/`-grep elimination check (`e2e.yml`, `scaffold.yml`) stays the proof.
  See the `cairn-dev-backend-build-elimination` memory.
- **`Backend` is read, commit, branch over files. Never a `query()` method.** (TinaCMS guardrail.)
- **Token cache lifetime is unchanged.** `cachedInstallationToken` stays a module-level singleton keyed
  by app identity; `connect` reads it, so a per-request connect re-signs only on a cache miss.
- **Worktree/branch:** work on branch `contract-v2-backend-seam` off the 3c tip (already created). Every
  edit targets this checkout. Conventions: `go`/TSDoc/Svelte comment standards, em-dash banned in
  comments, Conventional Commits, `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

## File structure

**New:**
- `src/lib/github/backend.ts` — the `Backend`, `BackendProvider`, `BackendEnv`, `GithubAppProvider`
  interfaces; `githubApp()`; and `makeGithubBackend()` (the live impl wrapping `repo.ts`/`branches.ts`).
- `src/tests/unit/github-backend.test.ts` — unit tests for `githubApp`, `connect`, and the live impl against a
  `fetch` double.

**Modified (Task 2, the atomic unit):**
- `src/lib/content/types.ts` — `CairnAdapter.backend` (line 200) and `CairnRuntime.backend` (line 347)
  retyped `BackendProvider`; `BackendConfig` removed.
- `src/lib/content/compose.ts` — `composeRuntime` carries the provider; manifest paths default as today.
- `src/lib/github/repo.ts` — delete `commitFile` and `fileSha`; add optional `expectedHead` to
  `commitFiles`; the remaining functions become internal (drop from the barrel).
- `src/lib/github/branches.ts` — unchanged behavior; `createBranch` head-resolution moves into the impl.
- `src/lib/github/credentials.ts` — `appCredentials` consumed inside `makeGithubBackend`; `GithubKeyEnv`
  becomes `BackendEnv` (or `BackendEnv` aliases it).
- `src/lib/sveltekit/content-routes.ts` — resolve `backend` once per handler; pass it down; drop
  `mintToken` from `ContentRoutesDeps`, add `backend?` injection; retype `ContentEvent` (line 305)
  env generic from `GithubKeyEnv` to `BackendEnv`; migrate `settingsSave`'s `commitFile` (line 2854).
- `src/lib/sveltekit/nav-routes.ts` — drop `NavRoutesDeps.mintToken` and the `appCredentials`/
  `cachedInstallationToken`/`GithubKeyEnv` imports; resolve `backend`; use
  `backend.commit(defaultBranch, [change], …, head)`; keep the `isConflict` reload-and-reapply branch.
- `src/lib/sveltekit/cairn-admin.ts` — retype `AdminEvent` env generic to `BackendEnv`; delete the
  `mintToken` field on `AdminDeps` (line 47) and its two pass-throughs (lines 86, 92). It makes no
  backend call itself.
- `src/lib/sveltekit/health.ts` — narrow the provider on `kind === 'github-app'` for the signing
  self-test (`signingSelfTest(provider.appId, key)`).
- `src/lib/media/usage.ts`, `src/lib/media/rewrite-plan.ts`, `src/lib/content/reference-index.ts`,
  `src/lib/content/advisories.ts` — take a `Backend` parameter instead of `(repo, token)`.
  (`media/naming.ts` has no backend coupling and is not touched.)
- `src/lib/vite/index.ts` — `adapterFactsSource` narrows on `kind === 'github-app'` to read
  `backend.owner`/`backend.repo`.
- `src/lib/doctor/checks-github.ts`, `src/lib/doctor/index.ts` — read identity off the narrowed provider.
- `src/lib/index.ts` — remove `BackendConfig`, `RepoRef`, `AppCredentials`; add `Backend`,
  `BackendProvider`, `GithubAppProvider`, `BackendEnv`, `githubApp`, `FileChange`.
- `src/lib/sveltekit/index.ts` (line 39) — replace the `GithubKeyEnv` re-export with `BackendEnv`.
- `examples/showcase/src/lib/cairn.config.ts` (line 164) — `backend:` literal → `githubApp({ … })`.
- `examples/showcase/src/lib/cairn.server.ts` — remove the dead `mintToken = 'dev-token'` stub and its
  `createCairnAdmin` pass-through (the dev double now rides `locals.backend`).
- The route tests and the github unit/fixture tests — see Task 2 Step 9 for the seam-accurate surface.

**Modified (Task 3, the dev double):**
- `packages/cairn-cms-dev/src/fake-github.ts` — a conforming `Backend` over the in-memory store; drop
  `installFakeGitHub` and the `fetch` patch.
- `packages/cairn-cms-dev/src/handle.ts` — `devBackendHandle` sets `event.locals.backend`.
- `packages/cairn-cms-dev/src/index.ts` — export the new dev-backend factory; drop `installFakeGitHub`.
- `.github/workflows/e2e.yml`, `.github/workflows/scaffold.yml` — update the dev-fence grep needles.

---

## Task 1: The `Backend` interface, `githubApp`, and the live implementation (additive, gates green)

**Files:**
- Create: `src/lib/github/backend.ts`
- Create: `src/tests/unit/github-backend.test.ts`
- Modify: `src/lib/index.ts` (add the new exports only; remove nothing yet)

**Interfaces:**
- Consumes: `readRaw`, `listMarkdown`, `commitFiles`, `FileChange` from `./repo.js`; `branchHeadSha`,
  `createBranch as createBranchRef`, `deleteBranch`, `listBranches` from `./branches.js`;
  `appCredentials`, `GithubKeyEnv` from `./credentials.js`; `cachedInstallationToken` from `./signing.js`;
  `RepoFile`, `CommitAuthor`, `CommitConflictError` from `./types.js`.
- Produces (the public surface later tasks rely on):

```ts
export interface Backend {
  readonly defaultBranch: string;
  readFile(path: string, ref: string): Promise<string | null>;
  readEntries(dir: string, ref: string): Promise<RepoFile[]>;
  branchHead(branch: string): Promise<string | null>;
  listBranches(prefix: string): Promise<string[]>;
  commit(branch: string, changes: FileChange[], author: CommitAuthor, message: string, expectedHead?: string): Promise<string>;
  createBranch(name: string, fromBranch: string): Promise<void>;
  deleteBranch(name: string): Promise<void>;
}
export interface BackendEnv { GITHUB_APP_PRIVATE_KEY_B64?: string }
export interface BackendProvider { readonly kind: string; readonly branch: string; connect(env: BackendEnv): Backend }
export interface GithubAppProvider extends BackendProvider {
  readonly kind: 'github-app';
  readonly owner: string; readonly repo: string; readonly appId: string; readonly installationId: string;
}
export function githubApp(config: { owner: string; repo: string; branch: string; appId: string; installationId: string }): GithubAppProvider;
```

- [ ] **Step 1: Add `expectedHead` to `commitFiles` (the one behavior change the impl needs).** In
  `src/lib/github/repo.ts`, give `commitFiles` an optional fifth parameter `expectedHead?: string`. When
  it is supplied, do a single attempt (no retry loop): read the head, throw `new CommitConflictError(
  \`\${repo.branch} (head moved)\`)` if `head !== expectedHead`, then create the tree and commit and PATCH
  the ref; on the ref 422 throw `CommitConflictError`. When it is absent, keep the existing retry loop
  verbatim, so every current 4-arg caller stays green. Add assertions to the existing
  `src/tests/unit/github-atomic-commit.test.ts` (where `commitFiles` is already exercised against
  `GithubDouble`) covering both paths: a matching head commits; a moved head throws `CommitConflictError`
  without retrying.

- [ ] **Step 2: Run the new `commitFiles` test, watch it fail, implement, watch it pass.**
  Run: `npx vitest run src/tests/unit/github-atomic-commit.test.ts -t expectedHead`
  Expected: FAIL, then PASS after the implementation.

- [ ] **Step 3: Write `backend.test.ts` (failing).** Cover: `githubApp(config)` returns a provider with
  `kind === 'github-app'`, `branch`, and the four identity fields; `connect(env)` returns a `Backend`
  whose `defaultBranch` is `config.branch`; `readFile` delegates to a `fetch` double the way `readRaw`
  does; `commit` delegates to the atomic Git Data sequence; `createBranch('x','main')` resolves main's
  head first (assert a `git/ref/heads/main` GET precedes the `git/refs` POST); `connect` with no
  `GITHUB_APP_PRIVATE_KEY_B64` throws the `appCredentials` `CairnError` on first token use. Model the
  `fetch` double on the existing github tests.

- [ ] **Step 4: Run it, verify it fails (module not found).**
  Run: `npx vitest run src/tests/unit/github-backend.test.ts`
  Expected: FAIL.

- [ ] **Step 5: Implement `src/lib/github/backend.ts`.** Define the interfaces above. Export
  `makeGithubBackend(config, getToken: () => string | Promise<string>): Backend` — an injectable token
  getter, not `env` directly. This is the test seam: `connect(env)` wires the production getter
  `() => cachedInstallationToken(appCredentials(config, env))`, and a unit test wires
  `() => 'test-token'` so the GitHub `Backend` still calls `fetch` and the existing `GithubDouble`
  intercepts it unchanged. The methods `await getToken()` and implement:
  - `defaultBranch: config.branch`
  - `readFile(path, ref)` → `readRaw({ ...config, branch: ref }, path, await token())`
  - `readEntries(dir, ref)` → `listMarkdown({ ...config, branch: ref }, dir, await token())`
  - `branchHead(branch)` → `branchHeadSha(config, branch, await token())`
  - `listBranches(prefix)` → `listBranches(config, prefix, await token())`
  - `commit(branch, changes, author, message, expectedHead?)` →
    `commitFiles({ ...config, branch }, changes, { message, author }, await token(), expectedHead)`
  - `createBranch(name, fromBranch)` → resolve `const head = await branchHeadSha(config, fromBranch,
    tok)`; if `head === null` throw `new CommitConflictError(\`\${fromBranch} (unreadable source)\`)` (a
    defined, catchable error the save path maps to its 500); else `createBranchRef(config, name, head, tok)`
  - `deleteBranch(name)` → `deleteBranch(config, name, await token())`
  `githubApp(config)` returns `{ kind: 'github-app', branch: config.branch, owner, repo, appId,
  installationId, connect: (env) => makeGithubBackend(config, () => cachedInstallationToken(appCredentials(config, env))) }`.

- [ ] **Step 6: Run the backend tests, verify they pass.**
  Run: `npx vitest run src/tests/unit/github-backend.test.ts src/lib/github/repo.test.ts`
  Expected: PASS.

- [ ] **Step 7: Add the new exports (additive).** In `src/lib/index.ts`, add
  `export { githubApp } from './github/backend.js';` and
  `export type { Backend, BackendProvider, GithubAppProvider, BackendEnv } from './github/backend.js';`
  and `export type { FileChange } from './github/repo.js';`. Remove nothing yet, so the barrel still
  exports `BackendConfig`/`RepoRef`/`AppCredentials`/`GithubKeyEnv` and the build stays green.

- [ ] **Step 8: Full gate.**
  Run: `npm run check && npm test`
  Expected: `check` 0/0; `npm test` exit 0.

- [ ] **Step 9: Commit.**

```bash
git add src/lib/github/backend.ts src/tests/unit/github-backend.test.ts src/lib/github/repo.ts src/tests/unit/github-atomic-commit.test.ts src/lib/index.ts
git commit -m "feat(backend): add the Backend interface and githubApp provider

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: The atomic compile unit — migrate every consumer to `Backend` (gates green only at the end)

**Execution note:** main-loop-led (the 3c pattern). The main loop migrates the engine modules in
lockstep; the mechanical route/unit test migration is dispatched to `cairn-implementer` with a
transcription-level semantic spec once the engine compiles. **This task does not gate green until the
final step**; intermediate `check` runs will report errors as consumers are migrated.

**Files:** all "Modified (Task 2)" files above.

**Interfaces:**
- Consumes: `Backend`, `BackendProvider`, `GithubAppProvider`, `githubApp` from Task 1.
- Produces: `runtime.backend: BackendProvider`; every helper takes `backend: Backend` where it took
  `(repo: RepoRef, token: string)`; route handlers resolve
  `const backend = (event.locals as { backend?: Backend }).backend ?? runtime.backend.connect(env)`.

- [ ] **Step 1: Retype the adapter and runtime.** In `src/lib/content/types.ts`, remove `BackendConfig`
  and change `CairnAdapter.backend` to `backend: BackendProvider` (import the type). Update the
  `CairnRuntime.backend` type and `composeRuntime` so `runtime.backend` is the `BackendProvider`
  (carried through unchanged; it is already a single mapping site).

- [ ] **Step 2: Add the per-handler resolve + thread `Backend` through `content-routes.ts`.** At the top
  of each handler that uses the backend, replace `const token = await mintToken(env)` and the
  `(runtime.backend, …, token)` calls with one resolve
  `const backend = (event.locals as { backend?: Backend }).backend ?? runtime.backend.connect(event.platform?.env ?? {})`,
  then call `backend.readFile(path, ref)`, `backend.readEntries(dir, ref)`, `backend.branchHead(branch)`,
  `backend.listBranches(prefix)`, `backend.commit(branch, changes, author, message[, expectedHead])`,
  `backend.createBranch(name, from)`, `backend.deleteBranch(name)`. Reads that targeted `runtime.backend`
  (main) pass `backend.defaultBranch` as the ref; cross-branch reads pass the branch name. Remove
  `mintToken` and the `appCredentials`/`GithubKeyEnv` imports from this module; remove `mintToken` from
  `ContentRoutesDeps` and add an optional `backend?: Backend` test seam that, when present, replaces the
  `locals.backend ?? connect` resolve.

- [ ] **Step 3: Preserve the save path's unreadable-default-branch 500.** Where the save path created the
  pending branch, keep a `const mainHead = await backend.branchHead(backend.defaultBranch)` read (it
  distinguishes a first save from a re-save), and on `mainHead === null` throw the existing 500 "Cannot
  read the default branch". Call `backend.createBranch(pendingBranch, backend.defaultBranch)` for the
  create; its thrown `CommitConflictError` on an unreadable source is the backstop.

- [ ] **Step 4: Migrate both `commitFile` callers and keep their conflict detection.** There are two:
  `nav-routes.ts:130` (navSave) and `content-routes.ts:2854` (settingsSave). For each, replace
  `commitFile(...)` with `const head = await backend.branchHead(backend.defaultBranch)` then
  `await backend.commit(backend.defaultBranch, [{ path, content }], author, message, head ?? undefined)`,
  and keep the existing `catch (err) { if (isConflict(err)) … reload-and-reapply prompt }` branch
  unchanged: a moved head now throws `CommitConflictError` via `expectedHead`, preserving the prompt.
  In `nav-routes.ts` also drop `NavRoutesDeps.mintToken`, add the `backend?` test seam plus the
  `locals.backend ?? runtime.backend.connect(env)` resolve at the top of navSave, and remove the
  `appCredentials`/`cachedInstallationToken`/`GithubKeyEnv` imports.

- [ ] **Step 5: Migrate the four cross-branch helpers.** Change `media/usage.ts`,
  `media/rewrite-plan.ts`, `content/reference-index.ts`, and `content/advisories.ts` to take
  `backend: Backend` in place of `(repo: RepoRef, token: string)`, calling
  `backend.readFile`/`backend.readEntries` with the explicit branch ref each already iterates. Update
  their callers in `content-routes.ts` to pass `backend`. (`media/naming.ts` has no backend coupling;
  leave it.)

- [ ] **Step 6: Migrate `cairn-admin.ts` and `health.ts`.** `cairn-admin.ts` makes no backend call: just
  retype its `AdminEvent` env generic to `BackendEnv`, delete the `mintToken` field on `AdminDeps`
  (line 47) and its two pass-throughs (lines 86, 92). `health.ts` narrows the provider:
  `if (runtime.backend.kind === 'github-app') { … signingSelfTest(runtime.backend.appId, key) … }`,
  leaving a non-github provider with no signing self-test.

- [ ] **Step 7: Narrow the build-time and doctor readers.** In `src/lib/vite/index.ts` `adapterFactsSource`,
  guard the identity reads on `kind === 'github-app'` before reading `backend.owner`/`backend.repo`. In
  `doctor/checks-github.ts` and `doctor/index.ts`, read the identity off the narrowed provider; the doctor
  keeps its own uncached probe and does not call `connect`.

- [ ] **Step 8: Delete the retired primitives, retype the env generic, and update both barrels.** Delete
  `commitFile` and `fileSha` from `repo.ts`. Rename `GithubKeyEnv` to `BackendEnv` at its definition in
  `credentials.ts` (or define `BackendEnv` and alias). Retype every `EventBase<GithubKeyEnv>` usage
  (`ContentEvent` at `content-routes.ts:305`, and the `AdminEvent` env generic) to `BackendEnv`. In
  `src/lib/index.ts` remove `BackendConfig`, `RepoRef`, `AppCredentials`; keep
  `CommitConflictError`/`isConflict`/`RepoFile`/`CommitAuthor`; add `Backend`/`BackendProvider`/
  `GithubAppProvider`/`BackendEnv`/`githubApp`/`FileChange` (already added in Task 1 step 7, keep). In
  `src/lib/sveltekit/index.ts:39` replace the `GithubKeyEnv` re-export with `BackendEnv` (the
  `ContentRoutesDeps` env-typed members are why it is published from the subpath).

- [ ] **Step 9: Migrate the showcase consumer.** In `examples/showcase/src/lib/cairn.config.ts:164`,
  change `backend: { owner, repo, branch, appId, installationId }` to
  `backend: githubApp({ owner: 'showcase', repo: 'demo', branch: 'main', appId: '1', installationId: '2' })`
  (import `githubApp`). In `examples/showcase/src/lib/cairn.server.ts`, delete the
  `let mintToken … = async () => 'dev-token'` stub and drop `mintToken` from the `createCairnAdmin(runtime,
  { mintToken, anthropic })` call; the dev double now rides `locals.backend` via `devBackendHandle`.

- [ ] **Step 10: Migrate the tests (the dominant workstream; dispatch to `cairn-implementer`).** The real
  test seam is `src/tests/unit/_github-double.ts`, a stateful `fetch`-level double installed by
  `vi.stubGlobal('fetch', …)` and imported by ~27 test files, NOT `deps.mintToken`. Because the GitHub
  `Backend` still calls `fetch`, `GithubDouble` keeps working underneath the interface. The migration:
  - **Keep `GithubDouble` and `_github-double.ts` as-is** (it lives below the Backend seam).
  - **The ~21 route tests** that inject `deps.mintToken` AND install `GithubDouble`: replace the
    `deps.mintToken = () => 'token'` line with `deps.backend = makeGithubBackend(testRepoConfig, () =>
    'test-token')` (import `makeGithubBackend`). The `GithubDouble.install()` and every fetch-URL
    assertion stay unchanged, because `makeGithubBackend` fetches the same URLs.
  - **The 4 cross-branch helper tests** (`media-usage`, `media-rewrite-plan`, `reference-index`,
    `advisories`) that drive a literal token through `GithubDouble` with no `mintToken`: change the
    helper call from `(repo, token, …)` to `(makeGithubBackend(repo, () => token), …)`. `GithubDouble`
    stays.
  - **The github unit tests:** remove the `commitFile`/`fileSha` cases from `github-commit.test.ts` and
    `github-read.test.ts` (functions deleted); rework or retire `github-credentials.test.ts` and
    `github-types.test.ts` (they construct the removed `BackendConfig`/`RepoRef` — fold the
    `appCredentials` case into `github-backend.test.ts`); `github-double.test.ts`,
    `github-branches.test.ts`, `github-atomic-commit.test.ts`, `github-signing.test.ts`,
    `github-token-cache.test.ts` keep testing the unchanged internals.
  - **Compose/adapter fixtures** that build a `backend` object literal (`compose.test.ts`,
    `content-compose.test.ts`, and any `_content-fixture`) call `githubApp(...)` instead.
  Dispatch with this concrete file list; the implementer reports (not silently fixes) any apparent
  engine defect, per the dispatch-and-verify rule.

- [ ] **Step 11: Full gate (the single green checkpoint).**
  Run: `npm run check && npm test && npm run check:comments`
  Expected: `check` 0/0; `npm test` exit 0; comments clean.

- [ ] **Step 12: Commit.** Remove the stray untracked `examples/showcase/.claude/` first (or gitignore
  it); commit an explicit file list, never `git add -A` (repo convention).

```bash
git rm -r --cached --ignore-unmatch examples/showcase/.claude 2>/dev/null; rm -rf examples/showcase/.claude
git add src/lib examples/showcase/src/lib/cairn.config.ts examples/showcase/src/lib/cairn.server.ts src/tests
git commit -m "feat(backend)!: route the engine through the Backend interface

Consumers must: replace the backend object literal with githubApp({...}); drop
imports of BackendConfig/RepoRef/AppCredentials/GithubKeyEnv (use BackendEnv).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: The dev double becomes a conforming `Backend`

**Files:**
- Modify: `packages/cairn-cms-dev/src/fake-github.ts`, `packages/cairn-cms-dev/src/handle.ts`,
  `packages/cairn-cms-dev/src/index.ts`
- Modify: `packages/cairn-cms-dev/src/fake-github.test.ts`, `packages/cairn-cms-dev/src/index.test.ts`,
  `packages/cairn-cms-dev/src/handle.test.ts`
- Modify: `.github/workflows/e2e.yml`, `.github/workflows/scaffold.yml`

**Interfaces:**
- Consumes: `type { Backend, FileChange }` from `@glw907/cairn-cms`.
- Produces: a `createDevBackend(): Backend` (or equivalent factory) over the module-level in-memory store;
  `devBackendHandle` sets `event.locals.backend = createDevBackend()`.

- [ ] **Step 1: Rewrite `fake-github.ts` as a `Backend`.** Keep the module-level branch-aware store, the
  `lastCommit` recorder, and the `committedFile`/seed accessors the `/test/*` routes read. Replace the
  `installFakeGitHub` fetch-patch with `createDevBackend(): Backend` whose seven methods operate on the
  store directly: `readFile`/`readEntries` read the named branch's tree; `branchHead` returns the branch's
  head or null; `listBranches` filters by prefix; `commit` snapshots the tree, applies the changes
  (rejecting an empty change set, honoring `expectedHead` as a head-equality conflict), records
  `lastCommit`, advances the head; `createBranch` snapshots the source branch; `deleteBranch` drops it.
  `defaultBranch` is the seeded main.

- [ ] **Step 2: Update the dev-package tests.** Rewrite `fake-github.test.ts` to drive the `Backend`
  methods directly (no `fetch`), asserting the publish-workflow branch semantics it asserted before plus
  the empty-set rejection and the `expectedHead` conflict. In `index.test.ts`, swap the
  `installFakeGitHub` re-export assertion for `createDevBackend`. In `handle.test.ts`, drop the
  fetch-snapshot/restore `beforeEach`/`afterEach` (createDevBackend mutates no global) and assert that
  `devBackendHandle` sets `event.locals.backend` rather than patching `fetch`.

- [ ] **Step 3: Wire `devBackendHandle`.** In `handle.ts`, drop the `installFakeGitHub()` call and set
  `event.locals.backend = createDevBackend()` on the `/admin` and `/media` paths it already augments
  (construct the backend once at handle-build time so it shares the singleton store across requests).
  Seed content/media as today.

- [ ] **Step 4: Update `index.ts` and the dev-fence needles.** Export `createDevBackend`; drop the
  `installFakeGitHub` export. In `e2e.yml:33` and `scaffold.yml:39`, edit the grep needle list: remove
  `-e 'installFakeGitHub'`, add `-e 'createDevBackend'` and `-e 'committedFile'` (the dev-only recorder
  accessor, closing the asymmetry with `lastRecordedCommit`). The grep target stays the deployable
  `.svelte-kit/cloudflare` output (not `.svelte-kit/output`), per the
  `cairn-dev-backend-build-elimination` memory. Keep `devBackendHandle`, `cairn-cms-dev`,
  `lastRecordedCommit`, `editor@showcase.test`, `sk-showcase-stub`, and the fake-binding needles.

- [ ] **Step 5: Gate the dev package.**
  Run: `npm --prefix packages/cairn-cms-dev test` (or the workspace test) and `npm run check`.
  Expected: PASS; `check` 0/0.

- [ ] **Step 6: Commit.**

```bash
git add packages/cairn-cms-dev .github/workflows/e2e.yml .github/workflows/scaffold.yml
git commit -m "feat(dev): make the dev backend a conforming Backend, retiring the fetch patch

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Release — dist, e2e, version, docs, tracking

**Files:**
- Modify: `package.json` (version), `src/lib/index.ts` self-version if present, the root lockfile
  self-version, `CHANGELOG.md`, `docs/guides/upgrade-cairn.md`, the backend reference page, the adapter
  reference, the dev-package guide/README, `docs/STATUS.md`, `ROADMAP.md`, the memory.

- [ ] **Step 1: Simplify.** Dispatch `code-simplifier:code-simplifier` over the code changed this pass;
  review and apply refinements.

- [ ] **Step 2: Reviewer fan-out (workflow).** Run the pass-end adversarial review (a find→verify
  workflow) across the lenses this pass touches: `cloudflare-workers-reviewer` (the Worker token/commit
  path), `web-auth-security-reviewer` (the dev-fence bypass and the token mint), `svelte-reviewer`
  (any `.svelte`/load changes), and a dev-fence-elimination lens. Fold confirmed findings before release.

- [ ] **Step 3: Dist rebuild + from-scratch consumer e2e.** Run `npm run package`; then force a
  from-scratch showcase build (`rm -rf examples/showcase/{node_modules,package-lock.json}`, fresh install,
  `npm run build`) and the Playwright e2e, which must exercise the create → save → publish round-trip
  through the new interface. Green is the gate.

- [ ] **Step 4: Version bump to 0.74.0.** Bump `package.json`, sync the root lockfile self-version (the
  `check:version` gate misses it and CI `npm ci` needs it), and the showcase committed lockfile cairn
  version.

- [ ] **Step 5: Docs.** Write/refresh the backend reference page (the `Backend`/`BackendProvider`/
  `githubApp` surface), update the adapter reference for the `backend: githubApp(...)` field, update the
  dev-package guide/README for the conforming backend, and add the changelog + upgrade-guide entries with
  a `Consumers must:` line per removed export and for the `backend` field. Run all four doc gates
  (`check:reference`, `check:reference:signatures`, `check:package`, `check:docs`) and `check:comments`.
  Grep `docs/` and `README.md` for `BackendConfig`/`RepoRef`/`AppCredentials`/`GithubKeyEnv` and repoint
  or rewrite every hit.

- [ ] **Step 6: Tracking.** Append the post-mortem to this plan file. Update `docs/STATUS.md` (on `main`
  at merge) with the shipped state and the next action (render-as-component + islands, phase 4). Prune the
  ROADMAP of anything this pass shipped. Refresh the `cairn-site-contract-v2-opportunity` memory.

- [ ] **Step 7: Release commit.** Stage the explicit release surface (version files, docs, STATUS,
  ROADMAP), not `git add -A`.

```bash
git add package.json package-lock.json examples/showcase/package-lock.json CHANGELOG.md docs ROADMAP.md
git commit -m "chore(release): cairn-cms 0.74.0 (Contract v2 backend seam)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-review notes

- **Spec coverage:** the interface (Task 1), the provider + identity facts (Task 1 + Task 2 step 7), the
  per-request resolve (Task 2 step 2), the non-request readers (Task 2 steps 6-7), the public-surface
  break + both barrels + env-generic retype (Task 2 step 8), the showcase consumer (Task 2 step 9), the
  nav and settings conflict preservation (Task 1 step 1 + Task 2 step 4), the seam-accurate test
  migration (Task 2 step 10), the dev double (Task 3), the dev-fence needle delta (Task 3 step 4), and
  the release/docs (Task 4) each map to a step.
- **Review folded (2026-06-27):** a 28-agent find→verify over this plan confirmed 20 findings (9 major,
  0 blocker), all incorporated above. The dominant correction: the real test seam is the fetch-level
  `GithubDouble`, not `deps.mintToken`; the injectable token getter on `makeGithubBackend` keeps the
  doubles working, making the migration a `deps.backend` swap rather than a 27-file fetch-script rewrite.
- **No second backend impl, no `query()`, media unchanged, auth unchanged** — honored by construction.
- **Type consistency:** `connect(env: BackendEnv)`, `commit(..., expectedHead?)`, `kind: 'github-app'`,
  and `readEntries`/`readFile` names are used identically across Tasks 1-3.

---

## Post-mortem (2026-06-27)

**Shipped** as 0.74.0 (held unpublished; window 0.69.0-0.74.0) on branch `contract-v2-backend-seam`
off the 3c tip. The GitHub-App config blob is now a `Backend` interface with a `githubApp(...)`
provider, every engine consumer resolves one live `Backend` per request, and the dev double is a
conforming `Backend` on `event.locals.backend` rather than a global-`fetch` monkeypatch.

**Built, in order:**
- Task 1 (additive, `2579fce`): the `Backend`/`BackendProvider`/`GithubAppProvider`/`BackendEnv`
  interfaces, `githubApp()`, and `makeGithubBackend(config, getToken)` with an injectable token getter.
  `commitFiles` gained an optional `expectedHead` (refactored into `commitOnTree`/`commitOnHead`), the
  fail-closed single-attempt guard. Gated green alone.
- Task 2 (the atomic compile unit, `3615bd3`): retyped the adapter/runtime `backend` to
  `BackendProvider`, added `resolveBackend(event)` and rewired ~50 backend call sites in
  `content-routes.ts` plus `nav-routes.ts`, migrated the 4 cross-branch helpers to take a `Backend`,
  narrowed the three non-request readers on `kind === 'github-app'` (added the `isGithubApp` guard),
  deleted `BackendConfig`/`RepoRef`/`AppCredentials`/`commitFile`/`fileSha`/`mintToken`, renamed
  `GithubKeyEnv`→`BackendEnv`, migrated the showcase, and migrated ~40 test files. One green checkpoint.
- Task 3 (the dev double, `97044cf`): `fake-github.ts` became `createDevBackend(): Backend` over the
  kept module-level store; `devBackendHandle` sets `locals.backend`; the `fetch` patch is gone; the
  dev-fence grep needles updated (drop `installFakeGitHub`, add `createDevBackend`/`committedFile`).
- Release: `code-simplifier` unified a duplicate `BackendEnv` (one refinement). The pass-end reviewer
  fan-out (Cloudflare-Workers, web-auth-security, dev-fence, public-surface) confirmed 6 findings, all
  minor; the load-bearing fixes folded: read the branch head BEFORE the config content in
  nav/settings (closing a same-file silent-overwrite window), and typed `event.locals.backend` on
  `EventBase` and the ambient `App.Locals` so the dev channel is a checked contract.

**Verified:** `npm run check` 0/0 throughout, `npm test` exit 0 (2712), `check:comments` + all four doc
gates + `check:version` (minor → 0.74.0), the four-lens reviewer fan-out, and the from-scratch consumer
e2e (the publish round-trip exercises save/branch/publish through the new interface).

**Durable lessons:**
1. **The two adversarial reviews paid off again, both-necessary.** The spec review (18 findings) forced
   the provider to expose the GitHub App identity facts for the three non-request readers (vite
   adapterFacts, health signing self-test, doctor) and added `branchHead()` the sketch omitted. The
   plan review (20 findings) caught that the real test seam is the fetch-level `GithubDouble`, not
   `deps.mintToken` — which turned a feared 27-file fetch-script rewrite into a `deps.backend` swap via
   the injectable token getter on `makeGithubBackend`, because the GitHub `Backend` still calls `fetch`
   underneath the interface. Then the pass-end fan-out caught a same-file silent-overwrite window the
   18+20 findings, the implementers, and 2712 tests all missed.
2. **The fetch double lives BELOW the Backend seam, so it survives the migration untouched.** This is
   the key that made the test migration cheap: a test injects `deps.backend = makeGithubBackend(repo,
   () => 'test-token')` and the existing `GithubDouble.install()` and every fetch-URL assertion keep
   working. The corollary: the `commitFiles` retry-loop 422 branch stays under-tested because the
   double never simulates a non-fast-forward; that is a pre-existing gap, carried forward, not
   introduced here.
3. **A lazy token mint behind the seam collapses the two load-degrade tiers.** The list and media-library
   loads previously split a token-mint failure from a read failure; the mint is now lazy inside the
   first read, so both become one degrade. Documented in the changelog as a no-action behavior note.
4. **Type the per-request injection channel.** `event.locals.backend` started as an inline structural
   cast on both the engine read and the dev write; a mis-key would silently fall through to the real
   provider. Typing it on `EventBase.locals` (engine) and the ambient `App.Locals` (consumers) makes
   the dev-fence channel a checked contract. The engine's structural event types do NOT see the global
   `App.Locals` augmentation, so the field had to be added to `EventBase` directly, not only ambient.

**Carry-forwards (filed to ROADMAP):**
- The `commitFiles` retry-loop 422 branch is under-tested: the `GithubDouble` does not enforce
  fast-forward, so a test cannot drive a non-fast-forward retry. Enhancing the double (and adding a
  concurrency-injection hook) is its own small test-debt task.
- The dev double's `commit` rejects an empty change set with the literal `commitFiles: no changes to
  commit` string; if that real-side message ever changes, the double must track it.

**Next:** the render seam and islands (Contract v2 phase 4), the last and newest surface. No plan yet;
brainstorm scope first.
