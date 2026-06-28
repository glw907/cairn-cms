> **SUPERSEDED by the charter (2026-06-28).** This lens framing ("broadly extensible framework", "reuse
> the editor login") nudged an over-build: an extensibility effort grew an identity/permissions substrate
> and member login into the engine, which was reverted. The canonical statement of cairn's purpose and the
> corrected lens is now the charter: `CLAUDE.md` "What cairn is" and `what-cairn-is-and-is-not.md` (same
> directory). The principle-adherence review pass decides whether to retire or rewrite this doc. Read the
> charter first; treat the model below with suspicion.

# The extending-developer lens

A standing critical lens for cairn-cms design, spec, and plan review. Developer extensibility is cairn's
next major initiative after the Contract v2 rollup, so every pass from now on is checked against one
question: does this change make the extending developer's path easier or harder? Prefer the choices that
move toward it. Flag the choices that move away.

**The target is a broadly extensible framework, not a club site (Geoff, 2026-06-28).** The goal is to make
cairn a broadly extensible framework grounded in a content-managed site. aksailingclub is the first example,
a proof-of-concept; its requirements ground and validate the design but do not bound it, and they are
illustrative, not exhaustive. Design the seam for the general case (a developer adds custom, D1-backed admin
functionality to a content-managed site), and use aksailingclub as a concreteness check, not the spec.

**Customizations must survive updates (Geoff, 2026-06-28).** A developer uses cairn as a framework and keeps
pulling updates without their customizations breaking. That makes the extension surface a stability contract,
not a convenience: a deliberate, narrow, versioned public API that cairn can evolve its internals behind
freely, so an engine update never breaks a customization built on the seam. Once 1.0 lands, a breaking change
to that extension API is a major-version event. This is the payoff the enforced-public-boundary and
smooth-upgrade sub-lenses exist to deliver, and the pre-1.0 window is exactly when to get the contract right,
because after 1.0 it cannot break. The corollary: keep the seam narrow and the internals private, so the
surface a customization depends on is small, stable, and enforced rather than a developer reaching into
engine internals that then churn.

**Make the breaking changes now, before adoption (Geoff, 2026-06-27).** If extensibility needs to alter the
site contract or the core developer DX, do it in the breaking pre-1.0 window, before anyone is using cairn,
rather than after a stable release. The Contract v2 rollup shipped as `0.76.0` to `latest` via a `v0.76.0`
GitHub pre-release (the pre-release flag and the pre-1.0 version signal the line; 0.x caret ranges isolate
consumers per minor, so the two sites stay on `0.68.x` until they cut over). Further contract changes for
extensibility are welcome in the same pre-1.0 window and land before the stable 1.0. So the brainstorm should
be forward-looking and willing to propose contract or DX changes, not just additive seams.

**The proof site.** aksailingclub is the example site Geoff will use to prove the extensible-cairn concept
(he is the first extending developer). Its canonical documentation is the **handbook**:
[handbook.aksailingclub.org](https://handbook.aksailingclub.org) (behind Cloudflare Access), sourced in the
repo at `~/Projects/aksailingclub-org/handbook/content/` (Hugo, Hextra theme). Read the local source rather
than the access-gated live site. The ops-dashboard sections
(`handbook/content/technical/ops-dashboard/` and `handbook/content/user/ops-dashboard/`) describe the asset,
waitlist, and payment management that is the concrete extend-the-admin target; the D1 schema is
`~/Projects/aksailingclub-org/ops/schema.sql`. (The SvelteKit rebuild of that dashboard lives in
`~/Projects/aksailingclub-sveltekit`.) Start the extensibility brainstorm there to ground the real
requirements (events, class lists, asset management, D1-backed custom features behind the admin), rather than
designing the seam in the abstract.

## The persona

A developer who wants to launch a content-managed site fast on cairn, then build custom functionality on
top of it: custom admin/dashboard features, and custom app features that reuse the editor login. They want
to keep pulling cairn updates without rework. They are the audience cairn courts (a SvelteKit developer
shipping a small-to-medium site), and they are the case that breaks first when an extension seam is
hand-wavy or the upgrade contract is thin.

## Worked example: a club site

aksailingclub.org is the first proof case (Geoff, 2026-06-27), one concrete instance of the general pattern,
not the scope boundary: a club site with events, class lists, and asset management beyond what Posts and
Pages cover. The developer wants cairn for the content management,
then to **extend the admin interface** with the custom functionality, the whole tool **idiomatic
SvelteKit**, with **D1 as the backend for the custom features**. That shape sets the bar for the
extensibility initiative: a custom admin screen (an events manager, a class roster) mounted into the cairn
admin shell, reusing the editor login and the admin chrome, reading and writing its own D1 tables, while
the content stays markdown-in-git. The standing rule that the backend interface never grows a `query()`
method (content stays build-time over the manifest) does not block this: the custom feature owns its own D1
binding directly, separate from cairn's content backend. This is the build-inside-the-admin half of cairn's
two-extension-modes design (extend-the-admin alongside build-outside-it), the half that is currently
reserved-but-inert (see the baseline below).

## The four sub-lenses

Review questions to run against any design, spec, or plan:

1. **Extend the dashboard.** Can a developer add an admin screen, panel, or action through a supported
   seam, without forking the catch-all `load`/`actions` or editing the `CairnAdmin` view switch?
2. **Reuse the editor login.** Can a developer put their own routes behind the magic-link session and read
   the logged-in editor's identity and role, without re-implementing cookie resolution against the raw D1
   binding?
3. **Depend on an enforced public boundary.** Is the public surface stable and the internal boundary
   *enforced*, not merely documented, so an update never breaks code that imported the sanctioned API?
4. **Upgrade smoothly.** Can a consumer cross versions without hand-applying scattered "Consumers must"
   steps, and without silent (non-compile) failure modes?

## Current baseline (2026-06-27)

From the phase 4b islands adversarial review. These are point-in-time observations; verify against the
code before acting on them.

1. **Dashboard extension is type-only and inert.** `CairnExtension`, `AdminPanel`, and `FieldTypeDef` are
   exported types whose load/actions/component fields are `unknown`, marked "typed in Plan 09."
   `composeRuntime` collects `adminPanels`/`fieldTypes` onto the runtime, and nothing dispatches them.
   `parseAdminPath` refuses unknown segments (404), the `CairnAdmin` view switch is closed, and the
   sidebar "extension" groups are hardcoded inert stubs. A developer can register a panel that type-checks
   and composes cleanly, with zero runtime effect and zero warning: a fail-silent seam. The only real
   injection points are `branding`, `send`, `anthropic`, and `tidyTimeoutMs`.
2. **Auth is admin-scoped and sealed.** The guard resolves the session only under `/admin/**` (the
   `isAdminPath` gate; non-admin paths early-return before touching the cookie). `requireSession` and
   `requireOwner` only read `locals.editor`, which is populated only on admin paths, so they redirect to
   login anywhere else. `resolveSession` and the entire `auth/store.ts` role model are un-exported
   internals. The one way to put a custom feature behind the editor login today is to mount it under
   `/admin/`, sharing the engine's gating and dispatch. There is no public `loadSession` for an arbitrary
   route.
3. **The public boundary is documented, not enforced; upgrades are manual.** The public surface is the
   `package.json` export map, and "internal" is signaled by curation comments (`render/authoring.ts`) plus
   a few barrel unit tests. Nothing is enforced: a deep or relative import reaches any internal, and
   `attw`'s `internal-resolution-error` rule is muted. `check:version` enforces size-marker consistency,
   not breakage disclosure, and breaking changes ship under `minor` across `0.x`. The held Contract v2
   window makes a consumer cross seven breaking releases (`0.69.0`→`0.75.0`) in one jump, two of them with
   silent failure modes (a dropped `tags` frontmatter key empties feeds; an untranscribed `datePrefix`
   shifts every post URL).

## How to build toward it now

Without starting the initiative, avoid making the goal harder:

- Put new public surface on a real export subpath with a reference page; do not widen the unenforced
  internal surface. The `./islands` subpath plus `hydrateIslands` is the right shape.
- The islands client-mount-by-name pattern (parse props, clear the fallback, `mount()` a Svelte component
  over a boundary) is the first stepping stone toward a dashboard-extension seam. Reuse the pattern when
  that seam is designed; do not prematurely abstract it now.
- Prefer failing loud over fail-silent for a reserved-but-inert seam. If a pass touches `composeRuntime`,
  consider a doctor or build warning that registered `adminPanels`/`fieldTypes` are undispatched, so the
  fail-silent trap (a registered panel with no effect) becomes detectable.
- When the initiative starts, the natural scope is the three baseline gaps: a real admin-panel dispatch
  path, a public session-on-any-route helper plus a sanctioned way to gate a custom route, and an enforced
  public boundary (a wildcard-deny in `exports`, the `internal-resolution-error` rule un-muted) paired with
  a smoother cross-version upgrade story.
