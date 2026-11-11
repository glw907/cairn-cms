package setup

import (
	"net/http"
	"slices"
	"strings"

	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
)

// This file is the messages table for setup's stops and for the copy the design left open: one
// entry for every Reason, and the lines the plan's rulings added to the copy deck. Wording
// follows the deck's register. A name setup derives appears as <name>, <repo>, <domain>,
// <host>, <folder>, <app>, <n>, <kind>, <provider>, or <url>, which the call site fills.

// Entry is the fixed copy of one stop, in the parts of a Failure. Left is optional, as it is in
// a Failure: a stop before the first create leaves nothing partway.
type Entry struct {
	// Happened says what went wrong and, where the owner needs it, why.
	Happened string
	// Did says what setup had already created.
	Did string
	// Left says what the stop leaves undone or in place. It may be empty.
	Left string
	// Do says what the owner does next.
	Do string
	// Anchor is the before-you-start.md heading that explains a failure of the opening checks, as
	// a fragment, and is empty for a stop with no such section.
	Anchor string
}

// Anchors of the before-you-start.md sections the opening checks point to.
const (
	anchorComputer   = "#what-you-need-on-your-computer"
	anchorCloudflare = "#what-you-need-on-cloudflare"
)

// kept is the "already did" part of a stop after the first create.
const kept = "The completed steps above are kept."

// entries is keyed by every Reason failure.go declares; messages_test.go enforces that.
var entries = map[Reason]Entry{
	ReasonRemote: {
		Happened: "Setup can't run over SSH or without a display. Setup opens its approval pages in a browser on the computer where it runs.",
		Did:      nothingCreated,
		Do:       "Run cairn new in a terminal on the computer where you use your browser.",
		Anchor:   anchorComputer,
	},
	ReasonGitMissing: {
		Happened: "Setup can't find Git on this computer.",
		Did:      nothingCreated,
		Do:       "Install Git, and then run cairn new again.",
		Anchor:   anchorComputer,
	},
	ReasonNodeMissing: {
		Happened: "Setup can't find Node.js on this computer.",
		Did:      nothingCreated,
		Do:       "Install Node.js 24 or later, and then run cairn new again.",
		Anchor:   anchorComputer,
	},
	ReasonNodeOld: {
		Happened: "Setup needs Node.js 24 or later. This computer has Node.js <n>.",
		Did:      nothingCreated,
		Do:       "Install Node.js 24 or later, and then run cairn new again.",
		Anchor:   anchorComputer,
	},
	ReasonPortInUse: {
		Happened: "Port 49152 is in use. Another setup may be running.",
		Did:      nothingCreated,
		Do:       "Finish or stop the other setup, and then run cairn new again.",
		Anchor:   anchorComputer,
	},
	ReasonKeyring: {
		Happened: "Setup can't use this computer's keyring.",
		Did:      nothingCreated,
		Do:       "Unlock or set up the keyring, and then run cairn new again.",
		Anchor:   anchorComputer,
	},
	ReasonTemplate: {
		Happened: "Setup couldn't get the site template from npm.",
		Did:      nothingCreated,
		Do:       "Check your internet connection, and then run cairn new again.",
		Anchor:   anchorComputer,
	},
	ReasonFolderNotEmpty: {
		Happened: "The folder <folder> already exists here and isn't empty.",
		Did:      nothingCreated,
		Do:       "Move or rename that folder, or run cairn new from another folder.",
		Anchor:   anchorComputer,
	},
	ReasonNoAccount: {
		Happened: "Setup can't find a Cloudflare account for your sign-in.",
		Did:      nothingCreated,
		Do:       "Create a Cloudflare account, and then run cairn new again.",
		Anchor:   anchorCloudflare,
	},
	ReasonNoZones: {
		Happened: "Your Cloudflare account has no domains. The admin sends sign-in links by email, and Cloudflare sends email only from a domain on your account.",
		Did:      nothingCreated,
		Do:       "Register a domain with Cloudflare, or add a domain you already own to Cloudflare. Then run cairn new again.",
		Anchor:   anchorCloudflare,
	},
	ReasonZonePending: {
		Happened: "Your domain <domain> is still being added to Cloudflare.",
		Did:      nothingCreated,
		Do:       "Wait until Cloudflare shows the domain as active, and then run cairn new again.",
		Anchor:   anchorCloudflare,
	},
	ReasonAddressRecords: {
		Happened: "The address <host> already points to another site. It has DNS records in Cloudflare.",
		Did:      nothingCreated,
		Do:       "Remove the DNS records for <host> in Cloudflare, or choose another address. Then run cairn new again.",
	},
	ReasonAddressInUse: {
		Happened: "A Worker already serves <host>.",
		Did:      nothingCreated,
		Do:       "Remove the custom domain or route for <host> from that Worker in Cloudflare, or choose another address. Then run cairn new again.",
	},
	ReasonNamesTaken: {
		Happened: "Every name from <repo> to <repo>-9 is already in use.",
		Did:      nothingCreated,
		Do:       "Choose another site name, and then run cairn new again.",
	},
	ReasonDeclined: {
		Happened: "Cloudflare didn't approve setup's request.",
		Did:      nothingCreated,
		Do:       "Run cairn new again. On the Cloudflare page, turn on API Tokens Write under Sensitive scopes, and then select Authorize.",
	},
	ReasonKeyringWrite: {
		Happened: "Setup couldn't store a credential in the keyring.",
		Did:      kept,
		Do:       "Delete the GitHub App at <url>. Then unlock the keyring and run cairn new again.",
	},
	ReasonInstallDelete: {
		Happened: "The GitHub App <app> may still have access to all your repositories.",
		Did:      kept,
		Left:     "Setup couldn't confirm that the App's access is limited to <repo>.",
		Do:       "Remove the App's installation at <url>, and then run cairn new again. When GitHub asks, select Approve to give the App access to <repo> only.",
	},
	ReasonChainTimeout: {
		Happened: "The 30-minute limit to approve the requests ran out.",
		Did:      kept,
		Do:       "Run cairn new again to resume.",
	},
	ReasonStopped: {
		Happened: "Setup stopped.",
		Did:      kept,
		Do:       "To resume, run cairn new again.",
	},
	ReasonProvider: {
		Happened: "A request to <provider> failed, or setup stopped on an unexpected error.",
		Did:      kept,
		Do:       "Check your internet connection, and then run cairn new again.",
	},
	ReasonRecord: {
		Happened: "Setup couldn't save its record of this run.",
		Did:      kept,
		Do:       "Check that your home folder is writable, and then run cairn new again.",
	},
	ReasonGrantSpent: {
		Happened: "Cloudflare no longer accepts setup's approval.",
		Did:      kept,
		Do:       "Run cairn new again. On the Cloudflare page, turn on API Tokens Write under Sensitive scopes, and then select Authorize.",
	},
	ReasonAccountMissing: {
		Happened: "The Cloudflare approval doesn't include the account that setup started with.",
		Did:      kept,
		Do:       "Run cairn new again. On the Cloudflare page, check that the account shown is the same as before, turn on API Tokens Write under Sensitive scopes, and then select Authorize.",
	},
	ReasonNotOurs: {
		Happened: "A <kind> named <name> already exists on your Cloudflare account. Setup can't confirm that it created this <kind>.",
		Did:      kept,
		Do:       "If you don't need it, delete the <kind> in Cloudflare. If you need it, choose another site name. Then run cairn new again.",
	},
	ReasonFolderNotOurs: {
		Happened: "The folder <folder> changed after setup wrote the site there.",
		Did:      kept,
		Do:       "Undo your changes in that folder, and then run cairn new again.",
	},
	ReasonScaffold: {
		Happened: "Setup couldn't write the site into <folder>.",
		Did:      nothingCreated,
		Do:       "Check that the folder is writable, and then run cairn new again.",
	},
	ReasonWorkerExists: {
		Happened: "A Worker named <name> appeared on your Cloudflare account while setup ran.",
		Did:      kept,
		Do:       "Delete that Worker or rename it in Cloudflare, and then run cairn new again.",
	},
	ReasonRemoteDiffers: {
		Happened: "The repository <repo> already holds commits setup didn't make.",
		Did:      kept,
		Do:       "Remove those commits or delete the repository. Then run cairn new again.",
	},
	ReasonPush: {
		Happened: "Setup couldn't push the site to GitHub.",
		Did:      kept,
		Do:       "Check your internet connection, and then run cairn new again.",
	},
	ReasonDeployFailed: {
		Happened: "The first deploy failed in GitHub Actions.",
		Did:      kept,
		Do:       "If the account isn't on Workers Paid, the first deploy fails: check the plan first. Open the run at <url> to see what failed. Then run cairn new again. Setup resumes at the first deploy.",
	},
	ReasonDeployTimeout: {
		Happened: "The first deploy didn't finish within 30 minutes.",
		Did:      kept,
		Do:       "On GitHub, open the Actions tab of <repo> to see whether the deploy is still running. Then run cairn new again. Setup resumes at the first deploy.",
	},
	ReasonHTTPSTimeout: {
		Happened: "The site didn't answer over HTTPS at <host> within 15 minutes.",
		Did:      kept,
		Do:       "Wait a few minutes, and then run cairn new again. Setup resumes at the Connect <domain> step.",
	},
	ReasonTokenMissing: {
		Happened: lineTokenMissing,
		Did:      kept,
		Do:       lineTokenAgain,
	},
	// ReasonRefused is the agent lane's stop: its caller words each Happened and Do, so this entry
	// is the fixed fallback for a view that cannot.
	ReasonRefused: {
		Happened: "Setup couldn't use an answer it was given.",
		Did:      "Setup keeps what it already created.",
		Do:       "Correct the answer, and then run cairn new again.",
	},
}

// Lines the copy deck did not word, each from a ruling that changed a screen.
const (
	// LineSlugNoLetters is the site-name error for a name that yields no repository name, such
	// as one written only in another script.
	LineSlugNoLetters = "Enter a name that has at least one number or one letter from A to Z."
	// LineSignInStep replaces the watch sentence for the sign-in step, since the confirm page
	// takes one more click.
	LineSignInStep = "Setup emails you a one-time sign-in link and opens your site in the setup tab. Select Confirm sign-in there."
	// LineDoneOpen replaces the done screen's signed-in sentence when the setup tab's link was
	// not consumed.
	LineDoneOpen = "Your site is open in the setup tab. Select Confirm sign-in there, or use the link in your email."
	// linePageFooter is the done page's footer, which names the click.
	linePageFooter = "Keep this tab open. When setup finishes, your site opens here. Select Confirm sign-in to open the admin."
	// lineLinkExpired is the sign-in email's line for a link that has expired.
	lineLinkExpired = "If the link has expired, request a new one on the sign-in page."
	// lineAppNameTaken joins the Create waiting sentence for a GitHub App name another owner
	// holds.
	lineAppNameTaken = "If GitHub says the name is taken, change it on that page. Setup uses the name you choose."
	// lineTokenMissing and lineTokenAgain are the stop of a resume whose run began with a
	// Cloudflare token when the token's variable is no longer set.
	lineTokenMissing = "This setup began with a Cloudflare API token from " + TokenVariable + ", and that variable isn't set."
	lineTokenAgain   = "Set " + TokenVariable + " to the same token, and then run cairn new again."
	// LineTokenStored is what a token run did once its deploy-key step passed: the token itself
	// went into the repository's secrets, and only the owner can revoke it. A stop's "already did"
	// part and the done screen both say it.
	LineTokenStored = "Setup stored your Cloudflare API token as an Actions secret in your GitHub repository, where every deploy uses it. When the site no longer needs the token, revoke it in Cloudflare."
)

// What a provider said, worded for the owner. providerStop picks among them by status and by
// provider, and <provider> is the provider's name.
const (
	lineProviderRefused   = "<provider> refused a request because setup's credential is missing a permission."
	lineProviderNoCred    = "<provider> didn't accept setup's credential."
	lineProviderLimiting  = "<provider> is limiting requests."
	lineProviderDown      = "<provider> had a problem on its side."
	lineProviderRejected  = "<provider> rejected a request."
	lineGivePermissions   = "Give the token every permission that `cairn help agents` lists, and then run cairn new again."
	lineCheckToken        = "Check that the token in CAIRN_CF_SETUP_TOKEN is valid and hasn't expired, and then run cairn new again."
	lineApprovePermission = "Run cairn new again, and approve every permission the <provider> page lists."
	lineWaitAndRun        = "Wait a few minutes, and then run cairn new again."
	lineReadDetail        = "Read the detail line, and then run cairn new again."
)

// providerStop is the Happened and Do sentences for a request to provider that came back with
// status and the reason the providers package classified it to. A 403 that carries a rate limit
// is a wait, never a missing permission. Only a Cloudflare run with a token sets that credential itself, so only its Do points at
// the token. Any other credential is an approval the owner gives again on the provider's page.
func providerStop(provider string, status int, reason providers.Reason, token bool) (happened, do string) {
	tokenRun := token && provider == "Cloudflare"
	var h string
	switch {
	case reason == providers.ReasonRateLimited || status == http.StatusTooManyRequests:
		h, do = lineProviderLimiting, lineWaitAndRun
	case status == http.StatusUnauthorized:
		h, do = lineProviderNoCred, lineApprovePermission
		if tokenRun {
			do = lineCheckToken
		}
	case status == http.StatusForbidden:
		h, do = lineProviderRefused, lineApprovePermission
		if tokenRun {
			do = lineGivePermissions
		}
	case status >= 500 && status <= 599:
		h, do = lineProviderDown, lineWaitAndRun
	default:
		h, do = lineProviderRejected, lineReadDetail
	}
	return strings.ReplaceAll(h, "<provider>", provider), strings.ReplaceAll(do, "<provider>", provider)
}

// Catalogue returns every string this table carries, for the copy golden.
func Catalogue() []string {
	var out []string
	for _, e := range entries {
		out = append(out, e.Happened, e.Did, e.Left, e.Do)
	}
	out = append(out, lineProviderRefused, lineProviderNoCred, lineProviderLimiting, lineProviderDown, lineProviderRejected,
		lineGivePermissions, lineCheckToken, lineApprovePermission, lineWaitAndRun, lineReadDetail)
	out = append(out, LineSlugNoLetters, LineSignInStep, LineDoneOpen, linePageFooter, lineLinkExpired, lineAppNameTaken,
		LineTokenStored, ProblemEmail, ProblemAddress, ProblemHost)
	return slices.DeleteFunc(out, func(s string) bool { return s == "" })
}

// Anchor returns the before-you-start.md heading, as a fragment, that explains a failure of the
// opening checks. It is empty for a reason with no such section.
func Anchor(r Reason) string { return entries[r].Anchor }
