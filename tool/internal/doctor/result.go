package doctor

import (
	"strconv"

	"github.com/glw907/cairn-cms/tool/v2/internal/spine"
)

// Status is one check's settled result: the five-word vocabulary a directory preflight
// needs beyond spine's three-word State, since spine.State has no way to express a doctor
// skip or an info note.
type Status int

// The five doctor statuses.
const (
	StatusPass Status = iota
	StatusFail
	StatusSkip
	StatusInfo
	StatusUnchecked
)

// String returns the printed word: PASS, FAIL, SKIP, INFO, or UNCHECKED.
func (s Status) String() string {
	switch s {
	case StatusPass:
		return "PASS"
	case StatusFail:
		return "FAIL"
	case StatusSkip:
		return "SKIP"
	case StatusInfo:
		return "INFO"
	case StatusUnchecked:
		return "UNCHECKED"
	default:
		return "Status(" + strconv.Itoa(int(s)) + ")"
	}
}

// Result is one check's settled outcome against a Snapshot. Its identity and severity are its
// Check's, which a CheckedResult carries alongside.
type Result struct {
	// Status is the check's settled verdict.
	Status Status
	// Detail is the check's note: a why/fix line for a fail, or the note an info status
	// prints. Empty for pass, skip, and unchecked.
	Detail string
}

// passResult builds a StatusPass Result, the common case every check's pass path shares.
func passResult(detail string) Result {
	return Result{Status: StatusPass, Detail: detail}
}

// failResult builds a StatusFail Result.
func failResult(detail string) Result {
	return Result{Status: StatusFail, Detail: detail}
}

// skipResult builds a StatusSkip Result.
func skipResult(detail string) Result {
	return Result{Status: StatusSkip, Detail: detail}
}

// infoResult builds a StatusInfo Result: a passing check carrying a note, never a failure.
func infoResult(detail string) Result {
	return Result{Status: StatusInfo, Detail: detail}
}

// uncheckedResult builds a StatusUnchecked Result: the check's precondition was not observable,
// a containment refusal or an absent required input among the causes.
func uncheckedResult(detail string) Result {
	return Result{Status: StatusUnchecked, Detail: detail}
}

// statusFacts is what a Status means outside the package: the spine state its exit code folds
// to, the word and reason its wire payload writes. It is the one place the five statuses are
// mapped, so the exit code and the payload cannot disagree about a status.
type statusFacts struct {
	state spine.State
	// wire is the state word the payload writes. A skip keeps its own word and an info is written
	// as a pass, since the frozen wire vocabulary has no info word.
	wire string
	// reason is the code the payload writes for a skip or an unknown, empty otherwise. The exit
	// code reads it only when state is Unknown, the one state that carries a reason.
	reason spine.ReasonCode
}

// statusTable is indexed by Status. Pass, skip, and info all fold to OK: a directory preflight
// has no held vocabulary, and info is a passing check with a note attached. Unchecked folds to
// Unknown with ReasonNotObservable, since a containment refusal means the check could not
// observe its input, not that the site failed. A skip takes reason.not-run, the closest fit in
// the frozen vocabulary: for a directory preflight its precondition did not apply.
var statusTable = [...]statusFacts{
	StatusPass:      {state: spine.OK, wire: stateWordPass},
	StatusFail:      {state: spine.Failing, wire: stateWordFail},
	StatusSkip:      {state: spine.OK, wire: stateWordSkip, reason: spine.ReasonNotRun},
	StatusInfo:      {state: spine.OK, wire: stateWordPass},
	StatusUnchecked: {state: spine.Unknown, wire: stateWordUnknown, reason: spine.ReasonNotObservable},
}

// checkVerdict converts cr to the spine.CheckVerdict its exit code arithmetic reads. A fail
// carries the severity its check's condition declares in the registry, so a check can never
// disagree with its condition.
func (cr CheckedResult) checkVerdict() spine.CheckVerdict {
	facts := statusTable[cr.Result.Status]
	v := spine.CheckVerdict{ID: cr.Check.ID, State: facts.state}
	switch facts.state {
	case spine.Failing:
		v.Severity = conditionText(cr.Check.Condition).Severity
	case spine.Unknown:
		v.Reason = facts.reason
	}
	return v
}

// Verdicts converts a run's settled results into the spine.SiteVerdicts its exit code arithmetic
// folds. A zero-length checked folds to spine.VerdictUnknown through spine.SiteVerdicts.Verdict's
// empty-slice rule, the outside-a-cairn-site case.
func Verdicts(checked []CheckedResult) spine.SiteVerdicts {
	out := make(spine.SiteVerdicts, len(checked))
	for i, c := range checked {
		out[i] = c.checkVerdict()
	}
	return out
}
