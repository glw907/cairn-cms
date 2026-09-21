// Command cairn is the operator CLI for a cairn-cms production site: registry
// adoption, read-only health checks, log queries, and a scheduled tripwire.
package main

import (
	"context"
	"fmt"
	"io"
	"os"
	"os/signal"
	"syscall"

	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// processWriters returns the two writers every command's output goes through. Naming the
// process streams once, here, is what lets Task 21 wrap them in the credential scrubber in one
// place; a command writes through cmd.OutOrStdout and cmd.ErrOrStderr and never reaches
// os.Stdout or os.Stderr itself.
func processWriters() (out, errOut io.Writer) {
	return os.Stdout, os.Stderr
}

// notifyContext returns a context cancelled on SIGINT or SIGTERM. Windows delivers neither the
// way a Unix shell does and has no SIGTERM at all, so a run there is cancelled by its parent
// closing the context instead; both paths reach the same code, which is why this is one
// function rather than a per-platform pair.
func notifyContext(parent context.Context) (context.Context, context.CancelFunc) {
	return signal.NotifyContext(parent, os.Interrupt, syscall.SIGTERM)
}

func main() {
	ctx, stop := notifyContext(context.Background())
	defer stop()

	out, errOut := processWriters()
	cmd := newRootCmd(newDeps())
	cmd.SetOut(out)
	cmd.SetErr(errOut)

	if err := cmd.ExecuteContext(ctx); err != nil {
		_, _ = fmt.Fprintln(errOut, err)
		// A run that ended in an error observed nothing, so it reports UNKNOWN rather than the
		// 1 a non-monitoring CLI would exit with: 1 is WARNING in this tool's convention and
		// would tell a scheduler the site was measured and found wanting.
		os.Exit(int(spine.VerdictUnknown))
	}
}
