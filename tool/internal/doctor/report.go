package doctor

import (
	"fmt"
	"strings"
)

// docsBaseAdmin is the admin docs directory a failure's docs URL resolves against, the same
// shape internal/render/layout.go's own fixAnchorBase carries for the health report. It is not
// shared with render: a doctor-to-render import would invert render's own dependency direction
// for one string, so the constant is duplicated here instead.
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

// Format renders checked as cairn doctor's plain-text report: one "STATUS  Label: detail" line per
// check, keyed to its own condition's registry title, then a why/fix/docs block per failure, then a
// count summary. No ANSI, so a terminal and a CI log read the same.
func Format(checked []CheckedResult) string {
	lines := make([]string, 0, len(checked)+8)
	for _, cr := range checked {
		lines = append(lines, fmt.Sprintf("%s  %s: %s", cr.Result.Status, cr.Check.label(), cr.Result.Detail))
	}

	for _, cr := range checked {
		if cr.Result.Status != StatusFail {
			continue
		}
		text := conditionText(cr.Check.Condition)
		lines = append(lines, "", fmt.Sprintf("%s failed.", cr.Check.label()),
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

// joinOr joins a list of names the way a sentence offers alternatives, matching the copy
// standard's serial "or": "a or b" for two, and commas with a serial comma before the trailing
// "or" for three or more.
func joinOr(items []string) string {
	switch len(items) {
	case 0:
		return ""
	case 1:
		return items[0]
	case 2:
		return items[0] + " or " + items[1]
	default:
		return strings.Join(items[:len(items)-1], ", ") + ", or " + items[len(items)-1]
	}
}
