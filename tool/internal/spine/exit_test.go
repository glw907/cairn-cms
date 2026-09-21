package spine

import (
	"errors"
	"fmt"
	"testing"

	"github.com/glw907/cairn-cms/tool/internal/providers"
)

// TestVerdictCodesAndWords asserts the four verdicts carry the monitoring-plugin exit codes and
// the monitoring words, so the constant a caller exits with and the word it prints cannot drift
// apart.
func TestVerdictCodesAndWords(t *testing.T) {
	tests := []struct {
		verdict Verdict
		code    int
		word    string
	}{
		{VerdictOK, 0, "OK"},
		{VerdictWarning, 1, "WARNING"},
		{VerdictCritical, 2, "CRITICAL"},
		{VerdictUnknown, 3, "UNKNOWN"},
	}
	for _, tt := range tests {
		t.Run(tt.word, func(t *testing.T) {
			if int(tt.verdict) != tt.code {
				t.Errorf("code = %d, want %d", int(tt.verdict), tt.code)
			}
			if got := tt.verdict.String(); got != tt.word {
				t.Errorf("String() = %q, want %q", got, tt.word)
			}
		})
	}
	if got := Verdict(9).String(); got != "Verdict(9)" {
		t.Errorf("String() for an unknown value = %q, want %q", got, "Verdict(9)")
	}
}

// TestVerdictPrecedence covers one row per pairing of the four verdicts, asserting CRITICAL
// beats UNKNOWN, UNKNOWN beats WARNING, and WARNING beats OK. It is written as a pairing table
// rather than a rank comparison so a reordered Severity switch fails on the pair it broke.
func TestVerdictPrecedence(t *testing.T) {
	tests := []struct {
		name string
		a, b Verdict
		want Verdict
	}{
		{"critical beats unknown", VerdictCritical, VerdictUnknown, VerdictCritical},
		{"critical beats warning", VerdictCritical, VerdictWarning, VerdictCritical},
		{"critical beats ok", VerdictCritical, VerdictOK, VerdictCritical},
		{"unknown beats warning", VerdictUnknown, VerdictWarning, VerdictUnknown},
		{"unknown beats ok", VerdictUnknown, VerdictOK, VerdictUnknown},
		{"warning beats ok", VerdictWarning, VerdictOK, VerdictWarning},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := worseVerdict(tt.a, tt.b); got != tt.want {
				t.Errorf("worseVerdict(%v, %v) = %v, want %v", tt.a, tt.b, got, tt.want)
			}
			if got := worseVerdict(tt.b, tt.a); got != tt.want {
				t.Errorf("worseVerdict(%v, %v) = %v, want %v", tt.b, tt.a, got, tt.want)
			}
		})
	}
}

// TestVerdictSeverityAgreesWithStateSeverity asserts the Verdict ordering and the State ordering
// rank the three states they share the same way, so the module holds one severity order rather
// than two that can drift.
func TestVerdictSeverityAgreesWithStateSeverity(t *testing.T) {
	states := []State{OK, Unknown, Failing}
	for i, a := range states {
		for _, b := range states[i+1:] {
			stateWins := b.Severity() > a.Severity()
			verdictWins := ExitCodeFor(b).Severity() > ExitCodeFor(a).Severity()
			if stateWins != verdictWins {
				t.Errorf("State %v vs %v: State.Severity ranks b higher = %v, Verdict.Severity ranks b higher = %v",
					a, b, stateWins, verdictWins)
			}
		}
	}
}

// TestExitCodeForState asserts the State-to-Verdict mapping a probe-style command exits with,
// including that a State value this package does not know reports UNKNOWN rather than OK.
func TestExitCodeForState(t *testing.T) {
	tests := []struct {
		state State
		want  Verdict
	}{
		{OK, VerdictOK},
		{Failing, VerdictCritical},
		{Unknown, VerdictUnknown},
		{State(42), VerdictUnknown},
	}
	for _, tt := range tests {
		t.Run(tt.state.String(), func(t *testing.T) {
			if got := ExitCodeFor(tt.state); got != tt.want {
				t.Errorf("ExitCodeFor(%v) = %v, want %v", tt.state, got, tt.want)
			}
		})
	}
}

// TestCombineState asserts the moved fold keeps State.Severity's order and is order-independent.
func TestCombineState(t *testing.T) {
	tests := []struct {
		name string
		a, b State
		want State
	}{
		{"failing beats unknown", Failing, Unknown, Failing},
		{"failing beats ok", Failing, OK, Failing},
		{"unknown beats ok", Unknown, OK, Unknown},
		{"ok with ok", OK, OK, OK},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := CombineState(tt.a, tt.b); got != tt.want {
				t.Errorf("CombineState(%v, %v) = %v, want %v", tt.a, tt.b, got, tt.want)
			}
			if got := CombineState(tt.b, tt.a); got != tt.want {
				t.Errorf("CombineState(%v, %v) = %v, want %v", tt.b, tt.a, got, tt.want)
			}
		})
	}
}

// TestCheckVerdict pins the per-check mapping row by row: an unheld failing check is CRITICAL
// unless its own declared severity ranks it WARNING, an unexpired hold softens a failure to
// WARNING, an expired hold (which reaches this type as Acknowledged false) stays CRITICAL, and
// neither a hold nor a WARNING severity softens a check that could not run. The credential-missing
// row is the one Unknown that reports WARNING.
func TestCheckVerdict(t *testing.T) {
	tests := []struct {
		name  string
		check CheckVerdict
		want  Verdict
	}{
		{"passing check", CheckVerdict{ID: "creds", State: OK}, VerdictOK},
		{"failing check", CheckVerdict{ID: "deploy", State: Failing}, VerdictCritical},
		{"held failing check", CheckVerdict{ID: "deploy", State: Failing, Acknowledged: true}, VerdictWarning},
		{"failing check whose hold expired", CheckVerdict{ID: "deploy", State: Failing}, VerdictCritical},
		{
			"failing check its own severity ranks WARNING",
			CheckVerdict{ID: "engine", State: Failing, Severity: WarningFailure},
			VerdictWarning,
		},
		{
			"failing check its own severity ranks CRITICAL",
			CheckVerdict{ID: "creds", State: Failing, Severity: CriticalFailure},
			VerdictCritical,
		},
		{"unrun check", CheckVerdict{ID: "email", State: Unknown, Reason: ReasonTimeout}, VerdictUnknown},
		{"held unrun check", CheckVerdict{ID: "email", State: Unknown, Reason: ReasonTimeout, Acknowledged: true}, VerdictUnknown},
		{"unrun check missing a credential", CheckVerdict{ID: "creds", State: Unknown, Reason: ReasonCredMissing}, VerdictWarning},
		{
			"a WARNING severity does not soften an unrun check",
			CheckVerdict{ID: "engine", State: Unknown, Reason: ReasonTimeout, Severity: WarningFailure},
			VerdictUnknown,
		},
		{"passing check carrying a hold", CheckVerdict{ID: "creds", State: OK, Acknowledged: true}, VerdictOK},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.check.Verdict(); got != tt.want {
				t.Errorf("Verdict() = %v, want %v", got, tt.want)
			}
		})
	}
}

// TestTheTwoKindsOfUnknownAreDisambiguated covers the four combinations a site can carry: a
// credential the operator never configured is a disclosed gap and reports WARNING, every other
// Unknown reports UNKNOWN, and one of each together reports UNKNOWN rather than being softened
// by the disclosed one. The rate-limit row is listed separately because the copy catalogue's own
// rate-limited row asserts WARNING and this arithmetic overrules it: a throttled run did not
// observe the site.
//
// Each row also asserts the word every check in it carries, so the word an operator reads and
// the code a routine reads cannot drift apart: the same reason that keeps a cred-missing check
// out of UNKNOWN is the one that writes "skip" rather than "unknown" beside it.
func TestTheTwoKindsOfUnknownAreDisambiguated(t *testing.T) {
	credMissing := CheckVerdict{ID: "email", State: Unknown, Reason: ReasonCredMissing}
	transport := CheckVerdict{ID: "serving", State: Unknown, Reason: ReasonOffline}
	rateLimited := CheckVerdict{ID: "deploy", State: Unknown, Reason: APIReason(providers.ReasonRateLimited)}

	words := map[string]string{
		"creds":   "pass",
		"email":   "skip",
		"serving": "unknown",
		"deploy":  "unknown",
	}

	tests := []struct {
		name string
		site SiteVerdicts
		want Verdict
	}{
		{"a cred-missing skip alone", SiteVerdicts{pass(), credMissing}, VerdictWarning},
		{"a transport unknown alone", SiteVerdicts{pass(), transport}, VerdictUnknown},
		{"both together", SiteVerdicts{credMissing, transport}, VerdictUnknown},
		{"a rate-limit unknown alone", SiteVerdicts{pass(), rateLimited}, VerdictUnknown},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			for _, c := range tt.site {
				if got := StateWord(c.State, c.Reason, c.Acknowledged); got != words[c.ID] {
					t.Errorf("the %s check's word = %q, want %q", c.ID, got, words[c.ID])
				}
			}
			if got := ExitCode([]SiteVerdicts{tt.site}, nil, 0); got != tt.want {
				t.Errorf("ExitCode = %v (%d), want %v (%d)", got, int(got), tt.want, int(tt.want))
			}
		})
	}
}

// TestSiteWithNoChecksIsUnknown asserts a site whose check slice is empty reports UNKNOWN and
// the UNKNOWN word, never OK. Folding an empty slice to OK is the false green the reference
// program printed.
func TestSiteWithNoChecksIsUnknown(t *testing.T) {
	got := ExitCode([]SiteVerdicts{nil}, nil, 0)
	if got != VerdictUnknown {
		t.Errorf("ExitCode for one site with no checks = %v, want %v", got, VerdictUnknown)
	}
	if got.String() != "UNKNOWN" {
		t.Errorf("String() = %q, want %q", got.String(), "UNKNOWN")
	}
	if int(got) != 3 {
		t.Errorf("exit code = %d, want 3", int(got))
	}
}

// TestStateWord asserts the five wire words and the two inputs that change them: an unexpired
// hold, and the reason an unrun check carries, which is what divides a check nobody attempted
// from one that was attempted and observed nothing.
func TestStateWord(t *testing.T) {
	tests := []struct {
		name   string
		state  State
		reason ReasonCode
		ack    bool
		want   string
	}{
		{"passing", OK, "", false, "pass"},
		{"passing under a hold", OK, "", true, "pass"},
		{"failing", Failing, "", false, "fail"},
		{"failing under a hold", Failing, "", true, "held"},
		{"unrun for a credential the operator never set", Unknown, ReasonCredMissing, false, "skip"},
		{"unrun for a credential, under a hold", Unknown, ReasonCredMissing, true, "skip"},
		{"unrun on a timeout", Unknown, ReasonTimeout, false, "unknown"},
		{"unrun on an unreachable network", Unknown, ReasonOffline, false, "unknown"},
		{"unrun on a rate limit", Unknown, APIReason(providers.ReasonRateLimited), false, "unknown"},
		{"unrun because the sweep never reached it", Unknown, ReasonNotRun, false, "unknown"},
		{"unrun on a timeout, under a hold", Unknown, ReasonTimeout, true, "unknown"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := StateWord(tt.state, tt.reason, tt.ack); got != tt.want {
				t.Errorf("StateWord(%v, %q, %v) = %q, want %q", tt.state, tt.reason, tt.ack, got, tt.want)
			}
		})
	}
}

// pass, fail, held and unrun build the four check shapes the ExitCode table below combines. Each
// bakes in one check id, since the arithmetic reads State and Acknowledged and never the id.
func pass() CheckVerdict { return CheckVerdict{ID: "creds", State: OK} }
func fail() CheckVerdict { return CheckVerdict{ID: "deploy", State: Failing} }
func held() CheckVerdict { return CheckVerdict{ID: "deploy", State: Failing, Acknowledged: true} }
func unrun() CheckVerdict {
	return CheckVerdict{ID: "email", State: Unknown, Reason: ReasonOffline}
}

// TestExitCode covers the whole-run arithmetic: one site's mixed checks, the same precedence
// applied across a sweep of three sites, the listing errors, and the expected site count.
func TestExitCode(t *testing.T) {
	tests := []struct {
		name        string
		sites       []SiteVerdicts
		listErrs    []error
		expectSites int
		want        Verdict
	}{
		{"no sites and nothing wrong", nil, nil, 0, VerdictOK},
		{"one site all passing", []SiteVerdicts{{pass(), pass()}}, nil, 0, VerdictOK},
		{"one site with a held failure", []SiteVerdicts{{pass(), held()}}, nil, 0, VerdictWarning},
		{"one site with an unrun check", []SiteVerdicts{{pass(), unrun()}}, nil, 0, VerdictUnknown},
		{"one site with a failure", []SiteVerdicts{{pass(), fail()}}, nil, 0, VerdictCritical},
		{
			"a failure is not masked by an unknown in the same site",
			[]SiteVerdicts{{fail(), unrun()}},
			nil, 0, VerdictCritical,
		},
		{
			"an unknown outranks a held failure in the same site",
			[]SiteVerdicts{{held(), unrun()}},
			nil, 0, VerdictUnknown,
		},
		{
			"three sites: one passing, one unrun, one failing",
			[]SiteVerdicts{{pass()}, {unrun()}, {fail()}},
			nil, 0, VerdictCritical,
		},
		{
			"three sites: one passing, one held, one unrun",
			[]SiteVerdicts{{pass()}, {held()}, {unrun()}},
			nil, 0, VerdictUnknown,
		},
		{
			"three sites: one passing, one held, two passing",
			[]SiteVerdicts{{pass()}, {held()}, {pass()}},
			nil, 0, VerdictWarning,
		},
		{
			"a site with no checks among passing sites",
			[]SiteVerdicts{{pass()}, nil, {pass()}},
			nil, 0, VerdictUnknown,
		},
		{
			"a listing error over passing sites",
			[]SiteVerdicts{{pass()}},
			[]error{errors.New("store: parse record")}, 0, VerdictUnknown,
		},
		{
			"a listing error does not mask a failure",
			[]SiteVerdicts{{fail()}},
			[]error{errors.New("store: parse record")}, 0, VerdictCritical,
		},
		{
			"the expected site count sentinel",
			nil,
			[]error{fmt.Errorf("sites: %w", ErrExpectSites)}, 0, VerdictUnknown,
		},
		{
			"the expected site count matches",
			[]SiteVerdicts{{pass()}, {pass()}},
			nil, 2, VerdictOK,
		},
		{
			"the expected site count does not match",
			[]SiteVerdicts{{pass()}},
			nil, 2, VerdictUnknown,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := ExitCode(tt.sites, tt.listErrs, tt.expectSites); got != tt.want {
				t.Errorf("ExitCode = %v (%d), want %v (%d)", got, int(got), tt.want, int(tt.want))
			}
		})
	}
}

// TestErrExpectSitesIsMatchable asserts the sentinel survives wrapping, which is what lets a
// caller return it from deeper in a listing and ExitCode still be the only place it is mapped.
func TestErrExpectSitesIsMatchable(t *testing.T) {
	wrapped := fmt.Errorf("sites: %w", ErrExpectSites)
	if !errors.Is(wrapped, ErrExpectSites) {
		t.Error("errors.Is did not match the wrapped sentinel")
	}
}
