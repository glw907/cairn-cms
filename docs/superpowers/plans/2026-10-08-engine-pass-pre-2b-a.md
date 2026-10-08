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

**Spec:** `docs/superpowers/specs/2026-10-07-engine-pass-pre-2b-design.md` at `0c476887` (reviewed,
folded, and verified). Its "Pass A" list is this plan's task list, numbered the same. Owner rulings:
`docs/superpowers/specs/2026-10-07-engine-pass-pre-2b-rulings.md`. Fold record and owed errata:
`docs/superpowers/research/2026-10-07-engine-pass-pre-2b-spec-fold.md`. The spec's line numbers are
`draft-docs-2a`'s; the pre-flight re-checks each at this pass's `main`. Where this plan and the spec
disagree, stop and report, except the items under "Decisions this plan takes".

**Pass class:** `auth-data` (the header class). Overrides, from the spec: Task 2 is `tool`; Tasks
5, 7, and 8 are `engine-logic`; Task 12 is `docs`. Tasks 1, 3, 4, 6, 9, 10, and 11 are `auth-data`.
A mixed pass runs the union of its classes at the close.

**Token ceiling:** 11.0M for the whole pass, chains plus close. Basis: eleven code chains at 0.55M
each under the class gate (6.05M; the observed rate is 0.4M to 0.5M per chain, raised for the
full tier on the e2e-bearing tasks), the docs task at 1.2M, Task 0 at 0.2M, four pre-flights at 0.1M
each (0.4M), one fix round per segment in reserve (1.0M), and the close at 2.15M (the simplifier,
four reviewer seats, the consumer proof, the live smoke and key probe, ledgers, friction triage).
**At 80 percent (8.8M)** the conductor finishes the task in flight, writes STATUS, and stops at the
next segment boundary with one combined question. No budget question arrives mid-segment.

**Checkpoint interval:** every segment boundary (no segment holds more than three tasks). The
conductor writes STATUS and a Ledger entry in this plan at the end of S1, S2, S3, and S4, at any
split, and before any question to Geoff.

**Segments** (each ends on a green commit):

| Segment | Tasks | Boundary proof |
|---|---|---|
| S1, one declaration and the access edges | 1, 2, 3 | F and T green on the segment head |
| S2, the auth store, the channel, and the health status | 4, 5, 7 | F green |
| S3, the edit page and the commit path to `main` | 8, 9, 10 | F green; branch pushed; CI green |
| S4, nested media, the live check, and the records | 11, 6, 12 | F, T, and D green; `check:close` green |

**Independence and the Files seams.** Tasks 2 and 3 have disjoint Files and both consume only
Task 1. Task 5 is disjoint from Tasks 4 and 7; Tasks 4 and 7 share the condition registry
(`conditions.ts` and its generated mirror), so they stay ordered. Task 9 is disjoint from Task 8;
Task 10 consumes both. Tasks 11 and 6 are disjoint. Every task still runs in sequence in the one
worktree: one index, one gate key, and one emitted template.

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
  gate: "<F, printed by Task 0>",
  implementer: "cairn-implementer",
  reviewer: "diff-reviewer",
  passClass: "auth-data",
  maxFix: 1,
  stopOnEscalate: true,
  classifier: true,
  commonNotes: "<Global constraints below, plus the pre-flight checklist from ~/.claude/docs/pass-gate-economy.md>",
  tasks: [{ id, title, criteria, files, notes, passClass?, gate?, gateTier?, gateLane? }]
}
```

Each task's `criteria` is its Acceptance block verbatim, `files` its Files line, and `notes` its
Notes plus its mutation list. A task's own `passClass`, `gateTier`, and `gateLane` are set where
this plan sets one. `auth-data` fix rounds run the full gate (the runner reduces only a comment-only
round under `auth-data`). Task 0 and the close are conductor-led dispatches outside the runner.

**Models:** implementers `sonnet` (the agent's pin); `diff-reviewer` on `claude-opus-5-5` at
`medium`; the close's `web-auth-security-reviewer` at `high`. No task is upshifted at plan time:
the spec specifies each mechanism, the live check's slot included. **Upshift candidates:** Task 6
(the single-flight slot under workerd cancellation) and Task 8 (kit 3's `use:enhance` location
rule). If either's first verdict is `fix` with a finding in that mechanism, the conductor re-dispatches
the fix on `model: opus` without stopping.

**Pre-flight (every segment):** before each segment's first dispatch, one `haiku` pre-flight lists
every factual claim that segment's tasks make about existing code at the worktree's HEAD (paths,
line numbers, counts, symbol names, script names) and checks each. The conductor amends the plan
and commits the amendment before dispatching. S1's claim list is under "Pre-flight claims, S1".

## Gates

Every gate runs through `cairn-run-gate '<string>'`; on exit 75, re-issue until it prints `gate
exit:`, never poll a log. `CAIRN_GATE_LANE=light` only for a gate that launches no browser. The
engine's root `npm test` and the component project drive Chromium and are never light.

- **Full (F):** the `full` tier of `scripts/checks/gate-tier.mjs`, printed by `node
  scripts/checks/gate-tier.mjs --range <base>..HEAD --pin full` and quoted in Task 0's Ledger entry.
  It runs the docs gate, `npm run check`, the node projects, the serialized component project, the
  `create-cairn-site` suite, the admin visual spec, `check:comments`, `check:surface`, CI's check
  list (`check:template`, `check:tool-heuristics`, `check:rulings-format` among them), and the whole
  showcase e2e. Every local showcase e2e runs with `E2E_PORT=4392` after `ss -ltnp 'sport =
  :4392'` shows no listener (quoted in the report).
- **Engine (E):** the `engine` tier of the same script.
- **Tool (T):** `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`.
- **Docs (D):** `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:docs-gate && npm run
  check:surface && npm run check:reference && npm run check:reference:signatures && npm run
  check:rulings-format && npm run check:facts'`.

**Per-task gate.** The runner's classifier sizes each task's gate from its committed diff, with F
as the fallback. Tasks whose acceptance carries a showcase e2e pin `gateTier: "full"` (Tasks 1, 7,
8, and 10). Task 2's diff spans `tool/` and `src/lib/diagnostics/`, so the classifier runs the npm
tier and T together on the heavy lane. Task 12 runs D.

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
- Every commit leaves `check:reference`, `check:reference:signatures`, and `check:surface` green.
  A task that changes a typed export or removes a documented symbol makes the minimal reference
  edit and regenerates `docs/internal/api-surface.md` with `npm run check:surface -- --update` in
  the same task. Task 12 writes the prose.
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

1. **Task 7 runs before Task 6**, so only Task 6 waits on fork 2. Task 7 lands the 503 and the
   non-applicable signing report with `ok` as the signing check alone. Task 6 then extends `ok` to
   `githubAppSigning.ok && (githubAppToken?.ok ?? true)`, the spec's composition. The 503 test from
   Task 7 covers both shapes.
2. **The access map moves inline onto the adapter.** The showcase and the template declare
   `access` (and `roles`, where a site has its own) as members of the adapter in
   `src/theme/cairn.config.ts`, and `src/access.ts` is deleted from both. The showcase-only
   `theme-kit` rule keeps its `cairn-template:exclude-start/-end` markers inside the adapter. Pass
   B then removes the scaffold's `/admin/signups` rule with markers alone, and the scaffold reaches
   the zero-config floor with no `access` member. This is the spec's "on the adapter" form; its
   "or in a module the adapter imports" stays the documented alternative for a site.
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
6. **B9 regenerates the generated env types.** Both `worker-configuration.d.ts` files (showcase and
   Waymark) are generated by `wrangler types --env-file=...template-repo/.dev.vars.example`, so
   they declare `GITHUB_APP_ID` and `GITHUB_APP_INSTALLATION_ID`. Task 7 reruns the command each
   file records on its line 2 after dropping the two lines, and the grep post-condition covers them.
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
10. **The relink re-arm list is pass B's** (the spec puts it in pass B's docs task). Task 12 writes
    the affected 2a pages and the fact ids each task changed into STATUS's carry-forwards, so pass
    B's task has one flat input.
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

## Rulings for Geoff

1. **Fork 2: may an anonymous `/healthz?live=1` mint a token?** Open. It governs Task 6 alone,
   which is built on the spec's recommendation (yes, with the coalesced per-isolate cache and the
   per-caller timeout) and is **BLOCKED until Geoff rules**. Task 6's section states what changes
   under "no". Fork 1 (the dev-save notice) belongs to pass B.
2. **The charter phrase (Decision 12).** Not a fork: one phrase for Geoff's read, batched with the
   merge go.

## Running unattended

The pass is planned to run 10 or more hours without Geoff. Every stop is settled here.

**The conductor rules alone on:**

- A runner artifact: a classifier tier mismatch the reviewer flagged, a stalled or dropped
  workflow (relaunch with `resumeFromRunId`), an API overload or 5xx (wait, retry once), or a gate
  that exited 75.
- A flake under the rerun rule in `docs/internal/durable-gotchas.md`: one rerun of the named test
  file or the serialized component run; a second red is a real failure.
- A second `fix` verdict on a non-`auth-data` task (Tasks 2, 5, 7, 8, 12): one more fix round, an
  upshift to `model: opus`, or a split of the task, whichever the findings point at. The decision
  and its reason go in the next Ledger entry.
- An upshift on Task 6 or Task 8 per "Models".
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
- An escalate verdict that names an architectural fork the spec did not settle.
- A pre-flight finding that changes a task's outcome (a claim the spec rests on is false).
- The ceiling at 80 percent, at the next segment boundary.
- Fork 2 unruled when S4 reaches Task 6: the run finishes Task 11, writes STATUS, and stops. Task 6
  and Task 12 wait for the ruling.
- A red boundary gate that is not a flake.

**Owner-gated steps, batched at the end:** fork 2 (if still open), the charter phrase, and the
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
6. **A stale manifest that still builds.** Task 11's verify narrowing and the nested-only residual
   the regenerate line covers.

---

### Task 0: Pre-flight and baseline (conductor, no gate)

**Outcome:** the start conditions hold and are recorded in this plan's Ledger.

1. **No live executor:** `pgrep -af` on the worktree path and the branch name finds nothing (never
   a pattern in the command's own text); no `engine-pre-2b-a` branch or worktree exists; the `main`
   checkout's `git status --porcelain` shows no warm edits this pass would collide with.
2. **Start state:** PR #107 is merged; `main` carries this plan and the spec at or after
   `0c476887`; STATUS points at this plan.
3. **Worktree:** create `.claude/worktrees/engine-pre-2b-a` on `engine-pre-2b-a` from `main`; `npm
   ci`; a from-scratch showcase install (`rm -rf examples/showcase/node_modules` then `npm ci
   --prefix examples/showcase`); `realpath` confirms the engine and the dev package resolve into the
   worktree.
4. **Gate strings:** print F and E with `gate-tier.mjs --pin full` and `--pin engine` and record
   both.
5. **Baseline:** one `haiku` gate agent runs F, then T, in the worktree and returns each `gate
   exit:` line and tail. The conductor quotes them to Task 1's reviewer as Task 0's gate evidence. A
   red stops the pass with one message to Geoff.
6. **Draft PR:** push `engine-pre-2b-a`, open a draft PR against `main` so CI runs on every later
   push, and record that SHA's CI result.
7. **S1 pre-flight** per "Pre-flight claims, S1".
8. **Fork 2's state:** record whether Geoff has ruled. If he has, amend Task 6 to the ruled answer
   (strike its BLOCKED line or apply its "Under no" changes) and commit.
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
`docs/reference/log-events.md` (the rows named below only), `docs/internal/api-surface.md`, and
`templates/waymark/**` through `npm run emit:template`.

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
- **One map, five readers:** a fixture adapter with `access: { media: ['owner'], '/admin/x':
  ['owner'] }` and a declared editor-capability role, composed through `composeRuntime`. Running
  `createAuthGuard({ runtime })`'s handle over a real event with no locals set, an editor session is
  refused by the media screen (`requireEngineAccess`), the nav resolver, `requireAccess`,
  `createSectionAction`, and `createAdminAction` with `access`. Fails today: the guard has no
  `runtime` input, so only a hand-seeded `locals.cairnAccess` reaches the last three.
- **The dev handle attaches the adapter's map:** through `devBackendHandle({ runtime })`,
  `locals.cairnAccess` is `runtime.access`, and `{}` when the adapter declares none. Fails today:
  no map unless handed `access`.
- **Roles from the adapter alone:** a declared role's capability resolves the same in the guard and
  the roster screen. Fails today: the guard reads `DEFAULT_ROLES` unless handed `roles`.
- **The narrowed warning:** `config.access_unmapped` is silent for an href-only map and fires for a
  partial screen map. Fails today: it fires for the href-only map. The test that asserted an href
  key "never counts toward coverage" is rewritten to the new rule, and the report names it (Task
  12 annotates the ledger's `Verified:` line).
- **Build-fail evidence (Decision 7):** a scratch showcase copy whose adapter throws at composition
  fails `vite build`; the report quotes the exit code and the throw.
- `npm run check:tool-heuristics` green; `check:template` and `test:emit` green; the showcase e2e
  green (the dev handle path).
- `git grep -nE "createAuthGuard\(\{ ?(access|roles)|devBackendHandle\(\{ ?(access|roles)|createEditorRoutes\(\{ ?roles" -- src packages examples templates docs/reference`
  prints nothing.
- F green.

**Mutations (each must turn a named test red; the report's mutation ledger quotes it):** the guard
reading `access` from anywhere but `runtime`; the dev handle attaching `undefined` when the adapter
declares no map; the guard falling back to `DEFAULT_ROLES` beside a declared vocabulary;
`config.access_unmapped` counting href keys toward coverage.

**Notes:** a breaking change; the report drafts the `Consumers must:` line for Task 12 from the
spec's draft. The report lists every 2a extend page the change affects and every fact id it
falsifies (`grep` over `docs/internal/facts/`).

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
- A table-driven Go test: `createAuthGuard({ runtime })`, `createAuthGuard({ runtime: cairn })`, and
  `createAuthGuard({ runtime, identity })` pass; a bare `createAuthGuard()` with custom roles
  declared still fails. Fails today: each `{ runtime }` form reads as unwired (a `{` with no `roles`
  word).
- `npm run check:tool-conditions` green (the mirror regenerated).
- T green, plus the npm tier the classifier computes for the `conditions.ts` edit.

**Notes:** `go-conventions` governs. No tool version bump or tag.

**Gate:** the classifier's npm tier plus T, heavy lane.

### Task 3: The access edges: A1, A2, C1, C7

**Pass class:** `auth-data`. **Independent** of Task 2. **Consumes:** Task 1. **Spec:** "Access and
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
  dynamic route, plus one row each through `requireAccess` and `createSectionAction`: a `none`
  session on a mapped href naming its role is admitted, and on `editors` is refused. Fails today:
  refused before the map is read.
- **A2:** a map with `/admin/x` and `/admin/x/y/z` and a request to `/admin/x/[id]` logs `reason:
  'shadowed'`; each of the five emitters is covered by a test asserting a `reason`. Fails today: no
  `reason` field.
- **C1:** both actions called with no `concept` param by an editor the map denies answer 404. Fails
  today: the action runs.
- **C7:** a table over `isPublicAdminPath` is true for `/admin/login` and `/admin/auth/confirm` only,
  and false for `/admin/auth/request`, `/admin/auth/x`, `/admin/auth/confirm/x`, and `/admin/authx`.
  The integration test at `auth-guard.test.ts:107-111` flips to a redirect for `/admin/auth/request`
  with no session. Fails today: `startsWith('/admin/auth/')`.
- The showcase e2e sign-in specs stay green (the confirm page is still public).
- F green.

**Mutations:** restore `canReach`'s early `none` return; admit `none` on an unmapped href; report
`'no_rule'` for a shadowed match; restore the `startsWith` prefix; restore the
`if (event.params.concept)` guard on either action.

**Notes:** A1 is a loosening and C1 and C7 are breaking for a hand-mount or a site route under
`/admin/auth/`; the report drafts their `Consumers must:` lines and names the affected 2a pages
(security-model, restrict-admin-access, add-a-second-sign-in-group, debug-your-site) and fact ids.
The charter phrase and the functional spec's amendments are Task 12's.

**Gate:** F (computed; `auth-data`).

**S1 boundary:** F and T green on the segment head; STATUS and a Ledger entry written; S2's
pre-flight dispatched.

---

## S2: the auth store, the channel, and the health status

### Task 4: The roles migration ships, and every role write names it (A3)

**Pass class:** `auth-data`. **Spec:** "Access and auth", item A3.

**Files:** `examples/showcase/migrations/0001_roles.sql` (new, byte-identical to the package's
`migrations/0001_roles.sql`), `src/lib/auth/store.ts`, `src/lib/diagnostics/conditions.ts`,
`tool/internal/spine/conditions.json` (regenerated), `src/tests/unit/emit-template-tree.test.ts`,
the store's tests, `templates/waymark/migrations/` through `npm run emit:template`, and any
reference page that lists the condition registry.

**Outcome:** the scaffold carries migrations {0000, 0001, 0003, 0004} and not the opt-in 0002.
Every role-writing statement (the inserts at `store.ts:271` and `:468`, the updates at `:506-509`
and `:544`) routes a role `CHECK` constraint failure through a named condition,
`auth.store-roles-unmigrated` (Decision 3), the way `rethrowStoreFailure` names 0004. The message
names `0001_roles.sql` and says it rebuilds `editor` with the engine's four columns only. Any other
failure rethrows untouched.

**Acceptance:**
- `emit-template-tree.test.ts` asserts the scaffold's migration set is exactly {0000, 0001, 0003,
  0004}. Fails today: 0001 absent.
- Against a D1 on `0000_auth.sql` alone, adding an editor with a custom role and changing a role to
  a custom one each throw `auth.store-roles-unmigrated`, one test per statement. Fails today: a raw
  500 from the constraint.
- After 0001 the same writes succeed, and applying 0001 after 0004 leaves `magic_token` intact.
- `check:tool-conditions`, `check:template`, and `test:emit` green.
- F green.

**Mutations:** drop the routing on each of the four statements in turn; widen the match so a
non-constraint error is renamed.

**Notes:** `Consumers may:` apply `0001_roles.sql` when declaring custom roles; safe after 0004.
Affected 2a pages: restrict-admin-access, add-a-second-sign-in-group, scaffolded-site-files. The
recorded transcript fixtures stay unedited (they predate the file).

**Gate:** F (computed; `auth-data`).

### Task 5: Turnstile, the channel database type, and partial branding (A7, A8, A10)

**Pass class:** `engine-logic`. **Independent** of Tasks 4 and 7. **Spec:** "Access and auth",
items A7, A8, A10.

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
- **A10:** `auth.branding: { siteName }` alone sends mail that keeps the runtime's reply-to. Fails
  today: dropped.
- F green (computed).

**Notes:** not breaking. Alerting keyed on `invalid_input` for a missing secret now matches
`missing_secret` (a `Consumers must:` line). Affected 2a pages: add-a-second-sign-in-group,
add-cairn-to-a-sveltekit-app.

**Gate:** computed.

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
  branch included, and its "always returns 200" comment states the new contract. `ok` is the
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
  `loadHealth` stubbed, both branches and the catch). The showcase's `healthz.spec.ts` expects the
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

**Gate:** F.

**S2 boundary:** F green; STATUS and a Ledger entry; S3's pre-flight dispatched.

---

## S3: the edit page and the commit path to `main`

### Task 8: A failed save keeps the writing (A6)

**Pass class:** `engine-logic` (Svelte). **gateTier:** `full`. **Spec:** "Admin behavior", item A6.

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
  document reload, `{#key}` remount, and dirty reset.
- A local flag set on an in-place failure suppresses the `data.saved` flash and `saveState`'s
  "Saved". The dirty baseline for an in-place failure is the loaded `data.body`, so a refusal that
  echoes `body` still reads as unsaved and the leave guard still prompts.

**Acceptance (a showcase e2e from `?saved=1`):**
- Type text; `page.route` answers `?/save` with a 500 failure and fails any following
  `__data.json`. The calm message shows, no "Saved" text shows, the text is intact, Save is
  enabled, a retry succeeds, and the leave guard prompts.
- The same forge with a 409 failure echoing `body`: "Unsaved changes" shows, no "Saved" text
  shows, and the leave guard prompts.
- A successful save ends in a document load reading "Saved".
- Fails today: a bare 500 replaces the page and the text. The report quotes the red run.
- The admin visual spec's baselines are unchanged.
- F green.

**Notes:** no public surface change. Affected 2a page: rotate-the-github-app-key. Kit 3.0.x's
behavior the spec cites (`actions.js:170,186-191`, `client.js:88-109,147-155,182,2980-3005`) is
re-read from the installed kit before relying on it; a difference stops the task with a report.

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
which now fires because a head is passed. The delete docstring's stale-read note states the guard.

**Acceptance (a race test per path, committing between the head read and the commit):**
- A deleted row stays deleted (single and bulk delete).
- An upload's row survives a metadata update.
- A publish's prose survives a replace and an alt propagation.
- Two concurrent dictionary adds both land.
- Fails today: each path's retry re-parents the stale file. The report quotes each red run.
- F green (computed).

**Mutations:** drop `expectedHead` from each path in turn; read the head after the manifest read
instead of before.

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
merge happens inside the retry.

**Acceptance:**
- A race test committing between publish's head read and its commit: a Library delete inside the
  window stays deleted, and the publish answers the calm conflict with the entry still held. Fails
  today: the retry re-parents the stale snapshot.
- The same for publish-all.
- A showcase e2e: a publish submitted through Task 8's submit with a pending dictionary word lands
  without a conflict, and the word commits. This holds today; it guards the new head read against
  the page's own commit.
- F green.

**Mutations:** drop `expectedHead` from publish and from publish-all in turn; move the head read
after the snapshot read.

**Notes:** surface: a publish can now answer a conflict. Task 12 amends the 2a media design's
decision 1. The 2b configure-media page drops its caveat (pass B's hand-off).

**Gate:** F.

**S3 boundary:** F green; branch pushed; CI green on the head; STATUS and a Ledger entry; S4's
pre-flight dispatched, which also records fork 2's state.

---

## S4: nested media, the live check, and the records

### Task 11: Nested images in where-used, replace, and the manifest verify (D1)

**Pass class:** `auth-data` (the commit path). **Independent** of Task 6. **Spec:** "The commit
path and media", D1.

**Files:** `src/lib/content/media-refs.ts` (`:45-52`), `src/lib/content/media-rewrite.ts` (the
`src:` locator at `:132`, `imageFieldKeys` at `:164-171`, replace's single-occurrence edit, alt
propagation's placement report), `src/lib/content/manifest.ts` (`verifyManifest`, `:325-328`),
`src/lib/sveltekit/content-routes-media-metadata.ts` only where replace or alt read a placement,
their tests, `examples/showcase/src/content/.cairn/index.json` and the template's copy
(regenerated if they change), and `docs/internal/api-surface.md` if a typed export moved.

**Outcome:**
- `extractMediaRefs` and `imageFieldKeys` walk all four shapes `checkContainerNesting` admits:
  `image`, `object({ image })`, `array(image)`, and `array(object({ image }))`.
- The `src:` locator admits an optional `- ` sequence prefix, and replace rewrites every occurrence
  in an entry.
- Alt propagation reports a nested placement and never splices it.
- `verifyManifest` drops a built `mediaRefs` only for a manifest that predates the field (no
  committed entry carries the key). A post-field manifest compares exactly, and a stale one fails
  the build with the regenerate message. The nested-only residual (a site whose only references
  are nested commits no `mediaRefs` key and reads as pre-field) is stated in a comment and covered
  by the `Consumers must:` regenerate line.

**Acceptance:**
- Where-used, safe delete, bulk delete, and replace run over each of the four shapes, including a
  `- src:` line and an asset twice in one array. Fails today: each nested asset reads as unused.
- Alt propagation over a sequence-form entry leaves it byte-identical and reports the placement.
- A committed manifest whose gallery-only entry lacks `mediaRefs` fails `verifyManifest`. Fails
  today: it passes.
- The showcase and template manifests are regenerated if they changed, and `check:template` is
  green.
- F green (computed).

**Mutations:** walk top-level fields only; drop the `- ` prefix from the locator; replace only the
first occurrence; restore the unconditional `mediaRefs` drop.

**Notes:** **breaking:** `Consumers must:` regenerate the content manifest (`npx cairn-manifest`)
and commit it. The stale-manifest message's script name (B2) is pass B's; leave it.

**Gate:** computed (`auth-data`).

### Task 6: The opt-in live key check and the fingerprint (ruling 3)

**BLOCKED until Geoff rules fork 2.** Built on the recommendation ("yes"). If fork 2 is still open
when S4 reaches this task, the run stops after Task 11 (see "Running unattended").

**Pass class:** `auth-data` (signing). **Upshift candidate** (see "Models"). **Spec:** "Ruling 3:
the opt-in live key check", every paragraph but the 503's.

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
  computed with Web Crypto and no network call.
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
- `live=1` with no key, and with a non-GitHub provider, makes no `fetch` and reports no
  `githubAppToken`.
- The plain call makes no `fetch`. This holds today; it guards the new branch and proves nothing.
- Fails today (all but the last): no live branch, fingerprint, or classifier exists.
- F green (computed).

**Mutations:** clear the slot only in the starter's continuation; skip the per-caller timer; write
the verdict on an unsettled mint; route the mint through `cachedInstallationToken`; map 403 to a
refused key; log the minted token's length or prefix.

**Under "no" (fork 2 answered no), the task changes as follows:**
- `live=1` is honored only for a signed-in owner (`locals.cairnEditor.capability === 'owner'`);
  any other caller gets the plain report with no network call.
- The template and the showcase gain an owner-only health route under `/admin` (the guard attaches
  the editor only there), at a path the task settles beside the existing admin routes, emitted
  through `npm run emit:template`; `check:template` asserts it. Public `/healthz` keeps the
  no-network self-test and the fingerprint.
- The 60-second verdict cache and the single-flight slot are dropped: an owner-only call needs no
  fleet bound. The 5-second abort, the uncached mint, the classifier, the never-touch-the-cache
  rule, and the fingerprint stay.
- The parallel-calls and dead-slot criteria are replaced by: an anonymous and an editor-capability
  request with `live=1` make no `fetch`, and an owner's does. Their mutations go with them; "admit a
  non-owner" joins the list.
- Task 12's `doctor-drop-github-app` annotation reads "closes through the owner-only live check".

**Notes:** `HealthData` gains optional members; not breaking. Affected 2a page:
rotate-the-github-app-key (its confirming publish and 55-minute wait give way to the fingerprint and
the check). The residual, one mint per isolate per minute summed over the fleet, is Task 12's
sentence on the reference page.

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
  regenerate; routes under `/admin/auth/`; the concept-less tidy and dictionary mount; Turnstile's
  `missing_secret`) and `Consumers may:` lines (the 503; `0001_roles.sql`). `migration-notes.md` and
  `upgrade-cairn.md` carry the same actions.
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
- **Hand-off for pass B (Decision 10):** STATUS's carry-forwards list each affected 2a page with
  the fact ids that changed.
- **The charter phrase** is written into STATUS's open decisions for Geoff's read (Decision 12),
  not into the charter.

**Acceptance:**
- `check:reference`, `check:reference:signatures`, `check:surface`, `check:facts`,
  `check:rulings-format`, and the docs gate green; Vale's error tier clean on every published page
  touched.
- `grep -rn` over `docs/` and `README.md` for each removed option name (`AuthGuardConfig.roles`,
  `AuthGuardConfig.access`, `DevBackendConfig.access`, `DevBackendConfig.roles`,
  `EditorRoutesConfig.roles`) and the old `/admin/auth/` public-prefix wording finds only the
  per-version records and the ledger's dated history.
- Every `Consumers must:` line in the spec's draft that this pass ships appears in `CHANGELOG.md`;
  none of pass B's appears.
- D green.

**Notes:** the published-page edits follow the register's drafting brief with no register review
or polish (the "Edits after the chain" rule); an edit to a page with a brief updates the brief in
the same change.

**Gate:** D.

**S4 boundary:** F, T, and D green on the segment head; `check:close` green; STATUS and a Ledger
entry.

---

## Close

Run `pass-core`'s ritual with the cairn specifics, in order. The conductor stays thin: each step
is a dispatch that returns a structured verdict.

1. **Simplify, once:** `code-simplifier:code-simplifier` over the pass's changed TypeScript,
   JavaScript, Svelte, and Go, then F again if it changed code.
2. **Full gate:** `cairn-run-gate 'npm test'` exits 0, then `cairn-run-gate 'npm run check:close'`
   (0 errors, 0 warnings), then T. If the simplifier changed nothing and HEAD has not moved since
   the S4 boundary, that boundary's run stands and none is repeated.
3. **Consumer proof:** a from-scratch showcase build in the worktree (`rm -rf
   examples/showcase/{node_modules,package-lock.json}`, fresh install, `npm run build`) exits 0,
   plus the CI `e2e` run on the pushed head. Evidence quoted.
4. **Review fan-out, in parallel:** `web-auth-security-reviewer` at `high` (always, for
   `auth-data`), `svelte-reviewer` (EditPage and the load and action code), and
   `cloudflare-workers-reviewer` (the health route, `waitUntil`, D1 writes, the migration), each on
   `claude-opus-5-5`; and one `go-architecture-reader` for `tool/internal/doctor`. Blocking findings
   go through one fix chain under the stop rules above; out-of-scope findings go to the friction
   log.
5. **Live admin smoke** (`auth-data`), per `docs/internal/admin-smoke-test.md`'s local flow, on the
   showcase under `wrangler dev` with the default build (no `VITE_CAIRN_E2E`, no
   `CAIRN_DEV_BACKEND` anywhere, checked first), on a port from an environment variable with
   `--var PUBLIC_ORIGIN:http://localhost:$PORT`, and a local `AUTH_DB` migrated through 0001 and
   seeded with an owner and a custom-role editor:
   - the magic-link round trip driven in headless Chromium (Decision 14): `/admin/auth/confirm`
     loads with no session, and `/admin/auth/request` with no session redirects to the login;
   - a custom-role roster add succeeds after 0001 and, on a second local D1 without 0001, logs the
     named condition;
   - an editor refused by an adapter-declared rule on a custom screen, and the sidebar hiding it;
   - `/healthz` answers 503 with the keyless env, and `/healthz?live=1` reports the signing
     failure without a network call (no key to sign with).
   Evidence: the commands, status codes, and the matching log lines quoted.
6. **Live key probe** (Task 6's ruling): a scratch script under `$HOME/.cache/engine-pre-2b-a/`
   that sources `~/.local/secrets` itself and runs the live check against the real App
   (`GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`, `GITHUB_APP_PRIVATE_KEY_B64`, by name only)
   reports `ok`, and with a freshly generated wrong key reports a refused key. The fingerprint it
   reports for the real key is quoted; no token, JWT, or key byte is printed. Under fork 2's "no",
   the probe runs the owner-gated path.
7. **Docs check:** Task 12's pages re-read against any close-time fix; `check:surface -- --update`
   re-run if a fix moved a typed export.
8. **Friction triage** (Decision 11): every friction-log entry for a pass A fix is deleted after a
   check against the code; every declined or batched entry leaves for its ledger entry or ROADMAP
   row; new friction the pass met is filed. The HISTORY entry counts entries and outcomes.
9. **Ledgers:** `docs/STATUS.md` rewritten present tense (≤60 lines): pass A closed unreleased,
   pass B next, the hand-off list (Decision 10), the charter phrase for Geoff's read, and fork 1
   for pass B. `docs/HISTORY.md` takes the pass entry: what landed, what the gates caught, what a
   later pass would be wrong to rediscover, and whether any refused fold finding (the six standing
   refusals) turned out real. This plan takes its post-mortem with the budget score: tokens against
   11.0M via `/cost`, planning misses, and execution sittings.
10. **Merge:** the PR leaves draft once CI is green; the merge to `main` waits for Geoff's go,
    batched with the charter phrase and any open fork. No version bump, no tag, no publish.
11. **Pre-bake and hand off:** plan, STATUS, and ROADMAP committed; tree clean; the resume prompt
    names pass B's plan as the next action.

## Ledger

(Checkpoint entries go here: date, segment, task statuses, decisions taken, spend, next task.)
