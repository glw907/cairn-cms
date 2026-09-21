package health

import "github.com/glw907/cairn-cms/tool/internal/spine"

// Actor names whose job a Fix's action is. It is a closed set: a renderer or an automated agent
// switches on it rather than parsing free text.
type Actor string

// The four Actor values a Fix declares.
const (
	// ActorOperator is the site's own operator: the person running this tool, with access to the
	// site's Cloudflare dashboard, GitHub organization, and keyring.
	ActorOperator Actor = "operator"
	// ActorDeveloper is whoever maintains the site's own code: a config change, a dependency
	// bump, or a build fix that only a commit can carry out.
	ActorDeveloper Actor = "developer"
	// ActorProviderConsole is a provider's own support channel, for a fault neither the operator
	// nor the developer can clear from outside it.
	ActorProviderConsole Actor = "provider-console"
	// ActorRegistrar is the domain's registrar, for a fault only a registrar-side change clears
	// (a nameserver delegation, for instance).
	ActorRegistrar Actor = "registrar"
)

// Fix is one fix line the fix table carries for one declared spine.Condition or spine.Code:
// tool/docs/design/copy-standard.md's remedy map, re-homed here from the mockups' own
// remedy.go sketch (see the seams table in the plan this task implements).
type Fix struct {
	// Text is the imperative fix line itself, catalogue grammar 2.5: one clause naming the
	// action and where to take it, capital initial, final period.
	Text string
	// Anchor is the heading anchor in docs/admin/is-it-working.md this fix's own doc section
	// lives at, or "" when the page carries no matching heading yet. "" is legal: this task does
	// not edit the frozen page to manufacture headings.
	Anchor string
	// Actor is whose job carrying this fix out is.
	Actor Actor
	// Outward is true when carrying this fix out changes what the public sees (a DNS record, a
	// zone setting, a sending domain's posture), as opposed to an internal or credential-only
	// change no visitor observes.
	Outward bool
	// Command is the exact command line an operator runs, non-empty only when Actor is
	// ActorOperator and the action is a single complete command; empty when the action is a
	// dashboard step, a registrar change, or a command whose argument this table cannot supply
	// on its own.
	Command string
}

// fixesByCondition is the fix table's engine-Condition half: the three condition ids this tool
// can ever print (spine.Conditions() carries the engine's whole registry, but this tool's checks
// declare only these three; see health's TestFixTableCoversDeclaredIdentities). Every fix line's
// Text and Command here is copied from tool/docs/design/copy-standard.md section 3.5.
var fixesByCondition = map[spine.Condition]Fix{
	spine.ConditionEdgeHTTPSNotForced: {
		Text:    "Turn on Always Use HTTPS for the zone under SSL/TLS, Edge Certificates.",
		Anchor:  "force-https-at-the-edge",
		Actor:   ActorOperator,
		Outward: true,
	},
	spine.ConditionEmailSenderNotOnboarded: {
		Text:    "Run `wrangler email sending enable <domain>` for the apex domain, then deploy again.",
		Anchor:  "onboard-the-sending-domain",
		Actor:   ActorOperator,
		Outward: true,
		Command: "wrangler email sending enable <domain>",
	},
	spine.ConditionConfigObservabilityOff: {
		Text:    "Turn on observability for the Worker in wrangler.jsonc, then deploy again.",
		Anchor:  "turn-on-observability",
		Actor:   ActorDeveloper,
		Outward: false,
	},
}

// fixesByCode is the fix table's tool-owned half, one line per spine.Code health's checks can
// declare. None of these carry an Anchor: docs/admin/is-it-working.md has no heading for any of
// them today (Serving, Delegation, Deploy, Behind, Engine, and an error count, verified
// 2026-09-20; see this task's report). A line marked "not in the catalogue" is this task's own
// addition under tool/docs/design/copy-standard.md section 4.6, reported to the editorial gate
// rather than copied from an existing row.
var fixesByCode = map[spine.Code]Fix{
	// Copied from the catalogue.
	spine.CodeServingMismatch: {
		Text:    "Confirm the Worker route and the zone's DNS record point at this site.",
		Actor:   ActorOperator,
		Outward: false,
	},
	spine.CodeDeployBuildFailed: {
		Text:    "Read the build log in the Cloudflare dashboard, then push a fix.",
		Actor:   ActorDeveloper,
		Outward: true,
	},
	spine.CodeEngineBehind: {
		Text:    "Raise the @glw907/cairn-cms range in package.json, then deploy again.",
		Actor:   ActorDeveloper,
		Outward: true,
	},

	// Not in the catalogue; the plainest fragment satisfying 2.5, reported to the editorial gate.
	spine.CodeHTTPSHSTSOff: {
		Text:    "Turn on HSTS for the zone under SSL/TLS, Edge Certificates.",
		Actor:   ActorOperator,
		Outward: true,
	},
	spine.CodeDelegationWrongNS: {
		Text:    "Point the domain's nameservers at the pair Cloudflare assigned this zone.",
		Actor:   ActorRegistrar,
		Outward: true,
	},
	spine.CodeEmailDMARCMissing: {
		Text:    "Publish a DMARC TXT record for the domain naming a policy other than none.",
		Actor:   ActorOperator,
		Outward: true,
	},
	spine.CodeEmailDMARCNoPolicy: {
		Text:    "Add a p= tag to the domain's DMARC TXT record.",
		Actor:   ActorOperator,
		Outward: true,
	},
	spine.CodeEmailDMARCPolicyNone: {
		Text:    "Change the DMARC record's policy from p=none to p=quarantine or p=reject.",
		Actor:   ActorOperator,
		Outward: true,
	},
	spine.CodeEmailSPFMissing: {
		Text:    "Add Cloudflare's SPF include to the sending subdomain's TXT record.",
		Actor:   ActorOperator,
		Outward: true,
	},
	spine.CodeEmailDKIMMissing: {
		Text:    "Publish a DKIM TXT record for the sending subdomain's provider.",
		Actor:   ActorOperator,
		Outward: true,
	},
	spine.CodeDeployWorkerNotFound: {
		Text:    "Create the Worker in this account with the name the record expects.",
		Actor:   ActorDeveloper,
		Outward: true,
	},
	spine.CodeDeployBuildsNotConnected: {
		Text:    "Connect Workers Builds to this Worker's repository in the Cloudflare dashboard.",
		Actor:   ActorOperator,
		Outward: false,
	},
	spine.CodePublishStaleBranch: {
		Text:    "Open the old branch in the admin and publish it, or delete it if it is abandoned.",
		Actor:   ActorOperator,
		Outward: true,
	},
	spine.CodeErrorsAboveThreshold: {
		Text:    "Read the events named above in Workers Logs, then push a fix.",
		Actor:   ActorDeveloper,
		Outward: true,
	},
	spine.CodeCredsUnauthorized: {
		Text:    "Create a new token, then run `cairn auth set` naming the credential.",
		Actor:   ActorOperator,
		Outward: false,
	},
	spine.CodeCredsForbidden: {
		Text:    "Grant the token the missing permission, or create a new one that carries it.",
		Actor:   ActorOperator,
		Outward: false,
	},
	spine.CodeCredsExpiringSoon: {
		Text:    "Create a new token before this one expires, then run `cairn auth set`.",
		Actor:   ActorOperator,
		Outward: false,
	},
}

// FixForCondition returns the fix line declared Condition, when the fix table carries one.
func FixForCondition(c spine.Condition) (Fix, bool) {
	fix, ok := fixesByCondition[c]
	return fix, ok
}

// FixForCode returns the fix line declared Code, when the fix table carries one.
func FixForCode(c spine.Code) (Fix, bool) {
	fix, ok := fixesByCode[c]
	return fix, ok
}

// FixFor returns the fix line an Outcome's own failure identity resolves to: its Condition when
// it names one, its Code otherwise. An outcome with neither, or with an identity the table does
// not carry a line for, returns false.
func FixFor(o spine.Outcome) (Fix, bool) {
	if o.Condition != spine.ConditionNone {
		return FixForCondition(o.Condition)
	}
	if o.Code != spine.CodeNone {
		return FixForCode(o.Code)
	}
	return Fix{}, false
}

// FixLines returns every fix line's own operator-facing strings, Text and, when it carries one,
// Command: `cmd/copylist` calls this to build `make copy-list`'s output without depending on
// either map's own iteration order (the caller sorts).
func FixLines() []string {
	lines := make([]string, 0, 2*(len(fixesByCondition)+len(fixesByCode)))
	for _, fix := range fixesByCondition {
		lines = append(lines, fix.Text)
		if fix.Command != "" {
			lines = append(lines, fix.Command)
		}
	}
	for _, fix := range fixesByCode {
		lines = append(lines, fix.Text)
		if fix.Command != "" {
			lines = append(lines, fix.Command)
		}
	}
	return lines
}
