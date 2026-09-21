package health

import (
	"context"
	"errors"
	"sort"

	"github.com/glw907/cairn-cms/tool/internal/logs"
	"github.com/glw907/cairn-cms/tool/internal/record"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// errorsCheck counts level: error records the Worker logged over Options.LogWindow, warning at
// Options.ErrorThreshold and failing above it. A single record is a real signal, not a site-down
// signal, which is why zero through the threshold is OK rather than Failing.
type errorsCheck struct{}

// ID implements Check.
func (errorsCheck) ID() string { return "errors" }

// Needs implements Check. Errors reads Workers Logs through Cloudflare.
func (errorsCheck) Needs() Tier { return TierCF }

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
	sort.SliceStable(order, func(i, j int) bool {
		return counts[order[i]] > counts[order[j]]
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
	entries, err := logs.FetchLevel(ctx, c.CF, r.Cloudflare.WorkerName, "error", o.LogWindow, o.Now())
	if err != nil {
		if errors.Is(err, logs.ErrObservabilityOff) {
			return spine.Outcome{
				State:     spine.Unknown,
				Reason:    spine.ReasonNotObservable,
				Condition: spine.ConditionConfigObservabilityOff,
				Detail:    "worker has no observability dataset",
			}
		}
		return apiErrorOutcome(err)
	}

	count := len(entries)
	fields := []spine.OutcomeField{field("errorCount", count), field("topEvents", topEventNames(entries, 3))}

	if count == 0 {
		return spine.Outcome{State: spine.OK, Fields: fields}
	}
	if count > o.ErrorThreshold {
		return spine.Outcome{State: spine.Failing, Detail: "error count exceeds the threshold", Fields: fields}
	}
	return spine.Outcome{State: spine.OK, Detail: "error count is within the advisory band", Fields: fields}
}
