# The Go `cairn` tool after 1.0: framing

Geoff ruled each point below on 2026-09-21, in one sitting, while B2's segment 4 ran. This brief
fixes purpose, scope boundaries, and order for the work that follows the `tool/v1.0.0` tag. It is
not a spec and carries no tasks. The 1.1 spec and the HUD spec are each written later, from the
evidence this brief says to collect first.

It supersedes the "2.0 adds the HUD" version line of 2026-09-13 and the HUD half of
`2026-08-20-cairn-tool-spine-and-hud-design.md`. The standing rule from 2026-09-13 is unchanged:
the spine's API is the product, every front end is a view over it, and a view holds no logic.

## Order of work

1. B2 closes and the owner tags 1.0. B2 gained two tasks on 2026-09-21, 21b and 21c, recorded in
   `~/.cache/cairn-tool-b2/owner-rulings-2026-09-21.md` until the plan absorbs them.
2. The tool goes into use through the site round (aksailingclub-org, ecxc-ski, 907-life) and takes
   fixes only.
3. 1.1 follows the round.
4. The HUD follows 1.1, as a 1.x minor.
5. 2.0 is provisioning: `cairn` provisions a new site itself. Its own initiative, unscheduled.

## Use comes first

A triage interface designed before anyone has triaged with the CLI is designed from imagination.
The site round is weeks of real upgrades, deploys, and breakage on production sites, and it costs
the tool nothing to wait, because the HUD is pure addition over seams 1.0 already keeps.

A site-pass agent never edits the cairn-cms checkout. Tool friction travels the way engine docs
fixes do: each site pass report carries a "Tool friction" section, and that pass's conductor
batches it into `tool/docs/friction.md` on a `site-docs/<site>-<pass>` branch. The file follows
the docs friction log's complete-or-move rule. The `site-pass` skill owes the report section
before the round starts, since a rule reaches an agent only through what that agent is given.

## 1.1

The headline is the agent-permission check. Getting Cloudflare token permissions right was hard
for the owner, and many cairn operators will drive Cloudflare through Claude Code. `cairn` verifies
the operator's working Cloudflare and GitHub tokens, the write-scoped ones wrangler and an agent
use, against a published manifest of what operating a cairn site requires. It names each missing
permission by the label the provider's own token page uses, and it emits `--json` so an agent can
act on the result.

1.1 opens with two pieces of groundwork, before any spec.

- A feasibility spike on verifying a write permission harmlessly. A read call proves a read
  permission. D1 edit, Workers Scripts edit, and Email Sending have no free probe, and reading a
  token's own policy list needs an "API Tokens Read" permission most tokens lack. The spike
  reports what is checkable and how.
- An engine consultation on where the manifest lives. The expected answer is the engine side, with
  a drift test in the tool, the way `src/lib/diagnostics/conditions.ts` works today.

The command reads the standard `CLOUDFLARE_API_TOKEN` from the environment for that one run and
never stores it. The spec states that posture in its own section. The site round exercises these
permissions on three sites, so the manifest is checked against reality before it ships.

Everything else in 1.1 is sized by `tool/docs/friction.md`. Known seeds are `--theme auto` through
an OSC 11 query and whatever the release candidate run surfaces that does not block the tag. A new
spine action the round proves necessary lands here, CLI first, with its exit codes and JSON.

`ROADMAP.md` also records a `docs` search subcommand over the installed engine version, so an
agent reaches docs retrieval from Bash. It depends on the docs index the docs rebuild adds to the
tarball, so it is sized with that rebuild and is no part of 1.1 unless the rebuild lands first.

## The HUD

The HUD is a triage workbench. Its job is the loop from a failing site to the failing check to
that check's logs to an acknowledgement, with the context held, where the CLI costs a new command
and a re-read at every step. The design is judged against that loop.

- It ships as a 1.x minor and is entered by `cairn hud`. Bare `cairn` prints help on every
  terminal, permanently. The old plan's TTY gate on bare `cairn` is dropped, which makes the HUD
  purely additive.
- Its top screen is the live sites table. That screen is the caller `Options.OnCheck` and the
  generation-counted refresh were kept for.
- Onboarding state is one detail view, never a mode.
- It carries exactly the spine's action set as of the release before it: run checks, read logs,
  acknowledge and clear, adopt, manage credentials. It adds none.
- Its brainstorm starts after 1.1 and opens by reading the friction file.

Carried from the 1.0 plan's cut list, so the HUD pass does not re-derive them: the two TUI ADRs,
re-read against poplar at that time; the `elm-conventions` fork scoped to `tool/internal/ui`;
`bubbletea-design` and `tui-visual-verify` made mandatory in `CLAUDE.md`; the interactive adopt
dialog; `Chapter` and the step-to-chapter mapping; and the `screenregistry` analyzer only if a
rule the spec names needs one. The 1.0 plan's "2.0 seams kept on purpose" table names each seam's
HUD caller and stays the reference.

## 2.0

**2.0's goal is provisioning (Geoff, 2026-09-21, afternoon): `cairn` itself provisions a new
site, replacing the Node scaffolder's Cloudflare chapters.** One command, one credential story,
and no Node at provisioning time. It follows from two rulings of the same day: the CLI is an
assumed part of the system, and `cairn-doctor` retires into `cairn`. This supersedes the morning's
narrower reading, which reserved 2.0 for "executable fixes"; performing a fix and provisioning a
site are the same class of work, a read-only tool beginning to write, and provisioning is the
larger and better-defined member of it.

It is its own initiative with its own brainstorm, spec, and engine consultation, and nothing
schedules it yet. Sized from the tool side at several passes of Pass B1's size. What it must
answer first:

- **The credential posture.** 1.0 holds three read-only values. A provisioner needs write scopes
  (D1, Workers Scripts, Custom Domains, DNS, Email Sending) and the GitHub side. The 1.1
  agent-permission check sets the posture to build on: the operator's own `CLOUDFLARE_API_TOKEN`,
  read from the environment for one run and never stored. 2.0 decides whether that holds for a
  multi-step, resumable provisioning run.
- **The permission manifest.** Built in 1.1 for the check; 2.0 consumes it on day one. That is
  the reason 1.1 comes first.
- **Dry-run, resume, and rollback.** The scaffolder's chapters already park, hold, and resume;
  the spine mirrors that vocabulary (`spine.FromKind`, the terminal and resumable step sets) for
  display only. 2.0 makes it executable, and every write needs a dry-run form and a stated undo.
- **What is ported and what is redesigned.** The site round exercises the scaffolder's chapters on
  real sites before this is planned; its friction decides which chapters port as they are.
- **The scaffold itself.** Whether `cairn` also writes the site's files, or `create-cairn-site`
  keeps the template and hands provisioning to `cairn`.
- **The version number.** A Go major means a `/v2` module path and a new `go install` path.
  Provisioning is pure addition to 1.0's frozen surfaces (exit codes, the JSON schemas, the result
  words), so by SemVer it could ship as a 1.x minor. Geoff names it 2.0 as the milestone; whether
  the module path moves is decided at its spec, with that cost stated.

## Standing declines

No MCP front end (2026-09-20; `cairn help agents` is the agent surface). No `fang`. A shipped
`cairn-health` skill fragment only on its recorded trigger, an agent harness that reads the npm
package but cannot run the binary.
