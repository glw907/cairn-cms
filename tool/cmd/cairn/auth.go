package main

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"io"
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

// promptPassword prompts on cmd's error stream for name's value with echo off, through
// golang.org/x/term, and returns it. It never reads from argv or a flag.
//
// The echo-off read is attempted unconditionally; there is no separate TTY query. When
// term.ReadPassword returns any error at all, which is the shape the read takes on a
// non-terminal stdin, the fallback below reads one line from stdin instead, so `printf %s "$v"
// | cairn auth set NAME` works with no separate flag and no errno inspection, which is not
// portable across the tool's three target platforms.
func promptPassword(cmd *cobra.Command, name string, stdin io.Reader) (string, error) {
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
	if err != nil {
		return readPipedValue(stdin, name)
	}
	if _, ferr := fmt.Fprintln(cmd.ErrOrStderr()); ferr != nil {
		return "", ferr
	}
	return string(b), nil
}

// readPipedValue reads one line from stdin, promptPassword's fallback when the echo-off
// terminal read fails. A trailing `\r\n` is stripped the same as a bare `\n`, so a value piped
// from a Windows shell or a PowerShell pipeline is stored without a stray carriage return that
// would otherwise fail every request with no visible cause. An empty value is refused.
func readPipedValue(stdin io.Reader, name string) (string, error) {
	line, err := bufio.NewReader(stdin).ReadString('\n')
	if err != nil && !errors.Is(err, io.EOF) {
		return "", fmt.Errorf("read %s: %w", name, err)
	}
	line = strings.TrimSuffix(line, "\n")
	line = strings.TrimSuffix(line, "\r")
	if line == "" {
		return "", emptyPipedValueError(name)
	}
	return line, nil
}

// emptyPipedValueError is auth set's refusal of an empty piped value, new to this table and
// owed to Task 22a's editorial gate.
func emptyPipedValueError(name string) error {
	return fmt.Errorf("cairn: %s is empty.\nPipe a non-empty value: printf %%s \"$v\" | cairn auth set %s", name, name)
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
