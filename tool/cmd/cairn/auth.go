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

// flushWriter pushes w's held partial line to the real stream when w buffers one. A test's
// bytes.Buffer does not, so the assertion is on the interface rather than on *logx.Writer.
func flushWriter(w io.Writer) error {
	f, ok := w.(interface{ Flush() error })
	if !ok {
		return nil
	}
	return f.Flush()
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
	// The prompt ends without a newline, and main wraps both process streams in a logx.Writer
	// that holds a partial line so a credential split across two writes cannot escape the
	// scrub. Unflushed, the prompt would reach the terminal only after the read it asks for.
	if err := flushWriter(cmd.ErrOrStderr()); err != nil {
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

// newAuthCmd builds the cairn auth command tree.
func newAuthCmd(d deps) *cobra.Command {
	cmd := &cobra.Command{
		Use:     "auth",
		Short:   shortAuth,
		Example: exampleAuth,
		GroupID: groupCredentials,
		// A command group with no subcommand named is a usage error, not a help request, so it
		// exits 3 with nothing on stdout. Without this, cobra prints help to stdout and exits 0,
		// which tells a script the invocation succeeded. The help goes to stderr, where the
		// error already is, because stdout carries payloads alone.
		RunE: func(cmd *cobra.Command, _ []string) error {
			_, _ = fmt.Fprint(cmd.ErrOrStderr(), cmd.UsageString())
			return authNoSubcommandError()
		},
	}
	cmd.AddCommand(newAuthSetCmd(d), newAuthListCmd(d), newAuthUnsetCmd(d), newAuthProbeCmd(d))
	return cmd
}

// newAuthSetCmd builds cairn auth set <name>. Its prompt and its keyring both come from d, so
// a test supplies a fake prompt and a fake keyring without touching a terminal or a real one.
func newAuthSetCmd(d deps) *cobra.Command {
	return &cobra.Command{
		Use:     "set <name>",
		Short:   shortAuthSet,
		Example: exampleAuthSet,
		Args:    cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			name := args[0]
			if !isAuthVariable(name) {
				return notACredentialError(name)
			}
			value, err := d.readPassword(cmd, name)
			if err != nil {
				return err
			}
			if err := d.keyringWriter.Set(name, value); err != nil {
				if errors.Is(err, secrets.ErrKeyringUnavailable) {
					return keyringUnavailableError(name)
				}
				return err
			}
			_, err = fmt.Fprint(cmd.OutOrStdout(), authStoredMessage(name))
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
		Short:   shortAuthUnset,
		Example: exampleAuthUnset,
		Args:    cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			name := args[0]
			if !isAuthVariable(name) {
				return notACredentialError(name)
			}
			switch err := d.keyringDeleter.Delete(name); {
			case err == nil:
				_, ferr := fmt.Fprint(cmd.OutOrStdout(), authDeletedMessage(name))
				return ferr
			case errors.Is(err, secrets.ErrNotFound):
				_, ferr := fmt.Fprint(cmd.OutOrStdout(), authNotStoredMessage(name))
				return ferr
			case errors.Is(err, secrets.ErrKeyringUnavailable):
				return keyringUnavailableError(name)
			default:
				return err
			}
		},
	}
}

// newAuthListCmd builds cairn auth list over the same dependency set.
func newAuthListCmd(d deps) *cobra.Command {
	return &cobra.Command{
		Use:     "list",
		Short:   shortAuthList,
		Example: exampleAuthList,
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
