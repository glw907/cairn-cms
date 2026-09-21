package health

import (
	"context"
	"net/http"
	"testing"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/providers"
	"github.com/glw907/cairn-cms/tool/internal/record"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// conditionCase is one check driven to one representative verdict, with the condition that
// verdict must declare.
type conditionCase struct {
	name          string
	check         Check
	record        record.Record
	clients       Clients
	options       Options
	wantState     spine.State
	wantCondition spine.Condition
}

// conditionCases drives every check in All to at least one representative verdict, and every
// check that can declare a condition to both a verdict that declares it and a verdict that does
// not, so a condition moved back onto a check as a whole cannot pass.
func conditionCases() []conditionCase {
	return []conditionCase{
		{
			name:      "creds with both credentials valid",
			check:     credsCheck{},
			clients:   okCredsClients(),
			options:   validOptions,
			wantState: spine.OK,
		},
		{
			// 127.0.0.1:1 has no listener, so neither scheme reaches the site at all.
			name:      "serving with nothing listening",
			check:     servingCheck{},
			record:    record.Record{Domain: "127.0.0.1:1"},
			clients:   Clients{Probe: providers.NewProbe(http.DefaultTransport, servingResolver{ns: nil})},
			wantState: spine.Unknown,
		},
		{
			name:      "delegation with no assigned nameservers recorded",
			check:     delegationCheck{},
			record:    record.Record{Domain: "example.test"},
			clients:   Clients{HaveCF: true},
			wantState: spine.Unknown,
		},
		{
			name:          "https-forced with always-use-https off",
			check:         httpsForcedCheck{},
			record:        zonedRecord(),
			clients:       Clients{CF: cfClient(settingsRoundTripper{status: http.StatusOK, body: zoneSettingsBody("off", true)}), HaveCF: true},
			wantState:     spine.Failing,
			wantCondition: spine.ConditionEdgeHTTPSNotForced,
		},
		{
			name:      "https-forced with hsts off alone",
			check:     httpsForcedCheck{},
			record:    zonedRecord(),
			clients:   Clients{CF: cfClient(settingsRoundTripper{status: http.StatusOK, body: zoneSettingsBody("on", false)}), HaveCF: true},
			wantState: spine.Failing,
		},
		{
			name:          "email with the sending subdomain never onboarded",
			check:         emailCheck{},
			record:        zonedRecord(),
			clients:       emailClients(fullyCompliantRecords(), settingsRoundTripper{status: http.StatusOK, body: []byte(`{"success":true,"result":[]}`)}),
			wantState:     spine.Failing,
			wantCondition: spine.ConditionEmailSenderNotOnboarded,
		},
		{
			name:      "email with no dmarc record published",
			check:     emailCheck{},
			record:    zonedRecord(),
			clients:   emailClients(nil, settingsRoundTripper{status: http.StatusOK, body: sendingSubdomainsBody(true)}),
			wantState: spine.Failing,
		},
		{
			name:      "deploy with no worker of that name",
			check:     deployCheck{},
			record:    deployRecord(),
			clients:   deployClients(true, deployNoWorkerRoute),
			wantState: spine.Failing,
		},
		{
			name:      "publish-path with no branches or publish commits",
			check:     publishPathCheck{},
			record:    publishRecord(),
			clients:   publishClients(publishGHRoundTripper{}),
			options:   validOptions,
			wantState: spine.Unknown,
		},
		{
			name:      "publish-path with a stale branch and no later bot commit",
			check:     publishPathCheck{},
			record:    publishRecord(),
			clients:   publishClients(publishGHRoundTripper{branches: []publishBranch{{name: "cairn/posts/abc", sha: "sha1", date: fixedNow().Add(-20 * 24 * time.Hour)}}}),
			options:   validOptions,
			wantState: spine.Failing,
		},
		{
			name:      "engine with no package.json to read",
			check:     engineCheck{},
			record:    engineRecord(),
			clients:   engineClients(),
			wantState: spine.Unknown,
		},
		{
			name:          "errors with no observability dataset",
			check:         errorsCheck{},
			clients:       errorsClients(errorsEventsRoundTripper{status: http.StatusBadRequest}),
			options:       Options{ErrorThreshold: 1, LogWindow: time.Hour, Now: fixedNow},
			wantState:     spine.Unknown,
			wantCondition: spine.ConditionConfigObservabilityOff,
		},
		{
			name:      "errors over the threshold",
			check:     errorsCheck{},
			clients:   errorsClients(errorsEventsRoundTripper{events: []string{"commit.failed", "commit.failed"}}),
			options:   Options{ErrorThreshold: 1, LogWindow: time.Hour, Now: fixedNow},
			wantState: spine.Failing,
		},
	}
}

// TestCheckConditionsPerVerdict asserts each check's verdict carries the condition its own remedy
// belongs to, and that every check in All is represented, so a new check cannot ship without a
// row naming the condition it declares.
func TestCheckConditionsPerVerdict(t *testing.T) {
	cases := conditionCases()

	covered := make(map[string]bool, len(cases))
	for _, tt := range cases {
		covered[tt.check.ID()] = true
		t.Run(tt.name, func(t *testing.T) {
			got := tt.check.Run(context.Background(), tt.record, tt.clients, tt.options)
			if got.State != tt.wantState {
				t.Fatalf("State = %v, want %v (outcome %+v)", got.State, tt.wantState, got)
			}
			if got.Condition != tt.wantCondition {
				t.Errorf("Condition = %q, want %q", got.Condition, tt.wantCondition)
			}
			if got.State == spine.Failing && got.Condition == spine.ConditionNone && got.Code == spine.CodeNone {
				t.Error("a Failing outcome carries neither a Condition nor a Code")
			}
			assertDetailIsProseOrEmpty(t, tt.name, got.Detail)
		})
	}

	for _, check := range All {
		if !covered[check.ID()] {
			t.Errorf("check %q has no representative verdict in this table", check.ID())
		}
	}
}
