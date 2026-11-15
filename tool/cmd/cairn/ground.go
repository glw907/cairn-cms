package main

import (
	"os"
	"strings"
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
// CAIRN_THEME=light. A light --theme also counts when rf was built by hand rather than parsed,
// since only a parsed flag carries its Changed bit.
//
// cairn never queries the terminal for its background: a terminal that does not answer the query
// would leave the run waiting.
func resolveGround(d deps, rf *rootFlags) ground {
	g := ground{dark: true, plain: d.env(varPlain) == "1"}
	switch {
	case rf.themeSet || rf.theme == themeLight:
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

// styledStreams returns the streams a styled path probes for a terminal: the process streams,
// or nil for both under CAIRN_PLAIN, which style.Detect and style.IsTerminal read as a pipe. A
// plain run takes the pipe path itself, never a terminal path with its TTY bit cleared.
func styledStreams(d deps, rf *rootFlags) (stdout, stderr *os.File) {
	if resolveGround(d, rf).plain {
		return nil, nil
	}
	return d.stdout, d.stderr
}
