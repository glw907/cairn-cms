package main

import (
	"encoding/json"
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
		Long:    longHealth,
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

	clients := buildClients(d)
	started := d.now()
	report, err := health.Run(ctx, rec, clients, health.All, health.Options{
		ErrorThreshold: f.errorThreshold,
		LogWindow:      window,
		Now:            d.now,
		OnCheck:        checkProgress(cmd, rf, f),
	}, acks)
	if err != nil {
		return err
	}

	verdict := spine.ExitCode([]spine.SiteVerdicts{health.Verdicts(report)}, nil, 0)
	elapsed := d.now().Sub(started)
	status := runStatus(clients, elapsed, report.Degraded, []health.Report{report})
	if err := writeHealth(cmd, d, report, verdict, status, f, rf, elapsed); err != nil {
		return err
	}

	d.exit(int(verdict))
	return nil
}

// checkProgress returns the callback health.Run calls as each check settles, or nil when this
// run prints none. It writes one line per check to stderr, so a sweep that takes a while is
// visibly progressing rather than apparently hung.
//
// --json suppresses it whatever --verbose says: under --json the run's own progress is the
// newline-delimited stream on stdout, and a second stream in a different shape on stderr is
// noise an agent cannot parse.
func checkProgress(cmd *cobra.Command, rf *rootFlags, f healthFlags) func(health.CheckResult) {
	if !rf.verbose || f.asJSON {
		return nil
	}
	errOut := cmd.ErrOrStderr()
	return func(c health.CheckResult) {
		_, _ = fmt.Fprint(errOut, checkProgressLine(c.ID, spine.StateWord(c.Outcome.State, c.Outcome.Reason, c.Acknowledged)))
	}
}

// writeHealth writes the report, under two rules the agent contract freezes. --json wins over
// --quiet, because under --json the payload is the output and an empty stdout is what a wrong
// invocation looks like. --quiet writes nothing at all on an OK run, which is what makes a
// cron-driven green run silent and mail-free, and writes the whole body on every other verdict.
func writeHealth(cmd *cobra.Command, d deps, r health.Report, verdict spine.Verdict, status render.StatusState, f healthFlags, rf *rootFlags, elapsed time.Duration) error {
	if f.asJSON {
		return writeSiteJSON(cmd.OutOrStdout(), d, rf, r, verdict, elapsed)
	}
	if quietSuppressesFrame(rf.quiet, verdict) {
		return nil
	}
	return writeHealthBody(cmd.OutOrStdout(), d, rf, []health.Report{r}, verdict, status)
}

// quietSuppressesFrame reports whether --quiet writes no frame at all for a run that settled on
// verdict. It is the single-site path's rule and the sweep's, stated once so the two cannot
// disagree about what a quiet run prints.
//
// The gate is OK and nothing softer. A WARNING run is not OK: a held failure and a drifting
// engine version both land there, and a routine whose operator asked only for silence on a green
// run would otherwise never see either.
func quietSuppressesFrame(quiet bool, verdict spine.Verdict) bool {
	return quiet && verdict == spine.VerdictOK
}

// writeHealthBody writes one report through the render seam, which owns every layout decision:
// the body for the scope and the stream, the ranking, the section grammar, and the fix format.
func writeHealthBody(w io.Writer, d deps, rf *rootFlags, rs []health.Report, verdict spine.Verdict, status render.StatusState) error {
	frame := render.Render(renderInput(d, rf, rs, verdict, status))
	for _, line := range frame.Lines() {
		if _, err := fmt.Fprintln(w, line); err != nil {
			return err
		}
	}
	return nil
}

// renderInput builds the one input the render seam reads. This function and the detector it
// calls are the whole impure boundary: render itself reads no environment, no terminal, and no
// clock.
//
// The width is the operator's own --width when they set one, the terminal's measured column
// count when stdout is a terminal, and otherwise the seam's own default. The body follows the
// run's scope and whether stdout is a terminal, never the colour choice: an operator who forces
// colour into a pipe still gets the plain body, in colour.
//
// The ground is --theme alone, which nothing detects: --color and NO_COLOR choose whether to
// paint, and --theme chooses which palette to paint from.
func renderInput(d deps, rf *rootFlags, reports []health.Report, verdict spine.Verdict, status render.StatusState) render.RenderInput {
	term := detectTerminal(d, rf)
	width := rf.width
	if width <= 0 {
		width = term.Columns
	}
	return render.RenderInput{
		View:    render.ViewHealth,
		Body:    render.SelectBody(len(reports), term.TTY),
		Width:   width,
		Dark:    rf.theme != themeLight,
		Profile: term.Profile,
		ASCII:   term.ASCII,
		Reports: reports,
		Status:  status,
		Verdict: verdict,
		Now:     d.now(),
	}
}

// detectTerminal reads the one TTY-and-colour answer every command's render input is built from.
func detectTerminal(d deps, rf *rootFlags) render.Terminal {
	resolved, _ := loadEnv(d.env)
	return render.DetectProfile(d.stdout, render.Env{
		NoColor: resolved.noColorValue(),
		Term:    resolved.termValue(),
		Color:   rf.color,
	})
}

// runStatus builds the run's own state beside its checks: how long the sweep took, which
// provider tokens it resolved and through what, and which it could not find, with the checks
// each absence stopped named from the checks' own declared tiers rather than from a second list.
//
// The GitHub token's expiry comes off the creds check's own structured field in reports, so the
// status line prints the date whenever the run measured one, inside or outside the fourteen-day
// warning window, and costs no second request. A run with no report to read, which is what a
// bare site listing is, leaves it unset.
func runStatus(c health.Clients, elapsed time.Duration, degraded bool, reports []health.Report) render.StatusState {
	s := render.StatusState{Elapsed: elapsed, Degraded: degraded}
	expiry := githubTokenExpiry(reports)
	for _, cred := range []struct {
		variable string
		present  bool
		from     string
		needed   func(health.Tier) bool
	}{
		{varCFReadToken, c.HaveCF, c.CFFrom, func(t health.Tier) bool { return t == health.TierCF || t == health.TierBoth }},
		{varGHReadToken, c.HaveGH, c.GHFrom, func(t health.Tier) bool { return t == health.TierGH || t == health.TierBoth }},
	} {
		entry := render.Credential{Variable: cred.variable}
		if cred.variable == varGHReadToken {
			entry.Expires = expiry
		}
		if cred.present {
			entry.Provider = cred.from
			s.Credentials = append(s.Credentials, entry)
			continue
		}
		for _, check := range health.All {
			if cred.needed(check.Needs()) {
				entry.Disables = append(entry.Disables, check.ID())
			}
		}
		s.Credentials = append(s.Credentials, entry)
	}
	return s
}

// githubTokenExpiry returns the GitHub token expiry the creds check measured, reading the first
// report that carries one, and the zero time where no run measured one. Every report in a sweep
// describes the same token, so the first is as good as any.
func githubTokenExpiry(reports []health.Report) time.Time {
	for _, r := range reports {
		for _, c := range r.Checks {
			if c.ID != credsCheckID {
				continue
			}
			for _, f := range c.Outcome.Fields {
				if f.Key != health.FieldGitHubTokenExpiry {
					continue
				}
				var at time.Time
				if err := json.Unmarshal(f.Value, &at); err != nil {
					return time.Time{}
				}
				return at
			}
		}
	}
	return time.Time{}
}

// credsCheckID is the check whose outcome carries the GitHub token's expiry.
const credsCheckID = "creds"

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
