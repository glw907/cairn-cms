# Internals audit: `src/lib/sveltekit` (route factories, admin mount, guards, actions)

Auditor: sveltekit-internals. Repo `/home/glw907/Projects/cairn-cms`, `main` at HEAD, 2026-08-26.
36 files, 9,650 lines. Every file read; `content-routes-core.ts` (2,215), `content-routes-media.ts`
(1,414), `admin-nav.ts` (595), `content-routes-settings.ts` (450), `preview.ts` (421),
`content-routes-context.ts` (362), `cairn-admin.ts` (346) read in full.

## State of the area

This is a strong, unusually well-documented area that has quietly outgrown one of its own
structural decisions. The framework-facing surface is genuinely idiomatic and often exemplary:
`CairnEvent` is the right call (structural subset, no `App.*` ambient leak, one shape replacing
five), `cairn-admin.ts`'s `viewAction` wrapper is a model of a thin dispatcher, `admin-nav.ts` and
`admin-action.ts`/`section-action.ts` are the best files in the repo — pure, top-level, greppable,
with comments that carry contract and rationale instead of paraphrase. `guard.ts` reads correctly
in one pass. The E4 failure-family idiom (`fail(status, {...} satisfies XFailure)`) is honored
almost everywhere. Test coverage is dense (~40 unit files touch this directory) and the T1 shared
harness landed.

The shortfall is concentrated and structural. The code-polish pass's own "content-routes.ts
decomposes, bounded" decision split the 2,664-line factory into five domain modules, but it split
the *file*, not the *shape*: `content-routes-core.ts` is now a 2,215-line module whose entire body
is one 1,690-line closure holding 30 nested declarations, and `content-routes-media.ts` is a
1,414-line sibling of the same shape. Neither is navigable by grep, and neither offers an AI agent
a top-level symbol to anchor an edit on. Around that core, the shared-seam helpers the
decomposition was supposed to centralize are forked instead of shared: `resolveBackend` exists in
three copies, `isMissingTableError` in two plus an inline third, the media-manifest read is spelled
out verbatim nine times, and the commit-failure helper is reachable three different ways in this
one directory — including one call inside `content-routes-core.ts` that bypasses the context member
the same file uses everywhere else. The other systemic gap is the redirect query-string: the
`?error=` family got a beautiful bounded vocabulary in `refusal-codes.ts` while ~18 sibling flash
params got nothing, two of them decoded only in a Svelte component. Grade: **B**. The framework
idiom is A-grade; the module shape and the shared-helper discipline in the content-routes cluster
are C-grade, and they are exactly the two things a new developer and an extending agent hit first.

---

## 1. `content-routes-core.ts` is one 1,690-line closure: the decomposition split the file, not the shape

**Tier: rewrite. Limb: comprehension + agent-extensibility.**

`docs/internal/code-idioms.md` records the decision:

> **`content-routes.ts` decomposes, bounded.** The 2,664-line factory body splits into per-domain
> internal modules (media actions, tidy, settings/vocabulary, dictionary, core content actions),
> each a function over one shared closure-context object [...]

The split happened. The shape did not change. `content-routes-core.ts` is 2,215 lines, of which
lines 527-2215 are a single function:

```ts
// content-routes-core.ts:527
export function createCoreActions(ctx: ContentRoutesContext) {
  const { runtime } = ctx;
  ...
  return { shellLoad, helpLoad, indexLoad, listLoad, createAction, editLoad, historyLoad,
           saveAction, publishAction, publishAllAction, discardAction, deleteAction,
           listDeleteAction, renameAction, previewMintAction, previewRevokeAction, revertAction };
}
```

Thirty declarations live inside that body (counted mechanically). Most of them close over nothing
the module scope could not give them:

- `collectVisibleHrefs` (line 659) — pure, takes `nav`, closes over nothing.
- `commitEditorName` (line 1135) — pure, takes an author object.
- `withRefusalCode` (line 706) — pure, takes a path and a code.
- `saveRefusal` (line 1245) — pure, takes a message and a body.
- `summarize` (line 742) / `pendingRow` (line 768) / `crawlEntries` (line 776) — take `backend`
  as a parameter already.
- `draftFromBranchHead` (line 1148) — takes `backend`, `path`, `branch`, `headSha`.
- `interface SaveHold` (line 1205) — a type, declared inside a function body.
- `interface InboundRepoint` (line 1917) — a type declared inside `renameAction`, itself inside
  the factory.

The clearest single symptom is `HISTORY_LIMIT`, whose own comment contradicts where it sits:

```ts
// content-routes-core.ts:1123
/**
 * The most recent publishes `historyLoad` reads; a module constant, not a site config knob
 * (the spec's plan-time call). ...
 */
const HISTORY_LIMIT = 25;
```

It is declared at line 1128, 600 lines inside `createCoreActions`. It calls itself "a module
constant" while being a closure local. `content-routes-media.ts` gets this right for the same kind
of value (`MEDIA_SLUG_RE`, `MAX_ALT`, `MEDIA_DISABLED_MESSAGE` at lines 251-351, all module scope),
which proves the placement is habit, not necessity.

Why it matters against the bar. For a **new developer**: opening the file gives a 2,215-line wall
with two top-level symbols (`createCoreActions` and a handful of exported interfaces). "Where does
publish decide to delete the branch?" is not answerable by grep-for-a-function; it is answerable
only by scrolling. For an **AI agent**: every edit anchor is `function saveToBranch(` at an
indentation level that repeats, and the agent must read the surrounding 1,600 lines to know what is
in scope. This is the single biggest tax in the area, and the `code-idioms.md` decision that
produced it explicitly reserved the right to bound it — the bound was never applied to the body.

**Remediation.** Re-derive the split by *surface*, not by "everything that is not media/tidy/
settings/dictionary". Concretely: hoist every closure-free helper (`collectVisibleHrefs`,
`commitEditorName`, `withRefusalCode`, `saveRefusal`, `summarize`, `pendingRow`, `crawlEntries`,
`draftFromBranchHead`, `HISTORY_LIMIT`, `SaveHold`, `InboundRepoint`) to module scope, then split
the remainder into `content-routes-shell.ts` (shellLoad + nav/attention projection, ~150 lines),
`content-routes-list.ts` (indexLoad, listLoad, helpLoad, createAction), `content-routes-entry.ts`
(editLoad, saveToBranch, saveAction, publishAction, publishAllAction, discardAction, delete*,
renameAction), and `content-routes-history.ts` (historyLoad, revertAction, preview mint/revoke).
Each factory keeps taking `ContentRoutesContext`; `content-routes.ts`'s public return object is
unchanged and `check:surface` proves it. Apply the same hoist to `content-routes-media.ts`
(1,414 lines, one factory from line 374 to 1413).

---

## 2. The per-request seam helpers are forked, not shared — three ways to resolve a backend

**Tier: refactor. Limb: idiom + agent-extensibility.**

`code-idioms.md` A2 names the cross-branch fan-out dedup "the strongest single reuse win in the
codebase" and M1/M3 push toward one home per pattern. Inside this one directory, four separate
patterns are forked:

**`resolveBackend` — three copies.**

```ts
// content-routes-context.ts:308
function resolveBackend(event: CairnEvent): Backend {
  return event.locals.cairnBackend ?? runtime.backend.connect(event.platform?.env ?? {});
}
// nav-routes.ts:42  (byte-identical body, near-identical doc comment)
function resolveBackend(event: CairnEvent): Backend {
  return event.locals.cairnBackend ?? runtime.backend.connect(event.platform?.env ?? {});
}
// preview.ts:375  (inlined, with a doc comment that points at the other two)
const backend = event.locals.cairnBackend ?? runtime.backend.connect(env);
```

`preview.ts`'s own docstring (line 287) says it uses "the same [...] seam every other engine load
uses (content-routes-context.ts's `resolveBackend`)" — while not calling it.

**`isMissingTableError` — two copies plus an inline third**, with the duplication documented as a
decision:

```ts
// preview.ts:157
/**
 * True for a D1 error whose message names a missing table (SQLite's own "no such table" text).
 *  Mirrors content-routes-core.ts's own local copy; the check is a two-line regex, not worth
 *  sharing across a module boundary for.
 */
```
The third is `src/lib/auth/store.ts:157`, inline. Three sites now encode the same D1 string
contract; a future D1 wording change needs three edits and only two of them are greppable together.

**The media-manifest read — nine verbatim copies.** `ContentRoutesContext` provides
`readManifest(backend)` for the *content* manifest but no parallel for the media one, so every
media action spells out the same three-call chain:

```ts
// content-routes-media.ts:625, 677, 800, 892, 962, 1020, 1170, 1285, 1351 — all identical
const manifest = parseMediaManifest(ctx.parseMediaJson(await backend.readFile(runtime.mediaManifestPath, backend.defaultBranch)));
```

`preview.ts` then adds a tenth spelling with its own private `safeParseJson` (line 166), a verbatim
copy of `ctx.parseMediaJson` (content-routes-context.ts:332).

**`commitFailure` / `logCommitFailed` — three call styles.** They are free functions in
`commit-log.ts`, *also* mirrored onto `ContentRoutesContext` as members (context lines 253-268,
349-360). `nav-routes.ts:148` imports the free function (defensible, it holds no context). But
`content-routes-core.ts` imports it directly at line 28 *and* calls it directly at line 2170:

```ts
// content-routes-core.ts:2170, inside revertAction
      logCommitFailed(commitFields, err);
```

while the same file uses `ctx.logCommitFailed(...)` at line 1615 and `ctx.commitFailure(...)` at
1425, 1516, 1771, 1985. One file, two ways to reach one function, no stated reason.

**The platform-env cast — three copies, two in one file.** `CairnEvent` declares
`platform?: PlatformContext<Env>` with a typed `env`, and then three sites cast it away:

```ts
// content-routes-media.ts:365 (inside resolveMediaBucket)
const platformEnv = (event.platform as { env?: Record<string, unknown> } | undefined)?.env ?? {};
// content-routes-media.ts:542 (inside ingestAndStore — does not call resolveMediaBucket)
const platformEnv = (event.platform as { env?: Record<string, unknown> } | undefined)?.env ?? {};
// media-route.ts:124
const platform = event.platform as { env?: Record<string, unknown> } | undefined;
```

`ingestAndStore` re-derives the bucket inline (542-545) instead of calling `resolveMediaBucket`
(360), which is the module's own helper for exactly that, three lines away in the same file.

**Remediation.** Add `readMediaManifest(backend, ref?)` and `resolveMediaBucket(event)` to
`ContentRoutesContext`; have `ingestAndStore` call the latter. Export one `resolveBackend(runtime,
event)` from a new `backend-resolve.ts` (or from `commit-log.ts`'s sibling position) and call it
from all three sites. Move `isMissingTableError` to `src/lib/auth/preview-store.ts` (which owns the
table) and import it in the three consumers. Drop `logCommitFailed`/`commitFailure` from
`ContentRoutesContext` entirely and import the free functions everywhere, so there is one way; that
also shrinks the context to the members that genuinely capture `runtime`. Fix `content-routes-core.ts:2170`
either way.

---

## 3. The post-action redirect query-string is an unbounded, homeless cross-request contract

**Tier: refactor. Limb: comprehension + agent-extensibility.**

`refusal-codes.ts` is exemplary. It closes the `?error=` vocabulary, documents why, and states the
rule:

```ts
// refusal-codes.ts:1
// The closed vocabulary a genuinely-navigating refusal may carry on `?error=`. Every in-place
// refusal answers through `fail()` (R10); this module is the whole bounded surface the query
// channel is still allowed to speak, so an attacker-crafted query value carries no meaning past
// this resolver.
```

Nothing does the same job for the other eighteen query params the engine writes and reads across
the same channel. The writers are scattered across three files:

```ts
// content-routes-core.ts:890   `/admin/${concept.id}/${id}?new=1${dateParam}${titleParam}`
// content-routes-core.ts:1443  `saved=1&drafts=${encodeURIComponent(...)}`
// content-routes-core.ts:1446  savedQuery += `&refs=${encodeURIComponent(...)}`
// content-routes-core.ts:1533  `?published=1`      :1658 `?discarded=1`      :1993 `?renamed=1`
// content-routes-core.ts:1643  `?publishedAll=${published.length}`
// content-routes-core.ts:2191  `&revertRetiredFields=` :2192 `&revertRetiredTags=`
// content-routes-media.ts:752/1046/1246/1381 `?deleted=1` `?updated=1` `?replaced=1` `?altPropagated=1`
// nav-routes.ts:153, content-routes-settings.ts (saves) `?saved=1`
```

and the readers are split across the server/client boundary with no registry. `editLoad` decodes
eight of them by hand (`content-routes-core.ts:900, 936, 940, 1088, 1089, 1099, 1101` plus
`commaListParam` at 1045-1048); `mediaLibraryLoad` decodes seven in an if/else-if ladder
(`content-routes-media.ts:392-398`); and two — `drafts` and `refs` — are never decoded server-side
at all, only in a component:

```svelte
// src/lib/components/EditPage.svelte:1382
  const draftWarning = $derived(redirectFlagList('drafts'));
```

The consequence for the bar. A new developer asking "what can appear on `?` after a save?" has no
file to open. An agent asked to add a new post-action flash has two incompatible precedents (a
bounded resolver for one family, ad-hoc `=== '1'` string tests for the other eighteen) and no
signal which one governs. The media ladder is the tell that the pattern has outgrown ad-hoc: seven
sequential `else if` branches reading seven boolean params that are mutually exclusive by
construction.

**Remediation.** Extend the `refusal-codes.ts` idea into one `admin-query.ts` that owns the whole
channel: a `FlashCode` union for the mutually-exclusive success flags (replacing the media ladder
with one `resolveFlash(url)`), a `readFlag(url, name)` / `readList(url, name)` pair replacing the
hand-rolled `=== '1'` tests and `commaListParam`, and a `buildRedirect(path, params)` writer so the
`&`-concatenation sites (1443-1446, 2190-2192, 885-889) stop hand-assembling query strings. Include
`drafts` and `refs` so the component reads a documented vocabulary rather than raw params.

---

## 4. `requireEntryFromParams` exists and is bypassed twice; media has no equivalent at all

**Tier: refactor. Limb: idiom.**

The shared entry preamble is defined and documented as the one way:

```ts
// content-routes-core.ts:461
/**
 * The shared preamble for a single-entry action addressed by the `[id]` route param:
 *  authenticate, resolve the concept, and validate the id. [...] Shared by save, publish,
 *  discard, the editor's own delete, and rename; [...]
 */
function requireEntryFromParams(runtime: CairnRuntime, event: CairnEvent): { editor: Editor; concept: ConceptDescriptor; id: string } {
  const editor = requireEditor(event);
  const concept = conceptOf(runtime, event.params);
  requireEngineAccess(runtime.access, editor, concept.id);
  const id = event.params.id ?? '';
  if (!isValidId(id)) throw error(400, 'Invalid entry id');
  return { editor, concept, id };
}
```

Eight actions use it. Two loads reimplement it inline, statement for statement:

```ts
// content-routes-core.ts:894  editLoad
    const editor = requireEditor(event);
    const concept = conceptOf(runtime, event.params);
    requireEngineAccess(runtime.access, editor, concept.id);
    const id = event.params.id ?? '';
    if (!isValidId(id)) throw error(400, 'Invalid entry id');

// content-routes-core.ts:1166  historyLoad — identical five lines
```

`historyLoad`'s own docstring even says "Guarded exactly as `editLoad`" (line 1163), naming the
duplication rather than removing it. Nothing in either body needs the destructured form to differ.

The mirror-image gap is media: there is no `requireMediaAccess(event)`, so the same two lines repeat
ten times across `content-routes-media.ts`:

```ts
    const editor = requireEditor(event);
    requireEngineAccess(runtime.access, editor, 'media');
```
(lines 386-387, 667-668, 777-778, 880-881, 938-939, 1012-1013, 1068-1069, 1146-1147, 1268-1269,
1341-1342). This is a *security* preamble; ten hand-copied instances is exactly where an eleventh
action forgets one. `content-routes-tidy.ts:118` and `content-routes-dictionary.ts:102` each carry
yet a third variant (`if (event.params.concept) requireEngineAccess(...)`), with identical
five-line comments explaining the conditional — copy-pasted between the two files.

**Remediation.** Call `requireEntryFromParams` from `editLoad` and `historyLoad`. Add
`requireMediaEditor(ctx, event): Editor` to `content-routes-media.ts` module scope and use it in
all ten actions. Hoist the conditional concept gate into one shared
`requireOptionalConceptAccess(ctx, event, editor)` used by both tidy and dictionary, so the shared
comment has one home.

---

## 5. `applySecurityHeaders` names two unrelated functions in one directory

**Tier: refactor. Limb: comprehension + agent-extensibility.**

```ts
// admin-response.ts:31 — exported; admin baseline (X-Frame-Options, HSTS, Permissions-Policy)
export function applySecurityHeaders(headers: Headers, opts: SecurityHeaderOptions = {}): void

// media-route.ts:32 — module-private; media delivery (nosniff, sandbox CSP, immutable cache, ETag)
function applySecurityHeaders(headers: Headers, etag: string): void
```

Different arity, different header set, different threat model, same name, same directory. Both
files' comments make the distinction ("The route sits outside `/admin`, so the admin security
headers never run on it; it owns its own", media-route.ts:3), which is correct reasoning that
argues for a *different name*, not the same one.

An agent asked to "add a header to the security headers" greps `applySecurityHeaders`, gets two
definitions, and has a coin flip. A reviewer reading a diff that touches one cannot tell from the
hunk which is in play.

**Remediation.** Rename the media-route copy to `applyDeliveryHeaders` (it is module-private, so
the rename is free and touches one call site each at media-route.ts:165 and 171).

---

## 6. `admin-action.ts` shadows SvelteKit's `error` three times in a file that calls `error()`

**Tier: refactor. Limb: idiom + agent-extensibility.**

```ts
// admin-action.ts:12
import { error, isActionFailure, isHttpError, isRedirect, redirect } from '@sveltejs/kit';
...
// admin-action.ts:81
function serializeThrownError(error: unknown): string {
// admin-action.ts:189
        const logSinkFailure = (error: unknown): void => {
// admin-action.ts:209
        } catch (error) {
          if (isRedirect(error) || isHttpError(error)) throw error;
```

and the real `error()` is called 130 lines above, in the same function:

```ts
// admin-action.ts:172
        throw error(403, 'This request could not be verified. Please refresh the page and try again.');
```

Inside the catch at 209, `error` is the caught value. An agent (or a person) adding a
`throw error(500, ...)` to that block writes a `TypeError` that typechecks as a call on `unknown`
only if lucky, and reads as correct in review. The rest of the directory consistently uses `err`
(`content-routes-core.ts:1424, 1489, 1984`; `section-action.ts:222`; `nav-routes.ts:116`), so this
file is the only outlier.

**Remediation.** Rename all three to `err` (the directory's own convention); `serializeThrownError`'s
parameter to `raw`.

---

## 7. `ContentFormFailure` collapses eleven discriminated failure shapes into one all-optional bag

**Tier: refactor. Limb: idiom.**

```ts
// content-routes.ts:93
export type ContentFormFailure = Partial<
  SaveFailure & DeleteRefusal & RenameFailure & CreateFailure & PreviewMintFailure & MediaDeleteRefusal & MediaUpdateFailure & MediaReplaceFailure & MediaAltPropagateFailure & MediaBulkFailure & TidyFailure
>;
```

`code-idioms.md` E4 asks for "a named `*Failure`/`*Refusal` interface carrying `error: string` plus
context" — which every constituent honors. The union type then throws that away: every field
becomes optional, `error` included (its own docstring says "`error` is always set on a failure",
which the type contradicts), and a component reading `form.hash` or `form.inboundLinks` gets
`string | undefined` with no way to ask which action failed. It is a 213-character single-line type
that must be edited by hand every time a failure shape is added — and `DictionaryAddFailure` was in
fact never added, so the "one `form` prop carries every content refusal" promise is already
incomplete.

**Remediation.** Discriminate. Give every `*Failure` a literal `kind` field (`kind: 'save'`,
`'media-delete'`, …) set at each `fail()` site, and make `ContentFormFailure` a plain union of the
eleven. Components then switch on `form.kind` instead of probing for optional keys, and adding a
twelfth failure is a union member rather than an edit to a wide intersection. If the breaking
change is unwanted before beta, at minimum add `DictionaryAddFailure` and make `error` required:
`{ error: string } & Partial<...>`.

---

## 8. Two factories return a one-member object where the charter says return the function

**Tier: note. Limb: idiom.**

`code-idioms.md` F2: "Runtime factories are `create*` closures over injected deps returning an
object of named functions [...] **a factory whose whole surface is one function returns the
function.**"

```ts
// content-routes-tidy.ts:262
  return { tidyAction };
// content-routes-dictionary.ts:147
  return { dictionaryAddAction };
```

Both are single-function surfaces. There is a defensible reason (uniformity at the
`createContentRoutes` composition site, content-routes.ts:104-109), but the charter states the rule
without that exception and the charter is a standing pass dimension ("a pass that changes an idiom
updates this file"). Either the two factories converge or the charter records the composition
exception.

**Remediation.** Pick one and record it: return the bare function from both (`createTidyAction`,
`createDictionaryAddAction`, destructured at the composition site), or add the composition-uniformity
exception to F2 in `code-idioms.md`.

---

## 9. `serializeThrownError` is a helper the charter says should not exist

**Tier: note. Limb: idiom.**

`code-idioms.md` A5: "Catch-boundary stringification is the inline `err instanceof Error ?
err.message : String(err)`; no helper."

```ts
// admin-action.ts:81
function serializeThrownError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try { return JSON.stringify(error); } catch { return String(error); }
}
```

The inline form is used at ~8 sites in this directory (`content-routes-media.ts:854, 997`;
`content-routes-core.ts:1004`; `section-action.ts:236`; `audit-sink.ts:317`; `preview.ts:223`), so
the charter's rule is otherwise honored. This one file has a genuinely richer behavior
(`JSON.stringify` for plain objects) which is a real improvement — but it is undeclared, so it is a
second way to do one thing rather than a promoted standard.

**Remediation.** Decide which is the rule. Either inline it here for consistency, or promote
`serializeThrownError` to a shared internal helper, use it at all ~8 sites, and update A5 in
`code-idioms.md` to name it as the exemplar.

---

## 10. `renderConditionResponse` takes an optional `url` that one branch requires, enforced by `!`

**Tier: note. Limb: idiom.**

```ts
// condition-response.ts:41
export function renderConditionResponse(id: string, ctx: { url?: URL } = {}): Response {
  condition(id);
  switch (id) {
    case REASON_CONDITION.https: {
      const httpsUrl = new URL(ctx.url!);
```

The signature says `url` is optional and defaults the whole context to `{}`; the `https` branch
then asserts it non-null. A caller that renders `'edge.https-not-forced'` without a url gets a
runtime `TypeError` from a function whose type said it was fine. The one real caller
(`guard.ts:116`) passes it, so this is latent, not live — but it is exactly the shape an agent
adding a second https-condition call site would trip over.

**Remediation.** Make the parameter honest with an overload or a discriminated argument:
`renderConditionResponse(id: Exclude<ConditionId, 'edge.https-not-forced'>): Response` plus
`renderConditionResponse(id: 'edge.https-not-forced', ctx: { url: URL }): Response`. Simplest
alternative: split the https case into its own exported `renderHttpsRequiredResponse(url: URL)`.

---

## 11. `static-admin-page.ts` hand-copies 145 lines of Warm Stone tokens with no drift guard

**Tier: note. Limb: comprehension.**

Lines 20-162 are a template literal holding the full light and dark token sets, the type stack, and
every component rule the two rejection pages use:

```ts
// static-admin-page.ts:20
const SHARED_STYLE = `:root {
  color-scheme: light;
  --bg: oklch(96.5% 0.006 75);
  ...
```

The self-contained-document rationale is sound and documented (line 1-4, served raw before
SvelteKit renders). The problem is that these values are a hand-copy of the tokens in
`src/lib/components/cairn-admin.css`, and nothing pins the two together: the only test,
`src/tests/unit/static-admin-page.test.ts`, asserts document wrapping and title escaping and
nothing about the tokens. `CLAUDE.md` names `docs/internal/admin-design-system.md` as the authority
for the Warm Stone tokens; a change there updates the stylesheet and silently leaves the guard's
CSRF and HTTPS pages on the old palette.

Per the repo's own watch-item rule ("Converting a watch into a failing test is the gold standard"),
this is a machine-detectable drift with no tripwire.

**Remediation.** Add a unit test that parses the `:root` custom-property block out of
`cairn-admin.css` and asserts every token `SHARED_STYLE` declares matches it by value. Alternatively
generate `SHARED_STYLE` from the stylesheet at build time, the way `check:reference` derives from
source rather than trusting a copy.

---

## 12. `tidy-key-health.ts` ships module-level mutable state and a test-only reset in the library

**Tier: note. Limb: idiom.**

```ts
// tidy-key-health.ts:22
let unhealthyUntil: number | null = null;
// tidy-key-health.ts:28
let lastProbe: { status: TidyKeyProbeResult; at: number } | null = null;
...
// tidy-key-health.ts:69
/** Test-only reset of the module-level cache, so one test's mark cannot leak into the next. */
export function resetKeyHealthForTest(): void {
```

The cross-request module state is deliberate and reasoned (line 1-7: one isolate serves one site),
and it is the pragmatic Workers answer. Two things are worth naming anyway. First, it is the only
mutable module state in this directory, so it is the one place where "a pure function of the
request" stops holding — worth a `// WATCH:` marker rather than only a header paragraph, since an
agent adding a second cache will copy this file. Second, `resetKeyHealthForTest` is a test affordance
exported from a production module; it is not on the `/sveltekit` barrel so it never reaches a
consumer, but it is the one exported symbol in the directory whose name declares it is not part of
the product.

**Remediation.** Keep the design. Rename `resetKeyHealthForTest` to `__resetKeyHealth` (or move the
state behind a tiny `createKeyHealthCache()` the module instantiates once, so the test constructs
its own instance and no reset export is needed). Add a `// WATCH:` comment at the `let` declarations
noting that isolate-scoped state is a deliberate exception, so the next author does not read it as
precedent.

---

## 13. Small blemishes worth one sweep

**Tier: note. Limb: idiom.**

- `content-routes-media.ts:317-320` — `sanitizeField`'s body opens with a stray blank line between
  the signature and the single `return`.
- `media-route.ts:120` — `let bucket;` with no type annotation, inferred later from the assignment
  inside a `try`; every other `let` in the directory that crosses a try boundary is annotated
  (`content-routes-core.ts:1718 let refIndex: Awaited<...>`, `content-routes-media.ts:692, 813`).
- `cairn-admin.ts:249-251` — `authedViews` and `anyView` are two hand-maintained literal lists where
  `anyView` is exactly `authedViews` plus `'login'`/`'confirm'`; adding a view means editing both,
  and forgetting the second silently 404s logout on the new view. Derive:
  `const anyView = [...authedViews, 'login', 'confirm'] as const;`
- `content-routes-media.ts:1237` — `mediaReplaceAction` logs `media.replaced` inside its commit
  `try` but never `commit.succeeded`, unlike every sibling commit path in the same file
  (639, 745, 838, 1042). Not wrong, but the log vocabulary reads as inconsistent for one action.
- `admin-nav.ts:189` and `:297` — the same
  `ctx.conceptIds.map((id) => ({ id })) as unknown as ConceptDescriptor[]` stub cast, with the
  second comment pointing at the first ("mirroring validateNavLayout's own stub above"). One
  `stubConcepts(ids)` helper removes both casts from the reader's path.
