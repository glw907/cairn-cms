# Conformance Pass (4b) Implementation Plan

> **For agentic workers:** execute through the `cairn-implementer` chain per task
> (implementer, `diff-reviewer`, full gate), workflow mode via
> `~/.claude/workflows/pass-execute.js` with **`parallel: false` — every task writes
> `CHANGELOG.md`, most regenerate `docs/internal/api-surface.md`, and several close entries in
> one ledger file; execution is strictly sequential.** Steps use checkbox (`- [ ]`) syntax for
> tracking.

**Goal:** Execute the cross-surface conformance sweep the conventions pass unblocked: the 25
Tier 1 media-janitorial retires plus the `UsageEntry` inline, the twelve routed reshapes, the
ten remaining log-event evenness fixes, the two audit registry-rule repairs, the five
`rendered.*` identifier renames, and the `variants` evidence sweep, all against 4a's merged
surface, batched into the standing `Consumers must:` window.

**Architecture:** This is audit-remediation slice 4b (initiative design
`docs/superpowers/specs/2026-08-27-audit-remediation-initiative-design.md`; routing list in
`docs/superpowers/plans/2026-08-30-conventions-pass.md`, "What this pass unblocks and hands
to 4b"). Every item executes a pre-existing, verify-confirmed audit verdict or a ruling from
Geoff's 2026-08-31 sitting; where rank and verify disagree, **the verify record wins** (the
stated conductor default, unobjected). The compiled evidence is the banked docket and usage
map at `docs/internal/record/2026-09-01-4b-planning-inputs/`; the sweep found **zero consumer
usage for all 25 Tier 1 symbols and 7 of the routed symbols**, so most retires carry no
consumer-breakage risk. This plan absorbs a two-round adversarial review before dispatch
(round 1 `engine-triage` plus `web-auth-security-reviewer` for the Task 5 auth surface; fold;
round 2 `engine-triage` verification of the folded revision); dispositions land in the
review-folds section at the end.

**Tech Stack:** TypeScript 6 / SvelteKit 2 / Svelte 5 runes; Vitest; the repo gate
(`npm run check` 0/0, `npm test` exit 0, plus the CI-derived gate list).

**Spec:** `docs/internal/record/2026-09-01-4b-planning-inputs/docket.md` (per-item shapes,
rank/verify citations, and the sitting's rulings) with
`docs/internal/record/2026-09-01-4b-planning-inputs/usage-map.md` (consumer evidence);
verdicts close in `docs/internal/engine-rulings.md`.

**Worktree:** `.claude/worktrees/conformance`, branched from `main` (4a merged at
`bc960fec`, so `main` carries the ruled conventions this pass builds against). After creating
it, run a from-scratch `npm ci` in `examples/showcase` before trusting any e2e (the worktree
showcase symlink gotcha, `CLAUDE.md`).

**Token ceiling:** 6M for the WHOLE pass (chains plus ritual; sized between the retires
pass's 4.6M actual, which this pass's Task 1 resembles, and 4a's 6.9M actual, which was
heavier per task than anything here). **Checkpoint interval:** every four tasks (STATUS
written at each checkpoint, at any split, and before any question).

## The sitting's rulings (Geoff, 2026-08-31; restated from the docket per its own instruction)

1. **`UsageEntry`: RETIRE AND INLINE.** The element shape inlines into `ContentFormFailure`'s
   `usage` field (or goes module-internal); the export drops. The consumer recovery is
   indexing off `ContentFormFailure` (`NonNullable<ContentFormFailure['usage']>[number]`).
2. **`PublishActionsConfig`: WIDEN to both aliases.** `ResolvedPublishAction` rides;
   verify-adapter-concept-model finding 9 is the authorization; zero consumer usage.
3. **`rendered-*` harness ids: SETTLED AT PLAN AUTHORING.** Fresh derivation from
   coherence-v2 C16 plus `src/lib/audit/rendered.ts` (five constants, not C16's four); the
   exact rename set is in Task 13 below; no code runs on an unsettled list.
4. **Inert `variants` field: 4B, EVIDENCE-FIRST.** A config-key sweep across consumer
   configs first; retire if nothing sets it, keep-and-document if something does (Task 14).

Conductor defaults stated at the sitting and unobjected: **`UploadResult` executes the
VERIFIED retire** (the verify-wins rule; the ranked reshape-and-relocate to `/media` is
overturned by `verify-route-factories.md:126`), and **the `normalizeAssets` task is written
off the verify-corrected shape** (the rank note's `runtime.resolvedAssets` alternative is
circular-import-blocked; the propagation vector is the scaffold template, not the sites).

## Global Constraints

Carried from the 4a plan (same initiative, same window); every task inherits them.

- Test-first. The full gate is `npm run check` 0/0 plus `npm test` exit 0 plus the CI-derived
  gate list re-derived from `.github/workflows/` before the first commit, never from memory.
- `check:surface -- --update` on any exported-type change, regenerated snapshot committed in
  the same task.
- Every public-API change updates its reference page in the same task; re-verify page lists
  with grep before editing.
- Every task adds its `CHANGELOG.md` line under `## Unreleased`, with a `Consumers must:`
  line where consumer action is needed. Renames batch into the window; no version bump, no
  publish. **The window must stay self-consistent: a task that re-introduces or re-shapes a
  name an earlier unpublished entry retired or instructed against AMENDS that earlier entry
  in the same task.**
- A task executing a verdict closes (or progress-notes) its `docs/internal/engine-rulings.md`
  entry in the same task, with the one-line seam-fit report on accepts. A partially executed
  entry gets a progress note in the same task, always.
- Drift-hunt scope for every removed or renamed name: `docs/`, `src/` (comments),
  `examples/`, `packages/`, `templates/` (verification only, next bullet), and `skills/`
  (ships in the tarball). The reference-coverage gate does not catch a stale inbound link;
  grep for the old name AND its reference anchor.
- **`templates/waymark` is a GENERATED artifact and is never hand-edited** (the showcase is
  the single source; `scripts/build/emit-template.mjs`, wired as `npm run emit-template`).
  A task whose changes reach the template edits `examples/showcase`, regenerates, and commits
  the regenerated tree. `check:template` and `check:consumers` are both part of every task's
  gate.
- **"Retire" means removal from the public surface** (export rows drop from every barrel and
  the export map), not deletion of engine-internal code: a type still consumed in-process
  goes internal in the module that needs it, per the retires-pass precedent.
- **Line anchors in this plan are pre-pass anchors against `main` at `bc960fec`.** Tasks
  editing a file an earlier task already touched treat anchors as symbolic (the named
  construct, not the line); only a file this pass touches once may be navigated by line.
- The changes are type-level and name-level only where stated; behavior changes are called
  out explicitly per task and nowhere else.
- **The consumer usage map is the ratification evidence.** Where a task's item has live
  consumer usage (`normalizeAssets` all five repos, `strAttr` four, `StatusChip` and
  `OfficeList` two and one, `MediaEntry` ASC tests), the task states the surviving contract
  explicitly and its acceptance criteria hold that contract fixed; no keep-to-retire flip
  without Geoff (none of the 25 Tier 1 items is a flip; `UploadResult`'s rank/verify
  divergence is resolved by the stated conductor default).

---

### Task 1: The Tier 1 retires (25) and the `UsageEntry` inline

**Files:**
- Modify: `src/lib/sveltekit/content-routes.ts`, `src/lib/sveltekit/content-routes-media.ts`,
  `src/lib/sveltekit/index.ts` (export rows), `src/lib/media/orphan-scan.ts`,
  `src/lib/media/bulk-delete-plan.ts`, `src/lib/media/usage.ts`,
  `src/lib/components/media-upload-outcome.ts` (internalized `UploadResult` import path),
  the root barrel `src/lib/index.ts`, `package.json` export map only if a subpath empties
  (not expected)
- Modify: `docs/internal/api-surface.md` (regenerated), the reference pages that list the 26
  names (grep-derive; expect `docs/reference/sveltekit.md`, `docs/reference/media.md`,
  `docs/reference/delivery-data.md`), `CHANGELOG.md`, `docs/internal/engine-rulings.md`
- Test: the existing suites must stay green; add or update the compile-only fixture proving
  every replacement expression the CHANGELOG names (retires-pass precedent)

**Interfaces:**
- Produces: a public surface without the 25 Tier 1 names or `UsageEntry`;
  `ContentFormFailure.usage` carrying an inline element shape (or a module-internal type);
  Task 2 relies on `UploadResult` being gone from `/sveltekit` when it drops `MediaEntry`'s
  re-export there.

- [ ] **Step 1:** Re-verify the 25-name list against `docs/internal/record/2026-09-01-4b-planning-inputs/docket.md`
  §1 and grep each name's current export rows. `UploadResult` executes the **verified flat
  retire** (docket §1's overturn flag): its export rows drop everywhere; the type moves
  internal beside its one in-process consumer chain
  (`src/lib/components/media-upload-outcome.ts` imports it from
  `../sveltekit/content-routes.js`; keep a non-exported type or an internal module path, no
  behavior change).
- [ ] **Step 2:** Execute the 25 retires in up to three family-batched commits
  (media-janitorial plan/result types; failure/result types; the remainder), removing export
  rows from every publishing barrel. Engine-internal consumers keep the shapes as internal
  types.
- [ ] **Step 3:** Execute the `UsageEntry` inline per sitting ruling 1: the element shape
  inlines into `ContentFormFailure`'s `usage` member (or stays a non-exported named type in
  its defining module, implementer's choice on readability); every `UsageEntry` export row
  drops; in-engine consumers (`src/lib/media/usage.ts`, the media failure paths) repoint.
- [ ] **Step 4:** Drift-hunt all 26 names across the full scope (including `skills/` and
  `packages/`); repoint or rewrite every hit. Run `check:surface -- --update` and commit the
  regenerated snapshot; update the reference pages; verify with `check:reference`,
  `check:reference:signatures`, `check:docs`, `check:snippets`.
- [ ] **Step 5:** CHANGELOG entries: one line for the Tier 1 batch (breaking; the
  `Consumers must:` line states no action — zero usage everywhere, with the 907-life
  `^0.84.4` staleness caveat recorded per the usage map) and one for `UsageEntry`
  (`Consumers must: index the element type off the carrier —
  NonNullable<ContentFormFailure['usage']>[number]`). Close the 26 ledger entries with
  seam-fit lines; note the `UploadResult` verify-wins resolution in its entry.
- [ ] **Step 6:** Full gate; commit.

**Acceptance criteria:** surface diff shows exactly the 26 names' rows removed, 0 added,
0 modified beyond the `ContentFormFailure.usage` member type; `media-upload-outcome.ts`
compiles against the internal shape; every gate in the CI-derived list green; ledger
partition arithmetic still reconciles (the docket's tiers).

---

### Task 2: Publication prunes and alias retires

**Files:**
- Modify: `src/lib/index.ts:27` (drop `AuthBranding` from the root re-export row),
  `src/lib/sveltekit/index.ts:111-113` (its canonical-home comment and row),
  `src/lib/sveltekit/publish-actions.ts:23,29` (both aliases),
  the `/sveltekit` barrel row re-exporting `MediaEntry`, and every module typing
  `editor.publishActions`
- Modify: `docs/internal/api-surface.md` (regenerated), affected reference pages
  (grep-derive: `core.md`, `sveltekit.md`, `media.md`, `publish-actions` sections),
  `CHANGELOG.md`, `docs/internal/engine-rulings.md`

**Interfaces:**
- Consumes: Task 1's surface (`UploadResult` gone — `verify-route-factories.md:137` calls
  the `MediaEntry` re-export drop "cleaner once rank 38 retires").
- Produces: `AuthBranding` published from `/sveltekit` only; `MediaEntry` published from
  `/media` only; `PublishActionEntry[]` typed directly wherever the aliases stood.

- [ ] **Step 1:** `AuthBranding`: keep the type in `src/lib/email.ts`; the `/sveltekit`
  barrel becomes its only publication (its `AuthRoutesConfig.branding` member is the one
  public signature naming it); the root-barrel row drops and the canonical-home record
  updates (`check:surface`'s canonical-home rule; the recorded R4 re-export row for the root
  leaves the record).
- [ ] **Step 2:** `MediaEntry`: drop the `/sveltekit` re-export row; `/media` remains the
  single home. ASC's usage imports from `/media` (usage map §3) and is untouched.
- [ ] **Step 3:** Retire both aliases: `type PublishActionsConfig = PublishActionEntry[]`
  and `type ResolvedPublishAction = PublishActionEntry` (sitting ruling 2). Type the
  adapter's `editor.publishActions` member and `resolvePublishActions`' signature as
  `PublishActionEntry[]` directly.
- [ ] **Step 4:** Drift-hunt the three retired/moved names full-scope; surface regen;
  reference pages; CHANGELOG (breaking, `Consumers must:` per name — `AuthBranding` moves
  import to `/sveltekit`; the aliases' recovery is `PublishActionEntry[]`); ledger closes
  (the `AuthBranding` entry notes the ASC comment mention is decorative, per verify).
- [ ] **Step 5:** Full gate; commit.

**Acceptance criteria:** `AuthBranding` and `MediaEntry` each publish from exactly one
subpath; neither alias name appears anywhere in `src/`; `check:surface`'s canonical-home
record carries no stale rows for the three names.

---

### Task 3: CairnHistory's two owed reshapes (`lastSavedAt`, `formatTimestamp`)

**Files:**
- Modify: `src/lib/sveltekit/types.ts:130-135,169-173` (both fields and both compensating
  comments), `src/lib/components/CairnHistory.svelte:33,48-54`,
  `src/lib/admin-toolkit/format.ts` (`formatTimestamp`)
- Modify: regenerated surface, reference pages (`sveltekit.md` for `RevertFailure`,
  `admin-toolkit.md` for `formatTimestamp`), `CHANGELOG.md`, ledger
- Test: unit coverage for the re-derived `formatTimestamp` input domain; the component tests
  that exercise `CairnHistory`'s version list

**Interfaces:**
- Produces: `RevertFailure` with a single truthfully named `lastSavedAt` field where
  `startedAt`/`draftStartedAt` stood; `formatTimestamp(input)` accepting any
  `Date`-parseable timestamp (ISO with offset included), `FormatTimestampOptions` unchanged.

- [ ] **Step 1:** Rename both self-admitted-wrong-name fields to `lastSavedAt` and delete
  the two "the field keeps its name for API stability" comments (`types.ts:130-135`,
  `:169-173`, verified verbatim by the audit). Update `CairnHistory.svelte:33`'s declared
  `form?: RevertFailure | { error: string } | null` usage sites.
- [ ] **Step 2:** Re-derive `formatTimestamp` (`format.ts:96`) to accept any
  `Date`-parseable timestamp instead of the SQLite-shaped
  `sqliteDatetime.replace(' ','T')+'Z'` bake-in, preserving backward acceptance of the
  SQLite shape (D1 rows keep flowing through it) and the deliberate `timeZone` zone-pin
  behavior (the SSR/hydration mechanic the verify note confirms is real). Write the failing
  tests first: SQLite shape, ISO-with-offset, ISO-UTC, nullish input.
- [ ] **Step 3:** Delete `CairnHistory.svelte:48-54`'s hand-rolled `formatVersionDate` and
  route it through the reshaped `formatTimestamp`, proving the widened input domain on
  cairn's own screen.
- [ ] **Step 4:** Docs, surface regen, CHANGELOG (breaking rename; `Consumers must:` states
  the field rename — zero live usage per the usage map, entry says so), ledger closes.
- [ ] **Step 5:** Full gate; commit.

**Acceptance criteria:** no `startedAt`/`draftStartedAt` member remains on `RevertFailure`;
`formatVersionDate` is gone; `formatTimestamp` tests cover both input shapes plus nullish;
the zone-pin behavior is asserted, not just preserved.

---

### Task 4: `TidyClient` narrowed to an engine-owned interface (rides: log rank 14)

**Files:**
- Modify: `src/lib/sveltekit/content-routes-context.ts:32-67` (the transcribed SDK wire
  shape), the tidy action path that emits `tidy.succeeded`, the SDK adapter call site
- Modify: regenerated surface, `docs/reference/` page documenting `TidyClient`,
  `docs/reference/log-events.md` (`tidy.succeeded`'s `usage` row), `CHANGELOG.md`, ledger
- Test: the tidy action's unit/integration coverage re-pointed at the narrow interface; a
  fake client implementing it

**Interfaces:**
- Produces: `TidyClient` as a narrow engine-owned contract — take a prompt and a system
  string, return corrected text plus a coarse engine-owned usage record (input/output token
  counts, nothing vendor-shaped) — with the Anthropic SDK adapter kept internal.
  `tidy.succeeded` emits that same coarse record, never the raw SDK `Usage` object.

- [ ] **Step 1:** Author the narrow interface in place of the transcribed wire shape
  (`max_tokens`, `output_config.effort`, `stop_reason`, `usage.input_tokens` all leave the
  public contract; a vendor field rename stops being a cairn break). The engine wraps: the
  injectable-fake property survives, per the verify note.
- [ ] **Step 2:** Move the SDK-specific mapping into an internal adapter; the engine's tidy
  path consumes only the narrow contract.
- [ ] **Step 3:** Log rank 14: `tidy.succeeded`'s `usage` field carries the coarse record;
  update the reference table row in the same edit.
- [ ] **Step 4:** Docs, surface regen, CHANGELOG (breaking for any site that hand-built a
  `TidyClient`; `Consumers must:` states the new contract — zero usage per the sweep, entry
  says so), ledger closes (rank 33 and log rank 14 both).
- [ ] **Step 5:** Full gate; commit.

**Acceptance criteria:** no `@anthropic-ai/sdk` type reaches the public surface; the fake
client in tests implements the narrow interface only; `tidy.succeeded`'s documented fields
match the emitted record.

---

### Task 5: `mintPreviewToken` made safe by construction

**Files:**
- Modify: `src/lib/sveltekit/preview.ts`, `src/lib/auth/preview-store.ts` (whichever carries
  the exported signature; grep first), the admin action that performs the entry-scoped check
  today (the authorization sequence to reuse, not duplicate)
- Modify: regenerated surface, reference page, `CHANGELOG.md`, ledger
- Test: authorization coverage — an editor without the entry-scoped grant is refused; the
  happy path still mints

**Interfaces:**
- Produces: `mintPreviewToken` taking the resolved editor and performing the same
  entry-scoped authorization check the admin action performs, refusing (outcome-idiom
  result, discriminant `outcome`, per the 4a convention) when the editor lacks it. The
  silent header-comment obligation is gone.

- [ ] **Step 1:** Of the two audit-sanctioned fixes (name-or-signature), execute the
  **signature form**: the function takes the resolved editor and performs the entry-scoped
  check itself, making it safe by construction like its documented sibling `previewLoad`
  ("whose contract is safe by construction", `verify-route-factories.md:189`). The name form
  (renaming to carry the obligation) is the fallback only if the check cannot be performed at
  this layer without new coupling; if taken, record why in the ledger entry.
- [ ] **Step 2:** Write the failing authorization tests first (refused editor, authorized
  editor, absent entry); implement; the refusal returns a discriminated result on the 4a
  `outcome` grammar, no throw-for-control-flow.
- [ ] **Step 3:** Docs, surface regen, CHANGELOG (breaking signature change;
  `Consumers must:` states the new parameter — zero usage per the sweep, entry says so),
  ledger closes.
- [ ] **Step 4:** Full gate; commit.

**Acceptance criteria:** no call path mints a preview token without the entry-scoped check;
the exported signature names the editor parameter; the security reviewer's round-1 read of
this task's design (plan review) is folded before execution.

---

### Task 6: `fixtureMediaBase` becomes a `ReproContext` prop

**Files:**
- Modify: `src/lib/reproductions/manifest.ts:313` (the exported constant),
  `src/lib/reproductions/ReproContext.svelte:209` (the unconditional `setContext`)
- Modify: regenerated surface, `package.json` export map only if the constant was the
  subpath's last value export (verify), `docs/reference/reproductions.md`, `CHANGELOG.md`,
  ledger
- Test: a mounting fixture passing a non-default base and asserting composed fixture URLs

**Interfaces:**
- Produces: `ReproContext` with an optional `mediaBase` prop defaulting internally to
  `'/repro-assets'`; the exported constant is gone.

- [ ] **Step 1:** Add the prop; the `setContext` value comes from it; the internal default
  preserves current behavior for every existing mount. Fixture URLs are composed at render
  time from context plus slug/hash/ext (verify-confirmed), so the prop threads cleanly; the
  failing test mounts with a `paths.base`-shaped value and asserts the composed URL.
- [ ] **Step 2:** Retire the exported constant (export rows and, if present, its export-map
  entry); drift-hunt.
- [ ] **Step 3:** Docs, surface regen, CHANGELOG (`Consumers must:` — pass `mediaBase` to
  `ReproContext` instead of importing the constant; zero usage per the sweep, entry says
  so), ledger closes.
- [ ] **Step 4:** Full gate; commit.

**Acceptance criteria:** a site deployed under a SvelteKit `paths.base` can comply by
passing one prop (the audit's "cannot comply at any effort" defect is gone); default mounts
render byte-identically.

---

### Task 7: `strAttr` moves onto the context as `ctx.str()`

**Files:**
- Modify: `src/lib/render/rehype-dispatch.ts:14` (the standalone function) and `:178-183`
  (the single `ComponentContext` construction site), `src/lib/render/authoring.ts:8-9` (the
  recorded R4 re-export row and its comment)
- Modify: `examples/showcase/src/theme/cairn.config.ts` (its `strAttr` calls), regenerated
  `templates/waymark` via `npm run emit-template`, every `skills/` and `docs/` page teaching
  the standalone form, regenerated surface, `docs/reference/` render page, `CHANGELOG.md`,
  ledger
- Test: the existing component-builder coverage re-pointed at `ctx.str()`; a type-level
  assertion that `ComponentContext` carries the method beside `slot`/`items`

**Interfaces:**
- Produces: `ComponentContext.str(key: string): string | undefined`, same semantics as
  today's `strAttr(ctx, key)`; the standalone export is gone from `/render` and the root.

- [ ] **Step 1:** Add the method at the one construction site (`rehype-dispatch.ts:178-183`;
  no family site constructs a `ComponentContext` directly — verify-confirmed — so the
  addition breaks no site code). Precedent: `registry.iconField(name)` from the same spec
  pass, cited in the verify record.
- [ ] **Step 2:** Retire the standalone export (both rows: the defining export and
  `authoring.ts`'s recorded re-export; the canonical-home record updates). `cardShell`,
  `headRow`, `iconSpan` are chassis-routed and explicitly NOT in this pass's scope — leave
  them and their rows untouched.
- [ ] **Step 3:** Migrate the showcase's own calls, re-emit the template, migrate every
  teaching doc and skill page; drift-hunt the name full-scope.
- [ ] **Step 4:** Docs, surface regen, CHANGELOG (breaking with live consumers:
  `Consumers must: replace strAttr(ctx, key) with ctx.str(key)` — four repos, 7 to 16 call
  sites each, all the two-argument form per the usage map, so the rewrite is mechanical);
  ledger closes (noting the deeper `FieldDescriptor`-typed fix is recorded as
  blocked-by-design today, per verify, and not attempted).
- [ ] **Step 5:** Full gate; commit.

**Acceptance criteria:** `strAttr` appears nowhere in `src/`, `docs/`, `skills/`,
`examples/`, or the regenerated template; the nullable-string return contract is unchanged
(the usage map's `??` fallback idioms keep compiling at consumers).

---

### Task 8: `normalizeAssets` — one hoisted media block (verify-corrected shape)

**Files:**
- Modify: `examples/showcase/src/theme/cairn.config.ts:360-370,457` (the duplicated media
  literal), regenerated `templates/waymark`, the `docs/` pages documenting the config form
  (grep `normalizeAssets` across `docs/extend/` and `docs/reference/media.md`)
- Modify: `CHANGELOG.md`, ledger. **No engine code change; the exported signature is
  untouched** (all five consumer repos call it load-bearing at config init, usage map §1)
- Test: `check:template`, `check:consumers`, `check:snippets` prove the corrected form; the
  showcase build is the executable proof

**Interfaces:**
- Produces: the documented and scaffolded call form where a single hoisted media block feeds
  both `normalizeAssets(...)` and the adapter's `media:` member, eliminating the split-brain
  double normalization every family site currently seeds from the scaffold.

- [ ] **Step 1:** In the showcase config, hoist one `const media = { bucketBinding:
  'MEDIA_BUCKET' }` (or the equivalent single source), used by both the
  `normalizeAssets(media)` call (`:368`) and the adapter's `media:` member (`:457`). Do NOT
  attempt the `runtime.resolvedAssets` form: it is circular-import-blocked (the runtime
  composer imports `cairn.config.ts`; the rank note's alternative is wrong on this point —
  the stated conductor default).
- [ ] **Step 2:** Re-emit the template; update every doc teaching the duplicated form.
- [ ] **Step 3:** CHANGELOG (behavior-neutral doc/scaffold change; the entry states no
  consumer action is required and points existing sites at the hoisted form as the
  recommended de-duplication), ledger closes (rank-media item 4, with the verify's two
  corrections recorded: scaffold vector, blocked alternative).
- [ ] **Step 4:** Full gate; commit.

**Acceptance criteria:** the string `bucketBinding` appears exactly once in the showcase
config; the emitted template matches; `normalizeAssets`' signature and return type are
byte-identical to `main`.

---

### Task 9: `OfficeList` collapses onto `PageHeader` (self-start ported first)

**Files:**
- Modify: `src/lib/admin-toolkit/PageHeader.svelte` (gains the action-slot `self-start`
  wrap), `src/lib/admin-toolkit/OfficeList.svelte` (collapses to a thin card-frame
  composing `PageHeader`)
- Modify: `docs/reference/admin-toolkit.md`, `CHANGELOG.md`, ledger; surface regen only if
  prop types change (they must not — see acceptance)
- Test: component coverage asserting the rendered header band is `PageHeader`'s and the
  action alignment survives; a screenshot-affecting change routes through the showcase
  visual suite

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `OfficeList` with an unchanged public prop contract (ASC imports it across five
  or more admin routes, usage map §3 — the collapse is internal), whose header band is one
  implementation, not two.

- [ ] **Step 1:** Port the `self-start` action wrap (`OfficeList.svelte:52`) into
  `PageHeader` FIRST — the two measured fixes are asymmetric and a naive collapse regresses
  the alignment fix (the verify record's required addition). Failing visual/DOM assertion
  first.
- [ ] **Step 2:** Collapse `OfficeList`'s duplicate eyebrow/title/subtitle/action band to a
  composition of `PageHeader`; the card frame is what remains locally.
- [ ] **Step 3:** Docs, CHANGELOG (behavior change entry stating no consumer action —
  the prop contract is held), ledger closes.
- [ ] **Step 4:** Full gate (including the showcase visual suite if baselines move); commit.

**Acceptance criteria:** `OfficeList`'s props and slots are unchanged; the repo contains one
eyebrow/title/subtitle/action implementation; the `self-start` alignment is asserted in
`PageHeader`'s own coverage so the port cannot silently drop.

---

### Task 10: `StatusChip` re-derived (the tone dot retires as color carrier)

**Files:**
- Modify: `src/lib/admin-toolkit/StatusChip.svelte`, `src/lib/cairn-admin.css` if the chip
  recipes live there (grep first), `docs/internal/admin-design-system.md` (the chip recipe)
- Modify: `docs/reference/admin-toolkit.md`, `CHANGELOG.md`, ledger
- Test: component coverage over the full register set; measured contrast recorded in the
  task report (the audit's own measurement method: computed-style contrast against cairn's
  themes, both light and dark)

**Interfaces:**
- Produces: `StatusChip` whose color carrier is legible (the 6px tone dot was ruled
  illegible toolkit-wide by Geoff's 2026-08-24 owner probe — verify-confirmed), with the
  register set completed (warning-tint and outline registers) against cairn's own themes,
  re-measured rather than copied from ASC's tuning. The public prop contract — `tone`,
  `label`, `register`, `size`, and the `StatusChipTone` union — is held fixed (two live
  consumer repos, usage map §1).

- [ ] **Step 1:** Replace the 6px dot as the tone's color carrier with a legible carrier
  (tinted ground plus readable label is the design-system idiom; follow
  `docs/internal/admin-design-system.md` and keep `data-theme` handling per its
  load-bearing rules). Failing component assertions first on the rendered carrier.
- [ ] **Step 2:** Complete the register set: warning-tint and outline registers exist for
  every tone, measured against cairn's packaged themes (not ASC's), with the measured
  ratios recorded in the implementer report. The known quiet-register 14%-tint caveat over
  `--color-base-300` (ROADMAP, documented not retuned) stays documented unless the
  re-measurement shows the new carrier clears it.
- [ ] **Step 3:** Docs (reference page prop/register table, design-system recipe),
  CHANGELOG (visual behavior change; no consumer action — prop contract held; entry says
  so), ledger closes.
- [ ] **Step 4:** Full gate including the showcase visual suite; commit.

**Acceptance criteria:** no 6px dot remains as the sole tone carrier; every
tone-times-register combination renders distinguishably in both packaged themes with the
measurements recorded; `StatusChipTone` and the prop names are byte-identical to `main`.

---

### Task 11: Log-event evenness — the remaining ten

**Files:**
- Modify: `src/lib/log/events.ts` (the union), the emit sites (grep each event; known
  anchors: `src/lib/sveltekit/commit-log.ts:16-26` shared helper,
  `src/lib/render/component-validate.ts:19`, the session-destroy paths, the include
  resolver, the dictionary action), `docs/reference/log-events.md` (every touched row)
- Modify: `CHANGELOG.md`, ledger
- Test: each fix lands with an assertion on the emitted record's fields (the log tests
  pattern already in the suites)

**Interfaces:**
- Consumes: rank 14 already landed in Task 4.
- Produces: the ten remaining docket §4 fixes, exactly as tabled there, with these
  plan-settled shapes:

- [ ] **Step 1 (ranks 2 and 7, one mechanism):** `auth.session.destroyed` gains the subject
  via `DELETE FROM session WHERE id = ? RETURNING email` (same statement, same round trip;
  `locals.cairnEditor` is NOT in scope on the public logout path — the verify-corrected
  mechanism, so no extra SELECT); `auth.channel.session.destroyed` gets the identical fix
  through `destroyChannelSession`'s `DELETE ... RETURNING subject`.
- [ ] **Step 2 (rank 5):** `dictionary.added` (and `dictionary.add_conflict`, which
  inherits) stops shipping the flagged tokens verbatim: the record carries a word count,
  not the words, honoring the doc's own "never carry document content" claim. The reference
  rows update in the same edit.
- [ ] **Step 3 (ranks 28 and 69, one change):** `commit.succeeded`/`commit.failed` stop
  overloading `concept` with the four pseudo-concepts (`nav`, `settings`, `vocabulary`,
  `media`) that collide with a site's declared concept names (7 of 11 emit sites affected,
  verify-counted). Shape: `concept` remains only on entry-scoped commits; the four
  non-entry surfaces move to a sibling `surface` field (string literal union), absent on
  entry commits. Both events share the `commit-log.ts` helper, so one change lands both.
- [ ] **Step 4 (rank 30, both instances):** the two bare-noun names rename to the ratified
  grammar: `taxonomy.unmarked_field` → `taxonomy.field_unmarked` (state adjective) and
  `publish.address_collision` → `publish.address_collided` (past-tense verb). Any rename
  lands both — the verify record forbids splitting them.
- [ ] **Step 5 (rank 35):** `content.field_behavior_failed`'s bare `field` gains an owner
  label threaded as an argument through `validate` (the fieldset has no concept, and the
  component-attribute path at `component-validate.ts:19` has no concept at all — the
  verify-corrected mechanism; the label names the owning fieldset or component, not a
  concept).
- [ ] **Step 6 (rank 36):** `include.missing` disambiguates its two authoring faults with a
  `reason` discriminant (`'empty-fragment' | 'not-found'` — snake/kebab per the existing
  `reason` enum convention in the vocabulary; match it) and names the containing entry; the
  resolver already has both in scope.
- [ ] **Step 7 (ranks 42 and 44):** `media.resolver_absent` drops the dead `{enabled:
  true}` field (one possible value); `preview.cleanup_failed` moves the stringified throw
  from `reason` (reserved for snake_case enums) to `error`, matching its five siblings.
- [ ] **Step 8:** Reference table rows for every touched event; CHANGELOG (behavior
  changes; `Consumers must:` names the two event renames and the `concept`→`surface` move
  for any site's log filters); ledger closes all eleven §4 entries (rank 14 noted as landed
  in Task 4).
- [ ] **Step 9:** Full gate; commit.

**Acceptance criteria:** the events union, every emit site, and the reference table agree;
no record ships flagged dictionary tokens; no pseudo-concept reaches `concept`; grep for the
two old event names returns only CHANGELOG/history hits.

---

### Task 12: Audit registry-rule repairs (`chip-ground-collision`, `form-font-parity`)

**Files:**
- Modify: the rule implementations under `src/lib/audit/` (grep the rule ids;
  `rules/rendered/index.ts:11-13` carries `form-font-parity`'s provisional registration),
  `docs/reference/cairn-audit.md`
- Modify: `CHANGELOG.md`, ledger, `ROADMAP.md` (the filed chroma repair leaves the roadmap
  when it lands)
- Test: rule unit fixtures for the repaired formula and the closed exemption net (both
  false-positive corpora are documented in the rank/verify records; encode the named cases)

**Interfaces:**
- Produces: a `chip-ground-collision` whose contrast formula can see hue, and a
  `form-font-parity` whose exemption net covers the three named false-positive classes.

- [ ] **Step 1 (`chip-ground-collision`, primary path):** land the filed chroma-aware
  repair (ROADMAP: "a distance formula that can see hue, plus a recalibrated floor" — the
  formula today has no chroma term and produced 24 false errors of 40 on its first real
  consumer, a measured 60% false-positive rate). Encode the ASC false-positive cases as
  fixtures that must pass under the repaired formula. **Fallback** (only if the
  recalibration cannot be validated inside this task): hold the rule out of the registry
  until the repair lands, per the docket shape. Either way, state the discriminator
  explicitly in the rule's doc: this rule's error rate was MEASURED, which is what
  separates it from the two kept geometry heuristics (the verify caveat's required
  statement).
- [ ] **Step 2 (`form-font-parity`):** close the exemption net before any error-tier
  promotion: variant-prefixed forms (`md:font-mono`), the `font-serif`/`font-sans`
  families, and Tailwind 4's `font-(family-name:--x)` shorthand. The report copy states a
  finding may be an exemption miss. The rule stays advisory in this pass; promotion is a
  later, separately evidenced act.
- [ ] **Step 3:** Docs, CHANGELOG (behavior change to audit output; no consumer action —
  entry says so), ledger closes both §5 entries; ROADMAP updates if the chroma repair
  landed.
- [ ] **Step 4:** Full gate; commit.

**Acceptance criteria:** the ASC false-positive corpus passes under the repaired formula (or
the rule is demonstrably absent from the registry with the discriminator stated); the three
exemption classes have fixtures; no rule was promoted to error tier in this pass.

---

### Task 13: The `rendered.*` identifier renames (five, plan-settled)

**Files:**
- Modify: `src/lib/audit/rendered.ts:181-185` (the five constants and every use),
  `docs/reference/cairn-audit.md` (the ids it names)
- Modify: `CHANGELOG.md`, ledger
- Test: the harness suites assert the new ids; grep proves the old ids gone

**Interfaces:**
- Produces: the five harness failure ids conforming to the 4a-ratified identifier-grammar
  clause (dot-namespaced by area; the leaf keeps the vocabulary's kebab-case; a prefix is
  never a substitute for a namespace). The settled set (sitting ruling 3 — five constants,
  fresh-derived from C16 plus the source, superseding C16's count of four, which predates
  `rendered-state-unreachable` and `rendered-page-identity-mismatch` both being present):

  | Old | New |
  |---|---|
  | `rendered-allowlist-stale` | `rendered.allowlist-stale` |
  | `rendered-allowlist-unprobeable` | `rendered.allowlist-unprobeable` |
  | `rendered-allowlist-dead` | `rendered.allowlist-dead` |
  | `rendered-page-identity-mismatch` | `rendered.page-identity-mismatch` |
  | `rendered-state-unreachable` | `rendered.state-unreachable` |

- [ ] **Step 1:** Verify whether a consumer-facing allowlist file can name a harness id (if
  so, the rename needs a compat read or a `Consumers must:` migration line; if not — the
  expected case, since these ids are RAISED about allowlist entries rather than written in
  them — the entry states log/report-filter impact only).
- [ ] **Step 2:** Rename all five constants and every reference; update the reference page;
  drift-hunt the old ids across `docs/` and `skills/`.
- [ ] **Step 3:** CHANGELOG (behavior change to report output; `Consumers must:` per
  Step 1's finding), ledger closes (the docket §6 open item resolves with this table as the
  fresh determination).
- [ ] **Step 4:** Full gate; commit.

**Acceptance criteria:** grep for `rendered-` as an id prefix in `src/` returns nothing;
the 23 bare-kebab rule ids are untouched (C16 leaves them alone until a second rule family
exists); the audit report renders the new ids.

---

### Task 14: The `variants` evidence sweep (ruling 4, evidence-first)

**Files:**
- Read (sweep): the five consumer repos' cairn configs and any `media:`/`variants` keys —
  `~/Projects/ecxc-ski`, `~/Projects/907-life`, `~/Projects/aksailingclub-org`,
  `~/Projects/xcathletes-org`, `~/Projects/cairn-pub` — plus
  `examples/showcase/src/theme/cairn.config.ts`, `templates/waymark`, and `docs/`
- Modify (branch-dependent): `src/lib/media/config.ts` (the `AssetConfig.variants` member,
  its merge loop at `:116`, and — riding only on retire — the `VariantSpec` export),
  regenerated surface, `docs/reference/media.md`, `CHANGELOG.md`, ledger

**Interfaces:**
- Produces: either a surface without `AssetConfig.variants` (retire branch) or a documented
  keep with the evidence recorded (keep branch). Both branches record the sweep evidence
  verbatim in the ledger entry.

- [ ] **Step 1:** Sweep every consumer config (and the showcase, template, and docs
  examples) for a set `variants` key on the media/asset config. The engine's own built-in
  presets (`thumb`, `inline`, `card`, `hero`) are not consumer usage; the question is
  whether any site MERGES a custom preset.
- [ ] **Step 2 (retire branch — nothing sets it):** drop the `variants` member from
  `AssetConfig` and `ResolvedAssetConfig`, delete the merge loop, keep the built-in presets
  as the whole preset vocabulary. `VariantSpec` rides the retire ONLY if the member goes
  (its keep verdict — rank-adapter-concept-model item 41 — rested on the member naming it;
  record the supersession in both ledger entries, and re-test `ResolvedAssetConfig`'s own
  keep in the same breath, per its rank caveat). CHANGELOG breaking entry with
  `Consumers must:` (delete any `variants:` key — none exists, entry says so).
- [ ] **Step 3 (keep branch — something sets it):** no code change; the reference page
  gains the worked custom-preset example the field currently lacks, and the ledger entry
  records the keeping evidence (which site, which preset).
- [ ] **Step 4:** Surface regen (retire branch), docs, ledger closes with the evidence
  either way.
- [ ] **Step 5:** Full gate; commit.

**Acceptance criteria:** the ledger entry quotes the sweep evidence (repo, file, hit or
no-hit) so the branch taken is auditable; on retire, `presetUrl`'s built-in presets still
work and the transformations path's tests are green; no keep-to-retire flip beyond the
ruling's own pre-authorization.

---

## Pass-end ritual (cairn-pass; not a numbered task)

Code-simplifier over the changed code; domain reviewer fan-out (`svelte-reviewer`,
`daisyui-a11y-reviewer` MANDATORY for Tasks 9-10, `web-auth-security-reviewer` for Task 5's
landed diff, `cloudflare-workers-reviewer` if any D1/session SQL moved in Task 11);
fix rounds; the mid-pass mechanic check (`engine-triage` on anything filed); STATUS/HISTORY/
ROADMAP updates; post-mortem appended here; both budgets scored. ROADMAP hygiene owed by
this pass: the chroma repair line clears if Task 12 lands it; the 4b items leave the Now
tier; anything discovered routes to internals or chassis, never into this pass.

## What this pass hands forward

- **Internals pass:** unchanged from the STATUS routing list (the F-1 leak-class
  `check:surface` rider, `staleNames` per-subpath rescope, R-0's second direction, the six
  stale `content-routes-*` header wordings, `list-role` re-grounding, `panel-width`
  follow-up, the reference-page indexed-access convention, the factory `CAIRN_DEV_BACKEND`
  refusal design question, plus 4a's quote-drift tripwire and vale reconciliation).
- **Chassis pass:** the render trio re-homing (`cardShell`/`headRow`/`iconSpan` — explicitly
  untouched by Task 7), and the carried showcase hand-mounted `+page.server.ts` against
  generated `./$types`.
- **Release:** the window still holds; ONE cut after the chassis slice per the initiative
  design.

## Review folds

(Populated by the two-round adversarial review before dispatch; round 1 `engine-triage` +
`web-auth-security-reviewer`, fold with dispositions here, round 2 `engine-triage`
verification of the folded revision.)
