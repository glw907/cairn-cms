---
page: Add a second sign-in group
type: task guide
exemplar: extenders/django-custom-management-commands/
---

# Add a second sign-in group

:::reader
**Who reads it.** A Svelte-fluent web developer building an organization's site on cairn's seams, who has a group of people besides the editors to sign in. Five arrivals:

1. **The developer with a second group in mind, undecided.** They arrive from the extend index's "Auth and access" group in `docs/extend/README.md`, where the page sits beside Security model and Replace magic links, from a search for a member login or a second login on a cairn site, or from an old link to `docs/extend/add-a-second-audience.md`, which the outline redirects here. They came for a way to sign in staff, members, or another group beside the editors, and for which mechanism to use. They know the site, SvelteKit, and that editors sign in by magic link. They lack that cairn offers two mechanisms, where each lives (inside `/admin` or on the site's routes; `AUTH_DB` or a database for the group), and that what the group is stays the site's code.
2. **The developer sent from Restrict admin access.** They arrive from that page's roles section, which sends a role that signs in but reaches no engine content here, and from its See also. They came for what a `none`-capability role does and how to give it a home. They know the role vocabulary, capability as the floor, `defineRoles`, and the access map. They lack that the map admits no `none` session by default, so the role's screen gates by hand, and that the role's people need the roles migration and an owner's add.
3. **The developer sent from the security model.** They arrive from `docs/extend/security-model.md` at its scope routing, at the close of "Limits of the auth channel", and from its How-to guides. They came to build the channel whose threat surface they just read. They know the channel's governing rule, the dev-transport hazard, and the threat catalogue. They lack the build itself: the binding, the migration, the module, the routes, the test, and the deploy.
4. **The developer sent from Replace magic links with Cloudflare Access.** They arrive from that page's introduction, which names "a second population with a separate sign-in, beside editors who keep magic links", and from its See also. They came to sign in people who are not editors, after learning that identity mode replaces the editors' sign-in whole. They know the guard, the `identity` seam, and Access. They lack the role-or-channel choice, and the assurance that editors keep their magic link.
5. **The developer arriving from the reference or the example site's code.** They arrive from `docs/reference/auth-channel.md`, whose migrations-directory sentence points here; from the example site's source comments in `examples/showcase/src/members/channel.ts`, `capture-transport.ts`, `src/app.d.ts`, `src/routes/members/`, `wrangler.jsonc`, and `e2e/members.spec.ts`, which name this page as the documented pattern; and, one step removed, from a scaffolded site's agent that the shipped guidance routes to the reference (`templates/waymark/.claude/skills/cairn-extend/SKILL.md:33`). They came for the assembled walkthrough that one reference entry or one exemplar file does not give, and for which parts of the example are development stand-ins. They know `createAuthChannel`'s config members, or the example code. They lack the build order, the deploy, the verified test recipe, and the role alternative, which neither the reference nor the guidance names. This reader also meets a new name, since the reference and the guidance say "second audience".

Readers likely in the wrong place, each with the page they belong on:
- A developer whose second group writes content, such as volunteers who write posts or a webmaster who runs media. `none` capability closes the content screens, so that group signs in at editor capability and an access map narrows it, in Restrict admin access. :fact[4673n6]
- A developer whose organization wants the editors themselves to sign in through its identity provider, in Replace magic links with Cloudflare Access.
- A developer assessing the channel's threats, in the security model's auth channel threat surface section.
- A developer looking for how cairn models members, signups, or a directory: no cairn page covers it, since that is the site's code. :fact[nguseg]

**Why they arrive:**
- They need staff, members, or another group to sign in beside the editors, and don't know which mechanism fits.
- They declared a `none`-capability role and need to give it a home screen.
- They read the channel's threat surface and now want to build the channel.
- They want a group beside magic-link editors without replacing the editors' sign-in.
- They read the auth channel reference or the example site's members code and want the assembled pattern.

**What they already know.** A site built through Add cairn to a SvelteKit app or scaffolded by `create-cairn-site`, so its hooks file, its adapter module, its Wrangler bindings, and applying a D1 migration are familiar; SvelteKit load functions and form actions; and Vitest, for the channel's test. The page explains none of these.

**What the page does for them:**
- It opens on the reader's situation, as a statement: some sites need people besides editors to sign in, to reach screens or pages made for them.
- cairn's sign-in exists to gate the admin, so by default it signs in only the people who work there, owners and editors, by an emailed magic link. :fact[zxdoaf] :fact[nz890r]
- For a second group, cairn supplies the sign-in through one of two mechanisms, and what a staff member or a member is, and the records kept about them, stay the site's code. :fact[b3l3t0] :fact[nguseg]
- A declared role adds the group to the editors' roster at `none` capability, in `AUTH_DB`, the D1 database behind editor sign-in. Its people sign in by the same magic link, find the engine's content screens closed to them, and land on a screen the site builds under `/admin`. :fact[b3l3t0] :fact[4673n6] :fact[7n28wc]
- An auth channel, built with `createAuthChannel`, gives the group a separate login instead: a numeric code sent over the site's transport, sessions in a D1 database apart from `AUTH_DB`, and an area made of the site's SvelteKit routes outside `/admin`, since a channel session never becomes an editor's. :fact[we2lmp] :fact[cf1avu] :fact[rcpe0n] :fact[q7fj6p] :fact[b3l3t0]
- The channel exists for people the owner and editor sign-in was never meant to model, such as members or customers. Its factory mints and consumes the codes and keeps the rate budgets, the sessions, and revocation, and the site supplies the delivery, the roster lookup, and the check that a requester is human. Under either mechanism, editors keep signing in by magic link. :fact[qqy4uq] :fact[cf1avu]
- The contract: whichever mechanism you choose, by the end the group signs in on your deployed site and lands in an area made for it. Both paths end in a deploy and a check on the deployed site.
- The running examples: a `staff` role whose `home` is `/admin/staff`, the declaration the roles reference uses, and the members channel in the repository's example site, `examples/showcase`, which signs members in at `/members/login` and gates the `/members` page. :fact[4673n6] :fact[pvs115] :fact[265s4t]
- What each path covers renders as a two-item list. The role path declares the role, builds its home screen and sidebar link, adds the role's people, and checks their sign-in.
- The channel path provisions a database, writes the channel module, and builds the login route and the member area. It ends a removed member's sessions with `verify` or `revokeSessions`, and it tests the channel on Node with Vitest and `createChannelDb` before the deploy. :fact[dtz8oa] :fact[1rstld] :fact[0l7si2] :fact[fcqs22]
- The two paths share no steps, so a developer who has already chosen, such as one sent here for a `none` role or for a channel, builds only that one.
- The bounds follow: the prior knowledge above, then the three subjects the page leaves to other pages, as a list, each item opening on the page that covers it.

**How the introduction runs.** Three framing paragraphs, then the bounds, with no heading. The opening is a statement from the reader's situation, never an imperative and never a sentence about the page, and no sentence names a position on the page. Each introduction sentence stays under 26 words. No "not X but Y" frame. A sentence that uses the phrase "A site's domain is the site's" cites `f:nguseg`, its owner-tier key phrase. :fact[nguseg]

**What it leaves to other pages:**
- Restrict admin access covers access maps and a group whose people write the site's content: such a group needs editor capability, since `none` capability closes the engine's content screens, and this page configures no access map. :fact[4673n6]
- Replace magic links with Cloudflare Access covers signing the editors themselves in through the organization's identity provider.
- The security model's auth channel section covers the channel's threat surface and the hazards a site's delivery function can introduce.
- The page states three access-map behaviors the role path meets, and no others. In Build the role's home screen, `requireAccess` and `canReach` admit a `none` role through an access-map key that lists it, the alternative gate. :fact[5sx6zl]
- In Show the home screen in the sidebar, an entry whose `href` no map key matches stays visible. :fact[altcjp]
- In Resolve a failed setup, a key matching the home path that does not name the role hides the link. :fact[altcjp] :fact[5sx6zl]
- The two action wrappers' access checks stay with Add a custom admin screen.
- The admin toolkit's rendering contract stays with the admin toolkit reference.
- The sign-in email's copy, branding, and sender stay with the tutorial's sign-in email section.
- The guard's scope over the `/admin` subtree stays with the `createAuthGuard` entry.
- Access-map declarations, coverage warnings, and their log events stay with Restrict admin access, the log events reference, and Debug your site.
- The editors' magic-link token path stays with the auth-crypto reference.
- `verifyTurnstile`'s limits and silent rejections stay with its reference entry.
- Which conditions no tool check raises stays with the `cairn doctor` reference.
- What the dev backend installs stays with the tutorial.
- The scaffold's migration set and file inventory stay with Scaffolded site files.
- The sidebar's group layouts stay with Arrange the admin sidebar.
- The roster-removal cascade stays with the auth store reference.

**Argument.** cairn signs a second group in through one of two mechanisms, and the choice decides every step after it. A declared role puts the group in the editors' roster in `AUTH_DB` at `none` capability: its people use the editors' magic link, the role is declared once on the adapter and read by the guard from the composed runtime, and `/admin` sends them to a screen the site builds, which checks the session's role itself. An auth channel built with `createAuthChannel` is a separate login over a numeric code, with its D1 binding, migration, cookie, and sessions that never become an editor's, so the site builds the login route and the member area outside `/admin` and supplies the delivery, the roster lookup, the normalizer, and the bot challenge the factory cannot. Either way cairn signs the people in and the site models them. Each path runs from declaration to a deploy and a check that the group signs in on the live site: the role on the staff example from the roles reference, the channel on the members channel of the repository's example site.

**Background:**
1. **Why the default is owners and editors.** cairn's sign-in exists only to gate the admin, and its zero-config identity is the owner and editor pair on the emailed magic link. cairn never names or models a domain actor beyond those two; members, customers, assets, and a directory are the site's to build. So a second group is the site's to define, and cairn's part is signing it in. :fact[zxdoaf] :fact[nz890r] :fact[nguseg]
2. **The general model: two mechanisms.** A declared role puts the group in the editors' roster in `AUTH_DB` at `none` capability: the same magic link, the engine's content and roster screens closed, and `/admin` sending the person to the role's `home` or the welcome view. A channel built with `createAuthChannel` is a separate login over a numeric code, with its subject, D1 binding, and sessions, and its sessions never populate `locals.cairnEditor`. :fact[b3l3t0] :fact[4673n6] :fact[7n28wc] :fact[we2lmp] :fact[rcpe0n] :fact[q7fj6p]
3. **Why the channel exists.** The `/auth-channel` subpath exists for a site's login for a group the owner and editor sign-in was never meant to model. The factory owns the security disciplines (code minting and consumption, budgets, sessions, revocation), and the site supplies delivery, roster lookup, identifier shape, and a bot challenge. The channel's database is never `AUTH_DB`, by design, so the group's roster and sessions stay physically apart from the editors' store. :fact[qqy4uq] :fact[cf1avu] :fact[rcpe0n]
4. **Why a role exists.** It reuses the editors' sign-in, sessions, and roster screen for people who need a screen under the admin and no content: an owner adds them on `/admin/editors`, and `/admin` sends them to the role's `home`. :fact[4673n6] :fact[nj0nfm] :fact[mbx6q1] :fact[7n28wc] :fact[pvs115]
5. **Where SvelteKit fits.** The role's home is a SvelteKit route under `/admin`, the custom-screen seam. The channel ships no route or UI, so its login page and member area are the site's SvelteKit routes outside `/admin`: form actions call the channel's actions, and a `load` calls `resolveSubject`. :fact[q7fj6p] :fact[265s4t]
6. **Where Cloudflare fits.** Both mechanisms rest on D1. The role reuses `AUTH_DB`; the channel needs a D1 binding and a migrations directory. The example's bot challenge is Cloudflare Turnstile through `verifyTurnstile`; the introduction leaves Turnstile to Before you begin, since the factory requires only a challenge function and Turnstile is the example's choice. :fact[b3l3t0] :fact[rcpe0n] :fact[5rkxfp] :fact[ez788q] :fact[69xbyh]
7. **GitHub, left out on purpose.** A publish commits through the site's GitHub App with the signed-in editor as author. A `none` role reaches no content screen and a channel session never becomes an editor's, so neither group commits anything, and the introduction does not name GitHub. A group that commits is the wrong-place reader routed to Restrict admin access. :fact[cjonmm] :fact[4673n6] :fact[q7fj6p]

**Place in the doc set:**
- Group and neighbors: "Auth and access", fourth of four: Security model (concept), Restrict admin access, Replace magic links with Cloudflare Access, then this page.
- Links in: Replace magic links sends the reader who wants a second population beside magic-link editors; Security model sends the reader building the channel it analyzes; Restrict admin access sends the reader with a `none`-capability role; the reference and the example site's comments send the reader who wants the documented pattern; the old slug redirects here.
- Links out: Security model for the channel's threat surface; Restrict admin access for access maps; Replace magic links for the reverse wrong-place reader; Add a custom admin screen and Arrange the admin sidebar from the role path's body; Add cairn to a SvelteKit app for preconditions and the deploy step; the reference entries for each member and default.
- What siblings own, so the opening is worded fresh: Replace magic links opens on the magic-link default and why it is the default; Security model opens on people without GitHub accounts changing published content, and owns "floors, not ceilings"; Add a custom admin screen opens on cairn's scope sentence; Restrict admin access opens on the role, capability, and access-map model. This page opens on none of those: it opens on the reader's second group, states the default in one sentence as the people cairn's sign-in serves, and does not define capability or the access map from scratch. It never repeats "floors, not ceilings" or the zero-config rationale. :fact[zxdoaf]

**Section order.** The sections follow the task-guide anatomy and the dependency between steps. Setup and the choice come first because the two paths share no step and a reader builds only one. The role path runs before the channel path, and each runs in dependency order from its declaration to a deploy and a check on the live site. Resolve a failed setup gathers both paths' failures, and See also closes the page.
:::

:::constraints
- The page carries the one-declaration change, the roles migration, `resolveDb` taking `createChannelDb`'s result with no cast, and the Turnstile missing-secret reason: the role declared once on the adapter and read by the guard from the runtime both handles take; the roles migration; `resolveDb` and the cast-free test; the missing-secret reason. :fact[4xrx5f] :fact[7cv105] :fact[f21bcz] :fact[mbx6q1] :fact[hwffph] :fact[q07rd5] :fact[rn62i1] :fact[xffr6i] :fact[ditn3e] :fact[thbxvf]
- Never tell the reader to pass `roles` or `access` to `createAuthGuard` or `devBackendHandle`, or to create `src/access.ts`. The vocabulary lives on the adapter, and the hooks step only confirms that both handles take `{ runtime }`; an older site's move is Upgrade cairn's.
- Never say that `requireAccess` refuses every `none` session whatever the map says, or that a map rule for the home path that names the role hides its sidebar link from the role; both are false, since a route rule naming a `none` role admits it. A key matching the home path that does not name the role does hide the link, which Resolve a failed setup states as a failure cause. The page configures no access map: the home screen checks the role, the map alternative is one sentence with a link, and the sidebar failure's fix for a site that already keeps a map routes to Restrict admin access. :fact[5sx6zl] :fact[altcjp]
- The test assigns `createChannelDb`'s result to the mocked env with no cast, typing the env's `MEMBER_DB` as `ChannelDatabaseLike`, a type the `@glw907/cairn-cms/auth-channel` subpath exports. The test's shape follows `src/tests/unit/auth-channel-resolve-db-type.test.ts` and `src/tests/unit/worker-wait-until.test.ts`. :fact[ditn3e]
- The channel sample never copies the example site's `captureDeliver` or `insecureTestChallenge`. Its `challenge` reads `TURNSTILE_SECRET`, the one name the `.dev.vars`, `.dev.vars.example`, and `wrangler secret put` steps store. The channel is typed over the generated `Cloudflare.Env`, as the example site's is, never over a local `Env` that omits a binding `lookup`, `deliver`, or `verify` reads. :fact[2ihgrk]
- Keep the headings of Provision the channel database and Write the channel module stable: `docs/reference/auth-channel.md` links both anchors.
- The See also links to the security model's channel section, Restrict admin access, and Replace magic links with Cloudflare Access also render in the introduction's not-covered list.
- On the page, the example site is "the repository's example site, `examples/showcase`" at its first mention and "the example site" after it; the scaffolder is `create-cairn-site` at first mention and the setup command after it; the group is always a second sign-in group, never a second audience or population.
- Each step names its location before its action and holds one action; a conditional step states its condition first and says who skips it. Show the home screen in the sidebar is a one-step procedure, a single bulleted item. The two removal steps in End a removed member's sessions are a bulleted list of alternatives. The verification checks are numbered lists. The failures in Resolve a failed setup are a bulleted list, since a reader matches a symptom against them rather than running them in order, and each failure and its handler render as one bulleted item.
- The channel path states no threat claim; the security model owns the channel's threat surface. Do not claim that applying an already-applied `0001_roles.sql` is a no-op; no fact states it. That the setup command applies the scaffold's copy when it runs a new site's first deploy rests on `f:m4y3m4`, and that the scaffold ships it on `f:rn62i1`; never say the setup command always applied it. :fact[m4y3m4] :fact[rn62i1]
- No step suggests trying the role under the dev backend, which mints an owner; both paths end with a deploy and a check on the deployed site. :fact[7cv105]
- Follow one running example, the example site's members channel, through binding, migration, module, routes, and test, and leave the class-reference shape to the reference (the front matter's exemplar). Take the early "right tool for the job?" callout from `extenders/sanity-custom-tool/`, here role versus channel, and leave its plugin tail.
- A cited fact is placed only as far as its bullet states it. State each design as it is now, and leave out the earlier-versions clauses of `f:4xrx5f`, `f:7cv105`, and `f:f21bcz`.
- Leave out the `0003_preview.sql` clause of `f:rn62i1`, the count of shipped migrations in `f:xxtooz`, and the `src/access.ts` clause and `#lib/cairn.server.js` import of `f:q07rd5`.
- Leave out the `ip` rule of `verifyTurnstile` in `f:69xbyh`, the fetch clause of `f:thbxvf`, and the gradual-deployments clause of `f:86h9o6`.
- Leave out the hashed-lookup and destructive-capability clauses of `f:1rstld`, the `withSession` and `batch` detail of `f:0l7si2`, and the Node 22.13 version of `f:tnvu0a`.
- Leave out the engine's internal module path and the retired event of `f:nv475y`, the log levels of `f:7cot0m`, and the cleanup and refund clauses of `f:tx48wk`.
- Leave out the drift-test clause of `f:uci4pa`, the hand-inserted marker fallback of `f:5rkxfp`, which the reference keeps, and each channel limit of `f:u3qhel` beyond the defaults the page names.
- Never say when or where a `navLayout` `roles` validation failure surfaces, or that it hides the link; the fact states neither. Never use "types" as a verb beside the noun. Name the Waymark template's tree by what the code calls it, never the internal "Deploy-button tree".
:::

## Before you begin

*List the preconditions, each labeled with the path it serves and linked to what produces it, so the reader weighs the channel's costs (a transport, a roster store, a Turnstile secret) before the choice that follows. The channel test's Node floor sits here, before any step.*

- Both mechanisms start from a working cairn site, and each path adds the preconditions labeled for it. This lead-in introduces the bulleted list of preconditions below.
- A site whose editors sign in by magic link, with the auth database created and migrated as Create the auth database describes.
- See [Create the auth database](add-cairn-to-a-sveltekit-app.md#create-the-auth-database).
- For a role, an owner who can sign in, since an owner adds people on `/admin/editors`. :fact[nj0nfm]
- For a role, the `cairn` CLI, for the wiring check that `cairn doctor` runs. It installs separately from the npm package, with `go install github.com/glw907/cairn-cms/tool/cmd/cairn@latest` or from a release archive. :fact[1dhk1a]
- See [`cairn doctor`](../reference/cli-cairn-doctor.md).
- For a channel, a transport the Worker can call to send a code, such as an email or SMS provider. :fact[cf1avu]
- For a channel, the group's roster in a store the site's code can read. :fact[cf1avu]
- For a channel, a Cloudflare Turnstile widget and its secret key, because the channel's `challenge` must verify a human, never return `true` unconditionally. :fact[ez788q]
- See [Cloudflare Turnstile widget](https://developers.cloudflare.com/turnstile/get-started/).
- For the channel's test, `@glw907/cairn-cms-dev` installed as a dev dependency, as Wire the dev backend installs it. The test needs Node 24 or later, the floor that the package's `engines.node` field declares. :fact[fcqs22]
- See [Wire the dev backend](add-cairn-to-a-sveltekit-app.md#wire-the-dev-backend).
- With these in place, the first decision is which mechanism to build.

## Choose the mechanism

*Compare the two mechanisms so the reader chooses before building anything, since the paths share no step. This is the page's early right-tool callout, role versus channel.*

- A table, introduced by the sentence that it compares the two mechanisms by where each keeps its people and what the site builds, has a column per mechanism and one row each for sign-in, roster, sessions, where people land, and what the site builds. :fact[4673n6] :fact[nj0nfm] :fact[5t6hz6] :fact[7n28wc] :fact[we2lmp] :fact[dtz8oa] :fact[rcpe0n] :fact[q7fj6p] :fact[cf1avu]

| | A declared role | An auth channel |
|---|---|---|
| Sign-in | The same magic link editors use | A numeric code, 8 digits by default, sent over the site's transport |
| Roster | Rows in the `editor` table of `AUTH_DB`, added by an owner on `/admin/editors` | The site's store, read by the site's `lookup` |
| Sessions | Sessions in `AUTH_DB` that populate `locals.cairnEditor` with `none` capability | Sessions in the channel's D1 binding, never in `AUTH_DB` and never in `locals.cairnEditor` |
| Where people land | The role's `home` under `/admin`, or the welcome view | The site's routes outside `/admin` |
| What the site builds | A screen at the role's `home` | The login route, the member area, the delivery, and the roster lookup |

- The choice comes before any building, under the lead-in "Make the choice before you build anything". Two condition-first bullets are the procedure, with no separate "choose" bullet.
- The first bullet: if an owner adds the group's people one at a time and they work in screens under `/admin`, build a role. :fact[nj0nfm] :fact[7n28wc]
- The second bullet: if the site already keeps the group's roster and its people never need the admin, build a channel. :fact[dtz8oa] :fact[q7fj6p]
- A reader who chooses a channel skips the role path and continues at Sign the group in through a channel; any other reader continues with Sign the group in with a role.
- See [Sign the group in through a channel](#sign-the-group-in-through-a-channel).
- See [Sign the group in with a role](#sign-the-group-in-with-a-role).

## Sign the group in with a role

*Open the role path on its running example. The role path comes first because it is shorter and reuses the sign-in the site already runs; a reader who chose a channel skips it from the comparison.*

- The running example is a `staff` role declared `{ capability: 'none', home: '/admin/staff' }`, the declaration the `defineRoles` reference uses. :fact[pvs115]
- See [`defineRoles`](../reference/core.md#defineroles).
- The role's people sign in by the magic link and reach only the screens the site builds for them. The engine's content screens and its roster screen refuse the role. The section never restates the role-versus-channel definition the comparison table carries. :fact[4673n6]
- The role's first step is its declaration.

### Declare the role

*Declare the role once on the adapter, keeping `owner` and `editor`, and confirm the hooks pass the runtime. Every later role step uses the role's name and `home`.*

- A role is one entry in the site's role vocabulary, declared once on the adapter's `roles` member. `composeRuntime` folds the adapter into the runtime that the hooks pass, and `createAuthGuard` reads the vocabulary from `runtime.roles`. :fact[3rb362] :fact[4xrx5f]
- `devBackendHandle` takes the same `runtime` but reads only `runtime.access`, so the vocabulary changes nothing under the dev backend. :fact[7cv105]
- The adapter module is `src/theme/cairn.config.ts` on a scaffolded site and `src/lib/cairn.config.ts` on the tutorial's site. :fact[q07rd5]

1. In the adapter module, set the adapter's `roles` member to a `defineRoles` vocabulary that keeps `owner` and `editor` beside the `staff` entry.

- Code: an illustrative adapter excerpt, a `defineRoles` vocabulary of `owner: 'owner'`, `editor: 'editor'`, and `staff: { capability: 'none', home: '/admin/staff' }` passed as `defineAdapter`'s `roles` member, with a comment marking the adapter's other members as unchanged. The file comment names the adapter module.

<!-- snippet-check-skip: elides the adapter's required content, backend, email, and rendering groups -->
```ts
// src/theme/cairn.config.ts (src/lib/cairn.config.ts on the tutorial's site)
import { defineAdapter, defineRoles } from '@glw907/cairn-cms';

export const cairn = defineAdapter({
  // content, backend, email, rendering, and the other members stay as the site declares them
  roles: defineRoles({
    owner: 'owner',
    editor: 'editor',
    staff: { capability: 'none', home: '/admin/staff' },
  }),
});
```

2. In `src/hooks.server.ts`, confirm that `createAuthGuard` and `devBackendHandle` each receive `{ runtime }`, as the scaffold's and the tutorial's hooks do. :fact[f21bcz] :fact[q07rd5]

- An older site whose hooks still pass `roles` follows Upgrade cairn instead.
- See [Upgrade cairn](upgrade-cairn.md#when-your-range-crosses-the-one-declaration-change).
- The vocabulary keeps `owner` and `editor` for two reasons. `defineRoles` throws when the vocabulary has no `owner` key or maps `owner` to anything but owner capability, and a roster row whose role the vocabulary omits resolves to `none`, so dropping `editor` would close the content screens to every existing editor. :fact[dbaklx] :fact[zjglk8]
- `defineRoles` also throws on a `home` outside `/admin`. :fact[dbaklx]
- After sign-in, the `/admin` index redirects a role that declares a `home` to that path before it looks for a reachable concept. :fact[pvs115]
- A `none`-capability role with no `home` gets the welcome view at `/admin` instead. The `defineRoles` entry, which lists each validation rule, is named unlinked, since the role section already links it. :fact[7n28wc]
- The `home` path needs a screen before anyone lands there.

### Build the role's home screen

*Build the screen the role's `home` names, gated by a role check in its load function, so the role needs no access map. The path must exist before anyone lands there, so the screen follows the declaration.*

- The home path is a custom admin screen the site builds. Its load function checks the session's role itself, so the role needs no access map.
- A `none`-capability session populates `locals.cairnEditor` like an editor's, and the screen reads `role` from it. :fact[5t6hz6]

1. In the site's admin routes, create the route for `/admin/staff`, as Add a custom admin screen describes.

- See [Add a custom admin screen](add-a-custom-admin-screen.md#place-the-route).

2. In `src/routes/admin/staff/+page.server.ts`, make the load function call `requireSession` and answer 403 to any session whose `role` is not `staff`.

- Code: the screen's server file, `src/routes/admin/staff/+page.server.ts`, a load function that calls `requireSession(event)`, throws `error(403, ...)` when the session's `role` is not `staff`, and returns the display name. :source[/src/lib/sveltekit/guard.ts#requireSession]

```ts
// src/routes/admin/staff/+page.server.ts
import { error } from '@sveltejs/kit';
import { requireSession } from '@glw907/cairn-cms/sveltekit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const editor = requireSession(event);
  if (editor.role !== 'staff') error(403, 'This screen is for staff.');
  return { name: editor.displayName };
};
```

- `requireSession` redirects a visitor with no session to the login page and does not consult the access map. :fact[8anql1]
- The role check therefore works whether or not the site declares an access map, while `requireAccess` refuses a `none` session unless an access-map key lists its role. :fact[8anql1] :fact[5sx6zl]
- `requireAccess` reads the map through `canReach`, which admits a `none` session to a route only when the deepest matching access-map key lists its role, so a site that keeps an access map may instead gate with `requireAccess` and add an access-map key that lists `staff`. :fact[5sx6zl]
- See [Restrict admin access](restrict-admin-access.md).
- SvelteKit runs a form action before its page's load function, so the load's role check never gates the action, and an action on the screen checks the session's role in its handler too. :fact[5pyozi]
- The page Add a custom admin screen compares the access checks of the two action wrappers.
- See [Add a custom admin screen](add-a-custom-admin-screen.md#choose-the-action-wrapper).
- With the screen in place, the sidebar can link to it.

### Show the home screen in the sidebar

*Add the `navLayout` entry that shows the home screen's link to the role. The entry points at the screen, so it follows the screen.*

- A `navLayout` entry with a `roles` list shows the home screen's link only to the roles it names. The list takes declared role names, and a name the vocabulary does not declare fails validation. :fact[16paho]
- `navLayout` sits on the adapter's `editor` group. :fact[ys1iq1]
- The procedure is one step, rendered as a single bulleted item under its lead-in: in the adapter module, add a `navLayout` entry for `/admin/staff` to the adapter's `editor` group, with `roles` set to the `staff` role.
- Code: an illustrative adapter excerpt, the `editor` group's `navLayout` holding one entry with a `label`, an `icon` from the `NavIcon` set, `href: '/admin/staff'`, and `roles: ['staff']`, beside the `roles` member, with comments marking the adapter's other members as unchanged.

<!-- snippet-check-skip: elides the adapter's required content, backend, email, and rendering groups -->
```ts
// src/theme/cairn.config.ts (src/lib/cairn.config.ts on the tutorial's site)
import { defineAdapter, defineRoles } from '@glw907/cairn-cms';

export const cairn = defineAdapter({
  // content, backend, email, rendering, and the other members stay as the site declares them
  roles: defineRoles({
    owner: 'owner',
    editor: 'editor',
    staff: { capability: 'none', home: '/admin/staff' },
  }),
  editor: {
    // the editor group's other members, and any other navLayout nodes, stay as declared
    navLayout: [
      { label: 'Staff', icon: 'clipboard-list', href: '/admin/staff', roles: ['staff'] },
    ],
  },
});
```

- When no access-map key matches its `href`, an entry shows to every session that can see the sidebar, and the `roles` list narrows it to the role. :fact[altcjp]
- The `roles` list controls only whether the link shows, and the screen's role check refuses every other role.
- See [Arrange the admin sidebar](arrange-the-admin-sidebar.md).
- With the screen and its link in place, the role is ready to deploy.

### Deploy the role

*Carry the role to the deployed site. The roles migration, freshly regenerated site facts, and a passing local wiring check come first, so a wiring fault is caught before it goes live, and the deploy is what makes the editors screen accept the role.*

- The role reaches the deployed site once `AUTH_DB` carries `0001_roles.sql` and `cairn doctor` passes the role-wiring check. That migration lets the roster hold a role beyond owner and editor. :fact[rn62i1]
- The scaffold ships the file, and the setup command applies it when it runs a new site's first deploy. :fact[rn62i1] :fact[m4y3m4]
- A site without the file, such as a hand-built site or one scaffolded before the file shipped, copies it from the package. :fact[rn62i1]

1. If the site's `migrations` directory doesn't hold `0001_roles.sql`, copy the file there from the package's `migrations` directory. :fact[rn62i1]

- Code: the copy command, with no trailing skip sentence after it.

```sh
cp node_modules/@glw907/cairn-cms/migrations/0001_roles.sql migrations/
```

2. If your site added columns to the `editor` table, in your copy of `0001_roles.sql`, add each column to `editor_new` and to the `INSERT ... SELECT` that copies the rows. :fact[rn62i1]

- The migration rebuilds `editor` by create, copy, drop, and rename. It keeps every row but only the four columns `email`, `display_name`, `role`, and `created_at`. This continuation sits on the carry step, never in the section's preamble. :fact[rn62i1] :fact[xkkt1o]

3. In the project directory, apply the migrations to the remote auth database with `wrangler d1 migrations apply` and the `--remote` flag. :fact[xxtooz]

- Code: the remote apply command for `AUTH_DB`.

```sh
npx wrangler d1 migrations apply AUTH_DB --remote
```

4. In the project directory, regenerate the site facts with `npx cairn-manifest`.

- Code: the regenerate command. The step runs `cairn-manifest`, not a build, since a build never writes the file.

```sh
npx cairn-manifest
```

- The `auth.role-wiring` check reads the declared roles from `src/content/.cairn/site-facts.json`, which `cairn-manifest` writes. :fact[6oopkt] :fact[ve30i2] :fact[yio35u]
- While the committed file no longer matches the adapter, a build fails and names `npx cairn-manifest` as the fix. :fact[eqlssz] :fact[z61ibp]

5. In the project directory, run `cairn doctor`.
6. In the output, confirm that `cairn doctor` reports no `auth.role-wiring-missing` warning.

- The warning means that `createAuthGuard` doesn't receive `{ runtime }`, and Resolve a failed setup gives the fix. :fact[hwffph]
- See [Resolve a failed setup](#resolve-a-failed-setup).
- The `cairn doctor` reference lists each check.
- See [the `cairn doctor` reference](../reference/cli-cairn-doctor.md#the-checks).

7. In the project directory, build and deploy the site as Deploy a change describes.

- See [Deploy a change](add-cairn-to-a-sveltekit-app.md#deploy-a-change).
- Once the deploy finishes, an owner can add the role's people.

### Add the role's people

*Have an owner add the role's people on `/admin/editors`, which accepts the role once the deploy is live.*

- An owner adds each of the role's people on `/admin/editors`, the screen that adds editors. Its add action validates the posted role against the declared vocabulary, so the deployed screen now accepts `staff`. :fact[mbx6q1]
- The steps run as an owner on the deployed site.

1. On `/admin/editors`, enter the person's name and email. :fact[nj0nfm]
2. In the form's role field, choose `staff`. :fact[nj0nfm]
3. Select **Add editor**. :fact[nj0nfm]
4. Tell the person to sign in at `/admin`, because adding them sends no email. :fact[nj0nfm]

- The last checks run on the deployed site.

### Verify the role signs in to its home screen

*Check on the deployed site that the role's people sign in to the home screen, see its link, and find the content screens closed. The dev backend mints an owner, so the role path closes with checks on the deployed site.*

- A working role signs its people in by the magic link and lands them on the home screen. The screen's link shows in their sidebar, and the engine's content screens stay closed to them.
- Under the dev backend, every `/admin` request runs as a minted owner, so the vocabulary changes no authorization decision there, and these checks run on the deployed site. :fact[7cv105]
- The checks run in order, as a numbered list introduced by a complete sentence.

1. On `/admin/editors`, make sure an email address you can receive mail at is on the roster with the `staff` role. :fact[nj0nfm]
2. On the deployed site, open `/admin` as that person.
3. Sign in with the emailed link.
4. Confirm that `/admin` lands on `/admin/staff`.
5. In the sidebar, confirm that the screen's link shows.
6. Open one of the engine's content screens.
7. Confirm that the content screen refuses the person.

- A failed check has its fix in Resolve a failed setup.
- See [Resolve a failed setup](#resolve-a-failed-setup).

## Sign the group in through a channel

*Open the channel path on its running example, the example site's members channel, followed in the example site's build order from database to deploy.*

- `createAuthChannel` builds the request, confirm, and logout actions for a separate login over a numeric code. :fact[we2lmp]
- It ships no route or UI, so the site builds the login route and the member area. The section never restates the factory-versus-site split the introduction carries. :fact[q7fj6p]
- The running example is the example site's members channel. It binds its database as `MEMBER_DB`, names its session cookie `member_session`, and signs members in at `/members/login` before they reach `/members`. :fact[uci4pa] :fact[4cw5dk] :fact[265s4t]
- The example site delivers codes through a capture transport that refuses unless `CAIRN_DEV_BACKEND` is `'1'`, and the steps replace it with a `deliver` function for your transport. :fact[rv9gdc]
- The channel's database comes first.

### Provision the channel database

*Create a separate D1 database for the channel, bind it with a sibling migrations directory, and migrate it locally. The module's `resolveDb` returns this binding, so the database comes before the module, and the local migration lets `wrangler dev` serve the channel.*

- The channel keeps its codes and sessions in a separate D1 database under a binding of its own, never `AUTH_DB`. Its packaged migration lives in a sibling migrations directory. :fact[rcpe0n]

1. In the project directory, create a D1 database for the channel the way Create the auth database creates the auth database.

- See [Create the auth database](add-cairn-to-a-sveltekit-app.md#create-the-auth-database).

2. From the command's output, note the new database's id.
3. In the project directory, copy the packaged channel migration, `node_modules/@glw907/cairn-cms/migrations-channel/0000_channel.sql`, into a new `migrations-members` directory. :fact[6ab2z6]

- Code: the commands that make the directory and copy the migration.

```sh
mkdir migrations-members
cp node_modules/@glw907/cairn-cms/migrations-channel/0000_channel.sql migrations-members/
```

- Every statement in the file is idempotent, so running it again against a provisioned database changes nothing. :fact[6ab2z6]

4. In `wrangler.jsonc`, add a D1 database entry that binds the database as `MEMBER_DB` with `migrations_dir` set to `migrations-members`. :fact[uci4pa]

- Code: an illustrative `d1_databases` array, the existing `AUTH_DB` entry on `migrations` and the new `MEMBER_DB` entry on `migrations-members`, with placeholders for the database names and ids.

```jsonc
"d1_databases": [
  {
    "binding": "AUTH_DB",
    "database_name": "<auth-database-name>",
    "database_id": "<auth-database-id>",
    "migrations_dir": "migrations"
  },
  {
    "binding": "MEMBER_DB",
    "database_name": "<member-database-name>",
    "database_id": "<member-database-id>",
    "migrations_dir": "migrations-members"
  }
]
```

5. In the project directory, apply the migration to the local database with `wrangler d1 migrations apply MEMBER_DB --local`. :fact[uci4pa]

- Code: the local apply command.

```sh
npx wrangler d1 migrations apply MEMBER_DB --local
```

- The migration sits in a sibling directory because a shared `migrations_dir` would apply each database's schema to the other the first time either is migrated. :fact[5rkxfp]
- The remote database takes the migration in Deploy the channel.
- See [Deploy the channel](#deploy-the-channel).
- The auth channel reference describes the packaged migration in full.
- See [the packaged migration](../reference/auth-channel.md#the-packaged-migration).
- The channel module's `resolveDb` returns this binding.

### Write the channel module

*Write the roster lookup, the delivery function, and the `createAuthChannel` call, then set the Turnstile secret locally and regenerate the Worker types. The module returns the actions the routes call, and its secret steps type the env, so it comes before any route.*

- A channel is one `createAuthChannel` call in a server-only module. The call takes four functions the site writes, plus the channel's binding and a cookie name. :fact[41kl6q]
- See [server-only module](https://svelte.dev/docs/kit/server-only-modules).

1. In `src/lib/server/members.ts`, export `findMemberId(contact, { env })`, which resolves to the member's subject, a stable identifier for the member, or `null`.

- The `{ env }` context lets the lookup reach the roster's binding, and the function receives only that context, never the request. :fact[ffskeq]

2. In the same file, export `sendCodeEmail(contact, code)`, which sends the code over your transport and returns a promise.

- The factory types `lookup` as `(contact, ctx: { env }) => Promise<string | null>` and `deliver` as `(contact, code, ctx) => Promise<void>`. A function that declares only `(contact, code)` satisfies `deliver`. :fact[dbh3aj]

3. In `src/lib/server/member-channel.ts`, create the channel with its six required members, typed over the generated Worker `Env`. :fact[41kl6q]

- Code: an illustrative module modeled on the example site's channel, never copying its `captureDeliver` or `insecureTestChallenge`. It imports `env` from `cloudflare:workers`, typed by the generated `Env` that the types step produces, with no local `Env` interface; exports a `normalizeContact` that trims and lowercases; and calls `createAuthChannel<Cloudflare.Env>`, as the example site types its channel, with `resolveDb` returning the `MEMBER_DB` binding, `deliver: sendCodeEmail`, `lookup: findMemberId`, `normalize: normalizeContact`, a `challenge` that passes the form's `cf-turnstile-response` token and the imported `env.TURNSTILE_SECRET` to `verifyTurnstile`, and `cookie: { name: 'member_session' }`.

<!-- snippet-check-skip: imports cloudflare:workers and types the channel over Cloudflare.Env, which the site's generated Worker types declare -->
```ts
// src/lib/server/member-channel.ts
import { env } from 'cloudflare:workers';
import { createAuthChannel } from '@glw907/cairn-cms/auth-channel';
import { verifyTurnstile } from '@glw907/cairn-cms/cloudflare';
import { findMemberId, sendCodeEmail } from './members.js';

/** Trims and lowercases a contact, so one address always maps to one identity. */
export function normalizeContact(raw: string): string {
  return raw.trim().toLowerCase();
}

export const memberChannel = createAuthChannel<Cloudflare.Env>({
  resolveDb: (bindings) => bindings?.MEMBER_DB,
  deliver: sendCodeEmail,
  lookup: findMemberId,
  normalize: normalizeContact,
  challenge: (_event, form) =>
    verifyTurnstile(String(form.get('cf-turnstile-response') ?? ''), env.TURNSTILE_SECRET),
  cookie: { name: 'member_session' },
});
```

4. If no `.dev.vars` file sits beside the Wrangler config, create one there.
5. In `.dev.vars`, add the Turnstile secret key as `TURNSTILE_SECRET`.
6. If your site carries `.dev.vars.example`, add `TURNSTILE_SECRET` to it with an empty value. :fact[nls26c]

- A site without that file, such as one the setup command scaffolded, skips this step. `.dev.vars.example` is the template for the local-only `.dev.vars`, and the scaffold's `.gitignore` keeps `.dev.vars` out of git. :fact[nls26c]

7. In the project directory, regenerate the Worker types, so the generated `Env` carries `MEMBER_DB` and the secret's name. :fact[pe4vuc]

- The step continues with two condition-first bullets under the lead-in "Use the command that fits the site": where the first lines of `worker-configuration.d.ts` record a command, as a scaffolded site's do, the reader runs that command; where they record none, the reader runs `npx wrangler types`, which writes the file. :fact[pe4vuc]
- `challenge` receives only the event and the form, so the module reads `TURNSTILE_SECRET` from the `env` that `cloudflare:workers` exports, which the generated `Env` type describes. :fact[am6hhb]
- `createAuthChannel`'s type parameter describes the `env` that `resolveDb` receives and the `env` in the context of `lookup`, `deliver`, and `verify`, so typing the channel over `Cloudflare.Env`, the generated type, covers each binding those functions read, as the example site's channel does. :fact[2ihgrk]
- `wrangler dev` reads secrets from `.dev.vars` and never from a deployed secret, so the production copy of the secret waits for Deploy the channel. :fact[86h9o6]
- See [Deploy the channel](#deploy-the-channel).
- A bulleted list, introduced by the sentence that each required member is a decision the site makes, gives one member per item.
- `resolveDb` returns the `MEMBER_DB` binding, never `AUTH_DB`. Its return type, `ChannelDatabaseLike`, accepts a real `D1Database` with no cast. :fact[rcpe0n] :fact[ditn3e]
- `deliver` sends the code over your transport, in place of the example site's development-only capture transport. :fact[rv9gdc]
- `lookup` returns the stable subject for a normalized contact, or `null`, and that answer decides membership. :fact[dtz8oa]
- `normalize` puts a contact in its canonical form before the lookup and the rate budgets use it. :fact[ez788q]
- `challenge` wraps `verifyTurnstile`, which returns `false` on each failure and never throws. :fact[69xbyh]
- See [`verifyTurnstile`](../reference/cloudflare.md#verifyturnstile).
- `cookie.name` is the base name of the session cookie and of its `_pending` nonce cookie. A name that starts with `cairn_` throws. :fact[4cw5dk]
- A lead-in, that three of these functions carry an obligation the factory cannot check, introduces a bulleted list of the three. :fact[pa2hqh]
- `normalize` must be idempotent, canonical per identity, and injective across people, because a lossy one maps two people onto one rate budget. :fact[ez788q] :fact[pa2hqh]
- `lookup` must return a subject that is stable and canonical per person. :fact[ez788q]
- `challenge` must verify a human, because it is the whole economic bound on guessing a code. :fact[ez788q] :fact[pa2hqh]
- Config obligations states each obligation in full, and the `createAuthChannel` entry lists the optional members.
- See [Config obligations](../reference/auth-channel.md#config-obligations).
- See [`createAuthChannel`](../reference/auth-channel.md#createauthchannel).
- The channel returns `actions` with request, confirm, and logout, plus `resolveSubject` and `revokeSessions`, and it ships no route or UI. :fact[q7fj6p]
- The login route is the first route to call those actions.

### Build the login route

*Build `/members/login`: a load that redirects a signed-in visitor, request and confirm actions that call the channel's actions, and a page with both forms and the Turnstile widget. The route calls the actions the module returns, so it follows the module.*

- The example site folds request and confirm onto `/members/login` as two named form actions. Each action passes the event to the channel's matching action and switches on the outcome. :fact[265s4t]

1. In `src/routes/members/login/+page.server.ts`, add a load function that redirects a visitor who already has a session to `/members`. :fact[265s4t]
2. In the same file, add a `request` action that passes the event to `actions.request` and answers `fail(400, ...)` on any outcome but `sent`. :fact[265s4t]
3. In the same file, add a `confirm` action that passes the event to `actions.confirm`, redirects to `/members` on `confirmed`, and answers `fail(400, ...)` otherwise. :fact[265s4t]
4. In the same file, export `prerender = false`, so a site that prerenders by default still serves the route from the Worker. :fact[k0cryh]

- Code: the login route's server file, `prerender = false`, the load function that redirects a signed-in visitor to `/members`, and the `request` and `confirm` actions that switch on the outcome. It imports the channel from the server-only module. :source[/examples/showcase/src/routes/members/login/+page.server.ts]

```ts
// src/routes/members/login/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import { memberChannel } from '#lib/server/member-channel.js';
import type { Actions, PageServerLoad } from './$types';

export const prerender = false;

export const load: PageServerLoad = async (event) => {
  if (await memberChannel.resolveSubject(event)) redirect(303, '/members');
};

export const actions: Actions = {
  request: async (event) => {
    const result = await memberChannel.actions.request(event);
    if (result.outcome !== 'sent') return fail(400, { requestError: result.outcome });
    return { requested: true };
  },
  confirm: async (event) => {
    const result = await memberChannel.actions.confirm(event);
    if (result.outcome !== 'confirmed') return fail(400, { confirmError: result.outcome });
    redirect(303, '/members');
  },
};
```

5. In `src/routes/members/login/+page.svelte`, add a request form that posts a `contact` field to the `request` action. :fact[265s4t]
6. In the request form, add the Turnstile widget as Cloudflare's Embed the widget guide describes.

- See [Embed the widget](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/).
- The widget posts the token your `challenge` reads.

7. In the same component, add a confirm form that posts a `code` field to the `confirm` action. :fact[265s4t]

- Code: an illustrative page component, a request form with a `contact` input and a comment marking where the Turnstile widget renders, a confirm form with a `code` input, and an alert line under each form read from the action data. It omits the example site's static test challenge field.

```svelte
<!-- src/routes/members/login/+page.svelte -->
<script lang="ts">
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();
</script>

<h1>Member sign-in</h1>

<form method="POST" action="?/request">
  <label>Email <input name="contact" type="email" autocomplete="email" required /></label>
  <!-- The Turnstile widget renders here and posts its token with the form. -->
  <button type="submit">Send a code</button>
</form>
{#if form?.requestError}<p role="alert">The code could not be sent: {form.requestError}</p>{/if}

<form method="POST" action="?/confirm">
  <label>Code <input name="code" inputmode="numeric" autocomplete="one-time-code" required /></label>
  <button type="submit">Sign in</button>
</form>
{#if form?.confirmError}<p role="alert">The code did not confirm: {form.confirmError}</p>{/if}
```

- A wrong code answers `bad-code` and mints no session. A false or thrown challenge answers `challenge-required` without minting one. :fact[vo4m61]
- The auth channel types list each outcome.
- See [auth channel types](../reference/auth-channel.md#types).
- A confirmed code redirects to `/members`, the page the member area gates.

### Gate the member area

*Gate `/members` with `resolveSubject` in its load, add a logout action, and render the member's area. The area is the login route's redirect target, so it follows the login route.*

- A channel session never populates `locals.cairnEditor`, so the member area lives in the site's routes outside `/admin`. Each of those routes resolves the subject with `resolveSubject` in its load function. :fact[q7fj6p]

1. In `src/routes/members/+page.server.ts`, add a load function that calls `resolveSubject` and redirects to `/members/login` when it returns `null`. :fact[265s4t]
2. In the same file, add a `logout` action that calls `actions.logout` and redirects to the login page. :fact[265s4t]
3. In the same file, export `prerender = false`, so the gate runs on every request even on a site that prerenders by default. :fact[k0cryh]

- Code: the member area's server file, `prerender = false`, the load function that resolves the subject and redirects to `/members/login` on `null`, and the `logout` action that calls `actions.logout` and redirects to the login page. :source[/examples/showcase/src/routes/members/+page.server.ts]

```ts
// src/routes/members/+page.server.ts
import { redirect } from '@sveltejs/kit';
import { memberChannel } from '#lib/server/member-channel.js';
import type { Actions, PageServerLoad } from './$types';

export const prerender = false;

export const load: PageServerLoad = async (event) => {
  const subject = await memberChannel.resolveSubject(event);
  if (!subject) redirect(303, '/members/login');
  return { subject };
};

export const actions: Actions = {
  logout: async (event) => {
    await memberChannel.actions.logout(event);
    redirect(303, '/members/login');
  },
};
```

4. In `src/routes/members/+page.svelte`, render the member's area. :fact[k0cryh]
5. In the same component, add a sign-out form that posts to `?/logout`.

- Code: an illustrative page component, a heading, a line naming the signed-in subject, and a sign-out form posting to `?/logout`. No sentence after it restates the prerender hazard, which the prerender steps carry.

```svelte
<!-- src/routes/members/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<h1>Members</h1>
<p>You are signed in as {data.subject}.</p>
<form method="POST" action="?/logout">
  <button type="submit">Sign out</button>
</form>
```

- The subject is the stable string your `lookup` returned. A member page loads the member's records from the site's store by that subject. :fact[dtz8oa]
- Logout ends that one session and never touches another session of the same member. :fact[gubeex]
- A member the site removes keeps any open session until it expires or the site ends it.

### End a removed member's sessions

*Give the site two ways to end a removed member's open session early. Neither needs a route, so they follow the routes.*

- A channel session lasts 30 days by default. :fact[u3qhel]
- A complete sentence says a site ends a removed member's sessions early with either or both of the following, and the two render as a bulleted list of alternatives, each with its condition first.
- The first alternative: to check the roster on each resolution, the site gives the channel's config a `verify` function that returns `false` for a removed member. A `false` destroys the session row on that resolution, while a throw refuses only that resolution and keeps the row. `verify` takes the same `{ env }` context as `lookup`, never the request. :fact[dtz8oa] :fact[ffskeq]
- The second alternative: to end sessions at removal, the site's removal code calls the channel's `revokeSessions` with the binding and the subject. It ends every session for that identity at once, which also suits a reported compromise. :fact[1rstld]
- The `createAuthChannel` entry documents `verify` and `revokeSessions`.
- See [`createAuthChannel`](../reference/auth-channel.md#createauthchannel).
- Before the channel deploys, a test proves it on Node.

### Test the channel on Node

*Prove the finished channel on Node with Vitest and `createChannelDb` before it deploys. The test is the last check before anything goes live, so it comes after the channel is complete and before the deploy.*

- `createChannelDb`, exported from `@glw907/cairn-cms-dev`, applies the channel's migration to an in-memory SQLite database and returns a D1-shaped double. A Vitest run on Node can drive the channel's actions against it with no Worker. :fact[0l7si2]
- The double needs `node:sqlite`, which every Node release at the floor named in Before you begin provides. Never call `node:sqlite` the floor's reason, since it is available below the floor. :fact[fcqs22] :fact[tnvu0a]
- See [Before you begin](#before-you-begin).

1. In `vitest.config.ts`, if `test.server.deps.inline` doesn't list `@glw907/cairn-cms`, add it. :fact[1stlyv]

- The scaffold's config already lists it. The engine imports `cloudflare:workers`, a scheme that Node's loader rejects when Vitest leaves the engine external. Inlined, the engine goes through Vitest's transform, and a test's `vi.mock('cloudflare:workers')` reaches the engine's import. :fact[1stlyv]

2. In `src/lib/server/member-channel.test.ts`, write a test that drives the channel's request action against the double.

- Code: an illustrative test, modeled on the engine's run of the double. `vi.hoisted` holds a mocked Worker env and a `waitUntil` that collects promises, and `vi.mock('cloudflare:workers')` supplies both. The double, built with `createChannelDb` from `migrations-members/0000_channel.sql`, goes on the mocked env as `MEMBER_DB` with no cast, the env typing `MEMBER_DB` as `ChannelDatabaseLike`. A channel keeps the module's `normalizeContact` and stands in for the delivery (recording the code), the roster lookup, and the challenge. The event carries a `localhost` POST with a `contact` field, a matching `Origin` header, `cookies`, `setHeaders`, `locals`, and `getClientAddress`. After awaiting the collected promises, the test asserts `{ outcome: 'sent' }` and one 8-digit code.

```ts
// src/lib/server/member-channel.test.ts
/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { createAuthChannel } from '@glw907/cairn-cms/auth-channel';
import type { ChannelDatabaseLike } from '@glw907/cairn-cms/auth-channel';
import { createChannelDb } from '@glw907/cairn-cms-dev';
import { normalizeContact } from './member-channel.js';

interface TestEnv {
  MEMBER_DB?: ChannelDatabaseLike;
}

// cloudflare:workers exists only in a Worker, so the test supplies its env and waitUntil.
const worker = vi.hoisted(() => {
  const pending: Promise<unknown>[] = [];
  return {
    env: {} as TestEnv,
    pending,
    waitUntil: (promise: Promise<unknown>) => {
      pending.push(promise);
    },
  };
});

vi.mock('cloudflare:workers', () => ({ env: worker.env, waitUntil: worker.waitUntil }));

describe('the member channel', () => {
  it('sends one 8-digit code to a contact on the roster', async () => {
    worker.env.MEMBER_DB = await createChannelDb(
      readFileSync('migrations-members/0000_channel.sql', 'utf-8'),
    );
    const codes: string[] = [];
    const channel = createAuthChannel<TestEnv>({
      resolveDb: (env) => env?.MEMBER_DB,
      deliver: async (_contact, code) => {
        codes.push(code);
      },
      lookup: async () => 'member-1',
      normalize: normalizeContact,
      challenge: async () => true,
      cookie: { name: 'member_session' },
    });

    const url = new URL('http://localhost/members/login');
    const result = await channel.actions.request({
      url,
      request: new Request(url, {
        method: 'POST',
        body: new URLSearchParams({ contact: 'member@example.com' }),
        headers: { origin: url.origin },
      }),
      params: {},
      route: { id: '/members/login' },
      cookies: { get: () => undefined, set: () => {}, delete: () => {} },
      setHeaders: () => {},
      locals: {},
      getClientAddress: () => '127.0.0.1',
    });
    await Promise.all(worker.pending);

    expect(result).toEqual({ outcome: 'sent' });
    expect(codes).toHaveLength(1);
    expect(codes[0]).toMatch(/^\d{8}$/);
  });
});
```

3. In the project directory, run the test.

- Code: the test command, `npx vitest run`.

```sh
npx vitest run
```

- The engine reads every Worker binding and `waitUntil` through `cloudflare:workers`, and the test's mock of that module supplies both. :fact[nv475y]
- The double satisfies `ChannelDatabaseLike` and goes on the mocked env with no cast. :fact[ditn3e]
- Every action refuses a mismatched `Origin` and refuses plain http outside a local host, so the test's event carries a local URL and a matching `Origin` header. :fact[wu8x70]
- The test's last assertion checks the default code length of 8 digits. :fact[we2lmp]
- The double runs only on Node. Under `wrangler dev`, the channel reads the local D1 database that Provision the channel database migrated. :fact[l2xruc]
- See [Provision the channel database](#provision-the-channel-database).
- With the test passing, the channel is ready to deploy.

### Deploy the channel

*Put the channel's migration on the remote database and the Turnstile secret in the Worker, then deploy. Both must be live before the code that reads them, so they precede the deploy step.*

- Before the code that reads them goes live, the deployed site needs the channel's migration on the remote database and the Turnstile secret.

1. In the project directory, apply the channel migration to the remote database with `wrangler d1 migrations apply MEMBER_DB --remote`. :fact[xxtooz]

- Code: the remote apply command for `MEMBER_DB`.

```sh
npx wrangler d1 migrations apply MEMBER_DB --remote
```

2. In the project directory, store the Turnstile secret key as a Worker secret named `TURNSTILE_SECRET` with `wrangler secret put`.

- Code: the secret command.

```sh
npx wrangler secret put TURNSTILE_SECRET
```

- The command creates a new Worker version and deploys it at once, as Cloudflare's Secrets page describes, so the secret is live before the site's deploy ships the code that reads it. :fact[86h9o6]
- See [Secrets](https://developers.cloudflare.com/workers/configuration/secrets/), linked beside the version-and-deploy sentence, since that behavior is the vendor's.

3. In the project directory, build and deploy the site as Deploy a change describes.

- See [Deploy a change](add-cairn-to-a-sveltekit-app.md#deploy-a-change).
- The last checks run against the deployed channel.

### Verify a member signs in to the member area

*Check on the deployed site that a member signs in with a code, lands on `/members`, and signs out, as the role path closes with its own check on the live site.*

- A working channel signs a member in on the deployed site with a code from your transport and lands them on `/members`. The member can then sign out again. :fact[265s4t]
- The checks run in order, as a numbered list introduced by a complete sentence.

1. In the roster store that `lookup` reads, make sure a contact you can receive a code at is on the roster.
2. On the deployed site's `/members/login`, request a code for that contact.
3. On `/members/login`, enter the code your transport delivered.
4. Confirm that the page redirects to `/members`. :fact[265s4t]
5. On `/members`, sign out.
6. Confirm that the page redirects to `/members/login`. :fact[265s4t]
7. Open `/members`.
8. Confirm that it redirects to `/members/login`. :fact[265s4t]

- A failed check has its fix in Resolve a failed setup.
- See [Resolve a failed setup](#resolve-a-failed-setup).

## Resolve a failed setup

*Match a failed check to its cause and fix, the role path's failures first and then the channel's, in the order a reader meets them. Each failure and its handler render as one item of a bulleted list a reader scans by symptom.*

- The following failures cover the role path first, then the channel.

:::row
**Symptom.** `cairn doctor` reports `auth.role-wiring-missing`. :fact[hwffph]
**Cause.** The adapter declares custom roles, but `createAuthGuard` in `src/hooks.server.ts` was not passed `{ runtime }`. :fact[hwffph]
**Fix.** Pass `{ runtime }` to `createAuthGuard` as [Declare the role](#declare-the-role) does, then rerun the check and deploy as [Deploy the role](#deploy-the-role) does.
:::

:::row
**Symptom.** Adding a person with the new role fails on `/admin/editors`.
**Cause.** `AUTH_DB` lacks `0001_roles.sql`, so the `editor` table keeps its original owner-or-editor check, and the write fails as `auth.store-roles-unmigrated`. The condition's message names `0001_roles.sql`, and no tool check raises it. :fact[xffr6i]
**Fix.** Copy and apply `0001_roles.sql` as [Deploy the role](#deploy-the-role) does, then add the person again. :fact[rn62i1]
:::

:::row
**Symptom.** The person lands on the welcome view instead of the home screen. :fact[kqcyv1]
**Cause.** The deployed vocabulary gives the role no `home`, or it omits the role, which then resolves to `none`. :fact[pvs115] :fact[zjglk8]
**Fix.** Check that the vocabulary declares the role with its `home`, then redeploy as [Deploy the role](#deploy-the-role) does.
:::

:::row
**Symptom.** The home screen answers 403 to the role's people.
**Cause.** Its load function gates with `requireAccess`, and no access-map key lists the role. :fact[5sx6zl]
**Fix.** Replace `requireAccess` in its load function with the role check from [Build the role's home screen](#build-the-roles-home-screen), then redeploy as [Deploy the role](#deploy-the-role) does. :fact[8anql1]
:::

:::row
**Symptom.** On a site that keeps an access map, the home screen's link does not show in the role's sidebar, though `/admin` still lands on the home screen.
**Cause.** The deepest access-map key matching `/admin/staff` does not list `staff`, so the map decides the entry and refuses the role. :fact[altcjp] :fact[5sx6zl]
**Fix.** Add `staff` to the access-map key that matches `/admin/staff`, as [Restrict admin access](restrict-admin-access.md) describes, then redeploy as [Deploy the role](#deploy-the-role) does. This failure cannot occur on a site with no access map.
:::

:::row
**Symptom.** The test fails inside `createChannelDb` because `node:sqlite` cannot load on the running Node release.
**Cause.** Nothing enforces the dev package's declared `engines.node` floor at runtime, and npm only warned at install. :fact[fcqs22]
**Fix.** Switch to Node 24 or later, the floor the dev package's `engines.node` accepts, and run the test again. :fact[fcqs22]
:::

:::row
**Symptom.** The channel module throws a construction error when it first loads, in the test run or on the deployed site's first request.
**Cause.** Construction throws when a required function is missing, and when the cookie name is missing, empty, or starts with `cairn_`. :fact[vo4m61] :fact[4cw5dk]
**Fix.** Read the construction error and supply the member it names as [Write the channel module](#write-the-channel-module) does, then run the test again.
:::

:::row
**Symptom.** Every code request answers `challenge-required`, and Workers Logs shows `turnstile.verify_failed` with `reason: 'missing_secret'`. :fact[thbxvf]
**Cause.** The Turnstile secret is blank where the running Worker reads it. :fact[thbxvf]
**Fix.** Set `TURNSTILE_SECRET` where the running Worker reads it: `.dev.vars` under `wrangler dev`, and the Worker secret on the deployed site. `verifyTurnstile` checks the secret before the token, so a call with both blank logs `missing_secret`. :fact[86h9o6] :fact[thbxvf]
:::

:::row
**Symptom.** Every code request answers `challenge-required`, and Workers Logs shows `turnstile.verify_failed` with `reason: 'invalid_input'`. :fact[thbxvf]
**Cause.** The request form posts no Turnstile token under the field your `challenge` reads. :fact[thbxvf]
**Fix.** Check that the request form posts the widget's token under the field your `challenge` reads.
:::

:::row
**Symptom.** The request answers that a code was sent, but no code arrives.
**Cause.** Either `lookup` returned `null` or threw, or the site's `deliver` function threw while it sent the code. A `null` means the contact is not on the roster, or its normalized form does not match the roster's. The one symptom covers all three causes, and only the records tell them apart. :fact[dtz8oa] :fact[7cot0m] :fact[tx48wk]
**Fix.** Read the channel's records in Workers Logs, which [Log events](../reference/log-events.md) describes. An `auth.channel.requested` record with an `outcome` of `'unknown'` means the normalized contact is not on the roster `lookup` reads, and `'lookup_failed'` means `lookup` threw. An `auth.channel.send_failed` record means `deliver` threw; read its `error` field and fix the transport your `deliver` calls. :fact[7cot0m] :fact[tx48wk]
:::

:::row
**Symptom.** Entering the code returns the login page with an error, and no redirect to `/members` follows.
**Cause.** The confirm action answered something other than `confirmed`, so the login route answered `fail(400, ...)`. A mistyped code answers `bad-code`, and a code past its 10-minute lifetime or its 5 attempts no longer confirms. :fact[vo4m61] :fact[u3qhel] :fact[265s4t]
**Fix.** Request a new code and enter it exactly as delivered, within 10 minutes and within 5 attempts. :fact[u3qhel]
:::

- A failure the list doesn't match sends the reader to the auth channel's records in Log events, and then to Debug your site.
- See [Log events](../reference/log-events.md).
- See [Debug your site](debug-your-site.md).

## See also

*Point to the pages around a second sign-in group, one complete sentence each: the channel's threat surface, access maps, identity mode, the sidebar, and the reference entries.*

- The following pages cover the seams and limits around a second sign-in group.
- See [The auth channel's threat surface](security-model.md#the-auth-channels-threat-surface) in the security model, which sets out the channel's threat catalogue and the site's obligations.
- See [Restrict admin access](restrict-admin-access.md), which describes access maps and roles that write content.
- See [Replace magic links with Cloudflare Access](replace-magic-links-with-cloudflare-access.md), which describes how to sign editors in through an identity provider.
- See [Arrange the admin sidebar](arrange-the-admin-sidebar.md), which describes how to lay out the admin's navigation.
- See [the auth channel reference](../reference/auth-channel.md), which documents each member and default of `createAuthChannel`.
- See [the roles reference](../reference/core.md#roles), which documents `defineRoles` and the role vocabulary.
