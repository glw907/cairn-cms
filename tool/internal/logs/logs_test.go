package logs

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"testing"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/providers"
)

// fixtureRoundTripper serves one fixed status and body for every request, standing in for
// Cloudflare's API in a test.
type fixtureRoundTripper struct {
	status int
	body   []byte
}

func (rt fixtureRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	return &http.Response{
		StatusCode: rt.status,
		Body:       io.NopCloser(bytes.NewReader(rt.body)),
		Header:     make(http.Header),
		Request:    req,
	}, nil
}

// errorRoundTripper always fails at the transport level, never reaching an HTTP status, standing
// in for a dial failure or a context deadline.
type errorRoundTripper struct{}

func (errorRoundTripper) RoundTrip(*http.Request) (*http.Response, error) {
	return nil, errors.New("logs test: transport failure")
}

// newFixtureClient loads the synthesized observability corpus fixture and returns a Cloudflare
// client whose transport serves it for every request.
func newFixtureClient(t *testing.T) *providers.Cloudflare {
	t.Helper()
	status, body, err := providers.Corpus("cloudflare", "observability-telemetry-query.ok.json")
	if err != nil {
		t.Fatal(err)
	}
	return providers.NewCloudflare("acct123", providers.Credential{}, fixtureRoundTripper{status: status, body: body})
}

// TestFetchOrdersEntriesAsTheResponseCarriedThem asserts Fetch returns the corpus fixture's three
// events in the order the fixture's "events" array carries them, newest first as the fixture
// itself is ordered, and each entry's own Fields in the source object's key order.
func TestFetchOrdersEntriesAsTheResponseCarriedThem(t *testing.T) {
	cf := newFixtureClient(t)

	entries, err := Fetch(context.Background(), cf, Query{Worker: "example-site", Since: time.Hour}, queryNow)
	if err != nil {
		t.Fatalf("Fetch: %v", err)
	}
	if len(entries) != 3 {
		t.Fatalf("len(entries) = %d, want 3", len(entries))
	}

	wantEvents := []string{"auth.link.send_failed", "commit.failed", "entry.published"}
	for i, want := range wantEvents {
		if entries[i].Event != want {
			t.Errorf("entries[%d].Event = %q, want %q", i, entries[i].Event, want)
		}
	}

	wantFirstEntryKeys := []string{"$workers.scriptName", "$metadata.accountId", "email", "error", "code", "conditionId"}
	got := make([]string, len(entries[0].Fields))
	for i, f := range entries[0].Fields {
		got[i] = f.Key
	}
	if len(got) != len(wantFirstEntryKeys) {
		t.Fatalf("entries[0].Fields keys = %v, want %v", got, wantFirstEntryKeys)
	}
	for i, want := range wantFirstEntryKeys {
		if got[i] != want {
			t.Errorf("entries[0].Fields[%d].Key = %q, want %q", i, got[i], want)
		}
	}
}

// TestFetchNeverStringifiesAField asserts a Field's Value carries the exact raw JSON bytes the
// source event carried, never a re-encoded or stringified form: a bool stays "false", not
// "\"false\"", and a nested value would stay an object rather than becoming a string.
func TestFetchNeverStringifiesAField(t *testing.T) {
	cf := newFixtureClient(t)

	entries, err := Fetch(context.Background(), cf, Query{Worker: "example-site", Since: time.Hour}, queryNow)
	if err != nil {
		t.Fatalf("Fetch: %v", err)
	}

	var batch json.RawMessage
	for _, f := range entries[2].Fields {
		if f.Key == "batch" {
			batch = f.Value
		}
	}
	if string(batch) != "false" {
		t.Errorf("batch field = %q, want the raw JSON literal \"false\"", string(batch))
	}
}

// TestFetchNarrowsToOneEvent asserts Query.Event resolves through the same query-building path
// CountErrors's level filter does, narrowing to the single named event.
func TestFetchNarrowsToOneEvent(t *testing.T) {
	cf := newFixtureClient(t)

	entries, err := Fetch(context.Background(), cf, Query{Worker: "example-site", Since: time.Hour, Event: "commit.failed"}, queryNow)
	if err != nil {
		t.Fatalf("Fetch: %v", err)
	}
	// The fixture's transport ignores the request body, so this proves only that a filtered
	// Query still decodes the full fixture without error; the filter itself is asserted by
	// TestBuildQuerySharesTheGrammarBetweenFetchAndCountErrors below.
	if len(entries) != 3 {
		t.Fatalf("len(entries) = %d, want 3", len(entries))
	}
}

// queryNow is the fixed query clock every test in this file reads, so a timeframe a test asserts
// on does not move between runs.
var queryNow = time.Date(2026, 9, 14, 12, 0, 0, 0, time.UTC)

// TestBuildQuerySharesTheGrammarBetweenFetchAndCountErrors asserts Fetch filters on the JSON
// "event" key and CountErrors's own path filters on "level", the one distinction between them.
func TestBuildQuerySharesTheGrammarBetweenFetchAndCountErrors(t *testing.T) {
	fetchQuery := buildQuery("site", time.Hour, queryNow, "event", "auth.link.send_failed", 0)
	countQuery := buildQuery("site", time.Hour, queryNow, "level", "error", errorCountLimit)

	fetchParams, ok := fetchQuery["parameters"].(map[string]any)
	if !ok {
		t.Fatal("fetchQuery[\"parameters\"] is not a map[string]any")
	}
	fetchFilters, ok := fetchParams["filters"].([]map[string]any)
	if !ok {
		t.Fatal("fetchQuery's parameters.filters is not a []map[string]any")
	}

	countParams, ok := countQuery["parameters"].(map[string]any)
	if !ok {
		t.Fatal("countQuery[\"parameters\"] is not a map[string]any")
	}
	countFilters, ok := countParams["filters"].([]map[string]any)
	if !ok {
		t.Fatal("countQuery's parameters.filters is not a []map[string]any")
	}

	if fetchFilters[1]["key"] != "event" || fetchFilters[1]["value"] != "auth.link.send_failed" {
		t.Errorf("Fetch's second filter = %v, want key event, value auth.link.send_failed", fetchFilters[1])
	}
	if countFilters[1]["key"] != "level" || countFilters[1]["value"] != "error" {
		t.Errorf("CountErrors's second filter = %v, want key level, value error", countFilters[1])
	}
}

// TestCountErrorsCountsLevelErrorRecords asserts CountErrors returns the count of level: error
// records the fixture carries: one of the three fixture events is level: error, the other two are
// warn and info, and the fixture's transport returns every event regardless of the request's own
// level filter, so the true count comes from FetchLevel's own Entry.Level check.
func TestCountErrorsCountsLevelErrorRecords(t *testing.T) {
	cf := newFixtureClient(t)

	count, err := CountErrors(context.Background(), cf, "example-site", 24*time.Hour, queryNow)
	if err != nil {
		t.Fatalf("CountErrors: %v", err)
	}
	if count != 1 {
		t.Errorf("count = %d, want 1", count)
	}
}

// TestFetchMapsAnAPIErrorToErrObservabilityOff asserts an APIError from the observability
// endpoint resolves to ErrObservabilityOff, per that sentinel's own doc comment, while a
// transport-level failure (no HTTP status reached at all) passes through unclassified.
func TestFetchMapsAnAPIErrorToErrObservabilityOff(t *testing.T) {
	cf := providers.NewCloudflare("acct123", providers.Credential{}, fixtureRoundTripper{
		status: http.StatusBadRequest,
		body:   []byte(`{"success":false,"errors":[{"code":7003}],"result":null}`),
	})

	_, err := Fetch(context.Background(), cf, Query{Worker: "example-site", Since: time.Hour}, queryNow)
	if !errors.Is(err, ErrObservabilityOff) {
		t.Errorf("Fetch: err = %v, want ErrObservabilityOff", err)
	}
}

// TestFetchTransportFailurePassesThrough asserts a transport-level failure, never an *APIError,
// is not mistaken for ErrObservabilityOff.
func TestFetchTransportFailurePassesThrough(t *testing.T) {
	cf := providers.NewCloudflare("acct123", providers.Credential{}, errorRoundTripper{})

	_, err := Fetch(context.Background(), cf, Query{Worker: "example-site", Since: time.Hour}, queryNow)
	if err == nil {
		t.Fatal("Fetch: want an error over a transport failure")
	}
	if errors.Is(err, ErrObservabilityOff) {
		t.Error("Fetch: a transport failure must not classify as ErrObservabilityOff")
	}
}

// TestParseSinceGrammar covers every ParseSince case the grammar names: a valid value in each
// unit, and every rejected shape.
func TestParseSinceGrammar(t *testing.T) {
	tests := []struct {
		name    string
		value   string
		want    time.Duration
		wantErr bool
	}{
		{"minutes", "90m", 90 * time.Minute, false},
		{"hours", "24h", 24 * time.Hour, false},
		{"days", "7d", 7 * 24 * time.Hour, false},
		{"bare integer", "90", 0, true},
		{"negative", "-5h", 0, true},
		{"zero", "0h", 0, true},
		{"float", "1.5h", 0, true},
		{"unit outside the three", "90s", 0, true},
		{"empty", "", 0, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ParseSince(tt.value)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("ParseSince(%q): want an error", tt.value)
				}
				return
			}
			if err != nil {
				t.Fatalf("ParseSince(%q): %v", tt.value, err)
			}
			if got != tt.want {
				t.Errorf("ParseSince(%q) = %v, want %v", tt.value, got, tt.want)
			}
		})
	}
}

// TestClampSinceNarrowsToRetentionClamp asserts a window wider than RetentionClamp is narrowed
// to it, and a narrower window passes through unchanged.
func TestClampSinceNarrowsToRetentionClamp(t *testing.T) {
	if got := clampSince(30 * 24 * time.Hour); got != RetentionClamp {
		t.Errorf("clampSince(30d) = %v, want %v", got, RetentionClamp)
	}
	if got := clampSince(time.Hour); got != time.Hour {
		t.Errorf("clampSince(1h) = %v, want 1h unchanged", got)
	}
}
