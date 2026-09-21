package health

import (
	"encoding/json"
	"errors"

	"github.com/glw907/cairn-cms/tool/internal/providers"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// field wraps value as a spine.OutcomeField named key. Every value a check passes through it is a
// bool, a string, a number, a time.Time, or a slice of those, each one of json.Marshal's own
// built-in cases, so the error return is unreachable and ignored rather than threaded back through
// every caller.
func field(key string, value any) spine.OutcomeField {
	data, _ := json.Marshal(value)
	return spine.OutcomeField{Key: key, Value: data}
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
