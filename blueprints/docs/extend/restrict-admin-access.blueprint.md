---
page: Restrict admin access
type: task guide
exemplar: extenders/sveltekit-hooks
---

# Restrict admin access

:::reader
**Who reads it.** A Svelte-fluent developer building an organization's site on cairn's seams, who wants fewer roles than the whole editor roster to reach some admin screens or routes.

**Why they arrive:**
- They are gating a custom admin screen's route, whose `load` and form actions do not yet check the access map. :fact[8anql1]
- They are closing an engine screen, such as the media library, to most editors. :fact[0qb73i]
- They want the map to admit only the roles it names, on every engine screen, which also needs Make the map exhaustive.

**What they already know.** SvelteKit server hooks, `load` functions, form actions, and route ids with their groups and parameters. They know the site's adapter module and, for the checks, a Workers Logs query. The page says it assumes these and explains none of them.

**What the page does for them:**
- The introduction has no heading. It frames the page from above in three paragraphs, then gives the bounds. Its first sentence is a statement of the model, neither an imperative nor a sentence about the page.
- The first paragraph states the model. Everyone who signs in to the admin has a role. The site declares its role names, or uses the default pair, `owner` and `editor`. Each role resolves to one of three capabilities, `owner`, `editor`, or `none`, and cairn always enforces capability. :fact[zjglk8] :fact[4xrx5f]
- The access map restricts capability further: its keys are engine screens and `/admin` routes, and each key lists the roles that reach that target. An owner reaches every mapped target whatever the map lists. The map's one widening, a route rule that names a `none` role, belongs to Declare the roles, not the introduction. :fact[0qb73i] :fact[p1xmp5]
- The second paragraph says where the map sits. You declare it once, as the adapter's `access` member. The engine's screens, their write actions, and the sidebar read it through the composed runtime. :fact[cvzb8z]
- The guard attaches the same map to every admin request but decides no per-route authorization. A route the site writes therefore checks the map itself, in its `load` and in each form action. SvelteKit runs a form action without running its page's `load` first. :fact[iwf4nu] :fact[2sd4if] :fact[5pyozi]
- The contract sentence closes the second paragraph. To restrict admin access, you declare a role vocabulary and an access map on the adapter, enforce the map on your route's reads and writes, deploy the change with the roles migration, assign the new role, and verify each role's reach.
- The third paragraph gives the running example in two sentences. The steps follow one example throughout. In it, a `webmaster` role is the only role besides owner that reaches the media library and the example site's signups screen at `/admin/signups`. :fact[3z1uxv]
- It then names the readers who arrive. One gates a custom admin screen's route, and one closes an engine screen such as the media library to most editors; the steps serve both in order. A reader who wants named roles alone on every engine screen also gets a link to Make the map exhaustive.
- The bounds follow the three paragraphs. They give the prior knowledge above, then a lead-in and a list of the subjects that belong to other pages. Each item names its subject first and links its page. A scope sentence may name the page.

**What it leaves to other pages:**
- Why the map only narrows and never acts as an allowlist by itself, in Security model, `security-model.md`. :fact[p1xmp5]
- Building a custom screen and its section actions in full, in Add a custom admin screen, `add-a-custom-admin-screen.md`.
- Hiding a sidebar entry without denying its route, in Arrange the admin sidebar, `arrange-the-admin-sidebar.md`.
- A role that signs in but reaches no engine content, such as a `none` role for a second sign-in group. It belongs to Add a second sign-in group, `add-a-second-sign-in-group.md`. :fact[4673n6]
- Moving an older site's map off its hooks and onto the adapter, in Upgrade cairn, `upgrade-cairn.md#when-your-range-crosses-the-one-declaration-change`.

**The argument.** An access map is a narrowing layer over the capability floor cairn already enforces. It is declared once on the adapter and read by every enforcement point. The engine's screens, their write actions, and the sidebar read it through the composed runtime, and the guard attaches the same map to every admin request for the site's routes. The engine gates its screens, but the guard decides no per-route authorization. A site's route therefore enforces the map itself, on its read and on every write, because SvelteKit runs a form action without its page's `load`. The two enforcement points read a target the map leaves out in opposite ways: an engine screen stays open, and a route that opted in refuses everyone. That is what makes the map safe to add incrementally and dangerous to forget on a new route. One running example carries the page: a `webmaster` role with editor capability that alone, with owners, reaches the media library and the example site's signups screen at `/admin/signups`. The role is declared on the adapter and enforced on the reader's route's load and actions, and the signups screen shows the finished form. It is deployed with the roles migration and assigned on the roster. A test editor proves it on the deployed site, meeting the admin's error page wherever the map excludes their role.

**Section order.** The sections run in the order each step depends on. The vocabulary comes before the map that names it, and the map before the routes that enforce it. The comparison of the two enforcement points comes once both are known, then how a key matches nested routes and sidebar entries. The file edits end before Deploy the changes, because the roster and every per-role check run on the deployed site. Assign the roles follows the deploy. Verify each role's reach, Resolve a refusal, and See also close the page, as the task-guide anatomy requires. The capability floor and the narrowing model sit in the introduction, because the reader needs the model before any step.
:::

:::constraints
- The page carries the map declared once on the adapter and read by the guard from the runtime. :fact[iwf4nu] :fact[4xrx5f] :fact[7cv105] :fact[cvzb8z] :fact[f21bcz]
- The page carries the none-capability rule. :fact[p1xmp5] :fact[4673n6]
- The page carries the roles migration. :fact[rn62i1] :fact[gepykz] :fact[xffr6i]
- The page carries the scaffold with no access member and no signups screen. :fact[3z1uxv] :fact[onqm6k] :fact[tycp7k]
- The page carries the admin error page a refusal renders. :fact[ty4ehh]
- The page never tells the reader to create or edit `src/access.ts` or to pass `roles` or `access` to `createAuthGuard` or `devBackendHandle`. Both declarations live in the adapter module, and the hooks file needs no edit. An older site's migration is Upgrade cairn's, linked from the introduction.
- The running example's role name, `webmaster`, is a name the page introduces. The brief lists it in `local`, and no fact carries it, so no sentence cites a fact for the name alone. In prose it is in code font wherever it names the role key, as in the code block.
- The select label `webmaster (editor)` is vouched by a fact. In prose it is in code font as a value, and in a step it is bold, **webmaster (editor)**, as the option the reader picks. :fact[2dgbff]
- Prose paths are vouched paths only: `/admin/signups`, `/admin/media`, `/admin/editors`, and `/admin/money` with its two neighbors. :fact[3z1uxv] :fact[onqm6k] :fact[joo5f2] :fact[udg87q] :fact[uhoyun]
- The signups screen is the example site's, and the scaffold does not ship it. Never call it the scaffold's.
- Do not claim that the setup command always applies `0001_roles.sql` to the remote auth database. It applies it only when it runs the site's first deploy, in its "Deploy to workers.dev" step, which a declined deploy or `--yes` without `--deploy` skips. :fact[m4y3m4]
- Do not claim that applying an already-applied migration is a no-op; no fact states it. The apply step stands for every site.
- Imports: `defineAdapter`, `defineRoles`, and `defineAccess` from `@glw907/cairn-cms`; `createAuthGuard`, `requireAccess`, `requireEditor`, and `createSectionAction` from `@glw907/cairn-cms/sveltekit`.
- The code block in Declare the access map marks the map's other keys as elided, with a comment such as "the site's other keys, unchanged". The page never shows or tells the reader to replace the whole `access` map. A dropped key leaves its route calling `requireAccess` with no rule, which refuses every session, owner included. In the example, the theme-kit key stays. :fact[zo034s]
- The reader arrives with a site route under `/admin` whose `load` and form actions do not yet check the access map. The adapter may or may not have an `access` member. :fact[3z1uxv]
- The page never presupposes the route's map key, its `requireAccess` call, or its `createSectionAction` wrappers. Declare the access map adds the key, and Enforce the map on your routes adds the call and the wrappers.
- The example site's signups screen appears only as the finished form of those steps and as the screen the checks name. It is never the reader's starting state. Its owner-only starting map is the example site's, not the reader's. :fact[onqm6k] :fact[3z1uxv]
- Keep the heading of Make the map exhaustive stable: `docs/extend/security-model.md` sends a reader here for the steps of an exhaustive map.
- No manufactured scenario beyond the running example: the introduction states who arrives and why without inventing an organization or its people.
- Each step names its location before its action and holds one action. A conditional step states its condition first, and the condition alone tells who skips it. A step adds a skip sentence only where the skip reaches past the step itself, or where the running example skips it. A push that skips the build and deploy steps is one such case.
- The checks in Verify each role's reach and Resolve a refusal are numbered lists.
- The exemplar `extenders/sveltekit-hooks/` is an Extenders reference entry. Take "where it goes, when it runs, a typed example, the default when unset" per piece. Take the placement of the security trap, stated in the same paragraph as the value that invites the misuse. In the capture it sits in the remote-function paragraph; imitate its placement, not its subject. Leave the remote-function tangents.
- A second exemplar, `extenders/django-custom-management-commands/`, is an Extenders task guide. Take one running example (restrict media and a custom route to one role) carried through declaration, guard, and verification. Leave the class reference.
- Subordinate `f:gun084` to `../reference/sveltekit.md#createauthguard`. That entry states the whole config bag (`runtime`, `includeSubDomains`, `identity`) and that the guard reads `roles` and `access` off the runtime and attaches the map. The page needs only the `{ runtime }` call, which `f:4xrx5f` and `f:iwf4nu` carry. The other options belong to other tasks.
- Subordinate `f:5iqvmt` to `security-model.md#limits-of-the-browser-binding`. Sign-in browser binding is off this page's job, which is access after sign-in. That section states that a row with no binding matches a cookieless confirm.
- Subordinate `f:bw5uk0` to `../reference/cli-cairn-doctor.md`. Which conditions the `cairn` CLI checks raise is the doctor reference's subject, and the page names no doctor condition.
- Subordinate `f:hwffph` to `../reference/cli-cairn-doctor.md`. `auth.role-wiring-missing` describes a guard called without `runtime`, which `f:4xrx5f` makes a type error on this engine. A guard built without one throws when the hooks module loads, so the task cannot produce it. The doctor reference carries the condition for older engines.
- Cut `f:eiaqkh`. The example site's dev-backend swap in its hooks file is engine-repository wiring a reader's site does not carry. The scaffold's hooks, placed through `f:f21bcz`, are what the reader has.
- Cut `f:gcuj1j`. What a deploy creates (one Worker, one D1, one R2 bucket) is the admin track's setup subject, off this page's job. The admin arm holds no page to link yet.
- Cut `f:vfpai6`. The five things the setup command creates or connects are the admin track's setup subject, off this page's job. The admin arm holds no page to link yet.
- Cut `f:xw0bit`. The setup command's closing summary is the admin track's setup subject, off this page's job. The admin arm holds no page to link yet.
- Subordinate `f:l3cxgc` to `scaffolded-site-files.md`. The scaffold's `wrangler.jsonc` bindings and the doctor transcript belong to the scaffold's file reference page, and this page binds nothing new.
- Subordinate `f:lml542` to `../reference/auth-store.md#deleteeditor`. Removing an editor's preview tokens is roster removal, not role assignment. The `deleteEditor` entry states that the editor's preview links go with them.
- Subordinate `f:mbx6q1` to `../reference/sveltekit.md#createeditorroutes`. The roster routes' validation against the declared vocabulary is the `createEditorRoutes` entry's subject. The page assigns roles through the admin's mounted roster and never wires those routes by hand.
- Subordinate `f:n7t4bn` to `add-a-custom-admin-screen.md#before-you-begin`. The signups screen's second database belongs to building that screen. This page uses the screen only as the finished form of its enforcement steps.
- Subordinate `f:nv0ok0` to `add-a-custom-admin-screen.md#before-you-begin`. The signups table's migrations directory belongs to building that screen. This page uses the screen only as the finished form of its enforcement steps.
- Subordinate `f:pfy9cw` to `../reference/log-events.md`. The field list of `config.access_unmapped` and the admin-action events is the log-events reference's table. The page's check reads only the `unmapped` list, which `f:8ciz2s` carries.
- Subordinate `f:qlgggh` to `scaffolded-site-files.md#file-tree`. The scaffold's full root and `src` listing is the scaffold file reference's subject. The one clause this page needs (no `access` member, no `src/access.ts`) comes from `f:3z1uxv`.
- Subordinate `f:qtm9y2` to `scaffolded-site-files.md#routes-and-the-server-hook`. The scaffold's route listing is the scaffold file reference's subject. The admin error page this page needs comes from `f:ty4ehh`.
- Subordinate `f:u78zg6` to `../reference/log-events.md`. With the map declared once and attached by both handles, `access_map_not_attached` cannot arise behind the hooks, so it is not a failure this task produces. The log-events row for `admin.action.misconfigured` states when it fires.
- Subordinate `f:wnsv5x` to `scaffolded-site-files.md`. The scaffold's `src/lib/log.ts` is the scaffold file reference's subject and plays no part in restricting access.
:::

## Before you begin

*List what the task needs before any step, each with the page that produces it: an admin route whose reads and writes do not yet check the access map, and a deployed site with a second person to sign in as, since the dev backend mints an owner editor on `/admin`.*

- Before you start, have the following in place:
- A site that `create-cairn-site` scaffolded, or one built by hand as in Add cairn to a SvelteKit app. Its adapter may or may not have an `access` member. :fact[gepykz] :fact[3z1uxv]
- See [Add cairn to a SvelteKit app](add-cairn-to-a-sveltekit-app.md).
- On a scaffolded site the adapter module is `src/theme/cairn.config.ts`, and on a hand-built site it is the module that calls `defineAdapter`. The tutorial's own path, the manifest, and its hooks clause stay out. :fact[q07rd5] :fact[2zytgf]
- A fresh scaffold's adapter declares no `access` member. The example site's map belongs to Declare the access map. :fact[3z1uxv]
- A site route under `/admin` whose `load` and form actions do not yet check the access map, such as one whose `load` calls `requireEditor`. :fact[8anql1] :fact[5pyozi]
- A deployed site and a way to redeploy it, as in Move the site to production.
- See [Move the site to production](add-cairn-to-a-sveltekit-app.md#move-the-site-to-production).
- The checks need a deployed site because the dev backend mints an owner editor on every `/admin` request. It never reads `runtime.roles`, so no role refusal shows in local development. :fact[dqjkci] :fact[7cv105]
- An email address for a test editor besides the owner's, and a second browser to sign in as that editor.
- If the site copies `0001_roles.sql` in and added columns to the auth database's `editor` table, an edited copy of the file. The file rebuilds `editor` with only the engine's four columns. The copy adds each of the site's columns to `editor_new` and to both column lists of its `INSERT` before it is applied. When the file is needed and where a site gets it belong to Deploy the changes. :fact[rn62i1] :fact[xffr6i]
- The map admits roles by name, so the vocabulary comes first.

## Declare the roles

*Declare the role vocabulary on the adapter before the map, since the map admits roles by name and `defineAccess` validates every role name against the vocabulary it is given.*

- The role vocabulary maps each role name to the capability it resolves to. :fact[zjglk8] :fact[2zytgf]
- The vocabulary is the adapter's optional `roles` member, which sits beside its optional `access` member. :fact[2zytgf]
- Each role's declaration is either a bare capability or an object whose `capability` member names one. :fact[zjglk8]
- A role with `none` capability still signs in, but the engine's content and roster screens refuse it. The `staff` example stays out. :fact[4673n6]
- In the same paragraph, the map's one widening: a route rule that names a `none` role admits that role. :fact[p1xmp5]
- See [Add a second sign-in group](add-a-second-sign-in-group.md) for a sign-in group that reaches only such routes.
- `owner` is the one reserved role name: `defineRoles` throws when the vocabulary lacks an `owner` key mapped to owner capability. The rest of the validation list stays in the reference entry. :fact[dbaklx]
- See [`defineRoles`](../reference/core.md#defineroles) for its other checks.
- The trap sits in the paragraph with the vocabulary. A role name absent from the vocabulary resolves to `none`, and renaming or dropping a role the roster still holds shuts its editors out of the engine's content screens. That is why the example keeps `editor` beside `webmaster`. :fact[zjglk8] :fact[4673n6]
- An adapter that declares no `roles` resolves every session against the default `owner` and `editor` pair. :fact[4xrx5f]
- To declare the roles, follow these steps:
1. In the adapter module, export a `roles` vocabulary built with `defineRoles` that maps `owner` to `'owner'` and both `editor` and `webmaster` to `'editor'`. :fact[dbaklx] :fact[zjglk8] :fact[2zytgf]

:::row
**Symptom.** The server start throws from `defineRoles`. :fact[dbaklx]
**Cause.** The vocabulary fails a check the `defineRoles` entry lists, such as a missing `owner` key. :fact[dbaklx]
**Fix.** Correct the vocabulary the first step declares against those checks.
:::

2. In the same file, add `roles` to the `defineAdapter` call. :fact[2zytgf]

- The map names these roles.

## Declare the access map

*Declare the map on the adapter after the roles it names, with where it goes and the page's one code block showing both declarations, since the guard reads the map from the runtime.*

- The access map keys each target, an engine screen id or an `/admin` route path, to the role names it admits. :fact[0qb73i]
- A screen id is a declared concept or one of the fixed screens `media`, `vocabulary`, `nav`, and `settings`, and a route path starts with `/admin`. Each value lists role names from the vocabulary. The owner rule stays in the introduction. :fact[0qb73i]
- The map goes on the adapter as its `access` member, and nowhere else, and `composeRuntime` carries it onto the runtime. The earlier-versions clause stays out. :fact[iwf4nu]
- In the same paragraph, both handles take that runtime. `createAuthGuard` reads `roles` and `access` from it. `devBackendHandle` reads only its `access`, which it attaches to each `/admin` request it mints an owner editor for. :fact[4xrx5f] :fact[7cv105]
- See [`createAuthGuard`](../reference/sveltekit.md#createauthguard).
- Closing the same paragraph: the scaffold's `src/hooks.server.ts` already passes the runtime to both handles and needs no edit. The dev-gate mechanics stay out. :fact[f21bcz]
- The example site's adapter starts with `defineAccess(undefined, { ... })` and two owner-only route rules, one of them for `/admin/signups`. :fact[3z1uxv]
- To declare the map, follow these steps:
1. If the adapter already declares `access`, in its `defineAccess` call, pass `roles` as the first argument in place of `undefined`. The example site's call takes this step. :fact[grxpu5] :fact[3z1uxv]
2. If the adapter has no `access` member, in the `defineAdapter` call, add `access` set to a `defineAccess` call that passes `roles` first. :fact[2zytgf] :fact[grxpu5]
3. In the `access` map, add a `media` key that admits `webmaster`, and a key for your route's path that lists the roles that reach it. In the example, the `/admin/signups` key admits `webmaster` in place of its owner-only rule. Keep every other key. :fact[0qb73i] :fact[3z1uxv]

- Beside the keep-every-key clause: a route whose key you drop still calls `requireAccess`, and with no rule for its path it refuses every session, owner included. :fact[zo034s]
- Code: an excerpt of the example site's adapter module showing both declarations. Its lead-in says the adapter's other members and the map's other keys are elided. It imports `defineAccess`, `defineAdapter`, and `defineRoles` from `@glw907/cairn-cms` and declares the `roles` vocabulary. The `defineAdapter` call carries `roles` and `access: defineAccess(roles, { ... })`, with comments marking the elided members and keys. A snippet-check skip marks it as an excerpt.

<!-- snippet-check-skip: an excerpt that elides the adapter's required content, backend, email, and rendering groups -->
```ts
// src/theme/cairn.config.ts (excerpt)
import { defineAccess, defineAdapter, defineRoles } from '@glw907/cairn-cms';

export const roles = defineRoles({ owner: 'owner', editor: 'editor', webmaster: 'editor' });

export const cairn = defineAdapter({
  // content, backend, email, rendering, and the other members stay as they are
  roles,
  access: defineAccess(roles, {
    media: ['webmaster'],
    '/admin/signups': ['webmaster'],
    // the site's other keys, unchanged
  }),
});
```

- The trap sits in the paragraph right after the block, beside the `media` key. A `media` key also reaches the image picker inside each image-bearing concept's editor. The picker's upload is refused for a role the key leaves out. Picking an image the library already holds makes no request, though, so that role can still insert an existing library image. :fact[iewhzh]
- In the same paragraph, the media library's write actions gate against `media` as well. The other engine actions stay with the link. :fact[cvv6to]
- See [Limits of access map coverage](security-model.md#limits-of-access-map-coverage) for what the map covers on the other engine screens.
- Three calls check the map. `defineAccess` checks it at construction and throws a `defineAccess:` error on an empty map, an empty role list, a role name outside the vocabulary, or a malformed key. `composeRuntime` checks the map's role names against the adapter's vocabulary and throws an `access:` error on a role the vocabulary does not declare. When the admin routes are built at server start, `createContentRoutesContext` throws an `access:` error on a screen id that is neither a declared concept nor a fixed screen, and on a route key that collides with a built-in admin view. The key checks are never attributed to `composeRuntime`. :fact[3z48zf]
- In the same paragraph, a map given `undefined` for its vocabulary validates against the default pair, so a map that names `webmaster` needs `roles` as its first argument. :fact[grxpu5]
- Each error message but the empty-map one names the key at fault, and the role where a role is at fault. :fact[3z48zf]

:::row
**Symptom.** The server start throws a `defineAccess:` or `access:` error naming a key or a role. :fact[3z48zf]
**Cause.** The map breaks one of `defineAccess`'s construction checks or one of the key checks the admin routes run when they are built at server start. :fact[3z48zf]
**Fix.** Correct the map against these checks and restart. :fact[3z48zf]
:::

- See [`defineAccess`](../reference/core.md#defineaccess) for the full list of checks.
- See [Decide what the map leaves open](#decide-what-the-map-leaves-open) for what happens to a target the map leaves out.
- Your routes enforce the map through two calls. :fact[8anql1] :fact[3s23un]

## Enforce the map on your routes

*Add the map's check to the reader's route, on its `load` and on each form action, after the key is declared so the route's `requireAccess` call never refuses everyone. The example site's signups screen shows the form the steps produce.*

- Your routes check the map themselves, with `requireAccess` in each `load` and a `createSectionAction` wrapper around each form action. :fact[2sd4if]
- The guard admits a signed-in session to the `/admin` subtree before any `load` runs, and the route itself decides which roles reach it. :fact[2sd4if]
- The example site's signups screen shows the finished form of these steps, never the reader's starting state. Its `load` calls `requireAccess`, and its `create` and `remove` actions are `createSectionAction` wrappers, with `ownerOnly: true` on `remove` alone. `APP_DB` and the migration stay out. :fact[onqm6k]
- `requireAccess` checks the route id, `event.route.id`, by default, never the request URL. A parameterized route's URL is whatever the requester sends, but its route id is fixed. :fact[54d3ui]
- In the same paragraph: `requireAccess` returns the session the guard resolved and redirects to login when there is none. When the map has no rule for the target, or the rule does not admit the session's role, it refuses with a 403 and logs `auth.access.refused`. The reasons, the route-id normalization, and `requireEditor` wait for later sections. :fact[8anql1]
- The trap sits in the paragraph with the `load` call. The `load` call never gates the route's form actions. SvelteKit runs a matched action without running the page's `load` first, so an action that skips the check is reachable behind a guarded page. :fact[5pyozi]
- `createSectionAction` runs the CSRF check and the access check before its handler. Its default target is the route id with route groups dropped, the same target `requireAccess` reads. :fact[3s23un] :fact[8anql1]
- See [`createSectionAction`](../reference/sveltekit.md#createsectionaction) for its other options.
- Setting `ownerOnly: true` requires owner capability in addition to the map's rule for the target, never in place of it. :fact[smbsa6]
- To enforce the map on a route, follow these steps:
1. In the route's `+page.server.ts`, call `requireAccess(event)` at the top of `load`, before it reads anything, in place of any `requireEditor` call. :fact[8anql1] :fact[onqm6k]
2. In the same file, wrap each form action in a `createSectionAction` wrapper. :fact[3s23un]

- See [Choose the action wrapper](add-a-custom-admin-screen.md#choose-the-action-wrapper) for setting up the wrapper.

3. For an action only an owner may run, set `ownerOnly: true` in its wrapper's options. :fact[smbsa6]

- The two enforcement points treat a target the map never names in opposite ways. :fact[zo034s]

## Decide what the map leaves open

*Compare how the engine's screens and the site's routes treat a target the map never names, once both enforcement points are known.*

- An unnamed engine screen stays open to every editor-capability role, while an unnamed route that calls `requireAccess` refuses every session, owner included. :fact[zo034s]
- A route that every editor-capability role should reach can call `requireEditor` instead. That call never consults the map. :fact[8anql1]
- When the map declares at least one screen-id key, building the admin routes logs a `config.access_unmapped` warning. Its `unmapped` list names each declared concept and fixed screen that carries no screen-id key. A route key never counts toward that list, and a map of route keys alone logs nothing. The shape checks stay out. :fact[8ciz2s] :fact[3z48zf]
- See [Allowlist semantics from an exhaustive map](security-model.md#allowlist-semantics-from-an-exhaustive-map) for why the map alone never acts as an allowlist.
- A site that wants named roles alone on every engine screen closes the gap the warning names.

### Make the map exhaustive

*Close the engine-screen half of the gap, under Decide what the map leaves open, by keying every target the warning names. Verify each role's reach reads the same warning.*

- A map is exhaustive when it keys every concept and fixed screen, and `config.access_unmapped` then stops firing. :fact[8ciz2s]
- To make the map exhaustive, take this step, a single-step procedure written as one bullet:
- In the adapter module's `access` map, add a key for each target the warning's `unmapped` list names, listing the roles that reach it. :fact[8ciz2s]
- The running example leaves the warning in place and skips this step.
- One sentence follows the step. With every target keyed, the tidy and personal-dictionary actions gate against the entry's concept like any entry action, and the site-wide publish filters each entry by its concept. The rest stays with the link. :fact[cvv6to]
- See [Limits of access map coverage](security-model.md#limits-of-access-map-coverage) for what the map still leaves uncovered.
- A route key reaches beyond the route it names. :fact[uhoyun]

## Key nested and parameterized routes

*Show how a route key matches a route id, which decides whether a target counts as unnamed, and have the reader declare the target on a route the matching misses.*

- A route key governs its path and every path beneath it, matched by the deepest whole-segment prefix the map holds. The key `/admin/money` also governs `/admin/money/refunds` unless the map holds a deeper key, and it never matches `/admin/moneyx`. The nav half belongs to Sidebar entries. :fact[uhoyun]
- `requireAccess` reads the route id with its route groups dropped, but it keeps a parameterized id verbatim. :fact[8anql1]
- A worked example is the trap in the same paragraph. Suppose the map holds `/admin/money` and the deeper `/admin/money/refunds`. A route under `/admin/money` whose next segment is a dynamic or rest parameter, such as `[id]`, then resolves to no rule and refuses every session until it declares `target`. :fact[uhoyun] :fact[8anql1] :fact[lmtfkt]
- A separate rule opens with "Separately". A section action's `target` is required on any route that carries a rest parameter or serves more than one section, and a declared `target` is used verbatim. :fact[3s23un]
- To declare the target on such a route, follow these steps:
1. If the route has one of these parameters or serves several sections, in its `+page.server.ts`, pass the governing key to `requireAccess` as its second argument. :fact[8anql1] :fact[onqm6k]
2. If you passed a key to `requireAccess`, in the same file, set `target` to that key in each section action's options. :fact[3s23un] :fact[8anql1]

- The sidebar applies the same matching to its entries. :fact[uhoyun]

## Sidebar entries

*Show which sidebar entries the map gates, and the trap of a site entry whose href no key matches, which needs both the matching rule and the route refusal.*

- The sidebar reads the adapter's map through the same check the routes use. A keyed entry therefore shows to the roles its key admits and to an owner. :fact[altcjp] :fact[cvzb8z]
- An engine screen's entry follows the map directly, and a site entry in the adapter's `navLayout` is gated only when a key matches its href. :fact[altcjp]
- The scaffold's `navLayout` holds only engine entries. The example site adds a Signups site entry for `/admin/signups`, and the example's `/admin/signups` key gates it. :fact[tycp7k]
- The trap: an entry whose href no key matches stays visible to every editor-capability session. A route behind it that calls `requireAccess` refuses every session. The prefix matching stays in Key nested and parameterized routes. :fact[uhoyun] :fact[zo034s]
- The deployed site still runs without these edits.

## Deploy the changes

*Get the roles migration into the auth database and the edits onto the deployed site, after the last file edit, because the roster and every per-role check run on the deployed site and a custom role cannot be written before the migration.*

- The roster and the per-role checks run on the deployed site.
- A vocabulary beyond the default pair needs `0001_roles.sql` in the auth database. :fact[rn62i1]
- You apply it by hand with Wrangler before you redeploy, since neither redeploy path applies a migration. The engine-upgrade framing stays out. :fact[jtl15v] :fact[xxtooz]
- A scaffolded site's `migrations/` already holds the file, and the setup command applies it when it runs the site's first deploy. The rest of the migration set, the audit migration, the `PUBLIC_ORIGIN` write, and the second deploy stay out. :fact[gepykz] :fact[m4y3m4]
- A hand-built site never receives the file and copies it from the package, as does a site scaffolded before the file shipped. :fact[hft8s8] :fact[rn62i1]
- The paragraph closes on one pointer sentence: applying the file rebuilds the `editor` table, as Before you begin notes. The automated-apply clause and `0003_preview.sql` stay out. :fact[rn62i1]
- See [Before you begin](#before-you-begin).
- To apply the roles migration, follow these steps:
1. If the site's `migrations/` directory lacks `0001_roles.sql`, in the project directory, copy the file from the package's `migrations/` directory. :fact[gepykz] :fact[xxtooz]

- Code: the `cp` command that copies `0001_roles.sql` from `node_modules/@glw907/cairn-cms/migrations/` into `migrations/`.

```bash
cp node_modules/@glw907/cairn-cms/migrations/0001_roles.sql migrations/
```

2. In the project directory, apply pending migrations to the auth database with `wrangler d1 migrations apply` and the `--remote` flag. :fact[xxtooz] :fact[jtl15v]

- Code: the `npx wrangler d1 migrations apply` command with an `<auth-database-name>` placeholder and `--remote`.

```bash
npx wrangler d1 migrations apply <auth-database-name> --remote
```

- A lead-in says the redeploy takes one of two paths, matching how the site deploys. One is a push to a repository connected to Workers Builds, and the other a build and deploy with Wrangler. :fact[qca0t0]
- Three short sentences follow. Both paths run the same two commands, a build and a deploy. Neither path applies a migration. That is why the apply step comes first. :fact[jtl15v]
- The setup command offers to connect Workers Builds in its chapter 3, during the same setup run. A connected repository deploys on every push to its default branch. On a site from its live step onward, `npx create-cairn-site --dir <site-directory> --connect` re-enters that chapter. :fact[qca0t0]
- To redeploy the site, follow these steps:
1. If the repository is connected to Workers Builds, in the project directory, push the changes to its default branch. The push deploys them, and a site deployed this way skips the next two steps. :fact[qca0t0]
2. Otherwise, in the project directory, build the site with `npm run build`. :fact[jtl15v]
3. In the same directory, deploy the build with `npx wrangler deploy`. The workers.dev address and `wrangler login` stay out. :fact[9ug9mo]

- See [Deploy a change](add-cairn-to-a-sveltekit-app.md#deploy-a-change), which covers both paths in full.
- The deployed roster now offers the new role.

## Assign the roles

*Have the owner assign the new role on the deployed roster, and introduce the role select the checks use to move the test editor between roles.*

- A declared role reaches no one until an owner assigns it on the roster. :fact[pwb0wr]
- As the sentence after it: only an owner can add or remove editors and change their roles. :fact[pwb0wr]
- The **Add editor** form below the roster table carries a **Role** select. :fact[udg87q]
- A role whose name differs from its capability is listed as its name followed by the capability in parentheses, so `webmaster` reads `webmaster (editor)`. :fact[2dgbff]
- To assign the role, follow these steps:
1. In `/admin/editors` on the deployed site, as the owner, add the test editor through the **Add editor** form, choosing **webmaster (editor)** as its **Role**. :fact[udg87q] :fact[2dgbff]

:::row
**Symptom.** The add fails, and the site logs `admin.action.failed` with the `conditionId` `auth.store-roles-unmigrated`. :fact[7ele62] :fact[xffr6i]
**Cause.** The auth database still lacks `0001_roles.sql`, so the `editor` table accepts only `owner` and `editor`. :fact[xffr6i]
**Fix.** Apply the migration as [Deploy the changes](#deploy-the-changes) does, then add the editor again.
:::

2. In a second browser, sign in as the test editor.

- For an editor already on the roster, the row's role select picks the new role, and its separate **Change** button saves it. The default-pair toggle and the accessible label stay out. :fact[dfxxwb]
- The section closes on the next-request rule. A role change applies on the editor's next request, with no new sign-in, so the checks that follow move one test editor between roles. :fact[uotol3] :fact[dfxxwb]

## Verify each role's reach

*Close the steps on proof: each check reads the deployed map through the role the test editor holds.*

- On the deployed site, the `config.access_unmapped` warning names the targets the map leaves open. A role the map excludes gets the admin's error page. :fact[8ciz2s] :fact[ty4ehh]
- The checks name the example site's signups screen at `/admin/signups`. On your site, the route you gated stands in for `/admin/signups`, and its actions stand in for the signups add and delete. A route with no owner-only action skips the delete check. :fact[onqm6k] :fact[3z1uxv]
- To verify the map, run these checks in order:
1. In Workers Logs, query `config.access_unmapped` across the cold start that followed the deploy. The record's `unmapped` list names every concept and fixed screen except `media`. :fact[mou1li] :fact[8ciz2s]

- As the check's caveat: the warning fires once per isolate at server start, so a query scoped to a live request window can miss it. :fact[mou1li]

:::row
**Symptom.** The query returns no `config.access_unmapped` record. :fact[mou1li]
**Cause.** The record fires only when the admin routes are built at server start, once per isolate, so a window that misses the cold start misses it. :fact[mou1li]
**Fix.** Widen the query window to cover the cold start after the deploy, since no request after server start logs the warning again. :fact[mou1li]
:::

2. In `/admin/editors`, in the test editor's row, choose **editor** in the role select. :fact[dfxxwb]
3. In the same row, select **Change**. :fact[dfxxwb]
4. In the test editor's browser, check the sidebar. The media library entry is gone, and so is a Signups entry where the site's `navLayout` carries one, as the example site's does. :fact[altcjp] :fact[tycp7k]
5. In the same browser, open **Posts**. The list opens, because the map names no `posts` key and an unnamed engine screen stays open to editor capability. :fact[5eum60] :fact[zo034s]
6. In the same browser, open `/admin/signups`. The admin's error page shows the heading `You don't have access to this page.` The site logs `auth.access.refused` with the role and the target. :fact[3z1uxv] :fact[ty4ehh] :fact[8anql1]
7. In the same browser, open `/admin/media`. The same error page shows, and the site logs `auth.access.refused` with the target `media`. :fact[joo5f2]
8. In `/admin/editors`, in the test editor's row, choose **webmaster (editor)** in the role select. :fact[dfxxwb] :fact[2dgbff]
9. In the same row, select **Change**. :fact[dfxxwb]
10. In the test editor's browser, reload the admin. The media library entry is back in the sidebar, and so is the Signups entry where the site's `navLayout` carries one. The media library and `/admin/signups` both open, with no new sign-in. :fact[altcjp] :fact[uotol3] :fact[3z1uxv]
11. On the signups screen, enter a name and an email, then select **Add**. The status line reads `Signup added.`, and the table lists the new row. :fact[7ji7x0]

:::row
**Symptom.** The site refuses the add for the `webmaster` session and logs `auth.access.refused`. :fact[xbjxit]
**Cause.** The add action carries `ownerOnly: true`, or it checks a different target than the load, because one of them declares a `target` the other does not. :fact[3s23un] :fact[8anql1] :fact[smbsa6]
**Fix.** Set the same `target` in each section action, as [Key nested and parameterized routes](#key-nested-and-parameterized-routes) does. :fact[3s23un]
:::

12. On the signups screen, select **Delete** on the signup you added. :fact[b0kf86]
13. In the confirmation dialog, select **Delete**. The dialog stays open, the status line reads `You do not have access to this action.`, and the site logs `auth.access.refused`. :fact[b0kf86] :fact[thnbyp] :fact[xbjxit]

- The remove is refused because `remove` carries `ownerOnly: true`, while the map admits `webmaster` to the screen. :fact[smbsa6] :fact[onqm6k]
- `createSectionAction` refuses with `fail(403)`, and the screen closes the dialog only on success. `createAdminAction` and `deniedMessage` stay out. :fact[xbjxit] :fact[thnbyp]
- See [Resolve a refusal](#resolve-a-refusal) for a result that differs from these checks.

## Resolve a refusal

*Trace a result that differs from the verification to its cause, pairing each symptom with the log record or the code that explains it and the step that fixes it.*

- Each check pairs a symptom from the verification with the log record or the code that explains it.
- To find the cause, run these checks in order:
1. If a route refuses every session, owner included, and the `auth.access.refused` record's `reason` reads `no_rule`, the map has no key for the route's target. Add the key as Declare the access map does. :fact[8anql1] :fact[zo034s]
2. If a parameterized route refuses every session and the record's `reason` reads `shadowed`, a deeper map key hides the route's rule. Declare the route's `target` as Key nested and parameterized routes does. :fact[8anql1]
3. If the `webmaster` session is refused on your route or the media library, and the record names `webmaster`, the target's key does not list it. On a route, the record's `reason` reads `role`. The example site's starting `/admin/signups` key is one such owner-only key. Add `webmaster` to the key. :fact[8anql1] :fact[joo5f2] :fact[0qb73i] :fact[3z1uxv]
4. If a `webmaster` editor sees only the welcome view at `/admin` and is refused on every other admin screen, check the logs for `auth.role.unknown`. That event means the role is absent from the adapter's vocabulary, so it resolves to `none` and no map rule can name it. Add the role to `defineRoles` as Declare the roles does. :fact[4bazhe] :fact[kqcyv1] :fact[zjglk8] :fact[dbaklx]
5. If adding a `webmaster` editor fails on `/admin/editors`, apply `0001_roles.sql` to the remote auth database, as Deploy the changes does. :fact[xffr6i] :fact[rn62i1] :fact[udg87q] :fact[3z1uxv]
6. If the signups screen opens for an `editor` session and the route's `load` calls `requireEditor`, replace that call with `requireAccess`. Enforce the map on your routes covers the call. :fact[8anql1] :fact[onqm6k]
7. If the signups screen or the media library still opens for an `editor` session, the deployed Worker predates your edits. Redeploy as Deploy the changes does. :fact[joo5f2] :fact[8anql1]
8. If the delete succeeds for the `webmaster` session, the remove action lacks `ownerOnly: true`, or another action carries it instead. Set it on the remove wrapper as Enforce the map on your routes does. :fact[smbsa6] :fact[onqm6k] :fact[3s23un]

- See [Declare the access map](#declare-the-access-map).
- See [Key nested and parameterized routes](#key-nested-and-parameterized-routes).
- See [Declare the roles](#declare-the-roles).
- See [Deploy the changes](#deploy-the-changes).
- See [Enforce the map on your routes](#enforce-the-map-on-your-routes).
- See [Debug your site](debug-your-site.md) for symptoms outside this list.

## See also

*Point to the pages and references behind the steps, as the anatomy closes a task guide.*

- The following pages cover the reasoning and the tasks around the access map:
- See [Security model](security-model.md).
- See [Add a custom admin screen](add-a-custom-admin-screen.md).
- See [Arrange the admin sidebar](arrange-the-admin-sidebar.md).
- See [Add a second sign-in group](add-a-second-sign-in-group.md).
- See [Upgrade cairn: the one-declaration change](upgrade-cairn.md#when-your-range-crosses-the-one-declaration-change).
- See [The access map reference](../reference/core.md#access-map).
- See [The `requireAccess` reference](../reference/sveltekit.md#requireaccess).
- See [Log events](../reference/log-events.md).
