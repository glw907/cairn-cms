package health

import (
	"encoding/json"
	"regexp"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// Report is the read-side result of one health sweep against a site: every check's settled
// verdict, plus the degraded flag and acknowledgement list Run derives from them.
type Report struct {
	// SchemaVersion is Report's own JSON schema version, bumped when a field is added or removed
	// in a way a parsing consumer needs to know about.
	SchemaVersion int
	// Site is the record's display name.
	Site string
	// Domain is the record's public domain.
	Domain string
	// Checks holds every check's settled result, in the order Run swept them.
	Checks []CheckResult
	// Degraded is set when any check result is Unknown with reason.cred-missing: a missing,
	// unconfigured credential is the one Unknown a report-level reader treats as its own signal
	// rather than a plain unobservable check.
	Degraded bool
	// Acknowledged lists the check ids of every unexpired Ack the run was given, whether or not a
	// check in this sweep actually carries that id, so an operator can see a stale
	// acknowledgement pointing at nothing rather than have it silently dropped.
	Acknowledged []string
}

// CheckResult is one check's settled verdict.
type CheckResult struct {
	// ID is the check's stable identifier.
	ID string
	// Condition is the cairn-doctor condition id the check declared.
	Condition spine.Condition
	// Outcome is the check's measured verdict.
	Outcome spine.Outcome
	// CheckedAt is when Run settled this result, read from the run's injected clock.
	CheckedAt time.Time
	// Tier is the provider credential the check declared it needs.
	Tier Tier
	// Acknowledged reports whether an unexpired Ack covered this result.
	Acknowledged bool
	// AckExpires is the covering Ack's expiry. It is the zero time when Acknowledged is false.
	AckExpires time.Time
}

// verboseOnlyPatterns matches the identifier shapes the non-verbose render excludes: a build
// UUID, a full (40-character) commit SHA, and an "owner/repo"-shaped repository slug. A
// 7-character SHA is short enough to fall outside every pattern here, so it survives
// unredacted, as the spec's allowlist requires. An account id, a zone id, and a worker name are
// opaque strings this shape-based filter cannot recognize on its own; a check that carries one
// puts it in a named Fields entry, which a later task's per-field rule (not this one) can also
// filter by key.
var verboseOnlyPatterns = []*regexp.Regexp{
	regexp.MustCompile(`\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b`),
	regexp.MustCompile(`\b[0-9a-fA-F]{40}\b`),
	regexp.MustCompile(`\b[A-Za-z0-9][A-Za-z0-9_.-]*/[A-Za-z0-9][A-Za-z0-9_.-]*\b`),
}

// redactedPlaceholder replaces a verbose-only value's text in a non-verbose render.
const redactedPlaceholder = "<redacted>"

// redactText masks every verboseOnlyPatterns match in s.
func redactText(s string) string {
	for _, pattern := range verboseOnlyPatterns {
		s = pattern.ReplaceAllString(s, redactedPlaceholder)
	}
	return s
}

// redactField masks value's content the same way redactText does, when value decodes as a JSON
// string. A non-string value (a bool, a number, a nested object) passes through unchanged: none
// of the verbose-only shapes this filter recognizes can appear inside one.
func redactField(value json.RawMessage) json.RawMessage {
	var s string
	if err := json.Unmarshal(value, &s); err != nil {
		return value
	}
	redacted, err := json.Marshal(redactText(s))
	if err != nil {
		return value
	}
	return redacted
}

// redactOutcome returns a copy of o with Detail and every Fields entry passed through redactText
// and redactField, for a non-verbose render.
func redactOutcome(o spine.Outcome) spine.Outcome {
	o.Detail = redactText(o.Detail)
	if len(o.Fields) == 0 {
		return o
	}
	fields := make([]spine.OutcomeField, len(o.Fields))
	for i, f := range o.Fields {
		fields[i] = spine.OutcomeField{Key: f.Key, Value: redactField(f.Value)}
	}
	o.Fields = fields
	return o
}

// JSON is Report's only marshal path. A verbose render carries every field as measured; a
// non-verbose render redacts every verbose-only value from each check's Outcome.Detail and
// Outcome.Fields, leaving the check id, condition, reason, counts, ages, and states untouched.
// Report and CheckResult declare no MarshalJSON, so a bare json.Marshal on either one always
// produces the raw, unredacted shape rather than silently reproducing this filter (correctly or
// not); JSON is the one place a Report's bytes are meant to leave the process.
func (r Report) JSON(verbose bool) ([]byte, error) {
	if verbose {
		return json.Marshal(r)
	}
	redacted := r
	redacted.Checks = make([]CheckResult, len(r.Checks))
	for i, c := range r.Checks {
		c.Outcome = redactOutcome(c.Outcome)
		redacted.Checks[i] = c
	}
	return json.Marshal(redacted)
}
