package main

import (
	"context"
	"fmt"
	"os"
	"slices"
	"strings"
	"sync"

	"github.com/spf13/cobra"
	"golang.org/x/term"
)

// isAuthVariable reports whether name is one of the three variables cairn
// auth operates on.
func isAuthVariable(name string) bool {
	return slices.Contains(authVariables, name)
}

// restoreOnCancel calls restore once, when ctx is done, and returns the function the caller
// defers to stand the watch down. term.ReadPassword restores the terminal on its own return,
// and a signal at the prompt never lets it return, which is what leaves a shell with echo off
// after Ctrl-C.
func restoreOnCancel(ctx context.Context, restore func()) (stop func()) {
	done := make(chan struct{})
	var mu sync.Mutex
	stopped := false

	go func() {
		select {
		case <-ctx.Done():
			// stopped is read under the lock rather than by racing the two channels in one
			// select: a select whose cases are both ready picks at random, which would let a
			// cancellation after the prompt returned reach a terminal this command has
			// finished with.
			mu.Lock()
			defer mu.Unlock()
			if !stopped {
				restore()
			}
		case <-done:
		}
	}()

	return func() {
		mu.Lock()
		stopped = true
		mu.Unlock()
		close(done)
	}
}

// promptPassword prompts on cmd's error stream for name's value with echo
// off, through golang.org/x/term, and returns it. It never reads from
// argv or a flag.
func promptPassword(cmd *cobra.Command, name string) (string, error) {
	fd := int(os.Stdin.Fd())
	// A stdin that carries no terminal state has no echo to restore, and reading its state is
	// how that is learned: this is not a terminal test the run branches on, so the read path
	// below is the same either way.
	if state, err := term.GetState(fd); err == nil {
		defer restoreOnCancel(commandContext(cmd), func() { _ = term.Restore(fd, state) })()
	}

	if _, err := fmt.Fprintf(cmd.ErrOrStderr(), "%s: ", name); err != nil {
		return "", err
	}
	b, err := term.ReadPassword(fd)
	if _, ferr := fmt.Fprintln(cmd.ErrOrStderr()); ferr != nil {
		return "", ferr
	}
	if err != nil {
		return "", fmt.Errorf("read %s: %w", name, err)
	}
	return string(b), nil
}

// newAuthCmd builds the cairn auth command tree.
func newAuthCmd(d deps) *cobra.Command {
	cmd := &cobra.Command{
		Use:     "auth",
		Short:   "Manage credentials in the OS keyring",
		Example: "cairn auth list",
		GroupID: groupCredentials,
	}
	cmd.AddCommand(newAuthSetCmd(d), newAuthListCmd(d), newAuthProbeCmd(d))
	return cmd
}

// newAuthSetCmd builds cairn auth set <name>. Its prompt and its keyring both come from d, so
// a test supplies a fake prompt and a fake keyring without touching a terminal or a real one.
func newAuthSetCmd(d deps) *cobra.Command {
	return &cobra.Command{
		Use:     "set <name>",
		Short:   "Prompt for a value and store it in the keyring",
		Example: "cairn auth set CAIRN_CF_READ_TOKEN",
		Args:    cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			name := args[0]
			if !isAuthVariable(name) {
				return fmt.Errorf("auth set: %q is not one of %s", name, strings.Join(authVariables, ", "))
			}
			value, err := d.readPassword(cmd, name)
			if err != nil {
				return fmt.Errorf("auth set: %w", err)
			}
			if err := d.keyringWriter.Set(name, value); err != nil {
				return fmt.Errorf("auth set: write keyring: %w", err)
			}
			_, err = fmt.Fprintf(cmd.OutOrStdout(), "%s stored in the keyring\n", name)
			return err
		},
	}
}

// newAuthListCmd builds cairn auth list over the same dependency set.
func newAuthListCmd(d deps) *cobra.Command {
	return &cobra.Command{
		Use:     "list",
		Short:   "Show which provider answers each credential variable",
		Example: "cairn auth list",
		Args:    cobra.NoArgs,
		RunE: func(cmd *cobra.Command, _ []string) error {
			resolved, _ := loadEnv(d.env, d.secretProviders()...)
			for _, r := range resolved.sourceLines() {
				if _, err := fmt.Fprintf(cmd.OutOrStdout(), "%s\t%s\n", r.name, r.display); err != nil {
					return err
				}
			}
			return nil
		},
	}
}
