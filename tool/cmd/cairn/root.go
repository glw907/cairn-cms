package main

import (
	"context"
	"fmt"
	"time"

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

// defaultTimeout is one run's wall-clock budget when the operator names none. A single site's
// sweep makes a few dozen requests, each with its own 15-second transport timeout, so the
// budget is sized to let a slow provider answer rather than to cut it off.
const defaultTimeout = 120 * time.Second

// The three --color values. Task 20a reads the chosen value to pick a colour profile; until it
// lands the value is validated and carried, never acted on.
const (
	colorAuto   = "auto"
	colorAlways = "always"
	colorNever  = "never"
)

// pasteNotice is the stderr line the two implicitly verbose commands, adopt list and logs,
// print before their output. Neither command has a --verbose flag to hide behind: the whole of
// what they print is identifiers, so the notice is unconditional. The catalogue in
// tool/docs/design/copy-standard.md carries no row for it; this is the plainest fragment
// satisfying the standard's section 2.7, reported to the editorial gate.
const pasteNotice = "cairn: this output carries identifiers and is not safe to paste in public."

// rootFlags holds the persistent flags every command below the root reads. The root owns the
// values and hands the struct to each newXCmd, so a subcommand reads --quiet without looking
// its own parent up.
type rootFlags struct {
	// showVersion prints the version instead of the help text.
	showVersion bool
	// timeout is the whole run's wall-clock deadline.
	timeout time.Duration
	// verbose asks for the identifiers every command otherwise withholds.
	verbose bool
	// quiet suppresses an OK run's body entirely.
	quiet bool
	// color is one of colorAuto, colorAlways, or colorNever.
	color string
}

// validate reports an error when --color names a value outside the three.
func (f rootFlags) validate() error {
	switch f.color {
	case colorAuto, colorAlways, colorNever:
		return nil
	default:
		return fmt.Errorf("cairn: --color %q is not %s, %s, or %s", f.color, colorAuto, colorAlways, colorNever)
	}
}

// deadline bounds ctx by --timeout. A zero or negative timeout means no deadline, which is how
// a test drives a command with no clock pressure.
func (f rootFlags) deadline(ctx context.Context) (context.Context, context.CancelFunc) {
	if f.timeout <= 0 {
		return context.WithCancel(ctx)
	}
	return context.WithTimeout(ctx, f.timeout)
}

// commandContext returns cmd's context, or a background context when the command was run
// without one. Only a test builds a command that way; main always executes with a context.
func commandContext(cmd *cobra.Command) context.Context {
	if ctx := cmd.Context(); ctx != nil {
		return ctx
	}
	return context.Background()
}

// newRootCmd builds the cairn command tree over d.
func newRootCmd(d deps) *cobra.Command {
	f := &rootFlags{}

	cmd := &cobra.Command{
		Use:     "cairn",
		Short:   "Operate a cairn-cms production site",
		Example: "cairn health ecxc-ski-a1b2c3",
		Args:    cobra.NoArgs,
		// SilenceUsage and SilenceErrors are set here and nowhere else in this package. Cobra
		// inherits both from the nearest ancestor whose field is true, so repeating them on a
		// subcommand is dead weight that drifts out of step with the root.
		SilenceUsage:  true,
		SilenceErrors: true,
		PersistentPreRunE: func(*cobra.Command, []string) error {
			return f.validate()
		},
		RunE: func(cmd *cobra.Command, _ []string) error {
			if f.showVersion {
				_, err := fmt.Fprintf(cmd.OutOrStdout(), "%s (%s)\n", version.String(), version.Commit)
				return err
			}
			return cmd.Help()
		},
	}

	cmd.Flags().BoolVarP(&f.showVersion, "version", "V", false, "print the version and exit")

	p := cmd.PersistentFlags()
	p.DurationVarP(&f.timeout, "timeout", "t", defaultTimeout, "wall-clock budget for the whole run")
	p.BoolVarP(&f.verbose, "verbose", "v", false, "print the identifiers a run otherwise withholds")
	p.BoolVarP(&f.quiet, "quiet", "q", false, "print nothing when the run is OK")
	p.StringVar(&f.color, "color", colorAuto, "when to colour the output: auto, always, or never")
	cmd.MarkFlagsMutuallyExclusive("quiet", "verbose")

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
	)

	return cmd
}
