// Package setup plans and, in later files, runs first-time site setup. It follows the spine
// rule of ADR-0001 and ADR-0003: it prints nothing, prompts for nothing, and constructs no
// client. The command draws what it returns.
package setup

import "errors"

// Posture is the owner's AI-crawler choice. The values are the ones a site's config
// carries; "none" is never written.
type Posture string

// The two postures setup writes.
const (
	// Decline blocks training crawlers.
	Decline Posture = "decline"
	// Invite allows them.
	Invite Posture = "invite"
)

// Answers is everything the owner chose before the plan is drawn up.
type Answers struct {
	// SiteName is the display name the names derive from.
	SiteName string
	// OwnerEmail is the address of the first owner.
	OwnerEmail string
	// Posture is the AI-crawler choice.
	Posture Posture
	// Zone is the apex of the chosen Cloudflare zone.
	Zone string
	// Host is the chosen address: Zone itself or a subdomain of it.
	Host string
	// Theme is an optional theme id, meaningful only when the catalog has more than one entry.
	Theme string
	// AccountID is an optional Cloudflare account id; empty means the only account.
	AccountID string
	// Suffix is the taken-name counter: 0 for none, 2 for "-2", 3 for "-3".
	Suffix int
	// Credential is what the run's Cloudflare calls use; empty means CredentialApproval.
	Credential CloudflareCredential
}

var (
	errNoSlug  = errors.New("site name has no letters or digits to build a name from (use A-Z and 0-9)")
	errNoEmail = errors.New("owner email is empty")
	errPosture = errors.New("posture must be decline or invite")
	errHost    = errors.New("address is not the zone or a subdomain of it")
	errSuffix  = errors.New("suffix must be 0 or at least 2")
	errNoEnv   = errors.New("no environment for git and npm (set Config.Env to the process's environment by name)")
	// errTokenNoEmail refuses a token run with no owner email: the token cannot read the
	// Cloudflare sign-in's address, so nothing else can supply one.
	errTokenNoEmail = errors.New("a run with a Cloudflare token needs the owner email (set Answers.OwnerEmail)")
)
