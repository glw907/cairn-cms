# Page plan: Restrict admin access

Page: `docs/extend/restrict-admin-access.md`. Brief: `docs/internal/briefs/extend/restrict-admin-access.json`.
Page type: task guide. Status: new page, no prior version on disk. Written 2026-10-07 by the plan
step of the docs page chain (stage 2a). The drafter drafts from this plan: it is the source of the
page's order, each section's claim, and each fact's placement. The plan is Google's outline written
down (Google Technical Writing Two, "Organizing large documents",
https://developers.google.com/tech-writing/two/large-docs). Revised 2026-10-07 on the structural
edit's findings: a deploy step between the last edit and the roster, a lighter introduction, and a
signup that the owner-only check can remove.

Inputs read: the outline entry in `docs/internal/outlines/extend.json` (slug `restrict-admin-access`,
its job, covers, out-of-scope list, glossary terms, and inbound links); "The page anatomies" and the
developer drafting brief in `docs/internal/docs-register.md`; every fact bullet named below in
`docs/internal/facts/`; the reference entries each subordination or link names
(`docs/reference/core.md` "Roles" and "Access map", `docs/reference/sveltekit.md` `createAuthGuard`,
`requireAccess`, and `createSectionAction`, `docs/reference/log-events.md`,
`docs/reference/cli-cairn-doctor.md`); the sibling pages `docs/extend/add-a-custom-admin-screen.md`
and `docs/extend/security-model.md`; the two exemplars; and the code the running example touches
(`templates/waymark/src/access.ts`, `templates/waymark/src/hooks.server.ts`,
`templates/waymark/src/theme/cairn.config.ts`, `templates/waymark/src/routes/admin/signups/+page.server.ts`,
`src/lib/auth/access.ts`, `src/lib/sveltekit/guard.ts`, `src/lib/sveltekit/admin-nav.ts`,
`packages/cairn-cms-dev/src/handle.ts`). The revision also read the deploy sections of
`docs/extend/add-cairn-to-a-sveltekit-app.md` ("Describe the Worker and deploy it", "Deploy a
change", "Move the site to production"), the Workers Builds trigger's commands in
`packages/create-cairn-site/src/cloudflare/chapter3.mjs`, and the scaffold's signups screen's
`create` and `remove` actions.

Headings in this plan's section list are the page's headings, verbatim. A claim inventory `section`
names one of them. The introduction is the untitled text under the H1 and is named `Introduction`.

## What the page argues

An access map is a narrowing layer over the capability floor, and it has two readers that never
share it on their own: the adapter's `access` member, which the engine's screens, their write
actions, and the sidebar read, and the guard's `access` option, which the guard attaches to every
request for the site's own routes. The page's spine is therefore declare once, hand to both,
enforce on your own reads and writes, deploy, then prove each role's reach on the deployed site. A map that
reaches only one reader fails silently in one direction or the other: on the guard alone it leaves
every engine screen open, and a route that opts in with no key refuses even an owner.

One running example carries the whole page, the Django exemplar's take: a `'webmaster'` role, with
editor capability, that alone (with owners) reaches the media library and the scaffold's signups
screen at `/admin/signups`, while the scaffold's plain `editor` role keeps posts, pages, and the
rest. The example is declared in "Declare the roles" and "Declare the access map", wired in "Pass
the map to the adapter and the guard", enforced in "Enforce the map on your routes", deployed in
"Deploy the changes", assigned in "Assign the roles", and proved in "Verify each role's reach". The SvelteKit hooks exemplar's take
shapes each piece: where it goes, when it runs, a typed example, and the default when unset, with
the security trap stated in the same paragraph as the value that invites the misuse (the `media`
key beside the image picker, the scaffold's guard-only `createAuthGuard({ access })` beside the
adapter half, the gated `load` beside the action it never gates).

### The order, argued

Each section holds what the next one depends on.

1. **The capability floor moves into the introduction.** The outline's first cover is the model the
   reader needs before any step (capability is the floor, the map only narrows), and the outline's
   glossary defines all three terms (capability, role, access map) on this page, so the
   introduction states the model and defines them once.
2. **Before you begin** names the site, the screen, and the deployed site the checks need, with a
   way to redeploy it; the deployed-site precondition carries why local development cannot show a
   role refusal, so a reader does not try the per-role checks against the dev backend.
3. **Declare the roles before the map.** `defineAccess` validates every role name against the
   vocabulary it is given and throws on a name outside it (`f:grxpu5`, `f:3z48zf`), so the
   vocabulary must exist first.
4. **Declare the access map** next, with the one code block that shows the whole of
   `src/access.ts` (both declarations), so the reader writes the running example in one file.
5. **Pass the map to the adapter and the guard** follows, because the map gates nothing until both
   readers carry it (`f:cvzb8z`), and this is the page's sharpest trap: the scaffold wires only the
   guard.
6. **Enforce the map on your routes** follows the wiring, because `requireAccess` and
   `createSectionAction` read the map the guard attaches (`f:iwf4nu`), which exists only after
   step 5.
7. **Decide what the map leaves open** comes after both enforcement points are known, because its
   claim is a comparison between them: an unnamed engine screen stays open, an unnamed route that
   calls `requireAccess` refuses everyone (`f:zo034s`). "Make the map exhaustive" sits under it as
   an H3, since it is the remedy for the engine-screen half and its warning is what Verify reads.
8. **Key nested and parameterized routes** follows, because "unnamed" in section 7 depends on how a
   key matches a route: by deepest path-segment prefix, against the route id (`f:uhoyun`,
   `f:8anql1`).
9. **Sidebar entries** follows the matching rule, because a site entry is gated only when its href
   matches a key (`f:altcjp`) and the section's trap, an unmatched entry that stays visible while
   its route refuses, needs both the matching rule and `requireAccess`'s refusal.
10. **Deploy the changes** follows the last edit. Every step from "Declare the roles" through "Key
    nested and parameterized routes" edits files in the site's repository, and the per-role checks
    cannot run locally (`f:dqjkci`). The roster's role select also lists only the roles the
    running site declares (`f:hcjb3o`). So the edits reach the deployed site before any role is
    assigned.
11. **Assign the roles** comes last among the steps, on the redeployed site: a declared role
    reaches no one until an editor holds it, and Verify needs a test editor in each role. The
    next-request rule (`f:uotol3`) is what lets one test account cycle through the roles.
12. **Verify each role's reach**, **Resolve a refusal**, and **See also** close the page, per the
    task-guide anatomy (verification, failure paths at the recovery surface, see also).

### Departures from the outline's covers order, with the reason for each

- Cover 1 (capability floor) moves into the introduction, as item 1 above argues.
- "Media restriction reaching the image picker" moves from the asymmetry cover to "Declare the
  access map", beside the `media` key: the trap belongs in the paragraph with the value that
  invites it (the hooks exemplar's take).
- "Make the map exhaustive" moves up from second-to-last to an H3 under "Decide what the map leaves
  open": it is that section's remedy, and Verify's first check reads the warning it silences.
- "Href keys" moves ahead of "Nav entries": the sidebar's rule and its trap both presuppose the
  matching rule.
- "Deploy the changes" is a step section the covers lack: the covers end at local edits, and the
  roster and every check run on the deployed site.
- "A role change applies on the editor's next request" becomes "Assign the roles", a step section
  the covers lack: the task is not done until an editor holds the role, and the next-request rule
  is the device the per-role checks use.

### Heading policy

Task section headings start with a bare infinitive; the one explanation section, "Sidebar
entries", is a noun phrase; "Before you begin" and "See also" are the anatomy's fixed headings.
No page links an anchor on this page today (`docs/extend/add-a-custom-admin-screen.md` and
`docs/extend/security-model.md` link the page itself), so every heading is free; keep
`Make the map exhaustive` stable, since `docs/extend/security-model.md` says this page gives the
steps for an exhaustive map and a later edit may anchor there.

## The introduction, in Google's three parts

No heading. It opens on a statement, never an imperative (register, "The introduction"), and frames
the page from above before the contract. Content items, in order; the intro-framing step reasons the
final wording.

1. **The model (what the document covers, framed from above).** Three ideas only, at the pace of
   an overview. Every signed-in person carries a role, a name in the site's declared vocabulary
   (`owner` and `editor` by default, `f:4xrx5f`). Each role resolves to one capability, `owner`,
   `editor`, or `none` (`f:zjglk8`), and capability is the floor cairn enforces. The access map is
   the site's declaration, keyed by engine screen or `/admin` route, that narrows which
   editor-capability roles reach each target; it never widens, so `none` stays out and an owner
   reaches every target (`f:p1xmp5`, `f:0qb73i`). This item defines the three glossary terms,
   capability, role, and access map, in the outline's sense. `none` gets its name and nothing
   more here: what it means lands in "Declare the roles", and item 4 routes its reader. What the
   owner adds (the roster) waits for "Assign the roles", and what the guard gates waits for "Pass
   the map to the adapter and the guard".
2. **Who and why, with the contract.** The reader builds an organization's site where not every
   editor should reach every screen, such as volunteers who write posts while one webmaster
   manages media and the signups list. The contract sentence, inside the framing: declare a role
   vocabulary and an access map, give the same map to the adapter and the guard, enforce it on
   your own screens' reads and writes, and verify each role's reach. The contract glosses the
   guard in a few words as the `createAuthGuard` hook in `src/hooks.server.ts` (`f:hwffph`), so
   "the guard" is a known term before section 5. Then the running example in one sentence: a
   `'webmaster'` role that alone, with owners, reaches the media library and the scaffold's
   signups screen.
3. **Prior knowledge.** SvelteKit server hooks, `load` functions, form actions, and route ids
   (groups and parameters included); the site's adapter in `src/theme/cairn.config.ts`
   (`f:4esdoz`); and a Workers Logs query, for the checks.
4. **What the page does not cover, with the page that does (wrong-place routing).** Why the map
   only narrows and never acts as an allowlist on its own: `docs/extend/security-model.md`.
   Building a screen and its section actions in full: `docs/extend/add-a-custom-admin-screen.md`.
   Hiding a sidebar entry without denying its route: `docs/extend/arrange-the-admin-sidebar.md`.
   A role that signs in but reaches no engine content, such as a member or instructor area:
   `docs/extend/add-a-second-sign-in-group.md`. This sentence may name the page, since scope has
   no subject-first form.

## Sections, in order

Each entry carries the page heading; **First sentence**, the one sentence a reader takes from the
section, which is the section's first sentence on the page (its claim is fixed here, its wording
may move to the register's voice, and a task-section sentence stays under 26 words); **Facts**,
the ids it draws on ("cited again" marks a fact whose primary home is another section); the
content and steps; and **Hand-off**.

### Before you begin

**First sentence:** The steps need a scaffolded site with a custom admin screen, and the checks
need a deployed site you can redeploy.

**Facts:** `f:qlgggh`, `f:onqm6k`, `f:dqjkci`, `f:kldwss`, `f:qca0t0`. Cited again: `f:9ug9mo`.

Four bulleted preconditions, each with a link to what produces it (anatomy item 2):

- A site that `create-cairn-site` scaffolded, whose `src/access.ts` holds the map that
  `src/hooks.server.ts` hands the guard (`f:qlgggh`); a hand-built site reaches the same shape
  through `docs/extend/add-cairn-to-a-sveltekit-app.md`.
- A custom admin screen whose `load` calls `requireAccess` and whose form actions are
  `createSectionAction` wrappers. The scaffold's signups screen, `src/routes/admin/signups/`, is
  one (`f:onqm6k`); `docs/extend/add-a-custom-admin-screen.md` builds another.
- A deployed site, and an email address for a test editor besides the owner's. A scaffolded site
  is deployed by the setup command (`f:kldwss`); link
  `docs/extend/add-cairn-to-a-sveltekit-app.md#move-the-site-to-production` for a hand-built site.
  Local development cannot show a role refusal, because the dev backend signs every `/admin`
  session in as an owner (`f:dqjkci`).
- A way to redeploy that site, one of two. Either the repository is connected to Workers Builds,
  which deploys every push to the default branch; `npx create-cairn-site --dir <site-directory>
  --connect` makes the connection (`f:qca0t0`). Or Wrangler is signed in to the site's Cloudflare
  account through `npx wrangler login` (`f:9ug9mo`); link
  `docs/extend/add-cairn-to-a-sveltekit-app.md#describe-the-worker-and-deploy-it`, which shows the
  sign-in.

**Hand-off:** the map admits roles by name, so the vocabulary comes first.

### Declare the roles

**First sentence:** The access map admits roles by name, so the site first declares its role
vocabulary, mapping each role name to the capability it stands on.

**Facts:** `f:zjglk8`, `f:dbaklx`, `f:4673n6`. Cited again: `f:p1xmp5`, `f:4xrx5f`.

Content, in the hooks exemplar's per-piece order:

- What a declaration is: a bare capability (`'owner'`, `'editor'`, or `'none'`) or an object with a
  `capability` member (`f:zjglk8`). A `none` role signs in through the same flow while the engine's
  content and roster screens refuse it (`f:4673n6`). The object form's `home` and the `none`
  capability serve a second audience, which `docs/extend/add-a-second-sign-in-group.md` covers
  (one sentence, the outline's link).
- The one reserved name: the vocabulary must declare `owner` with owner capability, or `defineRoles`
  throws (`f:dbaklx`); its full validation list is the `defineRoles` entry,
  `docs/reference/core.md#defineroles`.
- The trap, in the same paragraph as the vocabulary it concerns: a role name absent from the
  vocabulary resolves to `none` (`f:zjglk8`), so the running example declares `editor` beside
  `'webmaster'`, and an editor whose role is renamed or dropped still signs in but reaches no engine
  content.
- The default when unset: the implicit `owner` and `editor` pair (`f:4xrx5f`).

One step, a single bulleted item (anatomy item 3): in `src/access.ts`, declare the vocabulary with
`defineRoles`, export it as `roles`, and give it `owner`, `editor`, and `'webmaster'` with editor
capability. The code block sits in the next section and the step names it there by heading, never by
position ("the example under Declare the access map").

**Hand-off:** the map names these roles.

### Declare the access map

**First sentence:** The access map keys each target, an engine screen id or an `/admin` route path,
to the role names it admits.

**Facts:** `f:0qb73i`, `f:grxpu5`, `f:3z48zf`, `f:iewhzh`, `f:cvv6to` (scoped to the clause below).
Cited again: `f:qlgggh`, `f:vqh4a9` (the roster clause), `f:mou1li` (the gloss of composition).

Content:

- Keys and values (`f:0qb73i`): a screen key is a declared concept id or one of the four fixed
  screens, `media`, `vocabulary`, `nav`, and `settings`; a route key is an `/admin`-prefixed path;
  each value lists the admitted role names, and an owner reaches every mapped target whatever the
  list says. The roster is not a key: composition throws on a screen id outside the concepts and
  the four fixed screens (`f:3z48zf`), and the roster stays owner-only whatever the map says
  (`f:vqh4a9`). At this first use, gloss composition as the engine building its runtime from the
  adapter once at server start (`f:mou1li`).
- One step, a single bulleted item: in `src/access.ts`, pass `roles` and the map to `defineAccess`
  and export the result as `access`.
- The code block, `src/access.ts` in full, the page's one view of the running example's
  declarations: `defineAccess` and `defineRoles` imported from `@glw907/cairn-cms`; `roles` with
  `owner: 'owner'`, `editor: 'editor'`, `webmaster: 'editor'`; `access = defineAccess(roles, {
  media: ['webmaster'], '/admin/signups': ['webmaster'] })`.
- The trap beside the `media` key, in the paragraph right after the block: restricting `media` also
  restricts the inline image picker in every image-bearing concept's editor (`f:iewhzh`), so an
  `editor` session can no longer insert an image into a post. A screen key gates the screen's write
  actions as well as its view, upload, delete, and replace on `media` among them (`f:cvv6to`,
  scoped); the two engine actions the map does not reach are named in
  `docs/extend/security-model.md#limits-of-access-map-coverage`, linked, not restated.
- Validation, when it runs (`f:grxpu5`, `f:3z48zf`): `defineAccess` checks the map at construction
  against the vocabulary it is given, and given `undefined` it accepts only `owner` and `editor`,
  so a map naming `'webmaster'` needs `roles`. It throws on an empty map, an empty role list (an
  owner-only rule is `['owner']`), a role outside the vocabulary, and a malformed key; composition
  throws on an unknown screen id or a route key that collides with a built-in view. The key-shape
  rules in full are the `defineAccess` entry, `docs/reference/core.md#defineaccess`, linked.
- The default when a target is left out: one forward pointer by heading to "Decide what the map
  leaves open", since the two readers treat an unnamed target oppositely.

**Hand-off:** the map gates nothing until both of its readers carry it.

### Pass the map to the adapter and the guard

**First sentence:** The adapter's `access` gates the engine's screens and the sidebar, and the
guard's gates your own routes, so the same map goes to both.

**Facts:** `f:cvzb8z`, `f:iwf4nu`, `f:2zytgf`, `f:4xrx5f`, `f:hwffph`, `f:4esdoz`, `f:9xthnq`.

Content, one paragraph per reader, each in the hooks exemplar's order (where, when, the default
when unset), with each trap in the paragraph of the value that invites it:

- The adapter (`f:2zytgf`, `f:cvzb8z`, `f:4esdoz`): `roles` and `access` are optional members of
  the adapter in `src/theme/cairn.config.ts`; the engine's screens, their write actions, and the
  sidebar read its `access`. Unset, those stay open to every editor-capability session. The trap
  sits here: the scaffold passes its map only to `createAuthGuard`, and a map on the guard alone
  gates your own routes while leaving every engine screen open to every editor-capability session
  (`f:cvzb8z`).
- The guard (`f:iwf4nu`, `f:4xrx5f`, `f:hwffph`, `f:9xthnq`): `createAuthGuard` in
  `src/hooks.server.ts` gates every `/admin` path except the sign-in page and its auth endpoints
  (`f:9xthnq`). It runs on every guarded request and attaches the map to `locals.cairnAccess`,
  which is why `requireAccess` takes no map argument (`f:iwf4nu`). Unset, it resolves every
  session against the implicit `owner` and `editor` pair (`f:4xrx5f`). The trap sits here: a
  guard given no `roles` falls back to that pair, so a `'webmaster'` editor signs in and is refused everywhere (`f:hwffph`).

Steps, a numbered list of two, the location first:

1. In `src/theme/cairn.config.ts`, add `roles` and `access`, imported from `src/access.ts`, to the
   `defineAdapter` call.
2. In `src/hooks.server.ts`, pass `{ roles, access }` to `createAuthGuard`, importing `roles` beside
   the `access` import already there.

Two short excerpts may follow the steps, each marked as an excerpt for the snippet check: the
adapter call's `roles, access` members and the guard line. The guard's other options are the
`createAuthGuard` entry's (`docs/reference/sveltekit.md#createauthguard`), linked once.

**Hand-off:** the engine now enforces its own screens; your own routes enforce through two calls.

### Enforce the map on your routes

**First sentence:** Your own routes check the map themselves, with `requireAccess` in each `load`
and a `createSectionAction` wrapper around each form action.

**Facts:** `f:54d3ui`, `f:8anql1`, `f:5pyozi`, `f:smbsa6`, `f:3s23un` (scoped to its target default
and its check before the handler), `f:pyt58u`. Cited again: `f:onqm6k`.

Content:

- The running example needs no edit here: the scaffold's signups screen already calls
  `requireAccess` in its `load` and wraps its actions in `createSectionAction` (`f:onqm6k`), with
  `ownerOnly: true` on the destructive `remove` (`f:pyt58u`). The steps below are for a route of
  your own.
- `requireAccess` (`f:54d3ui`, `f:8anql1`): it checks `event.route.id`, never the request URL,
  since a parameterized route's URL is chosen by whoever sends the request; it returns the
  session, redirects to sign-in when there is none, and refuses with a 403, logging
  `auth.access.refused` with the editor's email, role, and target, when no key matches or the role
  is not admitted.
- The trap, in the paragraph with the `load` call: SvelteKit runs a matched form action without
  running `load` first, so a gated `load` never gates its own actions (`f:5pyozi`). A section
  action runs the CSRF check and the same fail-closed check before its handler, its target
  defaulting to the route id with groups dropped (`f:3s23un`). Its other options and its check
  order belong to `docs/extend/add-a-custom-admin-screen.md` and
  `docs/reference/sveltekit.md#createsectionaction`, linked, not restated (out of scope).
- `ownerOnly` (`f:smbsa6`): it requires owner capability on top of the map's rule, never in place
  of it; in the running example a `'webmaster'` session adds a signup and only an owner removes
  one.

Steps, a numbered list of three:

1. In the route's `+page.server.ts`, call `requireAccess(event)` at the top of `load`, before it
   reads anything.
2. In the same file, wrap each form action in the section's `createSectionAction` wrapper.
3. On an action only an owner may run, set `ownerOnly: true` in the wrapper's options.

**Hand-off:** each enforcement point treats a target the map never names differently.

### Decide what the map leaves open

**First sentence:** An unnamed engine screen stays open to every editor-capability role, while an
unnamed route that calls `requireAccess` refuses every session, owner included.

**Facts:** `f:zo034s`, `f:8ciz2s`. Cited again: `f:8anql1` (its last clause), `f:0qb73i`.

Content:

- The route half (`f:zo034s`, `f:8anql1`): a route that opted into the map and finds no key is a
  misconfiguration made loud, so the refusal reaches owners too; a route meant for every
  editor-capability role calls `requireEditor` instead, which does not consult the map.
- The engine-screen half (`f:zo034s`, `f:8ciz2s`): an unnamed screen keeps the zero-config default,
  and at composition `config.access_unmapped` warns, naming each concept and fixed screen the map
  leaves without a rule. Word the trigger that way, never as "some but not all": the code warns on
  any unmapped concept or fixed screen (the friction entry filed with this plan). In the running
  example it names every concept and fixed screen except `media` (`f:0qb73i` for the fixed
  screens), the expected result of a map that only narrows.
- Why the map narrows and never acts as an allowlist by itself: one sentence linking
  `docs/extend/security-model.md#allowlist-semantics-from-an-exhaustive-map` (out of scope).

**Hand-off:** into the H3, for a reader who wants named roles only on every engine screen.

#### Make the map exhaustive

**First sentence:** To admit only named roles to every engine screen, map every concept and fixed
screen until `config.access_unmapped` no longer fires.

**Facts:** `f:8ciz2s`. Cited again: `f:cvv6to` (the exceptions clause).

One step, a single bulleted item: in `src/access.ts`, add a key for each target the warning names,
listing the roles that reach it. Then one sentence: even an exhaustive map leaves the site-wide
publish and the tidy and dictionary actions outside it, as
`docs/extend/security-model.md#limits-of-access-map-coverage` describes (`f:cvv6to`, linked, the
limits not restated). Verify's first check reads the warning.

**Hand-off:** route keys reach beyond the route they name.

### Key nested and parameterized routes

**First sentence:** A route key governs its own path and every path beneath it, matched by the
deepest whole-segment prefix the map holds.

**Facts:** `f:uhoyun`, `f:8anql1`. Cited again: `f:3s23un` (`target` on a section action).

Content:

- Matching (`f:uhoyun`): illustrate with the fact's own paths, `/admin/money` covering
  `/admin/money/refunds` unless the deeper key is mapped, and `/admin/moneyx` never matching
  `/admin/money`. This section is a refinement outside the running example's core path, and the
  fact's paths keep every prose path vouched by a bullet (see Drafting constraints).
- Route ids (`f:8anql1`): the default target is the route id with route groups dropped and a
  parameter kept in its bracket form, so a parameterized route is keyed by that bracket form; the
  bracket-form detail is the `createSectionAction` entry's, linked
  (`docs/reference/sveltekit.md#createsectionaction`).
- The trap, in the paragraph with the bracket form (`f:8anql1`): a route with a dynamic or rest
  parameter beneath a key that the map also extends deeper refuses every session, owner included,
  and must declare `target`; a route serving more than one section declares it too (`f:3s23un`).

Steps, conditional on such a route, a numbered list of two:

1. In the route's `+page.server.ts`, pass the governing key as `requireAccess`'s second argument.
2. In the same file, set `target` to the same key in each section action's options.

**Hand-off:** the sidebar applies the same matching to its entries.

### Sidebar entries

**First sentence:** The sidebar reads the adapter's map through the same check the routes use, so
each role sees only the entries it can reach.

**Facts:** `f:altcjp`, `f:vqh4a9`. Cited again: `f:uhoyun` (its second half), `f:cvzb8z` (the
sidebar reads the adapter's map).

Content, explanation tied to the task by the first sentence (anatomy: an explanation section opens
with a sentence tying it to the task):

- One check decides both route enforcement and sidebar visibility, so the two cannot drift apart
  (`f:vqh4a9`); the roster's entry stays owner-only whatever the map says.
- An engine screen's entry follows the check directly; a `navLayout` site entry, such as the
  scaffold's Signups entry, is gated only when its href matches a key, then shown to the roles that
  key admits and to owners (`f:altcjp`).
- The trap: an href no key matches stays visible to every editor-capability role, while
  `requireAccess` and `createSectionAction` refuse it (`f:uhoyun`), so a new screen's entry
  without a key shows a door that refuses everyone.
- Hiding an entry without denying its route belongs to `docs/extend/arrange-the-admin-sidebar.md`,
  one linking sentence (out of scope).

**Hand-off:** the edits are complete in the site's files; the deployed site does not have them yet.

### Deploy the changes

**First sentence:** The roster and the per-role checks run on the deployed site, so the new roles
and the map must reach it first.

**Facts:** `f:9ug9mo`, `f:jtl15v` (scoped to the two commands the Workers Builds trigger runs).
Cited again: `f:qca0t0`, `f:hcjb3o`.

One step, a single bulleted item, its condition first (anatomy item 3): if the repository is
connected to Workers Builds, push the changes to the default branch, which deploys them
(`f:qca0t0`); otherwise, in the site's directory, run `npm run build` and then `npx wrangler
deploy` (`f:9ug9mo`). The two commands go in a shell block. Both paths run the same two commands,
since the trigger the setup command creates runs exactly those (`f:jtl15v`, scoped). Link
`docs/extend/add-cairn-to-a-sveltekit-app.md#deploy-a-change` for the Wrangler path.

Then one sentence on the observable result: once the deploy finishes, the roster's role select
lists every role the declared vocabulary holds, `'webmaster'` among them (`f:hcjb3o`). Do not
claim which of the two `roles` declarations the select reads (Drafting constraints).

**Hand-off:** the deployed roster now offers the new role.

### Assign the roles

**First sentence:** A declared role reaches no one until an owner assigns it on the roster, and the
change applies on the editor's next request, with no new sign-in.

**Facts:** `f:udg87q`, `f:pwb0wr`, `f:hcjb3o`, `f:uotol3`.

One step, a single bulleted item: in `/admin/editors` on the deployed site, signed in as an owner,
choose `'webmaster'` in the role control beside the editor's row (`f:udg87q`, `f:pwb0wr`). Then
two sentences: a role beyond the default pair is assigned on the same roster screen
(`f:hcjb3o`); a change applies on the editor's next request because the session reads the
editor's row on every request (`f:uotol3`), so a demotion takes effect at once and one test
editor can cycle through the roles.

**Hand-off:** one test editor in each role proves the map.

### Verify each role's reach

**First sentence:** On the deployed site, the composition warning names the targets the map leaves
open, and each role meets a refusal wherever the map excludes it.

**Facts:** `f:mou1li`, `f:xbjxit`. Cited again: `f:8ciz2s`, `f:dqjkci`, `f:udg87q`, `f:uotol3`,
`f:altcjp`, `f:8anql1`, `f:smbsa6`, `f:cvv6to`, `f:pyt58u`, `f:onqm6k`.

A numbered list of ordered checks, each a step with its observable result beneath it:

1. In Workers Logs, query `config.access_unmapped` across the cold start that follows the deploy in
   "Deploy the changes". It fires once per isolate at composition, so a query scoped to a live
   window can miss it (`f:mou1li`); it names every concept and fixed screen except `media`
   (`f:8ciz2s`).
2. On `/admin/editors`, set the test editor's role to `editor` (`f:udg87q`).
3. In the test editor's browser, check the sidebar: neither the media library nor Signups appears
   (`f:altcjp`).
4. In the same browser, open `/admin/signups`. The route refuses with a 403 and logs
   `auth.access.refused` with the role and the target (`f:8anql1`).
5. In the same browser, open the media library by its address. The screen refuses the session
   (`f:cvv6to`, the media library's own gate). See Drafting constraints for the path and status.
6. On `/admin/editors`, set the test editor's role to `'webmaster'`.
7. In the test editor's browser, reload the admin: the media library and Signups appear and both
   open, with no new sign-in (`f:uotol3`, `f:altcjp`).
8. On the signups screen, add a signup. The screen saves it and lists it, since the map admits
   `'webmaster'` and only `remove` carries the owner gate (`f:pyt58u`; the list is the table the
   `load` reads, `f:onqm6k`). This check exercises the admitted action and gives check 9 a
   signup to act on.
9. On the signups screen, remove the signup that check 8 added. The action fails with a 403 and
   logs `auth.access.refused`, since `remove` is owner-only (`f:xbjxit`, `f:smbsa6`).

The third precondition's reason (`f:dqjkci`) is not repeated; check 1's sentence may say "the
deployed site" and leave it there.

**Hand-off:** an unexpected result goes to the failure path.

### Resolve a refusal

**First sentence:** A refusal, or an open screen the map should close, traces to one missing piece
of wiring, which the logs and `cairn doctor` point to.

**Facts:** `f:4bazhe`. Cited again: `f:zo034s`, `f:8anql1`, `f:hwffph`, `f:cvzb8z`.

Ordered diagnostic checks, a numbered list (anatomy item 5), each pointing at the section that
holds the fix rather than restating it:

1. If a route refuses every session, owner included, compare the target its `auth.access.refused`
   record names with the map's keys (`f:zo034s`, `f:8anql1`); "Key nested and parameterized
   routes" holds the fix.
2. If a `'webmaster'` editor is refused on every screen, and the logs show `auth.role.unknown` with
   that role (`f:4bazhe`), the guard lacks `roles`; `cairn doctor` reports the same gap as
   `auth.role-wiring-missing` (`f:hwffph`; link `docs/reference/cli-cairn-doctor.md`). "Pass the map
   to the adapter and the guard" holds the fix.
3. If an engine screen admits a role the map excludes, the adapter lacks `access` (`f:cvzb8z`); the
   same section holds the fix.

Close with one sentence linking `docs/extend/debug-your-site.md` for reading the logs and the other
admin events (anatomy item 5, the extend track's recovery surface). That page's outline carries no
`auth.access.refused` row (an open friction entry, filed 2026-10-03 by the add-a-custom-admin-screen
plan), so the three checks stay inline here.

**Hand-off:** none; See also closes the page.

## Ending

### See also

The anatomy's item 6: related how-to guides, concept pages, and the limitations the page leaves
out, with the recovery link (`docs/extend/debug-your-site.md`) not repeated. One introducing
sentence, then a bulleted list, each item's link text naming its destination:

- `docs/extend/security-model.md`, why the map only narrows and where its coverage stops.
- `docs/extend/add-a-custom-admin-screen.md`, building a screen and its section actions in full.
- `docs/extend/arrange-the-admin-sidebar.md`, arranging and hiding sidebar entries.
- `docs/extend/add-a-second-sign-in-group.md`, a role with `none` capability for a second audience.
- `docs/reference/core.md#access-map`, the `defineAccess` and `canReach` entries.
- `docs/reference/sveltekit.md#requireaccess`, the route check.
- `docs/reference/log-events.md`, the `auth.access.refused` and `config.access_unmapped` rows.

## Dispositions, every fact id

`carried` names the section that holds the fact's primary placement. A subordinated fact is
recorded as a cut whose reason names the reference entry that states it; the entry was opened and
read before it was named. The outline's 25 fact ids: 24 carried, 1 subordinated. Added by this plan:
17 carried, each named where it lands (13 by the first plan, 4 by the revision's deploy step).

| Fact | Disposition | Section, or reference and reason |
| --- | --- | --- |
| f:p1xmp5 | carried | Introduction (item 1); cited again in Declare the roles |
| f:grxpu5 | carried | Declare the access map (validation) |
| f:0qb73i | carried | Declare the access map (keys and values, the owner rule); also Introduction, Decide what the map leaves open |
| f:iwf4nu | carried | Pass the map to the adapter and the guard (the guard paragraph) |
| f:54d3ui | carried | Enforce the map on your routes |
| f:zo034s | carried | Decide what the map leaves open (first sentence); cited again in Resolve a refusal |
| f:5pyozi | carried | Enforce the map on your routes (the trap beside the `load` call) |
| f:iewhzh | carried | Declare the access map (the trap beside the `media` key) |
| f:smbsa6 | carried | Enforce the map on your routes; cited again in Verify each role's reach (check 9) |
| f:8anql1 | carried | Enforce the map on your routes; cited again in Decide what the map leaves open, Key nested and parameterized routes, Verify each role's reach, Resolve a refusal |
| f:gun084 | subordinated (cut) | `docs/reference/sveltekit.md#createauthguard` states all four options (`roles`, `access`, `includeSubDomains`, `identity`) and that the guard attaches the map to `locals.cairnAccess`. The page needs only `roles` and `access`, which `f:4xrx5f` and `f:iwf4nu` carry; the other two belong to other tasks |
| f:3s23un | carried | Enforce the map on your routes (scoped: the target default and the checks before the handler); cited again in Key nested and parameterized routes. The options in full stay with `docs/extend/add-a-custom-admin-screen.md` (out of scope) |
| f:altcjp | carried | Sidebar entries; cited again in Verify each role's reach |
| f:8ciz2s | carried | Decide what the map leaves open; cited again in Make the map exhaustive and Verify each role's reach (worded as the code behaves; friction filed) |
| f:cvv6to | carried | Declare the access map (scoped: a screen key gates its write actions; the two exceptions linked to `docs/extend/security-model.md#limits-of-access-map-coverage`); cited again in Make the map exhaustive and Verify each role's reach |
| f:uhoyun | carried | Key nested and parameterized routes; cited again in Sidebar entries |
| f:uotol3 | carried | Assign the roles; cited again in Verify each role's reach |
| f:4xrx5f | carried | Pass the map to the adapter and the guard (the guard's default); cited again in Introduction and Declare the roles |
| f:2zytgf | carried | Pass the map to the adapter and the guard (scoped to the optional `roles` and `access` members) |
| f:mou1li | carried | Verify each role's reach (check 1); cited again in Declare the access map for the gloss of composition |
| f:hwffph | carried | Pass the map to the adapter and the guard (the roles trap); cited again in Introduction (item 2, the guard's gloss) and Resolve a refusal |
| f:vqh4a9 | carried | Sidebar entries; cited again in Declare the access map (the roster is not a key) |
| f:3z48zf | carried | Declare the access map (validation, summarized; the key-shape rules in full linked to `docs/reference/core.md#defineaccess`) |
| f:zjglk8 | carried | Declare the roles; cited again in Introduction |
| f:cvzb8z | carried | Pass the map to the adapter and the guard (the guard-only trap); cited again in Sidebar entries and Resolve a refusal |
| f:dbaklx | carried (added) | Declare the roles (the reserved `owner` name) |
| f:qlgggh | carried (added) | Before you begin (the scaffold's `src/access.ts`); cited again in Declare the access map |
| f:4esdoz | carried (added) | Pass the map to the adapter and the guard (the adapter's file); cited again in Introduction |
| f:onqm6k | carried (added) | Before you begin (the scaffold's signups screen); cited again in Enforce the map on your routes and Verify each role's reach (check 8's list) |
| f:pyt58u | carried (added) | Enforce the map on your routes (`ownerOnly` on `remove`); cited again in Verify each role's reach (check 8, the add action without the owner gate) |
| f:udg87q | carried (added) | Assign the roles (the roster's role control); cited again in Verify each role's reach |
| f:pwb0wr | carried (added) | Assign the roles (an owner changes roles) |
| f:4673n6 | carried (added) | Declare the roles (what `none` capability means, beside the link to the second-audience page) |
| f:9xthnq | carried (added) | Pass the map to the adapter and the guard (the guard paragraph, what the guard gates) |
| f:hcjb3o | carried (added) | Assign the roles (a larger vocabulary is assigned on the same screen); cited again in Deploy the changes (the deployed role select lists the declared vocabulary) |
| f:dqjkci | carried (added) | Before you begin (the dev backend signs in as an owner) |
| f:4bazhe | carried (added) | Resolve a refusal (check 2's log signal) |
| f:xbjxit | carried (added) | Verify each role's reach (check 9's 403) |
| f:kldwss | carried (added) | Before you begin (a scaffolded site is deployed by the setup command) |
| f:qca0t0 | carried (added) | Before you begin (the Workers Builds redeploy path and the `--connect` command); cited again in Deploy the changes |
| f:9ug9mo | carried (added) | Deploy the changes (the Wrangler path, `npx wrangler deploy`); cited again in Before you begin (`npx wrangler login`) |
| f:jtl15v | carried (added) | Deploy the changes (scoped: the Workers Builds trigger runs `npm run build` and `npx wrangler deploy`, so both paths run the same commands); its engine-upgrade claim stays off this page |

The page-inputs claim inventory carried three more rows, disposed as it recorded them: the absent
prior page (no claims), `RoleDeclaration.home` re-pointed to
`docs/extend/add-a-second-sign-in-group.md` (linked from Declare the roles), and
`EditorRoutesConfig.roles` excluded (a site never calls `createEditorRoutes`; the page says nothing
about it).

## Friction filed

Five entries in `docs/internal/docs-friction-log.md`, none blocking the page. The plan step filed
the first four on 2026-10-07, and its revision filed the fifth the same day:

1. The reference's snippets for `defineAccess` and `createAuthGuard` import `roles` from the adapter
   module, and the `defineAccess` entry then asks for the map on the adapter, a layout that forms
   an import cycle. This plan puts both declarations in `src/access.ts`.
2. `f:lmtfkt` contradicts `f:uhoyun` on whether a nested route needs its own map entry, and
   `docs/extend/add-a-custom-admin-screen.md` carries `f:lmtfkt`'s wording as a required step.
3. Facts-container holes: `f:8ciz2s` words the warning's trigger more narrowly than the code, and no
   fact gives the media library's address or an engine screen's refusal status.
4. A deeper route key turns a dynamic route beneath the shallower key into a refuse-all, and the
   `requireAccess` and `canReach` reference entries omit it.
5. No extend page or fact gives a scaffolded site's redeploy path, so "Deploy the changes" hedges
   between two paths, built from an admin-track fact (`f:qca0t0`), a vendor fact (`f:9ug9mo`), and
   the hand-built tutorial's "Deploy a change" exercise.

The two-wiring-points entry (`f:cvzb8z`, `f:iwf4nu`) was filed by this page's inputs step the same
day and is not refiled.

## Cross-page note

`docs/extend/add-a-custom-admin-screen.md`, "Load row detail on demand", step 3, tells the reader to
add a map entry for a nested route. On this page the screen's key already governs the nested route
by prefix (`f:uhoyun`), and the entry is optional. This page states `f:uhoyun` as the code behaves;
the sibling page is in a closed stage and is not edited from here (friction entry 2).

## Drafting constraints

- The running example's role name appears in prose as the quoted literal `'webmaster'`, never as a
  bare identifier code span, since no fact bullet carries the invented name and the provenance gate
  sets a quoted literal aside. Inside the fenced code block it is written as code requires.
- The matching illustration in "Key nested and parameterized routes" uses `f:uhoyun`'s own
  `/admin/money` paths. `/admin/signups` is vouched by `f:pyt58u`'s source path and `f:onqm6k`.
- The media library's address and an engine screen's 403 status have no fact yet (friction entry
  3). Check 5 names the screen and says it refuses the session; it spells `/admin/media` or the
  status only if a fact lands before drafting, and otherwise links the route table in
  `docs/reference/admin-routes.md` for the address.
- Describe the scaffold's current `src/access.ts` only as `f:qlgggh` does (the map the hooks file
  hands the guard); the steps describe what the reader writes, not what the file held before.
- Do not claim that a guard-only map draws no warning, that the adapter's `roles` feed the roster's
  role control, or that the reference layout cycles; no fact states any of them.
- "Deploy the changes" states the two redeploy paths and their commands only. It does not say how
  to tell which path a site uses, and it names no dashboard, since no fact states either
  (friction entry 5).
- Imports: `defineRoles` and `defineAccess` from `@glw907/cairn-cms`; `createAuthGuard`,
  `requireAccess`, and `createSectionAction` from `@glw907/cairn-cms/sveltekit`.
- Every section opens on the first sentence decided above. Each step names its location before its
  action and holds one action, a conditional step states its condition first, and a procedure of
  one step is a single bulleted item.
- Name every linked page by its title in link text; a reference names its target by heading, never
  by position.
