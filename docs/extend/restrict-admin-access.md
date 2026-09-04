# Restrict admin access by role

Declare which roles reach which screens, and have the sidebar and every route agree on it in one
place.

Capability is the floor cairn already enforces: `owner`, `editor`, or `none`, resolved from your
[declared role vocabulary](../reference/core.md#roles). The access map sits on top of that floor
and narrows it further, per screen or per route. It never widens what a capability already
permits.

**Precondition:** a role vocabulary to validate the map's role names against. If your adapter
already declares one with [`defineRoles`](../reference/core.md#defineroles) (see [Add a second
audience](./add-a-second-audience.md) for a worked example), pass that same value. If it doesn't,
pass `undefined`: [`defineAccess`](../reference/core.md#defineaccess) then validates the map's
role names against the implicit `{ owner: 'owner', editor: 'editor' }` pair a site with no
declared vocabulary already resolves against.

## Declare the map

```ts
// src/lib/cairn.access.ts
import { defineAccess, type RolesDeclaration } from '@glw907/cairn-cms';

// Your own declared vocabulary, whatever module you keep it in. Pass `undefined` instead if you
// have not declared one; see the precondition above.
declare const roles: RolesDeclaration | undefined;

export const access = defineAccess(roles, {
  pages: ['webmaster'],
  media: ['webmaster', 'publisher'],
  '/admin/club/payroll': ['club-admin'],
});
```

A key is either an engine screen id (a declared concept, or one of `media`, `vocabulary`, `nav`,
`settings`) or an `/admin`-prefixed route path. Its value is the role names admitted there,
matched against the names your [`defineRoles`](../reference/core.md#defineroles) declaration
uses. Owner capability reaches every mapped target regardless of what the role list says, the
same floor `canReach` enforces everywhere else, so the map narrows editor-capability sessions
only. Write a role list for every target you want editors to reach in a limited way. There's no
need to name `'owner'` in it, since an owner session isn't checked against the list at all.

Pass the same `access` value to both the adapter's own `access` member and
[`createAuthGuard`](../reference/sveltekit.md#createauthguard)'s `access` option, the same
declare-once pattern `roles` already follows:

```ts
// src/hooks.server.ts
import { createAuthGuard } from '@glw907/cairn-cms/sveltekit';
import { roles } from './lib/cairn.config.js';
import { access } from './lib/cairn.access.js';

export const handle = createAuthGuard({ roles, access });
```

If your site runs other `Handle` functions of its own, chain them with `sequence` from
`@sveltejs/kit/hooks`, with `createAuthGuard` somewhere in the chain: it's the one that attaches
`locals.cairnAccess`, which every downstream `requireAccess` call needs.

The guard attaches the map to `locals.cairnAccess` on every request, alongside the resolved
editor, so nothing downstream needs to pass it around by hand.

## Enforce it on your own route

Call [`requireAccess`](../reference/sveltekit.md#requireaccess) in the route's `load`:

```ts
// src/routes/admin/club/payroll/+page.server.ts
import { requireAccess } from '@glw907/cairn-cms/sveltekit';

export const load = (event) => {
  const editor = requireAccess(event); // denies every role the map doesn't name for this path
  return { displayName: editor.displayName };
};
```

`requireAccess` checks `event.route.id` by default, not the request URL: on a parameterized or
catch-all route the URL is attacker-chosen and the route id isn't, so the map stays keyed by URL
shape (route-group segments dropped) rather than by a string a request can forge. Give a route
its own `target` argument only when it serves more than one logical section, or carries a rest
parameter, since the derived default can't disambiguate those on its own.

**A target absent from the map behaves the opposite way for a route than it does for an engine
screen.** An engine screen with no map entry stays open to any editor-capability session
(today's zero-config behavior, unchanged). A route that calls `requireAccess` with no rule at all
for its own path refuses *every* session, owner included: the helper's contract is "this route
opted into the map, and the map has no opinion on it," treated as a misconfiguration rather than
a decision. A route that wants the plain any-editor behavior shouldn't call `requireAccess` for
that path; reach for `requireSession` or `requireEditor` instead.

Gate the matching action the same way, or build the whole section on
[`createSectionAction`](../reference/sveltekit.md#createsectionaction), which already runs the
same access check before its handler: see [Add a custom admin
screen](./add-a-custom-admin-screen.md) for the full worked route. **A page's `load` gating a
read never gates the POST to its own action.** SvelteKit dispatches a matched form action with
no ancestor `load` run first, so an unguarded action is reachable even behind a guarded page.

Restricting `media` restricts more than the media library screen: the inline image picker inside
every image-bearing concept's editor calls the same access-gated endpoint, so a role that edits
one of those concepts also needs `media` reachable, or its picker breaks.

## `ownerOnly` stacks on the map, not the nav

[`createSectionAction`](../reference/sveltekit.md#createsectionaction) and
[`adminAction`](../reference/sveltekit.md#adminaction) both accept an `ownerOnly` option, unrelated
to the `ownerOnly` a [`navLayout`](./organize-your-admin-nav.md) entry carries. The nav one is
cosmetic: it hides a sidebar link from a non-owner session and gates nothing on its own. This one
is a real authorization check: it requires owner capability *in addition to* the access map's own
rule for the target, never in place of it. `ownerOnly` never widens the map: a target with no rule
at all still refuses even an owner, the same no-rule floor as above, and for a non-owner session
both the access map's role list and the owner requirement must pass; the option only ever narrows
further, from "the roles this rule admits" to "owner alone," and never widens a denial into an
admission.

```ts
// src/routes/admin/club/payroll/+page.server.ts
import type { SectionAction } from '@glw907/cairn-cms/sveltekit';

// Built once per section via createSectionAction, elsewhere in your site (see
// createSectionAction in the reference docs for the full setup).
declare const sectionAction: SectionAction<unknown, unknown>;

export const actions = {
  approveRun: sectionAction(async ({ ctx }) => { /* ... */ }, {
    action: 'approve-run',
    entity: 'payroll',
    ownerOnly: true, // requires owner AND a map rule admitting this session for the target
  }),
};
```

See [Security model, "The fail-closed floor for a site-authored POST"](./security-model.md) for
the full check order `ownerOnly` stacks onto.

## Hiding is not denying

The [`navLayout`](./organize-your-admin-nav.md) seam reads the same access map for visibility:
an unmapped href or a `hidden: true` engine reference removes a door from the sidebar, but that's
navigation, not authorization. A signed-in editor who knows or guesses a hidden route's URL still
reaches it unless the access map also refuses it at the route. Deny at the route first; the nav
seam is what keeps the sidebar honest about what a `requireAccess` call already decided, never a
substitute for it.

## You know it worked when

A non-owner session outside a target's named roles gets a 403 from both the `load` and any action
on that route, and the same session never sees the corresponding sidebar entry. A session inside
those roles reaches the screen normally, and an owner session reaches it too regardless of the
role list. Confirm all three for at least one restricted route: the denial and the hide have to
agree, or an editor sees a link that immediately refuses them, and the owner bypass has to hold or
your test route is misconfigured.
