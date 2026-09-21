// Command cairn is the operator CLI for a cairn-cms production site: registry
// adoption, read-only health checks, log queries, and a scheduled tripwire.
package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"github.com/glw907/cairn-cms/tool/internal/logx"
	"github.com/glw907/cairn-cms/tool/internal/providers"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// processStdout returns the stdout handle render's terminal detection probes. It is the
// *os.File rather than the io.Writer below because a colour profile, a column count, and a TTY
// check each need the file descriptor. Nothing writes through it.
func processStdout() *os.File {
	return os.Stdout
}

// notifyContext returns a context cancelled on SIGINT or SIGTERM. Windows delivers neither the
// way a Unix shell does and has no SIGTERM at all, so a run there is cancelled by its parent
// closing the context instead; both paths reach the same code, which is why this is one
// function rather than a per-platform pair.
func notifyContext(parent context.Context) (context.Context, context.CancelFunc) {
	return signal.NotifyContext(parent, os.Interrupt, syscall.SIGTERM)
}

// scrubbedWriters wraps the two process streams in the credential scrubber, returning them with
// the number of registered values too short to match and the flush every exit path runs.
//
// Both bearer tokens are registered, the ones the operator never configured included: an absent
// value is empty, which the scrubber ignores, so registering it costs nothing and removes the
// branch that would otherwise decide per run which values are worth protecting.
//
// The third variable, the Cloudflare account id, is deliberately not registered. It is an
// identifier rather than a bearer token, it is stored in cleartext in every site record, and
// `sites list --verbose` and `auth probe` both print it on purpose, so redacting it would blank
// the diagnostic output an operator reads without protecting anything.
//
// The flush emits whatever partial line is still buffered, since a scrubber that holds output to
// a line boundary has to be told when the last line will never arrive.
func scrubbedWriters(d deps) (out, errOut io.Writer, skipped int, flush func()) {
	creds := scrubTargets(d)

	o := logx.New(os.Stdout, creds)
	e := logx.New(os.Stderr, creds)
	return o, e, o.Skipped(), func() {
		_ = o.Close()
		_ = e.Close()
	}
}

// scrubTargets returns the values the process streams are scrubbed of, the two bearer tokens and
// nothing else, for the reasons scrubbedWriters states.
func scrubTargets(d deps) []providers.Credential {
	resolved, _ := loadEnv(d.env, d.secretProviders()...)
	return []providers.Credential{resolved.cfToken(), resolved.ghToken()}
}

func main() {
	d := newDeps()
	d.stdout = processStdout()

	out, errOut, skipped, flush := scrubbedWriters(d)
	d.scrubSkipped = skipped
	// A command that reports a verdict ends the process through d.exit rather than by returning,
	// so the flush has to ride that path too or the last unterminated line is lost.
	d.exit = func(code int) {
		flush()
		os.Exit(code)
	}

	code := runTree(context.Background(), d, out, errOut, os.Args[1:])
	flush()
	os.Exit(code)
}

// runTree executes the command tree over args and returns the process exit code.
//
// The recover is why this is a function rather than main's own body. A Go panic's default output
// goes straight to the real os.Stderr, bypassing errOut and its scrubber, so a panic in a
// credential-carrying frame could print a token into a scheduler's log. health.Run already
// recovers a panicking check; this covers every frame outside one.
func runTree(parent context.Context, d deps, out, errOut io.Writer, args []string) (code int) {
	defer func() {
		if p := recover(); p != nil {
			_, _ = fmt.Fprintln(errOut, commandCrashedMessage(commandPath(args), fmt.Sprintf("%T", p)))
			code = int(spine.VerdictUnknown)
		}
	}()

	ctx, stop := notifyContext(parent)
	defer stop()

	cmd := newRootCmd(d)
	cmd.SetOut(out)
	cmd.SetErr(errOut)
	cmd.SetArgs(args)

	err := cmd.ExecuteContext(ctx)
	if err == nil {
		return int(spine.VerdictOK)
	}
	// A coded error carries a verdict and no message: the command that returned one has already
	// printed everything the operator needs, so printing again would double it.
	if _, coded := errors.AsType[codedError](err); !coded {
		_, _ = fmt.Fprintln(errOut, translateError(err))
	}
	return int(exitVerdict(err))
}

// commandPath names the command a panic was raised under, for the crash line. It reads the
// leading non-flag words of args rather than asking cobra, because a panic can be raised before
// cobra has resolved anything. Bare cairn names itself.
func commandPath(args []string) string {
	path := []string{"cairn"}
	for _, a := range args {
		if strings.HasPrefix(a, "-") {
			break
		}
		path = append(path, a)
	}
	return strings.Join(path, " ")
}

// codedError is an error carrying its own process verdict, returned by a command that measured
// something without producing a health report: cairn auth probe is the only one. It is a typed
// error rather than a call into spine.ExitCode because the probe settles provider States and
// holds no site verdicts, no listing errors, and no expected site count, which are ExitCode's
// whole input.
type codedError struct {
	verdict spine.Verdict
}

// Error implements error, naming the verdict rather than a condition: a coded error is never
// printed, and this string exists for a test failure message and a %v in a wrapped chain.
func (e codedError) Error() string {
	return "cairn: run reported " + e.verdict.String()
}

// codedExit returns the error a command uses to hand main its own verdict.
func codedExit(v spine.Verdict) error {
	return codedError{verdict: v}
}

// exitVerdict maps an error that produced no report onto the code the process exits with.
//
// It is the second and last way an exit code is decided. spine.ExitCode decides the code for a
// run that produced reports, from site verdicts, listing errors, and an expected site count, and
// none of the cases below can be expressed in those three, which is why the two cannot disagree.
//
// Everything except a coded error reports UNKNOWN. A cancelled run, a usage error, and a tool
// fault all say the same thing to a routine: the checks did not run, so this invocation says
// nothing about the site.
func exitVerdict(err error) spine.Verdict {
	if coded, ok := errors.AsType[codedError](err); ok {
		return coded.verdict
	}
	return spine.VerdictUnknown
}
