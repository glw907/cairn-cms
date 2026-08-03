# C2: the breaking-window pass

> **For agentic workers:** REQUIRED SUB-SKILL: execute with `cairn-pass` + per-task
> `cairn-implementer` dispatches from a fresh Opus 5 session, on a worktree off `main`.
> This plan is the adjudication record AND the execution plan. The agenda spec
> (`docs/superpowers/specs/2026-08-02-c2-breaking-window-agenda.md`) is now historical input;
> every ruling lives here.

**Status: APPROVED 2026-08-02 (Geoff), the Task-12 contingency split PRE-APPROVED.** Execution
may cut at Task 12 into pass C2b without a further ask; see the pass-size ruling below.

**Goal:** spend the last cheap breaking window in one deliberate reshape that leaves the public
surface uniform, honest, and derivable, then hold unpublished.

**Approach:** eleven adjudicated rulings (R1 through R11, one per agenda item, plus RN for the
new findings) execute as fourteen tasks on one worktree. Every rename follows one stated grammar;
every type named in a public signature becomes importable; the event and env shapes collapse to
one apiece; the refusal channel converges on SvelteKit's native affordances with a bounded code
vocabulary. The showcase migrates in the same diff and is the proof the migration list is
complete.

**Design bar (Geoff, 2026-08-02):** a truly beautiful API surface. Do not preserve anything for a
current site's convenience; the sites migrate. Every ruling is judged for two audiences at once:
a human developer reading the reference, and an AI coding agent that must be able to *derive* a
name from the rule rather than look it up. Uniformity, greppability, and typed feedback beat
familiarity.

## Global constraints

- One worktree off `main`; one PR; one `CHANGELOG.md` window entry under `## Unreleased` whose
  `Consumers must:` list is assembled incrementally by every task that breaks something. No
  version bump, no publish at close.
- Worktree gotchas apply: `npm install` in `examples/showcase` before trusting a worktree e2e;
  edits target the worktree path.
- Per-task gate: targeted tests + `npm run check` 0/0 + `npm test` exit 0. Any task that touches
  an export or a doc block additionally runs `npm run check:snippets`, `npm run check:reference`,
  `npm run check:reference:signatures`, and `npm run check:package` by name. `npm run
  check:surface -- --update` regenerates `docs/internal/api-surface.md` whenever the surface
  changes, and the regenerated snapshot is committed with the change.
- `check:reference:signatures` reads only fenced `ts` blocks; every renamed export keeps its
  fenced block as the gated form.
- Docs are a pass dimension: a task that renames or removes an export updates its reference page
  in the same task, not in a sweep at the end. Task 14 carries only corrections that belong to no
  earlier task.
- The standing TS constraint holds: `Env extends AuthEnv`-style constraints do not compile
  against all-optional env types (TS2559); generics stay unconstrained with defaults.
- Comment and prose standards: TSDoc via `ts-conventions`/`svelte-conventions`, Google register
  on published docs pages, no em dash in code comments.

## Pass-size ruling and the contingency cut

This is the largest pass of the series; the agenda mandated one pass, one diff, and that mandate
predates the audit sweep's widening of the evidence. The plan honors it, AND names the cut point
now rather than after two task splits force it: **if the pass bursts, Task 12 (the
refusal-channel convergence, ruling R10) becomes pass C2b** on its own worktree immediately
after C2 merges. Both passes sit in the same unpublished window and the `Consumers must:` list
is assembled across both at the cut, so the consumer still absorbs one batch.
**The split is PRE-APPROVED (Geoff, 2026-08-02): execution exercises it on its own judgment if
the pass bursts, with no further ask.** Task 12 is the one behavioral
(not naming/typing) task, it has its own review gate (`web-auth-security-reviewer` plus a visual
read of the admin's failure rendering), and everything before it is mechanically verifiable by
the type gates.

### The cut is TAKEN (Geoff, 2026-08-02, mid-execution)

Execution proposed the cut after Task 4 and Geoff took it, so this is no longer a contingency:

- **C2 carries Tasks 1-11, 13, and 14.**
- **C2b carries Task 12** (the refusal channel, R10) on its own worktree off `main`, immediately
  after C2 merges, in the same unpublished window.
- Task 14 assembles C2's `Consumers must:` list for Tasks 1-11 and 13; C2b appends its own at its
  close, so the window still presents the consumer one combined batch.

The evidence behind the call was not a task split (there were none) but the cost trajectory and
the accretion rate: Tasks 1-4, the mechanically-verifiable ones, cost roughly 1.4M subagent
tokens, and every remaining heavyweight (8, 9, 11, 12, 14) sits in the back half. Two pieces of
discovered work were absorbed at dispatch time in those four tasks (removing `CairnRolesRegister`
once `Role`'s deletion orphaned it, and repairing `examples/showcase/e2e/access-map.spec.ts`,
which sits outside `tsconfig.json`'s include so no gate sees it). Both were routed to the task
that already owned the file rather than becoming tasks of their own.

An earlier cut was considered and rejected: Tasks 5 through 11 are one coherent grammar sweep,
and splitting inside them would leave the public surface half-renamed across two merges, which
costs a consumer more than either whole.

### Discovered during execution, routed (not absorbed)

**`requireAccess`'s target derivation still defaults to `event.url.pathname` (routed to C2b).**
Task 10 moved `createSectionAction`'s `target` default to `event.route.id` on R9's grounds, that a
catch-all route's pathname is attacker-chosen and its route id is not. `guard.ts`'s `requireAccess`,
the load-side counterpart, still defaults to the pathname, so the two halves of one authorization
story now disagree. The escalation shape is real: on a catch-all route a crafted pathname can match
a permissive access rule the route's own id would not. This pass does not make anything worse (both
halves read the pathname on `main` today) and Task 10's scope was written against
`SectionActionConfig` alone, so C2 ships the asymmetry rather than widening a task in flight. **C2b
takes it**, where `web-auth-security-reviewer` already gates the diff, and closes it with the same
fail-closed constant Task 10 introduced.

**`docs/guides/upgrade-cairn.md`'s `## Unreleased` heading is labelled `(non-breaking)`
(Task 14 fixes it).** Every task in this pass has filed breaking `Consumers must:` entries beneath
that heading. Relabelling it is a pass-level call, not a task-level one, which is why Task 10
flagged it instead of retitling it; Task 14 owns the correction batch and carries it.

---

## The rulings

Silence is not a decision; every in-window item and every confirmed finding is disposed of here.
"Ride-in" marks a non-breaking fix that travels with the window because the same files are open.

### R1 — the rename set (item 1)

**The grammar, ratified.** One derivation rule for every route-factory member and facade action
key:

- A member that is a SvelteKit `load` ends in `Load`. A member that is a form action ends in
  `Action`. No third suffix exists.
- A facade `actions` key is its member name minus the `Action` suffix (kind is positional there).
- A surface-scoped name leads with its surface noun (`settings`, `vocabulary`, `nav`, `media`,
  `dictionary`, `editor`), then the verb phrase: `settingsSaveAction`, `mediaOrphanPurgeAction`,
  `editorAddAction`. Entry-lifecycle verbs on the current entry stay bare: `create`, `save`,
  `publish`, `discard`, `rename`, `delete`, `upload`, `tidy`, `publishAll`.
- Factory verbs, ratified as a four-verb system: `define*` declares (identity + validation),
  `compose*` assembles the runtime, `create*` instantiates live route/handler bundles, `build*`
  derives pure data. `make` is retired.
- Parameter bags: `*Config` is the factory's primary bag; `*Options` is a secondary or per-call
  bag; `*Deps` is retired. Every exported factory's bag has a name (no anonymous inline bags).
- Every `create*` factory's return type is named and exported.
- Preview-payload types end in `Plan`; applied-outcome types end in `Result` (ratified as
  already practiced).

**Role names are open; capabilities are closed.** Everywhere a role *name* is typed as the
default `"owner" | "editor"` union it becomes `string` (custom roles are first-class;
the literal union is a type lie the moment a site declares `webmaster`). `Capability` stays the
closed `"owner" | "editor" | "none"`. The `Role` export (root and `/auth-store`) is removed; it
named the lie.

**Dispositions of the six findings:**
- Three suffix-dropping mutation members: renamed (table below). Confirmed.
- `*Deps`/`*Config` on no principle: ruled above; renames in the table. Confirmed.
- `makeMediaResolver`: renamed `buildMediaResolver`; the four-verb system is the recorded rule.
- `hidden?: true`: widened to `hidden?: boolean` (computed flags are legitimate; the runtime
  already treats falsy as visible). The organize-your-admin-nav guide's "retire a door for good"
  framing is prose, not a contract; it survives widening. Ride-in.
- `MakeIcon`: the public re-export on `/render` is removed (zero consumers, one broken doc row);
  the type stays internal. The `docs/reference/core.md:1006` row is deleted.
- `ConceptUrlPolicy`: removed from the root barrel with its three co-edits
  (`root-barrel-prune.test.ts`, `api-surface.md`, `core.md`). The 2026-07-01 bare `KEEP` had no
  recorded defense; this is the challenge it never got.
- Fixed-screens doc drift (`nav` omitted): both pages corrected to the four-screen set. Ride-in.

### R2 — the `locals` namespace (item 2)

Engine keys take the `cairn` prefix, flat, with **no aliases** (the beauty mandate overrides the
agenda's filed alias shape): `locals.cairnEditor`, `locals.cairnBackend`,
`locals.cairnAuditSink`, `locals.cairnAccess` (already conforming). Flat prefixed keys beat a
nested `locals.cairn.{}` namespace: one optional hop instead of two, and `grep cairnEditor`
finds every engine read in any repo. The `/ambient` reference page is rewritten from
`src/lib/ambient.ts` (which fixes the confirmed `cairnAccess` omission in passing); a gate that
diffs the ambient block against the source is filed to phase P, not this diff.

### R3 — subpath taxonomy (item 3)

- **Every barrel gets a charter line** in the `/cloudflare` form: a stated membership rule in the
  barrel header and the reference page opening. Fifteen subpaths after the merge below;
  `/delivery/data`'s charter states it plainly ("the server-safe data half of `/delivery`;
  everything here imports no Svelte").
- **`/admin-fields` merges into `/admin-toolkit`** and the `/admin-fields` subpath is deleted.
  Two subpaths stating one charter ("primitives for a site building its own admin screens") is
  one subpath. The merged charter carries both component tiers explicitly.
- **`OfficeList` moves to `/admin-toolkit`** (its own header states the toolkit's charter).
  `PageHeader` and `OfficeList` both stay: they are different shapes (header primitive vs
  full list-screen scaffold), and the charter line states each one's role. The ROADMAP
  spacing-convergence entry stays filed (visual work, needs the visual gate, not this window).
- **Component/descriptor collision resolved:** the merged toolkit's form components rename
  `TextField` → `TextInput`, `SelectField` → `SelectInput`, `SelectFieldOption` →
  `SelectInputOption` (`FieldLabel` unchanged). R4's export rule makes the root's 13 field
  *descriptor* arms (`TextField`, `SelectField`, …) importable, and two subpaths exporting
  different things under one name is exactly the agent trap this pass exists to remove. Inputs
  wrap `<input>`/`<select>`; the name is honest.
- **`/components` completes the per-view seam:** `VocabularyAdmin` and `WelcomeView` join the
  barrel (the documented seam is real; membership follows the rule "every view `CairnAdmin` can
  render is individually mountable", stated in the charter line).
- **`/sveltekit` is chartered, not split:** "everything a SvelteKit site wires into its routes:
  factories, wrappers, guards, and the data types they exchange." Broad, but a rule.
- **P5 (media-library split) is constrained additive:** media components stay in `/components`,
  media data stays in `/media`; the split may not move exports. Recorded here so the window can
  close without it.
- `tokensMatch`'s fourth caller precondition (lone-surrogate collapse) lands on
  `docs/reference/auth-crypto.md`. Ride-in.

### R4 — the event shapes and the export rule (item 4)

**One event type.** `CairnEvent<Env = CairnEnv>` replaces `RequestContext`, `ContentEvent`,
`AdminEvent`, `AdminActionEvent`, `EventBase`, and the anonymous inline event shapes on
`healthLoad`, `requireAccess`, `requireSession`, `requireOwner`, and `requireEditor`. Structural
doctrine unchanged: any kit server event satisfies it. Members: `url`, `request`,
`params: Record<string, string>`, `route: { id: string }`, `cookies: CookieJar`,
`setHeaders`, `locals` (the four optional `cairn*` keys), `platform?: PlatformContext<Env>`.
Adding `params` and `route` ends the documented anti-idiom of reading route identity out of the
form body, and gives `SectionActionOptions.target` an honest derivation (R9). The
`createMediaRoute` → kit `RequestHandler` exception stays ratified as-is (its header comment is
the recorded reasoning). Three names for one shape was the defect; four was worse; one is the
answer.

**The export rule, adopted as doctrine:** *every type named in a public signature is exported
from a subpath the consumer already imports.* The 40 confirmed shape-only leaks (`UsageEntry`,
`InboundLink`, `TidyConfig`, `TidyConventions`, `MediaLibraryEntry`, `LinkTarget`,
`FragmentTarget`, `ResolvedPreview`, `TidyClient`, `TidyKeyProbeResult`, `CookieSetOptions`,
`PlatformContext`, the 13 field-descriptor arms, the 7 facade result types, and the remainder
enumerated by re-running the sweep's cross-reference) become named exports with one-line docs
(the repo's existing calibration for self-evident exports). Recurring anonymous inline shapes
get names: `LoginData`, `ConfirmData`, `EditorsData`. A mechanical gate for the rule is filed to
phase P; this pass makes it true, P keeps it true.

### R5 — the env story (item 5)

**Structural acceptance, no factory generics.** The route factories do not go generic over
`Env`; instead cairn's binding types accept the platform's own structurally:

- `AuthEnv` and `BackendEnv` collapse into one all-optional **`CairnEnv`** (`AUTH_DB`,
  `PUBLIC_ORIGIN`, `CAIRN_DEV_BACKEND`, `EMAIL`, `GITHUB_APP_PRIVATE_KEY_B64`). The split's
  purpose (typing which routes need what) died when `AdminEvent` pinned both; per-factory
  binding needs are reference-page prose. One env type is one fewer thing for either audience to
  hold.
- **`EmailSender`** is named once (`{ send(message: MagicLinkMessage): Promise<unknown> }`) and
  referenced from `CairnEnv` and `CairnPlatformBindings`; `Promise<unknown>` structurally
  accepts `@cloudflare/workers-types`' `Promise<EmailSendResult>`.
- **The proof is the tripwire:** `src/tests/unit/env-genericity.test.ts`'s `BareWranglerSiteEnv`
  `@ts-expect-error` must fail on TS2578 and be removed. If it does not fail, the ruling is
  wrong and execution stops for re-adjudication rather than shipping a cast.
- The `section-action.ts` bridge casts are removed once the tripwire proves dissolution.
- `CairnPlatformBindings` demotes from *required* (C1's ruling, reversed with cause) to a
  recommended convenience preset; the C1 changelog line is amended in the window entry.
- `BackendProvider.connect`, `SendMagicLink`, and `healthLoad` re-state against `CairnEnv`.
- `createSectionAction<Env, Db>` keeps its existing genericity (unconstrained, defaulted).

### R6 — the log-event vocabulary (item 6)

**The grammar, ratified:** `area[.subject].verb_phrase`; past-tense verb phrase for an
occurrence, state adjective for a detected condition; every `reason`/`scope` *value* is
snake_case; every literal a row's fields can carry is listed in backticks in
`docs/reference/log-events.md` (prose enumerations are how the two confirmed field-drift rows
happened).

Renames (six), each self-distinguishing after the change:
- `admin.audit.sink_failed` → **`audit.sink.write_failed`** (the packaged D1 sink could not
  persist; it is engine infrastructure, not the action layer).
- `admin.action.audit_sink_failed` → **`admin.action.sink_threw`** (a site-supplied sink threw
  at the engine's call site).
- `tidy.done` → **`tidy.succeeded`**; `tidy.error` → **`tidy.failed`** (the `commit.*` pattern).
- `media.orphan_reconcile` → **`media.orphans_reconciled`** (matches `media.orphans_purged`).
- `content.field_behavior_error` → **`content.field_behavior_failed`**.

Kept with a recorded ruling: `guard.rejected` `reason: 'csrf'` beside
`admin.action.csrf_rejected` stays; they are different layers (pre-resolve guard vs wrapper
defense-in-depth), the reference already cross-documents them, and collapsing them would lose
the layering signal.

Value-casing unification (wire-contract change, in-window): the media `reason` family goes
snake_case (`media_disabled`, `length_required`, `too_large`, `session_expired`,
`access_denied`, `unsupported_type`, `binding_missing`, `hash_collision`), which reaches
`REFUSE_TO_FAILURE` and the client components in the same diff; `github.unreachable`'s scopes
become `shell`, `help`, `publish_advisories` and the doc row lists all three (the documented
`layout` never fires).

`config.invalid` gains `scope` (`nav` | `settings` | `vocabulary`) so its three emit sites and
four call paths stop sharing one indistinguishable row (`github.unreachable`'s `scope` is the
in-table precedent); its doc row is split accordingly, including the degrade-vs-redirect
difference. `media.uploaded`'s row corrects to the emitted fields (`editor`, `hash`, `bytes`,
`contentType`, `reused`; `ext` was never written). A gate on the field/value columns is filed to
phase P.

### R7 — the deprecated-alias sweep (item 7)

- **`PlatformContext` narrows to `{ env?: Env }`.** The engine reads neither `ctx` nor
  `context` (confirmed: every read goes through `platform?.env`); both fields are removed, the
  auth-harness negative test updates, and the two doc snippets that read `platform.ctx` off the
  *site's own* `App.Platform` are untouched (they never depended on cairn's declaration). This
  supersedes the agenda's alias-only framing: the whole pair was dead, not just the alias.
  Closes 2026-06-28 audit item D4.
- **`adminNav` retires entirely.** `navLayout` is the one nav seam. The behavioral objection
  (additive vs whole-tree) is already answered by `navLayout`'s own fallback: an engine ref a
  layout omits lands in the trailing fallback group, so a site adding one link declares one
  entry and the engine screens follow. Removed: `CairnAdapter.editor.adminNav`,
  `CairnRuntime.adminNav`, `AdminNavConfig`, `AdminNavSection`, `normalizeAdminNav`,
  `filterNavByRole`, `ResolvedNavItem`, `ResolvedNavSection`,
  `ResolveNavLayoutOptions.adminNav`, and `validateNavLayout`'s `hasAdminNav` ctx member.
  `AdminNavEntry`'s members fold into `NavLayoutEntry` (which stops extending it);
  `AdminNavIcon` renames to `NavIcon`. ROADMAP's 1.0 seam list replaces "the data-only
  `adminNav`" with "the `navLayout` seam" — the confirmed contradiction resolves in
  `navLayout`'s favor because the code, the type supersets, and nine legacy annotations already
  voted.

### R8 — `AdminActionError`'s residual identity (item 8)

Renamed **`UnauditedActionError`** — the candidate honest name in the obvious form. After
convergence it means exactly one thing (the dev-only unaudited-action defect signal) and the
old name described a channel that no longer exists. The declined `isAdminActionError` stays
declined (nothing changed the reasoning; a dev-only throw needs no runtime guard export).
The confirmed authentication/authorization wording drift is fixed as a terminology sweep:
`adminAction` and `requireSession` *authenticate*; `requireAccess`, `requireOwner`, and
`createSectionAction`'s branches *authorize*. Four `sveltekit.md` sites, the upgrade-guide
section, and the `:241` grouping all restate against that line.

### R9 — `SectionActionConfig` (item 9)

- **`resolveDb`'s shape is ratified unchanged:** `(env: Env | undefined) => Db | undefined`.
  The engine cannot conjure an absent platform; an honest `undefined` parameter beats a callback
  that hides absence, and the fail-closed/degrade-to-open semantics are already ratified.
- **The double-declared audit verbs converge:** `SectionActionContext.audit` takes
  `{ action?, entity?, entityId?, detail? }`, defaulting `action`/`entity` from
  `SectionActionOptions`, so one call site declares the verbs once and a denial and a success
  audit under the same pair by default. A handler may still override (the confirmed
  two-row-touch case). Bare `adminAction`'s `ctx.audit` keeps requiring both (it has no options
  to default from).
- **`target`'s default derivation uses `event.route.id`** (now on `CairnEvent`), never
  `url.pathname` — on a catch-all route the pathname is attacker-chosen and the route id is not.
  Execution verifies current default semantics before changing them and documents the
  derivation on the reference page.

### R10 — the refusal channel (item 10)

The audit's two findings indict both halves of the current pattern, so neither freezes:

- **In-place refusals converge to `fail()` with precise types.** The 24
  `ReturnType<typeof fail>` annotations become precise `ActionFailure<...>` of the nine
  exported failure shapes (`SaveFailure`, `RenameFailure`, `DeleteRefusal`,
  `MediaDeleteRefusal`, `MediaReplaceFailure`, `MediaUpdateFailure`, `MediaBulkFailure`,
  `MediaAltPropagateFailure`, `ContentFormFailure`), so the consumer's generated `ActionData`
  stops collapsing to `{}` and both audiences get typed feedback. Redirect-refusals that answer
  a form post in place (validation, conflict) become `fail()` and the components render them
  from the `form` prop.
- **Cross-route bounces carry a bounded code, never prose.** Where a redirect is genuinely
  navigational, `?error=` carries a code from a closed union the engine defines; loads resolve
  the code to engine copy server-side and ignore unknown values. This closes the confirmed
  credential-phishing surface (attacker-chosen sentences rendered verbatim in the branded alert
  by eight loads) and makes the channel machine-matchable. The `*Data.error` fields keep type
  `string | null` but their value becomes engine-resolved copy only.
- The login/confirm pages' existing boolean-flag treatment is the model, ratified.

This is the one behavioral task and the contingency-cut boundary (see the sizing ruling).

### R11 — reserved vocabulary for the F features (item 11)

Reserved under the ratified conventions, recorded in ROADMAP's Now-tier entries (not code), so
the features arrive under rules made with them:

- **History:** `historyLoad` member / `history` facade view; `HistoryData`, `HistoryEntry`.
- **Revert:** `revertAction` member / `revert` facade key; `RevertFailure`
  (`ActionFailure<RevertFailure>`); log `commit.reverted` (`concept`, `id`, `editor`, the
  reverted-to ref).
- **Preview:** `createPreviewRoute(runtime): RequestHandler` (the ratified `createMediaRoute`
  exception is the precedent), `mintPreviewToken`, `PreviewTokenConfig`; log
  `preview.token.minted` and `preview.rejected` with snake_case `reason`.

Every reserved name derives from the R1 grammar and the R6 event grammar; that derivability is
the point of reserving them now.

### RN — the five findings with no agenda item

- **Empty doc blocks:** the ten literal-empty blocks (`createCairnAdmin`, `createAuthRoutes`,
  eight in `doctor/` and `components/markdown-format.ts`) get real contract prose. A
  lint-for-empty-blocks tripwire is filed to phase P.
- **`createCairnAdmin`'s return type is named** (`CairnAdminRoutes`), as are all factory
  returns per R1; the `check-reference-signatures.mjs` allowlist comment corrects its member
  count.
- **Formatters:** ratified rule — every display formatter accepts `null | undefined` and takes
  `fallback?: string` defaulting to `''`. `formatTimestamp`, `formatPhone`, and `formatMoney`
  widen; `formatCivilDate`'s `'Not yet'` default drops to `''` (uniformity beats the one
  opinionated English default; a site that wants "Not yet" passes it). `ageFromBirthdate`'s
  `number | null` stays (separately justified in source).
- **`doctor.md`:** the `auth.role-wiring` row is added (eighteen is correct; the table was one
  short) and the readiness guide's two-checks enumeration corrects to three.
- **`adminAction`'s CSRF walkthrough:** step 2 rewrites to state the `X-Cairn-CSRF` header
  witness first (the code's actual order), matching `log-events.md:58`, and names the
  header-authenticated-fetch consequence.
- **`canReach`:** the self-contradicting owner/`editors` sentence rewrites in both homes using
  `admin-nav.ts:383`'s correct phrasing, and states that `validateAccessComposition` rejects
  `editors` as a map key at server start (the page currently implies silent ignoring).

### Deliberately out — confirmed out

The doctor migration probe (additive, phase C/P), the kit#12987 mitigation (internal, needs a
decision date before beta, not this diff), the four-CI-gates consolidation (phase P), and P5
under R3's constrained-additive ruling. Items 5 and 11 drew no findings and are ruled above on
the agenda's own framing.

---

## The rename table (the single source for Tasks 4–7)

Members and facade keys:

| Was | Becomes | Where |
|---|---|---|
| `settingsSave` | `settingsSaveAction` | `createContentRoutes` |
| `vocabularySave` | `vocabularySaveAction` | `createContentRoutes` |
| `shellPayload` | `shellLoad` | `createContentRoutes` |
| `indexRedirect` | `indexLoad` | `createContentRoutes` |
| `addDictionaryWordAction` | `dictionaryAddAction` | `createContentRoutes` |
| `mediaPurgeOrphansAction` | `mediaOrphanPurgeAction` | `createContentRoutes` |
| `mediaReplaceApplyAction` | `mediaReplaceAction` | `createContentRoutes` |
| `mediaAltApplyAction` | `mediaAltPropagateAction` | `createContentRoutes` |
| `navSave` | `navSaveAction` | `createNavRoutes` |
| `addEditorAction` | `editorAddAction` | `createEditorRoutes` |
| `removeEditorAction` | `editorRemoveAction` | `createEditorRoutes` |
| `setRoleAction` | `editorSetRoleAction` | `createEditorRoutes` |
| `saveSettings` | `settingsSave` | facade `actions` key |
| `saveVocabulary` | `vocabularySave` | facade `actions` key |
| `addDictionaryWord` | `dictionaryAdd` | facade `actions` key |
| `addEditor` | `editorAdd` | facade `actions` key |
| `removeEditor` | `editorRemove` | facade `actions` key |
| `setRole` | `editorSetRole` | facade `actions` key |
| `mediaPurge` | `mediaOrphanPurge` | facade `actions` key |

Facade-key renames change the posted `?/name` action names; the engine's own components update
in the same task (they are the only callers of the facade's keys).

Types and values:

| Was | Becomes / disposition |
|---|---|
| `CairnAdminDeps` | `CairnAdminOptions` (its `auth` member references `AuthRoutesConfig` members once, not a re-declaration) |
| `ContentRoutesDeps` | `ContentRoutesOptions` |
| `AdminActionDeps` | `AdminActionOptions` |
| `PublicRoutesDeps` | `PublicRoutesConfig` |
| anonymous `createAuthGuard` bag | `AuthGuardOptions` |
| anonymous `createEditorRoutes` bag | `EditorRoutesOptions` |
| `makeMediaResolver` | `buildMediaResolver` |
| `OrphanScan` | `MediaOrphanScanResult` |
| `AdminActionError` | `UnauditedActionError` |
| `AdminNavIcon` | `NavIcon` |
| `RequestContext`, `ContentEvent`, `AdminEvent`, `AdminActionEvent`, `EventBase` | `CairnEvent<Env = CairnEnv>` |
| `AuthEnv`, `BackendEnv` | `CairnEnv` |
| (new) | `EmailSender`, named once, referenced from `CairnEnv` and `CairnPlatformBindings` |
| `locals.editor` / `.backend` / `.auditSink` | `locals.cairnEditor` / `.cairnBackend` / `.cairnAuditSink` |
| `Editor.role`, `EditorRow.role`, `insertEditor`/`setEditorRole` params, `AccessMap` values, `NavLayoutEntry.roles`, `NavLayoutSection.roles`, `AdminShellData.user.role` | widen to `string` / `string[]` |
| `Role` (root and `/auth-store`) | removed |
| `MakeIcon` export, `ConceptUrlPolicy` export | removed |
| `PlatformContext` | narrows to `{ env?: Env }`, exported |
| `hidden?: true` | `hidden?: boolean` |
| components `TextField`/`SelectField`/`SelectFieldOption` | `TextInput`/`SelectInput`/`SelectInputOption` (in merged `/admin-toolkit`) |
| `adminNav` family | removed per R7 |
| factory returns | named: `CairnAdminRoutes`, `ContentRoutes`, `AuthRoutes`, `EditorRoutes`, `NavRoutes`, `PublicRoutes`, `Renderer` |
| (new, per R4) | `LoginData`, `ConfirmData`, `EditorsData`, `CookieSetOptions`, and the ~40 signature-named types |

Log events and values: the six R6 renames, the snake_case media reasons, `publish_advisories`,
and `config.invalid`'s new `scope`.

---

## Tasks

Each task ends green on the full gate and commits. Deliverable counts are stated; a task that
grows past its count stops and reports rather than absorbing.

### Task 1: `CairnEnv`, `EmailSender`, structural acceptance (R5, part of R7)

**Files:** `src/lib/sveltekit/types.ts`, the env declarations and every `AuthEnv`/`BackendEnv`
reference in `src/lib` (`composeRuntime`, `BackendProvider.connect`, `SendMagicLink`,
`healthLoad`, guards, `section-action.ts`), `src/tests/unit/env-genericity.test.ts`,
`src/tests/integration/_auth-harness.ts`, reference pages for `/sveltekit` and root.
**Deliverables (4):** `CairnEnv` replaces both env types; `EmailSender` declared once with
`Promise<unknown>` return; `PlatformContext` narrows to `{ env?: Env }` (ctx/context removed,
harness updated); the `BareWranglerSiteEnv` tripwire fails TS2578 and is removed, then the
`section-action.ts` bridge casts are removed. **Acceptance:** the tripwire proof is in the task
report (the TS2578 output), the casts are gone, `CairnPlatformBindings` reference prose demotes
to recommended, gate green. **If the tripwire does not fail TS2578, stop the pass and report;
that invalidates R5.**

### Task 2: `CairnEvent` unification (R4)

**Files:** `src/lib/sveltekit/types.ts`, `admin-action.ts`, `section-action.ts`,
`content-routes-context.ts`, `cairn-admin.ts`, `guard.ts`, `health.ts`, `auth-routes.ts`,
`editors-routes.ts`, barrels, tests constructing minimal events, `docs/reference/sveltekit.md`.
**Deliverables (3):** `CairnEvent<Env = CairnEnv>` declared with the R4 member set and exported;
the four named shapes and five inline anonymous event shapes replaced by it (`HandleInput.event`
included); reference page's event-shape prose rewritten around the one type.
**Acceptance:** no export or internal signature names the retired shapes; a grep for
`RequestContext|ContentEvent|AdminActionEvent|EventBase` in `src/lib` returns nothing; gate
green.

### Task 3: the `locals` prefix (R2)

**Files:** `src/lib/ambient.ts`, every `locals.` read in `src/lib`, `examples/showcase/src`,
`docs/reference/ambient.md` (rewritten from source, fixing the `cairnAccess` omission),
affected guides. **Deliverables (2):** the four `cairn*` keys everywhere; the ambient reference
page states the whole four-key shape. **Acceptance:** `grep -rn 'locals\.\(editor\|backend\|auditSink\)\b' src/lib examples/showcase/src` returns nothing; gate green.

### Task 4: role widening (R1)

**Files:** `src/lib/content/types.ts`, `src/lib/auth/*`, `auth-store` module, `admin-nav.ts`
role arrays, `AdminShellData`, both barrels, reference pages. **Deliverables (2):** every role
*name* position widened to `string`/`string[]` per the table; `Role` export removed from both
subpaths. **Acceptance:** custom-role fixtures (`webmaster`) typecheck without casts; gate
green.

### Task 5: member and facade-key renames (R1)

**Files:** `content-routes.ts`, `nav-routes.ts`, `editors-routes.ts`, `cairn-admin.ts`, the
admin components posting `?/` action names, showcase, reference pages (`sveltekit.md`,
`admin-routes.md`). **Deliverables (1):** the member/key half of the rename table applied
end-to-end. **Acceptance:** every old name absent from `src/lib`, `examples/showcase`, and
`docs/reference`; showcase e2e green after its `npm install`; gate green.

### Task 6: type renames and removals (R1, R8)

**Files:** per the type table (bags, factory-return names, `UnauditedActionError`,
`buildMediaResolver`, `NavIcon`, `hidden` widening, `MakeIcon`/`ConceptUrlPolicy` removals with
their co-edits), reference pages. **Deliverables (1):** the type half of the rename table
applied, factory returns named and exported. **Acceptance:** `check:reference` passes with the
new names documented and the removed rows gone; gate green.

### Task 7: `adminNav` retirement (R7)

**Files:** `content/types.ts`, `admin-nav.ts`, `CairnAdminShell.svelte`, `composeRuntime`,
barrels, `ROADMAP.md` seam list, reference pages, showcase if it declares `adminNav`.
**Deliverables (2):** the R7 removal list executed with `NavLayoutEntry` self-contained; ROADMAP
1.0 seam list updated. **Acceptance:** `grep -rn 'adminNav' src/lib docs/reference ROADMAP.md`
returns nothing; the one-extra-link case is demonstrated in the organize-your-admin-nav guide
via the fallback group; gate green.

### Task 8: subpath moves and charters (R3)

**Files:** `src/lib/admin-fields/*` (deleted, contents into `src/lib/admin-toolkit/`),
`OfficeList.svelte` (moved), `components/index.ts` (+`VocabularyAdmin`, `WelcomeView`),
`package.json` exports map, `check:package`/packaging-boundary test, all barrel headers,
all reference-page openings, `docs/reference/README.md`, `docs/internal/admin-design-system.md`
scan roots, `skills/cairn-admin-screens` references, `add-a-custom-admin-screen.md`.
**Deliverables (4):** the merge (with `TextInput`/`SelectInput`/`SelectInputOption` renames);
the `OfficeList` move; the `/components` completion; a charter line on all fifteen barrels and
reference openings (auth-crypto.md also gains the `tokensMatch` fourth precondition).
**Acceptance:** `/admin-fields` gone from the exports map and docs; every barrel header and
reference opening carries its membership rule; gate green.

### Task 9: the export rule (R4)

**Files:** the declaring modules of the ~40 signature-named types, barrels,
reference pages (one-line rows per the calibration), `sveltekit.md`'s types table.
**Deliverables (2):** every signature-named type exported (`LoginData`/`ConfirmData`/
`EditorsData` named; re-run the sweep's cross-reference to close the list); reference rows
added. **Acceptance:** re-running the cross-reference (surface entries' type identifiers vs
exported names) reports zero unexported names; `check:reference` green; gate green.

### Task 10: section-action convergence (R9)

**Files:** `section-action.ts`, `admin-action.ts` (types only), its unit tests,
`sveltekit.md`. **Deliverables (3):** `SectionActionContext.audit` defaulting from options;
`target` derivation via `event.route.id` (verify current semantics first, document);
`resolveDb` ratified prose on the reference page. **Acceptance:** the existing
divergent-verbs test rewrites to assert the default-seeding behavior; gate green.

### Task 11: the log vocabulary (R6)

**Files:** `src/lib/log/events.ts`, every emit site of the six renamed events,
`content-routes-media.ts` + `media-route.ts` reason values,
`components/media-upload-outcome.ts` (`REFUSE_TO_FAILURE`), `content-routes-core.ts` scopes,
`content-routes-settings.ts`/`nav-routes.ts` (`config.invalid` scope),
`docs/reference/log-events.md` (full-table correction pass: the six renames, backticked value
lists everywhere, the `media.uploaded` and `github.unreachable` and `config.invalid` rows),
`read-cairn-logs.md` if it names renamed events. **Deliverables (3):** the six renames; the
snake_case value unification through the client mapping; the corrected table.
**Acceptance:** the 56-name union still matches the table 1:1; no kebab-case value remains in
any emit site; gate green.

### Task 12: the refusal channel (R10) — the contingency-cut boundary

**Files:** `content-routes-core.ts`, `-media.ts`, `-tidy.ts`, `-dictionary.ts`,
`-settings.ts`, `cairn-admin.ts` (`viewAction`), the ten `?error=`-reading loads, the eight
verbatim-rendering components, `sveltekit.md`, `security-model.md`. **Deliverables (4):**
precise `ActionFailure<...>` annotations on all 24 sites (the nine failure shapes in
signatures); in-place redirect-refusals converted to `fail()` with component `form`-prop
rendering; the bounded error-code union with server-side resolution and unknown-code ignoring
on every load; the security-model page records the closed phishing surface. **Acceptance:**
no load renders a query-derived string; the generated `ActionData` in the showcase is a usable
union (spot-proof in the report: `form?.error` typechecks); `web-auth-security-reviewer` passes
this task's diff; a full-page render of a failing save and a bounced navigation is read in the
main loop; gate green.

### Task 13: formatter nullish rule (RN)

**Files:** `src/lib/admin-toolkit/format.ts`, its tests, `admin-toolkit.md`.
**Deliverables (1):** all four formatters accept nullish with `fallback?: string` default
`''` (formatCivilDate's `'Not yet'` default drops); the rule stated on the reference page.
**Acceptance:** gate green.

### Task 14: docs corrections, reserved vocabulary, changelog (R1, R8, R11, RN)

**Files:** `doctor.md` (+`auth.role-wiring` row), `cloudflare-readiness.md` (count),
`sveltekit.md` (CSRF header-witness step; the authn/authz terminology sweep),
`upgrade-cairn.md` (terminology + this window's entry), `core.md` (`canReach` rewrite,
fixed-screens `nav`, removed rows), `restrict-admin-access.md` (fixed screens), `access.ts`
docblock, the ten empty doc blocks, `check-reference-signatures.mjs` allowlist comment,
ROADMAP (reserved F vocabulary into the Now-tier entries; P filings: ambient-block gate,
log-fields gate, export-rule gate, empty-doc-block tripwire), `CHANGELOG.md` (consolidate the
window's `Consumers must:` list from every task's increments). **Deliverables (5):** the
correction batch; the empty blocks filled; the terminology sweep; the reserved vocabulary
recorded; the assembled changelog entry. **Acceptance:** Vale clean on touched published pages;
`check:snippets` green; the `Consumers must:` list covers every breaking change in this plan's
tables (cross-check against the rename table as the completeness test); gate green.

### Close-out

`cairn-pass` pass-end ritual: code-simplifier over the changed code, reviewer fan-out
(`svelte-reviewer`, `web-auth-security-reviewer`, `daisyui-a11y-reviewer` on the component
diffs), `api-surface.md` regenerated and committed, STATUS updated, post-mortem appended here,
merge the PR, hold unpublished. The showcase's green e2e (after in-worktree `npm install`) is
the migration-list completeness proof.

## Self-review notes

- Spec coverage: all eleven items ruled (R1–R11), all confirmed findings disposed
  (each evidence bullet is cited inside its ruling), out-of-window items confirmed out, both
  standing constraints honored (unconstrained generics; fenced blocks kept).
- Interlocks checked: Task 2 depends on Task 1's `CairnEnv`; Task 12's code union depends on
  Task 11's snake_case ruling (codes are snake_case); Task 9's descriptor-arm exports depend on
  Task 8's `TextInput` rename landing first (collision avoidance); the task order encodes this.
- The one unverified-in-code assumption: R9's current `target` default semantics — Task 10
  carries an explicit verify-before-change step rather than an assumption.
