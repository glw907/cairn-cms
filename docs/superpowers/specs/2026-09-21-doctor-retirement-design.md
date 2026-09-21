# Doctor retirement: `cairn-doctor` moves into `cairn doctor`

Status: design approved by Geoff in brainstorm, 2026-09-21; revised the same day after three
adversarial lenses (charter, mechanics, contract) and one architecture read of the three forks
Geoff then ruled. Agent-facing; not register-graded.

## Brief

`cairn-doctor`, the npm package's site-setup checker, retires. Its local checks move into the Go
`cairn` CLI as `cairn doctor [<dir>]`, released as `tool/v1.1.0`. The engine then removes the bin
and `src/lib/doctor` inside the `0.97.0` window. Geoff ruled the retirement on 2026-09-21; this
spec settles how, not whether. The work is one spec, one engine pre-task, and two numbered passes:
**retire-1** (Go, ends at the `tool/v1.1.0` release) and **retire-2** (engine removal, ends at the
STATUS line). retire-2's close is the only writer of "the `0.97.0` cut is unblocked". Nothing here
cuts `0.97.0`.

Inputs: `docs/internal/record/2026-09-21-doctor-retirement-inventory.md` (engine side) and
`docs/internal/record/2026-09-21-doctor-retirement-tool-sizing.md` (tool side). Corrections to
both, verified against the tree, are recorded where they bite below.

## Charter placement

`what-cairn-is-and-is-not.md` locates the Go tool as an owner-side cockpit over every site a
machine knows. `cairn doctor` is that cockpit's pre-adoption mode: same operator, same job, no
registry, which is what lets it serve a site before adoption and before first deploy. Every check
it carries measures the developer's use of a cairn contract (the `/admin` mount, `createAuthGuard`,
the CSRF handoff, the engine's peer floors), so none belongs to the developer's domain.

## Rulings (Geoff, 2026-09-21)

1. **The first-run send test already lives in the scaffolder and stays there.**
   `create-cairn-site`'s chapter 2 sends a real message to the owner's inbox inside its token
   window (`chapter2.mjs:740`, `cloudflare/email.mjs:143`). The doctor's `--send-test` was the
   re-run-any-time path. That re-run path **defers to 1.x** beside the D1 checks and the
   agent-permission credential design, where the write-credential question is ruled; ROADMAP
   files it. Known gap, named in the ledger: a hand-built (non-scaffolded) site has no send test
   until then, and `cairn health`'s email check is a configuration check that needs an adopted
   record and a Cloudflare read credential, so it does not substitute.
2. **The Go tool parses the files itself, shallowly.** `wrangler.jsonc` through an in-module
   JSONC stripper and `encoding/json`. `wrangler.toml` through a port of the doctor's own
   line-anchored shallow read (`wrangler-config.ts:213-282`, "not a TOML parser"), never a TOML
   library: a real parser gives different verdicts on real sites and adds a direct require.
   `site.config.yaml` through YAML, promoted from indirect to direct. jsonc wins when both
   wrangler files exist, silently, as the doctor does.
3. **`conditions.ts` stays the source** and ships unchanged except the two lines ruling 3a names.
   An engine script emits a neutral JSON mirror committed under `tool/`; Go embeds it.
   3a. `conditions.ts:131`'s `why` and `:2`'s header comment name "the doctor"; both are reworded
   in the pre-task, since the generator copies `why` verbatim into the tool's output.
4. **Ledger entries, no consultation.** One entry per ruled item (see Ledger below).
5. **Exit codes take the tool's frozen convention:** 0 OK, 1 WARNING, 2 CRITICAL, 3 UNKNOWN. A
   usage error exits 1 as the tool's cobra layer already does; the collision with a WARNING
   failure is accepted and stated on the command's docs page.
6. **`wrangler-config.ts` moves to `src/lib/media-seed/`,** trimmed to `readR2Buckets` and
   `R2BucketEntry`, with the `DoctorContext['readFile']` type inlined. The engine's copy of
   `site-config-path.json` leaves; the scaffolder's copy is the one source.
7. **Adapter facts reach Go through a committed, verified file.** `config.media-bucket`,
   `auth.role-wiring`, and `ai.posture-effective` take their deciding input from the site's
   TypeScript adapter, which no Go process can evaluate. The engine's Vite plugin writes
   `src/content/.cairn/site-facts.json` beside `index.json` and `media.json`.
8. **Check scope for `v1.1.0`:** eight file-only checks plus the three facts checks. Deferred to
   1.x: the three D1 reads, the send-test re-run, and the workers.dev exposure arm of `--probe`
   (a Cloudflare read nothing else performs). Dropped: `github.app`, `config.tidy-key`, and the
   login-envelope arm of `--probe`. `edge.https-forced` and `email.sender-onboarded` are
   `cairn health` checks and are reachable only after adoption; the ledger says so.
9. **The command is `cairn doctor [<dir>]`:** no registry record, no credential, its own JSON
   payload kind.
10. **The scaffolder prints `cairn doctor` with an install pointer and never detects the
    binary.** Its closing text also names adoption and `cairn health` as the step that reaches
    the https and email checks.
11. **Two passes, not one.** The pre-task merges alone; retire-1 and retire-2 each carry their own
    plan, token ceiling, segments, and close.

## Pre-task (engine, one PR, merges before retire-1 branches)

Branch `doctor-pretask` off `main`, heavy gate. Three deliverables.

**The conditions mirror.** `scripts/build/emit-tool-conditions.mjs` writes
`tool/internal/spine/conditions.json` from `REGISTRY` (`id`, `severity`, `title`, `why`,
`remediation`, `docsAnchor`, `logEvent`). `conditions.ts` is TypeScript and a plain `.mjs` cannot
import it; the script reads it through the repo's existing TS-capable path (the built `dist` or
the loader the other `scripts/` use), named in the plan after a look at what `scripts/` already
does, never a regex over source. A second small artifact, `tool/internal/doctor/site-config-path.json`,
carries the scaffolder's site-config path; a path is not a condition and does not ride in the
conditions file. `check:tool-conditions` fails when regeneration is not a no-op. `npm run check`
is only `svelte-check`; the gates are individual `test.yml` steps, so the new script joins as one.
`test.yml`'s `paths-ignore: ['tool/**']` suppresses it only for a commit touching nothing but
`tool/`, and `tool.yml` has no Node, so a hand edit to a generated file alone would run no gate:
a third small workflow triggers on the two generated files and runs that one check. Acceptance includes proving the gate red on a
hand-edited mirror.

**`site-facts.json`.** It follows the split `index.json` already has: the `cairn-manifest` bin
**writes** it (`writeManifest`, `src/lib/vite/internal.ts:195-218`) and the Vite plugin
**verifies** it at `buildStart` (`:171-177`), so a stale file fails the build exactly as a stale
manifest does. An **absent** file never fails a build: no site's `build` script runs the bin, so
an upgrading site has no file yet, and the verify is skipped with one warning naming
`npx cairn-manifest`. `virtualSource` is manifest-shaped and is not reused; `evalVirtual`,
`findCairnOptions`, and `resolveViteRoot` are. Shape: `"version": 1`,
`mediaBucketBinding`, `roles` (the custom role vocabulary), `aiPosture`. All three values already
sit in committed adapter source, so the file leaks nothing. It is a cross-language contract, so it
gets a reference page, a facts bullet, a `check-symbols-allowlist` path entry beside the other
`.cairn` files, and a CHANGELOG line (additive; a site gains the file at its next build on
`0.97.0`). `readAdapterFacts` keeps this caller and is not dead code after the removal; its
doctor-only fields (`from`, `owner`, `repo`) are trimmed in retire-2.

**The `conditions.ts` rewordings** of ruling 3a, three in fact: `:2`, `:131`, and `:235`'s
remediation ("run the full doctor"). No test pins the text.

**A new condition id, `config.media-bucket-missing`** (warning), so the media check stops
borrowing `config.bindings-missing`'s remediation. `check:readiness` fails closed on a condition
with no heading and its allowlist is deliberately empty, so the id brings one new section in
`docs/admin/is-it-working.md`, following the `config.tidy-key-missing` precedent in the ledger.

## retire-1: the Go pass, `tool/v1.1.0`

Worktree `doctor-go` off the pre-task's merge. Gate: `make -C <abs worktree>/tool check` through
`cairn-run-gate` with `CAIRN_GATE_LANE=light`. `go-conventions` on every file;
`golang-spf13-cobra` for `tool/cmd/cairn`. About nine tasks in three segments.

### Command and package

`cairn doctor [<dir>]`; the directory defaults to the working directory. It follows the tool's
flag grammar (`--json`, `--theme`, quiet) and the single TTY predicate. Package
`tool/internal/doctor` sits beside `health` with **its own check contract**: `health.Check.Run`
takes a `record.Record`, which a directory run does not have. `spine.ExitCode`, `CheckVerdict`,
`Condition`, and the severity types carry no record and are reused as they are. One snapshot per
run reads the wrangler config, `site.config.yaml`, `site-facts.json`, `svelte.config`, the
package manifests and lockfiles, and the source files the heuristics scan; each check is a pure
function over it.

**Outside a cairn site** (no wrangler file and no `@glw907/cairn-cms` dependency in
`package.json`), the command prints one line and exits 3, never a wall of failures.

**Containment.** Every read stays under the resolved `<dir>`, symlinks included, in the stronger
form `media-seed/bin.ts:102-113` uses; the site-config path gets the shape verification
`substitute.mjs:27-40` applies (relative, no leading `/`, no `..`, no NUL). This carries forward
the 2026-09-02 ledger amendment.

### Checks

File-only, eight: `config.bindings`, `config.observability`, `config.csrf-disable`,
`config.public-origin` (file half), `config.site-config`, `config.no-referrer-blanket`,
`config.dependency-floors`, `admin.mount-shape`.

Facts-dependent, three: `config.media-bucket`, `auth.role-wiring`, `ai.posture-effective`. When
`site-facts.json` is absent they report `unknown` with `ReasonNotObservable` and the message
"needs engine 0.97.0 or later, and one build".

Details the port must honor:

- `config.site-config` asserts exactly this: the file is found at one of the known paths, parses
  as YAML, and its root is a mapping with a non-empty `siteName`. No ported check reads any other
  site-config field. It will pass files the doctor failed (a stale Contract v2 block). The
  scaffolded template parses the config at module load, so a template-shaped site fails its
  build; a legacy site surfaces a bad config in the admin Settings screen. The ledger records
  the narrowing.
- `ai.posture-effective` takes its origin from the wrangler config's `vars.PUBLIC_ORIGIN`, then
  the environment, the precedence `config.public-origin` uses (`check-posture.ts:52`). No origin,
  or an origin that does not answer, is `unknown` with `ReasonNotObservable`.
- `config.dependency-floors` hand-rolls the doctor's three functions (`parseVersion` plain
  `x.y.z`, `caretFloor`, `compareVersions`, `check-floors.ts:20-37`); no semver library, which
  would accept more and diverge. It reads the three lockfile formats in the doctor's npm, pnpm,
  yarn order, and reads the engine's peers from
  `node_modules/@glw907/cairn-cms/package.json` as a plain file; a hoisted monorepo that path
  misses reports `unknown`.
- `config.media-bucket` gets its own remediation text rather than borrowing
  `config.bindings-missing`'s, the defect `checks-local.ts:288-291` records. If that needs a new
  condition id, the pre-task adds it to `conditions.ts`.
- **Status mapping**, all five doctor statuses: `pass` to pass; `fail` to fail at the condition's
  severity; `skip` to skip; `info` to pass with its note printed (never `unknown`, so today's
  exit-0 runs stay exit 0); `unchecked` to `unknown`.
- Each check's printed label equals its condition's registry `title`, which
  `is-it-working.md`'s label-to-section table relies on.

### Frozen surfaces

`tool/docs/reference/json-output.md` freezes the reason vocabulary and the check-id list at 1.0.
No reason code is added (`ReasonNotObservable` is reused). The eleven new check ids extend the
published list under a heading scoped to `cairn doctor`, the freeze sentence is amended to say
additions are minor-version events and renames or removals major, and the schema tests that pin
those lists (`render/json_schema_test.go`) move with the page. The new JSON payload kind has its
own schema file under the Task 20c contract.

### Condition ids and text

The 24 typed `Condition` constants in `spine/condition.go` stay hand-written: they are the frozen
ids, and compile-time checking is worth keeping. The embedded `conditions.json` supplies text.
A Go test asserts the constant set equals the embedded id set, replacing the regex read of
`conditions.ts`; the test keeps the existing ruling in its comment, that an engine id rename is a
human decision and a major-version event, never an automatic follow.

A failure prints the title, the why, the remediation, and a docs URL of the form
`https://cairn.pub/docs/admin/<basename>#<fragment>` from `docsAnchor`. Before the tag, the
conductor confirms each distinct page resolves on the deployed cairn.pub; if the page does not
resolve at tag time, the tool prints the anchor text without a URL and a `v1.1.x` patch adds the
link after the pin bump.

### Dependencies

YAML promoted to a direct require, in one task that also amends
`tool/docs/adr/0002-render-dependencies.md` and `internal/render/purity_test.go`'s
`otherDirectRequires`. No other new module.

### Corpus

The four regex heuristics, `requireOrigin`'s cases, and the wrangler-config reader's cases are
lifted from the doctor's unit tests into a shared corpus under `tool/`, before retire-2 deletes
those tests. The heuristics key on engine symbols (`CairnAdminShell`, `.shellLoad`,
`createAuthGuard`'s argument shape, `checkOrigin: false`); retire-2 adds the engine-side
tripwire.

### Docs, help, evidence

The `cairn agents` help topic, the man page, a `tool/docs` page for the command (exit codes,
the usage-error collision, the engine-version note), text-report goldens, and the tool's
CHANGELOG entry. Release evidence is the conductor's work: a real-terminal run graded by a
fresh-context verifier, then merge, then the tag and the release with the `tool` workflow green.

## retire-2: the engine pass

Worktree `doctor-engine` off the `v1.1.0` merge SHA. Heavy gate through `cairn-run-gate`. About
seven tasks in two segments. Its first task commits `scripts/checks/check-tool-release.mjs`,
which asserts the `tool/v1.1.0` tag **and its GitHub release** exist on origin; the plan runs it
before any removal commit, and a red result stops the pass.

### Removal

- `package.json`: the `cairn-doctor` bin entry and its `chmod`.
- `src/lib/doctor/**` and the ten dedicated doctor tests; `doctor-derive.test.ts`'s coverage of
  `readAdapterFacts` moves to the facts writer's tests.
- The `wrangler-config.ts` move of ruling 6; `media-seed/assemble.ts:6`, `bin.ts:12`, and the
  `media-seed.test.ts` mock repoint. Acceptance spawns the built `cairn-media-seed` bin (the
  `delivery-data-dist-spawn` precedent).
- `CairnTidySettings.svelte:629`: the sentence telling an editor to run `cairn-doctor` is
  rewritten to stop at "reload this page"; `config.tidy-key` no longer exists to confirm
  anything. `check:prose` gates it.
- A sweep by predicate, not by file count: after the pass,
  `grep -rn 'cairn-doctor\|lib/doctor' src packages scripts templates examples` returns nothing
  outside generated lockfiles. Comments in `src/lib/vite`, `sveltekit/csrf.ts`, `guard.ts`,
  `condition-response.ts`, `dev-flag.ts`, `delivery/robots.ts`, and the incidental tests are
  reworded to name `cairn doctor` or the condition, whichever is true.
- **No `REGISTRY` entry is deleted in this pass.** `config.tidy-key-missing` and
  `admin.login-probe-failed` become unraised; they stay, since `check:readiness` pins each to a
  frozen-page heading. ROADMAP files their removal for the docs rebuild.
  `github.app-unreachable` keeps its runtime raiser (`github/credentials.ts:20`).

### Gates that break

`scripts/checks/check-symbols.mjs:361-374` reads `src/lib/doctor` with `readdirSync` and would
crash. The check-id vocabulary it builds moves to a committed list the script reads (the eleven
surviving ids plus the deferred and dropped ids docs history still cites), and the
`check-symbols-allowlist.mjs` entries excused by `docs/reference/doctor.md` (`:36`, `:69`, `:83`,
`:106-107`) are re-grounded or removed. `check:transcripts`' floor of one block for
`is-it-working.md` is met by a new `cairn doctor` transcript captured from the released binary
against the scaffolder's fixture site, with the capture procedure in the transcripts README; the
floor is not lowered. `check:tool-heuristics` is added: it fails when any of the four symbols the
Go heuristics key on disappears from `src/lib`, with a `// WATCH:` comment at each symbol.

### Scaffolder

Three print sites, not two: `scaffold.mjs:249`, `chapter2.mjs:805`, and `bin.mjs:88`'s
`doctorLine` (printed from five closing blocks). The reminder becomes: run `cairn doctor` any
time; install with `go install github.com/glw907/cairn-cms/tool/cmd/cairn@latest` or from the
release page, whose URL is written literally. The chapter 2 line drops `--from` and
`--send-test`, keeps the fact that the installer just sent a test message, and names
`cairn adopt` then `cairn health` for the https and email checks. Transcripts `02` and `03`
leave. `01-create-cairn-site.txt` and `01d-resume.txt` stay byte-identical: they are real pty
captures of a live 2026-08-17 run against a torn-down site, and the fixtures README forbids edits
and invented output, so the README gains a note that they predate the retirement and still print
the old reminder. That directory is the removal predicate's one carve-out. The README's other
doctor prose is rewritten. The string-assertion tests and `substitute.test.mjs`'s twin assertion follow.

### Docs

In scope: the 21 files in the published arms. `docs/internal` and `docs/superpowers` are history
and are not swept; nor are past-version entries in `migration-notes.md`.

- `docs/reference/doctor.md` leaves; a reference page for `site-facts.json` arrives (pre-task).
  The seven cross-arm links to the removed page are retargeted to the tool's command page or
  unlinked.
- Procedures whose verification step was a dropped or deferred check get a truthful replacement
  step, under the freeze rule's stale-step allowance, no other prose touched:
  `rotate-the-github-app-key.md` (publish an edit, then look for `github.unreachable` in the
  logs), `enable-tidy.md` (run one tidy; a bad key fails there with its log event),
  `sign-in-through-your-organization.md` (sign in once; read the guard events),
  `add-cairn-to-a-sveltekit-app.md` and `build-a-site-by-hand.md` (`cairn doctor`, then the first
  publish).
- `is-it-working.md` keeps every heading. The sections for the tidy key, the App, the admin
  probe, and the auth store each gain one line saying which command checks it now or that none
  does until 1.x, and the label-to-section table marks those rows.
- Facts bullets in `admin.md`, `extend.md`, `reference.md`. `upgrade-cairn.md`'s live procedure
  and a new `migration-notes.md` entry record the change. The site upgrade brief's four mentions
  are corrected.
- The docs conductor (`cairn-cms-3c`) is briefed from this spec: install precedes scaffold, and
  the admin arm's rebuild inherits the dropped-check sections.

### The `## Unreleased` window

One task reconciles the window so the `0.97.0` notes do not say the doctor both gains features
and leaves. Per entry: `:2251` (migration 0004's `Consumers must:` telling operators to run the
`auth.store` check before deploy) is rewritten to `wrangler d1 migrations list`, since that check
runs nowhere at `0.97.0`; `:1401-1432` (status vocabulary and exit code 3), `:2169`, and `:2326`
(probe changes) fold into the removal entry as superseded; `:185` and `:251` reword the actor to
`cairn doctor`; `:332-337` repoints to the scaffolder's path file; `:509-517`'s claim that
transcript `03` stays is corrected. Line numbers are as surveyed on 2026-09-21 and are re-found
by content. The removal entry carries `Consumers must:` install `cairn`; replace
`npx cairn-doctor` with `cairn doctor`; test for a nonzero exit; build once on `0.97.0` so
`site-facts.json` exists; expect no App probe, tidy-key check, login probe, D1 checks, or send
re-run. It states what the survey found: no site scripts the doctor; four wrangler configs and
three config comments cite it; one installed guidance copy in aksailingclub-org refreshes on the
next `cairn-guidance install`; site plan history is left alone. cairn-pub's hardcoded
`/docs/reference/doctor` link (`src/routes/(site)/docs/+page.svelte:67`) is filed to cairn-pub.

### Ledger

One entry per ruled item in `engine-rulings.md`'s format, each with `Reopens on:` and, for retire
and reshape verdicts, a `Shape:` line: the retirement; `github.app` dropped (substitute: the
`github.unreachable` runtime event; gap and reopening evidence: a never-published site);
`config.tidy-key` dropped (ground: it false-fails a correctly deployed site, whose key is a Worker
secret the CLI cannot see, `checks-local.ts:310-318`); the login-envelope probe dropped; the
workers.dev exposure arm deferred; the send re-run deferred; the three D1 reads deferred; the
`config.site-config` narrowing; `site-facts.json` as new engine surface. Each overturned or
affected `audit-cli-*` entry is closed, amended, or given a progress note by name, including the
open tidy-key reshape and the media-seed entry whose evidence cites the old import path.
`check:rulings-format` joins the gate list.

### Gate list

The heavy gate plus: `check:package`, `check:surface --update`, `check:reference`,
`check:reference:signatures`, `check:snippets`, `check:docs`, `check:facts`, `check:readiness`,
`check:symbols`, `check:transcripts`, `check:rulings-format`, `check:tool-conditions`,
`check:tool-heuristics`, `check:prose`, the scaffolder suite, `test:emit`, `check:template`, and
the showcase's `format:check`. `tool.yml` path-triggers on `conditions.ts` and
`is-it-working.md`, so an engine PR touching either also runs the Go gate; that is expected.

### Close

HISTORY entry; ROADMAP (the deferred checks beside the agent-permission check, the two unraised
registry entries, the cairn-pub link); then the STATUS line, in the commit that names the
`v1.1.0` tag and the removal's merge SHA. Before that write, message whichever session holds
`main` (the B2 conductor was `cairn-cms-2f` on 2026-09-21).

## Choreography

0. This spec and the two plans land on `main` by PR from `doctor-retirement`.
1. B2 closes: `tool/v1.0.0` tagged, merged, released. B2's worktree is never touched.
2. Pre-task, branch `doctor-pretask`, merges. It adds one Go constant for the new condition id,
   since the tool's drift test asserts id-set equality with `conditions.ts`, so it never runs
   before B2's merge.
3. retire-1, branch `doctor-go`: verified, then merged to `main` **without a tool tag**. It has
   no tag task and no release task.
4. Draft docs pass A (the docs conductor's pass,
   `docs/superpowers/plans/2026-09-21-draft-docs-pass-a.md`) runs against that `main`. It moves
   the tool's contract pages and schemas under `docs/reference/`, including the
   `cairn doctor` page and the seventh schema, and repoints the binary's help and tests. Its
   pre-flight requires that retire-2 has not started and that no `tool/v1.1.0` tag exists.
   retire-1's conductor sends the docs conductor an inventory before pass A runs: the command
   page, the seventh schema's file name, every test naming either, and anything else new under
   `tool/docs/reference/`.
5. One `tool/v1.1.0`, tagged and released from a commit carrying retire-1 and pass A. A tag's
   help text is permanent, so the binary `0.97.0` announces never names a deleted path. Who
   conducts this tag is Geoff's to rule; it is no task of retire-1 or retire-2.
6. retire-2, only once that release exists, as two plans in order: **retire-2a**, the removal
   (branch `doctor-engine`, heavy gate), then **retire-2b**, the records (branch
   `doctor-records`, light lane: facts additions, the changelog window, the ledger, the close).
   "retire-2's close" means 2b's close; it lands last and writes "the `0.97.0` cut is
   unblocked".

(Geoff, 2026-09-21, the five-step order, relayed by the docs conductor and matching his opening
constraints to this pass.) Consequences elsewhere in this spec: the `cairn doctor` command page
is written at `tool/docs/reference/cli-cairn-doctor.md` as interim operator copy, since pass A
drafts the public page fresh; the docs-URL fallback in "Condition ids and text" is moot when
pass A's pages are live at tag time, and stays as the rule if they are not.

One executor per worktree; none shared with a docs pass.

## Out of scope

The `0.97.0` cut. Any credentialed check. A Go port of the site-config schema or a TOML parser.
Scaffolder detection of the binary. Narrative-arm rewrites past the named stale-step fixes.
`cairn health` changes. Deleting registry entries.

## Acceptance

retire-1:

- For each of the eight file-only checks, on each of the four production site trees as they
  stand, `cairn doctor --json` and the doctor built from `main` agree under a status mapping
  table committed in `tool/testdata/`; disagreements are recorded per check as expected or
  defect, and zero are unexplained. `config.site-config` compares on found-and-parses only.
- The three facts checks are compared the same way on the showcase and on one production site
  linked to `main` with `link:consumer` (restored after), a site that declares media, custom
  roles, and an AI posture. Against a site with no `site-facts.json` they report `unknown`.
- Exit codes proven by test: a blocker failure exits 2, a warning failure 1, unknown with no
  failure 3, clean 0; outside a cairn site, one line and 3.
- A golden JSON payload validates against the committed schema; `json-output.md` publishes the
  eleven ids; the constant-set test fails on a mirror with a renamed id.
- A read through a symlink leaving `<dir>` is refused.
- The release exists with the `tool` workflow green on its SHA.

Pre-task and retire-2:

- `check:tool-conditions` goes red on a hand-edited mirror, and the third workflow runs it.
- A build with a changed adapter and a stale `site-facts.json` fails.
- The removal predicate grep is empty; the built `cairn-media-seed` bin reads R2 buckets.
- Every gate in the list is green; the ledger entries pass `check:rulings-format`; the facts
  bullets, the `Consumers must:` line, and the ROADMAP entries exist.
- No published-arm page instructs a reader to run a command or flag that does not exist.
- STATUS carries the unblock line, written once, by retire-2's close.
