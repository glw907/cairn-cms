package spine

import (
	"encoding/json"
	"errors"
	"slices"
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

// fixedReasonCodes is every ReasonCode constant above, in declaration order.
var fixedReasonCodes = []ReasonCode{
	ReasonCredMissing, ReasonCredForbidden, ReasonCredRevoked, ReasonCredExpiring,
	ReasonTimeout, ReasonOffline, ReasonNotRun, ReasonNotObservable,
}

// ReasonCodes is the closed reason vocabulary a run can emit: the eight fixed constants, then
// the reason.park.<code> family over every ParkCode, then the reason.api.<reason> family over
// every providers.Reason. It is built from those three sets rather than written out, so a code
// added to any of them joins the published vocabulary without a second list to keep in step.
func ReasonCodes() []ReasonCode {
	out := slices.Clone(fixedReasonCodes)
	for _, p := range ParkCodes() {
		out = append(out, ParkReason(p))
	}
	for _, r := range providers.Reasons() {
		out = append(out, APIReason(r))
	}
	return out
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
//
// A Failing outcome here sets Code, never Detail: spine cannot import health, so the prose that
// renders CodeCredsUnauthorized and CodeCredsForbidden lives in health's own messages table,
// keyed on the Code this function sets.
func ReasonToOutcome(r providers.Reason) Outcome {
	switch r {
	case providers.ReasonUnauthorized:
		return Outcome{State: Failing, Code: CodeCredsUnauthorized}
	case providers.ReasonForbidden:
		return Outcome{State: Failing, Code: CodeCredsForbidden}
	default:
		return Outcome{State: Unknown, Reason: APIReason(r)}
	}
}

// OutcomeField is one ordered, named value a Check reports beyond its one-line Detail: a
// structured fact (a count, a build id, a timestamp) an operator's detail view or a golden test
// reads by key rather than re-parsing a formatted string. Its value is raw JSON and reaches a
// renderer unredacted, so a Check must not put a secret in one.
type OutcomeField struct {
	// Key names the field, stable across releases: a renderer and a golden test both key off it.
	Key string `json:"key"`
	// Value is the field's value, carried as raw JSON so a caller decodes it as whatever shape
	// it actually is (a string, a number, a bool) without OutcomeField itself guessing.
	Value json.RawMessage `json:"value"`
	// Verbose marks a value only a verbose render carries, so a non-verbose render drops the
	// whole field rather than the value alone. It is render metadata about the field and never
	// part of the rendered field, which is what the json tag holds it out of.
	Verbose bool `json:"-"`
	// Source names the provider whose response this value was copied from, and is empty for a
	// value the tool derived itself. The producing check sets it; the JSON boundary reads it to
	// decide which values are marked as a site's own strings rather than cairn's, and never
	// infers a source from a key name or a value's shape. It is boundary metadata about the
	// field and never a key inside the rendered field.
	Source FieldSource `json:"-"`
}

// FieldSource names where an OutcomeField's value came from, when it came from outside cairn.
// The empty value means the tool derived the value itself.
type FieldSource string

// The provider sources a copied value can carry.
const (
	// SourceCloudflare marks a value read out of a Cloudflare API response, Workers Logs
	// included.
	SourceCloudflare FieldSource = "cloudflare"
	// SourceGitHub marks a value read out of a GitHub API response or the site repository's own
	// metadata.
	SourceGitHub FieldSource = "github"
)

// Outcome is the read-side result a Check returns. Reason is set only when State is Unknown;
// Detail carries a human-readable note for OK or Failing and is otherwise unused. Fields carries
// any structured facts behind Detail's one-line summary, in the order a Check appended them.
//
// Condition belongs to the verdict, not to the check that measured it: one check's two failures
// can have two different remedies, and a check with a catalogued remedy for one failure mode
// usually has none for the rest. A verdict no condition id names leaves it ConditionNone, which
// is what a renderer reads to omit the remedy line.
//
// Code is the tool-owned analogue of Condition for a Failing verdict the engine's own registry
// names no id for. It is set only alongside Failing, and never alongside a Condition: the two
// name the same failure at most once, through whichever vocabulary actually owns it.
type Outcome struct {
	State     State          `json:"state"`
	Reason    ReasonCode     `json:"reason"`
	Condition Condition      `json:"condition"`
	Code      Code           `json:"code"`
	Detail    string         `json:"detail"`
	Fields    []OutcomeField `json:"fields"`
}

// Validate reports an error if Outcome does not match the rules every check obeys: a non-Unknown
// State must carry no Reason and an Unknown State must carry one; a Code is set only alongside
// Failing; and Condition and Code never both name the same failure.
func (o Outcome) Validate() error {
	if o.State == Unknown && o.Reason == "" {
		return errors.New("spine: an Unknown outcome must carry a Reason")
	}
	if o.State != Unknown && o.Reason != "" {
		return errors.New("spine: a non-Unknown outcome must carry no Reason")
	}
	if o.Code != CodeNone && o.State != Failing {
		return errors.New("spine: a Code must be carried only by a Failing outcome")
	}
	if o.Code != CodeNone && o.Condition != ConditionNone {
		return errors.New("spine: an outcome must not carry both a Condition and a Code")
	}
	return nil
}
