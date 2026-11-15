package main

import (
	"fmt"
	"io"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/charmbracelet/x/ansi"
	"github.com/glw907/cairn-cms/tool/v2/internal/health"
	"github.com/glw907/cairn-cms/tool/v2/internal/spine"
	"github.com/glw907/cairn-cms/tool/v2/internal/style"
	"github.com/spf13/cobra"
)

// localeIsUTF8 reports whether the environment names a UTF-8 locale. It reads LC_ALL, then
// LC_CTYPE, then LANG, takes the first non-empty value, and answers true when that value names
// UTF-8 or utf8 in any case, so "en_US.UTF-8", "C.utf8", and "UTF-8" all count. With all three
// unset it answers true on Windows, whose console does not use these variables, and false
// elsewhere. The environment arrives as a function so the check reads nothing itself.
func localeIsUTF8(env func(string) string, goos string) bool {
	for _, name := range []string{"LC_ALL", "LC_CTYPE", "LANG"} {
		if v := env(name); v != "" {
			v = strings.ToLower(v)
			return strings.Contains(v, "utf-8") || strings.Contains(v, "utf8")
		}
	}
	return goos == "windows"
}

// reportTerminal is detectTerminal for a report body: the same answer, with the glyph tier
// dropped to ASCII when the locale is not UTF-8, so the checkmarks and dashes a non-UTF-8
// terminal would print as garbage fall back to plain marks. The colour profile stays as
// detectTerminal chose it, because colour is a terminal capability and the locale says nothing
// about it.
func reportTerminal(d deps, rf *rootFlags) style.Terminal {
	return withLocale(detectTerminal(d, rf), localeIsUTF8(d.env, runtime.GOOS))
}

// withLocale sets t.ASCII when the locale is not UTF-8 and leaves a UTF-8 locale's answer as
// detection made it.
func withLocale(t style.Terminal, utf8 bool) style.Terminal {
	if !utf8 {
		t.ASCII = true
	}
	return t
}

// reportWidth returns the width a terminal report composes into: the operator's --width, then
// the terminal's measured columns, then style.DefaultWidth when neither names one.
func reportWidth(rf *rootFlags, term style.Terminal) int {
	switch {
	case rf.width > 0:
		return rf.width
	case term.Columns > 0:
		return term.Columns
	default:
		return style.DefaultWidth
	}
}

// writePasteNotice writes pasteNotice to stderr ahead of the report it warns about. Where both
// streams are terminals the notice sits over a drawn frame, so it takes the frame's margin and
// muted ink, wraps with every line at cell 2, and is parted from the frame by one blank line.
// Anywhere else, CAIRN_PLAIN included, it is writeNotice's plain line, the bytes a script reading
// stderr already sees.
func writePasteNotice(cmd *cobra.Command, d deps, rf *rootFlags) error {
	if stdout, stderr := styledStreams(d, rf); !style.IsTerminal(stdout) || !style.IsTerminal(stderr) {
		return writeNotice(cmd, d, rf, pasteNotice)
	}
	return writeTerminalNotice(cmd, d, rf, pasteNotice)
}

// The progress line's timing: it first draws once a run has lasted progressDelay, so a run that
// settles sooner never flickers, and then redraws one spinner frame every progressFrame.
const (
	progressDelay = 200 * time.Millisecond
	progressFrame = 120 * time.Millisecond
)

// showsProgress reports whether a health run draws its progress line. Both streams must be
// terminals and CAIRN_PLAIN unset, since the line is drawn on stderr and is noise in a pipe or a log file; CI must be
// empty, since a CI log keeps every redrawn frame; TERM must not be dumb, since such a terminal
// prints the line's erase as literal junk on every frame; and --json, --quiet, and --verbose
// each keep it off: --json promises streams an agent parses, --quiet promises a green run writes
// nothing, and --verbose prints checkProgress's per-check lines in its place.
//
// The ASCII tier is no guard here: a non-UTF-8 locale also selects it, and that terminal handles
// the erase and still draws the line with the ASCII spinner.
func showsProgress(d deps, rf *rootFlags, f healthFlags) bool {
	stdout, stderr := styledStreams(d, rf)
	return style.IsTerminal(stdout) && style.IsTerminal(stderr) && d.env("CI") == "" &&
		d.env("TERM") != "dumb" && !f.asJSON && !rf.quiet && !rf.verbose
}

// startHealthProgress starts the progress line for a health run over the site id and returns
// the stop that erases it. The caller calls stop before it writes anything to either stream,
// and may call it again; a run that draws no line gets a stop that does nothing. The line takes
// reportTerminal's tier, so a non-UTF-8 locale gets the ASCII spinner.
func startHealthProgress(cmd *cobra.Command, d deps, rf *rootFlags, f healthFlags, id string) (stop func()) {
	if !showsProgress(d, rf, f) {
		return func() {}
	}
	term := reportTerminal(d, rf)
	width := reportWidth(rf, term)
	theme := style.NewTheme(resolveGround(d, rf).dark, term.Profile, term.ASCII)
	text := healthProgressText(id)
	return drawProgress(cmd.ErrOrStderr(), progressDelay, progressFrame, func(frame int) string {
		return style.ProgressLine(theme, frame, text, width)
	})
}

// drawProgress draws line(frame) on w from delay on, redrawing every interval, each frame
// returned to the start of the row and the row erased first. w is flushed after every write,
// because the logx scrubber holds an unterminated line until a newline that never comes.
//
// The returned stop ends the drawing goroutine and waits for it before it erases the row, so
// no frame can land after the erase. It erases only when a frame was drawn, and only once.
func drawProgress(w io.Writer, delay, interval time.Duration, line func(frame int) string) (stop func()) {
	done := make(chan struct{})
	finished := make(chan struct{})
	drew := false
	go func() {
		defer close(finished)
		wait := time.NewTimer(delay)
		defer wait.Stop()
		select {
		case <-done:
			return
		case <-wait.C:
		}
		tick := time.NewTicker(interval)
		defer tick.Stop()
		for frame := 0; ; frame++ {
			drew = true
			_, _ = io.WriteString(w, "\r"+ansi.EraseEntireLine+line(frame))
			_ = flushWriter(w)
			select {
			case <-done:
				return
			case <-tick.C:
			}
		}
	}()
	var once sync.Once
	return func() {
		once.Do(func() {
			close(done)
			<-finished
			if drew {
				_, _ = io.WriteString(w, "\r"+ansi.EraseEntireLine)
				_ = flushWriter(w)
			}
		})
	}
}

// checkProgress returns the callback health.Run calls as each check settles, or nil when this
// run prints none. It writes one line per check to stderr, so a sweep that takes a while is
// visibly progressing rather than apparently hung.
//
// --json suppresses it whatever --verbose says: under --json the run's progress is the
// newline-delimited stream on stdout, and a second stream in a different shape on stderr is
// noise an agent cannot parse.
func checkProgress(cmd *cobra.Command, rf *rootFlags, f healthFlags) func(health.CheckResult) {
	if !rf.verbose || f.asJSON {
		return nil
	}
	errOut := cmd.ErrOrStderr()
	return func(c health.CheckResult) {
		_, _ = fmt.Fprint(errOut, checkProgressLine(c.ID, spine.StateWord(c.Outcome.State, c.Outcome.Reason, c.Acknowledged)))
	}
}

// writeLines writes each line of a rendered frame to w on its own line.
func writeLines(w io.Writer, lines []string) error {
	for _, line := range lines {
		if _, err := fmt.Fprintln(w, line); err != nil {
			return err
		}
	}
	return nil
}

// writeListErrors writes each registry listing error to w, prefixed as the one-line stderr form.
func writeListErrors(w io.Writer, errs []error) error {
	for _, e := range errs {
		if _, err := fmt.Fprintln(w, "cairn:", e); err != nil {
			return err
		}
	}
	return nil
}
