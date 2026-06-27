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

  /** Commit a set of path changes atomically on a branch; returns the new commit sha. (Was commitFiles.) */
  commit(branch: string, changes: FileChange[], author: CommitAuthor, message: string): Promise<string>;

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
  round-trip and matches the interface's by-name vocabulary.
- **`commitFile` (single, contents API) is retired into `commit`.** The single-file YAML write the nav
  editor uses goes through the batch path, which also upgrades it from the contents-API sha-409 to the
  Git Data head non-fast-forward retry, so a concurrent nav edit is preserved rather than lost.
- **`ref` is required on reads.** No implicit "current branch". The cross-branch usage index reads each
  open `cairn/*` branch by name, and an explicit ref means nothing reads the wrong branch by accident.

## Construction: a provider the adapter holds

The live `Backend` needs the Worker env (the GitHub implementation reads the private-key secret to mint
its token), so the adapter cannot hold a live `Backend` directly. It holds a provider that connects to
one given the env.

```ts
interface BackendProvider {
  /** A stable tag for the implementation, e.g. "github-app". For diagnostics and the doctor. */
  readonly kind: string;
  /** The default branch, surfaced before connect() so compose-time code can read it. */
  readonly branch: string;
  /** Connect to a live Backend. The GitHub implementation mints and caches its token lazily; an
   *  in-memory implementation ignores env. */
  connect(env: BackendEnv): Backend;
}

function githubApp(config: {
  owner: string;
  repo: string;
  branch: string;
  appId: string;
  installationId: string;
}): BackendProvider;
```

The adapter's `backend` field changes from a plain `{ owner, repo, branch, appId, installationId }`
object to `backend: githubApp({ ... })`, a one-line consumer change. `appId` and `installationId` stay
non-secret config carried in the adapter source; the private key stays the Worker secret, read inside
`connect` and never in the adapter. `composeRuntime` carries the provider as `runtime.backend`.

`connect(env)` is cheap: it returns a `Backend` whose methods mint the installation token on first use
and reuse the existing module-level token cache (`cachedInstallationToken`). The cache and the RS256
signing path are unchanged; they move behind the interface, not away.

This provider shape is also what serves `cairn-doctor`, which connects from `process.env` rather than a
Worker `platform.env`, and it is the shape a future `gitlab(...)` or `gitea(...)` returns.

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

## The dev double becomes a conforming backend

This is the phase's concrete payoff, and the part the dev fence governs.

`fake-github.ts` stops monkeypatching `fetch`. It becomes a `Backend` implementation over its existing
in-memory branch map: seven methods, no URL reconciliation, no global mutation. `defaultBranch` is the
seeded main. The branch-aware tree it already maintains for the publish workflow is exactly the state
the interface needs.

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
   `Backend` object, add the `locals.backend` read, and retire `commitFile`, `fileSha`, and the
   `mintToken` threading. Gate once at the end.
3. **The dev double.** Rewrite `fake-github.ts` to a conforming `Backend`; `devBackendHandle` sets
   `locals.backend`; drop `installFakeGitHub` and the `fetch` patch. The showcase e2e is the gate.
4. **Release.** Dist rebuild, from-scratch consumer build, the showcase publish round-trip e2e (the key
   gate, since it exercises save, branch, and publish through the new interface), the minor bump
   (breaking-within-0.x), the docs (the backend reference page, the adapter reference, the dev-package
   guide, the changelog and upgrade guide with the `Consumers must:` line for the `backend` field), and
   STATUS, ROADMAP, and the memory.

The render seam and islands stay the separate, last phase (phase 4), unchanged by this one.

## Risks and the load-bearing checks

- **The dev fence.** The single biggest risk is a static import path that ships the dev backend to
  production. The design routes the dev backend through `locals.backend` set by the already-fenced
  `devBackendHandle`, so the engine never imports it. The `build/`-grep elimination check in the e2e
  workflow stays the proof.
- **The publish round-trip.** Publish is orchestration over `commit` and `deleteBranch`, and the
  sha-guarded delete depends on `branchHead` returning the same value the action read. The from-scratch
  showcase e2e exercises create, save, and publish, so a regression here fails the release gate.
- **The cross-branch usage index.** It reads every open `cairn/*` branch with an explicit ref. The
  required `ref` parameter is the guard against a silent default-branch read that would under-count
  usage and let a delete proceed against a still-referenced asset.
- **The token cache.** Moving the mint behind `connect` must not change the cache's lifetime. The
  module-level `cachedInstallationToken` stays; `connect` reads it, so the per-process caching is
  unchanged and a per-request connect does not re-sign on every call.
