package main

import (
	"fmt"
	"os"
	"slices"
	"strings"

	"github.com/glw907/cairn-cms/tool/internal/secrets"
	"github.com/spf13/cobra"
	"golang.org/x/term"
)

// isAuthVariable reports whether name is one of the three variables cairn
// auth operates on.
func isAuthVariable(name string) bool {
	return slices.Contains(authVariables, name)
}

// promptPassword prompts on cmd's error stream for name's value with echo
// off, through golang.org/x/term, and returns it. It never reads from
// argv or a flag.
func promptPassword(cmd *cobra.Command, name string) (string, error) {
	if _, err := fmt.Fprintf(cmd.ErrOrStderr(), "%s: ", name); err != nil {
		return "", err
	}
	b, err := term.ReadPassword(int(os.Stdin.Fd()))
	if _, ferr := fmt.Fprintln(cmd.ErrOrStderr()); ferr != nil {
		return "", ferr
	}
	if err != nil {
		return "", fmt.Errorf("read %s: %w", name, err)
	}
	return string(b), nil
}

// newAuthCmd builds the cairn auth command tree.
func newAuthCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "auth",
		Short: "Manage credentials in the OS keyring",
	}
	cmd.AddCommand(newAuthSetCmd(promptPassword, secrets.NewKeyring()))
	cmd.AddCommand(newAuthListCmd(osEnviron, secrets.NewKeyring()))
	return cmd
}

// newAuthSetCmd builds cairn auth set <name>. readPassword and w are
// parameters so a test can supply a fake prompt and a fake keyring without
// touching a terminal or a real keyring.
func newAuthSetCmd(readPassword func(*cobra.Command, string) (string, error), w secrets.Writer) *cobra.Command {
	return &cobra.Command{
		Use:           "set <name>",
		Short:         "Prompt for a value and store it in the keyring",
		Args:          cobra.ExactArgs(1),
		SilenceUsage:  true,
		SilenceErrors: true,
		RunE: func(cmd *cobra.Command, args []string) error {
			name := args[0]
			if !isAuthVariable(name) {
				return fmt.Errorf("auth set: %q is not one of %s", name, strings.Join(authVariables, ", "))
			}
			value, err := readPassword(cmd, name)
			if err != nil {
				return fmt.Errorf("auth set: %w", err)
			}
			if err := w.Set(name, value); err != nil {
				return fmt.Errorf("auth set: write keyring: %w", err)
			}
			_, err = fmt.Fprintf(cmd.OutOrStdout(), "%s stored in the keyring\n", name)
			return err
		},
	}
}

// newAuthListCmd builds cairn auth list. envFn and p are parameters for the
// same reason as newAuthSetCmd's readPassword and w.
func newAuthListCmd(envFn func(string) string, p ...secrets.Provider) *cobra.Command {
	return &cobra.Command{
		Use:           "list",
		Short:         "Show which provider answers each credential variable",
		Args:          cobra.NoArgs,
		SilenceUsage:  true,
		SilenceErrors: true,
		RunE: func(cmd *cobra.Command, _ []string) error {
			resolved, _ := loadEnv(envFn, p...)
			for _, r := range resolved.sourceLines() {
				if _, err := fmt.Fprintf(cmd.OutOrStdout(), "%s\t%s\n", r.name, r.display); err != nil {
					return err
				}
			}
			return nil
		},
	}
}
