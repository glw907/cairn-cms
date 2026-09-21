# Doctor retirement: engine-side pre-flight inventory

Agent-facing input to the doctor-retirement pass's spec, not a plan and not a design. It records
what `cairn-doctor` touches across this repo, verified against the tree, so the retirement's
brainstorm starts from facts rather than a re-survey. Serves Geoff's 2026-09-21 ruling: the doctor
retires into the Go `cairn` tool before the `0.97.0` cut, as its own clean pass. Surveyed at
`origin/main` `6cf0a29a` (`git rev-parse --short origin/main`). The companion tool-side view,
covering how each check ports to Go, is
[`2026-09-21-doctor-retirement-tool-sizing.md`](2026-09-21-doctor-retirement-tool-sizing.md); read
both before scoping the retirement.

## (a) The bin and package surface

`package.json:181-186`'s `bin` map carries five entries; the doctor's is line 183:
`"cairn-doctor": "./dist/doctor/bin.js"`. No `./doctor` subpath exists in the `exports` map
(`package.json:87-`); the doctor is reachable only as a bin, never as an importable export.
`package.json:36`'s `package` script `chmod +x`s `dist/doctor/bin.js` alongside the other four
bins. `check:package` (`publint`, `attw`, `check-package-files.mjs`, `check-skill-budget.mjs`) and
`check:surface` (`check-surface.mjs`, `check-surface-leaks.mjs`) name no doctor-specific case in
their own source; dropping the bin line is what each would need to stop enforcing.
`check:reference` (`reference-coverage.mjs`) covers exported subpaths, and the doctor has none, so
it carries nothing to remove.

## (b) `src/lib/doctor/`, sixteen files

- `assemble.ts`: the flag parser, the context builder, and `defaultChecks()` (18 checks, matching
  the tool-sizing doc's count).
- `bin.ts`: the CLI entry, a thin shell over `index.ts`.
- `check-floors.ts`: the dependency-floors check (`config.dependency-floors`).
- `check-posture.ts`: the live AI-posture probe (`ai.posture-effective`).
- `check-probe.ts`: the opt-in `--probe` live admin GET/POST check.
- `checks-cloudflare.ts`: the Cloudflare API checks (sending-domain onboarding, zone HTTPS).
- `check-send.ts`: the opt-in `--send-test` live email send via the Cloudflare REST API.
- `checks-github.ts`: the GitHub App reachability chain check.
- `checks-local.ts`: the local-config checks (wrangler bindings, media bucket, CSRF, site-config,
  public origin, dependency floors' local half, admin-mount shape).
- `cloudflare-api.ts`: shared Cloudflare API plumbing (base URL, bearer token) for the two live
  Cloudflare checks.
- `index.ts`: the barrel aggregating the runner, report formatter, and assembly.
- `report.ts`: the one-line-per-check report with a why/remediation block per failure.
- `run.ts`: the runner; every check executes and lands in the result table.
- `site-config-path.json`: the shared data file naming the site-config path, read by both the
  doctor and `create-cairn-site`'s bake (see (e)).
- `types.ts`: the check model (`DoctorCheck`, `CheckResult`, `pass`/`fail`).
- `wrangler-config.ts`: the tolerant `wrangler.jsonc`/`wrangler.toml` reader. **Not doctor-only**:
  `src/lib/media-seed/bin.ts:12` and `src/lib/media-seed/assemble.ts:6` import
  `readR2Buckets`/`R2BucketEntry` from it directly, so deleting `src/lib/doctor/` whole would break
  `cairn-media-seed`. This file needs a new home (or a copy) before the directory goes; see (j).

## (c) Tests naming the doctor, thirteen files import a `doctor/` path

`src/tests/unit/doctor-bin.test.ts`, `doctor-check-floors.test.ts`, `doctor-check-posture.test.ts`,
`doctor-check-probe.test.ts`, `doctor-checks-admin-mount.test.ts`, `doctor-checks-cloudflare.test.ts`,
`doctor-checks-github.test.ts`, `doctor-checks-local.test.ts`, `doctor-derive.test.ts`,
`doctor-run.test.ts` (ten dedicated doctor test files); plus `src/tests/unit/conditions.test.ts`
(imports doctor-sourced condition ids), `src/tests/unit/emit-template-tree.test.ts` (a comment
cross-reference to `wrangler-config.ts`'s reader), and `src/tests/unit/media-seed.test.ts` (mocks
`../../lib/doctor/wrangler-config.js` directly, confirming (b)'s cross-import). A further ten files
match a bare "doctor" grep with no `doctor/` import path: `check-symbols.test.ts`,
`check-skill-budget.test.ts`, `delivery-data-dist-spawn.test.ts`, `peer-deps.test.ts`,
`transcript-blocks.test.ts`, `vite-bin.test.ts`, `vite-verify-references.test.ts`,
`guidance/bin.test.ts`, `audit/config.test.ts`, `integration/auth-guard.test.ts`; each names the
doctor incidentally (a bin list, a shared-fixture comment), not as a dependency.

## (d) `conditions.ts` and its `docsAnchor` values

`src/lib/diagnostics/conditions.ts`. Every one of its 24 `docsAnchor` values (the field is typed
optional at line 27) points at `docs/admin/is-it-working.md`, the doctor's own troubleshooting
checklist; none point elsewhere. `check:readiness` (`scripts/checks/check-readiness.mjs`) pins
every condition's `docsAnchor` to a real heading in that doc, failing on an orphaned anchor or a
missing one (allowlist aside). `check:symbols` (`check-symbols.mjs`,
`check-symbols-allowlist.mjs`) and `check:docs` (`docs-links.mjs`, which maps
`docs/guides/cloudflare-readiness.md` to the same doc at line 167) and `check:transcripts`
(`transcript-blocks.mjs:34`, which pins one transcript block count for `is-it-working.md`) all read
`is-it-working.md` too. Retiring the doctor bin does not retire these conditions; the diagnostics
registry and its docs anchor still describe deploy-time failure modes the replacement checks must
keep surfacing, in Go or in the doc.

## (e) The scaffolder: printed doctor commands

Two file:line locations print an operator-facing doctor command:
`packages/create-cairn-site/src/scaffold.mjs:249` ("Run `npx cairn-doctor` any time to check what
is set up and what is still missing.") and
`packages/create-cairn-site/src/cloudflare/chapter2.mjs:805` ("Run npx cairn-doctor --from
${from} --send-test <you@example.com> to check the ..."). Tests asserting those exact strings:
`packages/create-cairn-site/src/cloudflare/chapter2.test.mjs:1830-1888` (one test, two assertions,
the `--send-test` closing line); `packages/create-cairn-site/test/resume-chapter2.test.mjs:320-321`
and `:446-447` (the scaffold.mjs reminder, asserted twice, bare and resumed runs);
`packages/create-cairn-site/test/resume-cloudflare.test.mjs:174-175` (the same reminder). Beyond
the printed strings, `packages/create-cairn-site/src/substitute.mjs:15` and
`substitute.test.mjs:178-184` keep a committed twin of `src/lib/doctor/site-config-path.json` and
assert the two copies match; that pairing survives the doctor's bin removal only if the JSON file
(or its content) still exists somewhere both packages can read. Two golden transcripts fixture the
doctor's own report output:
`packages/create-cairn-site/test/fixtures/transcripts/02-doctor-bare.txt` and
`03-doctor-credentialed.txt`, documented in `.../transcripts/README.md`. Neither `templates/waymark`
nor `examples/showcase` reference the doctor (`examples/showcase/package-lock.json`'s one hit is
the lockfile's copy of the `bin` map, not a call site).

**Discrepancy against the tool-sizing doc:** its "Size and staging" section says
`create-cairn-site` "references it from four files." This inventory counts five files with a direct
"cairn-doctor"/"doctor's"/"lib/doctor" mention under `packages/create-cairn-site/src`
(`scaffold.mjs`, `substitute.mjs`, `substitute.test.mjs`, `cloudflare/chapter2.mjs`,
`cloudflare/chapter2.test.mjs`), plus two more under `packages/create-cairn-site/test`
(`resume-chapter2.test.mjs`, `resume-cloudflare.test.mjs`) and the transcripts fixture pair, none
of which the sizing doc's count may have included. The two counts were taken by different greps
(the sizing doc's basis is unstated); this inventory's five-plus-two is a direct
`grep -rl 'cairn-doctor\|doctor's\|lib/doctor'` over `src` and `test` separately, verified above.

## (f) The guidance payload

`cairn-guidance install` reads packaged trees via `resolveSourceRoot()`
(`src/lib/guidance/install.ts:43-49`), resolved against the installed package root for relative
directories such as `skills` and `claude/agents`. `grep -rli doctor skills claude` (the repo's two
shipped payload roots) returns no hits: the guidance payload carries no doctor reference.

## (g) Docs mentioning the doctor, by arm

`grep -rli doctor` per arm directory: **admin, 4 files**
(`setup-recovery.md`, `troubleshooting.md`, `what-to-run-and-when.md`, `is-it-working.md`);
**extend, 9 files** (`README.md`, `add-cairn-to-a-sveltekit-app.md`, `enable-tidy.md`,
`build-a-site-by-hand.md`, `rotate-the-github-app-key.md`, `upgrade-cairn.md`,
`security-model.md`, `migration-notes.md`, `sign-in-through-your-organization.md`);
**reference, 8 files** (`README.md`, `cli-cairn-media-seed.md`, `core.md`, `components.md`,
`vite.md`, `doctor.md`, `guidance.md`, `sveltekit.md`); **editors, 0 files**. Also:
`docs/internal/record/2026-09-21-site-upgrade-brief.md` (4 hits) and three files under
`docs/internal/facts/`: `reference.md`, `admin.md`, `extend.md`.

## (h) Gates, scripts, and workflows

`grep -rli doctor scripts/checks/` hits five files: `check-rulings-format.mjs`,
`check-symbols-allowlist.mjs`, `check-idioms.mjs`, `check-symbols.mjs`, `docs-links.mjs`. No file
under `.github/workflows/` names the doctor (`grep -rli doctor .github/workflows/` is empty), so no
CI workflow definition needs editing for the bin's removal itself; the `test`, `e2e`, and other
workflows that already run `npm test`/`npm run check` pick up the removal through those scripts.

## (i) The Go tool's mirror

`grep -rli doctor tool/` (paths only, no code read): `tool/internal/health/health.go`,
`tool/internal/spine/condition.go`, `tool/internal/spine/doc.go`.

## (j) Two questions the retirement's ruling must settle

1. **Where does `--send-test` live once the bin is gone?** The doctor's live send
   (`src/lib/doctor/check-send.ts`) is one real message through the Cloudflare Email Sending REST
   API, because the Worker's `env.EMAIL` binding is unreachable from a CLI
   (`check-send.ts:1-11`). The scaffolder tells the operator to run it at
   `packages/create-cairn-site/src/cloudflare/chapter2.mjs:805`. The tool-sizing doc proposes the
   Go tool keep this opt-in and read `CLOUDFLARE_API_TOKEN` from the environment for one run
   (its section 2); this inventory confirms the REST-vs-binding split and the printed command's
   exact location, but the call itself (credential model, whether it moves to `cairn` verbatim or
   changes shape) is the retirement pass's decision.
2. **Where does the config parsing move?** The doctor's local checks parse `wrangler.jsonc` or
   `wrangler.toml` through `src/lib/doctor/wrangler-config.ts` (jsonc wins when both exist), and
   `site.config.yaml` by delegating to `src/lib/nav/site-config.ts`'s `parseSiteConfig`
   (`checks-local.ts:17-18`). Per (b), `wrangler-config.ts` is also `cairn-media-seed`'s only
   source of `readR2Buckets`, so it cannot simply move into a deleted `doctor/` directory; the
   replacement checks must parse the same two files, and the shared reader needs a home outside
   `src/lib/doctor/` (a new small module, or promotion into `src/lib/nav/` beside
   `site-config.ts`) before the directory can go.

## (k) Gates the retirement pass owes

Removing a bin (and no `exports` subpath) from the public surface: `check:package`,
`check:surface --update`, `check:reference`, `check:reference:signatures`, `check:snippets`,
`check:docs`, `check:facts`, `check:readiness`, `check:symbols`, `check:transcripts` (all named in
(a), (d), and (h) above); the scaffolder's own test suite (`packages/create-cairn-site`'s `test`
script, `test/resume-chapter2.test.mjs`, `test/resume-cloudflare.test.mjs`, and
`src/cloudflare/chapter2.test.mjs`, all naming doctor strings per (e)); `test:emit` and
`check:template` (the emitted `templates/waymark` tree, even though it carries no doctor reference
today, is re-emitted and re-checked whenever `package.json`'s bin map changes); and the showcase's
`format:check`. A retirement removing a public bin also owes a
`docs/internal/engine-rulings.md` entry recording the removal's verdict and reopening condition,
per that ledger's own filing rule.
