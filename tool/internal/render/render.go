// Package render turns a validated input into terminal output with no I/O of its own: every
// exported function is a pure function of its arguments, so the same input produces the same
// bytes on every machine and on every run, which is what makes a golden test possible.
// purity_test.go enforces the seam: os, golang.org/x/term, colorprofile's own detection entry
// points, and lipgloss's package-level Writer and Print family are forbidden everywhere in this
// package except profile.go, the one file that reads the environment and queries the terminal.
//
// The foundations a body is built out of are the colour Profile (profile.go), the Warm Stone
// Theme and its palette (palette.go), the glyph set (glyph.go), the named width rungs (width.go),
// and the sanitizer every dynamic string passes through (sanitize.go). One shared layer
// (layout.go, rank.go) supplies the header, the section grammar, the fix format, and the one
// severity ranking, and the bodies (body_single.go, body_plain.go) compose them into the frames
// an operator reads.
package render

import (
	"time"

	"github.com/glw907/cairn-cms/tool/internal/health"
	"github.com/glw907/cairn-cms/tool/internal/logs"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// Verdict is spine's own run verdict, re-exported so a body names the vocabulary without a
// second declaration of it. The spine computes a verdict; this package only paints one.
type Verdict = spine.Verdict

// View names which of the tool's surfaces a frame renders.
type View int

const (
	// ViewHealth renders a health sweep's reports.
	ViewHealth View = iota
	// ViewLogs renders a site's log entries.
	ViewLogs
	// ViewStatus renders the run's own state alone, the frame a site listing ends on: it has no
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

// defaultWidth is the column budget a run composes into when the operator named none and stdout
// is not a terminal to measure: the width a mail body, a CI log, and a paste all assume.
const defaultWidth = 80

// SelectBody returns the body a run of sites reports composes into. A pipe always takes the
// plain body, at any scope: plain is the default for a pipe exactly as --json is, never a
// variant an operator opts into. Colour never enters the choice, so forcing colour into a pipe
// yields the plain body in colour, and a ProfileNoColor terminal still gets a terminal body.
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
	// Width is the terminal column budget a frame composes into. Zero means defaultWidth.
	Width int
	// Height is the row budget, and 0 means unbounded, which is what the CLI always passes. It
	// exists for the 2.0 HUD's viewport, which bounds the body it scrolls.
	Height int
	// Dark reports whether Theme should read the palette's dark branch.
	Dark bool
	// Profile is the colour profile to paint with.
	Profile Profile
	// ASCII selects the ASCII glyph tier over Unicode. profile.go's DetectProfile is the only
	// function that fills it (criterion 13); render.Render reads the field and never re-derives
	// it, since purity forbids a second TTY check anywhere else in this package.
	ASCII bool
	// Reports holds the health sweep's settled reports, in the order the sweep ran them. The
	// render owns the ranking; nothing upstream re-orders.
	Reports []health.Report
	// FailingOnly draws the failing rows alone, which is --quiet's own body. It filters rows and
	// nothing else: the verdict and the tally still describe the whole run, so a body that says
	// "1 failing, 0 passing" for a report carrying a pass and a skip is not reachable from here.
	// The caller hands over the uncut reports and this field decides what is drawn, rather than
	// cutting them upstream where the counts can no longer see what was removed.
	//
	// The fleet body ignores it. That body is already one line per site rather than a list of
	// check rows, and filtering its checks left most of the strip drawn as the separator glyph,
	// which says less than the marks it replaced.
	FailingOnly bool
	// Entries holds a log query's records, newest first, for ViewLogs.
	Entries []logs.Entry
	// Site names the subject a view that carries no report still has to name, which is the log
	// excerpt's own section rule. A health view reads the name off its report instead.
	Site string
	// Status carries the run's own state beside its checks: the wall time, the provider tokens,
	// and whether a missing one degraded the run.
	Status StatusState
	// Verdict is the run's aggregate verdict, computed by spine.ExitCode at the call site, so an
	// operator reading the word and a routine reading the exit code cannot disagree.
	Verdict Verdict
	// Now is the instant every timestamp in the frame is formatted against. A caller wanting
	// "now" passes time.Now() itself: render never calls the system clock (criterion 24), which
	// is what keeps a replay of the same input byte-identical regardless of when it runs.
	Now time.Time
}

// width returns the column budget this input composes into: the requested width honoured
// exactly, capped at WidthCap, with an unset width falling back to defaultWidth.
func (in RenderInput) width() int {
	if in.Width <= 0 {
		return content(defaultWidth)
	}
	return content(in.Width)
}

// Render composes in into a Frame. It is pure: no I/O, no clock, no environment, no terminal.
//
// The view decides first and the body second. ViewLogs and ViewStatus each have one form, since
// neither carries the per-check grammar the three health bodies differ over; a caller writing to
// a pipe prints its own line-oriented form for those two rather than asking for a column layout
// nothing will read.
func Render(in RenderInput) Frame {
	t := NewTheme(in.Dark, in.Profile).forTier(in.ASCII)
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

// renderStatus draws the run's own state and nothing else.
func renderStatus(t Theme, in RenderInput) Frame {
	return t.clampFrame(Frame{Body: t.statusLines(in, 0, in.width())}, in.width())
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
