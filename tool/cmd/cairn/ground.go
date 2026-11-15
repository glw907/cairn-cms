package main

import (
	"io"
	"os"
	"strings"

	"github.com/glw907/cairn-cms/tool/v2/internal/style"
	"github.com/spf13/cobra"
	"github.com/spf13/pflag"
)

// The variables that choose the ground and the plain body. Neither is ever an error: a value
// cairn cannot read is ignored and the next source decides, since a shell profile written for one
// tool must not break another.
const (
	// varTheme names the ground, dark or light, for an operator who sets it once in a profile.
	varTheme = "CAIRN_THEME"
	// varColorFGBG is the foreground;background pair some terminals export, read for its last
	// field: the background's ANSI slot.
	varColorFGBG = "COLORFGBG"
	// varPlain set to exactly "1" asks for the plain body on a terminal, the linear form a screen
	// reader needs.
	varPlain = "CAIRN_PLAIN"
)

// ground is the one answer to how a run paints: on which ground, and whether at all as a
// terminal.
type ground struct {
	// dark reports the ground the palette is resolved against.
	dark bool
	// plain reports that every styled path treats stdout and stderr as not terminals, so a run
	// prints the bytes a pipe receives.
	plain bool
}

// resolveGround reads the ground and the plain flag from the root flags and the environment.
// The ground is the first of --theme, CAIRN_THEME, and COLORFGBG to name one, and dark when none
// does. An explicit --theme counts even when it repeats the default, so --theme dark beats
// CAIRN_THEME=light. themeSet is the flag's Changed bit,
// so a rootFlags built by hand names a ground only with it set.
//
// cairn never queries the terminal for its background: a terminal that does not answer the query
// would leave the run waiting.
func resolveGround(d deps, rf *rootFlags) ground {
	g := ground{dark: true, plain: d.env(varPlain) == "1"}
	switch {
	case rf.themeSet:
		g.dark = rf.theme != themeLight
	case d.env(varTheme) == themeDark || d.env(varTheme) == themeLight:
		g.dark = d.env(varTheme) == themeDark
	default:
		if light, ok := colorFGBGLight(d.env(varColorFGBG)); ok {
			g.dark = !light
		}
	}
	return g
}

// stdoutGround is the ground a report painted to stdout takes. At a terminal it is
// resolveGround's. Anywhere else, CAIRN_PLAIN included, it is --theme or else dark, so a run that
// forces colour into a pipe paints the bytes it always has whatever CAIRN_THEME or COLORFGBG
// say: those two choose a ground for a person reading a terminal and nothing else.
func stdoutGround(d deps, rf *rootFlags) ground {
	g := resolveGround(d, rf)
	if stdout, _ := styledStreams(d, rf); !style.IsTerminal(stdout) {
		g.dark = !rf.themeSet || rf.theme != themeLight
	}
	return g
}

// colorFGBGLight reads a COLORFGBG value's last semicolon field as the background's ANSI slot:
// 7 or 15 is a light ground and any other number a dark one. ok is false when the field is not
// a number, so the caller falls through to the default.
func colorFGBGLight(v string) (light, ok bool) {
	field := v[strings.LastIndex(v, ";")+1:]
	if field == "" || strings.Trim(field, "0123456789") != "" {
		return false, false
	}
	return field == "7" || field == "15", true
}

// notePassed records which flags with a default the operator passed, from c's parsed flags. A
// value equal to its default still counts, which is how an explicit --theme dark outranks
// CAIRN_THEME.
func (f *rootFlags) notePassed(c *cobra.Command) {
	if flag := c.Flags().Lookup("timeout"); flag != nil {
		f.timeoutSet = flag.Changed
	}
	if flag := c.Flags().Lookup("width"); flag != nil {
		f.widthSet = flag.Changed
	}
	if flag := c.Flags().Lookup("theme"); flag != nil {
		f.themeSet = flag.Changed
	}
}

// preParseFlags reads --color and --theme from args before cobra parses them, because help is
// chosen and painted before PersistentPreRunE runs. Every other flag is skipped, help included
// so a flag after it is still read. Args with neither flag, or ones cobra will reject, read as
// the defaults with theme unset.
func preParseFlags(args []string) *rootFlags {
	fs := pflag.NewFlagSet("preparse", pflag.ContinueOnError)
	fs.SetOutput(io.Discard)
	fs.ParseErrorsAllowlist.UnknownFlags = true
	fs.BoolP("help", "h", false, "")
	rf := &rootFlags{}
	fs.StringVar(&rf.color, "color", colorAuto, "")
	fs.StringVar(&rf.theme, "theme", themeDark, "")
	if err := fs.Parse(args); err != nil {
		return &rootFlags{color: colorAuto, theme: themeDark}
	}
	rf.themeSet = fs.Changed("theme")
	return rf
}

// styledStreams returns the streams a styled path probes for a terminal: the process streams,
// or nil for both under CAIRN_PLAIN, which style.Detect and style.IsTerminal read as a pipe. A
// plain run takes the pipe path itself, never a terminal path with its TTY bit cleared.
func styledStreams(d deps, rf *rootFlags) (stdout, stderr *os.File) {
	if resolveGround(d, rf).plain {
		return nil, nil
	}
	return d.stdout, d.stderr
}
