package doctor

import (
	"fmt"
	"strings"

	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// checksInOrder is the complete doctor check set cairn doctor runs, in report order: the eight
// file-only checks (spec :153-155) followed by the three facts-dependent checks, the same
// relative order assemble.ts's defaultChecks (:194-208) registers them in, with the checks this
// pass does not port (the Cloudflare and GitHub App chain) left out.
var checksInOrder = []Check{
	ConfigBindings,
	ConfigMediaBucket,
	ConfigObservability,
	ConfigCsrfDisable,
	ConfigSiteConfig,
	ConfigPublicOrigin,
	ConfigNoReferrerBlanket,
	AdminMountShape,
	ConfigDependencyFloors,
	AuthRoleWiring,
	AIPostureEffective,
}

// CheckedResult pairs one Check with the Result its Run produced. A report's per-check line and
// its failure block both need the check's own Label, which lives on Check (its Condition) and
// not on every Result, so the pair travels together the way report.ts's own
// { check, result }[] does (retire-1 plan decision 3).
type CheckedResult struct {
	// Check is the check that ran.
	Check Check
	// Result is the settled outcome Check.Run produced against the run's Snapshot.
	Result Result
}

// Run executes every check in checksInOrder against s, in report order, and pairs each with its
// settled Result.
func Run(s Snapshot) []CheckedResult {
	out := make([]CheckedResult, len(checksInOrder))
	for i, c := range checksInOrder {
		out[i] = CheckedResult{Check: c, Result: c.Run(s)}
	}
	return out
}

// Results returns the Result half of each pair in checked, in order, for doctor.Verdicts to
// fold into the run's exit code.
func Results(checked []CheckedResult) []Result {
	out := make([]Result, len(checked))
	for i, c := range checked {
		out[i] = c.Result
	}
	return out
}

// docsBaseAdmin is the admin docs directory a failure's docs URL resolves against, the same
// shape internal/render/layout.go's own docsBase carries for the health report (retire-1 plan
// decision 6). It is not shared with render: a doctor-to-render import would invert render's own
// dependency direction for one string, so the constant is duplicated here instead.
const docsBaseAdmin = "https://cairn.pub/docs/admin/"

// docsURL builds a failure's docs URL from anchor, a condition's own docsAnchor field shaped
// "<basename>.md#<fragment>": the published address drops the ".md" the mirror carries. Empty
// when anchor itself is empty, so a condition carrying no docsAnchor prints no URL line rather
// than a broken one.
func docsURL(anchor string) string {
	if anchor == "" {
		return ""
	}
	return docsBaseAdmin + strings.Replace(anchor, ".md", "", 1)
}

// conditionText returns id's registry text, panicking on a missing entry the same way
// check_bindings.go's own labelFor does: a check raising a condition the embedded mirror does
// not carry is a build-time defect a report must not paper over.
func conditionText(id spine.Condition) spine.ConditionText {
	text, ok := spine.TextFor(id)
	if !ok {
		panic(fmt.Sprintf("doctor: no registry entry for condition %q", id))
	}
	return text
}

// Format renders checked as cairn doctor's plain-text report, the shape report.ts:22-40
// produces: one "STATUS  Label: detail" line per check, keyed to its own condition's registry
// title, then a why/fix/docs block per failure, then a count summary. No ANSI, so a terminal and
// a CI log read the same. The docs line is this port's own addition; report.ts carries no
// equivalent.
func Format(checked []CheckedResult) string {
	lines := make([]string, 0, len(checked)+8)
	for _, cr := range checked {
		lines = append(lines, fmt.Sprintf("%s  %s: %s", cr.Result.Status, cr.Check.Label(), cr.Result.Detail))
	}

	for _, cr := range checked {
		if cr.Result.Status != StatusFail {
			continue
		}
		text := conditionText(cr.Check.Condition)
		lines = append(lines, "", fmt.Sprintf("%s failed.", cr.Check.Label()),
			"  Why: "+text.Why, "  Fix: "+text.Remediation)
		if url := docsURL(text.DocsAnchor); url != "" {
			lines = append(lines, "  Docs: "+url)
		}
	}

	counts := make(map[Status]int, 5)
	for _, cr := range checked {
		counts[cr.Result.Status]++
	}
	lines = append(lines, "", fmt.Sprintf(
		"%d passed, %d failed, %d skipped, %d info, %d unchecked",
		counts[StatusPass], counts[StatusFail], counts[StatusSkip], counts[StatusInfo], counts[StatusUnchecked],
	))

	return strings.Join(lines, "\n")
}
