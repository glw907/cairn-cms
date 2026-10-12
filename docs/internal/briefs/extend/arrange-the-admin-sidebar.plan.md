# Page plan: Arrange the admin sidebar

Page: `docs/extend/arrange-the-admin-sidebar.md` (new; no committed page). Brief:
`docs/internal/briefs/extend/arrange-the-admin-sidebar.json` (written by the page chain's later
step). Page type: task guide. Written 2026-10-12 by the plan step of the docs page chain.

Inputs read: the outline entry in `docs/internal/outlines/extend.json`; "The page anatomies",
"Structure", and "The introduction" in `docs/internal/docs-register.md`; every fact bullet named
below in `docs/internal/facts/extend.md` and `docs/internal/facts/reference.md`; the navLayout seam,
the attention seam, and the `ContentRoutesConfig` and `CairnAdminConfig` rows in
`docs/reference/sveltekit.md`; the `CairnAdminShell` sidebar paragraphs in `docs/reference/admin.md`;
the figure's sources `src/lib/reproductions/stories/site.ts` (`workedNavLayout`) and
`src/lib/reproductions/fixtures.ts` (`fixtureNavLayout`); the scaffold's `navLayout` in
`templates/waymark/src/theme/cairn.config.ts` and its `createCairnAdmin` call in
`templates/waymark/src/chassis/cairn.server.ts`; the two exemplars; and the headings of
`docs/extend/restrict-admin-access.md` and `docs/extend/debug-your-site.md`.

Headings in this plan are the page's headings, verbatim. A claim inventory `section` names one of
them. The introduction is the untitled text under the H1 and is named `Introduction` here.

## What the page argues

The sidebar is one tree the engine resolves server-side, and a developer shapes it at two points:
declaratively, as `navLayout` data on the adapter's `editor` group, and per request, as two
functions passed to `createCairnAdmin`. The page's spine follows the order the engine itself
applies on a request: the declared tree (node kinds, then what the tree leaves out), the built-in
visibility gates on that tree (`roles`, `ownerOnly`), the section's presentation (`collapsed`),
then `navFilter`, which runs after every built-in gate, then `attention`, which runs after
`navFilter` (`f:rx9v6d`, `f:rshs6k`). A reader who follows the page in order therefore never meets
a seam before the thing it acts on exists.

Within the declared tree, the order argues itself from the figure. The worked example's resolved
sidebar shows a trailing group the example never declared (Tags, Editors, Help), so the section on
unreferenced screens and `hidden` comes directly after the figure that raises the question.
Narrowing by role comes after hiding because both are visibility rules on a declared node, and the
section on role narrowing needs a section to exist. `collapsed` is presentation only, so it closes
the declarative half. Validation is stated once as explanation where the tree is declared, because
that is where the reader can break it; Verify checks it first, since a server that will not start
shows nothing else; and the failure section lists every trigger.

One line holds through the page, as the job asks: every way the sidebar hides a link is cosmetic.
`hidden`, `ownerOnly`, `roles`, and `navFilter` each state that limit where they are introduced, in
one sentence that names `restrict-admin-access` as the place real denial lives, and that page's
content stays off this one (outline out-of-scope item 1).

The Sanity exemplar's take governs Declare the layout: the required members are named, in a table,
before the code, and the snippet carries a comment on each node naming what it renders. The
Directus exemplar's take governs the steps (a verb heading, one action a step) and the close,
which checks the result in the running admin.

## Introduction

No heading. It opens on a statement about the sidebar, never an imperative and never the page.
Three paragraphs.

1. Para 1, the framing and who arrives. The `/admin` sidebar is resolved on the server from one
   ordered tree, `navLayout`, declared on the adapter's `editor` group; a site that declares none
   gets a flat default the engine builds through the same primitives, so the two cannot disagree
   on what a role sees (`f:ys1iq1`, `f:18d9so`). Two readers arrive: a developer who has built a
   custom screen and needs a link to it, and a developer regrouping the engine's own screens for an
   organization's editors. The one-line contract sits here: the guide groups screens into sections,
   relabels, re-icons, or hides engine screens, links site screens, narrows a section by role, and
   adds the two per-request seams, `navFilter` and `attention`. What the page covers (Google's first
   part): those tasks, the startup validation that catches a malformed tree, and a check in the
   running admin.
2. Para 2, the line and what the page does not cover (Google's third part). Every way the sidebar
   hides a link removes a door without locking it, so `hidden`, `ownerOnly`, `roles`, and
   `navFilter` leave the route open, and real denial is the access map's job (`f:bvfs3e`,
   `f:zyjzeg`, cited again; both are placed below). Then the wrong-place routes, as three
   no-claim sentences:
   - "To deny a route rather than hide its link, see Restrict admin access." (no-claim)
   - "To build the screen a site entry links to, see Add a custom admin screen." (no-claim)
   - "For the public site's own menu, see Build the public routes." (no-claim; the page's one
     statement that the `nav` screen edits that menu sits in Declare the layout)
3. Para 3, prior knowledge (Google's second part). The reader edits a TypeScript adapter module and
   a server module, knows SvelteKit's `/admin` route tree as a custom screen uses it, and has the
   adapter the setup command or the add-cairn tutorial produced. No basic SvelteKit or TypeScript is
   explained.

## Sections, in order

Each section states its heading, the one sentence a reader takes from it (the section's first
sentence on the page, decided here; the drafter may re-word it to the register's voice, never its
claim), the facts it draws on, what the drafter puts in it, and its hand-off.

### Before you begin

First sentence: The steps edit the site's adapter module, which sits at `src/theme/cairn.config.ts`
on a scaffolded site and at `src/lib/cairn.config.ts` on the add-cairn tutorial's site.

Facts: `f:q07rd5`, `f:ys1iq1`, `f:18d9so`, `f:tycp7k` (appended, see Dispositions). Cited again:
`f:ld6xam` (the role-vocabulary precondition).

Content. Lead-in "The steps assume the following." (no-claim), then a bulleted list, each item
linked to what produces it (anatomy item 2):

- The adapter module at the path above (`f:q07rd5`), produced by the setup command
  (`scaffolded-site-files`) or by `add-cairn-to-a-sveltekit-app`.
- For each site entry, a route under `src/routes/admin/`, built as `add-a-custom-admin-screen`
  describes.
- For role narrowing, role names the adapter declares, since a name outside that vocabulary fails
  at server start (`f:ld6xam`); `restrict-admin-access`, Declare the roles, produces them.

Then the starting state, two sentences, since the two adapters differ: a scaffolded site's adapter
already declares a `navLayout` with a Content section and a Site section, so the steps edit that
tree (`f:tycp7k`); the tutorial's adapter declares none, so its sidebar is the flat default, the
concepts first, then the fixed engine screens, with Help in the trailing group (`f:ys1iq1`,
`f:18d9so`).

Hand-off: "The next section declares the tree." (no-claim)

### Declare the layout

First sentence: A `navLayout` is an ordered array of three node kinds, rendered in declaration
order: an engine reference places one of cairn's screens, a site entry links one of the site's own
routes, and a section groups the other two under a label, one level deep.

Facts: `f:nvpcmk`, `f:jsig0m`, `f:78xri7` (the required members; its error list is cited again
under Resolve a sidebar error), `f:rwefuj`, `f:seum1o`, `f:bc27j9`, `f:ld6xam`, `f:rnwver`. Cited
again: `f:ys1iq1` (step 1's location).

Content, in this order.

1. The table first, the Sanity device: required members named before code. Lead-in "The following
   table names each node kind's members." (no-claim). Three rows, columns Node kind, Required,
   Optional:
   - Engine reference: `screen`, a declared concept id or one of `media`, `vocabulary`, `nav`,
     `settings`, `editors`, `help` (`f:jsig0m`); optional `label`, `hidden`, `icon` (`f:rwefuj`).
   - Site entry: `label`, `icon`, `href` (`f:78xri7`); optional `roles`, `ownerOnly`
     (`f:qzbfrd`, `f:zyjzeg`, both placed later and cited here only as member names).
   - Section: `label`, `children` (`f:78xri7`); optional `roles`, `collapsed` (`f:qzbfrd`,
     `f:542r4m`, member names only).
   The table states members, not behavior; each optional member's behavior is stated in the
   section that uses it.
2. The `nav` pointer, one sentence after the table, the outline's one-line item: the `nav` id is
   the public menu editor, which the adapter's `editor.nav` turns on, and a `navLayout` that
   references `nav` without `editor.nav` throws at server start (`f:rnwver`), with a link to
   `build-the-public-routes`. Nothing else about the menu editor (outline out-of-scope item 3).
3. The steps. Lead-in "To declare a layout, follow these steps." (no-claim). Numbered, one action
   each, location first:
   1. In the adapter's `editor` group, declare `navLayout` as an array (`f:ys1iq1`). On a
      scaffolded site the array exists, so the step edits it.
   2. In that array, add an engine reference for each screen the sidebar shows loose, in sidebar
      order (`f:rwefuj`, declaration order).
   3. In the same array, add a section with a `label` and a `children` array.
   4. In the section's `children`, add a site entry with a `label`, an `icon`, and an `href` for
      each custom screen. Under it, two rules: the icon is one of the 27 allowlist names, linked to
      `NavIcon` in `docs/reference/sveltekit.md` for the list (`f:seum1o`); the `href` must not
      collide with a built-in admin view, or startup throws naming that view (`f:bc27j9`).
   5. On an engine reference, set `label` to relabel it or `icon` to change its glyph. Under it: a
      relabel leaves the engine's icon and href alone, and an `icon` override is checked against
      the same allowlist (`f:rwefuj`).
4. The snippet, introduced by "The following layout produces the sidebar the figure shows."
   (no-claim). It shows only the `editor` group inside `defineAdapter` (a `snippet-check-skip`
   comment for the elided groups, as the reference's own adapter snippets carry) and matches the
   figure's resolved tree exactly: `{ screen: 'posts' }`, `{ screen: 'pages' }`, a `Team` section
   holding `{ label: 'Events', icon: 'calendar', href: '/admin/team/events' }` and
   `{ label: 'Members', icon: 'users', href: '/admin/team/members' }`,
   `{ screen: 'media', label: 'Library' }`, `{ screen: 'settings', label: 'Site settings' }`. A
   short comment on each node names what it renders (the Sanity take), such as `// relabeled:
   renders as Library`. The snippet is written for a site whose concepts are posts and pages, and
   the drafter says so in the lead-in's following sentence, since the reader's other screens land
   in the trailing group the next section explains.
5. Validation, one explanation sentence after the snippet: the engine validates the whole tree once
   when the runtime composes, so a bad icon, a colliding `href`, an unknown screen, or an unknown
   role fails at server start with a `navLayout:`-prefixed message, and Resolve a sidebar error
   lists every trigger (`f:ld6xam`).
6. The figure, after the validation sentence: a `repro` fence for `nav/worked-navlayout`, the live
   reproduction of `fixtureNavLayout`, never a screenshot. Alt text and caption name what it shows:
   Posts and Pages loose, a Team section with Events and Members, Library and Site settings, then,
   after a divider, Tags, Editors, and Help, which the layout never references. The figure carries
   no prose claim beyond what the snippet and Hide an engine screen state.

Hand-off: "The next section covers the screens a layout leaves out." (no-claim)

### Hide an engine screen

First sentence: A screen the layout never references still renders, in engine order, in a trailing
group after a divider, so taking a screen out of the sidebar takes a reference with `hidden: true`.

Facts: `f:yf1rrr`, `f:bvfs3e`. Cited again: `f:78xri7` (its "referenced more than once, a `hidden`
reference included" clause).

Content. One sentence tying it to the figure: the example's trailing group is this rule at work.
Then the procedure of one step, a single bulleted item (anatomy item 3): in `navLayout`, add a
reference to the screen with `hidden: true`. Under it, two sentences: the reference counts as the
screen's one placement, so the same screen cannot be referenced again elsewhere in the tree
(`f:78xri7`); and hiding removes the sidebar entry while the route stays live, so it is never
authorization, and denying the route goes through the access map that `restrict-admin-access`
declares (`f:yf1rrr`, `f:bvfs3e`). No access-map mechanics here.

Hand-off: "The next section narrows a section to named roles." (no-claim)

### Narrow a section by role

First sentence: A section's `roles` list renders its children only for an editor whose role it
names, on top of each child's own gate, so it narrows what a role sees and never widens it.

Facts: `f:qzbfrd`, `f:zyjzeg`. Cited again: `f:ld6xam` (an undeclared role name fails at server
start), `f:rwefuj` (an engine reference's members do not include `roles`), `f:bvfs3e` (the
cosmetic line for `roles`).

Content. The procedure of one step, a single bulleted item: in the section, set `roles` to the role
names that see it. Under it, two sentences: each name must be one the adapter declares
(`f:ld6xam`); and a section's `roles` hides its links only, so the routes behind them stay live, and denying them is the access map's job in `restrict-admin-access`
(`f:qzbfrd`, `f:bvfs3e`). That second sentence is the page's cosmetic line for `roles`, placed
right after the step because `roles` uses the access map's own vocabulary and is the gate a reader
most easily mistakes for authorization; the drafter keeps it here even though the introduction
states the line. Then the per-entry forms, as explanation in three sentences: a site entry carries
its own independent `roles` (`f:qzbfrd`); `ownerOnly: true` on a site entry hides it from every
non-owner session and, like a section's `roles`, gates nothing on the server, so its route takes
its own gate from `restrict-admin-access` (`f:zyjzeg`), the page's cosmetic line for `ownerOnly`,
referring back to the `roles` sentence; an engine reference takes only `label`, `hidden`, and
`icon`, so narrowing one engine screen by role means placing it in a section whose `roles` name the
role (`f:rwefuj`, `f:qzbfrd`).

Hand-off: "The next section sets how a section first appears." (no-claim)

### Set a section's starting state

First sentence: A section's `collapsed: true` closes it only for a visitor with no collapse cookie,
because the first toggle writes a cookie whose set wins from then on, in both directions.

Facts: `f:542r4m`, `f:pgwmi4`.

Content. The procedure of one step, a single bulleted item: in the section, set `collapsed: true`.
Under it, the cookie in two sentences: the cookie is `cairn-admin-nav-collapsed`, a comma-separated
list of URL-encoded section labels (`f:pgwmi4`); once it exists its set wins even when empty, so a
section added to the layout later renders open for that visitor whatever its `collapsed` says
(`f:pgwmi4`, `f:542r4m`). The page states no workaround; the friction log records the surprise.

Hand-off: "The next two sections add the sidebar's per-request functions." (no-claim)

### Filter the sidebar per request

First sentence: A `navFilter` function passed to `createCairnAdmin` receives the arranged top-level
items and `{ editor, event }` on every request, after every built-in gate, and returns the items to
render.

Facts: `f:rx9v6d`, `f:u844pc`, `f:s4prb0` (appended, see Dispositions).

Content. One sentence of why before the steps, tied to the task: the filter is for a visibility
check that `roles` and `ownerOnly` cannot express, such as one that reads the site's own data, and
it sees `event` for that reason (`f:rx9v6d`; the use case is framed as an example, not a claim of
the engine). Steps, numbered, location first:

1. In the module that calls `createCairnAdmin` (`src/chassis/cairn.server.ts` on a scaffolded site,
   `f:s4prb0`), write a function that takes the items and `{ editor, event }` and returns the items
   to keep.
2. In the same module, pass that function as `navFilter` in `createCairnAdmin`'s config
   (`f:u844pc`).

The tutorial site's module is named by its role only ("the module that calls `createCairnAdmin`");
no fact names its path (friction filed). After the steps, one illustrative snippet, framed as
illustrative, that drops the example's `Team` section for a session a site-owned check rejects; it
types the items as `ResolvedLayoutNode[]`, and the drafter keeps the check a named stub so the
snippet claims nothing about a site's data. Then three sentences: `createCairnAdmin` forwards the
function unchanged, so it behaves as `ContentRoutesConfig.navFilter`, linked in
`docs/reference/sveltekit.md` (`f:u844pc`); the filter never receives the trailing group, so a
screen to hide there takes `hidden: true` in the layout (`f:rx9v6d`); and it hides links only, so
the route it hides still needs its own server-side gate, which the access map in
`restrict-admin-access` provides (`f:rx9v6d`, `f:bvfs3e`), the page's cosmetic line for
`navFilter`.

Hand-off: "The next section adds count badges to the entries a session sees." (no-claim)

### Add attention badges

First sentence: An `attention` function passed to `createCairnAdmin` returns count badges for nav
entries, and the engine awaits it once per admin shell load, after `navFilter`.

Facts: `f:rshs6k`. Cited again: `f:u844pc`, `f:s4prb0`.

Content. Steps, numbered, location first:

1. In the module that calls `createCairnAdmin`, write an async function that takes
   `{ editor, event }` and returns an array of `AttentionItem` (`f:rshs6k`).
2. In that function, wrap the body in a `try` block whose `catch` returns an empty array. Under
   it: a throw from the function fails the whole admin shell load, so the catch keeps one failed
   count from taking down every screen (`f:rshs6k`).
3. In the same module, pass the function as `attention` in `createCairnAdmin`'s config
   (`f:u844pc`).

Then the item shape and the drops, as explanation: each item carries an `href` (the nav entry the
badge sits on), a `count`, and an optional `label` that defaults to `'pending items'`; the engine
drops an item whose count is not positive, whose `href` matches no entry the session can see, or
whose `href` repeats an earlier item's, the first winning (`f:rshs6k`). One illustrative snippet,
with the `try`/`catch` from step 2, badging `/admin/team/events` from a named stub count. A link to
the attention seam in `docs/reference/sveltekit.md` for the accessible label and the shell's
rendering, which the page does not restate.

Hand-off: "The next section checks the result in the running admin." (no-claim)

### Verify the sidebar

First sentence: The sidebar is arranged when the server starts with no `navLayout:` error and the
admin shows the declared order, with every screen the layout leaves out in the trailing group.

Facts: cited again only: `f:ld6xam`, `f:yf1rrr`, `f:rwefuj`, `f:qzbfrd`, `f:542r4m`,
`f:bvfs3e`, `f:rx9v6d`, `f:rshs6k`.

Content. Numbered checks, each with its observable result (anatomy item 4; the Directus exemplar's
close in the running admin):

1. In the site directory, start the development server; it starts with no `navLayout:`-prefixed
   error (`f:ld6xam`).
2. Signed in as an owner, open `/admin`; sections and entries appear in declaration order, relabeled
   screens under their new labels, and unreferenced screens after the divider (`f:rwefuj`,
   `f:yf1rrr`).
3. In a private window, sign in as an owner again; a section declared `collapsed: true` starts
   closed (`f:542r4m`).
4. Signed in as an editor whose role a section's `roles` omits, open `/admin`; that section does not
   render (`f:qzbfrd`).
5. Signed in as an owner, enter a hidden screen's URL directly; the screen opens, since hiding
   removed only its sidebar entry (`f:yf1rrr`, `f:bvfs3e`). This check is the page's demonstration
   of the cosmetic line, and the drafter keeps it.
6. With `navFilter` configured, sign in as a session the site's check rejects and open `/admin`;
   the filtered section does not render (`f:rx9v6d`).
7. With `attention` configured, open `/admin`; an entry with a positive count carries a badge
   (`f:rshs6k`).

Hand-off: "The next section resolves the errors these checks can surface." (no-claim)

### Resolve a sidebar error

First sentence: A `navLayout:`-prefixed error at server start means the tree failed validation,
and the message names what to fix.

Facts: cited again: `f:ld6xam`, `f:78xri7`, `f:seum1o`, `f:bc27j9`, `f:rnwver`, `f:rshs6k`.

Content. A lead-in sentence, then a bulleted list of the triggers, parallel conditions with no
order: an icon outside the allowlist (`f:seum1o`); a site entry `href` that collides with a
built-in admin view (`f:bc27j9`); an unknown screen id or an undeclared role name (`f:ld6xam`); a
reference to `nav` with no `editor.nav` (`f:rnwver`); a blank section `label`, two sections sharing
a `label`, a section with empty `children`, a section nested in a section, two site entries sharing
an `href`, a screen referenced more than once, a `hidden` reference included, or a blank relabel
(`f:78xri7`). The drafter may split the `f:78xri7` clause into its own items so every item shares
one form. Then the second failure, one sentence: an admin that fails to load every screen after
`attention` is added means the function threw, and step 2 of Add attention badges is the fix
(`f:rshs6k`).

Departure from anatomy item 5, recorded: the extend recovery surface,
`docs/extend/debug-your-site.md`, carries no row for a `navLayout` startup error or an `attention`
throw, so the page lists the triggers itself rather than pointing there (friction filed). No other
recovery prose.

### See also

First sentence: "The following pages cover the tasks around the sidebar." (no-claim)

No facts. Five bullets, each a complete sentence naming what the page does:
`restrict-admin-access` (denies a route and decides which sidebar entries the access map shows),
`add-a-custom-admin-screen` (builds the screen a site entry links to), `build-the-public-routes`
(turns on the public menu editor behind the `nav` screen), the navLayout seam in
`docs/reference/sveltekit.md` (every node type and resolved shape), and the attention seam in
`docs/reference/sveltekit.md` (`AttentionItem` and the badge rendering). `build-the-public-routes`
is an outline page in this batch; the link passes the docs link gate as a pending link. The recovery
link is absent by the departure above, so nothing repeats it.

## Dispositions

Every fact id the task names, the two the page inputs cut, and the two this plan appends. A cut
fact's reason is recorded verbatim for the brief's `cuts`.

| Fact | Disposition | Section, or reason |
|---|---|---|
| `f:ys1iq1` | carried | Before you begin (cited again in the Introduction and in Declare the layout step 1) |
| `f:18d9so` | carried | Before you begin (cited again in the Introduction) |
| `f:q07rd5` | carried | Before you begin |
| `f:tycp7k` | carried (appended) | Before you begin: the scaffold's adapter already declares a `navLayout`, so step 1 edits it |
| `f:nvpcmk` | carried | Declare the layout |
| `f:jsig0m` | carried | Declare the layout |
| `f:78xri7` | carried | Declare the layout (required members); its error clauses cited again in Hide an engine screen and Resolve a sidebar error |
| `f:rwefuj` | carried | Declare the layout (cited again in Narrow a section by role and Verify the sidebar) |
| `f:seum1o` | carried | Declare the layout (cited again in Resolve a sidebar error) |
| `f:bc27j9` | carried | Declare the layout (cited again in Resolve a sidebar error) |
| `f:ld6xam` | carried | Declare the layout (cited again in Before you begin, Narrow a section by role, Verify the sidebar, and Resolve a sidebar error) |
| `f:rnwver` | carried | Declare the layout, the one-line pointer only (cited again in Resolve a sidebar error) |
| `f:yf1rrr` | carried | Hide an engine screen |
| `f:bvfs3e` | carried | Hide an engine screen (cited again in the Introduction, Narrow a section by role, Filter the sidebar per request, and Verify the sidebar) |
| `f:qzbfrd` | carried | Narrow a section by role (with the section's cosmetic line, naming `restrict-admin-access`) |
| `f:zyjzeg` | carried | Narrow a section by role (cited again in the Introduction) |
| `f:542r4m` | carried | Set a section's starting state |
| `f:pgwmi4` | carried | Set a section's starting state |
| `f:rx9v6d` | carried | Filter the sidebar per request (cited again in Verify the sidebar) |
| `f:u844pc` | carried | Filter the sidebar per request (cited again in Add attention badges) |
| `f:s4prb0` | carried (appended) | Filter the sidebar per request: names `src/chassis/cairn.server.ts` as the scaffold's server composition module, the location of steps 1 and 2 |
| `f:rshs6k` | carried | Add attention badges (cited again in Verify the sidebar and Resolve a sidebar error) |
| `f:s4kynf` | cut | Duplicate: `f:seum1o` states the same allowlist rule with the declaring source (`admin-nav.ts#ADMIN_NAV_ICON_NAMES`) and the count; the page cites `f:seum1o` |
| `f:hsk70g` | cut | Out of scope: the access map's enforced fixed ids are real-denial detail that `restrict-admin-access` owns (outline out-of-scope item 1); its quoted source line is stale, which the fact read handles |

Option-map rows: each member row in the task's inventory rides its fact's section above
(`NavLayoutEngineRef.*` in Declare the layout, `NavLayoutEntry.icon` and `.label` and
`NavLayoutSection.children` and `.label` in Declare the layout, `NavLayoutEntry.ownerOnly` and
`.roles` and `NavLayoutSection.roles` in Narrow a section by role, `NavLayoutSection.collapsed` in
Set a section's starting state, `ContentRoutesConfig.navFilter` and `CairnAdminConfig.navFilter` in
Filter the sidebar per request, `CairnAdminConfig.attention` in Add attention badges).

Figure: `nav/worked-navlayout` (`fixtureNavLayout`) in Declare the layout, a figure source and not
a prose fact; the snippet matches its resolved tree.

## Could not do, and friction filed

- The extend recovery surface, `docs/extend/debug-your-site.md`, has no row for a `navLayout`
  startup error or a throwing `attention` function, so Resolve a sidebar error lists the triggers
  on the page instead of pointing there (anatomy item 5). Filed under Docs content.
- No fact names the add-cairn tutorial site's server module, `src/lib/cairn.server.ts` (the
  tutorial page shows it at `docs/extend/add-cairn-to-a-sveltekit-app.md:359`), so the per-request
  steps name it by role only. Filed as a facts-container hole under Docs content.
- Engine friction filed by this plan: the `collapsed` default yields to any existing cookie, a
  section added later included (`f:542r4m`, `f:pgwmi4`); a throwing `attention` fails the whole
  shell, so every site carries the same `try`/`catch` (`f:rshs6k`); `navFilter` never sees the
  trailing group (`f:rx9v6d`). The page inputs already filed the four cosmetic gates and the `nav`
  naming collision; this plan does not repeat them.
