# Docs friction log

Writing a doc is also a design review. This file collects the design friction that documenting and
building cairn surfaces, so a rough edge becomes a tracked candidate for work instead of a lost
observation. Triage feeds `ROADMAP.md` and `docs/STATUS.md`; this repo keeps no separate backlog file.
A finding here does not block the doc that found it.

Record each finding with its perspective and a short note. The perspective is `developer` (the
integrator building and deploying a site), `editor` (the non-technical author working in `/admin`),
`maintainer`, or `operator`.

This log holds only live findings and the tombstones below. Resolved findings are pruned here once
shipped; their detail lives in the per-plan post-mortems and `docs/STATUS.md`, the homes for shipped
history. The append-only prose that accumulated through 2026-06-26 was pruned on 2026-06-28
(extensibility Plan 1), and the full backlog was cleared on 2026-07-16 by the friction-triage pass:
every open finding was verified against the code and then either shipped, filed into `ROADMAP.md`
with its trigger, or found already resolved and pruned. Git history holds the full record of both
clearings.

## Tombstones (decided, do not resurface)

- **Point-of-typing writing coach.** KILLED 2026-06-26. The help-shell adversarial review discarded it
  as the Clippy pattern. Do not re-propose a per-keystroke formatting coach.
- **`runtime.publicMediaResolver`.** DROPPED 2026-06-24. An adversarial review, verified first-hand,
  found it inverts the prerender/Worker boundary and that the "three wire-points" was a miscount of two,
  both prerender-side and already sharing one `cairn.config` export. The real wart (silently broken
  public images) is fixed instead by the `media.resolver_absent` warn event at `createPublicRoutes`
  construction. Do not re-propose the runtime member.
- **`CairnMediaLibrary`'s dormant "type facet" (a hidden Images/Documents filter).** RESOLVED
  2026-07-20, admin-toolkit review-fixes round. The pass's T8 drift-hunt had filed this as a live
  open finding, attributing the facet's absence to T6's `ListToolbar` re-expression; `git log`/`git
  show` on `CairnMediaLibrary.svelte` instead confirm the facet was removed three weeks earlier, in
  the 2026-06-28 charter-adherence pass (`23abe438`, "the speculative Media Library type-facet is
  removed"), as inert scaffolding for a second stored asset type that has never existed. T6 never
  carried it forward because it was already gone at the branch point. The delivery route is still
  image-only today, so the charter's "we don't accommodate that universe" stands: do not re-add it
  speculatively. `ListToolbarFilter`'s `promoted: false` seam covers the same hidden-until-needed
  shape if a real second asset type ever ships.

## Open findings

The log was cleared 2026-07-16, 2026-07-19 (the dev-backend pass), and 2026-07-29 (the
post-0.91.0 clearing): every open finding was verified against the code and then either
shipped, filed into `ROADMAP.md` with its trigger, or found already resolved and pruned.
The 2026-07-29 clearing shipped four gate tightenings the Pass 2 entries had proposed (the
safelist count assertion, `norms:check` riding the e2e workflow after the 0.91.0 cut proved
the staleness window bites, `check:version` reading the `## Unreleased` window, and the
upgrade-guide/CHANGELOG Unreleased-heading parity check), moved the field-label weight
question (cairn 500 vs the consumer ruling's 600) into ROADMAP as a future design ruling,
and pruned the rest as filed, closed in-pass, shipped (the rendered-allowlist `rule` field;
the own-tree error tier cleared by Pass 3), or resolved by the 24x24 ruling (the 43.78px
tag-filter chip clears the ratified floor; the gate's own header documents it as inert).
Git history holds the full record of all three clearings. The 2026-07-29 ASC Assets-trial
harvest (ten findings across two batches, staged in the consumer repo while a cairn worktree
held live workerd) was folded at the 0.91.1 hotfix pass under the same complete-or-move rule:
finding 1, the 0.91.0 shipped-sheet regression, shipped as the hotfix itself; the
status-flattening finding folded into ROADMAP's standing kit entry with the upstream issue
repointed from the closed kit#12533 to the open kit#12987; and the other eight were verified
and filed into `ROADMAP.md` (the reachable-vocabulary contract, the audit's missing path
filter, the `.ts`-module scan blind spot, the 12px role gap, the doctor's bare-403 zone
reads, the identity-guard/non-2xx hole, the mismatched rendered-summary totals, and the
CodeMirror decoration throw on a consumer edit desk). The same harvest disproved the ASC
edit-desk hydration defect the STATUS carry-forwards had held (corpus C had configured
cairn's internal route shape, which 404s on ASC's single-mount admin; the real desks proved
hydration-clean across 24 runs). The 2026-07-30 Assets-trial BUILD harvest (six findings from
the pass that rebuilt `/admin/club/assets` and `/admin/club/asset-requests` under the
design-capture trial's control conditions, a different staging file from the 2026-07-29
harvest above) was folded at the design-ratchet pass under the same rule. Findings 1 and 6 (the
packaged admin sheet ships no user-agent reset, so a bare `textarea` rendered the browser's
monospace default and daisyUI's `.list` kept the UA's 40px bullet gutter) shipped as the pass's
`base` cascade layer (Task 1). Finding 2 (`form-anatomy.md`'s own worked example prescribed
`gap-x-6 gap-y-4`, which never compiled) shipped as a standing compile gate over the skill's own
reference exemplars, plus a labeled safelist addition (Task 2). Finding 3 (the stacked field
register that already worked inside the package was never exported) shipped as
`register: 'inline' | 'stacked'` on `FieldLabel`/`TextField`/`SelectField`, `'stacked'` now the
default (Task 3, a deliberate breaking change, ratified by Geoff 2026-07-30). Finding 4
(`one-filled-action` and the grader prompt disagreed about what one surface is) was ruled and
shipped: the partition narrows to `nav`/`aside` plus the topmost open dialog layer, and the dark
theme's `.btn-active` selected state gains a visible lightness step (Task 4). Finding 5 (daisyUI
pins every `.list-row` child to `grid-row-start: 1`, so overriding the container's
`grid-template-columns` alone does nothing) is the one finding this pass deliberately did not
repair; it files as a live entry in `ROADMAP.md`'s Next tier with the harvest's own measurement,
since site-side overrides exist and the engine-side repair needs its own design. The pass also
lands the grammar-ladder doctrine the harvest's pattern argued for, in
`docs/explanation/enforced-design.md`: every composition claim gets either a component or a
check, prose alone being the demonstrated failure mode. New findings start fresh below this
line.

- **`developer`: `CairnAdmin`'s `form` prop is typed as a failure envelope, but SvelteKit hands it
  whatever the last action returned, successes included.** `ContentFormFailure` (the prop's
  declared shape) is an intersection of only the content actions' `fail()` payloads; SvelteKit's
  generated `ActionData` unions every action's awaited return regardless of arm, and the
  assignment type-checks today only because every failure-payload field name happens to differ
  from every success-payload field name. C2b's refusal-channel pass hit this directly: sharpening
  every `fail()` from `ActionFailure<unknown>` to a precise `ActionFailure<T>` turned that
  previously-masked union into a real structural check, and `TidyResult.usage` (token counts)
  collided with `MediaDeleteRefusal.usage` (where-used rows), failing every consumer's
  `svelte-check` on upgrade until the field renamed to `TidyResult.tokens`. A new action whose
  success payload shares a field name with any action's failure payload reproduces this, with no
  warning until a consumer's own build. A type-level assertion in the library's own suite
  (`src/tests/component/CairnAdmin.test.ts`) now catches a same-repo recurrence at compile time,
  but the structural gap in the prop's own type is unrepaired. Candidate fix: type `form` to model
  both arms honestly, for example a discriminated union or a generic keyed by the last action name,
  rather than one merged failure-shaped intersection.

- **`developer`: four of the admin's non-enhanced forms lose their working (in-progress) state on
  any refused submit, and only `EditPage` echoes it back.** `NavTree` (a drag-reordered tree),
  `VocabularyAdmin` (in-progress renames/adds), `CairnTidySettings` (an edited conventions block),
  and `ConceptList`'s create dialog (the typed title/slug/date) all reset to their last-loaded state
  on a `fail()`, since none uses `use:enhance` and a plain POST re-renders a fresh document; only
  `EditPage` survives this because its own `SaveFailure` echoes the posted body back. Found by the
  C2b review round (a11y Warning 7, WCAG 3.3.7 Redundant Entry, new in 2.2); C2b itself fixed the
  misleading NavTree comment that claimed otherwise but left the behavior as found, since restoring
  the working state on all four screens is a larger, deliberately scoped change (either `use:enhance`
  across the four forms, which also changes their live-region/focus behavior, or echoing the posted
  payload back on each failure type). Candidate fix: pick one mechanism and apply it uniformly rather
  than case-by-case.

- **`editor`: a refused submit is announced `aria-live="polite"` on five admin screens, while
  `EditPage` treats the same class of message as assertive, and no screen moves focus to the
  refusal.** `NavTree`, `CairnTidySettings`, `VocabularyAdmin`, `ConceptList`, and `ManageEditors`
  route their refusal through a `sr-only` `aria-live="polite"` region; `EditPage` gives a refused
  submit its own assertive region. An error answering a user-initiated submit should interrupt
  (WCAG 3.3.1/4.1.3, ARIA APG), and separately, since these forms have no `use:enhance`, the
  refusal arrives as part of a freshly parsed document rather than a live DOM mutation, which is a
  known-unreliable trigger for AT announcement timing; moving focus to the banner (`tabindex="-1"`,
  `role="alert"`, an effect-driven `.focus()`) would fix both the announcement reliability and
  WCAG 2.4.3 in one mechanism. Found by the C2b review round (a11y Warnings 4-6). Candidate fix:
  give each of the five screens an assertive region matching `EditPage`'s, and move focus to the
  rendered banner on a refusal.

- **`editor`: `editLoad`'s `?new=1` create-dialog seed (`?title=`) renders an attacker-crafted query
  value as the entry's heading and title field to a signed-in editor.** `/admin/posts/anything?new=1&title=<text>`
  seeds `EditData.frontmatter.title`/`EditData.title` from the raw query string, unbounded; the
  sibling `?date=` field is correctly regex-bounded right beside it. Svelte escapes the render, so
  this is not XSS, but it is a form field and heading rendering arbitrary attacker text to a session
  that clicked a crafted link, pre-existing and outside the C2b refusal-channel diff (found by the
  C2b review round, security MEDIUM 5). Candidate fix: bound `title` the way `date` already is (a
  length cap plus a conservative character class), or move the create dialog's typed title into a
  short-lived server-side hold instead of the URL.

- **`editor`: a rename's 409 conflict lists every open branch's `concept/id`, including one an
  access-map role cannot reach.** `content-routes-core.ts`'s conflict-branch index for the rename
  refusal builds from every open `cairn/*` branch with no `canReach` filter, unlike
  `publishAllAction`'s own index for the same underlying data, which does filter. A role denied a
  concept still learns that concept has an in-progress, unpublished entry and its id. Pre-existing,
  outside the C2b refusal-channel diff (found by the C2b review round, security LOW 9). Candidate
  fix: filter the conflict-branch index through `canReach(runtime.access, editor, row.concept)` the
  way `publishAllAction` already does, collapsing an unreachable branch to a bare count.

- **`editor`: a refused save preserves the body but discards frontmatter field edits.** Found by the
  C2b main-loop visual read, not by a gate or a reviewer. Converting the save refusal from a
  `?error=` redirect to `fail(400, SaveFailure)` was meant to stop discarding an editor's work, and
  it half succeeds: `SaveFailure` carries `body`, so the prose survives, and `EditPage` reseeds it
  through `form?.body ?? data.body`. Every frontmatter field reloads from the stored record instead.
  Observed directly: clearing Title and saving re-renders with the alert and the body intact, and
  the Title reverted to its committed value. The realistic cost is larger than the test case
  suggests, since an editor who retitles an entry, adds a tag that fails taxonomy validation, and
  saves loses the retitle while keeping the prose. This is strictly better than the pre-C2b
  behavior, where the redirect discarded everything, so it is an incomplete improvement rather than
  a regression. Candidate fix: carry the submitted frontmatter on `SaveFailure` alongside `body` and
  reseed the fields from it, which also makes the failure shape honest about what it holds.

- **`developer`: `createAuthChannel`'s `ttl` config bag bundles more than durations.** Its name reads
  as a bag of lifetimes, and five of its nine fields are exactly that (`codeTtlMs`, `cooldownMs`,
  `sessionTtlMs`, plus the two length/count fields `codeLength` and `attemptCap` that aren't
  durations either). The other four, `requesterCap`, `identityCeiling`, `escalationThreshold`, and
  `liveRowCap`, are plain per-hour counts and a row cap with no time unit at all. The shape is
  spec-faithful: the design's own "Defaults and clamps" table groups every numeric knob together on
  purpose, since they're all clamped construction-time overrides with the same validation shape
  (`resolveLimit`), and splitting them into a `ttl` bag plus a separate `limits` bag would be two
  config surfaces to document and remember instead of one. Still odd to write in the reference page
  as `ttl?: { requesterCap?: number; ... }` with a straight face. No candidate fix proposed; noted
  for whoever next touches this surface, since the field carries no behavior of its own to change,
  only a name a future config redesign might reconsider.
