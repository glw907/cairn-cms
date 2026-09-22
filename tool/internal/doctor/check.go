package doctor

import "github.com/glw907/cairn-cms/tool/internal/spine"

// Check is one doctor measurement: a pure function over a Snapshot, holding no client and
// reading no clock of its own. Unlike health.Check (internal/health/health.go), it takes no
// record.Record: a directory preflight has no site record to read.
type Check struct {
	// ID names the check, stable across releases.
	ID string
	// Condition is the cairn-doctor condition id this check's failure raises. A check whose
	// failure raises no catalogued condition leaves this spine.ConditionNone.
	Condition spine.Condition
	// Run measures s and returns the check's settled Result.
	Run func(s Snapshot) Result
}

// Checks is the complete doctor check set, in report order. It is a literal slice, never
// populated by init(), the same shape health.All uses (internal/health/health.go:73-83). It is
// empty until later work registers a check of its own.
var Checks = []Check{}

// Catalogue returns every operator-facing string this package's own checks contribute.
// cmd/copylist lists it alongside health, spine, and cmd/cairn so a new string cannot land
// invisibly. Each check_*.go file owns the strings its own checks print; this function only
// collects them.
func Catalogue() []string {
	return []string{
		noWranglerFoundDetail,
		bindingEmailMissing,
		bindingAuthDBMissing,
		detailBindingsPresent,
		tmplBindingsMissing,
		detailObservabilityOff,
		detailObservabilityOn,
		detailPublicOriginUnconfigured,
		tmplPublicOriginNotAURL,
		tmplPublicOriginNotHTTPS,
		tmplPublicOriginPass,
		detailPublicOriginSkip,
		detailSiteConfigPass,
		tmplSiteConfigNotFound,
		detailEnginePackageJSONNotFound,
		detailEnginePackageJSONInvalid,
		detailNoLockfileFound,
		detailNpmLockParseFailed,
		detailNpmLockNoPackagesMap,
		detailPnpmLockParseFailed,
		tmplCaretRangeSkip,
		tmplPrereleaseSkip,
		tmplBelowFloorFail,
		tmplOutsideMajorFail,
		tmplPassSatisfied,
		tmplNpmMissingEntry,
		tmplPnpmMissingEntry,
		tmplYarnMissingEntry,
		uncheckedCsrfDetail,
		failCsrfNoDisable,
		failCsrfNoGuard,
		passCsrfWired,
		noReferrerRemedy,
		noReferrerDocsAnchor,
		tmplNoReferrerSkip,
		tmplNoReferrerFail,
		tmplNoReferrerPass,
		adminMountGuidance,
		passAdminMountWired,
		factsAbsentDetail,
		skipConfigMediaBucketNone,
		tmplConfigMediaBucketFail,
		tmplConfigMediaBucketPass,
		skipNoCustomRoles,
		infoRoleWiringNoHooksFile,
		infoRoleWiringAbsent,
		infoRoleWiringIndirect,
		tmplRoleWiringUnwired,
		passRoleWiringWired,
		tmplPostureManagedLayerNote,
		postureManagedLayerForeignSignalClause,
		tmplPostureForeignSignalNote,
		postureUnsetNote,
		tmplPostureDeclaredMatch,
		tmplPostureDeclaredMismatch,
		postureNoDirectivesConsistent,
		tmplPostureObservedInstead,
		tmplPostureUnsetWithOutside,
		tmplPostureUnsetNoDirectives,
		tmplPostureUnsetObserved,
		detailPostureNoOrigin,
		detailPostureBadOrigin,
		detailPostureUnreachable,
		detailPostureNonOK,
	}
}
