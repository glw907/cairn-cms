# Page plan: `docs/extend/add-a-second-sign-in-group.md`

Agent-facing, written beside the page's brief at
`docs/internal/briefs/extend/add-a-second-sign-in-group.json`. Written 2026-10-07 by the plan step
of the docs page chain (stage 2a), and revised the same day on the structural edit's findings:
Path B gains a `.dev.vars` secret step, a deploy step that carries the remote migration and the
production secret, and a verification on the deployed site; the optional members shrink to one
sentence; the verification headings name their result; and the introduction names access maps
as out of scope. The drafter drafts from this plan: it is the source of the
page's order, each section's claim, and each fact's placement. The structural edit seat reads it
before any prose exists. Method: Google Technical Writing Two, "Organizing large documents"
(https://developers.google.com/tech-writing/two/large-docs), the outline as the document's
narrative, with information introduced where it is most relevant to the reader. The page type's
anatomy is the task guide in `docs/internal/docs-register.md`, "## The page anatomies".

Page type: task guide. Job (`docs/internal/outlines/extend.json`, slug
`add-a-second-sign-in-group`): give a Svelte-fluent web developer building an organization's
site on cairn a way to sign in a second population and give it its own area, first helping them
choose between a declared `none`-capability role in `AUTH_DB` and a `createAuthChannel` channel.

Inputs read: the outline entry above (job, covers, outOfScope, exemplars, crossLinks); "## The
page anatomies" in `docs/internal/docs-register.md`; every fact bullet named in the dispositions
table, in `docs/internal/facts/extend.md`, `docs/internal/facts/reference.md`,
`docs/internal/facts/admin.md`, and `docs/internal/facts/front-door.md`; the page-inputs friction
entries for this page in `docs/internal/docs-friction-log.md`; the two exemplars,
`/var/home/glw907/.local/share/cairn/exemplars/extenders/django-custom-management-commands/page.md`
and `/var/home/glw907/.local/share/cairn/exemplars/extenders/sanity-custom-tool/page.md`; the
example site's members exemplar (`examples/showcase/src/members/channel.ts`,
`examples/showcase/src/members/capture-transport.ts`,
`examples/showcase/src/routes/members/login/+page.server.ts`,
`examples/showcase/src/routes/members/+page.server.ts`, `examples/showcase/wrangler.jsonc:44-53`);
`docs/reference/auth-channel.md` whole, `docs/reference/core.md` "### Roles",
`docs/reference/sveltekit.md` (`createAuthGuard`, `requireEditor`, the navLayout seam),
`docs/reference/cloudflare.md` (`verifyTurnstile`), `docs/reference/cli-cairn-doctor.md` (the
`auth.role-wiring` row); `docs/extend/add-a-custom-admin-screen.md` (introduction and "Gate it");
`docs/extend/add-cairn-to-a-sveltekit-app.md` ("Create the auth database", "Wire the dev
backend", "Apply an opt-in migration locally", and, for the revision, "Deploy a change" and
"Store the App's credentials"); `docs/extend/security-model.md` ("The auth
channel's threat surface"); the code each load-bearing claim rests on:
`src/lib/auth/access.ts:156-175` (`canReach`), `src/lib/sveltekit/guard.ts:476-485`
(`requireAccess`), `src/lib/sveltekit/admin-nav.ts:477-480,527-536`,
`src/lib/sveltekit/admin-action.ts:120-129,285-300`, `src/lib/sveltekit/content-routes-shell.ts:301-317`,
`src/lib/sveltekit/editors-routes.ts:93-110`, `src/lib/auth/store.ts:263-273`,
`migrations/0000_auth.sql:5`, `migrations/0001_roles.sql`, `src/lib/auth-channel/factory.ts:625-640`,
`packages/cairn-cms-dev/src/channel-db.ts`, `packages/cairn-cms-dev/src/index.ts`,
`src/tests/unit/worker-wait-until.test.ts`.

**The test recipe was run, not only composed.** No in-repo consumer drives a channel on
`createChannelDb` (the page-inputs friction entry for `f:fcqs22` records it). This plan step ran
a scratch vitest file under `examples/showcase/` on 2026-10-07 (vitest 4.1.11, Node 24.20.0),
then deleted it: `vi.mock('cloudflare:workers', ...)` supplying `env` and a promise-collecting
`waitUntil` through `vi.hoisted`, the double built from `migrations-members/0000_channel.sql`
and set as `env.MEMBER_DB`, a channel with a recording `deliver` and a passing `challenge`, and
`actions.request` on a `localhost` POST with a matching `Origin` header. It answered
`{ outcome: 'sent' }` and recorded one 8-digit code. It passed twice: once on the example site's
symlinked install, and once with `resolve.preserveSymlinks: true` and only the scaffold's
`server.deps.inline: ['@glw907/cairn-cms']`, so module ids kept their `node_modules` paths the
way a registry install resolves them. The section "Test the channel on Node" is built on that run.

Headings in this plan are the page's headings, verbatim. A claim inventory `section` names one of
them. The introduction is the untitled text under the H1 and is named `Introduction` here.

## What binds this plan

- **Anatomy** (task guide): an introduction that states the task, when and why, who for, and the
  page to read instead, with the one-line contract inside the framing; preconditions, each with a
  link to what produces it; steps as numbered lists, one action a step, the location named before
  the action, a one-step procedure as a single bullet; a verification section headed with a bare
  infinitive that names the observable result; failure paths that end at
  `docs/extend/debug-your-site.md`; a see-also section that does not repeat the recovery link.
  Explanation stays subordinate to the steps, and each explanation block opens with a sentence
  tying it to the task.
- **Exemplar takes.** Django: one running example carried from setup to test. This page carries
  two, one per path, since the paths share no code: the `staff` role from the roles reference
  (`docs/reference/core.md`, the `defineRoles` example, `staff: { capability: 'none', home:
  '/admin/staff' }`), and the example site's members channel (`MEMBER_DB`, `member_session`,
  `/members/login`, `/members`) carried through binding, migration, module, routes, removal,
  test, deploy, and verification. The class reference stays on `docs/reference/auth-channel.md`. Sanity:
  the early "right tool for the job?" callout becomes the section "Choose the mechanism", the
  page's first step after the preconditions (see the order argument below); the plugin tail is
  left out.
- **Out of scope, kept off the page.** The channel's threat model belongs to
  `docs/extend/security-model.md`; the page links it once from See also and states no threat
  claim. Access maps belong to `docs/extend/restrict-admin-access.md`; the page states only the
  one access-map fact the role path cannot work without (the map admits no `none` session), as a
  constraint on the role's own screen, and links that page for the map itself.
- **Owner rulings carried.** Every page gets an introduction per the anatomy; the framing step
  frames it from the three parts below. A fact the page does not need is subordinated to a named
  reference entry or cut with a reason, never dropped.

## What the page argues, and the order it needs

The page argues one thing: cairn signs a second group in through one of two mechanisms, and the
choice decides everything after it. A declared role puts the group in the editors' own roster at
`none` capability, so its people use the editors' magic link and land on a screen the site builds
under `/admin`, where every gate the site writes has to read the role itself, because the access
map admits no `none` session (f:b3l3t0, f:4673n6, f:p1xmp5). An auth channel gives the group a
separate login with its own database, cookie, and sessions, so the site builds the login route
and the member area outside `/admin` and supplies the delivery, the roster lookup, and the bot
challenge the factory cannot (f:b3l3t0, f:q7fj6p, f:cf1avu). In either case cairn signs the
people in and the site models them (f:nguseg).

The sections run in the anatomy's order, and each hands the next its input:

1. **Before you begin** carries the preconditions for both paths, each path's own items labeled,
   because the anatomy puts preconditions ahead of the steps and the channel's preconditions (a
   transport, a roster store, a Turnstile secret) are themselves a cost the reader weighs in the
   choice that follows. The replace-magic-links plan's third read flagged a decision section
   ahead of the preconditions; this order avoids that finding.
2. **Choose the mechanism** is the first step: the Sanity callout grown into a comparison,
   because the outline's job says the page first helps the reader choose, and the two paths share
   no step. It closes on the site-owns-its-domain sentence, which applies to both paths.
3. **Sign the group in with a role** (Path A) comes before the channel because it is shorter,
   reuses the sign-in the site already runs, and is the lighter choice the comparison names
   first; a channel reader skips it in one jump from the comparison's hand-off. Its sections run
   in dependency order: declare the role (the name and `home` every later step uses), build the
   home screen (the path `home` points at must exist before anyone lands there), show it in the
   sidebar (the link points at that screen), add the people (last, once everything they see
   exists, and with the roles migration beside the one action that needs it), verify on the
   deployed site.
4. **Sign the group in through a channel** (Path B) runs the example site's channel in the order a
   developer builds it: provision the database (the binding `resolveDb` returns, migrated locally
   so `wrangler dev` serves the channel during the build), write the module (it returns the
   actions and helpers the routes call, and it reads the Turnstile secret the section stores for
   `wrangler dev`), build the login route (it calls `request` and `confirm`), gate the member area
   (the login's redirect target, calling `resolveSubject` and `logout`), end a removed member's
   sessions (`verify` and `revokeSessions`, the two returned helpers with no route), test on Node
   (the last check before anything goes live), deploy (the remote migration, the production
   secret, then the code that reads both), and verify on the deployed site. Both paths therefore
   end the same way: a deploy, then a check that the group signs in on the live site. The
   outline's covers list config members before the binding; this plan puts
   the binding first because the module's first member names it and the Django take provisions
   the directory before the module that lives in it. The covers' "the returned actions and
   helpers" is not its own section: each returned member is introduced in the section that calls
   it, where it is most relevant (Google's sequencing rule).
5. **Resolve a failed setup** holds both paths' failure checks in one ordered list, in the order
   a reader meets them (role, then channel), ending at the debugging page, because the anatomy
   gives failure paths one slot and one recovery link.
6. **See also** closes the page.

### Departures from the outline's covers order, with the reason for each

1. "Before you begin" is added ahead of the covers' first item, per the anatomy.
2. Path B's covers order (config members, then binding and migration) is reversed: the binding
   comes first because the module's `resolveDb` returns it, and a reader cannot run a module whose
   binding does not exist.
3. Path B's "the returned actions and helpers" is split across the sections that use each
   member: `actions.request` and `actions.confirm` in the login route, `resolveSubject` and
   `actions.logout` in the member area, `verify` and `revokeSessions` in the removal section.
4. The covers' "nav gating with roles" gains its constraint: the home path stays out of the
   access map, since an entry whose href matches a map rule defers to `canReach`, which admits no
   `none` session (f:altcjp, f:p1xmp5). Without it the role's link disappears for the role it
   names.
5. Path A gains a home-screen section the covers do not name. The covers say the role lands on
   its `home`; the home is a site-built screen, and the gating the custom-screen page teaches
   (`requireAccess`, `createSectionAction`) refuses every `none` session, so the role path is
   broken without a section that says how the screen gates (f:p1xmp5, f:8anql1, f:xbjxit).
6. Path B gains "End a removed member's sessions", carrying `revokeSessions` (named in the job)
   and `verify` (an option row filed to this page) into one task a site owner has: removing a
   member.
7. Path B gains "Deploy the channel", which the covers do not name, so the second group signs in
   on the live site the way Path A's people do after its deploy step. The remote migration moves
   there from provisioning, which applies the migration to the local database only, and the
   production Turnstile secret is stored there, so the schema and the secret exist before the
   code that reads them goes live. The channel's verification follows the deploy and runs on the
   deployed site, parallel to the role's.

### Heading policy

Every section heading is a task heading, a bare infinitive in sentence case, except "Before you
begin" and "See also", the Good Docs how-to template's own names. The two path headings are H2s
with parallel wording so the table of contents shows the fork: "Sign the group in with a role"
and "Sign the group in through a channel". Each path's steps are H3s beneath it. The two
verification headings name what the reader observes and stay parallel: "Verify the role signs in
to its home screen" and "Verify a member signs in to the member area". No page links an
anchor on this page (a grep over `docs/` finds links to the file only, from
`docs/extend/security-model.md` and `docs/extend/replace-magic-links-with-cloudflare-access.md`),
and the outline pins no slug, so no heading is fixed by an inbound link.

## The introduction, in Google's three parts

No heading. The framing step decides the paragraphs, the background, and the opening from these
three parts; the plan fixes only what each part holds. The opening is a statement, never an
imperative and never a sentence about the page.

1. **What the document covers.** A cairn site signs in two kinds of people out of the box, owners
   and editors, by the email magic link (f:nz890r). Many organizations have a second group to
   sign in, to reach screens or pages made for them. The page gives that group its own sign-in and its own area by one of two
   mechanisms, a declared role or an auth channel, and helps the reader choose (f:b3l3t0). It
   carries the `staff` role from the roles reference through the role path and the members channel
   of the repository's example site, `examples/showcase`, through the channel path. The one-line contract (sign a second group in and
   give it its own area) sits inside this framing.
2. **What prior knowledge you expect readers to have.** A site built through
   `docs/extend/add-cairn-to-a-sveltekit-app.md` or scaffolded by the setup command: its hooks
   file, its adapter module, its `wrangler.jsonc` bindings, and applying a D1 migration. SvelteKit
   load functions and form actions. Vitest, for the channel's test.
3. **What the document doesn't cover**, each with the page to read instead:
   - Access maps, which narrow which editor-capability roles reach which admin screens, including
     the map a group that edits content needs: such a group needs editor capability, since `none`
     closes the engine's content screens (f:4673n6), so it is an editor-capability role narrowed
     by an access map, `docs/extend/restrict-admin-access.md`. The page states only the one map
     constraint the role path cannot work without, in "Show the home screen in the sidebar".
   - Signing editors in through the organization's identity provider instead of magic links:
     `docs/extend/replace-magic-links-with-cloudflare-access.md` (that page sends its
     second-population reader here; this page sends the reverse reader there).
   - The channel's threat model and the hazards a site's `deliver` can introduce:
     `docs/extend/security-model.md`.
   - The site's own model of the group (its records, signups, directories): the site's code, stated
     in "Choose the mechanism" (f:nguseg).

## Sections, in order

Each entry carries the heading; **Takes**, the one sentence a reader keeps, which is the section's
first sentence on the page; **Draws on**, the fact ids placed here with what each contributes;
the steps or shape; and **Hand-off**, the turn the section closes on, with any subordination it
carries. A sentence citing several ids synthesizes them; the brief records it as an array.

### 1. Before you begin

- Heading: `## Before you begin`
- **Takes:** Both mechanisms start from a cairn site whose editors already sign in by magic link.
  (`no-claim`, the anatomy's list lead-in)
- **Draws on,** one bullet a precondition, each with a link to what produces it:
  - A site whose editors sign in by magic link, with `AUTH_DB` created and migrated; link
    `docs/extend/add-cairn-to-a-sveltekit-app.md#create-the-auth-database` (`no-claim`).
  - For a role, an owner's sign-in, since an owner adds the role's people on `/admin/editors`
    (f:nj0nfm).
  - For a channel, a transport the Worker can call to send a code, such as an email or SMS
    provider, and the group's roster in a store the site's code can read (f:cf1avu).
  - For a channel, a Cloudflare Turnstile widget and its secret key, for the channel's required
    bot challenge (f:ez788q; link Cloudflare's Turnstile get-started page,
    https://developers.cloudflare.com/turnstile/get-started/, opened by the drafter before
    linking).
  - For the channel's test, Node 24 or later, the floor `@glw907/cairn-cms-dev` declares and
    nothing enforces at runtime, and the dev package installed as a dev dependency, which the
    tutorial's dev-backend step installs (f:fcqs22; link
    `docs/extend/add-cairn-to-a-sveltekit-app.md#wire-the-dev-backend`). The page names the
    declared floor only; `node:sqlite`'s lower unflag version is cut (f:tnvu0a).
- **Hand-off:** which mechanism to build is the first decision.

### 2. Choose the mechanism

- Heading: `## Choose the mechanism`
- **Takes:** A second group signs in one of two ways: as a declared role, whose people use the
  editors' magic link and live in the editors' roster in `AUTH_DB`, or through an auth channel
  from `createAuthChannel`, a separate login with its own subject, D1 database, and session.
  (f:b3l3t0)
- **Shape:** the Takes sentence, then a comparison table (Google prefers a table for comparing
  options), then one recommendation sentence, then the domain sentence, then the hand-off. Two
  columns, "A declared role" and "An auth channel"; each row's cells cite their facts:
  - Sign-in: the same magic link editors use (f:4673n6) / a numeric code, 8 digits by default,
    sent by the site's own transport (f:we2lmp, f:cf1avu).
  - Roster: rows in `AUTH_DB`'s `editor` table that an owner adds on `/admin/editors`
    (f:b3l3t0, f:hcjb3o) / the site's own store, read by the site's `lookup` (f:dtz8oa, f:ffskeq).
  - Sessions: `AUTH_DB`'s, populating `locals.cairnEditor` with `none` capability (f:5t6hz6) /
    the channel's own D1 binding, never `AUTH_DB`, and never `locals.cairnEditor` (f:rcpe0n,
    f:q7fj6p).
  - Where people land: the role's `home` under `/admin`, or a welcome screen (f:7n28wc) / the
    site's own routes outside `/admin` (f:q7fj6p).
  - What the site builds: the home screen (f:4673n6) / the login route, the member area, the
    delivery, and the roster lookup (f:q7fj6p, f:cf1avu).
- **Recommendation sentence:** a role suits a group an owner adds person by person and that works
  in screens under `/admin`; a channel suits a group whose roster the site already keeps and that
  never needs the admin. (f:hcjb3o, f:7n28wc, f:dtz8oa, f:q7fj6p)
- **Domain sentence:** either way, cairn signs the people in and the site models them: what a
  member, a staff assignment, or a signup is stays the site's own code. (f:nguseg)
- **Hand-off:** the role path follows; a channel reader goes to "Sign the group in through a
  channel" (an in-page link, `no-claim`).

### 3. Sign the group in with a role

- Heading: `## Sign the group in with a role`
- **Takes:** A role adds the group to the editors' roster at `none` capability, so its people sign
  in by the magic link and reach only the screens the site builds for them. (f:4673n6, f:5t6hz6)
- **Draws on:** the two facts above; one more sentence names the running example, the `staff`
  role from the roles reference, whose `home` is `/admin/staff` (f:4673n6; link
  `docs/reference/core.md#defineroles`).
- **Hand-off:** the role starts as one entry in the vocabulary.

#### 3a. Declare the role

- Heading: `### Declare the role`
- **Takes:** A role is one entry in the site's role vocabulary, declared with `defineRoles` on
  the adapter and passed to the guard, and an object entry's `home` names the `/admin` path its
  people land on. (f:2zytgf, f:4xrx5f, f:pvs115)
- **Steps,** a numbered list of two:
  1. In the adapter module (`src/lib/cairn.config.ts` in the tutorial's site), declare the
     vocabulary with `defineRoles`, keeping `owner` and `editor` beside `staff: { capability:
     'none', home: '/admin/staff' }`, and pass it as the adapter's `roles` member (f:2zytgf,
     f:4673n6, f:pvs115).
  2. In `src/hooks.server.ts`, pass the same vocabulary to `createAuthGuard({ roles })` (f:4xrx5f).
- **Explanation after the steps,** opening with a sentence tying it to the declaration:
  - Keep `owner` and `editor` in the vocabulary: `defineRoles` throws without an `owner` key
    mapped to owner capability, and a roster row whose role the vocabulary omits resolves to
    `none`, which would close the content screens to every existing editor (f:dbaklx, f:zjglk8).
  - `home` must be an absolute path under `/admin`, or `defineRoles` throws (f:pvs115).
  - At `/admin`, the index redirects a role that declares a `home` to it, and shows a `none` role
    without one a welcome screen (f:7n28wc).
  - `none` keeps the engine's content and roster screens closed to the role's people (f:4673n6).
  - A guard called without `roles` resolves every session against the owner and editor pair
    (f:4xrx5f); "Verify the role signs in to its home screen" checks the wiring.
  The full rules for a declaration stay on `docs/reference/core.md#defineroles` (`no-claim`
  link).
- **Hand-off:** the `home` path needs a screen, which the next section builds.

#### 3b. Build the role's home screen

- Heading: `### Build the role's home screen`
- **Takes:** The home path is a custom admin screen the site builds, and it gates on the
  session's role itself, because the access map admits no `none`-capability session. (f:p1xmp5,
  f:5t6hz6)
- **Steps,** a numbered list of two:
  1. At `src/routes/admin/staff/`, build the screen as `docs/extend/add-a-custom-admin-screen.md`
     does (`no-claim` link).
  2. In the screen's `+page.server.ts`, have `load` call `requireSession` and refuse with a 403
     any session whose `role` the screen does not serve, in place of the `requireAccess` call
     that page uses (f:8anql1, f:5t6hz6).
- **Explanation after the steps,** opening with a sentence tying it to the gate:
  - `requireAccess` refuses every `none` session whatever the map says, because capability is the
    floor the map only narrows (f:p1xmp5, f:8anql1).
  - The role's session is an ordinary roster row that populates `locals.cairnEditor` like an
    editor's, with `capability` resolved to `none`, so `load` reads `role` there (f:5t6hz6).
  - An action on the screen needs the same check: `createSectionAction` runs the map check on
    every call, while `createAdminAction` with its `access` option omitted authorizes nothing, so
    its handler checks the role (f:xbjxit, f:p1xmp5).
- **Hand-off:** the sidebar shows the screen's link to the role, next.

#### 3c. Show the home screen in the sidebar

- Heading: `### Show the home screen in the sidebar`
- **Takes:** A `navLayout` entry with a `roles` list shows the home screen's link only to the roles
  it names. (f:16paho)
- **Step,** one bullet: in the adapter's `editor` group, add a `navLayout` entry for
  `/admin/staff` with `roles: ['staff']` (f:ys1iq1, f:16paho).
- **Explanation after the step,** opening with a sentence tying it to the entry:
  - A role name the vocabulary does not declare fails validation (f:16paho).
  - Hiding a link is never authorization; the screen's own role check from the previous section
    is what refuses everyone else (f:bvfs3e, cited for its first clause only: its "denied via the
    access map" clause does not hold for a `none` role, which the friction entry filed by this
    plan records).
  - Leave `/admin/staff` out of the access map: an entry whose href matches a map rule is shown
    only to the roles `canReach` admits, and `canReach` admits no `none` session (f:altcjp,
    f:p1xmp5). The map itself belongs to `docs/extend/restrict-admin-access.md` (`no-claim`
    link).
  - The rest of the sidebar seam (sections, engine screens, the fallback group):
    `docs/extend/arrange-the-admin-sidebar.md` (`no-claim` link).
- **Hand-off:** with the screen and its link in place, the people can be added.

#### 3d. Add the role's people

- Heading: `### Add the role's people`
- **Takes:** An owner adds each of the role's people on `/admin/editors`, the screen that adds
  editors, once `AUTH_DB` carries the migration that lets the roster hold a role beyond owner and
  editor. (f:hcjb3o, f:rn62i1)
- **Steps,** a numbered list of five:
  1. In the project directory, copy `0001_roles.sql` from
     `node_modules/@glw907/cairn-cms/migrations/` into `migrations/` (f:xxtooz, f:rn62i1).
  2. In the project directory, apply it to the remote database with `npx wrangler d1 migrations
     apply <database> --remote` (f:xxtooz).
  3. Deploy the site, as the tutorial's deploy step does, so `/admin/editors` offers the new role
     (f:hcjb3o; link `docs/extend/add-cairn-to-a-sveltekit-app.md#deploy-a-change`).
  4. On `/admin/editors`, enter the person's name and email, choose `staff` in the role
     select, and select **Add editor** (f:hcjb3o, f:nj0nfm).
  5. Tell the person to sign in at `/admin/login`, since adding them sends no email (f:nj0nfm).
- **Hand-off:** the role is ready to verify.

#### 3e. Verify the role signs in to its home screen

- Heading: `### Verify the role signs in to its home screen`
- **Takes:** A working role signs its people in by the magic link onto the home screen, with the
  screen's link in the sidebar and the engine's content screens closed to them. (f:4673n6,
  f:7n28wc, f:16paho)
- **Steps,** a numbered list of five checks in order:
  1. In the project directory, run `cairn doctor` and confirm it reports no
     `auth.role-wiring-missing`, the warning for a vocabulary the guard never received (f:hwffph;
     link `docs/reference/cli-cairn-doctor.md`).
  2. As one of the role's people, sign in at `/admin/login` with the emailed link (f:4673n6).
  3. Confirm that `/admin` lands on `/admin/staff` (f:7n28wc).
  4. Confirm that the sidebar shows the screen's link (f:16paho).
  5. Open a content screen, such as `/admin/posts`, and confirm that it refuses the person
     (f:4673n6).
- **Hand-off:** a failed check goes to "Resolve a failed setup" (in-page link, `no-claim`).

### 4. Sign the group in through a channel

- Heading: `## Sign the group in through a channel`
- **Takes:** A channel gives the group a login of its own: `createAuthChannel` builds the request,
  confirm, and logout actions over a numeric code, and the site supplies the routes, the
  delivery, and the roster. (f:we2lmp, f:q7fj6p, f:cf1avu)
- **Draws on:** the facts above; one more sentence names the running example: the members
  channel in the repository's example site, `examples/showcase`, which binds `MEMBER_DB`, names its cookie `member_session`, and serves
  `/members/login` and `/members` (f:uci4pa, f:4cw5dk, f:265s4t).
- **Hand-off:** the channel's database comes first.

#### 4a. Provision the channel database

- Heading: `### Provision the channel database`
- **Takes:** The channel keeps its codes and sessions in a D1 database of its own, bound beside
  `AUTH_DB` and never as it, with the packaged migration in a migrations directory of its own.
  (f:rcpe0n, f:5rkxfp)
- **Steps,** a numbered list of four:
  1. In the project directory, create a D1 database for the channel the way the tutorial creates
     `AUTH_DB`, and note its id (`no-claim`; link
     `docs/extend/add-cairn-to-a-sveltekit-app.md#create-the-auth-database`).
  2. In the project directory, copy
     `node_modules/@glw907/cairn-cms/migrations-channel/0000_channel.sql` into a new
     `migrations-members` directory (f:6ab2z6, f:uci4pa).
  3. In `wrangler.jsonc`, add a `d1_databases` entry that binds the database as `MEMBER_DB` with
     `migrations_dir` set to `migrations-members` (f:uci4pa, f:rcpe0n).
  4. In the project directory, apply the migration to the local database with `npx wrangler d1
     migrations apply MEMBER_DB --local`, so `wrangler dev` serves the channel while you build it
     (f:uci4pa, f:xxtooz, f:l2xruc).
- **Explanation after the steps,** opening with a sentence tying it to the separate directory:
  - A shared `migrations_dir` applies each database's schema to the other the first time either
    is migrated, which is why the channel's migration lives in a sibling directory (f:5rkxfp).
  - Every statement is idempotent, so applying the file to a database that already holds the
    tables changes nothing and records the migration (f:6ab2z6).
  - The remote database takes the same migration in "Deploy the channel" (in-page link,
    `no-claim`), once the code that reads it is ready to ship.
  - The tables, the hand-inserted marker fallback, and the per-deployment salt are on
    `docs/reference/auth-channel.md#the-packaged-migration` (`no-claim` link; the subordination
    of f:lccuuc).
- **Hand-off:** the channel module's `resolveDb` returns this binding.

#### 4b. Write the channel module

- Heading: `### Write the channel module`
- **Takes:** A channel is one `createAuthChannel` call in a server-only module: the site supplies
  the code's delivery, the roster lookup, the contact normalizer, and the bot challenge, plus the
  binding and a cookie name, and the factory owns code minting and consumption, rate budgets,
  sessions, and revocation. (f:cf1avu)
- **Steps,** a numbered list of two:
  1. In `src/lib/server/member-channel.ts`, create the channel with its six required members,
     typed over the Worker env (f:41kl6q). The sample follows the worked example on
     `docs/reference/auth-channel.md#createauthchannel` (`MEMBER_DB`, `member_session`, and a
     `challenge` that passes `env.TURNSTILE_SECRET` to `verifyTurnstile`), with the explicit `Env`
     annotation that entry requires. `src/lib/server/` is SvelteKit's server-only module directory
     (link https://svelte.dev/docs/kit/server-only-modules, `no-claim`).
  2. In `.dev.vars` beside `wrangler.jsonc`, creating the file if the site has none, add the
     Turnstile secret key as `TURNSTILE_SECRET`, the name the module's `challenge` reads. The step
     carries its reason in one clause: `wrangler dev` reads secrets from `.dev.vars` and never
     from a deployed Worker secret, so the production copy waits for "Deploy the channel" (in-page
     link, `no-claim`). A second clause, a statement rather than a second action, names
     `.dev.vars` as local-only, kept out of git as the scaffold's `.gitignore` keeps it
     (f:86h9o6, f:nls26c).
- **Explanation after the steps,** one bullet a member the reader decides, opening with a sentence
  tying the list to the call:
  - `resolveDb` returns the `MEMBER_DB` binding from "Provision the channel database"
    (f:rcpe0n).
  - `lookup` returns the stable subject for a normalized contact, or `null`, and that answer
    decides membership; it takes `{ env }` so it reaches the roster's own binding, and it never
    reads request data (f:dtz8oa, f:ffskeq).
  - `challenge` wraps `verifyTurnstile`, which returns `false` on every failure and never throws
    (f:69xbyh; its `ip` rule left to `docs/reference/cloudflare.md#verifyturnstile`).
  - `cookie.name` is the base name of the session cookie and of its `_pending` nonce cookie; a
    `cairn_` prefix belongs to the engine and throws (f:4cw5dk).
  - `deliver` sends the code over the site's transport. The example site's `deliver` is a capture
    transport that refuses unless `CAIRN_DEV_BACKEND` is `'1'`, so its module is not the pattern
    for this member (f:rv9gdc).
- **Obligations,** a lead-in sentence and a three-item list: three of these functions carry an
  obligation the factory cannot check. `normalize` must be idempotent, canonical per identity,
  and injective across people, since a lossy one maps two people onto one rate budget; `lookup`'s
  subject must be stable and canonical per person; `challenge` must actually verify a human,
  since it is the whole economic bound on guessing a code (f:ez788q, f:pa2hqh). Link
  `docs/reference/auth-channel.md#config-obligations` (`no-claim`).
- **Optional members,** one sentence and no per-option detail: `limits` tunes the code,
  throttle, and session budgets within clamps, and `rateLimit` adds back pressure on `request`
  and `confirm` that is never a security control (f:kl716k, f:ybg62t; links
  `docs/reference/auth-channel.md#defaults-and-clamps` and
  `docs/reference/auth-channel.md#rate-limiting`, `no-claim`). Two plan notes, not page
  sentences: `verify` belongs to "End a removed member's sessions", and `kind` is not named on
  the page (the option map excludes it). The construction throw on an out-of-range limit lives in
  "Resolve a failed setup", step 4, where a reader meets it.
- **Hand-off:** the channel returns `actions`, `resolveSubject`, and `revokeSessions`, and ships
  no route or UI (f:q7fj6p), so the next sections build them.

#### 4c. Build the login route

- Heading: `### Build the login route`
- **Takes:** The channel ships no route, so the login page is the site's own: the example site folds
  request and confirm onto `/members/login` as two named form actions that pass the request event
  to the channel's actions and switch on the outcome each returns. (f:q7fj6p, f:265s4t)
- **Steps,** a numbered list of four:
  1. In `src/routes/members/login/+page.server.ts`, add a `load` that redirects a visitor who
     already has a session to `/members` (f:265s4t).
  2. In the same file, add a `request` action that passes the event to `actions.request` and
     answers `fail(400, ...)` on any outcome but `sent` (f:265s4t).
  3. In the same file, add a `confirm` action that passes the event to `actions.confirm`,
     redirects to `/members` on `confirmed`, and answers `fail(400, ...)` otherwise (f:265s4t).
  4. In `src/routes/members/login/+page.svelte`, add a request form that posts a `contact` field
     with the Turnstile widget, and a confirm form that posts a `code` field (f:265s4t).
- **Explanation after the steps,** opening with a sentence tying it to the outcomes the actions
  switch on: a wrong code answers `bad-code` and mints no session, and a false or thrown
  challenge answers `challenge-required` without minting, which the form shows as a retry
  (f:vo4m61). Every outcome's meaning is on the `ChannelRequestOutcome` and
  `ChannelConfirmOutcome` rows of `docs/reference/auth-channel.md` (`no-claim` link).
- **Hand-off:** a confirmed code lands on `/members`, which the next section gates.

#### 4d. Gate the member area

- Heading: `### Gate the member area`
- **Takes:** A channel session never populates `locals.cairnEditor`, so the member area is the
  site's own routes outside `/admin`, and each one resolves the subject with `resolveSubject` in
  its own `load`. (f:q7fj6p)
- **Steps,** a numbered list of two:
  1. In `src/routes/members/+page.server.ts`, add a `load` that calls `resolveSubject` and
     redirects to `/members/login` when it returns `null` (f:265s4t).
  2. In the same file, add a `logout` action that calls `actions.logout` and redirects to the
     login page (f:265s4t).
- **Explanation after the steps,** opening with a sentence tying it to the subject: the subject
  is the string `lookup` returned, so the page loads the member's own records by it from the
  site's store (f:dtz8oa); logout deletes the session cookie and that one session's row and
  leaves the member's other sessions alone (f:gubeex).
- **Hand-off:** ending every session of a member the site removes is the next task.

#### 4e. End a removed member's sessions

- Heading: `### End a removed member's sessions`
- **Takes:** A channel session lasts 30 days by default, and besides the member's own logout, two
  members end one early: `verify`, consulted when `resolveSubject` resolves the session, and
  `revokeSessions`, which the site calls when it removes someone. (f:u3qhel, f:dtz8oa, f:1rstld)
- **Steps,** a bulleted list of two alternatives, with a lead-in saying a site uses either or
  both:
  - To check the roster on every resolution, in the channel module add a `verify(subject, { env })`
    that returns `false` for a subject no longer on the roster (f:dtz8oa).
  - To end sessions at the moment of removal, in the site's own removal code call
    `revokeSessions(db, subject)` with the channel's binding (f:1rstld).
- **Explanation after the steps,** opening with a sentence tying it to the two choices: a `false`
  from `verify` destroys the session row, while a throw refuses only that resolution and keeps
  the row (f:dtz8oa); `verify` takes the same `{ env }` context as `lookup` and never reads
  request data (f:ffskeq); `revokeSessions` ends every session for that identity at once
  (f:1rstld). It takes a binding rather than an event, so a cron trigger or queue consumer can
  call it; that note stays on `docs/reference/auth-channel.md#createauthchannel` (`no-claim`
  link).
- **Hand-off:** the channel is complete; a test proves it on Node.

#### 4f. Test the channel on Node

- Heading: `### Test the channel on Node`
- **Takes:** `createChannelDb`, exported from `@glw907/cairn-cms-dev`, applies the channel's
  migration to an in-memory SQLite database and returns a D1-shaped double, so a vitest run on
  Node can drive the channel's actions with no Worker. (f:0l7si2, f:fcqs22)
- **Steps,** a numbered list of three:
  1. In `vitest.config.ts`, confirm that `test.server.deps.inline` lists `@glw907/cairn-cms`, as
     the scaffold's config does, so a test's mock of `cloudflare:workers` reaches the engine's own
     import (f:1stlyv).
  2. In `src/lib/server/member-channel.test.ts`, write a test that mocks `cloudflare:workers`,
     builds the double from `migrations-members/0000_channel.sql`, and drives `actions.request`
     for a contact on the roster (f:1stlyv, f:nv475y, f:0l7si2, f:uci4pa).
  3. In the project directory, run the test with `npx vitest run` (`no-claim`).
- **The test file, constraints from the verified run** (the drafter writes the code; these are
  its acceptance criteria):
  - The mock supplies `env` and a `waitUntil` that collects promises, held in `vi.hoisted` so the
    hoisted mock factory can reach them, since the engine reads every binding and `waitUntil`
    from `cloudflare:workers` (f:nv475y, f:1stlyv).
  - The double goes on the mocked `env` as `MEMBER_DB`, built from the site's own copy of the
    migration, the file its binding applies (f:0l7si2, f:uci4pa).
  - The channel under test keeps the module's config shape and stands in only for the two
    members that leave the Worker: a `deliver` that records the code and a `challenge` that
    passes. A `lookup` and `normalize` the module exports may be reused.
  - The event carries a `localhost` URL, a POST whose form holds `contact`, an `Origin` header
    equal to the URL's origin, `getClientAddress`, and a `cookies` object, because every action
    refuses a mismatched `Origin` or plain http outside a local host (f:wu8x70), and `request`
    reads the client address (stated in code only; the signature note stays on
    `docs/reference/auth-channel.md#createauthchannel`).
  - After awaiting the collected promises, the test asserts the outcome `sent` and one recorded
    8-digit code (f:we2lmp).
  - The drafter reads `src/tests/unit/worker-wait-until.test.ts`, the engine's own run of this
    pairing, for the event shape.
- **Explanation after the steps,** opening with a sentence tying it to where the test can run:
  the double runs only on Node, since under workerd `node:sqlite` resolves but the database
  constructor throws, so `wrangler dev` reads the local D1 database that "Provision the channel
  database" migrated instead (f:l2xruc).
- **Hand-off:** with the test passing, the channel is ready to deploy.

#### 4g. Deploy the channel

- Heading: `### Deploy the channel`
- **Takes:** The deployed site needs the channel's migration on the remote database and the
  Turnstile secret as a Worker secret before the code that reads them goes live. (f:xxtooz,
  f:86h9o6)
- **Steps,** a numbered list of three, in that order so the schema and the secret exist before
  the code that reads them ships:
  1. In the project directory, apply the channel migration to the remote database with `npx
     wrangler d1 migrations apply MEMBER_DB --remote` (f:xxtooz, f:uci4pa).
  2. In the project directory, store the Turnstile secret key as a Worker secret under the name
     the module reads, with `npx wrangler secret put TURNSTILE_SECRET` (f:86h9o6).
  3. In the project directory, build the site and deploy it with `npm run build` and `npx wrangler
     deploy`, as the tutorial's deploy step does (`no-claim`; link
     `docs/extend/add-cairn-to-a-sveltekit-app.md#deploy-a-change`).
- **Explanation after the steps,** one sentence tying it to step 2: `wrangler secret put` creates
  and deploys a new Worker version at once, so the secret is live before step 3 ships the code
  that reads it (f:86h9o6).
- **Hand-off:** the deployed site is ready to verify.

#### 4h. Verify a member signs in to the member area

- Heading: `### Verify a member signs in to the member area`
- **Takes:** A working channel signs a member in on the deployed site with a code from your
  transport, lands them on `/members`, and signs them out again. (f:265s4t)
- **Steps,** a numbered list of four checks in order:
  1. In the roster store that `lookup` reads, confirm that it holds a contact you can receive a
     code at, such as your own, and add one as a test member if it does not, since `lookup`'s
     answer decides membership (f:dtz8oa, f:cf1avu).
  2. On the deployed site, at `/members/login`, request a code for that contact (f:265s4t).
  3. Enter the code your transport delivered, and confirm that the page redirects to `/members`
     (f:265s4t).
  4. On `/members`, sign out, confirm that the login page returns, and confirm that `/members`
     now redirects to it (f:265s4t).
- **Hand-off:** a failed check goes to "Resolve a failed setup" (in-page link, `no-claim`).

### 5. Resolve a failed setup

- Heading: `## Resolve a failed setup`
- **Takes:** A role's setup fails on `/admin/editors` or at the home screen, and a channel's at
  construction or at the challenge, so check the symptoms in that order. (f:nj0nfm, f:rn62i1,
  f:7n28wc, f:vo4m61; the anatomy's lead-in to ordered checks, cited because it names
  `/admin/editors`)
- **Steps,** one numbered list of ordered checks, a conditional step stating its condition first:
  1. If adding a person with the new role fails on `/admin/editors`, apply `0001_roles.sql` to
     `AUTH_DB` as "Add the role's people" does: until that migration runs, the roster holds only
     owner and editor (f:rn62i1).
  2. If the person lands on the welcome screen instead of the home screen, check that the
     deployed vocabulary declares the role with a `home`: a role the vocabulary omits resolves to
     `none`, and a `none` role with no `home` gets the welcome screen (f:zjglk8, f:7n28wc).
  3. If the home screen answers 403 to the role, replace `requireAccess` in its `load` with the
     role check from "Build the role's home screen", since the access map refuses every `none`
     session (f:p1xmp5, f:8anql1).
  4. If the channel module throws when it first loads, read the construction error: the factory
     throws on a missing required function, an empty or `cairn_`-prefixed cookie name, and an
     out-of-range or non-integer limit (f:vo4m61, f:4cw5dk, f:kl716k).
  5. If every code request answers `challenge-required`, check that `TURNSTILE_SECRET` is set
     where the running Worker reads it (`.dev.vars` under `wrangler dev`, the Worker secret on the
     deployed site), and check the token field your `challenge` reads: `verifyTurnstile` returns
     `false` on every failure rather than throwing, and a false challenge answers
     `challenge-required` (f:86h9o6, f:69xbyh, f:vo4m61).
  6. Otherwise, work through `docs/extend/debug-your-site.md` (`no-claim`), the last step.
- **Hand-off:** See also.

## Ending

### 6. See also

The anatomy's ending: related how-to guides, concept pages, and the limitations the page leaves
out, with the recovery link not repeated.

- Heading: `## See also`
- **Takes:** The following pages cover the seams and limits around a second group. (`no-claim`,
  the list's lead-in)
- **Links,** one line each, five:
  - `docs/extend/security-model.md#the-auth-channels-threat-surface` covers the channel's threat
    surface and the hazards a site's `deliver` can introduce (the outline's crossLink to
    security-model).
  - `docs/extend/restrict-admin-access.md` narrows which editor-capability roles reach which
    admin screens.
  - `docs/extend/arrange-the-admin-sidebar.md` arranges the rest of the sidebar.
  - `docs/reference/auth-channel.md` states every channel member, default, clamp, and outcome.
  - `docs/reference/core.md#roles` states the role vocabulary and how each capability resolves.

## Dispositions, every fact id

`carried` names the section the fact is placed under (its primary home first when it is cited in
more than one). `cut` gives the reason; a subordinated fact's reason names the reference page or
entry that states it, opened and read before it was named. 43 ids received: 39 carried, 4 cut (1
of them subordinated). 14 ids added by this plan for steps the page cannot state without them,
each read before it was placed: twelve `[verified]` bullets (f:rn62i1, f:xxtooz, f:nj0nfm,
f:p1xmp5, f:8anql1, f:xbjxit, f:ys1iq1, f:altcjp, f:bvfs3e, f:1stlyv, f:nv475y, f:wu8x70), plus
two added by the structural-edit revision for the secret and deploy steps: f:86h9o6
(`[external: Cloudflare]`, where `wrangler dev` and a deployed Worker read a secret) and f:nls26c
(`[verified]`, the scaffold keeps `.dev.vars` out of git).

| Fact | Disposition | Section, or reason |
| --- | --- | --- |
| f:4673n6 | carried | Declare the role (step 1 and the `none` sentence); Choose the mechanism (sign-in and builds rows); Sign the group in with a role; Verify the role signs in to its home screen (steps 2 and 5); Introduction (the content-editing redirect) |
| f:kqcyv1 | cut | Restates the welcome branch of f:7n28wc, which "Declare the role" carries; the welcome screen's own wording is no step's concern |
| f:hcjb3o | carried | Add the role's people (Takes, steps 3 and 4); Choose the mechanism (roster row, recommendation) |
| f:we2lmp | carried | Sign the group in through a channel (Takes); Choose the mechanism (sign-in row); Test the channel on Node (the 8-digit assertion) |
| f:rcpe0n | carried | Provision the channel database (Takes, step 3); Choose the mechanism (sessions row); Write the channel module (`resolveDb`) |
| f:41kl6q | carried | Write the channel module (the step's six required members) |
| f:ffskeq | carried | Write the channel module (`lookup`); Choose the mechanism (roster row); End a removed member's sessions (`verify`) |
| f:pa2hqh | carried | Write the channel module (obligations: the consequences) |
| f:6ab2z6 | carried | Provision the channel database (step 2; the idempotence sentence) |
| f:fcqs22 | carried | Before you begin (the test precondition); Test the channel on Node (Takes) |
| f:7n28wc | carried | Declare the role (the landing sentence); Choose the mechanism (landing row, recommendation); Verify the role signs in to its home screen (step 3); Resolve a failed setup (step 2) |
| f:5t6hz6 | carried | Build the role's home screen (Takes, step 2, the `locals` sentence); Choose the mechanism (sessions row); Sign the group in with a role |
| f:16paho | carried | Show the home screen in the sidebar (Takes, step, validation sentence); Verify the role signs in to its home screen (step 4) |
| f:dtz8oa | carried | Write the channel module (`lookup`); End a removed member's sessions (Takes, the `verify` step and sentence); Gate the member area (the subject sentence); Verify a member signs in to the member area (step 1, the roster contact); Choose the mechanism (roster row, recommendation) |
| f:mfmmof | cut | The member area outside `/admin` cannot lean on it: the admin toolkit's daisyUI classes are styled only inside `CairnAdminShell` (the rejected f:lncjdr and the page-inputs friction entry record it), and inside `/admin` the home screen's composition belongs to `docs/extend/add-a-custom-admin-screen.md`; stating it here invites the unstyled member-area reuse |
| f:5rkxfp | carried | Provision the channel database (Takes, the sibling-directory sentence); its marker fallback left to `docs/reference/auth-channel.md#the-packaged-migration` |
| f:tnvu0a | cut | Restates f:fcqs22's missing runtime guard; its `node:sqlite` unflag point (22.13) sits below the declared floor of 24 that the page names, so stating both floors hands the reader a hedge no step depends on (the page-inputs friction entry already records the two floors) |
| f:q7fj6p | carried | Gate the member area (Takes); Build the login route (Takes); Write the channel module (hand-off); Sign the group in through a channel (Takes); Choose the mechanism (sessions, landing, builds rows, recommendation) |
| f:vo4m61 | carried | Build the login route (the outcomes sentence); Resolve a failed setup (steps 4 and 5) |
| f:b3l3t0 | carried | Choose the mechanism (Takes, roster row); Introduction (the two mechanisms named) |
| f:nguseg | carried | Choose the mechanism (the domain sentence); Introduction (the not-covered domain item) |
| f:nz890r | carried | Introduction (the default the page starts from) |
| f:cf1avu | carried | Write the channel module (Takes); Sign the group in through a channel (Takes); Choose the mechanism (sign-in, builds rows); Before you begin (the transport and roster precondition); Verify a member signs in to the member area (step 1, the roster store) |
| f:1rstld | carried | End a removed member's sessions (Takes, the `revokeSessions` step and sentence) |
| f:gubeex | carried | Gate the member area (the logout sentence) |
| f:rv9gdc | carried | Write the channel module (the `deliver` bullet, the example site's capture transport) |
| f:ez788q | carried | Write the channel module (obligations: the three duties); Before you begin (the Turnstile precondition) |
| f:4cw5dk | carried | Write the channel module (`cookie.name`); Sign the group in through a channel (the example's cookie); Resolve a failed setup (step 4) |
| f:kl716k | carried | Write the channel module (the one optional-members sentence, `limits`; per-field detail linked to `docs/reference/auth-channel.md#defaults-and-clamps`); Resolve a failed setup (step 4, the construction throw) |
| f:ybg62t | carried | Write the channel module (the one optional-members sentence, `rateLimit` as back pressure, never a security control; its `resolve`, `key`, and degrade-to-open detail linked to `docs/reference/auth-channel.md#rate-limiting`) |
| f:pvs115 | carried | Declare the role (Takes, step 1, the `home` sentence) |
| f:265s4t | carried | Build the login route (Takes, steps 1 to 4); Gate the member area (steps 1 and 2); Verify a member signs in to the member area (Takes, steps 2 to 4); Sign the group in through a channel (the example's routes) |
| f:0l7si2 | carried | Test the channel on Node (Takes, step 2, the double constraint) |
| f:uci4pa | carried | Provision the channel database (steps 2 to 4, the `--local` apply); Deploy the channel (step 1, the binding name); Test the channel on Node (the schema file); Sign the group in through a channel (the example's binding) |
| f:dbaklx | carried | Declare the role (the keep-`owner` sentence) |
| f:zjglk8 | carried | Declare the role (the keep-`editor` sentence); Resolve a failed setup (step 2) |
| f:2zytgf | carried | Declare the role (Takes, step 1) |
| f:4xrx5f | carried | Declare the role (Takes, step 2, the guard-default sentence) |
| f:hwffph | carried | Verify the role signs in to its home screen (step 1) |
| f:l2xruc | carried | Test the channel on Node (the Node-only sentence); Provision the channel database (step 4, `wrangler dev` reads the local database) |
| f:lccuuc | cut | Subordinated to `docs/reference/auth-channel.md#the-packaged-migration`, which states the four tables, the never-share-a-`migrations_dir` rule, and the lazily provisioned per-deployment identity salt; the page's never-share sentence carries f:rcpe0n and f:5rkxfp instead, and links that section |
| f:u3qhel | carried | End a removed member's sessions (Takes, the 30-day session default); the full defaults table stays on `docs/reference/auth-channel.md#defaults-and-clamps`, linked from Write the channel module |
| f:69xbyh | carried | Write the channel module (`challenge`); Resolve a failed setup (step 5, the secret check); its `ip` rule left to `docs/reference/cloudflare.md#verifyturnstile` |
| f:rn62i1 | carried (added) | Add the role's people (Takes, step 1); Resolve a failed setup (step 1) |
| f:xxtooz | carried (added) | Add the role's people (steps 1 and 2); Deploy the channel (Takes, step 1, the `--remote` apply); Provision the channel database (step 4, the `--local` apply) |
| f:nj0nfm | carried (added) | Add the role's people (steps 4 and 5); Before you begin (the owner precondition) |
| f:p1xmp5 | carried (added) | Build the role's home screen (Takes, the `requireAccess` and action sentences); Show the home screen in the sidebar (the access-map sentence); Resolve a failed setup (step 3) |
| f:8anql1 | carried (added) | Build the role's home screen (step 2, the `requireAccess` sentence); Resolve a failed setup (step 3) |
| f:xbjxit | carried (added) | Build the role's home screen (the action sentence) |
| f:ys1iq1 | carried (added) | Show the home screen in the sidebar (the step's location) |
| f:altcjp | carried (added) | Show the home screen in the sidebar (the access-map sentence) |
| f:bvfs3e | carried (added) | Show the home screen in the sidebar (the never-authorization sentence, first clause only) |
| f:1stlyv | carried (added) | Test the channel on Node (steps 1 and 2, the mock constraint) |
| f:nv475y | carried (added) | Test the channel on Node (step 2, the mock constraint) |
| f:wu8x70 | carried (added) | Test the channel on Node (the event constraint) |
| f:86h9o6 | carried (added) | Deploy the channel (Takes, step 2, the deploy-at-once sentence); Write the channel module (step 2, the `.dev.vars` secret and its reason); Resolve a failed setup (step 5, where the running Worker reads the secret) |
| f:nls26c | carried (added) | Write the channel module (step 2, keep `.dev.vars` out of git as the scaffold's `.gitignore` does) |

## Friction filed

Two entries in `docs/internal/docs-friction-log.md`, filed by this plan step on 2026-10-07, none
blocking the page:

1. A `none`-capability role's own screen cannot use the access map or `createSectionAction`:
   `canReach` refuses every `none` session, so the gating `docs/extend/add-a-custom-admin-screen.md`
   teaches 403s the role the screen exists for, and a map rule for the screen's href hides its
   sidebar link from that role, while `RoleDeclaration.home` and `navLayout` `roles` both admit
   it. The page states the constraint and has the screen check the role by hand.
2. A role vocabulary beyond owner and editor depends on `0001_roles.sql` with no check: on a
   database without it, `/admin/editors` validates the new role and then meets `0000_auth.sql`'s
   `CHECK` constraint as an unhandled insert failure. The page puts the migration beside the add
   step and gives the failure a check, without naming the error's shape.

One more entry, filed by the structural-edit revision on 2026-10-07, not blocking the page:

3. An unset Turnstile secret answers every code request `challenge-required` with nothing naming
   the secret: construction checks only that `challenge` is a function, `verifyTurnstile` logs a
   blank secret with the same `invalid_input` reason as a blank token, and the factory's TSDoc
   example passes `verifyTurnstile` directly as `challenge`. The page's failure check names both
   the secret and the token field, and its two secret steps rest on the name the sample fixes.

The three page-inputs entries for this page (the `createChannelDb` recipe, the two `rateLimit`
shapes, and the admin toolkit outside the shell) stand and are not refiled. The first of them
says the page cannot show a verified test recipe; the scratch run recorded at the top of this
plan verified one, and the conductor may narrow that entry to its remaining point (no in-repo
consumer test and the two Node floors).

## Could not do

- No fact records that a channel action answers `unavailable` when `resolveDb` returns no
  binding or the binding's schema version does not match
  (`src/lib/auth-channel/factory.ts:625-640`, `:685`, `:706`, `:899`;
  `docs/reference/auth-channel.md`, the `resolveDb` field). It is the likeliest first-run
  failure (a migration not applied), so the failure section would carry it as a step; without
  the fact, the page names `unavailable` nowhere and the login route's outcome sentence links
  the reference rows instead.
- No fact records that the example site's channel `challenge` is a CI stand-in,
  `insecureTestChallenge` (`examples/showcase/src/members/channel.ts:31-41`), so the page names
  only the capture transport's divergence (f:rv9gdc) and its sample uses `verifyTurnstile`.

## Drafting constraints

- The introduction is the framing step's, from the three parts above; no introduction sentence
  opens on the page or names a position on it.
- Every section heading is a bare infinitive in sentence case, except "Before you begin" and "See
  also"; the two path headings stay parallel.
- Each step names its location before its action and holds one action; a conditional step states
  its condition first; a one-step procedure is a single bulleted item.
- The role path never shows `requireAccess`, `createSectionAction`, or an access-map rule for the
  home screen; every sentence about the map on this page is a constraint on the role's screen,
  and the map itself is linked, never configured.
- The channel path states no threat claim: no roster-oracle, enumeration, or log-redaction
  sentence. `rateLimit`'s "never a security control" is the one security word, from f:ybg62t.
- The channel sample never copies the example site's `captureDeliver` or `insecureTestChallenge`.
- The channel sample's `challenge` reads `env.TURNSTILE_SECRET`, the one name the `.dev.vars` step
  and the `wrangler secret put` step store; the sample's `Env` declares it, as the reference's
  worked example does.
- Both paths end the same way: a deploy step, then a verification on the deployed site. No step
  on the page applies the channel migration to the remote database before "Deploy the channel".
- On the page, the example site is "the repository's example site, `examples/showcase`" at its
  first mention and "the example site" after it, as `docs/extend/add-a-custom-admin-screen.md`
  names it; the bare word "showcase" is a directory name, not a page noun.
- The test sample follows the constraints in "Test the channel on Node" exactly; it is the shape
  the scratch run passed.
- `kind` and the per-field `limits` defaults (other than the 30-day session default) appear
  nowhere on the page.
- Files are named in code spans in this plan; on the page they are links where the anatomy wants
  a link.
- R5 scoped-read close (2026-10-07): the troubleshooting lead-in, the construction-error sentence (now "missing" cookie name and "non-positive" limit, both stated by `f:4cw5dk` and `f:kl716k`), and the member-area gate lead-in were reworded; the gate lead-in is two sentences, both citing `f:q7fj6p`.
- R5 final-read redraft (2026-10-07): the final reader's four blocking findings are folded. Every
  site import is `#lib/<file>.js` (`f:pgeeq3`); "Write the channel module" now opens with the
  `findMemberId` and `sendCodeEmail` steps (`f:dbh3aj`) and adds an `npx wrangler types` step
  (`f:pe4vuc`); "Gate the member area" adds the `+page.svelte` sign-out step and component
  (`f:k0cryh`). Advisories folded: both hooks handles take `{ roles }` and keep `access`
  (`f:7cv105`, `f:f21bcz`), `cairn doctor` runs after a build (`f:6oopkt`), both member routes
  export `prerender = false` (`f:k0cryh`; the custom `/admin/staff` screen takes none, since no
  fact or example screen sets it), the Turnstile address is optional (`f:yd9ytp`), and the
  Vitest inline step adds the entry if missing. The page's code blocks typecheck clean and its
  test passes in the reader's scratch showcase.
