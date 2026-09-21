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

// apiErrorOutcome classifies a Cloudflare or GitHub API failure, shared by every check that
// reads one of those APIs but does not itself measure the credential (delegation,
// HTTPS-forced, HSTS, email, deploy). Unlike credsCheck, a 401 or 403 here is Unknown with its
// own reason.api.<Reason> code rather than Failing: only the creds check treats a rejected
// credential as the fault under test. An error this package cannot classify at all (a dial
// failure, a context deadline) is Unknown with reason.timeout.
func apiErrorOutcome(err error) spine.Outcome {
	var pe providers.ProviderError
	if !errors.As(err, &pe) {
		return spine.Outcome{State: spine.Unknown, Reason: spine.ReasonTimeout}
	}
	return spine.Outcome{State: spine.Unknown, Reason: spine.APIReason(pe.ClassifiedReason())}
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
