# Page plan: Theme your public site

Page: `docs/extend/theme-your-public-site.md`. Brief: `docs/internal/briefs/extend/theme-your-public-site.json`.
Page type: task guide. Status: committed page under rework (plan task 7b resolution, from this plan).
Written 2026-10-03 by the plan step of the docs page chain (stage 2a task 7c). Revised three times
the same day: on the structural edit's first reading of this plan (one blocking finding, four
advisory), each disposed under Round-3 structural edit below; in resolution run 2 on its second
reading (one blocking finding, two advisory), each disposed under Second plan read below; and on
its third reading in the same run (one blocking finding, two advisory), each disposed under Third
plan read below. Every check the three plan reads passed is kept as it was.

Inputs read: the outline entry in `docs/internal/outlines/extend.json`; the page anatomies and the
developer drafting brief in `docs/internal/docs-register.md`; this page's entries in
`docs/superpowers/research/2026-09-30-draft-docs-2a-pilot-job-read.md` ("Findings by page", "Owner
ruling", "Owner rulings at resume") and `docs/superpowers/research/2026-10-01-draft-docs-2a-rework-record.md`
("### theme-your-public-site", the five round-2 blocking findings and the non-blocking ones);
`docs/superpowers/research/2026-10-01-draft-docs-2a-page-plan-diagnosis.md`; both plan reads under
"### theme-your-public-site" of
`docs/superpowers/research/2026-10-03-draft-docs-2a-resolution-run-record.md`; every fact bullet named
below in `docs/internal/facts/extend.md` and `docs/internal/facts/reference.md`; the reference pages
each subordination names (`docs/reference/public-css.md`, `docs/reference/cairn-audit.md`,
`docs/reference/cli-cairn-media-seed.md`, `docs/reference/core.md`); the two exemplars; the showcase
sources the facts cite where a claim sentence below needed its shape confirmed
(`examples/showcase/src/chassis/theme-toggle.ts`, `examples/showcase/src/theme/theme-names.ts`,
`examples/showcase/src/routes/(site)/+layout.svelte`, `examples/showcase/src/chassis/README.md`,
`examples/showcase/src/theme/theme.css`, `src/lib/admin/preview-doc.ts`,
`templates/waymark/src/theme/components/ArticleView.svelte`, `templates/waymark/src/theme/theme.css`).

Headings in this plan are the page's headings, verbatim. A claim inventory `section` names one of
them. The introduction is the untitled text under the H1 and is named `Introduction` here.

## What the page argues

A scaffolded site's look is a set of token values that one theme, Waymark, declares over roles the
engine defaults in the lowest cascade layer, on top of a chassis of design-neutral modules that
every scaffolded site shares. Owning the design is therefore a question of how far the theme
reaches, never of editing the chassis or the engine: about fourteen values for a re-skin that keeps
Waymark's layouts, a theme's own style sheets, chrome, and compositions for a port that keeps only
the chassis. Whatever the theme writes wins, because the engine's roles sit in `@layer theme`, the
lowest layer Tailwind declares, and the three public-scope audit rules then check that every value
came from a token and that every text pair the theme paints reads. The job sentence names exactly
that spine: re-skin through the token tiers, or port onto the chassis, then iterate locally until
the audit gates pass.

The order argues itself from what a reader must hold before each edit. The introduction routes
the two readers the outline names (a scaffolded site and a hand-built one) and names the six pages
that own what this page leaves out, which disposes the structural edit's third blocking finding.
Preconditions follow, and both readers read them: the introduction routes the hand-built reader
onward from Before you begin, never past it. The hand-built on-ramp comes next and early, because
the introduction routes a hand-built reader to it and the job read faulted its mid-page placement:
three steps give that reader the styling stack the scaffold would have supplied, and its closing
sentences name every later section that applies to a site with no chassis, each with the part of
it that applies. Two exposition sections then give the model both recipes need, in dependency
order: first which files are the theme's to edit (the chassis boundary), then which declaration of
a key wins (the token tiers and the two cascade orders, the Astro exemplar's cascading-order take).
Each carries only what the first edit needs: the boundary's upgrade rationale is one clause, and
the tiers name only the key families the recipes edit, the reference holding the rest. The local
loop comes before any edit, the Shopify exemplar's shape (the dev server runs before the theme is
touched), and it carries the dev-backend caveat that decides whether seeded media shows. The two
recipes follow, cheaper first: the re-skin, with the status rebrand as its deeper subsection,
reached by the re-skin's optional step 6 and handing back to its step 7, the checks (the third plan
read's blocking finding: a subsection no step routed to was one a literal reader never met, and a
reader who did the rebrand had no route to Verify); then the port, which opens on the one routing
sentence the rebrand's hand-off used to carry (a design the site already has takes the port), with
the chassis rules before its steps and the conventions after them, reached by an explicit forward
jump from the step that adds a class, which disposes the structural edit's first blocking finding.
Rendered markdown comes after both recipes, because its first sentence tells each recipe what it
has already changed and what it may still choose, the task lead-in the structural edit's second
blocking finding asked for, and each recipe's closing steps route the reader by name and never
past a section that holds its work: the re-skin makes its one flourish edit inline in step 5 and
names Style rendered markdown only for what the three flourishes are (the third read's advisory on
the round trip), offers the status rebrand in step 6, and jumps in step 7 to Verify the theme,
which is safe because the scaffold already sets `editor.preview`, and the port continues through
Style rendered markdown and Style the editor preview, the two sections that hold its remaining
work, before Verify the theme (the second plan read's blocking finding; a port that jumped
straight to Verify would fail check 3 with its `editor.preview` still naming the old sheets). The
editor preview follows, since it points at
compiled sheets that now exist, and its first sentence names who acts: the scaffold already sets
`editor.preview`, so a re-skin changes nothing there, a port edits it when a compiled sheet or a
wrapper class changes, and a hand-built site adds it. Verify closes the task; the failure path and
the see-also close the page, per the anatomy.

The committed page carried every fact at the same weight. This plan ranks them: a fact the reader
acts on or verifies inside this task stays on the page in one sentence; a member catalogue, a
rule's resolution algorithm, a command's download path, and a changed-defaults table are detail the
reader would read at the reference entry when they reach for it, so each is subordinated to the
entry named in Dispositions. A vendor specific (Tailwind's and daisyUI's install steps) is linked,
never copied (register, "A vendor's specifics get a link"). Geoff's 2026-10-01 rulings govern: a
plan may push a fact off the page, and that disposition is not a dropped fact.

Heading slugs other pages depend on: `docs/extend/add-cairn-to-a-sveltekit-app.md` links
`#theme-a-hand-built-site` twice, so that heading stays `Theme a hand-built site`. This page links
`#style-the-screen` in `docs/extend/add-a-custom-admin-screen.md`, which that page's plan keeps.

## Introduction

No heading. No one-line imperative contract; the opening states the subject. Citations live in the page's brief JSON.

1. Para 1: cairn styles its admin in daisyUI and Tailwind; public pages are design-agnostic (site brings `render` and styles); the engine's part is the `cairn-public.css` defaults in `@layer theme`; the one place a theme reaches the admin is the editor preview frame.
2. Para 2: the setup command ships Waymark wired into the shared chassis; both are files in the site's tree, the npm package ships neither, so no engine version governs the look; the look is token values over engine-default roles, so ownership is a matter of reach.
3. Para 3: reader routing. Re-skin (about fourteen color and type values, Waymark layouts kept); port (existing design onto the chassis); hand-built site starts at Theme a hand-built site after preconditions; scaffolded site skips it and follows boundary, tiers, local loop, one recipe, rendered markdown and preview, verify, resolve findings; both recipes end at the three `cairn-audit` public-scope rules; audit-finding arrivals jump to Resolve an audit finding.
4. Prior knowledge: Tailwind v4 theme variables and cascade layers, daisyUI theme blocks, Svelte components.
5. Out-of-scope list (six pages): scaffolded-site-files, configure-rendering, build-the-public-routes, configure-media, run-cairn-audit-on-your-site, style-the-screen.

Superseded 2026-10-04 by Geoff's intro ruling (framing and reader-first intros, never an imperative opening); see docs/internal/briefs/extend/theme-your-public-site.framing.md.

## Sections, in order

Each section states its heading, the one sentence a reader takes from it (the section's first
sentence on the page, decided here), the facts it draws on, what the drafter puts in it, and its
hand-off. The first sentence may be re-worded to the register's voice; its claim is fixed. A fact
"cited again" is placed in the section that holds its disposition and cited a second time where
the page needs it.

### Before you begin

First sentence: The steps assume a scaffolded site, or a hand-built site brought to the same shape,
and, for seeded media, a deployed site with a media library.

Facts: `f:rxj43c` (cited again), `f:7pv6se` (cited again).

Content. Two preconditions as a bulleted list, each with a link to what produces it (anatomy
item 2): a site that `create-cairn-site` scaffolded, or a SvelteKit site that
`docs/extend/add-cairn-to-a-sveltekit-app.md` produces (`f:rxj43c`); for seeded media in local
development, a deployed site with a media library, which `docs/extend/configure-media.md` sets up,
since a site with nothing deployed has nothing to seed (`f:7pv6se`). The committed page's two
other bullets are gone: the `daisyui` bullet was circular for the hand-built reader (the register
editor's blocking finding at `:30-32`), and its dependency fact moves to the lead-in of Verify the
theme; the Tailwind bullet cited `f:f28x0x` for a vendor install step it does not state (the
round-2 fact read's note at `:28-29`), and the hand-built section's step 1 now installs Tailwind
and daisyUI together behind vendor links.

Hand-off: a hand-built site adds its styling stack first.

### Theme a hand-built site

First sentence: A site built without the setup command adds the styling stack the scaffold would
have supplied, Tailwind, daisyUI, and the engine's public style sheet, and then reads only the
sections of this page that apply to a site with no chassis.

Facts: `f:f28x0x`, `f:c4nnu9` (scoped to the one-asset claim and the key-by-key reference). Cited
again: `f:rxj43c`, `f:ylmc9c`, `f:hva8r5`, `f:7pv6se`, `f:j2qzct`, `f:18qj2u`.

Content. One sentence of why before the steps: the engine ships its public defaults as one CSS
asset, `@glw907/cairn-cms/cairn-public.css`, which `docs/reference/public-css.md` documents key by
key (`f:c4nnu9`; this is the page's first and only body link to that reference, Wikipedia's
first-occurrence rule, the round-2 register editor's note at `:314-317`); the sheet declares no
daisyUI theme variable and activates no daisyUI plugin, yet its roles read daisyUI roles such as
`--color-base-content` and `--color-primary` (`f:f28x0x`). Steps, one action each, the location
first: (1) in the site directory, install Tailwind CSS and daisyUI, following Tailwind's SvelteKit
guide and daisyUI's installation guide (vendor links, no copied commands; `f:f28x0x` for the
daisyUI requirement); (2) in the site's global style sheet, import
`@glw907/cairn-cms/cairn-public.css` once, after `@import "tailwindcss"` and before the sheet that
styles rendered markdown, so a later declaration in the site's `@theme` block wins over the sheet's
two `@theme` colors, `--color-muted` and `--color-card-border` (`f:f28x0x`); (3) in the same style
sheet, add a `@plugin "daisyui/theme"` block with the site's role colors (`f:f28x0x`). The
illustrative style sheet (the committed snippet, framed as illustrative, the theme block eliding
most of daisyUI's keys) follows step 3. After the steps, the hand-off names every later section
that applies to a site with no chassis, each with the part of it that applies, as a short
bulleted list (the structural edit's round-3 advisory asked for the sections the first draft left
out): the role half of Token tiers and cascade order decides which declaration of a role wins
(`f:hva8r5`); the first two steps of Iterate locally, the media seed and the dev server with the
dev backend off, run the same way, since the hand-built tutorial's hooks read the same
`CAIRN_DEV_BACKEND` variable, and only `/styleguide` is the scaffold's (`f:7pv6se`, `f:j2qzct`);
of the two recipes, only one rule inside Rebrand the status colors is this reader's, the engine's
derivation of each status ink from its fill, so a hand-built status rebrand costs one fill per
status per scheme and retunes no ink, there being no Waymark override to retune (`f:ylmc9c`); the
code-highlight paragraph of Style rendered markdown applies, because the `pre.shiki` and
`.cairn-tok-*` rules live in the engine sheet and read the `--cairn-code-*` roles the site's
theme block sets (`f:c4nnu9`); Style the editor preview applies as the hand-built path it names,
with the tutorial's `src/lib/cairn.config.ts` as the adapter file; Verify the theme is the same
check; Resolve an audit finding applies except its third check, since only Waymark's styleguide
panel and header navigation read the six site-owned keys (`f:18qj2u`). One closing sentence names
what is the scaffold's alone: The chassis boundary, the rest of both recipes, Chassis conventions,
the flourish edit (Re-skin Waymark's step 5 and the one step of Style rendered markdown; the
flourishes live in the chassis's `prose.css`, which a hand-built site does not have), and
`/styleguide`.

Hand-off: the list above is the hand-off; a scaffolded reader continues with the boundary.

### The chassis boundary

First sentence: A re-skin or a port edits only files on the theme's side of a boundary the scaffold
draws, since `src/chassis/` holds the modules every scaffolded site shares regardless of design
and everything outside it belongs to Waymark.

Facts: `f:s4prb0`, `f:l2mbcj`. Cited again: `f:rxj43c`, `f:s23sk0`.

Content. Two short paragraphs of exposition, each tied to the task by its first clause, and no
more, since this section stands between the reader and the first edit (the structural edit's
round-3 advisory on pace). The boundary: `src/chassis/` holds one concern per file, from content
indexing in `content.ts` and the date vocabulary in `date.ts` to the toggle mechanism in
`theme-toggle.ts`, the token system in `tokens.css`, and the reading and composition CSS in
`prose.css` and `composition.css`; everything outside it, the adapter config, the chrome
components, the color and type values, and the page compositions, is Waymark's (`f:s4prb0`; name
five or six files, never the whole list). The upgrade rationale is one clause on the end of that
paragraph, never its own: the setup command copies both into the site's tree and the npm package
ships neither, so an engine upgrade leaves these files unchanged (`f:rxj43c`, `f:l2mbcj`; the
committed page's "no engine version governs how the site looks" paragraph is not drafted, the
clause carries the claim). Then one sentence: those files still read the engine's roles from
`cairn-public.css`, which the chassis imports right after Tailwind (`f:s23sk0`), and the next
section states which declaration of a role wins. The `#chassis` seam and the dependents rule are
port-time concerns and sit in Port your own theme onto the chassis, not here; the daisyUI
component limit (`f:l2mbcj`'s second clause) is stated once, as a port step's reason, with
`f:h5e8d4`.

Hand-off: which declaration wins is the next section.

### Token tiers and cascade order

First sentence: Waymark's `theme.css` names three token tiers by how far a re-skin reaches, and two
orders decide which declaration of a key wins, source order for a design-scale key and layer order
for a role.

Facts: `f:kq6ud3`, `f:iel6v5`, `f:s23sk0`, `f:hva8r5`, `f:p8hsnz`. Cited again: `f:c4nnu9`.

Content. The three tiers as a bulleted list: Tier 1 the two daisyUI theme blocks; Tier 2 the
on-surface inks, the elevation pair (`--color-card-border` and `--cairn-shadow`), the CTA pair
(`--cairn-cta-*`), and the code-highlight binding; Tier 3 the design-scale keys that override the
chassis defaults (`f:kq6ud3`). Then where each tier's keys come from, naming only the families the
two recipes edit (the structural edit's round-3 advisory on pace): `tokens.css` declares the
design-scale keys, among them the `--font-*`, `--text-step-*`, and `--spacing-*` families the
re-skin retunes and `--font-weight-heading`, each with a generic default, and the roles,
`--color-muted`, `--color-card-border`, the status inks, the shadow, and the focus ring, come from
the engine's `cairn-public.css`, which `tokens.css` imports right after Tailwind (`f:iel6v5`; the
`--leading-*`, `--tracking-*`, and `--container-measure*` families are not listed on the page, since
Site-owned tokens in `docs/reference/public-css.md` names every family `tokens.css` defaults, and
the close of this section points there); the scaffold's `theme.css` and `site.css` carry the
theme's tokens and page styling layered over those two lower sources (`f:s23sk0`). Then the two
orders as a bulleted list, the
Astro take: a design-scale key resolves by source order, so the theme's redeclaration in a later
`@theme` block overrides the default `tokens.css` declares (`f:iel6v5`); a role resolves by layer,
since the engine declares its roles in `@layer theme` on `:root, [data-theme]`, the lowest layer
Tailwind declares, so the same key written unlayered in `:root` or in a daisyUI theme block
overrides the engine's default, and the `[data-theme]` selector recomputes a role inside a nested
theme region (`f:hva8r5`). Then the heading keys, in one paragraph: two keys govern every heading,
`--font-weight-heading` for its weight and `--cairn-heading-case` for its case (default `none`);
chrome markup applies them with the `font-heading` and `heading-case` utilities, a scoped `<style>`
rule reads the two variables directly, and `prose.css` headings and the hero title read the same
keys, so a theme that sets `--cairn-heading-case: uppercase` uppercases every heading
(`f:p8hsnz`). Close on one sentence naming two sections of the public style sheet reference, Roles
as the list of every role with its default and Site-owned tokens as the list of every design-scale
family `tokens.css` defaults (`f:c4nnu9`, the reference named, not linked again).

Hand-off: with the model in hand, start the local loop before the first edit.

### Iterate locally

First sentence: Run the dev server and keep `/styleguide` open while you edit, since it renders
every registered directive, the type scale, and the component recipes against the current
`theme.css`, and Vite's hot module replacement shows each saved change there without a reload.

Facts: `f:bdnzcy`, `f:mvkyea`, `f:7pv6se`, `f:j2qzct`. Subordinated from here: `f:4xptbu` (the
fixed `/media/` download path and the `assets.publicBase` consequence) to
`docs/reference/cli-cairn-media-seed.md`, Flags (`--from`) and What it writes.

Content. Steps, one action each, condition before instruction: (1) if the site is deployed with a
media library, in the site directory run `npx cairn-media-seed --from https://your-site.com`, which
seeds wrangler's local R2 state from the deployed library and is idempotent, since a re-run writes
each key again (`f:7pv6se`); (2) in the site directory, start the dev server, and start it with the
dev backend off when you seeded media, through `npx vite dev` without `CAIRN_DEV_BACKEND` or
through `wrangler dev`, because the scaffold's `npm run dev` sets `CAIRN_DEV_BACKEND=1` and its
handle serves `/media` from an in-memory fake bucket, so seeded objects do not appear under it
(`f:j2qzct`; this is the outline's covers item 9, kept as the step's reason and the one caveat this
section carries); (3) in the browser, open `/styleguide`, where a directive that declares a
`preview` renders as a sample and one without is listed by name (`f:bdnzcy`). After the steps, one
sentence hands the command's flags, its download path, and its exit codes to
`docs/reference/cli-cairn-media-seed.md`. The committed page's two sentences on the fixed `/media/`
path and `assets.publicBase` are not drafted; the reference's `--from` row states the derived
delivery URL, and the `assets.publicBase` consequence it does not state is filed (see Could not
do). The `vite dev` claim the reference makes against the scaffold's dev script is already on
`ROADMAP.md`'s Next tier (the draft docs harvest, 2026-09-30) and is not refiled.

Hand-off: the two recipes follow, cheaper first.

### Re-skin Waymark

First sentence: A re-skin keeps Waymark's layouts and edits about fourteen values across the light
and dark daisyUI blocks in `src/theme/theme.css`, and `prose.css` follows at no extra edit because
it reads the same role tokens.

Facts: `f:kt0epf`. Cited again: `f:iel6v5`, `f:ivp8wl`, `f:spn4hj`.

Content. The excerpt first (the committed `theme.css` light-block snippet showing five of the
recipe's keys, its comment noting the dark block carries the same keys), the Shopify take of
starting from the reference theme: Waymark is the minimal reference theme a re-skin starts from.
Steps, one action each, the location named before the action: (1) in both daisyUI blocks, rotate
the hue of `--color-primary` while holding its lightness and chroma; (2) in the same two blocks,
edit the `base-100/200/300` ladder and `base-content` (`f:kt0epf`); (3) optionally, in the `@theme`
block of the same file, swap the two `--font-*` tokens; (4) optionally, in the same `@theme` block,
retune one type ratio or space-scale step (`f:kt0epf`, with `f:iel6v5` for the keys being
design-scale keys the theme redeclares); (5) optionally, in `src/theme/components/ArticleView.svelte`,
add a `data-flourish` attribute to the `<article class="prose">` element, which turns on the three
prose flourishes Waymark ships off, and Style rendered markdown names the three (`f:ivp8wl` for the
attribute and the default, `f:spn4hj` for the element; the action is stated inline, the third plan
read's second advisory, so the reader makes no round trip past the port for a one-attribute edit,
and the section link carries only what the flourishes are; confirmed from the source:
`templates/waymark/src/theme/components/ArticleView.svelte:108` renders `<article class="prose">`
with no `data-flourish`, and `templates/waymark/src/theme/theme.css:4-8` names the attribute as the
one edit that brings the three back); (6) optionally, to rebrand the status colors, follow Rebrand
the status colors, below, and return to step 7 (the third plan read's blocking finding: the
rebrand is a covers item of the theme guide, and without this step a reader who followed the steps
literally verified in step 6 and never met the H3 that sat under them); (7) run the checks in
Verify the theme, a direct jump that stays correct because the scaffold already sets
`editor.preview`, so Style the editor preview changes nothing for a re-skin. The count stays "about
fourteen", the hedge the 2026-09-30 friction entry on `f:kt0epf` records, and the headline recipe
stays apart from the status rebrand below: step 6 is the one route into it, and the subsection's
own hand-off is the one route out.

Hand-off: step 6 routes a reader who rebrands the status colors into the next subsection; every
other re-skin reader goes by step 7 to Verify the theme.

#### Rebrand the status colors

An H3 under Re-skin Waymark.

First sentence: A full status-color rebrand costs one fill per status in each scheme, because the
engine derives each on-surface ink from its fill at 50 percent, except where a theme overrides an
ink, which Waymark does for all four in both blocks, so a Waymark rebrand retunes each ink with its
fill or deletes the override.

Facts: `f:ylmc9c`, `f:u893cs`.

Content. The first sentence carries the qualified claim whole (register, "Qualified claims stay
whole"). Steps: (1) in both daisyUI blocks, set the fill for each status (`f:ylmc9c`); (2) in the
same two blocks, retune each `--cairn-<status>-ink` to its new fill, or delete the override so the
ink follows the fill (`f:u893cs`). One consequence sentence after the steps: an overridden ink left
unchanged no longer matches its fill in directive text and code highlighting (`f:ylmc9c`). Close on
one sentence naming the Ink derivation section of `docs/reference/public-css.md` for the formula
and for the fix when a derived ink fails on the theme's own fills (a named reference, the link
sits in Resolve an audit finding where the reader needs it).

Hand-off: the rebrand done, the reader returns to step 7 of Re-skin Waymark, the checks in Verify
the theme, named in so many words. The third plan read's blocking finding caught the previous
hand-off, which sent a rebrand reader on into the port; that routing sentence now opens the port
section, where a reader choosing between the recipes meets it.

### Port your own theme onto the chassis

First sentence: A port replaces Waymark's style sheets, chrome components, and page compositions
with the new theme's and keeps every file in `src/chassis/`, reaching the chassis only through its
exported seams.

Facts: `f:lwrqfd`, `f:kj37zz`, `f:h5e8d4`, `f:18qj2u` (scoped to the six undefaulted keys the
theme declares; the placement detail is named to the reference), `f:ctognq`, `f:i3rn6f`,
`f:i9pgd2`, `f:nz87b3`. Cited again: `f:s4prb0`, `f:kt0epf`, `f:iel6v5`, `f:kq6ud3`, `f:p8hsnz`.

Content. One routing sentence follows the first sentence, moved here from the rebrand
subsection's hand-off at the third plan read: a design the site already has takes this recipe in
place of the re-skin, since the re-skin keeps Waymark's layouts and a port keeps only the chassis
(`f:kt0epf` and `f:s4prb0`, both cited again; no new fact). Then two paragraphs of the chassis
rules before the steps, moved here from the committed page's The chassis boundary because only a
port touches them. The seam: a theme file imports from
the chassis only through the `#chassis` subpath import in TypeScript and Svelte or a relative `@import` in
CSS; the cairn repository gates that boundary on its example site with `check:chassis-boundary`,
and a scaffolded site inherits it as a convention with no gate of its own (`f:lwrqfd`; friction
filed, see below). The dependents rule, the Shopify take of the caution beside the irreversible
act: a chassis file is safe to delete only when everything that depends on it changes in the same
edit; `feed.ts` has two dependents, the two feed routes, so it deletes along with them and nothing
else changes, while `content.ts` supplies six delivery routes, so dropping it means replacing all
six routes' imports in the same change; before deleting any chassis file, read its row in the
dependents table in `src/chassis/README.md` (`f:kj37zz`, with `f:s4prb0` for the files named).

Steps, one action each, location first: (1) in the theme's style sheet, import `tokens.css` first
(`f:iel6v5`); (2) in a later `@theme` block in the same sheet, redeclare the design-scale keys with
the theme's values, `--font-weight-heading` among them (`f:iel6v5`, `f:p8hsnz`); (3) in the same
sheet, replace the two daisyUI theme blocks with the new theme's role colors (`f:kq6ud3`), with
the reason under it: the chassis's `tokens.css` activates the daisyUI plugin with only four of its
components, button, badge, alert, and card, so chrome that renders another daisyUI component drops
that component's key from the `exclude` list in `tokens.css` (`f:h5e8d4`; the one chassis edit a
port makes, stated as the exception it is); (4) in the same sheet, declare the five
`--cairn-cta-*` keys for each scheme and `--cairn-caption-tracking`, since neither the engine sheet
nor `tokens.css` defaults any of the six (`f:18qj2u`), and one sentence names the Placement of a
per-scheme value section of `docs/reference/public-css.md` for where a per-scheme value goes; the
committed page's sentence on Waymark's two hand-synced dark `:root` blocks is not drafted, since
that section states the arrangement and the 2026-09-30 friction entry on `f:18qj2u` records the
conflict; (5) in the theme's unlayered `:root` rule, set `--cairn-heading-case` to the theme's
heading case (`f:p8hsnz`); (6) in the page compositions, build each layout from the
`composition.css` primitives, `.cairn-card`, `.cairn-band`, `.cairn-section`, `.cairn-hero`, and
`.cairn-sidebar-layout`, each exposing `--cairn-<primitive>-*` custom properties such as
`--cairn-card-padding` for a per-instance override (`f:ctognq`), and, in the step's own words,
"read Chassis conventions, below, before adding a class or layout rule", so the forward jump is
explicit at the point of need (the structural edit's round-3 advisory offered this form or a move
ahead of the steps; the conventions stay after the steps, since a reader who met five rules before
step 1 would carry them through five CSS steps that need none of them, and the anatomy sends
explanation to a link from the step that needs it); (7) in the new chrome, keep a skip link: an `sr-only` anchor to `#main` made visible
on focus with `focus:not-sr-only focus:absolute`, with `<main id="main" tabindex="-1">` so
activating the link moves keyboard focus and not only the scroll position, the focus being
programmatic so `main:focus` draws no ring (`f:nz87b3`); (8) in the new chrome, mount a theme
toggle on the chassis's `theme-toggle.ts`, passing it the theme's two names and cookie from
`theme-names.ts`, since its `resolveTheme` returns the live `data-theme` when it names one of the
two themes and otherwise reads the root's computed `color-scheme`, so a dark-first theme resolves
dark on a light OS with no edit to the page shell (`f:i9pgd2`, with `f:s4prb0` for the file's
chassis home); (9) if you rename the daisyUI themes, edit `theme-names.ts`, the no-flash script in
`src/app.html`, and the two `@plugin "daisyui/theme"` names in `theme.css` together, since the
script hard-codes the cookie `cairn-site-theme` and both names and `theme-names.test.ts` fails
when the three drift (`f:i3rn6f`, `f:i9pgd2`); (10) continue with Style rendered markdown and
Style the editor preview, which hold the port's remaining work, then run the checks in Verify the
theme. Step 10 names the two sections in so many words (the second plan read's blocking finding,
in the finding's first form): Style rendered markdown holds the port's directive-class edits and
the flourish choice, and Style the editor preview holds the `editor.preview` update a port owes
when it added or renamed a compiled sheet or changed the classes that wrap an entry. A port that
jumped from step 9 to Verify the theme would run check 3, the preview renders in the theme's
styles, with the adapter still naming Waymark's sheets, and fail it with no path back; the route
through the two sections lands that update before the check reads the frame. The re-skin's
direct jump is safe and the port's is not, because only a port changes what `editor.preview`
names.

The committed page's Page shell behavior section is dissolved into steps 7 and 8; its no-claim
opener ("reproduces two behaviors") is not drafted, since the toggle's mechanism is chassis code
the port keeps and only the skip link is reproduced.

Hand-off: the conventions the compose step points at, then, by step 10, Style rendered markdown.

#### Chassis conventions

An H3 under Port your own theme onto the chassis.

First sentence: Every class and layout rule the compose step adds follows the chassis's
conventions, each of which closes a trap the chassis's own tokens or Tailwind's layers set.

Facts: `f:i80vsl`, `f:gzw7os`, `f:h1qxlq`, `f:hectgs`, `f:hgal3e`.

Content. A bulleted list of parallel rules, each one sentence or two carrying the rule and its
reason: a class carries its owner's prefix, `cairn-*` for the engine and the chassis (a theme
colors it through tokens and never restyles its structure), `site-*` for the theme's own chrome,
`sg-*` for the styleguide route alone, and an unprefixed directive class such as `.callout` comes
from the theme's `markdown-components.ts` and may be renamed (`f:i80vsl`); a width uses
`max-w-measure`, `max-w-measure-wide`, or an arbitrary value, never a shadowed size such as
`max-w-2xl`, because five chassis spacing keys share suffixes with Tailwind's `--container-*` keys
and `max-w-2xl` compiles to `max-width: var(--spacing-2xl)`, about 4rem (`f:gzw7os`); a centered
container uses `margin-inline: auto`, never the `margin: 0 auto` shorthand, because an unlayered
rule in a site style sheet beats a Tailwind utility in `@layer utilities` and the shorthand cancels
`mt-*` and `mb-*` on the same element (`f:h1qxlq`); a layout dimension uses rem units, never a
fixed px value, because Waymark's `site.css` grows the root font size from 16px to 18px between
about 1440px and 2200px and rem-based layout scales with it (`f:hectgs`); every archive and article
date renders through `formatDate` in the chassis's `date.ts`, hard-coded to the `en-GB` locale and
UTC, so a new format or locale is an edit to that file alone (`f:hgal3e`). The job read's
duplicate `formatDate` coverage is gone: this is its one home.

### Style rendered markdown

First sentence: A re-skin restyles every entry body with no edit to `prose.css`, which binds each
element to the daisyUI roles and the cairn tokens, a port that keeps `prose.css` edits only the
directive classes its `markdown-components.ts` owns, and either recipe may turn on the three
flourishes Waymark ships off.

Facts: `f:ivp8wl`. Cited again: `f:kt0epf`, `f:spn4hj`, `f:i80vsl`, `f:kq6ud3`, `f:c4nnu9`.

Content. The first sentence is the task lead-in the structural edit's second blocking finding
asked for, naming when each recipe touches this section; the drafter may split it into two
sentences at the register's one-idea rule, with the three claims (the re-skin's no-edit, the
port's directive classes, the flourish choice open to both) kept whole. The flourish choice is
both recipes' because Waymark ships the attribute absent: `ArticleView.svelte` renders
`<article class="prose">` with no `data-flourish` (`f:spn4hj` for the element, `f:ivp8wl` for the
default), so a re-skin that wants the three flourishes adds the attribute to that element and a
port adds it to its own `.prose` root (the second plan read's second advisory, its first form,
since the source confirms the default is off rather than set or forbidden). The port arrives here
by name from its step 10; a re-skin reader arrives only through the link in its step 5, which
names this section for what the three flourishes are, the one edit having been made inline (the
third plan read's second advisory). Then the Astro take, the render output's
styling in three short paragraphs: `ArticleView.svelte` wraps each entry on the public site in
`<article class="prose">` (`f:spn4hj`); a directive's markup carries an unprefixed class from the
theme's `markdown-components.ts`, such as `.callout`, which the theme styles and may rename
(`f:i80vsl`); code highlighting is the Tier 2 binding Waymark's `theme.css` lists beside the
on-surface inks (`f:kq6ud3`), whose rules for `pre.shiki` and the six `.cairn-tok-*` classes sit
in the engine's `cairn-public.css` in `@layer components` and read the `--cairn-code-*` roles
(`f:c4nnu9`), so a theme recolors code by setting those roles in its blocks. The one step, a single
bulleted item: to turn on the three decorative styles `prose.css` keeps behind
`.prose[data-flourish]`, the cairn-glyph rule, the diamond bullet, and the margin-hanging pull
quote, add a `data-flourish` attribute to the theme's `.prose` root, which for Waymark is the
`<article class="prose">` in `ArticleView.svelte` (`f:ivp8wl`, with `f:spn4hj` for the element).

Hand-off: the admin's preview frame shows the same rendered markdown through the adapter's
`editor.preview`, which the scaffold already sets; a re-skin reader who followed the flourish link
returns to step 6 of Re-skin Waymark, the status rebrand option, and then its step 7, the checks,
and the port reader reads on, per its step 10 (the third plan read's blocking finding caught the
previous return, which sent a re-skin reader to the Verify jump past the rebrand).

### Style the editor preview

First sentence: A scaffolded site's adapter already points the admin's preview frame at `theme.css`
and `site.css`, so a re-skin changes nothing here; a port that adds or renames a compiled style
sheet, or changes the classes that wrap an entry, updates the adapter's `editor.preview`, and a
hand-built site adds it.

Facts: `f:spn4hj`, `f:gnn3pv`, `f:gtg454`, `f:faofr4` (scoped to the ground and the scheme),
`f:guthtp`. Subordinated from here: `f:blhd7f` (the four members' semantics and the override
resolution) to `docs/reference/core.md`, the `preview` entry under Adapter and schema.

Content. The first sentence names who acts, Style rendered markdown's lead-in as its model, the
structural edit's round-3 blocking finding: the scaffold ships
`preview: { stylesheets: [themeCss, siteCss], containerClass: 'site-main prose' }` in
`src/theme/cairn.config.ts` (`f:spn4hj`), so the committed page's steps, which told every reader
to import the sheets and set the two members, are the port's and the hand-built site's alone, and
a re-skin reader goes from this sentence to Verify the theme, where check 3 is theirs. One
sentence of why follows, for every reader: the frame loads none of the site's CSS, so with no
`preview` set it renders unstyled markup behind a hint that says so (`f:gnn3pv`). Then the
scaffold's snippet (the committed one: `themeCss` and `siteCss` from `?url` imports,
`containerClass: 'site-main prose'`), framed as what the scaffold already sets, the shape a port
keeps or edits and a hand-built site adds to its adapter (`f:spn4hj`). Then the steps, headed in
prose as the port's and the hand-built site's procedure, one action each, location first: (1) in
`src/theme/cairn.config.ts`, or the hand-built site's adapter file, import each compiled style
sheet the public pages load through a Vite `?url` import, because a plain side-effect import such
as `import './theme.css'` folds the sheet into a layout CSS chunk whose basename differs between
the client and server builds, so the frame would link a URL that returns a 404 in the browser
(`f:gtg454`); (2) in the adapter's `editor` group, set the `preview` member's `stylesheets` to
those URLs (`f:gnn3pv`); (3) in the same member, set `containerClass` to the classes that wrap an
entry on the public site, which for the scaffold is `'site-main prose'`, because the public site
puts the two on separate elements, the `(site)` layout's `<main>` and the `<article>` in
`ArticleView.svelte`, and the frame renders one wrapper element (`f:spn4hj`). After the steps, one
sentence names the other two members, `bodyClass` and `byConcept`, which the `preview` entry in
`docs/reference/core.md` states with the full type (`f:gnn3pv` for the names; the committed
page's four-bullet member list is not drafted). Then the frame's behavior in three sentences, the
explanation that applies to every reader: it paints its body with `var(--color-base-100,#fff)`, so
the preview ground follows the site's `base-100` once the style sheet loads and falls back to
white without one; its `<html>` carries no `data-theme`, so only the OS color scheme reaches it
(`f:faofr4`; friction filed on the second clause, see below); the document's root carries
`data-cairn-preview`, the hook a site's style sheet selects on to suppress entrance animations
such as `[data-rise]` inside the frame, and every link click in the frame is inert (`f:guthtp`).

Hand-off: Verify the theme, for every reader, and each reader arrives there by a named route (the
second plan read's blocking finding asked that this hand-off cover both recipes): the re-skin's
step 7 jumps from Re-skin Waymark past this section to Verify the theme and stays correct, since
the scaffold already sets `editor.preview` and a re-skin changes none of what it names; the
port's step 10 routes through Style rendered markdown and this section, so its `editor.preview`
update lands before Verify check 3 reads the frame; the hand-built reader arrives through the
hand-off list under Theme a hand-built site, having added the member here.

### Verify the theme

First sentence: The theme passes when the three public-scope rules, `public-literals`,
`theme-conformance`, and `theme-contrast`, raise no finding on the site and the editor preview
renders an entry in the theme's styles.

Facts: `f:xv2ien`, `f:mzmvt8`. Cited again: `f:faofr4`.

Content. Two sentences of lead-in: the three rules ship in `cairn-audit`, which the scaffold's
`check:cairn` script runs at advisory tier on your site, and the engine repository gates Waymark
itself on the same three rules as `check:public-tokens`, a script a scaffolded `package.json` does
not carry, so a theme that clears them meets the bar Waymark meets (`f:xv2ien`; covers item 10
names the gate, and this is its one mention); `theme-contrast` reads the site's real import chain,
so it needs `daisyui` installed in the site (`f:mzmvt8`, the register editor's relocation of the
dropped precondition). Numbered checks, each with its observable result (anatomy item 4): (1) in
the site directory, run `npx cairn-audit --rule public-literals --rule theme-conformance --rule
theme-contrast` (`f:xv2ien`); (2) in the report, confirm that none of the three rules raises a
finding, with the qualified claim whole: a clean `theme-contrast` result means each pair the rule
measures meets WCAG AA at 4.5:1, and the focus ring 3:1, in sRGB and display-p3, in each scheme the
theme defines, and a value the rule cannot place is reported as unmeasured, never passed
(`f:mzmvt8`); the `theme-contrast` row of The static rules in `docs/reference/cairn-audit.md`
names the pairs and the color spaces, and What theme-contrast doesn't cover in the same reference
lists the values it reports as unmeasured (both linked; the register editor's blocking rewrite at
`:399-403` is the shape, and the owner's instruction keeps the link to the coverage section);
(3) in the admin, open an entry in the editor and confirm the preview renders in the theme's
styles with its ground following `base-100` (`f:faofr4`). WCAG is linked at its first mention,
here.

Hand-off: a finding points at the next section.

### Resolve an audit finding

First sentence: A finding from the three public rules names its file or theme block, and each
rule's fix is an edit to the theme.

Facts: none placed here first. Cited again: `f:xv2ien`, `f:ylmc9c`, `f:u893cs`, `f:18qj2u`.
Subordinated from here: `f:tbq6gh` (how `theme-conformance` resolves a `var()`) to
`docs/reference/cairn-audit.md`, The static rules, the `theme-conformance` row.

Content. One sentence of orientation: the three rules read the files The public scope in
`docs/reference/cairn-audit.md` lists (`f:xv2ien`). Ordered checks as a numbered list (anatomy
item 5, the register's ordered-checks rule): (1) if `public-literals` raises a finding, read its
row in The static rules for what the rule reads and where a literal is legal (a link sentence, no
claim); (2) if `theme-contrast` flags directive text or code highlighting after a fill change,
retune the overridden ink beside its fill, or delete the override so the derived ink follows
(`f:ylmc9c`, `f:u893cs`), and the Ink derivation section of `docs/reference/public-css.md` gives the
fix when a derived ink fails on the theme's own fills (linked here); (3) if `theme-conformance`
reports one of the five `--cairn-cta-*` keys or `--cairn-caption-tracking` as unresolved, declare it
in the theme (`f:18qj2u`), and the rule's row in The static rules states how it resolves a `var()`
(`f:tbq6gh` subordinated; the committed page's resolution sentence is not drafted); (4) if a
finding persists, work through `docs/extend/debug-your-site.md`, the track's recovery surface, not
restated here. The link is not repeated in See also (anatomy item 6).

### See also

First sentence: The following pages cover the work around a theme.

No facts. One bullet per page, each a complete sentence naming what the page does, grouped guides
first, then reference: `docs/extend/configure-rendering.md` builds the components a theme styles;
`docs/extend/build-the-public-routes.md` wires the delivery routes the chassis feeds;
`docs/extend/configure-media.md` sets up the media storage seeded images come from;
`docs/extend/run-cairn-audit-on-your-site.md` configures `cairn-audit` for the whole site;
`docs/extend/scaffolded-site-files.md` maps every file the setup command writes;
`docs/reference/public-css.md` lists every key the engine's sheet declares with its default;
`docs/reference/cairn-audit.md` documents the three public rules and the public scope. The
recovery link is not repeated here. The register editor's non-blocking note on the committed See
also (`:426-428`) is disposed by the grouping and the complete-sentence bullets.

## Dispositions

Every fact id the task names, plus `f:w6pqic`, cut at the pilot draft and re-disposed here with
its reference named. A subordinated fact is a `cut` whose reason names the reference entry; the
drafter's brief records each reason verbatim under `cuts`.

| Fact | Disposition | Section, or reason |
|---|---|---|
| `f:rxj43c` | carried | Introduction (cited again under Before you begin, Theme a hand-built site, and The chassis boundary) |
| `f:xv2ien` | carried | Verify the theme (cited again under Introduction and Resolve an audit finding) |
| `f:7pv6se` | carried | Iterate locally (cited again under Before you begin and Theme a hand-built site) |
| `f:f28x0x` | carried | Theme a hand-built site |
| `f:c4nnu9` | carried | Theme a hand-built site, scoped to the one-asset claim and the key-by-key reference (cited again under Token tiers and cascade order and Style rendered markdown for the code-highlight rules) |
| `f:s4prb0` | carried | The chassis boundary (cited again under Introduction and Port your own theme onto the chassis) |
| `f:l2mbcj` | carried | The chassis boundary |
| `f:kq6ud3` | carried | Token tiers and cascade order (cited again under Port your own theme onto the chassis and Style rendered markdown) |
| `f:iel6v5` | carried | Token tiers and cascade order, naming the `--font-*`, `--text-step-*`, and `--spacing-*` families and `--font-weight-heading`; the other families `tokens.css` defaults are named to Site-owned tokens in `docs/reference/public-css.md` (cited again under Re-skin Waymark and Port your own theme onto the chassis) |
| `f:s23sk0` | carried | Token tiers and cascade order (cited again under The chassis boundary) |
| `f:hva8r5` | carried | Token tiers and cascade order (cited again under Theme a hand-built site) |
| `f:p8hsnz` | carried | Token tiers and cascade order (cited again under Port your own theme onto the chassis, steps 2 and 5) |
| `f:bdnzcy` | carried | Iterate locally |
| `f:mvkyea` | carried | Iterate locally |
| `f:j2qzct` | carried | Iterate locally (cited again under Theme a hand-built site) |
| `f:4xptbu` | cut | Subordinated: `docs/reference/cli-cairn-media-seed.md`, the Flags table's `--from` row and What it writes, state the fixed `<base-url>/media/<slug>.<hash>.<ext>` download path, linked from Iterate locally; the `assets.publicBase` consequence is not stated there (friction filed) |
| `f:kt0epf` | carried | Re-skin Waymark (cited again under Introduction, Style rendered markdown, and the routing sentence that opens Port your own theme onto the chassis) |
| `f:ylmc9c` | carried | Rebrand the status colors (cited again under Theme a hand-built site and Resolve an audit finding) |
| `f:u893cs` | carried | Rebrand the status colors (cited again under Resolve an audit finding) |
| `f:lwrqfd` | carried | Port your own theme onto the chassis |
| `f:kj37zz` | carried | Port your own theme onto the chassis |
| `f:h5e8d4` | carried | Port your own theme onto the chassis, step 3 |
| `f:18qj2u` | carried | Port your own theme onto the chassis, step 4, scoped to the six undefaulted keys the theme declares; the placement detail is named to Placement of a per-scheme value in `docs/reference/public-css.md` (cited again under Resolve an audit finding and, for the readers of the six keys, Theme a hand-built site) |
| `f:ctognq` | carried | Port your own theme onto the chassis, step 6 |
| `f:nz87b3` | carried | Port your own theme onto the chassis, step 7 |
| `f:i9pgd2` | carried | Port your own theme onto the chassis, steps 8 and 9 |
| `f:i3rn6f` | carried | Port your own theme onto the chassis, step 9 |
| `f:i80vsl` | carried | Chassis conventions (cited again under Style rendered markdown) |
| `f:gzw7os` | carried | Chassis conventions |
| `f:h1qxlq` | carried | Chassis conventions |
| `f:hectgs` | carried | Chassis conventions |
| `f:hgal3e` | carried | Chassis conventions |
| `f:ivp8wl` | carried | Style rendered markdown (cited again under Re-skin Waymark, step 5) |
| `f:spn4hj` | carried | Style the editor preview, the first sentence, the scaffold's snippet, and step 3 (cited again under Style rendered markdown and under Re-skin Waymark, step 5, for the `<article class="prose">` element the flourish attribute goes on) |
| `f:gnn3pv` | carried | Style the editor preview, the why sentence and step 2 |
| `f:gtg454` | carried | Style the editor preview, step 1 |
| `f:faofr4` | carried | Style the editor preview, scoped to the ground and the scheme (cited again under Verify the theme, check 3) |
| `f:guthtp` | carried | Style the editor preview |
| `f:blhd7f` | cut | Subordinated: `docs/reference/core.md`, the `preview` entry under Adapter and schema, states the four members of `PreviewConfig`, the key-by-key override resolution with a missing key keeping the top-level value, the shared stylesheets, and that the map never reaches the client; linked from Style the editor preview |
| `f:mzmvt8` | carried | Verify the theme |
| `f:tbq6gh` | cut | Subordinated: `docs/reference/cairn-audit.md`, The static rules, the `theme-conformance` row, states that a `var()` with no fallback resolves against the site's real `@import` chain, Tailwind's theme variables, a complete theme block's keys, or a custom property declared in the scanned tree; linked from Resolve an audit finding |
| `f:w6pqic` | cut | Subordinated: `docs/reference/public-css.md`, Changed defaults under Ink derivation, states the earlier and current defaults of the status inks, `--color-muted`, and `--cairn-shadow`; cut at the pilot draft (brief at `bbfb6788`) and left cut, since a scaffolded site never carried the copied `tokens.css` the table serves |

## Round-2 findings and job-read findings, disposed by this plan

- Structural edit, `:140` (Chassis conventions ahead of the re-skin, port-only material): the
  conventions are an H3 under Port your own theme onto the chassis, after its steps, and step 6
  points at them; the re-skin path reads none of it.
- Structural edit, `:307` (Style rendered markdown opens with no task lead-in): the section's
  first sentence names when a re-skin and a port touch it, the finding's own rewrite as the
  shape.
- Structural edit, `:15` (the introduction omits four out-of-scope pages): the introduction's
  third part names all six pages, each once, in two prose sentences.
- Register editor, `:30-32` (the `daisyui` precondition is circular and over length): the bullet
  is dropped; the dependency fact sits in the lead-in of Verify the theme as the finding's
  rewrite proposed.
- Register editor, `:399-403` (the `theme-contrast` claim overstated): Verify the theme check 2
  carries the qualified claim whole, "each pair the rule measures", with both reference links,
  per the owner's instruction that the qualified claim stays whole.
- Fact read, `:28-29` (the Tailwind precondition cites `f:f28x0x` for a vendor step): the bullet
  is dropped; the hand-built section's step 1 installs Tailwind and daisyUI behind vendor links
  and cites `f:f28x0x` only for the daisyUI requirement the fact states.
- Fact read, `:399-403` (the dropped color-space sentence and coverage link): both restored in
  check 2.
- Register editor, non-blocking, `:177-178`, `:3-4`, `:426-428`, `:314-317`, `:422-424`: the
  media-seed step is one sentence per action with the reason as a clause; the contract is
  rewritten; See also groups guides then reference as complete sentences; the public style sheet
  reference is linked once in the body, at Theme a hand-built site, and named afterwards; the
  Resolve step's note on `theme-conformance` is a link sentence, the resolution detail
  subordinated.
- Job read (Iterate locally and the conventions after the steps that need them): Iterate locally
  precedes both recipes; the conventions sit with the port.
- Job read (Theme a hand-built site mid-page): it is the first section after Before you begin,
  and its closing sentence names the later sections that apply.
- Job read (Style rendered markdown is one paragraph): it carries the task lead-in, three
  paragraphs, and the flourish step.
- Job read (`formatDate` covered twice): Chassis conventions is its one home.

## Round-3 structural edit, on this plan, disposed by the revision

The structural edit read the first version of this plan on 2026-10-03 and returned one blocking
finding and four advisory ones. Each is disposed below; the revision changed no disposition in the
table above, and every fact keeps its section.

- Blocking, Style the editor preview (`:412-433` of the first version; "Tasks reflect the intended
  goal", the anatomy's task-tie rule): the section's first sentence now names who acts, in the
  finding's own shape, since the scaffold ships `editor.preview` at
  `templates/waymark/src/theme/cairn.config.ts:227` (`f:spn4hj`). A re-skin changes nothing
  there, a port edits it when a compiled sheet or a wrapper class changes, a hand-built site adds
  it, and the three steps are headed as the port's and the hand-built site's procedure. The frame
  behavior stays as the explanation for every reader, and Re-skin Waymark's final step jumps to
  Verify the theme as before.
- Advisory, Chassis conventions after step 10 while step 6 needs them (`:341-342`, `:354`,
  `:362-386`): kept after the steps, with step 6 saying "read Chassis conventions, below, before
  adding a class or layout rule" in so many words, the finding's second form. The reason for not
  moving them ahead is recorded at step 6: the five rules govern step 6 alone, and a reader who
  met them before step 1 would carry them through five CSS steps that need none of them.
- Advisory, the hand-built hand-off (`:161-166`): it now lists the first two steps of Iterate
  locally (`f:7pv6se`, `f:j2qzct`; the hand-built tutorial's hooks read the same
  `CAIRN_DEV_BACKEND` variable, `docs/extend/add-cairn-to-a-sveltekit-app.md`, Wire the dev
  backend and the CSRF handoff), the code-highlight paragraph of Style rendered markdown
  (`f:c4nnu9`), and Resolve an audit finding except its third check (`f:18qj2u`; the engine's
  public sheet reads none of the six site-owned keys, `src/lib/public/cairn-public.css`), and it
  states that of the two recipes only the ink-derivation rule inside Rebrand the status colors is
  this reader's, since a hand-built theme has no Waymark ink override to retune (`f:ylmc9c`). The
  mixed signal is gone: the recipes are named as the scaffold's with that one rule carved out.
- Advisory, the introduction's routing skips Before you begin (`:98-100`): both readers are
  routed after the preconditions. The hand-built reader begins at Theme a hand-built site after
  Before you begin; the scaffolded reader reads on from Before you begin and skips that one
  section.
- Advisory, rationale and inventory slow the first edit (`:184-187`, `:207-213`): The chassis
  boundary's upgrade rationale is one clause on the boundary paragraph, and its third paragraph
  is one sentence. Token tiers and cascade order names only the `--font-*`, `--text-step-*`, and
  `--spacing-*` families the re-skin retunes and `--font-weight-heading`, and its close names
  Site-owned tokens in `docs/reference/public-css.md`, which lists every family `tokens.css`
  defaults (confirmed: "the faces, `--text-step-*`, `--spacing-*`, `--leading-*`, `--tracking-*`,
  the two measures, and the two heading levers"), beside Roles for every role with its default.

## Second plan read (resolution run 2), disposed by this revision

The structural edit read the revised plan in run `wf_fe61a650-884` and returned one blocking
finding and two advisory ones, recorded under "### theme-your-public-site" of
`docs/superpowers/research/2026-10-03-draft-docs-2a-resolution-run-record.md`. Each is disposed
below. No fact changes its disposition; `f:ivp8wl` and `f:spn4hj` gain one citation each, and
every check the read listed as passed (the introduction's three parts and six out-of-scope pages,
Before you begin's routing, the argued departures from the covers order, both outline cross-links
in See also, the failure path to `docs/extend/debug-your-site.md`, the task-guide module types)
is unchanged.

- Blocking, port step 10 (`:386` of the second version; Block 1, "Information is presented in the
  most logical order and location" and "Tasks reflect the intended goal of the user"): the step
  sent a port reader straight to Verify the theme, past Style rendered markdown and Style the
  editor preview, which still hold port work, so a port that renamed or added a compiled sheet
  would run Verify check 3 with `editor.preview` still naming Waymark's sheets and fail with no
  path back. Step 10 now reads "continue with Style rendered markdown and Style the editor
  preview, then run the checks in Verify the theme", the finding's first form, with the two
  sections' port work named beside it. The hand-off of Style the editor preview now covers both
  recipes and the hand-built reader: the re-skin's final step jumps past the section to Verify
  the theme, which is safe because a re-skin changes none of what `editor.preview` names, and the
  port arrives through the section from step 10. What the page argues records the same
  asymmetry as the reason the two recipes end differently.
- Advisory, the introduction's in-order list (`:93-95`; Block 2, "Does your introduction provide
  an accurate overview of the topics you cover?"): the list now opens with the chassis boundary
  and the token tiers, so it predicts the section order the reader meets.
- Advisory, the flourish option offered to a port only (`:422-439`; Block 1, "Tasks reflect the
  intended goal"): the source confirms Waymark ships the attribute absent rather than set or
  forbidden (`templates/waymark/src/theme/components/ArticleView.svelte:108` renders
  `<article class="prose">` with no `data-flourish`; `templates/waymark/src/theme/theme.css:4-8`
  names the attribute as the one edit that brings the three flourishes back), so the finding's
  first form applies: Style rendered markdown's lead-in states that either recipe may turn the
  flourishes on, and Re-skin Waymark gains an optional step 5 that takes the one step there
  before its step 6 runs the checks. Theme a hand-built site's closing sentence names the
  flourish step as the scaffold's alone, since the flourishes live in the chassis's `prose.css`.
  (The third plan read then moved the step's action inline and renumbered the checks as step 7;
  see Third plan read below.)

## Third plan read (same run), disposed by this revision

The structural edit read the second revision of this plan in the same run and returned one
blocking finding and two advisory ones, each named by the line of the version it read. Each is
disposed below. No fact changes its disposition; `f:spn4hj` gains one citation (Re-skin Waymark,
step 5) and `f:kt0epf` one (the routing sentence that opens the port), and every check the read
listed as passed (the introduction's contract and three parts with all six out-of-scope pages,
Before you begin's routing of both readers, the argued departures from the covers order, both
outline cross-links in See also, the numbered checks with observable results, the failure path to
`docs/extend/debug-your-site.md`, and the two exposition sections' task lead-ins) is unchanged.

- Blocking, the re-skin's route into the status rebrand (`:321-325`, `:349`, `:482` of the second
  revision; Block 1, "Information is presented in the most logical order and location" and "Tasks
  reflect the intended goal of the user"): the re-skin's step 6 sent the reader to Verify the
  theme past the Rebrand the status colors H3 that sat under the steps, Style rendered markdown's
  hand-off returned a re-skin reader to that same step, and the H3's own hand-off sent a rebrand
  reader on into the port, so a reader who followed the steps literally never met the rebrand and
  a reader who did it had no route to Verify, the dead end the second read caught on port step 10,
  now on the re-skin side. The finding's rewrite is taken whole: Re-skin Waymark gains step 6,
  "optionally, to rebrand the status colors, follow Rebrand the status colors, below", and its
  Verify jump is step 7; the H3's hand-off returns the reader to step 7, named in so many words;
  the routing sentence the H3's hand-off carried (a design the site already has takes the port)
  opens Port your own theme onto the chassis, right after its first sentence, where a reader
  choosing between the recipes meets it; and Style rendered markdown's hand-off returns a re-skin
  reader to step 6, the rebrand option, and then step 7. Style the editor preview's hand-off and
  What the page argues name step 7 for the re-skin's jump. Step 6 is the one route into the
  subsection and its hand-off the one route out, so the two recipes stay apart as before.
- Advisory, the introduction's in-order list (`:104-108`; Block 2, "Does your introduction provide
  an accurate overview of the topics you cover?"): the list now opens with the hand-built styling
  stack, scoped to that reader, and closes with the fix for each finding the audit raises, so it
  predicts every body section in order, with the drafter licensed to split it in two at the
  one-idea rule.
- Advisory, the flourish step's round trip (`:315-321`; Block 1, "Information is provided at the
  right pace"): the finding's rewrite is taken. Step 5 states the one action inline, location
  first, "in `src/theme/components/ArticleView.svelte`, add a `data-flourish` attribute to the
  `<article class="prose">` element" (`f:ivp8wl` for the attribute and the default, `f:spn4hj` for
  the element), and names Style rendered markdown only for what the three flourishes are. Style
  rendered markdown's content and hand-off no longer describe the re-skin as arriving by route,
  only by that link, and Theme a hand-built site's closing sentence names the flourish edit in
  both its homes as the scaffold's alone.

## Could not do, and friction filed

- `f:4xptbu` is subordinated to `docs/reference/cli-cairn-media-seed.md`, whose `--from` row and
  What it writes state the fixed `/media/` download path but not that the command ignores the
  adapter's `assets.publicBase`, so a site whose media route is mounted elsewhere cannot seed.
  Filed as reference-arm friction; the fact stays subordinated. The tool-side finding (no flag
  for the path) was filed 2026-09-30 by the extend gap sweep and is not refiled. Re-confirmed in
  resolution run 2 against the reference page as committed; the disposition is unchanged.
- The preview frame's `<html>` carries no `data-theme`, so the frame follows the OS scheme while
  the public site follows the visitor's cookie and `data-theme` (`f:faofr4`, `f:i9pgd2`). The
  page states it as the code's behavior. Filed as design friction.
- The `#chassis` seam is a convention with no gate in a scaffolded site (`f:lwrqfd`). The page
  states it as a convention. Filed as design friction.
- Three caveats this page also carries were filed 2026-09-30 and are not refiled: the preview
  ground's wording in `docs/reference/core.md` against the code (`f:faofr4`, `f:blhd7f`), the
  "about fourteen" count (`f:kt0epf`), the `check:public-tokens` comment in a scaffolded
  `theme.css` (`f:xv2ien`), the CTA keys' two homes (`f:18qj2u`), the shadowed `max-w-*` keys
  (`f:gzw7os`), the three-file theme rename (`f:i3rn6f`, `f:i9pgd2`), and the daisyUI `exclude`
  list living in a chassis file (`f:h5e8d4`, `f:s4prb0`). The reference's `vite dev` claim
  against the scaffold's dev backend (`f:j2qzct`) is on `ROADMAP.md`'s Next tier and is not
  refiled.
- The three entries this plan filed on its first run (the media-seed reference's missing
  `assets.publicBase` sentence, the preview frame's OS-only scheme, and the ungated `#chassis`
  seam) sit in `docs/internal/docs-friction-log.md` under "Filed 2026-10-03 by the page plan of
  `docs/extend/theme-your-public-site.md`" and are not refiled. Resolution run 2 filed no new
  entry: the flourish default and the port's route through the preview section are the code and
  the page's order, stated with no hedge. The third revision filed none either: the rebrand
  route, the inline flourish edit, and the introduction's list are the page's order and one
  attribute on one element, each stated with no hedge, and the reference entries each
  subordination names were re-opened and still state their facts (`docs/reference/core.md`'s
  `preview` entry, `docs/reference/cairn-audit.md`'s `theme-conformance` row and What
  theme-contrast doesn't cover, `docs/reference/public-css.md`'s Changed defaults, and
  `docs/reference/cli-cairn-media-seed.md`'s `--from` row and What it writes, the last still
  silent on `assets.publicBase`).
