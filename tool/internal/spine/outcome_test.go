package spine

import (
	"testing"

	"github.com/glw907/cairn-cms/tool/internal/providers"
)

// TestStateString covers the three known verdicts plus an out-of-range value, which the default
// branch renders rather than misreporting as "unknown".
func TestStateString(t *testing.T) {
	tests := []struct {
		name string
		s    State
		want string
	}{
		{name: "ok", s: OK, want: "ok"},
		{name: "failing", s: Failing, want: "failing"},
		{name: "unknown", s: Unknown, want: "unknown"},
		{name: "out of range", s: State(99), want: "State(99)"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.s.String(); got != tt.want {
				t.Errorf("State(%d).String() = %q, want %q", tt.s, got, tt.want)
			}
		})
	}
}

func TestOutcomeValidate(t *testing.T) {
	tests := []struct {
		name    string
		outcome Outcome
		wantErr bool
	}{
		{name: "ok with no reason", outcome: Outcome{State: OK}, wantErr: false},
		{name: "failing with no reason", outcome: Outcome{State: Failing}, wantErr: false},
		{name: "unknown with reason", outcome: Outcome{State: Unknown, Reason: ReasonTimeout}, wantErr: false},
		{name: "ok carrying a reason", outcome: Outcome{State: OK, Reason: ReasonTimeout}, wantErr: true},
		{name: "failing carrying a reason", outcome: Outcome{State: Failing, Reason: ReasonTimeout}, wantErr: true},
		{name: "unknown with no reason", outcome: Outcome{State: Unknown}, wantErr: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.outcome.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("Validate() = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestFromKind(t *testing.T) {
	tests := []struct {
		name string
		kind Kind
		code string
		want Outcome
	}{
		{
			name: "wait becomes unknown with a park reason",
			kind: KindWait,
			code: string(ParkDelegationPending),
			want: Outcome{State: Unknown, Reason: ParkReason(ParkDelegationPending)},
		},
		{
			name: "act becomes failing with the code as detail",
			kind: KindAct,
			code: "wrangler-unavailable",
			want: Outcome{State: Failing, Detail: "wrangler-unavailable"},
		},
		{
			name: "ask-someone becomes failing with the code as detail",
			kind: KindAskSomeone,
			code: "sso-blocked",
			want: Outcome{State: Failing, Detail: "sso-blocked"},
		},
		{
			name: "declined becomes ok with the code as detail",
			kind: KindDeclined,
			code: "paid-plan-declined",
			want: Outcome{State: OK, Detail: "paid-plan-declined"},
		},
		{
			name: "an unrecognized kind becomes unknown with reason.not-observable",
			kind: Kind("not-a-real-kind"),
			code: "whatever",
			want: Outcome{State: Unknown, Reason: ReasonNotObservable},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := FromKind(tt.kind, tt.code)
			if got != tt.want {
				t.Errorf("FromKind(%q, %q) = %+v, want %+v", tt.kind, tt.code, got, tt.want)
			}
			if err := got.Validate(); err != nil {
				t.Errorf("FromKind(%q, %q) produced an invalid Outcome: %v", tt.kind, tt.code, err)
			}
		})
	}
}

func TestAPIReason(t *testing.T) {
	if got, want := APIReason(providers.ReasonForbidden), ReasonCode("reason.api.forbidden"); got != want {
		t.Errorf("APIReason(ReasonForbidden) = %q, want %q", got, want)
	}
}

// TestStateSeverity covers every state and every pairing, since a caller combining two
// verdicts always compares Severity's rank, never the raw iota order.
func TestStateSeverity(t *testing.T) {
	tests := []struct {
		name string
		s    State
		want int
	}{
		{name: "ok", s: OK, want: 0},
		{name: "unknown", s: Unknown, want: 1},
		{name: "failing", s: Failing, want: 2},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.s.Severity(); got != tt.want {
				t.Errorf("%v.Severity() = %d, want %d", tt.s, got, tt.want)
			}
		})
	}

	pairs := []struct {
		a, b State
		want State
	}{
		{OK, OK, OK},
		{OK, Unknown, Unknown},
		{OK, Failing, Failing},
		{Unknown, OK, Unknown},
		{Unknown, Unknown, Unknown},
		{Unknown, Failing, Failing},
		{Failing, OK, Failing},
		{Failing, Unknown, Failing},
		{Failing, Failing, Failing},
	}
	for _, p := range pairs {
		worse := p.a
		if p.b.Severity() > p.a.Severity() {
			worse = p.b
		}
		if worse != p.want {
			t.Errorf("worse(%v, %v) = %v, want %v", p.a, p.b, worse, p.want)
		}
	}
}

// TestReasonToOutcome is the exhaustive table over every providers.Reason value. A rate-limited
// reason is asserted separately from the table: it must never answer Failing, since the tool
// being throttled is not the site being broken.
func TestReasonToOutcome(t *testing.T) {
	tests := []struct {
		reason    providers.Reason
		wantState State
	}{
		{providers.ReasonUnauthorized, Failing},
		{providers.ReasonForbidden, Failing},
		{providers.ReasonNotFound, Unknown},
		{providers.ReasonBuildsNotConnected, Unknown},
		{providers.ReasonBuildsRepoNotSelected, Unknown},
		{providers.ReasonBuildsAppNotAuthorized, Unknown},
		{providers.ReasonSenderNotConfigured, Unknown},
		{providers.ReasonRateLimited, Unknown},
		{providers.ReasonUnknown, Unknown},
	}
	for _, tt := range tests {
		t.Run(tt.reason.String(), func(t *testing.T) {
			got := ReasonToOutcome(tt.reason)
			if got.State != tt.wantState {
				t.Errorf("ReasonToOutcome(%v).State = %v, want %v", tt.reason, got.State, tt.wantState)
			}
			if err := got.Validate(); err != nil {
				t.Errorf("ReasonToOutcome(%v) produced an invalid Outcome: %v", tt.reason, err)
			}
		})
	}

	if got := ReasonToOutcome(providers.ReasonRateLimited); got.State == Failing {
		t.Error("ReasonToOutcome(ReasonRateLimited).State = Failing, want never Failing")
	}
}
