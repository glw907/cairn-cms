# Wiring core: fold record

Fold of `2026-11-01-wiring-core-review-mechanics.md` into the plan and design note, plan depth with no verification read. Counts: 24 findings; 19 folded, 2 folded in part, 3 refused, 0 owner forks. Path: 460 minutes, up from 395, against a design estimate of about 390 and a ceiling of 780. No cut.

| # | Disposition | Where the revision carries it, or why not |
|---|---|---|
| 1 | folded | Option (a). T3 Files names `check-surface-leaks.json`, and a T3 bullet gives the entry shape, quoted from the file (`name`, `subpath`, `model`, `standing-unverdicted`). Gates says `--update` reaches only the last command, so the file is hand-edited first. The checker also fails a STALE entry, and the probe's `/media` hit came from the old `createMediaResolver` signature, so T3 records what prints, not a fixed three. Design note "Calls made here" gains the leak. |
| 2 | folded | T6 acceptance reads `create-site` on a pushed head (`create-site.yml:207-256`, `pull_request` trigger). The showcase build is a smoke check. The standing answer fires on that verdict. Gates sets the push order: first push after T1 opens the draft PR, and T5 and T6 share one push after both merge. T7 starts after T6 is accepted. The bake reads the showcase through `emitTemplate`, so the proof is not vacuous. T6 raised to 40 for the wait. |
| 3 | folded | Gates: each printed line as printed, no lane prefix. Verified at `gate-tier.mjs` `FAST_LINE_1_LANE`. |
| 4 | folded | T1 bullet: each inline member carries a doc comment, and keep to one helper. |
| 5 | folded | T3 Files adds `sniff.ts`, `data.ts`, `site-config.ts`, `content-routes-media-shared.ts`. T3 bullets state the `editor-media.ts` rename and the `MediaPicker.svelte` comments. The grep excludes `src/lib/admin/spellcheck-assets`. The T3 grep's file list was checked: those four were the only hits outside Files. |
| 6 | folded | Exclusion by path in T2's acceptance, three samples named. The review names two lines and says three; the third is `styleguide/+page.svelte:93`, a font sample. Published content is unchanged. |
| 7 | folded in part | T4 adds `entry-data.ts`, `sitemap.xml/+server.ts`, `assemble.ts`, names the five vite tests, narrows the grep, and corrects the `CairnRuntime.manifestPath` note. `public-routes.md:50,69` carry the call. `content-model.md:156` names the function with no arguments, so no edit. Refused the `delivery-views.test.ts` claim: it imports the internal resolver at `:4`, which never buckets, so no refusal fires and it follows the rename only. |
| 8 | folded | T7 line lists corrected: `S07:5`, `s15` `:12,13,117,158`, and the `s15-bad` argument shape. |
| 9 | folded | T1 Files and bullet add `tidy-and-ai-posture.md:104`. Grep widened to `skills`. |
| 10 | folded | "The clock": a traced cause runs to the ceiling, an untraced one stops, and over 780 actual takes the unbuilt set-asides in cut order, then closes and reports. Shape 1, 2, 3, 6, and #159 never go. The cut order is the plan's "Plan over 780" line; `design-audit/run-sheet.md` is not in this tree to read. |
| 11 | folded | Gates reason now names `check:snippets`. Verified at `docs-gate.mjs:7` and the `check-snippets.mjs` header. |
| 12 | folded | T6: `cairnVirtualOnly` gains a `config()` hook returning one shared constant. `runConfigHook` merges it (`node.js:38121`). The `resolveConfig` probe is in the design note. |
| 13 | folded | T5 Files and bullet add `components-and-islands.md:23`. |
| 14 | folded in part | T3 names the six shell fixtures, `media-public-base.test.ts` (it sits in `src/tests/component`), the `null` to `undefined` step, and the `createPublicRoutes` configs. Not folded: `factory-contracts.test.ts`, which holds no such site; `:113` takes its config as a parameter. |
| 15 | folded | T3: the `/media` entry stays, the `:321` reason changes, and so does the `media/index.ts:12` comment. |
| 16 | folded | T4 bullets cover `EXCLUDED_TYPE`, the `:12-13` comment, allowlist entries, `types.ts:81-82`, the `reexports` reasons, the missing-concept case, and the preview note for `## Decisions`. |
| 17 | folded | T4 acceptance: `time` inside the gate string (`cairn-run-gate` runs it under `bash -c`, after the lock), rerun once on a breach. The standing answer names the stray-file drop for the PR. |
| 18 | folded | Gates: each accepted-task report names the verdict or says it is pending. `pass-core` says no task waits for CI, so T6 is the one exception. |
| 19 | refused | Optional. The plan already makes a refusal a stop, so nothing unsafe follows. |
| 20 | folded | T2 names the path as `cairn-pub`'s own. Verified there at `:44`. |
| 21 | folded | T3 120, T4 110, T6 40, T2 stays 70 with the `createRenderer` sites added to its script. |
| 22 | folded | Optional in the review, kept because the push order changes its reasoning. T2's head now reaches CI and a red stops the line, so T2's bag takes `publicMediaResolver` at once, and T3 swaps it. |
| 23 | refused | Optional. T6's "or a new case beside it" already allows it, and `vite-dev-build-define.test.ts:85` still passes. |
| 24 | refused | Optional. T4's timing stays, as the sheet requires, and finding 17 bounds it. |

T3 also corrects a citation drift the review's clean list named: `preview.ts:354` is `:355`.
