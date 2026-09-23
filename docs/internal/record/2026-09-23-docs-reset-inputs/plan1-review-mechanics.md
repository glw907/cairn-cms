# Plan 1 review: mechanics and feasibility

Lens: can each task run as written on this workstation. Probes ran on 2026-09-23 with Claude Code
2.1.280 and podman 5.8.4 (rootless, SELinux on, netavark).

## Critical

**C1. Credential copy leaks Cloudflare OAuth, and refresh can log out the host (plan 101-102, 84-85).**
`~/.claude/.credentials.json` holds `claudeAiOauth` plus four `mcpOAuth` entries for the Cloudflare
MCP servers, which are account-wide tokens. A Bash-class reader, or an npm script it runs, can read
its own copy. The access token expires about 6.3 hours after it was minted (`expiresAt` minus now).
A long batch therefore refreshes inside N parallel containers against one refresh token. If the
server rotates the refresh token, the containers race each other and can invalidate the conductor's
own login. Probe: a copy that keeps only `claudeAiOauth`, run in `node:22` under `--userns=keep-id`
and `:Z`, authenticated with `apiKeySource: "none"` and read a file.
Fix: copy `claudeAiOauth` only. Better, mint one long-lived token with `claude setup-token` and pass
it as `CLAUDE_CODE_OAUTH_TOKEN`, so nothing refreshes and nothing writes back. Have the runner check
`expiresAt` against the batch's expected duration before it starts.

**C2. The init-event acceptance cannot pass as written (plan 118-119).**
Even under `--safe-mode --restricted --strict-mcp-config`, the init event lists 18 built-in skills
(`deep-research`, `schedule`, `claude-api`, and others), plugin `telemetry` (the host run also listed
`agents-md`), agents `claude`/`Explore`/`general-purpose`/`Plan`, and 53 slash commands. No field
reports CLAUDE.md or memory. The event also shows that the conductor's shell sets `ANTHROPIC_API_KEY`
(a host probe reported `apiKeySource: "ANTHROPIC_API_KEY"`), so `env -i` is load-bearing.
Fix: pin a per-CLI-version baseline and assert the following: `tools` equals the class declaration;
`mcp_servers` is `[]`; `plugins` and `skills` equal the pinned built-in baseline; `apiKeySource` is
`"none"`. Prove CLAUDE.md absence structurally, with no such file mounted, plus a canary CLAUDE.md
placed outside the mount in the escape suite.

## Major

**M1. The GitHub token branch is dead (plan 151-152).** GitHub has no API to create either classic
or fine-grained PATs ([discussion #120437](https://github.com/orgs/community/discussions/120437)).
Fix: drop the "if the account allows it" branch. Prefer a cairn-cms GitHub App installation token
from `POST /app/installations/{id}/access_tokens` with `repositories: ["cairn-scratch-b"]` and
`permissions: {contents: read, metadata: read}`. That needs no owner sitting. It expires in one
hour, so the runner mints one per batch. First verify that `cairn auth check`'s account-scoped
Metadata row (`tool/cmd/cairn/permissions.go:43`) accepts an installation token. Otherwise keep the
owner sitting and say so.

**M2. Cloudflare "scoped to that Worker and D1 alone" is only partly possible (plan 150, 160).**
Per-Worker scope arrived in the 2026-09-15 changelog and has three conditions: the token must be
account-owned, the Worker must already exist, and product-level roles still span every Worker.
`cairn auth check` probes account-scope rows (Workers Scripts, Builds Configuration, Observability,
and Zone, at `permissions.go:35-38`), which a per-Worker token may fail. Per-database D1 scope is
unverified.
Fix: order the steps as Worker, then D1, then token. Confirm that the minting token has Account API
Tokens write (see the estate inventory). State which `auth check` rows are expected to fail. Test
isolation with the denied calls, as the plan already says.

**M3. The rot measure is zero by construction (plan 180-182, 226).** `check:facts` enforces exactly
this 10-line window (`check-facts.mjs:62, 296-326`), and it passes at HEAD
(`check-facts: OK`). The ">10%" trigger in Task 6 can therefore never fire.
Fix: measure exact-line rot, meaning anchor tokens absent from the cited lines themselves.
Alternatively, measure drift since each bullet's filing commit.

**M4. The network is not removed, and the leak surface is wider than the spec's accepted residual
(plan 100-103).** The container needs egress for the API. `npm` scripts, `curl` inside a build, and
`git clone` can all reach GitHub and npm. The transcript scan sees only Bash command text, never
what a child process fetches.
Fix: run with `--network` bound to a host egress proxy that allowlists `api.anthropic.com`, plus
Cloudflare and GitHub for the operator class only, and log denials into the report. The
docs-and-site class then runs with install done at preparation. That is coherent, because
vite/svelte builds need no network.

**M5. The token ceiling is unrealistic (plan 26).** Pass A spent about 6.1M against a 3.5M ceiling
with no readers (`2026-09-21-draft-docs-pass-a.md:509`). This plan adds the following: Task 4 at 15
runs; Task 10 at about 4 classes times 3 runs on the planted set plus 3 on the real failures, around
24 to 30 runs, plus a fix round; live runs in Tasks 1 to 3; the Task 8 chain dry run; and two `opus`
implementers. The `usage` blocks also carry `cache_read_input_tokens`, and the ledger does not say
how it counts them.
Fix: raise the ceiling to about 12M, or account reader runs separately. Define the ledger's counting
rule. Treat a 429 or a rate limit as its own batch-stop class, distinct from an auth failure and from
a stall.

**M6. The fact count and the id placement are wrong or unspecified (plan 199-201).** 845 is a line
count that includes the skipped `## Harvest record` and `## Provenance` bullets. The checker counts
810 facts (86+83+335+42+264). The README grammar (`README.md:19`) requires the tag to be last, and
the any-bracket scan rejects stray brackets.
Fix: name the form and where it goes. A leading code span such as `` - `f:7k3q9x` <claim>... `` works,
because code spans are stripped before the bracket scan (`check-facts.mjs:17-23`). Have the migration
skip the two allowlisted sections.

**M7. "Owner-tier claims" are not lexically extractable (plan 221).** The docs-standard spec
(lines 575-577) lists owner-tier product claims among the extractable facts, but a claim cannot be
detected without a phrase to match.
Fix: give each owner-tier bullet a quoted key phrase, and have the extractor match those phrases.

## Minor

- **m1.** `--tools` is variadic and swallows a trailing prompt (probe: "Input must be provided").
  Pass the job on stdin. `stream-json` requires `--verbose` (probe error). The result event's
  `permission_denials` array is the refusal evidence Task 1 needs; a probe showed a compound
  `cat ...; curl ...` denied there.
- **m2.** `npm run check:comments` lints only `src/lib` and the showcase (`check-comments.sh:10`), so
  it is vacuous for `scripts/docs-readers/`. Extend its path list or drop it from the gate.
- **m3.** Live podman runs inside the Task 2 and 3 light gates escape the gate's cgroup cap, because
  conmon runs in its own scope. Run live checks outside `cairn-run-gate` and attach transcripts, as
  Task 1 does.
- **m4.** `:Z` applies a private label. Never `:Z` a shared source (exemplars, the CLI binary) that
  parallel containers mount; use per-run copies or `:z`. The host's cask binary is a glibc ELF that
  runs in `node:22`, and `@anthropic-ai/claude-code@2.1.280` exists on npm.
- **m5.** Feasible as written: the `tool/v1.1.0` release carries `cairn_1.1.0_linux_amd64.tar.gz` and
  `SHA256SUMS`; `CAIRN_STATE_DIR` is honored (`tool/internal/store/paths.go:60`); `doc-detective`
  4.38.1 (node >=22.12) is current; the three baseline commits exist; `unit` is a valid vitest
  project whose include covers `src/tests/unit/**`.
