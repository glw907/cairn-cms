// health_sweep.go is split out of health.go, which the 300-line-per-file bound
// (root_test.go's TestNoCommandFileExceedsItsBound) would otherwise exceed: one file for the
// single-site path, one for the multi-site sweep the 2026-09-20 amendment brought into 1.0.
package main

import (
	"bytes"
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
// cannot make bare `cairn health` run for hours. It is four times the single-site default, which
// is the relationship that keeps the two numbers coherent: a registry of up to four sites, the
// size the tool is built for, never reaches the cap at all, and a larger one shares this budget
// by siteBudget's fair share rather than letting the sites at the top of the list spend it.
// tool/docs/reference/exit-codes.md publishes both numbers.
const maxSweepTimeout = 4 * defaultTimeout

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

	// A sweep's verdict is only known once every site has settled, and --quiet turns on that
	// verdict, so the plain path cannot decide per site whether to print. It writes into a buffer
	// instead and flushes it at the end, which is what makes `cairn health --quiet` silent on a
	// green run under cron, systemd, launchd, and Task Scheduler, none of which is a terminal.
	// Buffering the fleet path too would cost nothing but say less: that path renders one frame at
	// the end anyway, and holding its decision in the same place as the plain path's is what keeps
	// the rule one rule.
	out := cmd.OutOrStdout()
	var held bytes.Buffer
	quiet := rf.quiet && !f.asJSON
	if quiet {
		out = &held
	}
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
		report, err := health.Run(siteCtx, e.Record, clients, d.healthChecks(), health.Options{
			ErrorThreshold: f.errorThreshold,
			LogWindow:      window,
			Now:            d.now,
			OnCheck:        checkProgress(cmd, rf, f),
		}, acks)
		siteCancel()
		if err != nil {
			return err
		}

		checks := health.Verdicts(report)
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
			runStatus(clients, 0, report.Degraded, []health.Report{report})); err != nil {
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
	case fleet:
		status := runStatus(clients, d.now().Sub(started), anyDegraded(reports), reports)
		if err := writeHealthBody(out, d, rf, reports, verdict, status); err != nil {
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
	// --quiet on an OK sweep writes nothing at all, the rule that makes a cron-driven green run
	// silent and mail-free. On any other verdict the sweep writes what it would have written
	// without the flag, in one copy rather than per site, so the body an operator reads is
	// byte-identical either way.
	if quiet && !quietSuppressesFrame(rf.quiet, verdict) {
		if _, err := held.WriteTo(cmd.OutOrStdout()); err != nil {
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
// creates, and are reviewed at the 1.0 editorial gate.
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
	whole := perSiteTimeout(rf) * time.Duration(max(siteCount, 1))
	if whole <= 0 || whole > maxSweepTimeout {
		whole = maxSweepTimeout
	}
	return context.WithTimeout(ctx, whole)
}

// siteBudget returns the deadline one site's health.Run gets, derived from envelope so it can
// never outlive the sweep's own budget. A site gets its fair share of what is left, the envelope's
// remaining time divided by the sites still to run, and never more than the per-site budget,
// whether that budget is the default or an explicit --timeout. The share is recomputed after each
// site settles, so one slow site cannot eat the rest and a fast sweep gives its slack back to the
// sites behind it. Sites run one after another, which is what makes the division the whole
// protection: without it the first site could spend an envelope eleven others are waiting on.
func siteBudget(envelope context.Context, rf *rootFlags, remaining int) (context.Context, context.CancelFunc) {
	deadline, ok := envelope.Deadline()
	if !ok {
		return context.WithCancel(envelope)
	}
	share := time.Until(deadline) / time.Duration(max(remaining, 1))
	return context.WithTimeout(envelope, min(share, perSiteTimeout(rf)))
}

// perSiteTimeout is the budget one site's health run gets, the explicit --timeout where the
// operator set one and defaultTimeout otherwise.
func perSiteTimeout(rf *rootFlags) time.Duration {
	if rf.timeout <= 0 {
		return defaultTimeout
	}
	return rf.timeout
}
