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
	"github.com/glw907/cairn-cms/tool/internal/render"
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
func runHealthSweep(cmd *cobra.Command, d deps, rf *rootFlags, f healthFlags, st *store.Store, window time.Duration, acks health.Acks) error {
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
	reports := make([]health.Report, 0, len(entries))
	verdicts := make([]spine.Verdict, 0, len(entries))
	cut := len(entries)
	wroteAny := false

	// More than one site on a terminal is one fleet frame, so the sweep holds its reports and
	// renders them together at the end rather than printing a single-site body per site. A pipe
	// still gets one plain block per site as it settles, which is what a cron mail and a CI log
	// read, and what lets a long sweep show progress where a frame cannot.
	clients := buildClients(d)
	started := d.now()
	fleet := !f.asJSON &&
		render.SelectBody(len(entries), detectTerminal(d, rf).TTY) == render.BodyMany

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

		if !f.asJSON && !fleet {
			if err := writeSeparator(); err != nil {
				return err
			}
		}

		siteCtx, siteCancel := siteBudget(envelope, rf, len(entries)-i)
		siteStarted := d.now()
		report, err := health.Run(siteCtx, e.Record, clients, health.All, health.Options{
			ErrorThreshold: f.errorThreshold,
			LogWindow:      window,
			Now:            d.now,
		}, acks)
		siteCancel()
		if err != nil {
			return err
		}

		checks := siteVerdicts(report)
		sites = append(sites, checks)
		reports = append(reports, report)
		siteVerdict := spine.ExitCode([]spine.SiteVerdicts{checks}, nil, 0)
		verdicts = append(verdicts, siteVerdict)
		if f.asJSON {
			if err := writeSweepLineJSON(out, d, rf, report, siteVerdict, d.now().Sub(siteStarted)); err != nil {
				return err
			}
			continue
		}
		if fleet {
			continue
		}
		if err := writeHealthBody(out, d, rf, []health.Report{report}, siteVerdict,
			runStatus(clients, 0, report.Degraded, []health.Report{report}), rf.quiet); err != nil {
			return err
		}
	}

	for _, rest := range entries[cut:] {
		if !f.asJSON && !fleet {
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
	switch {
	// The summary line closes the stream whatever --quiet says: under --json the payload is the
	// output, and a stream carrying no summary is UNKNOWN by json-output.md's own rule, so
	// suppressing it would leave an agent unable to tell a quiet green run from a truncated one.
	case f.asJSON:
		if err := writeSweepSummaryJSON(out, d, reports, verdicts, verdict, len(entries), d.now().Sub(started)); err != nil {
			return err
		}
	// --quiet on an OK sweep writes nothing at all, the rule that makes a cron-driven green run
	// silent and mail-free, and on any other verdict hands the frame its failing checks alone.
	case fleet && rf.quiet && verdict == spine.VerdictOK:
	case fleet:
		status := runStatus(clients, d.now().Sub(started), anyDegraded(reports), reports)
		if err := writeHealthBody(out, d, rf, reports, verdict, status, rf.quiet); err != nil {
			return err
		}
		for _, rest := range entries[cut:] {
			if err := writeSweepTimeout(out, rest.ID); err != nil {
				return err
			}
		}
	// Every plain-body sweep ends on the bare aggregate verdict word. The --json stream ends on
	// its summary line instead, in the first case above, since the word is not itself JSON.
	default:
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

// anyDegraded reports whether a missing token cost any site in the sweep some of its checks.
func anyDegraded(rs []health.Report) bool {
	for _, r := range rs {
		if r.Degraded {
			return true
		}
	}
	return false
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
