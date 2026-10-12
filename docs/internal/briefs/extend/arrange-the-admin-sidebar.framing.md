# Framing record: Arrange the admin sidebar

Agent-facing; drives the introduction of `docs/extend/arrange-the-admin-sidebar.md` only; the body
follows the page plan (`docs/internal/briefs/extend/arrange-the-admin-sidebar.plan.md`).

## Who arrives, from where, and why

1. **The custom-screen builder.**
   - From: `docs/extend/add-a-custom-admin-screen.md` (its introduction, the end of its route
     section, and its See also all say "To list the screen in the sidebar, see Arrange the admin
     sidebar"), and the `navLayout` row of the Seams table in `docs/extend/architecture.md`.
   - Came for: a sidebar link to the route they just built.
   - Knows: SvelteKit routes under `src/routes/admin/`. Knows that the screen renders in the shell
     with no registration (`f:brfitv`). Knows the access map and `createSectionAction`, possibly
     with `ownerOnly: true` (`f:smbsa6`).
   - Lacks: that the flat default lists only concepts and engine screens, so the screen has no
     link until a layout names it (`f:ys1iq1`, `f:6a32oy`). That a layout written for one link
     drops no other screen (`f:yf1rrr`). The site entry's required members, the icon allowlist,
     and the `href` collision rule. That `ownerOnly` on a site entry only hides, unlike the action
     option of the same name (`f:zyjzeg`, `f:smbsa6`).
2. **The organizer.**
   - From: the extend index's "Extend the admin" group; the `src/theme/` section of
     `docs/extend/scaffolded-site-files.md` ("covers `navLayout`"); the editor-group cross-link
     from `define-an-adapter-and-schema` (outlined, not yet drafted); a search for "admin sidebar"
     or "admin nav".
   - Came for: regrouping the engine's screens into sections an organization's editors recognize,
     relabeling one (media as Library), and taking unused screens out of the sidebar.
   - Knows: the adapter module. On a scaffolded site it already declares a layout with Content and
     Site groups (`f:tycp7k`); on the tutorial's site it declares none.
   - Lacks: the node vocabulary (`f:nvpcmk`, `f:rwefuj`). That leaving a screen out of the layout
     does not remove it, since it lands in the trailing group (`f:yf1rrr`). That `hidden` is not
     denial (`f:bvfs3e`). Startup validation (`f:ld6xam`, `f:78xri7`). The collapse cookie.
3. **The role shaper.**
   - From: `docs/extend/restrict-admin-access.md` (its introduction lists "Hiding a sidebar entry
     without denying its route" here, and its See also); `docs/extend/add-a-second-sign-in-group.md`
     (Path A's staff entry, "covers the rest of the sidebar", and its See also).
   - Came for: a sidebar that follows the site's roles, such as a section one role never sees, an
     owner-only link, or a staff entry.
   - Knows: the role vocabulary, capability, the access map, and that the map already hides an
     entry whose `href` it keys (`f:altcjp`).
   - Lacks: that `roles` and `ownerOnly` on a layout node only hide (`f:qzbfrd`, `f:zyjzeg`). That
     an engine reference takes no `roles` (`f:rwefuj`). That the access map is the one control
     that both hides and locks (`f:altcjp`).
4. **The per-request reader.**
   - From: a search for `navFilter`, `attention`, or "admin badge"; or the later sections, reached
     from readers 1 to 3. No reference page links here yet.
   - Came for: a visibility check the declared tree cannot express, such as one that reads the
     site's own data, or a count badge on an entry.
   - Knows: SvelteKit's `event` and the site's `createCairnAdmin` call.
   - Lacks: when `navFilter` runs and what it never sees (`f:rx9v6d`). That `createCairnAdmin`
     forwards both functions (`f:u844pc`). `attention`'s drops, and that a throw fails the whole
     shell load (`f:rshs6k`).

Wrong-place readers:

- Wants to deny a route, not hide its link: `restrict-admin-access`.
- Wants the public site's menu, misled by the word `nav` or the `/admin/nav` screen:
  `build-the-public-routes`.
- Wants to build the screen a link points to: `add-a-custom-admin-screen`.
- A non-developer who wants to rearrange the sidebar from `/admin`. No page serves them, since the
  admin and editors arms hold no pages yet. The arrangement is adapter code, so the
  prior-knowledge sentence is their signal. The introduction gives them no route sentence.

## Background the page rests on

- **The model.** The sidebar is one ordered tree. The server resolves it on every request: from a
  `navLayout` declared on the adapter's `editor` group, or from a flat default when the adapter
  declares none (`f:ys1iq1`). The declared tree validates once when the runtime composes, so a
  malformed tree fails at server start (`f:ld6xam`, `f:78xri7`). Two functions passed to
  `createCairnAdmin` then act per request: `navFilter` after every built-in gate, and `attention`
  after `navFilter` (`f:rx9v6d`, `f:rshs6k`, `f:u844pc`).
- **Why the default is what it is.** A zero-config site gets the concepts first, then the fixed
  engine screens, with Help in the trailing group. The default is built through the same
  primitives a declared layout uses, so the two cannot disagree on what a role sees (`f:18d9so`).
  A declared layout changes the arrangement, not the engine's own visibility rules.
- **Why `navLayout` exists.** A custom screen renders inside the shell with no registration
  (`f:brfitv`), but the default lists only concepts and engine screens (`f:ys1iq1`). A custom
  screen therefore reaches the sidebar through a site entry in the layout (`f:6a32oy`). The
  second reason is the organization's editors: they see the engine's labels and order until a
  layout groups and relabels them (`f:nvpcmk`, `f:rwefuj`).
- **A layout never loses a screen.** Any screen the tree leaves out renders in a trailing group
  after a divider, in engine order (`f:yf1rrr`). Leaving a screen out is therefore not hiding it.
  Hiding takes `hidden: true` (`f:yf1rrr`), and hiding never authorizes (`f:bvfs3e`).
- **Hide versus lock.** This page's four controls hide a link and leave its route open:
  - `hidden` (`f:bvfs3e`)
  - `ownerOnly` on a site entry (`f:zyjzeg`)
  - `roles` (`f:qzbfrd`)
  - `navFilter` (`f:rx9v6d`)

  The adapter's access map is the one control that hides an entry and also refuses its route. It
  hides a keyed entry from the roles it does not admit (`f:altcjp`), and `restrict-admin-access`
  owns it. The same word `ownerOnly` refuses on a section action (`f:smbsa6`) and only hides on a
  site entry (`f:zyjzeg`); friction is filed.
- **SvelteKit.** A custom screen is a SvelteKit route under `src/routes/admin/` that a site entry
  links by `href` (`f:6a32oy`). The admin shell's server load resolves the sidebar on each request
  (`f:b8rkq9`, `f:rshs6k`), which is why both per-request functions receive SvelteKit's `event`
  (`f:rx9v6d`, `f:rshs6k`). No basic SvelteKit is explained.
- **Cloudflare is left out on purpose.** No sidebar control configures or reads a binding. A
  `navFilter` or `attention` body that reads site data does so through `event` in the site's own
  code, and the plan keeps those checks as named stubs. The introduction does not mention
  Cloudflare.
- **GitHub is left out on purpose.** The layout is adapter code that validates at server start
  (`f:ld6xam`), not content an editor saves. The one GitHub-adjacent screen, `nav`, edits the
  public menu, and that menu belongs to `build-the-public-routes` (`f:rnwver`). The introduction
  does not mention GitHub.
- **Adapter path caveat.** The adapter is `src/theme/cairn.config.ts` on a scaffolded site and
  `src/lib/cairn.config.ts` on the add-cairn tutorial's site (`f:q07rd5`). The introduction names
  neither path. If a later edit names one, it names both. Before you begin carries the pair.

## Place in the doc set

- **Group.** Extend the admin, after `add-a-custom-admin-screen` and before `turn-on-tidy`. The
  extend index lists only `add-a-custom-admin-screen` in that group today, and the drafter's
  index-link step adds this page.
- **Links in.**
  - `add-a-custom-admin-screen`, three times: to list the screen.
  - `restrict-admin-access`, in its bounds list and See also: hiding without denying.
  - `add-a-second-sign-in-group`, twice: the rest of the sidebar after a staff entry.
  - `architecture`'s Seams table: the `navLayout` seam.
  - `scaffolded-site-files`: the adapter's `navLayout`.
  - `define-an-adapter-and-schema` (pending): the editor group.
- **Links out the outline names.**
  - `restrict-admin-access` ("Hidden is not denied").
  - The out-of-scope pages `add-a-custom-admin-screen` and `build-the-public-routes`. The latter
    is not on disk yet, so it passes the link gate as pending.
- **What siblings own; word the shared ideas fresh.**
  - `restrict-admin-access` owns the access map and its "Sidebar entries" section, which covers
    `canReach` on keyed entries and an unmatched `href` that stays visible while its route
    refuses. This page names the access map only as the control that hides and locks. It never
    re-explains `canReach` or key matching.
  - `add-a-custom-admin-screen` opens on cairn's job boundary and the custom screen as the seam.
    `restrict-admin-access` opens on roles and capability. This introduction opens on neither: it
    opens on the sidebar itself.
  - `add-a-custom-admin-screen` already states "renders in the shell with no registration". Here
    it is worded as the reason a link has to be declared.
  - `architecture` owns the seam list and the 0.86.0 `navLayout` break as its stability example
    (`f:bjpv4j`). This page recounts no history.
  - `build-the-public-routes` owns `editor.nav` and the public menu, and `security-model` owns why
    the map is not a whitelist.
- **Figure.** The figure is a live reproduction: a `repro` fence for story `nav/worked-navlayout`
  (`fixtureNavLayout`), never a screenshot. It sits in Declare the layout, not the introduction,
  and the introduction does not mention it.

## Intro plan

Three paragraphs, then the plan's wrong-place sentences as the bounds. The introduction is the
untitled text under the H1.

1. **The model and why it exists.**
   - Facts: `f:ys1iq1`, `f:18d9so`, `f:brfitv`, `f:6a32oy`, `f:yf1rrr`.
   - Open on a statement about the sidebar from the reader's situation, never an imperative and
     never the page. The `/admin` sidebar is one ordered tree the server resolves on every
     request. When the adapter declares no layout, it is a flat list: the site's concepts, then
     the engine's screens, built through the same primitives a declared layout uses.
   - Then why a layout exists. A custom screen renders inside the admin shell with no
     registration, but that default lists only concepts and engine screens. A screen of the site's
     own therefore appears in the sidebar through a site entry in a `navLayout` on the adapter's
     `editor` group.
   - Then the reassurance reader 1 needs. A layout loses nothing it leaves out: an unreferenced
     screen still renders, in a trailing group after a divider.
2. **The readers' reasons and the contract.**
   - Facts: `f:tycp7k`, `f:nvpcmk`, `f:rwefuj`, `f:qzbfrd`, `f:ld6xam`, `f:78xri7`, `f:rx9v6d`,
     `f:rshs6k`.
   - Name the readers in one or two sentences, each by reason. One wants a link to a screen they
     built. One wants to regroup and relabel the engine's screens for an organization's editors,
     whether the site's adapter already declares a layout, as a scaffolded site's does, or none.
     One wants the sidebar to follow the site's roles. One needs a per-request check or a count
     badge.
   - Then the anatomy's one-line contract, naming what the reader accomplishes. The steps that
     follow declare a layout that groups screens into sections, relabels, re-icons, or hides
     engine screens, links the site's own screens, narrows a section by role, and sets which
     sections start collapsed. They then add the two per-request functions, `navFilter` and
     `attention`.
   - Then the plan's "covers" part. It also covers the startup validation that refuses a malformed
     tree and a check in the running admin. The cookie detail stays out.
3. **The line, then the plan's prior-knowledge part.**
   - Facts: `f:bvfs3e`, `f:zyjzeg`, `f:qzbfrd`, `f:rx9v6d`, `f:altcjp`, `f:smbsa6`.
   - Every control this page covers hides a link and leaves its route open: `hidden`,
     `ownerOnly`, `roles`, and `navFilter`.
   - The access map that `restrict-admin-access` declares is the one control that both hides an
     entry and refuses its route. That page owns it.
   - One clause for readers 1 and 3: `ownerOnly` on a site entry only hides, unlike the
     `ownerOnly` a section action takes, which refuses.
   - Then prior knowledge. The reader edits the site's TypeScript adapter module and the server
     module that calls `createCairnAdmin`, and knows SvelteKit's routes under `/admin` as a custom
     screen uses them. No basic SvelteKit or TypeScript is explained, and neither file is named by
     path here.

Bounds, after the paragraphs: the plan's three wrong-place sentences, unchanged and no-claim:

- "To deny a route rather than hide its link, see Restrict admin access."
- "To build the screen a site entry links to, see Add a custom admin screen."
- "For the public site's own menu, see Build the public routes."

## Departures from the plan's introduction

- **The cosmetic line is scoped, and the access map is named.** The plan's paragraph 2 reads
  "Every way the sidebar hides a link removes a door without locking it". That is false as stated:
  the access map also hides a keyed entry, and it locks the route (`f:altcjp`). The intro plan
  scopes the line to this page's four controls and names the access map as the one that does
  both, which carries the job's "hidden door versus locked door" more exactly. It is one clause
  pointing at `restrict-admin-access`, with no access-map mechanics, so out-of-scope item 1 holds.
- **Four readers, not two.** The plan names the custom-screen builder and the organizer. The map
  adds the role shaper, whom `restrict-admin-access` and `add-a-second-sign-in-group` both send
  here explicitly, and the per-request reader of the `navFilter` and `attention` sections.
- **Why the layout exists, and the trailing group, move up.** The plan's paragraph 1 states the
  default. The intro plan adds why a custom screen needs a site entry (`f:brfitv`, `f:6a32oy`) and
  that a layout loses no screen (`f:yf1rrr`), because reader 1's first worry is what declaring a
  layout does to the rest of the sidebar.
- **The `ownerOnly` name clash.** A clause the plan lacks (`f:smbsa6`, `f:zyjzeg`), because readers
  1 and 3 arrive knowing the enforcing `ownerOnly` of a section action.
- **Arrangement.** The line moves from paragraph 2 to paragraph 3, beside prior knowledge. The
  plan's three wrong-place sentences follow the paragraphs as the bounds, word for word. Its three
  parts (covers, prior knowledge, leaves out) all stand.
- **Prior knowledge names the server module by role.** It names "the server module that calls
  `createCairnAdmin`", since the per-request sections edit it. No fact names the tutorial site's
  path for that module (friction already filed).
