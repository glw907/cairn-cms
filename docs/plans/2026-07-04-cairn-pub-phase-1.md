# cairn.pub Phase 1: the living demo ships

> Executes the approved architecture (`docs/superpowers/specs/2026-07-04-cairn-pub-architecture.md`),
> AFTER the responsive pass folds and the rename sweep lands. Workflow-authorized. The prose
> seats are the main loop's (home, the Waymark page, the help landing adaptation, the two
> posts); assembly and routes dispatch. Every prose artifact passes the register machinery.

**Goal:** cairn.pub becomes the four-door living demo: the Waymark template wearing the
cairn theme, managed by its own live admin, with every page demonstrating what it describes.

**The one external dependency:** the editor walkthrough video. The video component links out
(never embeds), so the recording needs a hosted home (Geoff's YouTube/Vimeo). The Waymark
page ships with the video slot's copy present and the block added when the URL exists —
launch does NOT wait for it.

## Global constraints

- The cairn-pub repo consumes `@glw907/cairn-cms` from the registry by range: **Phase 1
  needs a published release carrying the neutral template, the theme layer, and the engine
  pass** — the accumulated `## Unreleased` window rolls into one cut first (the
  `cairn-release` skill; this satisfies its "consumer needs it now" trigger).
- The concept model is stock (Posts + Pages, unmodified); the routes compose stock delivery
  exports, and the spec frames this as the composability demo.
- Component use follows the product's own semantics (the review's taste rulings: reveal as
  prose, banners entry-scoped, FAQ for real questions, CTA only on the Waymark page).
- Register machinery on all prose; claims gates on every mechanical statement; the site's
  permalinks and feeds verified live post-deploy.

### Task 1: The release cut

**Outcome:** the unreleased window (docs overhaul, engine pass, neutral split, theme layer,
responsive pass) publishes as one release via the `cairn-release` skill: gate green at the
cut, free number verified, notes rolled from the window, OIDC publish verified on the
registry.
**Acceptance:** `npm view @glw907/cairn-cms version` serves the new number; the release body
carries the window.

### Task 2: The repo reset

**Outcome:** cairn-pub rebuilds as a fresh scaffold-copy of the current template (the
showcase, post-sweep naming), pinned to the Task-1 release from the registry, with the cairn
theme applied (`waymark.css`'s successor file + one import). The existing deploy's bindings
(AUTH_DB, EMAIL, MEDIA_BUCKET), the wrangler config, and Geoff's owner row carry over.
**Acceptance:** local build green; `/admin` sign-in works via the dev backend locally; the
theme renders (spot-check against the cairn-theme baselines).

### Task 3: Routes

**Outcome:** home composes the `home` Pages entry with the featured-lead + recent-posts data
(the shipped `byId` + `posts.all()` pattern); `/blog` receives the archive shape (index +
tag chips); `/docs` renders the docs README as an on-domain landing linking into the GitHub
arms; `/help` renders the help landing entry; feeds/sitemap confirmed wired (inherited).
**Acceptance:** every nav door lands on-domain; the blog feed validates; a Playwright smoke
covers the four doors + a post page + 404.

### Task 4: The engine-adjacent item

**Outcome:** `summaryFields` supports image projection (the featured card's hero), in
cairn-cms with its test and reference-page rider; rides the next release or a patch if
Task 3 needs it before then (implementer verifies whether the `byId()` fallback suffices
for one featured entry first — if it does, this task downgrades to a ROADMAP note).
**Acceptance:** the featured card renders its hero without private-API reach-ins.

### Task 5: Content (the main loop's prose, dispatched assembly)

**Outcome:** the entries, each through the register machinery before commit:
- `home`: the identity opening, the demo reveal AS PROSE, the Waymark narrative section
  with the link, built-with (ecxc.ski, 907.life) in the narrative; footer administrivia.
- `waymark`: the get-started door per the spec — what Waymark is; a SMALL curated set of
  viewport figures; the one-file reveal with the theme file linked; what's in the box with
  the live styleguide link; the FAQ block (maintained? cost? auth?); the CTA to the
  tutorial; the make-it-your-own section; the video slot copy.
- `help`: the hand-adapted standalone landing (the welcome's content reshaped for the web,
  its guide links pointing at GitHub, honestly labeled; no LIVE-UI markers).
- Two posts: "Waymark and the cairn theme" (the split story) and "How this site works"
  (the dogfood tour). Tags: releases, design, engineering.
**Acceptance:** register + claims gates on every artifact; the reveal contains no callout;
banner absent at launch (no live announcement).

### Task 6: Deploy and verify

**Outcome:** deployed over the placeholder; live verification: the four doors, a magic-link
sign-in (Geoff's address), a save + publish round-trip on a real post (the deferred live
admin smoke this initiative has owed since the tag-management pass), feeds fetch, permalinks
stable, the admin help affordance deep-links to `cairn.pub/help`.
**Acceptance:** the live smoke checklist green; STATUS + memory roll; post-mortem with both
budgets.
