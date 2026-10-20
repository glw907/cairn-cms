# Cairn site contract v2: the backend seam

Status: design draft, 2026-06-27. The phase-3-backend companion to the umbrella design at
`2026-06-25-cairn-contract-v2-design.md` (§"The backend seam"). This spec supersedes that section's
interface sketch where the two disagree, because it is grounded in the engine as it stands after phase
3c, and the sketch was written before that contact with the code. Written to the Google developer
documentation style.

This is the next phase after 3c (field-system unification, shipped held as 0.73.0). It turns the
GitHub-App config blob into a `Backend` interface with a `githubApp(...)` default, and reshapes the
local-development double from a `fetch` interceptor into a conforming implementation. It is breaking
within 0.x: a consumer's `backend` field changes from a plain object to a `githubApp({ ... })` call.
The held window absorbs it.

## Why this phase exists

The engine has no backend interface today. It has free functions in two modules, `github/repo.ts`
(`listMarkdown`, `readRaw`, `fileSha`, `commitFile`, `commitFiles`) and `github/branches.ts`
(`branchHeadSha`, `createBranch`, `deleteBranch`, `listBranches`). Every one takes `(repo: RepoRef,
…, token: string)`. The `repo` is the adapter's `BackendConfig` blob, a different branch is reached by
spreading `{ ...runtime.backend, branch: name }`, and the installation token is minted per request
handler and threaded by hand through every call across about twelve consumer modules.

Two payoffs justify the work, one concrete and one structural.

The concrete payoff is the dev double. `@glw907/cairn-cms-dev`'s `fake-github.ts` is not a conforming
backend. It monkeypatches global `fetch`, intercepts `api.github.com` URLs by reconciling against the
exact URL shapes in `repo.ts` and `branches.ts`, and keeps an in-memory branch-aware repo behind that
intercept. The module's own header documents the fragility. The umbrella design names this precisely:
the dev package exists as a `fetch` hack only because there is no interface to slot a local store
behind. An interface retires the hack.

The structural payoff is the shape. A `Backend` interface that GitLab, Gitea, or plain git can
implement later means a new store never touches the engine. The interface is the constraint that keeps
the store swappable, and it is also the constraint that keeps a database out: `Backend` is read,
commit, and branch operations over files, and it never grows a `query()` method. That line is the
direct lesson from TinaCMS, whose queryable backend forced a runtime database.

## What this phase deliberately doesn't do

- **No second backend implementation.** `githubApp(...)` is the only store a production site needs.
  GitLab, Gitea, and plain git are admitted by the interface and built when a real site needs one, not
  before.
- **No `query()`, ever.** Cross-entry search, sort, and filter stay build-time over the committed
  manifest. The interface is files in and files out.
- **No change to media.** Media stays in R2 through the `media` adapter group, a separate store from
  the content git backend. This phase touches the content backend only.
- **No change to auth.** The dev double's owner-session bypass and the three-layer dev fence are
  unchanged. The interface tidies the content store; it does not relax any gating.

## The `Backend` interface

`Backend` is the live, connected object: a store pinned to a default branch, with a minted token (for
the GitHub implementation) already behind it. The engine holds one per request.

```ts
interface Backend {
  /** The site's default branch, e.g. "main". Callers reading published state pass this as the ref. */
  readonly defaultBranch: string;

  /** Raw file contents at a ref, or null when the path does not exist. (Was readRaw.) */
  readFile(path: string, ref: string): Promise<string | null>;

  /** The markdown entries directly in a concept directory at a ref, newest id first. (Was listMarkdown.) */
  readEntries(dir: string, ref: string): Promise<RepoFile[]>;

  /** A branch's head commit sha, or null when the branch does not exist. (Was branchHeadSha.) */
  branchHead(branch: string): Promise<string | null>;

  /** Branch names under a prefix, sorted. (Was listBranches.) */
  listBranches(prefix: string): Promise<string[]>;

  /** Commit a set of path changes atomically on a branch; returns the new commit sha. (Was commitFiles.)
   *  When `expectedHead` is given, the commit is fail-closed: it does not retry on a moved head and
   *  throws CommitConflictError if the branch head is not `expectedHead`. Omitting it keeps the
   *  head-merge retry the entry and publish paths rely on. */
  commit(
    branch: string,
    changes: FileChange[],
    author: CommitAuthor,
    message: string,
    expectedHead?: string,
  ): Promise<string>;

  /** Create a branch at another branch's head. (Was createBranch, which took a resolved sha.) */
  createBranch(name: string, fromBranch: string): Promise<void>;

  /** Delete a branch; a missing branch is success. (Was deleteBranch.) */
  deleteBranch(name: string): Promise<void>;
}
```

`RepoFile`, `FileChange`, `CommitAuthor`, and `CommitConflictError` keep their current shapes and move
under the backend module. The commit path still throws `CommitConflictError` on a lost sha race, and
`isConflict` still matches it across the bundling boundary.

### Where this differs from the umbrella sketch, and why

Each delta is forced by the code, not a preference.

- **`publish()` is not a method.** The sketch listed `publish(fromBranch, toBranch)`. The real
  `publishAction` is content-aware orchestration: it computes the `FileChange[]` (the entry file plus
  every manifest row upsert), runs an address-collision advisory, commits onto the default branch, logs
  `entry.published`, then deletes the pending branch only when its head still matches the sha the action
  read. None of that is a generic branch-to-branch merge. Publish stays engine orchestration over
  `commit` and `deleteBranch`. Keeping it out holds the "read, commit, branch over files" line that
  keeps a database out.
- **`readFile` returns `string | null`, not `RepoFile`.** A read feeds the editor raw markdown.
  `RepoFile` (`{ id, name, path }`) is the listing shape `readEntries` returns, not a single read.
- **`branchHead()` is added.** The sketch omitted it, but pending-state detection (editLoad probes
  whether a `cairn/<concept>/<id>` branch exists) and the publish delete-guard (delete only when the
  head is unmoved) both need a branch's head sha.
- **`createBranch` takes a source branch, not a sha.** The current free function takes a resolved
  `fromSha` the caller fetches first. Moving the head resolution inside `createBranch` removes a caller
  round-trip and matches the interface's by-name vocabulary. The save path's current explicit failure
  when the default branch is unreadable (a `null` head becomes a 500 "Cannot read the default branch")
  must survive: `createBranch` throws a defined error when `fromBranch` has no head, and the save path
  keeps its `branchHead(defaultBranch)` read (it needs the head anyway to tell a first save from a
  re-save) and maps a null to that same 500.
- **`commitFile` (single, contents API) is retired into `commit`.** The single-file YAML write the nav
  editor uses goes through the batch path. This needs care, because the contents-API path the nav editor
  uses today **detects** a same-file race: it passes the file's sha, a concurrent write to the same nav
  config returns a 409, and the editor is told to reload and reapply. The batch path's head-merge retry
  does **not** reproduce that: it rebuilds the tree on the new head and re-commits the editor's
  stale-based content, so a same-file race would be a silent last-writer-wins, a regression on a write
  that lands on the default branch and triggers a deploy. The fix is the optional `expectedHead` on
  `commit`: the nav save reads the branch head, passes it, and a moved head fails closed with
  `CommitConflictError`, preserving the existing reload-and-reapply prompt. The guard is head-based
  rather than file-sha-based, so it is slightly stricter (a concurrent commit to an unrelated path also
  trips it), which is safe and acceptable for the owner-only, low-concurrency nav edit. The entry and
  publish paths omit `expectedHead` and keep the merge-retry.
- **`ref` is required on reads, and a read is always authenticated.** No implicit "current branch": the
  cross-branch usage index reads each open `cairn/*` branch by name, and an explicit ref means nothing
  reads the wrong branch by accident. The `token?` parameter `readRaw`/`listMarkdown` carry for
  anonymous public-repo reads is dropped; the token is always present behind `connect`. No build or
  delivery path reads token-less (the build is git-local), so this removes an unused degree of freedom.
- **The commit method preserves three behaviors `commitFiles` has today:** it rejects an empty change
  set (an empty commit would trigger a deploy for no content change), maps a 422 tree-create to
  `CommitConflictError`, and throws `CommitConflictError` after the retry budget. The in-memory double
  mirrors the empty-set rejection so the publish e2e exercises the same contract.

## Construction: a provider the adapter holds

The live `Backend` needs the Worker env (the GitHub implementation reads the private-key secret to mint
its token), so the adapter cannot hold a live `Backend` directly. It holds a provider that connects to
one given the env.

```ts
interface BackendProvider {
  /** A stable tag for the implementation, e.g. "github-app". The non-request readers narrow on it. */
  readonly kind: string;
  /** The default branch, surfaced before connect() so compose-time code can read it. */
  readonly branch: string;
  /** Connect to a live Backend. The GitHub implementation mints and caches its token lazily; an
   *  in-memory implementation ignores env. */
  connect(env: BackendEnv): Backend;
}

/** The secret carrier connect() reads. Reuses GithubKeyEnv's shape; the in-memory backend ignores it. */
interface BackendEnv {
  GITHUB_APP_PRIVATE_KEY_B64?: string;
}

/** What githubApp() returns: the generic provider plus the GitHub App's non-secret identity facts. */
interface GithubAppProvider extends BackendProvider {
  readonly kind: 'github-app';
  readonly owner: string;
  readonly repo: string;
  readonly appId: string;
  readonly installationId: string;
}

function githubApp(config: {
  owner: string;
  repo: string;
  branch: string;
  appId: string;
  installationId: string;
}): GithubAppProvider;
```

The adapter's `backend` field changes from a plain `{ owner, repo, branch, appId, installationId }`
object to `backend: githubApp({ ... })`, a one-line consumer change. `appId` and `installationId` stay
non-secret config carried in the adapter source; the private key stays the Worker secret, read inside
`connect` (and never in the adapter), keeping `appCredentials`' missing-secret `CairnError` contract.
`composeRuntime` carries the provider as `runtime.backend`, typed `BackendProvider`.

`connect(env)` is cheap: it returns a `Backend` whose methods mint the installation token on first use
and reuse the existing module-level token cache (`cachedInstallationToken`). The cache and the RS256
signing path are unchanged; they move behind the interface, not away. The token cache stays keyed by app
identity, so a per-request `connect` re-signs only on a cache miss, not on every call.

The provider exposes the GitHub App's non-secret identity (`owner`, `repo`, `appId`, `installationId`)
because three readers outside the request path need it, covered next. These fields are inherently
GitHub-specific; a future `gitlab(...)` or `gitea(...)` returns its own provider type with its own
identity, and the GitHub-aware readers narrow on `kind === 'github-app'` before reading them.

The doctor does **not** call `connect`. It keeps its own three-stage uncached reachability probe; what
it shares with the provider is the identity config surface and the underlying signing path, not the live
`Backend`. The earlier claim that the provider shape "serves the doctor" overstated the fit; the honest
relationship is the shared config surface.

## How the engine reaches the backend

Every backend call is admin-request-time. The build and delivery path is git-local: it reads the
working tree and the committed manifest, and never calls the backend. So one injection point per
request handler covers the whole surface.

At the top of each handler the engine resolves the backend once:

```ts
const backend = (event.locals as { backend?: Backend }).backend ?? runtime.backend.connect(env);
```

The helper modules that build cross-branch indexes (`media/usage.ts`, `content/reference-index.ts`,
`content/advisories.ts`, `media/rewrite-plan.ts`) take a `Backend` parameter instead of the
`(repo, token)` pair. The hand-threaded token disappears: it lives inside the `Backend` now.

This collapses the test seam too. Today a route test stubs `deps.mintToken`, a `fetch` double, and the
RS256 signer. With the interface, a test injects a fake `Backend` and asserts against it. The
`deps.mintToken` injection is replaced by a `deps.backend` (or `locals.backend`) injection.

`App.Locals` is the consumer's type, so the engine reads `locals.backend` structurally and optionally
(`(event.locals as { backend?: Backend }).backend`). A production consumer never sets it and never
declares it; only the dev double does. This keeps the consumer's type surface unchanged.

`devBackendHandle` sets `locals.backend` only on the paths it already augments (`/admin` and `/media`),
which are exactly the paths that call the backend. On any other path `locals.backend` is absent and the
engine would fall back to `runtime.backend.connect(env)`, but no other path calls the backend, so the
narrowing from the old blanket `fetch` patch to per-path injection is behavior-preserving. This is the
one place the design trades the patch's global reach for explicit injection, and the trade is sound
because the backend's call surface is confined to those two route trees.

## Non-request readers of the backend identity

Three readers touch the backend identity outside a request, where `locals.backend` cannot reach. Each
is a GitHub-specific diagnostic, so each narrows on `kind === 'github-app'` and reads the provider's
identity fields:

- **The build-time adapter facts.** `vite/index.ts`'s `adapterFactsSource` evaluates the adapter in a
  virtual module at build time and reads `backend.owner` and `backend.repo` to feed the doctor's
  zero-config repo derivation. It reads them off the `GithubAppProvider` after the kind narrow.
- **The signing self-test.** `sveltekit/health.ts` calls `signingSelfTest(runtime.backend.appId, key)`
  to verify the PKCS#1-to-PKCS#8 conversion. It reads `appId` off the narrowed provider; the self-test
  stays where it is, fed by the provider's `appId` and the env secret.
- **The doctor's GitHub check.** It reads the identity config surface the same way, narrowing on kind.

Folding the identity onto the provider, rather than hiding it, is what keeps these three compiling under
the zero-warning `check` gate without a separate config object.

## Public surface and the breaking export change

The current public barrel (`src/lib/index.ts`) exports `BackendConfig`, and re-exports `RepoRef`,
`RepoFile`, `CommitAuthor`, `AppCredentials`, and `CommitConflictError` from `github/types`, plus
`GithubKeyEnv` from the sveltekit subpath. This phase changes that surface, a breaking export change the
changelog must carry:

- `BackendConfig` is removed; the adapter's `backend` field is a `BackendProvider` from `githubApp(...)`.
- `RepoRef` and `AppCredentials` become internal to the GitHub implementation and leave the barrel.
- `GithubKeyEnv` is replaced by `BackendEnv`.
- New exports: `Backend`, `BackendProvider`, `GithubAppProvider`, `BackendEnv`, `githubApp`, and the
  data types the interface names (`FileChange`, `RepoFile`, `CommitAuthor`, `CommitConflictError`,
  `isConflict`), all from the new backend module.

Each removal or rename gets a `Consumers must:` line: replace the `backend` object literal with the
`githubApp(...)` call, and drop any import of `BackendConfig`/`RepoRef`/`AppCredentials`/`GithubKeyEnv`.

## The dev double becomes a conforming backend

This is the phase's concrete payoff, and the part the dev fence governs.

`fake-github.ts` stops monkeypatching `fetch`. It becomes a `Backend` implementation over its existing
in-memory branch map: seven methods, no URL reconciliation, no global mutation. `defaultBranch` is the
seeded main. The branch-aware tree it already maintains for the publish workflow is exactly the state
the interface needs. The commit method mirrors the real one's empty-change-set rejection so the e2e
exercises the same contract.

The in-memory store, the `lastCommit` recorder, and the `committedFile` accessor the `/test/*` fixture
routes read stay **module-level process singletons**, as today. `connect()` returns a thin façade over
that one shared store, not a fresh per-request instance, so a commit on one request is visible to the
recorder route on the next. The dev `Backend` is the façade; the store is the singleton behind it.

`devBackendHandle()` constructs the in-memory `Backend` and sets `event.locals.backend`. It already
runs behind the three-layer fence (the build-foldable `dev` flag, the devDependency boundary, the
engine prod tripwire) when a consumer's `hooks.server.ts` dynamically imports the dev package. The
engine never names `@glw907/cairn-cms-dev`; the consumer's hooks owns that import, exactly as today. So
the dev-fence law holds unchanged: no static import of the dev backend reaches the engine or the
committed adapter, and the production build folds the whole branch out. The `cairn-dev-backend-build-
elimination` memory's rule (a single static import ships the whole bypass) is the constraint this design
is built to respect, and the `build/`-grep elimination check still proves it.

The owner-session bypass and the binding doubles (`AUTH_DB`, `MEDIA_BUCKET`) that `devBackendHandle`
supplies on `platform.env` are unchanged. The `Backend` rides the same per-request injection channel
they already use.

## Execution shape

One atomic compile unit, the 3b and 3c cutover pattern, because `check` is a zero-warning gate and
retyping the adapter `backend` field plus deleting the free functions breaks every consumer at once,
with no mid-migration green.

1. **Additive, gated alone.** Define `Backend`, `BackendProvider`, `BackendEnv`, `githubApp()`, and the
   live GitHub implementation that wraps today's `repo.ts` and `branches.ts` internals. Write the new
   tests red, make them green. Delete nothing yet, so the phase gates green at this step.
2. **The atomic unit, gated once.** Retype the adapter `backend` field to `BackendProvider`, carry the
   provider through `composeRuntime`, migrate all consumers and their tests from `(repo, token)` to the
   `Backend` object, add the `locals.backend` read, narrow the three non-request readers
   (`vite/index.ts`, `health.ts`, the doctor) on `kind`, update the public barrel (remove
   `BackendConfig`/`RepoRef`/`AppCredentials`/`GithubKeyEnv`, add the new exports), and retire
   `commitFile`, `fileSha`, and the `mintToken` threading. This is the wide step: the consumer modules
   are `content-routes.ts`, `nav-routes.ts`, `cairn-admin.ts`, `health.ts`, `media/usage.ts`,
   `media/rewrite-plan.ts`, `media/naming.ts`, `content/reference-index.ts`, `content/advisories.ts`,
   and `doctor/checks-github.ts`, plus the roughly thirty route tests that stub `deps.mintToken` and the
   github unit tests (the commit, atomic-commit, branches, read, and double fixtures) that must be
   rewritten or retired against the new interface. Gate once at the end.
3. **The dev double.** Rewrite `fake-github.ts` to a conforming `Backend`; `devBackendHandle` sets
   `locals.backend`; drop `installFakeGitHub` and the `fetch` patch. Update the dev-fence build-grep
   needle lists (`e2e.yml` and `scaffold.yml`) in lockstep: drop `installFakeGitHub` and add the names
   of the new dev-backend exports the conforming `Backend` introduces. The showcase e2e is the gate.
4. **Release.** Dist rebuild, from-scratch consumer build, the showcase publish round-trip e2e (the key
   gate, since it exercises save, branch, and publish through the new interface), the minor bump
   (breaking-within-0.x), the docs (the backend reference page, the adapter reference, the dev-package
   guide, the changelog and upgrade guide with a `Consumers must:` line per removed export and for the
   `backend` field), and STATUS, ROADMAP, and the memory.

The render seam and islands stay the separate, last phase (phase 4), unchanged by this one.

## Risks and the load-bearing checks

- **The dev fence.** The single biggest risk is a static import path that ships the dev backend to
  production. The design routes the dev backend through `locals.backend` set by the already-fenced
  `devBackendHandle`, so the engine never imports it. The `build/`-grep elimination check in the e2e
  workflow stays the proof.
- **The publish round-trip.** Publish is orchestration over `commit` and `deleteBranch`, and the
  sha-guarded delete depends on `branchHead` returning the same value the action read. An audit of all
  five lifecycle actions (single publish, publish-all, discard, rename, delete) confirmed none escapes
  the seven-method interface: publish-all's cross-branch entry read maps to `readFile(path, branchName)`,
  so the "read, commit, branch over files" line holds for the whole lifecycle. The from-scratch showcase
  e2e exercises create, save, and publish, so a regression here fails the release gate.
- **The cross-branch usage index.** It reads every open `cairn/*` branch with an explicit ref. The
  required `ref` parameter is the guard against a silent default-branch read that would under-count
  usage and let a delete proceed against a still-referenced asset.
- **The token cache.** Moving the mint behind `connect` must not change the cache's lifetime. The
  module-level `cachedInstallationToken` stays; `connect` reads it, so the per-process caching is
  unchanged and a per-request connect does not re-sign on every call.
