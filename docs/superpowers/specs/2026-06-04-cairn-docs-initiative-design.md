# cairn-cms documentation initiative

> Design spec. Authored 2026-06-04. Audience for the docs being built: external adopters who
> install `@glw907/cairn-cms` and build their own sites. Delivery surface: markdown in-repo,
> rendered on GitHub and npm. No hosted docs site.

## Why now

cairn-cms runs two production sites and publishes to npm at `0.26.0`, yet its docs are a
mix of historical artifacts and a few current pages. An adopter opening the repo today
trips over a 166 KB `PLAN.md`, a `creating-a-cairn-site.md` that still describes the
reverted better-auth design, and no clear entry point. This initiative produces a clean,
self-contained documentation set held to 2026 best practice for an npm package, and it
makes documentation a standing dimension of every future pass so the set stays true.

Two production sites also raise the cost of a careless change. Development continues with
more caution from here. Every breaking change ships with its migration note, and the docs
that describe the changed surface move in the same pass.

## Audience and scope

The consumer-facing docs assume zero prior context. A stranger should be able to evaluate
the project, install it, build a first site, extend it, deploy it, and upgrade it from the
docs alone. The project-legibility docs (README, SECURITY, architecture, accurate
metadata) make the project trustworthy to an evaluator without inviting outside PRs. There
is no CONTRIBUTING set, no code of conduct, and no issue templates in this round.

## Status and contribution message

One status block lives in the README, ROADMAP, and SECURITY so the message never drifts.
It states four things. cairn-cms runs two production sites today, ecnordic.ski and
907.life. It is `0.x` and breaks between minor versions. The author is still working
through the core-feature roadmap. The project stays closely held until that core lands.

The contribution stance is a door left ajar. A contributor who feels inspired is welcome to
open an issue or discussion to start a conversation, with the caveat that there is no formal
contribution process yet. This is not an open call for PRs.

## Reference projects (the benchmark set)

The writers measure each doc against a known-good comparison set.

- **Keystatic** (`keystatic.com/docs`) is the closest functional analog: git-backed,
  schema-in-TypeScript, Markdown and YAML, no database, commits to GitHub, MIT, aimed at
  the same one-to-three-editor marketing and blog sites. Benchmark its information
  architecture and its candid limitations framing.
- **SvelteKit docs** model how-to versus reference phrasing for the same framework.
- **Astro docs** are a Diátaxis exemplar with real CMS-integration guides.
- **Zod** (`zod.dev`) sets the 2026 bar for a TypeScript library README and reference.
- **Decap CMS** and **TinaCMS** are secondary git-CMS comparisons.

## Organizing principle

The consumer docs follow a Diátaxis-informed four-arm structure. A tutorial teaches a
newcomer once. How-to guides answer a returning adopter's task questions. Reference
documents the API surface with the TypeScript types as the source of truth. Explanation
covers the architecture and the design rules. The README is the hub that routes to all four
arms plus the roadmap and security policy.

This frame absorbs two alternatives that were considered. A surface-organized layout (one
page per export subpath) becomes the Reference arm. A journey-organized narrative (evaluate,
install, build, extend, operate, upgrade) becomes the tutorial's ordering. Neither works as
the top-level frame on its own, because a pure surface layout fails a newcomer and a pure
journey layout blurs the teach-once and remind-me split that makes docs reusable.

## Directory layout and the public/internal split

```
README.md          rewritten hub: what and why, status block, quickstart, routes to everything
CHANGELOG.md       keep
SECURITY.md        new: reporting, supported versions, auth and render security summary
ROADMAP.md         new: prioritized future functionality, status block
LICENSE            keep
docs/
  README.md        docs index, the map of the four arms
  tutorial/        build-your-first-cairn-site.md (end to end, validated against examples/showcase)
  guides/          set-up-the-github-app, configure-auth-and-d1, define-an-adapter-and-schema,
                   configure-rendering, wire-the-delivery-surface, deploy-to-cloudflare, upgrade-cairn
  reference/       core, sveltekit, components, delivery, delivery-data, vite, cli-cairn-manifest
  explanation/     architecture, data-tiers, security-model, content-model
  internal/        PLAN.md, ARCHITECTURE.md, ARCHITECTURE-CRITIQUE.md, FORWARD-COMPAT.md,
                   dx-feedback*, dx-backlog* (each gets a "historical, superseded by docs/" header)
```

One coupling constrains the split. The `cairn-pass` skill reads and writes `docs/STATUS.md`
and the `docs/superpowers/` tree, so those stay at their current paths rather than moving
into `internal/`. They are dev-process files, and the public docs index simply does not link
them. Everything historical and free of tooling dependencies moves into `docs/internal/`, so
an adopter browsing the repo never reads the reverted-better-auth, pre-render-engine past as
if it were current.

## Reference arm: source-of-truth rule

Each reference page covers one export subpath from `package.json`: `.`, `/sveltekit`,
`/components`, `/delivery`, `/delivery/data`, `/vite`, plus the `cairn-manifest` bin. The
TypeScript types in `src/lib` are the source of truth. A page lists the exported symbols,
their signatures, and a worked usage drawn from `examples/showcase`. A public-API claim that
the code does not support is a defect the accuracy gate must catch.

## What gets written, refreshed, retired

- **Rewritten and split:** `creating-a-cairn-site.md` is stale, so it is rewritten and split
  across the tutorial, guides, and explanation arms rather than relocated whole.
- **Relocated with a light refresh:** `upgrading.md` becomes `guides/upgrade-cairn.md`.
  `data-architecture.md` becomes `explanation/data-tiers.md`; it is already good.
- **New:** the README rewrite, SECURITY.md, ROADMAP.md, `docs/README.md`, the seven
  reference pages, the guides, the tutorial, and `explanation/{architecture, security-model,
  content-model}.md`.
- **Retired to `docs/internal/`:** PLAN, ARCHITECTURE, ARCHITECTURE-CRITIQUE, FORWARD-COMPAT,
  dx-feedback, dx-backlog, each with a one-line historical header.
- **Accuracy gate:** every public page's API claims are checked against `src/lib` exports and
  types. No better-auth, Carta, or open-ended "collections" language survives in a public page.

## ROADMAP source and shape

A first ROADMAP draft is synthesized from `docs/STATUS.md`, the dx-backlog, and the
initiative memories, tiered Now, Next, Later, and Considering. That draft goes to the author
to reorder before it lands, so final priority stays the author's call. A status block sits at
the top so a reader sees the honest state before the plans.

## SECURITY.md

GitHub private vulnerability reporting is the primary channel, which the 2026 default favors
because there is nothing to publish or rotate. The file carries no email address. Private
advisories are enabled on the repo during Phase 1. The body summarizes the supported-version
policy and the auth and render security posture, linking the explanation arm for detail.

## Docs as a pass dimension (the going-forward rule)

The catch-up only stays true if every future pass maintains it. The rule becomes a standing
gate in three places.

- **`cairn-pass` skill:** the pass-end ritual gains a documentation step. Before a pass is
  done, the relevant `docs/` arm and the CHANGELOG or `upgrade-cairn.md` are updated for
  whatever the pass changed. A public-API change fails the gate until its reference page
  matches. This sits beside the existing code-simplifier, `npm run check`, and `npm test`
  gate.
- **`cairn-cms/CLAUDE.md`:** a short "Documentation is a pass dimension" section states the
  rule and points at the `docs/` structure, so the expectation survives a skill bypass.
- **Memory:** a feedback memory records the docs-dimension rule, and a project memory records
  the heightened-caution stance now that two production sites depend on the package.

The scope of this round is `cairn-pass`, the library where these public docs live.
`site-pass` already carries an architecture and STATUS update step, so it gains a light
"keep the site's own docs current" line rather than a rebuild.

## Phasing

Each phase is one plan, executed with `superpowers:subagent-driven-development`.

1. **Legibility and split.** README rewrite, SECURITY.md, ROADMAP.md draft, npm metadata
   audit, `docs/internal/` relocation, `docs/README.md` skeleton, private advisories enabled.
   Smallest blast radius, and it fixes the repo's face first.
2. **Reference.** The seven subpath pages, each checked against the type surface.
3. **Explanation.** architecture, data-tiers, security-model, content-model. Mostly a refresh
   of existing good material.
4. **Guides.** The task how-tos. Depends on the reference pages existing.
5. **Tutorial.** The end-to-end first-site build, validated against `examples/showcase`,
   written last so it can cite the rest.
6. **Process and infra.** Bake the docs dimension into `cairn-pass`, `CLAUDE.md`, and the
   light `site-pass` line. Run last so it references the settled `docs/` structure. This phase
   touches user-scoped files (the `cairn-pass` skill, memory) alongside the in-repo CLAUDE.md.
   The memory capture happens up front, since it is true regardless of how the writing lands.

## Quality gates per phase

- prose-guard clean against the writing-voice standard on every authored page.
- API claims verified against `src/lib` and the exported types.
- Links checked across the `docs/` tree and the root files.
- Any doc that asserts an API shape is cross-checked against `examples/showcase`.

## Out of scope

A hosted documentation website. A CONTRIBUTING set, code of conduct, or issue and PR
templates. Generated API docs from TypeDoc; the reference arm is hand-curated against the
types. Heavy changes to `site-pass` beyond the one docs-currency line.
