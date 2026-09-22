# Retiring `cairn-doctor` into `cairn`: sizing from the tool side (B2 conductor, 2026-09-21)

Authored by the Go tool Pass B2 conductor; committed here by the pre-cut pass's close. See
[`2026-09-21-doctor-retirement-inventory.md`](2026-09-21-doctor-retirement-inventory.md) for the
engine-side inventory this file complements, including a noted discrepancy in the
"references it from four files" count below.

For whoever conducts the doctor-retirement pass. Geoff ruled on 2026-09-21 that the doctor retires
before `0.97.0`, as its own clean pass, shipping the replacement in the Go tool as `tool/v1.1.0`.
The engine-side inventory is the pre-cut conductor's
`docs/internal/record/2026-09-21-doctor-retirement-inventory.md`. This file is the tool-side view,
from a read-only study of `src/lib/doctor` against branch `cairn-tool-b2` (pre segment 5). Verify
each fact before relying on it; segment 5 changed the result words and added `cairn auth check`.

## The doctor today

Eighteen default checks plus two opt-in (`src/lib/doctor/assemble.ts:194-215`). About 2,800 lines
of source and 4,000 of unit tests. One text report, no JSON mode. Its own exit codes: 0 clean, 1
any fail, 2 bad flags, 3 unchecked with no fail (`run.ts:43-47`), which differ from the tool's
frozen 0 to 3 monitoring convention. It never shells out. `packages/create-cairn-site` references
it from four files and pins two golden transcripts of its output. 105 files under `docs/` mention
it. It has no park, hold, or resumable-step concept; those live in the scaffolder's chapters.

## The checks, by how they port

- **Pure local-file reads, ten, port as pure functions:** `config.bindings`,
  `config.media-bucket`, `config.observability`, `config.csrf-disable`, `config.public-origin`
  (file half), `config.site-config`, `config.no-referrer-blanket`, `config.dependency-floors`,
  `admin.mount-shape`, `auth.role-wiring`. They work before first deploy and need no credential.
- **Already covered by `cairn health`, two:** `edge.https-forced` (the https check) and
  `email.sender-onboarded` (the email check, which also adds the DNS half).
- **A credential-free GET, one:** `ai.posture-effective` (live `/robots.txt`); needs a deployed
  origin.
- **D1 reads, three:** `auth.store`, `auth.role-vocabulary`, `auth.email-normalization`. A D1
  query is a read, but whether `CAIRN_CF_READ_TOKEN` carries D1 read is UNVERIFIED. If not, it is
  an eighth permission in `tool/cmd/cairn/permissions.go` and `cairn auth check`.
- **Cannot port as they stand:** `github.app` mints an installation token from the GitHub App
  private key, the CMS's commit identity, which the tool must never hold. `email.live-send`
  (`--send-test`) sends real mail: no CLI can use the Worker's `env.EMAIL` binding, so it is
  Cloudflare's REST send, a WRITE permission. `config.tidy-key` calls Anthropic with the site's
  own key. `admin.login-probe` (`--probe`) is opt-in and reads the Workers subdomain API.

## The design forks for the brainstorm

1. **The input shape.** `record.Record` and `health.Options` carry no local directory, and every
   check plus `spine.ExitCode` assumes a registry record. A local action needs a directory input
   and a ruled verdict for a site with no record: a synthetic record, or a new payload kind with
   its own schema. Additive to 1.0's frozen surfaces either way. "Unchecked" maps onto the
   `unknown` result word with a new reason code; no sixth word.
2. **The App and send checks.** Proposed: replace the credentialed probes with observation the
   tool already does (`publish-path` and `deploy` show the App commits and the site builds; the
   email check plus the logs' send-failure events show mail goes out). That changes what the
   checks prove, from "the credential works" to "the outcome happened"; Geoff rules that
   knowingly. The send test stays opt-in and reads the operator's `CLOUDFLARE_API_TOKEN` from the
   environment for one run, never stored, the posture the after-1.0 framing brief set for the
   agent-permission check. The REST surface returns 10203 and 10204 (HTTP 403), never the
   binding's `E_` codes; see `docs/internal/record/2026-08-11-t4b-email-spike.md`.
3. **Parsers.** `wrangler.jsonc`, `wrangler.toml`, `site.config.yaml`: the standard library reads
   none. The tool pins its direct-require count and changes the graph only by amending
   `tool/docs/adr/0002-render-dependencies.md`. A JSONC stripper can live in-module; YAML and
   TOML each want one library.
4. **Heuristic drift.** Four checks carry regexes tuned to SvelteKit source shapes
   (`checks-local.ts`). Port them against the doctor's own fixtures as a shared corpus, the way
   Pass A extracted the Node fakes.
5. **`config.dependency-floors`** reads the engine's peer ranges from the installed package; Go
   reads the same from the site's `node_modules/@glw907/cairn-cms/package.json` as a plain file.
6. **The scaffolder.** `create-cairn-site` runs the doctor during scaffolding. If the doctor is
   `cairn`, the Go binary must exist at a new user's first run, or the scaffolder degrades without
   it. Install moves ahead of scaffold in the getting-started docs.
7. **The command's name and grammar**, its `--json` schema under the Task 20c contract, and the
   `cairn agents` help topic.

## Size and staging

About Pass B1's size to one and a half times it: a comparable check count, plus the new input
shape B1 never needed. The shortest form that still lets the cut remove the bin: `tool/v1.1.0`
carries the ten local checks, the no-record mode, the scaffolder change, and the cairn.pub link
repointing sized earlier as `v1.0.1`; the D1 and App checks are dropped or replaced by observation
at that release, with the rest designed beside the 1.1 agent-permission check, since it is the
same credential design. The docs conductor recommended the whole retirement before the cut; Geoff
said an additional pass is not a problem. Its gate includes `check:package`, `check:surface`, and
`check:reference`; the `Consumers must:` line sits in the removal's own changelog entry; its
close, landing last, is the ONLY writer of "the 0.97.0 cut is unblocked".

**Note (draft docs pass A's close, 2026-09-22).** The cairn.pub link repointing this section
stages into `tool/v1.1.0` has now been written, on `draft-docs-a`: the contract pages and the
seven schemas live under `docs/reference/`, the interim `tool/docs/reference/` copies are deleted
behind a stub, and `tool/internal/render/layout.go`, `cairn help`, and `tool/README.md` cite
cairn.pub URLs and schema `$id`s. It ships when `tool/v1.1.0` is tagged from a commit carrying
this pass, which is the next step after the merge. Nothing here is owed by the retirement's engine
half.
