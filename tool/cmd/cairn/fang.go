package main

import (
	"context"
	"image/color"
	"io"
	"os"

	"charm.land/fang/v2"
	"charm.land/lipgloss/v2"
	"github.com/glw907/cairn-cms/tool/v2/internal/style"
	"github.com/spf13/cobra"
	"github.com/spf13/pflag"
)

// fangColorScheme paints Cobra's help in the Warm Stone palette. Fang decides light or dark from
// the terminal and supplies the choice as pick; no colour reaches a stream that is not a
// terminal, or one with NO_COLOR set, because fang writes through a colorprofile writer.
func fangColorScheme(pick lipgloss.LightDarkFunc) fang.ColorScheme {
	ink := func(r style.Role) color.Color { return pick(style.Pair(r)) }
	return fang.ColorScheme{
		Base:           ink(style.RoleText),
		Title:          ink(style.RoleAccent),
		Description:    ink(style.RoleText),
		Codeblock:      lipgloss.NoColor{},
		Program:        ink(style.RoleText),
		DimmedArgument: ink(style.RoleMuted),
		Comment:        ink(style.RoleMuted),
		Flag:           ink(style.RoleAccent),
		FlagDefault:    ink(style.RoleMuted),
		Command:        ink(style.RoleAccent),
		QuotedString:   ink(style.RoleUnknown),
		Argument:       ink(style.RoleText),
		Help:           ink(style.RoleMuted),
		Dash:           ink(style.RoleMuted),
		ErrorHeader:    [2]color.Color{ink(style.RoleText), ink(style.RoleFailing)},
		ErrorDetails:   ink(style.RoleFailing),
	}
}

// ttyWriter presents the scrubbed output stream to fang as the terminal it ends in. Fang chooses
// a colour rung by asking whether its writer is a file on a terminal, and the scrubber wrapping
// the process streams is not one, so without this the theme would never paint. It has only the
// methods that question needs: an embedded *os.File would also lend it WriteString, ReadFrom,
// and WriteAt, which write to the terminal past the scrubber.
type ttyWriter struct {
	term *os.File
	out  io.Writer
}

// Write sends help through the scrubbed stream.
func (t ttyWriter) Write(p []byte) (int, error) { return t.out.Write(p) }

// Read reads the terminal; colorprofile's file check asks for it, and nothing calls it.
func (t ttyWriter) Read(p []byte) (int, error) { return t.term.Read(p) }

// Close does nothing: the process owns the terminal, and main flushes the scrubbed stream.
func (t ttyWriter) Close() error { return nil }

// Fd is the terminal's descriptor, which fang and colorprofile probe.
func (t ttyWriter) Fd() uintptr { return t.term.Fd() }

// executeThemed runs the command tree over args, themed by fang when a person is reading it.
//
// A terminal with colour gets fang's help layout in Warm Stone. Every other run, a pipe, a
// scheduler's log, NO_COLOR, TERM=dumb, --color never, takes cobra's plain help unchanged: that
// text is the contract a program reads, and cmd/mangen harvests the man pages from it.
func executeThemed(ctx context.Context, d deps, root *cobra.Command, args []string) error {
	term := detectTerminal(d, &rootFlags{color: colorArg(args)})
	if !term.TTY || style.NoColor(term.Profile) {
		return root.ExecuteContext(ctx)
	}
	root.SetOut(ttyWriter{term: d.stdout, out: root.OutOrStdout()})
	return fangExecute(ctx, root)
}

// colorArg is the --color value args carry, read before cobra parses them because the help path
// is chosen first. Every other flag is skipped, help included so a --color after it is still
// read, and args with no --color, or one cobra will reject, read as colorAuto.
func colorArg(args []string) string {
	fs := pflag.NewFlagSet("color", pflag.ContinueOnError)
	fs.SetOutput(io.Discard)
	fs.ParseErrorsAllowlist.UnknownFlags = true
	fs.BoolP("help", "h", false, "")
	color := fs.String("color", colorAuto, "")
	if err := fs.Parse(args); err != nil {
		return colorAuto
	}
	return *color
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
