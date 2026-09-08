# Identity-seam plan fold brief (2026-09-07)

Consolidated from the four-lens plan review; the plan's revision 2 and the spec's revision 3 were rewritten from it. Write-once.


Object: `docs/superpowers/plans/2026-09-07-identity-seam-pass.md` and
`docs/superpowers/specs/2026-09-07-identity-seam-design.md` (revision 2).
Lenses folded: grounding (G1-G16), security (S1-S23), hygiene and sizing (H1-H12),
charter and precedent (C1-C8). Every finding lands below: folded, merged into another
finding, or dismissed with a reason.

Corrections per plan section: header 4, ruled inputs 13, global constraints 2,
Task 1 8, Task 2 12, Task 3 9, Task 4 7, Task 5 15, Task 6 5, ritual 3, hands-forward 3.
Total 81 correction items over 59 distinct findings.

---

# Part 1. Corrections, by plan section

## Header

### H-1 (H4). The parallel-with-B1 shared-file list is incomplete and its reconciliation rule is unschedulable

Two shared files are missing (`docs/extend/migration-notes.md`, `docs/internal/engine-rulings.md`),
and both passes' last task runs a whole-log friction triage, a semantic race; "the last task of
whichever merges second reconciles" cannot be scheduled, because each pass's last task runs before
either merges.

**Replacement text** (H4, verbatim), for the header sentence beginning "in PARALLEL with chassis-B1":

> Shared with chassis-B1: `CHANGELOG.md`, `ROADMAP.md`, `docs/STATUS.md`,
> `docs/extend/migration-notes.md`, `docs/internal/engine-rulings.md`,
> `docs/internal/docs-friction-log.md`, and `docs/HISTORY.md`. **The whole-log friction triage
> belongs to chassis-B1 this window**; Task 6 here appends this pass's own findings and triages only
> those. The reconciliation is a rebase step in the pass-end ritual of whichever pass merges second,
> performed by the conductor after the first merge lands, not a committed task step.

Note: G12 deletes `migration-notes.md` from this pass entirely (see T5-11), which removes that file
from the contention list once folded. Keep it named in the header anyway, since chassis-B1 still
writes it and the conductor's rebase step needs the full list.

### H-2 (H5, G16). The wrong task is flagged as the fat one, and Task 2's "pre-agreed split" cannot execute

One task is one implementer dispatch under `pass-execute-chains.js`; the conductor has no
mid-dispatch hook, so "pre-agreed split: 2a conditions, 2b the branch" either never happens or needs
a re-dispatch the plan does not describe. Task 2 is already bounded (two named file sets, two
commits). Task 5 carries the pass's largest single deliverable and, after this fold, grows by seven
more sections.

**Replacement text** for the token-ceiling paragraph's second and third sentences:

> Task 5 is split into 5a and 5b (see the task sections); the pass runs SEVEN tasks. Task 5a is the
> one expected to exceed 0.7M. Task 2 remains one dispatch producing two commits (the conditions and
> the log vocabulary first, the guard branch second); it carries no mid-dispatch split.

### H-3 (H9). Checkpoints and the ceiling carry no line for the pass-end ritual

**Replacement text** (H9, adapted to seven tasks):

> **Token ceiling:** 5.5M. About 3.6M for the seven tasks at chassis-A's observed 0.3M-0.6M per task
> with no image reads, about 1.0M reserved for the pass-end ritual (code-simplifier over the whole
> diff, three reviewers with one fix round each, the nine named gates, the from-scratch showcase
> install plus build plus e2e), the remainder slack. **Checkpoint interval:** after Tasks 3 and 6,
> each writing STATUS (task ledger, decisions taken, spend against the ceiling, next task). At 80%
> the conductor finishes the task, writes STATUS, and asks one combined question.

### H-4 (S23.1). Intermediate commits advertise identity mode before anything enforces it

The PR opens at Task 1's commit, and Task 1 publishes `locals.cairnIdentity` with no resolver call
and no route branches. Add to the header, after "Open the PR after Task 1's commit":

> No preview deploy runs off an intermediate commit on this branch: between Task 1 and Task 3 the
> branch advertises identity mode with the magic-link surface still live, which is a safe state only
> because no site configures `identity` on the branch.

---

## Ruled inputs

### R-1 (G1 + S1 + H1, BLOCKING, must-fix). The `locals.cairnIdentity` assignment must sit before the public-path branch

All three lenses found the same defect independently. `guard.ts:175` opens
`if (!isPublicAdminPath(pathname)) {`, and `isPublicAdminPath` (`guard.ts:25-27`) is
`pathname === '/admin/login' || pathname.startsWith('/admin/auth/')`, exactly the paths Task 3's
handlers serve. A branch written inside `:175-195` leaves `locals.cairnIdentity` undefined on
`/admin/login`, `/admin/login?/request`, and `/admin/auth/confirm`, so Task 3 is dead code and a
gated site keeps minting tokens and session rows.

**Replacement text**, Ruled inputs, decision 7 bullet, replacing "the guard sets
`locals.cairnIdentity = { label, logoutUrl }` on every admin path it handles in identity mode":

> the guard sets `locals.cairnIdentity = { label, logoutUrl }` on EVERY admin path when `identity`
> is configured, the public admin paths (`/admin/login`, `/admin/auth/**`; `isPublicAdminPath`,
> `guard.ts:25-27`) included, since the magic-link handlers live only on public paths. The
> assignment is made from the closed-over option alone, immediately after the bindings refusal
> (`guard.ts:126-133`) and BEFORE the CSRF stage (`:145`), so it sits OUTSIDE the
> `!isPublicAdminPath` block at `:175`. `identity.resolve` is still called only on guarded paths,
> inside `:175-195`: a public path carries the mode flag and resolves no identity, by design.

Two rewrites differ; both are folded. **S1's is the stronger placement** ("after the bindings
refusal, before the CSRF stage") because it fixes an anchor rather than a relation, and it makes the
value present on a CSRF rejection too, which the routes never see but the log record does. G1's "(a)
cheap, and enough for Task 3, since the routes only need the mode flag plus `label`/`logoutUrl`" is
the reasoning to keep; G1's alternative (b), resolving on public paths, is rejected here, since
`renderConditionResponse` would then refuse the login page.

**Task home.** H1 puts the assignment in Task 1; S1 puts it in Task 2b. **H1 is stronger**: the
plan's Task 1 already says the guard sets `locals.cairnIdentity` "when the option is present ... no
branch behavior yet", so keeping it there avoids a second `guard.ts` edit in Task 2 and gives Task 1
a testable deliverable. Task 2 then changes only the inside of the `:175-195` block. H-4 above
records the intermediate-state consequence.

### R-2 (S4, BLOCKING, must-fix). The `logoutUrl` rule as worded admits `//evil.example`

A literal `startsWith('/')` admits every scheme-relative and backslash variant.

**Replacement text** (S4, verbatim), for the `logoutUrl` parenthetical:

> (a root-relative path matching `/^\/(?![\\/])/` after rejecting any value containing a backslash,
> a control character, or a whitespace character, or an absolute URL whose parsed `protocol` is
> exactly `https:`; anything else throws at `createAuthGuard`, per the OWASP Unvalidated Redirects
> and Forwards cheat sheet). The guard publishes the validated value onto `locals.cairnIdentity` at
> construction time and the routes redirect to that snapshot, never re-reading `identity.logoutUrl`
> per request.

The accept/reject table lands in Task 1 (T1-5).

### R-3 (G7 + S7 + H8). No throw path and no shape check on a site-supplied resolver

`identity` is arbitrary site code called inside `handle`. `createRemoteJWKSet` fetches over the
network and `jwtVerify` throws on every verification failure, so a resolver missing one `try`
produces a raw 500 instead of the refusal page the whole design rests on. A resolver returning
`{ ok: true, email: undefined }` reaches `.trim()` and throws, or reaches `findEditor(db, '')`.

**Replacement text**, appended to the resolver-contract bullet. S7's is the stronger of the two
rewrites (it names the cap and the "never a 500" property; G7's `detail: 'error'` is the same
decision in fewer words):

> The guard wraps `identity.resolve` in try/catch: a throw is a refusal rendering
> `auth.identity-unresolved` and logging `guard.rejected` with `reason: 'identity'` and
> `detail: 'error'` plus the thrown message capped at 300 characters (never a token), and is never a
> 500; and a `ResolvedIdentity` whose `email` is not a string, or is empty after normalization, is
> treated as a refusal rather than a roster lookup.

### R-4 (G8). Correct where normalization actually happens, and pin `findEditor`

`findEditor(db, email)` (`src/lib/auth/store.ts:52-58`) normalizes internally
(`normalizeEmail`, `:34-36`), the store-level invariant its module header states.

**Replacement text** for "The guard normalizes `email` (trim, lowercase) before the roster lookup":

> The guard normalizes `email` (trim, lowercase) for the log record and the unrostered page; the
> lookup is normalized again inside `findEditor` (`src/lib/auth/store.ts:52-58`), the store's own
> invariant.

### R-5 (G6 + C1 + H3, must-fix). "`jose` declared per `check:snippets`'s convention" describes a convention that does not exist

`check-snippets.mjs:60-76`: a bare specifier is real "exactly when it resolves as an actual
dependency of this package ... with no allowlist to maintain". `jose` is not installed, so every
`jose` call in the recipe is rewritten to `any` and typechecks vacuously.

**Replacement text** (G6, verbatim) for the ruled input:

> `jose` is not a dependency, so `check:snippets` stubs it to `any` automatically
> (`check-snippets.mjs:60-76`); no declaration is needed and none is possible.

The honest acceptance criterion lands in Task 5a (T5-2). G6 and H3 give the same rewrite; **C1's
framing is the one to record**, because it names what the fold costs: the F1 trade was "the recipe
is a *verified* artifact, not folklore", and the verification half does not exist, so the ledger's
declined row must carry the lower assurance (HF-3).

### R-6 (S17). The resolver takes `CairnEvent`, not `RequestEvent`

`guard.ts:1-3` states the rule ("Events are typed structurally, so the engine stays free of a
site's App.* ambient types"); the `audit-auth-authchannelevent` ruling records it. Spec:78 still
reads `RequestEvent` and the plan does not name the parameter type, so the implementer will copy the
spec.

**Replacement text** (S17, verbatim) for the resolver-contract opening:

> the resolver contract: `resolve(event: CairnEvent) => Promise<ResolvedIdentity | IdentityRefusal>`,
> the structural type every other engine seam takes; the reference page states why this seam gets the
> full event where `lookup`/`verify` take a narrow `{ env }` context (it must read request headers).

### R-7 (S21). `locals.cairnIdentity` is a control channel; say who may write it

Once the routes read only `locals.cairnIdentity`, any site `handle` after the guard, or a custom
admin route through the `CairnAdminShell` seam, can set it and thereby 404 the magic-link surface
and point logout anywhere, with the construction-time validation never running.

**Replacement text** (S21, verbatim), appended to the decision-7 bullet:

> the guard is the only writer of `locals.cairnIdentity`, and the value it publishes is the snapshot
> validated at construction; the ambient doc says so.

### R-8 (C5 + H11, must-fix, naming). Two naming defects and a spec/plan id divergence

Three sub-items:

1. **`no-email` violates the snake_case rule** for `reason` values (`src/lib/log/events.ts:5-7`:
   "Every `reason`/`scope` value a record carries is snake_case"). **Change:** `no-email` → `no_email`
   wherever the refusal vocabulary is enumerated (the ruled inputs and Task 2's test list).
2. **The event and its own condition share no word.** `auth.identity.unknown` would be logged by the
   condition `auth.identity-unrostered`; every other pair reads straight across (`auth.unknown-role`
   / `auth.role.unknown`). C5 prefers aligning the condition, since the event name is the
   public-observable contract. **Change:** the unrostered condition id becomes
   **`auth.identity-unknown`**, keeping `<area>.<subject>-<state>` (`store-unmigrated`'s twin) and
   reading across from `auth.identity.unknown`. The pair is therefore
   `auth.identity-unresolved` / `auth.identity-unknown`, events `guard.rejected` (`reason:
   'identity'`) and `auth.identity.unknown`. Every later section of this brief uses those ids.
3. **The spec is stale.** spec:122 and spec:126 name `identity.unresolved` and `identity.unknown`,
   neither area-prefixed. **Change:** add a ruled-input line: "spec:122 and spec:126's condition ids
   are superseded by the ids in this ruled input; the implementer registers these, not the spec's."
   Amend the spec too (Part 2).

Also (H11): restate the ids verbatim in Task 2's acceptance criteria (T2-8).

### R-9 (S15). Cap the email that is logged and rendered

An IdP-asserted 100 KB `email` claim becomes a 100 KB log record and a 100 KB page.

**Replacement text**, appended to the condition-ids bullet:

> the rendered and logged email is capped at 320 characters, the bound `auth.link.requested` already
> applies (`auth-routes.ts:159-162`).

### R-10 (S10). The roster's `displayName` wins, not the resolver's

The resolver's value flows into `locals.cairnEditor` and from there into the commit author
(`src/lib/github/repo.ts:207,230`), whose doc comment states `author` "is derived from the verified
server-side session, never request input" (`repo.ts:267`). Under an enabled login method the end
user can edit that claim (S2), so one admitted editor could display as another in the permanent
commit trail.

**Replacement text**, appended to the resolver-contract bullet:

> the roster row's `displayName` wins; the resolver's is used only when the roster row's is empty,
> and is capped at the store's own display-name bound.

This reverses spec:88-89 ("falls back to the roster row's, then to the email"), which is a spec
amendment (Part 2). The `repo.ts:267` comment correction lands in Task 2 (T2-5).

### R-11 (G16 + H5). Record the override of the spec review's split recommendation

**Replacement text**, appended to the two-doors bullet (G16, verbatim):

>, the spec review recommended cutting them to a follow-up pass (adjacency, not dependency);
> Geoff's routing keeps them, and the one-section bound is the mitigation, recorded here so the
> pass-end sizing score reads it as a deliberate override.

### R-12 (G9 + S3, BLOCKING, must-fix). `confirmLoad` 404s under identity, stated as the public-surface rule

`AuthRoutes` has five handlers (`auth-routes.ts:440-446`). `confirmLoad` (`:265-272`) reflects
`?token=` into HTML and issues a 30-day CSRF cookie; under identity mode its own action 404s, so the
page leads nowhere, yet stays a live reflector on a public admin path. G9 and S3 found it
independently; the spec dropped it silently at rev 2.

**Replacement text**, a new ruled-input bullet:

> **The public admin surface under identity.** `requestAction`, `confirmAction`, and `confirmLoad`
> all return 404, so `/admin/auth/**` serves nothing and the hand-off page at `/admin/login` is the
> only public admin surface. The 404 is raised before `requireDb`, before `request.formData()`, and
> before any cookie write.

### R-13 (H8). Name the log level for the identity refusal record

Revision 2 dropped the B5 discussion without ruling. **Replacement text**, appended to the
log-vocabulary bullet:

> the refusal record's level: `warn` for a request-shaped refusal (`missing`, `invalid`, `expired`,
> `no_email`), `error` for an operator fault (`audience`, `issuer`, `keys`, and the `error` detail
> from a thrown resolver), since those lock out the whole roster.

---

## Global constraints

### GC-1 (G4). `check:surface` drifts in Task 3, which the constraint currently forbids

`LoginData` is an exported interface (`auth-routes.ts:59-63`) named on the exported `AuthRoutes`
interface (`:441`), and `LoginPage.svelte:18-27`'s `Props.data` literal is published on
`./components`. `check-surface.mjs` exists to catch exactly this ("A renamed or retyped field on a
`*Data` interface, the developer's real upgrade guarantee, slips past both").

**Replacement text** (G4, verbatim) for the first constraint's parenthetical:

> (Tasks 1 and 3; Task 3 changes the exported `LoginData` shape at `auth-routes.ts:59-63` and
> `LoginPage`'s `data` prop, both snapshotted by `check:surface`)

### GC-2 (H10). `check:package` is missing from the per-task gate list

The `cairn-pass` skill's step 5 names four doc gates that must all pass; the plan names three. Task 1
adds three exported types and an option to an exported interface, which is exactly what that gate
reads. **Change:** add `check:package` to the per-task gate list and to the pass-end ritual's named
gates.

---

## Task 1: Declare the seam and thread it

### T1-1 (G2, BLOCKING, must-fix). The second `locals` declaration in `types.ts` is missing

There are two declarations of the shape, deliberately kept in step: `src/lib/ambient.ts:37-46` and
`src/lib/sveltekit/types.ts:84-89` (`CairnEvent['locals']`). The guard's handler is `HandleInput`
(`guard.ts:22,77`), which chains `CairnEvent`; every auth route takes `CairnEvent`. Without the
`types.ts` member the guard's write and all four route reads are type errors and `npm run check`
fails 0/0.

**Replacement text** (G2, verbatim), for the ambient-module entry in Task 1's Files:

> `src/lib/ambient.ts` (`:37-46`, the `App.Locals` augmentation) AND `src/lib/sveltekit/types.ts`
> (`:84-89`, `CairnEvent['locals']`, which repeats the same members for the engine's structural
> events), both adding `cairnIdentity?: { label: string; logoutUrl: string }`

Acceptance criterion to add: "the two `locals` declarations agree member for member."

### T1-2 (G10). The `guard.ts` anchor is wrong

`AuthGuardOptions` is `guard.ts:33-63`; the plan's `:26-45` straddles `isPublicAdminPath` (`:24-27`)
and `isAdminPath` (`:29-31`) and cuts the option block in half. **Change:** `:26-45` → `:33-63`.

### T1-3 (H12). Name `src/lib/ambient.ts` and fix its header count

Its header comment opens "The four members share the flat `cairn` prefix", a sentence a fifth member
falsifies. **Change:** name the file, and add "update its header comment's member count and add the
`cairnIdentity` paragraph beside the `cairnAccess` one".

### T1-4 (C4). `identity` joins a frozen Scaffold-tier interface with no per-member tier note

`docs/reference/README.md:24-26` defines Scaffold API as "the copied wiring a scaffolded site owns".
No scaffold writes `identity`. A reader sees a new member inside a frozen interface while its three
types are marked Unstable, and the page says nothing about which promise governs the member.

**Replacement text** (C4, verbatim) for the `docs/reference/sveltekit.md` entry:

> `AuthGuardOptions.identity` on the `createAuthGuard` section, carrying its own tier note
> (`identity` and its types are Unstable inside the frozen interface; the option may change shape or
> leave in any minor)

Acceptance criterion to add: "the `identity` member's tier is stated where the reference row
declares it."

### T1-5 (S4). The `logoutUrl` accept/reject table

**Replacement text** (S4, verbatim) for the test line:

> accept `/goodbye` and `https://team.cloudflareaccess.com/cdn-cgi/access/logout`; reject
> `//evil.example`, `/\evil.example`, `/\/evil.example`, `\\evil.example`, `/%2f%2fevil.example`,
> `http://x/`, `javascript:alert(1)`, `data:text/html,x`, `/path\r\nX-Injected: 1`, and the empty
> string.

### T1-6 (G1/H1/S1). The `locals.cairnIdentity` write lands here, at the corrected anchor

**Replacement text** for Step 1 (H1, with S1's anchor folded in):

> set `locals.cairnIdentity = { label, logoutUrl }` for every path `isAdminPath` matches,
> immediately after the bindings refusal (`guard.ts:126-133`) and BEFORE the CSRF stage (`:145`), so
> a public admin path carries the flag while resolving no identity. Task 2's branch changes only the
> inside of the `!isPublicAdminPath` block at `:175`.

Acceptance criterion to add (H1, verbatim): "an identity-mode request to `/admin/login` carries
`locals.cairnIdentity` and calls `resolve` zero times (unit test)."

### T1-7 (H7). Name the test file inside the byte-identical criterion

**Change:** "the zero-config guard path byte-identical" → "the zero-config guard path byte-identical:
`src/tests/integration/auth-guard.test.ts` passes unmodified."

### T1-8 (C8). One stale reference sentence no gate covers

`docs/reference/README.md:56` describes `/ambient` as "the one-line `App.Locals.cairnEditor`
augmentation for a site's `app.d.ts`", which this task makes false. **Change:** add
`docs/reference/README.md` (`:56`) to Task 1's Modify list, corrected to name the augmentation's
members rather than one.

---

## Task 2: The guard's identity branch, its conditions, and its log vocabulary

### T2-1 (G3, BLOCKING, must-fix). `renderConditionResponse` cannot carry the email or the label, and `REASON_CONDITION` is keyed by `guard.rejected` reason

Three problems in one file, verified against the source:

1. `condition-response.ts:40`: `renderConditionResponse(id: string, ctx: { url?: URL } = {})`. `ctx`
   carries only `url`, consumed by one arm (`:44-48`).
2. No arm interpolates request data. The branded arms render a fixed page or
   `conditionFaultPage(cond)` (`:23-37`), which escapes only the registry's own static fields.
3. `REASON_CONDITION` (`:11-17`) is documented as "The guard.rejected reasons, each mapped to its
   registered condition id", keyed `https`, `csrf`, `origin`, `bindings`. Only the unresolved
   condition has a `guard.rejected` reason (`identity`); `auth.identity-unknown` logs
   `auth.identity.unknown`, a different event, so it has no key to occupy, and adding it breaks the
   map's stated 1:1.

**The corrected mechanism** (the smallest change that keeps `check:readiness`, `check:symbols`, and
`check:docs` green; G3's rewrite with the second-map question resolved):

> widen `renderConditionResponse`'s `ctx` (`:40`) from `{ url?: URL }` to
> `{ url?: URL; email?: string; label?: string }`; add `identity: 'auth.identity-unresolved'` to
> `REASON_CONDITION` (`:12-17`) and NOT the unknown id, which is not a `guard.rejected` reason;
> export a sibling constant beside the map, `export const IDENTITY_UNKNOWN_CONDITION =
> 'auth.identity-unknown' as const`, with a one-line doc saying it is renderer-reachable but has no
> `guard.rejected` reason, and use it as the second switch case's label so the guard and the renderer
> still share one spelling; add two page modules beside `https-required-page.ts` and
> `csrf-required-page.ts`, the unknown one interpolating the normalized, 320-capped email through
> `escapeHtml` (`../escape.js`, already imported at `:7`) and both escaping the site-supplied `label`.

Rejected alternatives, recorded so no one re-derives them: a **parameterized arm** (one arm handling
both ids off a discriminator) collapses two different pages into one branch for no saving; a **second
full map** duplicates the registry assertion `condition(id)` at `:42` already performs. A single
exported constant is the smallest change that preserves the documented 1:1 invariant.

Acceptance criterion to add (G3, verbatim): "a test asserts an email containing `<script>` renders
escaped."

### T2-2 (G14). Name the D1 integration exemplar rather than describing it

**Replacement text** (G14, verbatim), inserted after "(workerd project":

> on the `src/tests/integration/auth-guard.test.ts` harness verbatim: `env.AUTH_DB` from
> `cloudflare:test`, its `asHandle` shim, `./_auth-harness.js`, and `_apply-migrations.ts`

### T2-3 (G8 + H8). Pin `findEditor`; drop "or equivalent"

"Or equivalent" invites a second lookup path in the one place the plan says authorization lives.
**Replacement text** (G8, verbatim): "`findEditor(db, email)` (`src/lib/auth/store.ts:52-58`), which
returns `EditorRow` and normalizes the email itself (`store.ts:34-36`)". The `Editor` shape
(`auth/types.ts:13-18`) adds `capability` and a non-optional `displayName`, which is why the fallback
chain exists.

### T2-4 (G7 + S7 + H8). The try/catch and the shape check, with their tests

Per R-3. **Tests to add** (S7, verbatim):

> a resolver that throws renders the unresolved condition and logs `detail: 'error'`, never a 500; a
> resolver returning a non-string or empty `email` renders the unresolved condition and performs no
> roster query.

### T2-5 (S10). The roster's `displayName` wins, and one doc comment is corrected

Per R-10. Add to Task 2's Files: "`src/lib/github/repo.ts` (`:267`: the 'never request input'
sentence names the identity case)". **Test to add** (S10, verbatim): "a resolver asserting a
`displayName` different from the roster row's yields the roster row's on `locals.cairnEditor`."

### T2-6 (S16). `label` is interpolated too, and is site config rendered into hand-built HTML

**Replacement text** (S16, verbatim):

> the two condition arms take their interpolations through `escapeHtml` (`src/lib/escape.ts:5`): the
> requester's normalized email on the unknown arm and the site-supplied `label` on both arms.

The plan's current claim that the email is "the only request data any condition page renders" stays
true (the label is config, not request data), but the escaping scope must name both.

### T2-7 (S15). The log-events guarantee is falsified by the new row

`docs/reference/log-events.md:105-108` states that every event's `email` except
`auth.link.requested`'s belongs to an allow-listed editor. `auth.identity.unknown` fires precisely
for an address that is not on the roster. **Change** (S15, verbatim): add "and the guarantee sentence
at `log-events.md:105-108` is amended to name `auth.identity.unknown` as the second exception".

### T2-8 (H11 + C5). The condition ids are stated verbatim in the acceptance criteria

**Replacement text** (H11, with C5's rename folded):

> the two conditions registered as `auth.identity-unresolved` and `auth.identity-unknown`, matching
> `conditions.ts`'s `<area>.<subject>-<state>` shape and reading across from the event
> `auth.identity.unknown`.

### T2-9 (S20/N1). The "never reads the session cookie" property has no statement and no test

**Change:** add to Task 2's test list: "a request carrying a valid pre-existing session cookie plus
an identity refusal is refused; the guard calls `resolveSession` zero times on any path under
`identity`, and pre-existing `session` rows are inert." The matching sentence goes in the security
model (T5-5).

### T2-10 (H8 + R-13). Name the level on each `guard.rejected` record

**Change:** the task states the level per refusal class, per R-13.

### T2-11 (G1). The public-path assertion belongs in Task 2's acceptance criteria too

**Replacement text** (G1, verbatim): "`locals.cairnIdentity` is set on `/admin/login` and
`/admin/auth/confirm` with no `resolve` call on either." Plus S1's test: "with `identity` configured,
`GET /admin/login` and `POST /admin/login?/request` both carry `locals.cairnIdentity`."

### T2-12 (H5). Drop the 2a/2b split language

**Change:** the title loses "(pre-agreed split: 2a conditions and vocabulary, 2b the branch)"; the
Modify lines keep their "(2a)" and "(2b)" grouping as the two commits inside one dispatch, and the
steps read "Step 1 (first commit)" and "Step 2 (second commit)".

---

## Task 3: The magic-link surface under identity mode

### T3-1 (G9 + S3, BLOCKING, must-fix). `confirmLoad` returns 404, raised before any side effect

**Replacement text** (S3, verbatim), extending the `auth-routes.ts` modify line:

> `requestAction`, `confirmAction`, and `confirmLoad` all return 404 in that mode, so `/admin/auth/**`
> serves nothing and the hand-off page at `/admin/login` is the only public admin surface. The 404 is
> raised before `requireDb`, before `request.formData()`, and before any cookie write.

**Test to add** (S3, verbatim): "`GET /admin/auth/confirm?token=x` 404s and sets no cookie."
G9's rewrite is the same finding in weaker words ("add `confirmLoad` to the Files line"); S3's is
stronger because it names where the 404 is raised, which S19 shows is the whole security property.

### T3-2 (S13). The hand-off page mints no cookies

`loginLoad` today calls `mintOrReusePendingNonce` and `issueCsrfToken` (`auth-routes.ts:247-254`).
As written, an ungated public page on an identity-mode site keeps writing a pending-login nonce
nothing can consume and re-anchoring a 30-day CSRF cookie on every anonymous hit.

**Replacement text** (S13, verbatim):

> in identity mode `loginLoad` mints no pending-login nonce and issues no CSRF token (the hand-off
> page carries no form); the return shape is a discriminated addition to `LoginData` recorded in
> `check:surface` and the changelog, and the plan's "additive, no `Consumers must:`" line at Task 6
> is re-checked against it. The security property rests on the two 404s, not on the page component:
> a site rendering its own login page against `LoginData` may keep drawing a form, and that form must
> be inert.

### T3-3 (G4 + S13). `check:surface -- --update` runs here too

**Change:** add `docs/internal/api-surface.md` to Task 3's Files and `--update` to its Step 1, per
GC-1.

### T3-4 (G11 + H12). Name the login component

**Replacement text** (G11, verbatim): "`src/lib/components/LoginPage.svelte` (whose `data` prop
`loginLoad`'s return feeds)". `loginLoad` renders nothing; it returns a `LoginData` object, and the
consuming site's `+page.svelte` renders the component.

### T3-5 (S12). `bootstrapOwner` becomes dead config under identity mode

`bootstrapOwner` fires only inside `requestAction` (`auth-routes.ts:178-181`), which this task 404s.
A site relying on it for its first owner has no seeding path at all: every editor, the intended owner
included, gets the unknown-identity page.

**Replacement text** (S12, verbatim), added to the `auth-routes.ts` behavior: "`bootstrapOwner` never
fires under identity mode, since its only call site is the 404'd `requestAction`."

### T3-6 (H2). The Interfaces block is missing its `Produces`

**Replacement text** (H2, verbatim):

> Produces: the `data-cairn-identity` attribute on the hand-off paragraph (exact spelling; Task 4's
> probe matches on it); the four identity-mode handler behaviors.

### T3-7 (C8). `data-cairn-identity` is an undocumented observable contract

The doctor reads the marker across the network, so it is a contract between the engine's page and the
engine's own CLI, and a site replacing the login page silently breaks the probe. `check:reference`
cannot catch an HTML attribute. **Change** (C8): add `docs/reference/doctor.md` to Task 3's Modify
list with one line naming the marker as the signal the probe reads; acceptance criterion "the marker
is documented where the probe's contract is documented."

### T3-8 (S1). The end-to-end shutdown test

**Replacement text** (S1, verbatim), added to the test list:

> `POST /admin/login?/request` 404s and emits no `auth.token.minted` and no `auth.link.requested`,
> mounted through `createCairnAdmin` with no identity-aware admin config.

### T3-9 (H7 + G9). "The four cases" becomes five

**Change:** the acceptance criteria read "the five cases green both ways" (`loginLoad`,
`requestAction`, `confirmAction`, `confirmLoad`, `logoutAction`).

---

## Task 4: The doctor's login probe learns the gate

### T4-1 (G5 + S5, BLOCKING, must-fix). The probe follows redirects; the host test is a suffix match; 401/403 is not proof

`ctx.fetch` is `globalThis.fetch` (`src/lib/doctor/bin.ts:84`), default `redirect: 'follow'`, and
`probe()` (`check-probe.ts:46`) passes no init, though `ctx.fetch` does take one (`:106-113`). So a
correctly gated site hands the classifier Access's own 200 login page, which falls into no arm.
Worse, the stubbed-fetch tests would pass anyway. Two further defects: "ends in
`cloudflareaccess.com`" passes the registrable `evilcloudflareaccess.com`; and a 302 to the team
domain is attested by the very origin under test.

**Replacement text** (S5, verbatim, folding G5's `redirect: 'manual'` and fourth-outcome finding):

> the GET arm fetches with `redirect: 'manual'` (the probe's `ctx.fetch` is the global fetch, which
> otherwise follows the gate's 302 and the classifier never sees it) and classifies: a
> 301/302/303/307 whose `Location` parses and whose `host` matches
> `/^[a-z0-9-]+\.cloudflareaccess\.com$/i` is PASS "gated by <host>"; a 401 or 403 is INFO "the origin
> refused this request, which is consistent with a gate but does not prove one", never PASS; a 200
> whose body carries `data-cairn-identity`, OR a 200 that carries no form posting the `?/request`
> action, is FAIL "the origin answers without the gate: `/admin` is reachable directly"; a 200 with
> the magic-link form continues into today's POST arm unchanged.

**S5 is the stronger of the two rewrites** on both contested points. On 401/403, G5 keeps the plan's
PASS; S5 demotes to INFO because a WAF block, a Cloudflare error page, or a broken deploy all read
as "gated by <host>". The demotion is implementable today: `info()` exists in
`src/lib/doctor/types.ts:53` and, like `skip`, never gates. On the unrecognized 200, G5 adds a fourth
outcome ("the origin answered a page this probe does not recognize"); S5 folds it into the FAIL arm.
**S5's fail-closed fold is stronger** (an unrecognized page on `/admin` is the exposure, not a
puzzle), with G5's wording kept as the FAIL detail where it is more accurate.

**Acceptance criteria to add** (S5, verbatim): "the GET is issued with `redirect: 'manual'`, asserted
by a test that inspects the init the stubbed fetch received; a `Location` of
`https://evilcloudflareaccess.com/x` does NOT pass."

### T4-2 (S6, BLOCKING, must-fix). The `workers.dev` arm was demoted to a remediation string

The real failure shape is not "Access off" but "Access on for one hostname while the same Worker
stays reachable on another". On that hostname neither Access policy nor Access revocation applies.
The plan keeps only prose in a failure message that never fires on the deployment that has the
problem, because the primary hostname passes.

**Replacement text** (S6, verbatim), added to Task 4's file list and step:

> a second arm: read `workers_dev` through `readWranglerConfig`
> (`src/lib/doctor/wrangler-config.ts`); when it is not `false`, probe
> `https://<name>.<subdomain>.workers.dev/admin` with the same manual redirect and classify a 200 as
> FAIL "the Worker serves /admin on a hostname the Access application does not cover"; a
> `workers_dev: false` config skips the arm with that reason.

Plus the matching acceptance criterion and one stubbed-fetch test.

### T4-3 (G10). The anchors name the wrong functions

The GET arm the task edits is `probe()` at `:45-73`; the POST arm is `postRequestAction` at
`:99-148`; `:20-71` names `liveProbeCheck` (`:18-42`), which the task does not change.
**Change:** "about `:20-71` and `:95-144`" → "`probe()` at `:45-73` (the GET arm) and
`postRequestAction` at `:99-148` (unchanged)".

### T4-4 (G11). Name the test file

**Change:** "the probe's unit tests" → "`src/tests/unit/doctor-check-probe.test.ts`".

### T4-5 (H7). "The magic-link path byte-identical" cannot be settled

The task edits `check-probe.ts`, so nothing is byte-identical; the intent is behavioral.
**Replacement text** (H7, verbatim): "the magic-link outcome is unchanged: the existing probe tests
pass unmodified and the POST arm runs only after a 200 carrying the magic-link form."

### T4-6 (H2). Add the Interfaces block

**Replacement text** (H2, verbatim): "Consumes: Task 3's `data-cairn-identity` marker."

### T4-7 (S12). The `auth.store` remedy names the ordering

**Change:** the remedy string names not just the out-of-band seed but the ordering: seed the first
owner BEFORE enabling `identity`, since `auth.bootstrapOwner` is inert once identity mode is on.

---

## Task 5: split into 5a (the extend page and the recipe) and 5b (the inbound doc edits)

### T5-15 (H5, sizing). The split itself

Task 5 as planned carries a 220-300 line new page, five modified docs, a conditional record edit, a
`prose-voice-reviewer` round, and four gates, in one step with no Interfaces block; this fold adds
seven more required sections to the page. **Split** (H5, verbatim, with the fold's additions):

> **5a:** the new extend page and the recipe; `check:snippets`, `check:vale`, `check:prose`, the
> `prose-voice-reviewer` round.
> **5b:** the five inbound doc edits (`security-model.md` including the false-statement sweep,
> `extend/README.md`, `why-cairn.md`, post-freeze note 4, `docs/reference/README.md`'s auth list if
> touched); `check:arm-indexes`, `check:docs`, `check:vale`.

Interfaces blocks (H2, verbatim): 5a "Consumes: Task 1's exported types (the recipe's fenced block
imports them)"; 5b "Consumes: 5a's page (every inbound edit links it)".

### T5-1 (S2, BLOCKING, must-fix). The login-methods floor fell through entirely

The email claim is the whole join between the gate and the roster. Access applications commonly
enable more than one login method, and the impersonation floor is the weakest one enabled: a generic
OIDC connection (how the spec itself wires Google Workspace, spec:29-32) or a social IdP asserts an
`email` the end user may control. The magic-link path this replaces proved mailbox control by
construction; this one does not, and neither document contains the strings "One-time PIN", "login
method", "social", "verified", or "mailbox".

**Replacement text** (S2, verbatim), inserted in 5a's page contents after "the migration step on
roster emails":

> a REQUIRED "which login methods are safe" section, stated before the recipe: the email claim is
> the entire join between the gate and the roster, so the Access application must enable only methods
> that prove control of the address they assert (a Workspace or Entra directory, or Access's own
> One-time PIN); enabling a second method widens the floor to the weakest one, since every enabled
> method's token carries the same `aud` and verifies identically here; never enable a social IdP or a
> generic OIDC connection whose `email` claim the end user can edit on an application that gates a
> cairn admin. cairn cannot distinguish a directory-asserted address from a self-asserted one.

Repeat the paragraph in 5b's `security-model.md` edit, and add it to the `web-auth-security-reviewer`'s
named merge-gate inputs (RT-2). It also becomes a spec section (Part 2).

### T5-2 (C1 + G6 + H3, must-fix). The honest acceptance criterion for the snippet gate

**Replacement text** for 5a's Step 1 clause and acceptance criterion (H3's AC wording, with C1's
consequence folded in):

> Step 1: the page; `check:snippets` green with the recipe block counted.
> AC: `check:snippets` green; the block's cairn-side shape (the resolver object and both return
> shapes) is what the gate checks, since `jose` is unresolvable and stubs to `any`
> (`check-snippets.mjs:60-81`); the recipe's verification logic is proven only by the
> `web-auth-security-reviewer`'s read, which is therefore a blocking acceptance criterion for this
> task, not a pass-end fan-out item. The page carries one sentence telling the reader the block is
> not machine-verified against `jose`.

Delete the plan's "`check:snippets` proves the recipe typechecks against the built package". G6's and
H3's rewrites agree; **C1's is the one to adopt** because it also raises the reviewer's read from the
fan-out into the task's own criteria, which is what restores the assurance the gate does not give.

### T5-3 (S8). No `keys` refusal class and no jose bounds

A `createRemoteJWKSet` fetch failure maps to `invalid` under the plan's class list, so a Cloudflare
certs outage produces a roster-wide lockout that reads in the log as an intrusion.

**Replacement text** (S8, verbatim), replacing the recipe's class list:

> the per-class `reason` (`missing`, `invalid`, `audience`, `issuer`, `expired`, `no_email`, `keys`),
> mapped from jose's own error classes (`JWTClaimValidationFailed` on `aud`/`iss`, `JWTExpired`,
> `JWSSignatureVerificationFailed`, `JWKSNoMatchingKey` and any fetch failure onto `keys`), with the
> page stating that `keys` and `audience`/`issuer` are operator faults that lock out the whole roster
> and deserve an alert; `jwtVerify` with no `clockTolerance` (issuer and verifier are both Cloudflare,
> so tolerance only extends an expired token's life); `createRemoteJWKSet` constructed once at
> resolver construction, never at module top level, with `timeoutDuration`, `cooldownDuration`, and
> `cacheMaxAge` written explicitly; and one sentence stating that key selection is JWKS-only and a
> token's own `jwk`/`jku`/`x5u` headers are never consulted, which is what closes the key-confusion
> class alongside `algorithms: ['RS256']`.

(`no-email` is spelled `no_email` here per R-8.) The reason set stays open ("a site's own word"), and
the engine's own doc names these seven.

### T5-4 (S9). The `type: 'app'` check and the `teamDomain` scheme trap

Access issues two `CF_Authorization` values, the per-application token and a team-scoped session
token carrying `type: 'org'`; audience pinning is the only thing separating them, and the recipe
relies on that implicitly. Separately, Cloudflare's own sample writes `TEAM_DOMAIN` including the
scheme, so a recipe concatenating `'https://' + teamDomain` yields `https://https://team...`, every
request fails `issuer`, and the site is locked out with one indistinguishable log line.

**Replacement text** (S9, verbatim), added to the recipe bullets and the page contents:

> the `payload.type === 'app'` check, refusing the team-scoped `org` session token whatever its
> audience says
>
> the team domain is written as a bare hostname (`<team>.cloudflareaccess.com`), stated explicitly
> because Cloudflare's own sample includes the scheme, and the recipe validates it at construction and
> throws naming the expected form; the AUD tag is the application's AUD, not its application id.

### T5-5 (S11). The security-model corrections are under-scoped

The plan buys three corrections; the spec review's table names twelve statements the design makes
false or inapplicable, including `:43-48` ("no third-party identity provider"), `:45-46` (the three
lifetimes as named constants, replaced under identity by the Access application's operator-set
session duration), `:225-226` ("a missing or invalid session redirects to `/admin/login` without
logging"), and `:424-431` (the no-CSP rationale).

**Replacement text** (S11, verbatim), replacing 5b's `security-model.md` clause:

> each row of the spec-review's false-statement table (`spec-review.md:619-635`) is either corrected
> or explicitly scoped to the built-in magic-link path, and the section states that under identity the
> effective admin session lifetime is the Access application's session duration, an operator-set
> value, with the advice to set it to hours

Add the table to the security reviewer's named inputs (RT-2). H7's rewrite of the vague acceptance
criterion folds here: "each statement listed at `spec-review.md:614-638` is either still true under
identity mode or amended, one by one; the task reports the list with its disposition."

Also add to the same section (S18, S20/N1, S22):

> `hasSession` on a CSRF rejection record is structurally always `false` under identity, so the field
> now means "no session cookie exists on this site" rather than "this request carried none"; identity
> resolution deliberately runs after the CSRF stage, which is what keeps an unauthenticated
> cross-site POST from triggering a JWT verification; when `identity` is set the guard never reads the
> session cookie and never calls `resolveSession`, on any path, for any reason, and pre-existing
> `session` rows are inert; and the rotation residual is stated with its shared-browser shape
> (editor A's CSRF value is minted on first admin render, survives A's Access session ending, and is
> inherited by editor B signing in through the gate in the same browser, `issueCsrfToken` re-anchoring
> `Max-Age` to 30 days on every call, `csrf.ts:120-132`) and its two levers: sign out through cairn's
> own logout, and keep the Access application's session duration short.

### T5-6 (S14). No local-development story invites a dev bypass inside `resolve`

Under `wrangler dev` there is no Access in front, so the admin is unusable locally and the
predictable site fix is a flag branch inside `resolve`, invisible to both of the guard's dev-flag
refusals because it is site code the guard trusts by construction.

**Replacement text** (S14, verbatim), added to 5a's page contents:

> a warning box on local development: never branch inside `resolve`; a site's dev build replaces the
> guard entirely behind its own build-time conditional, the shape the showcase already uses
> (`examples/showcase/src/hooks.server.ts`), because a resolver that returns an identity when a flag
> is set is opaque to the guard's dev-backend refusals.

### T5-7 (S20). Five operator notes fell through into neither document

All five belong in 5a's page contents, at roughly ten lines (S20, verbatim except N1, which T5-5
carries into the security model):

> **N3:** no Cloudflare cache rule may match `/admin`; identity is in no cache key, and
> `applySecurityHeaders` (`admin-response.ts:33-47`) sets `private, no-store` which a "Cache
> Everything" rule overrides by configuration.
> **N5:** the Access application must cover `/admin` exactly, `/admin/__data.json`, and the shell's
> form-action URLs (`/admin?/logout`, `CairnAdminShell.svelte:949`), and must NOT cover
> `/preview/<token>` (`content-routes-preview.ts:96`), a deliberately public non-editor surface.
> **N8:** on an ungated origin, `/admin` becomes an unauthenticated endpoint performing an RSA verify
> per request; `resolveRateLimit` (`src/lib/cloudflare/rate-limit.ts`) is the site's own remedy.
> **Prior S11:** the Access application's own CORS settings can make `X-Cairn-CSRF` settable
> cross-origin and collapse the guard's header witness (`csrf.ts:209-211`) without touching cairn
> code; leave Access CORS disabled.

### T5-8 (C2, must-fix). The front-door sentence the plan ships is the one the charter lens asked to change

Against the shipped shape the sentence over-claims in four ways: it requires Cloudflare Zero Trust,
an Access application, and an IdP connection; it requires a `hooks.server.ts` edit and a redeploy;
authorization stays hand-maintained per person in cairn's roster; and off Access nothing works. The
shipped shape is a recipe, and the sentence reads as a switch.

**Replacement text** (C2, verbatim), for the `why-cairn.md` clause in 5b and for the hands-forward
section:

> the assumption, then "or, behind Cloudflare Access, sign in with your organization's Google or
> Microsoft accounts"

### T5-9 (C6). The two facts a target organization needs in week one are in no task's deliverable list

Spec:238-239 states the two-admission-lists fact inside **Out of scope**, which an operator will not
read as an operating instruction, and spec:32 states the 50-user cap with no reading.

**Replacement text** (C6, verbatim), added to 5a's page enumeration:

> the two admission lists, maintained by hand and able to drift (the gate says who may reach
> `/admin`, the roster says who may edit); the free-plan cap read as editors who authenticate through
> Access, not staff, and what exceeding it costs.

### T5-10 (C7). The page states its tier and does not restate the developer's own stack

`docs-register.md:270-289`: this reader "is fluent in their own stack and resents padding or
hand-holding on it"; the counterpart question asks whether the page states the contract "and its
stability tier".

**Replacement text** (C7, verbatim): add to 5a's page enumeration "the seam's stability tier stated
on the page (Unstable; promotion on the first production consumer)", and to its acceptance criteria
"no sentence explains JWTs, JWKS, or `jose` itself; Cloudflare's and jose's own docs are linked for
those."

### T5-11 (G12). `migration-notes.md` must not gain an entry

`docs/extend/migration-notes.md:1-10` defines itself as "the per-version record of what a consumer
**must do** ... distilled from `CHANGELOG.md`'s own `Consumers must:` lines ... **A version not
listed here stated no consumer action for that release.**" Task 6 says the changelog entry carries no
`Consumers must:`, so by the page's own contract this pass contributes no entry, and writing one
makes the silence rule ambiguous for every future reader.

**Change** (G12, verbatim): delete `docs/extend/migration-notes.md` from the Modify list; the Task 6
acceptance criterion changes at T6-2.

### T5-12 (H6, superseding G13). The post-freeze-note conditional is inverted on the facts

G13 found the file committed and asked to delete the conditional. **H6 is stronger** and supersedes
it: the file is committed at `d38f5f54` and present in every worktree, but the main checkout carries
an uncommitted *modification* to it, which a worktree branched from `main` will not carry, so the
implementer would edit the committed version and silently diverge.

**Replacement text** (H6, verbatim):

> …(note 4 closed by pointing here; the file is committed at `d38f5f54`. The main checkout carries an
> uncommitted modification to it: the conductor commits or stashes that before the worktree branches,
> and the task reports if the note-4 text it expects is absent).

### T5-13 (S12). Seed the first owner before enabling identity

**Replacement text** (S12, verbatim), added to 5a's page contents: "seed the first owner out of band
BEFORE enabling `identity`; `auth.bootstrapOwner` is inert once identity mode is on."

---

## Task 6: Records

### T6-1 (C3, must-fix). The ledger rows' format, and the declined row's reopen limbs

The ledger format (`engine-rulings.md:11-19`) requires `Verdict:`, `Reopens on:`, `Record:`, plus
`Any-site case:` on every keep and `Verified:` on every non-keep. Neither row is specified with a
`Record:` line, and the decline, a non-keep, is not specified with `Verified:`. Separately, the
decline cites `isuniqueviolation-cloudflare` but adopts `verifyTurnstile`'s trigger (an evidenced
production defect), so as written no amount of duplication ever reopens the export, only a breach.

**Replacement text** (C3, verbatim):

> specify both rows down to their labeled lines: `Verdict:`, `Reopens on:`, `Record:` (pointing at
> `docs/internal/record/2026-09-07-identity-seam/`), and `Verified:` on the decline. Restate the
> decline's `Reopens on:` as the union of both cited precedents: "a second consumer hand-rolling this
> verifier, an engine-internal consumer of it, **or** an evidenced defect in a family site's own
> resolver", and name both `isuniqueviolation-cloudflare` and `audit-cloudflare-verifyturnstile` as
> the precedents.

The accept row carries no `Any-site case:`; the format scopes that to audit keeps, so its absence is
correct and the task says so rather than leaving `check:rulings-format`'s scope to the implementer.

### T6-2 (G12). The migration-entry acceptance criterion

**Replacement text** (G12, verbatim): "the changelog entry present; no migration-notes entry, since
the change carries no `Consumers must:` line (`migration-notes.md:1-10`)". Cross-check against S13:
if `LoginData`'s shape change is judged consumer-visible after all, the changelog gains a
`Consumers must:` line and the migration entry comes back; the task states which way it went.

### T6-3 (G15 + H4). The friction triage is scoped, not whole-log

**Replacement text** (G15, adjusted to H4's assignment of the whole-log triage to chassis-B1):

> `docs/internal/docs-friction-log.md` (append this pass's own findings and triage only those; the
> whole-log triage belongs to chassis-B1 this window, since it rewrites a file both passes hold)

### T6-4 (H7). ROADMAP acceptance criterion names its items

**Replacement text** (H7, verbatim): "the identity-seam entry is removed from its ROADMAP tier and
the two deferred items appear under Later with their triggers."

### T6-5 (H2). Add the Interfaces block

**Replacement text** (H2, verbatim): "Consumes: every prior task's shipped surface (the changelog and
ruling rows name it)."

---

## Pass-end ritual

### RT-1 (H10). `check:package`, ritual step 8, and the memory refresh

**Replacement text** (H10, verbatim): add `check:package` to the ritual's named gates and extend the
ritual sentence:

> …the post-mortem here; both budgets scored; the next plan drafted while context is warm (brainstorm
> first) or the reason it is deferred; the `cairn-*` memory refreshed; push, PR, merge…; the pre-bake
> for the context clear.

### RT-2 (S2 + S11). The security reviewer's named inputs

**Change:** the `web-auth-security-reviewer`'s input list gains the login-methods section (T5-1) and
the security-model false-statement table (T5-5), alongside the guard branch, the conditions, the
routes, and the recipe as shipped. Per T5-2 the reviewer's read of the recipe is also a blocking
acceptance criterion on Task 5a, not only a pass-end item.

### RT-3 (S23.2). DISMISSED: a unit test minting a local JWKS against the recipe

S23 proposes a unit test that mints a local JWKS and asserts the recipe's verifier refuses
`alg: none`, an HS256 confusion attempt, a wrong `aud`, a wrong `iss`, an expired token, and a token
with no `email`, on the stated ground that "`jose` is already available in the integration project".

**Dismissed, on a factual correction.** `jose` appears nowhere in `package.json` or
`package-lock.json` (verified by grep); it is not a dependency, a devDependency, or a transitive one.
The test therefore requires installing `jose`, which re-adds the dependency ruled input 1 deliberately
removed, owes a `check:target-stack` row, and makes the engine carry a test for code that decision 5
places in the developer's domain. The assurance gap the proposal identifies is real and is handled
instead by T5-2 (the reviewer's read raised to a blocking Task 5a criterion) and HF-3 (the lower
assurance recorded on the declined ledger row). Reopen if `jose` ever becomes a real dependency.

S23's other half is folded: T1-5 and T4-1 give the `logoutUrl` validator and the probe classifier
their own enumerated acceptance tables rather than leaving them to a pass-end read of a seven-task
diff.

---

## What this pass hands forward

### HF-1 (C2). The front-door sentence

**Replacement text**: the hands-forward bullet reads "the front-door sentence may now say 'or, behind
Cloudflare Access, sign in with your organization's Google or Microsoft accounts', with the
assumption stated first."

### HF-2 (C3). The reopen trigger

**Change:** the Later bullet's trigger matches T6-1's union: "an engine-shipped Access verifier,
reopening on a second consumer hand-rolling this verifier, an engine-internal consumer of it, or an
evidenced defect in a family site's own resolver."

### HF-3 (C1). The recipe's assurance limit is recorded, not left implicit

**Change:** add a hands-forward bullet: "the recipe is the first security-critical recipe in the
extend track and is not machine-verified below its cairn-facing shape; the declined ledger row
carries that as the accepted assurance level, and a future engine verifier would replace it with a
tested artifact."

---

# Part 2. Spec amendments (exact replacement text)

The spec is revision 2; these land as revision 3 or as a dated erratum block. Each is a statement the
reviews found false, stale, or missing.

### SP-1. The login-methods section (S2), new subsection under "The extend page and the Access recipe"

> **Which login methods are safe.** The email claim is the entire join between the gate and the
> roster, so the Access application must enable only methods that prove control of the address they
> assert (a Workspace or Entra directory, or Access's own One-time PIN). Enabling a second method
> widens the floor to the weakest one, since every enabled method's token carries the same `aud` and
> verifies identically here. Never enable a social IdP or a generic OIDC connection whose `email`
> claim the end user can edit on an application that gates a cairn admin. cairn cannot distinguish a
> directory-asserted address from a self-asserted one.

### SP-2. `confirmLoad` (S3, G9), replacing the handler list at spec:144-152

> - `loginLoad` renders a one-paragraph hand-off page ("This site signs in through <label>") with a
>   link to `/admin`, carrying a `data-cairn-identity` marker the doctor reads, minting no
>   pending-login nonce and issuing no CSRF token.
> - `requestAction`, `confirmAction`, and `confirmLoad` return 404, so `/admin/auth/**` serves
>   nothing and the hand-off page at `/admin/login` is the only public admin surface; the 404 is
>   raised before `requireDb`, before `request.formData()`, and before any cookie write, so a stray
>   link cannot mint a token and the confirm page cannot reflect a `?token=` value into an
>   admin-origin document.
> - `logoutAction` skips the session delete (there is none), clears cairn's own cookies if present,
>   and redirects to the `logoutUrl` snapshot the guard validated at construction.

### SP-3. The front-door sentence (C2), replacing spec:208-209

> `docs/why-cairn.md`'s identity paragraph (the assumption first, then "or, behind Cloudflare Access,
> sign in with your organization's Google or Microsoft accounts", which names the mechanism, keeps
> the benefit, and cannot be misread as a directory sync)

### SP-4. Condition ids and event names (C5, H11), replacing spec:120-128's ids

> the registered condition `auth.identity-unresolved` … the registered condition
> `auth.identity-unknown`, whose log event is `auth.identity.unknown` (the pair reads across, as
> `auth.unknown-role` / `auth.role.unknown` does)

### SP-5. The refusal vocabulary is snake_case (C5), replacing `'no-email'` at spec:93 and spec:187-188

> `'missing'`, `'invalid'`, `'audience'`, `'issuer'`, `'expired'`, `'no_email'`, `'keys'`, or a
> site's own word; every `reason` value is snake_case, the rule `src/lib/log/events.ts:5-7` states.

### SP-6. The resolver's event type (S17), replacing spec:78

> `resolve(event: CairnEvent): Promise<ResolvedIdentity | IdentityRefusal>;`

with the interface comment gaining: "the structural event type every engine seam takes, so the engine
stays free of a site's `App.*` ambient types (`guard.ts:1-3`); this seam takes the full event because
it must read request headers, where `lookup`/`verify` take a narrow `{ env }` context."

### SP-7. `displayName` precedence (S10), replacing spec:88-89

> `displayName?: string; // advisory only: the roster row's display name wins, and this is used only
> when the roster row's is empty, capped at the store's bound. It reaches the commit author, so it is
> never trusted over the roster.`

### SP-8. The guard's own defenses (G7, S7), added to spec's "What the guard does under `identity`", item 3

> The guard does not trust the seam it calls. `identity.resolve` runs inside a try/catch: a throw is a
> refusal rendering `auth.identity-unresolved` and logging `guard.rejected` with `reason: 'identity'`
> and `detail: 'error'` plus the thrown message capped at 300 characters, never a 500. A
> `ResolvedIdentity` whose `email` is not a string, or is empty after normalization, is a refusal, not
> a roster lookup.

### SP-9. `logoutUrl` validation (S4), replacing the validation clause at spec:150-152

> `logoutUrl` is validated at guard construction: a root-relative path matching `/^\/(?![\\/])/` after
> rejecting any value containing a backslash, a control character, or whitespace, or an absolute URL
> whose parsed `protocol` is exactly `https:`. Anything else throws at `createAuthGuard`. The guard
> publishes the validated snapshot on `locals.cairnIdentity`, and the routes redirect to that
> snapshot, never re-reading `identity.logoutUrl` per request, which closes both the open-redirect and
> the post-construction-mutation readings.

### SP-10. Where `locals.cairnIdentity` is set (G1, S1, H1), added to spec item 3's last bullet

> In every case the guard also sets `locals.cairnIdentity = { label, logoutUrl }`, and it does so for
> every admin path, the public ones (`/admin/login`, `/admin/auth/**`) included, immediately after the
> bindings refusal and before the CSRF stage, since the magic-link handlers live only on public paths.
> `identity.resolve` is called only on guarded paths. The guard is the only writer of the field.

### SP-11. The snippet gate's real reach (C1, G6, H3), replacing "typechecked by `check:snippets`
against the built package" at spec:47-48 and spec:178

> checked by `check:snippets` for its cairn-facing shape only: `jose` is not a dependency, so
> `check-snippets.mjs` rewrites its imports to untyped stand-ins and the verification logic itself is
> proven by the `web-auth-security-reviewer`'s read, not by a gate. The declined ledger row records
> that assurance level.

### SP-12. The doctor's arms (S5, S6, G5), replacing spec:156-163

> `admin.login-probe` fetches with `redirect: 'manual'`, since the runtime otherwise follows the
> gate's 302 and the classifier never sees it. A 301/302/303/307 whose `Location` parses and whose
> `host` matches `/^[a-z0-9-]+\.cloudflareaccess\.com$/i` is PASS with the identity label. A 401 or
> 403 is INFO, consistent with a gate but not proof of one. A 200 carrying the `data-cairn-identity`
> marker, or a 200 carrying no `?/request` form, is FAIL, "the origin answers without the gate". A 200
> with the form is the magic-link PASS as today. A second arm reads `workers_dev` from the wrangler
> config and, when it is not `false`, probes the `workers.dev` hostname's `/admin` the same way,
> failing on a 200: the exposure this design exists to close is a Worker reachable on a hostname the
> Access application does not cover.

### SP-13. `bootstrapOwner` under identity (S12), added to spec's decision 6

> `AuthRoutesConfig.bootstrapOwner` is inert under identity mode, since its only call site is the
> 404'd `requestAction`; the first owner must be seeded before `identity` is enabled.

### SP-14. Migration notes (G12), replacing spec:214's clause

> `CHANGELOG.md` under `## Unreleased`: new surface, additive, no `Consumers must:` line, and
> therefore no `docs/extend/migration-notes.md` entry, since that page records only releases that
> stated consumer action.

### SP-15. The two admission lists and the user cap (C6), moved out of "Out of scope" into the extend-page section

> The page states, as an operating instruction rather than a scope note, that admission is
> double-maintained by design and can drift: the gate says who may reach `/admin`, the roster says who
> may edit. It reads the free plan's 50-user cap as editors who authenticate through Access, not
> staff, and names what exceeding it costs.

### SP-16. The security model's scope (S11), replacing the `security-model.md` clause at spec:204-207

> `docs/extend/security-model.md`: an "Identity from a gate" section under the session material, and a
> sweep in which every statement the spec review's table lists is either corrected or explicitly
> scoped to the built-in magic-link path. The section names the replaced piece, the rotation residual
> with its shared-browser shape, the doctor arm, the never-reads-the-session-cookie property, and the
> fact that the effective admin session lifetime under identity is the Access application's
> operator-set session duration.

---

# Part 3. Conflicts between lenses, adjudicated

1. **Where the `locals.cairnIdentity` write lives (H1: Task 1; S1: Task 2b; G1: unspecified task,
   "outside the block").** Resolved in favor of **H1's task home with S1's anchor**. The plan's Task 1
   already assigns the write ("no branch behavior yet beyond setting `locals.cairnIdentity` when the
   option is present"), so keeping it there avoids a second `guard.ts` edit and gives Task 1 a
   behavioral test; S1's anchor (after the bindings refusal, before the CSRF stage) is more precise
   than G1's relational "outside the block at `:175`" and additionally makes the field present on a
   CSRF rejection. G1's rejection of the alternative (resolving on public paths) is adopted as the
   reasoning.

2. **401/403 on the probe (G5: PASS as planned; S5: demote to INFO).** Resolved for **S5**. A WAF
   block, a Cloudflare error page, and a broken deploy all produce 401/403, so PASS would report a
   gate that does not exist, on a check whose entire purpose is detecting an ungated origin. The
   demotion is implementable today: `info()` exists (`src/lib/doctor/types.ts:53`) and never gates,
   so a genuinely gated site that answers 401 does not fail the run.

3. **The unrecognized 200 (G5: a fourth outcome; S5: folded into FAIL).** Resolved for **S5**. On a
   probe whose failure mode is "the origin answers without the gate", an unrecognized page on
   `/admin` is the exposure, not a diagnostic puzzle; fail-closed is the house posture. G5's wording
   ("the origin answered a page this probe does not recognize") is kept as the FAIL detail when the
   marker is absent, since it is more accurate than the marker-present message.

4. **The post-freeze notes file (G13: the conditional is dead weight, the file is committed; H6: the
   conditional is inverted, a local modification exists).** Resolved for **H6**, which is a superset:
   both agree the file is committed, and only H6 catches the uncommitted local modification in the
   main checkout that a fresh worktree will not carry. H6's rewrite also assigns the conductor a
   concrete pre-branch action.

5. **The friction log (G15: triage only this pass's entries; H4: the whole-log triage belongs to
   chassis-B1).** Resolved for **H4**, which supplies the missing half: G15 correctly narrows this
   pass's scope but leaves the whole-log triage unassigned, and H4 assigns it, which is what makes
   the narrowing safe rather than a deferral.

6. **The snippet gate's honest AC (G6, H3, C1, three near-identical rewrites).** Resolved for **C1's**
   version, which alone converts the finding into an action: it raises the security reviewer's read of
   the recipe from a pass-end fan-out item into a blocking Task 5a acceptance criterion. G6's and H3's
   stop at correcting the claim, which leaves the assurance gap open.

7. **Sizing (H5: split Task 5 or at minimum move the fat-task flag; G16: no split, record the
   override).** Not a real conflict once separated: G16 addresses whether the **two doors** should
   leave the pass (they stay, with the bound and an explicit override record), H5 addresses whether
   **Task 5** is one dispatch (it is not). Both fold. See Part 4.

8. **Condition naming (plan: `auth.identity-unrostered`; C5: align the condition to the event;
   G3/H11: keep the plan's spelling).** Resolved for **C5**. G3 and H11 were arguing the plan against
   the *spec*'s unprefixed ids and are satisfied by any area-prefixed pair; C5 is the only lens that
   examined the condition against its own log event, and the family's existing pair
   (`auth.unknown-role` / `auth.role.unknown`) reads across. Renaming the condition rather than the
   event is correct because the event name is the public-observable contract.

9. **`S23.2`'s recipe unit test versus ruled input 1 (no `jose` in the engine).** Resolved against
   S23.2 on a factual correction: `jose` is not installed at all, so the test is not the cheap
   addition the finding assumed. See RT-3.

No lens contradicted another on a fact. Every disagreement above is a judgment call or a scope
boundary.

---

# Part 4. Sizing

**Recommendation: split Task 5 into 5a and 5b, giving SEVEN tasks, with the ceiling raised to 5.5M.**

Why not hold at six. Task 5 was already the pass's largest deliverable before this fold (a 220-300
line new page, five modified docs, a conditional record edit, a prose-reviewer round, four gates, one
step, no Interfaces block). The fold adds seven required sections to the page (the login-methods
floor, the `keys`/bounds rewrite, the `type: 'app'` and teamDomain trap, the local-dev warning, four
operator notes, the two-lists and cap reading, the tier statement) and turns the `security-model.md`
edit from three sentences into a twelve-statement sweep. That is two deliverables wearing one task
number, and the natural seam is clean: 5a is authored prose gated by `check:snippets`, `check:vale`,
`check:prose`, and a prose reviewer; 5b is edits to existing pages gated by `check:docs` and
`check:arm-indexes`. Splitting also gives 5b a real `Consumes` (5a's page, which every inbound edit
links), which the current single task cannot have.

Why this is a task split and not a pass split. The sizing rule warns that splitting tasks instead of
the pass keeps work inside the pass and only feels like discipline. That warning is answered here
rather than ignored: the one candidate for *leaving* is the two doors, the spec review's own proposal,
and Geoff's routing keeps them under a one-section bound, now recorded as a deliberate override
(R-11). Nothing else in the pass is separable, because Tasks 1 through 4 are one seam and Tasks 5 and
6 document and record it. Seven tasks is the shape of the work, not accretion.

The ceiling. The plan's 4.5M covered six tasks and reserved nothing for a ritual that carries a
code-simplifier over the whole diff, three reviewers with fix rounds, nine named gates, and a
from-scratch showcase install plus build plus e2e. At chassis-A's observed 0.3M-0.6M per task, seven
tasks with the fold's additions land near 3.6M; the ritual wants about 1.0M. **5.5M** with checkpoints
after Tasks 3 and 6, both mid-course. The plan's current checkpoint at Task 6 of 6 recorded a finished
pass and bought no control.

Also drop the unexecutable 2a/2b split language (one task is one implementer dispatch) and move the
">0.7M" flag from Task 2 to Task 5a.

---

# Part 5. Verified sound across the lenses

Recorded so no later reader re-checks these.

- **`guard.ts:175-195`** is the exact session-resolution block, and the five bundled pieces the spec
  names are where it says. The design's "replaces exactly one of five" claim survives (F3).
- **The ordering against the dev-backend and bindings refusals** is correct: the 503 at `:92-98` and
  `config.bindings-missing` at `:126-133` both precede any identity work, so a missing `AUTH_DB` or a
  polluted dev flag fails closed before the seam runs (S18).
- **404 is the right shape** for the shut-down actions, better than 405 or 410, and leaks no new
  signal, since the hand-off page already names the gate (S19).
- **`docs/admin/is-it-working.md` is the right anchor home**, `check-readiness.mjs` hard-codes it, its
  headings are `##`-level, and the gate is fail-closed both ways.
- **The condition entry shape and `check:symbols`'s third registry** work exactly as the plan assumes,
  which is what makes the conditions-and-events-before-docs ordering necessary and correct.
- **`auth-routes.ts:403-434`** matches the plan's `logoutAction` anchor, "`requireDb` stays" is
  correct, and the four cookie deletes at `:411-419` already do the clearing half unchanged.
- **`checks-cloudflare.ts:197`** is close enough to find in one look; the `auth.store` owner-row
  failure names no remedy today, so the plan's remedy string is a real one-string deliverable.
- **Every gate script the plan names exists**, `check:prose` really does cover the hand-off copy
  (`check-admin-prose.mjs:22` scans `src/lib/components/*.svelte`), `check:arm-indexes` is satisfied by
  the planned README edit, and `check:snippets` covers `docs/extend`.
- **The downstream `Editor` contract reproduces cleanly**: `resolveCapability` returns `'none'` on an
  unknown name, the unknown-role warning is reusable as is, and `locals.cairnAccess = access ?? {}` is
  the shape to repeat.
- **The integration filename convention fits**, and moving the routes' cases from unit to integration
  is the better call, since `logoutAction` needs `requireDb` and a real `AUTH_DB`.
- **The token estimate's line counts hold** (about 375-530 engine lines, about 420-560 docs lines);
  the "about 24 tests" figure includes 10 `jose` cases this pass does not carry, so it has headroom.
- **The chassis-B1 non-contention claim holds for source**: no engine file this pass touches is a
  chassis-surface file. Only the shared docs overlap (H-1).
- **The plan's anchors were verifiable at authoring time** (`git diff de2bf1cb..HEAD` over `guard.ts`,
  `auth-routes.ts`, `check-probe.ts` is empty), so the anchor errors are authoring slips and
  re-verifying at dispatch will not surface them.
- **No task adds surface beyond the spec** (C8, checked task by task), with the single exception of
  the `data-cairn-identity` marker, folded at T3-7.
- **The tier assignments are right**: the three interfaces at Unstable by the tier's own last clause,
  `createAuthGuard` holding Scaffold for the factory. Only the member's tier note was missing (C4).
- **`IdentityResolver`, `ResolvedIdentity`, `IdentityRefusal`, `cairnIdentity`, and `identity`** are
  all nouns on non-function surface, so `convention-bare-noun-functions` does not bite, and
  `cairnIdentity` matches `cairnEditor`/`cairnAccess`.
- **`auth.identity-unresolved` fits the condition grammar exactly**, and `auth.identity.unknown` is
  the exact shape of the existing `auth.role.unknown` and `auth.access.denied`.
- **Documenting the developer's domain is what the extend track is for**, so sixty lines of site code
  on an extend page is not itself a charter violation; the charter puts the Access verifier in the
  developer's domain (C7).
