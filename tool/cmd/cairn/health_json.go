// health_json.go is split out of health.go and health_sweep.go, which the 300-line-per-file
// bound (root_test.go's TestNoCommandFileExceedsItsBound) would otherwise exceed: one file for
// the --json contract both health shapes write through.
package main

import (
	"fmt"
	"io"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/health"
	"github.com/glw907/cairn-cms/tool/internal/render"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// writeSiteJSON writes the single-site payload, which carries the run's own exit code: for a
// one-site invocation the site's verdict and the run's code are the same thing.
func writeSiteJSON(w io.Writer, d deps, rf *rootFlags, r health.Report, verdict spine.Verdict, elapsed time.Duration) error {
	data, err := render.MarshalSite(render.SiteJSON{
		Report:   r,
		Verbose:  rf.verbose,
		Verdict:  verdict,
		ExitCode: verdict,
		Elapsed:  elapsed,
		Now:      d.now(),
	})
	if err != nil {
		return err
	}
	_, err = fmt.Fprintf(w, "%s\n", data)
	return err
}

// writeSweepLineJSON writes one NDJSON line of a many-site stream: the single-site payload less
// its exitCode, flushed as the site settles so a consumer can stream and truncate.
func writeSweepLineJSON(w io.Writer, d deps, rf *rootFlags, r health.Report, verdict spine.Verdict, elapsed time.Duration) error {
	data, err := render.MarshalSiteLine(render.SiteJSON{
		Report:  r,
		Verbose: rf.verbose,
		Verdict: verdict,
		Elapsed: elapsed,
		Now:     d.now(),
	})
	if err != nil {
		return err
	}
	_, err = fmt.Fprintf(w, "%s\n", data)
	return err
}

// writeSweepSummaryJSON writes the stream's final line. A stream that carries none is UNKNOWN,
// the rule json-output.md publishes: a truncated stream and a complete one are otherwise
// indistinguishable, so the summary is what makes the stream readable at all.
func writeSweepSummaryJSON(w io.Writer, d deps, reports []health.Report, verdicts []spine.Verdict, verdict spine.Verdict, sites int, elapsed time.Duration) error {
	data, err := render.MarshalSummary(render.SummaryJSON{
		Reports:  reports,
		Verdicts: verdicts,
		Verdict:  verdict,
		ExitCode: verdict,
		Sites:    sites,
		Elapsed:  elapsed,
		Now:      d.now(),
	})
	if err != nil {
		return err
	}
	_, err = fmt.Fprintf(w, "%s\n", data)
	return err
}
