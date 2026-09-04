# Organize your admin nav

Declare the whole `/admin` sidebar as one ordered tree instead of letting it default: group
screens under labeled sections, add your own custom routes beside the engine's, relabel or
reorder a built-in screen, and hide what a given role shouldn't see.

This is the `navLayout` seam, declared on the adapter's `editor` group in `cairn.config.ts`.
Nothing here is required. A site that declares no `navLayout` gets today's default arrangement:
concepts and engine screens as a flat, unsectioned list, resolved through the same function a
declared layout uses, so the two paths never drift apart.

## Declare a layout

`navLayout` is an ordered array mixing three node kinds: an engine reference (one of cairn's own
screens), a site entry (a link to your own `/admin/` route), and a section (a named group of
either, one level deep, no nesting):

<!-- snippet-check-skip: elides the adapter's other required groups (shown in full in core.md's worked example) to focus on the editor.navLayout member -->
```ts
// src/theme/cairn.config.ts
import { defineAdapter } from '@glw907/cairn-cms';

export const cairn = defineAdapter({
  // ...content, backend, email, rendering...
  editor: {
    navLayout: [
      { screen: 'posts' },
      { screen: 'pages' },
      {
        label: 'Club',
        children: [
          { label: 'Events', icon: 'calendar', href: '/admin/club/events' },
          { label: 'Members', icon: 'users', href: '/admin/club/members' },
        ],
      },
      { screen: 'media' },
      { screen: 'settings', label: 'Site settings' },
    ],
  },
});
```

An engine reference (`{ screen: 'posts' }`) places one of your declared concepts or a fixed
utility screen (`media`, `vocabulary`, `nav`, `settings`, `editors`, `help`). A site entry
(`label`, `icon`, `href`) links one of your own custom admin routes; `icon` is a name from the
bundled allowlist documented on [`NavIcon`](../reference/sveltekit.md#navicon). A section groups
a mix of both under one `label`.

The whole tree validates once, when the runtime composes: a bad icon name, an `href` that
collides with a built-in view, an unknown screen id, or a role name outside your declared
vocabulary fails the build with an actionable, `navLayout`-prefixed message rather than shipping
a broken or silently wrong sidebar.

## What happens to a screen you never mention

A `navLayout` doesn't need to enumerate every engine screen. Anything the tree never references
still renders, in a trailing group after a divider (the shell's own foot slot), in engine order.
This is the answer for a site that wants to add one link beside the built-in screens without
rebuilding the whole sidebar from scratch: declare the one entry you care about and let every
other screen fall into the fallback group automatically.

To remove a door on purpose instead, reference it with `hidden: true`:

```ts
{ screen: 'vocabulary', hidden: true }
```

The route itself stays live. Hiding a screen from the sidebar is never authorization, only
navigation. An editor who knows (or guesses) the URL can still reach a hidden screen unless the
[access map](./restrict-admin-access.md) also denies it there. Deny at the route; hide in the
nav is cosmetic on top of that, not instead of it.

## Grouping, collapse, and roles

A section's `collapsed: true` sets its starting state for a visitor with no persisted
nav-collapse cookie; once anyone toggles a section, the browser's cookie carries the whole
collapsed set from then on and wins over every declared default, in both directions. A section
added later to a returning visitor's already-cookied sidebar renders open, since the cookie is
authoritative once it exists.

`roles` on a section gates every child in the section at once, on top of whatever gate each
child already carries: an engine screen inside a `roles`-gated section still obeys its own
capability rule, and a section's `roles` never widens what a child would otherwise show, only
narrows. A site entry can also carry its own `roles`, independent of any section it sits in:

```ts
{
  label: 'Club',
  roles: ['club-admin', 'instructor'],
  children: [
    { label: 'Events', icon: 'calendar', href: '/admin/club/events' },
    { label: 'Payroll', icon: 'banknote', href: '/admin/club/payroll', roles: ['club-admin'] },
  ],
}
```

Here every `club-admin` and `instructor` session sees the section and Events; only `club-admin`
also sees Payroll. `ownerOnly` on a site entry is a further, cosmetic-only shortcut: it hides the
link from any non-owner session regardless of role name, but (the same rule as `hidden`) the
route itself must still gate server-side, since nav placement decides nothing on its own.

## You know it worked when

The declared order renders exactly as written, sections collapse and remember their state across
a reload, and a screen you didn't mention still shows up in the fallback group rather than
disappearing. If you gate a section or entry by role, sign in as a role outside that list and
confirm the item is gone from the sidebar *and* that the route itself refuses the request; see
[Restrict admin access by role](./restrict-admin-access.md) for the route-level half of that
guarantee, since a `navLayout` gate alone only ever controls what renders.
