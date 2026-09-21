package main

import (
	"fmt"
	"io"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/health"
	"github.com/glw907/cairn-cms/tool/internal/logs"
	"github.com/glw907/cairn-cms/tool/internal/render"
	"github.com/glw907/cairn-cms/tool/internal/spine"
	"github.com/glw907/cairn-cms/tool/internal/store"
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
	// acks is every --ack flag's raw value, "<check-id>=<YYYY-MM-DD>", merged with the resolved
	// --ack-file's own entries in resolveAcks.
	acks []string
}

// newHealthCmd builds cairn health. With a site named, it sweeps that one site; bare, it sweeps
// every site the registry holds, in health_sweep.go.
func newHealthCmd(d deps, rf *rootFlags) *cobra.Command {
	var f healthFlags

	cmd := &cobra.Command{
		Use:     "health [<site>]",
		Short:   shortHealth,
		Example: exampleHealth,
		GroupID: groupSite,
		Args: func(_ *cobra.Command, args []string) error {
			if len(args) > 1 {
				return healthTooManyArgsError()
			}
			return nil
		},
		ValidArgsFunction: completeSiteIDs(d),
		RunE: func(cmd *cobra.Command, args []string) error {
			return runHealth(cmd, d, rf, f, args)
		},
	}

	cmd.Flags().BoolVar(&f.asJSON, "json", false, flagHealthJSONHelp)
	cmd.Flags().IntVar(&f.errorThreshold, "error-threshold", defaultErrorThreshold, flagErrorThresholdHelp)
	cmd.Flags().StringVar(&f.since, "since", defaultSince, flagHealthSinceHelp)
	cmd.Flags().StringArrayVar(&f.acks, "ack", nil, flagAckHelp)

	return cmd
}

// runHealth resolves the registry and either sweeps every registered site (bare cairn health,
// health_sweep.go) or a single named one, and exits on the run's verdict.
func runHealth(cmd *cobra.Command, d deps, rf *rootFlags, f healthFlags, args []string) error {
	window, err := parseSince(f.since)
	if err != nil {
		return err
	}

	acks, err := resolveAcks(d, rf, f)
	if err != nil {
		return err
	}

	st, err := openRegistry(d)
	if err != nil {
		return err
	}

	if len(args) == 1 {
		return runHealthSingle(cmd, d, rf, f, st, args[0], window, acks)
	}
	return runHealthSweep(cmd, d, rf, f, st, window, acks)
}

// runHealthSingle sweeps one named site's checks and exits on the run's verdict.
func runHealthSingle(cmd *cobra.Command, d deps, rf *rootFlags, f healthFlags, st *store.Store, id string, window time.Duration, acks health.Acks) error {
	rec, err := st.Load(id)
	if err != nil {
		return unknownSiteError(id)
	}

	ctx, cancel := rf.deadline(commandContext(cmd))
	defer cancel()

	report, err := health.Run(ctx, rec, buildClients(d), health.All, health.Options{
		ErrorThreshold: f.errorThreshold,
		LogWindow:      window,
		Now:            d.now,
	}, acks)
	if err != nil {
		return err
	}

	verdict := spine.ExitCode([]spine.SiteVerdicts{siteVerdicts(report)}, nil, 0)
	if err := writeHealth(cmd, d, report, verdict, f, rf); err != nil {
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
func writeHealth(cmd *cobra.Command, d deps, r health.Report, verdict spine.Verdict, f healthFlags, rf *rootFlags) error {
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
	return writeHealthBody(cmd.OutOrStdout(), d, rf, r, verdict, rf.quiet)
}

// writeHealthBody writes one report through the render seam, which owns every layout decision:
// the body for the scope and the stream, the ranking, the section grammar, and the fix format.
// failingOnly hands the seam a report cut down to its failures, which is the --quiet body.
func writeHealthBody(w io.Writer, d deps, rf *rootFlags, r health.Report, verdict spine.Verdict, failingOnly bool) error {
	if failingOnly {
		r = onlyFailures(r)
	}
	frame := render.Render(renderInput(d, rf, []health.Report{r}, verdict))
	for _, line := range frame.Lines() {
		if _, err := fmt.Fprintln(w, line); err != nil {
			return err
		}
	}
	return nil
}

// onlyFailures returns r carrying its failing checks alone, so --quiet on a non-OK run prints
// what the operator has to act on and nothing else.
func onlyFailures(r health.Report) health.Report {
	kept := make([]health.CheckResult, 0, len(r.Checks))
	for _, c := range r.Checks {
		if c.Outcome.State == spine.Failing {
			kept = append(kept, c)
		}
	}
	r.Checks = kept
	return r
}

// renderInput builds the one input the render seam reads. This function and the detector it
// calls are the whole impure boundary: render itself reads no environment, no terminal, and no
// clock.
//
// The width is the operator's own --width when they set one, the terminal's measured column
// count when stdout is a terminal, and otherwise the seam's own default. The body follows the
// run's scope and whether stdout is a terminal, never the colour choice: an operator who forces
// colour into a pipe still gets the plain body, in colour.
func renderInput(d deps, rf *rootFlags, reports []health.Report, verdict spine.Verdict) render.RenderInput {
	resolved, _ := loadEnv(d.env)
	term := render.DetectProfile(d.stdout, render.Env{
		NoColor: resolved.noColorValue(),
		Term:    resolved.termValue(),
		Color:   rf.color,
	})

	width := rf.width
	if width <= 0 {
		width = term.Columns
	}
	return render.RenderInput{
		View:    render.ViewHealth,
		Body:    render.SelectBody(len(reports), term.TTY),
		Width:   width,
		Dark:    true,
		Profile: term.Profile,
		ASCII:   term.ASCII,
		Reports: reports,
		Verdict: verdict,
		Now:     d.now(),
	}
}

// parseSince resolves a --since value through logs.ParseSince, the one grammar health and logs
// share, and turns its refusal into the operator's line. Both flags call this, so neither can
// drift into accepting a window the other rejects.
func parseSince(s string) (time.Duration, error) {
	window, err := logs.ParseSince(s)
	if err != nil {
		return 0, invalidSinceError(s)
	}
	return window, nil
}
