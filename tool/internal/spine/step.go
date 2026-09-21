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

// allSteps backs parseStep and is replayed by step_test.go's own literal scan.
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

// parseStep reports the Step matching s and whether s is one of the known record-step constants.
func parseStep(s string) (Step, bool) {
	step := Step(s)
	return step, allSteps[step]
}

// terminalSteps names the cloudflare chapter's own steps past which the pasted API token is
// deleted, ported from TERMINAL_STEPS in
// packages/create-cairn-site/src/cloudflare/chapter2.mjs.
func terminalSteps() []Step {
	return []Step{StepEmailLive, StepPaidPlanDeclined}
}

// chapter3TerminalSteps names the cloudflare chapter's builds-finished steps, ported from
// CHAPTER3_TERMINAL_STEPS in packages/create-cairn-site/src/cloudflare/chapter3.mjs.
func chapter3TerminalSteps() []Step {
	return []Step{StepBuildsLive, StepBuildsConnectDeclined}
}

// chapter3ResumableSteps names the cloudflare chapter's steps a resume can skip past, ported
// from CHAPTER3_RESUMABLE_STEPS in packages/create-cairn-site/src/cloudflare/chapter3.mjs.
func chapter3ResumableSteps() []Step {
	return []Step{StepBuildsConnected, StepConfigReconciled}
}
