// health_sweep.go is split out of health.go, which the 300-line-per-file bound
// (root_test.go's TestNoCommandFileExceedsItsBound) would otherwise exceed: one file for the
// single-site path, one for the multi-site sweep the 2026-09-20 amendment brought into 1.0.
package main

import (
	"context"
	"fmt"
	"io"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/health"
	"github.com/glw907/cairn-cms/tool/internal/spine"
	"github.com/glw907/cairn-cms/tool/internal/store"
	"github.com/spf13/cobra"
)

// maxSweepTimeout bounds a multi-site sweep's default whole-run budget, so a large registry
// cannot make bare `cairn health` run for hours: ten minutes, the cap
// tool/docs/reference/exit-codes.md publishes once Task 21 creates that page.
const maxSweepTimeout = 600 * time.Second

// runHealthSweep runs health.Run over every registered site, in store.List order, printing each
// settled report through writeHealthBody, separated by a blank line, and ending with one final
// verdict line for the whole run. A budget miss or a signal, the one cancellation path both share,
// stops the sweep after whichever site is already in flight settles; every site still to come is
// still counted toward the run's exit code the same as a settled site would be, but under --json
// it is omitted from the emitted stream rather than named, since a plain-text UNKNOWN line and a
// blank-line separator would corrupt the newline-delimited JSON; Task 20c owns --json's final,
// documented contract for a site the sweep never reached.
func runHealthSweep(cmd *cobra.Command, d deps, rf *rootFlags, f healthFlags, st *store.Store, window time.Duration) error {
	entries, listErrs := st.List()

	// An empty registry reuses spine.ErrExpectSites, sites list's own sentinel for the same
	// reason: the tool cannot say whether zero sites is every site cairn knows or none was ever
	// registered.
	if len(entries) == 0 {
		listErrs = append(listErrs, spine.ErrExpectSites)
	}

	envelope, cancel := sweepDeadline(commandContext(cmd), rf, len(entries))
	defer cancel()

	out := cmd.OutOrStdout()
	sites := make([]spine.SiteVerdicts, 0, len(entries))
	cut := len(entries)
	wroteAny := false

	writeSeparator := func() error {
		if !wroteAny {
			wroteAny = true
			return nil
		}
		_, err := fmt.Fprintln(out)
		return err
	}

	for i, e := range entries {
		select {
		case <-envelope.Done():
			cut = i
		default:
		}
		if cut == i {
			break
		}

		if !f.asJSON {
			if err := writeSeparator(); err != nil {
				return err
			}
		}

		siteCtx, siteCancel := siteBudget(envelope, rf, len(entries)-i)
		report, err := health.Run(siteCtx, e.Record, buildClients(d), health.All, health.Options{
			ErrorThreshold: f.errorThreshold,
			LogWindow:      window,
			Now:            d.now,
		}, nil)
		siteCancel()
		if err != nil {
			return err
		}

		checks := siteVerdicts(report)
		sites = append(sites, checks)
		if f.asJSON {
			data, err := report.JSON(rf.verbose)
			if err != nil {
				return err
			}
			if _, err := fmt.Fprintf(out, "%s\n", data); err != nil {
				return err
			}
			continue
		}
		verdict := spine.ExitCode([]spine.SiteVerdicts{checks}, nil, 0)
		if err := writeHealthBody(out, report, verdict, rf.quiet); err != nil {
			return err
		}
	}

	for _, rest := range entries[cut:] {
		if !f.asJSON {
			if err := writeSeparator(); err != nil {
				return err
			}
			if err := writeSweepTimeout(out, rest.ID); err != nil {
				return err
			}
		}
		sites = append(sites, spine.SiteVerdicts{})
	}

	verdict := spine.ExitCode(sites, listErrs, 0)
	// The bare aggregate verdict word is not itself JSON, so it is omitted under --json rather
	// than corrupting the newline-delimited JSON this sweep otherwise emits, one object per site.
	if !f.asJSON {
		if err := writeSeparator(); err != nil {
			return err
		}
		if _, err := fmt.Fprintln(out, verdict); err != nil {
			return err
		}
	}
	for _, e := range listErrs {
		if _, err := fmt.Fprintln(cmd.ErrOrStderr(), "cairn:", e); err != nil {
			return err
		}
	}

	d.exit(int(verdict))
	return nil
}

// writeSweepTimeout writes the line naming a site the sweep never reached, because the run's
// budget or a signal ended it first. No health.Report exists for a site the sweep never started,
// so this is not writeHealthBody's per-check shape; the three columns (verdict, id, reason) are
// new to cmd/cairn's operator-facing strings, not yet in cmd/cairn/messages.go, which Task 19c-ii
// creates, and are owed to Task 22a's editorial gate.
func writeSweepTimeout(w io.Writer, id string) error {
	_, err := fmt.Fprintf(w, "%s\t%s\t%s\n", spine.VerdictUnknown, id, spine.ReasonTimeout)
	return err
}

// sweepDeadline bounds ctx for a whole multi-site sweep. An explicit --timeout is the whole-run
// budget exactly as given; the default budget is the single-site budget times siteCount, capped
// at maxSweepTimeout, so bare `cairn health` never returns all-UNKNOWN on a registry with more
// than a few sites the way dividing the single-site default by the site count always did.
func sweepDeadline(ctx context.Context, rf *rootFlags, siteCount int) (context.Context, context.CancelFunc) {
	if rf.timeoutSet {
		return rf.deadline(ctx)
	}
	perSite := rf.timeout
	if perSite <= 0 {
		perSite = defaultTimeout
	}
	whole := perSite * time.Duration(max(siteCount, 1))
	if whole <= 0 || whole > maxSweepTimeout {
		whole = maxSweepTimeout
	}
	return context.WithTimeout(ctx, whole)
}

// siteBudget returns the deadline one site's health.Run gets, derived from envelope so it can
// never outlive the sweep's own budget. Under the default sizing every site gets the full
// single-site budget, since the envelope alone caps the whole run; under an explicit --timeout,
// the whole-run budget is divided by the sites still to run and recomputed after each one
// settles, so one slow site cannot eat the rest and a fast sweep gives its slack back.
func siteBudget(envelope context.Context, rf *rootFlags, remaining int) (context.Context, context.CancelFunc) {
	if !rf.timeoutSet {
		perSite := rf.timeout
		if perSite <= 0 {
			perSite = defaultTimeout
		}
		return context.WithTimeout(envelope, perSite)
	}
	deadline, ok := envelope.Deadline()
	if !ok {
		return context.WithCancel(envelope)
	}
	share := time.Until(deadline) / time.Duration(max(remaining, 1))
	return context.WithTimeout(envelope, share)
}
