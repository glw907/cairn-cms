package spine

// Step is a site record's lifecycle position, one of the exact strings the Node CLI writes to a
// record's "step" field. It is a single scalar shared across every chapter, so a health check
// never derives status from it; the detail view shows it as lifecycle position only.
type Step string

// The record-step constants: the 19 strings the retired Node wizard's chapter orchestrators
// wrote to a site record's "step" field. Records on disk still carry them, so the set stays
// closed: step_test.go holds every constant registered.
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

// allSteps backs parseStep and is checked against the declared constants by step_test.go.
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

// The setup-only step constants: positions `cairn new` records that the Node wizard never
// writes. They stay out of allSteps, which holds the wizard's set. A setup
// record reuses the wizard constants where the meaning is the same (app-created, repo-created,
// pushed, deployed, live).
const (
	StepSetupStarted     Step = "setup-started"
	StepResourcesCreated Step = "resources-created"
	// StepCommitted means the site's settings are written and committed in the local folder.
	StepCommitted Step = "committed"
	// StepDeployKeyStored means the deploy key is minted and stored as a repository secret.
	StepDeployKeyStored Step = "deploy-key-stored"
)

// setupSteps backs step_test.go's check that no setup-only step collides with a wizard step.
var setupSteps = []Step{StepSetupStarted, StepResourcesCreated, StepCommitted, StepDeployKeyStored}

// parseStep reports the Step matching s and whether s is one of the known record-step constants.
func parseStep(s string) (Step, bool) {
	step := Step(s)
	return step, allSteps[step]
}

// terminalSteps names the cloudflare chapter's steps past which the pasted API token is
// deleted, ported from the retired wizard's TERMINAL_STEPS.
func terminalSteps() []Step {
	return []Step{StepEmailLive, StepPaidPlanDeclined}
}

// chapter3TerminalSteps names the cloudflare chapter's builds-finished steps, ported from
// the retired wizard's CHAPTER3_TERMINAL_STEPS.
func chapter3TerminalSteps() []Step {
	return []Step{StepBuildsLive, StepBuildsConnectDeclined}
}

// chapter3ResumableSteps names the cloudflare chapter's steps a resume can skip past, ported
// from the retired wizard's CHAPTER3_RESUMABLE_STEPS.
func chapter3ResumableSteps() []Step {
	return []Step{StepBuildsConnected, StepConfigReconciled}
}
