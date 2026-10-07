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

// Label returns c's registry-sourced label: its condition's title in the embedded mirror. A
// check with no condition (Condition: spine.ConditionNone) has no label of its own.
func (c Check) Label() string {
	return conditionText(c.Condition).Title
}

// The five Result constructors below leave ID unset: Run stamps every Result with its own
// Check's ID, so a check body never restates the id its Check already declares.

// passResult builds a StatusPass Result, the common case every check's own pass path shares.
func passResult(detail string) Result {
	return Result{Status: StatusPass, Detail: detail}
}

// failResult builds a StatusFail Result, reading its severity from the registry rather than a
// literal so a check can never disagree with its own condition's declared severity.
func failResult(condition spine.Condition, detail string) Result {
	return Result{Condition: condition, Status: StatusFail, Severity: conditionText(condition).Severity, Detail: detail}
}

// skipResult builds a StatusSkip Result.
func skipResult(detail string) Result {
	return Result{Status: StatusSkip, Detail: detail}
}

// infoResult builds a StatusInfo Result: a passing check carrying a note, never a failure.
func infoResult(detail string) Result {
	return Result{Status: StatusInfo, Detail: detail}
}

// uncheckedResult builds a StatusUnchecked Result: the check's precondition was not observable,
// a containment refusal or an absent required input among the causes.
func uncheckedResult(detail string) Result {
	return Result{Status: StatusUnchecked, Detail: detail}
}

// hooksCandidatePaths are the two spellings a site's hooks module might use, .ts checked first.
var hooksCandidatePaths = []string{"src/hooks.server.ts", "src/hooks.server.js"}

// readHooksSource reads the site's hooks module under either spelling, .ts preferred, returning
// the path it read from alongside the text so a failure can name the file. found is false when
// neither candidate exists. Two checks read the same file: auth.role-wiring and
// config.no-referrer-blanket.
func readHooksSource(s Snapshot) (text, path string, found bool, err error) {
	body, path, found, err := s.readFirst(hooksCandidatePaths)
	return string(body), path, found, err
}
