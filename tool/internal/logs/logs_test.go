package logs

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"slices"
	"strings"
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

// TestFetchKeepsEachEntrysFieldKeyOrder asserts Fetch returns the corpus fixture's three events
// newest first, which is the order the fixture itself carries, and each entry's own Fields in
// the source object's key order.
func TestFetchKeepsEachEntrysFieldKeyOrder(t *testing.T) {
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

// TestFetchNarrowsToOneEvent asserts Fetch proves the event narrowing from what each entry
// carries, not from the request's filter alone. The fixture's transport ignores the request body
// and returns all three events, so only the Go-side recheck can reduce the result to the one
// named event.
func TestFetchNarrowsToOneEvent(t *testing.T) {
	cf := newFixtureClient(t)

	entries, err := Fetch(context.Background(), cf, Query{Worker: "example-site", Since: time.Hour, Event: "commit.failed"}, queryNow)
	if err != nil {
		t.Fatalf("Fetch: %v", err)
	}
	if len(entries) != 1 {
		t.Fatalf("len(entries) = %d, want 1", len(entries))
	}
	if entries[0].Event != "commit.failed" {
		t.Errorf("entries[0].Event = %q, want %q", entries[0].Event, "commit.failed")
	}
}

// TestFetchOrdersEntriesNewestFirst asserts Fetch sorts what the endpoint returned rather than
// trusting its order, and that an entry carrying no timestamp lands after every dated entry in
// the order it arrived. The response body here is built in the test, out of order, since the
// shared corpus fixture is already newest first and so proves nothing about the sort. Each
// event's own platform timestamp is zero, so only the record's own timestamp orders the result;
// TestFetchDatesARecordFromTheEventWhenItCarriesNone covers the fallback.
func TestFetchOrdersEntriesNewestFirst(t *testing.T) {
	body := []byte(`{"success":true,"errors":[],"messages":[],"result":{"events":{"count":5,"events":[
		{"timestamp":0,"source":{"timestamp":"2026-09-14T09:12:44.000Z","level":"info","event":"middle"}},
		{"timestamp":0,"source":{"level":"info","event":"undated-first"}},
		{"timestamp":0,"source":{"timestamp":"2026-09-14T09:32:11.000Z","level":"info","event":"newest"}},
		{"timestamp":0,"source":{"level":"info","event":"undated-second"}},
		{"timestamp":0,"source":{"timestamp":"2026-09-14T08:55:02.000Z","level":"info","event":"oldest"}}
	]}}}`)
	cf := providers.NewCloudflare("acct123", providers.Credential{}, fixtureRoundTripper{status: http.StatusOK, body: body})

	entries, err := Fetch(context.Background(), cf, Query{Worker: "example-site", Since: time.Hour}, queryNow)
	if err != nil {
		t.Fatalf("Fetch: %v", err)
	}

	want := []string{"newest", "middle", "oldest", "undated-first", "undated-second"}
	got := make([]string, len(entries))
	for i, e := range entries {
		got[i] = e.Event
	}
	if !slices.Equal(got, want) {
		t.Errorf("entry order = %v, want %v", got, want)
	}
}

// queryNow is the fixed query clock every test in this file reads, so a timeframe a test asserts
// on does not move between runs.
var queryNow = time.Date(2026, 9, 14, 12, 0, 0, 0, time.UTC)

// queryFilters returns the parameters.filters array of a query buildQuery built.
func queryFilters(t *testing.T, query map[string]any) []map[string]any {
	t.Helper()
	params, ok := query["parameters"].(map[string]any)
	if !ok {
		t.Fatal("query[\"parameters\"] is not a map[string]any")
	}
	filters, ok := params["filters"].([]map[string]any)
	if !ok {
		t.Fatal("the query's parameters.filters is not a []map[string]any")
	}
	return filters
}

// TestBuildQueryCarriesEachCallersOwnFilters asserts Fetch narrows on the JSON "event" key by
// value, while FetchRecords asks for a level and for the "event" key to exist at all, which is
// what excludes a Worker's own console lines from the errors check's count.
func TestBuildQueryCarriesEachCallersOwnFilters(t *testing.T) {
	fetchFilters := queryFilters(t, buildQuery("site", time.Hour, queryNow, []filter{
		{key: "event", operation: "eq", value: "auth.link.send_failed"},
	}, 0))
	recordFilters := queryFilters(t, buildQuery("site", time.Hour, queryNow, []filter{
		{key: "level", operation: "eq", value: "error"},
		{key: "event", operation: "exists"},
	}, recordLimit))

	if fetchFilters[1]["key"] != "event" || fetchFilters[1]["value"] != "auth.link.send_failed" {
		t.Errorf("Fetch's second filter = %v, want key event, value auth.link.send_failed", fetchFilters[1])
	}
	if recordFilters[1]["key"] != "level" || recordFilters[1]["value"] != "error" {
		t.Errorf("FetchRecords's second filter = %v, want key level, value error", recordFilters[1])
	}
	if recordFilters[2]["key"] != "event" || recordFilters[2]["operation"] != "exists" {
		t.Errorf("FetchRecords's third filter = %v, want key event, operation exists", recordFilters[2])
	}
	// An operation taking no operand carries no value at all; the endpoint reads a filter by its
	// operation, and a value beside "exists" would be a key it never asked for.
	if _, ok := recordFilters[2]["value"]; ok {
		t.Errorf("the exists filter %v carries a value", recordFilters[2])
	}
	// The endpoint refuses a leaf filter that declares no type, which is what it did to every
	// query cairn sent before 2026-09-21.
	for _, filters := range [][]map[string]any{fetchFilters, recordFilters} {
		for i, f := range filters {
			if f["type"] != filterType {
				t.Errorf("filter %d = %v, want a %q type", i, f, filterType)
			}
		}
	}
}

// TestFetchRecordsCountsEngineRecordsAndIgnoresConsoleLines reads the live response recorded from
// a 60 second window on a production Worker, which carries one cairn engine record (level warn,
// with an "event" key) and one bare console.error line for a 404 (level error, with none). The
// fixture's transport ignores the request body and returns every event, so only the Go-side
// recheck can separate them: asking for the engine's warn record returns exactly it, and asking
// for error level returns nothing, because the one error-level line in the window is not cairn's.
func TestFetchRecordsCountsEngineRecordsAndIgnoresConsoleLines(t *testing.T) {
	status, body, err := providers.Corpus("cloudflare", "observability-telemetry-query.mixed-lines.200.json")
	if err != nil {
		t.Fatal(err)
	}
	cf := providers.NewCloudflare("acct123", providers.Credential{}, fixtureRoundTripper{status: status, body: body})

	warns, err := FetchRecords(context.Background(), cf, "example-site", "warn", 24*time.Hour, queryNow)
	if err != nil {
		t.Fatalf("FetchRecords(warn): %v", err)
	}
	if len(warns.Entries) != 1 {
		t.Fatalf("len(warns.Entries) = %d, want 1", len(warns.Entries))
	}
	if warns.Entries[0].Event != "guard.rejected" {
		t.Errorf("warns.Entries[0].Event = %q, want %q", warns.Entries[0].Event, "guard.rejected")
	}

	errs, err := FetchRecords(context.Background(), cf, "example-site", "error", 24*time.Hour, queryNow)
	if err != nil {
		t.Fatalf("FetchRecords(error): %v", err)
	}
	if len(errs.Entries) != 0 {
		t.Errorf("FetchRecords(error) returned %d entries; the window's only error-level line is a console 404", len(errs.Entries))
	}
	if warns.Truncated || errs.Truncated {
		t.Error("a five-event page reported itself truncated")
	}
}

// TestFetchRecordsReportsATruncatedPage asserts a page that fills the fetch limit reports itself
// truncated, so a caller says "at least" rather than passing a floor off as a total. This is the
// 2026-09-21 live finding: a 24 hour query returned 1000 entries against a 1000 limit, and the
// endpoint's own result.events.count read 1000 too, so nothing in the response says how many more
// there were.
func TestFetchRecordsReportsATruncatedPage(t *testing.T) {
	events := make([]string, 0, recordLimit)
	for i := range recordLimit {
		events = append(events, fmt.Sprintf(
			`{"timestamp":0,"source":{"level":"error","event":"commit.failed","timestamp":"2026-09-14T09:00:%02d.000Z"}}`,
			i%60))
	}
	body := fmt.Appendf(nil, `{"success":true,"result":{"events":{"count":%d,"events":[%s]}}}`,
		recordLimit, strings.Join(events, ","))
	cf := providers.NewCloudflare("acct123", providers.Credential{}, fixtureRoundTripper{status: http.StatusOK, body: body})

	records, err := FetchRecords(context.Background(), cf, "example-site", "error", 24*time.Hour, queryNow)
	if err != nil {
		t.Fatalf("FetchRecords: %v", err)
	}
	if len(records.Entries) != recordLimit {
		t.Fatalf("len(records.Entries) = %d, want %d", len(records.Entries), recordLimit)
	}
	if !records.Truncated {
		t.Error("a page that filled the fetch limit did not report itself truncated")
	}
}

// TestFetchMapsANotFoundToErrObservabilityOff asserts a 404 from the observability endpoint
// resolves to ErrObservabilityOff, the one status that still does.
func TestFetchMapsANotFoundToErrObservabilityOff(t *testing.T) {
	cf := providers.NewCloudflare("acct123", providers.Credential{}, fixtureRoundTripper{
		status: http.StatusNotFound,
		body:   []byte(`{"success":false,"errors":[{"code":7003}],"result":null}`),
	})

	_, err := Fetch(context.Background(), cf, Query{Worker: "example-site", Since: time.Hour}, queryNow)
	if !errors.Is(err, ErrObservabilityOff) {
		t.Errorf("Fetch: err = %v, want ErrObservabilityOff", err)
	}
}

// TestFetchDoesNotReadARejectedRequestAsObservabilityOff pins the misreport the 2026-09-21 live
// run found. cairn sent a filter carrying no "type", the endpoint answered HTTP 400 with a
// ZodError and no v4 errors array at all, and the old mapping folded that into the sentinel, so
// four production sites read as having observability turned off.
func TestFetchDoesNotReadARejectedRequestAsObservabilityOff(t *testing.T) {
	status, body, err := providers.Corpus("cloudflare", "observability-telemetry-query.filter-rejected.400.json")
	if err != nil {
		t.Fatal(err)
	}
	cf := providers.NewCloudflare("acct123", providers.Credential{}, fixtureRoundTripper{status: status, body: body})

	_, err = Fetch(context.Background(), cf, Query{Worker: "example-site", Since: time.Hour}, queryNow)
	if errors.Is(err, ErrObservabilityOff) {
		t.Fatal("Fetch: a rejected request still reads as a Worker with no observability dataset")
	}
	apiErr, ok := errors.AsType[*providers.APIError](err)
	if !ok {
		t.Fatalf("Fetch: err = %v, want an *APIError", err)
	}
	if apiErr.Reason != providers.ReasonRequestRejected {
		t.Errorf("Reason = %v, want request-rejected", apiErr.Reason)
	}
}

// TestFetchDecodesTheRecordedLiveResponse decodes the response a live telemetry query returned
// on 2026-09-21, the fixture that is live all the way down. It is the test the old synthesized
// fixture could not be: result.events is an object rather than an array, each event carries the
// Worker's record under "source", and the decode read neither until this round.
func TestFetchDecodesTheRecordedLiveResponse(t *testing.T) {
	status, body, err := providers.Corpus("cloudflare", "observability-telemetry-query.events.200.json")
	if err != nil {
		t.Fatal(err)
	}
	cf := providers.NewCloudflare("acct123", providers.Credential{}, fixtureRoundTripper{status: status, body: body})

	entries, err := Fetch(context.Background(), cf, Query{Worker: "example-site", Since: 24 * time.Hour}, queryNow)
	if err != nil {
		t.Fatalf("Fetch: %v", err)
	}
	if len(entries) == 0 {
		t.Fatal("the live response decoded to no entries at all")
	}
	for i, e := range entries {
		if e.Event == "" {
			t.Errorf("entries[%d] carries no event name; the record under \"source\" was not read", i)
		}
		if e.At.IsZero() {
			t.Errorf("entries[%d] carries no timestamp", i)
		}
	}
}

// TestFetchDatesARecordFromTheEventWhenItCarriesNone covers the half of a live response that is
// not an engine record: a Worker's bare console call is recorded with no timestamp of its own,
// and without the platform's event timestamp every such line would sort as undated.
func TestFetchDatesARecordFromTheEventWhenItCarriesNone(t *testing.T) {
	body := []byte(`{"success":true,"result":{"events":{"count":1,"events":[
		{"timestamp":1789931462614,"source":{"level":"info","message":"GET /"}}
	]}}}`)
	cf := providers.NewCloudflare("acct123", providers.Credential{}, fixtureRoundTripper{status: http.StatusOK, body: body})

	entries, err := Fetch(context.Background(), cf, Query{Worker: "example-site", Since: time.Hour}, queryNow)
	if err != nil {
		t.Fatalf("Fetch: %v", err)
	}
	if len(entries) != 1 {
		t.Fatalf("len(entries) = %d, want 1", len(entries))
	}
	if want := time.UnixMilli(1789931462614).UTC(); !entries[0].At.Equal(want) {
		t.Errorf("entries[0].At = %v, want the event's own %v", entries[0].At, want)
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
