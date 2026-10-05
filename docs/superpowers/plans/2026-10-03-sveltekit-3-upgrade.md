# SvelteKit 3 upgrade pass

**Goal:** Move the engine, the showcase, the Waymark template, `create-cairn-site`,
`@glw907/cairn-cms-dev`, and the Go doctor to SvelteKit 3 and `@sveltejs/adapter-cloudflare` 8, so a
fresh `sv create` project installs cairn from a packed tarball with no flags. The pass retires the
hand-built Origin check, reads bindings from `cloudflare:workers`, and closes unreleased under
`## Unreleased`.

**Architecture:** Kit 2.70 hosts S1 through S3: the deprecations, the config move, the e2e host's move
from `vite preview` to `wrangler dev`, and the CSRF handover, so each lands green before the bump. S4
opens with a Kit 2.70 prep task (11a) that lands green, then one atomic Opus task (11b) bumps the
versions and replaces every `event.platform` read with one internal `cloudflare:workers` module, with
`withEnv` in the dev handle. S5 brings the scaffold and the docs to the Kit 3 shape.

**Tech stack:** SvelteKit 3.0.0, `@sveltejs/adapter-cloudflare` 8.0.0, `@sveltejs/package` 3.0.0, svelte
`^5.57.1`, vite 8, vite-plugin-svelte 7, wrangler 4, vitest (unit, component, and workerd integration
projects), Playwright, Go (`tool/`).

**Spec:** `docs/superpowers/specs/2026-10-03-sveltekit-3-upgrade-design.md` (approved; its Rulings
section records Geoff's 2026-10-03 rulings). Fold record and owed errata:
`docs/superpowers/research/2026-10-03-sveltekit-3-spec-fold.md`. Evidence:
`docs/superpowers/research/2026-10-04-sveltekit-3-survey.md` and the probe rig at
`~/.cache/kit3-review/app`. Where this plan and the spec disagree, stop and report, except the
decisions under "Decisions this plan takes".

**Pass class:** `auth-data`. Overrides: Task 1 (spike) and Task 7 (security read) take no class and
no gate; Tasks 2, 3, 4, 6, and 12 are `engine-logic` (no auth, session, or binding behavior moves in
them); Task 6's class gate is overridden to E plus its named runs, and Task 12's to S, by blast
radius (neither moves engine or showcase runtime code; the S2 boundary's F and CI cover Task 6); Task
10 is `tool`; Task 13 is `docs`. Tasks 11a and 11b are `auth-data`. No task is `sweep`: the config
move changes the build.

**Token ceiling:** 12.4M for the whole pass, chains plus close. Basis: ten Sonnet chains at 0.55M
each under a full gate (5.5M, Task 11a included; the observed rate is 0.4M to 0.5M per chain, raised
for the e2e in every `auth-data` gate), less 0.15M for Task 6's lighter gate, the 11b Opus task at
2.0M, the docs task at 1.2M, the spike at 0.4M, the security read at 0.35M, six pre-flights at 0.1M
each (0.6M), one fix round per segment in reserve (1.0M), and the close at 1.45M (simplifier, four
reviewer seats plus one Go reader per touched package, the consumer proof, the live smoke, ledgers).
At 80 percent (9.9M) the conductor finishes the task in flight, writes STATUS, and asks one combined
question at the next segment boundary.

**Checkpoint interval:** four tasks, aligned to segment boundaries (no segment holds more than four
tasks): STATUS is written at the end of S0, S1, S2, S3, S4, and S5, at any split, and before any
question to Geoff.

**Segments** (each ends on a green commit):

| Segment | Tasks | Host | Boundary proof |
|---|---|---|---|
| S0, spike | 1 | scratch worktree and `$HOME/.cache` | the spike record; go or stop per Task 1 |
| S1, groundwork | 2, 3, 4 | Kit 2.70 | full gate green |
| S2, e2e host | 5, 6 | Kit 2.70 | full gate green; branch pushed, CI `e2e`, `design`, and a dispatched `norms` run green with baselines unchanged |
| S3, CSRF | 7, 8, 9, 10 | Kit 2.70 | full gate and tool gate green |
| S4, the bump | 11a (Kit 2.70), 11b (Kit 3) | Kit 2.70, then Kit 3 | F green on 11a's commit; after 11b, full gate green, branch pushed, every CI workflow green |
| S5, scaffold and docs | 12, 13 | Kit 3 | `check:close` green |

**Split rule (spec "Split point"):** if the ceiling forces a split, cut after S2 and never after S3,
because after S3 the guard's Rule 2 and the v1 doctor checks are gone while the engine still peers
on Kit `^2.70`. Task 11a's commit is still on Kit `^2.70`, so the cut is never after 11a either. A
second pass would run S3 through S5 and the close. The conductor weighs the split at the S2 boundary
against measured spend, never earlier. Past the S2 boundary, ceiling pressure raises a budget
question for Geoff, never a split: the spec names one cut point, and S3 never reaches `main` without
11b.

**Worktree:** `.claude/worktrees/sveltekit-3`, branch `sveltekit-3`, off `main` at the plan's commit.
The spike runs in its own throwaway worktree (Task 1). **Worktree e2e gotcha**
(`docs/internal/durable-gotchas.md`, "A worktree showcase e2e proves MAIN's engine"): a worktree's
`examples/showcase/node_modules` resolves both `file:` deps to the main checkout's build. Task 0 and
Task 11b (after its lockfile change) do a from-scratch showcase install in the worktree and confirm
with `realpath examples/showcase/node_modules/@glw907/cairn-cms` that it resolves into the worktree.

**Execution mode:** `pass-execute` by name, one invocation per segment for S1 through S5, sequential
(`parallel` unset; one worktree, one index, one gate key). Args: `repo` the worktree's absolute path,
`implementer: "cairn-implementer"`, `reviewer: "diff-reviewer"`, `passClass: "auth-data"`, `gate` the
full string (see Gates), `commonNotes` carrying Global constraints and the pre-flight checklist from
`~/.claude/docs/pass-gate-economy.md`, and each task's own `passClass`, `gate`, `gateLane`, and
`model` where this plan sets one. Tasks 2, 3, and 4 have disjoint Files and are marked independent,
but run in sequence for the same one-worktree reason. Tasks 0, 1, and 7 are conductor-led dispatches
outside the runner. `auth-data` fix rounds always run the full gate (no reduced gate).

**Models:** implementers `sonnet` (agent pin); `diff-reviewer` on `claude-opus-5-5` at `medium`;
the security read and the close's `web-auth-security-reviewer` at `high`. **Upshift:** Task 11b
runs on `model: opus` (the spec names it: one atomic task, about 140 occurrences in about 40 files,
whose intermediate states do not compile, with the `building` gate and the `withEnv` nesting as
novel correctness-critical logic). Task 11a (the Kit 2.70 prep, Decision 12) stays on Sonnet. No
other task is upshifted: each is specified to its acceptance criteria, and Task 9's
security-relevant proofs are spelled out in the spec.

**Pre-flight (every segment):** before each segment's first dispatch, one `haiku` or `sonnet`
pre-flight lists every factual claim that segment's tasks make about existing code at HEAD (paths,
line numbers, counts, symbol names, script names, workflow steps) and checks each. The conductor
amends the plan and commits the amendment before dispatching.

## Gates

Every gate runs through `cairn-run-gate '<string>'`; on exit 75, re-issue until it prints
`gate exit:`. `CAIRN_GATE_LANE=light` only for a gate that launches no browser. The engine's root
`npm test` drives Chromium and is never light.

- **Full string (F):** the `full` tier of `scripts/checks/gate-tier.mjs`, printed by
  `node scripts/checks/gate-tier.mjs --range <base>..HEAD --pin full` and quoted in Task 0's ledger
  entry. At plan time it is the engine string plus the showcase `admin-visual.spec.ts` run,
  `check:comments`, `check:surface`, and the whole showcase e2e. Until Task 5 lands, every local
  showcase e2e runs on the default port with `E2E_PORT` unset, after `ss -ltnp 'sport = :4173'` shows
  no listener (quoted in the report): `examples/showcase/wrangler.jsonc:61` hardcodes `PUBLIC_ORIGIN`
  to `http://localhost:4173`, so under `E2E_PORT=4392` every minted preview link points at a dead
  port, eight `preview.spec.ts` tests fail, and their half-finished state cascades into 22 more
  (Task 0 diagnosis, 2026-10-04; ROADMAP files the defect). From Task 5 on, every local showcase e2e
  runs with `E2E_PORT=4392`, after `ss -ltnp 'sport = :4392'` shows no listener.
- **Engine string (E):** the `engine` tier of the same script (docs gate, `npm run check`, the node
  projects, the serialized component project, the `create-cairn-site` workspace suite).
- **Tool (T):** `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`.
- **Docs (D):** `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:docs-gate && npm run check:surface && npm run check:rulings-format'`.
- **Scaffold (S):** `CAIRN_GATE_LANE=light cairn-run-gate 'npm test -w packages/create-cairn-site && npm run test:emit && npm run check:template'`.

A lone unrelated test-file failure, or a component run printing `Cannot connect to the server in 60
seconds`, follows the rerun rule in `docs/internal/durable-gotchas.md` before it counts as red.

## Global constraints

- Peer ranges: `@sveltejs/kit` `^3` only; svelte `^5.57.1`; the dev package's kit peer `^3`; no vite peer.
- Consumer floors (already met by the template pins): vite `^8.0.12`, vite-plugin-svelte `^7`, wrangler `^4.118`, Node `>=22.17`.
- `@sveltejs/package` `^3` (Ruling 2), taken in S1 on Kit 2.70.
- Debt-free (Geoff, 2026-10-04): no compatibility shim, no deprecated 3.x API, no hand-built mechanism Kit 3 provides, no site config kept only for cairn's sake.
- No committed temporary `trustedOrigins`, at any commit, in any segment.
- The site carries no `csrf` config; never `trustedOrigins: ['*']`.
- Admin Referrer-Policy is `strict-origin` (header from `applySecurityHeaders` and the confirm page), plus exactly one `<meta name="referrer" content="strict-origin">` in the head of every admin document (the shell's authed views, login, and confirm), from one home (Decision 11).
- `/preview/[token]` keeps `Referrer-Policy: no-referrer`.
- One internal module under `src/lib/sveltekit/` is the engine's only `cloudflare:workers` import site; nothing reachable from the Node-context entries (`.`, `/admin`, `/public`, `/vite`, `/cloudflare`, `/auth-crypto`, `/log`, the bins) imports it.
- No engine code touches `env` or `withEnv` while `building` (`$app/env`).
- The dev-backend flag reaches a worker only through a command-scoped `--var CAIRN_DEV_BACKEND:1` on
  the `wrangler dev` invocation that needs it. Never `wrangler.jsonc` `vars`, never an OS env var
  (it reaches `vite preview`'s Node process but not workerd), and never a `.dev.vars` file, committed
  or left behind (a lingering one turns every later default-build serve into the guard's 503).
- The showcase and Waymark `preview` scripts stay flag-free: `wrangler dev` on the build output.
- `originMatches` stays for `createAuthChannel`; `isUnsafeFormRequest` stays for guard Rule 1; the `__Host-cairn_csrf` double-submit token and its owners are unchanged.
- `PUBLIC_ORIGIN` stays; `readPublicOrigin` reads the module `env` alone.
- Audit tooling's `process.env` reads (Node CLI code) stay.
- The repo root's `svelte.config.js` stays; the showcase, Waymark, and the scaffold delete theirs.
- The template is generated: every task that edits an emitted showcase file runs `npm run emit:template` in the same task, and `check:template` stays green at every commit.
- Every commit leaves `check:reference`, `check:reference:signatures`, and `check:surface` green: a task that changes a typed export or removes a documented symbol makes the minimal reference edit and regenerates `docs/internal/api-surface.md` with `npm run check:surface -- --update` in the same task; Task 13 writes the prose.
- Scratch projects live under `$HOME/.cache`, never `/tmp` and never inside the repo.
- Every server a task starts outside Playwright runs on a port from an environment variable other than 4173 and 4392, and is stopped on exit; the report says so.
- No edit to the `draft-docs-2a` branch or worktree; another executor owns it.
- No release, no version bump (engine, dev package, or `tool/`), no tag, no publish. The release holds until draft docs stage 2a lands (spec settled decision).
- Code comments follow TSDoc; no em dash in comments; no comment claims what its assertion does not prove; no plan, pass, or task numbers in shipped comments. `go-conventions` governs every Go edit.
- Never `git add -A`; commit named paths; imperative mood.

## Decisions this plan takes

1. **The spike harness is kept as a record.** It is committed on the pass branch at
   `docs/superpowers/research/2026-10-03-sveltekit-3-spike/harness.sh` beside the spike record
   `record.md`, so Task 11b and the close re-run the same script from any session. It takes tarball
   paths and a scratch root as arguments and writes nothing inside the repo.
2. **The spike's scratch branch widens the kit peer to `^3`** so the tarball installs into a Kit 3
   project with no `--legacy-peer-deps` or `--force`; nothing on that branch merges.
3. **Every `vite preview` caller moves in S2**, not only the four the spec names (the e2e, its
   baselines, the CI width sweep, `norms.yml`). `design.yml`'s theme fixture and the lab and check
   scripts that serve the showcase build also break once adapter 8 output lands, so Task 6 moves
   them. The showcase keeps the `preview` script name and repoints it at `wrangler dev`, flag-free,
   so a Waymark site's `npm run preview` still works after `emit:template`. A caller that needs the
   dev backend appends `-- --var CAIRN_DEV_BACKEND:1` to its own invocation (Global constraints).
4. **The condition registry has one owner per segment.** Task 9 deletes guard and response-mapping
   code; Task 10 owns every edit to `src/lib/diagnostics/conditions.ts` and
   `tool/internal/spine/conditions.json` (the mirror `check:tool-conditions` holds), the rewordings
   included.
5. **The doctor's new names.** Check id `config.csrf-trusted-origins`; condition
   `config.csrf-trusted-origins-wildcard`, severity `warning`, subject to Task 7's verdict. The spec
   requires a FAIL status on `'*'` and is silent on severity. Two premises, both checked against the
   code: guard Rule 1 requires the double-submit token on every unsafe form POST under `/admin`, the
   public login and confirm posts included; and `createAuthChannel` keeps `originMatches` (Global
   constraints). So `'*'` leaves exposed only the site's own forms, the developer's domain, matching
   the retired `config.csrf-disable-missing`'s severity (`conditions.json:113-114`). Docs anchor
   `is-it-working.md#keep-sveltekits-origin-check-on`.
6. **The tool's major is disclosed in Task 10** under `tool/CHANGELOG.md` `## Unreleased`; no
   `tool/v2.0.0` tag until the engine cut.
7. **Task 11b re-runs the spike harness against its own tarball** before it reports, so a
   registry-shaped install break surfaces in S4 rather than at the close. That run is also the
   harness's reproduction check from a fresh session; S0 adds no second harness run.
8. **`@sveltejs/package` 3's survey record** lands at
   `docs/superpowers/research/2026-10-03-sveltekit-package-3-survey.md`, since the implementer cannot
   load the `dependency-upgrade` skill; the conductor pastes that skill's per-bump requirements into
   Task 4's notes.
9. **The live smoke runs after merge readiness, before the merge**, on the showcase per Ruling 1.
10. **The showcase's `membersDevHandle` retires in Task 5.** Its two env members
    (`dev-wiring.ts:42-52`), the `MEMBER_DB` double and the `CAIRN_DEV_BACKEND` stamp, are made
    redundant by local D1 and the `--var` delivery, and its `createChannelDb` throws
    `Illegal constructor` under workerd (`node:sqlite`). This departs from the spec sentence naming
    it among the `withEnv` handles; Task 11b's nesting test over `devBackendHandle` and a test-local
    second handle keeps the spec's purpose.
11. **Each admin view owns its referrer meta (amended by Task 7, 2026-10-05).** The plan first gave
    the meta one home in `CairnAdminShell`'s `<svelte:head>`, on the premise that every `/admin/**`
    route renders inside the shell. Task 7 found that premise false for a documented setup:
    `LoginPage` and `ConfirmPage` are public exports (`src/lib/admin/index.ts:15-16`), and the advanced
    per-route mounting lets a site mount one in its own shell (`docs/reference/admin-routes.md:291-299`),
    where a site-wide `no-referrer` would bring back the R5 lockout. So `LoginPage` and `ConfirmPage`
    each emit the meta in their own `<svelte:head>`, and the shell emits it only for its authed views
    (inside `{#if !data.public}` within its head; the public branch renders the route's page through
    `children()`, `CairnAdminShell.svelte:686-687`). Every admin document still carries exactly one,
    with no shell context flag (the leaner form of Task 7's amendment, conductor's call). Svelte hoists
    a component's head output above its children, so a site meta from its root `+layout.svelte` lands
    first and cairn's wins; only `app.html` after `%sveltekit.head%` can override it (Task 7, B).
12. **Task 11 splits into 11a (Kit 2.70 prep, Sonnet) and 11b (the atomic bump, Opus)**
    (conductor decision on PM8); see Task 11a.
13. **Two `Consumers must:` lines beyond the spec's ten**, added when Task 13 finalizes the list: serve
    a built site with `wrangler dev`, since `vite preview` cannot run adapter 8 output (kit#17271);
    and adapter 8 no longer caches worker responses in the colo cache (adapter 7 put every response
    carrying a public `Cache-Control` into `caches.default`, `/media` and public SSR pages included),
    so a site that relied on it adds its own caching.
14. **No engine-side Cache API caching for `/media`** (Geoff's ruling, 2026-10-04; below).

## Rulings for Geoff

None open. Recorded:

1. **No engine-side Cache API caching for `/media` (Geoff, 2026-10-04).** Adapter 8 drops adapter 7's
   worker-level `caches.default` caching, and the engine does not replace it. Task 13 discloses the
   drop (CHANGELOG `Consumers must:`, `migration-notes.md`) and files a `ROADMAP.md` watch, in the
   tier where it bites, triggered by a measured R2 cost or `/media` latency problem on a production
   site. Reasons:
   - A Cache API purge reaches only one data center, while `/media` responses are immutable with a
     one-year `max-age` (`media-route.ts:36`), so a deleted image would linger at other edges.
     Adapter 7 has this flaw today; dropping it fixes it.
   - A global purge would need the zone purge API plus a per-site token and zone id in config.
   - Browsers already cache the bytes for a year, and R2 reads are cheap.
   - The Cache API has no effect on `*.workers.dev`.
   - The per-data-center purge and `*.workers.dev` claims are quoted from Cloudflare's docs by Task
     13 before either appears in any published text.

## Review focus

The five inputs most likely to bite a real user that per-task tests would not exercise unprompted:

1. **A site that prerenders behind cairn's handle** (an `env` or `withEnv` touch while `building`
   fails the build with `Cannot access cloudflare:workers in a prerenderable route`): Task 11b
   Building, and spike items 1 and 4.
2. **A site that sets `no-referrer` site-wide** (outer header or early `app.html` meta): Task 9's
   site-wide test.
3. **A registry-installed tarball, not a `file:` link:** the spike harness in Task 1, Task 11b, and
   the close.
4. **The magic-link confirm POST in a real browser:** Task 9's confirm case and its mutation; the
   close's live smoke.
5. **A stale tab** (stale token: cairn's branded response; old `no-referrer` page: Kit's literal
   403 body): Task 9's guard-side test and stripped-meta case; the anchor in Task 13.

---

### Task 0: Pre-flight (conductor, no gate)

**Outcome:** the start conditions hold and are recorded in this plan's Ledger.

1. **No live executor:** `pgrep -af` on the worktree path and the branch name finds nothing (never a
   pattern in the command's own text); no `sveltekit-3` branch or worktree exists; the `main`
   checkout's `git status --porcelain` shows no warm edits this pass would collide with.
2. **Worktree:** create `.claude/worktrees/sveltekit-3` on `sveltekit-3` from `main` at the plan's
   commit; `npm ci`; a from-scratch showcase install (`rm -rf examples/showcase/node_modules` then
   `npm ci --prefix examples/showcase`); `realpath` confirms the showcase's engine and dev package
   resolve into the worktree.
3. **Gate strings:** print F and E with `gate-tier.mjs --pin full` and `--pin engine` and record them.
4. **Baseline:** one gate agent runs F in the worktree and returns the `gate exit:` line and tail; the
   conductor quotes it to Task 2's reviewer as Task 0's gate evidence. A red stops the pass with one
   message to Geoff.
5. **Draft PR and inherited CI:** push `sveltekit-3`, open a draft PR against `main` (so CI runs on
   every later push), and record that SHA's CI result as the inherited expected-red set.
6. **S0 and S1 pre-flight** per the note above, plus the plan-time facts every later task names
   (`guard.ts:195`, `:203-217`, `:126-154`; `admin-response.ts:38`; `auth-routes.ts:293`, `:474`;
   `condition-response.ts:17`; `auth-channel/factory.ts:72-74`; `dev-flag.ts:89`; `examples/showcase/src/chassis/dev-gate.ts:24-25` (pre-flight 2026-10-05: not under `src/lib`);
   `section-action.ts:118`; `admin-action.ts:60`; `members.spec.ts:26,177`; the ROADMAP lines
   `:52`, `:402`, `:872-882`, `:938-946`, `:1556-1582`, `:1710-1716`, `:2150`; `CLAUDE.md:211`).
7. **Dependency state:** `npm outdated` at the root, the showcase, and each `packages/*` manifest,
   recorded; confirm `@sveltejs/kit` 3.x, adapter-cloudflare 8.x, and `@sveltejs/package` 3.x are
   each package's newest production release (`npm view <pkg> version`).
8. **Counter:** record spend through Task 0.

**Acceptance:** the Ledger carries items 1 to 8; the plan is amended and committed where item 6 moved
a fact.

---

## S0: spike

### Task 1: The bindings and harness spike (throwaway)

**Pass class:** none (no gate; nothing merges). **Dispatch:** one `sonnet` agent, conductor-led.
**Spec:** "Segments", S0; "Evidence".

**Where it runs:** a scratch worktree `.claude/worktrees/sveltekit-3-spike` on branch
`sveltekit-3-spike` off `main`, and scratch projects under `$HOME/.cache/cairn-kit3-spike/`. Never
`/tmp`, never inside the repo. The worktree and branch are deleted at the close after the harness's
final run; only the harness and the record (Decision 1) reach the pass branch.

**Files (pass branch):** `docs/superpowers/research/2026-10-03-sveltekit-3-spike/harness.sh`,
`docs/superpowers/research/2026-10-03-sveltekit-3-spike/record.md`.

**Outcome:**
- On the scratch branch: a probe `cloudflare:workers` read in a module reached from
  `@glw907/cairn-cms/sveltekit`, a probe `withEnv` handle in the dev package shaped like
  `devBackendHandle`, and the kit peer widened to `^3` (Decision 2). Both packages are packed with
  `npm pack`.
- A fresh Kit 3 / adapter 8 project (current `npx sv create`, minimal TypeScript) under the scratch
  root installs both `.tgz` files by path, with no `ssr.noExternal`, no `file:`, no `npm link`, no
  `--legacy-peer-deps`, no `--force`. A route echoes one binding value.
- **Item 1:** the echoed value arrives under `vite dev`; under `vite build` plus `wrangler dev` on the
  output; and a prerendered route served through cairn's handle builds with the read gated on
  `building` in the same form item 4 proves, so a form whose import rejects in a real Kit 3 build
  (and so reads `building` as `false` and touches `env`) fails here.
- **Item 2:** a `withEnv` set in the dev package's probe handle reaches an engine read and a site read
  across an `await` and a streamed load.
- **Item 3:** on the Kit 2.70 / adapter 7 showcase (in the scratch worktree, with
  `membersDevHandle` removed from its `hooks.server.ts` per Decision 10, since on `main` it calls
  `resolveChannelDb()` per request and throws under workerd), the `VITE_CAIRN_E2E=1` build boots under
  `wrangler dev --var CAIRN_DEV_BACKEND:1` with the dev backend on and the members fixture on local
  D1 `MEMBER_DB` (migrated from `migrations-members`); `/admin/posts` answers 200, not a redirect.
  The record quotes the exact command. `.dev.vars` delivery is not probed (Global constraints).
- **Item 4:** a `building` gate in a probe module reached from the `./sveltekit` barrel keeps
  `src/tests/unit/dist-sveltekit-app-import-boundary.test.ts` green, with `cloudflare:*` added to its
  esbuild externals. Wrangler's bundler treats it so: its `cloudflare-internal-imports` esbuild
  plugin returns `{ external: true }` for `/^cloudflare:.*/` (`wrangler-dist/cli.js:184154` at the
  installed 4.144.0). The leading candidate is the form proven at HEAD,
  `src/lib/sveltekit/preview.ts:433-440`: `building` read through `await import('$app/env')` inside
  `try`/`catch`, falling back to `false`. The record quotes, in order:
  1. a red run of the boundary test with a static `import { building } from '$app/env'` in the
     probe module, after `cloudflare:*` is external, which proves the probe sits in the barrel's
     graph;
  2. the green run with the chosen form in its place.

  Item 1's prerender build uses that same form. The record names the form, or reports none.
- The harness script reproduces items 1 and 2 from tarball paths, and also carries the close's
  consumer-proof mode (spec "Pass class and close": `npm install <tgz>` exit 0 with no flags, the
  documented wiring and `wrangler types`, `svelte-check` 0 errors and 0 warnings, `vite build` exit 0,
  `wrangler dev` answering `GET /admin/login` with 200 and a body carrying cairn's login form marker,
  the email field or the CSRF hidden input, so an error page or a site route served with 200 fails).
- The record lists each `cloudflare:workers` fact proved, for `durable-gotchas.md` in Task 13.

**Go/stop rule:** `vite build`, prerender, or `wrangler dev` needing site config (any config beyond
the documented wiring) stops the pass as an architectural fork for Geoff. `vite dev` failing alone is
a recorded gotcha and the pass goes on. Item 3 failing for a cause S2's planned scope (local D1, the
flag delivery) does not cover stops the pass. Item 4 finding no `building` gate that both keeps the
barrel free of `$app/*` and passes item 1's prerender stops the pass: the spec names
`$app/env`, so the conflict is Geoff's (a backstop; the HEAD form is expected to pass). A stop writes
STATUS and sends Geoff one message with the record.

**Acceptance:**
- The record quotes, per item and per mode, the command, its exit code, and the echoed value (or the
  error); a mode with no quoted output counts as failed, so a skipped mode cannot pass.
- `git -C <scratch worktree> log main..` shows the probe commits exist only on `sveltekit-3-spike`, and
  `git grep -n cloudflare:workers -- src/lib` on `sveltekit-3` prints nothing.
- The harness is committed from the copy the record's runs used (Decision 7 names its reproduction
  run).

**Interfaces produced:** `harness.sh` with arguments `<engine.tgz> <dev.tgz> <scratch-root>
[--mode spike|consumer]`; the record's "Flag delivery" line (the exact `--var` command), consumed by
Task 5; the record's "Building gate" line (item 4), consumed by Task 11b.

---

## S1: groundwork on Kit 2.70

### Task 2: The 4.0 deprecations

**Pass class:** `engine-logic`. **Independent** of Tasks 3 and 4. **Spec:** "Kit 3 API moves", the
4.0 deprecations bullet.

**Files:** every file under `src/lib`, `packages/cairn-cms-dev`, and `examples/showcase/src` that
imports `$app/environment`, calls `invalidateAll`, or imports `json` or `text` from `@sveltejs/kit`
(plan time: 8 `$app/environment` lines, 11 `invalidateAll` lines, and 7 `json` import lines, all in
showcase routes: `healthz` and six `/test/*`; no `text` import exists; the pre-flight recounts);
`vitest.config.ts` (the shared alias at `:65`, `:132`, `:159` and the comments at `:60`, `:129`,
`:157`), `src/tests/_app-environment.ts` (renamed `src/tests/_app-env.ts`; every vitest project
aliases this one stub, and no component-local `$app/environment` stub exists), its importers
`src/tests/integration/preview-load.test.ts` (`:22`, and the `vi.doMock('$app/environment')` at
`:198-216`) and `src/tests/component/EditPage.test.ts:67`, and the `invalidateAll` stub in
`src/tests/component/_app-navigation.ts:15` with its assertion in `CairnMediaLibrary.test.ts:1016-1018`
(`src/tests/unit/check-snippets.test.ts:72` quotes the string as data); `templates/waymark/**`
through `npm run emit:template`.

**Outcome:** `$app/environment` becomes `$app/env`, the `invalidateAll` function becomes
`refreshAll`, and the `json` helper becomes `Response.json`. The `goto` option
`{ invalidateAll: true }` (`MediaUploadDialog.svelte:212`) stays: Kit 2.70's `goto` has no
`refreshAll` option, so Task 11b renames it. The vitest stubs move with the import.

**Acceptance:**
- `git grep -nE '\$app/environment|invalidateAll' -- src/lib packages/cairn-cms-dev examples/showcase/src templates/waymark src/tests vitest.config.ts`
  prints only the `goto` option and lines the report names (a test that quotes the string as data),
  and no `json` named import from `@sveltejs/kit` remains (single- and multi-line imports; the report
  states how multi-line imports were checked).
- `/healthz` still returns `application/json` with its old status (Kit 2.70.3's `json()` and
  `Response.json` both set it; the existing `healthz.spec.ts` or one added assertion pins it).
- F green.

**Interfaces produced:** `src/tests/_app-env.ts`, aliased as `$app/env` in the unit project (and in
any other vitest project that resolved the old alias), exporting the same members the old stub did.

**Gate:** F.

### Task 3: Config into the Vite plugin, and subpath imports

**Pass class:** `engine-logic` (chassis bar). **Independent** of Tasks 2 and 4. **Spec:** "Config in
the Vite plugin"; "Kit 3 API moves", the subpath-imports bullet; S1.

**Files:** `examples/showcase/svelte.config.js` (deleted), `examples/showcase/vite.config.ts`,
`examples/showcase/package.json` (`imports`), `examples/showcase/tsconfig.json` if its paths name the
aliases, every showcase file importing `$lib`, `$chassis`, or `$theme` (plan time: 2 `$lib` and 85
`$chassis`/`$theme` lines), any repo script or check that reads the showcase's `svelte.config.js`
(the pre-flight lists them; `emit-template`, the bake, the showcase `vitest.config.ts`),
`scripts/checks/check-chassis-boundary.mjs` (its `referencesChassis` matches only `$chassis/` and
relative `chassis/` paths, `:76`, so `#chassis/` reach-ins would go unchecked), the seam rule in
`examples/showcase/src/chassis/README.md` (`:10`, `:42` to `:45`, which the boundary script parses;
`:43` names `svelte.config.js`), the `.github/workflows/test.yml:28-35` comment on svelte-check
loading Waymark's `svelte.config.js`,
the dead alias map in `scripts/checks/check-public-skill.mjs:409-414`, and `templates/waymark/**`
through `npm run emit:template`. `tool/` is not touched (Task 10 owns the doctor).

**Outcome:**
- The showcase's whole Kit config (adapter and its options, prerender handlers, the `csrf` block
  unchanged for now) lives in `sveltekit({ ... })` in `vite.config.ts`, and its `svelte.config.js` is
  gone. The emitted template matches.
- `$lib`, `$chassis`, and `$theme` become `#lib`, `#chassis`, and `#theme` through a package.json
  `imports` field (each with its `/*` form), and `kit.alias` is gone. The chassis boundary check,
  its README rule, and `check-public-skill.mjs` follow the `#` form, with no `$` form kept.
- If the subpath move fails `svelte-check` or the Kit 2.70 build, the config move still lands, the
  alias change is reverted, and the report records the failure verbatim for Task 11b to carry.

**Acceptance:**
- `test ! -e examples/showcase/svelte.config.js && test ! -e templates/waymark/svelte.config.js`;
  `git grep -nE '\$(lib|chassis|theme)\b|kit\.alias|alias:' -- examples/showcase/src examples/showcase/vite.config.ts templates/waymark/src templates/waymark/vite.config.ts`
  prints nothing (or the report carries the recorded fallback).
- `npm --prefix examples/showcase run check` prints 0 errors and 0 warnings, and the showcase build
  prerenders the same route set as before, measured on two builds: the default build and the flagged
  build (`VITE_CAIRN_E2E=1` with `CAIRN_DEV_BACKEND=1` in the build process's environment, so
  prerender runs behind the dev handle). The report quotes both counts before and after, each equal,
  so a dropped prerender option cannot pass silently.
- A scratch reach-in `import x from '#chassis/<unlisted>.js'` in a theme file fails
  `npm run check:chassis-boundary` (red run quoted, then removed), and the check is green on the
  task's tree. It runs only in `check:close`, so this task runs it by name.
- `check:template` and `test:emit` green.
- F green.

**Interfaces produced:** `#lib`, `#chassis`, `#theme` import specifiers in the showcase and Waymark;
the showcase Kit config's home is `examples/showcase/vite.config.ts`; the two prerender counts,
consumed by Task 11b.

**Gate:** F.

### Task 4: `@sveltejs/package` 3

**Pass class:** `engine-logic`. **Independent** of Tasks 2 and 3. **Spec:** "Kit 3 API moves", the
`@sveltejs/package` bullet; Ruling 2. **Notes:** the conductor pastes the `dependency-upgrade`
skill's per-bump requirements (changelog survey across every release from the current 2.x to 3.0.0;
a take-now, file, or propose decision on each new capability) into the dispatch.

**Files:** `package.json`, `package-lock.json`, the root `svelte.config.js` only if 3.0.0 requires a
change, `scripts/build/*` only if the packaging output moved,
`docs/superpowers/research/2026-10-03-sveltekit-package-3-survey.md` (new).

**Outcome:** the root devDependency is `@sveltejs/package` `^3` at the newest production 3.x; the
packed output is equivalent; a break found is fixed in this task (Ruling 2); the survey record lists
each release, each breaking change with its effect here, and each new capability with its decision.

**Acceptance:**
- `npm run check:package` green (publint strict, attw, the package-files check), and the `dist/` file
  list is identical before and after (the report quotes the diff of `npm pack --dry-run` listings,
  empty or each change explained), so a silently dropped or renamed emitted file fails.
- The survey record exists and names a decision for every capability it lists.
- F green.

**Interfaces produced:** none consumed later.

**Gate:** F.

**S1 boundary:** F green on the segment head; STATUS written.

---

## S2: the e2e host moves to `wrangler dev` (Kit 2.70)

### Task 5: The showcase e2e serves through `wrangler dev`, members on local D1

**Pass class:** `auth-data` (it moves the members fixture onto a real D1 binding and the dev-backend
flag's delivery). **Spec:** S2; "Bindings", the flag-delivery sentence. **Consumes:** Task 1's
"Flag delivery" line; Decision 10.

**Files:** `examples/showcase/playwright.config.ts`, `examples/showcase/package.json` (`preview` and
any e2e scripts), `examples/showcase/src/members/dev-wiring.ts` (the handle retires, Decision 10),
`examples/showcase/src/hooks.server.ts` (the `membersDevHandle` import, its exclude block, and the
ordering comment at `:22-28`), `examples/showcase/src/routes/test/{reset-members,last-otp,revoke-member-session}/**`,
`examples/showcase/e2e/media-library.spec.ts` (the post-delete probe), `examples/showcase/e2e/**`
only where a spec assumed the `vite preview` host, `.github/workflows/e2e.yml` (comments and the
`update_snapshots` path if they name the host; it has no width matrix, the width sweep lives in the
specs and rides the `webServer` change), and `templates/waymark/**` through `npm run emit:template`.

**Outcome:**
- The e2e `webServer` builds with `VITE_CAIRN_E2E=1`, applies `migrations-members` to the local D1
  `MEMBER_DB`, and serves the build through `wrangler dev` on `E2E_PORT` with the command-scoped
  `--var CAIRN_DEV_BACKEND:1` Task 1 recorded, plus `--var PUBLIC_ORIGIN:http://localhost:$E2E_PORT`
  so minted preview links follow the run's port (the hardcoded `:4173` origin in
  `wrangler.jsonc:61` stays for the flag-free `preview` script). No `.dev.vars` file is written.
  The ROADMAP entry filing the hardcoded origin is marked done or narrowed.
- The showcase `preview` script serves the built output through `wrangler dev`, flag-free
  (Decision 3).
- `membersDevHandle` retires (Decision 10); the members fixture and the `/test/*` routes read the
  local D1 binding, and `/test/reset-members` resets that D1. Each `/test/*` route keeps both of its
  body refusals (a local host, and `CAIRN_DEV_BACKEND === '1'` in env). The dev package's double set
  is unchanged.
- Adapter 7's worker serves `caches.default` first, so a cached `immutable` 200 answers after the
  safe-delete and the safe-delete test at `media-library.spec.ts:189` fails on this host; its
  post-delete probe (the `request.get(deliveryPath)` 404 assertion at `:230`) sends
  `Cache-Control: no-cache`, which skips the cache read, so it asserts the R2 state. The pre-delete
  200 at `:207` stays a plain request.
- CI's e2e job runs on the same host; visual baselines are unchanged.

**Acceptance:**
- The whole existing showcase e2e suite is green on the new host under `E2E_PORT=4392` (the first
  run on that port since Task 0), with zero baseline files changed
  (`git diff --stat -- '*-snapshots/*'` empty), so a host move that shifted paint cannot pass.
  The safe-delete test (`media-library.spec.ts:189`, probe at `:230`) is green, and the report quotes
  its red run without the header.
- `git grep -n "vite preview" -- examples/showcase/playwright.config.ts .github/workflows/e2e.yml`
  prints nothing, and the `preview` value in `examples/showcase/package.json` and
  `templates/waymark/package.json` names `wrangler dev` with no flag.
- `git grep -n "CAIRN_DEV_BACKEND\|MEMBER_DB" -- examples/showcase/src/members examples/showcase/src/hooks.server.ts`
  prints no flag stamp and no double construction; `git grep -n CAIRN_DEV_BACKEND -- examples/showcase/wrangler.jsonc templates/waymark/wrangler.jsonc`
  prints nothing; `git ls-files examples/showcase templates/waymark | grep -E '\.dev\.vars$'` prints
  nothing.
- A members spec that requests, then reads back, a member across a `/test/reset-members` call proves
  the reset clears the D1 (an empty read after reset). Mutation proof: with the reset made a no-op,
  that spec goes red (quoted run, then restored).
- A test asserts each `/test/*` route answers 404 on a local host with the flag absent. Mutation
  proof: with one route's env check dropped, the test goes red (quoted run, then restored).
- The default (unflagged) build's `wrangler deploy --dry-run` grep in `e2e.yml` still proves the dev
  package folds out (step unchanged or updated, still asserting).
- F green.

**Interfaces produced:** the showcase `preview` script (serves built output via `wrangler dev`,
flag-free); the e2e host command; the local-D1 members fixture, reused by Task 9's cross-origin proof.

**Gate:** F.

### Task 6: Every other `vite preview` caller moves

**Pass class:** `engine-logic`, gate overridden to E plus the named runs below (no engine or
showcase runtime code moves; the S2 boundary runs F and CI). **Spec:** S2 (`norms.yml`); Decision 3.

**Files:** `.github/workflows/norms.yml`, `.github/workflows/design.yml` if a step changes,
`scripts/lab/theme-fixture.mjs`, `scripts/lab/generate-norms-manifest.mjs`,
`scripts/lab/probe-vertical-alignment.mjs` (`:49` and the second instruction string at `:1678`),
`examples/showcase/scripts/capture-surfaces.mjs`, `examples/showcase/scripts/design-probe.mjs`
(a live caller: `:57` spawns `npx vite preview --port 4173` with no flag; it moves to `wrangler dev`,
with `--var` only if the probe needs the dev session, and its comments at `:9-10`, `:50` and the error
message at `:64` follow), `docs/internal/design/README.md` (`:21`, the serve command, which runs
"behind the injected dev session" and so takes `-- --var CAIRN_DEV_BACKEND:1`),
`docs/reference/cairn-audit.md` (`:693`, the flagged serve command),
`scripts/checks/check-symbols-allowlist.mjs` (the `cli-flag:--port` comment at `:17`, plus any
`cli-flag:--var` entry `check:surface` demands once a doc shows the flag), `ROADMAP.md:711` (if
Task 5 has not already narrowed it), and the comment-only hits
`src/tests/unit/media-route-platform-proxy.test.ts:2` and `src/lib/auth-channel/factory.ts:869`
(edited, or named as survivors). `scripts/checks/check-interactive-contrast.mjs` and
`check-touch-targets.mjs` are not callers: their comments only name `npm run preview`'s default
port, so they change only if those comments become false (pre-flight, 2026-10-05).

**Notes:** an OS env var does not reach workerd, so every caller that today prefixes
`CAIRN_DEV_BACKEND=1` (`norms.yml:55`, `:94`; the instructions in `generate-norms-manifest.mjs:127`,
`probe-vertical-alignment.mjs:49` and `:1678`, `cairn-audit.md:693`) moves to
`-- --var CAIRN_DEV_BACKEND:1`. Two carry the flag as a live env object, not a prefix:
`theme-fixture.mjs`'s `SITE_ENV` at `:66`, spread into both the build (`:178`) and the serve (`:152`),
drops `CAIRN_DEV_BACKEND` from the serve env and delivers it by `--var`, or the flag silently stops
reaching workerd; and `capture-surfaces.mjs`'s `startServer()` (`:306-312`, `env` at `:310`) does
the same, with its comments at `:11-12`, `:21`, `:294`, and `:326` following. Without the flag the guard mounts and
`/admin/posts` redirects to login, and `norms.yml`'s `curl -sf` readiness loop accepts the 30x, so
the failure is silent. `wrangler dev` takes `--port` but rejects `--strictPort`
(`theme-fixture.mjs:150`); the fixture's own `listening(PORT)` pre-check covers the strict-port
intent.

**Outcome:** every repo tool that serves a built showcase or template site does so through
`wrangler dev` (directly, or through the repointed `preview` script), with the flag delivered by
`--var` wherever the dev backend is needed; each flagged readiness probe requires a 200 from
`/admin/posts`; comments naming `vite preview` as the host are corrected; the theme fixture's
template arm serves its installed site the same way. The theme fixture's own `serve()` readiness
check (`:156-160`, `response.ok` on `/`) keeps `/` if the fixture serves unflagged; if it serves with
the flag, it requires a 200 from `/admin/posts` like the other flagged probes, and the report says
which.

**Acceptance:**
- `git grep -nE "vite preview|CAIRN_DEV_BACKEND=1 [^|]*run preview"`, excluding
  `docs/internal/record`, `docs/internal/history`, `docs/superpowers`, `docs/HISTORY.md`,
  `CHANGELOG.md`, and fact bullets that quote a past measurement, prints nothing, or only survivors
  the report names with a reason.
- Each flagged readiness probe fails on a redirect: the report quotes one probe's output against a
  default build (non-200, so the probe fails) and against the flagged serve (200).
- `TMPDIR=$HOME/.cache/cairn-tmp npm run test:theme-fixture -- --arm both --build-only` green, and
  `npm run norms:check` against a showcase served by the repointed `preview` script with the `--var`
  flag green, each quoted.
- E green.

**Interfaces produced:** none new.

**Gate:** E plus the two named runs.

**S2 boundary:** F green; push; CI `e2e`, `design`, and `test` green on the segment head, and
`gh workflow run norms.yml --ref sveltekit-3` green, with no baseline file changed. The conductor
weighs the split here. STATUS written.

---

## S3: CSRF on Kit 2.70

### Task 7: Security read of the fold's CSRF deltas (conductor-led, no gate)

**Dispatch:** `web-auth-security-reviewer` at `high`, read-only. **Spec:** "CSRF", last paragraph.
The reviewer starts with zero context, so the dispatch names every input by path:
- the spec's "Evidence" bullets on Kit's CSRF check and Referrer-Policy, and its "CSRF" section;
- the spec risk review's R2, R5, and R6 (`docs/superpowers/research/2026-10-03-sveltekit-3-spec-review-risk.md`);
- Kit 3's `runtime/server/respond.js:98-133` and `runtime/server/csrf.js`, and the `'*'` switch at
  `exports/vite/index.js:495`, under `~/.cache/kit3-research/kit/package/src/`; Kit 2.70.3's
  `respond.js:73-100` from the repo's `node_modules/@sveltejs/kit`;
- `src/lib/sveltekit/{guard,csrf,admin-response,auth-routes}.ts` and `src/lib/auth-channel/factory.ts`;
- the admin heads in `CairnAdminShell.svelte`, `LoginPage.svelte`, and `ConfirmPage.svelte`;
- the full text of Tasks 8, 9, and 10 and Decisions 5 and 11.

**Outcome:** a verdict on the fold's three CSRF deltas: the Kit 2.70 ordering (Kit's check before
`handle`, skipped in dev, an absent content type passing on 2.70 and refused on 3), the admin referrer
meta (header plus one meta from the shell, site-meta precedence, the token never reaching a Referer),
and the doctor's `trustedOrigins` check (`'*'` fails, other entries pass with a detail). The read also
rules the wildcard condition's severity: accept `warning` or amend Task 10, checking Decision 5's two
premises (Rule 1 covers the login and confirm posts; the factory keeps `originMatches`) against the
code. Recorded at `docs/superpowers/research/2026-10-03-sveltekit-3-csrf-security-read.md`, committed
by the conductor.

**Acceptance:** the record names each delta, and the severity, with accept, amend (with the task it
amends and the amendment), or block, each citing the input it rests on. Amendments are written into
Tasks 8 to 10 and committed before Task 8 dispatches. A block, or a finding that raises a question the
spec did not settle, halts S3 for Geoff.

### Task 8: `strict-origin` on admin responses, and the referrer meta

**Pass class:** `auth-data`. **Spec:** "CSRF", the first "After the change" bullet.

**Files:** `src/lib/sveltekit/admin-response.ts`, `src/lib/sveltekit/auth-routes.ts`
(`confirmLoad`), `src/lib/admin/CairnAdminShell.svelte` (the meta for authed views, Decision 11),
`src/lib/admin/LoginPage.svelte` and `src/lib/admin/ConfirmPage.svelte` (each emits its own meta,
Decision 11),
their tests under `src/tests/` (integration and component), a showcase e2e spec for the
document-level count, and the comments that state the old policy.

**Outcome:** `applySecurityHeaders` and `confirmLoad` serve `Referrer-Policy: strict-origin`; every
admin document (the shell's authed views, login, and confirm) carries exactly one
`<meta name="referrer" content="strict-origin">` in its head, emitted by the view that owns the
document (Decision 11); every public admin path (the set `isPublicAdminPath` admits) renders
`LoginPage` or `ConfirmPage`, or the report names the path and how it gets its meta; `/preview/[token]`
keeps `no-referrer`; comments state the new policy and why the meta exists.

**Acceptance (test-first; each test fails on the old code):**
- An integration test asserts `strict-origin` from `applySecurityHeaders` and from `confirmLoad`'s
  headers; on the old code both read `no-referrer`.
- Component tests assert exactly one referrer meta with content `strict-origin` in the head output
  of `CairnAdminShell` with an authed payload, of `LoginPage` and `ConfirmPage` rendered standalone,
  and of `CairnAdminShell` with a public payload wrapping `LoginPage` (one, not two); on the old code
  there is none.
- A document-level e2e check counts `head meta[name="referrer"]` at exactly 1 on the login, confirm,
  and edit documents, so a second meta added by a child component fails.
- A test asserts `/preview/[token]` still serves `no-referrer`, so an over-broad change fails.
- Mutation proof: reverting `confirmLoad`'s header to `no-referrer` turns its test red; the report
  quotes the red run.
- F green (`checkOrigin: false` is still set, so the whole e2e suite is unaffected).

**Interfaces produced:** the header value and meta tag Task 9's browser proofs rely on.

**Gate:** F.

### Task 9: Kit's check runs everywhere: delete the opt-out and guard Rule 2

**Pass class:** `auth-data`. **Spec:** "CSRF" (all bullets and costs), S3 proofs. **Consumes:** Task
8's header and meta; Task 5's host and members fixture; Task 7's amendments.

**Files:** `examples/showcase/vite.config.ts` (the `csrf` block and its WATCH comment removed),
`templates/waymark/**` through `npm run emit:template`, `src/lib/sveltekit/guard.ts` (Rule 2 is
`:203-211` at HEAD `166437ad`; the "Kit checks before `handle`" wording goes on Rule 2's own comment
at `:203-204`, not on the deployed-admin-over-http comment at `:213-218`; Rule 1 is at `:247`),
`src/lib/sveltekit/condition-response.ts` (`REASON_CONDITION.origin`, `:17`), the `guard.refused`
reason union and its log-event emission, `src/lib/sveltekit/csrf.ts:1` (its header comment names
`checkOrigin`), any other `src/lib` comment the acceptance grep names, the tests that pin Rule 2
(`src/tests/integration/auth-guard.test.ts`, the cross-origin `/contact` cases at about `:298-303`
and the `reason=origin` log case at `:519-525`; `guard.test.ts` has no origin test) and
`src/tests/unit/condition-response.test.ts:24` (it renders `auth.csrf-origin-mismatch`, so it changes
here to stay green; `conditions.test.ts` is Task 10's), new e2e specs under
`examples/showcase/e2e/`, and the minimal `docs/reference/log-events.md` edit that keeps the gates
green (both mentions of the `origin` reason, `:42` and `:71`). Pre-flight 2026-10-05.

**Outcome:**
- The showcase and Waymark carry no `csrf` config, so Kit's default check covers every route, admin
  included.
- Guard Rule 2's call is gone; `guard.refused` loses its `origin` reason; `REASON_CONDITION.origin` is
  gone. `originMatches` and `isUnsafeFormRequest` stay with their remaining callers.
- The guard comment states that Kit checks before `handle`.

**Acceptance (test-first; the cross-origin pair proves the check is live):**
- **Cross-origin:** a page loaded at `http://127.0.0.1:$E2E_PORT` submits a native form to the members
  request form at `http://localhost:$E2E_PORT` and gets 403 with Kit's exact body
  `Cross-site POST form submissions are forbidden`, never the factory's
  `cairn auth-channel: origin mismatch` (the factory also answers 403 when Kit's check is off, so a
  status-only assertion would pass under `'*'`). The same submission from `localhost` reaches the
  members form's own success or validation state, never either 403 body. The pair fails under
  `vite dev` or `trustedOrigins: ['*']`, and fails on a host that serves only one of the two names.
- **Admin (regression case):** a browser-submitted Save on the edit page (form content type)
  passes; with `devBackendHandle` in place of the guard no `Referrer-Policy` is served, so this pins
  Kit admitting a same-origin admin form, not Task 8's header or meta.
- **Confirm:** the browser loads the confirm page and POSTs its form; the response is cairn's (an
  invalid-token page is fine), never Kit's 403.
- **Mutation proof:** with the confirm page's header and every cairn referrer meta temporarily
  reverted to `no-referrer`, the confirm case gets Kit's 403; the report quotes the meta count before
  and after and the red run, then restores.
- **Site-wide `no-referrer` (Review focus 2 and 5):** a Playwright test rewrites the admin login (or
  edit) document's response to carry `Referrer-Policy: no-referrer` and an early `no-referrer` meta,
  then submits the form and gets cairn's response. With every cairn referrer meta stripped from the
  rewritten document (count quoted before and after), the same submission gets Kit's literal body
  `Cross-site POST form submissions are forbidden` (quoted red run). This stripped case is also the
  stale-tab browser case: a tab loaded under the old `no-referrer` policy.
- **Stale tab, guard side (Review focus 5):** an integration test sends the guard an admin form POST
  with a matching Origin and a stale token and gets the branded `auth.csrf-token-invalid` response.
- Guard unit tests: a non-admin form POST with a foreign Origin now passes the guard (Kit owns it);
  on the old code Rule 2 refused it.
- `git grep -nE "checkOrigin|csrf-origin-mismatch|REASON_CONDITION\.origin" -- src/lib examples/showcase templates/waymark`
  prints nothing outside `src/lib/diagnostics/conditions.ts` (Task 10's).
- The whole existing e2e suite stays green. F green.

**Interfaces produced:** the e2e helpers for a cross-origin page and a rewritten-document POST, reused
by the close's review.

**Gate:** F.

### Task 10: The doctor and the condition registry (tool major)

**Pass class:** `tool` (owns the registry's TypeScript side too, Decision 4). **Spec:** "Doctor";
"CSRF", the `config.no-referrer-blanket` and `edge.https-not-forced` bullets; Decisions 5 and 6.

**Files:** `tool/internal/doctor/check_csrf.go`, `check_csrf_test.go`, `check_referrer.go`,
`check_referrer_test.go`, `check.go`, `check_floors_test.go`, `report_test.go`, the doctor goldens
under `tool/internal/doctor/testdata/golden/`, `tool/internal/render/testdata/json/doctor.json`,
`tool/internal/spine/conditions.json`, `tool/internal/spine/condition.go`,
`tool/internal/doctor/doc_comment_symbols_test.go`, `tool/cmd/cairn/doctor_test.go` (its clean-site
fixture at `:47` writes a `svelte.config.js` with `checkOrigin: false`; it moves to the Kit 3 shape),
`src/lib/diagnostics/conditions.ts`,
`src/tests/unit/conditions.test.ts`, `src/tests/unit/condition-response.test.ts`,
`scripts/checks/tool-check-ids.mjs` (`:16`), `scripts/checks/check-tool-heuristics.mjs` (the
`config.csrf-disable` heuristic at `:34`, `:58-60`, retired with the id; the matching WATCH comment is
`conditions.ts:103-105`), `scripts/checks/shipped-anchors.json` (entries kept, new anchor added),
`tool/testdata/copy.golden.md` (the old csrf details at `:356-357` and `:370`, regenerated by the
golden update the tool's gate documents), `packages/create-cairn-site/test/fixtures/transcripts/04-doctor-report.txt:5`
(its `checkOrigin` PASS line, edited by hand; `01d-resume.txt` quotes Kit's own deprecation text as
captured output and stays), `tool/CHANGELOG.md`, and the minimal reference edits
(`docs/reference/cli-cairn-doctor.md`, `docs/reference/cli-cairn-json-output.md`) the gates need.
`check-rulings-format.mjs:72` names only the ruling slug `audit-cli-config-csrf-disable-check`, not a
check id, and stays. `check_floors_test.go` carries no csrf text; only its peer-shape fixture moves.
The new anchor needs only its `shipped-anchors.json` entry now: `docs/admin/` is empty until the
admin arm is rebuilt, so `check:readiness` runs in list mode (`check-readiness.mjs:15-19`) and no
heading lands this pass. Pre-flight 2026-10-05.

**Outcome:**
- `check_csrf.go` reads the `csrf` key in the Vite config and fails on a `trustedOrigins` entry of
  `'*'` or `'null'` (Task 7, C: Kit compares the raw Origin string, so `'null'` admits every
  opaque-origin POST, which any attacker can produce from a sandboxed iframe; Kit 3 `csrf.js:42`, Kit
  2.70 `respond.js:87`; it is also the obvious wrong fix for this pass's `Origin: null` 403), both
  under `config.csrf-trusted-origins-wildcard` with a detail naming the entry; any other entry passes
  with a detail that it widens `/admin` too, and an `http://` entry for a non-local host says it also
  admits a network attacker on that origin; no `csrf` key passes. It
  reports as check `config.csrf-trusted-origins` under condition
  `config.csrf-trusted-origins-wildcard` (severity `warning`, accepted by Task 7 with both of
  Decision 5's premises verified), present in both registries. The condition's `why` states the
  exposure plainly: `'*'` turns off SvelteKit's Origin check on every route; cairn's admin keeps its
  token and member actions keep their own origin compare; the site's own forms have no Origin check.
  It adds: "Site actions that read a member session through `resolveSubject` are among those forms;
  `SameSite=Lax` stops a cross-site post but not one from a sibling subdomain." Acceptance adds:
  `['null']`, and `'null'` among other entries, fail; `['https://null.example']` passes.
- States the check cannot read never pass silently. Today `check_csrf.go` reads only
  `vite.config.ts` and `svelte.config.js`; the new check either also reads `vite.config.js` and
  `vite.config.mts` or reports them UNCHECKED under the no-config rule, and the report says which.
  No `vite.config.*` stays UNCHECKED, as the
  current check reports (`uncheckedCsrfDetail`, `check_csrf.go:13`). A `trustedOrigins` value it
  cannot read statically (an identifier, a spread, an env-derived list) is UNCHECKED with a detail
  saying so. A site still carrying `svelte.config.js` is UNCHECKED with a detail pointing at the
  config move (the `Consumers must:` line's population, where `checkOrigin` is a Kit 3 build error).
  `trustedOrigins: []` passes.
- `config.csrf-disable`, `config.csrf-disable-missing`, and `auth.csrf-origin-mismatch` retire from
  both registries; the anchors `non-admin-origin-rejected` and `wire-cairns-csrf-guard` stay on
  `shipped-anchors.json`.
- `config.no-referrer-blanket` stays at `warning`, reworded in `conditions.ts` and
  `check_referrer.go`: a site-wide `no-referrer` makes the site's own forms and `createAuthChannel`'s
  actions fail Kit's check, and cairn's admin documents pin their own policy unless a site meta follows
  `%sveltekit.head%`; the "safe only on a token-protected route" remedy is gone.
- `edge.https-not-forced`'s copy is re-read and corrected if it rests on the old premise.
- The doctor's floor fixtures and goldens show the Kit 3 peer shape (fixture data only; the check
  reads the installed engine's peers at runtime).
- `tool/CHANGELOG.md` `## Unreleased` carries the major: the three ids removed, the new id added, and
  a `Consumers must:` line to upgrade to `v2`, since `v1.1.0`'s doctor recommends `checkOrigin: false`.

**Acceptance:**
- Table-driven Go tests over Vite-config fixtures: `trustedOrigins: ['*']` (and `"*"`, and `'*'` among
  other entries) fails; `['https://a.example']` passes with the widening detail; no `csrf` key passes;
  a commented-out `'*'` passes; `[]` passes; an unreadable value is UNCHECKED; no Vite config is
  UNCHECKED, never PASS; a remaining `svelte.config.js` is UNCHECKED with the move detail. The `'*'`
  case fails on the old check, which never read `trustedOrigins`.
- `check:tool-conditions` green, so the two registries agree id for id; `conditions.test.ts` asserts
  the new condition's fields and the three ids' absence.
- `git grep -nE "csrf-disable|csrf-origin-mismatch|checkOrigin" -- tool src/lib scripts/checks`
  prints only the two kept anchors in `shipped-anchors.json`, the CHANGELOG lines, and any Go test
  fixture proving an old `checkOrigin` line is now ignored (each named in the report).
- T green, then `cairn-run-gate 'npx vitest run --project unit && npm run check:tool-conditions && npm run check'`
  with `CAIRN_GATE_LANE=light` green (no browser).

**Interfaces produced:** check id `config.csrf-trusted-origins`; condition
`config.csrf-trusted-origins-wildcard`; anchor `is-it-working.md#keep-sveltekits-origin-check-on`;
consumed by Task 13's reference and facts edits.

**Gate:** T plus the light task check above.

**S3 boundary:** F and T green; STATUS written.

---

## S4: the bump

### Task 10b: S3 leftovers (added at the S3 boundary, 2026-10-05)

**Pass class:** `tool` for the Go change, `engine-logic` for the comments; one task, light gate.
**Gate:** `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check && npm run check && npm run check:comments'`.

**Files:** `src/lib/auth-channel/factory.ts` (the `assertOriginAndScheme` doc comment, about `:66`),
`src/lib/sveltekit/guard.ts` (the deployed-admin-over-http comment, about `:207-213`),
`src/lib/sveltekit/admin-response.ts` (about `:32`), `tool/internal/doctor/check_csrf.go` and its test.

**Outcome:** the S3 reviews' out-of-scope findings in this pass's own code are closed.
- `factory.ts`: the comment says the action's origin check mirrors guard Rule 2, which S3 deleted; it
  now states what the check does on its own (SvelteKit's check covers forms but not `vite dev`, Task 7 A).
- `guard.ts`: the comment says the help page is served "before resolve() runs" the framework check;
  SvelteKit's Origin check runs before any `handle`, so the comment states the real order (the help
  page covers the GET a deployed-over-http editor sees; the POST would meet Kit's 403 first).
- `admin-response.ts`: the `app.html` mention says only an `app.html` meta placed after
  `%sveltekit.head%` overrides cairn's meta (Decision 11, amended).
- `check_csrf.go`: a template-literal computed key (`` [`csrf`] `` or `` [`trustedOrigins`] ``) is
  read like the quoted forms, so `'*'` behind one fails rather than passing as no key (the Task 10
  fix-round review's non-blocking note: the same silent-pass shape that round closed).

**Acceptance:** a table-driven Go case for each template-literal key shape, red on the old code;
`git grep -n "guard.ts's admin\|before resolve()" -- src/lib` prints nothing; the gate green.

### Task 11a: Kit 2.70 prep for the bump

**Pass class:** `auth-data` (it retires reads the dev-flag tripwires and `readPublicOrigin` depend
on). **Spec:** "Bindings", the `process.env` and test-fake bullets; S4. Decision 12.

**Files:** `src/lib/sveltekit/guard.ts` (the `process.env` flag read at `:197`),
`src/lib/auth-channel/factory.ts` (`:126`), `src/lib/dev-flag.ts` (`readPublicOrigin`'s fallback at
`:89`, the `depth` it no longer needs (`:79`, described at `:54-75`), the comments that name
`process.env` or adapter-node, among them `guard.ts:183-184` and `factory.ts:103-107`),
`src/lib/sveltekit/csrf.ts` (comments only), their tests, `examples/showcase/e2e/members.spec.ts`
(the three bodyless POSTs at `:26`, `:177`, `:196`; pre-flight 2026-10-05), a new `src/tests/helpers/cloudflare-workers-fake.ts` with
its unit test and setup file, `vitest.config.ts` (the `unit` and `component` aliases), and the minimal
reference edits that keep the gates green.

**Outcome:**
- The guard's and the factory's dev-flag reads and `readPublicOrigin` read `platform.env` alone; the
  `process.env` reads, the adapter-node comment, and `readPublicOrigin`'s `PUBLIC_ORIGIN` fallback
  retire, and `depth: 'platform-only'` collapses.
- The three `members.spec.ts` POSTs with no content type (`:26`, `:177`, `:196`) send a body.
- The `cloudflare:workers` fake lands, browser-safe (no `node:async_hooks`), with a swap-and-restore
  `withEnv`, a collecting `waitUntil`, and a `beforeEach` reset; `unit` and `component` alias
  `cloudflare:workers` to it. Nothing in `src/lib` imports it yet.

**Acceptance (test-first):**
- A guard test with the flag set only in `process.env` gets no refusal, and with the flag in
  `platform.env` gets the 503. Mutation proof: with the `process.env` read restored, the first test
  goes red (quoted run, then restored).
- A factory test, on a fresh `createAuthChannel` instance per case (its flag cache latches per
  instance), shows the same pair. A `readPublicOrigin` test with `PUBLIC_ORIGIN` only in
  `process.env` returns nothing.
- The fake's unit test proves `withEnv` restores the outer `env` after a nested call and after a
  throw, that `flushWaitUntil` settles every collected promise, and that after `setFakeEnvThrowing()`
  any `env` access or `withEnv` call throws until `resetFakeEnv()`.
- `git grep -n "process.env" -- src/lib/sveltekit/guard.ts src/lib/auth-channel/factory.ts src/lib/dev-flag.ts`
  prints nothing.
- F green.

**Interfaces produced:** `src/tests/helpers/cloudflare-workers-fake.ts` exporting the module surface
(`env`, `waitUntil`, `withEnv`) plus `setFakeEnv(bindings: Record<string, unknown>): void`,
`resetFakeEnv(): void`, `flushWaitUntil(): Promise<void>`, and `setFakeEnvThrowing(): void` (every
`env` access and `withEnv` call throws, mirroring adapter 8's prerender throw, for 11b's Building
tests); consumed by Task 11b.

**Gate:** F.

### Task 11b: Kit 3, adapter 8, and `cloudflare:workers` (one atomic task)

**Pass class:** `auth-data`. **Model:** `opus`. **Spec:** "Bindings" (all), "Public surface" (the
table and the closing sentence), "Kit 3 API moves", "Public origin", S4. **Consumes:** Task 1's
record (its "Building gate" line); Task 2's `$app/env` stub; Task 3's recorded fallback, if any, and
its two prerender counts; Task 11a's fake.

**Files:** `package.json`, `package-lock.json`, `packages/cairn-cms-dev/package.json`,
`examples/showcase/package.json` and its lockfile, `examples/showcase/vite.config.ts`,
`examples/showcase/wrangler.jsonc` if adapter 8 requires it, `examples/showcase/src/app.d.ts`, a new
committed `examples/showcase/worker-configuration.d.ts`, Waymark's counterpart
`templates/waymark/worker-configuration.d.ts` (written only by emit, never by hand),
`packages/create-cairn-site/scripts/emit-template-dir.mjs` (`composeTemplate`) and its test,
`scripts/build/emit-template.mjs` and its test if the copy step must skip the showcase's file,
`examples/showcase/src/hooks.server.ts`, `examples/showcase/src/chassis/**`
where it reads `platform`, and every other showcase and Waymark `platform` read (pre-flight
2026-10-05: `src/app.d.ts`, `src/theme/cairn.config.ts`, `src/routes/media/[...path]/+server.ts`,
`src/routes/admin/signups/+page.server.ts`, `src/members/channel.ts`, and the showcase's
`src/routes/test/{last-otp,reset-members,revoke-member-session}/+server.ts`), the
`auth.channel.delivery_inline` entries in `src/lib/log/events.ts`, `src/lib/log/events-list.ts`,
`docs/reference/log-events.md`, and `docs/reference/auth-channel.md` (minimal; Task 13 writes the
prose), both `cloudflare:*` externals in `src/tests/unit/dist-sveltekit-app-import-boundary.test.ts`
(`:54` and `:100`), a new `src/lib/sveltekit/workers-env.ts`, every `src/lib` file with a
`platform` read (plan time: 62 lines in 25 files; at `63a773db` the full
`event.platform|platform?.(env|ctx)` set is 109 occurrences in 26 `src/lib` files, 27 in 6 dev-package
files, 13 in 8 showcase files, 7 in 5 Waymark files), `src/lib/sveltekit/platform-bindings.ts`,
`src/lib/sveltekit/types.ts`, `src/lib/sveltekit/guard.ts`, `src/lib/sveltekit/csrf.ts`,
`src/lib/dev-flag.ts`, `src/lib/auth-channel/factory.ts`, `src/lib/sveltekit/auth-routes.ts`,
`src/lib/sveltekit/section-action.ts`, `src/lib/sveltekit/admin-action.ts`,
`src/lib/admin/MediaUploadDialog.svelte` (the `goto` option), `packages/cairn-cms-dev/src/handle.ts`
and its tests, `vitest.config.ts`, `src/tests/_app-env.ts`,
`src/tests/unit/dist-sveltekit-app-import-boundary.test.ts` (its externals), every test building an
event literal with `platform:`, the type test for `CairnPlatformBindings`, `templates/waymark/**`
through `npm run emit:template`, `docs/internal/api-surface.md` (regenerated), and the minimal
reference and `log-events.md` edits that keep the gates green.

**Outcome:**
- **Versions:** `@sveltejs/kit` `^3` (peer and devDependency), svelte peer `^5.57.1`, dev package kit
  peer `^3`, adapter-cloudflare `^8` in the showcase (Waymark through emit), each at the newest
  production release.
- **Bindings:** `src/lib/sveltekit/workers-env.ts` is the engine's only `cloudflare:workers` import,
  exporting `env` and `waitUntil`; every engine read of `event.platform` reads it; `csrfSecure`,
  `issueCsrfToken`, `csrfHeaderVerdict`, and `readPublicOrigin` drop their `platform` member;
  `dev-flag.ts` and `env.ts` keep taking `env` as an argument.
- **Building:** no engine code touches `env` or `withEnv` while `building`; this task adds a
  `building` gate to the guard's dev-flag tripwire and to `devBackendHandle` (neither has one at
  `63a773db`; `preview.ts:434-439` is the only `$app/env` site in `src/lib`), in the gate form Task 1's item 4 recorded (the
  `preview.ts:433-440` dynamic-import-in-`try`/`catch` form unless the record names another), so the
  `./sveltekit` barrel stays free of any static `$app/*` import and the existing esbuild boundary test
  stays green (with `cloudflare:*` external, as Wrangler's bundler treats it).
- **Dev backend:** `devBackendHandle` wraps `resolve` in
  `withEnv({ ...env, ...doubles }, () => resolve(event))`, spreading so a second handle nests; no
  `locals` key, no layering code (Decision 10 retired the showcase's second handle).
- **`waitUntil`:** from the module, always defined; the auth channel's inline-await branch and
  `auth.channel.delivery_inline` retire.
- **Public surface,** per the spec's table: `CairnPlatformBindings` re-expressed as the interface a
  `wrangler types` `Env` satisfies, with a `satisfies` type test against the showcase's committed
  generated `Env` under `npm run check`; `CairnEvent` loses `platform` and its `Env` parameter;
  `PlatformContext` retires; `resolveDb`, `DeliverContext`, `lookup`/`verify`, and
  `createD1AuditSink` keep their shapes, sourced from the module; route factories keep `Env` on their
  own config callbacks.
- **The generated `Env`:** generated from a named, committed input that carries every secret name
  `CairnPlatformBindings` requires (`GITHUB_APP_PRIVATE_KEY_B64` is a secret absent from
  `wrangler.jsonc`) and never the dev flag, such as `packages/create-cairn-site/template-repo/.dev.vars.example` (emitted at
  `templates/waymark/.dev.vars.example`) through `--env-file`; the showcase has no
  `.dev.vars.example`, so its input is that file or a new committed file the report names; the report names the input and the command. Waymark's `Env` carries no `MEMBER_DB`
  (the binding sits inside `cairn-template:exclude` markers that a generated file cannot carry), so
  emit never ships the showcase's file: `composeTemplate` regenerates
  `worker-configuration.d.ts` in the scratch tree, after the marker strip and the overlay, with the
  root's installed `wrangler types` against the stripped template `wrangler.jsonc` and the
  overlay's `.dev.vars.example` through `--env-file`. A file generated beside the template instead
  would be deleted by the next `emit:template` and flagged as drift by `check:template`
  (`emit-template-dir.mjs:204-225`).
- **Kit 3 API:** `Handle` from `@sveltejs/kit/hooks` in the engine, the dev package, and every
  template `hooks.server.ts`; the `goto` option `{ invalidateAll: true }` becomes
  `{ refreshAll: true }`; the identity `logoutUrl` redirect passes `{ external: [<the validated
  logoutUrl's origin>] }` (relative fallback unchanged; the guard's validation stays); the
  `handleError` comments at `section-action.ts:118` and `admin-action.ts:60` corrected only if they
  misstate Kit 3. Task 3's fallback, if recorded, lands here.
- **Showcase, Waymark, scaffold:** `App.Platform` deleted; the committed `wrangler types` `Env` is the
  binding type; any adapter option adapter 8 removed is gone.
- **Tests:** `unit` and `component` use Task 11a's fake; `integration` runs on the native module in
  workerd.

**Acceptance:**
- **Grep-zero** (each prints nothing):
  `git grep -nE '\.platform\b|App\.Platform|PlatformContext|\$app/environment|invalidateAll|\$lib\b' -- src/lib packages/cairn-cms-dev examples/showcase/src examples/showcase/e2e templates/waymark`;
  `git grep -nE '^\s*platform\s*:' -- src/tests packages/cairn-cms-dev examples/showcase`; no `json` or
  `text` named import from `@sveltejs/kit` in those trees; `git grep -n "cloudflare:workers" -- src/lib`
  prints exactly `src/lib/sveltekit/workers-env.ts`. The first grep also catches comment and doc-comment
  mentions, and every one goes (pre-flight 2026-10-05, at `63a773db`): the `App.Platform['env']`
  generics in `members/channel.ts:56` and the signups pages (`:60-61`), and the doc comments at
  `factory.ts:576`, `section-action.ts:153-154`, `admin-action.ts:193`, `health.ts:22`,
  `types.ts:29,57,99`, `media-route.ts:130`, `platform-bindings.ts:1-13`, `MediaUploadDialog.svelte:208`
  (beside the `goto` option at `:212`), and the `$lib` comments at `vite/internal.ts:91,99`.
- **Import graph:** a test (or check script) walks the packed `dist` from each Node-context entry and
  fails if any reaches `workers-env`. Positive control: the walk from the `./sveltekit` entry must
  reach `workers-env`, and the check fails if it does not; the report quotes the reached-module count
  per entry, so an entry resolving zero modules shows as zero.
- **Building (Review focus 1):** unit tests with `building` true and the fake in
  `setFakeEnvThrowing()` mode prove the tripwire and `devBackendHandle` never touch `env` or `withEnv`. The default and
  the flagged showcase builds each prerender their `(site)` routes, the report quoting both counts,
  each equal to Task 3's counterpart: the default build proves the guard's tripwire under prerender,
  the flagged build the dev handle's.
- **`withEnv` nesting:** a test sequences `devBackendHandle` with a test-local second handle that
  adds its own double and reads a double from each inside a route and an engine read.
- **`waitUntil`:** a test flushes the fake's collected promises and observes the deferred delivery and
  audit-sink writes.
- **Tripwires and `csrfSecure`:** a test sets the flag in the fake `env` outside dev and gets the
  guard's 503; a factory test on a fresh instance gets the set-and-deployed refusal, and a passing
  case (flag set on a local host) gets none; a `csrfSecure` test with the fake `env` carrying an
  `https` `PUBLIC_ORIGIN` and a non-local http URL takes the Secure branch.
- **Redirect:** a test asserts the identity logout redirect leaves for the validated external origin
  and a relative fallback still redirects.
- **Type test:** the `satisfies` test is green under `npm run check`; `wrangler types --check` against
  the named input passes on the committed files (quoted).
- **Waymark's `Env`** (each quoted): `grep -c MEMBER_DB templates/waymark/worker-configuration.d.ts`
  prints 0; `wrangler types --check` with the overlay's `.dev.vars.example` as `--env-file` passes in
  `templates/waymark`; `npm run check:template` is green.
- **Mutation proofs** (`auth-data`): the report quotes one red run per item, each restored after:
  a `building` guard removed (the tripwire, then `devBackendHandle`); spread replaced by replace in
  `devBackendHandle`; the inline `waitUntil` branch restored; the guard's module-`env` flag read
  removed; the factory's flag read or its `isDeployedHost` `PUBLIC_ORIGIN` read removed;
  `csrfSecure`'s `PUBLIC_ORIGIN` branch removed; a required member deleted from a copy of the
  generated `Env` (`npm run check` red); the redirect allowlist dropped; a temporary `workers-env`
  import added to a Node-context entry (the import-graph check red).
- **Warnings:** zero Kit `config_option_deprecated*` warnings in the showcase build and in the Waymark
  build (`TMPDIR=$HOME/.cache/cairn-tmp npm run test:theme-fixture -- --arm template --build-only`),
  each beside the build's exit 0 and a line every successful build prints (the adapter banner or the
  prerender summary), so an empty or failed log cannot pass; the scaffolded-site build is proven by
  CI's `scaffold.yml` at the S4 boundary.
- **Registry install (Review focus 3):** the spike harness in consumer mode against this task's
  `npm pack` tarballs passes all five conditions (the harness's consumer mode emits five RESULT lines: install, wrangler-types, svelte-check, vite-build, login; 11b review), the login marker included (quoted).
- A from-scratch showcase reinstall precedes the e2e (`realpath` quoted), and the full e2e suite is
  green under `wrangler dev`. `check:reference`, `check:reference:signatures`, and `check:surface`
  green. F green.

**Interfaces produced:** `src/lib/sveltekit/workers-env.ts` exporting `env` (typed as
`CairnPlatformBindings`; the media bucket is read by its configured name through `requireBucket`,
`src/lib/env.ts:98`, and the report states the type that call site sees) and
`waitUntil(promise: Promise<unknown>): void`; `$app/env` stub with a settable `building`;
`CairnEvent` (no type parameter); `CairnPlatformBindings` (interface, `wrangler types`-satisfied); the
type test, whose `CairnPlatformBindings` snippet Task 13's reference page quotes.

**Gate:** F.

**S4 boundary:** F green; push; every CI workflow green on the segment head (`scaffold.yml` and
`create-site.yml` included). STATUS written.

---

## S5: scaffold, docs, and records

### Task 11c: Walk self-referencing imports in the reach test (added at the S4 boundary, 2026-10-05)

**Pass class:** `engine-logic`. **Gate:** `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check && npm run test:node-projects'`.

**Files:** `src/tests/unit/workers-env-reach.test.ts`.

**Outcome:** (the test already loads `Manifest.exports` at `:15-20`; its three specifier regexes at `:20-40` all
require `./` or `../`) the import-graph test that proves no Node-context entry reaches `src/lib/sveltekit/workers-env.ts`
follows self-referencing bare specifiers (`@glw907/cairn-cms` and `@glw907/cairn-cms/<subpath>`) by resolving
them through the root `package.json` `exports` map to their `dist` files, as well as relative specifiers. At
`9ff58730` the walk follows only relative specifiers, so `dist/vite/internal.js`'s self-references
(`@glw907/cairn-cms/delivery/data`, `@glw907/cairn-cms`) are never walked (11b review, non-blocking).

**Acceptance:** a fixture or mutation proves a Node entry that reaches `workers-env` only through a self-referencing
specifier fails the test (quoted red, then restored); the real `dist` still passes; the gate green.


### Task 12: `create-cairn-site` at the Kit 3 shape

**Pass class:** `engine-logic`, class gate overridden to S by blast radius (no engine source
changes; header Overrides). **Spec:** S5.

**Files:** `packages/create-cairn-site/src/**` and `test/**` wherever they name Kit 2, adapter 7,
`svelte.config.js`, `App.Platform`, `checkOrigin`, or `$lib` (S5 pre-flight, 2026-10-05: grep finds nothing to
edit in `src/` or `scripts/`; the work is a new baked-template test, the README, and the overlay),
`packages/create-cairn-site/README.md`,
`packages/create-cairn-site/scripts/bake-template.mjs` and its test if the bake names a removed file,
`packages/create-cairn-site/template-repo/**` (the overlay README and `.dev.vars.example`).

**Outcome:** the scaffold produces a Kit 3 / adapter 8 site identical to the emitted Waymark, with no
`svelte.config.js`, no `csrf` block, no `App.Platform`, `#lib` imports, and a `preview` script that
serves through `wrangler dev`; the README names the generated site's toolchain floors (SvelteKit 3,
adapter-cloudflare 8, vite `^8.0.12`, wrangler `^4.118`, Node `>=22.17`). The preflight keeps checking only the
scaffolder's own Node (`engines.node` `>=24`): it runs before the scaffold installs vite and wrangler, so a floor
check on them there would test nothing (conductor ruling at the S5 pre-flight).

**Acceptance:**
- A scaffold test over a fresh bake asserts (it runs `scripts/bake-template.mjs --to <dir>` itself into a scratch
  dir under `$HOME/.cache`: the in-tree `packages/create-cairn-site/template/` is gitignored and is a stale pre-Kit-3
  bake, so a test reading it would assert on stale state) the absence of `svelte.config.js`, any `csrf` key,
  and `App.Platform`, and the presence of the `imports` field; each assertion fails on the Kit 2
  template.
- `git grep -nE "svelte\.config|checkOrigin|App\.Platform|event\.platform|platform\.env|\\\$lib\b|\^2\.70|adapter-cloudflare.*\^7" -- packages/create-cairn-site ':!**/fixtures/**' ':!packages/create-cairn-site/scripts/emit-template-dir.test.mjs'`
  prints nothing (the excluded test uses `svelte.config.js` as a linkcheck fixture filename, `:159` and `:162`; this
  grep cannot see the gitignored `template/`, so the fresh-bake test above is the real proof;
  `process.platform` is not a binding read and does not match).
- S green; the CI `scaffold.yml` and `create-site.yml` runs on the task's push are green.

**Interfaces produced:** none new.

**Gate:** S.

### Task 13: Docs, records, and the kit#15992 cleanup

**Pass class:** `docs`. **Spec:** "Docs and records", "Consumers must", "Sequencing with stage 2a",
"ROADMAP watches this pass trips", S5's kit#15992 bullet; the fold record's "Errata owed". Drafts to
the developer brief in `docs/internal/docs-register.md`; Vale's error tier is the floor.

**Files:** `docs/reference/{admin-routes,sveltekit,auth-channel,core,cli-cairn-doctor,cli-cairn-json-output,supported-toolchain,log-events}.md`
and every other page the repoint grep names; `docs/internal/facts/*.md`;
`docs/internal/api-surface.md` (regenerated if not already current); `CHANGELOG.md`;
`docs/extend/migration-notes.md`; `docs/extend/upgrade-cairn.md`; `docs/internal/durable-gotchas.md`;
`docs/internal/engine-rulings.md`; `docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`
(erratum at `:228`); `docs/internal/admin-smoke-test.md`; `CLAUDE.md`; `ROADMAP.md`.

**Outcome:**
- **Already landed with 11b (verify, do not redraft):** the `PlatformContext` retirement, the `delivery_inline`
  retirement and `guard.refused` without `origin` in `log-events.md`, and the `cloudflare:workers` call form
  (`sveltekit.md:70`, `:704`, `:725`; `auth-channel.md:45`, `:55`, `:78-79`). Starting set at `57f5c969` for the
  first acceptance grep: 8 lines (`admin-routes.md:8,14,15`, `cli-cairn-doctor.md:34,82`,
  `supported-toolchain.md:94-99`); `cli-cairn-json-output.md:442-445` and `:504` carry the new id, and the three
  retired ids still need noting. The doctor anchor `keep-sveltekits-origin-check-on` is a facts bullet only: no
  `docs/admin/is-it-working.md` exists until the admin arm is rebuilt. Beyond the 55-id candidate set, a keyword
  grep found 17 more bullets to triage (`05q9zk 1wimos fsshp5 ot3zkq yc3ivl zhpap6` in admin.md;
  `0gltjq 0vofop 7qqhda 8rnym5 979v0a 9ik061 diro7m keuj8l mhsere njh87y` in extend.md; `doq8s2` in reference.md),
  some likely noise.
- **Reference pages** state the new surface: `CairnPlatformBindings` (its snippet quoted from Task
  11b's type test, per the spec's table) and the CSRF handoff (`admin-routes.md`); `CairnEvent`, `PlatformContext`'s retirement, `resolveDb`'s rewritten rationale
  (`sveltekit.md:765-768`, which calls itself ratified at `:766`), and the `createD1AuditSink` call form
  `import { env, waitUntil } from 'cloudflare:workers'` (`sveltekit.md`); `DeliverContext`,
  `waitUntil` (the `process.env` sentence at `auth-channel.md:140` is already rewritten by 11b; verify); `core.md`;
  `cli-cairn-doctor.md` and the frozen-id list in `cli-cairn-json-output.md` under the tool major;
  `supported-toolchain.md`; `log-events.md` (`guard.refused` without `origin`,
  `auth.channel.delivery_inline` retired, an anchor keyed on Kit's literal
  `Cross-site POST form submissions are forbidden`, with the Workers Logs invocation record as the
  diagnostic). Every page naming `svelte.config.js`, `platform.env`, `platform.ctx`,
  `PlatformContext`, `checkOrigin`, or `process.env` for the flag or `PUBLIC_ORIGIN` is repointed.
- **The `cloudflare:workers` specifier** (11b review): 11b's grep-zero reworded the public doc comments on
  `DeliverContext`, `createD1AuditSink`, and `types.ts` to say "the `waitUntil` the Workers runtime exports", and
  `createD1AuditSink`'s JSDoc lost its import example. The reference pages (`sveltekit.md`, `auth-channel.md`)
  name the specifier and quote the call form `import { env, waitUntil } from 'cloudflare:workers'`, so a consumer
  knows where to import from.
- **Subpath-import snippets** (S1 finding, Task 3): every published snippet that imports through
  `$lib`, `$chassis`, or `$theme` moves to the `#` form the scaffold now emits (at `57f5c969`: 44 lines
  across 8 published files, by file `sveltekit.md` 14, `delivery-data.md` 11, `admin-routes.md` 6, `core.md` 6,
  `admin.md` 2, `delivery.md` 2, `islands.md` 1, `extend/choose-an-ai-posture.md` 2; the plan-time 55 in 14 counted
  internal docs, among them `docs/reference/{core,sveltekit,delivery-data,delivery,admin,admin-routes,islands}.md`).
  A page that deliberately targets a site scaffolded before this change (Task 3's implementer named
  `docs/extend/choose-an-ai-posture.md`) keeps its form and says which scaffold it targets.
  Internal docs (`docs/internal/code-idioms.md`, `pre-beta-harvest.md`) are triaged, not required.
- **Facts:** a correction to every bullet this pass falsifies, anchor bullets keeping their anchors
  and retired conditions marked retired. Plan-time candidate set (53 bullets; the docs task triages
  each to corrected, retired, or unchanged with a one-line reason in its report): admin.md
  `f:ex1604` `f:01tx08` `f:3mggl1` `f:b66soa` `f:5v8cda` `f:c0iqug` `f:67pwmj` `f:biealg` `f:4dolfa`
  `f:np34jo` `f:bw5uk0`; reference.md `f:v2isa4` `f:xg1per` `f:256utj` `f:yfg97w`; extend.md
  `f:3j02dk` `f:rurhey` `f:esp93u` `f:xgy3iu` `f:jra92k` `f:xyizai` `f:fekvhi` `f:ifuvcl` `f:vvgpr5`
  `f:d2jumm` `f:e5hqn3` `f:gs1wzb` `f:gnlib7` `f:ogz5eu` `f:swjwxb` `f:iw346n` `f:l41gju` `f:sjo4cx`
  `f:gh73p5` `f:gncd64` `f:ubuj1w` `f:g22dnw` `f:tkpmxr` `f:ix10bm` `f:qbfriw` `f:3cekcy` `f:x2stjk`
  `f:72xplg` `f:zke3iw` `f:7rehzh` `f:t2t5lx` `f:n4rg1z` `f:n52h8f` `f:oh5rdd` `f:onqm6k` `f:phknca`
  `f:qlgggh` `f:gwpffe`, plus `f:9cztdn` and `f:6xsj29`, whose line citations S3 shifted (the task re-runs the keyword grep and amends the set; the S5 pre-flight
leaves the set to it). New bullets: the
  bodyless server-to-server POST refusal; the `custom_domain`-under-`wrangler dev` Origin mismatch;
  `paths.origin` behind a proxy (Task 7: on Kit 3 a site that sets `paths.origin` passes Kit's check,
  but `createAuthChannel`'s `originMatches` still compares against `event.url.origin`, so member login
  there keeps failing as it does today; the bullet says so, as a known limit, not a regression); `createChannelDb` is Node only, not under workerd; the new doctor
  condition and its anchor; Kit's 403 anchor in `is-it-working`; adapter 8 no longer caches worker
  responses in `caches.default` (adapter 7 did for every public `Cache-Control` response, `/media`
  and public SSR pages included).
- **CHANGELOG** `## Unreleased`: the pass's entry with the spec's ten `Consumers must:` lines plus
  Decision 13's two (`vite preview` cannot serve adapter 8 output; adapter 8 drops the worker-level
  cache), finalized against what shipped. The task also rules on a third candidate the S1 review
  raised: `loadPreview` now imports `$app/env`, so a consumer test that mocks or aliases
  `$app/environment` no longer reaches it, and the `try`/`catch` hides the miss (`building` falls
  back to `false`); a `Consumers must:` line or a stated reason it needs none. `migration-notes.md` and `upgrade-cairn.md` carry the same
  version record, the cache change included.
- **ROADMAP:** a watch for engine-side `/media` caching (Decision 14), triggered by a measured R2
  cost or `/media` latency problem on a production site, in the tier where it bites. Any published
  sentence on why the engine does not cache (a Cache API purge reaches one data center; the Cache
  API has no effect on `*.workers.dev`) quotes Cloudflare's docs, with the URL in the report.
- **`durable-gotchas.md`** gains the `cloudflare:workers` facts Task 1 proved, the prerender rule, the
  `vite preview` limit (kit#17271), and `node:sqlite`'s illegal constructor under workerd.
- **`engine-rulings.md`** dated notes, verdicts unchanged unless stated: `originmatches-strict-guard`,
  `audit-sveltekit-createauthguard`, `audit-sveltekit-platformcontext` (retire verdict recorded),
  `audit-sveltekit-cairnevent`, `audit-auth-delivercontext`,
  `audit-log-auth-channel-delivery-inline` (retire verdict recorded),
  `audit-sveltekit-created1auditsink`, `dev-backend-flag-refusal`, `convention-auth-loud-postures`.
- **Functional spec erratum** at `:228`: the confirm step's policy is `strict-origin` plus the meta.
- **`admin-smoke-test.md`:** its POST steps send an `Origin` matching the Worker URL (`:97-101` already say a POST
  needs one; the curl POSTs at about `:181`, `:195`, and `:208` each gain `-H "Origin: <Worker URL>"` where they lack
  it).
- **kit#15992 cleanup:** `CLAUDE.md:211`'s watch line gets a replacement standing example for an
  external trigger (the remote-functions routine `trig_0193pPNoyxsTGeUhF1xx7woa`, already rewritten
  2026-10-03; the routine itself is not touched); the four ROADMAP entries (`:52`, `:402`,
  `:1703-1718`, `:2147-2154` at `57f5c969`) are marked done or rewritten so none presents kit#15992 as pending.
- **ROADMAP dev-package watches:** the `APP_DB` overwrite (`:948-957` at `57f5c969`), the in-memory
  `MEDIA_BUCKET` (`:884-892`), and the missing `cairnAccess` (`:1555-1582`) defer, each re-armed to "the next pass
  that changes the dev package's double set or `DevBackendConfig`".

**Acceptance:**
- `git grep -nE 'svelte\.config\.js|platform\.env|platform\.ctx|PlatformContext|checkOrigin|delivery_inline|\^2\.70' -- docs/reference docs/extend/upgrade-cairn.md README.md`
  prints only lines the report names as intentional (a retired-symbol note, a version record).
- `git grep -n "kit#15992" -- CLAUDE.md ROADMAP.md` prints no line presenting it as a live watch.
- `git grep -nE '\$(lib|chassis|theme)/' -- docs/reference docs/extend README.md` prints only lines
  the report names as targeting the pre-change scaffold.
- Each of the nine `engine-rulings.md` ids carries a 2026-10 dated note (`check:rulings-format` green).
- The facts triage report covers every id in the candidate set; `check:facts` green.
- `git grep -n "caches.default" -- CHANGELOG.md docs/extend/migration-notes.md` shows the
  adapter 8 cache drop in each, and `ROADMAP.md` carries the Decision 14 watch with its trigger.
- The CHANGELOG entry carries one `Consumers must:` line per spec line plus Decision 13's two, and
  the spike harness's consumer-mode wiring matches `upgrade-cairn.md` step for step (a step the harness needs that the
  page lacks is a docs defect fixed here).
- D green.

**Interfaces produced:** none consumed later; the close finalizes STATUS and HISTORY.

**Gate:** D.

**S5 boundary:** `check:close` green; STATUS written.

---

## Close

Run `pass-core`'s ritual with the cairn specifics, in order:

1. **Simplify, once:** `code-simplifier:code-simplifier` over the pass's changed TypeScript,
   JavaScript, Svelte, and Go, then the full gate again if it changed code.
2. **Full gate:** `cairn-run-gate 'npm test'` exits 0, then `cairn-run-gate 'npm run check:close'`
   (0 errors, 0 warnings), then T.
3. **Consumer proof:** the spike harness in consumer mode against the final `npm pack` tarballs:
   `npx sv create` (current release, minimal TypeScript); `npm install <tgz>` exits 0 with no
   `--legacy-peer-deps` or `--force`; the documented wiring and `wrangler types` applied;
   `svelte-check` 0 errors and 0 warnings; `vite build` exits 0; `wrangler dev` answers
   `GET /admin/login` with 200 and cairn's login form marker in the body. Plus the CI `e2e` run on
   the pushed head. Evidence quoted.
4. **Review fan-out, in parallel:** `web-auth-security-reviewer` (at `high`), `svelte-reviewer`,
   `cloudflare-workers-reviewer`, and a `go-architecture-reader` per touched Go package
   (`tool/internal/doctor`, `tool/internal/spine`, and any other the diff names). Blocking findings go
   through one fix chain; out-of-scope findings go to `docs/internal/docs-friction-log.md`.
5. **Live auth smoke (Ruling 1):** the showcase under local `wrangler dev`, dev backend off.
   - **Build and env:** the default `npm run build` (no `VITE_CAIRN_E2E`), and no `CAIRN_DEV_BACKEND`
     in `--var` or in any `.dev.vars` in the showcase (checked first); the guard's tripwire 503 is the
     self-check if the flag leaks in.
   - **Server:** `wrangler dev` on a port from an environment variable (never 4173 or 4392), with
     `--var PUBLIC_ORIGIN:http://localhost:$PORT`; a local `AUTH_DB` migrated and seeded with an
     editor row.
   - **Session:** only from Geoff's confirm click. Request a magic link; read it from wrangler's local
     `send_email` message file (`.wrangler/tmp/email/.../email-text/<id>.txt`); Geoff clicks it in
     Firefox; confirm lands in `/admin`. No seeded `session` row: `docs/internal/admin-smoke-test.md`
     mints sessions by row insert, so it is followed only for its POST-`Origin` steps.
   - **Save evidence:** the showcase's GitHub App is a placeholder
     (`examples/showcase/src/theme/cairn.config.ts:149`) and Ruling 1 provisions none, so no Save can
     commit. The evidence is a browser Save POST that passes Kit's check and the guard's token and
     reaches the commit path: no Kit 403, no `guard.refused`, no `auth.csrf-token-invalid`, and the
     commit path's own failure record (expected `commit.failed` at `error`) quoted from the logs.
   - Accepted cost: over http, the `__Host-` prefix and the Secure branch go unexercised until
     cairn.pub's migration, and so does a real commit; both are recorded with the evidence.
6. **Docs check:** Task 13's pages re-read against any close-time fix; `check:surface -- --update`
   re-run if a reviewer fix moved a typed export; the friction log triaged complete-or-move.
7. **Ledgers:** `docs/STATUS.md` rewritten present tense (≤60 lines): the pass closed unreleased, the
   release held until draft docs 2a lands, and these 2a carry-forwards: 2a rebases onto this `main`
   and rewrites the add-cairn tutorial against Kit 3, `f:skeche`, `f:ghzx9c`, and
   `facts/extend.md:144`'s `^2.70` claim, all on the `draft-docs-2a` branch, never edited here; the
   resume prompt's "add-cairn tutorial's pin included" and the "stopgap the upgrade pass rewrites"
   line are removed. `docs/HISTORY.md` takes the pass entry (what landed, what the gates caught, what
   a later pass would be wrong to rediscover, and whether any refused fold finding turned real). The
   plan takes its post-mortem with the budget score: tokens against 12.4M via `/cost`, planning misses,
   and execution sittings.
8. **Merge:** the PR leaves draft once CI is green; the merge to `main` waits for Geoff's go. No
   version bump, no `tool/v2.0.0` tag, no publish. The spike worktree and branch are removed.
9. **Pre-bake and hand off:** plan, STATUS, and ROADMAP committed; tree clean; the resume prompt names
   the next action (draft docs 2a resumes on the rebased branch).

## Ledger

### Checkpoint 1 (2026-10-04, end of S0; session cleared here)

**Task 0, pre-flight.**
1. No live executor: no `sveltekit-3` branch, worktree, or process; `main` clean.
2. Worktree `.claude/worktrees/sveltekit-3` on `sveltekit-3` from `main` at `b0e2bfbb`; `npm ci`; showcase
   reinstalled from scratch; `realpath` resolves `@glw907/cairn-cms` and `@glw907/cairn-cms-dev` into the worktree.
   A fresh worktree also needs `npm --prefix examples/showcase run build` (for `.svelte-kit/tsconfig.json`) and
   `npm run prepack -w packages/create-cairn-site` (the baked template) before F's check steps pass; the first gate
   agent did both, untracked output only.
3. Gate strings (from `gate-tier.mjs --range HEAD~1..HEAD --pin full|engine`; an empty range errors):
   F = `npm run check:docs-gate && npm run check && npm run test:node-projects && npm run test:component -- --no-file-parallelism && npm test -w packages/create-cairn-site && npm --prefix examples/showcase run test:e2e -- admin-visual.spec.ts && npm run check:comments && npm run check:surface && npm --prefix examples/showcase run test:e2e`;
   E = the same through `npm test -w packages/create-cairn-site`.
4. Baseline: two F runs under `E2E_PORT=4392` went red only in the showcase e2e (308 passed, 30 failed, all
   timeouts) while CI was green on the same code. Root cause: `examples/showcase/wrangler.jsonc:61` hardcodes
   `PUBLIC_ORIGIN` to `:4173`, so minted preview links hit a dead port (8 `preview.spec.ts` failures, ECONNREFUSED
   `::1:4173`) and their half-finished backend state cascades into 22 more (`site-visual` 20, `spellcheck`,
   `tidy`). STATUS's earlier blame on a dubplate `sirv` server was wrong; dubplate's gate binds only ephemeral ports.
   Fix: the Gates section now runs the e2e on the default port until Task 5, and Task 5 passes
   `--var PUBLIC_ORIGIN:http://localhost:$E2E_PORT` (`a0bb46aa`). A default-port e2e run gave `318 passed` of 338
   listed with no failure line; the 20 are unaccounted for (the log was truncated) and most likely sit in
   `site-visual.spec.ts`, which lists 56 tests but reported 36 when run alone. The formal default-port F baseline
   was in flight at the clear; its result is below or, if absent, the next session reruns it first.
5. Draft PR #103 (`sveltekit-3` to `main`). Inherited CI on the branch head: every workflow green (`test`, `e2e`,
   `design`, `scaffold`, `create-site`, `norms`). The branch carries 31 docs commits local `main` had not pushed.
6. Pre-flight (S0, S1, and the plan-time facts): all facts held except three, amended in `d95c4419`: wrangler is
   4.144.0 with the esbuild plugin at `cli.js:184154`; no component-local `$app/environment` stub exists (Task 2's
   real touch points are listed); the chassis README lines are `:42` to `:45` plus `test.yml:28-35`.
7. Dependency state: `@sveltejs/kit` 3.0.0, `@sveltejs/adapter-cloudflare` 8.0.0, and `@sveltejs/package` 3.0.0
   are each the newest production release. Newer minors and patches outside this pass's scope (wrangler 4.147.0,
   vite 8.3.2, `@lucide/svelte` 1.52.0, eslint 10.12.0, shiki 4.5.0, and others) go to a `dependency-upgrade`
   sweep after the pass; held majors unchanged.
8. Spend through S0: about 0.6M in subagents (pre-flight 0.12M, spike 0.2M, three gate runs and the diagnosis
   0.19M, plus the conductor); read `/cost` at the next checkpoint for the authoritative figure.

**Task 1, spike: GO** (`d95c4419`, record and harness under
`docs/superpowers/research/2026-10-03-sveltekit-3-spike/`). Items 1 to 4 pass; consumer mode fails only at
`GET /admin/login` (500, `config.bindings-missing`) because the probe tarball still reads `event.platform`, the
break Task 11b fixes. Flag delivery: `npx wrangler dev --port $PORT --ip 127.0.0.1 --inspector-port $((PORT+1)) --var CAIRN_DEV_BACKEND:1`
after `VITE_CAIRN_E2E=1 npm run build` and `npx wrangler d1 migrations apply MEMBER_DB --local`. Building gate:
`await import('$app/env')` inside `try`/`catch`, falling back to `false`. The harness needs `HARNESS_PORT` set.
Spike worktree `.claude/worktrees/sveltekit-3-spike` (branch `sveltekit-3-spike`, two probe commits) stays until
the close.

**Baseline result (default port, 2026-10-04):** F `gate exit: 1` with every step green except the e2e's 20
`site-visual.spec.ts` screenshots (site home and archive page 2, five viewports, light and dark; small pixel diffs,
ratio about 0.01): 94 passed in the `admin-visual` run, 318 passed and 20 failed of 338 in the full e2e. Those are
exactly the files `durable-gotchas.md`, "CI-canonical baselines this workstation cannot reproduce", names, so by its
rule the baseline is **green**, and the earlier 20-test gap was these failures. Every later local gate carries the
same rule: those 20 failures alone are green, any other visual failure is red, and no baseline is ever regenerated
locally. `pass-execute`'s `commonNotes` must carry this rule for the implementer and the reviewer.

**Next:** S1 (Tasks 2, 3, 4) through `pass-execute` by name, with the e2e on the default port and the baseline rule
above in `commonNotes`. S1's pre-flight is done (item 6).

### Checkpoint 2 (2026-10-05, end of S1)

**Overnight run ruling (Geoff, 2026-10-04):** the run continues past the 80 percent line unattended and hard-stops
at 14.9M (120 percent of the ceiling), writing STATUS. It stops before the close's live smoke, which needs his click.

**S1, workflow `wf_7395e0cb-58c`:** all three tasks accepted, no fix rounds, every gate green under the CI-baseline
rule (the 20 `site-visual` screenshots; one extra `styleguide-light-2560` load flake under a concurrent dubplate gate
passed when rerun alone).
- Task 2, `669cebf6`: the plan-time counts were wrong (3 real `$app/environment` imports, not 8); `healthz.spec.ts`
  now pins the JSON content type.
- Task 3, `0a5a6883`: prerender counts equal before and after on both builds (96 files, 64 pages); the dead alias
  maps in `check-public-skill.mjs` and the root `vitest.config.ts` are removed; no fallback needed.
- Task 4, `285b166e`: `@sveltejs/package` 3.0.0; the packed output is identical (876 files, same dist hashes); survey
  at `docs/superpowers/research/2026-10-03-sveltekit-package-3-survey.md`, three capabilities, all "no action".

**Out-of-scope findings:** the dev package's kit range (`^2.61.0`) is Task 11b's (`^3`, Global constraints); the
`csrf-disable` fix text naming `svelte.config.js` retires in Task 10, and its fact `f:4dolfa` is in Task 13's set.
The `$`-form reference snippets and the `$app/environment` mock change are this pass's own consequences, folded into
Task 13 rather than the friction log. Nothing filed.

**Spend:** S1 subagents 0.49M; through S1 about 1.2M of 12.4M (conductor estimate; `/cost` at the close). S1 took
about 3.5 hours of clock, most of it three full gates with an 11-minute e2e each, one doubled by a re-issue.

**Next:** S2 (Tasks 5, 6), pre-flight first.

### Checkpoint 3 (2026-10-05, end of S2)

**S2 tasks, all accepted.**
- Task 5, `63400541` (run `wf_c03dde58-74c`): the showcase e2e serves through `wrangler dev` with members on local
  D1; eight mutation proofs fired. The reviewer escalated only because the runner's resolved gate string lacked the
  `export E2E_PORT=4392 &&` prefix the conductor's own notes required; the conductor accepted (a runner artifact, every
  criterion met). Later segments set `E2E_PORT` outside the string (`E2E_PORT=4392 cairn-run-gate '<string>'`). The
  first S2 launch (`wf_1d2b3fe0-822`) was stopped before its first edit to add the light-lane rule after a dubplate
  session reported its gates queuing 20 to 28 minutes behind cairn's browserless checks; the rule now also lives in
  `cairn-implementer`'s definition (dotfiles `c6b1559`).
- Task 6, `166437ad` (run `wf_c8feb056-c09`): every other built-site caller serves through `wrangler dev`, flag by
  `--var`; flagged readiness probes require a 200 from `/admin/posts` (the old `curl -sf` loops accepted a redirect).
- Task 5b, `80868b98` (run `wf_6bc3cf3e-a99`, Opus, added at the boundary): the boundary F went red on one
  `admin-visual` zen test, which then failed 3 of 36 isolated runs. Root cause proven: the test pressed the zen chord
  once the server-rendered heading showed, about 130 ms before hydration attached `EditPage`'s keydown listener; a
  600 ms client-chunk delay made it fail 15 of 15. The test now waits for `.cm-content` (the readiness signal sibling
  specs use), asserts focus moved into the editor, and blurs before the capture; 120 of 120 zen runs passed. Test
  only; no product change; no baseline moved.

**Consequences recorded.** Under plain `vite dev`, the showcase members routes no longer receive the dev-backend flag
(Decision 10 retired the stamp; the e2e and `wrangler dev` paths are unaffected). `examples/showcase/wrangler.jsonc`
gains `dev.port: 4173`, emitted into Waymark, so `npm run preview` stays flag-free and a caller's `--port` overrides
it (wrangler rejects a duplicate `--port`). Task 5's implementer read "both body refusals" as the three members
routes only; the dev-package routes (`last-commit`, `branch-file`, `render-media`) gate on the define and
`devBackendOptIn()` alone, as before.

**Boundary evidence.** CI on `166437ad`: `test`, `e2e`, `design`, `scaffold`, `create-site`, and the dispatched
`norms` run `37281453512`, all green. Local F on `80868b98` (5b's gate): green under the CI-baseline rule (the 20
`site-visual` screenshots only), snapshot diff empty. CI on `80868b98` is checked before S3's first commit lands.

**Found at the boundary, fixed in S3 as Task 5c:** every `wrangler dev` run leaves a bundle in
`examples/showcase/.wrangler/tmp` that nothing cleans, and `check-symbols`'s `envVarInSourceTree`
(`scripts/checks/check-symbols.mjs:637`) greps that tree and `node_modules` once per token (5.9 s a token with the
directory present, 1.4 s with `--exclude-dir=.wrangler`). After about 20 local e2e runs,
`check-symbols.test.ts`'s corpus test passes its 120 s timeout. CI starts clean and never sees it. This pass caused it,
so it is fixed here, not filed.

**Friction filed on `main`** (`10cd0025`): the theme fixture's default port 4393 collides with the e2e inspector port,
and `test:theme-fixture` needs the light lane's memory override (5G/6G).

**S3 inputs folded:** the S3 pre-flight (`59c11065`) and Task 7's security read (`fd8c1730`, record
`docs/superpowers/research/2026-10-03-sveltekit-3-csrf-security-read.md`): proceed with amendments, each admin view owns
its referrer meta (Decision 11 amended), and the doctor fails `'null'` as well as `'*'`.

**Split decision:** no split. Spend through S2 is about 2.4M of 12.4M (subagents: S1 0.49M, S2 runs 0.66M, pre-flights
and boundary agents about 0.6M, plus the conductor; `/cost` at the close), far under the ceiling, so S3 to S5 run in
this pass as planned.

**Next:** S3, Tasks 5c, 8, 9, 10.

### Checkpoint 4 (2026-10-05, end of S3)

**S3, run `wf_d7eed126-fda`, all four accepted.**
- Task 5c, `c5dc0863`: `check-symbols`'s grep excludes `node_modules`, `.wrangler`, `.svelte-kit`, and `test-results`
  at the walk; `npm run check:symbols` went from 60 s to 3 s with a populated `.wrangler`, findings identical.
- Task 8, `40ae05e2` and `cf73dd12`: `strict-origin` on admin responses and `confirmLoad`; each admin view emits one
  referrer meta (Decision 11 amended). The e2e build mounts `devBackendHandle` in place of the guard, so the header
  assertion holds on the confirm document only. A GET to a non-confirm `/admin/auth/*` path (a 404) renders in the
  shell's public branch with no meta; it has no form, so no lockout risk.
- Task 9, `35b972da`: SvelteKit's origin check runs on every route; guard Rule 2 and `REASON_CONDITION.origin` are
  gone; the showcase and Waymark carry no `csrf` config. `guard.refused` has no typed reason union (a free string), so
  only the emission changed.
- Task 10, `db91c7a3` and `63a773db` (one fix round): the doctor reads `csrf.trustedOrigins`, fails `'*'` and
  `'null'`, and retires the three old condition ids. The fix round closed quoted and computed keys that read as "no
  key" and passed a wildcard silently.

**Boundary evidence (at `63a773db`).** T `gate exit: 0`. F green under the CI-baseline rule: 328 passed, the 20
`site-visual` screenshots only, snapshot diff empty, tree clean. Pushed; CI checked before S4's first commit lands.

**Out-of-scope triage (six findings).** Two closed by Task 10 (the `no-referrer-blanket` text and the retired
`csrf-disable-missing`). The stale `admin-routes.md`, `supported-toolchain.md`, `cli-cairn-doctor.md`, and
`engine-rulings.md` lines are already Task 13's; the drifted citations `f:9cztdn` and `f:6xsj29` join its fact set.
The code leftovers (`factory.ts:66`, `guard.ts:208-209`, `admin-response.ts:32`, and the template-literal key shape
in `check_csrf.go`) are Task 10b (`afe943dd`). Nothing to the friction log.

**S4 pre-flight** (`69015d71`): three bodyless `members.spec.ts` POSTs, not two; the guard and `devBackendHandle`
have no `building` gate yet, so 11b adds both; eight showcase and Waymark `platform` read sites and the
`delivery_inline` docs entries join 11b's files; the showcase has no `.dev.vars.example`; the grep-zero set covers
comment mentions too.

**Spend:** S3 run 0.56M (largest segment so far, one fix round); pre-flights, the security read, and gate agents
about 0.45M; total about 3.4M of 12.4M.

**Next:** S4, Tasks 10b, 11a, 11b.
