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
`3e4ba6eb`, PR #49, CI green); the window holds until the polish slice per the initiative
design's amended item 6 and publish ruling (one cut after polish; the chassis work is three
passes, A, B1, B2). CI on `main` is fully green.

## Immediate next action

**Chassis-A (audit-remediation slice 8, structural) is EXECUTING**: Tasks 3 to 12 run as
workflow `wf_855c925b-ae2` (session 9215acac, launched 2026-09-07 about 16:00 AKDT, one chain,
branch `chassis-a` in `.claude/worktrees/chassis-a`). Tasks 1 and 2 are accepted (`e2aceffe`,
`8fecf730`) and the Task 1 remedy landed as `de93536c` (a `// prettier-ignore` line pinning the
one-line `githubApp({...})` literal that `packages/create-cairn-site/src/github/finalize.mjs`
matches byte-for-byte; diff-reviewer accepted; CLI suite 806/806). Every remaining task's gate
carries `npm --prefix packages/create-cairn-site run prepack && npm --prefix
packages/create-cairn-site test`; the args file shape is in the plan's Execution section.

**Chassis-A: RITUAL COMPLETE, PR #50 OPEN (2026-09-08 about 03:40 AKDT), merges on green CI**
(authorized). Simplifier `fa98c613`, fix round `ea39654f`, post-mortem and HISTORY `3c227a1d`;
eighteen gates, the from-scratch showcase e2e (156, no baseline moved), a fresh scaffold against
the packed engine, and four ship-it reviews. After the merge: STATUS and memory on `main`, then
B1's worktree off post-A `main`, its Reconciliation block, and its launch. Earlier ritual note: on `chassis-a`: Task 12 landed `e02c0525` plus `950290c8`; `main` merged into the
branch with two docs conflicts (ROADMAP, friction log) resolved by dispatch; next the
code-simplifier over the pass diff, the reviewer fan-out the plan names, the gates by name, the
from-scratch showcase and fresh-scaffold proofs, HISTORY/STATUS/ROADMAP, the post-mortem, push,
PR, merge on green CI (authorized). Ritual calls carried from the Task 12 review: the ROADMAP
rehype-dispatch CLOSED block moves to the post-mortem and leaves the tier; the identity-seam
finding duplicated in the friction log and ROADMAP is the identity pass's Task 6 to triage.

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
`wf_bd778850-d87` about 21:40 AKDT. That run (ended 2026-09-08 about 00:20) accepted Task 9
(`ee29cecf`), Task 10 after one fix (`ae71d945`, `25dbcaca`), and halted Task 11 on a second `fix`
(`c88e18d3`, `91f65e77`; two history-narration comments left); conductor ruling: one more fix
dispatch (landed `6eb07602`, Task 11 closed), then Task 12 as its own run: launched as
`wf_99383a26-bd8` 2026-09-08 about 00:35 AKDT, carrying the `hastscript` manifest fix. Ritual items
carried from the reviews: declare `hastscript` in the showcase and template manifests (the
re-homed `render.ts` and its test import it, resolving only by hoisting); the `.js` specifier
check is closed (Task 10 covered the five `$theme/cairn.config` sites). Spend on chassis-A's execution so far: about 1.9M
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
hands off to Access's logout URL. Spec and plan EACH get a strong adversarial review, folded in before the next
step (Geoff, 2026-09-07: "I'm leaving judgement to you. Consider cairn philosophy and
precedent when making decisions": the charter's leanness test and the rulings ledger govern
every call); merge order at the end: A, then B1 and B2 after Geoff's read, then the
identity seam on its own gate.

**Pictures initiative (Geoff, 2026-09-07 late; PAUSED for his morning read).** Two designs,
brainstormed and settled on the modern-convention research (record to be banked under
`docs/internal/record/2026-09-08-pictures/`): (A) a ROW of two or three pictures inside the
engine's reserved `figure` directive, equal heights, ONE shared caption (Geoff's call), stacking
below 768, authored by wrapping consecutive pictures with the existing figure button; (B) a post
GALLERY rendered from the showcase's existing `gallery` field with a caption per picture and a
site-island viewer that cycles the set, working without scripting as links. Both after B2 as one
pictures pass, engine half first. DONE overnight: spec revision 2 at
`docs/superpowers/specs/2026-09-08-pictures-design.md`, folded from a three-lens review (record
`docs/internal/record/2026-09-08-pictures/`), now TWO passes (the row, seven tasks; the gallery,
five) with SIX taste calls parked in its last section for Geoff (the row's height rule, the
stacking rule, the `sizes` posture, swipe, grid captions, the dialog as a chassis primitive).
NO plan and NO execution until Geoff reads the spec and rules on the six.

**Identity seam: Tasks 1 and 2 ACCEPTED** (`b44aee8b`; `bd9c2fc8` and `d6388333`), run
`wf_b310f457-1bf` halted on Task 2's escalate (the resolver's `displayName` TSDoc claimed a
store bound that does not exist); conductor ruling 2026-09-08 about 02:30: cap at 120
characters (the media routes' display-name bound) in the guard with a test, fix landed `0b99192a`; Tasks
3 to 6 relaunched as run `wf_774752b5-aba` (2026-09-08 about 02:45 AKDT). Implementer
decisions accepted: both conditions render 403; a malformed `ok: true` identity logs `invalid`
at `warn`; an unlisted refusal word defaults to `warn`.

**Identity seam EXECUTING** (launched 2026-09-08 about 00:10 AKDT as run `wf_b310f457-1bf`,
session 9215acac, worktree `.claude/worktrees/identity-seam` off `main` at `f7daa6cb`, seven
tasks at 5.5M, in parallel with chassis-A's last tasks). Spec revision 3 (`79261f74`) and plan
revision 2 (`f7daa6cb`) are the folded artifacts; the four-lens plan review, its fold brief,
and the spec review are banked under `docs/internal/record/2026-09-07-identity-seam/`. Task 5a
reports `REVIEW ROUNDS PENDING`; the conductor then dispatches the `prose-voice-reviewer` and
the `web-auth-security-reviewer` (its accept is blocking) before Task 5b. Merge gate as ruled.
A cold resume checks `git log` on `identity-seam` and relaunches the tasks not yet accepted as a
fresh run from the scratchpad's `identity-args.json` shape.

**Identity seam, earlier state (2026-09-07 about 23:30 AKDT):** spec at
`docs/superpowers/specs/2026-09-07-identity-seam-design.md` revision 2 (`de2bf1cb`), folded from
a three-lens review; plan drafted at `docs/superpowers/plans/2026-09-07-identity-seam-pass.md`
(`b58b5d2e`, 6 tasks, 4.5M); its four-lens review (grounding, security, hygiene, charter) is
RUNNING and folds before the first dispatch. Fold rulings on the spec: the generic seam ships,
the Access verifier is a snippet-gated recipe (the `isuniqueviolation-cloudflare` precedent),
no guard-side bootstrap, no CSRF change, one config point read through `locals.cairnIdentity`,
the doctor probe inverted. Worktree `.claude/worktrees/identity-seam` off `main`, launched after
the fold, in parallel with B1.

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
