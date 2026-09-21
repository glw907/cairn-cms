package health

import (
	"context"
	"slices"
	"testing"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/record"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

func TestAcksMatch(t *testing.T) {
	now := time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC)
	acks := Acks{
		{CheckID: "deploy", Expires: now.Add(24 * time.Hour)},
		{CheckID: "email", Expires: now.Add(-time.Hour)},
	}

	tests := []struct {
		name   string
		id     string
		wantOK bool
	}{
		{"an unexpired ack matches", "deploy", true},
		{"an expired ack does not match", "email", false},
		{"a check id with no ack does not match", "engine", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if _, ok := acks.Match(tt.id, now); ok != tt.wantOK {
				t.Errorf("Match(%q) ok = %v, want %v", tt.id, ok, tt.wantOK)
			}
		})
	}
}

// TestRunAppliesAcknowledgements covers the three shapes Run's acknowledgement handling must
// tell apart: an unexpired ack over a Failing check (applied and reported), an expired one (no
// effect, dropped from Report.Acknowledged), and an ack for a check id absent from this sweep
// (still reported, since a stale acknowledgement pointing at nothing is a fact an operator wants
// to see, not silently dropped).
func TestRunAppliesAcknowledgements(t *testing.T) {
	now := time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC)
	nowFn := func() time.Time { return now }
	checks := []Check{
		fixedOutcomeCheck{id: "deploy", outcome: spine.Outcome{State: spine.Failing, Detail: "known issue"}},
	}
	acks := Acks{
		{CheckID: "deploy", Expires: now.Add(time.Hour)},
		{CheckID: "email", Expires: now.Add(time.Hour)},
		{CheckID: "expired", Expires: now.Add(-time.Hour)},
	}

	report, err := Run(context.Background(), record.Record{}, Clients{}, checks, nowFn, validOptions, acks)
	if err != nil {
		t.Fatalf("Run: %v", err)
	}

	cr := report.Checks[0]
	if !cr.Acknowledged {
		t.Error("Acknowledged = false, want true for an unexpired ack over a Failing check")
	}
	if !cr.AckExpires.Equal(now.Add(time.Hour)) {
		t.Errorf("AckExpires = %v, want %v", cr.AckExpires, now.Add(time.Hour))
	}

	want := []string{"deploy", "email"}
	if !slices.Equal(report.Acknowledged, want) {
		t.Errorf("Acknowledged = %v, want %v", report.Acknowledged, want)
	}
}
