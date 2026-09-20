package spine

import (
	"testing"

	"github.com/glw907/cairn-cms/tool/internal/providers"
)

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
