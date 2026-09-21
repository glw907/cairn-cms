package spine

import (
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"reflect"
	"runtime"
	"strconv"
	"strings"
	"testing"

	"github.com/glw907/cairn-cms/tool/internal/providers"
)

// internalPackagePrefix is this module's own internal import root, the prefix every check
// against spine's dependency boundary strips before comparing.
const internalPackagePrefix = "github.com/glw907/cairn-cms/tool/internal/"

// TestSpineImportsOnlyProviders asserts every file in this package imports at most one internal
// package, tool/internal/providers, and never tool/internal/record: the module's downward
// architecture puts spine below record, so a dependency the other way would be a layering
// violation, not merely an unused import. Parsing each file's own import specs (rather than
// grepping for the literal string) means a comment or a string literal mentioning the path can
// never trip this test by accident.
func TestSpineImportsOnlyProviders(t *testing.T) {
	_, thisFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve this file's own path")
	}
	dir := filepath.Dir(thisFile)
	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatalf("read %s: %v", dir, err)
	}

	fset := token.NewFileSet()
	allowed := internalPackagePrefix + "providers"
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".go") {
			continue
		}
		path := filepath.Join(dir, entry.Name())
		f, err := parser.ParseFile(fset, path, nil, parser.ImportsOnly)
		if err != nil {
			t.Fatalf("parse %s: %v", path, err)
		}
		for _, imp := range f.Imports {
			importPath, err := strconv.Unquote(imp.Path.Value)
			if err != nil {
				t.Fatalf("unquote import in %s: %v", path, err)
			}
			if strings.HasPrefix(importPath, internalPackagePrefix) && importPath != allowed {
				t.Errorf("%s imports %s, spine may depend only on %s among this module's internal packages", entry.Name(), importPath, allowed)
			}
		}
	}
}

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
		{name: "failing with a code", outcome: Outcome{State: Failing, Code: CodeHTTPSHSTSOff}, wantErr: false},
		{name: "ok carrying a code", outcome: Outcome{State: OK, Code: CodeHTTPSHSTSOff}, wantErr: true},
		{name: "unknown carrying a code", outcome: Outcome{State: Unknown, Reason: ReasonTimeout, Code: CodeHTTPSHSTSOff}, wantErr: true},
		{name: "failing carrying both a condition and a code", outcome: Outcome{State: Failing, Condition: ConditionEdgeHTTPSNotForced, Code: CodeHTTPSHSTSOff}, wantErr: true},
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
			if !reflect.DeepEqual(got, tt.want) {
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
		wantCode  Code
	}{
		{providers.ReasonUnauthorized, Failing, CodeCredsUnauthorized},
		{providers.ReasonForbidden, Failing, CodeCredsForbidden},
		{providers.ReasonNotFound, Unknown, CodeNone},
		{providers.ReasonBuildsNotConnected, Unknown, CodeNone},
		{providers.ReasonBuildsRepoNotSelected, Unknown, CodeNone},
		{providers.ReasonBuildsAppNotAuthorized, Unknown, CodeNone},
		{providers.ReasonSenderNotConfigured, Unknown, CodeNone},
		{providers.ReasonRateLimited, Unknown, CodeNone},
		{providers.ReasonUnknown, Unknown, CodeNone},
	}
	for _, tt := range tests {
		t.Run(tt.reason.String(), func(t *testing.T) {
			got := ReasonToOutcome(tt.reason)
			if got.State != tt.wantState {
				t.Errorf("ReasonToOutcome(%v).State = %v, want %v", tt.reason, got.State, tt.wantState)
			}
			if got.Code != tt.wantCode {
				t.Errorf("ReasonToOutcome(%v).Code = %v, want %v", tt.reason, got.Code, tt.wantCode)
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
