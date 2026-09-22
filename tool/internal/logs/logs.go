// Package logs is the tool's Workers Logs read path: the --since grammar health and logs share,
// the ordered log entry shape a 2.0 log viewer polls with no wrapper, and the error count the
// health sweep's errors check spends.
package logs

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"strconv"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/providers"
)

// Query is one Workers Logs telemetry read: worker's own events over the trailing Since window,
// optionally narrowed to one event name, capped at Limit entries (0 means a default cap).
type Query struct {
	// Worker names the Workers script the query reads.
	Worker string
	// Since bounds the query to the trailing window ending now, clamped to RetentionClamp.
	Since time.Duration
	// Event narrows the query to one event name, matched against the JSON "event" key every
	// engine log record carries. Empty means every event.
	Event string
	// Limit caps the number of entries Fetch returns. 0 means a default cap.
	Limit int
}

// Field is one key an engine log record carries beyond its level/event/timestamp envelope, kept
// as raw, unparsed JSON: a 2.0 log viewer or a printed field list decides how to render it, and
// Fetch never stringifies a value it did not itself put there.
type Field struct {
	// Key is the JSON key, in the order the source record carried it.
	Key string `json:"key"`
	// Value is the key's value, exactly as the API returned it.
	Value json.RawMessage `json:"value"`
}

// Entry is one engine log record, its envelope split out of Fields so a caller reads At, Level,
// and Event without decoding JSON itself, with every other key left in Fields, ordered.
type Entry struct {
	// At is the record's own "timestamp" field.
	At time.Time `json:"at"`
	// Level is the record's own "level" field ("info", "warn", or "error").
	Level string `json:"level"`
	// Event is the record's own "event" field, one of src/lib/log/events.ts's union.
	Event string `json:"event"`
	// Fields carries every key beyond the envelope, in the order the source record carried them.
	Fields []Field `json:"fields"`
}

// ErrObservabilityOff is the sentinel Fetch and FetchRecords return when a Worker's telemetry
// query answers 404. Every other classified reason passes through unchanged, so a caller reports
// it the same way every sibling check does.
//
// A live check on 2026-09-21 narrowed this sharply. Two Workers on the verification account
// whose settings carry no observability object at all answered the same query 200 with zero
// events, as did a Worker name that does not exist, so a Worker with observability off is not
// distinguishable from one that simply logged nothing over the window, and this sentinel does not
// reach a caller for that case. It used to cover an unclassified reason too, which is how a 400
// (cairn's own query body being malformed) reported for a week as a site whose observability was
// never turned on. The 404 arm is kept for a route that does not exist at all; nothing on the
// verification account produced one.
var ErrObservabilityOff = errors.New("logs: worker has no observability dataset")

// RetentionClamp is the Workers Logs retention window observed on the verification account: every
// window fully inside 7 days returned events, and every window 8 or more days back returned none,
// measured by narrowing the boundary directly. This is the account
// plan's own retention window, not a fixed cairn constant; an operator on a plan with a longer
// retention window reads their own boundary the same way, since the API returns no retention
// value directly.
const RetentionClamp = 7 * 24 * time.Hour

// defaultLimit is fetch's own entry cap when Query.Limit is 0.
const defaultLimit = 200

// recordLimit bounds FetchRecords's own query. A page that fills to it is reported truncated
// rather than counted as exact: the endpoint publishes no total of its own, and its
// result.events.count saturates at the limit the query asked for. Measured live on 2026-09-21,
// where a 24 hour level: error query against a healthy production Worker answered with count 1000
// against a limit of 1000.
const recordLimit = 1000

// sinceGrammar is the message every ParseSince rejection names, so an operator sees the accepted
// grammar rather than a bare "invalid value".
const sinceGrammar = `--since wants a positive integer followed by "m", "h", or "d" (for example "90m", "24h", or "7d")`

// ParseSince parses a --since flag value, the grammar health and logs share: a positive integer
// followed by one of m, h, or d, meaning minutes, hours, or days. This is Go's time.ParseDuration
// narrowed rather than widened, because ns through s are noise at a log window's scale and d is
// what an operator wants. A bare integer, a negative value, a zero, a float, and a unit outside
// the three each fail naming sinceGrammar.
func ParseSince(s string) (time.Duration, error) {
	if len(s) < 2 {
		return 0, errors.New(sinceGrammar)
	}
	unit := s[len(s)-1:]
	var scale time.Duration
	switch unit {
	case "m":
		scale = time.Minute
	case "h":
		scale = time.Hour
	case "d":
		scale = 24 * time.Hour
	default:
		return 0, errors.New(sinceGrammar)
	}
	n, err := strconv.Atoi(s[:len(s)-1])
	if err != nil || n <= 0 {
		return 0, errors.New(sinceGrammar)
	}
	return time.Duration(n) * scale, nil
}

// clampSince narrows since to RetentionClamp when it exceeds it.
func clampSince(since time.Duration) time.Duration {
	return min(since, RetentionClamp)
}

// filterType is the "type" every leaf filter in a telemetry query must declare, one of the
// API's "string", "number", or "boolean". Every key cairn filters on ($metadata.service, event,
// level) holds a string. A filter without it is refused: the endpoint answers HTTP 400 with a
// ZodError naming the missing key, which is exactly what cairn sent until 2026-09-21
// (packages/create-cairn-site/fixtures/cloudflare/observability-telemetry-query.filter-rejected.400.json).
const filterType = "string"

// filter is one leaf filter a caller adds to a telemetry query beyond the worker-name filter
// every query carries. An operation taking no operand, "exists", carries an empty value, which
// buildQuery then omits from the leaf.
type filter struct {
	key       string
	operation string
	value     string
}

// buildQuery constructs the Workers Logs telemetry query body Cloudflare's
// accounts/{id}/workers/observability/telemetry/query endpoint expects, extending the confirmed
// shape (queryId, timeframe, view, limit, parameters.datasets) with a worker-name filter on
// "$metadata.service" and each of extra's own leaves.
//
// The endpoint's filter schema is a union: an entry is either a group node carrying "kind":
// "group" and a "filterCombination", or a leaf carrying "key", "type", "operation", and "value".
// cairn sends leaves, which a live call on 2026-09-21 confirmed the endpoint accepts as a bare
// array, combined with AND; wrapping them in a group would add a node with nothing to say.
func buildQuery(worker string, since time.Duration, now time.Time, extra []filter, limit int) map[string]any {
	if limit <= 0 {
		limit = defaultLimit
	}
	filters := []map[string]any{
		{"key": "$metadata.service", "type": filterType, "operation": "eq", "value": worker},
	}
	for _, f := range extra {
		leaf := map[string]any{"key": f.key, "type": filterType, "operation": f.operation}
		if f.value != "" {
			leaf["value"] = f.value
		}
		filters = append(filters, leaf)
	}
	return map[string]any{
		"queryId": "cairn-logs",
		"timeframe": map[string]any{
			"from": now.Add(-since).UnixMilli(),
			"to":   now.UnixMilli(),
		},
		"view":  "events",
		"limit": limit,
		"parameters": map[string]any{
			"datasets": []string{"cloudflare-workers"},
			"filters":  filters,
		},
	}
}

// parseEvent decodes one telemetry event into an Entry: the record the Worker logged, under the
// event's "source", with the platform's own event timestamp standing in when that record carries
// none of its own. A Worker's bare console call is recorded the same way an engine record is, and
// only the engine writes the envelope, so without the fallback every non-engine line would sort
// as undated.
func parseEvent(ev providers.ObservabilityEvent) (Entry, error) {
	entry, err := parseEntry(ev.Source)
	if err != nil {
		return Entry{}, err
	}
	if entry.At.IsZero() && ev.Timestamp != 0 {
		entry.At = time.UnixMilli(ev.Timestamp).UTC()
	}
	return entry, nil
}

// parseEntry decodes one logged record's raw JSON into an Entry, pulling the envelope's own
// level, event, and timestamp keys out and leaving every other key in Fields, in the order the
// source object carried them. No value is stringified: each Field.Value is exactly the raw bytes
// the source carried for that key.
func parseEntry(raw json.RawMessage) (Entry, error) {
	dec := json.NewDecoder(bytes.NewReader(raw))
	tok, err := dec.Token()
	if err != nil {
		return Entry{}, fmt.Errorf("logs: read event: %w", err)
	}
	if delim, ok := tok.(json.Delim); !ok || delim != '{' {
		return Entry{}, errors.New("logs: event is not a JSON object")
	}

	var entry Entry
	for dec.More() {
		keyTok, err := dec.Token()
		if err != nil {
			return Entry{}, fmt.Errorf("logs: read event key: %w", err)
		}
		key, _ := keyTok.(string)

		var value json.RawMessage
		if err := dec.Decode(&value); err != nil {
			return Entry{}, fmt.Errorf("logs: read value for %q: %w", key, err)
		}

		switch key {
		case "timestamp":
			var s string
			if err := json.Unmarshal(value, &s); err != nil {
				return Entry{}, fmt.Errorf("logs: parse timestamp: %w", err)
			}
			t, err := time.Parse(time.RFC3339, s)
			if err != nil {
				return Entry{}, fmt.Errorf("logs: parse timestamp %q: %w", s, err)
			}
			entry.At = t
		case "level":
			if err := json.Unmarshal(value, &entry.Level); err != nil {
				return Entry{}, fmt.Errorf("logs: parse level: %w", err)
			}
		case "event":
			if err := json.Unmarshal(value, &entry.Event); err != nil {
				return Entry{}, fmt.Errorf("logs: parse event: %w", err)
			}
		default:
			entry.Fields = append(entry.Fields, Field{Key: key, Value: value})
		}
	}
	return entry, nil
}

// fetch runs one telemetry query against cf, classifying an API-level error before deciding how
// to report it (see ErrObservabilityOff's own doc comment for the split), and decoding the
// returned events, sorting them newest first with entries that carry no timestamp last in
// arrival order.
func fetch(ctx context.Context, cf *providers.Cloudflare, worker string, since time.Duration, now time.Time, extra []filter, limit int) ([]Entry, error) {
	result, err := cf.ObservabilityQuery(ctx, buildQuery(worker, clampSince(since), now, extra, limit))
	if err != nil {
		if apiErr, ok := errors.AsType[*providers.APIError](err); ok {
			if apiErr.Reason == providers.ReasonNotFound {
				return nil, ErrObservabilityOff
			}
			return nil, apiErr
		}
		return nil, fmt.Errorf("logs: query worker %s: %w", worker, err)
	}
	entries := make([]Entry, 0, len(result.Events.Events))
	for _, ev := range result.Events.Events {
		entry, err := parseEvent(ev)
		if err != nil {
			return nil, fmt.Errorf("logs: worker %s: %w", worker, err)
		}
		entries = append(entries, entry)
	}
	// Newest first is the order every caller's doc promises, and the endpoint guarantees no
	// order of its own. A malformed timestamp aborts the whole fetch in parseEntry, so the
	// only zero-time entries here are ones that carried no "timestamp" key at all; those
	// cannot be placed in the sequence, so they sort after every dated entry, keeping their
	// arrival order.
	slices.SortStableFunc(entries, func(a, b Entry) int {
		if a.At.IsZero() != b.At.IsZero() {
			if a.At.IsZero() {
				return 1
			}
			return -1
		}
		return b.At.Compare(a.At)
	})
	return entries, nil
}

// Fetch returns worker's log entries over the q.Since window ending at now (clamped to
// RetentionClamp), newest first, narrowed to q.Event when set. It drops any entry the endpoint
// returned whose own "event" does not equal q.Event, the same posture FetchRecords takes on the
// level: the endpoint's filter is applied to a record cairn does not control the shape of, so a
// caller trusts what each entry actually carries rather than the filter alone. now is a parameter, not a
// system-clock read, so a caller replaying a query gets the same window every time. Every field
// stays json.RawMessage with no rendering choice baked in.
func Fetch(ctx context.Context, cf *providers.Cloudflare, q Query, now time.Time) ([]Entry, error) {
	var extra []filter
	if q.Event != "" {
		extra = append(extra, filter{key: "event", operation: "eq", value: q.Event})
	}
	entries, err := fetch(ctx, cf, q.Worker, q.Since, now, extra, q.Limit)
	if err != nil {
		return nil, err
	}
	if q.Event == "" {
		return entries, nil
	}
	return slices.DeleteFunc(entries, func(e Entry) bool { return e.Event != q.Event }), nil
}

// Records is one FetchRecords read: the engine records that matched, and whether the endpoint's
// page filled to the fetch limit.
type Records struct {
	// Entries are the matching engine records, newest first.
	Entries []Entry
	// Truncated reports whether the page filled to the fetch limit, which means the window holds
	// at least len(Entries) records and possibly many more. A caller counting them says "at
	// least" rather than reporting the number as exact.
	Truncated bool
}

// FetchRecords returns the engine's own log records at level, over the since window ending at now
// (clamped to RetentionClamp), newest first, and reports whether the page was truncated at the
// fetch limit.
//
// An engine record is one a site's cairn engine wrote through src/lib/log, recognized by the
// "event" key of its level/event/timestamp envelope; every other line a Worker logs, a bare
// console call above all, carries no such key. The query asks the endpoint for the two conditions
// directly, an equality filter on "level" and an existence filter on "event", which a live call on
// 2026-09-21 confirmed it applies to the parsed record: the same 24 hour window answered with 1000
// console error lines under the level filter alone and none at all once "event" had to exist. Each
// returned entry is rechecked here anyway, the posture Fetch states about its own narrowing.
//
// The distinction is the whole point of the count. On a public site the Worker's own 404 logging
// dwarfs the engine's records, so a count of every error-level line measures crawler traffic
// rather than anything cairn did.
func FetchRecords(ctx context.Context, cf *providers.Cloudflare, worker, level string, since time.Duration, now time.Time) (Records, error) {
	entries, err := fetch(ctx, cf, worker, since, now, []filter{
		{key: "level", operation: "eq", value: level},
		{key: "event", operation: "exists"},
	}, recordLimit)
	if err != nil {
		return Records{}, err
	}
	truncated := len(entries) >= recordLimit
	entries = slices.DeleteFunc(entries, func(e Entry) bool { return e.Level != level || e.Event == "" })
	return Records{Entries: entries, Truncated: truncated}, nil
}
