# Extensible roles implementation plan

> **For agentic workers:** execute task-by-task via `cairn-implementer` dispatches (the
> cairn-pass method), test-first, full gate per task. Steps use checkbox syntax. Geoff
> authorized workflow-orchestrated execution 2026-07-14; the review gate runs as an
> adversarial find-and-verify workflow phase.

**Goal:** open the engine's role vocabulary to site-declared roles mapped onto three
engine capability levels, per `docs/superpowers/specs/2026-07-14-extensible-roles-design.md`.

**Architecture:** a new `src/lib/auth/roles.ts` module owns the vocabulary (declaration,
validation, capability resolution); the guard resolves capability per request and the
routes validate writes against the vocabulary; the D1 `editor` table loses its role CHECK
constraint; ManageEditors renders the declared vocabulary; a config bootstrap owner seeds
the empty table through the magic-link request action.

**Tech stack:** existing only. SvelteKit 2 + Svelte 5 runes, D1 via the store's prepared
statements, vitest (unit / integration-in-workerd / component projects), DaisyUI 5 admin
idiom.

## Global constraints

- The spec is the contract: `docs/superpowers/specs/2026-07-14-extensible-roles-design.md`.
  Read it before any task. Zero-config sites must see no behavior change anywhere.
- Work happens on the `extensible-roles` worktree off `main`; all edits target the
  worktree path. Run `npm ci` if node_modules is stale and `npm run package` before
  `npm test` in a fresh worktree (worktree memories).
- Per-task gate (the cairn-implementer contract): targeted test first and failing, then
  green; `npm run check` 0 errors 0 warnings; `npm test` exit 0. Commit per task,
  specific files, imperative mood, `Co-Authored-By: Claude <noreply@anthropic.com>`.
- TSDoc on every exported symbol (`check:comments` gates; no em dash in comments; write
  the contract, never the type). Reference docs updated where a task's rider says so.
- Capability vocabulary everywhere: `'owner' | 'editor' | 'none'`. Reserved role name:
  `owner`. New log event names: `editor.bootstrapped`, `auth.role.unknown`.
- Do not bump `package.json` or publish; the window holds under `## Unreleased`.

---

### Task 1: the vocabulary core (`defineRoles`, capability resolution, typed `Role`)

**Files:**
- Create: `src/lib/auth/roles.ts`
- Modify: `src/lib/auth/types.ts` (Role derivation, `Editor.capability`)
- Modify: `src/lib/index.ts` (root exports)
- Test: `src/tests/unit/auth-roles.test.ts` (new)

**Interfaces (Produces — later tasks depend on these exact names):**
```ts
export type Capability = 'owner' | 'editor' | 'none';
export type RoleDeclaration = Capability | { capability: Capability; home?: string };
export type RolesDeclaration = Record<string, RoleDeclaration>;
export function defineRoles<const R extends RolesDeclaration>(roles: R): R;
export const DEFAULT_ROLES: { owner: 'owner'; editor: 'editor' };
export function resolveCapability(roles: RolesDeclaration | undefined, role: string): Capability;
export function roleHome(roles: RolesDeclaration | undefined, role: string): string | undefined;
export function ownerLevelRoles(roles: RolesDeclaration | undefined): string[];
export interface CairnRolesRegister {}
export type Role = /* registry-derived; keyof the registered roles, else 'owner' | 'editor' */;
export interface Editor { email: string; displayName: string; role: Role; capability: Capability; }
```

**Outcome:** `defineRoles` validates at construction and throws on: an empty record, a
missing `owner` key, `owner` mapped to anything but owner capability, an empty role name,
a malformed declaration object, a `home` that is not an absolute `/admin`-prefixed path.
`resolveCapability` returns the mapped capability, treats an `undefined` declaration as
`DEFAULT_ROLES`, and returns `'none'` for any role name not in the vocabulary (fail
closed). `Role` derives from `CairnRolesRegister` via the Register pattern and is exactly
`'owner' | 'editor'` when unaugmented; a type-level test (`expectTypeOf` or equivalent)
pins both the unaugmented default and the augmented narrowing. `Editor` gains `capability`.

- [x] Failing unit tests for every validation rule, resolution case (bare capability,
  object form, unknown role, undefined vocabulary), `ownerLevelRoles` over a vocabulary
  with two owner-level names, and the `Role` type-level pins
- [x] Implement `roles.ts`, the type derivation, and the root exports
- [x] Gate green; commit `feat(auth): site-declared role vocabulary core`

**Docs rider:** reference entry for the new root exports (`defineRoles`, `Capability`,
`RolesDeclaration`, `CairnRolesRegister`) in the core reference page, including the
`app.d.ts` augmentation example from the spec.

### Task 2: drop the role CHECK constraint (migration 0001)

**Files:**
- Create: `migrations/0001_roles.sql`
- Test: `src/tests/integration/migrations-roles.test.ts` (new)

**Interfaces:** none produced; consumes the `editor` schema from `0000_auth.sql`.

**Outcome:** the migration rebuilds `editor` without `CHECK (role IN ('owner','editor'))`
using SQLite's create-copy-drop-rename sequence, preserving the primary key, column
types, and all rows. Role validity is app-layer from here on.

- [x] Failing integration test: apply 0000, seed rows (`owner`, `editor`), apply 0001,
  assert rows intact and an `INSERT` with role `club-admin` now succeeds; also assert
  the vitest integration harness applies both migrations for the rest of the suite
- [x] Write the migration; verify the harness picks it up
- [x] Gate green; commit `feat(auth): open the editor role column (migration 0001)`

**Docs rider:** the configure-auth guide's migration section notes the new file in its
`wrangler d1 migrations apply` step (no wording change beyond the count).

### Task 3: capability at the guard, `requireEditor`, the content-route gate switch

**Files:**
- Modify: `src/lib/sveltekit/guard.ts` (createAuthGuard opts, capability attachment,
  `requireEditor`), `src/lib/sveltekit/index.ts` (export), `src/lib/log/events.ts`
  (`auth.role.unknown`), `src/lib/sveltekit/content-routes-core.ts` and any sibling
  content/media/settings/vocabulary/tidy loads and actions gating on bare `requireSession`
- Test: extend `src/tests/unit/guard.test.ts` and the content-routes integration suite

**Interfaces:**
- Consumes: Task 1's `resolveCapability`, `RolesDeclaration`, `Editor.capability`.
- Produces: `createAuthGuard(opts?: { roles?: RolesDeclaration })` (additive optional);
  `requireEditor(event: { locals: { editor?: Editor | null } }): Editor` (403 for
  `none`, same shape as `requireOwner`); `requireOwner` re-keyed on
  `capability !== 'owner'`.

**Outcome:** the guard resolves capability once per request when it materializes
`locals.editor`; a session whose row carries a role outside the vocabulary resolves to
`none` capability, still authenticates, and emits warn-level `auth.role.unknown`
(fields: `email`, `role`). Engine content and admin-mutation surfaces refuse `none` with
403 via `requireEditor`; `requireSession` remains the gate only where any authenticated
identity is legitimate (logout, the shell payload, the none landing). The none contract
(spec section 4) holds: authenticated, populated typed `locals.editor`, custom-route
seam unaffected.

- [x] Failing tests: the guard matrix (owner/editor/none/unknown-role x
  requireSession/requireEditor/requireOwner), the unknown-role event emission, an
  integration test driving a none-capability session against a content list load and a
  save action (403) and against a shell-mounted custom route (admitted)
- [x] Implement; sweep every engine load/action for the requireSession-to-requireEditor
  switch (enumerate them in the diff for review)
- [x] Gate green; commit `feat(auth): capability resolution, requireEditor, none contract`

**Docs rider:** guard reference page gains `requireEditor` and the none-contract
guarantee stated verbatim as a contract; `log-events.md` gains `auth.role.unknown`.

### Task 4: editors routes and store under the vocabulary

**Files:**
- Modify: `src/lib/sveltekit/editors-routes.ts` (vocabulary threading, strict role
  validation, capability in events, vocabulary in load payload),
  `src/lib/auth/store.ts` (set-based last-owner guards), `src/lib/log/events.ts`
  (capability field documented), wherever `CairnRuntime` is constructed if the adapter's
  `roles` is not already reachable (add a `roles` field to the runtime)
- Modify: `src/lib/content/types.ts` (`CairnAdapter.roles?: RolesDeclaration`)
- Test: extend the editors-routes integration suite and the store unit suite

**Interfaces:**
- Consumes: Task 1's helpers; Task 2's open column (integration tests insert custom roles).
- Produces: `createEditorRoutes(opts?: { roles?: RolesDeclaration })`;
  `editorsLoad` returns `{ editors, self, error, vocabulary: { role: string; capability: Capability }[] }`;
  store signatures `removeOwnerIfNotLast(db, email, ownerRoles: string[])` and
  `demoteOwnerIfNotLast(db, email, ownerRoles: string[])` (still one atomic statement,
  `role IN (...)` over the owner-capability name set);
  `insertEditor`/`setEditorRole` unchanged shapes, but the routes validate the role
  against the vocabulary first and reject unknown values as a form validation error
  (no more silent coercion to `'editor'`).

**Outcome:** one screen's routes serve any vocabulary. `editor.added` and
`editor.role_changed` events carry `capability` beside `role`. The last-owner guard
counts owner-capability rows, not the literal `'owner'` string, and remains the engine's
only such guard. `createCairnAdmin` threads the adapter's declared roles to these routes
and to the guard-independent places that materialize `Editor` (capability filled
wherever an `Editor` object is built).

- [x] Failing tests: add/setRole rejecting an out-of-vocabulary role; setRole accepting
  `club-admin` under an ASC-shaped vocabulary; the last-owner guard refusing to demote
  the final owner-capability row when a second owner-level NAME exists but has no rows;
  events carrying `capability`
- [x] Implement; keep every statement prepared and atomic as today
- [x] Gate green; commit `feat(auth): editors routes and last-owner guard over the vocabulary`

**Docs rider:** editors-routes reference signatures updated (`check:reference:signatures`
will hold this); `log-events.md` rows for the widened event fields.

### Task 5: ManageEditors renders the vocabulary

**Files:**
- Modify: `src/lib/components/ManageEditors.svelte`
- Test: extend the ManageEditors component suite

**Interfaces:** consumes Task 4's `vocabulary` payload. No new exports.

**Outcome:** with the default two-name vocabulary the screen keeps today's toggle
exactly; with a larger vocabulary the role control becomes a labeled select listing each
declared role with its capability shown beside the name (admin design system idiom:
read `docs/internal/admin-design-system.md` before touching the component). The role
badge distinguishes owner-capability rows. Self-actions stay disabled as today.

- [x] Failing component tests: default pair renders the toggle; a three-role vocabulary
  renders the select with capability labels; submitting a role change posts the
  selected role name
- [x] Implement in the DaisyUI admin idiom
- [x] Gate green; commit `feat(admin): vocabulary-driven role control in ManageEditors`

**Docs rider:** the components reference's ManageEditors entry mentions the
vocabulary-driven control.

### Task 6: role-aware landing and nav capability gating

**Files:**
- Modify: `src/lib/sveltekit/content-routes-core.ts` (admin-root landing redirect, the
  shell payload's capability-aware nav), `src/lib/components/CairnAdminShell.svelte`
  (the minimal signed-in view), `src/lib/sveltekit/admin-nav.ts` if the engine-item
  filtering lands there
- Test: integration (landing redirects) + component (signed-in view)

**Interfaces:**
- Consumes: Task 1's `roleHome`, `Editor.capability`; Task 3's guards.
- Produces: a new `AdminData` view variant `{ view: 'welcome'; page: { displayName: string; siteName: string } }`
  (the calm signed-in screen for a none session with no declared home).

**Outcome:** `/admin`'s landing is role-aware per the spec: declared `home` redirects
(303) for any role; owner/editor capability without `home` lands on the content list as
today; none capability without `home` gets the welcome view inside the shell (name,
sign-out, one calm "no content access here" line in the admin voice). The shell payload
hides engine content nav and `canManageEditors` from none-capability sessions;
site-granted custom nav still renders, filtered by the site's `navFilter` as today.

- [x] Failing tests: instructor-with-home redirected to its home; none-without-home gets
  the welcome view; editor-capability landing unchanged; none session's shell payload
  carries no engine concept nav
- [x] Implement; welcome copy follows the admin voice (Microsoft register, calm, no blame)
- [x] Gate green; commit `feat(admin): role-aware landing and capability-gated nav`

**Docs rider:** the components reference documents the welcome view; the admin-design
doc is not touched (no new design language).

### Task 7: the config bootstrap owner

**Files:**
- Modify: `src/lib/sveltekit/types.ts` or wherever `CairnAdminDeps` lives
  (`auth.bootstrapOwner`), `src/lib/sveltekit/auth-routes.ts` (request action),
  `src/lib/auth/store.ts` (`insertOwnerIfEmpty`), `src/lib/log/events.ts`
  (`editor.bootstrapped`)
- Test: store unit test + auth-routes integration test

**Interfaces:**
- Consumes: nothing beyond Task 1's types.
- Produces: `CairnAdminDeps.auth.bootstrapOwner?: { email: string; displayName: string }`;
  `insertOwnerIfEmpty(db, email, displayName, now): Promise<boolean>` (single statement,
  `INSERT ... SELECT ... WHERE NOT EXISTS (SELECT 1 FROM editor)`, returns whether it
  inserted).

**Outcome:** on a magic-link request, after normalization, when the table is empty and
the email equals the configured bootstrap owner (compared lowercased), the owner row is
inserted atomically and the normal flow proceeds; `editor.bootstrapped` (field: `email`)
fires on insert. Once any row exists the config grants nothing; a non-matching email on
an empty table behaves exactly as an unknown email today.

- [x] Failing tests: empty-table match inserts and proceeds; non-empty table ignores the
  config; two concurrent requests yield exactly one row (D1 statement atomicity);
  mixed-case configured email still matches
- [x] Implement
- [x] Gate green; commit `feat(auth): config-declared bootstrap owner`

**Docs rider:** the configure-auth guide's seed section rewrites around
`bootstrapOwner` with the SQL kept as fallback; `log-events.md` gains
`editor.bootstrapped`.

### Task 8: doctor checks and the normalization invariant

**Files:**
- Modify: `src/lib/doctor/checks-cloudflare.ts` (generalize the owner-count check to the
  owner-capability set; add unknown-role and non-lowercase-email checks), threading the
  vocabulary into the doctor's inputs the way its existing config reaches it
- Test: extend the doctor unit suite

**Interfaces:** consumes Task 1's `resolveCapability`/`ownerLevelRoles`. No new exports
expected beyond the doctor's internal check list.

**Outcome:** doctor reports (1) editor rows whose role is outside the declared
vocabulary, (2) editor rows whose email is not lowercase+trimmed (the manual-insert
hole), and (3) its existing owner-count diagnostic now counts owner-capability rows.
The email-normalization invariant is stated in the auth explanation/reference doc.

- [x] Failing tests for the three checks (healthy and unhealthy fixtures each)
- [x] Implement
- [x] Gate green; commit `feat(doctor): vocabulary and email-normalization checks`

**Docs rider:** the doctor guide/reference lists the new checks; the normalization
invariant lands in the auth reference wording.

### Task 9: docs, surface, and window close

**Files:**
- Modify: `CHANGELOG.md` (`## Unreleased`), `docs/guides/upgrade-cairn.md`,
  `docs/reference/*` sweep for owner/editor phrasing that the vocabulary changes,
  `docs/explanation/*` where it names the identity model, `ROADMAP.md` (remove the
  Now entry), `docs/internal/docs-friction-log.md` (anything the writing surfaced),
  `docs/internal/api-surface.md` via `npm run check:surface -- --update`
- Test: the doc gates are the test

**Interfaces:** consumes everything; produces the pass's documented window.

**Outcome:** every new export documented; the none contract and the Register
augmentation carry worked examples; the changelog entry states "no consumer action for
existing sites; augment the registry if you declare roles"; the ROADMAP Now entry is
gone (shipped history lives in STATUS and this plan's post-mortem). Grep the whole
`docs/` tree for phrasing that hard-codes the two-role world and repoint every hit.

- [x] `check:reference`, `check:reference:signatures`, `check:package`, `check:docs`,
  `check:snippets`, `check:comments`, `check:surface` all green by name
- [x] Commit `docs: extensible-roles window (reference, guides, changelog, roadmap prune)`

### Task 10: pass close (ritual, main-loop owned)

Not an implementer dispatch. The main loop runs the cairn-pass consolidation: the
code-simplifier over the window, the full named-gate list, the from-scratch consumer
build or CI e2e, the adversarial review workflow (web-auth-security-reviewer is
mandatory for this window; svelte-reviewer, cloudflare-workers-reviewer,
daisyui-a11y-reviewer per surface), the live admin smoke (the `/admin` surface changed:
smoke per `docs/internal/admin-smoke-test.md`), the post-mortem appended here, STATUS
updated on `main`, merge.

## Task dependency shape (for the orchestrator)

T1 → {T3, T4, T6, T7, T8}; T2 → {T3's and T4's integration tests}; T4 → T5; T3 → T6.
T2 is independent of T1. Execution is serial on one worktree per the dispatch
discipline; the order T1, T2, T3, T4, T5, T6, T7, T8, T9 satisfies every edge.

## Self-review notes (plan author, 2026-07-14)

Spec coverage checked section by section: vocabulary/validation (T1), typed read-side
(T1), migration (T2), guards + none contract (T3), nav/shell (T6), ManageEditors +
last-owner (T4/T5), landing (T6), bootstrap (T7), audit events (T3/T4/T7), doctor +
normalization (T8), docs/surface/versioning (T9), testing shape distributed per task.
Signatures cross-checked across tasks (Capability, RolesDeclaration, ownerRoles
threading, the vocabulary payload). No placeholders; the two spec-deferred details are
settled here: the unknown-role event is `auth.role.unknown`, and the registry interface
is `CairnRolesRegister` exported from the root subpath.

## Post-mortem (2026-07-14, pass close)

**What shipped.** The full spec: `defineRoles` and the vocabulary core with the Register-typed
`Role` (T1, 77ae707e), migration 0001 dropping the role CHECK (T2, d7b6ed0c), capability at the
guard with `requireEditor` and the none contract (T3, 8477c382), editors routes and the
set-based last-owner guard over the vocabulary (T4, 2641c37a), the vocabulary-driven
ManageEditors control (T5, 0d34a556), role-aware landing and capability-gated nav (T6,
67aaf82c), the config bootstrap owner (T7, e2f23d7b), the doctor vocabulary and
email-normalization checks (T8, 5b0a1aad), and the docs window (T9, 81af8a1b). The first
adversarial review folded as 3a6b9689 (required `Editor.capability`, capability-keyed nav
filtering); simplifier passes 7faf0707 and 964d24fe.

**Session interruption and what the close found.** The executing session died (battery) after
the simplifier, before the T10 ritual. The resumed close re-ran the full gate green, then the
live admin smoke and the first-ever CI e2e run on the branch each surfaced one real defect the
interrupted session had not seen:

1. *None-capability nav leak* (fc31ea4b). The shell payload hid concepts and `canManageEditors`
   from a none session, but `CairnAdminShell` hard-codes Library, Tags, the nav-menu item,
   Settings, and Help; all five 403 a none session. Fix: `AdminShellData.user` gains
   `capability` and the shell gates its engine items on it; custom nav untouched. Verified
   live against the showcase (none session: welcome view plus custom nav only).
2. *Dev-package drift* (d0ca8704). `@glw907/cairn-cms-dev`'s handle minted `locals.editor`
   without `capability` (requireOwner now keys on it, so every owner surface 403'd under the
   dev handle: 5 e2e specs failed), and its fake AUTH_DB matched the old single-name
   last-owner SQL rather than the new set-based form. Fixed and pinned with new fixture tests.
   Gate gap recorded: `npm run check` scopes to `src/`, so the dev package's type break only
   fails in CI's separate `check:dev-package` step.

Also folded at close, per Geoff's live directives: the site-contract docs gap (architecture
explanation and the adapter guide never gained the `roles` member; 825bc755, via workflow),
and the roles docs completeness sweep plus the new `give-a-role-its-own-admin-area` guide
(18d7e629).

**Verification evidence.** Full gate on the final tree: `npm run check` 0/0 (1364 files),
`npm test` exit 0 (300 files, 3370 tests), `check:comments`, `check:reference`,
`check:reference:signatures`, `check:package`, `check:docs`, `check:snippets`, `check:surface`
all exit 0 by name. Consumer build proven twice: local `CI=1` showcase e2e 94/94 exit 0, and
the CI e2e workflow green on d0ca8704 (run 29376490741). Live admin smoke on the showcase
(session rows minted per admin-smoke-test.md): anon 303, owner 307 to the concept list with
full nav, unknown-role session authenticates, emits `auth.role.unknown`, gets the welcome view
with custom nav only, and 403s on engine surfaces. The close-out adversarial review workflow
(three Opus lenses over the delta commits: auth security, Svelte runes, dev-double fidelity)
returned zero findings.

**Decisions locked in.** The none-session shell shows site custom nav only (Help included in
the hidden set, since helpLoad requires editor capability). The HTTP status for an
error-paged admin route under the streamed shell payload is 200 with the error page rendered;
this predates the pass (verified identical for the pre-existing editor-vs-owner 404 path) and
was left as-is, noted here rather than fixed.

**Carried forward.** (1) The editor-first admin-nav organization question (Geoff, mid-close):
filed in ROADMAP Next with the research-then-brainstorm framing. (2) The `check:dev-package`
scope gap stays CI-only by design but bit this pass; a future gate pass could fold it into the
local ritual. (3) The reference gates do not validate type-literal doc drift (the
`AdminShellData` table row was a manual rider).

**Budget.** Interaction points this close: four (the workflow opt-in, the publish directive,
the docs-contract directive, the nav-organization question; none were corrections of finished
work — the docs-contract directive landed while its workflow task was already in flight).
Tokens: the close ran roughly 0.9M subagent tokens across two implementer dispatches, one
simplifier, the review workflow (347k), and the docs sweep, plus the main loop.
