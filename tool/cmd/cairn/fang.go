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
)

// fangColorScheme paints Cobra's help in the Warm Stone palette, each colour taken from th: the
// theme built for cairn's own ground and detected profile, so the rungs match the rest of the
// tool. Fang's own light or dark guess, supplied as the function's argument, is ignored. Text is
// the terminal's own foreground, so the structure carries in weight and in Muted, never in a
// hue.
func fangColorScheme(th style.Theme) func(lipgloss.LightDarkFunc) fang.ColorScheme {
	return func(lipgloss.LightDarkFunc) fang.ColorScheme {
		ink := th.Color
		return fang.ColorScheme{
			Base:           ink(style.RoleText),
			Title:          ink(style.RoleText),
			Description:    ink(style.RoleMuted),
			Codeblock:      lipgloss.NoColor{},
			Program:        ink(style.RoleText),
			DimmedArgument: ink(style.RoleMuted),
			Comment:        ink(style.RoleMuted),
			Flag:           ink(style.RoleText),
			FlagDefault:    ink(style.RoleMuted),
			Command:        ink(style.RoleText),
			QuotedString:   ink(style.RoleText),
			Argument:       ink(style.RoleText),
			Help:           ink(style.RoleMuted),
			Dash:           ink(style.RoleMuted),
			ErrorHeader:    [2]color.Color{ink(style.RoleText), ink(style.RoleFailing)},
			ErrorDetails:   ink(style.RoleFailing),
		}
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
// scheduler's log, NO_COLOR, CAIRN_PLAIN, TERM=dumb, --color never, takes cobra's plain help
// unchanged: that text is the contract a program reads, and cmd/mangen harvests the man pages
// from it. Cobra answers --help before any flag is parsed into the root's flags, so --color and
// --theme are read from args here.
func executeThemed(ctx context.Context, d deps, root *cobra.Command, args []string) error {
	rf := preParseFlags(args)
	term := detectTerminal(d, rf)
	if !term.TTY || style.NoColor(term.Profile) {
		return root.ExecuteContext(ctx)
	}
	root.SetOut(ttyWriter{term: d.stdout, out: root.OutOrStdout()})
	return fangExecute(ctx, root, style.NewTheme(resolveGround(d, rf).dark, term.Profile, term.ASCII))
}

// fangExecute runs root through fang so every command's help takes th.
//
// Fang is configured to add nothing: cairn already has --version, its own completion command,
// and mangen for man pages, so fang's version flag and hidden man command are off. Fang prints
// a returned error by default; the handler here is a no-op because runTree is the only error
// printer, and it translates the error and decides the exit code.
func fangExecute(ctx context.Context, root *cobra.Command, th style.Theme) error {
	return fang.Execute(ctx, root,
		fang.WithColorSchemeFunc(fangColorScheme(th)),
		fang.WithoutVersion(),
		fang.WithoutManpage(),
		fang.WithErrorHandler(func(io.Writer, fang.Styles, error) {}),
	)
}
