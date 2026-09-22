package health

import (
	"fmt"
	"slices"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/providers"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// This file is the messages table tool/docs/design/copy-standard.md section 4.1 requires: every
// detail and skip fragment health's checks print, so no check body composes operator-facing
// prose at its own call site. A check returns its measured values; a function here renders the
// line. Every string is written to the standard's section 2 grammar (2.4 for a detail line, 2.6
// for a skip reason) and copied from its section 3 catalogue entry where one exists; a function
// whose comment says so renders a string the catalogue does not cover, reported to the editorial
// gate per section 4.6.

// detailHTTPSAlwaysUseHTTPSOff renders the https-forced check's Always Use HTTPS half, catalogue
// section 3.4.
func detailHTTPSAlwaysUseHTTPSOff() string {
	return "Always Use HTTPS is off for the zone"
}

// detailHTTPSHSTSOff renders the https-forced check's HSTS half alone, catalogue section 3.4.
func detailHTTPSHSTSOff() string {
	return "HSTS is off for the zone"
}

// detailHTTPSBothOff renders both halves off at once, catalogue section 3.4.
func detailHTTPSBothOff() string {
	return "Always Use HTTPS and HSTS are both off for the zone"
}

// detailHTTPSNoAlwaysUseHTTPSSetting renders the https-forced check's unobservable-zone verdict,
// catalogue section 3.4.
func detailHTTPSNoAlwaysUseHTTPSSetting() string {
	return "Cloudflare returned no Always Use HTTPS setting for the zone"
}

// detailDelegationWrongNameservers renders the delegation check's Failing verdict, catalogue
// section 3.4.
func detailDelegationWrongNameservers() string {
	return "the domain points at nameservers outside this Cloudflare zone"
}

// detailDelegationNoAssignedNS renders the delegation check's own unobservable verdict,
// catalogue section 3.4.
func detailDelegationNoAssignedNS() string {
	return "no assigned nameservers recorded for this site"
}

// detailDelegationNoZone renders the delegation check's own unobservable verdict, catalogue
// section 3.4.
func detailDelegationNoZone() string {
	return "Cloudflare reports no zone for this domain"
}

// detailServingHostnameMismatch renders the serving check's Failing verdict for a hostname that
// answers something other than a home page, catalogue section 3.4.
func detailServingHostnameMismatch() string {
	return "the hostname does not answer"
}

// detailServingNotCairn renders the serving check's Failing verdict for a hostname whose home
// page answers but whose /admin is not cairn's. The catalogue folds this case into the line
// above, which tells an operator the opposite of what the probe found; this is the plainest
// fragment satisfying 2.4, reported to the editorial gate.
func detailServingNotCairn() string {
	return "the hostname answers, but /admin is not cairn's sign-in page"
}

// detailEmailDMARCMissing renders the email check's no-record verdict, catalogue section 3.4.
func detailEmailDMARCMissing() string {
	return "no DMARC record published for the domain"
}

// detailEmailDMARCPolicyNone renders the email check's p=none verdict, catalogue section 3.4.
func detailEmailDMARCPolicyNone() string {
	return "the DMARC record allows every sender (p=none)"
}

// detailEmailDMARCNoPolicy renders the email check's missing-tag verdict, catalogue section 3.4.
func detailEmailDMARCNoPolicy() string {
	return "the DMARC record carries no p= policy"
}

// tmplEmailSPFMissing is detailEmailSPFMissing's own format template, named so `make copy-list`
// can print the template rather than inventing an example include mechanism.
const tmplEmailSPFMissing = "the sending subdomain's SPF record omits %s"

// detailEmailSPFMissing renders the email check's SPF verdict, catalogue section 3.4, naming the
// specific include mechanism the check looked for.
func detailEmailSPFMissing(include string) string {
	return fmt.Sprintf(tmplEmailSPFMissing, include)
}

// detailEmailDKIMMissing renders the email check's DKIM verdict, catalogue section 3.4.
func detailEmailDKIMMissing() string {
	return "no DKIM record found for the sending subdomain"
}

// detailEmailSenderNotOnboarded renders the email check's onboarding verdict, catalogue section
// 3.4.
func detailEmailSenderNotOnboarded() string {
	return "the sending subdomain is not onboarded"
}

// detailDeployWorkerNotFound renders the deploy check's absent-Worker verdict. The catalogue
// carries no row for this case; this is the plainest fragment satisfying 2.4, reported to the
// editorial gate.
func detailDeployWorkerNotFound() string {
	return "the Worker does not exist in this account"
}

// detailDeployBuildsNotConnected renders the deploy check's disconnected-Builds verdict,
// catalogue section 3.4. The clause after the comma is this task's own addition, reported to the
// editorial gate: the bare catalogue line reads as a fault, and the state it names is a site
// deployed some other way.
func detailDeployBuildsNotConnected() string {
	return "Workers Builds is not connected to this Worker, so there is no deployment to read"
}

// detailNoRepoRecorded renders the skipped verdict every repository-reading check returns
// against a record that names none. One fragment serves all three: the fact is the record's, not
// the check's, and three wordings for one fact would read as three different problems. The
// catalogue carries no row; this is the plainest fragment satisfying 2.6, reported to the
// editorial gate.
func detailNoRepoRecorded() string {
	return "no GitHub repository recorded for this site"
}

// detailDeployBuildFailed renders the deploy check's failed-build verdict. The catalogue's own
// build-failed row composes the commit and branch position (3.4's "build failed 26m ago
// (3f0ba18), main is 2 commits ahead"), which belongs to the render layer reading Fields, not to
// this bare Detail fallback; this is the plainest fragment satisfying 2.4, reported to the
// editorial gate.
func detailDeployBuildFailed() string {
	return "the last build did not succeed"
}

// detailPublishNothingWaiting renders the publish-path check's quiet-state verdict: no open
// edit branch, so nothing is waiting on an editor. The catalogue's own row for this state words
// it as an absence of observations ("no cairn branches or publish commits observed"), which
// reads as a failure to measure rather than the ordinary state it names; this is the plainest
// fragment satisfying 2.4, reported to the editorial gate.
func detailPublishNothingWaiting() string {
	return "no edits are waiting to publish"
}

// detailPublishStaleBranches renders the publish-path check's stale-branch verdict. The
// catalogue's publish-path rows assume an App-installation check this package does not run; this
// is the plainest fragment satisfying 2.4 for the branch-staleness verdict this package actually
// measures, reported to the editorial gate.
const (
	tmplPublishStaleBranchSingular = "1 cairn branch is older than 14 days with no later publish"
	tmplPublishStaleBranchesPlural = "%d cairn branches are older than 14 days with no later publish"
)

func detailPublishStaleBranches(count int) string {
	if count == 1 {
		return tmplPublishStaleBranchSingular
	}
	return fmt.Sprintf(tmplPublishStaleBranchesPlural, count)
}

// detailEngineNoCairnDependency renders the engine check's own unobservable verdict, catalogue
// section 3.4.
func detailEngineNoCairnDependency() string {
	return "the site's package.json carries no " + cairnPackageName + " dependency"
}

// detailEngineVersionNotFound renders the engine check's own unobservable verdict, catalogue
// section 3.4.
func detailEngineVersionNotFound() string {
	return "the installed or latest version is not in the published version list"
}

// detailEngineCurrent renders the engine check's up-to-date verdict, catalogue section 3.4.
func detailEngineCurrent(installed string) string {
	return installed + " is current"
}

// tmplEngineBehind is detailEngineBehind's own format template.
const tmplEngineBehind = "%s installed, %s latest, %d releases behind"

// detailEngineBehind renders the engine check's behind-latest verdict, catalogue section 3.4.
func detailEngineBehind(installed, latest string, releasesBehind int) string {
	return fmt.Sprintf(tmplEngineBehind, installed, latest, releasesBehind)
}

// tmplEngineBehindActionableSuffix is the clause detailEngineBehindActionable appends to
// detailEngineBehind's own rendering.
const tmplEngineBehindActionableSuffix = ", with a required change"

// detailEngineBehindActionable renders the engine check's Failing verdict, when a skipped
// release carries an actionable "Consumers must:" change. The catalogue's own behind-latest row
// does not distinguish this case from the OK behind-latest one; this appends the one fact that
// does, reported to the editorial gate.
func detailEngineBehindActionable(installed, latest string, releasesBehind int) string {
	return detailEngineBehind(installed, latest, releasesBehind) + tmplEngineBehindActionableSuffix
}

// errorsWindow renders d the way the catalogue's own count fields do ("0 errors in 24h"): a
// whole number of hours renders bare, and anything else falls back to Go's own duration format
// rather than inventing a second notation.
func errorsWindow(d time.Duration) string {
	if hours := d.Hours(); hours == float64(int64(hours)) {
		return fmt.Sprintf("%dh", int64(hours))
	}
	return d.String()
}

// detailErrorsObservabilityOff renders the errors check's missing-dataset verdict, catalogue
// section 3.4.
func detailErrorsObservabilityOff() string {
	return "the Worker has no observability dataset"
}

// detailAPIRequestRejected renders the Detail every check carries when a provider answered a
// request with HTTP 400. The catalogue carries no row for it: the condition did not exist before
// 2026-09-21, when a live run found cairn's own Workers Logs query body rejected and reported to
// the operator as a site setting they had never turned off. It names cairn as the faulty party
// and points at the one place a report belongs, the shape tmplCommandCrashed already uses for the
// other fault that is never the operator's.
func detailAPIRequestRejected() string {
	return "the provider refused the request cairn sent; this is a bug in cairn, reportable at https://github.com/glw907/cairn-cms/issues"
}

// The format templates detailErrorsCount and detailErrorsAboveThreshold render from. The two
// "at least" forms carry a count the fetch truncated at its own limit: the window holds that many
// records and possibly more, so the line says what was measured rather than passing a floor off as
// an exact number. They extend the catalogue's section 3.4 rows, reported to the editorial gate
// per section 4.6.
const (
	tmplErrorsCount                 = "%d errors in %s"
	tmplErrorsCountAtLeast          = "at least %d errors in %s"
	tmplErrorsAboveThreshold        = "%d errors in %s, above the %d the check allows"
	tmplErrorsAtLeastAboveThreshold = "at least %d errors in %s, above the %d the check allows"
)

// detailErrorsCount renders the errors check's OK verdict, catalogue section 3.4, carrying the
// count and window a trusting reader needs rather than a judgment on them.
func detailErrorsCount(count int, truncated bool, window time.Duration) string {
	if truncated {
		return fmt.Sprintf(tmplErrorsCountAtLeast, count, errorsWindow(window))
	}
	return fmt.Sprintf(tmplErrorsCount, count, errorsWindow(window))
}

// detailErrorsAboveThreshold renders the errors check's Failing verdict, catalogue section 3.4.
func detailErrorsAboveThreshold(count int, truncated bool, window time.Duration, threshold int) string {
	if truncated {
		return fmt.Sprintf(tmplErrorsAtLeastAboveThreshold, count, errorsWindow(window), threshold)
	}
	return fmt.Sprintf(tmplErrorsAboveThreshold, count, errorsWindow(window), threshold)
}

// detailCredsGitHubNoExpiry renders the creds check's non-expiring-token verdict, catalogue
// section 3.4.
func detailCredsGitHubNoExpiry() string {
	return "GitHub reports no expiry for this token"
}

// tmplCredsGitHubExpiring is detailCredsGitHubExpiring's own format template.
const tmplCredsGitHubExpiring = "the GitHub token expires %s, in %d days"

// detailCredsGitHubExpiring renders the creds check's expiring-soon verdict, catalogue section
// 3.4, carrying the expiry date and the days remaining rather than the raw timestamp and reason
// token the check measured internally.
func detailCredsGitHubExpiring(expiry, now time.Time) string {
	daysLeft := int(expiry.Sub(now).Hours() / 24)
	return fmt.Sprintf(tmplCredsGitHubExpiring, expiry.Format("2006-01-02"), daysLeft)
}

// detailCredsUnauthorized renders a credential the provider rejected outright, catalogue section
// 3.4's "Cloudflare rejected the token" generalized across providers: ReasonToOutcome carries no
// provider name of its own, so credentialLine supplies it as this line's own leading word.
func detailCredsUnauthorized() string {
	return "the token was rejected"
}

// detailCredsForbidden renders a credential the provider accepted but refused to act on,
// catalogue section 3.4's "the token lacks the Zone:Read permission" generalized across
// providers, for the same reason detailCredsUnauthorized is generalized.
func detailCredsForbidden() string {
	return "the token lacks a required permission"
}

// reasonPhrases is the prose every reason code prints as. A reason code is cairn's own
// vocabulary, greppable and stable, and it belongs in --json and in a log line; a body printing
// the code itself hands an operator a token to search for rather than the sentence that says
// what the run found. Every code spine publishes has a row here, which
// TestEveryReasonCodeHasAPhrase holds.
//
// The codes name a condition rather than a provider, so the prose does too: a check that fell
// back to its reason has no measured detail to name one with. Each line is written to the copy
// standard's 2.6 grammar for a skip reason; the catalogue carries no rows for these, and the set
// is reported to the editorial gate.
var reasonPhrases = map[spine.ReasonCode]string{
	spine.ReasonCredMissing:     "the token this check reads is not set",
	spine.ReasonCredForbidden:   "the token lacks a permission this check reads",
	spine.ReasonCredRevoked:     "the token was rejected",
	spine.ReasonCredExpiring:    "the token is close to expiry",
	spine.ReasonTimeout:         "the provider did not answer in time",
	spine.ReasonOffline:         "the provider could not be reached",
	spine.ReasonNotRun:          "the check did not run",
	spine.ReasonNotObservable:   "this site exposes nothing for the check to read",
	spine.ReasonRepoNotRecorded: detailNoRepoRecorded(),

	spine.ParkReason(spine.ParkDelegationPropagating):   "the domain's delegation is still propagating",
	spine.ParkReason(spine.ParkDelegationPending):       "the zone is waiting for the domain to be delegated to it",
	spine.ParkReason(spine.ParkHostnameRecordsAbsent):   "the hostname's DNS records are not published yet",
	spine.ParkReason(spine.ParkHostnameResolverLagging): "the resolver has not caught up with the hostname's records",
	spine.ParkReason(spine.ParkCertificatePending):      "the certificate for the hostname is still being issued",
	spine.ParkReason(spine.ParkEmailNotReady):           "the sending subdomain is not ready to send yet",
	spine.ParkReason(spine.ParkEmailSenderPropagating):  "the sending subdomain is still propagating",
	spine.ParkReason(spine.ParkEmailDailyLimit):         "the account has reached its daily send limit",
	spine.ParkReason(spine.ParkBuildsAppNotAuthorized):  "Workers Builds is waiting for the GitHub app to be authorized",
	spine.ParkReason(spine.ParkBuildsRepoNotSelected):   "Workers Builds is waiting for a repository to be chosen",
	spine.ParkReason(spine.ParkBuildNotStarted):         "the build has not started yet",
	spine.ParkReason(spine.ParkBuildRunning):            "the build is still running",
	spine.ParkReason(spine.ParkBuildsReconcileParked):   "the Workers Builds connection is waiting to settle",

	spine.APIReason(providers.ReasonUnauthorized):           detailCredsUnauthorized(),
	spine.APIReason(providers.ReasonForbidden):              detailCredsForbidden(),
	spine.APIReason(providers.ReasonNotFound):               "the provider has no record of what the check asked for",
	spine.APIReason(providers.ReasonBuildsNotConnected):     detailDeployBuildsNotConnected(),
	spine.APIReason(providers.ReasonBuildsRepoNotSelected):  "Workers Builds names no repository for this Worker",
	spine.APIReason(providers.ReasonBuildsAppNotAuthorized): "Workers Builds is not authorized on the GitHub account",
	spine.APIReason(providers.ReasonSenderNotConfigured):    detailEmailSenderNotOnboarded(),
	spine.APIReason(providers.ReasonRateLimited):            "the provider is rate-limiting cairn's requests",
	spine.APIReason(providers.ReasonRequestRejected):        detailAPIRequestRejected(),
	spine.APIReason(providers.ReasonUnknown):                "the provider failed for a reason cairn cannot classify",
}

// ReasonPhrase returns the prose r prints as, and empty for the zero code, which is what a check
// that measured a verdict carries. An unknown code falls back to the one sentence true of every
// reason: the code itself is never printed, since a body's job is to say what happened.
func ReasonPhrase(r spine.ReasonCode) string {
	if r == "" {
		return ""
	}
	if phrase, found := reasonPhrases[r]; found {
		return phrase
	}
	return "the check could not read what it needed"
}

// Catalogue returns every operator-facing string this package's messages table can print: a
// fixed detail or skip fragment rendered as-is, and a parameterized one rendered as its own named
// format template rather than an invented example value. `cmd/copylist` calls this to build
// `make copy-list`'s output; a caller wanting a rendered line for one specific verdict calls the
// package's own detailXxx function instead.
func Catalogue() []string {
	out := []string{
		detailHTTPSAlwaysUseHTTPSOff(),
		detailHTTPSHSTSOff(),
		detailHTTPSBothOff(),
		detailHTTPSNoAlwaysUseHTTPSSetting(),
		detailDelegationWrongNameservers(),
		detailDelegationNoAssignedNS(),
		detailDelegationNoZone(),
		detailServingHostnameMismatch(),
		detailServingNotCairn(),
		detailEmailDMARCMissing(),
		detailEmailDMARCPolicyNone(),
		detailEmailDMARCNoPolicy(),
		tmplEmailSPFMissing,
		detailEmailDKIMMissing(),
		detailEmailSenderNotOnboarded(),
		detailDeployWorkerNotFound(),
		detailDeployBuildsNotConnected(),
		detailNoRepoRecorded(),
		detailDeployBuildFailed(),
		detailPublishNothingWaiting(),
		tmplPublishStaleBranchSingular,
		tmplPublishStaleBranchesPlural,
		detailEngineNoCairnDependency(),
		detailEngineVersionNotFound(),
		detailEngineCurrent("<version>"),
		tmplEngineBehind,
		tmplEngineBehind + tmplEngineBehindActionableSuffix,
		detailErrorsObservabilityOff(),
		detailAPIRequestRejected(),
		tmplErrorsCount,
		tmplErrorsCountAtLeast,
		tmplErrorsAboveThreshold,
		tmplErrorsAtLeastAboveThreshold,
		detailCredsGitHubNoExpiry(),
		tmplCredsGitHubExpiring,
		detailCredsUnauthorized(),
		detailCredsForbidden(),
		ReasonPhrase("reason.unrecognized"),
	}
	// Every reason phrase is an operator-facing line like any other detail, so the whole table
	// joins the catalogue rather than one example of it.
	for _, r := range spine.ReasonCodes() {
		out = append(out, ReasonPhrase(r))
	}
	slices.Sort(out)
	return slices.Compact(out)
}
