package main

import (
	"fmt"

	"github.com/glw907/cairn-cms/tool/internal/version"
	"github.com/spf13/cobra"
)

// flags holds the root command's flag values.
type flags struct {
	showVersion bool
}

// newRootCmd builds the cairn command tree. Later tasks attach subcommands
// to the returned command.
func newRootCmd() *cobra.Command {
	var f flags

	cmd := &cobra.Command{
		Use:           "cairn",
		Short:         "Operate a cairn-cms production site",
		Args:          cobra.NoArgs,
		SilenceUsage:  true,
		SilenceErrors: true,
		RunE: func(cmd *cobra.Command, args []string) error {
			if f.showVersion {
				_, err := fmt.Fprintf(cmd.OutOrStdout(), "%s (%s)\n", version.String(), version.Commit)
				return err
			}
			return cmd.Help()
		},
	}
	cmd.Flags().BoolVar(&f.showVersion, "version", false, "print the version and exit")
	cmd.AddCommand(newAuthCmd())
	cmd.AddCommand(newProbeTokenCmd())

	return cmd
}
