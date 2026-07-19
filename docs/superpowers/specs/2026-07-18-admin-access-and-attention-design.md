# Admin access map and attention seams: functional design

> Spec for the cairn engine pass serving the ASC `admin-sidebar-2` initiative, designed
> deliberately past ASC: a broadly useful access-control and pending-work pattern for any
> multi-role cairn site. The consumer requirements and acceptance live in
> `aksailingclub-org/docs/2026-07-18-cairn-sidebar-seams-consumer-brief.md`; this spec owns
> every API shape. Settled with Geoff 2026-07-18 after a four-sweep prior-art survey
> (headless CMS peers, framework admin panels, RBAC literature, notification idioms); the
> research rationale is folded in per section. One cairn minor release carries all of it.

## Premise check (the charter gate)

Per-screen authorization for the engine's own admin screens is cairn's job: cairn owns
those routes, and an admin frame that cannot say "publishers edit posts, webmasters edit
pages" undersupplies its one job for any site with more than one kind of editor. The
notification seam stays thin: the site computes what needs attention (its domain), the
engine renders it (the admin frame). Row-level scoping ("an instructor's own classes")
stays the developer's domain today; the access map is typed so a predicate escape hatch
can arrive additively if real demand appears (see Future-proofing). Everything here is
zero-config invisible: a site that declares nothing sees no behavior change.

## Design goals

1. **One declaration, everything derives.** A site declares who reaches each admin
   function exactly once; route enforcement and nav visibility both read that single
   declaration through one authority function. The prior-art survey found this is the
   pattern every mature system converges on (Django admin, Filament policies,
   ActiveAdmin, Craft), and its absence is a named vulnerability class (WordPress CVEs
   from hidden-menu-but-open-route; OWASP A01 "hide in UI is not authorization").
2. **Deny at the route, never merely hide.** Nav placement is never authorization; the
   map gates the route, and the sidebar derives from the same check.
3. **Pleasant for a Svelte developer.** The map autocompletes its role names (via the
   existing `CairnRolesRegister` narrowing) and engine screen ids (via `EngineScreenId`),
   validates loudly at server start (the `defineRoles` house pattern), and the site-side
   enforcement story is a one-line helper in a plain SvelteKit load or action. No
   middleware ceremony, no policy classes, no new concepts beyond "a map and a helper."
4. **Auditable as data.** The map is a reviewable table, the shape the RBAC literature
   recommends for the 90%-static case (NIST core RBAC; Figma's DSL postmortem on why
   scattered code checks fail audit).

## Seam 1: the access map (`defineAccess`)

### Declaration

```ts
// src/lib/cairn/access.ts (site-side; one module, imported everywhere it is needed)
import { defineAccess } from '@glw907/cairn-cms';

export const access = defineAccess({
  // Engine screens, by screen id (concept ids and the fixed utility screens):
  pages: ['webmaster'],
  media: ['webmaster', 'publisher'],
  vocabulary: ['webmaster'],
  settings: ['webmaster'],
  'waiver-text': ['owner', 'club-admin'],
  // Site screens, by /admin-prefixed route path (deepest-prefix match):
  '/admin/money': ['club-admin'],
  '/admin/committees': ['club-admin'],
});
```

- `defineAccess<const A extends AccessMap>(map: A): A` validates at construction and
  returns the map. `AccessMap = Record<string, Role[]>`, so role names narrow to the
  site's registered vocabulary and autocomplete; keys are `EngineScreenId | (string & {})`
  shaped, so the six fixed screens autocomplete while concept ids and hrefs stay
  assignable.
- Validation throws an actionable error on: a key that is neither a declared concept id,
  a fixed engine screen id, nor an `/admin`-prefixed path; an href key that collides with
  an engine-owned route (the `parseAdminPath` authority, same as navLayout entries); an
  empty role list (owner-only must be said explicitly as `['owner']`); a role name outside
  the declared vocabulary. Full validation of concept-id keys needs the concept list, so
  `defineAccess` checks shape and vocabulary, and `createCairnAdmin` re-validates keys
  against the real concepts at composition, the same split `validateNavLayout` uses.
- The map is passed in the same two places `roles` already is: `createAuthGuard({ roles,
  access })` and the adapter (`CairnAdapter.access`). Declaring it in one module and
  importing it twice is the established pattern.

### Semantics (the authority function)

One exported function is the single decision point, the PEP/PDP shape:

```ts
canReach(access: AccessMap | undefined, editor: Editor, target: string): boolean
```

- **Capability is the floor; the map only narrows, never widens.** `none` capability
  reaches no engine screen regardless of the map. `editors` keeps its owner-capability
  floor; a map entry cannot open it to non-owners. A screen absent from the map keeps
  today's behavior (any editor-capability session), so zero-config compatibility holds.
- **Owner capability always passes** every map entry (hierarchical RBAC; owner means full
  control by engine definition). A site cannot lock owners out of a screen.
- **Deny by default for mapped territory.** A mapped screen admits only the named roles
  (plus owner capability). For site hrefs, `requireAccess` (below) denies any path it
  cannot match in the map, so a route that opts into the helper fails closed.
- **Editors hold exactly one role** (the existing model). If multiple roles per editor
  ever ship, grants OR-combine (most permissive wins), the universal convention in the
  surveyed systems; stated here so the future change has its semantics pre-decided.
- Href keys match by path segment prefix, deepest key wins: `'/admin/money'` covers
  `/admin/money/refunds` unless `'/admin/money/refunds'` is separately mapped.

### Enforcement

- **Engine screens:** every engine route gate that today stops at `requireEditor` also
  checks `canReach` for its screen (concept routes per concept id; media, vocabulary,
  nav, settings per screen id) and refuses with 403. The editors screen keeps
  `requireOwner`. Deny, not hide: a direct URL to a restricted screen 403s.
- **Site screens:** a new helper, importable in any custom route's load or action:

  ```ts
  export function requireAccess(
    event: { locals: { editor?: Editor | null }; url: URL },
    target?: string, // defaults to event.url.pathname
  ): Editor;
  ```

  It resolves the session (the `requireSession` contract), evaluates `canReach` against
  the map (the guard, which already receives `access` beside `roles`, attaches it to the
  request internally so the helper needs no extra argument), and throws 403 on deny or
  on an unmatched path. The
  zero-argument call is the common case: `const editor = requireAccess(event);` is the
  whole authorization story for a site screen. `canReach` is also exported directly for
  conditional UI inside a page.

### Nav derivation

`resolveNavLayout` reads the same authority:

- An engine door renders iff `canReach` admits it (this generalizes `engineVisible`,
  which keeps its capability and configuration gates and adds the map check).
- A site entry (navLayout `href`) renders iff `canReach` admits its href when the map
  carries a matching key; an unmapped href renders for any editor-capability session, as
  today. A group renders iff it has a visible child (existing behavior).
- For the common case this makes `navFilter` unnecessary: declare the map, and the
  sidebar derives. `navFilter` stays for genuinely dynamic cases and runs after, as
  today.

### Existing declarative `roles:` on navLayout

Kept, unchanged. It serves simple sites that want visibility hints without a map, and
removing it is a breaking change with no consumer gain. The docs steer multi-role sites
to the map (visibility without enforcement is a footgun the guide must name); ASC deletes
its own `roles:` usage when it adopts the map. The engine applies both when both are
present (an entry renders only if every applicable gate admits it).

### Future-proofing (researched, deliberately not built)

The RBAC literature is unanimous that static maps break exactly at row scoping ("only
their own classes") and equally unanimous about the fix for a 90%-static system: a small
predicate escape hatch after the role gate, not a policy engine (Auth0 and Oso both
document the pattern; Payload and Pundit are working examples). When real demand
arrives, `AccessMap` values widen additively from `Role[]` to `Role[] | ((editor, ctx) =>
boolean)`. Nothing ships now; the shapes are chosen so that lands without a break.

## Seam 2: default-collapsed groups

`NavLayoutSection` gains `collapsed?: boolean` (default `false`, today's behavior): the
group's starting state when the visitor carries no nav cookie. The existing cookie
(`cairn-admin-nav-collapsed`) stores the full collapsed set once any header is touched
and wins entirely when present; no cookie schema change. Documented edge: a group added
after a user's cookie exists renders open, because the cookie is authoritative once
present. SSR seeding already prevents flash; the declared defaults ride the same path.

## Seam 3: icon vocabulary

- The bundled allowlist (`ADMIN_NAV_ICON_NAMES`) widens from 9 to the full working set:
  today's nine plus `banknote`, `users-round`, `shield-check`, `key-round`,
  `graduation-cap`, `list-ordered`, `send`, `bell`, `mail`, `megaphone`, `files`,
  `image`, `puzzle`, `tags`, `menu`, `file-pen`, `settings`, `life-buoy` (all Lucide,
  the bundled family). The allowlist stays an allowlist: arbitrary Lucide names would
  unbound the bundle.
- `NavLayoutEngineRef` gains `icon?: AdminNavIcon`, overriding the engine-owned glyph for
  that door (the two dated concepts otherwise share the newspaper). Validation rejects an
  unknown name, naming the allowlist, as today.

## Seam 4: attention items (pending-work badges)

### The seam

A new dep beside `navFilter`, awaited fresh every request, never cached by the engine:

```ts
attention?: (ctx: { editor: Editor; event: ContentEvent }) =>
  AttentionItem[] | Promise<AttentionItem[]>;

interface AttentionItem {
  /** The admin route whose nav entry carries the pill; also the click-through target. */
  href: string;
  /** Pending actionable count. Zero or negative items are dropped. */
  count: number;
  /** Accessible noun for the count ("pending requests"); defaults to "pending items". */
  label?: string;
}
```

The site computes items per session from its own queues (ASC: the same queries as its
needs-attention strip). Role scoping holds by construction: the callback runs per
request with the session's editor, the engine calls it exactly once per request (the
Filament double-query bug is the cautionary precedent), and an item whose href resolves
to a nav entry the session cannot see is dropped before any rendering or summing, so a
count never leaks to a role that cannot act on it (counts are information; CWE-200).

### Rendering (the shell)

- A quiet count pill on the matching visible nav entry. Zero renders nothing (never a
  "0" pill). Display caps at `99+`.
- A collapsed group's header shows the sum of its visible children's counts, computed
  from the same live items as the leaf pills, never a separate total. The pill on the
  header disappears when the group opens (the item pills remain). The survey found
  omitting this rollup is a documented UX defect (Outlook's collapsed folders), and
  separate-cache staleness is the documented bug class (Slack's stuck badge).
- Accessibility: the count lives in the entry link's accessible name ("Asset requests, 3
  pending requests"), not on the pill span; the pill itself is `aria-hidden`. Updates
  announce politely (`role="status"` semantics), and color is reinforcement only. The
  visual idiom follows the admin design system (Warm Stone; read
  `docs/internal/admin-design-system.md` before touching the shell).
- Semantics are total-pending, never read/unread: the items are queue-backed and
  self-clear, so read state would duplicate truth the queue already owns (the WordPress
  admin-notices dismissal-drift lesson). No notification center ships: centers earn
  their keep only when items carry their own lifecycle (history, audit value). The item
  shape (label + href + count) leaves a future needs-attention strip or center possible
  without a seam change.

## Consumer acceptance (from the brief, restated engine-side)

1. Fresh session renders declared collapse defaults; a session with a cookie renders the
   cookie's state regardless.
2. ASC's 25-glyph assignment validates; an overridden engine ref renders the override; an
   invalid name fails validation naming the allowlist.
3. Pill on item, summed on collapsed header, absent at zero, gone when the group opens
   (item pill remains), screen-reader text present; no count for an unreachable queue.
4. A Publisher-shaped session (mapped to posts and bulletins concepts) edits both, is
   403d on pages at the route, and sees exactly the groups with visible children; the
   consumer's roles matrix reproduces by tests against the map.

## Interactions and named landmines

- **The media picker.** Restricting the `media` screen restricts the media routes, which
  the concept editor's picker calls. A site whose role edits image-bearing concepts must
  leave `media` reachable to that role (the ASC map above grants Publisher media
  access for exactly this reason). The access-map guide states this; the engine does not
  special-case it (splitting media-read from media-manage is surface deliberately not
  grown until demanded).
- **Badges follow visibility by construction**: an item on a hidden entry contributes
  nothing anywhere.
- **`hidden: true` engine refs** stay pure nav removal (the route stays live); the map is
  the tool for denial. The reference docs must keep this distinction loud.
- **Unknown role sessions** (capability `none`) reach nothing mapped or unmapped; the
  existing none contract is unchanged.

## Testing shape

Unit: `defineAccess` validation matrix; `canReach` matrix (capability floors, owner
bypass, mapped/unmapped screens, href prefix matching, deepest-wins). Integration
(workerd): engine route 403s per the map; `requireAccess` allow/deny/unmatched;
shell payload nav derivation incl. fallback screens; attention items filtered, summed,
dropped-at-zero. Component: pills, header sums, open/close behavior, aria names,
collapse defaults with and without cookie. The consumer matrix test rides in the
showcase (a three-role vocabulary with a mapped concept and a mapped custom route).

## Docs riders

Documentation is a dimension of this pass, not a follow-up, and the published corpus now
renders on cairn.pub through the docs-on-site pipeline, so every arm this pass touches
ships to real readers at the next release.

- **Reference:** `defineAccess`, `canReach`, `requireAccess`, `AttentionItem`, the
  widened icon list, `collapsed`, the `icon` override (`check:reference` and the
  signatures gate hold these).
- **Guides:** a new "restrict admin access by role" guide (the map, the helper, the
  media-picker note, the deny-not-hide doctrine); the give-a-role-its-own-admin-area
  guide gains the map as the recommended path; the nav guide documents collapse
  defaults, icon overrides, and badges.
- **Explanation:** the identity/architecture pages tell the authorization story
  (capability floor, role vocabulary); the access map extends that story and those pages
  must carry it, including the one-authority-function doctrine. Grep the whole `docs/`
  tree for phrasing that assumes capability is the only gate and repoint every hit.
- **Log events:** a new `auth.access.denied` warn event (fields: `email`, `role`,
  `target`) makes map denials observable; `log-events.md` gains its row.
- **Changelog:** entry under `## Unreleased`, no `Consumers must:` (additive); upgrade
  guide entry stating no action required for existing sites.

## Out of scope

Row-level scoping (future predicate, above); a notification center; site-side permission
models beyond the map's href keys (a site with a finer model keeps `navFilter` and its
own guards); any relaxation of capability floors; the ASC-side work (tree, renames,
migrations) which waits on the release.
