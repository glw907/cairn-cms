# C2b: the refusal-channel convergence

> **For agentic workers:** execute with `cairn-pass` plus per-task `cairn-implementer` dispatches
> from an Opus 5 session, on the worktree `.claude/worktrees/c2b-refusal-channel` (branch
> `c2b-refusal-channel`, off `main` at `8559f3e7`). The main loop reviews each diff and confirms
> the full gate between dispatches.

**Authority:** ruling R10 and Task 12 of
[`2026-08-02-c2-breaking-window.md`](./2026-08-02-c2-breaking-window.md), cut out of C2
mid-execution under the pre-approved contingency split, plus the `requireAccess` asymmetry that
plan's post-mortem routed here. Both passes sit in the same unpublished `## Unreleased` window;
C2b appends its own `Consumers must:` entries to the list C2 assembled, so a consumer still
absorbs one batch.

**Goal:** every refusal reaches the editor through the affordance that fits it. A refusal that
answers a form post in place becomes `fail()` with a precise type. A refusal that genuinely
navigates carries a bounded code the load resolves to engine copy. No screen renders a
query-derived sentence.

Note the name collision. [`2026-08-02-refusal-channel-convergence.md`](./2026-08-02-refusal-channel-convergence.md)
is a different, already-shipped pass: it converged `adminAction`'s own two throws onto SvelteKit's
native `error()`/`redirect()`. This pass converges the *content actions'* refusals, one layer up.

## What the survey found, and how it changes R10's framing

R10 was written as "in-place refusals converge to `fail()`; cross-route bounces carry a bounded
code," implying a rough balance. A full map of the channel says otherwise: of the fifteen
`?error=` redirect sites, **twelve answer the very route the form posted to**. The shared
`commitFailure` helper (`commit-log.ts:42`), reached from nine actions across core and media,
always bounces to the page the failing commit belongs to. So does every settings, vocabulary,
and nav validation bounce, every create and save validation bounce, and `viewAction`'s generic
unexpected-failure arm.

The consequence is that R10's first clause does most of the work and its second clause shrinks to
a short list. After the conversion only three bounces genuinely navigate:

| Survivor | Site | Why it stays a redirect |
|---|---|---|
| Expired sign-in link | `auth-routes.ts:188,192` | Confirm page to login page. Already a bounded code (`expired`), already resolved as a boolean flag. This is R10's ratified model. |
| Publish-all outcome | `content-routes-core.ts:1327,1349` | The topbar posts publish-all from any screen and it always lands on the first reachable concept, so the refusal cannot render where it was raised. |
| The `/admin` landing relay | `content-routes-core.ts:566-577` | `indexLoad` forwards an arriving code to the concept it redirects to. A relay, not a producer. |

Everything else stops using the query channel. That is a better outcome than R10 anticipated, and
it is the same outcome by a shorter route: a channel that carries almost nothing is far easier to
keep honest than one that carries prose from twelve places.

## The rulings

### The bounded code union

An internal closed union, `RefusalCode`, with a resolver that maps a code to engine copy and
returns `null` for anything it does not recognize. Values are snake_case, matching R6's ratified
log-value grammar, except `expired`, which ships today and is already correct.

It stays **internal**: `*Data.error` fields keep type `string | null` per R10, so no public
signature names the union and the public surface does not move. A site never writes a code.

Unknown-code ignoring is the security property, so it is the resolver's default, not a check each
of the seven loads remembers to write.

### `fail()` is the default refusal; a redirect is the exception that must argue for itself

Converting `commitFailure` from a `never`-throwing redirect into a returned `ActionFailure` is the
structural half of this pass. The nine call sites each stop throwing and start returning, which is
also the change that lets their `| never` return arms collapse.

The UX moves the right way. The previous pass's post-mortem already recorded that a redirect-based
refusal "navigates away, discarding unsaved input, where the old 500 left the page recoverable."
`fail()` keeps the editor on the page with the form state intact, and `SaveFailure` already carries
`body` for exactly that.

### `viewAction` loses its `scriptPosted` split

`cairn-admin.ts` currently branches its unexpected-failure handling on whether the client posted by
`fetch`: a script-posted action returns `fail(500, ...)`, everything else throws a redirect that has
to reconstruct a `new=1` flag the navigation would otherwise drop. Once every refusal is a `fail()`,
both arms are the same arm. The `scriptPosted` option, the `carriesNewFlag` option, and the request
clone that supports them all go with it.

### `requireAccess` derives its target from `route.id`

C2's R9 moved `createSectionAction` onto `event.route.id` and left `requireAccess` on
`event.url.pathname`, so the two halves of one authorization story disagreed. This pass closes it,
reusing the route-group normalization C2 already paid for in `2aa3ae99` rather than writing a second
copy of it.

### The feature design sittings slot ahead of the template queue (Geoff delegated, 2026-08-03)

Twice deferred, settled here because it was blocking nothing and costing a STATUS carry-forward
every pass. The batched F1 plus F4 design sitting runs immediately after phase P, ahead of every
template-queue item.

The deciding argument is a dependency, not a priority. The scaffolder emits from the engine's
public surface, and the F sitting is what puts `createPreviewRoute`, `historyLoad`, and
`revertAction` on that surface, so running template items first delays the F sitting without
advancing the scaffolder. Beneath that: F1 and F4 gate the public beta and nothing in the template
queue does, and Fable's scarce weekly allocation should buy the most ambiguous artifact available,
which is a two-feature substrate where history, revert, and preview share one ref-and-token model.

Two template items dissolve rather than queue:

- The **optical-centering ratchet** is mechanically detectable, so it belongs in `cairn-audit` under
  the engine-level UI mechanics rule, not in a sitting. It rides the next pass that touches the
  chassis.
- The **cairn.pub voice sitting** folds into the cairn.pub migration, which already opens that repo
  and already owes the live admin smoke.

The **ASC Assets trial** runs in ASC's own repo on its own clock and never competed for this slot.
**Topo and the scaffolder** stay last, unchanged.

Task F carries this into STATUS and drops the carry-forward.

### Out of scope, confirmed

**ASC's seam 2 needs nothing from this pass.** The consumer brief asks for "a composable
action-wrapper factory on the extension surface, taking the site's access map, a binding resolver,
and an optional rate limit." C2's R9 shipped exactly that as `createSectionAction`
(`SectionActionConfig.resolveDb`, `SectionActionConfig.rateLimit`, `locals.cairnAccess`, the audited
denial, the injected `db`). The seam is served; what ASC needs is the migration, not new engine
surface. Recorded here so a later pass does not build it twice.

## Global constraints

- One worktree, one PR, no version bump, no publish. Entries go under the EXISTING `## Unreleased`
  window, appended to C2's assembled `Consumers must:` list.
- **The gate list is derived from `.github/workflows/test.yml`, never restated from memory.** C2's
  own plan named six gates while CI ran nineteen, and the branch was red on a gate no task ran from
  Task 6 to close-out. Every dispatch in this pass carries the derived list and reports each gate by
  name.
- Per task: `npm run check` ending `0 ERRORS 0 WARNINGS`, `npm test` exit 0 (unpiped, or read
  `PIPESTATUS`), then `check:package`, `check:reference`, `check:reference:signatures`,
  `check:surface`, `check:custom-surface`, `check:chassis-boundary`, `check:cm-internals`,
  `check:invisible-craft`, `check:admin-css-classes`, `check:readiness`, `check:docs`,
  `check:arm-indexes`, `check:snippets`, `check:prose`, `check:version`, `check:dev-package`,
  `check:comments`.
- `check:surface` must show no drift. This pass adds no public export; drift means a leak to fix,
  not a snapshot to regenerate.
- Worktree gotchas apply: edits target the worktree path, and `examples/showcase` needs its own
  install before any e2e run there is believed.
- TSDoc via `ts-conventions`/`svelte-conventions`, no em dash in code comments, Google register on
  published docs pages.

## Tasks

Six dispatches. Stated up front because the pass-sizing rule wants the count visible at the start:
this is the written scope of Task 12 plus the one routed follow-up, measured honestly, not scope
that accreted after dispatch.

### Task A: close the `requireAccess` target asymmetry

**Deliverables (3):** the route-id normalizer extracted to a shared internal home; `requireAccess`'s
default derived from `event.route.id` with regression tests for the route-group case; the docs and
changelog increment.

**Acceptance:** a non-owner mapped role reaches a `/admin/(app)/roster` route against a map keyed
`/admin/roster`; a pathname that would match a permissive rule the route id would not is denied; a
null route id fails closed; `check:surface` shows no drift.

### Task B1: `commitFailure` returns instead of bouncing

**Files:** `commit-log.ts`, `content-routes-context.ts`, the nine `commitFailure` call sites in
`content-routes-core.ts` and `content-routes-media.ts`, `nav-routes.ts`, and the tests pinning the
current redirect.

**Deliverables (2):** `commitFailure` returns an `ActionFailure` carrying the caller's own screen
failure shape instead of throwing a redirect, and its callers return it; the tests convert from
location-regex assertions to payload assertions.

**Acceptance:** no commit conflict produces a redirect; a conflicted save leaves the editor on the
page with the submitted body intact; a non-conflict error still rethrows unchanged; gate green.

### Task B2: `viewAction` loses the `scriptPosted` split

**Files:** `cairn-admin.ts`, its facade options type, `cairn-admin-actions.test.ts`.

**Deliverables (2):** the unexpected-failure redirect arm becomes `fail()`, retiring `scriptPosted`,
`carriesNewFlag`, and the request clone that supported them; the calm-copy tests hold on the one
remaining arm.

**Acceptance:** every action's unexpected failure answers in place; `new=1` handling is removed only
where the failure path used it, never where the success path still needs it; if the retired options
sat on a public type, a `Consumers must:` entry lands with the change. Gate green.

### Task C1: the three form-less screens

**Files:** `CairnAdmin.svelte`, `NavTree.svelte`, `CairnTidySettings.svelte`,
`VocabularyAdmin.svelte`, `content-routes-settings.ts`, `nav-routes.ts`.

**Deliverables (3):** the shell passes `form` to the three screens that lack it and each renders the
blend `ManageEditors` already uses; the settings, vocabulary, and nav validation bounces become
`fail()`; the tests follow.

**This closes a regression Task B1 opened.** Those three screens historically used a redirect
*because* they render no `form` prop, which `content-routes-settings.ts` documents at
`parseSiteConfigOrRedirect`. B1 converted their conflict path to `fail()` without the wiring, so a
conflict on nav, settings, or vocabulary currently reaches the editor through no channel at all. The
wiring is the fix and it is small: the shell already receives `form` and already passes it to five
other children.

**Acceptance:** a conflict and a validation refusal on each of the three screens renders to the
editor; `parseSiteConfigOrRedirect` is called only from actions (verified: `content-routes-settings.ts:257,376`),
so there is no load-redirect loop to design around; gate green.

### Task C2: the edit and list validation bounces

**Files:** `content-routes-core.ts` (`createAction`'s bounce, the save-validation bounces),
`ConceptList.svelte`, `EditPage.svelte`.

**Deliverables (2):** every same-route validation bounce becomes `fail()` with its screen's failure
shape; the tests convert from location assertions to payload assertions.

**Acceptance:** no same-route `?error=` redirect remains outside the three survivors; both components
already receive `form`, so no shell wiring is needed here; gate green.

### Task D: the bounded code channel for the three survivors

**Files:** a new internal `refusal-codes.ts`, `content-routes-core.ts` (publish-all, `indexLoad`),
`auth-routes.ts`, and the seven loads that read `?error=`.

**Deliverables (3):** the `RefusalCode` union and its resolver; every surviving producer emits a code;
every load resolves server-side and drops unknown values.

**Acceptance:** **no load returns a query-derived string.** A crafted `?error=<sentence>` renders
nothing at all, proven by a test per reading load. `indexLoad`'s relay forwards only known codes.
Gate green.

### Task E: precise `ActionFailure<...>` annotations

**Files:** `content-routes-core.ts`, `-media.ts`, `-tidy.ts`, `-dictionary.ts`.

**Deliverables (1):** all 24 `ReturnType<typeof fail>` annotations become
`ActionFailure<...>` of the shape that site actually produces, and the `| never` arms that Tasks B
and C emptied are removed.

**Acceptance:** a spot-proof in the report that the showcase's generated `ActionData` is a usable
union and `form?.error` typechecks against it; gate green.

### Task F: docs, the security record, and the changelog

**Files:** `docs/reference/sveltekit.md` (the "Refusal channels" section at `:310` and the two
built-in-channel paragraphs at `:352`), `docs/explanation/security-model.md`,
`docs/guides/upgrade-cairn.md`, `CHANGELOG.md`, `ROADMAP.md`, `docs/STATUS.md`.

**Deliverables (4):** the reference's refusal model rewritten to what the code now does; the
security-model page records the closed phishing surface; the changelog and upgrade-guide entries
appended to C2's window; the roadmap and status updated.

**Acceptance:** Vale clean on touched published pages; `check:docs`, `check:snippets`,
`check:arm-indexes` green; no doc still describes the query channel as prose-carrying.

## Execution record (2026-08-03)

Eight dispatches landed on `c2b-refusal-channel`, branched off `main` at `8559f3e7`. Every one
cleared its gate before the next was dispatched.

| Task | Commit | What landed |
|---|---|---|
| A | `2dfa1ac0` | `requireAccess` derives its default target from `route.id`; `targetFromRouteId` moved to `auth/access.ts`, shared, still internal |
| B1 | `88b206f3` | `commitFailure` returns a typed `fail(409)` instead of throwing a redirect; twelve call sites |
| C1 | `664153b4` | `form` wired to nav, settings, vocabulary; their bounces converted; closed the regression B1 opened |
| C2 | `9890ab8a` | create and save validation bounces converted; `CreateFailure` added |
| B2 | `7a10c40e` | `viewAction`'s `scriptPosted` split collapsed onto `fail(500)`; the request clone retired |
| D | `ac5b3e08` | `RefusalCode` union and resolver; six orphaned readers and their data fields removed |
| E | `64b8b218` | all 29 `ReturnType<typeof fail>` sites given precise `ActionFailure<T>`; four internal failure types exported per R4 |
| G | `e5191ef8` | `TidyResult.usage` renamed to `tokens`; type-level `AwaitedActions` gate; showcase check made explicit in CI |

**Verified by the orchestrator, not only reported:** the only raw `?error=` reads left are the auth
pair, which both components consume as a boolean with fixed literal copy; the two surviving
`{data.error}` interpolations are server-authored listing failures, not query-derived;
`check:consumers` green (`585 FILES 0 ERRORS 0 WARNINGS`, `check:dev-package OK`, exit 0).

### The orchestrator's own gate-list error, recorded because it is the pass's most useful lesson

**The dispatch gate list omitted `check:consumers`.** It was derived from `.github/workflows/test.yml`
and then restated from memory across all eight dispatches, dropping one gate. That gate already runs
the showcase's `svelte-check`, added by an earlier pass to close exactly this hole. Because no
dispatch ran it, Task E's `ActionData` collision survived to a human read instead of failing at the
first task that touched it.

This is the same species C2's post-mortem named one pass earlier, committed by the orchestrator
rather than by a plan. **The instruction that follows: paste the gate list from `test.yml` at
dispatch time; do not retype it.** The list is `check`, `test`, then `check:package`,
`check:reference`, `check:reference:signatures`, `check:surface`, `check:custom-surface`,
`check:chassis-boundary`, `check:cm-internals`, `check:invisible-craft`, `check:admin-css-classes`,
`check:readiness`, `check:docs`, `check:arm-indexes`, `check:snippets`, `check:prose`,
`check:version`, `check:dev-package`, **`check:consumers`**, `check:comments`, plus the showcase's
own `npm --prefix examples/showcase run check`.

### Remaining, in order

1. **Task F**, the docs, changelog, and STATUS task, unstarted. Its `Consumers must:` inventory is
   below; every earlier task deliberately deferred its entry rather than writing it.
2. **`web-auth-security-reviewer`**, mandatory. This pass changed an authorization derivation and
   closed a confirmed phishing surface.
3. **A main-loop read** of a failing save and a bounced navigation rendering, per Task 12's own
   acceptance criterion. Not delegable to the context that built it.
4. **Close-out**: `code-simplifier` over the changed code, full gate including `check:consumers`,
   commit, merge decision. Holds unpublished.

### The `Consumers must:` inventory Task F owes

Collected across tasks, none of them written yet:

- `requireAccess` target rekey (Task A wrote its own entry already; verify rather than duplicate).
- Return types widening off `Promise<never>`: `settingsSaveAction`, `vocabularySaveAction`,
  `navSaveAction`, `createAction`, and the four facade actions `confirm`, `logout`, `discard`,
  `publishAll`.
- A failed discard, confirm, logout, or publish-all now answers in place instead of navigating.
  Behavior change, no consumer action, but it needs an entry saying so.
- New exports: `CreateFailure`, `MediaUploadFailure`, `NavSaveFailure`, `SettingsSaveFailure`,
  `VocabularySaveFailure`. Additive.
- Six removed data fields: `EditData.error`, `EditorsData.error`, `NavLoadData.error`,
  `SettingsData.error`, `VocabularyLoadData.error`, `MediaLibraryData.flashError`.
- `TidyResult.usage` renamed to `tokens` (Task G wrote its own entry; verify).

Task F also rewrites `docs/reference/sveltekit.md`'s "Refusal channels" section and the
built-in-channel paragraphs that still describe the query channel as prose-carrying, and records the
closed phishing surface in `docs/explanation/security-model.md`.

## Acceptance for the pass

- Every task's criteria met, with the full derived gate list green and each gate reported by name.
- `web-auth-security-reviewer` folded. This pass changes authorization derivation and closes a
  confirmed phishing surface, so it is mandatory.
- A full-page render of a failing save and of a bounced navigation read in the main loop.
- Holds unpublished in the shared `## Unreleased` window.

---

## Post-mortem (2026-08-03)

**Shipped.** Thirteen commits on `c2b-refusal-channel`, off `main` at `8559f3e7`. Nine implementer
dispatches (A, B1, C1, C2, B2, D, E, G, F) plus a review fold, a simplifier pass, and two
orchestrator commits. Holds unpublished; the branch is not merged and not pushed.

The admin refusal channel now has one rule. A refusal that answers the route the form posted to
returns `fail()` with a precise `ActionFailure<T>`, rendered from the component's `form` prop. A
refusal that genuinely navigates carries a bounded internal `RefusalCode` the load resolves to engine
copy, dropping anything unrecognized. Twelve of the fifteen original `?error=` producers became the
first kind; three survive as the second.

**Verified independently by the orchestrator, not merely reported.** `npm run check` 1559 files 0/0;
`npm test` exit 0 at 4768 tests; `check:consumers` OK, which covers the showcase `svelte-check` (585
files 0/0) and the dev package. The four acceptance greps quoted in the execution record above.

**The visual read, which found what nothing else did.** Three full-page renders read in the main
loop. A failing save refuses in place with the body intact and never gains a `?error=`. A known code
resolves to engine copy. A crafted phishing sentence renders nothing at all, absent from the page
entirely. The read also surfaced that a refused save preserves the body and discards frontmatter
field edits, filed to the friction log: `SaveFailure` carries only `body`, so a retitle lost to a
taxonomy failure still disappears. No gate and no reviewer reached that; it needed eyes on a render.

### What the review gate bought

Four confirmed findings, each fixed with a regression test in `7c6da422`. Two justify the whole
exercise:

1. **An authorization bypass under the derivation Task A had just changed.** `matchHrefKey`'s
   deepest-prefix matching cannot literally match a route id's dynamic segment (`[id]`, `[...rest]`)
   against a deeper concrete map key, so it fell back to a shallower and more permissive key instead
   of refusing. The pass touched the code immediately above this and did not see it.
2. **A data-loss regression the pass itself introduced.** On a new entry the first failed save 404'd
   and lost the draft: `EditPage`'s form has no `use:enhance`, and a browser resolves `action="?/save"`
   by replacing the whole query per RFC 3986 section 5.3, dropping `?new=1`. That never mattered while
   refusals redirected away. The moment they answered in place, the re-render hit a URL missing the
   flag. This is the characteristic hazard of a convergence pass: the second-order consequence lands
   in a file the diff never touched.

Also fixed: logout leaving both the session row and the cookie valid on a D1 fault, and media
conflict refusals having no rendering path.

### The lesson, and it is the orchestrator's

**The dispatch gate list omitted `check:consumers`.** It was derived correctly from
`.github/workflows/test.yml` once, then restated from memory across nine dispatches with one gate
missing. That gate already runs the showcase `svelte-check`, added by an earlier pass to close
exactly this hole. Because no dispatch ran it, a real consumer-facing `ActionData` type collision
survived to Task E's self-review instead of failing at Task B1, and the orchestrator then told the
user, wrongly, that no CI gate covered it.

C2's post-mortem, one pass earlier, named this species and prescribed the fix: derive a gate list
from the workflow file rather than restating it. The prescription was followed once and then
abandoned mid-pass. **Deriving is not a one-time act; the derived list has to be pasted into each
dispatch, never retyped.** The close-out workflow did paste it, and it held.

### Budgets

Roughly 4.1M subagent tokens plus the main loop, dominated by nine implementer dispatches averaging
~250k each and a 1.4M seven-agent close-out workflow. The pass ran to nine dispatches against Task
12's four written deliverables, with two task splits (B into B1/B2, C into C1/C2), both taken at
dispatch time from measurement rather than mid-flight from a task bursting. Splitting the pass was
considered and refused on the record: no cut point left the branch coherent, since the intermediate
states were regressions rather than merely incomplete.

Human interaction points were high but mostly not defects. One was a genuine correction: the
no-default-posture ruling was drafted as a required config field that would fail a build, and Geoff
corrected the target from forcing to informing. That correction was right and the evidence agreed
with him, since a required field would not have caught the incident that prompted it.

### Carried

- The branch is unmerged and unpushed, holding in the same `## Unreleased` window as C2.
- The refused-save field-reseed gap (friction log).
- `CairnAdmin`'s `form` prop models only failures while SvelteKit passes success payloads too; the
  `TidyResult.usage` rename fixed today's collision, not the shape (friction log).
- Two initiatives scoped during this pass and sequenced ahead of the site migrations: the
  ambient-defaults audit, then the AI-posture pass. Evidence in
  `docs/internal/2026-08-03-ai-crawler-posture-research.md`; comparables for 22 tools in this
  session's scratchpad, to be moved into `docs/internal/`.
- The runaway guard's thresholds are miscalibrated for this repo: thirty alarms, all false, because a
  single implementer legitimately runs forty minutes on `npm test` and accumulates a large transcript.
