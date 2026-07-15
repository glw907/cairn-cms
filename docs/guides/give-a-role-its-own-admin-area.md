# Give a role its own admin area

A role doesn't have to reach cairn's content at all to live under `/admin`. This guide builds an
`instructor` role: it signs in with the same magic link as every other editor, sees none of
cairn's own content surfaces (no post list, no Library, no Settings), and lands straight on a
class roster screen the site built and owns. The pattern is the `none` capability from [the
declared role vocabulary](../reference/core.md#roles): an authenticated identity cairn's own
surfaces refuse, that a site's own custom route is free to admit. If you haven't declared your
adapter yet, start with [Define an adapter and schema](./define-an-adapter-and-schema.md).

## Declare the role

Add `instructor` to your adapter's role vocabulary with `defineRoles`, mapped to `none` capability
and a `home`, the `/admin` route it lands on after sign-in:

<!-- snippet-check-skip: elides the adapter's other required groups (shown in full in core.md's worked example) to focus on the roles member -->
```ts
// src/lib/cairn.config.ts
import { defineAdapter, defineRoles } from '@glw907/cairn-cms';

export const roles = defineRoles({
  owner: 'owner',
  instructor: { capability: 'none', home: '/admin/classes' },
});

export const cairn = defineAdapter({
  // ...content, backend, email, rendering...
  roles,
});
```

`instructor` is a name outside the engine's default `owner`/`editor` pair, so the `editor.role`
column's `CHECK` constraint rejects it until you apply `migrations/0001_roles.sql`. See [the
migration section of Configure auth and
D1](./configure-auth-and-d1.md#provision-the-d1-database) for the file and the
`wrangler d1 migrations apply` step; a site already on a larger vocabulary has this applied
already.

## Narrow the `Role` type

Augment `CairnRolesRegister` once in your `app.d.ts` so `locals.editor.role` narrows to your
declared names everywhere it's read, custom routes included, instead of staying the unaugmented
`'owner' | 'editor'`:

```ts
// src/app.d.ts
import { roles } from './lib/cairn.config.js';

declare module '@glw907/cairn-cms' {
  interface CairnRolesRegister {
    roles: typeof roles;
  }
}
```

[The `CairnRolesRegister` reference](../reference/core.md#roles) covers what this augmentation
changes and what it doesn't: it's a read-side type only, and it has no effect on which capability a
role resolves to at runtime. It's also the type a `navLayout` node's `roles` list narrows against
once you declare one: see [Organize your admin nav](./organize-your-admin-nav.md#declare-the-tree)
for a role-gated section built on the same vocabulary this guide declares.

## Mount the screen

A `/admin/classes` route is an ordinary SvelteKit route dropped next to cairn's own admin
routes, the same seam [Add a custom admin screen](./add-a-custom-admin-screen.md) covers in full.
The auth guard already ran and set a populated, typed `event.locals.editor` before this route's
`load` does, for an `instructor` session exactly as for an owner or an editor: a `none`-capability
session still authenticates and reaches this route untouched. Nothing about `none` blocks the
route from resolving, so gate it yourself, on the role or the capability, whichever your screen
means to check:

```ts
// src/routes/admin/classes/+page.server.ts
import { error } from '@sveltejs/kit';
import { requireSession } from '@glw907/cairn-cms/sveltekit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
  const editor = requireSession(event);
  if (editor.role !== 'instructor' && editor.capability !== 'owner') {
    error(403, 'This screen is for instructors.');
  }
  return { displayName: editor.displayName };
};
```

[`requireEditor`](../reference/sveltekit.md#requireeditor) is the other common shape: call it
instead of `requireSession` when a screen should refuse every `none`-capability role rather than
admit one by name.

The shared `/admin/+layout.svelte` still wraps this route in
[`CairnAdminShell`](../reference/components.md#cairnadminshell), the same chrome every built-in
view renders inside, so the instructor sees the site's own top bar and sidebar, not a bare page.
For a `none`-capability session the shell drops every built-in engine entry (Library, Tags, the
nav-menu editor, Settings, Help), since each one would refuse the request with a 403 anyway;
only the site's own custom nav renders. Because `instructor` declares a `home`, signing in lands
the instructor on `/admin/classes` directly; a `none`-capability role with no declared `home`
lands on a calm signed-in welcome view instead.

## Add the person

[`ManageEditors`](../reference/components.md#manageeditors), the owner-only screen at
`/admin/editors`, renders every declared role in its role control once your vocabulary holds more
than the default pair: an owner picks `instructor` from the list the same way they pick `editor`
today. For the very first owner on a brand-new site, before any row exists to grant one,
[Configure auth and D1](./configure-auth-and-d1.md#seed-the-first-owner) covers `bootstrapOwner`
and the direct D1 seed, either of which gets that first row in.

## Verify it

Sign in as the instructor and confirm the session lands on `/admin/classes` with none of cairn's
own content surfaces in the sidebar. Try `/admin` (or any built-in view's URL) directly as that
same session and confirm it answers 403, not a redirect to sign in again: a `none`-capability
session is still authenticated, just refused by cairn's own surfaces. Sign in as an owner and
confirm `/admin/classes` still opens, since the preceding load admits owner capability too.

## Related reference

[The declared role vocabulary](../reference/core.md#roles) documents `defineRoles`,
`CairnRolesRegister`, and the capability-resolution helpers this guide used.
[`requireSession`](../reference/sveltekit.md#requiresession) and
[`requireEditor`](../reference/sveltekit.md#requireeditor) document the none contract in full, and
[Add a custom admin screen](./add-a-custom-admin-screen.md) covers the custom-route seam and
`adminAction` in depth. [`ManageEditors`](../reference/components.md#manageeditors) and
[`CairnAdminShell`](../reference/components.md#cairnadminshell) document the roster screen and the
shell this guide's screen rendered inside.
