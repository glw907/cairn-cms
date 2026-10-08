# Framing record: Add a second sign-in group

Agent-facing; drives the introduction of `docs/extend/add-a-second-sign-in-group.md` only; the body
follows the page plan (`docs/internal/briefs/extend/add-a-second-sign-in-group.plan.md`). Written
2026-10-07 by the framing step of the docs page chain (stage 2a).

## Who arrives, from where, and why

1. **The developer with a second group in mind, undecided.**
   - Arrives from: the extend index's "Auth and access" group in `docs/extend/README.md` (the page
     joins it beside Security model and Replace magic links), a search for a member login or a
     second login on a cairn site, or an old link to `docs/extend/add-a-second-audience.md`, which
     the outline redirects here.
   - Came for: a way to sign in staff, members, or another group beside the editors, and
     which mechanism to use.
   - Knows: the site, SvelteKit, and that editors sign in by magic link.
   - Lacks: that cairn offers exactly two mechanisms, where each lives (inside `/admin` or on the
     site's own routes; `AUTH_DB` or a database of the group's own), and that what the group is
     stays the site's code.
2. **The developer sent from Restrict admin access.**
   - Arrives from: that page's roles section, which sends a role that signs in but reaches no
     engine content here, and its See also (`docs/internal/briefs/extend/restrict-admin-access.plan.md:155,206-207,540`).
   - Came for: what a `none`-capability role does and how to give it a home.
   - Knows: the role vocabulary, capability as the floor, `defineRoles`, the access map.
   - Lacks: that the map admits no `none` session, so the role's screen gates by hand (the body's
     concern); that the role's people need the roles migration and an owner's add.
3. **The developer sent from the security model.**
   - Arrives from: `docs/extend/security-model.md:48` (scope routing), `:469` (closing "Limits of the
     auth channel"), and `:514` (How-to guides).
   - Came for: building the channel whose threat surface they just read.
   - Knows: the channel's governing rule, the dev-transport hazard, the threat catalogue.
   - Lacks: the build itself: the binding, the migration, the module, the routes, the test, the
     deploy.
4. **The developer sent from Replace magic links with Cloudflare Access.**
   - Arrives from: that page's introduction (`docs/extend/replace-magic-links-with-cloudflare-access.md:34-36`,
     "a second population with a separate sign-in, beside editors who keep magic links") and its
     See also (`:412`).
   - Came for: signing in people who are not editors, after learning identity mode replaces the
     editors' sign-in whole.
   - Knows: the guard, the `identity` seam, Access.
   - Lacks: the role-or-channel choice, and the assurance that editors keep their magic link.
5. **The developer arriving from the reference or the example site's code.**
   - Arrives from: `docs/reference/auth-channel.md`, whose migrations-directory sentence the page
     restores a pointer from (outline rearm 60); the example site's source comments in
     `examples/showcase/src/members/channel.ts`, `capture-transport.ts`, `src/app.d.ts`,
     `src/routes/members/`, `wrangler.jsonc`, and `e2e/members.spec.ts`, which name this page as the
     documented pattern (rearms 111 to 121); and, one step removed, a scaffolded site's agent that
     the shipped guidance routes to the reference
     (`templates/waymark/.claude/skills/cairn-extend/SKILL.md:33`).
   - Came for: the assembled walkthrough that one reference entry or one exemplar file does not
     give, and which parts of the example are development stand-ins.
   - Knows: `createAuthChannel`'s config members, or the example code.
   - Lacks: the build order, the deploy, the verified test recipe, and the role alternative, which
     neither the reference nor the guidance names. This reader also meets a new name: the
     reference and the guidance say "second audience" (friction filed).

Readers likely in the wrong place, each with the page they belong on:

- A developer whose second group writes content (volunteers who write posts, a webmaster who runs
  media). `none` capability closes the content screens (f:4673n6), so that group signs in at editor
  capability and an access map narrows it: `docs/extend/restrict-admin-access.md`.
- A developer whose organization wants the editors themselves to sign in through its identity
  provider: `docs/extend/replace-magic-links-with-cloudflare-access.md`.
- A developer assessing the channel's threats: `docs/extend/security-model.md#the-auth-channels-threat-surface`.
- A developer looking for how cairn models members, signups, or a directory: no cairn page; the site's
  own code (f:nguseg).

## Background the page rests on

1. **Why the default is owners and editors.** cairn's own sign-in exists only to gate the admin,
   and its zero-config identity is the owner/editor pair on the emailed magic link (f:zxdoaf,
   f:nz890r). cairn never names or models a domain actor beyond those two; members, customers,
   assets, and a directory are the site's to build (f:nguseg). So a second group is the site's to
   define, and cairn's part is signing it in.
2. **The general model: two mechanisms.** A declared role puts the group in the editors' own roster
   in `AUTH_DB` at `none` capability: the same magic link, the engine's content and roster screens
   closed, and `/admin` sending the person to the role's `home` or a welcome screen (f:b3l3t0,
   f:4673n6, f:7n28wc). A channel built with `createAuthChannel` is a separate login over a
   numeric code, with its own subject, D1 binding, and sessions, and its sessions never populate
   `locals.cairnEditor` (f:b3l3t0, f:we2lmp, f:rcpe0n, f:q7fj6p).
3. **Why the channel exists.** The `/auth-channel` subpath exists for a site's own login for a group
   the owner/editor sign-in was never meant to model. The factory owns every security discipline
   (code minting and consumption, budgets, sessions, revocation), and the site supplies delivery,
   roster lookup, identifier shape, and a bot challenge (f:qqy4uq, filed by this step; f:cf1avu).
   The channel's database is never `AUTH_DB`, by design, so the group's roster and sessions stay
   physically apart from the editors' store (f:rcpe0n).
4. **Why a role exists.** It reuses the editors' sign-in, sessions, and roster screen for people who
   need a screen under the admin and no content: an owner adds them on `/admin/editors`, and
   `/admin` sends them to the role's `home` (f:4673n6, f:hcjb3o, f:7n28wc, f:pvs115).
5. **Where SvelteKit fits.** The role's home is a SvelteKit route under `/admin`, the custom-screen
   seam. The channel ships no route or UI, so its login page and member area are the site's own
   SvelteKit routes outside `/admin`: form actions call the channel's actions, and a `load` calls
   `resolveSubject` (f:q7fj6p, f:265s4t).
6. **Where Cloudflare fits.** Both mechanisms rest on D1. The role reuses `AUTH_DB` (f:b3l3t0); the
   channel needs a D1 binding and a migrations directory of its own (f:rcpe0n, f:5rkxfp). The
   example's bot challenge is Cloudflare Turnstile through `verifyTurnstile` (f:ez788q, f:69xbyh);
   the introduction leaves Turnstile to "Before you begin", since the factory requires only a
   challenge function and Turnstile is the example's choice.
7. **GitHub, left out on purpose.** A publish commits through the site's GitHub App with the
   signed-in editor as author (f:cjonmm). A `none` role reaches no content screen (f:4673n6) and a
   channel session never becomes an editor's (f:q7fj6p), so neither group commits anything, and
   the introduction does not name GitHub. A group that commits is the wrong-place reader routed to
   Restrict admin access.

## Place in the doc set

- **Group and neighbors.** "Auth and access", fourth of four: Security model (concept),
  Restrict admin access, Replace magic links with Cloudflare Access, then this page. On the index
  today only Security model and Replace magic links are listed; this page and Restrict admin
  access join in this run.
- **Links in, and why.** Replace magic links sends the reader who wants a second population beside
  magic-link editors (introduction and See also). Security model sends the reader building the
  channel it analyzes (outline crossLink: "Building the channel whose threat catalogue it
  carries"). Restrict admin access sends the reader with a `none`-capability audience (crossLink:
  "A none-capability role"). The reference and the example site's comments send the reader who
  wants the documented pattern (outline rearms 60 and 111 to 121). The old slug redirects here.
- **Links out.** Security model for the channel's threat surface (crossLink: "The channel's threat
  catalogue and obligations"); Restrict admin access for access maps; Replace magic links for the
  reverse wrong-place reader; Add a custom admin screen and Arrange the admin sidebar from the
  role path's body; Add cairn to a SvelteKit app for preconditions and the deploy step; the
  reference entries for every member and default.
- **What siblings own, so the opening is worded fresh.** Replace magic links opens on the
  magic-link default and why it is the default (zero config; `AUTH_DB` holds the roster, sessions,
  and tokens). Security model opens on people without GitHub accounts changing published content,
  and owns "floors, not ceilings". Add a custom admin screen opens on cairn's scope sentence
  (content and the admin frame, the rest to the developer through a thin seam). Restrict admin
  access opens on the role, capability, and access-map model. This page therefore opens on none of
  those: it opens on the reader's second group, states the default in one sentence as the people
  cairn's sign-in serves (those who work in the admin, f:zxdoaf), and does not define capability
  or the access map from scratch. It never repeats "floors, not ceilings" or the zero-config
  rationale.

## Intro plan

Three framing paragraphs, then the plan's bounds. The opening is a statement from the reader's
situation, never an imperative and never a sentence about the page; no sentence names a position
on the page. Wording is the drafter's; each item fixes the claim and its facts. A task-section
sentence stays under 26 words, so the drafter splits any item below that runs long.

1. **The reader's second group, and the default it meets.**
   - Opening: some sites need people besides editors to sign in, to reach screens or pages made
     for them. (`no-claim`: the reader's situation; the page opens on the job, with no invented
     cast.)
   - cairn's own sign-in exists to gate the admin, so out of the box it knows only the people who
     work there, owners and editors, and signs them in by an emailed magic link (f:zxdoaf,
     f:nz890r).
   - For a second group, cairn supplies the sign-in through one of two mechanisms, and the people
     themselves stay the site's: what a staff member or a member is, and the records kept about
     them, are the site's own code (f:b3l3t0, f:nguseg). If the drafter uses the phrase "A site's
     domain is the site's", the sentence must cite f:nguseg, its owner-tier key phrase. No "not X
     but Y" frame.
2. **The two mechanisms, where each sits, and why the channel exists.**
   - A declared role adds the group to the editors' own roster in `AUTH_DB`, the D1 database behind
     editor sign-in, at `none` capability. Its people sign in by the same magic link, find the
     engine's content screens closed, and land on a screen the site builds under `/admin`
     (f:b3l3t0, f:4673n6, f:7n28wc).
   - An auth channel, built with `createAuthChannel`, gives the group a login of its own: a numeric
     code sent over the site's own transport, sessions in a D1 database apart from `AUTH_DB`, and an
     area made of the site's own SvelteKit routes outside `/admin`, since a channel session never
     becomes an editor's (f:we2lmp, f:cf1avu, f:rcpe0n, f:q7fj6p, f:b3l3t0).
   - cairn ships the channel for people its owner/editor sign-in was never meant to model. The
     factory owns the login's security discipline, minting and consuming codes, rate budgets,
     sessions, and revocation, so the site supplies only the delivery, the roster lookup, and the
     check that a requester is human (f:qqy4uq, f:cf1avu).
3. **The contract, the running examples, and the decided reader.**
   - Contract, the anatomy's one-line contract inside the framing: whichever mechanism you choose,
     by the end the group signs in on your deployed site and lands in an area of its own
     (`no-claim`: the page's promise; both paths end in a deploy and a verification on the
     deployed site, per the plan).
   - The running examples: a `staff` role whose `home` is `/admin/staff`, the declaration the
     roles reference uses (f:4673n6, f:pvs115), and the members channel in the repository's example
     site, `examples/showcase`, which signs members in at `/members/login` and gates `/members`
     (f:265s4t). First mention of the example site uses that full form, per the plan's drafting
     constraints.
   - The two mechanisms share no steps, so a developer who has already chosen, such as one sent
     here for a `none` role or for a channel, builds only that one (`no-claim`: a scope sentence for
     readers 2, 3, and 5).

Then the plan's bounds, as the plan's part 2 and part 3 set them:

4. **Prior knowledge** (plan part 2, unchanged): a site built through
   `docs/extend/add-cairn-to-a-sveltekit-app.md` or scaffolded by the setup command, so its hooks
   file, adapter module, `wrangler.jsonc` bindings, and applying a D1 migration are familiar;
   SvelteKit load functions and form actions; Vitest, for the channel's test.
5. **What the page leaves out** (plan part 3), each with the page to read instead, as sentences or
   a short list:
   - A group whose people write the site's content: `none` capability closes the content screens,
     so such a group signs in at editor capability and an access map narrows what it reaches,
     `docs/extend/restrict-admin-access.md` (f:4673n6). The page states only the one map constraint
     the role path needs, in "Show the home screen in the sidebar".
   - Signing the editors themselves in through the organization's identity provider:
     `docs/extend/replace-magic-links-with-cloudflare-access.md`.
   - The channel's threat surface and the hazards a site's `deliver` can introduce:
     `docs/extend/security-model.md#the-auth-channels-threat-surface`.

Facts the introduction draws on that the plan's dispositions table does not list, for the
drafter's brief: f:zxdoaf (owner tier, `docs/internal/facts/front-door.md`) and f:qqy4uq (filed by
this step, `docs/internal/facts/extend.md`).

## Departures from the plan's introduction

1. **The opening.** The plan's part 1 begins on the default ("A cairn site signs in two kinds of
   people out of the box, owners and editors, by the email magic link"). The framing opens on the
   reader's second group instead and states the default second, with its reason (cairn's sign-in
   exists to gate the admin, f:zxdoaf). Replace magic links already opens on the magic-link
   default, and the register asks the opening to start from the reader's situation.
2. **The site's model of the group.** The plan's fourth not-covered item moves into paragraph 1 as
   the reason cairn stops at sign-in (f:nguseg), so it reads as background, not as a scope line.
   The part still holds: the introduction states that the group's model stays the site's code.
   "Choose the mechanism" keeps its own domain sentence, as the plan sets it; the drafter words the
   two differently, the introduction's as the why and the section's as applying to both paths.
3. **The why behind the channel.** Paragraph 2's last item adds the channel's purpose and the
   factory's share of the work (f:qqy4uq, f:cf1avu), which the plan's three parts do not carry. The
   register's introduction ruling asks for why the thing exists, and the facts container held no
   purpose fact until this step filed f:qqy4uq.
4. **The decided reader.** Paragraph 3's last item tells a reader who arrives having chosen that the
   paths are independent, so readers 2, 3, and 5 learn early that the page answers them.
5. **The access-map item's wording.** The plan's first not-covered item keeps its content and link,
   reworded from the content-editing reader's situation so the wrong-place reader recognizes the
   case as theirs.
