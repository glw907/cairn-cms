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
// one level: error record per name in events, standing in for the observability telemetry query.
// A non-zero status ignores events and answers with a v4 error envelope instead, standing in for
// an API-level failure.
type errorsEventsRoundTripper struct {
	events []string
	status int
}

func (rt errorsEventsRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	if rt.status != 0 {
		body := []byte(`{"success":false,"errors":[{"code":7003}]}`)
		return &http.Response{StatusCode: rt.status, Body: io.NopCloser(bytes.NewReader(body)), Header: make(http.Header), Request: req}, nil
	}

	type rawEvent = json.RawMessage
	var events []rawEvent
	for i, name := range rt.events {
		events = append(events, json.RawMessage(fmt.Sprintf(
			`{"level":"error","event":%q,"timestamp":"2026-09-14T09:%02d:00.000Z"}`, name, i,
		)))
	}
	envelope := struct {
		Success bool `json:"success"`
		Errors  []struct {
			Code int `json:"code"`
		} `json:"errors"`
		Result struct {
			Events []rawEvent `json:"events"`
		} `json:"result"`
	}{Success: true}
	envelope.Result.Events = events

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
// slot proves the documented tie break: FetchLevel returns entries newest first, and a tie
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

// TestErrorsCheckObservabilityOff asserts an unclassified API-level failure from the
// observability endpoint reports Unknown with a Detail naming the missing dataset, and Validate
// accepts the Reason it carries.
func TestErrorsCheckObservabilityOff(t *testing.T) {
	opts := Options{ErrorThreshold: 5, LogWindow: time.Hour, Now: fixedNow}
	clients := errorsClients(errorsEventsRoundTripper{status: http.StatusBadRequest})

	outcome := errorsCheck{}.Run(context.Background(), record.Record{}, clients, opts)
	if outcome.State != spine.Unknown {
		t.Errorf("State = %v, want Unknown", outcome.State)
	}
	if err := outcome.Validate(); err != nil {
		t.Errorf("Validate: %v", err)
	}
	if outcome.Reason != spine.ReasonNotObservable {
		t.Errorf("Reason = %v, want ReasonNotObservable", outcome.Reason)
	}
}

// TestErrorsCheckNotFoundIsObservabilityOff asserts a not-found response from the observability
// endpoint also settles as the missing-dataset condition, alongside the unclassified 400 case
// TestErrorsCheckObservabilityOff covers.
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
