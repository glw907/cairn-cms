# Tidy and lists: design note

Slice `tidy-lists`, class `ordinary`, cut forward from pass 5. Initiative: `shared-standards`. Base:
`d71e4401e`. Design estimate about 140 path minutes, ceiling 280. The run sheet's product defaults for
#147, #150, #170, and #192 stand. The rest of pass 5 stays in its home pass.

## Outcome

Ten small fixes land in one PR. The Tidy settings screen stops offering a switch that switches
nothing. Tidy runs on Sonnet 5.5 by default, an over-long proofread fails honestly, and a site with no
key shows no Tidy button. A settings save says when it applies, and the screen shows what was saved. A
list row's delete confirms. The tag save confirms. A rename can't land on an address another entry
holds. The bulk media window stops promising an undo, a failed island reports itself, and two manifest
comments tell the truth.

## Decisions the sheet left to the plan

- **#192 model.** Every Claude model ID is a pinned snapshot, and no floating Sonnet alias exists, so
  the default pins `claude-sonnet-5-5` and the screen's advice names `claude-haiku-5-5`. Sources: the
  live Models API on 2026-11-01 (`claude-sonnet-5-5` created 2026-09-28, `claude-haiku-5-5` created
  2026-10-07, both report effort support), and the models overview page: "Every Claude model ID is a
  pinned snapshot, including the dateless IDs used from the 4.6 generation on."
- **#192 cap.** A `max_tokens` stop throws a private `TidyTruncatedError` from the default client, the
  way `TidySdkMissingError` already works, and the action answers `fail(413)` with the existing
  too-long copy. It also clears any unhealthy key mark, since the call reached Anthropic and the key
  worked. No member joins the public `TidyClient` contract. A site's gateway keeps its current shape.
- **#192 deadline.** A proofread may not fit the 30-second deadline. The planner's live probe on
  2026-11-01 took Sonnet 5 past 30s at 12,935 characters, and Sonnet 5.5's rate extrapolates to roughly
  38s at the 24,000-character cap. Sonnet 5.5 is the faster of the two, so this change improves the
  problem and doesn't cause it. The deadline and the cap are out of scope: the proofread measures them,
  the doc comments take the measurement, and an overrun gets a backlog item.
- **#192 fallbacks.** The tidy request stays on `messages.create` and takes no `fallbacks` beta. A
  refusal already returns `fail(422)` with the text untouched, so a fallback adds a beta surface to
  answer a case that already fails safely.
- **#145.** The `fixes` key leaves `TidyConventions`, and the Settings screen keeps a Fixes section that
  states what tidy always fixes. A stale `fixes:` in a site's YAML is ignored, because
  `resolveTidyConventions` and `validateTidyConventions` copy known keys only.
- **#170.** One `DeleteDialog` per list, mounted with `trigger={false}`, so no row repeats the dialog's
  `cairn-delete-dialog-title` id. `listDeleteAction` already reads the `id` the dialog posts, so the
  server and `DeleteDialog.svelte` don't change.
- **#197.** `renameAction` calls the same `heldAddress` that publish calls, on the row the rename would
  write, and answers with the message the same-file collision already uses. A new
  `rename.address_collided` event carries the log record.
- **#58.** `console.error` in both catches. This runs in the browser, so no log event can reach Workers
  Logs. An unregistered directive name stays silent, as the item scopes it.

## Files and interfaces

- **Public types:** `TidyConventions` loses `fixes`, a breaking change with a `Consumers must:` line.
  `VocabularyData` gains `saved: boolean`. `api-surface.md` follows.
- **Defaults:** `DEFAULT_TIDY_MODEL` becomes `claude-sonnet-5-5`, with a changelog entry and a migration
  note.
- **New log event:** `rename.address_collided`. New `tidy.failed` reason: `truncated`.
- **Screens:** `CairnTidySettings`, `ConceptList`, `VocabularyAdmin`, `MediaBulkDeleteDialog`.

## Out of scope

#143, #173, #190's ordering, #193, shape 20's flash field, ergonomics 15 and 19, and every other item in
pass 5. The tidy prompt's structure and conventions. A scaffold default of `tidy.enabled: false`, since
the load fix covers it. An unregistered island name. The `tidy-prompt.test.ts:146` comment's "opt-in
network harness", which doesn't exist.

## End-to-end check

CI's full suites on the head, including `tidy.spec.ts`, `preview.spec.ts`, and
`public-preview-tokens.spec.ts`. A main-loop render read of `/admin/settings`, `/admin/posts` with the
confirm open, and `/admin/vocabulary?saved=1` at 320 and 1440. A before-and-after proofread of five
real entries, Sonnet 5 against Sonnet 5.5, plus one input near 20,000 characters for latency.

## Risk class

`ordinary`. No path in the slice is on the `auth-data` or `runner` map. The dependency map's soft edges
held: `ConceptList.svelte:225` (1b) and `content-routes-entry-read.ts:306` (wiring) are distant from
this slice's hunks.
