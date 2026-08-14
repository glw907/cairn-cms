# Admin nav: comparables refresh (research, 2026-07-14)

Refreshes `2026-07-14-admin-nav-organization-research.md` (the original nine-product
survey) and extends it to Directus and Strapi. Third grounding input for the admin
reorganization pass, beside the evidence layer
(`2026-07-14-admin-nav-evidence-research.md`). Source URLs accompany every claim; the
consolidated gap list closes the doc.

## Per-product updates

**WordPress — MATERIAL: the admin redesign partially shipped in 7.0.** Gutenberg Phase 3
tracking: <https://github.com/WordPress/gutenberg/issues/53322>; origin posts
<https://make.wordpress.org/core/2023/07/12/admin-design/> and
<https://make.wordpress.org/design/2023/08/10/admin-design-kickoff/> (which records
community pushback on drill-down nav for infrequent users). WordPress 7.0 (~May 2026)
shipped a command palette, collapsible icon-only sidebar, design tokens, and DataViews —
but did NOT change nav order or grouping ("Posts, Pages, Media, Appearance, Plugins,
Settings... remains in place") — <https://instawp.com/wordpress-7-0/>,
<https://supersoju.com/blog/2026/04/09/the-wordpress-admin-got-a-major-makeover-heres-whats-different/>
(secondary sources; no canonical release post fetched). Fresh-install order (official):
Dashboard, Posts, Media, Pages, Comments, Appearance, Plugins, Users, Tools, Settings —
<https://wordpress.org/support/article/administration-screens/>.

**Ghost 6.x — MINOR: one new sidebar item.** 6.0 (Aug 2025) added native analytics (an
Analytics sidebar tab), ActivityPub, native comments — <https://ghost.org/changelog/6/>,
<https://ghost.org/help/native-analytics/>. June 2026 added a front-end admin toolbar
(additive) — <https://ghost.org/changelog/admin-toolbar/>. Default rail (synthesis of
official partials; exact order unconfirmed): Dashboard, Posts, Pages, Tags, Analytics,
Members, Staff, Settings. Nav is fixed and not extensible
(<https://forum.ghost.org/t/extend-admin-and-or-settings-menu/62798> unanswered).

**Payload — IN FLIGHT: 4.0 admin redesign announced June 2026.** `admin.group` mechanism
unchanged (declaration-order within groups; the `admin.order` ask is open, no commitment:
<https://github.com/payloadcms/payload/discussions/14528>). Folders (beta ~v3.39):
<https://payloadcms.com/docs/folders/overview>. Payload 4.0 makes hierarchy a core
primitive with sidebar tabs for folders/tags/custom components —
<https://payloadcms.com/posts/blog/payload-40-admin-ui-redesign-tanstack-mcp-and-more>.
No doc enumerates a fresh install's sidebar order (gap). Ecosystem signal:
`payload-nav-studio` exists because ordering is unmet —
<https://github.com/pOwn3d/payload-nav-studio>.

**Statamic v6 — MATERIAL: fully redesigned CP (Jan 2026).** Rewritten UI library, CP
theming, command palette, breadcrumbs from CP nav — <https://statamic.com/blog/statamic-6>.
Default arrangement (verified against `CoreNav.php` 6.x): Dashboard, then sections
**Content** (Collections, Navigation, Taxonomies, Assets, Globals), **Fields**, **Tools**,
**Settings**, **Users** —
<https://raw.githubusercontent.com/statamic/cms/6.x/src/CP/Navigation/CoreNav.php>. The
strongest first-party sectioned-by-default nav (~15 items when sections earn keep).

**Sanity — MINOR.** Desk→Structure rename settled
(<https://www.sanity.io/docs/help/desk-is-now-structure>); App SDK (spring 2025); Structure
menu-group titles "no longer displayed"
(<https://www.sanity.io/docs/studio/config-api-reference/changelog>). Default Structure
lists all document types.

**Contentful — NO CHANGE** since the Oct 2024 single-line nav refresh
(<https://www.contentful.com/developers/changelog/updated-ui/>). Tabs: Content, Media,
AI & Automations, with Settings/Apps separate (exact default order unconfirmed).

**Craft — no 5.x structural change; Craft 6 CP rebuild in alpha**
(<https://craftcms.com/blog/craft-6-alpha-released>). 5.8 added collapsible source headings
for complex architectures; 5.9 subnav icons. Default (official): Dashboard, Assets,
Entries, Categories, Globals, Users, GraphQL, Utilities, Settings, Plugin Store; items
appear only when configured AND permitted —
<https://craftcms.com/docs/5.x/system/control-panel.html>.

**Kirby — NO CHANGE.** Four built-in areas (site, users, languages, system); `panel.menu`
fully replaces the menu: ordered names, `'-'` dividers, relabels, conditional closures —
<https://getkirby.com/docs/reference/system/options/panel/panel-menu>. The closest
published analogue to cairn's `navLayout`.

**Decap — NO CHANGE.** Flat collections in config order; grouping request open since 2019
(<https://github.com/decaporg/decap-cms/issues/2056>).

**Directus (new) — MATERIAL: v12 Studio redesign (May 2026)** reworking navigation,
headers, sidebars — <https://directus.com/resources/v12-built-for-the-whole-team>. Default:
a module bar (Content, Files, User Directory, Insights, Settings) with a collections
sub-sidebar; two-tier by construction. Native folder-group nodes exist but are poorly
discoverable — <https://github.com/directus/directus/discussions/11010>.

**Strapi (new).** Default: Content Manager, Content-Type Builder, Media Library, Settings,
Marketplace; inside Content Manager exactly two fixed categories (Collection Types, Single
Types), flat within each. The grouping gap is Strapi's most-voted nav issue (536 votes,
"Planned" since 2018, unshipped) —
<https://feedback.strapi.io/feature-requests/p/add-a-folder-like-group-function-to-organize-content-types>.

## Published guidance: mechanism, not taste

Products document mechanism; only Sanity publishes organizational judgment: organize by
editor workflow, not schema shape ("check with your content editors: how do they want to
browse?"); group rarely-accessed types to reduce visual noise; the 2,000-document Structure
list cap — <https://www.sanity.io/docs/developer-guides/getting-started-with-structure-builder>,
<https://www.sanity.io/docs/studio/structure-builder-cheat-sheet>,
<https://www.sanity.io/docs/studio/structure-builder-reference>. Statamic, Payload, Kirby,
Craft: mechanism-only. WordPress: philosophy-level design posts, handbook update pending.

Cross-industry: GitLab Pajamas is the most concrete admin-grade spec — strict two-level
hierarchy ("There is not a third level of depth"), 1-2 word labels, permission-adaptive
sub-items under a constant top-level structure —
<https://design.gitlab.com/patterns/navigation-sidebar/>. Toptal's settings-UX guide: 4-5
top-level categories, card-sort the groupings —
<https://www.toptal.com/designers/ux/settings-ux>. Practitioner convergence: ~4-6 items
before grouping — no research-grade number exists (Baymard has no admin-sidebar research).

## Role-varying navs: subtractive everywhere

Every surveyed product varies nav by role subtractively from one canonical arrangement;
per-role LAYOUTS are always an opt-in extra (Statamic Pro preferences, Craft's paid CP Nav
plugin, Sanity's `currentUser` structure resolver). Payload states the only explicit
rationale: nav visibility is a direct reflection of access control —
<https://payloadcms.com/docs/access-control/overview>. GitLab's stated rule: sub-items
adapt to permissions, top-level structure stays constant.

## Scale thresholds in practice

- WordPress is the canonical failure case: flat insertion-order nav breaks at plugin scale;
  an entire plugin ecosystem re-imposes order (Admin Menu Editor, Adminimize, Hierarchy) —
  <https://wordpress.org/plugins/admin-menu-editor/>.
- Strapi: 50+ collection types documented as painful; 536-vote grouping request unshipped —
  <https://github.com/strapi/strapi/discussions/26445>.
- Sanity practitioner threshold: "past a dozen schemas, editors start complaining the
  sidebar is a wall of alphabetical noise"; nesting past two levels "maze-like" —
  <https://nayankyada.com/blog/how-i-customise-sanity-structure-builder-with-custom-ordering-and-grouping>.
- Craft/Kirby: scale pain appears first INSIDE sections (long source/page lists), not at
  the top level.

## Cross-product patterns for the navLayout seam

1. Nobody auto-grows top-level nav from schema without a grouping story; the products that
   do (Strapi, Decap, default Sanity) have the loudest clutter complaints.
2. Two levels is the industry ceiling.
3. Subtractive role handling is the default everywhere; per-role layouts are opt-in extras.
4. Kirby `panel.menu` is the cleanest existing full-tree-replacement analogue.
5. Content first, settings/users last is universal across every surveyed default.
6. The command palette is the standard escape valve (WordPress 7.0, Statamic 6).

## Consolidated gaps

WordPress 7.0 details rest on trade coverage, not a fetched release post. Ghost exact
sidebar order and per-role visibility unconfirmed. Payload default order undocumented.
Contentful default tab order and role behavior unconfirmed. Kirby core-area role hiding
unconfirmed. No research-grade numeric threshold for flat-to-grouped exists anywhere.
