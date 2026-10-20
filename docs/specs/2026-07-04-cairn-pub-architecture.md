# cairn.pub site architecture — elaborated for adversarial review

Nav: Waymark · Docs · Help · Blog + GitHub icon. Home is the about page; footer carries
administrivia. One domain, one repo (cairn-pub), one Worker. The site is Waymark (the
template) wearing the cairn theme (the one-file identity layer), managed by cairn's own
admin. Concept model: the stock pair — Posts (blog) and Pages (home, waymark, help
landing) — deliberately unmodified so the site demonstrates the default content model.

## Home (/) — a Pages entry composed with latest-posts data

Job: a developer understands what cairn is in one screen and knows where to go next; doubles
as the about page.

1. Masthead + nav (template chrome).
2. IDENTITY OPENING (prose, ~3 sentences): what cairn is; the workflow before/after
   distilled from why-cairn's opener.
3. THE DEMO REVEAL — component: CALLOUT (tone=note): "This site is cairn running itself:
   this page is markdown in a git repo, the admin at /admin is live, and the design is the
   Waymark template wearing the cairn theme, one CSS file." Component rationale: the callout
   sets apart the one fact the whole site depends on; tone=note keeps it factual.
4. WAYMARK IN THE NARRATIVE (prose section, ~1 paragraph): the template story with the
   /waymark link (Geoff's ruling: nav door AND narrative mention).
5. LATEST FROM THE BLOG — template structures: the featured-lead card (newest post) +
   the 2-3 next posts as index rows. No tag filter on home (that lives on /blog).
6. Footer: maintainer, MIT, ecxc.ski + 907.life as production sites, security reporting,
   contact, GitHub.

## Waymark (/waymark) — a Pages entry

Job: the get-started door; a developer sees what they'd start from and takes an exit
(tutorial now, scaffolder later).

1. OPENING (prose): what Waymark is — the neutral starter template; for many basic sites
   most of what they need; built to be restyled.
2. THE TEMPLATE AT FIVE WIDTHS — component: FIGURE (engine-native) with caption, showing
   the neutral template across viewports (the responsive-pass evidence, curated). Possibly
   two figures: one phone/desktop pair, one ultra-wide.
3. THE ONE-FILE REVEAL (prose + inline code): "the site you are reading is Waymark plus
   one CSS file" with the cairn-theme file linked; a second FIGURE pairing neutral vs
   themed home shots.
4. WHAT'S IN THE BOX (prose + list): the component set (callout, alert, icon, video,
   pull-quote, CTA, FAQ, banner, figures), the reading surface, light/dark, the a11y and
   token gates. Styleguide link.
5. GET STARTED — component: CTA ("Build your first cairn site" → the tutorial). Rationale:
   the CTA exists for the page whose point is that the reader does something; this is that
   page. Plus a CALLOUT (tone=tip) noting the scaffolder is planned and the tutorial is
   today's path (swapped for the scaffold command when it ships).
6. MAKE IT YOUR OWN (prose): the restyle guide link; the cairn theme as the worked example.

## Docs (nav item) — Phase 1: external link to the GitHub docs tree

Phase 1: the nav item links to github.com/glw907/cairn-cms/tree/main/docs (honest interim;
several lean peers do this). Phase 2 (the Topo pass): /docs renders the four developer arms
through the Topo shell — sidebar from the tree, Pagefind search, prev/next, docs typography;
sourced at build pinned to the published release tag. The /docs landing = the docs README
(audience routing, reading path, vocabulary).

## Help (/help) — the editor home, site chrome (NOT the docs shell)

Job: the standalone landing an editor reaches from their admin's help link or their
developer; friendly, writing-oriented, zero install content.

1. LANDING = the editor welcome (docs/guides/editor-welcome.md rendered as the /help page),
   with its existing sections (what cairn is, roles, signing in, posts and pages, writing,
   components, images, tags, tidy, save/publish, when something looks wrong).
2. THE GUIDES as sub-pages (/help/write-in-the-editor etc.): the five editor guides in the
   site chrome, each carrying its own in-page TOC (they already have them). A short index
   list at the landing's end links them (the For-editors group).
3. Components within: whatever the source guides carry (tables, code fences, callout
   examples render as real callouts — the guides ARE the demo for editor-facing rendering).

## Blog (/blog) — the Posts concept, stock

Job: the dogfood proof and the project's voice. Index = the archive + tag-filter chips
(template built-ins). Posts render on the reading surface with components as content
warrants (pull-quote, figure, code). First posts: (1) the neutral-split story ("Waymark and
the cairn theme"), (2) "How this site works" (the dogfood tour). Tags start minimal:
releases, design, engineering.

## Site-wide

- BANNER component (dogfood use): time-limited release announcements site-wide when
  warranted ("0.80 is out"), expiring on schedule. Used sparingly.
- The admin at /admin: live, magic-link, the owner row = Geoff. The editors' help link in
  the admin points at cairn.pub/help (the wiring the survey called more important than nav).
- 404: the template's default with a search-free "start at home" pointer.

# AMENDMENTS (adversarial review folded, 2026-07-04)

Verdict was commit-with-amendments; the amendments, applied:

1. NAMING (was B1): not a defect — the reviewer predates the naming ruling. Waymark IS the
   template's ruled name; the repo catches up via the owed rename sweep before Phase 1.
2. /HELP RESCOPED (was B2): Phase 1 ships a HAND-ADAPTED standalone landing only (the
   welcome's content, no LIVE-UI markers, links to the editor guides on GitHub, honestly
   labeled). The guide sub-pages defer to Phase 2, where ONE markdown-rendering pipeline
   (import-not-fork, link rewriting, LIVE-UI resolution, Mermaid) serves both /docs and
   /help — the same transform built once. RIDER, immediate docs fix: publish-and-discard.md
   links the DEVELOPER docs index (../README.md#vocabulary) from an editor guide — fix in
   the tree regardless of cairn.pub.
3. THE STOCK CLAIM DIES, HONESTY REPLACES IT (was S1/S2): the concept model is stock; the
   ROUTES are composed — home replaces the template's bespoke home with a Pages entry +
   stock delivery exports (indexes.pages.byId + posts.all, the shipped feed.ts pattern),
   and /blog receives the template's archive shape (featured lead stays on home). The doc
   now frames this as the composability demo it actually is. Hero projection for the
   featured card: add image to summaryFields (small engine-adjacent item, noted).
4. COMPONENT TASTE FIXES (was S3/S4): the demo reveal is confident PROSE, not a callout
   (callouts stay reserved for genuine cautions — this site is the taste exemplar); release
   banners live IN the home entry's markdown and are described as entry-scoped, never
   "site-wide chrome."
5. EVALUATOR INTENTS (was S5): "built with cairn" (ecxc.ski, 907.life) moves into the home
   narrative, not footer-only; the Waymark page gains the EDITOR DEMO VIDEO via the video
   component (asset dependency: a short admin walkthrough recording — open item).
6. /DOCS INTERIM (was S6): Phase 1 renders the docs README as an on-domain /docs landing
   that links into the GitHub arms; the nav item reads "Docs" with the landing making the
   GitHub hop explicit. Same interim posture as /help — consistent phasing.
7. SMALL TRUTHS (C1/C2/C3/C6): SIX editor guides, not five; the welcome carries no TOC (the
   landing adaptation adds its own orientation); feeds/sitemap/OG/JSON-LD are INHERITED
   from the template (the blog confirms feed wiring); llms.txt joins Phase 2; the
   styleguide gets its door as the Waymark page's "see every component live" sub-link;
   the Waymark page gains an FAQ block (maintained? cost? how is auth handled?) — a real
   FAQ use serving real evaluator questions, more taste-demo; screenshot count on Waymark
   drops in favor of the live styleguide link + the video (C5's maintenance point).
