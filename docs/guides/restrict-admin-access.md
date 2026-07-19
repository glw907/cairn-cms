# Restrict admin access by role

A site with more than one kind of editor usually needs more than "signed in or not": a publisher
edits posts but not pages, a club-admin reaches the money screens but a webmaster doesn't. The
access map is cairn's answer, one declaration that gates both the route and the sidebar so they
can never say two different things. This guide assumes you've already declared a role vocabulary
with [`defineRoles`](../reference/core.md#roles); if you haven't, start with [Give a role its own
admin area](./give-a-role-its-own-admin-area.md).

## Declare the map

`defineAccess` takes your role vocabulary and a map of targets to the role names admitted to each
one. A target is either one of cairn's own screens, by concept id or one of the fixed utility
screens (`media`, `vocabulary`, `settings`), or one of your own `/admin`-prefixed routes:

```ts
// src/lib/cairn.access.ts
import { defineAccess } from '@glw907/cairn-cms';
import { roles } from './cairn.config.js';

export const access = defineAccess(roles, {
  pages: ['webmaster'],
  media: ['webmaster', 'publisher'],
  vocabulary: ['webmaster'],
  '/admin/money': ['club-admin'],
});
```

A screen or route absent from the map keeps today's behavior: any editor-capability session
reaches it, mapped or not, so adding the map to one screen doesn't quietly lock out every screen
you haven't gotten to yet. Owner capability always passes, regardless of what the map says; a
site can't lock its own owners out. `posts` is absent above, so every editor, publisher and
webmaster alike, still reaches it.

Wire the same map onto the adapter's `access` member and onto the guard, the same two-places
pattern `roles` already follows:

<!-- snippet-check-skip: elides the adapter's other required groups (shown in full in core.md's worked example) to focus on the access member -->
```ts
// src/lib/cairn.config.ts
import { defineAdapter } from '@glw907/cairn-cms';
import { roles } from './cairn.config.js';
import { access } from './cairn.access.js';

export const cairn = defineAdapter({
  // ...content, backend, email, rendering...
  roles,
  access,
});
```

```ts
// src/hooks.server.ts
import { sequence } from '@sveltejs/kit/hooks';
import { createAuthGuard } from '@glw907/cairn-cms/sveltekit';
import { roles } from './lib/cairn.config.js';
import { access } from './lib/cairn.access.js';
import { theme } from './theme-handle.js';

export const handle = sequence(theme, createAuthGuard({ roles, access }));
```

`defineAccess` validates at construction: an empty map, a role name outside your vocabulary, an
empty role list (write owner-only explicitly as `['owner']`), or a key that's neither a plausible
screen id nor a well-formed `/admin`-prefixed path all throw an actionable error naming the bad
key. A screen-id key's existence against your real concepts, and an href key's collision with a
built-in admin route, validate a moment later, when the runtime composes the whole adapter, so a
typo'd concept id or a route that shadows a built-in view fails the same way a bad `navLayout`
entry does.

## Gate your own routes

`requireAccess` is the one-line authorization story for a custom route: the session the guard
already resolved, checked against the map for the request path, or a 403.

```ts
// src/routes/admin/club/money/+page.server.ts
import { requireAccess } from '@glw907/cairn-cms/sveltekit';

export const load = (event) => {
  const editor = requireAccess(event); // denies every role the map doesn't name for this path
  return { displayName: editor.displayName };
};
```

The zero-argument call reads `event.url.pathname`, the common case. Pass an explicit `target` when
a route's action needs to check a different path than the one it's mounted at. There's one
sharp edge worth knowing before you reach for this helper: an *unmatched* path (the map has no key
that covers it at all) refuses every session, owner included, not just the roles the map doesn't
name. The helper's contract is "this route opted into the map, and the map has no opinion on it,"
a misconfiguration made loud, not an access decision, so `canReach`'s owner bypass doesn't apply
here. If a route wants the zero-config any-editor behavior instead, call `requireSession` or
`requireEditor` and don't map that path at all.

## Deny at the route, never merely hide

Nav placement is never authorization. Hiding a screen from the sidebar, whether through a
`navLayout` node's `hidden: true` or simply because a role can't see it, doesn't stop a signed-in
editor from reaching it by typing the URL directly. The access map is what actually closes the
door: declare it, and the sidebar and the route agree by construction, because both read the same
[`canReach`](../reference/core.md#canreach-hasaccessrule) function. A site that only removes a
menu item and never maps the route has built a UI convenience, not a permission system; the
`0.85.0`-era `roles` field on a `navLayout` node still exists for exactly that lighter case (see
[Organize your admin nav](./organize-your-admin-nav.md#declare-the-tree)), but it's a visibility
hint, never enforcement.

## The media-picker landmine

Restricting the `media` screen restricts the media routes underneath it, including the ones the
concept editor's own image picker calls. If a role edits an image-bearing concept, it needs
`media` reachable too, or its editor sees a broken picker on every entry with an image field. The
worked map at the top of this guide grants `publisher` access to `media` for exactly this reason,
alongside `pages`, which `publisher` cannot edit. cairn doesn't special-case this: splitting
"can browse the library" from "can manage it" is a real distinction the engine doesn't grow until
a site actually needs it, so today the grant is all-or-nothing per role.

## Verify it

Sign in as each mapped role and confirm it reaches exactly the screens and routes its rows name,
that the sidebar shows exactly the same set (a mapped-out door disappears from the nav too, since
[`resolveNavLayout`](../reference/sveltekit.md#the-navlayout-seam) reads the same map), and that
typing a restricted screen's URL directly answers 403 rather than rendering it. Sign in as an
owner and confirm every mapped screen still opens. If a mapped role edits an image-bearing
concept, confirm its picker still resolves images rather than erroring on a refused `media` call.

## Related reference

[Access map](../reference/core.md#access-map) documents `defineAccess`, `canReach`, and
`hasAccessRule` in full. [`requireAccess`](../reference/sveltekit.md#requireaccess) documents the
helper's unmatched-path contract in depth. [Organize your admin
nav](./organize-your-admin-nav.md) covers the declarative `roles` visibility hint the map
supersedes for enforcement, plus collapse defaults, icon overrides, and attention badges. [Give a
role its own admin area](./give-a-role-its-own-admin-area.md) covers `defineRoles` and the `none`
capability this guide's vocabulary builds on.
