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
// optionally narrowed to one event name, capped at Limit entries (0 means DefaultLimit).
type Query struct {
	// Worker names the Workers script the query reads.
	Worker string
	// Since bounds the query to the trailing window ending now, clamped to RetentionClamp.
	Since time.Duration
	// Event narrows the query to one event name, matched against the JSON "event" key every
	// engine log record carries. Empty means every event.
	Event string
	// Limit caps the number of entries Fetch returns, newest first. 0 means DefaultLimit.
	Limit int
}

// Field is one key an engine log record carries beyond its level/event/timestamp envelope, kept
// as raw, unparsed JSON: a 2.0 log viewer or a printed field list decides how to render it, and
// Fetch never stringifies a value it did not itself put there.
type Field struct {
	// Key is the JSON key, in the order the source record carried it.
	Key string
	// Value is the key's value, exactly as the API returned it.
	Value json.RawMessage
}

// Entry is one engine log record, its envelope split out of Fields so a caller reads At, Level,
// and Event without decoding JSON itself, with every other key left in Fields, ordered.
type Entry struct {
	// At is the record's own "timestamp" field.
	At time.Time
	// Level is the record's own "level" field ("info", "warn", or "error").
	Level string
	// Event is the record's own "event" field, one of src/lib/log/events.ts's union.
	Event string
	// Fields carries every key beyond the envelope, in the order the source record carried them.
	Fields []Field
}

// ErrObservabilityOff is the sentinel Fetch and CountErrors return when a Worker's telemetry
// query answers with an API error that carries no more specific classification: not-found, or a
// reason this package's provider client did not recognize at all. A recognized reason
// (unauthorized, forbidden, rate-limited, and the like) is a credential or transport problem, not
// a sign of the dataset itself, and passes through unchanged so a caller reports it the same way
// every sibling check does. The endpoint answers 200 with an empty events list and no error for a
// window past the account's retention (tool/docs/credentials.md, "Workers Logs retention"), so a
// not-found or unclassified API error from this one endpoint is the signal left over to mean the
// dataset itself was never created, the state before a site's wrangler config ever sets
// observability.enabled to true. This mapping has not been confirmed against a live "never
// enabled" Worker.
var ErrObservabilityOff = errors.New("logs: worker has no observability dataset")

// RetentionClamp is the Workers Logs retention window observed on the verification account: every
// window fully inside 7 days returned events, and every window 8 or more days back returned none,
// measured by narrowing the boundary directly. This is the account
// plan's own retention window, not a fixed cairn constant; an operator on a plan with a longer
// retention window reads their own boundary the same way, since the API returns no retention
// value directly.
const RetentionClamp = 7 * 24 * time.Hour

// DefaultLimit is Fetch's own entry cap when Query.Limit is 0.
const DefaultLimit = 200

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

// buildQuery constructs the Workers Logs telemetry query body Cloudflare's
// accounts/{id}/workers/observability/telemetry/query endpoint expects, extending the confirmed
// shape (queryId, timeframe, view, limit, parameters.datasets) with a worker-name filter on
// "$metadata.service" and, when filterValue is set, one more equality filter on filterKey: "event"
// for Fetch, "level" for CountErrors.
func buildQuery(worker string, since time.Duration, now time.Time, filterKey, filterValue string, limit int) map[string]any {
	if limit <= 0 {
		limit = DefaultLimit
	}
	filters := []map[string]any{
		{"key": "$metadata.service", "operation": "eq", "value": worker},
	}
	if filterValue != "" {
		filters = append(filters, map[string]any{"key": filterKey, "operation": "eq", "value": filterValue})
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

// parseEntry decodes one telemetry event's raw JSON into an Entry, pulling the envelope's own
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
// returned events in the order the API carried them.
func fetch(ctx context.Context, cf *providers.Cloudflare, worker string, since time.Duration, now time.Time, filterKey, filterValue string, limit int) ([]Entry, error) {
	result, err := cf.ObservabilityQuery(ctx, buildQuery(worker, clampSince(since), now, filterKey, filterValue, limit))
	if err != nil {
		if apiErr, ok := errors.AsType[*providers.APIError](err); ok {
			if apiErr.Reason == providers.ReasonNotFound || apiErr.Reason == providers.ReasonUnknown {
				return nil, ErrObservabilityOff
			}
			return nil, apiErr
		}
		return nil, fmt.Errorf("logs: query worker %s: %w", worker, err)
	}
	entries := make([]Entry, 0, len(result.Events))
	for _, raw := range result.Events {
		entry, err := parseEntry(raw)
		if err != nil {
			return nil, fmt.Errorf("logs: worker %s: %w", worker, err)
		}
		entries = append(entries, entry)
	}
	return entries, nil
}

// Fetch returns worker's log entries over the q.Since window ending at now (clamped to
// RetentionClamp), in the order the API returned them, narrowed to q.Event when set. now is a
// parameter, not a system-clock read, so a caller replaying a query gets the same window every
// time. 2.0 seam kept on purpose: Fetch leaves every field as json.RawMessage with no rendering
// choice baked in, so 2.0's scrolling view consumes the same function 1.0's printed list does.
func Fetch(ctx context.Context, cf *providers.Cloudflare, q Query, now time.Time) ([]Entry, error) {
	return fetch(ctx, cf, q.Worker, q.Since, now, "event", q.Event, q.Limit)
}

// FetchLevel returns worker's log entries at level, over the since window ending at now (clamped
// to RetentionClamp), dropping any entry the endpoint returned whose own "level" does not equal
// level: the request's own filter grammar is unverified against the live API, so a caller trusts
// what each entry actually carries rather than the filter alone. It is CountErrors's own read
// path, exported so a caller that also needs the matched entries themselves, the health errors
// check's top-event-name tally, reads them without a second, re-filtered query.
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
