package main

import (
	"fmt"
	"io"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/health"
	"github.com/glw907/cairn-cms/tool/internal/logs"
	"github.com/glw907/cairn-cms/tool/internal/spine"
	"github.com/spf13/cobra"
)

// defaultSince is the lookback window health and logs both use when the operator names none.
const defaultSince = "24h"

// defaultErrorThreshold is the error-rate check's cutoff: a count of matching log events over
// the window up to and including this value reports OK. Without one, a routine alerting on a
// single error record would page most mornings, which trains an operator to ignore the tool.
const defaultErrorThreshold = 5

// healthFlags holds cairn health's own flags.
type healthFlags struct {
	// asJSON prints the report as JSON instead of the plain body.
	asJSON bool
	// errorThreshold is the error-rate check's pass/fail cutoff.
	errorThreshold int
	// since is the lookback window, in the grammar logs.ParseSince accepts.
	since string
}

// newHealthCmd builds cairn health.
func newHealthCmd(d deps, rf *rootFlags) *cobra.Command {
	var f healthFlags

	cmd := &cobra.Command{
		Use:     "health [<site>]",
		Short:   "Run the read-only health checks against one site",
		Example: "cairn health ecxc-ski-a1b2c3 --json",
		GroupID: groupSite,
		Args:    cobra.MaximumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			return runHealth(cmd, d, rf, f, args)
		},
	}

	cmd.Flags().BoolVar(&f.asJSON, "json", false, "print the report as JSON")
	cmd.Flags().IntVar(&f.errorThreshold, "error-threshold", defaultErrorThreshold, "error records in the window that still report OK")
	cmd.Flags().StringVar(&f.since, "since", defaultSince, "lookback window for the error count: a whole number of m, h, or d")

	return cmd
}

// runHealth sweeps one site's checks and exits on the run's verdict.
func runHealth(cmd *cobra.Command, d deps, rf *rootFlags, f healthFlags, args []string) error {
	if len(args) == 0 {
		return fmt.Errorf("cairn: cairn health names one site.\nRun `cairn sites list` to see the sites cairn knows")
	}
	window, err := parseSince(f.since)
	if err != nil {
		return err
	}

	st, err := openRegistry(d)
	if err != nil {
		return err
	}
	rec, err := st.Load(args[0])
	if err != nil {
		return fmt.Errorf("cairn: no site named %q.\nRun `cairn sites list` to see the sites cairn knows", args[0])
	}

	ctx, cancel := rf.deadline(commandContext(cmd))
	defer cancel()

	report, err := health.Run(ctx, rec, buildClients(d), health.All, health.Options{
		ErrorThreshold: f.errorThreshold,
		LogWindow:      window,
		Now:            d.now,
	}, nil)
	if err != nil {
		return err
	}

	verdict := spine.ExitCode([]spine.SiteVerdicts{siteVerdicts(report)}, nil, 0)
	if err := writeHealth(cmd, report, verdict, f, rf); err != nil {
		return err
	}

	d.exit(int(verdict))
	return nil
}

// siteVerdicts reduces a report to the per-check subset the exit arithmetic reads. spine holds
// the arithmetic and health imports spine, so the conversion lives at the command layer rather
// than as a method on either side.
func siteVerdicts(r health.Report) spine.SiteVerdicts {
	vs := make(spine.SiteVerdicts, 0, len(r.Checks))
	for _, c := range r.Checks {
		vs = append(vs, spine.CheckVerdict{
			ID:           c.ID,
			State:        c.Outcome.State,
			Reason:       c.Outcome.Reason,
			Acknowledged: c.Acknowledged,
		})
	}
	return vs
}

// writeHealth writes the report, under two rules the agent contract freezes. --json wins over
// --quiet, because under --json the payload is the output and an empty stdout is what a wrong
// invocation looks like. --quiet writes nothing at all on an OK run, which is what makes a
// cron-driven green run silent and mail-free, and on any other verdict writes the verdict word
// and the failing checks only.
func writeHealth(cmd *cobra.Command, r health.Report, verdict spine.Verdict, f healthFlags, rf *rootFlags) error {
	if f.asJSON {
		data, err := r.JSON(rf.verbose)
		if err != nil {
			return err
		}
		_, err = fmt.Fprintf(cmd.OutOrStdout(), "%s\n", data)
		return err
	}
	if rf.quiet && verdict == spine.VerdictOK {
		return nil
	}
	return writeHealthBody(cmd.OutOrStdout(), r, verdict, rf.quiet)
}

// writeHealthBody writes the verdict word and one line per check. internal/render lands two
// segments later and takes this over; until then the body is the verdict word plus each check's
// own measured detail, which the health messages table wrote, and no prose composed here.
// failingOnly drops every check that did not fail, which is the --quiet body.
func writeHealthBody(w io.Writer, r health.Report, verdict spine.Verdict, failingOnly bool) error {
	if _, err := fmt.Fprintf(w, "%s\t%s\n", verdict, r.Site); err != nil {
		return err
	}
	for _, c := range r.Checks {
		if failingOnly && c.Outcome.State != spine.Failing {
			continue
		}
		word := spine.StateWord(c.Outcome.State, c.Acknowledged)
		if _, err := fmt.Fprintf(w, "%s\t%s\t%s\n", word, c.ID, checkDetail(c)); err != nil {
			return err
		}
	}
	return nil
}

// checkDetail returns the line a check contributes: its measured detail, or the reason it could
// not run when it has no detail at all.
func checkDetail(c health.CheckResult) string {
	if c.Outcome.Detail != "" {
		return c.Outcome.Detail
	}
	return string(c.Outcome.Reason)
}

// parseSince resolves a --since value through logs.ParseSince, the one grammar health and logs
// share, and turns its refusal into the operator's line. Both flags call this, so neither can
// drift into accepting a window the other rejects.
func parseSince(s string) (time.Duration, error) {
	window, err := logs.ParseSince(s)
	if err != nil {
		return 0, fmt.Errorf("cairn: --since %q is not a duration.\nUse a whole number of minutes, hours, or days: 90m, 24h, 7d", s)
	}
	return window, nil
}
