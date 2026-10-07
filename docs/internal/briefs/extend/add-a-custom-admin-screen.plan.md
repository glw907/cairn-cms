# Page plan: Add a custom admin screen

Page: `docs/extend/add-a-custom-admin-screen.md`. Brief: `docs/internal/briefs/extend/add-a-custom-admin-screen.json`.
Page type: task guide. Status: committed page under rework (plan task 7b resolution, from this plan).
Written 2026-10-03 by the plan step of the docs page chain; revised once the same day on the
structural edit's round-1 findings, revised again (resolution run 2) on the second plan read's
three blocking findings, and revised a third time on the third plan read's one blocking and one
advisory finding, each round disposed under its own heading below.

Inputs read: the outline entry in `docs/internal/outlines/extend.json`; the page anatomies and the
developer drafting brief in `docs/internal/docs-register.md`; this page's entries in
`docs/superpowers/research/2026-09-30-draft-docs-2a-pilot-job-read.md`,
`docs/superpowers/research/2026-10-01-draft-docs-2a-rework-record.md` (round-2 findings and
conflicts 1 to 3), and `docs/superpowers/research/2026-10-03-draft-docs-2a-resolution-run-record.md`
(both plan reads of run `wf_fe61a650-884`);
`docs/superpowers/research/2026-10-01-draft-docs-2a-page-plan-diagnosis.md`;
every fact bullet named below in `docs/internal/facts/`; the reference entries each subordination
names; the two exemplars; the example site's signups route (`examples/showcase/src/routes/admin/signups/`);
`src/lib/admin-toolkit/ExpandableRow.svelte` for the controlled-row contract.

Headings in this plan are the page's headings, verbatim. A claim inventory `section` names one of
them. The introduction is the untitled text under the H1 and is named `Introduction` here.

## What the page argues

A custom admin screen is an ordinary SvelteKit route that the engine treats as one of its own
screens, provided the site does for it what the engine does for its own screens. Four things: put
it where the admin layout renders it (the shell), check the access map on the read and on every
write (the gate), record every write (the audit), and build it in the admin's idiom so the admin
audit measures it the same way (the design language, verified by `cairn-audit`). The page's job
sentence names exactly those four outcomes, so the page's spine is the four, in the order a
developer builds them: route, gate, audit, markup. One running example, the signups screen every
scaffolded site carries, runs the whole spine, the Django exemplar's shape. The spine has one
deliberate aside: the toolkit section shows a smaller, toolkit-only Events screen beside the running
example, because the only shell-hosted reproduction story transcribes that snippet, and the section
marks the aside so a reader never takes it for a second screen to build (the reason is recorded
under Compose the screen from the toolkit).

The order argues itself from dependencies. A screen cannot be gated until it has a route. The
action wrapper has to be chosen before the actions are written, so the choice sits between the
read-side gate and the write-side wrapping, which disposes the job read's complaint that the
choice came after the reader had been told the answer. Gate it therefore carries the read-side step
alone and names the wrapper only as the next section's choice, and the only wrapping step is in
Wrap the actions. The nested-route actions (`requireAccess` in the nested route's own server file,
and its own map entry) sit where the reader first creates a nested route, the detail endpoint in
Load row detail on demand; Gate it states the inheritance fact as explanation, so no step arrives
before the reader has a thing to apply it to. The audit sink is wired after the wrapper,
because the wrapper is what emits the records the sink persists. Markup follows the server side,
and within markup the toolkit comes before styling (what to build with, then how its classes
compile), then the two optional recipes (dialog form, lazy row detail), each a numbered procedure
whose rules hang on the step they constrain, then motion, which is a constraint on markup the
audit enforces. Verify closes the task; the failure path and the see-also close the page, per the
anatomy.

The committed page carried every fact at the same weight. This plan ranks them: a fact that the
reader acts on or verifies inside this task stays on the page in one sentence; a prop catalogue, a
rule catalogue, or a behavior the reader would read at the component's entry when they reach for
it is subordinated to the named reference entry; a vendor specific is linked, never copied
(register, "A vendor's specifics get a link"). The conductor's 2026-10-01 rulings govern: covers
items 10 and 11 are disposed below by subordination with the entry that states each named; the
motion section takes links to the cairn-audit reference headings and no rule catalogue; a task
heading heads a section with a step, and an exposition section takes a noun-phrase heading.

Heading slugs that other pages depend on: `docs/extend/theme-your-public-site.md` links
`#style-the-screen`, so that heading stays `Style the screen`. The outline suggests `Gate it` and
`Wire the AuditSink` so a restored reference link can reuse the old slugs; no page in
`docs/reference/` links either slug today, and the plan uses both headings as suggested.

## Introduction

No heading. No one-line imperative contract; opens on the boundary and the seam. Citations live in the page's brief JSON.

1. Para 1: cairn manages markdown content and the admin frame, leaves site data and domain logic to the developer; the seam in the admin is the custom admin screen (route under `src/routes/admin/` resolved ahead of the `[...path]` catch-all, can adopt the admin toolkit); use it for non-markdown data such as D1 rows (`APP_DB`); another kind of markdown content is a concept in the adapter instead (Define an adapter and schema).
2. Para 2: what the route location gives (shell frame, same sign-in guard) and what the screen must do itself (guard gates the subtree only, so screen checks the access map on read and every write; git never sees D1 writes, so audit trail rows record them; `cairn-audit` covers `src/routes/admin`); closing sentence states what the steps build.
3. Para 3: the signups screen (written into every scaffolded site, also in `examples/showcase`) as the worked example; dialog-form, row-detail and animation sections apply conditionally; prior knowledge (SvelteKit form actions and hooks, Svelte snippets and runes).
4. Para 4: wrong-place routing (Restrict admin access, Arrange the admin sidebar) and pointer to See also for access-map reasoning, audit configuration, media upload protocol.

Superseded 2026-10-04 by Geoff's intro ruling (framing and reader-first intros, never an imperative opening); see docs/internal/briefs/extend/add-a-custom-admin-screen.framing.md.

## Sections, in order

Each section states its heading, the one sentence a reader takes from it (the section's first
sentence on the page, decided here), the facts it draws on, what the drafter puts in it, and its
hand-off. The first sentence may be re-worded to the register's voice; its claim is fixed.

### Before you begin

First sentence: The steps assume a scaffolded site with an access-map rule for the screen, a D1
binding for the screen's data, and a prepared audit database.

Facts: `f:guiavc`, `f:3lbdl6` (cited again here as the precondition's reason; placed under Gate
it, which holds its disposition), `f:onqm6k`,
`f:b8rkq9`, `f:qtm9y2`.

Content. Preconditions as a bulleted list, each with a link to what produces it (anatomy item 2):
a scaffolded site with its `cairn-audit.config.json` naming both compiled admin sheets
(`f:guiavc`; a hand-built site reads `add-cairn-to-a-sveltekit-app`); an access-map rule for the
screen's route, since a route the map has no rule for refuses every session, owner included
(`f:3lbdl6`; produced by `restrict-admin-access`); a D1 binding for the screen's data, the
scaffold's `APP_DB`, whose `signups` table exists only after `migrations-app/0000_signups.sql` is
applied (`f:onqm6k`; Cloudflare's D1 Workers binding documentation); a D1 database for the audit
trail prepared as the `createD1AuditSink` entry in `docs/reference/sveltekit.md` describes.

Then the file tree first, the Django exemplar's device: the `text` block of `src/` showing
`hooks.server.ts`, `admin.css`, and `routes/admin/` with `+layout.server.ts`, `+layout.svelte`,
`[...path]/` (its two files), and `signups/` (its two files). One sentence before it: the scaffold
writes the admin layout pair and the catch-all pair (`f:b8rkq9`, `f:qtm9y2` for the directory
listing), and `signups/` is already a custom screen beside the catch-all, so a new screen adds one
more directory beside it (`f:onqm6k`). The tree is a code block, not a figure.

Hand-off: the next section places the new directory.

### Place the route

First sentence: A route directory under `src/routes/admin/` is the whole registration, since
SvelteKit resolves it ahead of the `[...path]` catch-all and the shared layout renders it inside
`CairnAdminShell`.

Facts: `f:03zj56`, `f:brfitv`, `f:g7zuji`, `f:qz4gj2`.

Content. Two steps: in `src/routes/admin/`, create a directory named for the screen; in it, create
`+page.server.ts` for the load and actions and `+page.svelte` for the markup. Then what the shell
gives and withholds, in two sentences: every `/admin/**` route renders as the shell's children
with the nav, user, and theme and no registration (`f:brfitv`); the shell's favicon and sidebar
brand mark are fixed to the cairn glyph and wordmark, and `siteName` is the only site identity it
shows (`f:qz4gj2`, covers item 13; no reference entry states it, friction already filed
2026-09-30). Then the root layout rule: it renders no visible chrome around `/admin`, since a
header, footer, or width cap stops the shell filling the viewport, and a dev-only check logs one
console error for the width-cap case and never throws or changes rendering (`f:g7zuji`).

Hand-off: listing the screen in the sidebar is `arrange-the-admin-sidebar`'s task, one sentence.

### Gate it

First sentence: The screen enforces the access map itself, with `requireAccess` in its `load` and
an access-checking wrapper around every action, because the auth guard admits the session to
`/admin` and decides nothing per route.

Facts: `f:2sd4if`, `f:10ojk8`, `f:3lbdl6`, `f:lmtfkt` (placed here as explanation; cited again
where its two actions land, Load row detail on demand), `f:chsstm`. Subordinated from here:
`f:4q8kin` (the three ordered gates) to `docs/reference/sveltekit.md`, `createSectionAction`
check order, linked in the sentence that names the fail-closed predicate.

Content. Three sentences of why before the step: the guard covers the subtree and decides
nothing per route (`f:2sd4if`); `requireAccess` and `createSectionAction` share one fail-closed
predicate, so a session the map does not admit is refused on the read and on the write
(`f:10ojk8`), and a route the map has no rule for refuses every session, owner included
(`f:3lbdl6`); an action needs its own check because SvelteKit dispatches a matched form action
without re-running `load`, and a hand-rolled action that skips it admits any signed-in session and
records nothing (`f:chsstm`). The procedure is one step, so it is a single bulleted item (anatomy
item 3): in the screen's `+page.server.ts`, call `requireAccess` in `load` before it reads
anything. The signups `load` snippet follows (the example site's file, its `load` and
`requireAppDb`, which reads `env.APP_DB` from `cloudflare:workers` and fails closed with a 500 on
an absent binding, `f:onqm6k`). After the snippet, the
nested-route fact as
one sentence of explanation, never a step, since the reader has no nested route yet: a route
nested under the screen inherits the guard and never the page's own rule, so a detail endpoint
calls `requireAccess` in its own server file and takes its own access-map entry (`f:lmtfkt`); the
two actions are steps of Load row detail on demand, where the reader first creates one, and this
sentence points there. The ordered gates themselves are not listed; the sentence on the predicate
links the `createSectionAction` entry for them. The section closes on one sentence, not a step: an
action gets its access check from a wrapper, and the next section chooses it. No wrapping step
appears here; Wrap the actions holds the only one.

Hand-off: the closing sentence is the hand-off; the wrapper is chosen next.

### Choose the action wrapper

First sentence: A screen whose actions write through a database binding wraps them in
`createSectionAction`, and a screen with no binding uses `createAdminAction` with its `access`
option set.

Facts: `f:hroqbu`, `f:xbjxit`, `f:bcybve`.

Content. The choice as a one-step bulleted procedure, then a four-row table introduced by a
complete sentence, one fact per row: checks the access map (every call; only when `access` is set,
`f:xbjxit`); refuses a session (`fail(403)`, so the form keeps the editor's input; throws
`error(403)` to the nearest error page, `f:xbjxit`); needs a binding (`resolveDb` required; none,
`f:hroqbu`); records a denial (under the call site's `action` and `entity`, `f:xbjxit`'s
`auth.access.refused` log with `f:bcybve`'s `access.target`, a map key never a request pathname;
as action `deny` on entity `admin-action`, `f:bcybve`). `deniedMessage` replaces
`createSectionAction`'s 403 copy and `createAdminAction`'s is fixed (`f:xbjxit`), one sentence
after the table. Close on the decision for the example: the signups screen writes through
`APP_DB`, so the rest of the page uses `createSectionAction`. The committed page's six-row table
shrinks to these four; the dropped rows are the subordinated `f:4q8kin` and the default-target
derivation, which the `createSectionAction` entry states.

Hand-off: the next section builds the wrapper.

### Wrap the actions

First sentence: One `createSectionAction` call builds the section's wrapper, and each form action
passes its handler and its audited `action` and `entity` to that wrapper.

Facts: `f:3j02dk`, `f:esp93u`, `f:n52h8f`, `f:pmmtdv`, `f:lblh3u`, `f:pyt58u`.

Content. The `Env` paragraph before the steps, since the snippet depends on it: `Env` is a type
parameter for the site's platform bindings, the engine ships no `Env` type, `resolveDb` receives
`Env | undefined`, and the example passes the `Env` that `wrangler types` generates in
`worker-configuration.d.ts` (`f:esp93u`, `f:n52h8f`); `Env` does not infer
from an unannotated `resolveDb` parameter, so the site annotates it or passes explicit type
arguments (`f:pmmtdv`). Steps: (1) in the screen's server file, build one wrapper with
`createSectionAction`, passing a `resolveDb` that reads the section's binding (`f:3j02dk`); (2) in
the exported actions, wrap each handler in that wrapper, passing its `action` and `entity`; (3) on
the destructive action, add `ownerOnly: true`. The example site's `actions` snippet (with its
`snippet-check-skip` comment for the generated `Env`). After it, the handler shape in one
sentence: each handler receives `{ form, ctx }`, writes through `ctx.db`, and calls `ctx.audit`
with a `detail` or an `entityId` (`f:pyt58u`); and the layering in one: the wrapper runs
`createAdminAction`'s editor, CSRF, and single form-read work underneath, so a section never calls
`createAdminAction` directly (`f:lblh3u`). The audit requirement itself (a handler that returns
without `ctx.audit`) is stated once, under Resolve a missing audit record; a sentence here may
point there.

Hand-off: `ctx.audit` persists nothing until a sink is wired.

### Wire the AuditSink

First sentence: `ctx.audit` persists a record only when `hooks.server.ts` sets an audit sink on
`event.locals.cairnAuditSink`, composed with the auth guard through `sequence`.

Facts: `f:68h31z`, `f:rurhey`, `f:6quvqm`, `f:i8pbhc`, `f:ph6kjg`, `f:ff3l1u`, `f:da6d2z`. Subordinated from
here: `f:hafpqf` (the `rateLimit` option's members and degrade-to-open) to
`docs/reference/sveltekit.md`, `createSectionAction` check order item 2 and the
`SectionActionConfig` type row.

Content. Why in two sentences: the sink is typically `createD1AuditSink` over a bound D1 database
(`f:68h31z`); `hooks.server.ts` holds one `handle` export, so the sink's handle composes with the
guard through `sequence()`, and because it only sets a `locals` field the route reads it works
placed after `createAuthGuard` (`f:rurhey`, `f:6quvqm`). Steps: (1) in `hooks.server.ts`, add a
handle that sets `event.locals.cairnAuditSink`; (2) in the same file, compose it after
`createAuthGuard` through `sequence`. The `hooks.server.ts` snippet (the committed one, with
`snippet-check-skip`). Then the behaviors the snippet encodes: the handle checks `building` from
`$app/env` before it reads `env.AUDIT_DB`, because every `cloudflare:workers` `env` read throws
while the build prerenders (`f:i8pbhc`); the handle passes the `waitUntil` that
`cloudflare:workers` exports and binds nothing, while a caller holding an `ExecutionContext` (a
Cron `scheduled` handler) binds `ctx.waitUntil` first, because the unbound method typechecks and
throws `Illegal invocation` in workerd, after which the row can be lost (`f:ph6kjg`); the sink
returns before the insert settles and logs a rejected insert, so a failed insert never fails the audited action (`f:ff3l1u`). Close
on the rate-limit hand-off: the wrapper records every refusal it makes except the 429, and the
session and CSRF refusals underneath leave none, so a refused caller fills a persisted table
cheaply unless the section sets `rateLimit` (`f:da6d2z`), whose members and degrade-to-open
behavior the `createSectionAction` entry states. No rate-limit subsection; the committed page's
`Rate-limit the section` is folded into this hand-off.

Hand-off: the server side is complete; the markup follows.

### Compose the screen from the toolkit

First sentence: The screen's markup composes the admin toolkit's primitives, the same set the
engine's screens compose, in place of a hand-rolled table, list, or field.

Facts: `f:5t1i7o`, `f:clyg9r` (scoped: the jobs of the three primitives the example uses, the
rest by link), `f:8x0qpa`, `f:mfa5vi`, `f:asujoi` (re-disposed to carried; covers item 5 names
the graduation rule), `f:7m5o61`. Subordinated from here: `f:7ik6ng` (the full export list) to
`docs/reference/admin-toolkit.md`; `f:pb0vh9` (`AdminTable` density and zebra, `EmptyState`
headingLevel, `Pagination` range line and size select) to the `AdminTable`, `EmptyState`, and
`Pagination` entries of `docs/reference/admin-toolkit.md`; `f:pyfbqv` (`MediaPicker` entries and
selection) to its entry in `docs/reference/admin-toolkit.md`; `f:qkr057`, `f:qmhbgs`, `f:qk0l7p`
(covers item 11) to the `CairnAdminShell` and `EditPage` entries of `docs/reference/admin.md`.

Content. The one step, since this is a task section: in the screen's `+page.svelte`, import the
primitives the screen needs from `@glw907/cairn-cms/admin-toolkit`. The engine's screens compose
the same set, `ManageEditors` from `PageHeader` and `AdminTable` (`f:5t1i7o`). Then a
deliberately smaller example, placed after the signups server side the reader has already built:
the Events screen composing `PageHeader`, `AdminTable`, and `StatusChip` inside a card, kept
verbatim with `src/lib/reproductions/stories/CustomScreen.svelte`, whose comment requires
lockstep. It is the Sanity exemplar's minimal example with the exemplar's order inverted, since
here the typed example is the running one and has already run the server side, and the smaller
screen's job is to show the toolkit alone. The drafter opens it on one lead-in sentence that marks
the switch, such as "A smaller screen shows the toolkit alone", so a reader does not take Events
for a second screen they are meant to build; the committed page's lead-in ("separate from the
signups example") is the sentence to tighten. Name each of the three primitives' jobs in one
sentence (`f:clyg9r`). The figure, the `repro` fence for `toolkit/custom-screen`, directly after
the snippet, with alt and caption as committed; the outline's figure note asks for the signups
screen with its dialog, and the friction log already records that no such story exists
(2026-09-30, `f:pyt58u`), so the plan keeps the one shell-hosted story and the Events snippet it
transcribes. Then the wrapper rule: `AdminTable`
scrolls horizontally itself, so the wrapping `div` carries `overflow-hidden card-shell
card-shadow` and never `overflow-x-auto` (`f:8x0qpa`). Then the boundary in two sentences: the
toolkit admits general-purpose primitives only, so a component tied to one site's data stays in
the site's `src/lib/admin/` (`f:mfa5vi`), and a primitive graduates into the toolkit once it has a
second real consumer, as `ExpandableRow` did (`f:asujoi`). Then why it holds across upgrades: each
primitive ships its compiled classes and scoped styles with the package, so a later release still
renders it under the site's route with no change on the site's side (`f:7m5o61`).

Two hand-off sentences close the section and dispose covers items 10 and 11: the admin toolkit
reference lists every export with its props, the ones that change a primitive's behavior included
(a no-claim link sentence to `docs/reference/admin-toolkit.md`); the admin components reference
lists the engine's own components a screen can mount beside the toolkit, with each one's props (a
no-claim link sentence to `docs/reference/admin.md`). Neither sentence states a prop. The
committed `Mount an engine admin component` subsection is removed.

### Style the screen

First sentence: The screen's utility classes compile only through the site admin sheet,
`src/admin.css`, which a scaffolded site already builds, and the admin's design language reaches
the screen through stock daisyUI classes.

Facts: `f:k6aopn`, `f:vkfd7b`, `f:666eg6`, `f:zpi2ux`, `f:9rxw92`, `f:9oa6sk`, `f:2babfl`,
`f:39sn8c`, `f:gc0hx3`, `f:5stbq2`, `f:q4jyat`. Subordinated from here: `f:vs6k2k` (the
`admin-sources.css` import's body and the config `sheet` entry's separate artifact) to
`docs/reference/cairn-audit.md`, Configuration.

Content, in the order the round-2 register editor asked for: the scaffolded build first, then the
rules. The sheet: `src/admin.css` turns off automatic source detection, scans `./routes/admin` and
`./lib/admin` through `@source`, then imports `@glw907/cairn-cms/admin-sources.css`;
`build:admin-css` compiles it to `.cairn/admin.css`, which `src/routes/admin/+layout.svelte`
imports (`f:vkfd7b`); the `predev`, `prebuild`, and `precheck` scripts run that compile, so a
build needs no separate step (`f:666eg6`); the engine's packaged sheet scans only its own admin
sources and the toolkit, so a site's markup never feeds it (`f:zpi2ux`). Two numbered steps, one
action each, so the section's explanation hangs on a step instead of standing alone (anatomy:
explanation stays subordinate to the steps): (1) keep the screen's markup under
`src/routes/admin` or `src/lib/admin`, the roots the sheet scans; (2) for a corner, write
`rounded-selector`, `rounded-field`, or `rounded-box`, never a fixed Tailwind radius such as
`rounded-lg`, which compiles but does not follow the ladder (`f:2babfl`). Under step 1, the idiom:
the admin is daisyUI and Tailwind (`f:k6aopn`), and every daisyUI component and utility class
except calendar compiles into the admin sheet, so a screen uses any of them without a safelist
entry (`f:9rxw92`). Under step 2, the ladder those three classes render: both themes set daisyUI's
radius tokens as a three-step corner ladder (`f:9oa6sk`; name the three tokens), and
`cairn-audit`'s ratified norms measure the same ladder, 6px for buttons, inputs, and selects, 8px
for a card, 4px for a status chip, with control heights following `--size-field` (`f:39sn8c`; the
current bands, as the outline requires, never the former values, which stay in `migration-notes`
and off this page). Then the two stock-button looks in one sentence, the ladder's companions on a
control: a bare `btn` renders as a hairline
button, and a selected one (`.btn-active`, `aria-pressed="true"`, and the other selected forms)
renders as the neutral segment (`f:gc0hx3`, `f:5stbq2`). Then the status-text trap: warning or
success text uses `cairn-text-warning` and `cairn-text-success`, since the sheet does not compile
the bracketed `text-[var(--cairn-warning-ink)]` forms (`f:q4jyat`, covers item 12). The link to
Configuration in `docs/reference/cairn-audit.md` sits on the sheet paragraph for `f:vs6k2k`.

Hand-off: two optional recipes follow, then motion.

### Build the dialog form

First sentence: A form inside a native `<dialog>` survives every `enhance` result only when its
callback handles each of the four result types itself.

Facts: `f:jra92k`, `f:xgy3iu`, `f:9fwsz5`, `f:ho6dxa`, `f:tskfz1`, `f:tkqoia`, `f:5vn194`,
`f:wd78d2`. Cut
from here: `f:cdllbv` (vendor specific; see Dispositions).

Content. Open on the condition ("When a screen collects input in a native `<dialog>` submitted
with `enhance`"), the optional marker the job read asked for, then the first sentence's claim.
One sentence of why before the steps: `enhance` hands the callback one of four result types, and
SvelteKit's form actions documentation, linked, states what the default `update()` does with each
(`f:xgy3iu`; the vendor's specifics stay behind the link). Then the procedure, a numbered list of
seven steps, one action each, the location named first, with each rule hung under the step it
constrains (anatomy: explanation stays subordinate to the steps; the second plan read's finding 2):

1. In the screen's `+page.svelte`, add a `<dialog class="modal">` whose `aria-labelledby` points
   at its own heading. Under it: an element with the `dialog` role needs an accessible name, and
   the heading supplies one that does not depend on the body text (`f:tskfz1`).
2. In the handler of the button that opens it, call `showModal()`. Under it: a dialog opened this
   way closes on Escape without script (`f:ho6dxa`).
3. Inside the dialog, add the action form with `use:enhance`, as its own form element and never
   nested inside a `<form method="dialog">`. Under it: a `<form method="dialog">` is its own form,
   and nested forms are invalid HTML (`f:ho6dxa`).
4. In the `enhance` callback, handle each of the four result types, and never call `update()` on
   `'error'`. Under it, the four branches as a bulleted list of parallel conditions (`f:jra92k`):
   on `'failure'`, show the message in the dialog, then call `update()`, which for a same-page
   failure only updates `form` and the page status; on `'error'`, report it in the dialog without
   `update()`, because `update()` would call `applyAction`, which renders the nearest `+error`
   page and destroys the dialog (`f:9fwsz5`); on `'success'`, close the dialog before awaiting
   `update()`, so it never sits open through `refreshAll()`; on `'redirect'`, hand the result
   to `update()`.
5. In the form, mount an empty `role="alert"` paragraph for the failure message. Under it: a live
   region inserted with its text already present is announced unreliably, so the paragraph is
   mounted empty and filled on failure (`f:tkqoia`).
6. On the input, point `aria-describedby` at that paragraph and set `aria-invalid="true"` while
   its value is the failed one. Under it: the error is then read with its field when focus moves
   to the input (`f:5vn194`; the message is visible in the dialog, so the `sr-only` clause is not
   used).
7. On the submit button, set `disabled` while the request is pending, so it cannot fire the
   action a second time (`f:5vn194`).

The snippet after the steps: the committed page's create dialog, an "Add a signup" `<dialog
class="modal">` whose form posts to the running example's `?/create` action with `use:enhance`,
mounts `<CsrfField />` from `@glw907/cairn-cms/admin` as the example site's forms do, carries the
name and email inputs with the `aria-describedby` and `aria-invalid` wiring, the empty
`role="alert"` paragraph, the pending-disabled submit, and the four-branch callback. The create
dialog, not the example site's remove confirm, carries the snippet because steps 6 and 7 act on an
input and a pending submit, which a confirm dialog with one hidden field has no element for; the
running example supplies the action the form posts to and the `missing` token its handler returns.
`CsrfField` is in the code only; no fact in the inventory states it, so the page makes no prose
claim about it (friction filed 2026-10-03, see below). The snippet imports `SubmitFunction` from
`$app/forms` (`f:wd78d2`), in the code only. No attribute list follows the snippet; each
rule now hangs under its step.

Hand-off: the second recipe.

### Load row detail on demand

First sentence: When a screen's rows expand to show detail, the screen fetches each row's detail
as its panel opens and caches it per row, since a `load` that fetched every row's detail would pay
for all of them on every visit.

Facts: `f:uy7vyc`, `f:b5mcea`, `f:od9mww`, `f:vao0dd` (its `colspan` clause under step 4, its
`datum` clause under step 11), `f:n2bhjw`, `f:pswc3n`. Cited again:
`f:lmtfkt` (placed under Gate it; its two actions are steps here). Linked without a claim:
`docs/reference/admin-toolkit.md`, `ExpandableRow`, for the component's props (`expanded`,
`onToggle`, `datum`, `colspan`, `summary`, `panel`, `triggerLabel`), none of which a fact in the
inventory states; the entry's own example shows the handler wiring step 5 asks for.

Content. Open on the condition ("When a screen's rows expand to show detail"), the optional
marker, in the first sentence itself. Then the lead-in: streaming an unawaited promise from `load`
does not save the work, because the promise starts running when `load` creates it (`f:b5mcea`).
Then the procedure, a numbered list of eleven steps, one action each, the location named first,
server side first, then the markup, then the handler the markup connects, and last the panel that
shows the result, with the three `ExpandableRow` markup rules hung under the markup step as its
explanation (the second plan read's finding 3). The procedure ends on the observable result the
first sentence promises, a row that expands and shows its detail (the third plan read's finding):

1. Under the screen's directory, add the detail endpoint as a nested route that returns one row's
   detail as JSON.
2. In that route's server file, call `requireAccess`. Under it: a nested route inherits the guard
   and never the page's own rule (`f:lmtfkt`, cited again from Gate it).
3. In the site's access map, add an entry for the nested route, as `restrict-admin-access`
   describes.
4. In the screen's `+page.svelte`, render each row as an `ExpandableRow` inside the `AdminTable`,
   with the `ExpandableRow` entry in `docs/reference/admin-toolkit.md` linked for its props. Under
   it, the three markup rules as a bulleted list, each one a trap: the `colspan` the caller passes
   counts the trailing trigger cell the component adds, since the panel's one `<td>` spans it
   (`f:vao0dd`); the `header` snippet heads that trigger cell with a `<th scope="col">` holding an
   `sr-only` span, as the signups table does for its actions column (`f:n2bhjw`); an interactive
   summary cell wraps its content in `data-cairn-inert-cell`, since `ExpandableRow` ignores a row
   click inside it and the caller needs no `stopPropagation()` (`f:pswc3n`).
5. In the same file, write the open handler and connect it to each `ExpandableRow` as the
   `ExpandableRow` entry in `docs/reference/admin-toolkit.md` describes. No explanation hangs
   here and the step names no prop: the link carries the prop names and the entry's example shows
   the wiring, so the page claims nothing a fact in the inventory does not state.
6. In that handler, return the cached detail when the row already has one. Under it: fetching on
   open and caching per row costs only the rows a reader opens (`f:uy7vyc`).
7. Otherwise, in the same handler, call `fetch` for the row's detail inside a `try` block.
8. Inside the `try` block, check `response.ok`, since `fetch` resolves on an HTTP error status
   (`f:od9mww`).
9. In the same block, parse the body with `Response.json()`, which rejects on a body that is not
   JSON (`f:od9mww`).
10. Cache the detail only after the status check and the parse both succeed, so a failed row stays
    retryable (`f:od9mww`).
11. In the row's panel, render the cached detail. Under it: the panel snippet receives the row's
    own `datum`, so it reaches its row's detail without a closure over the row (`f:vao0dd`, its
    `datum` clause). The step carries the render clause only. No fact states what the panel shows
    while the fetch is pending or after it fails, so the page gives no failure display, and the
    hole is filed as friction below; a failed row's one stated behavior, that it stays retryable,
    hangs under step 10 where `f:od9mww` states it.

The short handler snippet after the steps, framed as illustrative, with the detail URL passed in,
as committed: it is the fetch-and-cache body of steps 6 to 10, and the wiring of step 5 stays in
the linked entry's example rather than in the snippet, so the snippet names no prop either. Which
`ExpandableRow` prop fires the open handler is the entry's to state, so steps 4 and 5 link it and
the page claims no prop; the hole (no fact states the controlled `expanded` and `onToggle`
contract) is filed as friction below.

Hand-off: motion.

### Animate the screen

First sentence: When a screen animates, `cairn-audit` holds its motion to the same rules as the
engine's screens, so each transition names its duration and easing with the admin's motion
tokens. (The "error-tier" qualifier is dropped: no carried fact states the motion rules' tier, per
the run-2 fact read.)

Facts: `f:017qss`, `f:018sgk`, `f:2p5otw`, `f:1x8r1x`, `f:24f8gn`, `f:t767qb`. Subordinated from
here: `f:09g8ev`, `f:0aa9tp`, `f:0mbj5n` (what each rule checks) to `docs/reference/cairn-audit.md`,
"The static rules". The conductor's ruling: links to the reference headings only, no rule
catalogue; the covers item's "citing admin-design-system by heading" cannot be met on a published
page because `docs/internal/admin-design-system.md` is internal, so the cairn-audit headings take
its place.

Content, the round-2 register editor's rewrite as the shape. The one step: in the screen's markup
or scoped `<style>` block, write each duration as a `--cairn-dur-*` `var()` and each easing as a
`--cairn-ease-*` `var()`, the closed set of five durations and three curves both theme roots
declare (`f:017qss`; name the token names, not a value table). A bare `transition-*` utility
already animates on `--cairn-dur-base` and `--cairn-ease-standard`, which both roots set as
Tailwind's defaults (`f:018sgk`). Under `prefers-reduced-motion: reduce` the admin collapses every
duration to `0.01ms`, and only a paint transition may opt back in (`f:2p5otw`). The three
admin-only rules, `motion-property`, `motion-vocabulary`, and `motion-hover-gate`, read a
component's scoped `<style>` block and what each class in its markup compiles to (`f:24f8gn`),
and only for components under `static.adminScope` and the `static.cssFiles` entries inside those
roots (`f:1x8r1x`); the scope defaults to `src/routes/admin`, `src/lib/admin`, and
`src/lib/admin-toolkit`, and a site whose screens live elsewhere names their roots under that key
(`f:t767qb`). Links, each named: "The static rules" for what each rule checks, "What the motion
rules don't cover" for the exemptions and the frame-offset allowance, and Configuration for
`static.adminScope`, all in `docs/reference/cairn-audit.md`. No token value table, no per-rule
bullets, no exemption list.

Hand-off: verification.

### Verify the screen

First sentence: The screen passes when it renders inside the shell, refuses a session the map does
not admit, leaves an audit row for each write, and clears `cairn-audit`'s error tier.

Facts: `f:326755`, `f:mrv24k`, `f:1md5oj`, `f:wnvqlz`, `f:6vy0ka`. Subordinated from here:
`f:0w432q` (`motion-reduced-delay`) to `docs/reference/cairn-audit.md`, "The rules" under Rendered
mode.

Content. Numbered checks, each with its observable result (anatomy item 4): (1) signed in as an
owner, open the screen under `/admin`; it renders as the shell's children with the nav, user, and
theme, and one diagnostic sentence rides this check for the most likely first failure: a 403 here
means the access map has no rule for the route, since a route with no rule refuses every session,
owner included (`f:3lbdl6`, cited again), so `restrict-admin-access` declares the rule and the
`auth.access.refused` row in `docs/reference/log-events.md` names the event to look for, with no
recovery prose beyond that sentence (the extend recovery surface's outline carries no row for this
event; friction filed, see below); (2) signed in as an editor whose role the screen's rule does
not name, open it again;
`requireAccess` refuses with a 403; (3) signed in as an owner, submit one of the screen's actions;
(4) in the audit database, query the `audit_log` table for its newest row (`f:wnvqlz`: one row per
audited action, actor, action, entity, entity_id, detail, ISO 8601 timestamp); its `action` and
`entity` match the wrapper's options unless the handler's `ctx.audit` call overrides them
(`f:6vy0ka`); (5) in the site directory, run `npm run check:cairn`, which compiles the site admin
sheet and runs `cairn-audit` over the whole static registry (`f:mrv24k`); (6) fix each
unsuppressed error-tier finding, since only such a finding makes the command exit 1 (`f:1md5oj`);
(7) run it again until none remains. After the list: the default scan scope names
`src/routes/admin` beside the engine's admin sources, so a custom screen meets the same static
rules as the engine's screens, and the scaffold's CI runs the same script (`f:326755`; `f:guiavc`
may be cited again). An advisory finding prints without changing the exit code; the tiers and exit
codes table in `docs/reference/cairn-audit.md` is linked. A bare run is static, and `--rendered`
drives a browser against a running server (`f:1md5oj`); `run-cairn-audit-on-your-site` sets up a
rendered run for a custom screen, and the rendered rules table states the advisory
`motion-reduced-delay` it adds. The norms bands moved to Style the screen; this section states no
band. Departure from covers item 14, recorded: the item says `npx cairn-audit`, and check 5 runs
`npm run check:cairn` instead, because that script compiles `.cairn/admin.css` first and runs
`cairn-audit` underneath (`f:mrv24k`), the audit config names that compiled sheet (`f:guiavc`),
and the scaffold's CI runs the same script (`f:326755`); the bare command is not named as a step.

Hand-off: the failure path.

### Resolve a missing audit record

First sentence: A missing audit record means a handler skipped `ctx.audit`, no handle set the sink,
or the sink's insert failed.

Facts: `f:07efts`. Cited again: `f:ff3l1u`, `f:ph6kjg`.

Content. Production logs `admin.action.unaudited` for a skipped call where dev throws
`UnauditedActionError`, since an error response mid-request would be worse than a gap in the trail
(`f:07efts`). Three ordered checks: (1) in the handler, every successful path calls `ctx.audit`
before it returns; (2) in `hooks.server.ts`, a handle sets `event.locals.cairnAuditSink`; (3) in
the logs, look for `audit.sink.write_failed`, whose reason `wait_until_failed` names an unbound
`waitUntil` (`f:ph6kjg`). Then the recovery surface, not restated: `docs/extend/debug-your-site.md`
maps `admin.action.unaudited` to its cause and, under its `audit.sink.call_failed` row, sends a
packaged-sink user on to `audit.sink.write_failed` (its outline's `f:r3l7eq`; that page carries no
`write_failed` row of its own), and `docs/reference/log-events.md` lists both events' fields and
the `write_failed` reasons (anatomy item 5). The 403 failure has no section here: its diagnostic
sentence rides Verify check 1, since the recovery surface carries no `auth.access.refused` row to
point at.

### See also

First sentence: The following pages cover the tasks and reasoning around a custom screen.

No facts. Seven bullets, one per page, each a complete sentence naming what the page does, and the
set matches the pages the introduction's closing sentence sends here (the second plan read's
finding 1): `restrict-admin-access` (declares the rule each screen and nested route needs),
`arrange-the-admin-sidebar` (adds the screen to the navigation), `run-cairn-audit-on-your-site`
(configures the audit site-wide, rendered runs, suppressions, allowlists), `security-model` (the
reasoning behind the access map), `configure-media` (sets up media storage and the upload
protocol, the outline's out-of-scope item for the media protocol; the link passes the docs link
gate as a pending link to an outline page), `define-an-adapter-and-schema` (declares a concept,
the alternative the introduction names), and the admin toolkit reference (each primitive's
props). The recovery link is not repeated here (anatomy item 6).

## Dispositions

Every fact id the task names, plus the five re-disposed ids and the one appended id. A
subordinated fact is a `cut` whose reason names the reference entry; the drafter's brief records
each reason verbatim under `cuts`.

| Fact | Disposition | Section, or reason |
|---|---|---|
| `f:9xthnq` | carried | Introduction |
| `f:6a32oy` | carried (appended) | Introduction |
| `f:guiavc` | carried | Before you begin |
| `f:onqm6k` | carried | Before you begin |
| `f:b8rkq9` | carried | Before you begin |
| `f:qtm9y2` | carried | Before you begin |
| `f:03zj56` | carried | Place the route |
| `f:brfitv` | carried | Place the route |
| `f:g7zuji` | carried | Place the route |
| `f:qz4gj2` | carried | Place the route |
| `f:2sd4if` | carried | Gate it |
| `f:10ojk8` | carried | Gate it |
| `f:3lbdl6` | carried | Gate it (cited again under Before you begin and Verify the screen) |
| `f:lmtfkt` | carried | Gate it, as explanation (its two actions are steps 2 and 3 of Load row detail on demand, which cites it again) |
| `f:chsstm` | carried | Gate it |
| `f:4q8kin` | cut | Subordinated: `docs/reference/sveltekit.md`, `createSectionAction` check order items 4 and 5 and `createAdminAction` step 3, state the three ordered gates; Gate it states the fail-closed predicate and links the entry |
| `f:hroqbu` | carried | Choose the action wrapper |
| `f:xbjxit` | carried | Choose the action wrapper |
| `f:bcybve` | carried | Choose the action wrapper |
| `f:3j02dk` | carried | Wrap the actions |
| `f:esp93u` | carried | Wrap the actions |
| `f:n52h8f` | carried (added in the Kit 3 correction) | Wrap the actions |
| `f:pmmtdv` | carried | Wrap the actions |
| `f:lblh3u` | carried | Wrap the actions |
| `f:pyt58u` | carried | Wrap the actions |
| `f:68h31z` | carried | Wire the AuditSink |
| `f:rurhey` | carried | Wire the AuditSink |
| `f:6quvqm` | carried | Wire the AuditSink |
| `f:i8pbhc` | carried (added in the Kit 3 correction) | Wire the AuditSink |
| `f:ph6kjg` | carried | Wire the AuditSink |
| `f:ff3l1u` | carried | Wire the AuditSink |
| `f:da6d2z` | carried | Wire the AuditSink |
| `f:hafpqf` | cut | Subordinated: `docs/reference/sveltekit.md`, `createSectionAction` check order item 2 and the `SectionActionConfig` type row, state the rate limit's three members, its order before the access checks, and its degrade-to-open; linked from Wire the AuditSink. The default 429 copy and the `redirect()`/`error()` carve-out are not stated there (friction filed) |
| `f:5t1i7o` | carried | Compose the screen from the toolkit |
| `f:clyg9r` | carried | Compose the screen from the toolkit |
| `f:8x0qpa` | carried | Compose the screen from the toolkit |
| `f:mfa5vi` | carried | Compose the screen from the toolkit |
| `f:asujoi` | carried (re-disposed) | Compose the screen from the toolkit |
| `f:7m5o61` | carried | Compose the screen from the toolkit |
| `f:7ik6ng` | cut | Subordinated: `docs/reference/admin-toolkit.md` lists every export as its own entries, linked from Compose the screen from the toolkit |
| `f:pb0vh9` | cut | Subordinated: `docs/reference/admin-toolkit.md` states each prop in its entry, `AdminTable` (density and zebra), `EmptyState` (headingLevel), and `Pagination` (the range line and page-size select), linked from Compose the screen from the toolkit; a prop catalogue is detail the entry holds |
| `f:pyfbqv` | cut | Subordinated: `docs/reference/admin-toolkit.md`, `MediaPicker`, states `entries` and `onselect` with `MediaSelection`, linked from Compose the screen from the toolkit |
| `f:qkr057` | cut | Subordinated: `docs/reference/admin.md`, `CairnAdminShell`, states `themeOverride`; a screen inside the shell never sets it, and Compose the screen from the toolkit links the entry |
| `f:qmhbgs` | cut | Subordinated: `docs/reference/admin.md`, `EditPage`, states `spellcheckOverride`, linked from Compose the screen from the toolkit |
| `f:qk0l7p` | cut | Subordinated: `docs/reference/admin.md`, `EditPage`, states that `form` carries a `ContentFormFailure`, linked from Compose the screen from the toolkit |
| `f:k6aopn` | carried | Style the screen |
| `f:vkfd7b` | carried | Style the screen |
| `f:666eg6` | carried | Style the screen |
| `f:zpi2ux` | carried | Style the screen |
| `f:9rxw92` | carried | Style the screen |
| `f:9oa6sk` | carried | Style the screen |
| `f:2babfl` | carried | Style the screen |
| `f:39sn8c` | carried | Style the screen |
| `f:gc0hx3` | carried | Style the screen |
| `f:5stbq2` | carried | Style the screen |
| `f:q4jyat` | carried | Style the screen |
| `f:vs6k2k` | cut | Subordinated: `docs/reference/cairn-audit.md`, Configuration, states the `admin-sources.css` import and that the `sheet` entry names a different artifact, linked from Style the screen |
| `f:jra92k` | carried | Build the dialog form |
| `f:xgy3iu` | carried | Build the dialog form |
| `f:9fwsz5` | carried | Build the dialog form |
| `f:ho6dxa` | carried | Build the dialog form |
| `f:tskfz1` | carried | Build the dialog form |
| `f:tkqoia` | carried | Build the dialog form |
| `f:5vn194` | carried | Build the dialog form |
| `f:wd78d2` | carried (added in the Kit 3 correction; code only) | Build the dialog form |
| `f:hk3hdl` | carried (added in the R4 polish; code only) | Wire the AuditSink |
| `f:cdllbv` | cut | Vendor specific the register links rather than copies: SvelteKit's form actions page, linked from Build the dialog form, states that `reset` applies on `'success'` only, and `f:jra92k` carries the recipe's consequence |
| `f:uy7vyc` | carried | Load row detail on demand |
| `f:b5mcea` | carried | Load row detail on demand |
| `f:od9mww` | carried | Load row detail on demand |
| `f:vao0dd` | carried | Load row detail on demand |
| `f:n2bhjw` | carried | Load row detail on demand |
| `f:pswc3n` | carried | Load row detail on demand |
| `f:017qss` | carried | Animate the screen |
| `f:018sgk` | carried | Animate the screen |
| `f:2p5otw` | carried | Animate the screen |
| `f:1x8r1x` | carried | Animate the screen |
| `f:24f8gn` | carried | Animate the screen |
| `f:t767qb` | carried | Animate the screen |
| `f:09g8ev` | cut | Subordinated: `docs/reference/cairn-audit.md`, "The static rules", states what `motion-property` checks, linked from Animate the screen; the conductor's ruling takes links to the reference headings, no rule catalogue |
| `f:0aa9tp` | cut | Subordinated: `docs/reference/cairn-audit.md`, "The static rules", states what `motion-vocabulary` checks, linked from Animate the screen; the conductor's ruling takes links to the reference headings, no rule catalogue |
| `f:0mbj5n` | cut | Subordinated: `docs/reference/cairn-audit.md`, "The static rules", states what `motion-hover-gate` checks, linked from Animate the screen; the conductor's ruling takes links to the reference headings, no rule catalogue |
| `f:326755` | carried | Verify the screen |
| `f:mrv24k` | carried | Verify the screen |
| `f:1md5oj` | carried | Verify the screen |
| `f:wnvqlz` | carried | Verify the screen |
| `f:6vy0ka` | carried | Verify the screen |
| `f:0w432q` | cut | Subordinated: `docs/reference/cairn-audit.md`, "The rules" under Rendered mode, states `motion-reduced-delay`; Verify the screen links the rendered run to `run-cairn-audit-on-your-site` |
| `f:07efts` | carried | Resolve a missing audit record |
| `f:qlgggh` | carried (appended, scoped redraft) | Wire the audit sink, naming the snippet's `access` import as the access map |
| `f:fers77` | carried (appended, minted by the scoped redraft) | Compose the screen from the toolkit, a second step that mounts `CsrfField` in each action form |

Ids cut at the pilot draft and left cut, not re-disposed: `f:bwn0uo`, `f:x8rhdh`, `f:xh2mwb`,
`f:22odbz`, `f:2c19kf`, `f:2gdaks`, `f:2gmjvn`. The four motion ids are the rule catalogue the
conductor's ruling excludes, and the reference's "What the motion rules don't cover" states the
exemptions and the frame-offset allowance they describe.

## Round-2 findings, disposed by this plan

- Structural edit, `:212-257` (toolkit props): disposed by subordination of `f:pb0vh9` and
  `f:pyfbqv` to their `docs/reference/admin-toolkit.md` entries, linked from Compose the screen
  from the toolkit, per the conductor's ruling on covers item 10.
- Structural edit, `:255-257` (engine components): disposed by subordination of `f:qkr057`,
  `f:qmhbgs`, and `f:qk0l7p` to their `docs/reference/admin.md` entries, linked from Compose the
  screen from the toolkit; the `Mount an engine admin component` subsection is removed, per the
  ruling on covers item 11.
- Register editor, `:378-394` (motion catalogue): disposed by the Animate the screen section
  above, the editor's rewrite as its shape, the three rules' checks subordinated.
- Register editor, `:212, 255, 259` (task headings with no step): Compose the screen from the
  toolkit and Style the screen each carry one step; the engine-component subsection is gone.
- Register editor, `:56` and `:352` (two actions in one step): the nested route's `requireAccess`
  call and its access-map entry are two separate steps, now steps 2 and 3 of Load row detail on
  demand, where the reader creates the nested route; Gate it states the inheritance fact as
  explanation and points there.
- Job read (choice after the answer): Choose the action wrapper precedes Wrap the actions and
  follows Gate it, which names the wrapper only as the next section's choice.
- Job read (noun-headed blocks with no lead-in): every exposition section opens on its claim
  sentence tied to the task, and the two recipes open on their condition as the optional marker.
- Non-blocking: the suggested headings `Gate it` and `Wire the AuditSink` are used; the
  introduction's third part is checked against the outline's out-of-scope list above.

## Structural edit, round 1 (2026-10-03), disposed by this revision

- Blocking, `:162-163` (a wrapping step before the wrapper exists, then repeated): Gate it's step
  4 is deleted; the section closes on one sentence, an action gets its access check from a wrapper
  and the next section chooses it; Wrap the actions holds the only wrapping step.
- Blocking, `:159-162` (nested-route steps before the reader has a nested route): Gate it states
  `f:lmtfkt` as one sentence of explanation and points at Load row detail on demand, whose steps 2
  and 3 carry the `requireAccess` call and the access-map entry, one action each, where the reader
  first creates a nested route. The alternative, a conditional step in Gate it, would have put two
  actions in one step or two conditional steps before any nested route exists, so the move won.
- Advisory, `:79-84` (the introduction's hand-off list): three wrong-place routes stay as
  sentences, `restrict-admin-access` is named once, the remaining three pages fold into one
  sentence that names no page and defers to See also, and `migration-notes` leaves the
  introduction for Style the screen as a drafting constraint.
- Advisory, `:62-69` (the covers paragraph omits styling, the recipes, and motion): one clause
  added, with the two recipes marked optional.
- Advisory, `:439-453` (no failure path for the owner's 403): one diagnostic sentence rides Verify
  check 1, citing `f:3lbdl6` again and pointing at `restrict-admin-access` and the
  `auth.access.refused` row in `docs/reference/log-events.md`; no new section, since the extend
  recovery surface has no row for the event (friction filed).
- Advisory, `:424-427` (`check:cairn` replaces `npx cairn-audit` unrecorded): recorded under Verify
  the screen with its reason (`f:mrv24k`).
- Advisory, `:100` (`f:3lbdl6` placement): carried under Gate it, cited again under Before you
  begin and Verify the screen, in the facts lines and the Dispositions row alike.
- Advisory, `:297-318` (Style the screen's explanation outweighs its one step): a second step, the
  corner classes over a fixed Tailwind radius (`f:2babfl`), carries the ladder, the norm bands, and
  the button looks as its explanation.

## Structural edit, round 2 (2026-10-03, run `wf_fe61a650-884`), disposed by this revision

The second plan read passed the order and pace, the introduction's three parts, the four
cross-links, and the recorded departures from covers items 9, 10, 11, and 14; those stand as
written. Its three blocking findings:

- Blocking, `:499-504` (See also omits `configure-media`, which the introduction promises): See
  also now carries a seventh bullet for `configure-media`, so the introduction's closing sentence
  and the list name the same three pages and the outline's out-of-scope item for the media
  protocol has a place on the page. Adding the bullet won over dropping the introduction's
  mention, since the bullet disposes the out-of-scope item and the mention alone did not.
- Blocking, `:343-368` (Build the dialog form has a task heading and no step): the section is now
  a seven-step numbered procedure, one action each, location first, and every rule the section
  used to state as free-standing lists hangs under the step it constrains: the dialog's name under
  step 1, Escape under step 2, the nested-form rule under step 3, the four result branches under
  step 4, the live region under step 5, the input's description and invalid state under step 6,
  and the pending-disabled submit under step 7. The snippet follows the steps. The snippet reverts
  to the committed create dialog with `<CsrfField />` added, because steps 6 and 7 act on an input
  and a pending submit that the example site's remove confirm, the prior revision's choice, has no
  element for; the running example still supplies the action it posts to.
- Blocking, `:381-398` (`ExpandableRow` rules before any step, and no step renders the rows):
  step 4 of Load row detail on demand now renders each row as an `ExpandableRow` inside the
  `AdminTable`, linking the entry for its props, and the three markup rules (`colspan`, the
  `header` snippet's `<th scope="col">`, `data-cairn-inert-cell`) hang under it as its explanation.
  The order is now endpoint, gate, map entry, markup, then the open-handler steps the markup
  wires, so the client-side rules sit beside the client-side steps; the streaming sentence
  (`f:b5mcea`) stays as the lead-in after the first sentence. No fact states the component's
  controlled `expanded`/`onToggle` contract, so the step claims no prop and the hole is filed.

## Structural edit, round 3 (2026-10-03), disposed by this revision

The third plan read passed the order, the pace, the introduction's three parts with the contract
and the wrong-place routes, the four cross-links, the task-guide anatomy, and the recorded
departures from covers items 9, 10, 11, and 14; those stand as written. Its two findings:

- Blocking, `:420-446` (no step creates the open handler steps 5 to 9 work inside, and the
  procedure ends at caching with nothing rendered): Load row detail on demand is now eleven steps.
  A new step 5, after the markup step, writes the open handler and connects it to each
  `ExpandableRow` as the `ExpandableRow` entry describes, so the former step 5 ("in the panel's
  open handler") now refers to a thing the reader has built; the entry's link carries the prop
  names, the step claims none, and the facts-container friction on the controlled contract stays
  filed. A new step 11 renders the cached detail in the row's panel, with `f:vao0dd`'s `datum`
  clause hung under it, so the procedure ends on the observable result the first sentence promises.
  The read's failure-display clause is not carried: no fact covers it, so the step keeps the render
  clause only, per the read's own fallback, and the hole is filed as friction below. The former
  steps 5 to 9 are steps 6 to 10, and the snippet note says which steps the snippet covers.
- Advisory, `:285-293` (the toolkit section's Events snippet against the one-running-example
  promise, and a self-contradicting "minimal example before the typed route" sentence): the
  section now says the Events screen is a deliberately smaller, toolkit-only example placed after
  the signups server side, with the Sanity exemplar's order inverted for a stated reason, and the
  drafter opens it on one lead-in sentence that marks the switch, such as "A smaller screen shows
  the toolkit alone". What the page argues records the aside as the spine's one exception, with
  its reason (the only shell-hosted story transcribes that snippet; friction logged 2026-09-30).

## Could not do, and friction filed

- The extend track's recovery surface, `docs/extend/debug-your-site.md`, carries no symptom row for
  `auth.access.refused` in its outline, so the owner's-403 diagnostic on Verify check 1 points at
  `restrict-admin-access` and the `auth.access.refused` row in `docs/reference/log-events.md`
  instead of the surface the anatomy names. Filed as friction feeding that page's inputs
  (2026-10-03, first revision).
- `f:hafpqf` is subordinated to `docs/reference/sveltekit.md`, which states its members, order,
  and degrade-to-open but not the default 429 copy or the `redirect()`/`error()` carve-out. Filed
  as reference-arm friction (2026-10-03); the fact stays subordinated.
- No fact in the inventory states that a custom screen's form mounts `CsrfField`, though
  `docs/reference/admin.md`'s `CsrfField` entry says a form without it fails the guard's token
  check and the example site mounts it in both signups forms. The plan keeps `<CsrfField />` in the
  dialog snippet's code and lets the page make no prose claim. Filed as a facts-container hole
  (2026-10-03).
- No fact in the inventory states `ExpandableRow`'s controlled contract, the `expanded` prop and
  the `onToggle` callback the caller holds (`src/lib/admin-toolkit/ExpandableRow.svelte:9-11`, and
  the `ExpandableRow` entry in `docs/reference/admin-toolkit.md`), which steps 4 and 5 of Load row
  detail on demand need to render the rows and connect the open handler. Both steps link the entry
  and claim no prop. Filed as a facts-container hole (2026-10-03, second revision).
- The third plan read asked the final step of Load row detail on demand to render the cached
  detail "or a short failure message with a way to retry when the fetch failed". No fact in the
  inventory states what a row's panel shows while the fetch is pending or after it fails;
  `f:od9mww` states only that a failed row stays retryable, which hangs under the cache step. Step
  11 therefore carries the render clause alone, per the read's own fallback, and the page gives no
  failure display. Filed as a facts-container hole (2026-10-03, third revision).
- The outline's figure note asks for the signups screen with its dialog; the only shell-hosted
  story is `toolkit/custom-screen`, already logged 2026-09-30. The plan keeps that story.
- Covers item 9 asks the motion section to cite `admin-design-system` by heading; that document is
  internal, so the page cites the cairn-audit reference headings, per the conductor's ruling.
- R4 polish: the `waitUntil` and `building` sentences reworded, the ExecutionContext caller split into two sentences with `ctx.waitUntil.bind(ctx)`, and `f:hk3hdl` (`Handle` from `@sveltejs/kit/hooks`) filed for the snippet's import.
