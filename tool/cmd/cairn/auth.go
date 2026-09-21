package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"slices"
	"strings"
	"sync"

	"github.com/glw907/cairn-cms/tool/internal/secrets"
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
	cmd.AddCommand(newAuthSetCmd(d), newAuthListCmd(d), newAuthUnsetCmd(d), newAuthProbeCmd(d))
	return cmd
}

// keyringUnavailableDisplay is auth list's line for a variable the keyring holds no answer for
// because the keyring itself could not be reached, distinct from "not set": the operator's
// credential may well be sitting in the keyring, unreadable right now rather than absent.
// Adapted from copy-standard.md section 3.8's "keyring unavailable" row for one status-line word
// rather than that row's own three-line boundary error; new to this table and owed to Task
// 22a's editorial gate.
const keyringUnavailableDisplay = "keyring unavailable, set in the environment instead"

// keyringUnavailableError is the error auth set and auth unset return when the keyring itself
// could not be reached, naming the environment-variable fallback the way copy-standard.md
// section 3.8's "keyring unavailable" row does; new to this table and owed to Task 22a's
// editorial gate.
func keyringUnavailableError(name string) error {
	return fmt.Errorf("cairn: the OS keyring did not open.\nSet %s in the environment instead", name)
}

// newAuthSetCmd builds cairn auth set <name>. Its prompt and its keyring both come from d, so
// a test supplies a fake prompt and a fake keyring without touching a terminal or a real one.
func newAuthSetCmd(d deps) *cobra.Command {
	return &cobra.Command{
		Use:     "set <name>",
		Short:   "Prompt for a value and store it in the keyring",
		Example: "cairn auth set " + varCFReadToken,
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
				if errors.Is(err, secrets.ErrKeyringUnavailable) {
					return keyringUnavailableError(name)
				}
				return fmt.Errorf("auth set: write keyring: %w", err)
			}
			_, err = fmt.Fprintf(cmd.OutOrStdout(), "%s stored in the keyring\n", name)
			return err
		},
	}
}

// newAuthUnsetCmd builds cairn auth unset <name>, the Deleter half of auth set's Writer. Deleting
// a name the keyring does not hold is success, not an error: an operator clearing a rotated
// token's stale entry should not have to know first whether one exists.
func newAuthUnsetCmd(d deps) *cobra.Command {
	return &cobra.Command{
		Use:     "unset <name>",
		Short:   "Delete one credential's keyring entry",
		Example: "cairn auth unset " + varCFReadToken,
		Args:    cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			name := args[0]
			if !isAuthVariable(name) {
				return fmt.Errorf("auth unset: %q is not one of %s", name, strings.Join(authVariables, ", "))
			}
			switch err := d.keyringDeleter.Delete(name); {
			case err == nil:
				_, ferr := fmt.Fprintf(cmd.OutOrStdout(), "%s deleted from the keyring\n", name)
				return ferr
			case errors.Is(err, secrets.ErrNotFound):
				_, ferr := fmt.Fprintf(cmd.OutOrStdout(), "%s was not stored in the keyring\n", name)
				return ferr
			case errors.Is(err, secrets.ErrKeyringUnavailable):
				return keyringUnavailableError(name)
			default:
				return fmt.Errorf("auth unset: %w", err)
			}
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
				if _, err := fmt.Fprintf(cmd.OutOrStdout(), "%s\t%s\n", r.name, keyringAwareDisplay(d, r)); err != nil {
					return err
				}
			}
			return nil
		},
	}
}

// keyringAwareDisplay returns r's display line, unchanged when anything resolved it, and
// distinguishing a keyring that could not be consulted from one that simply holds no entry when
// nothing did. loadEnv's own resolution, and so credential-resolution behavior, is untouched:
// this only refines what auth list prints for a variable Resolve already reported as a miss.
func keyringAwareDisplay(d deps, r resolution) string {
	if r.display != "not set" || d.keyringStatus == nil {
		return r.display
	}
	if _, err := d.keyringStatus(r.name); errors.Is(err, secrets.ErrKeyringUnavailable) {
		return keyringUnavailableDisplay
	}
	return r.display
}
