package spine

import (
	"errors"
	"strconv"
)

// Verdict is a run's aggregate result, whose value is the exit code the process reports. The
// four values are the monitoring-plugin convention that Nagios and every alerting tool
// compatible with it already reads, so an operator's existing routine needs no cairn-specific
// table to interpret one.
type Verdict int

// The four monitoring-plugin verdicts. Each constant's value is its exit code.
const (
	VerdictOK       Verdict = 0
	VerdictWarning  Verdict = 1
	VerdictCritical Verdict = 2
	VerdictUnknown  Verdict = 3
)

// String names v in the monitoring convention's own capitals.
func (v Verdict) String() string {
	switch v {
	case VerdictOK:
		return "OK"
	case VerdictWarning:
		return "WARNING"
	case VerdictCritical:
		return "CRITICAL"
	case VerdictUnknown:
		return "UNKNOWN"
	default:
		return "Verdict(" + strconv.Itoa(int(v)) + ")"
	}
}

// Severity ranks v for combining several verdicts into one: CRITICAL outranks UNKNOWN outranks
// WARNING outranks OK. That is deliberately not the numeric order of the codes, since UNKNOWN's
// 3 does not beat CRITICAL's 2. A failing check is a known fault and must not be masked by an
// unrelated transport unknown; an unknown outranks a warning because an unknown hides a possible
// fault while a warning is a disclosed and accepted one. The order agrees with State.Severity
// wherever the two vocabularies overlap, so the module still holds one severity order.
func (v Verdict) Severity() int {
	switch v {
	case VerdictCritical:
		return 3
	case VerdictUnknown:
		return 2
	case VerdictWarning:
		return 1
	default:
		return 0
	}
}

// ErrExpectSites is the sentinel a registry listing returns when the operator named a site count
// the registry does not hold. ExitCode is the only place it is turned into a verdict.
var ErrExpectSites = errors.New("spine: registry site count does not match the expected count")

// FailSeverity is the verdict one check's own Failing outcome warrants, decided by a per-check
// table the health package owns. It is a value on CheckVerdict rather than a lookup here because
// this package never learns a check id: the arithmetic stays independent of the check set.
//
// The zero value is CriticalFailure, so a converter that leaves the field unset reports a
// failure at full weight rather than silently softening one.
type FailSeverity int

// The two fail severities a check can declare.
const (
	// CriticalFailure is a failure the operator is paged for.
	CriticalFailure FailSeverity = iota
	// WarningFailure is a failure worth reporting that no operator should be woken for.
	WarningFailure
)

// CheckVerdict is one settled check's contribution to a run's exit code.
//
// It carries the subset of a health report's per-check result the exit arithmetic reads, rather
// than the report type itself, because the health package already imports this one and the
// reverse import would be a cycle. A caller holding reports converts.
type CheckVerdict struct {
	// ID is the check's stable identifier.
	ID string
	// State is the check's measured verdict.
	State State
	// Reason is the code an Unknown State carries, and is empty for any other State.
	Reason ReasonCode
	// Acknowledged reports whether an unexpired hold covers this check. A hold that has already
	// expired arrives false, which is how an expired hold contributes the same code an unheld
	// failure does.
	Acknowledged bool
	// Severity is the weight this check's own Failing outcome carries, from the converting
	// package's per-check table. It is read only when State is Failing.
	Severity FailSeverity
}

// Verdict reports the code this check contributes on its own.
//
// A passing check is OK. A failing check is CRITICAL, softened to WARNING either by its own
// declared Severity or by an unexpired hold: a hold silences notification, never status, so a
// held failure is never reported OK.
//
// A check that could not run is UNKNOWN, with one exclusion. An Unknown whose Reason answers
// ReasonCode.NotAttempted is WARNING: the site or the operator is set up in a way that gives the
// check nothing to read, which is a gap they disclosed rather than a measurement that failed,
// and paging them for it every morning is what turns a routine into noise. Every other Unknown,
// a rate limit included, stays UNKNOWN, because the run did not observe the site and cannot say
// it is merely imperfect.
//
// Acknowledged has no effect on an Unknown. A hold is an operator saying they accept a known
// failure, which they cannot say about a check that never ran.
func (c CheckVerdict) Verdict() Verdict {
	switch c.State {
	case OK:
		return VerdictOK
	case Failing:
		if c.Acknowledged || c.Severity == WarningFailure {
			return VerdictWarning
		}
		return VerdictCritical
	default:
		if c.Reason.NotAttempted() {
			return VerdictWarning
		}
		return VerdictUnknown
	}
}

// SiteVerdicts is one site's settled checks, in the order the run swept them.
type SiteVerdicts []CheckVerdict

// Verdict folds every check into the code this one site reports. A site with no checks is
// UNKNOWN, never OK: folding an empty check slice to OK prints a false green for a site nothing
// was ever measured against.
func (s SiteVerdicts) Verdict() Verdict {
	if len(s) == 0 {
		return VerdictUnknown
	}
	worst := VerdictOK
	for _, c := range s {
		worst = worseVerdict(worst, c.Verdict())
	}
	return worst
}

// ExitCode returns the verdict a whole run reports, folding every site's checks by the
// precedence Verdict.Severity fixes. The same precedence applies within one site and across a
// sweep of many, so one site's failure is never masked by another's unknown.
//
// Every entry in listErrs contributes UNKNOWN, ErrExpectSites included: a registry the tool
// could not read in full leaves it unable to say whether the sites are healthy. expectSites is
// the count the operator asked the registry to hold, and a mismatch is UNKNOWN for the same
// reason; zero means the operator named no count and the length is not checked.
func ExitCode(sites []SiteVerdicts, listErrs []error, expectSites int) Verdict {
	worst := VerdictOK
	for _, checks := range sites {
		worst = worseVerdict(worst, checks.Verdict())
	}
	if len(listErrs) > 0 {
		worst = worseVerdict(worst, VerdictUnknown)
	}
	if expectSites > 0 && len(sites) != expectSites {
		worst = worseVerdict(worst, VerdictUnknown)
	}
	return worst
}

// worseVerdict returns whichever of a and b outranks the other by Verdict.Severity.
func worseVerdict(a, b Verdict) Verdict {
	if b.Severity() > a.Severity() {
		return b
	}
	return a
}

// CombineState returns whichever of a and b outranks the other by State.Severity, so a later
// endpoint that merely could not be reached never silently downgrades an earlier rejected
// credential.
func CombineState(a, b State) State {
	if b.Severity() > a.Severity() {
		return b
	}
	return a
}

// ExitCodeFor maps one State to the verdict a run carrying nothing but that State reports. It is
// the report-free path, for a command that probes endpoints rather than settling checks; holds
// and an expected site count enter through ExitCode instead. A State this package does not know
// reports UNKNOWN rather than OK, so an unrecognised value can never print a false green.
func ExitCodeFor(s State) Verdict {
	switch s {
	case OK:
		return VerdictOK
	case Failing:
		return VerdictCritical
	default:
		return VerdictUnknown
	}
}

// StateWord returns the wire word one check's result carries: "pass", "fail", "held", "skip", or
// "unknown".
//
// A check that did not settle divides on reason. "skip" is a check that was not attempted, by
// configuration: whatever ReasonCode.NotAttempted names. "unknown" is a check that was attempted
// and observed nothing: a timeout, a transport failure, or a rate limit. One is a gap the
// operator disclosed and the other is a measurement that failed, and one word for both leaves a
// reader unable to tell a deliberate omission from a blind run.
//
// ack means an unexpired hold and softens "fail" to "held". It has no effect on a passing check
// or on one that did not run, since a hold is an operator accepting a known failure, which they
// cannot say about a check that never produced one.
func StateWord(s State, reason ReasonCode, ack bool) string {
	switch s {
	case OK:
		return "pass"
	case Failing:
		if ack {
			return "held"
		}
		return "fail"
	default:
		if reason.NotAttempted() {
			return "skip"
		}
		return "unknown"
	}
}
