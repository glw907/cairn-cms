# Capture Pass Implementation Plan (create-cairn-site fixtures, transcript pages, transcript gate)

> **For agentic workers:** Part A is an attended live run executed in the main loop of the
> execution session (real Cloudflare resources, Geoff's browser moments); do NOT dispatch it.
> Part B executes task-by-task via `cairn-implementer` per the `cairn-pass` skill, the main
> loop reviewing each diff and verifying the full gate between dispatches. Steps use checkbox
> (`- [ ]`) syntax for tracking.

**Goal:** Bank real recorded-run fixtures (a fresh end-to-end `create-cairn-site` run plus
`cairn-doctor` reports against the deployed result), then rewrite `create-your-site.md` and
`is-it-working.md` against them and build the transcript CI gate Pass D promised.

**Architecture:** Two parts, one pass. Part A runs the in-tree tool live against a scratch
site on the glw907 Cloudflare account, workers.dev only, capturing every invocation verbatim
through a pty, one file per invocation; the raw captures are committed as fixture files, the
source of truth the docs quote. Part B rewrites the two waiting admin pages against the
fixtures and wires a gate that compares every quoted docs block against its named fixture
through a tested render layer, proven red per failure mode. The standing rule throughout:
**no invented output, ever; a transcript is real stdout or it does not ship.** The companion
rule this plan adds: **a fixture is never edited; the gate normalizes, the run re-captures.**

**Spec:** `docs/internal/record/2026-08-15-capture-pass-brief.md` (the runbook brief).
Supporting: the per-page contracts in
`docs/internal/record/2026-08-15-docs-outlines-with-visuals.md` (as amended by the
visual-layer rulings), and the ROADMAP transcript-gate entry. This plan was adversarially
reviewed 2026-08-16 (three Opus lenses: run protocol, gate design, brief coverage); every
finding is folded below or recorded as refused with its reason.

## The registry blocker and its resolution (settles review F1/F2)

A scaffolded site cannot build today: the baked template's engine spec resolves on the
registry to `0.94.0`, which does not export `previewLoad`/`PreviewBanner` (imports the
template carries), and `@glw907/cairn-cms-dev` has never published at all (404), so the
scaffold's `npm install` fails. This is the live T5a finding
(`docs/internal/record/2026-08-13-t5-task8-live-e2e.md`); T5's vendored-tarball workaround
would make the fixture depict a run no reader ever gets, violating the keystone rule.

**Resolution (Geoff, 2026-08-16): publish the unblock prerelease, then capture.** Before
Part A, Task A0b cuts a `--tag next` prerelease of the current engine window (which carries
`previewLoad`/`PreviewBanner`) plus the first `@glw907/cairn-cms-dev` publish, via the
`cairn-release` skill. `latest` never moves, no consumer caret resolves a prerelease, and
release one stays where the 2026-08-15 sequencing put it (after the visual layer). The
capture then bakes the template against the prerelease specs and runs the in-tree tool at
the same commit, installing from the registry exactly as the scaffold's specs dictate.
`packages/create-cairn-site/template/` is absent from the tree (gitignored, created by
`prepack`) and the bake refuses default specs while the dev backend sits at `0.0.0`, so Task
A1's bake step passes the prerelease specs explicitly; a caret anchored at a prerelease
(`^<x.y.z>-rc.1`) resolves that prerelease, unlike a caret on a stable number. The fixtures
README records both published versions, the bake command, and the tool commit.

## Rulings this plan settles (do not reopen)

- **Redaction: verbatim everywhere (Geoff, 2026-08-16), with its justification stated
  honestly.** Committed fixtures and published excerpts both carry raw captured output. The
  torn-down identifiers (worker, D1 ids, App slug, repo) die with teardown; the account id,
  the workers.dev subdomain, the GitHub owner name, and the sign-in address are permanent and
  knowingly published. Secrets are not identifiers: the sweep in Task A5 refuses any capture
  carrying one, and no token is ever typed inline on a captured command line (credentials are
  exported in a separate, uncaptured shell step).
- **Fixture home:** `packages/create-cairn-site/test/fixtures/transcripts/`. Honest
  rationale: the fixtures are the tool's own output, so they live with the tool; the gate
  that reads them is repo-root (`scripts/checks/transcript-blocks.mjs`). The package `files`
  whitelist (`bin.mjs`, `src`, `template`, `README.md`) excludes `test/`, and the package
  test glob (`test/*.test.mjs`) never descends into `fixtures/`.
- **Capture method: pty, always.** `script -q` (no banner) with the terminal width pinned to
  100 columns, recorded in the README. A pty is what a real reader has: the sign-in link
  prints (it is withheld on non-TTY output by design, `src/github/open.mjs:65`), the clack
  prompts render, and the hold loop behaves as documented. The cost, ANSI/cursor control in
  the raw bytes, is paid in the gate's render layer, never by editing a fixture.
- **The captured sign-in token is superseded, not scrubbed.** The pty capture records the
  final magic-link URL with its one-time token. After the capture, run the tool's `--sign-in`
  once more (uncaptured) so the committed token is superseded before push; the ten-minute
  expiry and the site's teardown close the rest. The token line is never part of a marked
  block. The README records this supersede step.
- **Tool freeze verified (2026-08-16):** tool tree clean on `main`; last change the scaffold
  `.gitignore` fix. The chapter-2 DMARC copy is unreachable on this path (prints past the
  declined domain admission); the doctor's `config.site-config` skip is a documented known
  exception. Either fixed later turns the gate red and re-captures the affected block; that
  is the gate working. The engine side of the freeze is the prerelease cut itself: the
  scaffold installs the published rc, so later engine commits cannot drift the fixtures.
- **Queue note for cold sessions:** Geoff's 2026-08-16 call runs this pass (prerelease cut
  included) ahead of seam Pass 1. Task A0 points STATUS's immediate next action here; Task
  B4 restores seam Pass 1.

## The marker convention (locked; pages write it, the gate enforces it)

- Each quoted transcript block is immediately preceded by an HTML comment
  `<!-- transcript: packages/create-cairn-site/test/fixtures/transcripts/<file> -->`, the
  path relative to the repo root and resolving under that directory.
- One marker, one fixture, one fenced block. A block needing two sources is two blocks. A
  marker not immediately followed by a fence fails (the orphan a page edit leaves behind);
  two markers before one fence fails.
- A marked block contains fixture bytes only, in the gate's rendered form. The typed
  invocation a reader enters lives in its own separate, unmarked fence (the existing page
  shape), rendered as the post-release `npx create-cairn-site` command.
- Marked fences are untagged or tagged `text`, never `console` or a shell language:
  `check:symbols` runs its CLI-flag extraction on shell-tagged fences, and a fixture can
  never be edited to satisfy it. Residual symbol findings (env var names, paths) get
  allowlist entries under a `transcript:` reason class, each naming the fixture line it
  quotes.
- Elision: a line that is exactly `[...]` splits a block into ordered segments; each segment
  must appear in the fixture, segment k+1 starting after segment k ends (order-preserving,
  non-overlapping).

## Global constraints

- workers.dev only. This is not a flag: the tool always enters the domain admission, and the
  workers.dev outcome is answering **No** to "Connect a domain you own to this site now?".
  No token paste, no Workers Paid prompt, no zone, no chapter 3 on this path. `--yes` is not
  an option for this capture (it changes every prompt).
- Capture full stdout/stderr of every invocation, one `script -q` file per invocation,
  width-pinned, unedited. Expect one main invocation; pre-register `01b-` naming in case a
  park fires (choosing the personal account at the org select avoids the one reachable park).
- Environment is part of what a transcript means; the README records it per invocation. The
  scaffold run (A2) runs under `env -u CLOUDFLARE_API_TOKEN`, wrangler logged out, and the
  T5 no-fake preflight clean: `CAIRN_GITHUB_API_BASE`, `CAIRN_GITHUB_WEB_BASE`,
  `CAIRN_CLOUDFLARE_API_BASE`, `CAIRN_CF_API_TOKEN`, `CAIRN_STATE_DIR`, `CAIRN_NPM_BIN`,
  `CAIRN_WRANGLER_BIN`, `HTTPS_PROXY` all unset. The credentialed doctor run (A3) exports
  `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in an uncaptured step first.
- Teardown ledger entries are committed and pushed AS APPENDED, each in its own moment, not
  batched to pass end. A5 carries fixtures only.
- Scratch estate naming: site name `cairn-capture-scratch` (also the App name stem, so the
  hand-delete ledger stays legible), working directory
  `~/Projects/cairn-scratch/2026-08-16-capture/`. Teardown table precedent:
  `docs/internal/record/2026-08-12-t4c-builds-spike.md`.

---

## Part A: the attended capture run (main loop, Geoff attended)

### Task A0: commit this plan and repoint STATUS (before anything runs)

**Files:** Create: `docs/superpowers/plans/2026-08-16-capture-pass.md`. Modify:
`docs/STATUS.md`.

- [ ] Commit this plan into the repo. Rewrite STATUS's immediate-next-action to name this
  plan, its path, and the method, stating explicitly that Geoff's 2026-08-16 call moved the
  capture pass ahead of seam Pass 1 (whose launch prompt stays in the queue paragraph,
  restored as next by B4). Run `npm run check:docs`; commit and push.
- [ ] Why first: this initiative has already lost one capture run to a power cut mid-flight.
  A crash between A2 and A5 must leave a cold session reading a STATUS that points here, not
  at the seam plan.

### Task A0b: the unblock prerelease (via `cairn-release`)

**Files:** none in this plan's scope; the release skill owns its own mechanics and records.

- [ ] Invoke the **`cairn-release`** skill for a deliberate `--tag next` prerelease cut of
  the current engine window, plus the first-ever `@glw907/cairn-cms-dev` publish. Constraints
  the skill's gate must honor here: numbers verified free at the cut
  (`npm view @glw907/cairn-cms versions --json`; derive, never pre-number), `--tag next` on
  BOTH publishes (npm defaults to `latest` regardless — the standing memory), and `latest`
  untouched.
- [ ] The dev backend has never published: verify its Trusted Publishing / OIDC setup before
  the cut; a first-ever publish of a new package may need the one-time token path. Record
  what was needed.
- [ ] Acceptance: `npm view` shows both prerelease versions under the `next` dist-tag;
  `npm view @glw907/cairn-cms@<rc> --json` confirms the tarball is the current window (spot
  check: `previewLoad` present); `latest` still points at `0.94.0`.

### Task A1: preflight, bake, and capture harness

**Files:** none in-repo (scratch dir only; the bake writes the gitignored `template/`).

- [ ] One-executor check; `git status` clean; `main` == `origin/main`.
- [ ] Re-confirm the tool freeze: `git status --porcelain packages/create-cairn-site` empty.
- [ ] Bake the template with explicit specs per the F1 resolution:
  `node scripts/bake-template.mjs --to template --engine-spec <spec> --dev-spec <spec>` from
  `packages/create-cairn-site`. Record the exact command in the fixtures README draft.
- [ ] Environment preflight per Global constraints: the no-fake list unset, `wrangler whoami`
  reporting not-authenticated, `env -u CLOUDFLARE_API_TOKEN` wrapper ready. Node >= 22.
- [ ] Create `~/Projects/cairn-scratch/2026-08-16-capture/`. Harness: `script -q` per
  invocation, `stty cols 100` (record the value). File naming: `01-create-cairn-site.txt`,
  `02-doctor-bare.txt`, `03-doctor-credentialed.txt`, `04-resume.txt` (only if captured),
  `01b-` reserved for a park resume.

### Task A2: the scaffold run

- [ ] Run `node <repo>/packages/create-cairn-site/bin.mjs` from the scratch directory under
  the harness. Interactive answers: personal account at the location select; **No** at the
  domain admission; the site prompts (name, description, brand color, directory) answered
  with the scratch identity. Geoff's browser moments, four: GitHub App creation, App
  install/authorize, the Cloudflare OAuth sign-in (present because the run deliberately
  starts token-less), and the final admin sign-in confirm click on the deployed site.
- [ ] As each real resource is created (App, repo, worker, two D1 databases, R2 bucket, any
  minted token), append its teardown line to the STATUS hand-steps ledger and commit-push
  that append in the moment. The App line notes it is the THIRD App awaiting hand-deletion.
- [ ] Acceptance: the run reaches `printLiveInfo` (the workers.dev live summary); the capture
  file holds the whole session; the deployed workers.dev site responds; the sign-in link was
  followed and the admin loads.

### Task A3: the doctor reports (before any teardown)

Two reports, defined by environment, not by health; no induced failure is needed. The
scaffold ships the placeholder from-address `cms@showcase.test` (the domain chapter never
personalizes it on this path), so a credentialed doctor honestly FAILS the zone-derived
checks for free, alongside real passes and the structural skips.

- [ ] Verify `npx cairn-doctor` resolves in the scaffolded site (the engine dependency
  provides the bin) before capturing anything.
- [ ] Report 1 (`02-doctor-bare.txt`): bare `npx cairn-doctor`, no Cloudflare credentials.
  The reader's default experience: passes plus credential and structural skips.
- [ ] Report 2 (`03-doctor-credentialed.txt`): export `CLOUDFLARE_API_TOKEN` (the
  read-scoped token `is-it-working.md` describes: Zone + Email Sending + D1; mint it, ledger
  it at mint) and `CLOUDFLARE_ACCOUNT_ID` in an uncaptured step, then run. Expected: pass,
  fail, and skip lines together in one report (the per-page contract requires all three in
  one block): honest FAILs from the placeholder from-address (no zone), passes elsewhere,
  and the structural skips (`AUTH_DB` database_id stripped on every scaffold, `github.app`
  without the env trio, `config.site-config`).
- [ ] Fallbacks if report 2's shape surprises: `--probe <wrong-url>` (credential-free single
  FAIL) or flipping `observability.enabled` false in the scratch `wrangler.jsonc`. Record
  whichever path produced the committed report in the README. `--send-test` only as an
  explicitly labeled third capture if wanted; never the primary.
- [ ] Acceptance: report 2 shows all three line types together; nothing edited.

### Task A4: interrupt-and-resume (optional, cheap-only)

- [ ] If captured at all: the one safe cheap point is immediately after the scaffold hop, at
  the "Create the GitHub App and repository now?" confirm (state `scaffolded`, no cloud or
  GitHub resource yet); Ctrl-C there takes the graceful cancel path. Resume requires
  `--dir <dir>` (without it the tool scaffolds fresh); capture the resume invocation as
  `04-resume.txt`. Never interrupt during the App manifest exchange (orphans a
  globally-unique App name). Do not extend the run just for this; skip freely.
- [ ] Disposition if captured: the fixture is deliberately unconsumed (`setup-recovery.md`
  is a ruled no-visual page). The README labels it so, and B4 files a one-line ROADMAP entry
  naming the fixture and the trigger that would consume it.

### Task A5: sweep, then commit the fixtures

**Files:**
- Create: `packages/create-cairn-site/test/fixtures/transcripts/<capture files>`
- Create: `packages/create-cairn-site/test/fixtures/transcripts/README.md`

- [ ] The secret sweep, mandatory, before any copy-in: grep every capture for `-----BEGIN`,
  `CLOUDFLARE_API_TOKEN=`, `Bearer `, `ghp_`, `github_pat_`, `ghs_`, `?token=`, and a
  40-hex-run pattern; plus a name-only comparison against the secret names in
  `~/.local/secrets`. A hit refuses the commit and forces the supersede-or-recapture path,
  never an edit. Record the sweep (patterns, result) in the README.
- [ ] Run the sign-in supersede step (the ruling above) so the captured magic-link token is
  dead before push.
- [ ] Copy the captures in unedited. The README records: run date, tool commit, the bake
  command and both specs, per-invocation environment (including the `env -u` wrapper and the
  pinned width), the exact invocation lines, the two doctor environments, the supersede step,
  the sweep, and the deliberately-unconsumed list (the resume fixture, if any).
- [ ] Commit on `main` (fixtures plus README), push. The reference-captures precedent
  (`f3fe8f22`) covers data commits to `main`.

### Task A6: teardown

- [ ] Tear down and verify by listing, not memory: the scratch worker, both D1 databases,
  the R2 bucket, the GitHub repository (always created on this path), the minted read-scoped
  doctor token, the local state record `~/.config/cairn/sites/cairn-capture-scratch-*.json`,
  and the wrangler OAuth session (`wrangler logout`). The GitHub App deletion stays on the
  hand-steps ledger (Geoff-only). Everything API-reachable is done in-session.
- [ ] File the placeholder from-address (`cms@showcase.test` shipping in every scaffold's
  adapter) into the docs friction log as an engine defect candidate for ROADMAP triage; the
  capture is about to publish a fixture documenting it.

---

## Part B: the pages and the gate (feature worktree off `main`, `cairn-implementer` per task)

### Task B1: `create-your-site.md` transcript blocks

**Files:** Modify: `docs/admin/create-your-site.md`

**Interfaces:** Produces marked blocks per the locked convention; B3's gate parses them.

- [ ] The page's second bounded edit. The ratified block list (outlines record, as amended):
  the cost preamble, the GitHub App prompt, and the deploy summary carrying the printed live
  address, the last replacing the existing paraphrase ("Your terminal prints your site's
  live address, something like ..."). Blocks quote the rendered form of
  `01-create-cairn-site.txt`; typed invocations sit in their own unmarked fences as the
  post-release `npx create-cairn-site` command.
- [ ] The must-survive set holds: account prerequisites, the App-permissions disclosure, the
  ten-minute bootstrap link, the whole "Getting back in" section.
- [ ] Acceptance: `check:docs`, `check:symbols`, and Vale clean; register per
  `docs/internal/docs-register.md` (admin arm); every block markered; no invented or
  stitched output; deliverables stated at dispatch (one page, three blocks).

### Task B2: `is-it-working.md` rewrite (plus the doctor reference correction)

**Files:** Modify: `docs/admin/is-it-working.md`, `docs/reference/doctor.md`

**Interfaces:** Same marker convention.

- [ ] One recorded doctor block, under `## Running the check`, quoting report 2's rendered
  form: pass, fail, and skip lines together, per the ratified contract; deliberate no-visual
  everywhere else on the page. The surrounding prose explains the two documented invocation
  forms (bare vs credentialed) and states which one the block shows; the known-exception
  paragraph for the `config.site-config` skip stays consistent with the captured report.
- [ ] The must-survive set holds: the run-it-yourself vs can't-run-it-at-all split, the
  hand-built-site CSRF scoping, the site-config skip disclosure.
- [ ] Correct `docs/reference/doctor.md`'s false claim that `config.csrf-disable` skips on
  every scaffold (the scaffold ships `svelte.config.js`, so it passes) — one sentence,
  verified against the captured report. Declared here at planning, not added in flight;
  B2's deliverable count is two pages, one block.
- [ ] Acceptance: same gates as B1 plus `check:readiness` (its anchor set targets this page).

### Task B3: the transcript CI gate

**Files:**
- Create: `scripts/checks/transcript-blocks.mjs`
- Create: `src/tests/unit/transcript-blocks.test.ts`
- Modify: `package.json` (`check:transcripts`), `.github/workflows/test.yml` (beside
  `check:visuals`)

**Interfaces:** Consumes the marked blocks B1/B2 wrote and the fixtures under
`packages/create-cairn-site/test/fixtures/transcripts/`.

- [ ] The render layer: a tested pure `renderTranscript(raw)` that replays the pty control
  stream into the final frame (CSI/SGR strip alone is insufficient: carriage returns,
  cursor-up, and erase sequences must be applied, or clack's keystroke redraws concatenate).
  Both sides of every comparison pass through it; docs quote the rendered form.
- [ ] The comparison: each marked block (elision segments per the convention) must appear in
  the named fixture's rendered form, byte-exact modulo trailing whitespace per line.
- [ ] Failure modes, each a tagged `kind` with a unit case against an injectable root
  (`scanTree(root)`, the `check:visuals` shape): `content-mismatch`, `fixture-missing`,
  `orphan-marker`, `double-marker`, `marker-escapes-fixtures-dir`, `page-below-floor` (a
  declared per-page minimum: `create-your-site.md` >= 3, `is-it-working.md` >= 1 — the
  Pass D regression was per-page, so the floor is per-page, not global), and
  `fixture-uncited` (every fixture is quoted somewhere or listed in the README's
  deliberately-unconsumed list).
- [ ] House conventions: unconditional summary line, `OK` line or per-violation
  `console.error` with `{file, kind, message}`, `process.exitCode = 1` (never
  `process.exit`), the import guard so the unit test drives the module.
- [ ] Falsifiability: every failure mode proven red in the unit suite, plus one live red run
  of the real CLI (`content-mismatch`, by corrupting a block) with output in the task
  report, then restored green.
- [ ] Wiring: `"check:transcripts": "node scripts/checks/transcript-blocks.mjs"`, a bare
  `- run:` step in `test.yml` beside `check:visuals`.

### Task B4: pass close

- [ ] ROADMAP: mark the transcript-gate entry done and remove it; edit the fixtures-sweep
  clause at the seam entry ("the capture pass scheduled separately with Geoff" is now
  history); when removing, record in STATUS that the "each page rewritten once" clause was
  not kept (the diagram edit and the transcript edit were two bounded edits, by the
  visual-layer sequencing) so the broken promise is retired loudly, not silently. File the
  A4 resume-fixture ROADMAP line if one was captured, and the friction-log triage from A6.
- [ ] STATUS: retire the transcript-fixtures-resolved-in-the-negative paragraph (fixtures
  now exist), record the pass, restore the immediate-next-action to seam Pass 1 with its
  verbatim launch prompt, restate the hand-steps outstanding count (this pass adds the third
  App), and confirm the ledger carries every teardown item.
- [ ] Changelog: an `## Unreleased` entry (two admin pages, the fixtures, the new gate), no
  `Consumers must:` line. `docs/extend/migration-notes.md` not required. (If the F1
  resolution published a prerelease, that publish was its own `cairn-release` act with its
  own records; this pass's entry does not restate it.)
- [ ] code-simplifier over the pass's changed code (the gate script and test); reviewer
  fan-out per `cairn-pass` step 3 as touched surfaces dictate; `cairn-register-editor` over
  both rewritten pages before Geoff reads them.
- [ ] Post-mortem appended to this plan file. Gates: re-derive the PR-gating workflow list
  (`grep -l pull_request .github/workflows/*.yml`) and run what applies; by name today that
  means `npm run check` 0/0, `npm test` exit 0, `check:comments`, `check:docs`,
  `check:reference`, `check:reference:signatures`, `check:package`, `check:surface`,
  `check:snippets`, `check:visuals`, `check:readiness`, `check:symbols`, `check:arm-indexes`,
  `check:prose`, `check:transcripts`, `npm --prefix packages/create-cairn-site test`, and
  the from-scratch consumer proof per the skill. Merge per `cairn-pass`, prep the context
  clear.

## Review findings refused (with reasons)

- "Move the fixtures beside their real consumer (the root gate)": refused; the fixtures are
  the tool's output and belong with the tool; the rationale is corrected instead.
- "Drop Task A4 entirely": refused; the brief's cheap-only clause stands, now with the
  disposition (README label plus ROADMAP line) that answers the no-consumer objection.
