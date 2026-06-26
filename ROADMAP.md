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

- **Contract v2 references (phase 2).** Lift the rename-safe `cairn:<concept>/<id>` content graph out of
  prose body links into a frontmatter `fields.reference` field: a searchable editor picker over the target
  concept, build-time integrity (dangling fails the build, delete refuses while referenced, rename repoints
  across open branches), and delivery resolution to the target's permalink and summary. The category's
  biggest gap and cairn's biggest opportunity. Phase 1 (the cutover) shipped as `0.69.0` (merged, held
  unpublished). Carry the cutover's load-bearing carry-forward into the plan: a `form → frontmatterFromForm
  → serialize → parse → formValues` round-trip property test is a required deliverable for the reference
  field (the cutover nearly shipped a silent datetime round-trip loss). Spec:
  `docs/superpowers/specs/2026-06-25-cairn-contract-v2-design.md`.

## Next

- **The Contract v2 plan series (after references).** A bounded one-level `object`/`array` primitive with
  adapter and component-system unification (and, since nested repeatable rows make the editor's Details
  slide-over heavy, a look at that panel, which defaults closed and buries every non-title field as the
  vocabulary grows), then the `Backend` seam (a GitHub-App default that folds in `@glw907/cairn-cms-dev`),
  then render-as-component with opt-in islands.
- **The `create-cairn-site` scaffolder.** Sequenced after Contract v2 phases 1-2 so it bakes the template
  against v2. The pre-B3 engine/DX slot lands first (remove the calendar route, the GitHub-App "appId is
  config, not secret" trap, the doctor that greens while the deploy fails, and the other first-hour DX
  warts a dogfood found), then Part B3 (defaults) and B4 (options plus first-run), then the Part C
  generator. Plans under `docs/superpowers/plans/2026-06-2*-cairn-scaffolder-*`.

## Later

- **Frontmatter field `description` channel.** Schema-authored per-field help rendered under the input,
  so the Details panel stops showing fields with no hint. Dovetails with the Contract v2 field work.
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
