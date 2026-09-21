# Doctor retirement: `cairn-doctor` moves into `cairn doctor`

Status: design approved by Geoff in brainstorm, 2026-09-21. Agent-facing; not register-graded.

## Brief

`cairn-doctor`, the npm package's site-setup checker, retires. Its local checks move into the Go
`cairn` CLI as `cairn doctor [<dir>]`, released as `tool/v1.1.0`. The engine then removes the bin
and `src/lib/doctor` inside the `0.97.0` window. Geoff ruled the retirement on 2026-09-21; this
spec settles how, not whether. The pass's close is the only writer of STATUS's "the `0.97.0` cut
is unblocked" line. This pass does not cut `0.97.0`.

Inputs: `docs/internal/record/2026-09-21-doctor-retirement-inventory.md` (engine side) and
`docs/internal/record/2026-09-21-doctor-retirement-tool-sizing.md` (tool side, which predates
B2's segment 5). One sizing claim is already corrected here: the scaffolder never runs the
doctor, it only prints two commands (`scaffold.mjs:249`, `cloudflare/chapter2.mjs:805`).

## Rulings from the brainstorm (Geoff, 2026-09-21)

1. **The send test is dropped.** `cairn health`'s email check reads sender onboarding and DNS;
   the first magic-link sign-in is the real send through the real binding; `log-events`
   diagnoses a failure. The tool holds and borrows no write credential. Known loss: no
   pre-deploy inbox signal. Precondition to verify once B2 merges: `cairn health`'s email check
   can run for a site before first deploy. If it cannot, return to Geoff with the fallback
   (the scaffolder, which already holds a write-capable token in chapter 2, sends the one
   message itself).
2. **The Go tool parses the files itself, shallowly.** `wrangler.jsonc` through an in-module
   JSONC stripper and `encoding/json`; `wrangler.toml` through one TOML library (three of the
   four production sites use TOML); `site.config.yaml` through YAML, already an indirect
   dependency. `config.site-config` narrows to: the file exists, parses, and the fields other
   checks read are present. No Go port of `parseSiteConfig`'s Contract v2 schema; the engine
   hard-errors on a bad schema at build and load.
3. **`conditions.ts` stays the source.** It is the engine's runtime diagnostics registry, read
   by about ten engine modules, and ships unchanged. An engine script generates a JSON mirror
   committed under `tool/`, the Go tool embeds it, and an engine gate fails when regeneration
   is not a no-op.
4. **A rulings-ledger entry, no consultation.** `engine-triage` reads this spec as the
   adversarial charter lens. A dropped check the lens finds to be a real loss reopens that
   check, never the retirement.
5. **Exit codes take the tool's frozen convention:** 0 OK, 1 WARNING, 2 CRITICAL, 3 UNKNOWN.
6. **`wrangler-config.ts` moves to `src/lib/media-seed/`,** trimmed to what `media-seed` calls.
   The engine's copy of `site-config-path.json` leaves; the scaffolder's copy is the one source
   and the generator carries its value to the Go side.
7. **Check scope for `v1.1.0`:** the ten local-file checks plus `ai.posture-effective`. The
   three D1 checks (`auth.store`, `auth.role-vocabulary`, `auth.email-normalization`) defer to
   1.x beside the agent-permission check, the same credential design. `github.app`,
   `config.tidy-key`, and `admin.login-probe` are dropped. `edge.https-forced` and
   `email.sender-onboarded` are already `cairn health` checks.
8. **The command is `cairn doctor [<dir>]`:** no registry record, no credential, its own JSON
   payload kind.
9. **The scaffolder prints `cairn doctor` with a one-line install pointer** and never detects
   the binary.

## Go half: `tool/v1.1.0`

### Command

`cairn doctor [<dir>]`; the directory defaults to the working directory. It reads no registry
and no credential, so it runs before adoption and before first deploy. It follows the tool's
existing flag grammar (`--json`, `--theme`, quiet) and the single TTY predicate for color.

### Package

`tool/internal/doctor`, beside `health`. It reuses `spine`'s outcome shape, the five result
words, `Condition`, and `ExitCode`. One snapshot per run reads the wrangler config, the site
config, `svelte.config`, the package manifests, and the source files the heuristics scan. Each
check is a pure function over the snapshot. A file the snapshot cannot read is a per-check
`fail` or `unknown` as the ported check defines, never a process error.

### Checks

Ported from `src/lib/doctor`, behavior-equal except where a ruling above narrows it:
`config.bindings`, `config.media-bucket`, `config.observability`, `config.csrf-disable`,
`config.public-origin` (file half), `config.site-config` (shallow, ruling 2),
`config.no-referrer-blanket`, `config.dependency-floors` (reads
`node_modules/@glw907/cairn-cms/package.json` as a plain file), `admin.mount-shape`,
`auth.role-wiring`, and `ai.posture-effective` (a GET of `/robots.txt` on the origin the site
config names). Posture reports `unknown` with a new reason code, `ReasonNotDeployed`, when the
site config names no origin or the origin does not answer. "Unchecked" anywhere maps to
`unknown`; there is no sixth result word.

The `wrangler.jsonc`-over-`wrangler.toml` precedence matches the doctor's.

### Generated condition text

`tool/internal/spine/conditions.json`, embedded with `go:embed`, carries every `REGISTRY`
record (`id`, `severity`, `title`, `why`, `remediation`, `docsAnchor`, `logEvent`) plus the
site-config path. A failed check prints the title, the why, the remediation, and a cairn.pub
URL built from `docsAnchor`. The hand-ported id list in `spine/condition.go` and the regex drift
test in `condition_test.go` are replaced by the embedded file; exported names other packages
already use keep their signatures.

### Exit codes

Through `spine.ExitCode`: a failed `blocker` condition is CRITICAL (2); a failed condition of
lesser severity is WARNING (1); any `unknown` with no failure is UNKNOWN (3). A usage error
exits as the tool's cobra layer already exits.

### JSON

A new payload kind under the Task 20c contract with its own schema file, additive to the 1.0
frozen surfaces. Never a synthetic registry record.

### Dependencies

The TOML library and the YAML promotion land in one task that also amends
`tool/docs/adr/0002-render-dependencies.md` and the pinned direct-require count.

### Heuristic corpus

The four regex-tuned checks (SvelteKit source shapes in `checks-local.ts`) are tested against
fixtures lifted from the doctor's unit tests into a shared corpus directory under `tool/`, the
pattern Pass A used for the Node fakes. The corpus is extracted in the Go half, before the
engine half deletes those tests.

### Docs, help, and evidence

The `cairn agents` help topic, the man page (`mangen`), a `tool/docs` page for the command,
and text-report goldens. Release evidence is the conductor's work (Geoff's RC ruling): a
real-terminal run of `cairn doctor` against the four production sites, graded by a
fresh-context verifier, before the tag. If the draft-docs pass has moved the four public tool
pages under `docs/` by then, `v1.1.0` also carries the cairn.pub link repointing sized as
`v1.0.1`; otherwise that stays its own patch.

### Gate

`make -C <abs worktree>/tool check` through `cairn-run-gate` with `CAIRN_GATE_LANE=light`.
`go-conventions` for every file; `golang-spf13-cobra` for `tool/cmd/cairn`.

## Engine half: removal inside the `0.97.0` window

### Task A, first and alone: the generator and its gate

`scripts/build/emit-tool-conditions.mjs` writes `tool/internal/spine/conditions.json` from
`REGISTRY` and the scaffolder's `site-config-path.json`. `check:tool-conditions` fails when
regeneration is not a no-op, and joins `npm run check`. This merges to `main` before the Go
half branches, since the Go half embeds its output.

### Removal

- `package.json`: the `cairn-doctor` bin entry and its `chmod` in the `package` script.
- `src/lib/doctor/**` and the ten dedicated doctor test files.
- `wrangler-config.ts` moves to `src/lib/media-seed/wrangler-config.ts`, trimmed to
  `readR2Buckets` and `R2BucketEntry`; its tests follow; `media-seed.test.ts`'s mock path and
  the `emit-template-tree.test.ts` comment update.
- `conditions.test.ts` loses its doctor imports; `conditions.ts` and `check:readiness` do not
  change. Conditions whose only surfacing check was dropped keep their registry entries when an
  engine module still raises them; an entry nothing raises or checks is listed in the
  implementer's report for a conductor decision, never deleted silently.
- The five `scripts/checks/` files and the ten incidental test files the inventory names are
  swept for a stale doctor mention (bin lists, allowlists, comments).

### Scaffolder

`scaffold.mjs:249` becomes the `cairn doctor` reminder with a one-line install pointer.
`chapter2.mjs:805` loses `--from` and `--send-test` and becomes: run `cairn doctor`, deploy,
then sign in. The three string-assertion test files update. Transcripts `02-doctor-bare.txt`
and `03-doctor-credentialed.txt` and their README rows leave. `substitute.test.mjs`'s twin
assertion leaves with the engine copy.

### Docs

`docs/reference/doctor.md` is removed and the seven reference pages that mention the doctor are
corrected. `docs/extend/migration-notes.md` and `docs/extend/upgrade-cairn.md` record the
change. Facts bullets land in `docs/internal/facts/admin.md`, `extend.md`, and `reference.md`.
The frozen admin and extend pages get only the stale-command fix the freeze rule allows:
`npx cairn-doctor` becomes `cairn doctor`, dropped flags removed, no prose rewrite.
`docs/admin/is-it-working.md` keeps every heading `check:readiness` pins. The site upgrade
brief's four mentions are corrected. Anything past command repointing belongs to the docs
conductor (session `cairn-cms-3c`), who is briefed from this spec.

### Ledger, changelog, roadmap

One `docs/internal/engine-rulings.md` entry in the ledger's own format: the retirement verdict,
the three dropped checks, the D1 deferral, the shallow site-config read, and the evidence that
would reopen each (for the send test: an onboarding or deliverability failure the first sign-in
did not surface legibly). One `## Unreleased` CHANGELOG entry for the removal carrying
`Consumers must:` install `cairn`; replace `npx cairn-doctor` with `cairn doctor`; test for a
nonzero exit rather than `== 1`; expect no send test, App probe, tidy-key check, login probe,
or D1 checks. The four production sites are grepped for a scripted doctor call and any hit is
named in that line. ROADMAP files the D1 checks beside the 1.1 agent-permission check.

### Gate

The full heavy gate through `cairn-run-gate`, plus every gate in the inventory's section (k):
`check:package`, `check:surface --update`, `check:reference`, `check:reference:signatures`,
`check:snippets`, `check:docs`, `check:facts`, `check:readiness`, `check:symbols`,
`check:transcripts`, the scaffolder suite, `test:emit`, `check:template`, and the showcase's
`format:check`.

## Choreography

1. Wait for B2: `tool/v1.0.0` tagged and merged to `main`. Re-verify the sizing doc's facts
   and ruling 1's precondition against the merged tree. B2's worktree is never touched.
2. Task A merges to `main`.
3. Go half: worktree `doctor-go` off `main`; merged; `tool/v1.1.0` tagged and released with
   the `tool` workflow green.
4. Engine half: worktree `doctor-engine` off that merge SHA. Its first task asserts the
   `tool/v1.1.0` tag and release exist on origin and stops the half if they do not.
5. Close: HISTORY entry; ROADMAP; coordinate with whoever holds `main`; then the one STATUS
   line, "the `0.97.0` cut is unblocked", naming the `v1.1.0` tag and the removal's merge SHA.

Two executors, two worktrees, never shared with a docs pass. The Go half and the engine half
are sequential by ruling; inside each half the plan marks independent tasks.

## Out of scope

The `0.97.0` cut. The D1 checks and any credentialed check. A Go port of the site-config
schema. Scaffolder detection of the binary. Any narrative-arm rewrite. `cairn health` changes,
unless ruling 1's precondition fails and Geoff rules a change.

## Acceptance

- `cairn doctor` run in each of the four production site directories produces a report whose
  verdict per ported check matches `npx cairn-doctor`'s on the same tree, save the narrowed
  `config.site-config`.
- `tool/v1.1.0` exists as a tag and a release before any engine-half commit removes or
  repoints a doctor command.
- After the engine half: no `cairn-doctor` string in `package.json`, `src/`, `packages/`,
  the published doc arms, or the scaffolder's printed output, outside the changelog, migration
  records, the ledger, and `docs/internal/` history; `cairn-media-seed` still reads R2 buckets;
  every gate above is green.
- STATUS carries the unblock line, written once, by this pass's close.
