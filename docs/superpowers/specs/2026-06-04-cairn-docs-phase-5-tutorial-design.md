# Documentation Initiative Phase 5 Design Spec: the Tutorial arm

**Status:** approved (Geoff, 2026-06-04), ready for `superpowers:writing-plans`.

**Goal:** write the learning-oriented arm of the docs, a single tutorial page that carries a
newcomer from an empty directory to a first working cairn site running locally, touching the full
current feature set along the way. It is the fifth phase of the documentation initiative and the
last writing phase before the process phase (Phase 6).

**Parent spec:** `docs/superpowers/specs/2026-06-04-cairn-docs-initiative-design.md`. That spec
scopes Phase 5 as `tutorial/build-your-first-cairn-site.md`, end to end, validated against
`examples/showcase`, written last so it can cite the other arms.

## Where it sits

The consumer docs are a Diátaxis-informed four-arm set. Phases 1 through 4 landed the legibility
files, the reference arm, the explanation arm, and the guides arm. The tutorial is the fourth arm.
A tutorial teaches a newcomer once. The Phase 4 guides answer a returning adopter's single tasks.
The tutorial stays distinct from them by being one continuous teach-once narrative rather than a set
of task answers, and it links the guides and the reference at each milestone instead of restating
their content.

## What the tutorial builds

A small site with a wide feature surface. The content is deliberately minimal, two posts and one
page, so the reader is never bogged in content authoring. The breadth comes from the build itself:
each milestone unlocks a real shipped feature, so the tutorial covers the surface without becoming a
feature tour. The site mirrors `examples/showcase` at a smaller scale, which makes the showcase the
answer key the tutorial is validated against.

The feature checklist the tutorial must touch, every item a shipped engine feature:

- The adapter and schema: `defineAdapter` and `defineFields`, fixed concepts (dated posts and
  non-dated pages), `datePrefix`, and the schema as the single source of truth for the editor form,
  the validator, and the inferred frontmatter type.
- The render pipeline: `createRenderer` and the sanitize floor, delivered with `{@html}`.
- A custom directive component: `defineRegistry` plus a callout, authored in markdown through the
  directive grammar.
- Internal links: the `cairn:` token and the admin link-picker search that inserts it.
- The delivery surface: the home list through `createSiteIndexes` (summaries and the concept
  stamp), the `[...path]` permalink route, the RSS and JSON feeds, the sitemap, robots, and the SEO
  head.
- The manifest: the `cairnManifest()` Vite plugin and the `cairn:manifest` regenerate script.
- The nav menu: `site.config.yaml`, edited through the admin nav tree.
- The admin author loop end to end, run locally: log in, list, edit a post, insert the component
  through the dialog, run the link-picker search to add an internal link, save, and see the commit
  recorded.

## The narrative arc

One page, milestone sections in build order. Each milestone links the matching Phase 4 guide and
Phase 2 reference rather than reproducing signatures.

0. What you will build, and prerequisites. Link the explanation arm for the why.
1. Create the project: a fresh SvelteKit app, install `@glw907/cairn-cms`, add Tailwind and DaisyUI.
2. Define the adapter and schema (posts and pages).
3. Add content: two posts and one page as markdown files.
4. Configure rendering: `createRenderer`, the sanitize floor, deliver with `{@html}`.
5. Add a custom component: `defineRegistry` plus a callout, then author it in a post.
6. Wire the delivery surface: the content layer, the permalink route, the feeds, the sitemap,
   robots, the SEO head, the `cairnManifest()` plugin, and the `cairn:manifest` script.
7. Add the nav menu in `site.config.yaml`.
8. Run the admin locally with the dev backend: copy the fenced fixture and the route shims, start
   the dev server, log in, edit a post, insert the component through the dialog, run the link-picker
   search to add a `cairn:` internal link, save, and see the recorded commit.
9. Capstone: confirm the internal link resolves on the rendered page, and regenerate the manifest.
10. Where to go next: the four backend and deploy guides to go live, the explanation arm for the
    why, and the reference for the full surface.

## The starting point and the scaffolder-bound boilerplate

The P4 `create-cairn-site` scaffolder does not exist yet, so the tutorial starts from a fresh
SvelteKit app plus an install rather than from a generator. The reader chose a build-from-scratch
tutorial over a clone-the-showcase walkthrough.

The admin route wiring is the one heavy piece of that start. The `(app)` group, the layout and
content and nav shims, and the `$lib/cairn.server.ts` composer are small per file but repetitive,
and P4 will eventually emit them. The tutorial gives those as labeled copy-paste blocks, each with a
one-line explanation and a link to `admin-route-structure.md` for the shape. The teaching energy
goes to the parts that are the reader's real design work: the adapter, the schema, the content, the
components, the links, the delivery, and the nav. A short note states that the scaffolder will
generate this boilerplate later, and that until then the reader pastes it.

## The dev backend

The admin save loop needs a backend. In production that is a real GitHub App plus D1-backed
magic-link auth, which the Phase 4 backend guides cover and which cannot run from the
`adapter-node` showcase. For the local loop the tutorial provides a dev-only fixture that mirrors
the validated showcase, given as copy-paste:

- A fake-GitHub fetch double that intercepts the GitHub API and writes to an in-memory repo, the
  same mechanism as `examples/showcase/src/lib/fake-github.ts`.
- A fake-editor `hooks.server.ts` that injects an `editor` into `event.locals`, the same auth bypass
  the showcase installs.
- Route shims that pass `mintToken: () => 'dev-token'`, so no GitHub App key is needed in dev.

The fixture is gated behind an environment flag, mirroring the showcase's `SHOWCASE_FAKE_BACKEND`
with a generic name such as `CAIRN_DEV_BACKEND=1`. It is fenced loudly in the tutorial prose: dev
only, never set in production, it bypasses authentication and fakes commits. The handoff at
milestone 10 is explicit, since the deploy guide swaps in the real GitHub App and D1 auth and drops
the flag.

This dev backend is a test fixture promoted to a documented local-dev path. Cairn has no
first-class local admin sandbox today, which is the design gap the tutorial works around. That gap
goes to the friction log for P4 to address, since the scaffolder is the natural place to emit a
blessed dev backend instead of a copy-paste fixture.

## Validation and the gate

The page gate is the docs gate, the same bar Phases 3 and 4 used: `prose-guard` shows no blocking
prose tell, and every relative link resolves. prose-guard is tiered, so the blocking hook checks em
dashes, banned phrases and openers, and structural patterns, while the advisory lines (passive,
tricolon, burstiness, anaphora) are sweep-only and non-blocking. Judge the gate by the absence of a
blocking tell.

A tutorial carries a higher accuracy bar than a guide, because a newcomer follows it literally and
a broken step strands them. The tutorial gets two layers of accuracy validation:

- Cross-check against the showcase. Every code block is verified against the corresponding showcase
  file or pattern, with the showcase as the answer key. This is the per-milestone bar.
- Build-and-run reproduction for the capstone. The final task scaffolds the tutorial's target site
  in a throwaway directory by following the steps, runs `vite build`, and drives the dev admin loop
  once where practical, proving a newcomer who follows the tutorial lands a working site. This is
  the acceptance proof for the last task.

Build-and-run is the chosen bar for the capstone (Geoff, 2026-06-04). If the throwaway build proves
impractical against the unpublished package on `main`, the fallback is showcase cross-check, and the
fallback is recorded in the plan rather than taken silently.

## Friction logging

Design friction surfaced while writing goes to `docs/internal/docs-friction-log.md` under
`## Findings`, the standing practice. The known candidate from this design is the missing
first-class local admin dev mode, which the dev-backend fixture works around. Other sharp edges the
build surfaces (the repeated per-shim compose, the volume of route boilerplate a site hand-wires)
are logged as they appear, for P4.

## Format and wiring

One page, `docs/tutorial/build-your-first-cairn-site.md`, milestone H2 sections in build order, the
Diátaxis tutorial voice (teach-once, second person, confidence-building, no troubleshooting
digressions). The tutorial arm is a single page, so it gets no arm README; the docs index links the
page directly, unlike the multi-page guides, reference, and explanation arms. The final task flips
the docs-index Tutorial line from "Forthcoming in a later pass" to the live page and adds a
Current-pages entry.

The arm is docs-only. It runs on `main`, publishes nothing, and carries no version bump. No review
subagent or `/admin` smoke applies, since it changes no engine code, with the one exception that the
capstone build-and-run reproduction exercises the engine through a real build rather than a unit
test.

## Execution shape

Execute subagent-driven, `superpowers:subagent-driven-development`, from the cairn-cms directory on
`main`. One long page with heavy synthesis splits into a small number of Opus implementer tasks
rather than one giant task: a setup-and-scaffold half (milestones 0 through 3), a feature half
(milestones 4 through 7), the admin and dev-backend milestone (8 and 9), and the wiring and
build-and-run validation (milestone 10 plus the docs-index flip and the capstone reproduction). The
plan settles the exact task split. Bake the docs-gate override into each dispatch: do not run
`npm run check` or `npm test` for the prose tasks; the gate is prose-guard with no blocking tell,
links resolve, and the showcase cross-check, with the build-and-run reproduction reserved for the
capstone task.

## Approaches considered

- Spine and scope. A full showcase rebuild (every admin route, feed, sitemap, and the calendar) was
  rejected as heavier than a teach-once tutorial should be. A local loop plus a full deploy
  narrative was rejected because the deploy half is unvalidatable from the showcase and overlaps the
  lean guides. The minimal slice with a local loop was chosen, widened to touch the full feature set
  per the reader's call.
- The local admin loop. Describing the admin with screenshots and handing the live loop to the
  backend guides was rejected, because the admin-only features (the editor, the component insert
  dialog, the link-picker search) would be described rather than exercised. The provided dev-backend
  fixture was chosen so the reader runs the whole author loop locally.
- The starting point. Clone-the-showcase-and-modify was rejected in favor of build-from-scratch, the
  reader's call, with copy-paste blocks for the scaffolder-bound boilerplate as the pragmatic
  middle.
