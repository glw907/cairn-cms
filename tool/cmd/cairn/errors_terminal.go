package main

import (
	"fmt"
	"io"
	"runtime"
	"strings"

	"github.com/glw907/cairn-cms/tool/v2/internal/style"
	"github.com/spf13/pflag"
)

// errorTextCol is the column style.ErrorBlock sets its message at, so a further line of the
// message and the fix line sit under it.
const errorTextCol = 4

// writeError prints err for runTree, the one error printer. Where stderr is a terminal and
// CAIRN_PLAIN is unset it draws the error block; anywhere else it prints err's own bytes on one
// line, the form a pipe, a log file, and a script reading stderr have always received.
func writeError(d deps, w io.Writer, args []string, err error) {
	rf := errorFlags(args)
	_, stderr := styledStreams(d, rf)
	if !style.IsTerminal(stderr) {
		_, _ = fmt.Fprintln(w, err)
		return
	}
	term := withLocale(detectOn(d, rf, stderr), localeIsUTF8(d.env, runtime.GOOS))
	width := reportWidth(rf, term) // errorFlags reads no --width, so rf.width is 0 and the terminal decides
	message, fix := splitFix(err)
	theme := style.NewTheme(resolveGround(d, rf).dark, term.Profile, term.ASCII)
	_ = writeLines(w, errorBlock(theme, message, fix, width))
}

// errorFlags reads --color and --theme from args before cobra does. An unknown command or flag
// fails before the root's PersistentPreRunE fills rootFlags, so the printer cannot wait for it.
// Every other flag is skipped, and args cobra will reject read as the defaults.
func errorFlags(args []string) *rootFlags {
	fs := pflag.NewFlagSet("error", pflag.ContinueOnError)
	fs.SetOutput(io.Discard)
	fs.ParseErrorsAllowlist.UnknownFlags = true
	fs.BoolP("help", "h", false, "")
	color := fs.String("color", colorAuto, "")
	theme := fs.String("theme", themeDark, "")
	if err := fs.Parse(args); err != nil {
		return &rootFlags{color: colorAuto, theme: themeDark}
	}
	return &rootFlags{color: *color, theme: *theme, themeSet: fs.Lookup("theme").Changed}
}

// splitFix returns err's message and the fix it carries. Only a fixError carries one; any other
// error is all message, so its block draws no fix line.
func splitFix(err error) (message, fix string) {
	if t, ok := err.(translatedError); ok {
		if f, ok := t.error.(fixError); ok {
			return f.message, f.fix
		}
	}
	return err.Error(), ""
}

// errorBlock lays out message and fix as style.ErrorBlock draws an error: the cairn: prefix
// dropped, the first line the bold headline, each further line muted under it, and the fix on
// the fix mark. An empty fix draws no fix line.
func errorBlock(t style.Theme, message, fix string, width int) []string {
	head, rest, _ := strings.Cut(strings.TrimPrefix(message, "cairn: "), "\n")
	var why []string
	if rest != "" {
		why = strings.Split(rest, "\n")
	}
	first := ""
	if len(why) > 0 {
		first, why = why[0], why[1:]
	}
	lines := style.ErrorBlock(t, head, first, "", width)
	for _, l := range why {
		lines = append(lines, style.ContinuationLine(t, style.RoleMuted, l, errorTextCol, width)...)
	}
	return append(lines, style.FixLine(t, fix, "", errorTextCol, width)...)
}
