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

// TestRunAppliesAcknowledgements covers the four shapes Run's acknowledgement handling must tell
// apart: active-and-matching (applied and reported, over a Failing check), expired-and-matching
// (not acknowledged, but the covering CheckResult still names the expiry), active-and-absent
// (still listed in Report.Acknowledged, since a check id with no matching check in this sweep is
// still a fact an operator wants to see), and expired-and-absent (dropped from
// Report.Acknowledged, following the same absent-id path unchanged).
func TestRunAppliesAcknowledgements(t *testing.T) {
	now := time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC)
	nowFn := func() time.Time { return now }
	checks := []Check{
		fixedOutcomeCheck{id: "deploy", outcome: spine.Outcome{State: spine.Failing, Detail: "known issue"}},
		fixedOutcomeCheck{id: "logs", outcome: spine.Outcome{State: spine.OK}},
	}
	acks := Acks{
		{CheckID: "deploy", Expires: now.Add(time.Hour)},
		{CheckID: "logs", Expires: now.Add(-time.Hour)},
		{CheckID: "email", Expires: now.Add(time.Hour)},
		{CheckID: "expired", Expires: now.Add(-time.Hour)},
	}

	report, err := Run(context.Background(), record.Record{}, Clients{}, checks, nowFn, validOptions, acks)
	if err != nil {
		t.Fatalf("Run: %v", err)
	}

	deploy := report.Checks[0]
	if !deploy.Acknowledged {
		t.Error("active-and-matching: Acknowledged = false, want true")
	}
	if !deploy.AckExpires.Equal(now.Add(time.Hour)) {
		t.Errorf("active-and-matching: AckExpires = %v, want %v", deploy.AckExpires, now.Add(time.Hour))
	}

	logs := report.Checks[1]
	if logs.Acknowledged {
		t.Error("expired-and-matching: Acknowledged = true, want false")
	}
	if !logs.AckExpires.Equal(now.Add(-time.Hour)) {
		t.Errorf("expired-and-matching: AckExpires = %v, want %v", logs.AckExpires, now.Add(-time.Hour))
	}
	if !logs.AckExpires.Before(now) {
		t.Errorf("expired-and-matching: AckExpires = %v, want a past instant", logs.AckExpires)
	}

	want := []string{"deploy", "email"}
	if !slices.Equal(report.Acknowledged, want) {
		t.Errorf("Acknowledged = %v, want %v", report.Acknowledged, want)
	}
}
