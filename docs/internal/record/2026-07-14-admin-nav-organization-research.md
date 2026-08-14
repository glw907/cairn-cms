# Admin nav organization: provenance vs. task, research for a brainstorm

Geoff's question: cairn's admin sidebar groups by provenance. The engine's own screens (concepts,
Library, Tags, Settings, Editors, Help) sit in one flat "Core" group; a developer's custom screens
get their own named sections, in declaration order, after Core. That's the shape a developer
would draw, since it mirrors where each screen comes from. Would a non-technical editor be served
better by a grouping shaped around what they're trying to do (write, publish, manage people,
configure), and what do comparable products actually ship?

## The current shape

`CairnAdminShell.svelte`'s `coreItems` derivation builds one list: the content concepts, the
developer's flat custom entries folded in right after them, then Library, Tags, an optional
nav-menu editor, Settings, and Editors (owner-only). That whole list renders as a single
collapsible "Core" section. A developer's own custom *sections* (as opposed to flat entries)
render as separate named groups after Core, in declaration order. Help is pinned outside any
group, at the sidebar foot. The roles pass just shipped capability-scoped visibility: a
`none`-capability session sees only the site's custom flat entries, since every engine screen
403s for it. So the sidebar already varies by *who's looking*, but within a given capability level
every engine screen still sits in one undifferentiated bucket, keyed only by "cairn built this."

## What comparable products do

| Product | Grouping principle | Where custom/plugin screens land | Settings/roster split from daily work |
|---|---|---|---|
| WordPress (classic) | Provenance-flavored content-type list: Posts, Media, Pages, Comments as content, then Appearance, Plugins, Users, Tools, Settings as system functions | Plugins get their own top-level item, inserted wherever they register, no dedicated "plugins" zone | Users and Settings are late items in the same flat list, not separated |
| WordPress (2022-23 admin redesign proposal) | Explicitly reframing toward task/intent buckets ("Design" replacing "Appearance") to match user mental models rather than internal APIs | Not yet shipped; the stated goal is fewer, broader buckets that absorb plugin surface by task, not by origin | Proposal, unresolved; the team's own retrospective notes buckets "erode in practice what is mentally lean in theory" |
| Ghost | A flat, unlabeled list: Dashboard, Posts, Pages, Tags, Members, Staff, Settings, Analytics. No group headers at all | No plugin model; Ghost has no third-party admin screens to place | Settings and Staff sit in the same flat list as Posts and Pages, just later in reading order |
| Craft CMS | Content-type list (Entries, Assets, Categories, Globals, Users) with system items (GraphQL, Utilities, Settings, Plugin Store) folded into the same list, shown or hidden by permission and configuration | A plugin can register a full top-level item (`EVENT_REGISTER_CP_NAV_ITEMS`) or, more often, a pane inside Settings | Settings is one item among many; a "fourth group" of plugin tiles appears inside it once plugins are installed |
| Statamic | Configurable list (Collections, Globals, Navigation, Assets, Forms, Users, Settings) that both an admin (site-wide default) and each user (personal preference) can reorder, rename, or hide | Addons extend the same nav tree via a PHP API; no separate "addons" zone is documented | Left to the reorder mechanism; no stated default separation |
| Sanity Studio | Top-level "tools" (Structure, Vision, Dashboard, a custom tool) are whole task modes, not sidebar groups; inside Structure, a `S.list()`/`S.listItem()` builder groups document types however the team's editorial workflow calls for | A custom tool is a peer of Structure in the top bar; a custom content grouping happens inside Structure via the builder, independent of schema shape | Settings/roster aren't native concerns; a team builds them as another tool or a Structure branch |
| Contentful | Fixed top-nav tabs by function: Content, Content model, Media, Apps, Settings, one tab per activity, not one per content type | "Apps" is its own tab, a dedicated zone for anything third-party, never merged into Content | Settings is a separate top-level tab, structurally split from Content from the first pixel |
| Payload CMS | Config-driven `admin.group` on each collection; collections sharing a group name collapse under one named header in declared order | A developer's own collections/globals just get a `group` like any built-in one; no separate "custom" bucket, the seam is symmetric | No default separation; whatever group a developer names for Settings-like collections is what shows |
| Decap/Netlify CMS | Flat list of collections in `config.yml` declaration order, one entry per content type, no grouping mechanism at all | N/A, no plugin/admin-extension surface | N/A, Decap has no settings or user-management screens |
| Kirby | `panel.menu` config option: an ordered list naming default areas (site, users, languages, system) plus any custom plugin-registered areas, interleaved by the developer's chosen order | A plugin's custom area is a named peer in the same ordered list, positioned wherever the config puts it | Whatever order the config states; no enforced separation |

## Recurring organizing principles

Four shapes recur, not always pure:

**Flat content-type list, no grouping at all.** Ghost, Decap, and (for the concepts themselves)
cairn today all do this at the top. It costs nothing to build and nothing to learn: when the list
is short enough to scan in one glance, there is no grouping problem to solve. Ghost proves this
holds even once Settings, Staff, and Analytics join the list; a flat list stays legible past pure
content types as long as the total count is small (Ghost ships eight items, no group headers,
and does not need one).

**Provenance/origin grouping.** WordPress classic, Craft's plugin-registered items, Kirby's
plugin-registered areas: whatever a plugin or module adds gets its own slot, positioned by
registration, not by what an editor is trying to do. This is the cheapest model for the platform
to support (a plugin just declares a nav entry) and is exactly cairn's current shape for custom
sections. It scales well for the *builder*; the WordPress redesign team's own critique is that it
scales poorly for the *user*, who has to learn "which bucket has the thing I want" one plugin at a
time.

**Task or mode-based grouping.** The WordPress redesign proposal (unshipped, explicitly aimed at
mental-model alignment), Sanity's top-level tools (Structure vs. Vision vs. Dashboard, each a
whole different activity), and Contentful's fixed Content/Content model/Media/Apps/Settings tabs
all group by what you're doing, not by what shipped it. Nielsen Norman's intranet research backs
this generally: task-based navigation outlasts org-chart navigation and eases learning, while
categories that mirror "who built this" invite what the literature calls organizational
narcissism, a structure that makes sense to the team, not the user. The cost is real, though: the
WordPress team's own retrospective admits broad task buckets "erode in practice what is mentally
lean in theory" once enough disparate things get crammed into one bucket.

**Configurable/personalizable nav.** Statamic (both admin-level and per-user reordering) and
Payload's declarative `admin.group` sit here: the platform provides a grouping *mechanism* and
leaves the actual grouping decision to whoever configures the site, rather than picking a
philosophy centrally. This sidesteps the provenance-vs-task debate at the framework level by
pushing it down to each site's admin, which also means each site's editors get a different
answer, with no guaranteed task alignment unless someone configures it that way.

## Assessment for cairn at its current scale

cairn's engine-side nav today is six items at most: the content concepts (typically two, Posts and
Pages), Library, Tags, an optional nav editor, Settings, and Editors, plus Help pinned outside any
group. That is smaller than Ghost's flat eight-item list, and Ghost does not group at all. Judged
against the comparison set, provenance grouping is not obviously costing an editor anything yet:
there's exactly one group (Core), so "provenance" isn't actually competing with any other
grouping principle for the editor's attention, it's just a label over the one bucket they already
have to learn regardless of what it's called. The place provenance grouping *does* show up is at
the boundary with a developer's custom sections, where an editor sees "Core" as one section and
then the site's own named sections as separate ones. Whether that reads as "the engine's stuff vs.
the site's stuff" or just "these are the sections in this app" likely depends on how many custom
sections a given site has and how much they resemble engine concerns (e.g., a "Club" section that
also has its own settings-like screen would sit oddly beside cairn's own Settings).

Where the comparisons suggest task-shaped grouping starts paying is once the *count* or the
*heterogeneity* crosses a threshold no single site hits today at the engine level, but that a
site's custom nav can hit on its own: three or more distinct custom sections, or any custom
section whose items are activity-different enough from "manage this content type" (a
membership roster, a booking calendar, a form-response inbox) that lumping it under a
provenance label stops describing what the editor is about to do. WordPress's redesign team hit
this wall with a much larger surface (dozens of plugin-registered items); cairn's is nowhere near
that today, but a site with, say, Posts, Pages, a Club roster, an Events calendar, and a Contact
inbox, five to six sections total, starts to resemble the WordPress "too many buckets" problem
Ghost's flat-list scale never encounters.

## Candidate shapes (brainstorm inputs, not a recommendation)

**A. Keep provenance grouping, rename the labels.** Leave the mechanism exactly as it is (Core vs.
named custom sections) but let a site rename "Core" to something that reads as an activity rather
than an origin ("Content", "Publishing"), the way Contentful's tab is called "Content" rather than
"Contentful's own screens." Cheapest change, zero new mechanism, and it directly answers the one
thing provenance grouping visibly costs today (the label itself reading as "ours" vs. "yours").
Trade-off: doesn't touch the deeper question of whether Core's own six items are in the right
relative order for an editor's workflow.

**B. Split Core by activity, keep the flat custom-section model.** Break the current single Core
bucket into two or three implicit groups that never carry a header at small counts (mirroring
Ghost's no-header flat list) but that are ordered and, past a threshold, promoted to labeled
groups: content (concepts, Library, Tags) first, then configuration (nav editor, Settings), then
people (Editors), with Help staying pinned at the foot as it is now. This borrows Sanity's
"promote to a header once it's worth one" instinct without adding a new concept for developers to
learn; it is a reordering and a threshold rule, not a new API. Trade-off: more moving parts than A,
and the threshold (how many items before a bucket earns a header) is a judgment call with no
obvious right answer from the comparison set.

**C. Task-mode top-level split, à la Sanity's tools or Contentful's tabs.** Introduce a small,
fixed set of top-level destinations, something like Content / People / Settings, and file every
current Core item plus every custom section under one of them, so a developer's "Club" section
sits inside Content or wherever it functionally belongs rather than getting its own top-level
slot. Best matches the task-based literature and would let a heterogeneous site (the five-to-six
section case above) scale without the sidebar growing sections indefinitely. Trade-off: this is
the biggest structural change of the three, changes the developer-facing custom-nav contract
(a section currently maps 1:1 to a sidebar group; this reframes it as filed under a mode), and
solves a problem cairn's admin does not yet have at the engine level, only at the outer edge of
what a heavily-extended site could reach.

## Sources

- [Exploring the WordPress admin sidebar](https://make.wordpress.org/design/2018/06/29/exploring-the-wordpress-admin-sidebar/)
- [Thinking Through the WordPress Admin Experience](https://make.wordpress.org/design/2022/06/13/thinking-through-the-wordpress-admin-experience/)
- [Admin Design Kickoff](https://make.wordpress.org/design/2023/08/10/admin-design-kickoff/)
- [WordPress Plans Ambitious Admin UI Revamp (WP Tavern)](https://wptavern.com/wordpress-plans-ambitious-admin-ui-revamp-with-design-system-galvanizing-broad-support-from-the-developer-community)
- [Ghost: Site navigation](https://ghost.org/help/updating-navigation/)
- [Ghost: Filter posts with sidebar views](https://ghost.org/changelog/sidebar-views-filter/)
- [Ghost: Native analytics](https://ghost.org/help/native-analytics/)
- [Craft CMS: Control Panel](https://craftcms.com/docs/5.x/system/control-panel.html)
- [Craft CMS: Control Panel Sections](https://craftcms.com/docs/5.x/extend/cp-section.html)
- [Statamic: Customizing the Control Panel Navigation](https://statamic.dev/control-panel/customizing-the-cp-nav)
- [Statamic: Extending CP Navigation](https://v6.statamic.dev/control-panel/cp-navigation)
- [Sanity: Structure tool and Structure builder](https://www.sanity.io/docs/studio/structure-introduction)
- [Sanity: Studio Tools](https://www.sanity.io/docs/studio/studio-tools)
- [Sanity: Tools cheat sheet](https://www.sanity.io/docs/studio/tools-cheat-sheet)
- [Contentful: Customizing sidebar](https://www.contentful.com/developers/docs/extensibility/app-framework/customizing-sidebar/)
- [Contentful: Content tab / Create content views](https://www.contentful.com/help/content-tab/)
- [Payload: Collection Configs (admin.group)](https://payloadcms.com/docs/configuration/collections)
- [Payload: The Admin Panel](https://payloadcms.com/docs/admin/overview)
- [Decap CMS: Configuration Options](https://decapcms.org/docs/configuration-options/)
- [Kirby: panel.menu](https://getkirby.com/docs/reference/system/options/panel/panel-menu)
- [Kirby: Panel areas](https://getkirby.com/docs/reference/plugins/extensions/panel-areas)
- [NN/G: Intranet Information Architecture (IA) Trends](https://www.nngroup.com/articles/intranet-information-architecture-ia/)
- [NN/G: Intranet Information Architecture (IA) Methods](https://www.nngroup.com/articles/intranet-ia-methods/)
- `src/lib/components/CairnAdminShell.svelte` (cairn's current nav derivation, read for this doc)
- `docs/internal/admin-design-system.md` (cairn's admin design language, read for this doc)
