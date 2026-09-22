package health

import "github.com/glw907/cairn-cms/tool/internal/providers"

// Clients carries the provider clients a Run sweep injects into every Check, plus which
// credentials actually resolved and where each one came from. A Check never builds its own
// client and never reads an environment variable or the keyring directly; Clients is its only
// route to a provider, which is what keeps a Check a pure function over its inputs.
type Clients struct {
	// CF is the Cloudflare client. It is nil when HaveCF is false.
	CF *providers.Cloudflare
	// GH is the GitHub client. It is nil when HaveGH is false.
	GH *providers.GitHub
	// NPM is the npm registry client. It needs no credential, so it is always non-nil.
	NPM *providers.NPM
	// Probe is the unauthenticated HTTP and DNS client. It needs no credential, so it is always
	// non-nil.
	Probe *providers.Probe
	// HaveCF reports whether a Cloudflare credential resolved.
	HaveCF bool
	// HaveGH reports whether a GitHub credential resolved.
	HaveGH bool
	// CFFrom names the provider the Cloudflare credential resolved through, "environment" or
	// "keyring", never the value itself. It is empty when HaveCF is false.
	CFFrom string
	// GHFrom names the provider the GitHub credential resolved through, never the value itself.
	// It is empty when HaveGH is false.
	GHFrom string
}
