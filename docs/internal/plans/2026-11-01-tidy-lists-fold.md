# Fold record: tidy-lists mechanics review

Input: `2026-11-01-tidy-lists-review-mechanics.md`, findings M1-M7, F1, m1-m12, folded with the planner's
rulings into the plan and the design note. Each finding was checked against source at the worktree, whose
code matches `d71e4401e`. No code was run: the worktree has no `node_modules`.

Result: 20 folded, 0 refused whole. Two sub-options were refused, under F1 and m6.

| Finding | Disposition | Where, or why |
|---|---|---|
| M1 | Folded | T5's file list and commands take `api-surface.md` and `check:surface -- --update`. The generated-file stop covers `api-surface.md`, and the pair-conflict stop now says hand-written files. Confirmed at `api-surface.md:397-398` and `gate-table.json:35-46`. |
| M2 | Folded | T3's #150 committed read: one `try`, states named, tests pinned. Checked against `vocabularyLoad` at `:327-344`. Two refinements, both from source. `raw` set or null tells a parse failure from a read failure, because `parseYaml` throws its own error on bad YAML, so a `SiteConfigError` test would miss it (`site-config.ts:351`). A null `conventions` is handled before `resolveTidyConventions`, so an empty key stays silent rather than logging as a parse failure. |
| M3 | Folded | T3 edits `parseSiteConfigOrFail`'s doc, `SettingsData.conventions`' doc, and the `:55-57` note. The `log-events.md:61` row is T5's, with the wording spelled out. Also found: that doc's pointer to `src/lib/log/events.ts` is false, since the file documents no collision, so T3 drops it. |
| M4 | Folded | T3's tests add the `beforeEach` double to the blocks at `:177` and `:253`. The one-line check is the `git grep -n 'settingsLoad('` line in T3's acceptance. Checked: `access-map-route-enforcement.test.ts:140` (the path is `src/tests/integration`) enables no tidy, and `cairn-admin-actions.test.ts:650` runs on the double. |
| M5 | Folded | T1's acceptance grep is scoped to `src/lib templates examples`. |
| M6 | Folded | T1's Tests paragraph: `:88-96`, `:112`, `:187-188`, `:119-122`, the two substitutions, and the JSON strings that stay. `:80-82` is left alone. `:119-122` needs a pressed row, so it names `oxfordComma: 'always'`. |
| M7 | Folded | Pre-flight carries the probe output, replacing the `/v1/models` sentence. T2 carries the fixture shape, the script's form, and a new "The deadline" paragraph. The proofread runs in the executing session after the T2/T6 merge. |
| F1 | Folded | Not an owner fork, per the planner. Stops: the pin stays, with both sources quoted; a refused key read is a stop to `docs/STATUS.md` for `cairn-cms-9b`. Option (c), "the conductor runs it", is refused: a peer isn't asked to do what a session was denied. |
| m1 | Folded | T4: always mounted, `id={target?.id ?? ''}`, a typed instance, `data.entries.find`, and the absent case. Corrected from the review: the branch is the `{:else}` of `{#if data.entries.length === 0}`, because `:351`'s `> 0` block holds only the toolbar. `singular` comes from `data`, not the entry, so that bullet was corrected too. |
| m2 | Folded | T6 splits the `components-and-islands.md:173` row in place of adding one. |
| m3 | Folded | T3: `docs/admin/is-it-working.md` and `tidy-and-ai-posture.md:63-65`. T1: the svelte header comments at `:20` and `:32`. T2 step 5: the `MAX_OUTPUT_TOKENS` and `TidyClient.tidy` docs. T2 step 6: `tidyAction`'s doc. T7: the search terms. |
| m4 | Folded | Every table row is corrected in the plan, including `tidy-prompt.test.ts:136-141` and `site-config.ts:158-163`. The Tasks intro carries the locate-by-quote sentence. The `s12` `:124` note is moot: the planner's edit left line 12 reading `:136`. |
| m5 | Folded | Path line reads 180: 30 + 40 + 15 + 40 + 55. T2 reads 40 plus 15, and T7 reads 55. Under the 280 ceiling, no cut. The header names T7 as the likeliest overrun. |
| m6 | Folded | The planner made the edit. T2's step and file entry are gone, Pre-flight records it, and T7's Decisions list carries it. The review's no-op write is refused as moot: the planner's edit exercised that write. |
| m7 | Folded | T2 step 6 calls `markKeyHealthy()`, and the test pins it. The `doMock` return shape is stated, and "if the reason is typed there" is gone (nothing in `src/lib/log/` types it). The design note's cap entry is updated. |
| m8 | Folded | T3's read condition is `tidyEnabled && keyPresent && keyStatus !== 'invalid'`, after the probe. |
| m9 | Folded | Tasks intro: push after the T1/T4 merge, which opens the draft PR, and each merge report names the CI verdict. T7 step 4 reworded. The executor prompt already says "Push when the plan says to" and carries the CI verdict rule. |
| m10 | Folded | T7's acceptance reruns `check:docs-gate` after the last review fold. |
| m11 | Folded | T2's acceptance says "the two `TIDY_MODEL_LABELS` rows". |
| m12 | Folded | T3 says "the **Save changes** item". |

Added by this fold, beyond the findings:

- T2 also corrects the "30s comfortably covers a proofread" line above `DEFAULT_TIDY_TIMEOUT_MS`, the same
  claim as the `MAX_TIDY_CHARS` doc, in a file T2 already edits.
- The `tidy.failed` row takes `truncated` as its own 413 class, since the row is sorted by status.
- `Load cairn-writing-docs` moved from T3's #171 bullet to its #147 bullet, the first docs edit in T3.
- The design note's end-to-end check names the near-20,000 input, and its line 25 reads "A site's gateway".
