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

// ErrObservabilityOff is the sentinel Fetch and CountErrors return when a Worker's telemetry
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

// errorCountLimit bounds CountErrors's own query: high enough that a real site's error volume
// over a LogWindow never silently truncates the count, since CountErrors's whole job is the count
// itself rather than a page of entries to browse.
const errorCountLimit = 1000

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

// buildQuery constructs the Workers Logs telemetry query body Cloudflare's
// accounts/{id}/workers/observability/telemetry/query endpoint expects, extending the confirmed
// shape (queryId, timeframe, view, limit, parameters.datasets) with a worker-name filter on
// "$metadata.service" and, when filterValue is set, one more equality filter on filterKey: "event"
// for Fetch, "level" for CountErrors.
//
// The endpoint's filter schema is a union: an entry is either a group node carrying "kind":
// "group" and a "filterCombination", or a leaf carrying "key", "type", "operation", and "value".
// cairn sends leaves, which a live call on 2026-09-21 confirmed the endpoint accepts as a bare
// array, combined with AND; wrapping them in a group would add a node with nothing to say.
func buildQuery(worker string, since time.Duration, now time.Time, filterKey, filterValue string, limit int) map[string]any {
	if limit <= 0 {
		limit = defaultLimit
	}
	filters := []map[string]any{
		{"key": "$metadata.service", "type": filterType, "operation": "eq", "value": worker},
	}
	if filterValue != "" {
		filters = append(filters, map[string]any{"key": filterKey, "type": filterType, "operation": "eq", "value": filterValue})
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
func fetch(ctx context.Context, cf *providers.Cloudflare, worker string, since time.Duration, now time.Time, filterKey, filterValue string, limit int) ([]Entry, error) {
	result, err := cf.ObservabilityQuery(ctx, buildQuery(worker, clampSince(since), now, filterKey, filterValue, limit))
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
// returned whose own "event" does not equal q.Event, the same posture FetchLevel takes on the
// level: the endpoint's filter is applied to a record cairn does not control the shape of, so a
// caller trusts what each entry actually carries rather than the filter alone. now is a parameter, not a
// system-clock read, so a caller replaying a query gets the same window every time. Every field
// stays json.RawMessage with no rendering choice baked in.
func Fetch(ctx context.Context, cf *providers.Cloudflare, q Query, now time.Time) ([]Entry, error) {
	entries, err := fetch(ctx, cf, q.Worker, q.Since, now, "event", q.Event, q.Limit)
	if err != nil {
		return nil, err
	}
	if q.Event == "" {
		return entries, nil
	}
	return slices.DeleteFunc(entries, func(e Entry) bool { return e.Event != q.Event }), nil
}

// FetchLevel returns worker's log entries at level, over the since window ending at now (clamped
// to RetentionClamp), newest first, dropping any entry the endpoint returned whose own "level"
// does not equal level, for the reason Fetch states about its own narrowing. It is CountErrors's
// own read path and returns the matched entries themselves, so a caller that needs both the count
// and the entries reads them without a second, re-filtered query.
func FetchLevel(ctx context.Context, cf *providers.Cloudflare, worker, level string, since time.Duration, now time.Time) ([]Entry, error) {
	entries, err := fetch(ctx, cf, worker, since, now, "level", level, errorCountLimit)
	if err != nil {
		return nil, err
	}
	return slices.DeleteFunc(entries, func(e Entry) bool { return e.Level != level }), nil
}

// CountErrors returns the count of level: error records worker logged over the since window ending
// at now, the health errors check's own signal.
func CountErrors(ctx context.Context, cf *providers.Cloudflare, worker string, since time.Duration, now time.Time) (int, error) {
	entries, err := FetchLevel(ctx, cf, worker, "error", since, now)
	if err != nil {
		return 0, err
	}
	return len(entries), nil
}
