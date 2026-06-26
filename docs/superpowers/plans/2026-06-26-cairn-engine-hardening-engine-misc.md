# Engine hardening, Plan 2: engine-misc hardening

> **For agentic workers:** Execute task-by-task. Execution is a workflow in this session, on one feature
> worktree off `main`. The tasks are independent (each touches a distinct file), so the order is free, but
> they run as a sequential `cairn-implementer` chain: one verified dispatch at a time in the shared
> worktree, never concurrent commits (a shared git index cannot take parallel commits). The two
> version-sensitive tasks (Task 6 the `check:dev-package` script, Task 8 the lockfile + 0.68.0 bump) run
> last. The main loop reviews each diff and clears the full gate before the next dispatch. Steps use
> checkbox (`- [ ]`).

**Goal:** Clear the verified engine-misc hardening backlog: an accessibility and design-system fix, a
component-authoring DX gap, three gate/doc-hygiene items, and a cosmetic sync, each surfaced and located
by the 2026-06-26 verification sweep.

**Architecture:** Eight independent changes across distinct files. No shared design; each is its own
deliverable with its own verification surface.

**Tech Stack:** Svelte 5 (runes), TypeScript, the admin CSS layer, the Node check scripts, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-26-cairn-engine-hardening-design.md`. Before any `/admin`
`.svelte` or `cairn-admin.css` change (Tasks 1-2), read `docs/internal/admin-design-system.md`.

## Global Constraints

- Every exported symbol gets a minimal one-line TSDoc; no `{type}` tags; no em dash in comments.
- `.svelte` and CSS changes follow `docs/internal/admin-design-system.md`: `data-theme` on a bare
  wrapper, scoped overrides in `@layer components`, the dialog-sizing recipe.
- The full gate before each task is "done": the task's targeted test (or named gate) passes, `npm run
  check` 0/0, `npm test` exit 0, and `npm run check:comments`. The doc gates (`check:reference`,
  `check:reference:signatures`, `check:package`, `check:docs`, `check:version`) and the
  `daisyui-a11y-reviewer` + `svelte-reviewer` fan-out for the `/admin` UI tasks (1-2) run at the pass-end
  review gate.
- The worktree needs `npm run package` before `npm test`. A graph-changing `package.json` edit (Task 6
  adds a script, not a dependency) needs no lockfile regeneration; Task 8 owns the lockfile version sync.

---

### Task 1: Component picker dialog 85vh cap

**Files:**
- Modify: `src/lib/components/ComponentInsertDialog.svelte:319-320` (the `modal-box`)
- Modify: `src/lib/components/cairn-admin.css` (the scoped `modal-box` height rule, `@layer components`)
- Modify: `docs/internal/admin-design-system.md` (if the dialog recipe needs the picker named)

**Verification:** the existing component test (`ComponentInsertDialog` if present) plus a new assertion
that the box carries the capped-height class; `daisyui-a11y-reviewer` at the gate.

- [ ] **Step 1** Read `docs/internal/admin-design-system.md:180-188` (the dialog-sizing recipe:
  `max-height: min(content, 85vh)`, the box as scroll container, no page takeover).
- [ ] **Step 2** Add the capped-height rule to the picker's `modal-box` (a scoped class in
  `@layer components`, or the design system's existing dialog class if one exists), so the box insets and
  scrolls within rather than filling the viewport. The palette shares the rule.
- [ ] **Step 3** Add/extend a component test asserting the box carries the height-capped class (mount the
  dialog with a tall catalog, assert the class/style). Run the `component` project.
- [ ] **Step 4: Commit** — `git commit -m "fix(admin): cap the component picker dialog height per the design system"`

---

### Task 2: Error live-region re-announce

**Files:**
- Modify: `src/lib/components/ConceptList.svelte` (the lifecycle error containers at `:232`, `:235`, `:241`)
- Test: `src/tests/component/ConceptList.test.ts`

**Verification:** a component test asserting the error region is `aria-live` and re-announces a repeated
identical error; `daisyui-a11y-reviewer` at the gate.

- [ ] **Step 1: Write the failing test** — assert the lifecycle error renders in a polite live region
  that re-announces when the same error fires twice (model on the `MediaPicker` settle-cue precedent: a
  keyed/cleared-then-set region, or an assertive re-announce technique the design system documents).
- [ ] **Step 2** Convert the static `role="alert"` error container(s) to a polite `aria-live` region that
  re-announces a repeated error (clear-then-set on a microtask, or a count-keyed node), per the admin
  design system's live-region guidance.
- [ ] **Step 3** Run the `component` test, verify PASS.
- [ ] **Step 4: Commit** — `git commit -m "fix(admin): re-announce a repeated lifecycle error in a live region"`

---

### Task 3: `ComponentDef.icon` guidance + engine default role-icon table

**Files:**
- Modify: `src/lib/render/registry.ts:97` (the `icon` contract JSDoc) and the `defaultIconByRole` lookup area
- Modify: `docs/superpowers/specs/2026-06-15-cairn-component-picker-design.md:97` and `docs/reference/components.md`
- Test: `src/tests/unit/registry*.test.ts`

**Interfaces:**
- Produces: an engine-shipped default role-to-icon fallback table (the ROADMAP assumed one exists; it does
  not). The registry resolves a role's icon as: the adapter's `defaultIconByRole[role]`, then the engine
  default table, then undefined. Plus the "logically representative, prefer distinct" authoring guidance.

- [ ] **Step 1: Write the failing test** — assert a known role resolves to the engine default glyph when
  the adapter supplies no `defaultIconByRole` for it.
- [ ] **Step 2** Add a small engine default `ROLE_ICON` table (role → glyph-key) and fold it into the
  resolution at `registry.ts` (after the adapter map, before undefined). Update the `icon` JSDoc and the
  picker spec to require a logically-representative icon (prefer distinct across the registry, accept a
  duplicate over an illogical choice). Add the guidance to `docs/reference/components.md`.
- [ ] **Step 3** Run the targeted test (PASS) and `npm run check:reference` (the new/changed exports
  documented).
- [ ] **Step 4: Commit** — `git commit -m "feat(render): ship default role icons and ComponentDef.icon guidance"`

---

### Task 4: Fill the empty `rehype-dispatch` JSDoc

**Files:**
- Modify: `src/lib/render/rehype-dispatch.ts:5-7` (`isElement`), `:24-26` (`strProp`)

**Verification:** `npm run check:comments` passes with substance (not just a passing empty shell).

- [ ] **Step 1** Replace the empty `/** */` shells on `isElement` and `strProp` with a real one-line
  contract each (what it returns / its guard purpose), per TSDoc; no `{type}` tags, no em dash.
- [ ] **Step 2** Run `npm run check:comments`, verify it passes.
- [ ] **Step 3: Commit** — `git commit -m "docs(render): document the rehype-dispatch helpers"`

---

### Task 5: Close the admin-prose gate blind spot

**Files:**
- Modify: `scripts/check-admin-prose.mjs` (the extractor)
- Test: `scripts/*` test or a fixture proving a tell in a `.ts` copy module is now caught
- Reference: `src/lib/components/markdown-reference.ts`, `src/lib/components/editor-shortcuts.ts`

**Verification:** the extractor now scans `<script>`-level string arrays and the `.ts` copy modules; a
planted tell in one of them fails `check:prose`.

- [ ] **Step 1: Write the failing case** — a fixture (or a temporary planted string) with a known tell in
  a `.ts` copy module; assert `check:prose` flags it (today it does not).
- [ ] **Step 2** Extend the extractor to read the string-literal copy in the named `.ts` modules (and
  `<script>`-level string arrays), feeding that text through the same prose checks.
- [ ] **Step 3** Run `npm run check:prose`, verify the planted tell is caught and the real copy is clean;
  remove the planted fixture.
- [ ] **Step 4: Commit** — `git commit -m "build(prose): extend the admin-prose gate to .ts copy modules"`

---

### Task 6: The owed `check:dev-package` gate

**Files:**
- Create: `scripts/check-dev-package.mjs` (a tsc pass + comment lint over `packages/**`)
- Modify: `package.json` (add the `check:dev-package` script) — SERIALIZE this task against any other
  `package.json` writer
- Modify: `.github/workflows/*.yml` (wire the gate into CI, beside the existing checks)

**Verification:** `npm run check:dev-package` passes over the current `packages/**`; it is wired into CI.

- [ ] **Step 1** Write `scripts/check-dev-package.mjs` running `tsc --noEmit` over the dev package plus the
  comment lint (the same ESLint TSDoc + em-dash config the engine uses), failing on any error.
- [ ] **Step 2** Add `"check:dev-package": "node scripts/check-dev-package.mjs"` to `package.json` scripts
  and wire it into the CI workflow that runs the other `check:*` gates.
- [ ] **Step 3** Run `npm run check:dev-package`, verify it passes on the current `packages/**`.
- [ ] **Step 4: Commit** — `git commit -m "build: add the check:dev-package gate over packages/**"`

---

### Task 7: Triage and prune the friction log

**Files:**
- Modify: `docs/internal/docs-friction-log.md`

**Verification:** a re-read confirms every killed or shipped item carries a resolution annotation, so the
log no longer resurfaces dead work (the writing-coach entry at `:420-426` being the trigger).

- [ ] **Step 1** Annotate as resolved, in place: the point-of-typing coach (killed, 2026-06-23 help-shell
  review); the five items the 2026-06-26 sweep verified shipped (manifest-bin `config.root`, render
  attribute-sink hardening, admin-render DOM gate, editor link-picker narrowing, create-form slug
  preview); and `supportContact`'s base field (shipped Pass 1; only a richer shape remains). Mark each
  with a short "Resolved (verified <date>): ..." line; do not delete the entries (the log is append-only
  history).
- [ ] **Step 2** Run `npm run check:docs` (no dead links introduced).
- [ ] **Step 3: Commit** — `git commit -m "docs: triage the friction log so it stops resurfacing resolved work"`

---

### Task 8: Bump to 0.68.0 and sync the lockfile self-version

**Files:**
- Modify: `package.json` (`version` → `0.68.0`)
- Modify: the ROOT `package-lock.json` self-version (NOT `examples/showcase/package-lock.json`): the
  top-level `version` (~line 3) and `packages[""].version` (~line 10), both lagging at `0.64.0`

**Verification:** `npm run check:version` reports OK (a clean minor bump from `0.67.0`); `npm run
check:package` passes; `git diff package-lock.json` shows only the two self-version lines changed.

- [ ] **Step 1** Set `package.json` `"version"` to `"0.68.0"`. Set the two self-version fields in the root
  `package-lock.json` (the top-level `version` and `packages[""].version`) from `0.64.0` to `0.68.0`. Do
  NOT regenerate the lockfile and do NOT run `npm install` (it would disturb the symlinked
  `node_modules`); the graph is unchanged, so edit only the three self-version strings.
- [ ] **Step 2** Run `npm run check:version` (expect OK, minor) and `npm run check:package`. Confirm `git
  diff package-lock.json` touches only the two self-version lines.
- [ ] **Step 3: Commit** — `git commit -m "build: bump to 0.68.0 and sync the lockfile self-version"`

---

## Self-review

- **Spec coverage:** picker dialog sizing (Task 1), error live-region (Task 2), `ComponentDef.icon` +
  engine defaults (Task 3), rehype-dispatch JSDoc (Task 4), admin-prose gate blind spot (Task 5),
  `check:dev-package` (Task 6), friction-log prune (Task 7), lockfile sync (Task 8). The `checkOrigin`
  watch is no-action this pass (tracked in the spec and ROADMAP). The feature initiatives stay out of
  scope per the spec.
- **Placeholders:** the UI tasks (1-2) describe the live-region/sizing technique and point at the design
  system rather than inlining final markup, because the exact recipe lives in
  `admin-design-system.md`; the implementer reads it first. Every other task carries concrete steps.
- **Independence:** each task touches distinct files; only Task 6 writes `package.json`, so it serializes
  against other writers (none here). Safe to parallelize the rest.

## Execution

A workflow in this session, on one worktree off `main`. The tasks are independent but run as a sequential
`cairn-implementer` chain (one verified dispatch at a time; a shared worktree cannot take concurrent
commits), with the version-sensitive Tasks 6 and 8 last. Each task clears the full gate before the next
dispatch; the doc gates and the `daisyui-a11y-reviewer` + `svelte-reviewer` fan-out (Tasks 1-2) run at the
pass-end review gate. The worktree needs `npm run package` before `npm test`. This pass follows Plan 1
(validator parity); the Contract v2 cutover follows both and is gated on Geoff's review (it is breaking and
high-blast-radius).

---

## Post-mortem (2026-06-26, shipped as 0.68.0)

**What was built.** All eight engine-misc items landed on the `feat/engine-hardening-engine-misc`
worktree. The picker dialog caps at 85vh as a flex column with a scrolling body (Task 1); a repeated
content-lifecycle error in `ConceptList` re-announces through one polite live region via a zero-width
nonce, with the visible boxes dropping `role="alert"` (Task 2); the component registry ships a
module-private `DEFAULT_ICON_BY_ROLE` fallback consulted by `defaultIcon` only for a def with an icon
field, plus the "logically representative, prefer distinct" guidance (Task 3); the two `rehype-dispatch`
helpers gained real JSDoc (Task 4); the admin-prose gate scans the two `.ts` copy modules through a fixed
allowlist (Task 5); a new `check:dev-package` gate type-checks and comment-lints `packages/**` in CI,
which surfaced and fixed 21 real TSDoc errors plus 4 missing docs in the dev-package (Task 6); the
friction log marks its killed and shipped items resolved (Task 7); and the version bumped to 0.68.0 with
the lockfile self-version synced from its 0.64.0 lag (Task 8).

**Execution note (the hang).** The pass started as a sequential `cairn-implementer` workflow chain, but
the Task 2 agent stalled for hours: its first live-region `$effect` looped (`effect_update_depth_exceeded`,
an unconditional state-write), and the agent got stuck retrying the failing browser component tests. The
workflow was stopped and recovery moved to the main loop. The loop was fixed by bumping the nonce only on
a changed submit identity, guarded by a plain non-reactive `lastSubmit`. The remaining tasks ran as
monitored one-at-a-time dispatches (Tasks 3, 5, 6) plus direct main-loop edits for the trivial ones (4, 7,
8), which avoided the unmonitored-hang risk. Lesson: a browser-component task in a fire-and-forget chain
can hang unbounded on a reactivity bug; keep those dispatches monitored.

**Review gate.** `svelte-reviewer` confirmed the anti-loop `$effect` guard and the nonce pattern are sound
Svelte 5 (no blockers). `daisyui-a11y-reviewer` caught one real blocker the Task 1 component test missed:
the cap lived in a `@layer components` `.cairn-pk-box` rule, which loses the cascade to DaisyUI's
`@layer utilities` `.modal-box { max-height: 100vh }`, so the cap never bound. Fixed by moving the cap to
Tailwind utilities on the box (`flex max-h-[85vh] flex-col overflow-hidden`), matching the shipped
`TidyReview.svelte` precedent, verified against the compiled dist CSS. Both reviewers' smaller findings
(an inert `aria-label` on the roleless refusal banner, a stale comment) were folded, and the refusal
announcement now carries the blocker count so a screen reader hears the magnitude. A `code-simplifier`
pass extracted one shared `lettersOnly` helper in the prose gate.

**What was verified (evidence).** `npm test` exit 0 (2533 tests, 238 files); `npm run check` 0/0;
`check:comments`, `check:prose` (clean, 33 components), `check:dev-package` (0), and the doc gates
(`check:reference`, `check:reference:signatures`, `check:package`, `check:docs`, `check:version` minor)
all green. Re-gated after the review fixes and the simplifier dedup.

**Decisions locked.** The icon fallback is module-private (not exported), so `defaultIcon`'s signature is
unchanged and the reference gates need no edit; the glyph keys are a documented convention a site's IconSet
may satisfy. The picker cap matches the `TidyReview` utility-class pattern deliberately, since beating a
DaisyUI utilities-layer default needs a utilities-layer rule (a scoped design-token override still belongs
in `@layer components`; this is the exception). Roles stay free strings (no union).

**Carry-forwards.** The a11y reviewer's should-fix: the picker cap is an unconditional 85vh with no
small-viewport bottom-sheet relaxation (the `TidyReview` precedent it matches is also unconditional). The
inner body scrolls, so it is functional, not a failure; the bottom-sheet treatment the Media Library
slide-over uses is the richer fix. Logged to the friction log for a later admin-a11y pass.

**Commits.** `0a96192` (Task 1), `6999354` (Task 2 + loop fix), `4293a6f` (Task 4), `86cfccb` (Task 7),
`89e7d24` (Task 3), `4e9455e` (Task 5), `9d9ec27` (Task 6), `03e48c8` (Task 8 + changelog), `2438119`
(review fixes: cap cascade + a11y), `9319537` (simplifier dedup).

**Blockers.** None. Next: the Contract v2 cutover, drafted and gated on Geoff's review (breaking,
high-blast-radius; no hurry per Geoff).
