package health

import (
	"encoding/json"
	"errors"

	"github.com/glw907/cairn-cms/tool/internal/providers"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// field wraps value as a spine.OutcomeField named key that every render carries. Non-verbose is
// the default, so a value only a verbose render may carry (an account id, a zone id, a worker
// name, a repository slug, a full commit SHA, a build id) must go through verboseField instead;
// a check cannot leave that decision to a rendering-time filter.
//
// Every key names what it measures, never its category: "errorCount", not "count". A generic
// name collides the moment one check reports two of the same category, and it leaves a reader of
// the rendered field no way to tell what the number counts.
//
// Every value a check passes through it is a bool, a string, a number, a time.Time, or a slice
// of those, each one of json.Marshal's own built-in cases, so the error return is unreachable and
// ignored rather than threaded back through every caller.
func field(key string, value any) spine.OutcomeField {
	data, _ := json.Marshal(value)
	return spine.OutcomeField{Key: key, Value: data}
}

// verboseField wraps value as a spine.OutcomeField named key that only a verbose render carries.
// A non-verbose render drops the field entirely, key and value.
func verboseField(key string, value any) spine.OutcomeField {
	f := field(key, value)
	f.Verbose = true
	return f
}

// observedField wraps value as a spine.OutcomeField named key whose value was copied out of a
// provider's response rather than derived by cairn. The marshal boundary carries such a field
// under its own key with the source beside it, so an agent's rule about untrusted data has
// something to key on; it never infers the source, which is why every copying check declares it
// here at the point the value is lifted.
//
// A count, a comparison, or a word from cairn's own vocabulary is not copied, even when a
// provider's response is what it was computed from: what the mark names is a string a site
// controls the bytes of.
func observedField(key string, value any, source spine.FieldSource) spine.OutcomeField {
	f := field(key, value)
	f.Source = source
	return f
}

// verboseObservedField wraps value as a copied field only a verbose render carries, the
// intersection of verboseField and observedField.
func verboseObservedField(key string, value any, source spine.FieldSource) spine.OutcomeField {
	f := observedField(key, value, source)
	f.Verbose = true
	return f
}

// credMissingOutcome is the outcome a check reports when the credential it reads through was
// never resolved. The run disclosed the gap before the check ran, so there is nothing to detail
// beyond the reason.
func credMissingOutcome() spine.Outcome {
	return spine.Outcome{State: spine.Unknown, Reason: spine.ReasonCredMissing}
}

// noZoneIDOutcome is the outcome a zone-scoped check reports for a site whose record carries no
// zone id. The check has nothing to read rather than something it failed to read.
func noZoneIDOutcome() spine.Outcome {
	return spine.Outcome{State: spine.Unknown, Reason: spine.ReasonNotObservable, Detail: "no zone id recorded for this site"}
}

// apiErrorOutcome classifies a Cloudflare or GitHub API failure, shared by every check that
// reads one of those APIs but does not itself measure the credential (delegation,
// HTTPS-forced, HSTS, email, deploy). Unlike credsCheck, a 401 or 403 here is Unknown with its
// own reason.api.<Reason> code rather than Failing: only the creds check treats a rejected
// credential as the fault under test. An error this package cannot classify at all (a dial
// failure, a context deadline) is Unknown with reason.timeout.
//
// A rejected request is the one reason that carries a Detail. Every other reason names something
// about the site or the credential, which the reason code alone already says; a 400 says cairn
// sent a body the provider would not parse, and an operator reading a bare
// reason.api.request-rejected has no way to know the fault is not theirs.
func apiErrorOutcome(err error) spine.Outcome {
	var pe providers.ProviderError
	if !errors.As(err, &pe) {
		return spine.Outcome{State: spine.Unknown, Reason: spine.ReasonTimeout}
	}
	reason := pe.ClassifiedReason()
	outcome := spine.Outcome{State: spine.Unknown, Reason: spine.APIReason(reason)}
	if reason == providers.ReasonRequestRejected {
		outcome.Detail = detailAPIRequestRejected()
	}
	return outcome
}

// credentialErrorOutcome classifies err through spine.ReasonToOutcome, the module's one
// translation from a classified provider Reason to a verdict: a bad credential is exactly what
// the creds check measures, the one place a 401 or 403 answers Failing rather than the Unknown
// every other check reports for the same pair. ReasonToOutcome already sets a typed Code for
// that Failing case (CodeCredsUnauthorized or CodeCredsForbidden), which credentialLine renders
// through health's own messages table, so no relabeling happens here. An error this package
// cannot classify at all, a dial failure or a context deadline, is Unknown with reason.timeout:
// the endpoint itself could not be reached, not merely rejected.
func credentialErrorOutcome(err error) spine.Outcome {
	var pe providers.ProviderError
	if !errors.As(err, &pe) {
		return spine.Outcome{State: spine.Unknown, Reason: spine.ReasonTimeout}
	}
	return spine.ReasonToOutcome(pe.ClassifiedReason())
}
