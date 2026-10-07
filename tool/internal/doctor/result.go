package doctor

import (
	"strconv"

	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// Status is one check's own settled result: the five-word vocabulary a directory preflight
// needs beyond spine's own three-word State, since spine.State has no way to express a doctor
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

// Result is one check's settled outcome against a Snapshot.
type Result struct {
	// ID is the check's own stable identifier, stamped by Run from the Check that produced this
	// Result. A Result taken straight from Check.Run carries none.
	ID string
	// Status is the check's settled verdict.
	Status Status
	// Severity is read only when Status is StatusFail: the severity the producing Check's
	// condition declares in the registry, stamped by Run. A Result taken straight from Check.Run
	// carries none.
	Severity spine.FailSeverity
	// Detail is the check's own note: a why/fix line for a fail, or the note an info status
	// prints. Empty for pass, skip, and unchecked.
	Detail string
}

// The five Result constructors below leave ID and Severity unset: Run stamps both from the
// Result's own Check, so a check body never restates what its Check already declares.

// passResult builds a StatusPass Result, the common case every check's own pass path shares.
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

// checkVerdict converts r to the spine.CheckVerdict its exit code arithmetic reads. Pass, skip,
// and info all fold to State: OK: a directory preflight has no held vocabulary, and info is a
// passing check with a note attached. Unchecked folds to Unknown with ReasonNotObservable, since
// a containment refusal means the check could not observe its input, not that the site failed.
func (r Result) checkVerdict() spine.CheckVerdict {
	switch r.Status {
	case StatusFail:
		return spine.CheckVerdict{ID: r.ID, State: spine.Failing, Severity: r.Severity}
	case StatusUnchecked:
		return spine.CheckVerdict{ID: r.ID, State: spine.Unknown, Reason: spine.ReasonNotObservable}
	default:
		return spine.CheckVerdict{ID: r.ID, State: spine.OK}
	}
}

// Verdicts converts a run's settled results into the spine.SiteVerdicts its exit code arithmetic
// folds. A zero-length checked folds to spine.VerdictUnknown through spine.SiteVerdicts.Verdict's
// own empty-slice rule, the outside-a-cairn-site case.
func Verdicts(checked []CheckedResult) spine.SiteVerdicts {
	out := make(spine.SiteVerdicts, len(checked))
	for i, c := range checked {
		out[i] = c.Result.checkVerdict()
	}
	return out
}
