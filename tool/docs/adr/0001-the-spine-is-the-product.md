# ADR-0001: The spine is the product

## Status

Accepted, 2026-09-14.

## Context

The `cairn` Go tool ships in two versions. Version 1.0 is a complete single-site
operator CLI: a local site registry, read-only health checks, log queries, and a
scheduled tripwire. Version 2.0 adds a bubbletea terminal HUD and multi-site
management. Both versions need to share one architecture without a reshape at the
2.0 boundary.

Geoff's ruling on 2026-09-13 set the governing decision: the tool's API is the
product, not any one of its front ends. The CLI is the first front end and the HUD
is the second. Neither front end holds logic; each is a thin view over the same
calls.

A second ruling, on 2026-09-14, set who the product is for. `cairn` is for any
cairn operator, not only this workstation. It must run on Linux, macOS, and
Windows as a first-class target on each, not as a Linux tool with ports bolted
on.

## Decision

### The spine is the product

Every capability the tool offers lives behind a package boundary a view can call
without I/O of its own: `store` for the registry, `health` for checks, `logs` for
log queries, `render` for turning results into text. A view, whether the CLI's
`cmd/cairn` package or 2.0's HUD, calls these functions and prints or draws what
they return. A view never reimplements a check, never re-derives a verdict, and
never holds state the spine does not already expose.

### Three seams 1.0 keeps for 2.0

1.0 has no HUD. It keeps three seams shaped for a second front end that mounts on
them without a rewrite.

- **The registry's shape and site record.** `store.List` returns every listable
  record as an `Entry` carrying its id, and skips a malformed record by id rather
  than failing the whole list. 1.0's commands read one record at a time; 2.0's HUD
  reads the list. The seam is protected by Task 5's `store` test, which seeds a
  test directory with three live records, one malformed, and one retired, and
  asserts three entries plus one skip error naming the malformed file's id.

- **Checks as pure functions over a site record.** The `health.Check` interface
  takes a record, injected clients, and the run's options, and returns an
  `Outcome`, with no store access, no globals, and no I/O beyond the clients. The
  seam is protected by Task 12's `health` test, which runs the whole `All` slice
  plus a deliberately stateful stub check twice against a recorded round tripper
  and asserts byte-identical reports. 2.0's HUD calls the same functions per site
  with no wrapper.

- **The pure render seam.** `render.Render` runs no program, performs no I/O, and
  reads no environment; it takes a `RenderInput` and returns a `Frame` of lines.
  The seam is protected by Task 20's `render` test, which asserts the package
  imports neither `os` nor a terminal package outside `profile.go`, and by the
  golden sweep that runs with no process spawned. 2.0's HUD mounts on this
  function rather than replacing it.

### Two ADRs deferred to 2.0

Two decisions this tool will eventually need are not written yet: component
architecture (per-component `tea.Model`s versus one centralized model with plain
stateful structs, the fork named in the 2026-08-18 TUI skills setup brief) and
design language and input (theming, keybinding philosophy, discoverability
patterns). Deferring both is correct because each one describes a TUI's internals,
and 1.0 has no TUI. Writing either ADR now would describe poplar's shape rather
than this tool's, since poplar is the only implementation to draw on today. Each
ADR is written against poplar as it stands when the HUD work starts, at the 2.0
brainstorm, alongside the fork Geoff decides then.

### Portability, 2026-09-14

`cairn` is a product for any operator, on Linux, macOS, and Windows. Every
mechanism the tool ships has a portable form and a documented setup. One
operator's own installation, including Geoff's, is verification data for that
pass, never the design. Concretely: credentials resolve through a `secrets` seam
in a fixed order, the environment first and the OS keyring second, never a path
into a workstation's own secret store; the registry lives under the platform
config directory (`os.UserConfigDir`, which is XDG on Linux, Application Support
on macOS, and AppData on Windows); the CI matrix runs all three platforms from the
first commit; the release ships prebuilt binaries for all three; and the tripwire
subcommand's documentation covers systemd, launchd, and Task Scheduler as three
independent examples, none of them the product's install path.

### Three dependencies beyond cobra

`go-conventions` assumes cobra alone and asks for minimal dependencies. This tool
takes three further dependencies, each recorded here as an exception rather than
a default.

- **`github.com/zalando/go-keyring`** provides the OS keyring backend for the
  `secrets` seam on macOS, Windows, and Linux. Portable secret storage across
  three platforms is not something to hand-roll, and `go-keyring` is the library
  the `gh` CLI uses for the same job.
- **`golang.org/x/term`** reads a secret from an interactive prompt with echo
  off. No standard-library call does this portably across the three platforms.
- **`golang.org/x/sys/windows`** opens a file without following a reparse point
  on Windows, through `FILE_FLAG_OPEN_REPARSE_POINT`. `syscall.O_NOFOLLOW`, the
  POSIX mechanism the `store` package uses on Linux and macOS, does not exist on
  Windows.

## Consequences

A view package, `cmd/cairn` today and the HUD in 2.0, stays thin: wiring, flag
parsing, and printing, with every decision made by the spine underneath it. A
change to a check's logic or the registry's format touches one package and both
front ends pick it up. The cost is discipline: a check or a store method that
reaches for a global, an environment read, or a direct print call breaks the seam
a test in Tasks 5, 12, and 20 exists to catch, and the fix is to move the logic
down into the spine rather than around the test.

The portability ruling raises the bar 1.0 must clear before shipping any
mechanism: a Linux-only shortcut is not an option, so the secrets seam, the
registry path, and the CI matrix all carry a three-platform design from the first
task that touches them, at the cost of the extra dependencies this ADR records.

Deferring the two TUI-internals ADRs means the 2.0 pass carries a design decision
that 1.0 does not have to litigate today, at the cost of writing it against a
codebase this tool does not have yet. That cost is smaller than deciding an
architecture 1.0 will not use and 2.0 might reject.
