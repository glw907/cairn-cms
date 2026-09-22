package main

import (
	"context"
	"fmt"
	"runtime"
	"strings"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/logx"
	"github.com/glw907/cairn-cms/tool/internal/render"
	"github.com/glw907/cairn-cms/tool/internal/version"
	"github.com/spf13/cobra"
)

// The three groups cairn --help sorts its commands into. A group id is cobra's own key, never
// operator-facing; the Title beside each AddGroup call below is the heading an operator reads.
const (
	groupSite        = "site"
	groupCredentials = "credentials"
	groupOther       = "other"
)

// defaultTimeout is one site's wall-clock budget when the operator names none.
//
// It is sized so a single site can always finish inside it: the nine checks make at most
// thirty-one requests between them, each bounded at 15 seconds, which is 465 seconds in the worst
// case where every one runs to its own timeout. The per-check counts are published in
// tool/docs/reference/exit-codes.md, and TestTheSingleSiteBudgetFitsTheRequestArithmetic reads
// them from that page so the doc and this constant cannot drift.
//
// A timeout is a ceiling and not a wait: a healthy site still answers in a few seconds. The
// earlier 120-second default was a budget one site could not finish inside, so a run against a
// site whose provider had stalled reported UNKNOWN rather than the fault it was measuring.
const defaultTimeout = 480 * time.Second

// The three --color values. Task 20a reads the chosen value to pick a colour profile; until it
// lands the value is validated and carried, never acted on.
const (
	colorAuto   = "auto"
	colorAlways = "always"
	colorNever  = "never"
)

// The two --theme values, the ground a frame's palette is resolved against.
//
// There is no auto: querying a terminal for its background (OSC 11) is a write-then-read against
// the operator's own terminal, and a terminal that does not answer leaves the run waiting on one.
// 1.0 takes the value the operator states, and dark when they state none.
const (
	themeDark  = "dark"
	themeLight = "light"
)

// rootFlags holds the persistent flags every command below the root reads. The root owns the
// values and hands the struct to each newXCmd, so a subcommand reads --quiet without looking
// its own parent up.
type rootFlags struct {
	// timeout is the whole run's wall-clock deadline.
	timeout time.Duration
	// timeoutSet reports whether the operator passed --timeout explicitly, as opposed to the
	// flag sitting at its default value. A value equal to the default cannot be told apart from
	// an unset default by value alone, since the default is a value an operator can also type;
	// PersistentPreRunE sets this from the flag's own Changed bit.
	timeoutSet bool
	// verbose asks for the identifiers every command otherwise withholds.
	verbose bool
	// quiet suppresses an OK run's body entirely.
	quiet bool
	// color is one of colorAuto, colorAlways, or colorNever.
	color string
	// theme is themeDark or themeLight, and decides which ground the palette is read against. It
	// is independent of color: NO_COLOR and --color decide whether a frame is painted at all, and
	// this decides which palette it is painted from.
	theme string
	// width overrides the terminal column count render/profile.go's DetectProfile would
	// otherwise read. Zero means unset: the operator's own terminal width applies. Task 20a
	// reads the chosen value and carries it; the seam that composes a frame to it is Task 20b-i.
	width int
	// widthSet reports whether the operator passed --width explicitly, the same Changed-bit
	// pattern timeoutSet uses: zero is both the flag's default and a value an operator could
	// type, so only Changed tells the two apart, and only an explicit --width is validated.
	widthSet bool
	// ackFile names the acknowledgement file health reads and sites list skips. Empty means the
	// default, ackFilePath's own <registry directory>/acknowledgements.json.
	ackFile string
}

// The bounds an explicit --width is held to. Both exist to catch a typo rather than to describe
// a terminal: below widthMin the renderer has no room for a site name beside a verdict word, and
// above widthMax a value is a stray digit rather than a screen size, since the widest ultrawide
// monitor at the smallest legible font still sits under it.
const (
	widthMin = 20
	widthMax = 1000
)

// validate reports an error when --color names a value outside the three, when --theme names a
// value outside the two, or when an explicit --width falls outside widthMin to widthMax.
func (f rootFlags) validate() error {
	switch f.color {
	case colorAuto, colorAlways, colorNever:
	default:
		return colorInvalidError(f.color)
	}
	switch f.theme {
	case themeDark, themeLight:
	default:
		return themeInvalidError(f.theme)
	}
	if f.widthSet && (f.width < widthMin || f.width > widthMax) {
		return widthInvalidError(f.width)
	}
	return nil
}

// deadline bounds ctx by --timeout. A zero or negative timeout means no deadline, which is how
// a test drives a command with no clock pressure.
func (f rootFlags) deadline(ctx context.Context) (context.Context, context.CancelFunc) {
	if f.timeout <= 0 {
		return context.WithCancel(ctx)
	}
	return context.WithTimeout(ctx, f.timeout)
}

// writeNotice writes one operator-facing notice to stderr, wrapped to the width the command's
// own output composes into: the operator's --width, the terminal's measured columns, or the
// budget a frame takes when nothing measured one. A notice is prose, so a line left for the
// terminal to fold breaks at whatever column its own edge falls on and leaves a stray word
// under it; every line cairn prints is width-aware, and this is the writer the bodies use.
//
// A notice carrying its own line breaks keeps them: each line is wrapped on its own, so a
// two-sentence notice does not reflow into one paragraph.
func writeNotice(cmd *cobra.Command, d deps, rf *rootFlags, notice string) error {
	width := rf.width
	if width <= 0 {
		width = detectTerminal(d, rf).Columns
	}
	if width <= 0 {
		width = render.Width80
	}
	theme := render.NewTheme(rf.theme != themeLight, render.ProfileNoColor)
	for _, paragraph := range strings.Split(notice, "\n") {
		for _, line := range theme.Wrap(paragraph, width) {
			if _, err := fmt.Fprintln(cmd.ErrOrStderr(), line); err != nil {
				return err
			}
		}
	}
	return nil
}

// commandContext returns cmd's context, or a background context when the command was run
// without one. Only a test builds a command that way; main always executes with a context.
func commandContext(cmd *cobra.Command) context.Context {
	if ctx := cmd.Context(); ctx != nil {
		return ctx
	}
	return context.Background()
}

// versionLine renders tmplVersion for the running binary's own build identity: internal/version
// resolves the tool version and the commit, and runtime reports the toolchain that built it and
// the platform it targets.
func versionLine() string {
	goVersion := strings.TrimPrefix(runtime.Version(), "go")
	return fmt.Sprintf(tmplVersion, version.String(), version.Commit, goVersion, runtime.GOOS, runtime.GOARCH)
}

// newRootCmd builds the cairn command tree over d.
func newRootCmd(d deps) *cobra.Command {
	f := &rootFlags{}

	cmd := &cobra.Command{
		Use:     "cairn",
		Short:   shortRoot,
		Long:    longRoot,
		Example: exampleRoot,
		// Cobra routes an unrecognized first word to the root's own Args validator, so this is
		// where an unknown command is refused. cobra.NoArgs would do it in one line; the usage
		// contract wants two.
		Args: func(_ *cobra.Command, args []string) error {
			if len(args) > 0 {
				return unknownCommandError(args[0])
			}
			return nil
		},
		// SilenceUsage and SilenceErrors are set here and nowhere else in this package. Cobra
		// inherits both from the nearest ancestor whose field is true, so repeating them on a
		// subcommand is dead weight that drifts out of step with the root.
		SilenceUsage:  true,
		SilenceErrors: true,
		PersistentPreRunE: func(c *cobra.Command, _ []string) error {
			if flag := c.Flags().Lookup("timeout"); flag != nil {
				f.timeoutSet = flag.Changed
			}
			if flag := c.Flags().Lookup("width"); flag != nil {
				f.widthSet = flag.Changed
			}
			if err := f.validate(); err != nil {
				return err
			}
			if f.verbose && d.scrubSkipped > 0 {
				_ = writeNotice(c, d, f, scrubSkippedNotice(d.scrubSkipped, logx.MinLength))
			}
			return nil
		},
		RunE: func(cmd *cobra.Command, _ []string) error {
			return cmd.Help()
		},
	}

	// cmd.Version, rather than a hand-rolled flag, is what makes cobra register and serve
	// --version: its own execute() checks c.Version != "" and prints it before
	// PersistentPreRunE runs, which is why the timeout and width validation above never sees a
	// --version invocation. The four parts (tool version, commit, Go toolchain, GOOS/GOARCH) are
	// composed once, here, not read from any literal.
	cmd.Version = versionLine()
	// Cobra's default template prefixes "cairn version ", a string the copy table does not
	// carry. The template is reduced to the composed line alone so --version prints what
	// tmplVersion says and nothing else.
	cmd.SetVersionTemplate("{{.Version}}\n")
	// The bool flag is registered explicitly, with cairn's own -V shorthand and help text,
	// before InitDefaultVersionFlag would otherwise add an unshorthanded one: cobra skips adding
	// a "version" flag that already exists, so this is what makes -V (not just --version) work.
	cmd.Flags().BoolP("version", "V", false, flagVersionHelp)

	p := cmd.PersistentFlags()
	p.DurationVarP(&f.timeout, "timeout", "t", defaultTimeout, flagTimeoutHelp)
	p.BoolVarP(&f.verbose, "verbose", "v", false, flagVerboseHelp)
	p.BoolVarP(&f.quiet, "quiet", "q", false, flagQuietHelp)
	p.StringVar(&f.color, "color", colorAuto, flagColorHelp)
	p.StringVar(&f.theme, "theme", themeDark, flagThemeHelp)
	p.IntVar(&f.width, "width", 0, flagWidthHelp)
	p.StringVar(&f.ackFile, "ack-file", "", flagAckFileHelp)
	cmd.MarkFlagsMutuallyExclusive("quiet", "verbose")
	// The completion offers the two accepted values, so an operator learns them at the prompt
	// rather than from the usage error a third value earns.
	_ = cmd.RegisterFlagCompletionFunc("theme", func(*cobra.Command, []string, string) ([]string, cobra.ShellCompDirective) {
		return []string{themeDark, themeLight}, cobra.ShellCompDirectiveNoFileComp
	})

	cmd.AddGroup(
		&cobra.Group{ID: groupSite, Title: "Site commands:"},
		&cobra.Group{ID: groupCredentials, Title: "Credential commands:"},
		&cobra.Group{ID: groupOther, Title: "Other commands:"},
	)
	cmd.SetHelpCommandGroupID(groupOther)
	cmd.SetCompletionCommandGroupID(groupOther)

	cmd.AddCommand(
		newSitesCmd(d, f),
		newHealthCmd(d, f),
		newLogsCmd(d, f),
		newAdoptCmd(d, f),
		newAuthCmd(d),
		newAgentsCmd(),
	)

	// A flag error names the command the flag was given to, not the root: an agent told to run
	// `cairn --help` after `cairn health --erro-threshold 5` reads the wrong page. Cobra
	// inherits this function down the tree the way it inherits SilenceUsage, so setting it here
	// covers every subcommand.
	cmd.SetFlagErrorFunc(func(c *cobra.Command, err error) error {
		return flagError(c.CommandPath(), err)
	})

	return cmd
}

// completeSiteIDs is the ValidArgsFunction cairn health and cairn logs share for their
// positional site argument. It reads the registry only, never the network: an error opening or
// listing it answers no candidates rather than a printed error, since a completion script has
// nowhere useful to show one.
func completeSiteIDs(d deps) func(cmd *cobra.Command, args []string, toComplete string) ([]string, cobra.ShellCompDirective) {
	return func(_ *cobra.Command, args []string, toComplete string) ([]string, cobra.ShellCompDirective) {
		if len(args) > 0 {
			return nil, cobra.ShellCompDirectiveNoFileComp
		}
		st, err := openRegistry(d)
		if err != nil {
			return nil, cobra.ShellCompDirectiveNoFileComp
		}
		entries, _ := st.List()
		var ids []string
		for _, e := range entries {
			if strings.HasPrefix(e.ID, toComplete) {
				ids = append(ids, e.ID)
			}
		}
		return ids, cobra.ShellCompDirectiveNoFileComp
	}
}
