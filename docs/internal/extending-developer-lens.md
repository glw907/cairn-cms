# The extending-developer lens (redesign inputs)

Governed by the charter. Read it first: the `## What cairn is` block in `CLAUDE.md` and
`what-cairn-is-and-is-not.md` (same directory). This doc is subordinate to the charter, not a
co-equal standing dimension. It collects the persona, the diagnostic questions, and the baseline
that the lean extensibility redesign (the next pass) starts from. An earlier version of this doc
framed the goal as a "broadly extensible framework" and nudged an over-build (an identity and
permissions substrate with member login) that was reverted. That framing is gone; the charter's
boundary governs.

## What the charter already settles

cairn owns its core job, managing markdown content and the editor/admin frame, and serves
everything else with a thin seam, not a built-in feature. So the redesign is not "make cairn a
platform." It is "find the leanest seams that let a developer build their own functionality on a
content-managed cairn site, plus an enforced, versioned boundary so their work survives engine
updates." The defaults (owner/editor, magic-link) are floors a developer can replace through a
documented hand-off, not ceilings; a site's domain (members, customers, assets) is the developer's
to build in their own routes, data, and auth. Keep the seam narrow; that is what keeps the
stability promise cheap to honor.

## The persona

A developer who wants to launch a content-managed site fast on cairn, then build their own
functionality on top: custom admin screens in the cairn shell, and custom app features on their own
routes. They want to keep pulling cairn updates without rework. They are the audience cairn courts (a
SvelteKit developer shipping a small-to-medium site), and they are the case that breaks first when a
seam is hand-wavy or the upgrade contract is thin.

## A concreteness check, not the scope

aksailingclub.org is the example site Geoff will use to prove the concept (he is the first extending
developer): a club site with events, class lists, and asset management beyond Posts and Pages. The
developer wants cairn for the content, then to add custom admin functionality in idiomatic SvelteKit
with D1 as the backend for the custom features. Use it to ground the seam in a real shape, a custom
admin screen mounted in the cairn shell, reading the owner/editor identity, reading and writing its
own D1 tables, while content stays markdown-in-git. It is a concreteness check, not the scope
boundary: the charter, not the club site's feature list, decides what cairn builds. The standing rule
that the backend interface never grows a `query()` method holds; the custom feature owns its own D1
binding directly, separate from cairn's content backend. Its canonical documentation is the handbook
([handbook.aksailingclub.org](https://handbook.aksailingclub.org), behind Cloudflare Access), sourced
at `~/Projects/aksailingclub-org/handbook/content/`; the ops-dashboard sections describe the target
and the D1 schema is `~/Projects/aksailingclub-org/ops/schema.sql`. The competitive-extensibility
research (`2026-06-28-extensibility-competitive-research.md`, same directory) carries forward as input.

## Make the breaking changes in the pre-1.0 window

If the redesign needs to alter the site contract or the core developer DX, do it now, before adoption,
in the breaking pre-1.0 window. The Contract v2 rollup shipped as `0.76.0` to `latest` via a `v0.76.0`
GitHub pre-release; 0.x caret ranges isolate consumers per minor, so the two sites stay on `0.68.x`
until they cut over. Once 1.0 lands, a breaking change to the extension surface is a major-version
event, so the enforced, versioned boundary has to be right before the stable release.

## The four diagnostic questions

The redesign answers these against the charter's boundary. They are diagnostics for that pass, not a
checklist for every pass (the charter premise check is the standing dimension):

1. **Extend the admin skeleton.** Can a developer add an admin screen, panel, or action through a
   thin supported seam, without forking the catch-all `load`/`actions` or editing the `CairnAdmin`
   view switch?
2. **Read the owner/editor identity.** Can a developer put their own routes behind the magic-link
   session and read the logged-in editor's identity and role through a sanctioned helper, without
   re-implementing cookie resolution against the raw D1 binding? (Reading owner/editor, not modeling a
   new domain actor: the charter keeps cairn to owner/editor only.)
3. **Depend on an enforced public boundary.** Is the public surface narrow and the internal boundary
   *enforced*, not merely documented, so an update never breaks code that imported the sanctioned API?
4. **Upgrade smoothly.** Can a consumer cross versions without hand-applying scattered "Consumers
   must" steps, and without silent (non-compile) failure modes?

## Baseline (post-principle-adherence pass)

Point-in-time observations; verify against the code before acting on them.

1. **No dashboard-extension seam exists.** The principle-adherence pass removed the reserved-but-inert
   register-components scaffolding (`CairnExtension`, `AdminPanel`, `FieldTypeDef`, the
   `composeRuntime` slots, the hardcoded sidebar stubs). `parseAdminPath` refuses unknown segments
   (404) and the `CairnAdmin` view switch is closed. The redesign builds the real seam from a clean
   engine, charter-first, rather than wiring up the removed types.
2. **Auth is admin-scoped and sealed.** The guard resolves the session only under `/admin/**` (the
   `isAdminPath` gate; non-admin paths early-return before touching the cookie). `requireSession` and
   `requireOwner` only read `locals.editor`, populated only on admin paths. `resolveSession` and the
   `auth/store.ts` role model are un-exported internals. The one way to put a custom feature behind the
   editor login today is to mount it under `/admin/`. There is no public session-on-any-route helper.
3. **The public boundary is documented, not enforced; upgrades are manual.** The public surface is the
   `package.json` export map, and "internal" is signaled by curation comments plus a few barrel tests.
   A deep or relative import reaches any internal, and `attw`'s `internal-resolution-error` rule is
   muted. `check:version` enforces size-marker consistency, not breakage disclosure, and breaking
   changes ship under `minor` across `0.x`.

## How to build toward it now (without starting the redesign)

- Put new public surface on a real export subpath with a reference page; do not widen the unenforced
  internal surface. The `./islands` subpath plus `hydrateIslands` is the right shape.
- The islands client-mount-by-name pattern (parse props, clear the fallback, `mount()` a Svelte
  component over a boundary) is a stepping stone toward a dashboard-extension seam. Reuse the pattern
  when that seam is designed; do not prematurely abstract it now.
- The natural redesign scope is the baseline's three gaps: a thin admin-extension seam, a public
  session-on-any-route helper plus a sanctioned way to gate a custom route, and an enforced public
  boundary paired with a smoother cross-version upgrade story, each in the leanest form the charter
  allows.
