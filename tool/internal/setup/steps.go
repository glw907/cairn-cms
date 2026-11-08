package setup

// Actor is who performs a step.
type Actor string

// The two actors.
const (
	// Tool is a step setup performs itself.
	Tool Actor = "tool"
	// Owner is a step the owner performs, in a browser or at the terminal.
	Owner Actor = "owner"
)

// Provider is the service a network step calls; empty for a local step.
type Provider string

// The providers setup calls.
const (
	Cloudflare Provider = "cloudflare"
	GitHub     Provider = "github"
	NPM        Provider = "npm"
)

// Step ids. They are setup's own constants.
const (
	StepOpeningChecks     = "opening-checks"
	StepApproveCloudflare = "approve-cloudflare"
	StepCloudflareChecks  = "cloudflare-checks"
	StepApproveCreateApp  = "approve-create-app"
	StepApproveInstall    = "approve-install-all"
	StepApproveRepo       = "approve-install-repo"
	StepSummary           = "summary"
	StepScaffold          = "scaffold"
	StepProvision         = "provision"
	StepCommit            = "commit"
	StepPush              = "push"
	StepDeployKey         = "deploy-key"
	StepFirstDeploy       = "first-deploy"
	StepDomains           = "domains"
	StepSignIn            = "sign-in"
)

// Step is one entry in the plan.
type Step struct {
	// ID is the step's stable identifier.
	ID string
	// Label is the short line a view shows.
	Label string
	// Actor is who performs the step.
	Actor Actor
	// Provider is the service a network step calls.
	Provider Provider
}

// steps is the ordered plan: the checks and approvals first, then the eight watch steps.
func steps() []Step {
	return []Step{
		{StepOpeningChecks, "Check git, Node 24 or later, port 49152, the keyring, the template, and the folder", Tool, NPM},
		{StepApproveCloudflare, "Approve Cloudflare sign-in", Owner, Cloudflare},
		{StepCloudflareChecks, "Check accounts, zones, Workers Paid, names, and the address", Tool, Cloudflare},
		{StepApproveCreateApp, "Create the GitHub App", Owner, GitHub},
		{StepApproveInstall, "Install and authorize the App on all repositories", Owner, GitHub},
		{StepApproveRepo, "Approve, install, and authorize the App on the new repository only", Owner, GitHub},
		{StepSummary, "Read the summary and press Enter", Owner, ""},
		{StepScaffold, "Scaffold the site folder", Tool, ""},
		{StepProvision, "Create the D1 database, the R2 bucket, and the email sending subdomain", Tool, Cloudflare},
		{StepCommit, "Write the config and commit locally", Tool, ""},
		{StepPush, "Recheck the Worker name and push to GitHub", Tool, GitHub},
		{StepDeployKey, "Mint the deploy key and store it as a repository secret", Tool, Cloudflare},
		{StepFirstDeploy, "Deploy for the first time and set the Worker secret", Tool, GitHub},
		{StepDomains, "Attach the custom domains and wait for HTTPS", Tool, Cloudflare},
		{StepSignIn, "Check the sign-in row and redirect", Tool, Cloudflare},
	}
}
