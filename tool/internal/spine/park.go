package spine

// ParkCode is the vocabulary the hold loop and park pages use to describe a wait-kind outcome:
// nothing is wrong, something just takes time. A ParkCode is never written to a record's "step"
// field.
type ParkCode string

// The park codes ported from the Cloudflare chapter's own error catalogue rows whose kind is
// "wait" (packages/create-cairn-site/src/cloudflare/catalogue.mjs).
const (
	ParkDelegationPropagating   ParkCode = "delegation-propagating"
	ParkDelegationPending       ParkCode = "delegation-pending"
	ParkHostnameRecordsAbsent   ParkCode = "hostname-records-absent"
	ParkHostnameResolverLagging ParkCode = "hostname-resolver-lagging"
	ParkCertificatePending      ParkCode = "certificate-pending"
	ParkEmailNotReady           ParkCode = "email-not-ready"
	ParkEmailSenderPropagating  ParkCode = "email-sender-propagating"
	ParkEmailDailyLimit         ParkCode = "email-daily-limit"
	ParkBuildsAppNotAuthorized  ParkCode = "builds-app-not-authorized"
	ParkBuildsRepoNotSelected   ParkCode = "builds-repo-not-selected"
	ParkBuildNotStarted         ParkCode = "build-not-started"
	ParkBuildRunning            ParkCode = "build-running"
	ParkBuildsReconcileParked   ParkCode = "builds-reconcile-parked"
)
