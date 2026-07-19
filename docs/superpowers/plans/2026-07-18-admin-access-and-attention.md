# Admin access map and attention seams implementation plan

> **For agentic workers:** execute task-by-task via `cairn-implementer` dispatches (the
> cairn-pass method), test-first, full gate per task. Steps use checkbox syntax. The main
> loop reviews each diff and verifies the gate between dispatches.

**Goal:** ship the four sidebar seams as one cairn minor window, per
`docs/superpowers/specs/2026-07-18-admin-access-and-attention-design.md`: the access map
with one-authority enforcement and derived nav, declared collapse defaults, the widened
icon vocabulary with engine-ref overrides, and per-session attention badges.

**Architecture:** a new `src/lib/auth/access.ts` owns the map (declaration, validation,
`canReach`); the guard carries the map to `requireAccess`; the content routes and the nav
resolver both read `canReach` so enforcement and visibility cannot drift; the shell
renders collapse defaults, icon overrides, and attention pills from serializable payload
data the engine computes once per request.

**Tech stack:** existing only. SvelteKit 2 + Svelte 5 runes, vitest (unit /
integration-in-workerd / component projects), DaisyUI 5 admin idiom, Lucide icons already
bundled family.

## Global constraints

- The spec is the contract: `docs/superpowers/specs/2026-07-18-admin-access-and-attention-design.md`.
  Read it before any task. Zero-config sites must see no behavior change anywhere.
- Work happens on the `admin-access-attention` worktree off `main`; all edits target the
  worktree path. Run `npm ci` if node_modules is stale and `npm run package` before
  `npm test` in a fresh worktree (worktree memories).
- Per-task gate (the cairn-implementer contract): targeted test first and failing, then
  green; `npm run check` 0 errors 0 warnings; `npm test` exit 0. Commit per task,
  specific files, imperative mood, `Co-Authored-By: Claude <noreply@anthropic.com>`.
- TSDoc on every exported symbol (`check:comments` gates; no em dash in comments; write
  the contract, never the type). Reference docs updated where a task's rider says so.
- Authorization invariants, verbatim everywhere they apply: capability is the floor and
  the map only narrows; owner capability always passes; `editors` keeps its owner floor;
  deny at the route, never merely hide; a screen or href absent from the map keeps
  today's behavior; `requireAccess` fails closed on an unmatched path.
- New log event name: `auth.access.denied` (warn; fields `email`, `role`, `target`).
- Do not bump `package.json` or publish; the window holds under `## Unreleased`.

---

### Task 1: the access core (`defineAccess`, `canReach`, `hasAccessRule`)

**Files:**
- Create: `src/lib/auth/access.ts`
- Modify: `src/lib/index.ts` (root exports)
- Test: `src/tests/unit/auth-access.test.ts` (new)

**Interfaces (Produces — later tasks depend on these exact names):**
```ts
export type AccessMap = Record<string, Role[]>;
export function defineAccess<const A extends AccessMap>(roles: RolesDeclaration, map: A): A;
export function canReach(access: AccessMap | undefined, editor: Editor, target: string): boolean;
export function hasAccessRule(access: AccessMap | undefined, target: string): boolean;
```
Consumes: `RolesDeclaration`, `resolveCapability` from `src/lib/auth/roles.ts`; `Editor`
from `src/lib/auth/types.ts`.

**Outcome:** `defineAccess` throws an actionable `defineAccess:`-prefixed error on: an
empty map; a role name outside the given vocabulary; an empty role list (owner-only must
be written `['owner']`); a key that is neither a plausible screen id (non-empty, no `/`)
nor an `/admin`-prefixed path; an href key equal to `/admin` itself or carrying a query,
hash, or trailing slash. Concept-id existence and engine-route collision are NOT checked
here (Task 3's composition owns them). `canReach` implements the authority: `none`
capability reaches nothing; owner capability reaches everything; `editors` requires owner
capability regardless of the map; a screen-id target absent from the map admits any
editor capability, present admits only the named roles; an href target matches the
deepest path-segment-prefix key (`/admin/money` covers `/admin/money/refunds`; the
deeper `/admin/money/refunds` key wins when both exist; `/admin/moneyx` never matches
`/admin/money`), an unmatched href admits any editor capability (nav semantics; route
fail-closed is `requireAccess`'s job via `hasAccessRule`). `hasAccessRule` reports
whether any key matches the target (exact for screen ids, prefix for hrefs).

- [ ] Failing unit tests: the validation matrix (each throw case, one good map);
  the `canReach` matrix (capability floors x owner bypass x editors floor x
  mapped/unmapped screen x mapped/unmapped href), prefix matching (deepest wins,
  segment boundaries), and `hasAccessRule` for all four target kinds
- [ ] Implement `access.ts` and the root exports
- [ ] Gate green; commit `feat(auth): access map core (defineAccess, canReach)`

**Docs rider:** none yet (Task 9 writes the reference page once signatures settle).

### Task 2: the guard carries the map; `requireAccess`; the denial event

**Files:**
- Modify: `src/lib/sveltekit/guard.ts` (opts, locals attachment, `requireAccess`),
  `src/lib/sveltekit/index.ts` (export), `src/lib/log/events.ts` (`auth.access.denied`)
- Test: extend `src/tests/unit/guard.test.ts`; extend the guard integration suite

**Interfaces:**
- Consumes: Task 1's `canReach`, `hasAccessRule`, `AccessMap`.
- Produces: `createAuthGuard(opts?: { roles?: RolesDeclaration; access?: AccessMap })`
  (additive optional); the guard sets `event.locals.cairnAccess = opts.access` alongside
  `locals.editor` (internal, not in any serialized payload);
  `requireAccess(event: { locals: { editor?: Editor | null; cairnAccess?: AccessMap }; url: URL }, target?: string): Editor`.

**Outcome:** `requireAccess` resolves the session (`requireSession` contract: redirect
303 to login when absent), defaults `target` to `event.url.pathname`, and throws 403
when `hasAccessRule` finds no match (fail closed) or `canReach` denies. Every 403 it
throws emits `auth.access.denied` with `email`, `role`, `target`. A permitted call
returns the editor. Owner capability passes any target that has a rule (`canReach`'s
owner bypass), but an unmatched path 403s for every session, owner included: the
helper's contract is "this route opted into the map and the map does not know it," a
misconfiguration made loud rather than an access decision, so the owner bypass does not
apply. State this in the helper's TSDoc and pin it with a test.

- [ ] Failing tests: no session redirects; matched-and-admitted returns editor;
  matched-and-denied 403s and emits the event; unmatched 403s for editor AND owner;
  explicit `target` argument overrides the pathname; guard attaches the map to locals
- [ ] Implement; wire the event into `src/lib/log/events.ts`
- [ ] Gate green; commit `feat(auth): requireAccess and the access-denial event`

**Docs rider:** `log-events.md` gains the `auth.access.denied` row (Task 9 sweeps the
rest).

### Task 3: adapter threading, composition validation, engine route enforcement

**Files:**
- Modify: `src/lib/content/types.ts` (`CairnAdapter.access?: AccessMap`), the runtime
  composition (`composeRuntime` and the `CairnRuntime` type, wherever they live; grep
  `roles` threading and mirror it), `src/lib/sveltekit/cairn-admin.ts` (pass access to
  content routes), `src/lib/sveltekit/content-routes-core.ts` (per-screen gate)
- Test: extend the content-routes integration suite; new composition unit cases

**Interfaces:**
- Consumes: Task 1's `canReach`; the existing `requireEditor` gates.
- Produces: `CairnRuntime.access?: AccessMap`; composition throws (`access:`-prefixed,
  actionable) when a screen-id key names neither a declared concept nor a fixed engine
  screen, or when an href key collides with an engine route (`parseAdminPath` authority,
  the same split `validateNavLayout` uses).

**Outcome:** every engine screen's loads and actions deny with 403 when `canReach`
refuses the session: concept list/edit/save/publish routes gate per concept id; media,
vocabulary, nav, and settings routes gate per screen id; `editors` keeps `requireOwner`
untouched. The check sits beside the existing `requireEditor` call at each gate (the
enumerated switch from the extensible-roles pass; enumerate the gated surfaces in the
diff for review). A none-capability session behaves exactly as before (403 from
`requireEditor` first). Zero-config (no `access` anywhere) changes nothing.

- [ ] Failing integration tests: a restricted concept 403s a non-listed editor role on
  list load AND save action; an unrestricted concept still admits; media/vocabulary/
  settings each 403 a non-listed role when mapped; owner passes everything; the two
  composition throw cases
- [ ] Implement; enumerate the gated surfaces in the commit body
- [ ] Gate green; commit `feat(auth): engine routes enforce the access map`

**Docs rider:** none (Task 9).

### Task 4: nav derivation from the authority

**Files:**
- Modify: `src/lib/sveltekit/admin-nav.ts` (`engineVisible` generalizes to `canReach`;
  site-entry href gating; `ResolveNavLayoutOptions` gains `access` and the full
  `Editor`), `src/lib/sveltekit/content-routes-core.ts` (thread `runtime.access` into
  the resolver opts)
- Test: extend `src/tests/unit/admin-nav.test.ts` and the shell-payload integration
  cases

**Interfaces:**
- Consumes: Task 1's `canReach`; Task 3's `CairnRuntime.access`.
- Produces: `ResolveNavLayoutOptions.access?: AccessMap` and
  `ResolveNavLayoutOptions.editor: Editor` (replacing the loose `capability`/`role`
  pair; update both resolver paths and every caller in the same task).

**Outcome:** an engine door (declared, default-synthesized, or fallback) renders iff
`canReach` admits it, composed with the existing configuration gates (`nav` still needs
a configured navMenu; `hidden: true` still removes the door without touching the route).
A site entry whose href matches a map rule renders iff `canReach` admits it; an unmapped
href renders for any editor capability as today. The existing declarative `roles:` and
`ownerOnly` gates stay in force; every applicable gate must admit. A group renders iff
it has a visible child. The default (no navLayout) arrangement gates identically, so the
two paths cannot drift.

- [ ] Failing tests: a mapped-away concept door absent for the excluded role, present
  for the included one and for owner; a mapped utility screen likewise; a mapped site
  entry likewise; fallback screens obey the map; declarative `roles:` AND the map
  compose (both must admit); default-layout parity with declared-layout on the same map
- [ ] Implement
- [ ] Gate green; commit `feat(nav): sidebar derives from the access authority`

**Docs rider:** none (Task 9).

### Task 5: declared collapse defaults

**Files:**
- Modify: `src/lib/sveltekit/admin-nav.ts` (`NavLayoutSection.collapsed?: boolean`,
  carried onto `ResolvedLayoutSection.collapsed?: boolean`),
  `src/lib/components/CairnAdminShell.svelte` (seed initial collapsed state from the
  declaration when no cookie exists)
- Test: extend the admin-nav unit suite and the shell component suite

**Interfaces:**
- Consumes: nothing new.
- Produces: `ResolvedLayoutSection.collapsed?: boolean` (absent means open, today's
  behavior).

**Outcome:** with no `cairn-admin-nav-collapsed` cookie, the shell's initial collapsed
set is exactly the sections declared `collapsed: true`, SSR-seeded so there is no flash;
with the cookie present, the cookie's set wins entirely and the declaration is ignored.
Touching a header keeps writing the full current set, unchanged. Zero declarations plus
no cookie renders all-open, exactly today.

- [ ] Failing tests: resolver carries `collapsed` through declared layouts; component
  renders declared-collapsed sections closed with no cookie; cookie state overrides the
  declaration in both directions; toggle still persists
- [ ] Implement
- [ ] Gate green; commit `feat(nav): declared default-collapsed sections`

**Docs rider:** none (Task 9).

### Task 6: the icon vocabulary

**Files:**
- Modify: `src/lib/sveltekit/admin-nav.ts` (`ADMIN_NAV_ICON_NAMES` widened;
  `NavLayoutEngineRef.icon?: AdminNavIcon`; validation; `ResolvedEngineNavEntry.iconName?: AdminNavIcon`),
  `src/lib/components/admin-nav-icons.ts` (bundle the new Lucide components, aligned
  with the allowlist), `src/lib/components/CairnAdminShell.svelte` (prefer an engine
  ref's icon override over the engine-owned glyph)
- Test: extend the admin-nav unit suite and the shell component suite

**Interfaces:**
- Consumes: nothing new.
- Produces: the widened `AdminNavIcon` union (today's nine plus `banknote`,
  `users-round`, `shield-check`, `key-round`, `graduation-cap`, `list-ordered`, `send`,
  `bell`, `mail`, `megaphone`, `files`, `image`, `puzzle`, `tags`, `menu`, `file-pen`,
  `settings`, `life-buoy`); `ResolvedEngineNavEntry.iconName` present only when the ref
  declared an override.

**Outcome:** every new name validates and renders (the `ADMIN_NAV_ICONS` component map
and the allowlist stay aligned; add an alignment unit test so they cannot drift); an
engine ref with `icon:` renders that glyph in place of the engine-owned one (the dated/
undated concept glyphs and the fixed-screen glyphs all overridable); an unknown name
still fails validation naming the allowlist; refs without `icon:` render exactly as
today.

- [ ] Failing tests: allowlist/component-map alignment; each validation case; resolver
  carries the override; component renders the override and the default
- [ ] Implement
- [ ] Gate green; commit `feat(nav): widened icon vocabulary and engine-ref overrides`

**Docs rider:** none (Task 9).

### Task 7: the attention seam (engine side)

**Files:**
- Modify: `src/lib/sveltekit/content-routes-context.ts` (the `attention` dep beside
  `navFilter`; the `AttentionItem` type), `src/lib/sveltekit/cairn-admin.ts` (thread the
  dep), `src/lib/sveltekit/content-routes-core.ts` (call once per shell payload, filter,
  and serialize), `src/lib/index.ts` or the sveltekit subpath (export `AttentionItem`)
- Test: extend the shell-payload integration suite

**Interfaces:**
- Consumes: Task 4's resolved-and-filtered nav (the visible entries' hrefs).
- Produces:
```ts
export interface AttentionItem { href: string; count: number; label?: string }
// dep, in ContentRoutesDeps beside navFilter:
attention?: (ctx: { editor: Editor; event: ContentEvent }) =>
  AttentionItem[] | Promise<AttentionItem[]>;
// shell payload, in AdminShellData:
attention: Record<string, { count: number; label: string }>; // keyed by visible href
```

**Outcome:** the shell payload calls the dep exactly once per request, after nav
resolution and after `navFilter`; items with a non-positive count, an href matching no
visible nav entry (site entries and engine doors both, matched on resolved href), or a
duplicate href (first wins, log nothing) are dropped; `label` defaults to
`'pending items'`. The payload carries only the filtered record, so a count for an
unreachable queue never crosses the wire. No dep configured serializes an empty record
and the shell renders exactly as today. A dep that throws fails the shell load loudly
(no silent swallow; the site owns its callback).

- [ ] Failing tests: called once; filtered against visibility (a mapped-away entry's
  item vanishes); zero and negative dropped; default label applied; absent dep yields
  `{}`; engine-door hrefs match (a concept list href carries its count)
- [ ] Implement
- [ ] Gate green; commit `feat(admin): per-session attention items in the shell payload`

**Docs rider:** none (Task 9).

### Task 8: attention rendering (the shell)

**Files:**
- Modify: `src/lib/components/CairnAdminShell.svelte`
- Test: extend the shell component suite

**Interfaces:** consumes Task 7's `AdminShellData.attention` and Task 5's collapse
state. No new exports.

**Outcome:** a visible entry whose href carries attention renders a quiet count pill
(admin design system idiom; read `docs/internal/admin-design-system.md` first): display
caps at `99+`, zero never renders (already filtered, but the component also guards). A
collapsed section's header renders the sum of its visible children's counts, computed
in the component from the same record the leaf pills read (never a second data source);
the header pill disappears when the section opens; item pills remain. Accessibility:
the count joins the entry link's accessible name ("Asset requests, 3 pending
requests"); the pill span is `aria-hidden="true"`; the header sum joins the header
button's accessible name the same way; announcements are polite (`role="status"` on the
one live region if live updating exists, otherwise static accessible names suffice —
the shell has no polling, so static names are the expected form). Color carries no
semantics on its own.

- [ ] Failing component tests: pill renders with capped display; no pill at absent
  href; collapsed header sums visible children only; header pill gone when open, item
  pills remain; link and header accessible names carry the phrases; a mapped-away
  child's count is absent from its group sum
- [ ] Implement in the DaisyUI admin idiom
- [ ] Gate green; commit `feat(admin): attention pills and collapsed-header sums`

**Docs rider:** none (Task 9).

### Task 9: the docs window

**Files:**
- Modify: the reference arm (`docs/reference/`: the auth/core page for `defineAccess`,
  `canReach`, `requireAccess`, `AccessMap`; the nav page for `collapsed`, `icon`,
  the widened allowlist; the components page for the pill rendering contract; the
  sveltekit page for the `attention` dep and `AttentionItem`), `docs/reference/log-events.md`
  (`auth.access.denied`), a new guide `docs/guides/restrict-admin-access.md`, the
  give-a-role-its-own-admin-area guide (the map as the recommended path), the nav
  guide (collapse defaults, icon overrides, badges), the explanation arm's
  authorization story (one authority function; capability floor plus map narrowing),
  `CHANGELOG.md` (`## Unreleased`), `docs/guides/upgrade-cairn.md` (no consumer action),
  `ROADMAP.md` (file/prune per the pass), `docs/internal/docs-friction-log.md`
  (anything the writing surfaces), `docs/internal/api-surface.md` via
  `npm run check:surface -- --update`
- Test: the doc gates are the test

**Outcome:** every new export documented with the spec's invariants stated as contract
(the deny-not-hide doctrine and the media-picker landmine land in the new guide; the
`hidden:`-is-not-denial distinction lands on the nav reference page); grep the whole
`docs/` tree for phrasing that assumes capability is the only admin gate and repoint
every hit; the changelog entry states the window is additive with no consumer action.

- [ ] `check:reference`, `check:reference:signatures`, `check:package`, `check:docs`,
  `check:snippets`, `check:comments`, `check:surface` all green by name
- [ ] Commit `docs: access map and attention window (reference, guides, changelog)`

### Task 10: pass close (ritual, main-loop owned)

Not an implementer dispatch. The main loop runs the cairn-pass consolidation: the
code-simplifier over the window, the full named-gate list, the from-scratch consumer
build or CI e2e, the review gate (web-auth-security-reviewer mandatory for this window;
svelte-reviewer and daisyui-a11y-reviewer for the shell work), the live admin smoke
(the `/admin` surface changed: smoke per `docs/internal/admin-smoke-test.md`, including
a restricted-role session denied at a route and missing the door), the post-mortem
appended here, STATUS updated on `main`, merge. Release per `cairn-release` only if
independently warranted (ASC waits on this window, so a cut is expected; the skill owns
it).

## Task dependency shape (for the orchestrator)

T1 → {T2, T3, T4}; T3 → T4 (runtime threading); T4 → {T5, T7} (resolver opts change);
T7 → T8. T5 and T6 are independent of each other and of T2/T3. Execution is serial on
one worktree per the dispatch discipline; the order T1..T9 satisfies every edge.

## Self-review notes (plan author, 2026-07-18)

Spec coverage checked section by section: declaration/validation split (T1/T3), authority
semantics incl. editors floor and prefix matching (T1), requireAccess fail-closed and the
denial event (T2), route enforcement per screen (T3), nav derivation incl. fallback and
default-path parity (T4), collapse defaults incl. cookie-wins (T5), icons incl.
alignment test (T6), attention seam incl. once-per-request, filtering, and leak
prevention (T7), rendering incl. rollup-from-same-source and a11y names (T8), docs incl.
the capability-only-gate sweep (T9), acceptance items 1-4 distributed across T5/T6/T8/T3+T4.
Signatures cross-checked (AccessMap, canReach/hasAccessRule, ResolveNavLayoutOptions.editor,
AttentionItem, AdminShellData.attention). One deliberate correction inline in T2's
outcome text: unmatched requireAccess denies every session including owner (the
misconfiguration-made-loud rule); the spec's owner-always-passes applies to `canReach`,
not to the no-rule-matched case.
