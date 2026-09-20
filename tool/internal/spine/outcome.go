package spine

import (
	"errors"

	"github.com/glw907/cairn-cms/tool/internal/providers"
)

// State is a health check's read-side verdict.
type State int

// The three verdicts a Check returns. There is no way to express OK without the check having
// run: a check that could not run reports Unknown, never OK.
const (
	Unknown State = iota
	OK
	Failing
)

// String names the State for a log line or a rendered status line.
func (s State) String() string {
	switch s {
	case OK:
		return "ok"
	case Failing:
		return "failing"
	default:
		return "unknown"
	}
}

// ReasonCode is the catalogued vocabulary an Unknown Outcome carries, naming why a check could
// not observe a verdict rather than what the verdict was.
type ReasonCode string

// The fixed ReasonCode values, ported from the spec's reason catalogue.
const (
	ReasonCredMissing   ReasonCode = "reason.cred-missing"
	ReasonCredForbidden ReasonCode = "reason.cred-forbidden"
	ReasonCredRevoked   ReasonCode = "reason.cred-revoked"
	ReasonCredExpiring  ReasonCode = "reason.cred-expiring"
	ReasonTimeout       ReasonCode = "reason.timeout"
	ReasonOffline       ReasonCode = "reason.offline"
	ReasonNotRun        ReasonCode = "reason.not-run"
	ReasonNotObservable ReasonCode = "reason.not-observable"
)

// ParkReason builds the reason.park.<code> ReasonCode a wait-kind outcome carries.
func ParkReason(code ParkCode) ReasonCode {
	return ReasonCode("reason.park." + string(code))
}

// APIReason builds the reason.api.<Reason> ReasonCode an unclassified provider API failure
// carries.
func APIReason(r providers.Reason) ReasonCode {
	return ReasonCode("reason.api." + r.String())
}

// Outcome is the read-side result a Check returns. Reason is set only when State is Unknown;
// Detail carries a human-readable note for OK or Failing and is otherwise unused.
type Outcome struct {
	State  State
	Reason ReasonCode
	Detail string
}

// Validate reports an error if Outcome does not match the one Reason rule every check obeys: a
// non-Unknown State must carry no Reason, and an Unknown State must carry one.
func (o Outcome) Validate() error {
	if o.State == Unknown && o.Reason == "" {
		return errors.New("spine: an Unknown outcome must carry a Reason")
	}
	if o.State != Unknown && o.Reason != "" {
		return errors.New("spine: a non-Unknown outcome must carry no Reason")
	}
	return nil
}

// Kind is the Node CLI's own chapter-error classification
// (packages/create-cairn-site/src/{cloudflare,github}/catalogue.mjs's ErrorKind), the input
// FromKind maps onto an Outcome.
type Kind string

// The four Kind values every catalogue row declares.
const (
	KindWait       Kind = "wait"
	KindAct        Kind = "act"
	KindAskSomeone Kind = "ask-someone"
	KindDeclined   Kind = "declined"
)

// FromKind maps a catalogue row's Kind and code onto an Outcome, the spec's table: wait becomes
// Unknown with a park reason built from code, act and ask-someone become Failing with code as
// Detail, and declined becomes OK with code as Detail. 2.0 seam kept on purpose: 1.0's checks are
// new code with no catalogue row to classify; 2.0's act-step implementations, which do throw
// catalogue rows, call this to report their own outcome.
func FromKind(kind Kind, code string) Outcome {
	switch kind {
	case KindWait:
		return Outcome{State: Unknown, Reason: ParkReason(ParkCode(code))}
	case KindAct, KindAskSomeone:
		return Outcome{State: Failing, Detail: code}
	case KindDeclined:
		return Outcome{State: OK, Detail: code}
	default:
		return Outcome{State: Unknown, Reason: ReasonNotObservable}
	}
}
