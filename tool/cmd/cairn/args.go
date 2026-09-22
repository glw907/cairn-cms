package main

import "github.com/spf13/cobra"

// maxOneArg builds the cobra Args validator both cairn health and cairn doctor take: at most
// one positional argument, with each command's own refusal wording supplied by errFn.
func maxOneArg(errFn func() error) cobra.PositionalArgs {
	return func(_ *cobra.Command, args []string) error {
		if len(args) > 1 {
			return errFn()
		}
		return nil
	}
}
