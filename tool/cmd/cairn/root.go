package main

import (
	"fmt"

	"github.com/glw907/cairn-cms/tool/internal/version"
	"github.com/spf13/cobra"
)

// newRootCmd builds the cairn command tree. Later tasks attach subcommands
// to the returned command.
func newRootCmd() *cobra.Command {
	var showVersion bool

	cmd := &cobra.Command{
		Use:          "cairn",
		Short:        "Operate a cairn-cms production site",
		SilenceUsage: true,
		RunE: func(cmd *cobra.Command, args []string) error {
			if showVersion {
				_, err := fmt.Fprintln(cmd.OutOrStdout(), version.String())
				return err
			}
			return cmd.Help()
		},
	}
	cmd.Flags().BoolVar(&showVersion, "version", false, "print the version and exit")

	return cmd
}
