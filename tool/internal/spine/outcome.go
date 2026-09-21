package spine

import (
	"encoding/json"
	"errors"
	"strconv"

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

// Severity returns s's rank for combining several checks into one worst verdict: Failing
// outranks Unknown outranks OK. State's own iota values are not in that order (OK is 1, Failing
// is 2, so a raw int comparison would rank a failing check beneath an unknown one), so Severity
// is the one rank a caller combines by.
func (s State) Severity() int {
	switch s {
	case Failing:
		return 2
	case Unknown:
		return 1
	default:
		return 0
	}
}

// String names the State for a log line or a rendered status line.
func (s State) String() string {
	switch s {
	case OK:
		return "ok"
	case Failing:
		return "failing"
	case Unknown:
		return "unknown"
	default:
		return "State(" + strconv.Itoa(int(s)) + ")"
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

// allReasonCodes enumerates every fixed ReasonCode constant, so a test that needs the whole set
// does not retype it.
var allReasonCodes = []ReasonCode{
	ReasonCredMissing, ReasonCredForbidden, ReasonCredRevoked, ReasonCredExpiring,
	ReasonTimeout, ReasonOffline, ReasonNotRun, ReasonNotObservable,
}

// ParkReason builds the reason.park.<code> ReasonCode a wait-kind outcome carries.
func ParkReason(code ParkCode) ReasonCode {
	return ReasonCode("reason.park." + string(code))
}

// APIReason builds the reason.api.<Reason> ReasonCode an unclassified provider API failure
// carries.
func APIReason(r providers.Reason) ReasonCode {
	return ReasonCode("reason.api." + r.String())
}

// ReasonToOutcome is the one translation from a classified provider Reason to a check's Outcome.
// An unauthorized or forbidden credential is the only pair that answers Failing: the endpoint
// rejected the credential itself, not merely the request. Every other reason, rate-limited
// included, answers Unknown with a reason.api.<Reason> code: the endpoint could not be observed
// for a condition on this side of the wire (a rate limit, a 404, an unclassified failure), never
// a verdict on the credential. A rate limit in particular must never answer Failing: the tool
// being throttled is not the site being broken, and reporting it as Failing would page an
// operator for a fault they cannot fix.
func ReasonToOutcome(r providers.Reason) Outcome {
	switch r {
	case providers.ReasonUnauthorized, providers.ReasonForbidden:
		return Outcome{State: Failing, Detail: r.String()}
	default:
		return Outcome{State: Unknown, Reason: APIReason(r)}
	}
}

// OutcomeField is one ordered, named value a Check reports beyond its one-line Detail: a
// structured fact (a count, a build id, a timestamp) an operator's detail view or a golden test
// reads by key rather than re-parsing a formatted string. It has the same two-field shape as
// record.ExtraField but is declared fresh here rather than reused: spine imports providers and
// nothing else internal today, and the module's downward architecture gives it no reason to gain
// a dependency on record for a two-field struct. It also carries no redacting String() the way
// record.ExtraField does; ExtraField's redaction exists because a record's opaque tail can carry
// a secret, while an OutcomeField is check output a Report's own non-verbose filter already
// governs, so hiding its value behind a second, uncoordinated redaction would only fight that
// filter.
type OutcomeField struct {
	// Key names the field, stable across releases: a renderer and a golden test both key off it.
	Key string
	// Value is the field's value, carried as raw JSON so a caller decodes it as whatever shape
	// it actually is (a string, a number, a bool) without OutcomeField itself guessing.
	Value json.RawMessage
}

// Outcome is the read-side result a Check returns. Reason is set only when State is Unknown;
// Detail carries a human-readable note for OK or Failing and is otherwise unused. Fields carries
// any structured facts behind Detail's one-line summary, in the order a Check appended them.
type Outcome struct {
	State  State
	Reason ReasonCode
	Detail string
	Fields []OutcomeField
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
// Detail, and declined becomes OK with code as Detail. 2.0 seam kept on purpose: FromKind has no
// caller in 1.0 by design.
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
