// Package render turns a validated input into terminal output with no I/O: every
// exported function is a pure function of its arguments, so the same input produces the same
// bytes on every machine and on every run, which is what makes a golden test possible.
// purity_test.go enforces the seam: os, golang.org/x/term, colorprofile's detection entry
// points, and lipgloss's package-level Writer and Print family are forbidden everywhere in this
// package. The environment and the terminal are read by style.Detect, never here.
//
// The foundations a body is built out of are the theme (palette.go), which paints through
// style's Warm Stone palette and draws style's marks at one tier, the named width rungs
// (width.go), and the sanitizer every dynamic string passes through (sanitize.go). One shared
// layer (layout.go, rank.go) supplies the header, the section grammar, the fix format, and the
// one severity ranking, and the four bodies compose them into the frames an operator reads: one
// site on a terminal (body_single.go), more than one (body_many.go), a pipe or any non-terminal
// consumer (body_plain.go), and a log excerpt (body_logs.go).
package render

import (
	"time"

	"github.com/charmbracelet/colorprofile"
	"github.com/glw907/cairn-cms/tool/v2/internal/health"
	"github.com/glw907/cairn-cms/tool/v2/internal/logs"
	"github.com/glw907/cairn-cms/tool/v2/internal/spine"
	"github.com/glw907/cairn-cms/tool/v2/internal/style"
)

// View names which of the tool's surfaces a frame renders.
type View int

const (
	// ViewHealth renders a health sweep's reports.
	ViewHealth View = iota
	// ViewLogs renders a site's log entries.
	ViewLogs
	// ViewStatus renders the run's state alone, the frame a site listing ends on: it has no
	// creds row for the credential detail to sit on, and the detail is not header material.
	ViewStatus
)

// Body names the layout a frame composes into. SelectBody picks one from the run's scope and
// whether stdout is a terminal; nothing else decides it.
type Body int

const (
	// BodySingle is one site on a terminal: rows grouped by what the operator must do.
	BodySingle Body = iota
	// BodyMany is more than one site on a terminal.
	BodyMany
	// BodyPlain is what a pipe, a cron mail, a CI log, and an agent receive.
	BodyPlain
)

// SelectBody returns the body a run of sites reports composes into. A pipe always takes the
// plain body, at any scope: plain is the default for a pipe exactly as --json is, never a
// variant an operator opts into. Colour never enters the choice, so forcing colour into a pipe
// yields the plain body in colour, and a no-colour terminal still gets a terminal body.
func SelectBody(sites int, tty bool) Body {
	switch {
	case !tty:
		return BodyPlain
	case sites > 1:
		return BodyMany
	default:
		return BodySingle
	}
}

// RenderInput carries render.Render's input. It is the whole of what a frame is composed from:
// Render reads nothing else, so the same value always produces the same bytes.
type RenderInput struct {
	// View names the surface to render.
	View View
	// Body is the layout to compose into, from SelectBody.
	Body Body
	// Width is the terminal column budget a frame composes into. Zero means style.DefaultWidth.
	Width int
	// Dark reports whether the frame paints from the palette's dark branch.
	Dark bool
	// Profile is the colour profile to paint with.
	Profile colorprofile.Profile
	// ASCII selects the ASCII glyph tier over Unicode. style.Detect is the only function that
	// fills it; render.Render reads the field and never re-derives it, since purity forbids a
	// second TTY check anywhere else in this package.
	ASCII bool
	// Reports holds the health sweep's settled reports, in the order the sweep ran them. The
	// render owns the ranking; nothing upstream re-orders.
	Reports []health.Report
	// Entries holds a log query's records, newest first, for ViewLogs.
	Entries []logs.Entry
	// Site names the subject a view that carries no report still has to name, which is the log
	// excerpt's section rule. A health view reads the name off its report instead.
	Site string
	// Status carries the run's state beside its checks: the wall time, the provider tokens,
	// and whether a missing one degraded the run.
	Status StatusState
	// Verdict is the run's aggregate verdict, computed by spine.ExitCode at the call site, so an
	// operator reading the word and a routine reading the exit code cannot disagree.
	Verdict spine.Verdict
	// Now is the instant every timestamp in the frame is formatted against. A caller wanting
	// "now" passes time.Now() itself: render never calls the system clock, which is what keeps
	// a replay of the same input byte-identical regardless of when it runs.
	Now time.Time
}

// width returns the column budget this input composes into: the requested width honoured
// exactly, capped at style.ContentWidth's cap, with an unset width falling back to
// style.DefaultWidth.
func (in RenderInput) width() int {
	if in.Width <= 0 {
		return style.ContentWidth(style.DefaultWidth)
	}
	return style.ContentWidth(in.Width)
}

// Render composes in into a Frame. It is pure: no I/O, no clock, no environment, no terminal.
//
// The view decides first and the body second. ViewLogs and ViewStatus each have one form, since
// neither carries the per-check grammar the three health bodies differ over; a caller writing to
// a pipe prints its line-oriented form for those two rather than asking for a column layout
// nothing will read.
func Render(in RenderInput) Frame {
	t := newTheme(in.Dark, in.Profile, in.ASCII)
	switch {
	case in.View == ViewStatus:
		return renderStatus(t, in)
	case in.View == ViewLogs:
		return renderLogs(t, in)
	case in.Body == BodyPlain:
		return renderPlain(t, in)
	case in.Body == BodyMany:
		return renderMany(t, in)
	default:
		return renderSingle(t, in)
	}
}

// renderStatus draws the run's state and nothing else. A pipe keeps the line-oriented form, one
// fact per line at the left edge; a terminal gets the titled block of mark rows.
func renderStatus(t theme, in RenderInput) Frame {
	if in.Body == BodyPlain {
		return t.clampFrame(Frame{body: t.statusLines(in, 0, in.width())}, in.width())
	}
	return t.clampFrame(Frame{body: t.listingLines(in, in.width())}, in.width())
}

// Frame is render.Render's result, held as a header, a body, and a footer that carries the
// verdict, and read out flat through Lines. Frame carries no bubbletea type, so the package
// stays clear of the view that prints it.
type Frame struct {
	// header is the block every body leads with: the verdict, the subject, and when the run
	// checked.
	header []string
	// body is the scrollable content a body composed: rows, sections, or a log's entries.
	body []string
	// footer carries the verdict repeated, the last line of every run.
	footer []string
}

// Lines joins the header, the body, and the footer into the flat screen the CLI prints, in that
// order.
func (f Frame) Lines() []string {
	out := make([]string, 0, len(f.header)+len(f.body)+len(f.footer))
	out = append(out, f.header...)
	out = append(out, f.body...)
	out = append(out, f.footer...)
	return out
}
