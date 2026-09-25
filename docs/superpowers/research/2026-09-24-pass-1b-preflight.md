# Pass 1b Task 0 pre-flight

Date: 2026-09-24. Conductor: `claude-opus-5-5`. Three `sonnet` agents ran the checks below; this
file is the record the plan's ledger points at, and every pin here is carried into the dispatch of
the task that owns it.

## Claim check (Tasks 1 to 7, against `34d70f67`)

Every claim in the plan's "Pre-flight findings" and Tasks 1 to 7 verified at HEAD except two, both
amended in the plan in this commit:

1. `run.ts` `setUpRun` sits at `:219-245`, not `:20-48`.
2. The development set is 46 items (D01 to D19, P01 to P17, F1 to F6, R1 to R4), not 50. A
   planning miss: the plan's arithmetic, not the spec's.

The gate's vitest selector `src/tests/unit/docs-readers` picks up the 17 `docs-readers-*` files
(229 tests, green at HEAD).

## Task 0 deliverables

- `scripts/docs-readers/fixtures/dev-items.json`: 46 entries (D 19, P 17, F 6, R 4), each with an
  id, a subject, and a page; every page exists at `3a7485dd`. F5 and R1 span two pages and carry a
  `pages` array beside the primary `page`.
- The fold simulations under `2026-09-24-pass-1b-sims/` all rerun clean (`uv run --with numpy
  --with scipy python3 <script>.py`) and reproduce every spec figure: the refit (0.29, 0.72,
  0.25 to 0.95), the 31-of-42 table, the thresholds, the floors, the stability figures within 0.02,
  and the trial figures.
- Page identity: pass 1's validation commit is `b2756399` (the validation record, line 48). All 41
  development-job pages are byte-identical between `b2756399` and `3a7485dd`
  (`2026-09-24-pass-1b-sims/page-identity.sh`). The `3a7485dd` pin stands.

## Pins (carried into each owning task's dispatch)

**Task 1, shared types.**
- `Job.absent: string[]`, repository-relative, a directory written with a trailing `/`.
  `Job.commit: string`, a commit id. `Batch.gated?: boolean`. Each goes into the existing
  allow-list constant, extended in place.
- `JobReport.attempts[]`: `{ cause, final, ... }`, where `cause` is why the attempt ran:
  `'initial' | 'unverified' | 'crashed' | 'timedOut' | 'noReport'`. Exactly one attempt has
  `final: true`.
- A job a batch-level stop left unstarted carries `stoppedBy: 'rateLimit' | 'auth' | 'budget'`
  and no attempt.
- The stamp is `freeze?: { tag: string; manifestHash: string; chainHead: string }`.
- Ban grep: module `scripts/docs-readers/lib/ban-grep.ts`, CLI `scripts/docs-readers/ban-grep.ts
  <file...>` (exit 1 on any hit, each hit printed with its id and line).

**Task 2, export.** The neutral identity lives as exported constants in `lib/prepare-class.ts`:
author and committer `cairn <export@example.invalid>`, date and every file mtime
`2000-01-01T00:00:00Z`, message `Export`. Test plants go to
`$XDG_CACHE_HOME/docs-readers/planted-1b/<job>/`. The image id is `podman image inspect --format
'{{.Id}}'` on the reader image tag, reported in the task report.

**Task 3, freeze and runner.**
- The manifest is `scripts/docs-readers/post-freeze/manifest.json` (under `post-freeze/`, so it
  never hashes itself): `{ tag, files: { <path>: <sha256> }, imageId, cliVersion, models: {
  reader, catchJudge, adjudicator, agreement }, jobs: { <jobId>: <commit> }, heldOutPins: {
  <path>: <commit> }, seeds: { <name>: <value> } }`. `manifestHash` is the sha256 of that file's
  bytes. The tag is `docs-reset-1b-freeze`.
- `run.ts` reads `Batch.gated` at parse time and verifies before any container starts.
- `chainHead` is the sha256 of the whole chain file's bytes at stamp time.

**Task 5, the chain.** `scripts/docs-readers/post-freeze/chain.jsonl`, one JSON object per line:
`{ "path", "sha256", "commit", "prior" }`, where `prior` is the sha256 of the previous line's bytes
(null for genesis) and `commit` is the commit that carries the artifact (the artifact is committed
first, then its entry appended). The genesis entry's path is `scripts/docs-readers/post-freeze/manifest.json`.
Because `chainHead` hashes the whole file, a report's head identifies the chain prefix it saw; an
entry after that prefix postdates the report, which is how the scorer applies "no entry postdates a
report that read it". CLI: `scripts/docs-readers/chain.ts append|verify|latest`.

**Task 4, thresholds.** `oc-curve.ts thresholds --plants <jobId>=<n>,...` writes `{ seed,
achieved: { pooled, perClass: { <class>: n } }, pooled: { threshold: number | null,
recall60PassMax, recall80PassMin }, floors: { <class>: { plants, floor: number | null } } }`, using
the class ids the class files already use. The recomputed file lives at
`scripts/docs-readers/post-freeze/thresholds.json`; tests use a fixture file.

**Task 6, packets.** `judge-packets.ts <kind> --out <dir>` writes the mounted packet to
`<dir>/packet/` and the key file to `<dir>/key.json`, outside the mount. Runtime packets live under
`$XDG_CACHE_HOME/docs-readers/packets/`; the conductor commits keys and rulings under
`scripts/docs-readers/post-freeze/judges/<batch>/`.

**Task 7, scorer and agreement sample.** `score.ts` takes a required `--out <path>`; every scorer
output is committed under `scripts/docs-readers/post-freeze/scores/`. The agreement sample is
`scripts/docs-readers/post-freeze/agreement-sample.json`:

```json
{
  "orderingLabel": "docs-reset-1b-agreement",
  "findings": [
    { "itemId": "…", "runId": "…", "jobId": "…", "primaryLabel": "real|false|harness" }
  ],
  "catchCalls": [
    { "itemId": "…", "runId": "…", "plantId": "…", "primaryLabel": "caught|missed" }
  ],
  "notes": ["pool too small to balance …"]
}
```

Fifteen items per stratum where the pool allows. `judge-packets.ts agreement` reads it and emits
per item only the `itemId` and the material to re-rule, never `primaryLabel`, `runId`, or
`jobId`. Fable's rulings come back as a separate file; the sample is never mutated.
