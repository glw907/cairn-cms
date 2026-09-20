// Package spine holds the chapter vocabulary the Node CLI's provisioning chapters wrote first:
// the site record's lifecycle step, the park codes a wait-kind outcome carries, the check
// outcome shape every health check returns, and the cairn-doctor condition ids a check declares.
// It is the read-side ground truth every layer above it (health, logs, the render seam) shares,
// so a term coined once here never drifts between the CLI, the HUD, and the doctor.
package spine

// Step is a site record's lifecycle position, one of the exact strings the Node CLI writes to a
// record's "step" field. It is a single scalar shared across every chapter, so a health check
// never derives status from it; the detail view shows it as lifecycle position only.
type Step string

// The record-step constants: the 19 strings the Node CLI's chapter orchestrators
// (packages/create-cairn-site/src/{scaffold,cloudflare/chapter,cloudflare/chapter2,
// cloudflare/chapter3,github/chapter}.mjs) write to a site record's "step" field.
const (
	StepScaffolded            Step = "scaffolded"
	StepAppCreated            Step = "app-created"
	StepInstalled             Step = "installed"
	StepAwaitingOrgApproval   Step = "awaiting-org-approval"
	StepRepoCreated           Step = "repo-created"
	StepPushed                Step = "pushed"
	StepDeployed              Step = "deployed"
	StepLive                  Step = "live"
	StepZoneCreated           Step = "zone-created"
	StepRecordsCarried        Step = "records-carried"
	StepDelegated             Step = "delegated"
	StepDomainLive            Step = "domain-live"
	StepPaidPlanDeclined      Step = "paid-plan-declined"
	StepEmailOnboarded        Step = "email-onboarded"
	StepEmailLive             Step = "email-live"
	StepBuildsLive            Step = "builds-live"
	StepBuildsConnectDeclined Step = "builds-connect-declined"
	StepBuildsConnected       Step = "builds-connected"
	StepConfigReconciled      Step = "config-reconciled"
)

// allSteps backs ParseStep and is replayed by step_test.go's own literal scan.
var allSteps = map[Step]bool{
	StepScaffolded:            true,
	StepAppCreated:            true,
	StepInstalled:             true,
	StepAwaitingOrgApproval:   true,
	StepRepoCreated:           true,
	StepPushed:                true,
	StepDeployed:              true,
	StepLive:                  true,
	StepZoneCreated:           true,
	StepRecordsCarried:        true,
	StepDelegated:             true,
	StepDomainLive:            true,
	StepPaidPlanDeclined:      true,
	StepEmailOnboarded:        true,
	StepEmailLive:             true,
	StepBuildsLive:            true,
	StepBuildsConnectDeclined: true,
	StepBuildsConnected:       true,
	StepConfigReconciled:      true,
}

// ParseStep reports the Step matching s and whether s is one of the known record-step constants.
func ParseStep(s string) (Step, bool) {
	step := Step(s)
	return step, allSteps[step]
}

// TerminalSteps names the cloudflare chapter's own steps past which the pasted API token is
// deleted, ported from TERMINAL_STEPS
// (packages/create-cairn-site/src/cloudflare/chapter2.mjs:84). 2.0 seam kept on purpose: 1.0
// deletes no token and reads no record for that purpose; 2.0's adopt-to-manage reads this to
// decide whether a saved token still exists on a record it is about to act on.
var TerminalSteps = []Step{StepEmailLive, StepPaidPlanDeclined}

// Chapter3TerminalSteps ports CHAPTER3_TERMINAL_STEPS
// (packages/create-cairn-site/src/cloudflare/chapter3.mjs:70). 2.0 seam kept on purpose: 2.0's
// builds detail view reads it to classify a builds record as finished.
var Chapter3TerminalSteps = []Step{StepBuildsLive, StepBuildsConnectDeclined}

// Chapter3ResumableSteps ports CHAPTER3_RESUMABLE_STEPS
// (packages/create-cairn-site/src/cloudflare/chapter3.mjs:82). 2.0 seam kept on purpose: 2.0's
// resume logic reads it to skip the connect and trigger hops a record already passed.
var Chapter3ResumableSteps = []Step{StepBuildsConnected, StepConfigReconciled}
