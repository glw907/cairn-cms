# Extend-1 Pass Implementation Plan (gates and atoms, after the 0.97.0 cut, beside Go tool pass A, before the docs rewrite)

> **For agentic workers:** execute through the `cairn-pass` skill's implementer chain
> (`cairn-implementer` → `diff-reviewer` → gate), workflow mode via
> `~/.claude/workflows/pass-execute-chains.js` with TWO chains, launched as ONE workflow run; see
> Execution. Steps use checkbox syntax for tracking. Every anchor is re-verified at dispatch
> against the branch HEAD, per the Reconciliation block below.

**Date:** 2026-09-14. **Approved:** Geoff, 2026-09-14, after the three-lens adversarial review, the
fold read over the spec and both plans, and the targeted read of the fold's own mechanisms. The
plan-approval gate is closed; execution needs no further read. **Spec:** `docs/superpowers/specs/2026-09-12-extend-design.md`
(revision 2, with Fold 10 carrying this plan's review back). The plan argues from the spec;
executors read both.

**2026-09-15 amendment (docs-to-facts pass):** the `extend` and `admin` narrative arms are frozen
against rewrites. Task 8b no longer edits `docs/extend/what-the-scaffold-wrote.md` or
`docs/admin/create-your-site.md`; it files the fact(s) in `docs/internal/facts/extend.md` and
`docs/internal/facts/admin.md` instead. The reference arm is unaffected.

**Goal:** a consumer site runs cairn's gates on its own code and composes cairn's atoms instead of
reinventing them: two new `cairn-audit` static rules over source text, the scaffold wiring that
installs the gates, a public `/log` subpath, a Tooltip primitive and additive batch actions in
the toolkit, the site admin stylesheet seam, and the two showcase exemplars rewritten onto the
atoms. No new package, and no change to `cairn-doctor`.

## Fold (2026-09-14)

Draft 1 went to three adversarial lenses (contract-and-criteria, mechanics-and-feasibility,
domain-risk). Every ranked change is applied. The decisions that changed the plan's shape:

1. **Chain B runs no browser-bearing gate.** `cairn-run-gate` keys its lock on the working
   directory plus the gate string, so two worktrees' FULL gates run concurrently, which is the
   recorded 2026-09-14 desktop crash, and `CI=1` disables Playwright's server reuse so the second
   run dies on port 4173. Tasks 7 and 8a/8b run CHECK-PLUS-UNIT; the seam's e2e proof, its
   captures, and its three assertions run once, after `extend-1-site` merges, as a ritual step.
2. **Anything a scaffolded site must carry travels through the bake, not the overlay.** The
   overlay directory composes only into the GitHub template repository. The CI workflow lives at
   `examples/showcase/.github/workflows/check.yml` (GitHub ignores a nested `.github`), the bake
   carries it, and the dev shim the bake writes gains the watch compile.
3. **The event union stays the type source of truth.** Two gates parse `events.ts` by union
   shape (`check-symbols.mjs`, `log-events-table.test.ts`). The runtime array lives beside it
   and is asserted equal to the union in both directions at compile time.
4. **Redaction is whole-key against a documented list.** Substring matching would have
   destroyed `tidy.succeeded`'s `tokens` and `turnstile.verify_failed`'s `tokenLength`, both
   documented rows.
5. **`cairn-btn-guarded` stays on its four sites.** Its rule restores `pointer-events` on an
   `aria-disabled` control, without which the Tooltip's hover never fires, and supplies the ghost
   button's resting fill. The Tooltip replaces the native `title` only.
6. **The named-sheet hard error already ships** (`run.ts:67-82`); task 2 locks it with a test
   and drops the deliverable.
7. **A gate criterion admits the baselines a task declares.** The FULL string's e2e leg may fail
   on exactly the files under `INTENDED MOVES:` and no others, since baselines are CI-canonical.
8. **Task 8 splits into 8a and 8b** at the seam its steps already drew (wiring, then proof and
   docs), and the transcript re-capture is a stretch item with the polish-11a fallback, since the
   capture harness lives outside the repo and the scratch site has drifted.

## Where it sits

After the `0.97.0` cut. In parallel with the rest of the Go tool pass A
(`docs/superpowers/plans/2026-09-14-cairn-tool-1-0-pass.md`), which lives under `tool/` and touches
no file this pass touches except the three pass-close files, merged in whichever order the closes
land. **Resequenced 2026-09-16 (Geoff's 2026-09-15 decision in `docs/STATUS.md`):** extend-2
follows this pass directly, then one cut, then the site round; the docs rebuild follows the round,
not this pass. The `0.97.0` cut has not landed either: this pass ships in it, so "Available since"
reads `0.97.0` and the advisory rules promote at `0.98.0`. Site migration waits until both extend
passes have landed.

**Architecture:** nine tasks in two chains. Chain A is engine work under `src/lib` plus the two
showcase exemplar server routes. Chain B is the showcase's stylesheet seam and the scaffold
wiring baked from it. The chains share three paths, all reconciled at the merge: `CHANGELOG.md`
(by hand), the regenerated `templates/waymark/**` (by re-running `npm run emit:template` on the
merged tree), and `examples/showcase/e2e/admin-visual.spec.ts-snapshots/**` (by the pass-end CI
regen read against the union of every `INTENDED MOVES:` declaration).

**Tech stack:** SvelteKit 2, Svelte 5 runes, Tailwind v4.3 (`@tailwindcss/cli` probed for the
site's standalone compile, with a PostCSS fallback mirroring the engine's own
`scripts/build/build-admin-css.mjs`), daisyUI 5.6, Vitest, Playwright, the `cairn-audit` static
substrate, the `create-cairn-site` bake (`packages/create-cairn-site/scripts/bake-template.mjs`).

**Not in this pass:** the guidance layer and `cairn-guidance` (extend-2), any change to
`cairn-doctor` (retiring; Geoff, 2026-09-14), the recipe pages (the docs rewrite), the ledger
execution of the retired doctor row (extend-2), the removal of `cairn-btn-guarded` from the sheet
(a later pass with its budget edit).

## Token ceiling

**6.7M.**

| Line item | Basis | Tokens |
|---|---|---|
| Seven paint-neutral task chains (1, 2, 5, 6, 7, 8a, 8b) | 500K each; task 2 authors two rules with fixture suites and a second file walk; task 7 probes a new dependency | 3.5M |
| Task 3, the Tooltip | 600K: 34 `title` sites across 15 files, a new component and test, the hazards rule, a story, two docs, a baseline sweep | 0.6M |
| Task 4, batch actions | 440K, the paint rate | 0.44M |
| Re-dispatch reserve | two fix rounds; `maxFix: 1` | 0.6M |
| The post-merge FULL gate and seam proof (ritual step 1) | one dispatch running the FULL string, the e2e spec, and the ten captures | 0.3M |
| Pass-end `visual-verifier` | signups at five widths and two schemes, plus one tooltip surface | 0.4M |
| Reviewer fan-out | `daisyui-a11y-reviewer` (Tooltip, blocking), `svelte-reviewer`, `web-auth-security-reviewer` (redaction, the never-log list), `code-simplifier` | 0.6M |
| CI regen waits and the baseline read | | 0.3M |
| **Total** | | **6.74M, stated as 6.7M** |

At 80 percent (5.4M) the conductor finishes the task in flight, writes STATUS, and asks one
combined question. **Checkpoint interval:** every four tasks, written when the run returns.

## Execution

**Workflow mode**, through `~/.claude/workflows/pass-execute-chains.js`, copied into the session
scratchpad first. **Two chains, one run.**

| Chain | Tasks, in order | Worktree | Branch | Gate |
|---|---|---|---|---|
| A | 1, 2, 3, 4, 5, 6 | `.claude/worktrees/extend-1` | `extend-1` | CHECK-PLUS-UNIT; FULL for 3 and 4 |
| B | 7, 8a, 8b | `.claude/worktrees/extend-1-site` | `extend-1-site` | CHECK-PLUS-UNIT only |

`extend-1` merges; `extend-1-site` branches from the same commit and merges into `extend-1` at the
ritual. `maxFix` is `1`. Only chain A ever holds port 4173, the headless browser, and an 8G gate
scope at a time, because chain B runs no e2e and captures nothing; task 7's proof runs after the
merge (ritual step 1).

**Why the split falls where it does.** Chain B edits `examples/showcase/package.json`, its
`.gitignore` and `.cairn-template.json`, `src/admin.css`, `src/routes/admin/+layout.svelte`, the
signups `+page.svelte`, a new e2e spec and fixtures, `.github/workflows/test.yml`, and the bake;
chain A edits `src/lib/**`, the two `+page.server.ts` exemplars, `examples/showcase/src/lib/log.ts`,
and the docs those exports need. Task 5 touches the signups `+page.server.ts` while task 7
touches `+page.svelte`: different files, verified. Task 2's two rules are advisory and chain B
never sees them until the merge.

**The promotion version is the conductor's.** Before the run, the conductor reads
`npm view @glw907/cairn-cms versions --json`, names the next minor after this pass's release as
the promotion version, and states it in the dispatch args. No task calls `npm view`.

**The pass runs unread on this reviewed plan** once Geoff approves it.

### Pre-dispatch

1. Confirm the `0.97.0` cut has landed and CI on `main` is green.
2. Confirm no live executor holds either worktree (`pgrep -f`, `git status`, the workflow
   journals). The Go tool pass runs in `cairn-tool-a` and touches no file this pass touches until
   its close.
3. Confirm the branch carries this plan (committed on `main` at authoring).
4. Create both worktrees off the same commit; `npm install` at each root, then a from-scratch
   `npm install` in each worktree's `examples/showcase`.
5. Write the pass into `docs/STATUS.md` in the conductor's own commit.
6. Arm the unattended-work guards per `~/.claude/docs/unattended-work-guards.md`.

## Reconciliation at dispatch

Every `file:line` below was measured on `main` at `55fc7762`. The `0.97.0` window (the motion
pass, the pre-cut window pass) lands between authoring and the branch point and moves anchors
under `src/lib/components/`, `src/lib/audit/rules/`, `docs/reference/cairn-audit.md`, and
`skills/cairn-admin-screens/SKILL.md`. **Every anchor is re-verified at dispatch.**

| Anchor | What the window does | Which task cares | How to relocate |
|---|---|---|---|
| `src/lib/audit/rules/static/index.ts:17-32` (twelve rules) | the motion pass registers three more | Task 2 | Read the array whole; append in its ordering |
| `docs/reference/cairn-audit.md:23` ("All 28 registered rules"), `:65` ("Twelve rules run, all error tier") | the motion pass rewrites both | Task 2 rewrites both, including the "all error tier" clause | Locate by the sentence |
| `skills/cairn-admin-screens/SKILL.md` tier map | the motion pass adds its rules | Task 2 adds a `**Static, advisory tier**` paragraph | Read the section whole; the parser slices to the first blank line |
| `src/lib/components/*.svelte` native `title` sites (34 across 15 files) | the motion pass edits seven components | Task 3 | Grep at dispatch with the pattern in task 3 |
| `src/lib/components/cairn-admin.css:738-757` (`cairn-btn-guarded`, pinned unlayered rule 2 of 13) | untouched (motion decision 1) | Task 3 leaves it | Verify `scripts/checks/custom-surface-budget.json` unchanged |
| `src/lib/admin-toolkit/AdminTable.svelte:20-23` (`@component`), `:34-53` (props), `:59-75` (render) | the pre-cut window adds an accessible-name prop | Task 4 | Read whole |
| `examples/showcase/e2e/admin-visual.spec.ts-snapshots/` (28 files, 10 `admin-signups-*`) | the motion pass adds up to sixty | Tasks 3, 4, 7 | Read at dispatch; declare `INTENDED MOVES:` |
| `CHANGELOG.md` `## Unreleased` | the cut empties it | Every task | Append beneath a fresh `## Unreleased` with `<!-- release-size: minor -->` |
| `docs/internal/engine-rulings.md` | the window annotates rows | Task 6 | Place by reading the file's ordering |
| `ROADMAP.md` Next tier | the window closes the motion and pre-cut entries | Task 6 | Re-read the tier whole |
| `.github/workflows/test.yml` and the gate string | unchanged since the motion derivation; **task 7 appends one step** | Every task; tasks after 7 in chain B and the ritual carry the appended string | Re-derive at the branch point; re-derive again after task 7 |

### The spec's own anchors, measured on `main` at `55fc7762`

- `src/lib/log/emit.ts:16-20`, `:28-36`, `:38-42`; `src/lib/log/events.ts:1-16`, `:17-98`;
  `src/lib/log/index.ts:1-2`; 125 call sites across 32 `src/lib` files.
  `scripts/checks/check-symbols.mjs:328-333` (`logEventNames`, the union-shape parser), `:439-443`;
  `src/tests/unit/log-events-table.test.ts:13-17`, `:26-31`; `src/tests/unit/check-symbols.test.ts:193-197`.
  `scripts/checks/check-surface.mjs:31-44` (auto-pickup from `exports`);
  `scripts/checks/reference-coverage.mjs:534-553` (`CONFIG`), `:70-131` (tier marker);
  `scripts/checks/check-reference-signatures.mjs:183-208`; `scripts/checks/check-surface-leaks.mjs:1-35`;
  `scripts/checks/check-self-use.mjs:14-17`, `:244-259`; `scripts/checks/check-arm-indexes.mjs:29-34`.
  `src/lib/sveltekit/content-routes-tidy.ts:252` (`tokens`), `src/lib/cloudflare/turnstile.ts:103-104`
  (`tokenLength`), `docs/reference/log-events.md:42` (`hasSession`), `:67`, `:81`.
- `src/lib/audit/run.ts:16-30` (`componentPaths`, `.svelte` only), `:33-49`, `:52-57` (`loadCssFiles`),
  `:67-82` (the existing sheet throw), `:88-91`, `:92` (`applySuppressions`);
  `src/lib/audit/types.ts:14` (`Tier`), `:31-37` (`CssSource = { file, source }`), `:39-49`;
  `src/lib/audit/suppress.ts:47-53`; `src/lib/audit/report.ts:37-49`; `src/lib/audit/config.ts:15-19`,
  `:24-27`, `:96-102`, `:184-186` (the absent-`sheet` candidate search, kept);
  `scripts/checks/check-skill-budget.mjs:61-65`, `:75-88`; `scripts/checks/check-package-files.mjs:199-208`.
- `src/lib/admin-toolkit/StatusChip.svelte` (the scoped-style-with-literal-fallbacks precedent,
  and `:101`'s `<span title={legend}>`); `src/lib/admin-toolkit/index.ts:14-52`;
  `src/lib/audit/rules/static/stock-default-hazards.ts:28-32`, `:115-120`;
  `src/tests/unit/audit/rules/stock-default-hazards.test.ts`; `src/lib/reproductions/stories/editor.ts:62-78`
  (`guardedButton`, raw HTML); `src/lib/components/EditPage.svelte:1578-1584`, `:1593`, `:1595`,
  `:1863-1872`, `:1950-1961`, `:2325-2327`; `src/tests/component/EditPage.test.ts:3726`, `:3750`;
  `scripts/checks/custom-surface-budget.json:5-6`, `:32-36`; `scripts/checks/check-invisible-craft.mjs:44-46`.
- `src/lib/admin-toolkit/ExpandableRow.svelte:96`, `ToolbarDisclosure.svelte:119` (`Snippet<[T]>`);
  `src/tests/component/AdminTable.test.ts` (exists).
- `scripts/build/admin-css.input.css:10-12` (line 13 is the DaisyUI plugin the seam omits);
  `scripts/build/build-admin-css.mjs:5-6`, `:19`, `:37`,
  `:55-70`; `examples/showcase/package.json:5-16` (`dev` is `vite dev`; no `scripts/dev.mjs`);
  `examples/showcase/vite.config.ts:36`, `:53`; `examples/showcase/playwright.config.ts:29-39`;
  `examples/showcase/src/content/.cairn/index.json` (tracked); `examples/showcase/.cairn-template.json:2-27`;
  `scripts/build/emit-template.mjs:86-92`, `:164-196` (`alwaysSkip` at `:171`, lockfile delete at `:192`);
  `scripts/checks/check-consumers.mjs:1-8`.
- `packages/create-cairn-site/scripts/bake-template.mjs:21-22` (deny lists, throw on missing),
  `:26-58` (`SITE_README`), `:60` (`DEV_SHIM`), `:98`, `:110-136`, `:197`;
  `packages/create-cairn-site/scripts/bake-template.test.mjs:128`; `packages/create-cairn-site/package.json`
  (`prepack` bakes to `template/`; `files` carries `template`, not `template-repo`);
  `packages/create-cairn-site/src/scaffold.mjs:118-193`, `:148`, `:224-252`;
  `packages/create-cairn-site/src/github/manifest.mjs:58-63`; `packages/create-cairn-site/src/github/repo.mjs:243-252`;
  `.github/workflows/create-site.yml:105-107`, `:131-141`; `.github/workflows/scaffold.yml:30-37`;
  `docs/admin/create-your-site.md:60` (the permissions sentence), `:35`, `:55`, `:133`;
  `docs/extend/add-cairn-to-a-sveltekit-app.md:28`; `packages/create-cairn-site/test/fixtures/transcripts/`
  (six fixtures, no in-repo capture script; `docs/HISTORY.md:329-348`).

## Ruled inputs (recorded; no task re-derives them)

- **The outcome grammar is not exported and not linted.** No task adds an `Outcome` type or an
  `outcome-grammar` rule.
- **The log rule reserves exact event strings**; no area is reserved; `admin.signups.misconfigured`
  is legal.
- **New consumer-facing audit rules and findings enter at advisory tier for one minor**, the
  promotion version stated in the message from the conductor's dispatch args.
- **The named-sheet hard error exists** (`run.ts:67-82`). Task 2 locks it; no code moves.
- **The stylesheet seam is utilities-only**, in the five-line form (amended 2026-09-16: the fourth
  `@source` scans the site's admin routes and a fifth scans the engine's shipped `dist` markup, so the
  site sheet is a superset of the engine's utilities in Tailwind's order; without it the site's base
  utilities, loading later in the shared `utilities` layer, defeat the engine's responsive variants),
  with no `@plugin "daisyui"`.
  The proving utility is a plain utility class, never a bracketed arbitrary value and never an
  inline `var(--…)`, since `check-invisible-craft` and the showcase's `retiredTokenBudget: 0`
  both scan the showcase routes.
- **The Tooltip carries its own scoped styles** with literal fallbacks, per `StatusChip.svelte`.
- **`cairn-btn-guarded` stays compiled and stays on its four sites.** Its unlayered pin is
  untouched; the hazards rule names it as retired at advisory tier.
- **Batch actions are additive.** No existing `AdminTable` prop changes; rows stay caller-rendered.
- **The doctor is untouched.** No check, no flag, no doctor transcript.
- **The scaffolded workflow's last step is a comment this pass**; the spec's "staleness prints
  on every push" lands when extend-2 ships `cairn-guidance` and uncomments it.
- **Redaction is whole-key**, case-insensitive, against `REDACTED_LOG_KEYS` exported beside
  `createLogger`: `token`, `secret`, `password`, `cookie`, `authorization`, `session_id`,
  `sessionId`, `apiKey`, `privateKey`. `tokens`, `tokenLength`, `hasSession` survive.
- **The showcase's `dev` script stays byte-exactly `vite dev`**; `bake-template.mjs`'s
  `rewriteDevScript` throws on any other value.
- **Every task's `CHANGELOG.md` line is one entry under `## Unreleased`**, with a `Consumers must:`
  line only where a consumer must act (task 1), and plain "No consumer action." elsewhere, never
  the literal "Consumers must: nothing".
- **No consumer site imports `CairnLogEvent`, `cairn-cms/log`, or `cairn-btn-guarded`** (measured
  2026-09-14 across ecxc-ski, aksailingclub-org, 907-life), so tasks 1 and 3 break no consumer.

## Global constraints

1. **The em dash is banned** in every code comment and every doc this pass writes.
2. **No process citations in shipped comments.**
3. **The gate is CI-derived.** A task is not done until its string exits 0 in its worktree through
   `cairn-run-gate`, **except that the FULL string's e2e leg may fail on exactly the baseline
   files the task declares under `INTENDED MOVES:` and no others**; the report quotes Playwright's
   failing-file list and shows it equals the declaration.
4. **`check:surface` is regenerated only by tasks 1, 3, and 4**, each committing
   `docs/internal/api-surface.md` with a diff naming exactly its own additions.
5. **Every showcase change regenerates `templates/waymark/`** by `npm run emit:template` in the
   same commit, never by hand, and `npm run check:template` prints `emit-template-dir: OK`.
6. **Comments follow TSDoc under `check:comments`.**
7. **No task edits `docs/STATUS.md`, `docs/HISTORY.md`, or the doctor.**

---

## Task 1: The `/log` subpath

**Chain:** A, first. **Paint:** no.

**Deliverables: four.** `createLogger`, `CAIRN_LOG_EVENTS`, and `REDACTED_LOG_KEYS` exported from
a new `./log` subpath with the engine's own `log` as an instance; whole-key redaction; the reference
page and every gate entry a new subpath needs; the `CLAUDE.md` and `log-events.md` reframing.

**Files (14):**
- Create: `src/lib/log/create.ts` (`createLogger`, `buildRecord`, the redaction, `REDACTED_LOG_KEYS`),
  `src/lib/log/events-list.ts` (`CAIRN_LOG_EVENTS`), `src/lib/log/public.ts` (the subpath
  barrel), `src/tests/unit/log/create.test.ts`, `docs/reference/log.md`
- Modify: `src/lib/log/emit.ts` (`log = createLogger<CairnLogEvent>()`; the sink stays here),
  `package.json` (`exports["./log"]` pointing at `dist/log/public.js` and `.d.ts`),
  `scripts/checks/reference-coverage.mjs:534-553` (a `{ subpath: './log', dts, page }` entry),
  `scripts/checks/check-self-use-allowlist.json` (a reasoned entry for `CAIRN_LOG_EVENTS` and
  `REDACTED_LOG_KEYS`, each noting task 2 gives them an engine caller and retires the entry),
  `docs/reference/README.md`, `docs/reference/log-events.md` (the opening sentence), `CLAUDE.md`
  ("Diagnosing a running site", the sentence stating the logger is internal),
  `docs/internal/api-surface.md` (regenerated), `CHANGELOG.md`
- Not modified: `src/lib/log/events.ts` (the union is the source of truth and two parsers read
  it by shape), `src/lib/log/index.ts` (the internal barrel), any call site.

**Interfaces:**
- Produces, from `@glw907/cairn-cms/log`: `createLogger<Event extends string>(): { info(event: Event, fields?: Record<string, unknown>): void; warn(...): void; error(...): void }`;
  `CAIRN_LOG_EVENTS: readonly CairnLogEvent[]`; `REDACTED_LOG_KEYS: readonly string[]`; and the
  type `CairnLogEvent` re-exported so `check-surface-leaks` sees no closure leak. `log` itself is
  not exported.
- Produces: `events-list.ts` declares the array `as const satisfies readonly CairnLogEvent[]` and a
  type-level assertion that `CairnLogEvent` extends the array's element type, so a member added
  to either side without the other fails `npm run check`.
- Produces: the record `{ ...fields, level, event, timestamp }` with envelope keys last, and every
  field whose key equals a `REDACTED_LOG_KEYS` member case-insensitively replaced by `'<redacted>'`.
- Unchanged: the 125 engine call sites, the event names, the per-level console sink, and every
  documented field in `docs/reference/log-events.md`.
- Consumed by task 2 (`CAIRN_LOG_EVENTS`, `REDACTED_LOG_KEYS`) and task 5 (`createLogger`).

**Decisions the plan makes:**
- `createLogger` lives in `create.ts` and `emit.ts` imports it, so `check:self-use` counts an
  outside caller. The array lives in its own module so `emit.ts` keeps its `import type` and the
  Worker bundle grows by the array alone; the report quotes `e2e.yml`'s bundle-budget line before
  and after and names the delta.
- The reference page opens with "Available since <the promotion version's predecessor, the
  release this pass ships in>", marks all four exports `Extension API`, states the narrowed promise
  (three methods; envelope keys and order; whole-key redaction; the event list; the sink is not
  promised; every instance shares one sink so a future subscriber sees one stream), and carries
  the never-log list (magic-link token, session id or cookie, `Authorization` header, GitHub App
  private key, anything from `.dev.vars`) with the paste-safety caveat.
- `CLAUDE.md`'s sentence "The logger is internal (exported from no package subpath), so its API is
  free to grow; the event names are the public-observable contract" becomes one sentence stating
  the narrowed promise and pointing at the reference page.

**Steps:**
- [ ] **Step 1: the failing tests first.** A typed instance refuses an event outside its union
  (`// @ts-expect-error`); the record's last three keys are `level`, `event`, `timestamp` in that
  order even when `fields` carries them; `token`, `sessionId`, and `session_id` arrive as
  `'<redacted>'`; `tokens`, `tokenLength`, and `hasSession` arrive verbatim; `CAIRN_LOG_EVENTS`
  contains `'auth.link.requested'` and the type assertion compiles. Watch them fail.
- [ ] **Step 2:** write `create.ts`, `events-list.ts`, `public.ts`; re-point `emit.ts`; tests
  green; `npm run check` 0/0 with no call-site change.
- [ ] **Step 3:** the subpath, the `CONFIG` entry, the allowlist entries, the reference page, the
  index link; regenerate `api-surface.md`; `check:reference`, `check:reference:signatures`,
  `check:surface`, `check:surface-leaks`, `check:self-use`, `check:symbols`, and
  `check:arm-indexes` green at their node entry points.
- [ ] **Step 4:** `CLAUDE.md` and `log-events.md`; the changelog entry with `Consumers must:`
  reading "nothing to change; a site that wants structured logs imports `createLogger` from
  `@glw907/cairn-cms/log`". The CHECK-PLUS-UNIT gate. Commit.

**Acceptance criteria:**
- `npx vitest run src/tests/unit/log/create.test.ts` passes with at least eight named cases
  covering Step 1.
- `git diff main --name-only -- src/lib | grep -v '^src/lib/log/'` prints nothing, and
  `git diff main -- src/lib | grep -E '^[-+].*log\.(info|warn|error)\('` prints nothing.
- `docs/internal/api-surface.md` gains exactly one `## \`/log\`` section with four entries
  (`createLogger`, `CAIRN_LOG_EVENTS`, `REDACTED_LOG_KEYS`, `CairnLogEvent`) and no other diff.
- `docs/reference/log.md` carries a tier marker on all four, an "Available since" line, and the
  never-log list, verifiable by grep; no row in `docs/reference/log-events.md` changes meaning.
- The CHECK-PLUS-UNIT string exits 0.

**Gate:** CHECK-PLUS-UNIT. **Commit:** one, `feat(log): export createLogger from a /log subpath`.

---

## Task 2: Two advisory rules over source text

**Chain:** A, second. **Paint:** no. **Depends on:** task 1.

**Deliverables: three.** The `sources` input with its second walk and config key;
`log-event-grammar` and `log-secret-field` at advisory tier, suppressible; the counts, the tier
map, the budget-check section, and the locking test for the existing sheet error.

**Files (14):**
- Create: `src/lib/audit/rules/static/log-event-grammar.ts`, `log-secret-field.ts`, their two
  test files under `src/tests/unit/audit/rules/`, a fixture directory of `.ts` and `.svelte`
  sources under `src/tests/unit/audit/fixtures/sources/`
- Modify: `src/lib/audit/types.ts` (`StaticRuleContext.sources?: SourceFile[]` beside `cssFiles?`),
  `src/lib/audit/config.ts` (`sourceScope: string[]` from the config key `static.sourceScope`,
  default `['src']`, with `sourceScopeFromConfig` beside it, the shape `staticScope` uses),
  `src/lib/audit/run.ts` (a second walk over `.ts` and `.svelte` in `sourceScope`; `sources`
  joins the `applySuppressions` carrier list and counts toward `filesScanned`),
  `src/lib/audit/rules/static/index.ts`, `src/tests/unit/audit/run.test.ts` (the locking case
  for the named-sheet throw), `docs/reference/cairn-audit.md`
  (the two rules, the source scope, both count sentences including the "all error tier" clause,
  and one sentence confirming the named-sheet error), `skills/cairn-admin-screens/SKILL.md`,
  `scripts/checks/check-skill-budget.mjs:61-65` (`{ label: 'Static, advisory tier', mode: 'static', tier: 'advisory' }`),
  `CHANGELOG.md`

**Interfaces:**
- Produces: `SourceFile = { file: string; source: string }`, the `CssSource` shape, so the two
  rules are suppressible by `cairn-audit-disable-next-line` like every other rule.
- Produces: rule ids `log-event-grammar` and `log-secret-field`, static, `advisory`, not
  `adminOnly`, each message ending with the promotion version from the dispatch args.
- Consumes: `CAIRN_LOG_EVENTS` and `REDACTED_LOG_KEYS` from `src/lib/log/`, which retires the
  task 1 allowlist entries.

**Decisions the plan makes:**
- The grammar rule is a name heuristic over `<ident>.info(`, `.warn(`, `.error(` with a string
  literal first argument, stated in its doc comment with its false positives (`console.info`,
  another library's logger) and false negatives (a computed name, a template literal, a
  re-exported logger). No cross-module tracking.
- The grammar checked is `events.ts`'s header: two or more snake_case segments, a dotted subject
  allowed, the last segment ending in `ed`, or equal to `failed` or `refused`, or in the small
  state-adjective list the header names; and the whole string not in `CAIRN_LOG_EVENTS`.
- The secret rule normalizes a key by lowercasing and compares whole against `REDACTED_LOG_KEYS`
  lowercased; its message says the runtime redacts the key and the rule exists for the
  value-in-message case.

**Steps:**
- [ ] **Step 1: the failing fixtures first.** `log.info('admin.signups.misconfigured')` passes;
  `log.info('auth.link.requested')` fails as a collision; `log.warn('Signup failed')` fails on
  shape; `` log.error(`admin.${x}`) `` produces no finding and the doc comment names the miss;
  `log.info('x.y.z', { token })` fails the secret rule; `{ tokenCount }` and `{ tokens }` pass it;
  `console.info('a.b.c')` produces a finding whose message carries the heuristic's caveat; a
  `cairn-audit-disable-next-line log-event-grammar` directive suppresses. The locking case: a
  config naming a missing sheet throws with the path in the message, and a config with no `sheet`
  resolves a candidate.
- [ ] **Step 2:** `sources`, `sourceScope`, the walk, both rules, until every fixture passes.
- [ ] **Step 3:** register at advisory; the reference sentences; the SKILL.md paragraph; the
  budget-check section; changelog (no consumer action). The CHECK-PLUS-UNIT gate. Commit.

**Acceptance criteria:**
- Both test files pass with at least twelve named fixtures between them, each Step 1 case
  asserted separately, the promotion version asserted as a string, and the suppression case
  asserted.
- A registry test asserts both ids reach the static registry at `advisory` with `adminOnly` unset.
- `node scripts/checks/check-skill-budget.mjs` is green with the new section present.
- A new case in the audit reference test reads both count numbers out of
  `docs/reference/cairn-audit.md` and compares them with the two registries' lengths.
- The CHECK-PLUS-UNIT string exits 0.

**Gate:** CHECK-PLUS-UNIT. **Commit:** one, `feat(audit): add log-event-grammar and log-secret-field`.

---

## Task 3: The Tooltip primitive

**Chain:** A, third. **Paint:** yes.

**Deliverables: four.** `Tooltip` in `/admin-toolkit`; the sweep of every native `title` on an
action control onto it; `stock-default-hazards` naming `cairn-btn-guarded` as retired; the
reference, the story, the design-system recipe, and the changelog.

**Files (28 at authoring; re-grepped at dispatch):**
- Create: `src/lib/admin-toolkit/Tooltip.svelte`, `src/tests/component/Tooltip.test.ts`
- Modify: `src/lib/admin-toolkit/index.ts:14-52`, every `src/lib/components/*.svelte` carrying a
  native `title` on a button or link (34 sites across 15 files at authoring: `EditPage` 15,
  `EditorToolbar` 4, `VocabularyAdmin` 3, twelve files at one each), `StatusChip.svelte:101`
  (decided below), `src/lib/audit/rules/static/stock-default-hazards.ts:28-32`, `:115-120`,
  `src/tests/unit/audit/rules/stock-default-hazards.test.ts`, `src/lib/reproductions/stories/editor.ts:62-78`,
  `src/tests/component/EditPage.test.ts:3726`, `:3750`, `docs/reference/admin-toolkit.md`,
  `docs/internal/admin-design-system.md` (a tooltip recipe), `docs/internal/api-surface.md`
  (regenerated), `docs/extend/migration-notes.md`, `CHANGELOG.md`
- Not modified: `src/lib/components/cairn-admin.css:738-757`, `scripts/checks/custom-surface-budget.json`,
  and the four `cairn-btn-guarded` class attributes in `EditPage.svelte`.

**Interfaces:**
- Produces: `Tooltip` with props `text: string`, `id?: string`, and a `children` snippet for the
  trigger; renders the trigger with `aria-describedby`; shows on hover and on `:focus-visible`;
  hides on Escape; on a coarse pointer shows on tap and hides on the next tap outside. Its styles
  are scoped in the component with literal fallbacks for every `--cairn-*` token it reads.
- Produces: `stock-default-hazards` gains one arm: a `cairn-btn-guarded` class produces a finding
  at `advisory` tier (per-finding tier, which `Finding.tier` carries) reading "retired; wrap the
  control in `Tooltip` for the reason text; the class stays compiled until <the promotion
  version>". The existing native-`disabled` arm and its message are unchanged.
- Unchanged: every button's action, label, `aria-disabled` state, and the four sites' class list.

**Decisions the plan makes:**
- The four `cairn-btn-guarded` sites already use `aria-disabled` and are already focusable; the
  change is `title` to `Tooltip` only. The class stays because its rule restores `pointer-events`
  and supplies the ghost fill; removal is a later pass.
- A `title` that is not on an action control is left alone and listed: an `<abbr>`, a caption,
  and `StatusChip.svelte:101`'s `<span title={legend}>`, which stays because the chip is not an
  action and its legend is decorative.
- The story at `editor.ts:62-78` builds raw HTML, so it duplicates the Tooltip's rendered markup
  by hand; the duplication is named in the story's comment as a known cost.
- `admin-toolkit` is outside `custom-surface-budget.json`'s `markupDirs`, so the component's
  `<style>` block faces no budget; the a11y reviewer's read at the pass end is blocking.

**Steps:**
- [ ] **Step 1: the failing component test first.** Hover shows; `:focus-visible` shows; Escape
  hides and keeps focus on the trigger; `aria-describedby` points at the rendered text; a
  coarse-pointer tap shows. Watch them fail.
- [ ] **Step 2:** write `Tooltip.svelte`; the design-system recipe.
- [ ] **Step 3:** the sweep; the hazards arm and its fixture; the story; the two EditPage tests;
  capture the affected surfaces; declare `INTENDED MOVES:`.
- [ ] **Step 4:** reference, api-surface regen, migration note, changelog. `Consumers must:`
  reads "nothing, unless your admin copied the `cairn-btn-guarded` marker class from the engine's
  markup; no production site has". The FULL gate. Commit.

**Acceptance criteria:**
- `npx vitest run src/tests/component/Tooltip.test.ts` passes with the five Step 1 cases named.
- `grep -rnE '(^|[[:space:]])title=("|\{)' src/lib/components/*.svelte src/lib/admin-toolkit/*.svelte`
  returns only sites the report lists as non-action, each with a one-line reason; a `title` prop
  passed to a cairn component is out of scope and the report says so once.
- `git diff main -- src/lib/components/cairn-admin.css` is empty; `git diff main -- src/lib/components/EditPage.svelte | grep -c 'cairn-btn-guarded'` prints `0`.
- `node scripts/checks/check-custom-surface.mjs` is green with the budget file unchanged.
- `docs/internal/api-surface.md` gains the one `Tooltip` entry and nothing else.
- The FULL string exits 0 under global constraint 3; `INTENDED MOVES:` lists every baseline the
  sweep touches.

**Gate:** FULL. **Commit:** one, `feat(admin-toolkit): add Tooltip and retire cairn-btn-guarded`.

---

## Task 4: Additive batch actions on `AdminTable`

**Chain:** A, fourth. **Paint:** yes. **Checkpoint** after this task.

**Deliverables: three.** The `selection` prop and `batchBar` snippet with the `@component` block
rewritten; the extended component test with its baseline fixture; the reference and api-surface
entries.

**Files (6):**
- Create: `src/tests/component/fixtures/admin-table-baseline.html` (the branch-point render for
  the no-`selection` case, captured before any edit)
- Modify: `src/lib/admin-toolkit/AdminTable.svelte:20-23` (the `@component` block, which today
  disclaims a built selection column and must instead state who owns the header `<th>` and the
  row `<td>`), `:34-53`, `:59-75`; `src/tests/component/AdminTable.test.ts` (extend);
  `docs/reference/admin-toolkit.md`; `docs/internal/api-surface.md` (regenerated); `CHANGELOG.md`
- Not modified: `src/lib/components/CairnMediaLibrary.svelte`.

**Interfaces:**
- Produces: optional `selection?: { ids: Set<string>; onchange: (ids: Set<string>) => void; label: string }`
  and optional `batchBar?: Snippet<[{ count: number; clear: () => void }]>`. With `selection`
  set, `AdminTable` renders the header checkbox in the reserved first column (`aria-label` from
  `label`, indeterminate on a partial set) and the caller renders each row's checkbox `<td>` bound
  to the set; with a non-empty set, `batchBar` renders above the table in a `role="toolbar"`
  region. `emptyColspan` counts the selection column when `selection` is set.
- Unchanged: `header`, `children`, `rowCount`, the accessible-name prop, and every consumer that
  passes none of the new props.

**Decisions the plan makes:**
- Per-row action disabling while a selection is open is the caller's, documented in the reference
  page as the Carbon rule.
- The showcase's signups screen does not adopt it this pass.

**Steps:**
- [ ] **Step 1: the failing test first.** Capture the baseline fixture from the branch-point
  component; with no `selection`, the rendered HTML equals it; with an empty set, no bar; with two
  ids, the bar renders the count and `clear` empties the set through `onchange`; the header
  checkbox is indeterminate with a partial set.
- [ ] **Step 2:** implement; rewrite the `@component` block; capture the reproduction rendering
  `AdminTable` and declare `INTENDED MOVES:` (expected none).
- [ ] **Step 3:** reference, api-surface regen, changelog (no consumer action). The FULL gate.
  Commit.

**Acceptance criteria:**
- The test passes with the four Step 1 cases; the no-`selection` case asserts equality against
  the committed fixture.
- `docs/internal/api-surface.md`'s diff is the two new optional props and nothing else.
- The FULL string exits 0 under global constraint 3.

**Gate:** FULL. **Commit:** one, `feat(admin-toolkit): add additive batch actions to AdminTable`.

---

## Task 5: The two exemplars on the logger

**Chain:** A, fifth. **Paint:** no. **Depends on:** task 1.

**Deliverables: three.** The signups server route on `createLogger`; the members login request
action on `createLogger`; the two header comments.

**Files (6):**
- Create: `examples/showcase/src/lib/log.ts` (the site's one logger, typed to a `SiteLogEvent`
  union of the two events)
- Modify: `examples/showcase/src/routes/admin/signups/+page.server.ts` (`:29` and the header),
  `examples/showcase/src/routes/members/login/+page.server.ts` (the header and the `request`
  action), `examples/showcase/src/routes/admin/signups/actions.test.ts`, `templates/waymark/**`
  (regenerated; `src/lib/log.ts` bakes, the members route is excluded), `CHANGELOG.md`

**Interfaces:**
- Consumes: task 1's `createLogger`.
- Produces: `admin.signups.misconfigured` (unchanged name, through the logger) and
  `members.login.requested` with `{ outcome }` from the channel result, never the contact.
- Produces: header comments in the form "Archetype: ... Atoms: ... Recipe: docs/extend/<page>.md
  (the docs rewrite writes it)".

**Decisions the plan makes:**
- The members header states the accurate lesson: the route consumes `ChannelRequestOutcome` and
  `ChannelConfirmOutcome` and returns two-outcome `ActionData` of its own; it switches on
  `outcome`, never a boolean.

**Steps:**
- [ ] **Step 1: the failing test first.** The signups test asserts the misconfigured path emits one
  record with `event: 'admin.signups.misconfigured'` and `reason: 'db_not_bound'` through the site
  logger (spy on the sink) and that `console.error` is not called directly.
- [ ] **Step 2:** rewrite both routes; add the site logger; write the headers.
- [ ] **Step 3:** `npm run emit:template`; changelog (no consumer action). The CHECK-PLUS-UNIT
  gate. Commit.

**Acceptance criteria:**
- `grep -rn "console\.\(error\|warn\|log\)(" examples/showcase/src/routes` exits 1 (no match),
  which is the pass condition.
- Both header comments contain the three labels, verifiable by grep.
- `npm run check:template` prints `emit-template-dir: OK`; the CHECK-PLUS-UNIT string exits 0.

**Gate:** CHECK-PLUS-UNIT. **Commit:** one, `docs(showcase): put the two exemplars on createLogger`.

---

## Task 6: The ledger, the roadmap seam bullet, and the records (chain A, last)

**Chain:** A, sixth. **Paint:** no.

**Deliverables: four.** Five ledger rows; the ROADMAP edits; the migration notes and chain A's
changelog window reconciled; the record file.

**Files (5):**
- Modify: `docs/internal/engine-rulings.md` (rows: `log-export` accept; `stylesheet-seam` accept
  with the utilities-only shape; `tooltip-primitive` accept with ASC's evidence, native `title`
  on action controls across ten admin route files; `audit-rule-advisory-first-tier` accept, placed
  with the `audit-cli-*` rows, the standing rule for consumer-facing rules; `batch-actions-additive`
  recorded as engine work with the charter-test note), `ROADMAP.md` (close the tooltip and
  batch-action items in "Five admin defaults"; close the extend-1 half of the extend
  entry; add `/log` and `/admin-toolkit` to the "Toward 1.0" seam bullet),
  `docs/extend/migration-notes.md`, `CHANGELOG.md` (chain A's entries reconciled),
  `docs/internal/record/2026-09-14-extend-1-record.md` (what the gate caught; what a later pass
  would be wrong to rediscover; the `cairn-guidance check` report line for a surviving
  `cairn-btn-guarded` in a site tree, recorded for extend-2)

**Steps:**
- [ ] **Step 1:** the rows in the ledger's fenced format; `npm run check:rulings-format`. The
  `stylesheet-seam` row is written only if `extend-1-site` has merged when this task runs;
  otherwise the conductor writes it at the ritual after the merge, and the report says which.
- [ ] **Step 2:** ROADMAP, migration notes, changelog reconciliation, the record.
- [ ] **Step 3:** the CHECK-PLUS-UNIT gate. Commit.

**Acceptance criteria:**
- `npm run check:rulings-format` and `npm run check:docs` are green.
- ROADMAP no longer lists the tooltip or batch-action items, and the seam bullet names `/log` and
  `/admin-toolkit`.
- The CHECK-PLUS-UNIT string exits 0.

**Gate:** CHECK-PLUS-UNIT. **Commit:** one, `docs(extend-1): ledger rows, roadmap, records`.

---

## Task 7: The stylesheet seam on the showcase

**Chain:** B, first. **Paint:** deferred to the ritual (chain B captures nothing).

**Deliverables: four.** The showcase's admin entry, compile scripts, and layout import; the audit
config naming both sheets and the CI step that runs it; the one site-compiled utility on the
signups screen with the static half of the proof; the e2e spec and fixtures the post-merge proof
runs.

**Files (13):**
- Create: `examples/showcase/src/admin.css`, `examples/showcase/cairn-audit.config.json`,
  `examples/showcase/e2e/admin-sheet.spec.ts`, `examples/showcase/e2e/fixtures/admin-sheet-baseline.json`
- Modify: `examples/showcase/package-lock.json` (regenerated by the install, committed in the
  same commit; CI runs `npm ci` and dies on a stale lock), `examples/showcase/package.json`
  (`@tailwindcss/cli` devDependency; scripts
  `build:admin-css`, `precheck`, `prebuild`, `predev`, `dev:admin-css` with `--watch`,
  `check:cairn` = `npm run build:admin-css && cairn-audit`, `check:cairn:rendered` =
  `cairn-audit --rendered`; `dev` stays `vite dev`), `examples/showcase/.gitignore` (`/.cairn/`,
  root-anchored, since `src/content/.cairn/index.json` is tracked), `examples/showcase/.cairn-template.json`
  (`.cairn` joins `exclude`; `e2e` is already excluded, verified at dispatch),
  `examples/showcase/src/routes/admin/+layout.svelte` (import `../../../.cairn/admin.css` after the
  shell import), `examples/showcase/src/routes/admin/signups/+page.svelte` (one plain utility the
  engine's sheet does not compile, chosen at dispatch by grepping the packaged sheet, on the
  page's own element), `.github/workflows/test.yml` (a step
  `npm --prefix examples/showcase run check:cairn` after the showcase check), `templates/waymark/**`
  (regenerated), `CHANGELOG.md`

**Interfaces:**
- Produces: `src/admin.css`: the three lines at `scripts/build/admin-css.input.css:10-12` (the
  layer order, the theme import, the utilities import with `source(none)`) plus
  `@source "./routes/admin";` and `@source "../node_modules/@glw907/cairn-cms/dist";`, the five-line form
  (see Ruled inputs), and no `@plugin "daisyui"` line.
- Produces: `.cairn/admin.css`, the fixed path; `cairn-audit.config.json` with
  `sheet: ["node_modules/@glw907/cairn-cms/dist/components/cairn-admin.css", ".cairn/admin.css"]`.
- Produces: the gate string gains `&& npm --prefix examples/showcase run check:cairn` from this
  task on; the ritual re-derives it.
- Produces: `e2e/admin-sheet.spec.ts`, which fetches `/admin/posts`, `/admin/media`,
  `/admin/settings`, `/`, and `/posts`; for each collects every stylesheet `<link>` in document
  order, fetches each body, and SHA-256s the concatenation (content, never the hashed filename);
  for the three admin pages also snapshots `getComputedStyle` over the properties the rendered
  rules read; and asserts three things against `e2e/fixtures/admin-sheet-baseline.json`, the
  branch-point capture the ritual writes: (a) the `/` and `/posts` digests equal the fixture's,
  so nothing leaked onto a public page; (b) each admin page's stylesheet list differs from the
  fixture's by exactly one added sheet, whose body contains the chosen utility's declaration; (c)
  the `getComputedStyle` snapshot over the engine-owned properties is unchanged from the fixture on
  all three admin pages. The fixture is the "without" side; there is no second build.
- Consumed by task 8a (the bake), by the ritual (the proof run), and by extend-2's snippets.

**Decisions the plan makes:**
- Step 2's first act, after installing the devDependency, is a probe:
  `npx --no-install @tailwindcss/cli -i src/admin.css -o .cairn/admin.css` on the five-line entry,
  output non-empty and containing the chosen utility. `@tailwindcss/cli` publishes `4.3.3`,
  matching the pinned `tailwindcss` and `@tailwindcss/vite`. There is no fallback: a failed probe
  halts the task with the output quoted, an escalate for the conductor, because a PostCSS script
  under `scripts/` never reaches a scaffolded site (the bake writes exactly `dev.mjs` there). The
  new dependency gets the `dependency-upgrade` skill's survey line in the changelog. Every script
  that invokes the CLI spells `npx --no-install`, the dev shim's own convention.
- The layout imports the compiled file, so `@tailwindcss/vite` passes it through as an asset,
  hashed and route-split; the e2e spec's declaration assertion is the proof rather than the
  assumption.
- The failing-first half that chain B can run is static: the audit fails on the utility with the
  packaged sheet alone and passes with both sheets. The rendered assertions run at the ritual.

**Steps:**
- [ ] **Step 1: the failing assertion first.** Add the utility to the signups page and run
  `cairn-audit` with the packaged sheet alone: `no-uncompiled-class` fails on it; quote the
  finding. Do not build, preview, or drive a browser: the `admin-sheet-baseline.json` fixture is
  captured at the ritual, by the post-merge dispatch, from a throwaway worktree checked out at this
  pass's branch point and previewed on port 4273, before that dispatch runs the FULL string on the
  merged tree. Commit `e2e/admin-sheet.spec.ts` with a `test.skip` guard reading `existsSync` on
  the fixture, so the spec is inert in every gate until the ritual writes it.
- [ ] **Step 2:** the probe; the entry; the scripts; the config; the ignore line; the exclusion;
  the import; `check:cairn` passes; quote the run.
- [ ] **Step 3:** write `admin-sheet.spec.ts`; the `test.yml` step; `npm run emit:template`.
- [ ] **Step 4:** changelog (no consumer action; the recipe is the rewrite's). The CHECK-PLUS-UNIT
  gate. Commit. Declare `INTENDED MOVES:` as exactly the ten `admin-signups-*` files for the
  ritual's regen, declared from the grep of the signups snapshot directory rather than from a run;
  the ritual regen is the first measurement.

**Acceptance criteria:**
- The report quotes the failing finding from Step 1 and the passing run from Step 2.
- In a tree with `.cairn/` deleted, `npm --prefix examples/showcase run check` exits 0 (the
  `precheck` compile).
- `git status` after the gate shows no untracked build output; `npm run check:template` prints
  `emit-template-dir: OK`.
- The CHECK-PLUS-UNIT string, with the appended `check:cairn` step, exits 0.

**Gate:** CHECK-PLUS-UNIT. **Commit:** one, `feat(showcase): compile a site admin sheet and audit against it`.

---

## Task 8a: The scaffold wiring

**Chain:** B, second. **Paint:** no. **Depends on:** task 7.

**Deliverables: three.** The workflow the bake carries; the manifest permission with its test;
the dev shim's watch compile with its test, and the template regenerated.

**Files (8):**
- Create: `examples/showcase/.github/workflows/check.yml`
- Modify: `packages/create-cairn-site/src/github/manifest.mjs:58-63` (`workflows: 'write'`) and
  its test, `packages/create-cairn-site/scripts/bake-template.mjs:60` (`DEV_SHIM` spawns
  `npx --no-install @tailwindcss/cli -i src/admin.css -o .cairn/admin.css --watch` beside the vite
  child and kills it on exit), `packages/create-cairn-site/scripts/bake-template.test.mjs:128`,
  `docs/admin/create-your-site.md:60` (the consent-screen sentence names the workflow-file
  permission and why), `templates/waymark/**` (regenerated), `CHANGELOG.md`
- Not modified: `packages/create-cairn-site/scripts/bake-template.mjs:21-22`'s deny lists (the
  new scripts and dependency survive the bake with no edit; the lists throw on a missing key, so
  nothing is added by reflex); `docs/extend/add-cairn-to-a-sveltekit-app.md` (the manual path
  pushes no workflow).

**Interfaces:**
- Produces: `check.yml` with one job on `ubuntu-latest`: `actions/checkout`, `actions/setup-node`
  with `node-version: 22` (the template carries neither `.nvmrc` nor `engines`), `npm install`
  (the scaffold ships no lockfile; `emit-template.mjs:192` deletes it), `npm run check` (its
  `precheck` compiles the sheet), `npm run check:cairn`. No secrets, no browser, no `--rendered`.
  A commented final step for `npx cairn-guidance check` marked "enabled by a later cairn version".
  GitHub ignores the nested copy under `examples/showcase/`.
- Produces: a scaffolded site whose GitHub App holds `contents: write`, `administration: write`,
  `workflows: write` (and `members: read` for an org), whose first push carries the workflow, and
  whose `scripts/dev.mjs` compiles the admin sheet in watch mode.

**Steps:**
- [ ] **Step 1: the failing checks first.** The manifest test asserts the permission set including
  `workflows` and fails; the shim test asserts the watch spawn and fails; `check:template` fails on
  the new workflow file.
- [ ] **Step 2:** manifest, shim, workflow, the docs sentence; `npm run emit:template`.
- [ ] **Step 3:** changelog (no consumer action). The CHECK-PLUS-UNIT gate. Commit.

**Acceptance criteria:**
- `npm run check:template` prints `emit-template-dir: OK`; `npm --prefix packages/create-cairn-site test`
  green with the two new assertions named.
- `templates/waymark/.github/workflows/check.yml` and `packages/create-cairn-site/template/.github/workflows/check.yml`
  both exist after the bake.
- The CHECK-PLUS-UNIT string exits 0.

**Gate:** CHECK-PLUS-UNIT. **Commit:** one, `feat(create-cairn-site): wire the gates and the CI workflow`.

---

## Task 8b: The scaffold's proof and its docs

**Chain:** B, third. **Paint:** no. **Depends on:** task 8a.

**Deliverables: two.** The create-site CI assertions amended; the scaffold docs updated, with the
transcript re-capture as a stretch item.

**Files (5):**
- Modify: `.github/workflows/create-site.yml:105-107`, `:131-141` (assert `.github/workflows/check.yml`
  exists in the scaffolded site; keep `scripts/` at exactly `["dev.mjs"]`; assert `check:cairn`
  runs green after the build step), `packages/create-cairn-site/src/scaffold.mjs:224-252` (the
  handover text names `npm run check:cairn` and the workflow), `CHANGELOG.md`. **(2026-09-15
  amendment, docs-to-facts pass):** `docs/extend/what-the-scaffold-wrote.md` and
  `docs/admin/create-your-site.md` are frozen; instead file the container bullet(s) in
  `docs/internal/facts/extend.md` (the new workflow file and the `check:cairn:rendered` browser
  note) and `docs/internal/facts/admin.md` (the prose around the three quoted blocks). The
  reference arm is unaffected.
- Stretch: `packages/create-cairn-site/test/fixtures/transcripts/01*.txt` re-captured as real
  pty recordings. The harness lives outside the repo and needs a live GitHub App and repository
  creation. The fallback, which polish-11a shipped: leave the fixtures, add a dated staleness note
  in the transcripts README and a changelog line; `check:transcripts` compares docs to fixtures
  and stays green either way.

**Steps:**
- [ ] **Step 1: the failing assertion first.** The workflow-file assertion fails on the current
  scaffold.
- [ ] **Step 2:** the CI assertions, the handover text, the `docs/internal/facts/extend.md`
  bullet(s), and the `docs/internal/facts/admin.md` bullet(s).
- [ ] **Step 3:** the stretch re-capture or its fallback note; `npm run check:transcripts`.
- [ ] **Step 4:** changelog. The CHECK-PLUS-UNIT gate. Commit.

**Acceptance criteria:**
- `create-site.yml` and `scaffold.yml` green on the PR, with `check:cairn` visible in the
  create-site log.
- `npm run check:transcripts` green; the report states re-captured or fallback.
- The CHECK-PLUS-UNIT string exits 0.

**Gate:** CHECK-PLUS-UNIT. **Commit:** one, `test(create-cairn-site): assert the scaffolded gates`.

---

## Gate

Derived from the committed `.github/workflows/` at authoring; byte-identical to the motion pass's
derivation, since the only workflow change since is one comment line in `e2e.yml`. **Re-derive it
from the branch point before the first dispatch, and again after task 7 lands its `test.yml`
step.**

**The FULL string**, for tasks 3 and 4 and the ritual, run through `cairn-run-gate '<string>'` in
the worktree:

```
npm run package && npm run check && npm test && npx publint --strict && npx attw --pack . --ignore-rules no-resolution cjs-resolves-to-esm internal-resolution-error && node scripts/checks/check-package-files.mjs && node scripts/checks/check-skill-budget.mjs && node scripts/checks/reference-coverage.mjs && node scripts/checks/check-reference-signatures.mjs && node scripts/checks/check-surface.mjs && node scripts/checks/check-surface-leaks.mjs && node scripts/checks/check-self-use.mjs && node scripts/checks/check-custom-surface.mjs && npm run check:chassis-boundary && npm run check:cm-internals && npm run check:idioms && node scripts/checks/check-invisible-craft.mjs && node scripts/checks/check-admin-css-classes.mjs && node scripts/checks/check-readiness.mjs && npm run check:docs && npm run check:rulings-format && npm run check:target-stack && npm run check:arm-indexes && npm run check:editor-quotes && node scripts/checks/check-visuals.mjs && npm run check:transcripts && npm run check:symbols && node scripts/checks/check-snippets.mjs && npm run check:prose && npm run check:version && npm run check:dev-package && npm run check:template && node scripts/checks/check-consumers.mjs && npm run test:emit && npm --prefix packages/create-cairn-site run prepack && npm --prefix packages/create-cairn-site test && npm --prefix examples/showcase run check && npm --prefix examples/showcase run test:unit && npm --prefix examples/showcase run format:check && npm run check:vale && npm run check:comments && CI=1 npm --prefix examples/showcase run test:e2e
```

From task 7 on (chain B, and every ritual run), `&& npm --prefix examples/showcase run check:cairn`
is inserted immediately after `npm --prefix examples/showcase run check`.

**The CHECK-PLUS-UNIT string**, for tasks 1, 2, 5, 6, 7, 8a, and 8b, is the FULL string with the
trailing `&& CI=1 npm --prefix examples/showcase run test:e2e` removed and nothing else dropped.

**The reduced gate for a comment-only fix round**: `npm run check:comments && npm run check:symbols
&& npm run check:docs` plus the touched files' own unit tests.

`publint` and `attw` keep their `npx` prefix. The string builds once at the head and calls each
check at its node entry point. Left to CI deliberately: `design.yml` (blocking, this pass moves
admin markup), `norms.yml`, `scaffold.yml` and `create-site.yml` (blocking for 8a and 8b),
`tsgo.yml`, `publish.yml`.

## Rollback and halt semantics

- **After task 2, chain A:** mergeable; no engine screen changed.
- **After task 4:** the checkpoint; red on `e2e.yml` until the regen runs.
- **Task 4 is the cut candidate.** Its absence leaves every other deliverable intact; ROADMAP keeps
  the item and the report says so.
- **Chain B halted after task 7:** the showcase carries the seam, the template does not;
  mergeable, with 8a and 8b carried forward.
- **Chain B not merged:** `extend-1` merges without the seam; the `stylesheet-seam` ledger row is
  not written; the spec's Layer 2 row stays open.

## Pass-end ritual

0. The conductor's own first acts, in order: write STATUS for the checkpoint and the close; merge
   `extend-1-site` into `extend-1`, reconciling `CHANGELOG.md` by hand and re-running
   `npm run emit:template` on the merged tree; open the PR; push.
1. **The post-merge proof, one dispatch:** first, capture `e2e/fixtures/admin-sheet-baseline.json`
   from a throwaway worktree at this pass's branch point, previewed on port 4273, commit it, and
   remove the spec's `existsSync` guard; then the FULL string (with the `check:cairn` step) in the
   merged worktree, which runs `e2e/admin-sheet.spec.ts`; then
   `npm --prefix examples/showcase run check:cairn:rendered` over the engine's own admin screens,
   which must report no finding the packaged-sheet-only run did not; then the ten signups captures
   declared as task 7's `INTENDED MOVES:`. If the computed-style snapshot, the served-CSS digest,
   or the rendered audit fails, the chosen utility collides with an engine selector, and the fix
   round picks another utility and records which selector collided.
2. `code-simplifier` over the pass's commits; apply; re-run the gate.
3. The FULL gate green in one uninterrupted run, in the npm-script form.
4. The six CI-only gates confirmed green inside that run.
5. The from-scratch consumer build: a fresh `npm install` in `examples/showcase`, build, e2e.
6. `design.yml`, `scaffold.yml`, and `create-site.yml` green on the PR.
7. The pass-end CI regen, `gh workflow run e2e.yml --ref extend-1 -f update_snapshots=true`; read
   the diff against the union of every `INTENDED MOVES:` declaration; an undeclared move is
   blocking.
8. The fresh-context `visual-verifier` over the signups screen (before at the parent commit, after
   at HEAD, five widths, both schemes) and one tooltip surface, as separate labeled blocks.
9. The reviewer fan-out named in the ceiling; the a11y reviewer's read of `Tooltip` is blocking.
10. The `stylesheet-seam` ledger row, if task 6 deferred it. Docs: `check:reference` green with
    `docs/reference/log.md`; the changelog window finalized under `## Unreleased`; no version bump.
11. HISTORY entry, STATUS (present tense, under sixty lines), ROADMAP as task 6 left it; the record
    file. Score both budgets.
12. Merge on green CI. Close the session; extend-2 waits on the docs rewrite.

## What this pass hands forward

- **To the docs rewrite:** the two recipe pages the exemplar headers name; the stylesheet-seam
  recipe with the utilities-only rule, the forbidden-include clause, and the probe's answer on the
  compile tool; the "Available since" opening line on every recipe page; `docs/reference/log.md`
  as the page the logger recipe links.
- **To extend-2:** the six `cairn-guidance check` report items and their snippets (the workflow
  under `examples/showcase/.github/`, task 7's scripts and config, the import line, the
  exclusion, the guidance tree); the workflow's commented final step to enable; the ledger
  execution of the retired doctor row; the `cairn-btn-guarded` report line from the record file.
- **To a later pass:** the removal of `cairn-btn-guarded` from the sheet and the four sites, with
  its budget edit and the re-homing of `pointer-events: auto` and the ghost fill into the
  Tooltip's own styles; the media library's selection pattern migrating onto `AdminTable`'s
  additive shape, if a second screen wants it.
- **To the Go tool's 2.0:** a health check reading `.claude/cairn/VERSION` against the installed
  package, if guidance staleness is worth surfacing there.

## Post-mortem

Written at the close: tokens against 6.7M, the planning-miss and execution-sitting counts, what the
gate caught, and what a later pass would be wrong to rediscover.
