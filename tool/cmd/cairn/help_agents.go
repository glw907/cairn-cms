package main

import "github.com/spf13/cobra"

// agentsPageFor returns the page for a build where cairn new is hidden or shown. The setup
// contract is part of the page only once the command is in the root help, so a hidden command
// is never advertised to an agent.
func agentsPageFor(newHidden bool) string {
	if newHidden {
		return agentsPage
	}
	return agentsPage + "\n\n" + newAgentGuide + "\n\n" + agentsSetupEvents + "\n\n" + newExitCodes
}

// newAgentsCmd builds the `agents` help topic, which `cairn help agents` prints.
//
// It is a topic rather than a command: with no RunE and no subcommands, cobra's help
// template prints the Long alone, with no usage block, and reaching it either way exits 0. That
// is the whole point of the surface. An agent discovering cairn has `--help` and nothing else,
// because `go install` puts the binary on a machine that holds no cairn-cms checkout, so the
// contract has to be verbatim in the binary and every page it cites has to be a URL.
func newAgentsCmd(newHidden bool) *cobra.Command {
	return &cobra.Command{
		Use:     "agents",
		Short:   shortAgents,
		Long:    agentsPageFor(newHidden),
		Example: exampleAgents,
		GroupID: groupOther,
	}
}
