# Roadmap

cairn-cms runs two production sites today, [ecxc.ski](https://ecxc.ski) (formerly ecnordic.ski) and
[907.life](https://907.life). It is `0.x` and breaks between minor versions; the latest published
release is `0.68.0`. The author is still working through the core-feature roadmap, and the project stays
closely held until that core lands.

This roadmap is a direction, not a commitment. Priorities shift as the production sites surface needs,
and items move up from lower tiers as the core fills in.

**This file is a pass dimension.** A pass that ships a roadmap item marks it done and removes it from the
live tiers, and a pass that surfaces a new direction files it into the right tier, the same way a pass
updates its reference docs. Shipped history lives in `docs/STATUS.md` and the per-plan post-mortems, not
here, so this file stays a forward view.

## Now

- **The Contract v2 plan series.** Phase 3a (object/array containers) shipped as `0.71.0` (held unpublished).
  Next is phase 3b (the adapter restructure into six subsystem groups plus the concept model: `defineConcept`,
  an open `content` record, declared routing, URL policy home), then 3c (the field-system unification onto
  `fields.*`), then the `Backend` seam, then render-as-component with opt-in islands. Spec:
  `docs/superpowers/specs/2026-06-25-cairn-contract-v2-design.md`.

## Next

- **Taxonomy and tag delivery.** Consume the `taxonomy` marker reserved by the reference field so a
  `multiselect` or a reference-shaped tag field drives first-class tag pages and feeds: a tag index, a
  per-tag archive, and tag-aware delivery resolution. The reference pass reserved and documented the marker;
  this pass wires it into the delivery surface.
- **Body-link cross-branch delete protection.** Lift the body-link delete guard from its current main-only
  posture to the strict, fail-closed cross-branch reference index that the reference delete and rename gates
  now use, so deleting a body-linked target refuses across every open branch the same way a referenced
  target does. The reference pass left this asymmetry deliberate (locked decision 9); this closes it.
- **Nested references inside a container.** Lift the reference field into an `object` or `array(object)` leaf;
  phase 3a deferred containers to scalars and image only. Needs the frontmatter-edge extractor to descend into
  object leaves, the byte-preserving rename rewriter to address a nested YAML path (the corruption-prone part
  the references fan-out caught bugs in), and the cross-branch index plus rename and delete gates to cover the
  nested edges.
- **The `create-cairn-site` scaffolder.** Sequenced after Contract v2 phases 1-2 so it bakes the template
  against v2. The pre-B3 engine/DX slot lands first (remove the calendar route, the GitHub-App "appId is
  config, not secret" trap, the doctor that greens while the deploy fails, and the other first-hour DX
  warts a dogfood found), then Part B3 (defaults) and B4 (options plus first-run), then the Part C
  generator. Plans under `docs/superpowers/plans/2026-06-2*-cairn-scaffolder-*`.

## Later

- **Frontmatter field `description` channel.** Schema-authored per-field help rendered under the input,
  so the Details panel stops showing fields with no hint. Dovetails with the Contract v2 field work.
- **Nested-image delivery: seo and needs-alt.** Allow `seo: true` on an image inside a top-level `object`
  (phase 3a forbids it because `seo-fields.ts` reads a hardcoded key list, not the schema), and surface a
  nested image's missing alt in the editor's needs-alt advisory (3a's notice enumerates top-level images
  only). Both unlock when delivery seo resolution walks the concept schema, a fit for the 3b concept work.
- **Details panel default-open heaviness.** The Details slide-over defaults closed and buries every non-title
  field as the vocabulary grows; phase 3a's repeatable rows collapse per row, but the panel itself is
  unrevisited. Look at its default and grouping now that containers add fields.
- **`itemLabel` as a function and cross-field row validators.** The array `itemLabel` is a serializable
  field-key string this phase; a derived label and a per-row cross-field validator ride the data-versus-behavior
  split that lands in phase 3c (the `BehaviorTable` seam already exists in `fieldset.ts`).
- **Editor-help later slices.** The screen-contextual slide-over, a route- and concept-keyed help-content
  registry, and a standing Help home with a labeled launcher. The foundation shipped in `0.61.0`-`0.62.1`.
- **Per-field advisory seam plus live slug recompute.** An editor-side advisory-validation surface, and a
  slug preview that recomputes as the author retypes.
- **`supportContact` personalization.** A richer shape than the current bare string, a name plus a
  contact, so a self-serve hand-off reads personally.
- **Date-vs-publish field redesign.** A product look at the date field's label and affordance, since it
  reads as if it might schedule publishing.
- **Starter content and onboarding progress.** Concept-differentiated seed content for the strongest
  first-run activation, and a per-editor getting-started progress record.
- **Remaining media work.** Media Pass D and the Media Library direct upload, plus the owed live
  bulk-delete admin smoke. Passes 1-3c and A-C shipped across `0.57.0`-`0.59.0`.
- **Small DX debt.** Fix the flaky spellcheck `e2e` so it stops blocking releases (a settle-aware
  assertion, not a single `toHaveCount`), give the component picker dialog a `sm:`-breakpoint bottom-sheet
  so it is not an unconditional `85vh` on a short viewport, and resolve the worktree dual vite/kit install
  collision (the showcase typecheck throws ~12 dependency-`.d.ts` errors under a symlinked-`node_modules`
  worktree, so the local consumer-build proof currently leans on the e2e build; CI's real checkout is
  clean). The first two are in `docs/internal/docs-friction-log.md`.
- **Migrate cairn's CSRF-disable before SvelteKit removes `checkOrigin`.** cairn's admin CSRF ownership
  depends on `csrf: { checkOrigin: false }`, deprecated in SvelteKit 2.61. `trustedOrigins` cannot replace
  it: a missing-`Origin` POST is always forbidden, and the check runs before the `handle` hook. The
  planned fallback is an edge Transform Rule that injects `Origin` for `/admin` POSTs; the higher-leverage
  path is the upstream issue (sveltejs/kit#15992). Track the removal and act before a major lands.
  Reasoning in `docs/cairn-dx-feedback-2026-06-09-907-0.36-retrofit.md`.

## Considering

- **Broader admin extension surface.** Widen the `CairnExtension` seam so a site owner adds admin panels
  and actions within a bounded namespace, alongside the existing build-outside-it path.
- **A third content concept (Fragments).** The fixed-concepts model leaves room for a Fragments concept
  beyond Posts and Pages, scoped when a production site needs it.
