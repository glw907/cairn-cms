# Tidy and lists: task plan

Slice `tidy-lists`, class `ordinary`, cut forward from pass 5. Initiative: `shared-standards`. Base:
`d71e4401e`. Design note: `docs/internal/plans/2026-11-01-tidy-lists-design.md`. Run sheet:
`~/.local/state/cairn-agent-first/design-audit/run-sheet.md`.

Path: 180 minutes against a design estimate of about 140 and a ceiling of 280: T1/T4 30, T2/T6 40, T2's
proofread 15, T3/T5 40, T7 55. No cut is needed. T7 holds CI, three reviewers, folds, and twelve
screenshots, so it's the likeliest overrun.

## Pre-flight

Every task was read for owner steps and auto-mode gaps.

- **Geoff's steps:** none. No sign-in, secret to receive, dialog, browser action, or permission rule.
- **Auto-mode writes** (workstation#192 covers cairn worktree edits under this sheet; a refusal is a
  stop, never a thing to route around):
  - T1, T2, T3, T5, T6: `npm run emit:template`, which rewrites `templates/waymark/**`, including
    `templates/waymark/.claude/skills/**`.
  - `CLAUDE.md` and `.claude/rules/` need nothing, and no other `.claude/skills` write falls to an
    executor.
- **Done by the planner:** the one #192 fact in
  `.claude/skills/cairn-writing-docs/evals/site-cases/s12-tidy-and-posture.json:12`, which now reads
  `model (default claude-sonnet-5-5, DEFAULT_TIDY_MODEL at :146)`. `.claude/rules/evals-docs-process.md`
  covers a change to the docs process; this is one fact in a case's source list, so no eval run applies.
  T7 lists that in `## Decisions`.
- **The Anthropic key for T2's proofread:** present in `~/.local/secrets`, a literal value. The planner
  read it twice with `python3 -I` under this auto mode and made live `/v1/messages` calls with it on
  2026-11-01. A worktree-isolated session is refused `source ~/.local/secrets`, because the shell can't
  show a sourced file runs no git. So the proofread script parses the literal
  `export ANTHROPIC_API_KEY=` line as data, never prints it, and never `source`s the file. An `fs` read
  in that `.ts` script is the same read. A refusal of that read is a stop: see "Stops".
- **The live probe, 2026-11-01:** every call sent `output_config: { effort: 'low' }`, the request shape
  at `content-routes-context.ts:156-165`, with a short stand-in system prompt, not the real tidy prompt.
  The long input was eight concatenated `~/Projects/907-life` post bodies, one single run per model, so
  the latencies are a measurement to confirm, not a settled rate.

  ```
  claude-sonnet-5 max=16000 stop: end_turn blocks: ['text'] in: 89 out: 18 1.3s
  claude-sonnet-5-5 max=16000 stop: end_turn blocks: ['text'] in: 91 out: 18 2.0s
  claude-haiku-5-5 max=16000 stop: end_turn blocks: ['text'] in: 91 out: 18 0.9s
  claude-sonnet-5-5 max=5 stop: max_tokens blocks: ['text'] in: 91 out: 5 1.4s
  long input chars: 12935 from files: 8
  claude-sonnet-5 max=16000 stop: end_turn blocks: ['thinking', 'text'] in: 4821 out: 5581 40.1s
  claude-sonnet-5-5 max=16000 stop: end_turn blocks: ['text'] in: 4823 out: 4751 20.6s
  claude-haiku-5-5 max=16000 stop: end_turn blocks: ['thinking', 'text'] in: 4823 out: 8430 24.4s
  ```

- **CI:** no `.github/workflows` path. `update_snapshots` runs on `e2e.yml` only if a baseline goes red.

## Backlog sweep

Scoped sweep at `d71e4401e`. A full sweep isn't due: 12 of 67 open items lack a stamp, under the 15
line, and the sheet runs one at pass 8's close. The stamps landed in the commit that carries this plan.

| Item | Verdict | Reason |
|---|---|---|
| #145 | fold | `conventionLines` never reads `fixes`. T1. |
| #147 | fold | `content-routes-entry-read.ts:503` shows the button with no key. T3. |
| #150 | fold | The save commits and the load reads build-time config. T3. |
| #192 | fold | Default, effort gate, screen advice, cap, and prompt words. T2. |
| #170 | fold | `ConceptList.svelte:447-454` posts at once. T4. |
| #171 | fold | `?saved=1` has no reader on the vocabulary path. T3. |
| #194 | fold | `MediaBulkDeleteDialog.svelte:255` is exact. T6. |
| #58 | fold | `src/lib/islands/index.ts:43` and `:50` are exact. T6. |
| #197 | fold | The rename guard reads one path. Its cite `:265` drifted to `:309-314`. T5. |
| #41 | fold | `manifest.ts:4` and `:440`. Its cite `:430` drifted. T6. |
| #136, #163, #164, #179, #199, #200 | keep | Each names a file the pass touches, in lines it doesn't rewrite. Stamped. |
| #24, #143, #172, #173, #178, #180, #190, #193 | keep | Home pass, by the slice's brief. Not re-read, so not re-stamped. |
| #134, #162, #103, #115, #116, #120 | keep | Other home passes. Not re-read, so not re-stamped. |

Coordination: #136 and #200 each owe a row in `log-events.md`, and #190 and #180 touch
`ConceptList.svelte` near #170's lines. A later pass merges past this one, so nothing here waits.

## Stops and standing answers

The run sheet's standing answers apply to every task. These are this pass's own.

- **Over 280 minutes:** set aside #58, then #150's committed read. Nothing else may go.
- **May not set aside:** #194, #170, #147, #145.
- **A real dependency the map missed:** set the item aside for its home pass, list it in the PR's
  `## Decisions`, and go on. None is known.
- **T2's proofread:** the result goes in `## Decisions`, and the pin stays. The sheet's product default
  for #192 reads "Use a newest-Sonnet alias if the API offers one, otherwise pin the newest Sonnet id
  and update the settings screen's advice", and the slice brief says "Keep every sheet standing answer
  and product default for the items in scope". A Sonnet 5.5 edit that breaks markdown structure or
  rewrites voice gets a backlog item through `standards:log-issue` and a line in the PR.
- **The key read is refused:** the brief says "treat a refusal as a stop, never a thing to route
  around". Write the stop to `docs/STATUS.md` for `cairn-cms-9b` and wait. A peer isn't asked to do what
  a session was denied.
- **A test pins old behavior:** change it and list it under `## Decisions`. That covers the `fixes`
  fixtures, `tidy-prompt.test.ts:139`, and `:164`.
- **A pair merge conflicts:** the pairs' hand-written files are disjoint, so a conflict there means a
  task left its file list. Resolve toward the plan, then rerun the fast lane.
- **A generated file conflicts:** rerun `npm run emit:template` and `npm run check:surface -- --update`.
  They regenerate `templates/waymark` and `scripts/checks/api-surface.md` whole, so the regeneration is
  the resolution.
- **`main` moves:** merge it only when `cairn-cms-9b` says so, keep both `## Unreleased` entries, run
  `npm run emit:template` and `npm run check:surface -- --update`, and rerun the fast lane.
- **Questions:** none is expected. A stop goes to `docs/STATUS.md` on this branch for `cairn-cms-9b`.

## Tasks

Line numbers are from `d71e4401e`, and because tasks run in sequence, locate by the quoted text.

Order: pair T1 and T4, then pair T2 and T6, then T2's proofread, then pair T3 and T5, then T7. Run the
fast lane after each merge of a pair: `npm run lane:fast -- --range <base>..HEAD`, through
`cairn-run-gate`. Push after the T1/T4 merge, so CI runs T4's e2e edits; that first push opens the draft
PR. Push after each later merge too, and name the CI verdict on that head in the merge's report. Each
pair goes to two `cairn-implementer` subagents at Sonnet medium. T1 changes a public type and stays Sonnet,
because the change is mechanical; the session reviews it at the merge. An `src/lib/admin` task loads
`cairn-following-admin-design`, and a behavior change follows `.claude/rules/docs-with-code.md`.
`CHANGELOG.md`, `MIGRATION-NOTES.md`, and `BACKLOG.md` wait for T7, so pairs stay disjoint.

### T1. Remove `fixes` from tidy conventions (#145) (30 min, ordinary; pair with T4)

**Outcome:** `TidyConventions` has no `fixes`, and the Settings screen has no On/Off control for the
objective fixes. Tidy's behavior doesn't change.

**Files:** `src/lib/nav/site-config.ts`, `src/lib/admin/CairnTidySettings.svelte`,
`src/lib/sveltekit/tidy-prompt.ts`, `examples/showcase/src/theme/site.config.yaml`,
`templates/waymark/**` (emitted), `scripts/checks/api-surface.md`, and the tests below.

Delete these from `src/lib/nav/site-config.ts`:

- `:158-163`, the member and its doc comment, ending `fixes: boolean;`.
- `:191`, `return { fixes: true, enDashRanges: false, smartQuotes: false, brandCaps: false };`, keeping
  the other three keys.
- `:203`, `fixes: partial.fixes ?? base.fixes,`.
- `:265`, `fixes: bool('fixes', true),`.

Reword the doc comments that name the group: `:152` ("The Fixes group is the objective fixes (default
on, governed by the always-on"), `:189` ("Fixes on, every style and advanced toggle off"), and `:196`
("Fixes on, the style and advanced toggles"). Reword `tidy-prompt.ts:76-78` to say the objective fixes
live in the core.

In `CairnTidySettings.svelte`:

- `:248`, `if (conv.fixes) parts.push('spelling', ...`, loses its condition.
- The header comments at `:20` ("Fixes on, every style convention off") and `:32` ("Fixes' On/Off")
  stop naming the control.
- `:258`, `return parts.length ? joinList(parts) : 'nothing yet';`, becomes `return joinList(parts);`.
- `:287-292`, `fixesAllOff` and `fixesAllOn`, go.
- `:293-297`, the reset, becomes `conv = { enDashRanges: false, smartQuotes: false, brandCaps: false };`
  with its comment updated.
- In `<section>` "SECTION: FIXES" (`:430-475`), remove the `StatusChip` live region, the
  `Turn off`/`Turn on` button, both `conv.fixes` opacity conditions, and the toggle at `:468-472`. Keep
  the heading, the examples, and the card. The meta line becomes "Plain errors, not style choices. Tidy
  always fixes these."
- Remove any import this leaves unused.

Remove `fixes: true` from `examples/showcase/src/theme/site.config.yaml:36`, then run
`npm run emit:template` and `npm run check:surface -- --update`.

**Tests:** `git grep -l 'fixes: true' -- src/tests` lists the fixtures, and each drops the key, except
where it's the block's only key and dropping it would leave the block null. `SEED_YAML` at
`content-routes-settings.test.ts:62` and `nav-site-config.test.ts:268,271` take `oxfordComma: always`
instead. JSON strings such as `'{"fixes":true}'` at `content-routes-settings.test.ts:104,138,147,162`
aren't type-checked and stay. In `site-config-path.test.ts:78,90,102,119`, post and assert
`smartQuotes: true`. Delete `tidy-prompt.test.ts:136-141`, whose subject is gone. In
`tidy-settings.test.ts`, `:88-96` expects one `h2` pill, `:112` and `:187-188` lose their `Fixes` button
queries, and `:119-122` reads the `Oxford comma` button rendered pressed with `oxfordComma: 'always'`.
`:80-82` passes unchanged. Add a test that the screen has no `[aria-label="Fixes"]` control. In
`content-routes-settings.test.ts:192`, assert `expect(data.conventions).not.toHaveProperty('fixes')`.

**Acceptance:** `git grep -nE "conv\.fixes|fixes: (true|false)" -- src/lib templates examples` prints
nothing. A YAML with a stale `fixes: false` resolves with no `fixes` key, proved by a new
`nav-site-config.test.ts` case. The new `tidy-settings` test fails on the current screen. `npm run
lane:fast` is green, including `check:surface`, `check:options`, and `check:template`.

### T4. Confirm a list row's delete (#170) (30 min, ordinary; pair with T1)

**Outcome:** a list row's trash button opens the same confirmation the entry screen uses, and no delete
posts without it. A refused delete shows its blockers in that same dialog.

**Files:** `src/lib/admin/ConceptList.svelte`, `src/tests/component/ConceptList.test.ts`,
`examples/showcase/e2e/preview.spec.ts`, `examples/showcase/e2e/public-preview-tokens.spec.ts`,
`docs/editors/publish-and-history.md`.

Today, the block starting at `ConceptList.svelte:443` reads:

```svelte
{#if deleteRefused?.id === entry.id}
  <!-- A prior delete was refused: DeleteDialog names the blockers and offers no confirm. -->
  <DeleteDialog conceptId={data.conceptId} id={entry.id} singular={data.singular ?? data.label} inboundLinks={deleteRefused.inboundLinks} inboundKind={deleteRefused.inboundKind} pending={entry.status !== 'published'} />
{:else}
  <form method="POST" action="?/delete">
```

Mount one `DeleteDialog` for the whole list with `trigger={false}`, always mounted in the `{:else}` of
`{#if data.entries.length === 0}`, after the `AdminTable` card, and bound to an instance typed from the
component so its exported `open()` is reachable. Its entry is the row the editor picked, or else the
refused row, found with `data.entries.find` on `deleteRefused.id`. With neither, `id` is `''` through
`id={target?.id ?? ''}`; no button opens the dialog then, and a refused id with no row keeps the banner
at `:322`.

- `conceptId` and `singular` stay as they are today, and `pending` comes from that entry.
- `inboundLinks` and `inboundKind` come from `deleteRefused` when `deleteRefused.id` matches that entry,
  and otherwise `[]` and the default.

Each row's button is `type="button"` with `aria-haspopup="dialog"`, and it sets the entry, awaits
`tick()` from `svelte`, then calls `open()`. The normal row keeps the trash icon and
`aria-label="Delete {entry.title}"`. The refused row keeps today's visible text button, `class="btn
btn-sm btn-ghost text-error"` reading Delete, so its reproduction doesn't change. The row's `<form>` and
its `CsrfField` go, since the dialog carries both; the `CsrfField` import stays for the create form at `:496`.
`DeleteDialog.svelte` and `listDeleteAction` don't
change: the dialog posts `concept` and `id`, and the action reads `id` from the body.

Replace `publish-and-history.md:121`, "On a list, the trash button beside an entry deletes it at once,
with no confirmation window, unless other entries link to it. To get the confirmation, delete from the
entry's editing screen.", with a sentence saying the trash button opens the same window. Load
`cairn-writing-docs` for that edit.

In `preview.spec.ts:142-145` and `public-preview-tokens.spec.ts:212-214`, click the dialog's confirm
after the row button: `page.getByRole('alertdialog').getByRole('button', { name: 'Delete this post' })`.

**Tests:** in `ConceptList.test.ts`, a click on a row's trash opens the dialog with that entry's noun,
the row form is gone, and a second row's click retargets the hidden `id` input. The test at `:331-334`
still finds one `dialog[aria-labelledby="cairn-delete-dialog-title"]` on a refused load, with the
include copy. On any load, `querySelectorAll('[id="cairn-delete-dialog-title"]').length` is 1.

**Acceptance:** `grep -n 'action="?/delete"' src/lib/admin/ConceptList.svelte` prints nothing. The
retarget test fails if the dialog is mounted per row. The fast lane is green, and CI's `preview.spec.ts`
passes.

### T2. Bring tidy to the 5.5 family (#192) (40 min, plus 15 for the proofread, ordinary; pair with T6)

**Outcome:** a site with no `tidy.model` runs Sonnet 5.5, the effort gate covers Haiku 5 and Fable 5,
the screen advises Haiku 5.5, a capped proofread fails honestly, and the prompt drops its pressure
words.

**Files:** `src/lib/nav/site-config.ts`, `src/lib/sveltekit/content-routes-tidy.ts`,
`src/lib/sveltekit/content-routes-context.ts`, `src/lib/sveltekit/content-routes-settings.ts`,
`src/lib/sveltekit/tidy-prompt.ts`, `src/lib/admin/CairnTidySettings.svelte`,
`src/lib/reproductions/stories/editor.ts`, `src/lib/reproductions/stories/support.ts`,
`skills/cairn-extending-a-site/references/tidy-and-ai-posture.md`,
`skills/cairn-extending-a-site/references/log-events.md`,
`templates/waymark/**` (emitted), and the tests below.

1. `site-config.ts:146`, `export const DEFAULT_TIDY_MODEL = 'claude-sonnet-5';`, becomes
   `'claude-sonnet-5-5'`. Update `:139` ("Default `claude-sonnet-5`; the alternative is
   `claude-haiku-4-5`.") and `:145` to Sonnet 5.5 and `claude-haiku-5-5`.
2. `content-routes-tidy.ts:58`, `const EFFORT_TIER_PREFIXES = ['claude-sonnet-5', 'claude-opus-5',
   'claude-sonnet-4-6'];`, gains `'claude-haiku-5'` and `'claude-fable-5'`. Update the doc comment at
   `:63-69`. `claude-haiku-4-5` stays false: the Models API reports no effort support for it.
3. `content-routes-settings.ts:125-129`: add `'claude-sonnet-5-5': 'Claude Sonnet 5.5'` and
   `'claude-haiku-5-5': 'Claude Haiku 5.5'`, and make `'claude-haiku-4-5'` read `'Claude Haiku 4.5'`.
4. `CairnTidySettings.svelte:402`: "Switch to ... `claude-haiku-4-5` for a cheaper, faster run." names
   `claude-haiku-5-5`.
5. `content-routes-context.ts`: add an internal `TidyTruncatedError`, shaped like `TidySdkMissingError`
   (doc `:114-122`, class `:123-128`). In the adapter, at `refused: message.stop_reason === 'refusal',`,
   throw it first when `message.stop_reason === 'max_tokens'`. The doc comment on `MAX_OUTPUT_TOKENS` at
   `:104-111` stops saying "never capped mid-response", says what a cap now does, and names the default
   model rather than Sonnet 5's tokenizer. `TidyClient.tidy`'s doc says a gateway owns truncation, since
   the check lives only in the default client.
6. `content-routes-tidy.ts`: in the catch, after the `TidySdkMissingError` branch, answer
   `TidyTruncatedError` with `markKeyHealthy()`, since the call reached Anthropic and the key worked,
   then `log.warn('tidy.failed', { editor: editor.email, model, reason: 'truncated' })` and
   `fail(413, { error: 'This is too long to tidy at once. Select a passage and tidy that instead.' })`,
   the same copy as the input cap at `:154-156`. Update `TidyFailure`'s doc comment and the list of
   throw classes in `tidyAction`'s doc at `:100-110`. Add `truncated` to the `tidy.failed` row at
   `log-events.md:117` as its own 413 class.
7. `tidy-prompt.ts:28`, "ONLY where the existing form is grammatically wrong", becomes lowercase
   `only`. `:100`, "ALWAYS use numerals for ages", becomes `always`. Change no other prompt word.
8. `stories/editor.ts:306` and `stories/support.ts:201`: `model: 'claude-sonnet-5'` becomes
   `'claude-sonnet-5-5'`.
9. `tidy-and-ai-posture.md`: `:32` shows `model: claude-haiku-5-5`, `:35` names the new default, and the
   `This is too long to tidy at once...` row at `:72` also names a proofread that hit the output cap.
10. Run `npm run emit:template`.

**The proofread** runs in the executing session after the T2/T6 merge, not in the pair subagent, because
a subagent's read of a sibling repo isn't pre-flighted. It's a throwaway `.ts` script in
`$CLAUDE_JOB_DIR/tmp`, never committed, run by the repo's `tsx` after setup: `tidy-prompt.ts` re-exports
`../nav/site-config.js`, which imports the YAML library, so `python3 -I` can't load it.

- Take five published (`draft` not true) entries under 6,000 characters from `~/Projects/907-life` or
  `~/Projects/ecxc-ski` content, and one input near 20,000 characters from
  `~/Projects/aksailingclub-org/src/content/posts`. Its longest post is 17,718 bytes, so concatenate two.
- Send each body with frontmatter stripped, as `src/lib/admin/tidy-controller.svelte.ts` sends the body
  and not the file.
- Build the system prompt from `tidy-prompt.ts` with `defaultTidyConventions()`. The old prompt is the
  new prompt with step 7's two words reversed.
- Send each input to `claude-sonnet-5` with the old prompt and to `claude-sonnet-5-5` with the new one,
  both at `output_config: { effort: 'low' }` and `max_tokens: 16000`, the request the action sends. Read
  the key as "Pre-flight" says.
- Record per input: changes made, any markdown structure change, any voice edit, per-call latency, and
  output tokens.

The table goes in the PR's `## Decisions`, and the entries stay out of the repo.

**The deadline:** `DEFAULT_TIDY_TIMEOUT_MS` is 30,000 (`content-routes-context.ts:287`), and the
`MAX_TIDY_CHARS` doc at `content-routes-tidy.ts:44-51` says a proofread "stays comfortably inside the 30s
deadline". The probe doesn't support that. Sonnet 5 passed 30s at 12,935 characters, and at about 230
output tokens a second Sonnet 5.5 extrapolates to roughly 38s at 24,000 characters. Sonnet 5.5 is the
faster of the two, so #192 improves this and doesn't cause it. T2 changes neither the deadline nor the
cap. It corrects that doc comment, and the "30s comfortably covers a proofread" line above
`DEFAULT_TIDY_TIMEOUT_MS`, to what the proofread measured, and `content-routes-tidy.ts:45` stops naming
Sonnet 5's tokenizer. If the near-20,000 input passes `ctx.tidyTimeoutMs`, or the measured rate puts
24,000 characters past it, T2 files an item through `standards:log-issue` and lists it in `## Decisions`.

**Tests:** `supportsEffort` is true for `claude-haiku-5-5`, `claude-fable-5-1`, and
`claude-sonnet-5-5`, and false for `claude-haiku-4-5`. In the block at
`src/tests/integration/content-routes-tidy.test.ts:370`, use `vi.doMock('@anthropic-ai/sdk', ...)`
returning `{ default: class { messages = { create } } }`, not a throw. `create` resolves the real shape
the probe returned: `stop_reason: 'max_tokens'`, `content` with a `text` block, and a `usage` object. A
`thinking` block may precede text on a successful reply, and the adapter's filter already drops it.
Assert status 413, the too-long copy, `reason: 'truncated'` with no `corrected` in the result, and that a
prior `markKeyUnhealthy()` is cleared. `tidy-prompt.test.ts:164` matches the lowercase word. A settings
test pins the new labels.

**Acceptance:** `git grep -nE "'claude-sonnet-5'|claude-haiku-4-5" -- src/lib` prints only the two
`TIDY_MODEL_LABELS` rows, the `supportsEffort` doc comment, and the `EFFORT_TIER_PREFIXES` list. The 413
test fails before step 5. The fast lane is green.

### T6. Small fixes: #194, #58, #41 (15 min, ordinary; pair with T2)

**Outcome:** three small truths land together.

**Files:** `src/lib/admin/MediaBulkDeleteDialog.svelte`, `src/lib/islands/index.ts`,
`src/lib/content/manifest.ts`, `skills/cairn-extending-a-site/references/components-and-islands.md`,
`src/tests/component/islands-hydrate.test.ts`, `templates/waymark/**` (emitted).

- **#194:** `MediaBulkDeleteDialog.svelte:255`, "Every removal is one revertible commit you can undo."
  becomes "Every removal is one revertible commit." The rest of the line stays.
- **#58:** in `mountIsland` at `src/lib/islands/index.ts`, add `console.error` to both catches, keeping
  each fallback: the `JSON.parse` catch at `:43-45` and the `mount` catch at `:50-52`. Read the name
  from `node.getAttribute('data-cairn-island')`, and pass the caught error as the second argument.
  Update `hydrateIslands`' doc comment, which says a malformed payload or a throwing component "leaves
  the static fallback in place", to say it also reports to the console. In
  `components-and-islands.md:173`, split the "Runtime loads, fallback stays" row, whose "(all silent)" is
  no longer true: not scrolled to and a registry key mismatch stay silent, and bad props JSON or a throw
  on mount reports to the console naming the island.
- **#41:** `manifest.ts:4`, "the save path patches one entry and commits it with the content in one
  commit", and `:440`, "This is the save path's incremental patch.", say publish. Save commits no
  manifest.
- Run `npm run emit:template`.

**Tests:** extend `islands-hydrate.test.ts:35-40` to spy on `console.error` and assert one call naming
the island, and add a throwing-component case with the same assertion and the fallback restored.

**Acceptance:** both new assertions fail on the current code. `git grep -n "you can undo" --
src/lib/admin/MediaBulkDeleteDialog.svelte` prints nothing. The fast lane is green, including
`check:comments`.

### T3. Tidy gate, save message, and the tag flash (#147, #150, #171) (40 min, ordinary; pair with T5)

**Outcome:** no key means no Tidy button. A tidy save says when it applies, and the screen shows the
committed values. A tag save confirms.

**Files:** `src/lib/sveltekit/tidy-key-health.ts`, `src/lib/sveltekit/content-routes-settings.ts`,
`src/lib/sveltekit/content-routes-entry-read.ts`, `src/lib/admin/CairnTidySettings.svelte`,
`src/lib/admin/VocabularyAdmin.svelte`, `src/lib/reproductions/fixtures.ts`,
`docs/editors/manage-your-tag-vocabulary.md`, `docs/admin/is-it-working.md`,
`skills/cairn-extending-a-site/references/tidy-and-ai-posture.md`, `scripts/checks/api-surface.md`,
`templates/waymark/**` (emitted), and the tests below.

- **#147:** move `keyConfigured` out of `content-routes-settings.ts:202-204` into `tidy-key-health.ts`
  as an exported `tidyKeyPresent(): boolean`, reading `env` from `./workers-env.js`, and call it from
  `settingsLoad`. At `content-routes-entry-read.ts:503`, `enabled: (runtime.tidy?.enabled ?? false) &&
  !keyKnownUnhealthy(),` also requires `tidyKeyPresent()`. Update the comment above it. In
  `tidy-and-ai-posture.md`, say beside the refusal table and in the "Verify on the deployed site"
  paragraph (`:63-65`) that the edit screen hides the button with no key.
  `docs/admin/is-it-working.md:232` says to test the key by running "one Tidy suggestion in the admin",
  which a site with no key can't do; send the reader to `/admin/settings` first. Load
  `cairn-writing-docs`.
- **#150, copy:** `CairnTidySettings.svelte:352`, `Tidy settings saved.`, becomes `Tidy settings saved.
  They apply after your site's next deploy.`
- **#150, committed read:** after the probe, when `tidyEnabled && keyPresent && keyStatus !== 'invalid'`,
  `settingsLoad` reads `runtime.siteConfigPath` from the default branch and takes `conventions` from
  `parseSiteConfig(raw).tidy?.conventions` through `resolveTidyConventions`. Otherwise it keeps
  `runtime.tidy?.conventions`, which the editor tier doesn't render. One `try` holds
  `ctx.resolveBackend(event)`, the read, the parse, and the resolve, with `raw` declared before it, as
  `vocabularyLoad` declares it at `:327`:
  - A null `raw` (no file), or a null or missing `conventions` (the YAML left when a site deletes its only
    `fixes:` line), degrades to the runtime value silently. `resolveTidyConventions(null)` throws
    reading off null, so it's never called with one.
  - A throw with `raw` still null is a read failure, and it degrades silently, as `vocabularyLoad` does at
    `:330-333`. A GitHub outage isn't a config fault.
  - A throw with `raw` set is a parse failure. It degrades and logs the `config.invalid` record
    `vocabularyLoad` writes at `:340-344`, with `scope: 'settings'`. `parseYaml` throws its own error on
    bad YAML, not `SiteConfigError`, so don't test for that class.

  Rewrite the doc comment's claim at `:212-213` that "the screen and the prompt can never diverge": they
  differ between a save and its deploy, and the message says so. Name the committed source in
  `SettingsData.conventions`' doc at `:75`. `parseSiteConfigOrFail`'s doc at `:162-168` stops saying
  nothing else in the module emits `scope: 'settings'`, gives the settings caller the same note the
  vocabulary caller has, and drops its pointer to `src/lib/log/events.ts`, which documents no such
  collision. The note at `tidy-and-ai-posture.md:55-57` says the screen shows the committed values. T5
  edits the `log-events.md:61` row.
- **#171:** add `saved: boolean` to `VocabularyData` at `content-routes-settings.ts:89-96`, with a doc
  comment, and set it in `vocabularyLoad` the way `settingsLoad` does at `:253`. Add `saved: false` to
  `fixtureVocabulary` at `src/lib/reproductions/fixtures.ts:252`. In `VocabularyAdmin.svelte`, after the
  `{#if lifecycleError}` block at `:167-169`, add an always-mounted `role="status"` region holding
  `<div class="alert alert-success mt-3 type-body">Tags saved.</div>` under `{#if data.saved}`, the
  shape `CairnTidySettings.svelte:350-354` uses. Say so after the **Save changes** item in
  `manage-your-tag-vocabulary.md:21`: **Save changes** shows **Tags saved.**
- Run `npm run emit:template` and `npm run check:surface -- --update`.

**Tests:**

- `content-routes-edit.test.ts:767-797`: the three tests set the key through the env helper. A new test
  with `tidy.enabled: true` and no key reads `data.tidy.enabled` false.
- `content-routes-settings.test.ts`: add `new GithubDouble({ main: { [CONFIG_PATH]: SEED_YAML } }).install()`
  in a `beforeEach` for the `settingsLoad` blocks at `:177` and `:253`, which stub no fetch today and
  would call GitHub. `access-map-route-enforcement.test.ts:140` enables no tidy, so it reads nothing, and
  `cairn-admin-actions.test.ts:650` runs on the double at `:642`.
- New cases there: a committed YAML whose `oxfordComma` differs from the runtime's loads the committed
  value. An absent file, a failed read, and an empty `conventions:` key each load the runtime's value
  with no log and no throw. A malformed file loads the runtime's value and logs `config.invalid` with
  `scope: 'settings'`. A missing key reads nothing.
- `tidy-settings.test.ts:45` pins the new message.
- `content-routes-vocabulary.test.ts:94`: `?saved=1` reads `saved: true`, and no query reads false.
- A `VocabularyAdmin` component test: `saved: true` shows the message inside `[role="status"]`.

**Acceptance:** `git grep -n 'settingsLoad(' -- src/tests` prints only lines in those two stubbed blocks
and `access-map-route-enforcement.test.ts:133,140`. `tidy.spec.ts` stays green on CI, since the dev handle
sets a dummy key (`packages/cairn-cms-dev/src/handle.ts:210`). The no-key test and the committed-read test each fail on
the current code. The fast lane is green. If T3 is over its clock, #150's committed read is the part
that may be set aside, listed in `## Decisions`.

### T5. Refuse a rename onto a held address (#197) (25 min, ordinary; pair with T3)

**Outcome:** a rename that lands on an address a live entry holds in any concept refuses with nothing
committed, so it can't break the next deploy.

**Files:** `src/lib/sveltekit/content-routes-entry-destructive.ts`, `src/lib/log/events.ts`,
`src/lib/log/events-list.ts`, `skills/cairn-extending-a-site/references/log-events.md`,
`skills/cairn-extending-a-site/references/content-model.md`, `scripts/checks/api-surface.md`,
`src/tests/unit/content-routes-rename.test.ts`, `templates/waymark/**` (emitted).

The current guard reads one path:

```ts
const clobber = await backend.readFile(newPath, backend.defaultBranch);
if (clobber !== null) {
  return fail(409, { error: 'An entry with that address already exists.' } satisfies RenameFailure);
}
```

After `next = upsertEntry(next, priorPublishedAt ? { ...movedRow, publishedAt: priorPublishedAt } :
movedRow);`, and before the repoint loops, call `heldAddress(next, runtime.concepts, movedRow)`, imported
from `../content/advisories.js`. On a hit, log and refuse before anything commits:

- `log.warn('rename.address_collided', { editor: editor.email, address: movedRow.permalink,
  heldByConcept: held.concept, heldById: held.id })`, the fields `publish.address_collided` carries.
- `fail(409, { error: 'An entry with that address already exists.' } satisfies RenameFailure)`, so
  `when-something-goes-wrong.md:129` stays true with no edit.

Add `'rename.address_collided'` to `events-list.ts` beside `'publish.address_collided'` at `:39` and to
`events.ts:47`. Add its row to `log-events.md` after `:51`, and add a sentence on renames to the "Address
collisions" paragraph at `content-model.md:183-188`. For T3, the `config.invalid` row at `log-events.md:61`
changes "The nav and vocabulary loads fall back to empty;" to "The nav and vocabulary loads fall back to
empty, and the settings load to the deployed conventions;". Run `npm run emit:template` and
`npm run check:surface -- --update`, since `CAIRN_LOG_EVENTS` and `CairnLogEvent` are spelled out in
`api-surface.md:397-398`.

**Tests:** in `content-routes-rename.test.ts`, after `'refuses a collision with no commit'` at `:170`:

- A live entry in another routable concept holds the renamed entry's permalink, so the action answers
  409, no `/git/trees` POST runs, and the log record carries `heldByConcept`.
- The same collision with `draft: true` on the holder proceeds.
- A draft entry renamed onto a held address proceeds, as `heldAddress` returns null for a draft.

**Acceptance:** the first test fails on the current code. `log-events-table.test.ts` passes with the new
row. The fast lane is green.

### T7. Close (no pair) (55 min, ordinary)

**Outcome:** the PR is ready for the conductor. The session runs this task.

1. **Records.** Move the ten items to `## Done` in `BACKLOG.md`. Finalize `## Unreleased` in
   `CHANGELOG.md`. It carries #145's breaking line, `Consumers must: remove `fixes` from any
   `TidyConventions` you build in code; a `fixes:` key in `site.config.yaml` is ignored.` It carries
   #192's default change with `Consumers may: set `tidy.model: claude-sonnet-5` to stay on the old
   model.` It also lists #147, #150, #170, #171, #194, #58, and #197. Add the per-version record in
   `MIGRATION-NOTES.md`.
2. **Docs.** Run the rule's search and show it in the PR: `git grep -n -i -E
   "tidy|trash|Save changes|Change URL|island|console|Fixes|next deploy" -- docs/editors docs/admin
   skills`. Run a fresh
   `docs-fact-checker` on the changed lines of `docs/editors/`. Fix a wrong claim. A dispute goes in
   `## Decisions`, and no docs review is sent.
3. **Render read.** Run the showcase and read `/admin/settings`, `/admin/posts` with the confirm open,
   and `/admin/vocabulary?saved=1` in the main loop, at 320 and 1440, in both themes. Only a screenshot
   counts.
4. **Push and CI.** The draft PR to `glw907/cairn-cms` has been open since the T1/T4 merge. Push the
   head and watch with `ci-green <sha> --pr <n> --wait` as a background Bash task. A red with a traced cause gets fixed. If
   a visual baseline goes red on an intended change, regenerate it on CI through `e2e.yml`'s
   `update_snapshots`, read the render, and list it.
5. **Review.** Dispatch `standards:diff-reviewer` at whole-branch scope against the design note and this
   plan, with `standards:svelte-reviewer` and `standards:daisyui-a11y-reviewer` for the `.svelte` and
   action changes. Fold every finding, quoting it verbatim as acceptance criteria.
6. **PR body.** Open with a `## Brief`. Then what landed, `## Decisions` (the proofread table with its
   latencies, each changed test, the `claude-sonnet-5-5` pin and its source, the planner's `s12` edit
   and why no eval run applies, any deadline item, every retried test as flake evidence), and
   the score with the plan's path beside the actual. List new work filed through `standards:log-issue`.
   Mark the PR ready, report PR-ready to `cairn-cms-9b`, and stop. Never merge, bump, or publish.

**Acceptance:** CI green on the head, the review accepted with no open finding, `npm run check:docs-gate`
rerun green after the last review fold, and each of the ten items closed or set aside with its reason in the PR.
