# Wayfinder Starter Component Set Implementation Plan

> **For agentic workers:** `cairn-implementer` dispatches per task on a worktree off `main`
> (suggested branch: `wayfinder-components-1`); the main loop reviews each diff and gates
> between dispatches. Tasks specify outcomes and acceptance criteria; implementers own the
> code. Every dispatch reads `docs/internal/code-idioms.md` (binding) and skips agent-memory
> maintenance.

**Goal:** Ship the decided starter set — figure, gallery, video embed, pull quote, CTA,
FAQ/details, inline icon (joining callout and alert) — plus the expiring-announcement banner
as the island exemplar, replacing the converter demo. Each component is a worked
`defineComponent` in the showcase: schema-driven form, icon, and a render implementation in
the template's token idiom, so the set doubles as the reference example of the
component-authoring seam.

**Evidence base:** the component survey
(`2026-07-02-wayfinder-component-survey.md`) — gallery pays the aksailingclub photo debt;
icon is the daily-typed workhorse; the banner replaces `latest-bulletin`.

## Global constraints

- Engine untouched: this is showcase/template work (`examples/showcase/src`) plus, only if a
  component exposes a genuine engine gap, a filed note — never an engine edit.
- Charter idioms bind: S1 props, the `@theme` token layer only (the design review's
  extensibility lens will price this set — no hardcoded look-and-feel; the tag-filter-pill
  lesson), S2 dialog rules where relevant, a11y per the standing gates.
- Every component: `defineComponent` declaration with typed schema (the picker form must be
  fully schema-driven), a Lucide icon, directive render via the render-authoring helpers,
  and one usage exercised in showcase content that the snippet/build gates cover.
- The video embed is the privacy-respecting facade (thumbnail until click, no third-party
  request before consent); the gallery consumes Media Library references; the icon component
  renders only names from the adapter's declared `rendering.icons` set (loud failure on an
  unknown name, per the loud-boundary posture).
- The banner island: frontmatter-date-driven, renders nothing after expiry, no `$effect` for
  derivation, props-as-untrusted per the island rules; replaces `Converter.svelte` and its
  registry entry; `add-an-island`-guide compatibility preserved (the docs pass documents it).
- Fixtures: each new component gets a hostile-but-realistic fixture on the
  `wayfinder-review-fixtures` branch (rebased onto this work at review time) — the design
  review renders them.
- Full gate per task: `npm run check` 0/0, `npm test` exit 0, showcase build, e2e-relevant
  specs, `check:surface` unchanged (nothing here touches the engine surface).

## Tasks

1. **Content components, batch A (figure, gallery, icon).** The media-facing trio; gallery's
   Media-Library-reference consumption is the hard part (multi-image field schema). Icon is
   small but its unknown-name loud failure and set-driven picker matter.
2. **Content components, batch B (video facade, pull quote, CTA, FAQ/details).** FAQ on
   native `<details>`; CTA restrained (the Aura question belongs to the design review).
3. **The expiring-banner island + converter retirement.** Registry swap, island contract
   honored, showcase content updated; the fixtures branch gains a banner fixture (active and
   expired states).
4. **Consolidation.** Fixture-branch rebase with new-component fixtures; changelog under
   `## Unreleased` (template-only window, no `Consumers must:`); ROADMAP entry marked done;
   post-mortem; handoff note to the design review (step 4) listing what to look at.

## Acceptance

The set renders in the showcase with schema-driven picker forms for every component; all
gates green; the converter is gone; the fixtures exercise every component including both
banner states; the token-layer rule holds (grep-proven: no new hardcoded look-and-feel in
component markup); the design review receives the set plus fixtures as its artifact.
