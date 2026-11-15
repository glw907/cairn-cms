package main

import (
	"strings"

	"github.com/spf13/cobra"
)

// maxOneArg builds the cobra Args validator both cairn health and cairn doctor take: at most
// one positional argument, with each command's refusal wording supplied by errFn.
func maxOneArg(errFn func() error) cobra.PositionalArgs {
	return func(_ *cobra.Command, args []string) error {
		if len(args) > 1 {
			return errFn()
		}
		return nil
	}
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
