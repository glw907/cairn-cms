# Docs reset pass 1: planted defects for Task 11

This record lists the 17 defects planted for docs reset pass 1's validation (Task 11), under the
pre-registered rulings in the plan's "11 pre-flight" ledger row. The planted copies live outside
the repository at `$XDG_CACHE_HOME/docs-readers/planted/<job>/<page path>`
(`~/.cache/docs-readers/planted/`). Each copy is the page at `b2756399` with only the edits below.
No published page in the repository was changed. The planter never saw a reader prompt, a job
text, the harness, or any reader result. Each plant carries a type the page's reader class can
reveal by doing its job, and each is proven wrong by the code, a schema, or the tool's behavior.
No plant touches a line the baseline record
(`docs/internal/record/2026-09-23-docs-reset-baseline.md`) lists as a real failure (F1 to F6,
R1 to R4), and the scripter plants avoid the subjects of D01 to D19. Line numbers below are in the
planted copy. The scoring read uses this record to confirm a catch, per ruling 5.

## evaluator

Page: `docs/why-cairn.md` (planted copy: `planted/evaluator/docs/why-cairn.md`). Avoided: R1
(line 41) and F5 (no version stated).

| Id | Page:line | Type | Original text | Planted text | What a reader runs into | Proof |
| --- | --- | --- | --- | --- | --- | --- |
| P01 | `docs/why-cairn.md:22` | Undefined term | "A save holds on a per-entry branch;" | "A save holds on the entry's hold ref;" | "Hold ref" is never defined on the page or anywhere in the docs set. The reader cannot say where a saved edit lives before publish. The only "hold" in the docs is a CLI acknowledgement, which is unrelated. | A save commits to a per-entry branch under the `cairn/` prefix (`src/lib/content/pending.ts:7`, `PENDING_PREFIX = 'cairn/'`). No "hold ref" exists in the engine. |
| P02 | `docs/why-cairn.md:19-20` | Claim contradicted on the same page | "they sign in from an emailed link, with no GitHub account and no password, or," | "they sign in with their own GitHub account, with no password to manage, or," | Line 92-93 says the content lives in a GitHub repository "even if editors themselves never see it". Both cannot hold, so the reader cannot tell whether each editor needs a GitHub account. | The zero-config sign-in is the emailed magic link (`src/lib/auth-channel/factory.ts`, `src/lib/auth/crypto.ts`). Editors need no GitHub account. The GitHub App commits as `cairn-cms[bot]`. |

## operator

Page: `docs/admin/is-it-working.md` (planted copy: `planted/operator/docs/admin/is-it-working.md`).
Avoided: F1 (lines 33, 67, 102) and R4 (lines 42, 74).

| Id | Page:line | Type | Original text | Planted text | What a reader runs into | Proof |
| --- | --- | --- | --- | --- | --- | --- |
| P03 | `docs/admin/is-it-working.md:16` | Wrong flag | `cairn doctor` | `cairn doctor --dir .` | Running the page's first command fails with an unknown-flag usage error and exit 3. No report prints. | `tool/cmd/cairn/doctor.go:24` declares `Use: "doctor [<dir>]"`, so the directory is a positional argument. `doctor.go:42` registers `--json` as the only command flag. |
| P04 | `docs/admin/is-it-working.md:375` | Stale path | "copy `migrations/0004_login_nonce.sql` out of the package" | "copy `dist/migrations/0004_login_nonce.sql` out of the package" | Under `node_modules/@glw907/cairn-cms/` there is no `dist/migrations/` directory, so the file to copy is not where the page says. | `package.json` `files` ships `migrations` at the package root. The file is `migrations/0004_login_nonce.sql`, and `dist/` holds no migrations. |
| P05 | `docs/admin/is-it-working.md:224` | Removed step | "declare a `send_email` binding named `EMAIL` and a `d1_databases` binding named `AUTH_DB` in your `wrangler.jsonc`" | "declare a `send_email` binding named `EMAIL` in your `wrangler.jsonc`" | A site missing `AUTH_DB` that follows the remedy still fails `config.bindings` on the next `cairn doctor` run. The section's own lead (line 220-221) names both bindings. | `tool/internal/doctor/check_bindings.go:19-28` fails the check unless both `EMAIL` and `AUTH_DB` (`d1_databases`) are declared. `wrangler.go:15` and `:83` read the D1 binding. |

## designer

Page: `docs/extend/design-your-site.md` (planted copy:
`planted/designer/docs/extend/design-your-site.md`). Avoided: F2 (lines 31-33).

| Id | Page:line | Type | Original text | Planted text | What a reader runs into | Proof |
| --- | --- | --- | --- | --- | --- | --- |
| P06 | `docs/extend/design-your-site.md:45`, `:52`, `:60`, `:125` | Wrong file path (route) | `/styleguide` | `/style-guide` | Loading `/style-guide` on the dev server returns 404, so the live demo surface the recipe and the success check depend on is not found. | The scaffold's route is `templates/waymark/src/routes/(site)/styleguide/` (`+page.svelte`, `+page.server.ts`). |
| P07 | `docs/extend/design-your-site.md:17` | Stale import name | "the `$chassis` alias" | "the `$lib/chassis` alias" | A theme file importing `$lib/chassis/...` fails to resolve at build or `svelte-check`, since `src/lib/` holds no chassis. | `templates/waymark/svelte.config.js:17-18` declares `$chassis: 'src/chassis'`. Site code imports `$chassis/...` (`src/hooks.server.ts:4`, `src/routes/(site)/+page.server.ts:3`). |
| P08 | `docs/extend/design-your-site.md:116-117` | Removed step | "delete the file and those two route bodies and nothing else changes." | "delete the file and nothing else changes." | Deleting `src/chassis/feed.ts` alone breaks the build: two routes still import it. | `templates/waymark/src/routes/feed.xml/+server.ts:4` and `feed.json/+server.ts:4` both import `buildFeedItems` from `$chassis/feed.js`. |

## extender

Page: `docs/extend/add-a-custom-admin-screen.md` (planted copy:
`planted/extender/docs/extend/add-a-custom-admin-screen.md`). No baseline failure sits on this page.

| Id | Page:line | Type | Original text | Planted text | What a reader runs into | Proof |
| --- | --- | --- | --- | --- | --- | --- |
| P09 | `docs/extend/add-a-custom-admin-screen.md:38` | Wrong file path | `// src/lib/club/section.ts` | `// src/club/section.ts` | A file created where the comment says is not found by the page's own import `$lib/club/section.js` (line 57). The build fails to resolve the import. | `$lib` resolves to `src/lib` by SvelteKit's default (`templates/waymark/svelte.config.js:14` comment). The template declares no other alias. |
| P10 | `docs/extend/add-a-custom-admin-screen.md:140`, `:146`, `:153` | Stale export name | `createD1AuditSink` | `createAuditSink` | `import { createAuthGuard, createAuditSink } from '@glw907/cairn-cms/sveltekit'` fails typecheck and build. The subpath has no such export. | `src/lib/sveltekit/index.ts:82` exports `createD1AuditSink` (`src/lib/sveltekit/audit-sink.ts:92`). No `createAuditSink` exists in `src/lib`. |
| P11 | `docs/extend/add-a-custom-admin-screen.md:79` (sentence removed after "never one without the other.") | Removed step | "Declare a rule for this route's path in the access map or every session, owner included, gets a 403; see [Restrict admin access by role](./restrict-admin-access.md) for the map itself." | (removed) | A reader who adds the route and `requireAccess` but no access-map rule gets a 403 on `/admin/club/events` as the owner. No remaining step on the page tells them to declare the rule for the page route. | `src/lib/sveltekit/guard.ts:476-483`: `requireAccess` throws `error(403)` when `hasAccessRule(access, target)` is false, whatever the role. |

## core-developer

Page: `CONTRIBUTING.md` (planted copy: `planted/core-developer/CONTRIBUTING.md`). Avoided: F4
(lines 10-14) and F6 (lines 10-14, 18).

| Id | Page:line | Type | Original text | Planted text | What a reader runs into | Proof |
| --- | --- | --- | --- | --- | --- | --- |
| P12 | `CONTRIBUTING.md:101` | Wrong npm script name | "`npm run check:comments`" | "`npm run lint:comments`" | Running it fails with npm's "Missing script: lint:comments". | Root `package.json` scripts define `check:comments` and `lint`, and no `lint:comments`. |
| P13 | `CONTRIBUTING.md:98` | Stale path | "`vitest.config.ts` names each of those globs" | "`vitest.workspace.ts` names each of those globs" | The file the reader is told to check before placing a test does not exist at the repository root. | The root holds `vitest.config.ts` only (no `vitest.workspace.*`). |
| P14 | `CONTRIBUTING.md:20` (sentence removed after "rather than the published package.") | Removed step | "Its imports resolve into `dist/`, so run `npm run package` at the root after changing `src/lib` for the showcase to pick the change up." | (removed) | A reader who edits `src/lib` and reloads the showcase dev server sees no change, because the showcase still reads the old build. | Root `package.json` `exports` point every subpath at `./dist/...` (for example `./sveltekit` resolves to `./dist/sveltekit/index.js`). `examples/showcase/package.json:26` consumes the package through `file:../..`. |

## scripter

Pages at their `b2756399` HEAD versions (planted copies under `planted/scripter/docs/reference/`).
The held-out scoring against pass A's older versions is separate and unaffected. The plants avoid
D01 to D19's subjects.

| Id | Page:line | Type | Original text | Planted text | What a reader runs into | Proof |
| --- | --- | --- | --- | --- | --- | --- |
| P15 | `docs/reference/cli-cairn-json-output.md:88-89` | Missing enum value | "`actor` is one of four words: `operator`, `developer`, `provider-console`, `registrar`." | "`actor` is one of three words: `operator`, `developer`, `provider-console`." | A parser with a closed three-value `actor` enum rejects a real `site` payload whose delegation fix is addressed to the registrar. | `docs/reference/schema/cairn-health.schema.json:75` enumerates four actors, including `registrar`. `tool/internal/health/fixes.go:25` defines `ActorRegistrar`, used at `:119` for `CodeDelegationWrongNS`. |
| P16 | `docs/reference/cli-cairn-doctor.md:109` | Wrong field name | "an info check is told apart by its `note` field" | "an info check is told apart by its `info` field" | A parser keyed on `info` never finds an info check, and misreads every `INFO` result as a plain `PASS`. | `tool/internal/doctor/json.go:53` writes `Note` as `json:"note,omitempty"`. `docs/reference/schema/cairn-doctor.schema.json` declares `note` on a check, with `additionalProperties: false`. |
| P17 | `docs/reference/cli-cairn-exit-codes.md:64` | Wrong exit code | "Bare `cairn health` on an empty registry exits 3." | "Bare `cairn health` on an empty registry exits 0." | A wrapper treats a sweep over an empty registry as healthy. The real run exits 3 (`UNKNOWN`). | `tool/cmd/cairn/health_sweep.go:39-44` appends `spine.ErrExpectSites` as a listing error when the registry is empty, which folds to `UNKNOWN`. `health_sweep_test.go:245-247` is `TestHealthSweepOverAnEmptyRegistryIsUnknown`. |

## Counts

| Job | Pages | Plants |
| --- | --- | --- |
| evaluator | 1 | 2 (P01, P02) |
| operator | 1 | 3 (P03 to P05) |
| designer | 1 | 3 (P06 to P08) |
| extender | 1 | 3 (P09 to P11) |
| core-developer | 1 | 3 (P12 to P14) |
| scripter | 3 | 3 (P15 to P17) |
| Total | 8 | 17 |
