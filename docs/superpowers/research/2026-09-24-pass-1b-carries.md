# Pass 1b carry notes

Review findings routed from one task to a later one during segments 1 and 2. Each later task's dispatch carries the items that name it. Copied from the conductor's working file at the segment 2 close.

## Task 6 packet requirements (implemented in Task 6)

1. The packet is the judge's working directory, with nothing outside it. Add a packet index at the root that names where the plant entries, pages, job text, items, docs tree, and code sit, and gives each sampled item's kind.
2. Each catch-field item carries an opaque id, its field name (`stalls`, `assumed`, `diverged`, or `checks`), its text, and `blockedBy` (null when the report predates the field: pass 1's string entries normalize to `{ text, blockedBy: null }`). A `diverged[]` item also carries its page quote (path, line, text), `didInstead`, and `why`. `checks[]` appears only when non-empty. Nothing else from the run: no `ruleCandidates[]`, `steps[]`, `quotes[]`, outcome, `pagesRead`, denials, usage, `modelUsage`, model, run id, or batch name.
3. Catch packet: plant entries keyed by opaque id, each carrying `subject`, `criterion`, and `nearMiss` only (optionally the plant's page path for multi-page jobs). Never `original`, `planted`, `proof`, or `type`. It also holds the planted page or pages as the reader saw them, and the job text. Development plants come from `prompts/criteria/dev-plants.json`. Held-out defects come from `prompts/criteria/heldout.json`, with the page at its `commit`. Join to `fixtures/dev-plants.json` by id, never by page (the P15 to P17 path forms differ). Rulings key on the plant-entry id, exactly once each.
4. Adjudicator packet: the job text, the job's page list and absent list, and the full published docs tree and code at the job's pinned commit, with the planter-export exclusions applied. The packet states which roots count as "published docs". It holds only the items the mechanical harness filter did not exclude; the excluded ones are listed in the key file.
5. Agreement packet: per item, `itemId` and kind (finding or catch call). Never `primaryLabel`, `subjectGroupId`, the adjudicator's class or reason, `runId`, or `jobId`. A finding carries its item (item shape as in 2), the job text, the job's page list, the page the claim concerns, and a shared docs tree and code built as in 4. A catch call carries its plant entry, the planted page, the job text, and that run's catch-field items, with inner ids distinct from the sampled `itemId`s.
6. Schemas: the adjudicator's `--json-schema` encodes the discriminated union (`finding` requires `subjectGroupId` and `ruling`; the other classes forbid them). Agreement verification rejects a label of the wrong kind. Exactly-once is keyed on plant entries (catch), packet items (adjudicator), and sampled items (agreement).
7. Blind agents: the fixed wrapper's `<frozen path>` resolves inside `<dir>`, as a hash-verified copy of the frozen prompt, so reading the prompt never touches the worktree. The audit script treats that copy as in-bounds. The plant check's `export/` is the planter's export.
8. (Re-review) A held-out catch packet carries the pre-fix page at its pinned commit as "the page or pages", and its entries use the same `subject`, `criterion`, and `nearMiss` fields as plant entries.

## Carried to Task 13's dispatch
- Name the published docs roots for the planter and the plant check (in `jobs.json` or a small file in `<dir>`), since "the published docs tree" is otherwise undefined in `export/`.
- Blind audits pending: `planting-prompt-author.jsonl` (granted dir `blind-planting-author/`) and `planting-prompt-editor.jsonl` (granted dir `blind-planting-author-2/`), both in `~/.cache/docs-readers/pass-1b-audit/`. The original granted dirs were under the session scratchpad `/tmp/claude-1000/-var-home-glw907-Projects-cairn-cms/e4f32f69-aaf9-43b0-ad47-92d96aaf09a4/scratchpad/`.

## Carried to the Task 3 review (from the Task 2 review)
- `lib/podman.ts:370`: the runner still copies a docs-only job's docs set from the working tree when the job omits `prepared`. A gated batch must refuse any job without a prepared tree (the spec: never the working tree).

## Carried from the Task 3 review
- Task 6: a judge batch passes its own model (catchJudge, adjudicator, or agreement) as the expected model, never `models.reader`. `verified.problems` can carry model ids ("init model X differs..."), and each attempt duplicates `initModel`, so the packet builder must allow-list fields, never block-list them.
- Tasks 5 and 7: the chain head is taken at gate time (batch start) and at each resume, not at report write. An entry appended mid-batch therefore postdates that batch's reports.
- Task 7: a report with `stoppedBy` (and `pendingCause`) is unfinished, never final. Seeds are checked on the reading side.
- Task 11: the held-out job has one `commit`, while its pages pin `29a03eff` and `3453668f`; rule how the job commit maps to `heldOutPins`. The freeze-readiness review checks that a gated batch file is itself a manifest path or a chain entry (today it can live anywhere, `/tmp` included).

## Carried from the Task 2 re-review (to the path-map lane)
- The harness filter's "repository-relative" normalization must keep the scripter bundle's subfolder prefix (`doctor/`, `json-output/`, `exit-codes/`), since the scripter's absent entries are bundle-root relative. Stripping it breaks every match and turns 13 cross-subfolder entries into paths that exist elsewhere in the bundle.
- `omittedPaths` uses `existsSync` (follows symlinks); `3a7485dd` tracks no symlinks, so it is moot at the pin.

## Carried from the Task 4 review
- Task 5 and the planter: the lead section is `level: 1` with the H1's text as `heading` (empty string with no H1).
- Task 9: pass 1's scripter quotes carry a bundle prefix (`json-output/docs/reference/...`); the proxy must key pages by those paths or it drops every scripter quote.
- Task 3 merge check: `isVerifiedOpusRun` prefers `initModel ?? model`; confirm Task 3 marks an init-model mismatch unverified in gated runs.

## Carried from the Task 5 review (to Task 13)
- A plant's `page` and `jobs.json` pages are prepared-tree-relative; the scripter's carry the bundle folder (`doctor/docs/reference/...`). Paths inside page text are repository-relative.
- The chain cannot detect an edit to its own last line (no later `prior` covers it); a report's `chainHead` covers only its prefix. The genesis path is not checked. Consider at Task 11's freeze-readiness review.

## Carried from the Task 6 final review (to Task 11's freeze-readiness review)
- The adjudicator and agreement packets' `tree/` is excluded from per-file hashing, and nothing re-checks it at gate time; a tree edited after the build passes. Add a tree digest to the key, or correct the comment at `judge-packets.ts:61-62`.
- A file added to a packet after the build (other than `key.json`) is not detected; compare the packet's file list with the key's packet-relative keys.
- The audit does not track a `cd` inside a subshell or a `pushd`. Each real blind transcript lists one unaudited interpreter call; both run inside the author's granted directory and edit its own output, and the Task 6 reviewer read both transcripts call by call.

## Carried to the next session's start (the CLI version)
- The host CLI auto-updated to 2.1.282 during segment 2; `scripts/docs-readers/init-baseline.json` pins 2.1.280 and 2.1.281 only, so a new run is unverified (`init: no pinned init baseline for CLI 2.1.282`). Before Task 9, pin the baseline with `run.ts --probe-init` (the way pass 1 pinned 2.1.281) and rebuild the image. After the freeze, a CLI change drifts the manifest's `cliVersion` and `imageId`, so every gated batch refuses and the plants burn: host auto-update must stay off from the freeze to the close.

## Carried from the Task 7 reviews (session 2026-09-25)
- Task 11: pass `--seed oc-curve=20260924` to `freeze.ts build`; the scorer refuses a thresholds file whose `seed` differs from `manifest.seeds["oc-curve"]`.
- Task 11 freeze-readiness review: the scorer does not order-check the planted batch file or the planted tree digests against the chain; check that order there.
- Task 15: pass the nine held-out ids from `prompts/criteria/heldout.json` as `--heldout-ids` (required in gated mode).
- Task 15: gated mode requires an adjudicator key and rulings for every mapping run, including one left unverified after its rerun (whose raw items R3 counts); include unverified mapping runs in the adjudicator batch.
- Task 15 record author: the class-level reason for a null pooled threshold is generic (`score-verdict.ts:43`); the specific reason is on `pooledSensitivity.reason`.
- Gate: every chain gate in this pass adds `CAIRN_GATE_MEMORY_MAX=6G CAIRN_GATE_MEMORY_HIGH=5G`; the light lane's 3G cap OOMs `svelte-check` at this repository's size.
