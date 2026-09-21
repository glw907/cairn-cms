// Package render turns a validated input into terminal output with no I/O of its own: every
// exported function is a pure function of its arguments, so the same input produces the same
// bytes on every machine and on every run, which is what makes a golden test possible.
// purity_test.go enforces the seam: os, golang.org/x/term, colorprofile's own detection entry
// points, and lipgloss's package-level Writer and Print family are forbidden everywhere in this
// package except profile.go, the one file that reads the environment and queries the terminal.
//
// This task (20a) supplies the foundations a body is built out of: the colour Profile (profile.go),
// the Warm Stone Theme and its palette (palette.go), the glyph set (glyph.go), the named width
// rungs (width.go), and the sanitizer every dynamic string passes through (sanitize.go). Task
// 20b's bodies compose these into the frames an operator reads; Task 20c marshals the same inputs
// to JSON without touching either.
package render

import "time"

// RenderInput carries render.Render's input. This task defines the fields its own foundations
// fill or consume; Task 20b widens it with the report, log, and verdict data a body composes.
type RenderInput struct {
	// Width is the terminal column budget a frame composes into.
	Width int
	// Dark reports whether Theme should read the palette's dark branch.
	Dark bool
	// Profile is the colour profile to paint with.
	Profile Profile
	// ASCII selects the ASCII glyph tier over Unicode. profile.go's DetectProfile is the only
	// function that fills it (criterion 13); render.Render reads the field and never re-derives
	// it, since purity forbids a second TTY check anywhere else in this package.
	ASCII bool
	// Now is the instant every timestamp in the frame is formatted against. A caller wanting
	// "now" passes time.Now() itself: render never calls the system clock (criterion 24), which
	// is what keeps a replay of the same input byte-identical regardless of when it runs.
	Now time.Time
}

// Frame is render.Render's result, sectioned the way the 2.0 HUD pins it: a header that never
// scrolls, a body that does, and a footer that carries the verdict. Frame carries no bubbletea
// type; a bubbletea Cursor here would break both the purity test and the seam, since the HUD
// composes its own tea.View from a Frame plus its own cursor state.
type Frame struct {
	// Header is the block every body leads with: the verdict, the subject, and when the run
	// checked.
	Header []string
	// Body is the scrollable content a body composed: rows, sections, or a log's entries.
	Body []string
	// Footer carries the verdict repeated, the last line of every run.
	Footer []string
}

// Lines joins Header, Body, and Footer into the flat screen the CLI prints, in that order.
func (f Frame) Lines() []string {
	out := make([]string, 0, len(f.Header)+len(f.Body)+len(f.Footer))
	out = append(out, f.Header...)
	out = append(out, f.Body...)
	out = append(out, f.Footer...)
	return out
}
