# cairn-cms status

The rolling status for the cairn-cms engine: where the work is now, what is next, and the open
decisions. The `cairn-pass` skill reads this at pass-start and updates it at pass-end. Durable
orientation is this repo's `CLAUDE.md`; locked architecture decisions live in the functional spec
(`docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`). Everything past tense,
including every prior pass's detail, lives in [`docs/HISTORY.md`](HISTORY.md); this file carries
only the present.

## Current state

Published version: **`0.96.0`** (2026-08-22, the floors release), on npm `latest` for both
`@glw907/cairn-cms` and `@glw907/cairn-cms-dev`, with provenance attested. `main` carries ELEVEN
passes unpublished under `## Unreleased`: toolkit-seams, harvest-detection, csrf-hardening
(slice 1), foundations A (2a), foundations B (2b), retires (3), conventions (4a, PR #43),
conformance (4b, PR #46), internals (5, PR #47), internals-B (6, PR #48), and internals-C (7, merged 2026-09-05 at
`3e4ba6eb`, PR #49, CI green); the window holds until the polish slice per the amended
initiative design. CI on `main` is fully green.

## Immediate next action

**Chassis-A (audit-remediation slice 8, structural) is EXECUTING**: Tasks 3 to 12 run as
workflow `wf_855c925b-ae2` (session 9215acac, launched 2026-09-07 about 16:00 AKDT, one chain,
branch `chassis-a` in `.claude/worktrees/chassis-a`). Tasks 1 and 2 are accepted (`e2aceffe`,
`8fecf730`) and the Task 1 remedy landed as `de93536c` (a `// prettier-ignore` line pinning the
one-line `githubApp({...})` literal that `packages/create-cairn-site/src/github/finalize.mjs`
matches byte-for-byte; diff-reviewer accepted; CLI suite 806/806). Every remaining task's gate
carries `npm --prefix packages/create-cairn-site run prepack && npm --prefix
packages/create-cairn-site test`; the args file shape is in the plan's Execution section.

**Task 8 ruling (2026-09-07, about 19:45 AKDT):** Tasks 3 to 7 accepted and committed
(`c2290d69`, `b126d892`, `274374f2`, `615d4d1f`, `6c16334c`). Task 8's implementer returned
gate-red and uncommitted (25 files): inlining `cardShell` moved the literals `card-body` and
`card-title` from the unscanned npm package into scanned showcase source, so Tailwind generates
DaisyUI's card rules into the public CSS and every alert directive grows about 26 px (HTML
byte-identical). Ruling: DaisyUI `card` stays enabled (the members pages use it); the inlined
alert's two inner classes are renamed `cairn-alert-body`/`cairn-alert-title` with the prose.css
selectors and the render.md registry following, paint proven identical by every baseline
unchanged; the `Consumers must:` line carries the rename and its scan reason (ecxc-ski and
xcathletes-org import `cardShell` today). The diff-reviewer on Task 8 ran an obfuscation
experiment on the tree (`['card' + '-body']`) that the fix-round implementer reverts first.
Relaunch Tasks 8 to 12 as a fresh `pass-execute-chains` run from the args at the session
scratchpad's `chassis-a-args-8to12.json` (the Task 8 notes carry the ruling verbatim) once the
halted run `wf_855c925b-ae2` reports. DONE: relaunched as run `wf_5ac6ef7f-5a7` (session
9215acac, 2026-09-07 about 20:00 AKDT); the first run spent 1.23M subagent tokens over Tasks 3
to 8, and the escalate also found the emitted `render.ts` hand-edited (the fix round re-emits).
Run `wf_5ac6ef7f-5a7` landed Task 8 as `8fc1343d` (every gate green, no baseline moved) and
escalated on the changelog inventory (three `cardShell` importers, not two; `headRow` in two
sites) and on the generic `headRow` stamping an alert-named class; fix round dispatched about
20:50 with the rulings (inventory corrected, `cairn-head-title`, the chassis classes out of the
engine registry, the worked example off DaisyUI names, one e2e assertion). Tasks 9 to 12 relaunch
from the scratchpad's `args9.min.json` after the fix round is reviewed. DONE: Task 8 accepted
at `33340c67` (three commits: `8fc1343d` the landing, `017a9a1e` the naming and registry fixes,
`d9322615` and `33340c67` the inventory and e2e); Tasks 9 to 12 launched as run
`wf_bd778850-d87` about 21:40 AKDT. Spend on chassis-A's execution so far: about 1.9M
subagent tokens.

When the workflow reports: read the per-task records, decide any needs-decision or escalate,
check the five bare `$theme/cairn.config` specifiers Task 10's grep cannot match
(`(site)/+page.server.ts`, `feed.xml/+server.ts`, `feed.json/+server.ts`,
`(site)/[...path=md]/+server.ts`, `(site)/styleguide/+page.server.ts`; a survivor is a fix
commit in the ritual), then the full pass-end ritual (`cairn-pass`: simplifier, the six CI-only gates by name plus
`check:idioms` and `check:cm-internals`, the reviewer fan-out the plan names, from-scratch
showcase install and e2e, a fresh scaffold built and unit-tested, whole-log friction triage,
STATUS/HISTORY/ROADMAP, post-mortem, both budgets scored), push, PR, merge on green CI.
Approval and git authorization stand as recorded (Geoff, 2026-09-04: push, PR, merge on green
CI). Guards armed 2026-09-07 with the session: both sleep inhibitors and the battery watchdog
to 09:00 on 2026-09-08, the runaway guard on the workflow's transcript dir. A resumed cold
session re-arms the FULL set (`~/.claude/docs/unattended-work-guards.md`) and, if the
workflow is dead, relaunches Tasks not yet accepted as a FRESH `pass-execute-chains` run
(`resumeFromRunId` only works in the launching session); check `git log` on the branch for
what landed. Two concurrent full gates is the machine's ceiling. Never let two writers share
one worktree. On any blocker, stop, WIP-commit, write STATUS with the resume state.

Resume prompt: "In ~/Projects/cairn-cms, invoke cairn-pass and resume the chassis-A pass
(docs/superpowers/plans/2026-09-04-chassis-a-pass.md) per STATUS: check which of Tasks 3 to 12
landed on branch chassis-a, relaunch the rest as a fresh pass-execute-chains workflow with the
CLI test suite in the gate, then the full pass-end ritual, push, PR, merge on green CI. Then
author and execute chassis-B."

**Overnight organization (Geoff, 2026-09-07, about 22:20 AKDT):** B2 STACKS on B1's branch
(worktree `chassis-b2` off `chassis-b`, not off `main`), so both PRs wait for one sitting of
Geoff's five-viewport read. The **identity-seam pass** runs in its own worktree off `main` in
PARALLEL with B1 (engine and extend docs versus showcase; two gates is the machine's ceiling),
with authorship AND execution granted and its merge gate ruled: green CI plus the
`web-auth-security-reviewer`'s accept plus the docs gates, Geoff reading the extend page after
the fact. Brainstorm settled 2026-09-07: the target is Google Workspace and Microsoft 365 for
nonprofits, met THROUGH CLOUDFLARE ACCESS (Access in front of `/admin` with the org's IdP; cairn
ships one built-in resolver verifying the Access JWT header plus the generic resolver seam; no
OIDC client in cairn); working assumptions stated and unobjected: the roster stays the
authorization source (Access proves the email, the roster assigns owner or editor), a configured
resolver turns magic-link off for that site (one identity path per admin), and the shell's logout
hands off to Access's logout URL. Spec and plan authored tonight with the four-lens review in
place of Geoff's read; merge order at the end: A, then B1 and B2 after Geoff's read, then the
identity seam on its own gate.

**Chassis-B execution GRANTED (Geoff, 2026-09-07):** once the four-lens review is folded
into the plan, run chassis-B as a `pass-execute-chains` workflow through its pass-end ritual to
a green PR with the captures and the visual-verifier verdict banked; the merge stays Geoff's.
If the fold splits B into two passes, both halves run under this grant. B starts after
chassis-A's ritual, PR, and merge.

**Chassis-B plan FOLDED and SPLIT** (2026-09-07): the four-lens adversarial review (record
`docs/internal/record/2026-09-04-chassis-inputs/chassis-b-plan-review.md`, fold brief
`chassis-b-fold-brief.md`, 89 corrections) split the pass at the adoption/corpus boundary into
**B1** `docs/superpowers/plans/2026-09-07-chassis-b1-pass.md` (matrix, shell, primitives, focus
ring, entry row; 6M) and **B2** `docs/superpowers/plans/2026-09-07-chassis-b2-pass.md` (corpus,
archive, identity, footer nav, CSS, idioms, rebake; 6M), both under the execution grant. Rulings
taken in the fold: the `createSectionAction` adoption deferred to polish (the showcase has no
access map and the dev handle attaches none); the thirteen posts excluded from the scaffold by
path; the members adoption and the alignment spec cut; the width matrix moved to B1's Task 2;
`.cairn-card` proven on the styleguide only. Before B1's first dispatch: re-verify anchors
against post-A `main` (each plan's Reconciliation block) and assemble the chain's `criteria`
strings with the paint protocol verbatim. The committed intended-moves manifest
(`chassis-b-intended-moves.md`) is the recovery artifact for a cold resume mid-pass.

**After chassis-A: chassis-B, plan authorship AND execution granted (Geoff, 2026-09-05).**
Author its plan from the spec's Chassis-B section with the three-lens adversarial plan review
in place of Geoff's read; two taste calls are settled: the thirteen new posts are REAL short
posts (150 to 300 words, the existing trail-notes voice, through the site content method),
and the merge gate STAYS (run to a green PR with the before/after captures and the
visual-verifier verdict banked; Geoff merges after his five-viewport read). Then B2, then the **identity
seam** pass (Geoff, 2026-09-07: before polish so polish's family and docs reads see it;
brainstorm and spec first; ROADMAP's audit-remediation entry carries the shape), then polish
(not granted), then ONE release cut. The Go `cairn` tool Pass A is deferred "until later" (Geoff,
2026-09-05).

**Geoff's parallel action: update the four consumer sites onto `0.96.0`.** Each site's sheet is
committed at `docs/2026-08-22-cairn-0.96-update-instructions.md`; a 2026-08-29 survey confirmed
no consumer repo is ahead of origin, so the sheets are pushed. 907-life is eleven releases
behind and its sheet says to run it as a numbered site pass.

## Parallel tracks

- **Audit remediation (ROADMAP Now).** Slices 1, 2a, 2b, 3, 4a, 4b, 5 (internals), and 6
  (internals-B), and 7 (internals-C) MERGED. Next: chassis-A (immediate next action above),
  chassis-B, then the final **polish** slice (Geoff, 2026-09-01: a full-surface
  cleanliness-and-beauty sweep, reading the exports as a family, the docs cover to cover,
  and the rendered admin against the design system; it also carries the OfficeList
  outright-retire question ruling-first, the `aria-disabled`-versus-native-`disabled`
  busy-idiom ruling, and the items ROADMAP's polish sub-bullet lists); ONE release cut
  after polish. `content-routes-media.ts` at 1,447 lines is the one file left from the
  audit's monolith list; ROADMAP's audit-remediation entry is the canonical routing
  record. Standing chassis mandate (Geoff, 2026-09-01): the chassis is the most
  developer-visible part of cairn and SETS the code bar, so its quality bar equals the
  engine's; the chassis plan opens with a fresh showcase review at the exemplar bar and
  treats the ROADMAP's older 14-finding list as input, never the ceiling; chassis precedes
  polish because polish's cover-to-cover docs read must see the chassis that teaches the
  surface.
- **The cairn case (front-door argument).** `docs/internal/record/2026-09-04-the-cairn-case.md`
  is FROZEN at revision 12 (`dcb11bd3`, 2026-09-05; six graded rounds to B+, two fresh-context
  verification reads, 354 notes). Inputs, reviews, and the three-round measured build are banked
  in `docs/internal/record/2026-09-04-cairn-case/` (`experiment-screen` never merges). Waiting
  for Geoff's read, all UNCOMMITTED: the first-person front-door proposal
  `25-front-door-proposal.md` (a why-cairn.md replacement at 1,619 words, register grade B+, cut
  list in its Section C.5, plus the README and cairn.pub forms); the two figures under
  `docs/extend/assets/` with source `docs/internal/site-figures.svg`, emitter `scripts/figures/`,
  and a `check:figures` line in `package.json` and `test.yml`, re-derived from the frozen case
  (review page: artifact bfe5eef9). Post-freeze notes that would reopen the case are in
  `26-post-freeze-notes.md`. Landing path: a docs task in polish (or a small docs-only pass) once
  Geoff rules on the page, its length, and the figures.
- **Go `cairn` tool, Pass A.** Ready to execute; plan at
  `docs/superpowers/plans/2026-08-20-cairn-tool-spine-and-hud.md`. Independent of the engine
  window.
- **`cairn-pub`, branch `pass-d-docs-tracks`.** Un-pinnable against the registry since
  `0.95.0`; the editors rewrite queues behind Geoff's site updates.
- **Engine-consultation protocol live** (details in HISTORY, 2026-08-26). The first live
  consultation appends a short post-mortem to the ledger.

## Open decisions

- Node 26 becomes the floor at beta only if it is Active LTS by then (it is Current until
  October 2026).
- TypeScript 7 stays held until `svelte-check --tsgo` runs green; `tsgo.yml` runs that check
  weekly, not per push.

## Active watches

- A monthly Cloudflare capability-review routine (`trig_01GnFPkfx7EjrWKAuTBrXVdx`) reads
  `ROADMAP.md`'s "Platform watch: Cloudflare" section and emails a ranked report.
- `packages/create-cairn-site/src/github/install.test.mjs` ("the concurrent installation poll
  logs a periodic waiting line"): flaked once in a 30x local loop (2026-08-29). Trigger: its
  next CI failure gets the same mock-timer deflake the server grace-window tests received.
- Post-deploy CSRF: a consumer `guard.rejected` record with `detail: 'mismatch'`,
  `witness: 'field'` can be the known double-mint residual (friction-log WATCH entry), not a
  new mechanism; the discriminator now names any genuinely new one.
- Three ASC staging harvest docs (events-admin, events-redesign, assets-register) are folded
  into cairn and slated for deletion in the ASC repo. Trigger: the ASC `email-announce` branch
  settles.

Everything else, every prior pass, release, and archived checkpoint, is in
[`docs/HISTORY.md`](HISTORY.md).
