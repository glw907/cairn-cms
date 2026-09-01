# Slice 4b docket — cross-surface conformance sweep

Compiled read-only from `docs/internal/record/2026-08-30-r4-rederivation.md` ("List (c)") and
the `docs/internal/record/2026-08-26-any-site-audit/` rank-*/verify-* pairs, against the routing
list in `docs/superpowers/plans/2026-08-30-conventions-pass.md` ("What this pass unblocks and
hands to 4b"). No conclusions drawn from `docs/internal/engine-rulings.md` (excluded per
instructions; another executor is editing it). No new scope proposed.

---

## 1. Tier 1 media-janitorial retires (25 items)

Source: `docs/internal/record/2026-08-30-r4-rederivation.md`, "List (c)" §3, Tier 1
(lines 265-322). Each name's own retire verdict and rank number is in
`rank-route-factories.md`; `verify-route-factories.md`'s "Ranks 1-13" and "Ranks 14-30" blanket
notes ("**All retires stand.**") cover all 25 except rank 38, called out below. Unblocked once
Task 2 of the conventions pass declares `CairnAdminRoutes` narrow (already ratified/executed by
4a).

| # | Symbol | Rank source | Verify status |
|---|---|---|---|
| 1 | `OrphanByteRow` | rank-route-factories.md, rank 1 | stands |
| 2 | `BrokenRefRow` | rank-route-factories.md, rank 2 | stands |
| 3 | `BulkDeleteSkip` | rank-route-factories.md, rank 3 | stands |
| 4 | `RepointPlacement` | rank-route-factories.md, rank 4 | stands |
| 5 | `AltPlacement` | rank-route-factories.md, rank 5 | stands |
| 6 | `BranchRef` | rank-route-factories.md, rank 6 | stands |
| 7 | `MediaOrphanScanResult` | rank-route-factories.md, rank 7 | stands |
| 8 | `MediaOrphanPurgeResult` | rank-route-factories.md, rank 8 | stands |
| 9 | `MediaAltPreviewEntry` | rank-route-factories.md, rank 9 | stands |
| 10 | `MediaAltPreviewPlan` | rank-route-factories.md, rank 10 | stands |
| 11 | `MediaReplacePreviewEntry` | rank-route-factories.md, rank 11 | stands |
| 12 | `MediaReplacePreviewPlan` | rank-route-factories.md, rank 12 | stands |
| 13 | `MediaBulkDeleteResult` | rank-route-factories.md, rank 13 | stands |
| 14 | `DictionaryAddResult` | rank-route-factories.md, rank 14 | stands ("Ranks 14-30 ... all retires stand") |
| 15 | `TidyResult` | rank-route-factories.md, rank 16 | stands |
| 16 | `MediaAltPropagateFailure` | rank-route-factories.md, rank 17 | stands |
| 17 | `MediaBulkFailure` | rank-route-factories.md, rank 18 | stands |
| 18 | `MediaUpdateFailure` | rank-route-factories.md, rank 19 | stands |
| 19 | `MediaReplaceFailure` | rank-route-factories.md, rank 20 | stands |
| 20 | `MediaDeleteRefusal` | rank-route-factories.md, rank 21 | stands |
| 21 | `MediaUploadFailure` | rank-route-factories.md, rank 22 | stands |
| 22 | `VocabularySaveFailure` | rank-route-factories.md, rank 23 | stands |
| 23 | `SettingsSaveFailure` | rank-route-factories.md, rank 24 | stands |
| 24 | `NavSaveFailure` | rank-route-factories.md, rank 25 | stands |
| 25 | `UploadResult` | rank-route-factories.md, rank 38 | **VERIFY-OVERTURN, see below** |

**Verify-overturn flag — `UploadResult` (rank 38).** The rank file's verdict is `reshape`:
"membership is arguable; the placement is wrong ... declare it beside `MediaEntry` on `/media`."
`verify-route-factories.md` line 126 overturns this to a flat **retire**: the proposed `/media`
home is wrong ("`media/index.ts`'s own header restricts `/media` to ... node-safe pure
projection ... explicitly excludes the manifest CRUD ... the engine's own ingest/admin
internals"), and on membership alone it is "Unstable API, no worked example names it,
consumed in-process by `components/media-upload-outcome.ts` — the same shape as
`MediaBulkDeleteResult` and `MediaOrphanPurgeResult`, both retired. Evenness says they go
together." The r4-rederivation Tier 1 table already treats `UploadResult` as one of the 25
composer-blocked retires (it names it directly in the `upload`/`mediaUpload`/
`mediaLibraryUpload` action row), consistent with the verified retire, not the ranked
reshape-and-relocate. **4b should execute the verified shape (flat retire), not the ranked
reshape.**

---

## 2. Carried decision: `UsageEntry` (Tier 2, rides with Tier 1)

Source: `docs/internal/record/2026-08-30-r4-rederivation.md` §3 "List (c)" Tier 2
(lines 324-347), and the conventions-pass plan's Task 5 ("`UsageEntry` does NOT retire in this
pass"). Rank source: `rank-route-factories.md`, rank 36 (verdict **retire** — "Its `origin: {
kind: 'published' } | { kind: 'branch'; branch: string }` member..."). `verify-route-factories.md`
line 106 also treats it as "retired" in passing (citing it alongside `FragmentTarget`, rank 34).

**Verify/rank vs. plan-ruling conflict, recorded not resolved here.** Both rank and verify
verdict `UsageEntry` as a plain retire. The ratified conventions-pass plan overrides this: because
the flattened `ContentFormFailure` itself carries `usage?: UsageEntry[]` as a surviving field
(the flatten is its own carrier), `UsageEntry` stays exported through 4a, and Task 5's progress
note explicitly routes the **inline-vs-keep decision** to 4b — "beside Tier 1 (where its other
carriers, `MediaDeleteRefusal`/`MediaReplaceFailure`, retire in Tier 1)." 4b's decision is not
"retire or not" (already decided: keep exported through 4a) but whether to inline the type at its
one remaining use site or keep it as a standalone named export now that its other carriers are
gone.

---

## 3. Open reshapes routed to 4b

Each entry: symbol, rank source + rank number, prescribed shape, verify status.

### `AuthBranding`
- Source: `rank-adapter-concept-model.md`, rank 3 (table row 3, line 1561).
- Shape: export from `/sveltekit` only (where `AuthRoutesConfig.branding` names it); drop the
  root-barrel duplicate, per the `ResolvedReference` precedent from the same audit.
- Verify: `verify-adapter-concept-model.md` line 77 — **stands**. No root-public signature names
  it; its only readers are the demoted `buildMagicLinkMessage` and `/sveltekit`'s
  `AuthRoutesConfig.branding`. ASC's `club-email.ts:13` names it only in a comment, "the
  decorative-export tell, not a counter-example."

### `PublishActionsConfig`
- Source: `rank-adapter-concept-model.md`, rank 4 (table row 4, line 1562).
- Shape: retire the `type PublishActionsConfig = PublishActionEntry[]` alias; keep
  `PublishActionEntry` and type the adapter's `editor.publishActions` member as
  `PublishActionEntry[]` directly.
- Verify: `verify-adapter-concept-model.md` line 82 — **stands**, but flagged
  **under-scoped** (finding 9, line 221): `publish-actions.ts:29` carries a **second**, identical
  redundant alias, `ResolvedPublishAction = PublishActionEntry`, on `/sveltekit`. "Retiring one
  and leaving the other is the evenness cost the audit exists to catch." 4b's task should decide
  whether to widen scope to both aliases (flagged below as an open call, since the routing list
  names only `PublishActionsConfig`).

### `RevertFailure`'s `lastSavedAt` rename
- Source: `rank-route-factories.md`, rank 32.
- Shape: rename both `startedAt` and `draftStartedAt` fields to `lastSavedAt`; drop the
  compensating doc-comment prose ("the field keeps its name for API stability" appears twice,
  both self-admitted wrong names).
- Verify: `verify-route-factories.md` line 53 — **stands, membership strengthened**. Both
  self-admitted-wrong-name comments verified verbatim (`types.ts:130-135`, `:169-173`).
  `CairnHistory.svelte:33` publicly declares `form?: RevertFailure | { error: string } | null`,
  and `CairnHistory` is publicly exported, so a mounting site writes the name directly (a
  stronger any-site case than the rank file argued).

### `TidyClient`
- Source: `rank-route-factories.md`, rank 33.
- Shape: replace the transcribed Anthropic SDK wire shape (`max_tokens`, `output_config.effort`,
  `stop_reason`, `usage.input_tokens`) with a narrow, engine-owned interface — take a prompt and a
  system string, return corrected text plus a coarse usage record — with the SDK adapter kept
  internal.
- Verify: `verify-route-factories.md` line 60 — **stands**. Confirmed the transcription
  (`content-routes-context.ts:32-67`) and that its own comment calls it "a consumer contract," so
  a vendor field rename becomes a cairn break. The narrow-interface reshape "does not cost the
  injectable-fake property (the engine wraps)."

### `MediaEntry`
- Source: `rank-route-factories.md`, rank 100.
- Shape: keep it in the engine at `/media`; drop the `/sveltekit` re-export (reached there only
  through `UploadResult`'s closure — see item 25 above, which is itself retiring).
- Verify: `verify-route-factories.md` line 137 — **stands**, "and is cleaner once rank 38
  [`UploadResult`] retires." `/media` already exports it; dropping the `/sveltekit` re-export
  "follows R4 rather than fighting it."

### `mintPreviewToken`
- Source: `rank-route-factories.md`, rank 97.
- Shape: membership is defensible (a site minting a share link from its own workflow); the danger
  is the silent authorization obligation ("this function itself performs no authorization or
  draft-existence check of its own"). Fix by name or signature: either take the resolved editor
  and perform the entry-scoped check the admin action performs, or make the caller's obligation
  part of the name/signature rather than a header comment.
- Verify: `verify-route-factories.md` line 189 — **stands**. "An export whose signature `(db,
  config, record)` carries a silent authorization obligation sits unmarked beside `previewLoad`,
  whose contract is safe by construction. The name-or-signature fix is the right, cheap form."

### `formatTimestamp`
- Source: `rank-admin-shell-toolkit.md`, item 18.
- Shape: re-derive to take any `Date`-parseable timestamp (ISO with offset), not a
  SQLite-shaped `sqliteDatetime` string (`new Date(sqliteDatetime.replace(' ','T')+'Z')` bakes in
  ASC's D1 storage shape); then delete `CairnHistory.svelte`'s hand-rolled `formatVersionDate` and
  route it through the reshaped formatter, proving the shape on cairn's own screen.
- Verify: `verify-admin-shell-toolkit.md` item 18 (line 103) — **stands**, verified end to end.
  `format.ts:96` confirmed; `CairnHistory.svelte:48-54`'s `formatVersionDate` hand-roll confirmed
  as "a shape defect, not a membership defect; the SSR/hydration zone pin is a real any-site
  mechanic." `FormatTimestampOptions` (item 19, keep) survives unchanged.

### `OfficeList`
- Source: `rank-admin-shell-toolkit.md`, item 17.
- Shape: collapse to a thin card-frame primitive that composes `PageHeader` for its header band,
  retiring the second (duplicate) eyebrow/title/subtitle/action implementation.
- Verify: `verify-admin-shell-toolkit.md` item 17 (line 81) — **stands, reshape note incomplete**.
  New required addition: the two measured fixes are NOT symmetric — `OfficeList.svelte:52` wraps
  its action in `self-start`, `PageHeader.svelte` does not, so a naive "compose `PageHeader`"
  collapse regresses the `self-start` fix. **The reshape must port `self-start` into `PageHeader`
  first**, before the collapse.

### `StatusChip`
- Source: `rank-admin-shell-toolkit.md`, item 50.
- Shape: replace the illegible 6px tone dot (ruled illegible toolkit-wide by Geoff's 2026-08-24
  owner probe) as the color carrier, and complete the register set (warning-tint, outline)
  against cairn's own themes, re-measuring rather than copying ASC's tuning.
- Verify: `verify-admin-shell-toolkit.md` item 50 (line 238) — **stands**, both gates verified
  (the `badge-error`/`badge-success` non-compilation into the packaged sheet, and the ratified
  2026-08-24 owner-probe illegibility finding). Eleven engine consumers; membership not in doubt.

### `normalizeAssets`
- Source: `rank-media.md`, item 4.
- Shape (as ranked): fix the documented/scaffolded call form so a site's public render resolver
  reuses the adapter's already-normalized `resolvedAssets` (from `compose`) instead of
  re-normalizing a second, re-typed literal — every family site currently does the double
  normalization, risking a split-brain config.
- Verify: `verify-media.md` item 4 (line 70) — **stands, with two corrections to the note**:
  (1) the propagation vector is not "all six sites" but the `create-cairn-site` scaffold
  template (`packages/create-cairn-site/template/.../cairn.config.ts:368,457`), which seeds the
  duplication into every new site; (2) **one of the two proposed right forms does not work** —
  reading `runtime.resolvedAssets` at the call site is blocked by a circular import (the runtime
  composer imports `cairn.config.ts`, so the reverse import is impossible in the documented
  topology). The viable form is a single hoisted media block used by both `normalizeAssets(...)`
  and the adapter's `media:` member (or `normalizeAssets(cairn.media)` with resolver construction
  moved below `defineAdapter`). **4b's task should use the verify-corrected shape, not the rank
  file's original reshapeNote.**

### `fixtureMediaBase`
- Source: `rank-reproductions.md`, Rank 2.
- Shape: make the media base a `ReproContext` prop a mounting site passes, defaulting internally
  to `/repro-assets`; the exported constant retires with the export-map entry. (Currently
  `ReproContext.svelte:209` sets it via `setContext` unconditionally, with no override prop — a
  site deployed under a SvelteKit `paths.base` cannot comply at any effort.)
- Verify: `verify-reproductions.md`, Rank 2 (line 50) — **stands**. Confirmed no escape hatch
  exists and confirmed the reshape is mechanically viable (fixture URLs are composed at render
  time from context plus slug/hash/ext, not baked into fixture data, "so a prop threads through
  cleanly").

### `strAttr` → `ctx.str()` (where not chassis-coupled)
- Source: `rank-render-build-tooling.md`, Rank 5.
- Shape: move `strAttr(ctx, key)` onto `ComponentContext` as a method, `ctx.str(key)`, beside its
  existing siblings `ctx.slot(name)`/`ctx.items(name)`; drop the standalone `/render` export. (The
  fallback stated in the rank file — "if the accessor cannot move onto the context, retire" — is
  explicitly tested and closed out by verify, below.) This item is distinguished in the routing
  list from `strAttr`'s `/render` siblings `cardShell`/`headRow`/`iconSpan` (chassis-coupled
  design-choice helpers, verdict `retire`, NOT part of 4b's scope) by being the one helper in the
  bucket that is a pure engine-imposed ergonomics tax, not a class-name/markup design choice.
- Verify: `verify-render-build-tooling.md`, Rank 5 (line 80) — **stands, feasibility risk
  closed**. `ComponentContext` is constructed in exactly one place in the engine
  (`rehype-dispatch.ts:178-183`); no family site ever constructs one directly (only type
  annotations), so "adding a method breaks no site code at all, not merely cheaply." Direct
  precedent: the same spec pass that created `strAttr` moved the icon lookup onto the registry as
  `registry.iconField(name)` for the identical reason. Noted but explicitly NOT to act on now: the
  deeper fix (typing `attributes` from the component's own `FieldDescriptor` declarations) is
  blocked by `build` living inside the same object literal it would infer from — "`ctx.str` is
  the right answer today, not a permanent one."

---

## 4. Eleven log-event evenness reshapes

Source: `rank-log-vocabulary.md` (74 events ranked) and `verify-log-vocabulary.md`. The rank file
tags 14 events RESHAPE; the verify pass overturns four of those to KEEP and overturns one KEEP to
RESHAPE, netting exactly **11** — matching the plan's routing-list count. This reconciliation is
not written out anywhere in the source records themselves; it is derived here from the per-item
verify verdicts.

**Overturned OUT of the reshape set (verify flips rank's RESHAPE → KEEP):**
- Rank 1, `auth.channel.delivery_inline` — verify: the ranking misreads the doc row; the emit
  site comment (`factory.ts:721-726`) shows production genuinely reaches this branch on a
  misconfigured deploy, and the proposed fold destroys the alertable-by-existence property.
- Rank 29, `entry.published` — verify: "F5 is an aesthetic preference, not a measured
  divergence"; the ratified grammar header says nothing about outcome pairs sharing an area, and
  the current `entry.*`/`publish.*` split is coherent on its own terms.
- Rank 32, `auth.session.destroy_failed` — verify: the reshape's premise fails twice (no
  `cairnEditor` in scope on the public logout path; the throw comes from the DELETE itself, so
  `RETURNING` yields nothing without an extra SELECT on every logout).
- Rank 47, `media.resolve_missing` — verify: the record already answers its diagnostic question
  via the asset hash (a stable identity a one-command repo search resolves); the migration-cost
  argument the ranking makes is not the real objection.

**Overturned INTO the reshape set (verify flips rank's KEEP → RESHAPE):**
- Rank 7, `auth.channel.session.destroyed` — verify: "This is the same defect as rank 2, in the
  same audit, on the same kind of blind delete. Reshape both or keep both; the ranking cannot
  split them." (Rank 2's fix — `DELETE ... RETURNING subject`/`email` — applies identically.)

**The 11, final (rank number, name, one-line prescribed shape):**

| Rank | Event | Prescribed shape |
|---|---|---|
| 2 | `auth.session.destroyed` | Add the subject via `DELETE FROM session WHERE id = ? RETURNING email` (same statement, same round trip); logout's `locals.cairnEditor` is NOT in scope (verify-corrected mechanism). |
| 5 | `dictionary.added` | Stop shipping the flagged tokens (`words: additions`) verbatim against the doc's own claim that `dictionary.*` records "never carry document content" — either count the words or correct the doc claim. `dictionary.add_conflict` inherits the same fix. |
| 7 | `auth.channel.session.destroyed` | Same fix as rank 2, applied via `destroyChannelSession`'s `DELETE ... RETURNING subject`. |
| 14 | `tidy.succeeded` | Stop re-exporting the raw `@anthropic-ai/sdk` `Usage` object verbatim in `usage`; it is a vendor shape the engine neither controls nor documents. |
| 28 | `commit.succeeded` | Stop overloading `concept` with pseudo-concepts (`nav`, `settings`, `vocabulary`, `media`) that collide with a site's own declared concept names; verify found 7 of 11 emit sites affected, not the ranked 5. |
| 30 | `taxonomy.unmarked_field` | Rename off the bare-noun-phrase form to match the ratified past-tense-verb/state-adjective grammar; verify found a SECOND instance, `publish.address_collision`, also bare-noun — "any rename lands both, or the header is what should change." |
| 35 | `content.field_behavior_failed` | Give the bare `field` name a fieldset-level owner label (or a third argument to `validate`); verify found the ranked mechanism wrong — a fieldset has no concept, and the component-attribute validation path (`render/component-validate.ts:19`) has no concept at all today. |
| 36 | `include.missing` | Disambiguate the two authoring faults sharing one event name (empty-string fragment vs. named-but-missing fragment) and name the containing entry; the resolver already has what's needed in scope. |
| 42 | `media.resolver_absent` | Drop the `{enabled: true}` field — it has exactly one possible value ("always `true`" per the doc) and is dead payload. |
| 44 | `preview.cleanup_failed` | Move the stringified throw from `reason` (reserved for snake_case enums) to `error`, matching every sibling event's convention. This is "the clearest measured divergence in the subsystem." |
| 69 | `commit.failed` | Same fix as rank 28 — shares the `commit-log.ts:16-26` helper and the identical pseudo-concept `commitFields` objects; "any fix to rank 28 lands here in the same change." |

---

## 5. Registry-rule reshapes (2)

Source: `rank-cli-surface.md`.

### `audit-cli-chip-ground-collision-rendered-rule`
- Rank: rank-cli-surface.md, Rank 5.
- Shape: hold `chip-ground-collision` out of the registry until its chroma repair lands (the
  formula "has no chroma term and cannot see hue," producing 24 false errors of 40 on its first
  real consumer — a 60% false-positive rate). Do not ship the rule as-is; the repair is
  engine-owned (only the engine ships the palette/recipes).
- Verify: `verify-cli-surface.md` line 102 — **stands, with a caveat**: (a) deregistering trades
  a noisy signal for no signal, so the better reshape is landing the filed chroma repair, not
  removal; (b) it sits in tension with rank 7's two kept geometry heuristics (which also can't
  distinguish a real composition from a defect) — the discriminator that separates them is that
  this one's error rate was **measured**, and that discriminator should be stated explicitly in
  the reshape, not left implicit.

### `audit-cli-form-font-parity-rendered-rule`
- Rank: rank-cli-surface.md, Rank 6.
- Shape: close the exemption net (variant-prefixed forms like `md:font-mono`, `font-serif`/
  `font-sans`, Tailwind 4's `font-(family-name:--x)` shorthand) before promoting the rule from
  advisory to error tier, and say in the report that a finding may be an exemption miss.
- Verify: `verify-cli-surface.md` line 110 — **stands**. All three false-positive classes and the
  provisional registration confirmed against both the reference page and `rules/rendered/index.ts:11-13`.
  Purpose confirmed Arm A (only the engine ships the UA reset layer).

---

## 6. The four `rendered-*` harness failure ids (identifier-grammar conformance)

**Could not find a fully ranked/verified shape for this item as a discrete reshape.** What the
rank/verify records actually contain:

- `rank-cli-surface.md`, Rank 27 (line 725) discusses **three** `rendered-*` ids —
  `rendered-allowlist-stale`, `rendered-allowlist-unprobeable`, `rendered-allowlist-dead` — but
  its verdict is **keep unchanged** for the allowlist mechanism itself ("Arm A passes... Keep
  unchanged; protect the advisory-only cap explicitly"), not a rename. `verify-cli-surface.md`
  does not carry a per-item note contradicting this.
- The "four `rendered-*` harness ids" figure and the identifier-grammar recommendation itself
  ("a public-observable identifier is dot-namespaced by area; a prefix is never a substitute for
  a namespace") trace to `coherence-v2.md` C16 (lines 710-754), NOT to a per-item rank/verify
  entry. C16's own table cites only one example (`rendered-allowlist-stale`) for its count of 4.
- Current source (`src/lib/audit/rendered.ts:181-185`) actually defines **five** constants with
  the `rendered-` prefix: the three allowlist ids above, plus `rendered-page-identity-mismatch`
  and `rendered-state-unreachable`. `rank-cli-surface.md` Rank 20 (line 527) separately discusses
  "The post-hydration page-identity guard" as a `keep`, and `verify-cli-surface.md` line 181
  confirms it stands, again with no rename instruction.

**This is flagged as an item the 4b plan author must resolve before writing the task**: which
four (of the five source constants) the "four" figure means, and what the renamed dot-namespaced
form should be, since no rank/verify record supplies either.

---

## Decisions for the 4b brainstorm

Only the genuinely open calls — items where the docket's sources disagree, are silent, or an
explicit choice was deferred to this pass:

1. **`UsageEntry`: inline-vs-keep.** Ranked and verified as a plain retire (rank-route-factories.md
   rank 36; verify treats it as already retired in passing), but the ratified conventions-pass
   plan holds it exported through 4a because the flattened `ContentFormFailure` still carries
   `usage?: UsageEntry[]`. 4b must decide: inline the type at its remaining use site, or keep it
   standalone now that its Tier-1 co-carriers (`MediaDeleteRefusal`, `MediaReplaceFailure`) are
   gone.

2. **The 25 Tier 1 retires' ratification-gate step.** The conventions-pass plan states 4b
   "executes them with the same ratification-gate discipline the retires pass used (no
   keep-to-retire flip without Geoff)." None of the 25 is itself a flip (all are pre-existing
   retire verdicts, verify-confirmed) — the one exception is `UploadResult` (rank 38), where the
   RANK verdict is reshape and the VERIFY verdict is retire (item 1 above); 4b's plan author
   should state explicitly that it is executing the verified (retire) shape, not the ranked
   (reshape) one, since that is the one item in the 25 where "no flip" needs a decision about
   which record is authoritative.

3. **`PublishActionsConfig` scope.** The routing list names only `PublishActionsConfig`, but
   `verify-adapter-concept-model.md` finding 9 says the reshape as ranked is "right and
   under-scoped": a second, identical redundant alias, `ResolvedPublishAction =
   PublishActionEntry` (`publish-actions.ts:29`), carries the same defect and is not named in the
   routing list. 4b's plan author must decide whether to widen the task to both aliases (per the
   verify finding) or hold `ResolvedPublishAction` out as unrouted scope.

4. **The four `rendered-*` harness ids** (§6 above): which four names, and what dot-namespaced
   form they take, is not settled anywhere in the rank/verify records — only in `coherence-v2.md`
   C16's own recommendation. Current source defines five `rendered-`-prefixed constants. The plan
   author needs to either re-derive the exact four from C16's own reasoning or treat this as
   needing a fresh determination before the task can be written.

5. **`normalizeAssets`'s reshape form.** Not fully open (verify supplies a concrete corrected
   shape), but flagged because the rank file's own reshapeNote is wrong on a material point (the
   `runtime.resolvedAssets` alternative is circular-import-blocked) and the propagation vector is
   different (the `create-cairn-site` scaffold, not "all six sites"). The 4b task should be
   written directly off the verify-corrected shape in §3 above, not the rank file's original
   text.

## Brainstorm rulings (Geoff, 2026-08-31 sitting — the 4b plan header restates these)

1. UsageEntry: RETIRE AND INLINE (element shape into ContentFormFailure's field or module-internal;
   export drops; index-off-ContentFormFailure is the consumer recovery).
2. PublishActionsConfig: WIDEN to both aliases (ResolvedPublishAction rides; verify finding 9 is
   the authorization; zero consumer usage).
3. rendered-* harness ids: SETTLED AT PLAN AUTHORING — fresh derivation from coherence-v2 C16 plus
   src/lib/audit/rendered.ts (five constants, not four); the exact rename set appears in the plan
   Geoff approves; no code on an unsettled list.
4. Inert variants field: 4B, EVIDENCE-FIRST — a config-key sweep across consumer configs first;
   retire if nothing sets it, keep-and-document if something does.
Conductor defaults stated and unobjected: UploadResult executes the VERIFIED retire (verify-wins
rule); normalizeAssets task written off the verify-corrected shape (rank's note wrong on the
circular-import point; propagation vector is the scaffold).

## Plan-review requirement (Geoff, 2026-08-31)

The 4b plan gets a FULL adversarial review before Geoff sees it, on the 4a model: round 1 =
engine-triage (ledger-first, adversarial, against the committed plan) plus
web-auth-security-reviewer if any task touches auth/session/cookie surface; findings folded and
dispositions recorded in the plan; round 2 = engine-triage focused verification of the folded
revision. Only the twice-reviewed plan goes to Geoff for the approval gate.
