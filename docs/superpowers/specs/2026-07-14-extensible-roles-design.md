# Extensible editor/admin roles

Status: designed 2026-07-14 in the full-scope brainstorm Geoff ordered (ROADMAP "Now",
promoted 2026-07-14). Both flagged forks resolved by Geoff in-session: the config-declared
bootstrap owner is in, and the none-session landing question resolved to per-role `home`
declarations ("that would depend on the role"). Awaiting Geoff's spec read before
writing-plans.

## Context and grounding

The engine hard-codes `Role = 'owner' | 'editor'` (`src/lib/auth/types.ts:6`), and a site
whose people carry more than content duty builds a parallel identity system around that
limit. aksailingclub-org runs a second `club_roles` D1 table with its own guards, its own
grant/revoke screen, and a duplicated last-owner guard; that is the grounding evidence the
seam is missing. The consuming site's requirements statement is the ASC consumer brief
(`aksailingclub-org/docs/2026-07-13-cairn-editor-roles-consumer-brief.md`, Geoff-verified
against ASC's live code and database), and this spec's contract guarantees answer it point
by point. ASC is the first consumer, not the ceiling: the vocabulary is unbounded by
construction, and ASC's answers weigh as one consumer's evidence.

Current-state facts the design builds on, verified against the code 2026-07-14:

- `Role` is a public literal union consumed in eleven places: the guards, the nav filter,
  the editors routes, the shell payload, ManageEditors, the store's last-owner SQL, and a
  doctor check.
- Role is read live from D1 on every request (`resolveSession` joins `session` to
  `editor`), never cached in the cookie, so role changes take effect on the next request.
- The engine's content routes gate on bare `requireSession`; any authenticated session can
  edit content today.
- Email normalization (trim + lowercase) is already applied at every write and lookup
  entry point; the database comparison itself is case-sensitive.
- The D1 schema carries `CHECK (role IN ('owner', 'editor'))` on the `editor` table
  (`migrations/0000_auth.sql`); migrations apply via `wrangler d1 migrations apply`.
- The first owner is hand-seeded with a documented `wrangler d1 execute` INSERT.
- Editor mutations already emit `editor.added`, `editor.removed`, and
  `editor.role_changed` log events carrying actor, target, and role.

## The premise check (charter-first)

This opens the vocabulary of the existing role column. It does not add an actor, an auth
option, a policy engine, or per-entry ACLs. After this change the engine still knows
exactly three things about a session: it can manage the roster (owner-level capability),
it can edit content (editor-level), or it can merely exist as an authenticated identity
(none). Role names become the site's; role meaning stays the engine's, and the meaning
surface is those three capability levels and nothing finer. Anything interrogable beyond
that (per-concept permissions, approval tiers, scopes) is the policy-engine slope the
charter forbids, and the ASC brief's explicit non-needs confirm no consumer case exists.
Member-scale auth stays out; the allowlist remains staff-scale.

The capability count is committed at three. ASC's whole vocabulary maps onto three with
room to spare, and a later fourth level would be an additive change, so holding the fork
open buys nothing.

## The design

### 1. The vocabulary: TS-declared site config

```ts
// cairn.config.ts
import { defineRoles } from '@glw907/cairn-cms/auth';

roles: defineRoles({
  owner: 'owner',
  'club-admin': 'editor',
  instructor: { capability: 'none', home: '/admin/classes' },
})
```

A role's value is either a bare capability (`'owner' | 'editor' | 'none'`, the common
case) or an object `{ capability, home? }` where `home` is the admin route `/admin` sends
that role to (section 4). `defineRoles` follows the `fieldset`/`defineAdapter`
const-generic pattern: the literal key set is captured so the typed read-side (section 3)
can derive from it, and the declaration is validated at construction:

- `owner` must be present and must map to owner capability. It is the reserved anchor for
  bootstrap, the last-owner guard, and the docs. Every other name is free; `editor` may be
  omitted (ASC omits it) or declared like any other name.
- Role names are non-empty strings; construction throws on an empty record or a malformed
  entry, so a misdeclared vocabulary fails at build, not at runtime.

A site that declares no `roles` gets the implicit `{ owner: 'owner', editor: 'editor' }`
vocabulary. Zero-config sites see no behavior change anywhere in this design.

The ROADMAP sketch said the vocabulary opens "per the YAML site-config architecture", but
the typed read-side contract it also demands can only flow from a TypeScript declaration;
YAML cannot reach the type system. The declaration is git-committed either way, which is
what the YAML principle actually protects. The vocabulary lives on the adapter beside
`concepts` and `adminNav` (exact field placement is a plan-level decision; the adapter is
the natural home since `defineAdapter` already const-captures its shape).

### 2. Capability resolution

A new small module (in `src/lib/auth/`) owns the mapping: given the declared vocabulary
and a role string, return `'owner' | 'editor' | 'none'`. A role string not in the
vocabulary (a pruned config, a hand-edited row) resolves to `none`: the session still
authenticates, a warn-level log event fires (section 8), and a doctor check reports the
unknown role. Fail closed on capability, fail loud in the logs, never lock the person out
of sign-in.

`Editor` gains `capability: Capability` (resolved at session resolution in the guard, and
at any other point the engine materializes an `Editor`), so custom routes can gate on
capability without re-deriving the mapping. The live-read property is preserved: role and
capability are derived per request from the current `editor` row.

### 3. The typed read-side: the Register pattern

Cairn exports an empty registry interface; a site augments it once:

```ts
// src/app.d.ts (site)
declare module '@glw907/cairn-cms/auth' {
  interface CairnRolesRegister {
    roles: typeof roles; // the site's defineRoles value
  }
}
```

The public `Role` type derives from the registry, defaulting to `'owner' | 'editor'` when
unaugmented. `locals.editor.role` is then narrowed to the site's declared names everywhere
the site reads it, including its own custom admin routes, matching the fieldset
const-generics DX the ROADMAP entry names. This registry pattern (SvelteKit's `App`,
TanStack's `Register`) is the only mechanism that reaches ambient `App.Locals`, since
ambient interfaces cannot carry a generic. Exact interface name and derivation shape are
plan-level; the contract is: unaugmented consumers keep today's `Role` type exactly.

### 4. Guards, gates, and the none contract

- `requireSession` is unchanged: any authenticated session passes.
- `requireOwner` re-keys its check from `role !== 'owner'` to `capability !== 'owner'`.
  Identical behavior under the default vocabulary.
- A new exported `requireEditor` passes owner- and editor-capability sessions and refuses
  `none` with 403, the same shape as `requireOwner`.
- The engine's content routes (loads and actions in `content-routes-core.ts` and
  siblings) switch from bare `requireSession` to `requireEditor`. This is the change that
  makes `none` real. It is invisible to existing sites: no site can hold a
  none-capability row today.

**The none contract, a documented guarantee (the ASC brief's load-bearing ask):** a
none-capability session authenticates, carries a populated, typed `locals.editor`, and
passes through the `CairnAdminShell` custom-route seam; only the engine's own content and
roster surfaces refuse it. Site-mounted admin routes gate themselves (the engine's nav
hiding stays cosmetic; server-side gating stays the site's own `requireSession` plus its
role check). This guarantee gets its own integration test and its own reference-doc
statement; the duplicated-guard pattern dies only if it holds.

**Landing (Geoff's ruling: depends on the role).** `/admin`'s landing behavior becomes
role-aware via the declared `home`:

- A role with a declared `home` is redirected there from the admin root.
- Owner- and editor-capability roles without `home` land on the content list, as today.
- A none-capability role without `home` lands on a minimal, calm signed-in screen (name,
  sign-out, and a short "no content access here" line in the admin voice), inside the
  shell so any site-granted nav is visible.

### 5. Nav and shell

Engine nav items carry capability requirements internally: content navigation requires
editor capability; the Editors item stays owner-only (today's `canManageEditors`). Custom
nav keeps `ownerOnly` and the per-request `navFilter` dep, whose `editor` argument is now
site-typed; per ASC's consumer answer, no new declarative visibility knob is added. The
shell payload's `user.role` follows the typed `Role`.

### 6. ManageEditors: still the one screen

- The role control renders the declared vocabulary: the current owner/editor toggle when
  the vocabulary is the default pair, a select when it is larger, with each role's
  capability shown beside its name.
- `parseRole` stops coercing unknown form values to `'editor'` and rejects them as a
  validation error against the vocabulary.
- The last-owner guard generalizes from `role = 'owner'` to
  `role IN (<owner-capability names>)`, still a single atomic statement in the store
  (`removeOwnerIfNotLast`, `demoteOwnerIfNotLast` take the owner-level name set). After
  ASC's collapse this is the only last-owner guard anywhere, per the brief.
- The screen stays owner-gated and mounts exactly as today: zero site wiring.

### 7. Schema and migration

A new migration rebuilds the `editor` table without the `CHECK (role IN ...)` constraint
(SQLite cannot drop a CHECK; the migration does the create-copy-drop-rename dance inside
the migration's implicit transaction). Role validity moves to the app layer, validated
against the declared vocabulary at the write paths (add, setRole). Existing rows carry
`owner`/`editor` and stay valid under any vocabulary, since `owner` is reserved and an
unknown role fails closed to `none` rather than erroring. No data rewrite rides the
migration; in particular no email-case normalize (a lowercase collision on the primary
key would fault the migration; the doctor check below covers the hygiene instead).

### 8. Bootstrap owner (Geoff-ruled: in)

`CairnAdminDeps.auth` gains `bootstrapOwner?: { email: string; displayName: string }`. On
a magic-link request, after normalization, when the editor table is empty and the email
matches the configured bootstrap owner, the engine inserts the owner row atomically
(insert-if-empty, one statement guarded by `NOT EXISTS (SELECT 1 FROM editor)`) and
proceeds with the normal magic-link flow. Once any editor row exists the config grants
nothing, so this encodes exactly the trust the hand-seed SQL already encodes, minus the
wrangler step. Emits `editor.bootstrapped`. The configure-auth guide's seed section
rewrites around it (the SQL stays documented as the fallback for sites that prefer it).

### 9. Audit and log vocabulary

- `editor.added` and `editor.role_changed` gain a `capability` field beside `role`;
  `editor.removed` keeps its shape.
- New events: `editor.bootstrapped` (email) and a warn-level unknown-role event (event
  name settled at plan time, e.g. `auth.role.unknown`, carrying email and the orphaned
  role string).
- `docs/reference/log-events.md` updates in the same pass. Log events are the sinkable
  audit surface the ASC brief requires; no separate audit subsystem.

### 10. Email normalization: invariant, not new code

Trim + lowercase already holds on every write and lookup path. This pass documents it as
a named invariant (the allowlist stores lowercase and compares lowercased; the same email
is a consumer's join key to its own domain tables) and adds a doctor check that flags
editor rows violating it (the manual-insert hole, which the bootstrap owner also mostly
retires). No behavior change.

### 11. Public surface and versioning

New public surface: `defineRoles`, the `Capability` type, `requireEditor`, the registry
interface. Changed: `Role` becomes registry-derived (defaulting to today's union),
`Editor` gains `capability`, `AdminShellData.user.role` follows, `CairnAdminDeps.auth`
gains `bootstrapOwner`. Behavior under the default vocabulary is identical, so the
changelog entry expects no `Consumers must:` action for existing sites beyond "augment
the registry if you declare roles"; `check:surface` regenerates with the pass. Scale: a
minor under the 0.x heuristic (new subsystem surface), cut when ASC needs it, per the
release doctrine.

## Testing shape

- Unit: `defineRoles` validation (reserved owner, malformed entries, home shape),
  capability resolution including unknown-role fail-closed, the guard matrix
  (session/editor/owner x owner/editor/none), the set-based last-owner SQL against
  multi-owner-role vocabularies, bootstrap insert-if-empty including the two-concurrent-
  requests race, `parseRole` rejection.
- Integration (workerd, real miniflare D1): the migration rebuild against a seeded
  pre-migration database; the editors actions under a custom vocabulary; the none
  contract end to end (content routes refuse 403, a shell-mounted custom route admits,
  `/admin` lands per `home`); bootstrap through the real magic-link request action.
- Component: ManageEditors rendering the default pair vs a larger vocabulary.
- The showcase stays zero-config, standing proof of the default vocabulary; a
  custom-vocabulary fixture lives in the integration suite. ASC's collapse (its
  `membership-admin` initiative) is the production proof and files friction back as
  harvest.

## Documentation riders

Reference pages for every new export and the changed `Editor`/`Role` types; the none
contract stated in the components/guard reference; the configure-auth guide's bootstrap
rewrite; `log-events.md`; the upgrade guide entry; the extending-developer explanation
updated where it names owner/editor. `check:reference`, `check:reference:signatures`,
`check:package`, `check:docs`, and `check:surface` all gate the pass.

## Out of scope (the YAGNI guardrails, from the brief and the charter)

No per-concept or per-path permissions. No draft/approval workflow tiers. No invite
flows, emails on grant, or passwords. No member-scale auth in the allowlist. No
cross-site identity. No declarative nav-visibility knob beyond the existing `ownerOnly`.
No role UI in consuming sites. No fourth capability level until a consumer shape demands
it.

## Acceptance

The design is done when: a zero-config site upgrades with no observable change; a site
declaring ASC's vocabulary gets typed `locals.editor.role`, a working three-role
ManageEditors, the instructor landing on its declared home, and content routes refusing
the instructor; the last-owner guard holds under the custom vocabulary; the bootstrap
owner seeds exactly once on an empty table; and every gate in the documentation riders
section is green.
