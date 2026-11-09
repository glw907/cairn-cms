package setup

import (
	"strings"
	"time"
)

// EventSchemaVersion is the version of the Event shape. It rises whenever a consumer has to
// re-read the shape.
const EventSchemaVersion = 1

// EventKind names what an Event reports.
type EventKind string

// The event kinds. A stream that ends without a summary is unfinished.
const (
	// StepStarted reports that a step began.
	StepStarted EventKind = "step_started"
	// StepDone reports that a step finished.
	StepDone EventKind = "step_done"
	// StepFailed reports that a step stopped the run, with the four-part failure.
	StepFailed EventKind = "step_failed"
	// Waiting reports that setup waits on the owner in the browser.
	Waiting EventKind = "waiting"
	// Resumed reports that the run picked up an unfinished record.
	Resumed EventKind = "resumed"
	// SummaryKind carries every derived value for the owner to review.
	SummaryKind EventKind = "summary"
)

// WaitState names the browser approval a waiting event is for.
type WaitState string

// The waiting states: one per approval, plus the Cloudflare consent a resume asks for again
// when its stored grant no longer works.
const (
	WaitCloudflare          WaitState = "approve-cloudflare"
	WaitCreateApp           WaitState = "approve-create-app"
	WaitInstallAll          WaitState = "approve-install-all"
	WaitInstallRepo         WaitState = "approve-install-repo"
	WaitCloudflareReconsent WaitState = "reconsent-cloudflare"
)

// waitSentences is the copy deck's current-step sentence for each state. <name> takes the site
// name and <repo> the repository name.
var waitSentences = map[WaitState]string{
	WaitCloudflare:          "On the Cloudflare page, select API Tokens: Write, and then select Allow. Cloudflare leaves API Tokens: Write unselected, and setup needs it to create your site's deploy key.",
	WaitCreateApp:           "Select Create to add a GitHub App for <name>. The admin saves changes to your site through the App.",
	WaitInstallAll:          "Select Install & Authorize to let setup create the <repo> repository. This access covers all your repositories. Setup removes it within seconds.",
	WaitInstallRepo:         "Select Approve to give the App access to <repo> only. Setup uses this access to push your site and store the deploy key.",
	WaitCloudflareReconsent: "On the Cloudflare page, select API Tokens: Write, and then select Allow. The earlier approval no longer works, so setup asks again.",
}

// WaitSentence returns the sentence a view shows while setup waits in state s.
func WaitSentence(s WaitState, siteName, repo string) string {
	return strings.NewReplacer("<name>", siteName, "<repo>", repo).Replace(waitSentences[s])
}

// TokenVariable names the environment variable an owner supplies a Cloudflare API token in. A run
// given that token uses it for every Cloudflare call in place of approval 1.
const TokenVariable = "CAIRN_CF_SETUP_TOKEN" // secret-guard-allow: a variable name, not a value

// CloudflareCredential names what a run's Cloudflare calls use.
type CloudflareCredential string

// The two credentials.
const (
	// CredentialApproval is the grant the owner approves on Cloudflare's consent page.
	CredentialApproval CloudflareCredential = "approval"
	// CredentialToken is the API token the owner supplies in TokenVariable.
	CredentialToken CloudflareCredential = "token"
)

// Event is one typed report from the runner. Every field is setup's own copy or a value derived
// from the owner's answers; no event carries a token, a code, a key, or a nonce.
type Event struct {
	SchemaVersion int       `json:"schemaVersion"`
	Kind          EventKind `json:"kind"`
	Timestamp     time.Time `json:"timestamp"`
	// Step is the step id from the plan, set on the step kinds and on waiting.
	Step string `json:"step,omitempty"`
	// Waiting is the approval waited on, set only on a waiting event.
	Waiting WaitState `json:"waiting,omitempty"`
	// Sentence is the copy for the waiting state.
	Sentence string `json:"sentence,omitempty"`
	// Credential is set only on approve-cloudflare's step_done: what the run's Cloudflare calls
	// use from then on.
	Credential CloudflareCredential `json:"credential,omitempty"`
	// Failure is set only on step_failed.
	Failure *Failure `json:"failure,omitempty"`
	// Summary is set only on summary.
	Summary *Summary `json:"summary,omitempty"`
}

// Summary is every value the summary screen shows, each with the reason a view prints beside it.
type Summary struct {
	SiteName   string   `json:"siteName"`
	Repository string   `json:"repository"`
	Worker     string   `json:"worker"`
	Database   string   `json:"database"`
	Bucket     string   `json:"bucket"`
	App        string   `json:"app"`
	Folder     string   `json:"folder"`
	Zone       string   `json:"zone"`
	Addresses  []string `json:"addresses"`
	OwnerEmail string   `json:"ownerEmail"`
	Posture    Posture  `json:"posture"`
	Theme      string   `json:"theme"`
	// ThemeDescription is the catalog's one line for the theme, the theme row's reason.
	ThemeDescription string `json:"themeDescription"`
	// SuffixReason says why the names carry a suffix; empty when they carry none.
	SuffixReason string `json:"suffixReason,omitempty"`
	// ZoneChosen reports that the owner picked the zone from several.
	ZoneChosen bool `json:"zoneChosen"`
	// Credential is what the run's Cloudflare calls use. With CredentialToken the owner's email
	// is the one the owner gave, since the token cannot read the Cloudflare sign-in's.
	Credential CloudflareCredential `json:"credential"`
}
