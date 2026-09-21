package health

import (
	"encoding/json"
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
	// Outcome is the check's measured verdict, which carries the condition id the verdict itself
	// declared.
	Outcome spine.Outcome
	// CheckedAt is when Run settled this result, read from the run's injected clock.
	CheckedAt time.Time
	// Tier is the provider credential the check declared it needs.
	Tier Tier
	// Acknowledged reports whether an unexpired Ack covered this result.
	Acknowledged bool
	// AckExpires is the matching Ack's expiry, set whenever one exists for this result's ID even
	// if it has already expired, which is how a rendered report names an acknowledgement as
	// expired rather than simply absent. It is the zero time when no Ack names this ID at all.
	AckExpires time.Time
}

// nonVerboseFields returns the subset of fields a non-verbose render keeps, in their original
// order, or nil when fields is empty or every field is filtered out, so a fields-empty render is
// indistinguishable from a fields-fully-redacted one. A dropped field is dropped entirely, key
// and value.
//
// Visibility is the producing check's decision, carried on the field itself (see field and
// verboseField), not a judgment made here: a shape-based filter over the value (a regex for
// "looks like a UUID" or "looks like owner/repo") both over- and under-matches, and a key
// allowlist held in this file diverges from the checks that produce the keys.
func nonVerboseFields(fields []spine.OutcomeField) []spine.OutcomeField {
	var kept []spine.OutcomeField
	for _, f := range fields {
		if !f.Verbose {
			kept = append(kept, f)
		}
	}
	return kept
}

// nonVerboseOutcome returns a copy of o for a non-verbose render. Detail passes through
// unchanged: Detail is free text, and a check that puts a verbose-only value there instead of a
// named Fields entry is that check's own bug, not something a rendering-time filter can safely
// repair by mangling arbitrary text. Fields is cut down to the fields no check marked verbose.
func nonVerboseOutcome(o spine.Outcome) spine.Outcome {
	o.Fields = nonVerboseFields(o.Fields)
	return o
}

// JSON is Report's only marshal path. A verbose render carries every field as measured; a
// non-verbose render keeps every check's Outcome.Detail as written and drops every Outcome.Fields
// entry its check marked verbose. Report and CheckResult declare no MarshalJSON,
// so a bare json.Marshal on either one always produces the raw, unredacted shape rather than
// silently reproducing this filter (correctly or not); JSON is the one place a Report's bytes are
// meant to leave the process.
func (r Report) JSON(verbose bool) ([]byte, error) {
	if verbose {
		return json.Marshal(r)
	}
	redacted := r
	redacted.Checks = make([]CheckResult, len(r.Checks))
	for i, c := range r.Checks {
		c.Outcome = nonVerboseOutcome(c.Outcome)
		redacted.Checks[i] = c
	}
	return json.Marshal(redacted)
}
