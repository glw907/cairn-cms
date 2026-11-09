package main

import (
	"context"
	"image/color"
	"io"
	"os"

	"charm.land/fang/v2"
	"charm.land/lipgloss/v2"
	"github.com/glw907/cairn-cms/tool/v2/internal/render"
	"github.com/spf13/cobra"
)

// warmStoneInk is one Warm Stone role's light and dark hex, copied from render's palette table.
// render keeps that table unexported and this file is the only other place a help colour is
// chosen, so the values are repeated here rather than widening render's surface; a change to
// the palette is a change to both.
type warmStoneInk struct{ light, dark string }

var (
	inkText    = warmStoneInk{"#28231d", "#eae7e3"}
	inkMuted   = warmStoneInk{"#615d57", "#a8a49e"}
	inkFailing = warmStoneInk{"#b71824", "#ff8e86"}
	inkUnknown = warmStoneInk{"#915200", "#f7ac4d"}
	inkAccent  = warmStoneInk{"#7246cf", "#9d84ec"}
)

// fangColorScheme paints Cobra's help in the Warm Stone palette. Fang decides light or dark from
// the terminal and supplies the choice as pick; no colour reaches a stream that is not a
// terminal, or one with NO_COLOR set, because fang writes through a colorprofile writer.
func fangColorScheme(pick lipgloss.LightDarkFunc) fang.ColorScheme {
	ink := func(i warmStoneInk) color.Color {
		return pick(lipgloss.Color(i.light), lipgloss.Color(i.dark))
	}
	return fang.ColorScheme{
		Base:           ink(inkText),
		Title:          ink(inkAccent),
		Description:    ink(inkText),
		Codeblock:      lipgloss.NoColor{},
		Program:        ink(inkText),
		DimmedArgument: ink(inkMuted),
		Comment:        ink(inkMuted),
		Flag:           ink(inkAccent),
		FlagDefault:    ink(inkMuted),
		Command:        ink(inkAccent),
		QuotedString:   ink(inkUnknown),
		Argument:       ink(inkText),
		Help:           ink(inkMuted),
		Dash:           ink(inkMuted),
		ErrorHeader:    [2]color.Color{ink(inkText), ink(inkFailing)},
		ErrorDetails:   ink(inkFailing),
	}
}

// ttyWriter presents the scrubbed output stream to fang as the terminal it ends in. Fang chooses
// a colour rung by asking whether its writer is a file descriptor on a terminal, and the
// scrubber wrapping the process streams is not one, so without this the theme would never paint.
type ttyWriter struct {
	*os.File
	out io.Writer
}

// Write sends help through the scrubbed stream while Fd, Read, and Close stay the terminal's.
func (t ttyWriter) Write(p []byte) (int, error) { return t.out.Write(p) }

// executeThemed runs the command tree, themed by fang when a person is reading it.
//
// A terminal with colour gets fang's help layout in Warm Stone. Every other run, a pipe, a
// scheduler's log, NO_COLOR, TERM=dumb, takes cobra's plain help unchanged: that text is the
// contract a program reads, and cmd/mangen harvests the man pages from it.
func executeThemed(ctx context.Context, d deps, root *cobra.Command) error {
	term := detectTerminal(d, &rootFlags{color: colorAuto})
	if !term.TTY || term.Profile == render.ProfileNoColor {
		return root.ExecuteContext(ctx)
	}
	root.SetOut(ttyWriter{File: d.stdout, out: root.OutOrStdout()})
	return fangExecute(ctx, root)
}

// fangExecute runs root through fang so every command's help takes the theme.
//
// Fang is configured to add nothing: cairn already has --version, its own completion command,
// and mangen for man pages, so fang's version flag and hidden man command are off. Fang prints
// a returned error by default; the handler here is a no-op because runTree is the only error
// printer, and it translates the error and decides the exit code.
func fangExecute(ctx context.Context, root *cobra.Command) error {
	return fang.Execute(ctx, root,
		fang.WithColorSchemeFunc(fangColorScheme),
		fang.WithoutVersion(),
		fang.WithoutManpage(),
		fang.WithErrorHandler(func(io.Writer, fang.Styles, error) {}),
	)
}
