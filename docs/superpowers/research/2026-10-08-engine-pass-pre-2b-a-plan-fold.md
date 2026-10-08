# Engine pass A before stage 2b: plan fold record (2026-10-08)

Target: `docs/superpowers/plans/2026-10-08-engine-pass-pre-2b-a.md`, plan commit `504b82f0`, folded
on `main` at `c8ff916b` (uncommitted). Inputs: the three reviews in this directory (`-contract`,
`-mechanics`, `-risk`), the spec and its rulings file, pass B's plan (read, never edited), the
conductor's eleven rulings for this fold, and four cross-plan items from
`2026-10-08-engine-pass-pre-2b-b-plan-fold.md`. The conductor's rulings are applied as decisions,
not forks.

Every finding was checked against `main` before a disposition was written. Evidence read: the
plan's cited lines; `src/lib/auth/store.ts:268-273,464-472,500-512,538-548`;
`src/lib/sveltekit/admin-action.ts:78-125` (`ownerOnly`, `no-rule`, `not-owner`);
`src/lib/sveltekit/content-routes-media-delete.ts:29-230,320-420` (single, bulk, orphan scan and
purge); `src/lib/media/usage.ts:70-100`; `src/lib/media/bulk-delete-plan.ts`;
`src/lib/content/manifest.ts:64-176,315-335`; `src/lib/sveltekit/content-routes-media-ingest.ts:232-252`
(`head ?? undefined`); `src/lib/github/backend.ts:30-36` and `repo.ts:75-90`;
`packages/cairn-cms-dev/src/fake-github.ts:705-735` (`readFile` at a sha);
`src/lib/admin/CairnMediaLibrary.svelte:364` (`deleteInUse` derives from client rows);
`examples/showcase/src/access.ts`, `templates/waymark/src/access.ts`, `.cairn-template.json`;
`scripts/build/emit-template.mjs:1-80` (nested start throws); `docs/reference/admin-routes.md:210-225`;
`docs/internal/facts/extend.md:839` (`f:3z1uxv`); `tool/internal/spine/condition.go`;
`~/.claude/workflows/pass-execute.js:443-476,587-615,715-771` (allowlist, `reviewPrompt`, `t.model`
on the fix round); `gate-tier.mjs --range HEAD~1..HEAD --pin full|docs` (printed); `package.json`'s
`check:close`; the spec's A1, C11, D1, fork, and `Consumers` sections.

IDs: `C-` contract, `M-` mechanics, `R-` risk, `X-` cross-plan. Fifty IDs: contract 16 (15
findings plus its unnumbered anchor note), mechanics 18, risk 12, cross-plan 4.

## Convergent roots (fixed once)

| Root | IDs | Disposition | Where |
| --- | --- | --- | --- |
| The agents never see Outcome, the cited Decisions, or the mutations | M-B1, X-2 | folded | Execution mode: `criteria` = Outcome, Acceptance, Mutations, Decisions carried, verbatim; `notes` = the task's own Notes only. A **Decisions carried** block in Tasks 1, 2, 4, 6, 7, 11, 12. Mutations joined `criteria` too, since `reviewPrompt` never shows `notes` and the stop rule turns on unkilled mutations. |
| The lead's five-reader test passes today | C-M1, R-M1, C-m1 (Task 1 half) | folded | Task 1 Acceptance: identity (`toBe`), refuse half, admit half, custom `steward` role absent from `DEFAULT_ROLES`; fail-today reason restated; mutation "guard attaches `{}`". |
| Criteria say "F green" while the gate is computed | C-M8, M-M4 | folded | Gates "Per-task gate" (pins and the gate-economy justification); Task 3 `gateTier: "full"`; "the computed gate green" on Tasks 4, 5, 6, 9, 11. |
| Decision 6 hand-regenerates the template's env types | C-m7, M-m6 | folded | Decision 6 and Task 7's carried copy: showcase by its line-2 command, template through `emit:template`. |
| The close smoke's custom role does not exist | R-M3, M-m9 | folded | Close step 5: scratch showcase copy with a declared custom role and an access rule naming it; admitted, refused on `/admin/signups`, sidebar matches. |
| Stock `npm test` at the close, and the S4 boundary F | M-M6, M-O1, X-3 | folded | Close step 2: "F again; never the stock `npm test`", then `check:close`, then T; S4 boundary D only; segment table. |
| Task 0's empty range and premature PR | M-m1, M-m2, X-4 | folded | Task 0 items 4 and 6; F's print line in Gates. |
| A6's dictionary await and failure paths unproven | C-M6, R-M2 | folded | Task 8 Outcome (`error` never reaches `applyAction`), Acceptance (abort row, publish-500 row, held `?/dictionaryAdd` row), new Mutations list. |
| The seam-1 marker nesting with pass B | X-1 (conductor ruling 10, plan B E1) | folded | Decision 2 and Task 1's carried copy and Markers row. See "Seam 1" below. |

## Contract lens

| ID | Disposition | Where, or reason |
| --- | --- | --- |
| C-M1 | folded (root) | Task 1 Acceptance. |
| C-M2 | folded | Task 9 Acceptance header: the injection point is after the path's first read and before its commit; Task 10 rows reworded the same. Verified: under the reorder mutation, a post-read injection lets the stale file commit cleanly. |
| C-M3 | folded | Task 4 Outcome and Acceptance: route `:271`, `:506`, `:509`, `:544`; `:468` stays unrouted with a one-line reason (verified: hardcodes `'owner'`); one row per routed statement against {0000, 0003, 0004}. |
| C-M4 | folded | Task 11 Acceptance fail row (a second entry carries `mediaRefs`), pass row (no entry carries it), mutation "never drop". |
| C-M5 | folded | Decision 1 corrected; Task 6 composition rows and mutation "`ok` reads the signing check alone". |
| C-M6 | folded (root) | Task 8. |
| C-M7 | folded | Task 12 per-version records (A1's `none` line, the publish-conflict line); acceptance widened to every `Consumers` line any task report drafted; Task 3 and Task 10 Notes have the report draft them. |
| C-M8 | folded (root) | Gates. |
| C-m1 | folded | Task 1 roles row (`steward`); Task 2 rows run with custom roles declared or call `guardRoleWiring` directly. |
| C-m2 | folded | Task 4 Acceptance quotes local D1's CHECK and primary-key error text, adds the duplicate-email rethrow row; Task 6 Notes quote GitHub's status list and the Web Crypto export step. |
| C-m3 | folded | Task 3 A2 row states the reason mapping per refusal (verified `ownerOnly` and `not-owner` exist). |
| C-m4 | folded | Task 5 A10 row: a runtime whose `sender.replyTo` is set. |
| C-m5 | folded | Task 1: `rg -nU` multi-line pattern (also catches a bare `createAuthGuard()`, excluding the `@ts-expect-error` file) and a grep for an access snippet importing from the adapter. |
| C-m6 | folded | Task 12 writes no STATUS; Decision 10 and close step 9 own those writes; literal patterns for the prefix grep. |
| C-m7 | folded (root) | Decision 6. |
| C-note (dead `is-it-working.md` anchor) | folded | Task 4 Notes: the report files it in the friction log for the admin arm. |

## Mechanics lens

| ID | Disposition | Where, or reason |
| --- | --- | --- |
| M-B1 | folded (root) | Execution mode; Decisions carried blocks. |
| M-M1 | folded | Task 1 Files (`option-map.json`, `admin-routes.md:218`, fact pointer repairs); Global constraint widened to `check:options`, `check:facts`, `check:snippets`; S1 pre-flight claims. |
| M-M2 | folded | Task 4 Files (`condition.go`, `tool/CHANGELOG.md`), `go-conventions` in Notes, T green in Acceptance. |
| M-M3 | folded | Task 2 `gateLane: "heavy"`; Gates. |
| M-M4 | folded (root) | Gates; Task 3 pin. |
| M-M5 | folded, option (a) | Task 6 `model: "opus"` in args (verified the runner's fix round reuses `t.model`); Task 8's upshift is a hand-dispatched chain with the original base SHA ("Models", "Running unattended"). |
| M-M6 | folded (root) | Close step 2. |
| M-m1 | folded (root) | Task 0 item 4; Gates. |
| M-m2 | folded (root) | Task 0 item 6. |
| M-m3 | folded | Spec cited at `27df5088` (conductor ruling 11); Task 0 item 2 makes the STATUS repoint a named pre-execution step. |
| M-m4 | folded | Task 12 `gateLane: "light"`, appended `check:surface` and `check:rulings-format`; D trimmed to the docs gate plus those two. |
| M-m5 | folded | E2E_PORT rule moved to Global constraints; `args.gate` exports it (verified `E2E_PORT` is on the runner's allowlist). |
| M-m6 | folded (root) | Decision 6. |
| M-m7 | folded | Independence paragraph: no S2 pair is disjoint; Tasks 11 and 6 share `api-surface.md`; no relaunch marks a pair `parallel`. |
| M-m8 | folded | "Running unattended": an extra fix round is a hand-dispatched chain naming the original base SHA. |
| M-m9 | folded (root) | Close step 5. |
| M-m10 | folded | Close step 3 restores the lockfile; Task 1's scratch copy rewrites both `file:` dependencies to absolute worktree paths. |
| M-O1 | folded (root) | S4 boundary D only. |

## Risk lens

| ID | Disposition | Where, or reason |
| --- | --- | --- |
| R-M1 | folded (root) | Task 1. |
| R-M2 | folded (root) | Task 8 (conductor ruling 7). |
| R-M3 | folded (root) | Close step 5 (conductor ruling 6). |
| R-M4 | folded as a decision, not a fork (conductor ruling 3) | Decision 16; Task 11 Outcome, Files, gate rows, mutation, carried Decision; Task 12 changelog line; Review focus item 6. The comment states both consequences (the gate refuses until regenerate; the first referencing publish breaks the next build). Single delete answers a 409 (no typed-slug override, since the Library's in-use face derives from client usage rows, `CairnMediaLibrary.svelte:364`, and would show no confirm input); bulk refuses the batch. Orphan purge is unaffected: it targets keys with no `media.json` row, and a gallery asset has one. Known cost recorded in Decision 16: a regenerated site referencing no image at all also refuses until an entry references one. |
| R-M5 | folded | Close step 6: under `wrangler dev` from a scratch copy, N concurrent `?live=1` report one verdict and one mint, one more inside 60 seconds mints nothing; dropped under fork 2's "no" (Rulings section). |
| R-m1 | folded | Task 6 Outcome (public material only, `appJwt` stays non-extractable, a failure carries no message) and a no-key-substring row; Task 7 catch returns a fixed detail; close step 6 passes the key through a mode-600 `.dev.vars` in the scratch copy. The method (parse `n`/`e` or export SPKI) is left to the implementer. |
| R-m2 | folded | Task 9 Acceptance: R2 object survives and no `media.deleted` logs on each delete race; a publish-in-window row. |
| R-m3 | split: null-head refusal folded; head-sha reads refused | Folded: Tasks 9 and 10 refuse on a null head (mutation added). Refused: reading each snapshot at the head sha. The dev backend's `readFile` at a sha replays only that commit's own change to the path (`fake-github.ts:715-721`), so `media.json` read at most heads returns null; the fix needs a dev-backend tree-at-sha change, and GitHub's contents-API lag behind the ref is unverified. The cost exceeds the risk the guard leaves. |
| R-m4 | folded | Task 3 A1 screen-id row and mutation. |
| R-m5 | folded | Task 8 rows blocking for coverage (in its Acceptance header); a standing behavior defect after the Opus chain stops the run. |
| R-m6 | folded | Close step 4 brief names the C11 writers and the D1 delete gate. |
| R-O1 | folded | The `magic_token` row dropped from Task 4. |

## Cross-plan items

| ID | Source | Disposition | Where |
| --- | --- | --- | --- |
| X-1 | Conductor ruling 10; plan B fold erratum E1 | folded | Decision 2: pass A keeps one inner `theme-kit` block; "Pass B replaces the inner `theme-kit` block with one block around the whole member." One addition: the member's doc comment carries no marker block (today's `access.ts` JSDoc holds a second block, which pass B's outer block would nest). Task 1 Markers row asserts it. No pass A task otherwise changes. |
| X-2 | Plan B fold, correction to conductor ruling 1 | folded (root) | Verified at `pass-execute.js` `reviewPrompt`: the review prompt carries `criteria`, never `notes`. Decisions go in `criteria`; so do the mutation lists. |
| X-3 | Plan B fold erratum E2 | folded (root) | Close step 2: "F again; never the stock `npm test`". |
| X-4 | Plan B fold erratum E3 | folded (root) | Task 0 items 4 and 6. |

## Seam 1, for plan B

Pass A's adapter `access` member carries exactly one `cairn-template:exclude-start/-end` block, around
the showcase-only `theme-kit` rule and its `//` explanation. The member's doc comment carries no marker
block. Pass B replaces that inner block with one block around the whole member, doc comment included,
so markers never nest. Plan B's Task 1 wording (E1) matches this; the doc-comment rule is the one detail
plan B should expect.

## Owner forks

One: fork 2 (anonymous `/healthz?live=1` minting). The plan's "Rulings for Geoff" section now holds it
alone. The charter phrase stays an owner-gated read in "Running unattended", not a fork. R-M4 was raised
as a fork and is settled by conductor ruling 3 (Decision 16).

## Refused

- **R-m3, head-sha snapshot reads.** The dev backend cannot serve a tree at a sha, and the lag it
  answers is unverified; the null-head half is folded.

## Measures

- **Dispositions:** 50 IDs. 49 folded outright; 1 split (R-m3: the null-head refusal folded, the
  head-sha reads refused); owner forks 0 new (fork 2 carried).
- **New-mechanism findings:** folded 2 (R-M4's fail-closed delete gate, R-m3's null-head refusal;
  each answers a measured data-loss path, and each follows the engine's own fail-closed posture in
  the same files, the strict branch read and the `expectedHead` guard); refused 1 (R-m3's sha
  reads).
- **Plan line count:** 1062 before, 1316 after.
- **Token ceiling:** 11.0M, unchanged. The fold adds one pinned F (Task 3), Task 11's gate rows,
  Task 8's added rows, and two scratch-copy smoke steps; it removes the S4 boundary F and the close's
  separate `npm test`. Task 6 on Opus changes the model, not the token count. The net stays inside the
  1.0M fix reserve.
