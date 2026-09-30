# Extend outline review: reader jobs and coverage (OJ)

Target: `docs/internal/outlines/extend.json` at `b9013079`. Lens: the extend reader's real
journeys (start by hand, take over a scaffold, model content, theme the public site, extend the
admin, add auth, debug, upgrade) walked through the 25 pages and the three kept pages. Only
defects that leave a page wrong, incomplete for its job, or duplicative are listed.

**Verdict on the two sweep-added pages: keep both.** `configure-media` serves a real job with no
other home: a hand-built site that follows the tutorial has no media route, so Library uploads
never serve. `run-cairn-audit-on-your-site` also serves a real job: a site whose concepts are not
`posts` and `pages` has to set `rendered.pages` or its CI rendered pass audits 404s. Each page's
`job` states one reader goal. Minor fixes to each follow (OJ8, OJ12, OJ14).

Counts: 0 blocker, 5 major, 9 minor. One owner fork (OJ9).

---

## Major

### OJ1 (major). Tagging a concept is scattered across five pages and has no step

**Location:** `define-an-adapter-and-schema` covers ("The one taxonomy marker per concept
rule"); `f:2p519o` on `migrate-existing-content`; `f:shv6wv` on `turn-on-tidy`; `f:lbeeak` on
`debug-your-site`; `f:m9z6sr` and `f:k7nln3` on `build-the-public-routes`.

**Defect:** An organization site almost always wants tags: mark a field, let editors pick
from a vocabulary, and list entries on a tag page. No page carries that job. The marker rule
sits on the declare page as a bare constraint. The vocabulary's value rule sits on the migration
page. Where the vocabulary is stored sits on the tidy page. `byTag` and `allTags` appear on the
routes page only as a draft-exclusion edge, and no covers bullet builds a tag page. A reader
following "add tags" finds four fragments under unrelated titles.

**Proposed edit:**
- `define-an-adapter-and-schema.covers`: replace "The one taxonomy marker per concept rule."
  with "Tag a concept: the one top-level `taxonomy: true` multiselect, the tag vocabulary a save
  checks against (lowercase hyphenated values, existing out-of-vocabulary tags kept as
  orphans), where the vocabulary is stored (`editor.nav.configPath`, else
  `src/lib/site.config.yaml`), and the `content.field_unmarked` warning a missing marker
  raises." Add `f:2p519o`, `f:shv6wv`, and `f:lbeeak` to its `factIds` as cross-listings.
- `build-the-public-routes.covers`: add "A tag page: `allTags()` and `byTag()` on the index,
  drafts excluded, and the SEO it gets only through `buildSeoMeta` and `CairnHead`" (facts
  already on the page: `f:m9z6sr`, `f:k7nln3`).
- `turn-on-tidy.covers`: trim the storage bullet to the tidy conventions' file and link the
  declare page for the shared file.
- `crossLinks`: add define-an-adapter-and-schema to build-the-public-routes, "Listing entries
  by tag."

### OJ2 (major). The public menu editor is on the admin sidebar page

**Location:** `arrange-the-admin-sidebar.covers` bullet 6 ("Turn on the menu editor with
editor.nav; the menu node shape and its validation limits; readMenu on the public side") with
`f:rnwver` and `f:rzfdqw`. Related: `f:2s8u70` (the footer menu) on `scaffolded-site-files`.

**Defect:** `editor.nav` lets editors edit the public site's navigation menu, and `readMenu`
renders it. That is a public-site job. The page's title and `job` are about the admin
sidebar (`navLayout`), so a reader looking for "let editors edit the site menu" will not open
it. The two features share the word "nav," and the page's job ("without mistaking a hidden door
for a locked one") has nothing to say about a public menu.

**Proposed edit:**
- Move that bullet and `f:rnwver` and `f:rzfdqw` to `build-the-public-routes.covers` as "An
  editable site menu: declare `editor.nav` (`configPath`, `menuName`, `maxDepth`), the menu node
  shape and its limits, `readMenu` in the root layout's load, and a second menu edited by hand
  in `site.config.yaml`." Cross-list `f:2s8u70`.
- `arrange-the-admin-sidebar.outOfScope`: add "The public menu editor (`editor.nav`), which
  shares the word nav but not the screen (build-the-public-routes)." Keep a one-line pointer in
  its body, since a reader who sees `/admin/nav` in the fixed screen ids will ask.
- `crossLinks`: retarget "Arrange the admin sidebar to Turn on tidy" and "Turn on tidy to
  Arrange the admin sidebar" to build-the-public-routes (where `editor.nav` is now declared).
- Term table: if the menu editor gets a term, define it on build-the-public-routes.

### OJ3 (major). A hand-built site never learns to import the engine's public stylesheet

**Location:** `add-cairn-to-a-sveltekit-app.covers` (Milestone 3);
`theme-your-public-site.job` and covers bullet 1 ("a hand-built site starts with neither").

**Defect:** The engine emits public markup that its own `cairn-public.css` styles: status inks,
the focus ring, table-scroll, figure placement, and the broken-image marker
(`docs/reference/render.md:28`: "which a site imports"; reference fact `f:c4nnu9`). The tutorial
renders a public entry page but never imports that sheet. The theme page's job covers only
re-skinning the scaffold or porting onto the chassis. It says a hand-built site has neither and
stops there. The by-hand reader's "theme the public site" journey ends with engine markup
unstyled and nothing on the track to tell them why.

**Proposed edit:**
- `add-cairn-to-a-sveltekit-app.covers`, Milestone 3: append "import
  `@glw907/cairn-cms/cairn-public.css` after `tailwindcss` in the public stylesheet." Add
  reference fact `f:c4nnu9` to `factIds`.
- `theme-your-public-site.covers` bullet 1: extend it to "...and that a hand-built site starts
  with neither: it imports `cairn-public.css` and supplies its own daisyUI theme block, and the
  rest of this page's token and verify sections still apply" (link `docs/reference/public-css.md`).
  No change to `job` is needed if this bullet lands.

### OJ4 (major). A hand-built site's custom screen has no route to compile its own utilities

**Location:** `add-a-custom-admin-screen.covers` bullet 6 ("Styling: ..."); the site admin
sheet facts `f:vs6k2k` and `f:666eg6`, which sit on `scaffolded-site-files` only.

**Defect:** `f:zpi2ux` (already on the page) says the packaged admin sheet never scans a site's
markup. A custom screen that uses any Tailwind utility the engine does not already use therefore
needs the site's own admin sheet. That setup is `src/admin.css` with `@source "./routes/admin"`,
the `admin-sources.css` import, the pre-scripts that compile `.cairn/admin.css`, and the import
from the admin layout. Only the scaffold file map describes that wiring, file by file. A reader who
built the site by hand and follows this page writes `grid-cols-3`, gets nothing, and has no
step telling them why. (I did not confirm whether the tutorial's admin layout imports a site
sheet. If it does, the fix belongs in the tutorial instead, and this page links there.)

**Proposed edit:** `add-a-custom-admin-screen.covers` bullet 6: prepend "Your screen's own
utilities compile only through the site admin sheet (`src/admin.css` scanning `routes/admin`
and importing `admin-sources.css`, compiled to `.cairn/admin.css` by the pre-scripts and
imported from the admin layout); a scaffolded site already has it." Cross-list `f:vs6k2k` and
`f:666eg6` into the page's `factIds`.

### OJ5 (major). The security model's covers leave an open decision and a published anchor at stake

**Location:** `security-model.covers` bullet 8 ("... decide whether to carry the
recovering-whitelist-semantics recipe the 0.97.0 migration note cites").

**Defect:** A drafter cannot settle a scope question. `docs/extend/migration-notes.md:370`, a
per-version record that is kept unchanged, links
`docs/extend/security-model.md#recovering-whitelist-semantics`. If the drafter drops the
recipe, that link dies. The recipe is also a task (make the map exhaustive) sitting in a concept
page.

**Proposed edit:** Replace the clause with "end the section with a 'Recovering whitelist
semantics' subsection (the heading the 0.97.0 migration note links): the exhaustive-map rule in
two sentences, linking restrict-admin-access for the steps." Add a covers bullet to
`restrict-admin-access` before its verify bullet: "Make the map exhaustive when you want
whitelist behavior: map every concept and fixed screen until `config.access_unmapped` is
silent." The existing cross-link from security-model to restrict-admin-access covers the
link.

---

## Minor

### OJ6 (minor). Content model and Define an adapter and schema both cover validation, and the permalink rules are split between them

**Location:** `content-model.covers` bullets 6 and 11 (`f:hdrzxd`, `f:dccnyu`, `f:7ak73t`);
`define-an-adapter-and-schema.covers` bullets 5 and 8 (`f:aj5c4z`, `f:93iwom`, `f:ar5p72`,
`f:g39nkp`, `f:2i6u6o`).

**Defect:** Both pages state the one-banner save error and the fail-open throwing
`behavior.validate`. Both pages also cover permalinks: the allowed tokens and the feed-only date
tokens sit on the concept page, while the defaults and the date-field requirement sit on the task
page. A reader writing a `permalink` needs the token list at the step.

**Proposed edit:** In `content-model.covers` bullet 6, keep only "the save is refused before any
commit"; drop the banner and fail-open clauses and move `f:dccnyu` to
define-an-adapter-and-schema. Move `f:7ak73t` and the token half of content-model bullet 11 into
define-an-adapter-and-schema bullet 5. Keep "dir used verbatim; slugify's ASCII-only ids" on
the concept page.

### OJ7 (minor). The Model content order puts two pages ahead of the render page they depend on

**Location:** `groups[model-content].pages`, and each page's `order`.

**Defect:** `rendering.render` is a required adapter group. `reuse-content-across-entries`
covers bullet 3 ("Forward resolveFragment from your render") and the link page's resolved
targets both assume `configure-rendering`, yet both come before it in the order.

**Proposed edit:** Reorder to content-model, define-an-adapter-and-schema,
configure-rendering, link-content-with-references, reuse-content-across-entries,
configure-media, migrate-existing-content, and renumber `order` from 4 to 10.

### OJ8 (minor). Cross-links are missing on the takeover and tutorial journeys

**Location:** `crossLinks`.

**Defect:** A reader taking over a scaffold usually changes `cairn.config.ts` or a delivery
route next, or upgrades an inherited engine pin. `scaffolded-site-files` links to none of those
pages; `build-the-public-routes` appears only in its outOfScope. The tutorial ends in
production with no media route and does not link to `configure-media`.

**Proposed edit:** Add these cross-links:
- Scaffolded site files to Define an adapter and schema: "Changing the concepts in
  `cairn.config.ts`."
- Scaffolded site files to Build the public routes: "The (site) routes it lists."
- Scaffolded site files to `docs/extend/upgrade-cairn.md`: "Moving an inherited engine pin."
- Add cairn to a SvelteKit app to Configure media: "Turning on uploads after production."

### OJ9 (minor, OWNER FORK). Customizing the sign-in email exists only inside the from-scratch tutorial

**Location:** `add-cairn-to-a-sveltekit-app.covers` bullet 7 ("Customize the sign-in email
(section)", sweep).

**Defect:** A reader who took over a scaffold and wants to change the sign-in email's branding
or sender never opens a tutorial that builds a site from an empty project. The section also
breaks the tutorial-milestone anatomy (objectives, state, steps, checklist).

**Options:**
- (A) Keep it as a titled section at the end of the tutorial, after the milestones. Add a
  cross-link from scaffolded-site-files ("The sign-in email's copy and sender") and one from
  replace-magic-links-with-cloudflare-access ("Staying on magic links but rebranding them").
  No new page.
- (B) Make it its own short task guide, "Customize the sign-in email," in Auth and access (the
  page the sweep considered and folded).

**Recommendation:** (A). The job rests on two facts, and the cross-links reach the takeover
reader at no page cost.

### OJ10 (minor). Kept pages have no group, and key rotation sits under Auth rather than Operate

**Location:** `kept`; `groups[auth-and-access]`.

**Defect:** The review copy lists all three kept pages under Operate.
`choose-an-ai-posture` is a public-site task that its own cross-link ties to
build-the-public-routes. Rotating the GitHub App key is an operating chore, not an access
decision, so a reader who comes back to do it looks under Operate.

**Proposed edit:** Wherever the arm index is written, list `choose-an-ai-posture` in Public site
after build-the-public-routes, and `upgrade-cairn` and `migration-notes` in Operate. If the
index is generated from `groups`, add the kept slugs to those `pages` arrays. Move
`rotate-the-github-app-key` to `groups[operate]` after debug-your-site.

### OJ11 (minor). Architecture repeats a security property, and one named seam has no page to link

**Location:** `architecture.covers` bullets 4 and 8.

**Defect:** Bullet 8 ("Hashed-at-rest tokens and sessions") states a security property that the
page's own outOfScope assigns to security-model, which covers it in depth. Bullet 4 promises
"a link to the page that uses it" for each seam, but no page uses `BackendProvider`
(`f:n1om0r`: no provider ships besides `createGithubApp`). A drafter would invent a link or
leave one out.

**Proposed edit:** Bullet 8 becomes "Sessions, tokens, `audit_log`, and `preview_tokens` as D1
rows, and git history as the edit record (their security properties on security-model)." Bullet
4 appends "; `BackendProvider` links its reference entry, since no page builds a second
backend."

### OJ12 (minor). The custom-screen page repeats the audit page's exit codes and carries an unrelated bullet

**Location:** `add-a-custom-admin-screen.covers` bullets 14 and 15.

**Defect:** Bullet 15 ("exit codes, advisory versus error") repeats run-cairn-audit-on-your-site
bullet 1 and bullet 7, which share `f:1md5oj`. Bullet 14 (bundling a `/sveltekit` export into a
Cron Worker outside Vite) is not part of adding a screen. It is an export-placement trap.

**Proposed edit:** Bullet 15 becomes "Verify: run `npx cairn-audit` over the screen and fix
each error-tier finding (tiers and exit codes on run-cairn-audit-on-your-site)." Move bullet 14
and its fact to `architecture.covers` bullet 2 (the placement rules) as "a `/sveltekit` export
bundled outside Vite needs a `$app/environment` alias."

### OJ13 (minor). The tutorial's verification is one closing section instead of a check per milestone

**Location:** `add-cairn-to-a-sveltekit-app.covers` bullet 8 ("Verify each milestone ...").

**Defect:** The tutorial-milestone anatomy (`docs-register.md`, "The page anatomies") puts a
checklist at the end of each milestone, before the reader advances. A single end section lets
a reader carry a milestone 2 failure into milestone 4.

**Proposed edit:** Split bullet 8 into each milestone's bullet: the workers.dev address in
Milestone 1, the dev `/admin` sign-in in Milestone 2 and the dev-backend section, and
`cairn doctor`'s `config.bindings` check plus the branded 500 in Milestone 4.

### OJ14 (minor). The audit page's exemplars pull a task guide toward a reference page

**Location:** `run-cairn-audit-on-your-site.exemplars`.

**Defect:** Both exemplars are reference-shaped (a CI checks table and an exit-code reference),
while `pageType` is task guide and `docs/reference/cairn-audit.md` already holds the rules,
flags, and exit codes. A drafter following these exemplars is likely to rebuild the
reference.

**Proposed edit:** Keep `operators/restic-scripting/` only for the environment-variable-up-front
move. Replace `core/rustc-dev-guide-ci/` with `extenders/directus-create-extension/` (verb
steps ending in a check you can see: a clean `check:cairn:rendered` run).
