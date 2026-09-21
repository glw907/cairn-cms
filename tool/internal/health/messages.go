package health

import (
	"fmt"
	"time"
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

// detailServingHostnameMismatch renders the serving check's Failing verdict, catalogue section
// 3.4.
func detailServingHostnameMismatch() string {
	return "the hostname does not answer"
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
// catalogue section 3.4.
func detailDeployBuildsNotConnected() string {
	return "Workers Builds is not connected to this Worker"
}

// detailDeployBuildFailed renders the deploy check's failed-build verdict. The catalogue's own
// build-failed row composes the commit and branch position (3.4's "build failed 26m ago
// (3f0ba18), main is 2 commits ahead"), which belongs to the render layer reading Fields, not to
// this bare Detail fallback; this is the plainest fragment satisfying 2.4, reported to the
// editorial gate.
func detailDeployBuildFailed() string {
	return "the last build did not succeed"
}

// detailPublishNoActivity renders the publish-path check's own unobservable verdict, catalogue
// section 3.4 (kept verbatim).
func detailPublishNoActivity() string {
	return "no cairn branches or publish commits observed"
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

// detailDeployCredMissing renders the deploy check's own skipped verdict when no Workers Builds
// credential answered. Its siblings report the same reason with no Detail, which leaves the plain
// body printing the bare reason code; the catalogue carries no row, so this is the plainest
// fragment satisfying 2.4.
func detailDeployCredMissing() string {
	return "no Workers Builds credential to read the deployment with"
}

// The format templates detailErrorsCount and detailErrorsAboveThreshold render from.
const (
	tmplErrorsCount          = "%d errors in %s"
	tmplErrorsAboveThreshold = "%d errors in %s, above the %d the check allows"
)

// detailErrorsCount renders the errors check's OK verdict, catalogue section 3.4, carrying the
// count and window a trusting reader needs rather than a judgment on them.
func detailErrorsCount(count int, window time.Duration) string {
	return fmt.Sprintf(tmplErrorsCount, count, errorsWindow(window))
}

// detailErrorsAboveThreshold renders the errors check's Failing verdict, catalogue section 3.4.
func detailErrorsAboveThreshold(count int, window time.Duration, threshold int) string {
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

// Catalogue returns every operator-facing string this package's messages table can print: a
// fixed detail or skip fragment rendered as-is, and a parameterized one rendered as its own named
// format template rather than an invented example value. `cmd/copylist` calls this to build
// `make copy-list`'s output; a caller wanting a rendered line for one specific verdict calls the
// package's own detailXxx function instead.
func Catalogue() []string {
	return []string{
		detailHTTPSAlwaysUseHTTPSOff(),
		detailHTTPSHSTSOff(),
		detailHTTPSBothOff(),
		detailHTTPSNoAlwaysUseHTTPSSetting(),
		detailDelegationWrongNameservers(),
		detailDelegationNoAssignedNS(),
		detailDelegationNoZone(),
		detailServingHostnameMismatch(),
		detailEmailDMARCMissing(),
		detailEmailDMARCPolicyNone(),
		detailEmailDMARCNoPolicy(),
		tmplEmailSPFMissing,
		detailEmailDKIMMissing(),
		detailEmailSenderNotOnboarded(),
		detailDeployWorkerNotFound(),
		detailDeployBuildsNotConnected(),
		detailDeployBuildFailed(),
		detailPublishNoActivity(),
		tmplPublishStaleBranchSingular,
		tmplPublishStaleBranchesPlural,
		detailEngineNoCairnDependency(),
		detailEngineVersionNotFound(),
		detailEngineCurrent("<version>"),
		tmplEngineBehind,
		tmplEngineBehind + tmplEngineBehindActionableSuffix,
		detailErrorsObservabilityOff(),
		detailAPIRequestRejected(),
		detailDeployCredMissing(),
		tmplErrorsCount,
		tmplErrorsAboveThreshold,
		detailCredsGitHubNoExpiry(),
		tmplCredsGitHubExpiring,
		detailCredsUnauthorized(),
		detailCredsForbidden(),
	}
}
