# Engine pass before stage 2b, pass A: access, auth, and the commit path

**Goal:** Make the adapter's `roles` and `access` the one declaration every reader uses, tighten
the access edges the 2a pages caveat, name the roles-migration failure, add the opt-in live GitHub
key check with its fingerprint and the health route's 503, keep a failed save's writing, and close
the commit path's unguarded writes to `main` and its blind spot for nested images. The pass lands
on `main` under `## Unreleased` and never releases.

**Architecture:** S1 lands the lead (one required `runtime` on the guard, the dev handle, and
per-route editor routes), the doctor's matching heuristic, and the access tightening, all against
the same access code. S2 takes the auth store, the auth channel, and the health route's status and
rotation strings, three tasks on disjoint seams. S3 moves the edit page onto `use:enhance` and then
puts every write to `main` behind a head guard, Library first and publish last, because publish
relies on the edit page's sequencing. S4 carries the nested-image fix, the live key check (blocked
on Geoff's fork 2), and the pass's docs and records.

**Tech stack:** SvelteKit 3.0.x, Svelte 5 runes, `@sveltejs/adapter-cloudflare` 8, vite 8, wrangler
4, D1 (`AUTH_DB`), vitest (node, workerd integration, and component projects), Playwright for the
showcase e2e, Go (`tool/`).

**Spec:** `docs/superpowers/specs/2026-10-07-engine-pass-pre-2b-design.md` at `27df5088` (reviewed,
folded, and verified). Its "Pass A" list is this plan's task list, numbered the same. Owner rulings:
`docs/superpowers/specs/2026-10-07-engine-pass-pre-2b-rulings.md`. Fold record and owed errata:
`docs/superpowers/research/2026-10-07-engine-pass-pre-2b-spec-fold.md`. The spec's line numbers are
`draft-docs-2a`'s; the pre-flight re-checks each at this pass's `main`. Where this plan and the spec
disagree, stop and report, except the items under "Decisions this plan takes".

**Pass class:** `auth-data` (the header class). Overrides, from the spec: Task 2 is `tool`; Tasks
5 and 7 are `engine-logic`; Task 12 is `docs`. Tasks 1, 3, 4, 6, 8, 9, 10, and 11 are `auth-data`.
Task 8 is `engine-logic` in the spec and runs here as `auth-data`, because the runner's
`engine-logic` bar sets `coverageBlocks: false` and `applyClassBar` demotes every `coverageOnly`
finding to `nonBlocking`, turning a `fix` left with nothing blocking into `accept`
(`~/.claude/workflows/pass-execute.js:264-267,345-359`). Under `engine-logic`, a missing abort or
dictionary-hold row would come back accepted with a batched note; under `auth-data` it blocks. Plan
B runs its Task 8 the same way. A mixed pass runs the union of its classes at the close.

**Token ceiling:** 11.1M for the whole pass, chains plus close. Basis: eleven code chains at 0.55M
each under the class gate, plus 0.10M for Task 8 as `auth-data` (6.15M; the observed rate is 0.4M to
0.5M per chain, raised for the full tier on the e2e-bearing tasks), the docs task at 1.2M, Task 0
at 0.2M, four pre-flights at 0.1M each (0.4M), one fix round per segment in reserve (1.0M), and the
close at 2.15M (the simplifier, four reviewer seats, the consumer proof, the live smoke and key
probe, ledgers, friction triage).
**At 80 percent (8.88M)** the conductor finishes the task in flight, writes STATUS, and stops at the
next segment boundary with one combined question. No budget question arrives mid-segment.

**Checkpoint interval:** every segment boundary (no segment holds more than three tasks). The
conductor writes STATUS and a Ledger entry in this plan at the end of S1, S2, S3, and S4, at any
split, and before any question to Geoff.

**Segments** (each ends on a green commit):

| Segment | Tasks | Boundary proof |
|---|---|---|
| S1, one declaration and the access edges | 1, 2, 3 | F and T green on the segment head (Task 3's pinned F stands if HEAD has not moved) |
| S2, the auth store, the channel, and the health status | 4, 5, 7 | F green |
| S3, the edit page and the commit path to `main` | 8, 9, 10 | F green; branch pushed; CI green |
| S4, nested media, the live check, and the records | 11, 6, 12 | D green (Task 12 is docs-only); close step 2 is the pass's final F, `check:close`, and T |

**Independence and the Files seams.** Tasks 2 and 3 have disjoint Files and both consume only
Task 1. Tasks 4 and 7 share the condition registry (`conditions.ts` and its generated mirror), and
Tasks 5 and 7 both edit `docs/reference/sveltekit.md`, so no S2 pair is disjoint. Task 9 is
disjoint from Task 8; Task 10 consumes both. Tasks 11 and 6 share
`docs/internal/api-surface.md`. Every task runs in sequence in the one worktree, and no relaunch
marks any pair `parallel`: one index, one gate key, and one emitted template.

**Split rule:** if the ceiling forces a split, cut at the S2 or the S3 boundary, never inside S1.
S1 is atomic because Task 1 alone makes the doctor false-fail every updated site, and Task 1 alone
leaves the reference rows naming the old `access_map_not_attached` cause. A cut leaves the rest
as a follow-up pass that runs before pass B, since pass B builds on this pass's hooks and dev
handle.

**Worktree:** `.claude/worktrees/engine-pre-2b-a`, branch `engine-pre-2b-a`, off `main` after
PR #107 (stage 2a's close) merges, at the commit that carries this plan. **Worktree e2e gotcha**
(`docs/internal/durable-gotchas.md`, "A worktree showcase e2e proves MAIN's engine"): Task 0 does a
from-scratch showcase install in the worktree and confirms with `realpath
examples/showcase/node_modules/@glw907/cairn-cms` (and the dev package) that both resolve into the
worktree. Task 4 and Task 10 repeat the `realpath` check if either touches a lockfile.

**Execution mode:** `pass-execute` by name, one invocation per segment, sequential (`parallel`
unset). Args:

```
{
  repo: "<absolute worktree path>",
  gate: "export E2E_PORT=4392 && <F, printed by Task 0>",
  implementer: "cairn-implementer",
  reviewer: "diff-reviewer",
  passClass: "auth-data",
  maxFix: 1,
  stopOnEscalate: true,
  classifier: true,
  commonNotes: "<Global constraints below, plus the pre-flight checklist from ~/.claude/docs/pass-gate-economy.md>",
  tasks: [{ id, title, criteria, files, notes, passClass?, gate?, gateTier?, gateLane?, model? }]
}
```

The implementer and the reviewer never read this plan, and the runner's review prompt shows
`criteria` but never `notes` (`~/.claude/workflows/pass-execute.js`, `reviewPrompt`). So a task's
`criteria` is, verbatim and in order: its **Outcome**, its **Acceptance**, its **Mutations**, and
its **Decisions carried** block, which holds the full text of every Decision the task cites (never
a bare "Decision N"). Its `files` is its Files line, and its `notes` is its own Notes only. A
task's own `passClass`, `gate`, `gateTier`, `gateLane`, and `model` are set where this plan sets
one. The `passClass` overrides are Task 2 `"tool"`, Tasks 5 and 7 `"engine-logic"`, and Task 12
`"docs"`; every other task, Task 8 included, inherits the header's `"auth-data"`. The `gateTier`
pins are under "Per-task gate"; Task 4 alone also sets its own `gate`.
`auth-data` fix rounds run the full gate (the runner reduces only a comment-only round under
`auth-data`). Task 0 and the close are conductor-led dispatches outside the runner.

**Models:** implementers `sonnet` (the agent's pin), except Task 6, which carries `model: "opus"`
in args (the single-flight slot under workerd cancellation; the runner's own fix round then runs on
Opus too, so the `auth-data` stop rule never fires before an Opus attempt). `diff-reviewer` on
`claude-opus-5-5` at `medium`; the close's `web-auth-security-reviewer` at `high`. **Upshift
candidate:** Task 8 (kit 3's `use:enhance` location rule). The runner has no mid-run conductor
hook, so a Task 8 mechanism defect standing after the runner's Sonnet fix round reaches the
conductor as a stopped task. The conductor then hand-dispatches one chain per `pass-core` on
`model: opus`, naming the task's original base SHA and the standing findings, so the reviewer sees
the whole task.

**Pre-flight (every segment):** before each segment's first dispatch, one `haiku` pre-flight lists
every factual claim that segment's tasks make about existing code at the worktree's HEAD (paths,
line numbers, counts, symbol names, script names) and checks each. The conductor amends the plan
and commits the amendment before dispatching. S1's claim list is under "Pre-flight claims, S1".

## Gates

Every gate runs through `cairn-run-gate '<string>'`; on exit 75, re-issue until it prints `gate
exit:`, never poll a log. `CAIRN_GATE_LANE=light` only for a gate that launches no browser. The
engine's root `npm test` and the component project drive Chromium and are never light.

- **Full (F):** the `full` tier of `scripts/checks/gate-tier.mjs`, printed by `node
  scripts/checks/gate-tier.mjs --range HEAD~1..HEAD --pin full` and quoted in Task 0's Ledger
  entry (under a pin the range only needs to be non-empty). It runs the docs gate, `npm run check`,
  the node projects and the serialized component project (`npm run test:node-projects && npm run
  test:component -- --no-file-parallelism`, never stock `npm test`), the `create-cairn-site` suite,
  the admin visual spec, `check:comments`, `check:surface`, CI's check list (`check:template`,
  `check:tool-heuristics`, `check:rulings-format` among them), and the whole showcase e2e.
- **Engine (E):** the `engine` tier of the same script, printed with `--pin engine`.
- **Tool (T):** `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`.
- **Docs (D):** `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:docs-gate && npm run
  check:surface && npm run check:rulings-format'`. The docs gate already runs `check:reference`,
  `check:reference:signatures`, and `check:facts`.

**Per-task gate.** The runner's classifier sizes each task's gate from its committed diff, with F
as the fallback. Tasks whose acceptance carries a showcase e2e, or whose change is the sign-in
path, pin `gateTier: "full"` (Tasks 1, 3, 7, 8, and 10). Tasks 4, 5, and 11 pin it too, because
their Files can reach a tier that runs the showcase e2e, and only a pinned gate carries the
`E2E_PORT` export (see Global constraints). `gate-tier.mjs` counts an unclassified path as full:
Task 4's migration `.sql`, Task 5's optional `packages/cairn-cms-dev/` edit, and Task 11's
regenerated manifests and `templates/waymark/` files are all unclassified. Task 4 sets its own
`gate`, `export E2E_PORT=4392 && <F> && make -C tool check`, because its diff also spans `tool/`.
Task 2's diff spans `tool/` and `src/lib/diagnostics/`, so the classifier runs the npm tier and T
together; Task 2 sets `gateLane: "heavy"`, because that tier runs the component project in Chromium
and the `tool` class defaults to the light lane. Task 12 sets `gateLane: "light"`, and its
implementer appends `&& npm run check:surface && npm run check:rulings-format` to the classifier's
docs string (`gateMatches` accepts trailing steps). Every other task (2, 6, 9) runs the computed
gate, and its acceptance says "the computed gate green": their Files compute to `engine` or
`engine+tool`, which run no e2e. Per `~/.claude/docs/pass-gate-economy.md`, a paint-neutral task
keeps the showcase e2e at the boundary, and each segment's boundary F (or the close's) covers it.

A lone unrelated test-file failure, or a component run printing `Cannot connect to the server in
60 seconds`, follows the rerun rule in `docs/internal/durable-gotchas.md` before it counts as red.

## Global constraints

- Ruling `access-semantics-documented-divergence` stands: `canReach` stays permissive on an
  unmapped target for the engine's screens and the sidebar; `requireAccess`, `createSectionAction`,
  and `createAdminAction`'s `access` option stay fail-closed. This pass changes who supplies the
  map, never how each helper reads it, except A1's one named carve-out.
- `createAuthRoutes` is unchanged: it reads neither roles nor access.
- The template is generated: every task that edits an emitted showcase file runs `npm run
  emit:template` in the same task, and `check:template` stays green at every commit.
- Every commit leaves `check:reference`, `check:reference:signatures`, `check:surface`,
  `check:options`, `check:facts` (pointer grammar), and `check:snippets` green. A task that changes
  a typed export or removes a documented symbol makes the minimal reference edit, updates
  `docs/internal/option-map.json` for any added or removed option path, repairs any fact pointer
  that names a moved or deleted file, and regenerates `docs/internal/api-surface.md` with `npm run
  check:surface -- --update`, all in the same task. Task 12 writes the prose and the claim
  corrections.
- Every local showcase e2e runs with `E2E_PORT=4392` after `ss -ltnp 'sport = :4392'` shows no
  listener (quoted in the report). The rule reaches each gate run through its gate string, never
  through `commonNotes`: `commonNotes` reaches the implementer only (`pass-execute.js:416`), while
  the runner's independent Haiku gate run receives the resolved gate string alone (`:541-557`), and
  an unpinned task's string is the classifier's, which carries no export (`resolveGate`,
  `:684-707`). So every task whose Files can reach an e2e-bearing tier pins `gateTier: "full"` and
  runs `args.gate` (or its own `gate`), both of which export it (see "Per-task gate"). The
  conductor's boundary and close F dispatches carry the same export. Backstop for a computed string
  that names `full` or `admin-visual` anyway: the conductor confirms `ss -ltnp 'sport = :4173'`
  shows no listener before each segment launch.
- Every edit to `src/lib/diagnostics/conditions.ts` regenerates its mirror with `node
  scripts/build/emit-tool-conditions.mjs` and commits `tool/internal/spine/conditions.json` in the
  same task, so `check:tool-conditions` stays green.
- The eleven written 2a extend pages are not edited in this pass. Each one a task affects is named
  in that task's report (with the fact ids it falsifies) for Task 12's hand-off to pass B's re-arm
  task. Reference pages, the facts container, the dev package README, and the per-version records
  are edited.
- A new log field or reason value is typed in `src/lib/log/events.ts` and gets its row in
  `docs/reference/log-events.md` in the same task.
- Secrets are handled by name only. No test, log, report, or fixture prints a private key, a JWT,
  or an installation token. A fixture key pair is generated for the test and is not a real App key.
- Scratch projects and probe scripts live under `$HOME/.cache/engine-pre-2b-a/`, never `/tmp` and
  never inside the repo. Every server a task starts outside Playwright runs on a port from an
  environment variable other than 4173 and 4392 and is stopped on exit; the report says so.
- No edit to any other branch or worktree: pass B's plan and the docs-tooling pass belong to other
  executors.
- No release, no tag, no publish, no version bump (engine, `@glw907/cairn-cms-dev`, or `tool/`).
- Code comments follow TSDoc; no em dash in comments; no comment claims what its assertion does not
  prove; no plan, pass, or task numbers in shipped comments. `go-conventions` governs every Go
  edit.
- Never `git add -A`; commit named paths; imperative mood; the commit attribution line.
- Every dispatch reports friction with cairn itself in `cairnFriction` (the runner asks for it).

## Decisions this plan takes

1. **Task 7 runs before Task 6**, so the 503 lands first. Task 7 lands the 503 and the
   non-applicable signing report with `ok` as the signing check alone. Task 6 then extends `ok` to
   `githubAppSigning.ok && (githubAppToken?.ok ?? true)`, the spec's composition. Task 7's route
   test stubs `loadHealth`, so it covers the route's status mapping only; Task 6's own rows cover
   the composition inside `loadHealth`.
2. **The access map moves inline onto the adapter.** The showcase and the template declare
   `access` (and `roles`, where a site has its own) as members of the adapter in
   `src/theme/cairn.config.ts`, and `src/access.ts` is deleted from both. **One marker block per
   member:** the `access` member, its doc comment included, carries exactly one
   `cairn-template:exclude-start/-end` block, which wraps the showcase-only `theme-kit` rule and the
   `//` lines explaining it. The member's doc comment above it carries no marker block (today's
   `access.ts` has a second block inside its JSDoc; that paragraph moves into the rule's block).
   Pass B replaces the inner `theme-kit` block with one block around the whole member, so markers
   never nest (the emitter throws on a nested start), and the scaffold reaches the zero-config
   floor with no `access` member. This is the spec's "on the adapter" form; its "or in a module the adapter imports" stays
   the documented alternative for a site.
3. **A3's named condition is `auth.store-roles-unmigrated`**, severity `warning` (sign-in and
   publishing still work; only a custom-role write fails), with `docsAnchor`
   `is-it-working.md#provision-the-auth-store`, the anchor `auth.store-unmigrated` already uses.
4. **The live check's 5-second timeout reaches only the check's mint.** `installationToken` takes
   an optional abort signal; the live check passes `AbortSignal.timeout(5000)`, and the publishing
   path's mint is unchanged. The spec says "the mint's `fetch`" without saying which callers; a
   timeout on the commit path would be a behavior change the spec never weighed.
5. **B11a points at `https://cairn.pub/docs/extend/rotate-the-github-app-key`.** The implementer
   confirms the URL shape against cairn-pub's `/docs/[...path]` route (read-only). The recorded
   transcript fixture that carries the old line
   (`packages/create-cairn-site/test/fixtures/transcripts/01d-resume.txt`) is not edited: that
   directory's rule is "a fixture is never edited", and only a live re-capture changes it. A unit
   test over the step's log output carries the acceptance instead. The fixture's staleness is
   filed in the friction log for the next capture.
6. **B9 regenerates the generated env types.** The showcase's `worker-configuration.d.ts` is
   generated from `template-repo/.dev.vars.example`, so it declares `GITHUB_APP_ID` and
   `GITHUB_APP_INSTALLATION_ID`. Task 7 drops the two lines from the example env file, reruns the
   command the showcase's file records on its line 2, and lets `npm run emit:template` regenerate
   the template's copy (`emit-template.mjs`'s `regenerateWorkerTypes`); no hand `wrangler types`
   runs in `templates/waymark`. The grep post-condition covers both files.
7. **The lead's build-fail criterion is evidence, not a committed test.** That the prerender's
   hooks import fails `vite build` on a composition throw is SvelteKit's behavior, not engine code.
   Task 1 proves it with a scratch build (a showcase copy whose adapter throws at composition) and
   quotes the exit code and the throw. The reviewer reads it as evidence, not a coverage gap.
8. **The ledger split with pass B.** This pass writes all seven new entries the spec names
   (`access-map-one-declaration` and the six declines) and eight of the nine dated annotations.
   `audit-adapter-navmenuconfig` belongs to pass B, which ships D5.
9. **ROADMAP.** Task 12 narrows the "Engine pass before stage 2b" Now entry to pass B's remaining
   scope rather than removing it; pass B removes it. Every other ROADMAP change the spec lists
   lands here.
10. **The relink re-arm list is pass B's** (the spec puts it in pass B's docs task). Task 12's report
    lists the affected 2a pages and the fact ids each task changed, and close step 9 writes them
    into STATUS's carry-forwards, so pass B's task has one flat input.
11. **Friction triage split.** This pass's close clears every friction entry for a pass A fix, and
    every entry the spec declines or batches (each to its ledger entry or its ROADMAP row). Entries
    for pass B's fixes stay until pass B's close.
12. **The charter phrase is proposed, not written.** C7's "the sign-in form and its confirm page"
    for `docs/internal/what-cairn-is-and-is-not.md:107` waits for Geoff's read (batched at the end).
13. **The doctor's changelog lands with the doctor** (Task 2) under `tool/CHANGELOG.md`
    `## Unreleased`. No tool tag.
14. **The live smoke needs no owner click.** The smoke agent drives the magic-link round trip in
    headless Chromium: it requests a link, reads it from wrangler's local `send_email` message file,
    opens it, and posts the confirm. That exercises C7's narrowed predicate on the real confirm
    page.

15. **`live=1` with nothing to mint with skips the mint.** With no key secret, or a provider whose
    `kind` is not `github-app`, the live branch makes no network call and leaves `githubAppToken`
    out, so `ok` reads the signing check alone. The spec is silent on this case; a reported
    "unreachable" would blame GitHub for a missing secret the signing check already names.
16. **D1 fails closed at the build, not at the delete.** The spec accepted a residual: a site
    whose only image references are nested commits no `mediaRefs` key, so its stale manifest reads
    as pre-field and builds green while the deployed where-used index sees every gallery asset as
    unused. That residual is the data loss D1 exists to fix, so the manifest verify takes the
    fail-closed default. `verifyManifest` gains an optional third argument, the adapter. Given it,
    the verify keeps its pre-field allowance (drop the built `mediaRefs` when no committed entry
    carries the key) only when no concept declares a nested image shape; with a nested shape
    declared, it compares exactly. Called without the adapter, it keeps the allowance, so a direct
    caller still compiles. The verify runs at every build and every dev start with the adapter in
    scope: the generated verify source imports `cairn`, builds the manifest from it, and calls
    `verifyManifest` (`src/lib/vite/internal.ts:84-94`), and the plugin's `buildStart` (`:273`)
    evaluates that source through `runStartChecks` and `verifyManifestFromVite` (`:304-306`,
    `:218-226`), against the dev server under `vite dev` and a nested server under a build. So on a
    nested-shape site, a deployed manifest with no `mediaRefs` key proves the corpus references no
    image, and the delete path keeps today's behavior with no gate of its own. The build is the
    fail-closed point because a runtime gate keyed on an absent `mediaRefs` key is reachable by
    ordinary editing (removing an entry's last image reference and publishing re-derives it with no
    key, `manifest.ts:112`), and the remedy it would name, regenerating, clears nothing. At upgrade,
    a nested-shape site that has not regenerated fails its build until it runs `npx
    cairn-manifest`, which the `Consumers must:` regenerate line already requires.

## Rulings for Geoff

1. **Fork 2: may an anonymous `/healthz?live=1` mint a token?** Ruled yes (Geoff, 2026-10-08:
   "Recomendations accepted for Fork 1 and 2."), with the coalesced per-isolate slot and the
   per-caller timeout. It governs Task 6 alone. The "no" alternative was not taken. Fork 1 (the
   dev-save notice) belongs to pass B.

## Running unattended

The pass is planned to run 10 or more hours without Geoff. Every stop is settled here.

**The conductor rules alone on:**

- A runner artifact: a classifier tier mismatch the reviewer flagged, a stalled or dropped
  workflow (relaunch with `resumeFromRunId`), an API overload or 5xx (wait, retry once), or a gate
  that exited 75.
- A flake under the rerun rule in `docs/internal/durable-gotchas.md`: one rerun of the named test
  file or the serialized component run; a second red is a real failure.
- A second `fix` verdict on a non-`auth-data` task (Tasks 2, 5, 7, 12): one more fix round, an
  upshift to `model: opus`, or a split of the task, whichever the findings point at. The runner
  stops on `needs-decision`, and a relaunch would re-record `baseSha` at the new HEAD, so the extra
  round is a hand-dispatched chain per `pass-core` that names the task's original base SHA and the
  standing findings. The decision and its reason go in the next Ledger entry.
- The Task 8 upshift per "Models".
- A pre-flight finding that moves a path, a line, or a count without changing a task's outcome:
  amend the plan and commit the amendment.
- A finding outside a task's scope: verify it against the code, then file it in
  `docs/internal/docs-friction-log.md` at the next checkpoint (on `main`, own hunks only), or drop it
  with a one-line reason in the Ledger.
- A coverage-only note on an `engine-logic` or `tool` task, which the runner returns as
  `batchedNotes`: the conductor folds it into the next task's notes or the friction log.

**These stop the run** (write STATUS, send Geoff one message, stand down):

- A real defect still standing after its one fix round on an `auth-data` task (Tasks 1, 3, 4, 6, 9,
  10, 11).
- An `auth-data` coverage gap the reviewer still marks blocking after the fix round, such as a
  mutation the task names that no test kills.
- A Task 8 defect or coverage gap (a failed save reading as saved, the writing lost, or a named
  row or mutation unproven) still standing after the hand-dispatched Opus chain. Task 8 is
  `auth-data`, so the runner stops on it like any other; the Opus chain under "Models" runs before
  the pass stops.
- An escalate verdict that names an architectural fork the spec did not settle.
- A pre-flight finding that changes a task's outcome (a claim the spec rests on is false).
- The ceiling at 80 percent, at the next segment boundary.
- A red boundary gate that is not a flake.

**Owner-gated steps, batched at the end:** the charter phrase, and the
go to merge the PR. Nothing else waits on Geoff: the live smoke, the key probe, and every review
are Claude's.

**Guards armed at launch** (`~/.claude/docs/unattended-work-guards.md`):

- The fallback wake-up: `/loop` with no interval once the first workflow launches, with the
  workflow's own notification as the primary signal and a 1200 to 1800 second fallback tick that
  checks the journal for a dead or halted run and relaunches with `resumeFromRunId`.
- The stall guard: `claude-wf-guard <transcript-dir> implementer <run-id>` for each segment's run.
- The lid-switch hold: `systemd-inhibit --what=handle-lid-switch --who=engine-pre-2b-a sleep
  <seconds>`, sized to the expected run.
- Verify the sleep inhibitor (never arm it): `systemd-inhibit --list` shows `claude-awake`.
- The battery stand-down at 11 percent: stop the workflow and guards, WIP-commit on the pass
  branch, and write STATUS with the resume prompt and any `resumeFromRunId`.
- Heavy-lock courtesy: if the docs-tooling pass or another session runs beside this one, send it a
  one-line heads-up through `SendMessage` before a gate expected past 15 minutes.

## Review focus

The inputs most likely to bite a real site that per-task tests would not exercise unprompted:

1. **A site whose hooks and adapter held different maps.** After Task 1 the adapter's governs
   every reader. Task 1's five-reader test and the `Consumers must:` reconcile line.
2. **A composition throw now fails every dynamic route** (feeds, the sitemap, `/media`,
   `/preview`), because the hooks import the runtime module. Task 1's build-fail evidence.
3. **A warm isolate during key rotation.** The live check must never read or write the shared token
   cache, and a dead slot must never wedge the isolate. Task 6's dead-slot criterion and the key
   probe at the close.
4. **The edit page after any save sits at `?saved=1`**, where plain `use:enhance` navigates on
   failure. Task 8's e2e starts there.
5. **A publish carrying a pending dictionary word.** Task 8 sequences the word's commit before the
   publish POST, and Task 10's head guard must not refuse that publish.
6. **A stale manifest that still builds.** Task 11's verify narrowing, and the nested-only residual
   it closes at the build: with a nested image shape declared, the verify compares exactly
   (Decision 16).

---

### Task 0: Pre-flight and baseline (conductor, no gate)

**Outcome:** the start conditions hold and are recorded in this plan's Ledger.

1. **No live executor:** `pgrep -af` on the worktree path and the branch name finds nothing (never
   a pattern in the command's own text); no `engine-pre-2b-a` branch or worktree exists; the `main`
   checkout's `git status --porcelain` shows no warm edits this pass would collide with.
2. **Start state:** PR #107 is merged; `main` carries this plan and the spec at or after
   `27df5088`; STATUS points at this plan. STATUS today says execution waits for Geoff's spec read,
   so repointing it at this plan is a named pre-execution step on `main` (the pre-bake), done
   before Task 0 starts, after Geoff's spec read.
3. **Worktree:** create `.claude/worktrees/engine-pre-2b-a` on `engine-pre-2b-a` from `main`; `npm
   ci`; a from-scratch showcase install (`rm -rf examples/showcase/node_modules` then `npm ci
   --prefix examples/showcase`); `realpath` confirms the engine and the dev package resolve into the
   worktree.
4. **Gate strings:** print F and E with `gate-tier.mjs --range HEAD~1..HEAD --pin full` and
   `--pin engine` (the `<base>..HEAD` range is empty at Task 0, and the script refuses it) and
   record both.
5. **Baseline:** one `haiku` gate agent runs F, then T, in the worktree and returns each `gate
   exit:` line and tail. The conductor quotes them to Task 1's reviewer as Task 0's gate evidence. A
   red stops the pass with one message to Geoff.
6. **Draft PR:** after the branch's first commit (the Task 0 Ledger entry, or the item 7 or 8
   amendment), push `engine-pre-2b-a` and open a draft PR against `main` so CI runs on every later
   push, and record that SHA's CI result. GitHub refuses a pull request with no commits.
7. **S1 pre-flight** per "Pre-flight claims, S1".
8. **Fork 2** is ruled yes (Geoff, 2026-10-08); Task 6 builds as written.
9. **Guards:** arm the set under "Running unattended" before the first workflow launch.
10. **Counter:** record spend through Task 0.

**Acceptance:** the Ledger carries items 1 to 10; the plan is amended and committed where items 7
or 8 moved anything.

### Pre-flight claims, S1

Each was true at `draft-docs-2a` on 2026-10-08; the pre-flight re-checks each at the worktree's
HEAD.

- `src/lib/sveltekit/guard.ts:172` is `export function createAuthGuard(config: AuthGuardConfig =
  {}): Handle {`, preceded by a `WATCH:` comment naming `check:tool-heuristics`; `:173-174` read
  `access` from the config and `config.roles ?? DEFAULT_ROLES`; `:348` and `:368` attach
  `event.locals.cairnAccess = access ?? {}`; `:364-367` is the comment on that default.
- `scripts/checks/check-tool-heuristics.mjs:50` pins that signature as a regex;
  `src/tests/unit/check-tool-heuristics.test.ts:13-15` asserts no broken watch under `npm test`.
- `src/lib/sveltekit/editors-routes.ts:51` is `export function createEditorRoutes(config:
  EditorRoutesConfig = {}): EditorRoutes`; `src/lib/sveltekit/cairn-admin.ts:118` calls
  `createEditorRoutes({ roles: runtime.roles })`; `cairn-admin.ts:105-110` builds `branding` (Task 5).
- `packages/cairn-cms-dev/src/handle.ts`: `seedContent` at `:63`; the `access` and `roles` members
  and their doc comments at `:64-82`; `devBackendHandle(config?: DevBackendConfig)` at `:100`; the
  owner-session mint at `:160-166`; the conditional `cairnAccess` attach at `:175-181`.
- `src/lib/sveltekit/admin-nav.ts:295-299` documents `config.access_unmapped`'s purpose; `:328`
  emits it.
- `src/lib/sveltekit/section-action.ts:129-130` (the comment) and `:275` (the
  `access_map_not_attached` read); `src/lib/sveltekit/admin-action.ts:294` reads
  `event.locals.cairnAccess`.
- `src/lib/auth/access.ts:3-4` and `src/lib/index.ts:21-23` carry the "cannot drift" comments.
- `docs/reference/core.md:1020`, `docs/reference/sveltekit.md:131` and `:1046` import `roles` from the
  adapter module (the cycle); `sveltekit.md:827-831` and `docs/reference/log-events.md:81` name
  `devBackendHandle` without `access` as the cause of `access_map_not_attached`.
- `templates/waymark/src/hooks.server.ts:20,22` pass `{ access }` to both branches, byte-identical
  to `examples/showcase/src/hooks.server.ts`; both import `./access.js`; neither adapter
  (`src/theme/cairn.config.ts`) declares `access`; `templates/waymark/src/theme/cairn.config.ts:214`
  is the Signups nav entry; `src/lib/content/types.ts:236,243` declare the adapter's `roles?` and
  `access?`.
- `src/lib/content/compose.ts:41` composes `access`; `content-routes-shell.ts:187` and `:304`,
  `content-routes-media-library.ts:67`, and `cairn-admin.ts:34` read the runtime;
  `content-routes-context.ts:191`, `nav-routes.ts:46`, and `media-route.ts:74` take a required
  `runtime`.
- `src/lib/sveltekit/auth-routes.ts:35-47,165`: `createAuthRoutes` reads neither roles nor access.
- `tool/internal/doctor/check_roles.go:29` (`tmplRoleWiringUnwired`), `:57-59`
  (`rolesWordPattern`), `:78-95` (`guardRoleWiring`); `check_roles_test.go` exists;
  `src/lib/diagnostics/conditions.ts:168-176` is `auth.role-wiring-missing`; its mirror is generated
  by `scripts/build/emit-tool-conditions.mjs`.
- `src/lib/auth/access.ts:107-127` is `matchHrefKey` (the shadow refusal); `:157-159` is
  `canReach`'s `none` branch.
- `guard.ts:28-30` is `isPublicAdminPath` with `startsWith('/admin/auth/')`; `auth.access.refused`
  is emitted at `guard.ts:444,481`, `section-action.ts:205`, `admin-action.ts:297`, and
  `content-routes-media-ingest.ts:124`, each without a `reason`.
- `content-routes-tidy.ts:124` and `content-routes-dictionary.ts:106` gate on the map only inside
  `if (event.params.concept)`.
- The C7 tests: `src/tests/integration/auth-guard.test.ts:107-111` admits `/admin/auth/request`
  without a session; `src/tests/unit/guard.test.ts:233-242` is the `isPublicAdminPath` table. (The
  spec names the first as `auth-guard.test.ts:107-111`; the second also flips.)
- `src/lib/sveltekit/auth-routes.ts:160,169,407` teach the wider prefix; `sveltekit.md:938-946`
  documents it; `admin-dispatch.ts:87` serves `/admin/auth/confirm` as the only view under
  `auth`; `admin-dispatch.ts:33` is `RESERVED_SEGMENTS`.
- The login form posts `?/request` (`LoginPage.svelte:172`), the confirm form `?/confirm`
  (`ConfirmPage.svelte:79`), and logout `/admin?/logout` (`CairnAdminShell.svelte:1189`), so no
  engine form posts to a path under `/admin/auth/` other than the confirm page.
- No route under `examples/showcase/src/routes/admin/auth/` or `templates/waymark/src/routes/admin/auth/`.
- The fact bullets whose Source cites `src/access.ts` (`f:3z1uxv` in `docs/internal/facts/extend.md`
  and any other the grep finds); the `docs/internal/option-map.json` rows for
  `AuthGuardConfig.access`, `AuthGuardConfig.roles`, and `EditorRoutesConfig.roles` (`:45,48,125`)
  and the `CairnAdminConfig.runtime` row whose shape the new rows copy; and every unskipped
  reference snippet calling one of the three factories (`docs/reference/admin-routes.md:218` calls
  a bare `createAuthGuard()`; `sveltekit.md:127,1043`).
- `examples/showcase/src/access.ts` carries two marker blocks, one inside its JSDoc and one around
  the `theme-kit` rule; `templates/waymark/src/access.ts` holds only the `/admin/signups` rule.

---

## S1: one declaration and the access edges

### Task 1: Every reader takes the runtime

**Pass class:** `auth-data`. **gateTier:** `full`. **Spec:** "The lead: one access and role
declaration", "Two adjustments the decision forces", "Outcome and acceptance"; the `check:tool-
heuristics` pin from "The Go doctor".

**Files:** `src/lib/sveltekit/guard.ts`, `src/lib/sveltekit/editors-routes.ts`,
`src/lib/sveltekit/cairn-admin.ts` (the `createEditorRoutes` call), `src/lib/sveltekit/admin-nav.ts`
(the `config.access_unmapped` condition and its doc), `src/lib/sveltekit/section-action.ts` (the
comments only), `src/lib/auth/access.ts` and `src/lib/index.ts` (the comments only),
`packages/cairn-cms-dev/src/handle.ts`, `packages/cairn-cms-dev/README.md` (the snippet only),
`scripts/checks/check-tool-heuristics.mjs`, `examples/showcase/src/hooks.server.ts`,
`examples/showcase/src/theme/cairn.config.ts`, `examples/showcase/src/access.ts` (deleted, Decision
2), every other caller of the three factories under `src/`, `packages/`, `examples/showcase/src/`
and their tests (the pre-flight counts them), `docs/reference/sveltekit.md`, `docs/reference/core.md`,
`docs/reference/log-events.md` (the rows named below only), `docs/reference/admin-routes.md` (the
`createAuthGuard()` prose at `:191` and the snippet at `:218` only), `docs/internal/option-map.json` (the three removed options out, the
`AuthGuardConfig.runtime` and `EditorRoutesConfig.runtime` rows in, each with a fact id),
`docs/internal/facts/*.md` (pointer repairs only, for each bullet whose Source cites a deleted
`src/access.ts`), `docs/internal/api-surface.md`, and `templates/waymark/**` through `npm run
emit:template`.

**Outcome:**
- `createAuthGuard`, `devBackendHandle`, and `createEditorRoutes` each take one bag parameter with a
  required `runtime` member and no default, and read `runtime.roles` and `runtime.access`. Their
  separate `roles` and `access` options are removed. `identity` and `includeSubDomains` are
  unchanged. `createAuthRoutes` is untouched.
- The guard and the dev handle always attach `runtime.access ?? {}` to `locals.cairnAccess`. The
  comments at `guard.ts:364-367` and `section-action.ts:129-130` state the real cause of
  `access_map_not_attached`: a route outside every hook's coverage. The `DevBackendConfig.access`
  doc comment goes with the member. `sveltekit.md:827-831` and `log-events.md:81` carry the same
  cause. `seedContent` is untouched (pass B removes it).
- `config.access_unmapped` fires only when the map declares at least one screen-id key and leaves
  another concept or fixed screen unmapped. An href-only map is silent. The doc at
  `admin-nav.ts:295-299` says so.
- The showcase and the template declare `access` on the adapter (Decision 2); their hooks import
  the runtime from `#chassis/cairn.server.js` and pass `{ runtime }` to both branches. The two hooks
  files stay byte-identical. `src/access.ts` is gone from both.
- The "cannot drift" comments (`access.ts:3-4`, `index.ts:21-23`) describe one declaration on the
  adapter, read by every reader. The three reference snippets that imported `roles` from the
  adapter into an access module (`core.md:1020`, `sveltekit.md:131,1046`) declare on the adapter
  instead, so no snippet has the cycle.
- `check-tool-heuristics.mjs` pins the new `createAuthGuard` signature, and its `WATCH:` comment in
  `guard.ts` stays above it.

**Acceptance:**
- **Required runtime:** `// @ts-expect-error` on `createAuthGuard()`, `createAuthGuard({ access })`,
  `devBackendHandle()`, and `createEditorRoutes()`, in a file `npm run check` type-checks. Fails
  today: all four compile.
- **One map, five readers:** a fixture adapter declaring a custom role `steward` (absent from
  `DEFAULT_ROLES`, editor capability) and `access: { media: ['owner'], '/admin/x': ['owner'],
  '/admin/y': ['steward'] }`, composed through `composeRuntime`. Run `createAuthGuard({ runtime
  })`'s handle over a real event with no locals set, then:
  - **Identity:** `event.locals.cairnAccess` is `runtime.access` by identity (`toBe`).
  - **Refuse half:** a `steward` session is refused by the media screen (`requireEngineAccess`),
    the nav resolver, and, on `/admin/x`, by `requireAccess`, `createSectionAction`, and
    `createAdminAction` with `access`.
  - **Admit half:** an owner session is admitted on `/admin/x`, and a `steward` session on
    `/admin/y`, by `requireAccess`, `createSectionAction`, and `createAdminAction`.

  Fails today: the guard ignores the unknown `runtime` member and attaches `{}`, so every mapped
  admit is refused as `no_rule` and the identity assertion fails. (The refuse half alone passes
  today, because the three `locals` readers fail closed on `{}`.)
- **The dev handle attaches the adapter's map:** through `devBackendHandle({ runtime })`,
  `locals.cairnAccess` is `runtime.access` by identity, and `{}` when the adapter declares none.
  Fails today: no map unless handed `access`.
- **Roles from the adapter alone:** the fixture's `steward` role resolves to editor capability in
  both the guard and the roster screen. Fails today: the guard reads `DEFAULT_ROLES` unless handed
  `roles`, so `steward` resolves to `none`.
- **The narrowed warning:** `config.access_unmapped` is silent for an href-only map and fires for a
  partial screen map. Fails today: it fires for the href-only map. The test that asserted an href
  key "never counts toward coverage" is rewritten to the new rule, and the report names it (Task
  12 annotates the ledger's `Verified:` line).
- **Build-fail evidence (Decision 7):** a scratch showcase copy under `$HOME/.cache/engine-pre-2b-a/`
  whose adapter throws at composition fails `vite build`; the copy's two `file:` dependencies are
  rewritten to the worktree's absolute paths before its install. The report quotes the exit code
  and the throw.
- **Markers (Decision 2):** the showcase adapter's `access` member, doc comment included, carries
  exactly one `cairn-template:exclude-start` line, and the emitted template's adapter holds only
  the `/admin/signups` rule.
- `npm run check:tool-heuristics` green; `check:template`, `test:emit`, `check:options`,
  `check:facts`, and `check:snippets` green; the showcase e2e green (the dev handle path).
- `rg -nU -g '!src/lib/diagnostics/conditions.ts' "(createAuthGuard|devBackendHandle)\(\s*\{\s*(access|roles)\b|createEditorRoutes\(\s*\{\s*roles\b|createAuthGuard\(\s*\)" src packages examples templates docs/reference`
  prints nothing outside the `@ts-expect-error` file (multi-line calls included). The exclusion is
  Task 2's: that file's `auth.role-wiring-missing` remediation keeps the `{ roles }` form for a site
  on an older engine.
- `rg -n "import \{[^}]*\broles\b[^}]*\} from ['\"][^'\"]*cairn\.config" docs/reference` prints
  nothing (on `main` it prints the three cycle snippets, `core.md:1020` and `sveltekit.md:131,1046`).
- F green.

**Mutations (each must turn a named test red; the report's mutation ledger quotes it):** the guard
attaching `{}` whatever the runtime declares; the guard reading `access` from anywhere but
`runtime`; the dev handle attaching `undefined` when the adapter declares no map; the guard falling
back to `DEFAULT_ROLES` beside a declared vocabulary; `config.access_unmapped` counting href keys
toward coverage.

**Notes:** a breaking change; the report drafts the `Consumers must:` line for Task 12 from the
spec's draft. The report lists every 2a extend page the change affects and every fact id it
falsifies (`grep` over `docs/internal/facts/`).

**Decisions carried:**
- **Decision 2:** the access map moves inline onto the adapter. The showcase and the template
  declare `access` (and `roles`, where a site has its own) as members of the adapter in
  `src/theme/cairn.config.ts`, and `src/access.ts` is deleted from both. The `access` member, its
  doc comment included, carries exactly one `cairn-template:exclude-start/-end` block, which wraps
  the showcase-only `theme-kit` rule and the `//` lines explaining it; the doc comment carries no
  marker block. Pass B replaces the inner `theme-kit` block with one block around the whole member.
- **Decision 7:** the build-fail criterion is evidence, not a committed test. That the prerender's
  hooks import fails `vite build` on a composition throw is SvelteKit's behavior, not engine code.
  Prove it with a scratch build and quote the exit code and the throw; the reviewer reads it as
  evidence, not a coverage gap.

**Interfaces produced:** the `{ runtime }` bag on the three factories, consumed by Tasks 2 and 3 and
by pass B; the adapter-declared map in the showcase and the template, consumed by pass B's ruling 2
task.

**Gate:** F.

### Task 2: The doctor reads `{ runtime }` as wired

**Pass class:** `tool`. **Independent** of Task 3. **Consumes:** Task 1's signature. **Spec:** "The
Go doctor".

**Files:** `tool/internal/doctor/check_roles.go`, `tool/internal/doctor/check_roles_test.go` (and
any golden it renders), `src/lib/diagnostics/conditions.ts` (`auth.role-wiring-missing`'s
remediation), `tool/internal/spine/conditions.json` (regenerated), `tool/CHANGELOG.md`
(`## Unreleased`), `docs/reference/cli-cairn-doctor.md` (the minimal edit if it quotes the
remediation).

**Outcome:** `auth.role-wiring` treats a `runtime` argument to `createAuthGuard` as wired. The
bare-call and `{ roles }` branches stay for a site on an older engine. `tmplRoleWiringUnwired` and
`auth.role-wiring-missing`'s remediation name both eras: pass `{ runtime }` on this engine, `{ roles
}` on an older one. The tool changelog records the change.

**Acceptance:**
- A table-driven Go test, every row run with custom roles declared (or calling `guardRoleWiring`
  directly), since the check returns `skip` when a site declares none (`skipNoCustomRoles`):
  `createAuthGuard({ runtime })`, `createAuthGuard({ runtime: cairn })`, and `createAuthGuard({
  runtime, identity })` pass; a bare `createAuthGuard()` still fails. Fails today: each `{ runtime
  }` form reads as unwired (a `{` with no `roles` word).
- `npm run check:tool-conditions` green (the mirror regenerated).
- T green, plus the npm tier the classifier computes for the `conditions.ts` edit.

**Notes:** `go-conventions` governs. No tool version bump or tag.

**Decisions carried:**
- **Decision 13:** the doctor's changelog lands with the doctor (this task) under
  `tool/CHANGELOG.md` `## Unreleased`. No tool tag.

**Gate:** the classifier's npm tier plus T; `gateLane: "heavy"` in args (the npm tier runs the
component project in Chromium).

### Task 3: The access edges: A1, A2, C1, C7

**Pass class:** `auth-data`. **gateTier:** `full` (C7 is the sign-in path, and the acceptance
carries the showcase e2e). **Independent** of Task 2. **Consumes:** Task 1. **Spec:** "Access and
auth", items A1, A2, C1, and C7.

**Files:** `src/lib/auth/access.ts`, `src/lib/sveltekit/guard.ts`,
`src/lib/sveltekit/section-action.ts`, `src/lib/sveltekit/admin-action.ts`,
`src/lib/sveltekit/content-routes-media-ingest.ts` (the log call),
`src/lib/sveltekit/content-routes-tidy.ts`, `src/lib/sveltekit/content-routes-dictionary.ts` (the
param check only), `src/lib/sveltekit/auth-routes.ts` (the three comments),
`src/lib/log/events.ts`, their tests (`src/tests/unit/guard.test.ts`,
`src/tests/integration/auth-guard.test.ts`, and the access tests),
`docs/reference/sveltekit.md` (`:938-946` and the `requireAccess` and `createSectionAction`
rows if they state the `none` refusal), `docs/reference/log-events.md` (the `auth.access.refused`
row), `docs/internal/api-surface.md` if a typed export moved.

**Outcome:**
- **A1:** `canReach` admits a `none`-capability session to an href target whose matched rule names
  its role explicitly. Screen ids, unmapped hrefs, and `editors` stay refused for `none`.
- **A2:** `matchHrefKey`'s shadow refusal is unchanged. Every `auth.access.refused` emitter carries
  `reason: 'no_rule' | 'shadowed' | 'role'`.
- **C1:** the tidy and dictionary actions answer 404 when the route has no `concept` param.
- **C7:** `isPublicAdminPath` admits exactly `/admin/login` and `/admin/auth/confirm`. The
  `createAuthRoutes` comments and `sveltekit.md:938-946` state the narrowed set.

**Acceptance:**
- **A1:** table-driven `canReach` tests over a screen id, a mapped href, an unmapped href, and a
  dynamic route, including a row where a screen-id rule names the `none` role (still refused), plus
  one row each through `requireAccess` and `createSectionAction`: a `none` session on a mapped href
  naming its role is admitted, and on `editors` is refused. Fails today: refused before the map is
  read.
- **A2:** a map with `/admin/x` and `/admin/x/y/z` and a request to `/admin/x/[id]` logs `reason:
  'shadowed'`. The mapping is fixed: no matching rule gives `no_rule`; a shadowed match gives
  `shadowed`; every other refusal (role not listed, the `editors` floor, a `none` capability,
  `ownerOnly`, `authorizeAdminTarget`'s `not-owner`) gives `role`. Each of the five emitters has a
  test asserting the exact value its refusal maps to. Fails today: no `reason` field.
- **C1:** both actions called with no `concept` param by an editor the map denies answer 404. Fails
  today: the action runs.
- **C7:** a table over `isPublicAdminPath` is true for `/admin/login` and `/admin/auth/confirm` only,
  and false for `/admin/auth/request`, `/admin/auth/x`, `/admin/auth/confirm/x`, and `/admin/authx`.
  The integration test at `auth-guard.test.ts:107-111` flips to a redirect for `/admin/auth/request`
  with no session. Fails today: `startsWith('/admin/auth/')`.
- The showcase e2e sign-in specs stay green (the confirm page is still public).
- F green.

**Mutations:** restore `canReach`'s early `none` return; admit `none` on an unmapped href; admit
`none` on a screen-id rule naming its role; report `'no_rule'` for a shadowed match; restore the
`startsWith` prefix; restore the `if (event.params.concept)` guard on either action.

**Notes:** A1 is a loosening and C1 and C7 are breaking for a hand-mount or a site route under
`/admin/auth/`; the report drafts their `Consumers must:` lines (A1's included: review any access
rule naming a `none`-capability role, since `canReach`, `requireAccess`, and `createSectionAction`
now admit it) and names the affected 2a pages (security-model, restrict-admin-access,
add-a-second-sign-in-group, debug-your-site) and fact ids. The charter phrase and the functional
spec's amendments are Task 12's.

**Gate:** F (pinned).

**S1 boundary:** F and T green on the segment head; STATUS and a Ledger entry written; S2's
pre-flight dispatched.

---

## S2: the auth store, the channel, and the health status

### Task 4: The roles migration ships, and every role write names it (A3)

**Pass class:** `auth-data`. **gateTier:** `full`, with its own `gate` (see "Per-task gate").
**Spec:** "Access and auth", item A3.

**Files:** `examples/showcase/migrations/0001_roles.sql` (new, byte-identical to the package's
`migrations/0001_roles.sql`), `src/lib/auth/store.ts`, `src/lib/diagnostics/conditions.ts`,
`tool/internal/spine/conditions.json` (regenerated), `tool/internal/spine/condition.go` (the new
id's typed constant and its `Conditions()` entry, which `TestConditionsMatchEmbeddedMirror`
requires), `tool/CHANGELOG.md` (`## Unreleased`, the new public condition id),
`src/tests/unit/emit-template-tree.test.ts`, the store's tests, `templates/waymark/migrations/`
through `npm run emit:template`, and any reference page that lists the condition registry.

**Outcome:** the scaffold carries migrations {0000, 0001, 0003, 0004} and not the opt-in 0002.
Every reachable role-writing statement (`insertEditor` at `store.ts:271`, `setEditorRole`'s two
branches at `:506` and `:509`, and `demoteOwnerIfNotLast` at `:544`) routes a role `CHECK`
constraint failure through a named condition, `auth.store-roles-unmigrated` (Decision 3), the way
`rethrowStoreFailure` names 0004. `insertOwnerIfEmpty` (`:468`) stays unrouted, with a one-line
comment: it writes only `'owner'`, which every schema's CHECK admits. The message names
`0001_roles.sql` and says it rebuilds `editor` with the engine's four columns only. Any other
failure, a primary-key violation included, rethrows untouched.

**Acceptance:**
- **Pre-flight evidence:** the report quotes local D1's real error text for a role CHECK failure
  and for a primary-key failure on `editor.email`, and the match keys on the CHECK text only.
- `emit-template-tree.test.ts` asserts the scaffold's migration set is exactly {0000, 0001, 0003,
  0004}. Fails today: 0001 absent.
- Against a D1 on the scaffold's pre-pass set {0000, 0003, 0004}, one row per routed statement
  throws `auth.store-roles-unmigrated`: an add with a custom role; `setEditorRole` to a custom role
  with `ownerRoles` empty, and with it non-empty; `demoteOwnerIfNotLast` to a custom role. Fails
  today: a raw 500 from the constraint.
- A duplicate-email add rethrows the primary-key failure untouched.
- After 0001 the same writes succeed.
- `check:tool-conditions`, `check:template`, and `test:emit` green; T green (the Go mirror test).
- Its pinned gate green: F, then `make -C tool check`, under `E2E_PORT=4392`.

**Mutations:** drop the routing on each of the four routed statements in turn; widen the match so a
non-constraint error (the primary-key failure) is renamed.

**Notes:** `go-conventions` governs the Go edit. `Consumers may:` apply `0001_roles.sql` when
declaring custom roles; safe after 0004. Affected 2a pages: restrict-admin-access,
add-a-second-sign-in-group, scaffolded-site-files. The recorded transcript fixtures stay unedited
(they predate the file). The `is-it-working.md#provision-the-auth-store` anchor is dead since the
docs rebuild (the existing `auth.store-unmigrated` carries the same anchor); the report files it in
the friction log for the admin arm's stage.

**Decisions carried:**
- **Decision 3:** A3's named condition is `auth.store-roles-unmigrated`, severity `warning`
  (sign-in and publishing still work; only a custom-role write fails), with `docsAnchor`
  `is-it-working.md#provision-the-auth-store`, the anchor `auth.store-unmigrated` already uses.

**Gate:** pinned, `export E2E_PORT=4392 && <F> && make -C tool check` (the classifier would compute
`full+tool` for this diff, with no port export).

### Task 5: Turnstile, the channel database type, and partial branding (A7, A8, A10)

**Pass class:** `engine-logic`. **gateTier:** `full` (its optional `packages/cairn-cms-dev/` edit
is unclassified). **Independent** of Tasks 4 and 7. **Spec:** "Access and auth", items A7, A8, A10.

**Files:** `src/lib/cloudflare/turnstile.ts`, `src/lib/log/events.ts`,
`src/lib/auth-channel/factory.ts` (`resolveDb`'s return type, `:232`),
`packages/cairn-cms-dev/src/channel-db.ts` only if its exported type must name the new subset,
`src/lib/sveltekit/cairn-admin.ts` (`:105-110`, and `CairnAdminConfig`'s `auth.branding` type),
their tests, `docs/reference/cloudflare.md`, `docs/reference/auth-channel.md`,
`docs/reference/sveltekit.md` (the `auth.branding` row), `docs/reference/log-events.md` (the
Turnstile row), `docs/internal/api-surface.md`.

**Outcome:**
- **A7:** a blank or non-string Turnstile secret logs `reason: 'missing_secret'`; a blank token
  keeps `invalid_input`.
- **A8:** the auth channel's `resolveDb` accepts the structural subset of `D1Database` its store
  uses, which `D1Database` and `createChannelDb()`'s result both satisfy. If the subset is a named
  exported type, it carries a doc comment and an `auth-channel.md` entry.
- **A10:** `auth.branding` is `Partial<AuthBranding>`, merged over the runtime default.

**Acceptance:**
- **A7:** `verifyTurnstile` with `''` and with a non-string secret logs `missing_secret`. Fails
  today: `invalid_input`.
- **A8:** a test file that `npm run check` type-checks passes `createChannelDb()`'s result to
  `resolveDb` with no cast, and a real `D1Database` still assigns. Fails today: not assignable. The
  report quotes the red type error before the change.
- **A10:** with a runtime whose `sender.replyTo` is set, `auth.branding: { siteName }` alone sends
  mail that keeps that reply-to. Fails today: dropped.
- F green.

**Notes:** not breaking. Alerting keyed on `invalid_input` for a missing secret now matches
`missing_secret` (a `Consumers must:` line). Affected 2a pages: add-a-second-sign-in-group,
add-cairn-to-a-sveltekit-app.

**Gate:** F (pinned).

### Task 7: The health route's 503 and the rotation strings (B5, B9, B11a)

**Pass class:** `engine-logic`. **gateTier:** `full`. **Runs before Task 6** (Decision 1).
**Spec:** "Ruling 3", the 503 paragraph; "Rotation signals", B9 and B11a.

**Files:** `src/lib/sveltekit/health.ts` (the non-applicable report only), its tests,
`examples/showcase/src/routes/healthz/+server.ts`, `examples/showcase/e2e/healthz.spec.ts`,
`src/lib/diagnostics/conditions.ts` (`github.app-unreachable`'s remediation, `:198`),
`tool/internal/spine/conditions.json` (regenerated),
`packages/create-cairn-site/template-repo/.dev.vars.example`,
`examples/showcase/worker-configuration.d.ts` and `templates/waymark/worker-configuration.d.ts`
(regenerated, Decision 6), `packages/create-cairn-site/src/cloudflare/secret.mjs` and its test,
`docs/reference/sveltekit.md` (the `loadHealth` and `HealthData` rows), and `templates/waymark/**`
through `npm run emit:template`.

**Outcome:**
- **B5:** the site-owned health route answers 503 when `ok` is false and 200 when true, its catch
  branch included, and its "always returns 200" comment states the new contract. The catch branch
  returns a fixed detail and never echoes `err.message` to the anonymous caller. `ok` is the
  signing check alone until Task 6. A provider whose `kind` is not `github-app` reports
  `githubAppSigning: { ok: true, detail: 'not-applicable' }`; a GitHub provider with no key still
  reports `ok: false`.
- **B9:** `github.app-unreachable`'s remediation names the key secret and the adapter's `appId`
  and `installationId`. The example env file drops `GITHUB_APP_ID` and
  `GITHUB_APP_INSTALLATION_ID`, and both generated env type files are regenerated from it.
- **B11a:** the key step's closing message points at the rotation page (Decision 5) instead of
  "re-run this step".

**Acceptance:**
- The route answers 503 on `ok: false` and 200 on `ok: true` (a route-level test with
  `loadHealth` stubbed, both branches and the catch; the catch's body carries none of the thrown
  error's message). The showcase's `healthz.spec.ts` expects the
  503 its keyless env produces. A non-GitHub provider reads `ok: true`. Fails today: always 200;
  the non-GitHub provider reads `ok: false`.
- `git grep -nE 'GITHUB_APP_ID|GITHUB_APP_INSTALLATION_ID' -- src/lib/diagnostics/conditions.ts tool/internal/spine/conditions.json packages/create-cairn-site/template-repo/.dev.vars.example templates/waymark/.dev.vars.example examples/showcase/worker-configuration.d.ts templates/waymark/worker-configuration.d.ts`
  prints nothing; `check:tool-conditions` green.
- A `create-cairn-site` unit test asserts the key step's closing log names the rotation page URL
  and no longer says "re-run this step". Fails today.
- `check:template`, `test:emit`, and the `create-cairn-site` suite green.
- F green.

**Notes:** `Consumers may:` answer 503 when `loadHealth(...).ok` is false. The friction log gets
the stale transcript fixture (Decision 5). Affected 2a pages: rotate-the-github-app-key,
scaffolded-site-files.

**Decisions carried:**
- **Decision 1:** Task 7 runs before Task 6. Task 7 lands the 503
  and the non-applicable signing report with `ok` as the signing check alone. Task 6 then extends
  `ok` to `githubAppSigning.ok && (githubAppToken?.ok ?? true)`. This task's route test stubs
  `loadHealth`, so it covers the route's status mapping only.
- **Decision 5:** B11a points at `https://cairn.pub/docs/extend/rotate-the-github-app-key`. Confirm
  the URL shape against cairn-pub's `/docs/[...path]` route (read-only). The recorded transcript
  fixture that carries the old line
  (`packages/create-cairn-site/test/fixtures/transcripts/01d-resume.txt`) is not edited: that
  directory's rule is "a fixture is never edited", and only a live re-capture changes it. A unit
  test over the step's log output carries the acceptance instead. File the fixture's staleness in
  the friction log for the next capture.
- **Decision 6:** the showcase's `worker-configuration.d.ts` is generated from
  `template-repo/.dev.vars.example`, so it declares `GITHUB_APP_ID` and
  `GITHUB_APP_INSTALLATION_ID`. Drop the two lines from the example env file, rerun the command the
  showcase's file records on its line 2, and let `npm run emit:template` regenerate the template's
  copy; run no hand `wrangler types` in `templates/waymark`.

**Gate:** F.

**S2 boundary:** F green; STATUS and a Ledger entry; S3's pre-flight dispatched.

---

## S3: the edit page and the commit path to `main`

### Task 8: A failed save keeps the writing (A6)

**Pass class:** `auth-data` (runner `passClass: "auth-data"`, the header class, so a coverage
finding blocks; the spec says `engine-logic`, see the header). **gateTier:** `full`. **Spec:**
"Admin behavior", item A6.

**Files:** `src/lib/admin/EditPage.svelte`, its component tests, a new showcase e2e spec under
`examples/showcase/e2e/` (for example `edit-save-failure.spec.ts`), and
`examples/showcase/e2e/csrf-helpers.ts` only if a shared helper belongs there.

**Outcome:**
- The edit form submits through `use:enhance` with a submit callback. The submit function awaits
  `commitPendingDictionary()` before the action POST, replacing the fire-and-forget call at
  `EditPage.svelte:163-171`. `postFormAction` already resolves every failure to `{ ok: false }`, so
  the await never blocks the save or publish.
- Every result clears `saving` and `publishing`. A `failure` goes through `applyAction(result)`,
  which runs no load. A `redirect` does `location.assign(result.location)`, keeping today's
  document reload, `{#key}` remount, and dirty reset. An `error` result (a network failure, an
  action that throws, or a non-JSON answer such as the guard's login redirect or CSRF page) never
  reaches `applyAction`: it sets the in-place failure flag, keeps the editor's text, and shows the
  calm message.
- A local flag set on an in-place failure suppresses the `data.saved` flash and `saveState`'s
  "Saved". The dirty baseline for an in-place failure is the loaded `data.body`, so a refusal that
  echoes `body` still reads as unsaved and the leave guard still prompts.

**Acceptance (a showcase e2e from `?saved=1`):**
- Type text; `page.route` answers `?/save` with a 500 failure and fails any following
  `__data.json`. The calm message shows, no "Saved" text shows, the text is intact, Save is
  enabled, a retry succeeds, and the leave guard prompts.
- The same forge with a 409 failure echoing `body`: "Unsaved changes" shows, no "Saved" text
  shows, and the leave guard prompts.
- `page.route` aborts `?/save` (a network failure, the `error` result): the text is intact, no
  "Saved" text shows, Save is enabled, and the leave guard prompts.
- A publish answered with a 500 failure leaves Publish enabled and the text intact.
- With a pending dictionary word, `page.route` holds the `?/dictionaryAdd` response: no `?/save`
  or `?/publish` request is sent until the test releases it. Fails today: the call is
  fire-and-forget.
- A successful save ends in a document load reading "Saved".
- Fails today: a bare 500 replaces the page and the text. The report quotes the red run.
- The admin visual spec's baselines are unchanged.
- F green.

**Mutations:** drop the in-place failure flag, so "Saved" shows; use the echoed `form.body` as the
dirty baseline; pass an `error` result to `applyAction`; fire `commitPendingDictionary` without
awaiting it.

**Notes:** no public surface change. Affected 2a page: rotate-the-github-app-key. Kit 3.0.x's
behavior the spec cites (`actions.js:170,186-191`, `client.js:88-109,147-155,182,2980-3005`, and
`forms.js`'s catch that turns a thrown fetch into `{ type: 'error' }`) is re-read from the
installed kit before relying on it; a difference stops the task with a report.

**Interfaces produced:** the awaited dictionary commit before the action POST, consumed by Task 10.

**Gate:** F.

### Task 9: The head guard on the Library and the dictionary (C11, part 1)

**Pass class:** `auth-data`. **Independent** of Task 8. **Spec:** "The commit path and media", C11,
the Library, replace, alt, and dictionary bullets.

**Files:** `src/lib/sveltekit/content-routes-media-delete.ts` (single and bulk delete, `:189-193`,
`:282`, and the docstring at `:110-114`), `src/lib/sveltekit/content-routes-media-metadata.ts`
(metadata update `:187-191`, replace `:384`, alt propagation `:541`),
`src/lib/sveltekit/content-routes-dictionary.ts` (`mergeAndCommitDictionary`, `:57-73`, and its
retry at `:133-149`), and their tests.

**Outcome:** each path reads `branchHead(defaultBranch)` before its first read of `media.json`, the
content manifest, or any entry file, and passes it to the commit as `expectedHead`. A conflict
answers with the path's existing message: `MANIFEST_CONFLICT_MESSAGE` for delete and metadata
update, `CONTENT_CONFLICT_MESSAGE` for replace and alt, and the dictionary's own re-merge retry,
which now fires because a head is passed. A null head on the default branch refuses with the
path's conflict answer instead of committing unguarded (no `head ?? undefined`). The delete
docstring's stale-read note states the guard.

**Acceptance (a race test per path; the concurrent commit is injected after the path's first read
of `media.json`, the content manifest, or the entry file, and before its commit, so a head read
moved after that read sees the injected commit and the stale file commits cleanly):**
- A deleted row stays deleted (single and bulk delete). On each delete race the response is
  `MANIFEST_CONFLICT_MESSAGE`, the R2 object still exists, and no `media.deleted` is logged.
- A single delete whose in-window commit is a publish referencing the asset under delete conflicts,
  and the bytes survive.
- An upload's row survives a metadata update.
- A publish's prose survives a replace and an alt propagation.
- Two concurrent dictionary adds both land.
- A null head refuses without a commit.
- Fails today: each path's retry re-parents the stale file. The report quotes each red run.
- The computed gate green.

**Mutations:** drop `expectedHead` from each path in turn; read the head after the manifest read
instead of before; commit unguarded on a null head.

**Notes:** surface: none beyond the conflict messages each path already returns.

**Gate:** computed (`auth-data`).

### Task 10: The head guard on publish and publish-all (C11, part 2)

**Pass class:** `auth-data`. **gateTier:** `full`. **Consumes:** Tasks 8 and 9. **Spec:** C11, the
publish bullet and the sequencing paragraph.

**Files:** `src/lib/sveltekit/content-routes-entry-write.ts` (`:215-231`, `:347-354`), the
publish-all manifest fold (the pre-flight names its file), their tests, and one showcase e2e spec
for the pending-word publish.

**Outcome:** publish and publish-all read the default branch's head before reading the
`media.json` and `index.json` snapshots they commit, and pass it as `expectedHead`. A conflict
answers with the calm conflict; the entry stays held on its branch, so a retry is one click. No
merge happens inside the retry. A null head refuses as Task 9's paths do.

**Acceptance:**
- A race test whose concurrent commit is injected after publish's first snapshot read and before
  its commit: a Library delete inside the window stays deleted, and the publish answers the calm
  conflict with the entry still held. Fails today: the retry re-parents the stale snapshot.
- The same for publish-all.
- A null head refuses both without a commit.
- A showcase e2e: a publish submitted through Task 8's submit with a pending dictionary word lands
  without a conflict, and the word commits. This holds today; it guards the new head read against
  the page's own commit.
- F green.

**Mutations:** drop `expectedHead` from publish and from publish-all in turn; move the head read
after the snapshot read; commit unguarded on a null head.

**Notes:** surface: a publish can now answer a conflict; the report drafts its changelog line for
Task 12. Task 12 amends the 2a media design's decision 1. The 2b configure-media page drops its
caveat (pass B's hand-off).

**Gate:** F.

**S3 boundary:** F green; branch pushed; CI green on the head; STATUS and a Ledger entry; S4's
pre-flight dispatched.

---

## S4: nested media, the live check, and the records

### Task 11: Nested images in where-used, replace, and the manifest verify (D1)

**Pass class:** `auth-data` (the commit path). **gateTier:** `full` (its regenerated manifests and
template files are unclassified). **Independent** of Task 6. **Spec:** "The commit path and
media", D1.

**Files:** `src/lib/content/media-refs.ts` (`:45-52`), `src/lib/content/media-rewrite.ts` (the
`src:` locator at `:132`, `imageFieldKeys` at `:164-171`, replace's single-occurrence edit, alt
propagation's placement report), `src/lib/content/manifest.ts` (`verifyManifest`, `:308-345`, its
optional adapter argument, and an internal predicate for "no committed entry carries
`mediaRefs`"), `src/lib/vite/internal.ts` (the generated verify source at `:84`, which passes
`cairn` as the third argument), `src/lib/sveltekit/content-routes-media-metadata.ts` only where
replace or alt read a placement, their tests (the vite-level row beside
`src/tests/unit/vite-verify-references.test.ts`), `docs/reference/core.md` (`verifyManifest`'s
declaration at `:854` and its snippet at `:870-875`, the minimal edit `check:reference:signatures`
needs), `docs/internal/api-surface.md` (regenerated; `verifyManifest` at `:115`),
`examples/showcase/src/content/.cairn/index.json` and the template's copy (regenerated if they
change).

**Outcome:**
- `extractMediaRefs` and `imageFieldKeys` walk all four shapes `checkContainerNesting` admits:
  `image`, `object({ image })`, `array(image)`, and `array(object({ image }))`.
- The `src:` locator admits an optional `- ` sequence prefix, and replace rewrites every occurrence
  in an entry.
- Alt propagation reports a nested placement and never splices it.
- **The verify fails closed at the build (Decision 16).** `verifyManifest(built, committedRaw,
  adapter?)` drops a built `mediaRefs` only for a manifest that predates the field (no committed
  entry carries the key), and, when given the adapter, only when no concept declares a nested
  image shape. With a nested shape declared, it compares exactly, so a stale manifest fails the
  build with the regenerate message. Called without the adapter, it keeps the pre-field allowance.
  A post-field manifest compares exactly in every case.
- The generated verify source passes the adapter, so every build and dev start applies the rule.
  The delete paths are unchanged.
- A comment at the verify states the rule and its consequences: a nested-shape site that has not
  regenerated fails its build; on a site with no nested shape, the first publish that writes a
  `mediaRefs` key makes the next build fail on every other stale entry.

**Acceptance:**
- Where-used, safe delete, bulk delete, and replace run over each of the four shapes, including a
  `- src:` line and an asset twice in one array, against a post-field manifest. Fails today: each
  nested asset reads as unused.
- Alt propagation over a sequence-form entry leaves it byte-identical and reports the placement.
- **Fail row, post-field:** a committed manifest in which a second entry carries `mediaRefs` (a
  hero image) and the gallery-only entry lacks the key fails `verifyManifest`. Fails today: it
  passes.
- **Fail row, nested shape:** given an adapter declaring `array(image)`, a committed manifest in
  which no entry carries `mediaRefs`, over a corpus with gallery refs, fails with the regenerate
  message. Fails today: it passes.
- **Pass row, nested shape:** the same adapter and manifest over a corpus with no image references
  verifies.
- **Pass row, no nested shape:** with an adapter declaring only top-level `image` fields, and with
  no adapter passed, a manifest in which no entry carries `mediaRefs`, over a corpus with top-level
  refs, still verifies.
- **The build path:** `verifyManifestFromVite` over a fixture site whose adapter declares
  `array(image)`, with a committed manifest carrying no `mediaRefs` and gallery refs in the corpus,
  rejects with the regenerate message (the pattern of `vite-verify-references.test.ts`).
- The showcase and template manifests are regenerated if they changed, and `check:template` is
  green.
- F green (pinned).

**Mutations:** walk top-level fields only; drop the `- ` prefix from the locator; replace only the
first occurrence; restore the unconditional `mediaRefs` drop; never drop (always compare exactly),
which the no-nested-shape pass row kills; drop on a nested-shape site (ignore the adapter's
shapes); the generated verify source omits the adapter.

**Notes:** **breaking:** the report drafts the `Consumers must:` line: regenerate the content
manifest (`npx cairn-manifest`) and commit it; a site that declares a nested image shape and has
not regenerated fails its build at upgrade; a site that calls `verifyManifest` itself passes its
adapter as the third argument to get the nested-shape rule. The stale-manifest message's script
name (B2) is pass B's; leave it. `verifyManifest`'s new argument is public surface: the
`core.md` declaration, `api-surface.md`, and a fact bullet (Task 12) carry it.

**Decisions carried:**
- **Decision 16:** D1 fails closed at the build, not at the delete. A site whose only image
  references are nested commits no `mediaRefs` key, so its stale manifest reads as pre-field and
  builds green while the deployed where-used index sees every gallery asset as unused. That
  residual is the data loss D1 exists to fix. `verifyManifest` gains an optional third argument,
  the adapter. Given it, the verify keeps its pre-field allowance only when no concept declares a
  nested image shape, and compares exactly otherwise; without it, the allowance holds. The verify
  runs at every build and dev start with the adapter in scope (`src/lib/vite/internal.ts:84-94`,
  the generated source; `:273`, `buildStart`; `:304-306`, `runStartChecks`), so on a nested-shape
  site a deployed manifest with no `mediaRefs` key proves the corpus references no image, and the
  delete path keeps today's behavior. The build is the fail-closed point because a runtime gate
  keyed on an absent `mediaRefs` key is reachable by ordinary editing and names a remedy,
  regenerating, that clears nothing. At upgrade, a nested-shape site that has not regenerated
  fails its build until it runs `npx cairn-manifest`, which the `Consumers must:` regenerate line
  already requires.

**Gate:** F (pinned).

### Task 6: The opt-in live key check and the fingerprint (ruling 3)

Fork 2 is ruled yes (Geoff, 2026-10-08); the task is built on that ruling.

**Pass class:** `auth-data` (signing). **model:** `"opus"` in args (see "Models"). **Spec:**
"Ruling 3: the opt-in live key check", every paragraph but the 503's.

**Files:** `src/lib/sveltekit/health.ts`, `src/lib/github/signing.ts`
(`installationToken` at `:66-79`, `signingSelfTest` at `:130`), `src/lib/log/events.ts`, their
tests (a new health live-check test beside `src/tests/unit/github-token-cache.test.ts`),
`docs/reference/sveltekit.md` (the `loadHealth` and `HealthData` rows), `docs/reference/log-
events.md` (the `github.unreachable` row), `docs/internal/api-surface.md`.

**Outcome:**
- `loadHealth(event, runtime)` keeps its signature and reads `?live=1` from `event.url`. With it,
  it mints one installation token through the uncached `installationToken` from the deployed key
  and reports `checks.githubAppToken: { ok, detail }`. The plain call makes no network call. With
  no key or a provider that is not `github-app`, `live=1` makes no network call and reports no
  `githubAppToken` (Decision 15).
- `installationToken` throws a typed error carrying the HTTP `status` in place of the bare message
  at `signing.ts:77`, and takes an optional abort signal (Decision 4). The classifier is total: 401
  is a refused key, 404 an installation not found, 403 a suspended installation, and any other
  status, a network failure, or a timeout is unreachable.
- The check never reads or writes the shared token cache (`cachedInstallationToken`), and the
  minted token is never returned or logged. A failed live mint logs `github.unreachable` with
  `scope: 'health'` and the classifier as `reason`.
- **The bound:** the verdict is cached per isolate for 60 seconds, and only a settled mint writes
  it. The in-flight slot stores `{ promise, startedAt }`; the mint's `fetch` carries
  `AbortSignal.timeout(5000)`; every caller, the starter included, races the shared promise against
  a 5-second timer created in its own request, and a caller whose timer wins reads `unreachable`; a
  caller that finds the slot at or past the timeout treats it as empty and starts a fresh mint; the
  starter hands the slot's promise to the engine's `waitUntil` (`workers-env.ts:43`).
- `signingSelfTest` reports `fingerprint: 'SHA256:<base64>'`, the SHA-256 of the public key's DER,
  computed with Web Crypto and no network call. The fingerprint is derived from public material
  only (`n` and `e`, or an SPKI export), no exported private key object outlives the call, and the
  signing import in `appJwt` stays `extractable: false`. A fingerprint failure omits `fingerprint`
  and carries no message.
- `ok` becomes `githubAppSigning.ok && (githubAppToken?.ok ?? true)` (Decision 1).

**Acceptance:**
- `fetch` stubbed with 401, 404, 403, 500, a thrown `TypeError`, and a hang: each yields its class,
  the hang after the timeout.
- N parallel `live=1` calls on a cold slot make one `fetch`; with an injected clock, a second call
  inside 60 seconds makes none and one after makes one.
- **A dead slot never wedges the isolate** (mirroring `github-token-cache.test.ts`'s "never serves
  an unsettled in-flight mint to a later caller"): the slot holds a never-settling promise, the
  starter is never awaited, and the injected clock never fires its timer. A later caller reads
  `unreachable` within its own timeout, and the next call past the stale point mints again.
- The shared token cache is untouched by any live call (asserted on the cache, not inferred).
- A fixture key pair's `fingerprint`, after its `SHA256:` prefix, equals the base64 that `openssl
  rsa -in KEY -pubout -outform DER | openssl sha256 -binary | openssl base64` prints for it; the
  report quotes the command and its output, and the test commits the expected value.
- A failed live mint logs `github.unreachable` with `scope: 'health'` and the class as `reason`.
- **The composition:** with signing ok and a stubbed 401, `ok` is false; with `live=1` skipped (no
  key, or a non-GitHub provider), `ok` equals the signing check.
- The serialized `HealthData` contains no substring of the fixture key's base64.
- `live=1` with no key, and with a non-GitHub provider, makes no `fetch` and reports no
  `githubAppToken`.
- The plain call makes no `fetch`. This holds today; it guards the new branch and proves nothing.
- Fails today (all but the last): no live branch, fingerprint, or classifier exists.
- The computed gate green.

**Mutations:** clear the slot only in the starter's continuation; skip the per-caller timer; write
the verdict on an unsettled mint; route the mint through `cachedInstallationToken`; map 403 to a
refused key; log the minted token's length or prefix; `ok` reads the signing check alone.

The "no" alternative (an owner-only live check) was not taken.

**Notes:** `HealthData` gains optional members; not breaking. Affected 2a page:
rotate-the-github-app-key (its confirming publish and 55-minute wait give way to the fingerprint and
the check). The residual, one mint per isolate per minute summed over the fleet, is Task 12's
sentence on the reference page. The report quotes GitHub's documented status codes for `POST
/app/installations/{installation_id}/access_tokens` and the Web Crypto export step the fingerprint
uses, from their published pages.

**Decisions carried:**
- **Decision 1:** Task 7 (already landed) made the route answer 503 with `ok` as the signing check
  alone. This task extends `ok` to `githubAppSigning.ok && (githubAppToken?.ok ?? true)`. Task 7's
  route test stubs `loadHealth`, so this task's composition rows are the only proof of it.
- **Decision 4:** the 5-second timeout reaches only the check's mint. `installationToken` takes an
  optional abort signal; the live check passes `AbortSignal.timeout(5000)`, and the publishing
  path's mint is unchanged. A timeout on the commit path would be a behavior change the spec never
  weighed.
- **Decision 15:** `live=1` with nothing to mint with skips the mint. With no key secret, or a
  provider whose `kind` is not `github-app`, the live branch makes no network call and leaves
  `githubAppToken` out, so `ok` reads the signing check alone. A reported "unreachable" would blame
  GitHub for a missing secret the signing check already names.

**Gate:** computed (`auth-data`).

### Task 12: Docs and records for pass A

**Pass class:** `docs`. **Consumes:** every task's report (facts falsified, pages affected, drafted
`Consumers` lines). **Spec:** "Docs and records", "Declined, with proposed ledger entries",
"Ledger entries this pass falsifies", "Consumers must (draft)"; the fold record's "Owed errata".

**Files:** `docs/reference/sveltekit.md`, `core.md`, `log-events.md`, `cloudflare.md`,
`auth-channel.md`, `cli-cairn-doctor.md`, `admin-toolkit.md` (the shell-only sentence), the reference
prose for each task's minimal edits; `packages/cairn-cms-dev/README.md`; `docs/internal/facts/*.md`;
`CHANGELOG.md` (`## Unreleased`); `docs/extend/migration-notes.md`; `docs/extend/upgrade-cairn.md`;
`docs/internal/engine-rulings.md`; `docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-
spec.md` (C7's "Request a link" and "Guard" lines); `docs/superpowers/specs/2026-06-15-cairn-media-2a-
ingest-delivery-design.md` (decision 1, `:162-168`); `ROADMAP.md`; `docs/internal/api-surface.md`
(regenerated).

**Outcome:**
- **Reference:** every page the pass changed reads true, written to the developer-docs brief in
  `docs/internal/docs-register.md` (Google base), with the live check's fleet residual stated on
  `sveltekit.md` and the toolkit's shell-only sentence on `admin-toolkit.md`.
- **Facts:** one bullet per public-behavior change, and a correction to every bullet a task
  falsified, gated by `check:facts`.
- **Per-version records:** `CHANGELOG.md` under `## Unreleased` carries pass A's `Consumers must:`
  lines (the `{ runtime }` and adapter declaration with its reconcile clause; the manifest
  regenerate, with its build failure at upgrade on a nested-shape site, the no-nested-shape
  residual, and `verifyManifest`'s adapter argument for a direct caller; routes under
  `/admin/auth/`; the concept-less tidy and dictionary mount; Turnstile's `missing_secret`; review
  any access rule that names a `none`-capability role, since `canReach`, `requireAccess`, and
  `createSectionAction` now admit it), a changelog line that publish and publish-all can answer
  the calm conflict, and `Consumers may:` lines (the 503; `0001_roles.sql`). `migration-notes.md`
  and `upgrade-cairn.md` carry the same actions.
- **The ledger:** the accept entry `access-map-one-declaration`; the six declines
  (`admin-toolkit-shell-only`, `refusal-channels-per-call-site`, `csrf-no-rotation-under-identity`,
  `admin-headers-scope`, `dev-flag-strict-read`, `token-cache-no-401-eviction`); and dated
  annotations on `access-semantics-documented-divergence` (its Shape and `Verified:` line),
  `audit-adapter-accessmap`, `audit-adapter-rolesdeclaration`, `audit-sveltekit-authguardoptions`,
  `audit-sveltekit-editorroutesoptions`, `audit-adapter-canreach`, `doctor-drop-github-app`, and
  `audit-log-github-unreachable` (Decision 8). Each in the ledger's format.
- **Ratified records:** dated amendments to the functional spec's C7 lines and to the media design's
  decision 1 (the publish snapshot is head-guarded, fail-closed).
- **ROADMAP:** the boundary-test amendment (clause 1 runs after ruling 1's product test; clause 3's
  "whichever engine pass runs next" reads "the final engine batch" unless a stage close pulls an
  item forward); the batched rows join the Next tier's batched engine friction entry, each tagged
  with the page that carries its caveat (B11b, C6, C8, C9, D3, D7, D8b, D9, D10, D11); the Claude
  Code arm's small stage placed right after 2b; "The pre-beta pass series and the two-release
  shape" rewritten to the one-release path (a `0.x` minor after stage 5, not `1.0.0-beta.1`, with
  Phase P's open items, P8 and P9 among them, each named to the final engine batch or after the
  release); the engine-pass Now entry narrowed to pass B (Decision 9).
- **Hand-off for pass B (Decision 10) and the charter phrase (Decision 12):** this task's report
  carries the affected-page list with the fact ids that changed, and the proposed charter phrase.
  It writes neither into `docs/STATUS.md`; close step 9 does.

**Acceptance:**
- `check:reference`, `check:reference:signatures`, `check:surface`, `check:facts`,
  `check:rulings-format`, and the docs gate green; Vale's error tier clean on every published page
  touched.
- `grep -rn` over `docs/` and `README.md` for each removed option name (`AuthGuardConfig.roles`,
  `AuthGuardConfig.access`, `DevBackendConfig.access`, `DevBackendConfig.roles`,
  `EditorRoutesConfig.roles`) and for the old public-prefix wording (`startsWith('/admin/auth/')`
  and `every path under \`/admin/auth/\``) finds only the per-version records and the ledger's
  dated history.
- Every `Consumers` line that the spec's draft or any task report drafted for pass A appears in
  `CHANGELOG.md`; none of pass B's appears.
- The gate green: the classifier's docs string with `&& npm run check:surface && npm run
  check:rulings-format` appended, on the light lane.

**Notes:** the published-page edits follow the register's drafting brief with no register review
or polish (the "Edits after the chain" rule); an edit to a page with a brief updates the brief in
the same change.

**Decisions carried:**
- **Decision 8:** this pass writes all seven new ledger entries the spec names
  (`access-map-one-declaration` and the six declines) and eight of the nine dated annotations.
  `audit-adapter-navmenuconfig` belongs to pass B, which ships D5.
- **Decision 9:** ROADMAP's "Engine pass before stage 2b" Now entry narrows to pass B's remaining
  scope rather than leaving; pass B removes it. Every other ROADMAP change the spec lists lands
  here.
- **Decision 10:** the relink re-arm list is pass B's. This task's report lists the affected 2a
  pages and the fact ids each task changed, so pass B's task has one flat input.
- **Decision 11:** this pass's close clears every friction entry for a pass A fix and every entry
  the spec declines or batches; entries for pass B's fixes stay until pass B's close.
- **Decision 12:** C7's charter phrase, "the sign-in form and its confirm page", for
  `docs/internal/what-cairn-is-and-is-not.md:107`, is proposed for Geoff's read, never written into
  the charter.
- **Decision 13:** the doctor's changelog landed with Task 2 under `tool/CHANGELOG.md`; no tool
  tag.
- **Decision 16:** D1 fails closed at the build: given the adapter, `verifyManifest` compares
  exactly when any concept declares a nested image shape, so a nested-shape site that has not
  regenerated fails its build at upgrade; the delete paths are unchanged. The changelog's
  regenerate line says so, and `core.md` documents the optional adapter argument.

**Gate:** the classifier's docs string plus `check:surface` and `check:rulings-format`; `gateLane:
"light"` in args.

**S4 boundary:** D green on the segment head (Task 12 is docs-only); STATUS and a Ledger entry.
Close step 2 runs the pass's final F, `check:close`, and T.

---

## Close

Run `pass-core`'s ritual with the cairn specifics, in order. The conductor stays thin: each step
is a dispatch that returns a structured verdict.

1. **Simplify, once:** `code-simplifier:code-simplifier` over the pass's changed TypeScript,
   JavaScript, Svelte, and Go.
2. **Full gate:** F again; never the stock `npm test` (it hangs on this workstation while holding
   the heavy lock, `docs/internal/durable-gotchas.md`; F carries the serialized node and component
   legs). Then `cairn-run-gate 'npm run check:close'` (0 errors, 0 warnings), then T. This is the
   pass's one final full gate; the S4 boundary ran D only.
3. **Consumer proof:** a from-scratch showcase build in the worktree (`rm -rf
   examples/showcase/{node_modules,package-lock.json}`, fresh install, `npm run build`, then `git
   checkout -- examples/showcase/package-lock.json`) exits 0 and leaves the tree clean, plus the CI
   `e2e` run on the pushed head. Evidence quoted.
4. **Review fan-out, in parallel:** each on `claude-opus-5-5`:
   - `web-auth-security-reviewer` at `high` (always, for `auth-data`), briefed on the guard and
     dev handle, the access edges, the roles migration, and the live check, and on the pass's two
     data-loss fixes: the C11 head guards on every writer to `main` (publish, publish-all, Library
     delete, metadata, replace, alt, dictionary), with the head read before every snapshot read and
     the null-head refusal; and D1's build-time verify over nested shapes and the pre-field
     manifest (the adapter reaching `verifyManifest` from the generated verify source).
   - `svelte-reviewer` (EditPage and the load and action code).
   - `cloudflare-workers-reviewer` (the health route, `waitUntil`, the `AUTH_DB` writes, the
     migration).
   - One `go-architecture-reader` for `tool/internal/doctor`.

   Blocking findings go through one fix chain under the stop rules above; out-of-scope findings go
   to the friction log.
5. **Live admin smoke** (`auth-data`), per `docs/internal/admin-smoke-test.md`'s local flow, under
   `wrangler dev` with the default build (no `VITE_CAIRN_E2E`, no `CAIRN_DEV_BACKEND` anywhere,
   checked first), on a port from an environment variable with `--var
   PUBLIC_ORIGIN:http://localhost:$PORT`, and a local `AUTH_DB` migrated through 0001. The showcase
   declares no custom role, so the custom-role checks run on a **scratch showcase copy** under
   `$HOME/.cache/engine-pre-2b-a/` (its `file:` dependencies rewritten to the worktree's absolute
   paths) whose adapter declares `roles` with one editor-capability custom role and an `access`
   rule naming that role on a custom screen. Seed an owner and a custom-role editor.
   - The magic-link round trip driven in headless Chromium (Decision 14): `/admin/auth/confirm`
     loads with no session, and `/admin/auth/request` with no session redirects to the login.
   - A custom-role roster add succeeds after 0001 and, on a second local D1 without 0001, logs the
     named condition.
   - The custom-role editor is admitted to its screen and refused on `/admin/signups`, and the
     sidebar matches both outcomes (the guard resolving a declared role from the adapter alone).
   - `/healthz` answers 503 with the keyless env, and `/healthz?live=1` reports the signing
     failure without a network call (no key to sign with).

   Evidence: the commands, status codes, and the matching log lines quoted.
6. **Live key probe** (Task 6's ruling), under `wrangler dev` from a scratch showcase copy under
   `$HOME/.cache/engine-pre-2b-a/`. A script that sources `~/.local/secrets` itself (which
   exports `GITHUB_APP_PRIVATE_KEY_B64`, `GITHUB_APP_ID`, and `GITHUB_APP_INSTALLATION_ID`,
   verified by name only) prepares the copy, printing no value:
   - It writes only `GITHUB_APP_PRIVATE_KEY_B64` into a mode-600 `.dev.vars` beside the copy's
     `wrangler.jsonc`, deleted on exit; never through `--var` (the process list) and never in the
     worktree. The key is the one name the engine reads from the env
     (`src/lib/github/credentials.ts:18`). Cloudflare documents the load: "Put secrets for use in
     local development in either a `.dev.vars` file or a `.env` file, in the same directory as the
     Wrangler configuration file"
     (`https://developers.cloudflare.com/workers/configuration/secrets/`). The same page notes
     that a `secrets.required` list limits which keys load; the showcase's `wrangler.jsonc` declares
     none, and the copy has no `.env`.
   - It rewrites the copy's `createGithubApp({ ... appId: '1', installationId: '2' })` literal
     (`examples/showcase/src/theme/cairn.config.ts:149`) from `$GITHUB_APP_ID` and
     `$GITHUB_APP_INSTALLATION_ID`. Nothing under `src/lib` reads those two env names: the ids live
     on the adapter (B9), so a `.dev.vars` entry for them would leave the mint aimed at
     installation 2.
   - `/healthz?live=1` reports `ok` against the real App, and with a freshly generated wrong key
     reports a refused key.
   - **Concurrency (the workerd evidence for the single-flight slot):** N concurrent `?live=1`
     requests all report the same `githubAppToken` verdict within the timeout, and the log shows
     one mint; one more inside 60 seconds mints nothing.
   - The fingerprint reported for the real key is quoted; no token, JWT, or key byte is printed.

7. **Docs check:** Task 12's pages re-read against any close-time fix; `check:surface -- --update`
   re-run if a fix moved a typed export.
8. **Friction triage** (Decision 11): every friction-log entry for a pass A fix is deleted after a
   check against the code; every declined or batched entry leaves for its ledger entry or ROADMAP
   row; new friction the pass met is filed. The HISTORY entry counts entries and outcomes.
   **Log restructure (Geoff, 2026-10-08):** the close triages the whole log per `cairn-pass`, not
   only pass A's entries, and regroups "Open findings" by who clears an entry, keeping the file
   path. **Engine** feeds the docs-stage boundary test. **Docs content** is any way a page fails
   its reader: a wrong claim, a missing working example, step, or failure case, too much or too
   little detail for the task, content in the wrong track or page or unfindable from where a
   reader looks, or drift since writing; the filing test is whether the reader can finish the
   page's job from the page. A small docs item is cleared by the pass that meets it, like tooling
   (Geoff, 2026-10-08): fixed on the page to its track's brief (the brief updated where the page
   has one, Vale's error tier run), except on an arm whose stage is in flight or holds no page yet
   (filed, or filed into the facts container) and on a page the running plan freezes (this pass:
   the eleven 2a extend pages, whose small fixes join Task 12's hand-off to pass B's re-arm).
   A larger docs rework moves to a ROADMAP row in the tier where it bites, naming the page and
   its arm, the same as tooling (Geoff, 2026-10-08). **Repo tooling** (gates,
   scripts, fixtures, tooling comments) is cleared at every pass close: a small fix lands in the
   pass, anything larger moves to a ROADMAP row. The log's header states the three groups, and
   `cairn-pass`'s close step names who clears each. Pass B's own entries stay, grouped, until
   pass B's close.
9. **Ledgers:** `docs/STATUS.md` rewritten present tense (≤60 lines): pass A closed unreleased,
   pass B next, the hand-off list (Decision 10), and the charter phrase for Geoff's read. `docs/HISTORY.md` takes the pass entry: what landed, what the gates caught, what a
   later pass would be wrong to rediscover, and whether any refused fold finding (the six standing
   refusals) turned out real. This plan takes its post-mortem with the budget score: tokens against
   11.1M via `/cost`, planning misses, and execution sittings.
10. **Merge:** the PR leaves draft once CI is green; the merge to `main` waits for Geoff's go,
    batched with the charter phrase. No version bump, no tag, no publish.
11. **Pre-bake and hand off:** plan, STATUS, and ROADMAP committed; tree clean; the resume prompt
    names pass B's plan as the next action.

## Ledger

(Checkpoint entries go here: date, segment, task statuses, decisions taken, spend, next task.)

### 2026-10-08, Task 0 (paused mid-task at Geoff's request)

- **Item 1, no live executor:** none; no prior `engine-pre-2b-a` branch or worktree; `main` clean.
- **Item 2, start state:** PR #107 merged 2026-10-08T08:06Z; spec and plan on `main` at `034f30a0`
  (spec read approved, all three forks ruled).
- **Item 3, worktree:** created on `engine-pre-2b-a` from `034f30a0`; `npm ci` and the from-scratch
  showcase `npm ci` both exit 0; `realpath` resolves the engine and `packages/cairn-cms-dev` into
  the worktree.
- **Item 4, gate strings:** F (`--pin full`) and E (`--pin engine`) printed and match "Gates";
  F carries 31 steps ending in the showcase `test:e2e`.
- **Item 5, baseline:** a `haiku` gate agent was running F then T at the pause. If no result is
  recorded below, re-run it on resume before any dispatch.
- **Item 6, draft PR:** not yet opened; open it after the baseline.
- **Item 7, S1 pre-flight:** no false claim. Moved lines, outcome unchanged: the regex pin is
  `check-tool-heuristics.mjs:52`; the dev handle's owner mint is `handle.ts:169-173`; the
  `access_map_not_attached` literal is `section-action.ts:277`; the required `runtime` fields are
  `cairn-admin.ts:36`, `content-routes-context.ts:193`, `nav-routes.ts:48`, `media-route.ts:76`;
  the bare call in `admin-routes.md`'s snippet is `:224`; the `sveltekit.md` snippet calls are
  `:134` and `:1048`. Caller counts: `createAuthGuard` 1 non-test + 18 test, `devBackendHandle`
  1 + 15 (plus the template's hooks), `createEditorRoutes` 1 + 4. Fact bullets citing
  `templates/waymark/src/access.ts`: `f:3z1uxv`, `f:qlgggh`.
- **Item 8, fork 2:** ruled yes.
- **Items 9 and 10:** guards not armed (no workflow launched); spend not yet recorded.
- **Plan amendments on the branch:** `53e3d7de`, `42e4f3d5`, `3bc97946` (Geoff's friction-log
  restructure, folded into close step 8).
- **Next:** baseline result, draft PR, guards, then the S1 `pass-execute` launch (Tasks 1, 2, 3)
  with the moved lines above passed in the task notes.

### 2026-10-08, Task 0 resumed and closed

- **Setup gaps (repo tooling friction, filed at the S1 checkpoint):** a fresh worktree needs
  CI's preparation steps before F can pass: `npx svelte-kit sync` in `examples/showcase`
  (`check-public-skill.test.ts` fails on `$app/tsconfig`), `npm run package`, and the
  `create-cairn-site` template bake from `.github/workflows/test.yml`. All three run here; pass B's
  Task 0 now carries them (`7a8d5c19` on `main`).
- **Item 5, baseline:** T green (`gate exit: 0`). F ran the whole chain: every step green through
  the showcase e2e, which ended 20 failed, 328 passed. The 20 are exactly the
  `site-visual.spec.ts` home and archive-page-2 files at five widths and two schemes, the drift
  `durable-gotchas.md` names under "CI-canonical baselines this workstation cannot reproduce". Ruled
  green under that rule.
- **Local F amended (conductor ruling):** the per-task and boundary F replaces its last step with
  `npm --prefix examples/showcase run test:e2e -- --grep-invert "site home|archive page 2"`. The
  pattern lists exactly those 20 tests (`--list`: 328 kept, 20 excluded, all in
  `site-visual.spec.ts`). The runner's gate agent sees only the gate string, so without it every
  F-pinned task would read red. CI runs the 20 on every push against its canonical baselines,
  so S3's CI boundary and the close still cover them.
