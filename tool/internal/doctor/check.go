package doctor

import (
	"fmt"

	"github.com/glw907/cairn-cms/tool/internal/spine"
)

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
		sourceWranglerVars,
		sourceEnvironment,
		detailSiteConfigPass,
		tmplSiteConfigNotFound,
		detailEnginePackageJSONNotFound,
		detailEnginePackageJSONInvalid,
		tmplNoLockfileFound,
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
		tmplUnexpectedLockfile,
		tmplCsrfNoViteConfig,
		detailCsrfSvelteConfigMoved,
		tmplCsrfUnreadable,
		tmplCsrfFail,
		tmplCsrfPassNoKey,
		tmplCsrfPassEntries,
		tmplCsrfPlainHTTP,
		clauseCsrfWildcard,
		clauseCsrfNull,
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
		tmplRoleWiringNoHooksFile,
		tmplRoleWiringAbsent,
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

// conditionText returns id's registry text from the embedded condition mirror. A missing entry for
// a condition this package raises is a build-time defect, so it panics rather than letting a report
// print an empty label or a zero severity.
func conditionText(id spine.Condition) spine.ConditionText {
	text, ok := spine.TextFor(id)
	if !ok {
		panic(fmt.Sprintf("doctor: no registry entry for condition %q", id))
	}
	return text
}

// label returns c's registry-sourced label: its condition's title in the embedded mirror. A
// check with no condition (Condition: spine.ConditionNone) has no label of its own.
func (c Check) label() string {
	return conditionText(c.Condition).Title
}

// checks is the complete doctor check set cairn doctor runs, in report order: the eight
// file-only checks followed by the three facts-dependent checks.
var checks = []Check{
	configBindings,
	configMediaBucket,
	configObservability,
	configCsrfTrustedOrigins,
	configSiteConfig,
	configPublicOrigin,
	configNoReferrerBlanket,
	adminMountShape,
	configDependencyFloors,
	authRoleWiring,
	aiPostureEffective,
}

// CheckedResult pairs one Check with the Result its Run produced. A report's per-check line and its
// failure block both need the check's own label, which lives on Check (its Condition) and not on
// every Result, so the pair travels together.
type CheckedResult struct {
	// Check is the check that ran.
	Check Check
	// Result is the settled outcome Check.Run produced against the run's Snapshot.
	Result Result
}

// Run executes every check in checks against s, in report order, and pairs each with its stamped
// Result.
func Run(s Snapshot) []CheckedResult {
	out := make([]CheckedResult, len(checks))
	for i, c := range checks {
		out[i] = runCheck(c, s)
	}
	return out
}

// runCheck runs c against s and stamps the Result with c's ID and, on a fail, the severity c's
// condition declares in the registry, so a check can never disagree with its own condition.
func runCheck(c Check, s Snapshot) CheckedResult {
	result := c.Run(s)
	result.ID = c.ID
	if result.Status == StatusFail {
		result.Severity = conditionText(c.Condition).Severity
	}
	return CheckedResult{Check: c, Result: result}
}
