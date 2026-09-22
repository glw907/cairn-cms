package health

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"testing"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/providers"
	"github.com/glw907/cairn-cms/tool/internal/record"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// errorsEventsRoundTripper answers every request with a v4 envelope whose result.events carries
// one level: error engine record per name in events, plus consoleLines bare console.error lines
// carrying no envelope at all, standing in for the observability telemetry query. A non-zero
// status ignores both and answers with a v4 error envelope instead, standing in for an API-level
// failure.
type errorsEventsRoundTripper struct {
	events       []string
	consoleLines int
	status       int
}

func (rt errorsEventsRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	if rt.status != 0 {
		body := []byte(`{"success":false,"errors":[{"code":7003}]}`)
		return &http.Response{StatusCode: rt.status, Body: io.NopCloser(bytes.NewReader(body)), Header: make(http.Header), Request: req}, nil
	}

	// The nesting matches the live response: result.events is an object, and each event carries
	// the record the Worker logged under "source"
	// (packages/create-cairn-site/fixtures/cloudflare/observability-telemetry-query.events.200.json).
	type rawEvent struct {
		Source    json.RawMessage `json:"source"`
		Timestamp int64           `json:"timestamp"`
	}
	var events []rawEvent
	for i, name := range rt.events {
		events = append(events, rawEvent{Source: json.RawMessage(fmt.Sprintf(
			`{"level":"error","event":%q,"timestamp":"2026-09-14T09:%02d:00.000Z"}`, name, i%60,
		))})
	}
	// A bare console.error line the way a live Worker writes one: level error, a message, and
	// none of the engine's envelope (fixtures/cloudflare/observability-telemetry-query.mixed-lines.200.json).
	for i := range rt.consoleLines {
		events = append(events, rawEvent{
			Source:    json.RawMessage(fmt.Sprintf(`{"level":"error","message":"[404] GET /wp-login-%d.php"}`, i)),
			Timestamp: 1789931456172,
		})
	}
	envelope := struct {
		Success bool `json:"success"`
		Errors  []struct {
			Code int `json:"code"`
		} `json:"errors"`
		Result struct {
			Events struct {
				Events []rawEvent `json:"events"`
				Count  int        `json:"count"`
			} `json:"events"`
		} `json:"result"`
	}{Success: true}
	envelope.Result.Events.Events = events
	envelope.Result.Events.Count = len(events)

	data, err := json.Marshal(envelope)
	if err != nil {
		return nil, err
	}
	return &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(bytes.NewReader(data)), Header: make(http.Header), Request: req}, nil
}

// errorsClients builds the Clients an errorsCheck test runs against, over rt.
func errorsClients(rt errorsEventsRoundTripper) Clients {
	return Clients{
		CF:     providers.NewCloudflare("acct123", providers.Credential{}, rt),
		HaveCF: true,
	}
}

func TestErrorsCheckDeclaresIDAndTierCF(t *testing.T) {
	c := errorsCheck{}
	if got, want := c.ID(), "errors"; got != want {
		t.Errorf("ID() = %q, want %q", got, want)
	}
	if got := c.Needs(); got != TierCF {
		t.Errorf("Needs() = %v, want TierCF", got)
	}
}

// TestErrorsCheckAdvisoryBand covers the three counts the acceptance table names: zero, the
// threshold exactly, and one above it, each read from Options.ErrorThreshold rather than a
// literal.
func TestErrorsCheckAdvisoryBand(t *testing.T) {
	const threshold = 3
	opts := Options{ErrorThreshold: threshold, LogWindow: time.Hour, Now: fixedNow}

	tests := []struct {
		name      string
		count     int
		wantState spine.State
	}{
		{"zero errors is OK", 0, spine.OK},
		{"the threshold exactly is OK", threshold, spine.OK},
		{"one above the threshold is Failing", threshold + 1, spine.Failing},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			names := make([]string, tt.count)
			for i := range names {
				names[i] = "auth.link.send_failed"
			}
			clients := errorsClients(errorsEventsRoundTripper{events: names})

			outcome := errorsCheck{}.Run(context.Background(), record.Record{}, clients, opts)
			if outcome.State != tt.wantState {
				t.Errorf("State = %v, want %v", outcome.State, tt.wantState)
			}
			if err := outcome.Validate(); err != nil {
				t.Errorf("Validate: %v", err)
			}

			var gotCount int
			for _, f := range outcome.Fields {
				if f.Key == "errorCount" {
					if err := json.Unmarshal(f.Value, &gotCount); err != nil {
						t.Fatalf("unmarshal errorCount field: %v", err)
					}
				}
			}
			if gotCount != tt.count {
				t.Errorf("errorCount field = %d, want %d", gotCount, tt.count)
			}
		})
	}
}

// TestErrorsCheckReportsTopThreeEventNames asserts the Fields carry the up-to-three most frequent
// event names, most frequent first. The last two events tie at one occurrence each, so the third
// slot proves the documented tie break: FetchRecords returns entries newest first, and a tie
// favors the more recent event, which is the later timestamp the fake assigns.
func TestErrorsCheckReportsTopThreeEventNames(t *testing.T) {
	opts := Options{ErrorThreshold: 100, LogWindow: time.Hour, Now: fixedNow}
	events := []string{
		"auth.link.send_failed", "auth.link.send_failed", "auth.link.send_failed",
		"commit.failed", "commit.failed",
		"publish.failed",
		"github.unreachable",
	}
	clients := errorsClients(errorsEventsRoundTripper{events: events})

	outcome := errorsCheck{}.Run(context.Background(), record.Record{}, clients, opts)

	var topEvents []string
	for _, f := range outcome.Fields {
		if f.Key == "topEvents" {
			if err := json.Unmarshal(f.Value, &topEvents); err != nil {
				t.Fatalf("unmarshal topEvents field: %v", err)
			}
		}
	}
	want := []string{"auth.link.send_failed", "commit.failed", "github.unreachable"}
	if len(topEvents) != len(want) {
		t.Fatalf("topEvents = %v, want %v", topEvents, want)
	}
	for i, name := range want {
		if topEvents[i] != name {
			t.Errorf("topEvents[%d] = %q, want %q", i, topEvents[i], name)
		}
	}
}

// errorsFieldValue returns the named field's value from outcome, or the zero value when the
// outcome carries no such field.
func errorsFieldValue[T any](t *testing.T, outcome spine.Outcome, key string) T {
	t.Helper()
	var value T
	for _, f := range outcome.Fields {
		if f.Key == key {
			if err := json.Unmarshal(f.Value, &value); err != nil {
				t.Fatalf("unmarshal %s field: %v", key, err)
			}
		}
	}
	return value
}

// TestErrorsCheckCountsEngineRecordsAndIgnoresConsoleLines pins the 2026-09-21 ruling: the count
// is cairn's own structured records at error level, never every error-level line the Worker
// logged. The response here carries two engine records among six error-level lines, the shape a
// public site produces once crawlers start probing it for WordPress.
func TestErrorsCheckCountsEngineRecordsAndIgnoresConsoleLines(t *testing.T) {
	opts := Options{ErrorThreshold: 5, LogWindow: 24 * time.Hour, Now: fixedNow}
	clients := errorsClients(errorsEventsRoundTripper{
		events:       []string{"commit.failed", "publish.failed"},
		consoleLines: 4,
	})

	outcome := errorsCheck{}.Run(context.Background(), record.Record{}, clients, opts)

	if got := errorsFieldValue[int](t, outcome, "errorCount"); got != 2 {
		t.Errorf("errorCount field = %d, want 2", got)
	}
	if want := "2 errors in 24h"; outcome.Detail != want {
		t.Errorf("Detail = %q, want %q", outcome.Detail, want)
	}
	if outcome.State != spine.OK {
		t.Errorf("State = %v, want OK", outcome.State)
	}
}

// logsFetchLimit mirrors the page limit internal/logs applies to an errors fetch. A page that
// fills it is what makes the count a floor rather than a total, so the truncation test below
// needs the number; were the two to diverge, that test fails rather than quietly proving nothing.
const logsFetchLimit = 1000

// TestErrorsCheckSaysAtLeastOnATruncatedCount asserts a count the fetch truncated at its own page
// limit reads as a floor, in the detail line and in the payload both. The live run that produced
// the ruling read "1000 errors in 24h" for a number that was only the query's limit.
func TestErrorsCheckSaysAtLeastOnATruncatedCount(t *testing.T) {
	opts := Options{ErrorThreshold: 5, LogWindow: 24 * time.Hour, Now: fixedNow}
	events := make([]string, logsFetchLimit)
	for i := range events {
		events[i] = "commit.failed"
	}
	clients := errorsClients(errorsEventsRoundTripper{events: events})

	outcome := errorsCheck{}.Run(context.Background(), record.Record{}, clients, opts)

	if want := "at least 1000 errors in 24h, above the 5 the check allows"; outcome.Detail != want {
		t.Errorf("Detail = %q, want %q", outcome.Detail, want)
	}
	if !errorsFieldValue[bool](t, outcome, "errorCountTruncated") {
		t.Error("a truncated count carries no errorCountTruncated field")
	}
	if err := outcome.Validate(); err != nil {
		t.Errorf("Validate: %v", err)
	}
}

// TestErrorsCheckOmitsTheTruncationFieldOnAnExactCount asserts the optional key is absent when the
// count is a total, so a reader written before it existed sees the payload it always saw.
func TestErrorsCheckOmitsTheTruncationFieldOnAnExactCount(t *testing.T) {
	opts := Options{ErrorThreshold: 5, LogWindow: 24 * time.Hour, Now: fixedNow}
	clients := errorsClients(errorsEventsRoundTripper{events: []string{"commit.failed", "publish.failed"}})

	outcome := errorsCheck{}.Run(context.Background(), record.Record{}, clients, opts)
	for _, f := range outcome.Fields {
		if f.Key == "errorCountTruncated" {
			t.Errorf("an exact count carries errorCountTruncated = %s", f.Value)
		}
	}
	if want := "2 errors in 24h"; outcome.Detail != want {
		t.Errorf("Detail = %q, want %q", outcome.Detail, want)
	}
}

// TestErrorsCheckRejectedRequestIsNotObservabilityOff pins the misreport the 2026-09-21 live run
// found: cairn's own telemetry query body was malformed, the endpoint answered HTTP 400, and the
// check told four operators their Workers had no observability dataset. A 400 is cairn's fault,
// so it keeps its own reason and carries the Detail that says whose bug it is.
func TestErrorsCheckRejectedRequestIsNotObservabilityOff(t *testing.T) {
	opts := Options{ErrorThreshold: 5, LogWindow: time.Hour, Now: fixedNow}
	clients := errorsClients(errorsEventsRoundTripper{status: http.StatusBadRequest})

	outcome := errorsCheck{}.Run(context.Background(), record.Record{}, clients, opts)
	if outcome.State != spine.Unknown {
		t.Errorf("State = %v, want Unknown", outcome.State)
	}
	if err := outcome.Validate(); err != nil {
		t.Errorf("Validate: %v", err)
	}
	if want := spine.APIReason(providers.ReasonRequestRejected); outcome.Reason != want {
		t.Errorf("Reason = %v, want %v", outcome.Reason, want)
	}
	if outcome.Condition == spine.ConditionConfigObservabilityOff {
		t.Error("a rejected request still reports the operator's observability as off")
	}
	if outcome.Detail != detailAPIRequestRejected() {
		t.Errorf("Detail = %q, want the rejected-request detail", outcome.Detail)
	}
}

// TestErrorsCheckNotFoundIsObservabilityOff asserts a not-found response from the observability
// endpoint settles as the missing-dataset condition. It is the only status that does: a live
// check on 2026-09-21 found a Worker with observability unset answers 200 with zero events, so
// nothing else about the response distinguishes the condition.
func TestErrorsCheckNotFoundIsObservabilityOff(t *testing.T) {
	opts := Options{ErrorThreshold: 5, LogWindow: time.Hour, Now: fixedNow}
	clients := errorsClients(errorsEventsRoundTripper{status: http.StatusNotFound})

	outcome := errorsCheck{}.Run(context.Background(), record.Record{}, clients, opts)
	if outcome.State != spine.Unknown {
		t.Errorf("State = %v, want Unknown", outcome.State)
	}
	if outcome.Condition != spine.ConditionConfigObservabilityOff {
		t.Errorf("Condition = %v, want ConditionConfigObservabilityOff", outcome.Condition)
	}
}

// TestErrorsCheckRecognizedReasonsPassThrough asserts an unauthorized, forbidden, or
// rate-limited response from the observability endpoint keeps its own classified reason, routed
// through apiErrorOutcome like every sibling check, rather than being folded into the
// missing-dataset condition.
func TestErrorsCheckRecognizedReasonsPassThrough(t *testing.T) {
	opts := Options{ErrorThreshold: 5, LogWindow: time.Hour, Now: fixedNow}
	tests := []struct {
		name   string
		status int
		want   providers.Reason
	}{
		{"401 stays unauthorized", http.StatusUnauthorized, providers.ReasonUnauthorized},
		{"403 stays forbidden", http.StatusForbidden, providers.ReasonForbidden},
		{"429 stays rate limited", http.StatusTooManyRequests, providers.ReasonRateLimited},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			clients := errorsClients(errorsEventsRoundTripper{status: tt.status})
			outcome := errorsCheck{}.Run(context.Background(), record.Record{}, clients, opts)
			if outcome.State != spine.Unknown {
				t.Errorf("State = %v, want Unknown", outcome.State)
			}
			if outcome.Condition == spine.ConditionConfigObservabilityOff {
				t.Errorf("Condition = %v, want anything but ConditionConfigObservabilityOff", outcome.Condition)
			}
			if want := spine.APIReason(tt.want); outcome.Reason != want {
				t.Errorf("Reason = %v, want %v", outcome.Reason, want)
			}
		})
	}
}
