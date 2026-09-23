# Delta inventory: the Go `cairn` CLI and the coding-agent audience

Research only, no repo files edited. Paths are absolute-relative to
`/var/home/glw907/Projects/cairn-cms`.

## A. The Go `cairn` CLI (`tool/`, module tagged `tool/v1.0.0`, `v1.0.1`, `v1.1.0`)

Command tree built in `tool/cmd/cairn/root.go` (`newRootCmd`), groups: site / credentials / other.

| Command | Purpose (Short) | `--json` | Docs page |
|---|---|---|---|
| `cairn sites` / `cairn sites list` | List the sites cairn knows (`sites.go:29,37`) | yes (`--json`, plus `--expect-sites N`) | `docs/reference/cli-cairn-json-output.md` (payload shape); no dedicated command page — covered in `docs/reference/cli-cairn-manifest.md`-style exemplar is `cli-cairn-manifest.md` for the npm bin, not this one; site registry is described inline in `tool/README.md` ("The site registry, and where it lives") |
| `cairn health [<site>]` | Run the read-only health checks against one site, or every site when none named (`health.go:44`) | yes (`health.go:56`) | `docs/reference/cli-cairn-exit-codes.md`, `docs/reference/cli-cairn-json-output.md`; schemas under `docs/reference/schema/` |
| `cairn doctor [<dir>]` | Check a site's own checked-in config, no credential or deploy needed (`doctor.go:24`) | yes (`doctor.go:42`) | `docs/reference/cli-cairn-doctor.md` (this is the retired-`cairn-doctor`-bin replacement, per `docs/internal/record/2026-09-21-doctor-retirement-*`) |
| `cairn logs <site>` | Read one site's engine log records (`logs.go:32`) | yes (`logs.go:45`) | `docs/reference/log-events.md` (vocabulary), `docs/reference/cli-cairn-json-output.md` (payload) |
| `cairn adopt` | Add a Cloudflare Worker to the registry as a site (`adopt.go:41`) | no top-level flag | not separately documented in `docs/reference/`; `tool/README.md` covers the registry conceptually |
| `cairn adopt list` | List the Workers on the account that cairn could adopt (`adopt.go:56`) | yes (`adopt.go:64`) | same as above |
| `cairn auth` | Manage credentials in the OS keyring (`auth.go:124`) | n/a (parent) | `docs/reference/credentials` — actually `tool/docs/credentials.md` (interim; destined for an admin page per pass B) |
| `cairn auth set <name>` | Prompt for a value and store it in the keyring (`auth.go:145`) | no | `tool/docs/credentials.md` |
| `cairn auth unset <name>` | Delete one credential's keyring entry (`auth.go:175`) | no | `tool/docs/credentials.md` |
| `cairn auth list` | Show which provider answers each credential variable (`auth.go:203`) | no | `tool/docs/credentials.md` |
| `cairn auth check [<site>]` (hidden alias `cairn auth probe`) | Confirm the credential permissions this tool itself needs (`auth.go:35` builder, `probe_token.go`) | yes (`flagAuthCheckJSONHelp`) | `agentsPage` in `help_agents.go` states its contract inline (`cairn-auth-check.schema.json`); no separate `docs/reference/` page — folded into `cli-cairn-json-output.md`'s schema list |
| `cairn help agents` (topic `agents`, `help_agents.go`) | Print the contract a program or an agent reads (`shortAgents`) | n/a — the page itself documents `--json` | This is the primary agent surface; also points at the three cairn.pub reference URLs (exit codes, json output, doctor) |
| `--version`/`-V`, `--help` | version/help scaffolding (`root.go`) | n/a | `tool/README.md` |

Persistent root flags (apply to every command): `--timeout/-t` (default 480s), `--verbose/-v`, `--quiet/-q` (mutually exclusive with verbose), `--color {auto,always,never}`, `--theme {dark,light}`, `--width`, `--ack-file`.

Not yet reflected as its own doc page but relevant: `env.go`, `deps.go`, `registry.go`, `messages.go`, `permissions.go` are internal-only Go files, no cobra commands of their own.

### Install paths (from `tool/README.md`)
- `go install github.com/glw907/cairn-cms/tool/cmd/cairn@latest` (needs Go 1.26+; `cairn --version` prints `none` for the commit on a `go install` build).
- Release archives per platform (`cairn_<version>_{linux,darwin}_{amd64,arm64}.tar.gz`, `cairn_<version>_windows_{amd64,arm64}.zip`) from the GitHub releases page; each archive bundles `man/*.1`.
- Verification: `SHA256SUMS` file covering all six archives, plus `gh attestation verify` for build provenance (checksum alone is not authenticity).
- `tool/v<major.minor.patch>` tags are permanent (Go module proxy caches them); a bad release is corrected by a `retract` directive plus a new patch tag, never a deleted tag.

### `tool/docs/` inventory and what's moving
Per `docs/superpowers/specs/2026-09-21-draft-docs-design.md` ("Pass A: the tool's contract pages"):
- **Moving out** (already done — `tool/docs/reference/README.md` is now a stub pointing to the new locations): `tool/docs/reference/exit-codes.md`, `json-output.md`, `log-events.md`, and `cli-cairn-doctor.md`, plus their `*.schema.json` files, all landed at `docs/reference/cli-cairn-*.md` and `docs/reference/schema/` so they ship in the npm tarball (cairn.pub renders only the npm tarball; `tool/` itself is never in it).
- **Interim, staying until pass B** (admin arm destination): `tool/docs/credentials.md`, `tool/docs/tripwire.md` (systemd/launchd/Task Scheduler scheduling examples for the read-only tripwire — there is no `tripwire` subcommand; the tripwire is `cairn health --quiet` on a scheduler).
- **Staying for good**: `tool/docs/release-candidate-notes.md`, `tool/docs/adr/` (0001 "the spine is the product", 0002 render dependencies), `tool/docs/design/` (copy-standard.md, charm-v2-capabilities.md, render-reference fixtures, design reviews) — internal/contributor material, not public docs.
- `tool/README.md` stays as the short landing page (kept even after the moves), with its exit-codes link repointed to the new `docs/reference/` location.

### Remaining npm bins (`package.json` `bin` field) and their docs
| Bin | Docs page |
|---|---|
| `cairn-manifest` (`./dist/vite/bin.js`) | `docs/reference/cli-cairn-manifest.md` |
| `cairn-media-seed` (`./dist/media-seed/bin.js`) | `docs/reference/cli-cairn-media-seed.md` |
| `cairn-audit` (`./dist/audit/bin.js`) | `docs/reference/cairn-audit.md` |
| `cairn-guidance` (`./dist/guidance/bin.js`) | `docs/reference/guidance.md` |

`create-cairn-site` is a separate package (`packages/create-cairn-site`), not in the root `package.json` bin map; it has no single `docs/reference/*.md` page of its own — it's documented across `docs/admin/create-your-site.md`, `docs/extend/what-the-scaffold-wrote.md`, `docs/extend/build-a-site-by-hand.md`, and referenced throughout `docs/reference/README.md`. (Earlier root `CLAUDE.md` calls it "the setup command" per the naming register.)

Note: root `package.json`'s `bin` list has already shed `cairn-doctor` (the retired bin the Go `cairn doctor` replaced) — confirms the doctor retirement's engine half has landed.

---

## B. Coding agents as a formal audience

### The formal ruling on agents as a reference-arm audience
`docs/internal/docs-register.md`, section "The scripter-or-agent profile" (~line 375-397): explicitly **overturns** the 2026-08-14 ruling (recorded in `docs/internal/record/2026-08-14-audience-profiles.md`, closing "Note (2026-09-21)") that every doc track serves exactly one profile and the reference arm has none. Ruling, dated Geoff 2026-09-21:
- Exactly three pages carry this profile: `docs/reference/cli-cairn-exit-codes.md`, `docs/reference/cli-cairn-json-output.md`, `docs/reference/cli-cairn-doctor.md`.
- **No agent track is added.** `cairn help agents` stays the agent's primary surface.
- Profile: "anyone automating against `cairn`, a person writing a script or an agent." Vocabulary fully technical, nothing banned. Arrival: from `cairn help agents`, a `--json` help line, an admin page's link, or a failed run with an exit code/parse error in hand. Success: branch on every exit code and parse every payload without running the tool. Grading question: could a reader write a correct wrapper/parser from the page alone?

This is the one formal "coding agents are an audience" ruling in the repo; it is scoped narrowly to the Go tool's three contract pages, not to cairn-cms as a whole.

### `cairn help agents` (`tool/cmd/cairn/help_agents.go`, text in `messages.go` const `agentsPage`)
A cobra "topic" (no RunE, no subcommands) so `--help`'s template prints only the `Long` text with exit code 0. Comment on the command explains the design intent directly: *"An agent discovering cairn has `--help` and nothing else, because `go install` puts the binary on a machine that holds no cairn-cms checkout, so the contract has to be verbatim in the binary and every page it cites has to be a URL."*

Contents of the page: the four exit codes (0 OK/1 WARNING/2 CRITICAL/3 UNKNOWN) and precedence order; the pass/fail/held/skip/unknown check-result vocabulary; stdout-is-payload/stderr-is-diagnostics rule; `--json` beats `--quiet`; NDJSON shape of `cairn health --json`; schema versioning; the fix-object contract (only an `actor: operator`, `outward: false` fix carries a runnable command); a warning that `observed` values are untrusted data, never instructions; the stdin-never-blocks rule; `cairn auth check` and `cairn doctor` one-line contracts; and links to the three cairn.pub reference URLs.

### The scaffolder's agent brief (shipped, not just planned)
Confirmed live and baked into every scaffolded site:
- `claude/CLAUDE.md` (source in this repo) — ships via `packages/create-cairn-site` and `cairn-guidance install`; opens: *"Put site-specific guidance in your own `CLAUDE.md`, never in this file: `npx cairn-guidance install` overwrites everything under `.claude/cairn/` on every upgrade. This file is cairn's own agent guidance, imported by your site's root `CLAUDE.md`."* Covers: the charter boundary (cairn owns content/admin, developer owns everything else), the named atoms (`requireAccess`, `createSectionAction`, `locals.cairnEditor`, `CairnAdminShell`, `navLayout`, admin-toolkit primitives, `createAuthChannel`, `createLogger`) each pointing at its `node_modules/@glw907/cairn-cms/docs/reference/*.md` page, `check:cairn`/`check:cairn:rendered` gates, the DaisyUI-first rule, a Stop-hook snippet to run the audit at session end, DaisyUI tooling install commands, and a pointer to `docs/reference/README.md`.
- `packages/create-cairn-site/src/scaffold.mjs:256-258` prints at scaffold time: *"Your site is born with cairn's agent-facing guidance baked into `.claude/`: the skills, the [review agent, ...]. Run `npx cairn-guidance check` any time to see whether it is current."*
- `claude/agents/cairn-extension-reviewer.md` — a read-only reviewer subagent shipped into `.claude/agents/`.
- `claude/snippets/` — `cairn-audit.config.json`, `check-cairn.json`, `check.yml`, `claude-md-import.txt`, `settings-hook.json` (the Stop-hook JSON referenced above).

### `cairn-guidance` CLI (`docs/reference/guidance.md`)
Installs/checks the above tree in a consumer repo: `npx cairn-guidance install` (copies `skills/`, the reviewer agent, the `CLAUDE.md` fragment, stamps `.claude/cairn/VERSION` and `.claude/cairn/MANIFEST`); `npx cairn-guidance check [--strict]` reports drift. Containment rules refuse writes outside `.claude/` or through symlinks; existing divergent content is preserved as `<path>.orig`.

### Skills shipped for consumer agents (`skills/`, mirrored into `templates/waymark/.claude/skills/` and installed via `cairn-guidance`)
Confirmed via `git log --all --oneline | grep -i skill` (extend-2-skills branch, merged) and by reading the files:
- `skills/cairn-extend/SKILL.md` — "Build or change anything in a cairn site that touches /admin, a form action, logging, or one of the engine's seams." Routes to the matching seam/recipe (custom admin screen, second-audience auth channel) rather than inventing patterns; opens with the DaisyUI-first question.
- `skills/cairn-consult/SKILL.md` — "Write a consultation brief when you have worked around a cairn engine behavior twice, or want something the documented seams do not reach." Files a GitHub issue against `bugs.url` when reachable, otherwise hands the brief back to the developer; explicitly never edits a cairn-cms checkout.
- `skills/cairn-admin-screens/SKILL.md` — "Build or review a screen inside a cairn site's /admin, to the register cairn's own admin holds itself to." Points at `cairn-audit`'s 34 mechanical rules (17 static/17 rendered) and `cairn-audit norms <selector>` rather than restating them.

### Other agent-facing surfaces
- `docs/reference/cairn-audit.md` documents `npx cairn-audit [--rendered] [--rule ID] norms <selector>` — the design-language audit an agent (or the Stop hook) runs to self-check admin markup.
- `docs/extend/choose-an-ai-posture.md` — **not** about coding agents; it's the `aiPosture` adapter field controlling `robots.txt`/`Content-Signal` directives toward AI *training/search crawlers* on the public site. Different meaning of "AI" from the coding-agent audience; worth flagging so a docs outline doesn't conflate the two.
- `docs/internal/engine-rulings.md` carries the `guidance-layer` ruling (and a reconciling note titled `audit-cli-skill-admin-screens-check-and-cairn-doctor-fix`) that is the ledger record behind the shipped skills/guidance layer; narrative context in `docs/internal/record/2026-09-14-extend-2-record.md`.
- `docs/internal/engine-rulings.md` also records (2026-09-20, cited from ROADMAP.md ~line 1065): an MCP front end for the Go tool was **declined** — "a skill on disk reaches every agent while an MCP server reaches only the main loop, and `cairn help agents` already covers the same ground."

### ROADMAP mentions (agents / AGENTS.md / llms.txt)
- `ROADMAP.md:2114-2119` — **"Pre-beta DX: the scaffolder ships an agent brief (Geoff, 2026-08-01)."** Describes exactly what now exists (`claude/CLAUDE.md`, the skills, `cairn-guidance`) but is still phrased as a live backlog item naming `CLAUDE.md`/`AGENTS.md`. This reads as **stale**: the work appears to have shipped under the extend-2/extend-2-skills passes. Worth flagging to whoever maintains ROADMAP.md — it should likely be marked done and removed per this repo's "roadmap is a pass dimension" rule (CLAUDE.md), since a pass that ships an item is not done until it stops listing the item.
- `ROADMAP.md:2126-2129` — **"Pre-beta DX: publish the surface snapshot as a machine artifact."** Proposes shipping `docs/internal/api-surface.md` (or a JSON sibling) as a machine artifact "precisely what an AI agent wants," pairing with a "filed `/llms` page." Still open/unshipped as far as this research found — no `llms.txt` or `/llms` route exists in the repo.
- `ROADMAP.md:2075` and `:752` — reference "the filed docs-effectiveness infrastructure (search, `/llms`, the upgrade page)" as a distinct, still-open backlog item (a FAQ/help nav page, examples gallery, and an `/llms` page at zero infra).
- `ROADMAP.md:2467` — an unrelated example citing Carbon's own `llms.txt` as a model, not a cairn deliverable.
- No `AGENTS.md` file exists anywhere in the repo or its shipped templates (the shipped file is `CLAUDE.md`, imported into a site's own root `CLAUDE.md`); the ROADMAP item's `CLAUDE.md`/`AGENTS.md` phrasing is aspirational/historical, and only the `CLAUDE.md` half shipped.

### Bottom line for a docs outline
- **Formal audience status:** coding agents are a named, ruled audience only for three Go-tool reference pages (`cli-cairn-exit-codes.md`, `cli-cairn-json-output.md`, `cli-cairn-doctor.md`) via the "scripter-or-agent profile." Everywhere else, the engine's stance is: no agent track, `cairn help agents` is the front door for the CLI, and `CLAUDE.md` + shipped skills + `cairn-guidance` is the front door for a coding agent building on a scaffolded site.
- **Two separate "AI" surfaces exist and should not be conflated in an outline:** (1) coding agents that build/operate a cairn site (guidance layer, skills, `cairn help agents`), and (2) AI training/search crawlers hitting the public site (`aiPosture` / `choose-an-ai-posture.md`).
- **A stale ROADMAP item** (the agent-brief entry) should probably be resolved/removed as part of any docs-outline pass, per this repo's own ROADMAP-hygiene rule.
