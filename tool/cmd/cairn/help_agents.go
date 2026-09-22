package main

import "github.com/spf13/cobra"

// newAgentsCmd builds the `agents` help topic, which `cairn help agents` prints.
//
// It is a topic rather than a command: with no RunE and no subcommands, cobra's own help
// template prints the Long alone, with no usage block, and reaching it either way exits 0. That
// is the whole point of the surface. An agent discovering cairn has `--help` and nothing else,
// because `go install` puts the binary on a machine that holds no tool/docs tree, so the
// contract has to be verbatim in the binary.
func newAgentsCmd() *cobra.Command {
	return &cobra.Command{
		Use:     "agents",
		Short:   shortAgents,
		Long:    agentsPage,
		Example: exampleAgents,
		GroupID: groupOther,
	}
}
