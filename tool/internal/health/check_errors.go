package health

import (
	"cmp"
	"context"
	"errors"
	"slices"

	"github.com/glw907/cairn-cms/tool/internal/logs"
	"github.com/glw907/cairn-cms/tool/internal/record"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// errorsCheck counts the error-level records the site's cairn engine wrote over Options.LogWindow,
// warning at Options.ErrorThreshold and failing above it. A single record is a real signal, not a
// site-down signal, which is why zero through the threshold is OK rather than Failing.
//
// It counts engine records alone, never every error-level line the Worker logged. On a public site
// the Worker's own 404 logging runs to thousands a day, which is what the count reported until
// 2026-09-21: a live run against a healthy site returned 1000 errors in 24 hours, the query's own
// limit, made up of crawler 404s and holding no cairn record at all. logs.FetchRecords carries the
// distinction.
type errorsCheck struct{}

// ID implements Check.
func (errorsCheck) ID() string { return "errors" }

// Needs implements Check. Errors reads Workers Logs through Cloudflare.
func (errorsCheck) Needs() Tier { return TierCF }

// errorsDetail is errorsCheck's own internal measurement, flattened into Fields as a
// non-verbose "errorCount" entry and a verbose-only "topEvents" entry, so a reverted
// verboseField call on TopEvents goes red against TestCheckDetailFieldVisibility rather than
// silently reaching a non-verbose render.
type errorsDetail struct {
	// Count is how many error-level engine records logs.FetchRecords returned over
	// Options.LogWindow.
	Count int
	// Truncated reports whether the fetch filled its own page limit, which makes Count a floor
	// rather than a total.
	Truncated bool
	// TopEvents is the up-to-three most frequent Event values among those records, most
	// frequent first.
	TopEvents []string
}

// fields flattens d into its ordered spine.OutcomeField entries: errorCount, non-verbose,
// errorCountTruncated beside it only when the count is a floor, and topEvents, verbose-only since
// it names the events a Worker actually logged. The truncation key is absent on an exact count, so
// a payload written before it existed still reads the same.
func (d errorsDetail) fields() []spine.OutcomeField {
	fields := []spine.OutcomeField{field("errorCount", d.Count)}
	if d.Truncated {
		fields = append(fields, field("errorCountTruncated", true))
	}
	return append(fields, verboseObservedField("topEvents", d.TopEvents, spine.SourceCloudflare))
}

// topEventNames returns the up-to-n most frequent Event values in entries, most frequent first,
// ties broken by first appearance: entries arrive newest first, so a tie favors the more recent
// event.
func topEventNames(entries []logs.Entry, n int) []string {
	order := make([]string, 0, len(entries))
	counts := make(map[string]int, len(entries))
	for _, e := range entries {
		if _, seen := counts[e.Event]; !seen {
			order = append(order, e.Event)
		}
		counts[e.Event]++
	}
	slices.SortStableFunc(order, func(a, b string) int {
		return cmp.Compare(counts[b], counts[a])
	})
	if len(order) > n {
		order = order[:n]
	}
	return order
}

// Run implements Check. Only the dataset-absent Unknown declares a condition, config.observability-off,
// whose remedy is to turn observability on. An over-threshold count declares none: the site is
// logging real errors, and telling its operator to enable a setting already enabled would be the
// wrong remedy for the one verdict that means something is actually broken.
func (errorsCheck) Run(ctx context.Context, r record.Record, c Clients, o Options) spine.Outcome {
	records, err := logs.FetchRecords(ctx, c.CF, r.Cloudflare.WorkerName, "error", o.LogWindow, o.Now())
	if err != nil {
		if errors.Is(err, logs.ErrObservabilityOff) {
			return spine.Outcome{
				State:     spine.Unknown,
				Reason:    spine.ReasonNotObservable,
				Condition: spine.ConditionConfigObservabilityOff,
				Detail:    detailErrorsObservabilityOff(),
			}
		}
		return apiErrorOutcome(err)
	}

	count := len(records.Entries)
	fields := errorsDetail{Count: count, Truncated: records.Truncated, TopEvents: topEventNames(records.Entries, 3)}.fields()

	if count > o.ErrorThreshold {
		return spine.Outcome{State: spine.Failing, Code: spine.CodeErrorsAboveThreshold, Detail: detailErrorsAboveThreshold(count, records.Truncated, o.LogWindow, o.ErrorThreshold), Fields: fields}
	}
	return spine.Outcome{State: spine.OK, Detail: detailErrorsCount(count, records.Truncated, o.LogWindow), Fields: fields}
}
