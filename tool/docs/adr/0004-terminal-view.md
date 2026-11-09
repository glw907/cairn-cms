# ADR-0004: The terminal view

## Status

Proposed, 2026-11-08.

## Context

ADR-0001 kept the spine free of any view and deferred how a Bubble Tea view is
built. Setup is the first command that needs one: it streams typed events
(`internal/setup/events.go`) and the owner watches them as a live frame. ADR-0002
declined Bubble Tea for `render`, whose output is a pure function of its input.
This record takes the view's dependencies, fixes its architecture, and fixes where
its frames are written, before the first component lands.

## Decision

### The requires

The module takes the Charm v2 stack for the view, pinned exactly in `go.mod`:

- `charm.land/bubbletea/v2 v2.1.1`, the program loop. Added with this record.
- `github.com/charmbracelet/x/exp/teatest/v2`, the frame harness. Added with this
  record, at the pseudo-version `v2.0.0-20261101151554-27ecf3e4d454` because the
  module publishes no tags. It resolved and built against Bubble Tea v2.1.1.
- `charm.land/huh/v2 v2.0.3` for the owner's questions, `charm.land/bubbles/v2
  v2.2.1` for its components, and `charm.land/fang/v2` for the command's
  presentation. Each is recorded here and added by the task that first imports it,
  so no require sits in `go.mod` unused.

`internal/render` keeps importing no Bubble Tea, as ADR-0002 states, and its
purity test still holds the `render*` lists. The two requires added now count in
`otherDirectRequires`, since they belong to the module and not to `render`. A later
bump goes through the `dependency-upgrade` skill.

The standing fallback: if teatest v2 stops building against the pinned Bubble Tea,
the harness goldens the root model's `View()` output through `x/exp/golden`
directly, which needs no program. The replay then calls `Update` with each event
and compares the final frame. The frame under test is the same either way, since
the harness reads the final model's `View()` and not the program's terminal
stream.

### One model

The root is the only `tea.Model`. Every other component is a plain struct with
imperative methods the root calls: a method that needs a side effect returns a
`tea.Cmd`, and a component renders through `Render(width int) string`. Routing,
focus, and layout stay in the root. State changes only in `Update`, I/O runs only
in a `tea.Cmd`, and a library model from Huh or Bubbles is a field whose `Update`
the owner calls explicitly. This is `standards:elm-conventions` Rule 1, and it is
the architecture ADR-0001 deferred. `internal/ui/newview` holds the root and states
the rule in its package comment.

### The view's writer

The terminal view writes its frames to the raw terminal, not through the `logx`
stream `main` wraps (`cmd/cairn/main.go:50-56`). `logx.Writer` holds output until a
newline (`internal/logx/logx.go:27-30`), and an inline frame is redrawn in place and
does not end on one, so a frame sent through it would stay buffered and never
appear.

Bypassing the scrubber costs the safety it gives, so the view carries that
guarantee itself. It renders only typed event fields, never a string a provider
returned, and `setup.Event` carries no token, code, key, or nonce
(ADR-0003's never-printed list). A frame grep, run over every golden frame the
harness records, proves no registered credential appears in one.

### The frame harness

`internal/ui/newview/harness_test.go` replays a fixture stream of `setup.Event`
values into the root through teatest, quits, and compares the final model's `View()`
content to a golden under `testdata/`. Frames hold no clock and no timestamp, so
they are deterministic. `-update` rewrites the goldens; teatest registers that flag
at import, and the harness reads it instead of defining a second. A second test
replays the stream with one event dropped and requires the frame to differ, so the
harness fails when it loses an event.

## Consequences

- The view never receives a free-form provider string, so adding a field to
  `setup.Event` that holds one is a security change and needs its own review.
- A frame is only as safe as its renderer's inputs. The scrubber no longer backstops
  the view, and the frame grep is the test that replaces it.
- teatest v2 is a pseudo-versioned module. A bump to it is taken on its own and the
  fallback above stays available.
