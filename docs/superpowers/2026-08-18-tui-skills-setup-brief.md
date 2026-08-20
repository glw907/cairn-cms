# TUI skills setup brief (2026-08-18)

For the session that starts the Go bubbletea TUI tool in this repo.
cairn-cms is gaining a Go TUI tool alongside the existing SvelteKit
library, and the workstation's TUI skill set was refreshed on
2026-08-18 in a poplar session (skills evaluated, one plugin
installed, one skill vendored, the lipgloss v2 rules landed). This
brief wires that set into cairn-cms. Execute it at the start of the
TUI tool's first pass; nothing here blocks SvelteKit work, and no
task below touches the library's existing gates.

## Already available, install nothing

Every skill the TUI work needs is user-scoped and loads in any repo:

- `go-conventions`: mandatory for every Go file.
- `bubbletea-design`: mandatory for visual TUI work (layout,
  alignment, icons, theming). Now project-generic; it builds via the
  repo's own target, not a hardcoded path.
- `tui-design:tui-design`: installed plugin. General TUI patterns,
  exemplar-app case studies, and the Go testing recipes (teatest/v2,
  `x/exp/golden`, pprof) in its `ecosystem-go.md` reference.
- `vhs-cli-demos`: vendored user skill. Deterministic screenshots and
  demo GIFs via Charm VHS; use it for design review artifacts and
  README captures. The `vhs` binary is not installed yet; on first
  use run `go install github.com/charmbracelet/vhs@latest` and
  `sudo apt install gifsicle`.
- `ts-conventions`, `svelte-conventions`, `visual-fidelity`: already
  in use here; unchanged. `ship` (make check, make install) does not
  apply until the Go tool has a Makefile, and `cairn-pass` owns the
  pass ritual regardless.

## Task 1: wire CLAUDE.md

Add the TUI skill lines to this repo's CLAUDE.md, next to the
existing Svelte wiring. Keep it to two or three lines: CLAUDE.md sits
at its context budget, and the global CLAUDE.md already mandates
`go-conventions` for every Go file, so only `bubbletea-design`, the
future cairn elm variant, and `tui-design` as optional need naming.
Poplar's Conventions section (`~/Projects/poplar/CLAUDE.md`) shows
the shape. Done when a fresh session reading
CLAUDE.md knows which skill is mandatory for a Go file and which for
TUI layout work.

## Task 2: settle the architecture before forking elm-conventions

Do not copy poplar's `elm-conventions` skill into this repo as-is.
(Reconciled 2026-08-20: the design spec had banked poplar's shape as a
decision; it now lists this fork under its open questions.) Two
reasons. First, it is poplar-scoped: its paths, ADR citations,
and helpers (`clipPane`, `displayCells`) name poplar internals.
Second, and larger, it encodes one side of a genuine fork that this
tool has not decided yet. Poplar's doctrine is per-component
`tea.Model` with Msg-driven child-to-parent signaling. Charm's own
production practice, stated in their agent guidance at
`github.com/charmbracelet/crush` `internal/ui/AGENTS.md`, is the
opposite: one centralized model, sub-components as plain stateful
structs with imperative methods, "do not nest models." Both shapes
ship real software. Put the choice to Geoff at the tool's
brainstorm, record it as this repo's ADR, and only then fork
elm-conventions into a cairn variant that matches the ruling.

One part ports regardless of the ruling: poplar elm-conventions
Rule 10 (lipgloss v2 box math and styled strings) is
architecture-neutral and verified against lipgloss v2. Carry it into
the cairn variant unchanged.

## Task 3: let the tool choose its own input model

Poplar's modifier-free single-key constraint is a poplar product
decision, not workstation doctrine. This tool decides its own
keybinding philosophy at brainstorm time, and the `tui-design`
plugin's discoverability patterns (footer hints, `?` help, command
palettes, leader keys) are live options here, not excluded ones.

## Task 4: gate Go comment prose with Vale, on the Go side

This repo already runs Vale over docs (`check:vale` in package.json,
in-tree `.vale.ini`), but that script passes explicit doc paths, so a
`[*.go]` section in the config alone would never run. The Go tool
keeps its own Makefile and path-filtered CI (Go stays out of `npm
test` by decision), so the comment gate lives there: a `vale-comments`
target in the tool's Makefile, wired into its `check`, shaped like
poplar's (`~/Projects/poplar/Makefile`, `.vale.ini`: `[formats] go =
md`, `[*.go] BasedOnStyles = glw907`). The `glw907` overlay is not
installed here yet (`.vale/styles/` holds Cairn, Google, Microsoft);
install it with `~/.dotfiles/scripts/glw907-vendor.sh
~/Projects/cairn-cms --sync`. Extend the existing `.vale.ini`; do not
replace it, or the docs coverage silently drops. Done when the Go
tool's `make check` fails on an error-level finding in a Go comment
and `npm run check:vale` output is unchanged.

## Task 5: use Crush as prior art, not a skill

Crush (`github.com/charmbracelet/crush`, FSL-1.1-MIT) is the
reference production bubbletea v2 app; read its source when
implementing the analogous feature. The license is source-available,
not MIT, so read the patterns and write the code fresh; nothing is
lifted into this MIT package. Do not install the third-party
`charm-crush` skill: it was evaluated on 2026-08-18 and skipped
because its worked examples assume the centralized model and would
contradict whichever convention this repo adopts. The patterns worth
reading directly, with their files:

- Typed pubsub bridging background goroutines to `tea.Msg`
  (`internal/pubsub/`).
- Dialog overlay stack (`internal/ui/dialog/`).
- Lazy-rendered list with per-item render caching
  (`internal/ui/list/list.go`).
- Completions popup placement (`internal/ui/completions/`).
- Focus-gated desktop notifications (`internal/ui/notification/`).

## Task 6 (optional): a project simplify skill

Default: skip. The workstation rule already runs `code-simplifier`
before every commit here; poplar's Go-only `simplify` skill
(`~/Projects/poplar/.claude/skills/simplify/SKILL.md`) is the
exception, not the model. If this repo ever wants one, adapt rather
than copy: cairn diffs mix Go and
TypeScript, so the language-neutral checks stay, the Go voice agent
keeps its existing self-gate on Go files, and TS-specific checks
come from `ts-conventions`. Skip this task entirely if the
`code-simplifier` agent already covers the repo's needs.
