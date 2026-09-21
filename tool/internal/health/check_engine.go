package health

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"

	"github.com/glw907/cairn-cms/tool/internal/record"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// cairnPackageName is the npm package name the Engine check compares a site's own dependency
// range against.
const cairnPackageName = "@glw907/cairn-cms"

// engineOwner and engineRepo name this tool's own engine repository, the second repository the
// Engine check reads besides the site under test: its CHANGELOG.md is the only source of a
// skipped version's "Consumers must:" line.
const (
	engineOwner = "glw907"
	engineRepo  = "cairn-cms"
)

// changelogHeading matches one of engineRepo's own CHANGELOG.md release headings, the post-cut
// shape reconciliation row 21 describes: "## " followed by a bare semantic version, with nothing
// else on the line. It does not match "## Unreleased", which carries no version to key a section
// by.
var changelogHeading = regexp.MustCompile(`(?m)^##\s+([0-9][^\s]*)\s*$`)

// consumersMustLine matches a "Consumers must:" line's own lead-in, optionally wrapped in Markdown
// bold, capturing the text up to the end of its sentence so a caller can tell an actionable
// requirement from a plain "nothing" the way engineRepo's own changelog writes one.
var consumersMustLine = regexp.MustCompile(`(?i)\*{0,2}Consumers must:\*{0,2}\s*([^.\n]*)`)

// EngineDetail is engineCheck's own internal measurement, flattened into Fields as a "count"
// entry (releases behind) and a "state" entry (whether a skipped release carries an actionable
// "Consumers must:" line): both keys are already in report.go's nonVerboseFieldKeys allowlist, so
// no new key is introduced here.
type EngineDetail struct {
	// ReleasesBehind is how many published versions of cairnPackageName the site's own dependency
	// range has not yet taken, up to and including the latest.
	ReleasesBehind int
	// ConsumersMust reports whether any skipped release's changelog section carries an actionable
	// "Consumers must:" line, one whose own text does not read "nothing".
	ConsumersMust bool
}

// fields flattens d into its two ordered spine.OutcomeField entries.
func (d EngineDetail) fields() []spine.OutcomeField {
	return []spine.OutcomeField{
		field("count", d.ReleasesBehind),
		field("state", d.ConsumersMust),
	}
}

// outcome builds the spine.Outcome engineCheck.Run returns for state and detail, always
// flattening d into its two Fields entries regardless of which branch of Run reached it.
func (d EngineDetail) outcome(state spine.State, detail string) spine.Outcome {
	return spine.Outcome{State: state, Detail: detail, Fields: d.fields()}
}

// engineCheck compares a site's own `@glw907/cairn-cms` dependency range against the latest
// published version, and, when it is behind, whether any release it has not yet taken carries a
// breaking "Consumers must:" line.
type engineCheck struct{}

// ID implements Check.
func (engineCheck) ID() string { return "engine" }

// Needs implements Check. Engine reads the site's own package.json and engineRepo's CHANGELOG.md
// through GitHub; the npm registry read that follows needs no credential.
func (engineCheck) Needs() Tier { return TierGH }

// manifestDependencyRange returns manifest's own "dependencies" or, failing that,
// "devDependencies" entry for cairnPackageName, and whether either carried one.
func manifestDependencyRange(manifest []byte) (string, bool) {
	var parsed struct {
		Dependencies    map[string]string `json:"dependencies"`
		DevDependencies map[string]string `json:"devDependencies"`
	}
	if err := json.Unmarshal(manifest, &parsed); err != nil {
		return "", false
	}
	if r, ok := parsed.Dependencies[cairnPackageName]; ok {
		return r, true
	}
	r, ok := parsed.DevDependencies[cairnPackageName]
	return r, ok
}

// baseVersion strips a semver range's leading operator (^, ~, >=, and so on) and any trailing
// range clause after the first whitespace, returning the bare version its own first comparator
// names.
func baseVersion(rng string) string {
	rng = strings.TrimSpace(rng)
	if i := strings.IndexAny(rng, " \t"); i >= 0 {
		rng = rng[:i]
	}
	return strings.TrimLeft(rng, "^~=<> ")
}

// indexOfVersion returns version's position in versions, or -1 when versions carries no exact
// match.
func indexOfVersion(versions []string, version string) int {
	for i, v := range versions {
		if v == version {
			return i
		}
	}
	return -1
}

// changelogSections splits changelog into the text of each release section, keyed by its own
// version heading, from just after that heading to just before the next one (or the document's
// end).
func changelogSections(changelog []byte) map[string]string {
	text := string(changelog)
	matches := changelogHeading.FindAllStringSubmatchIndex(text, -1)
	sections := make(map[string]string, len(matches))
	for i, m := range matches {
		version := text[m[2]:m[3]]
		start := m[1]
		end := len(text)
		if i+1 < len(matches) {
			end = matches[i+1][0]
		}
		sections[version] = text[start:end]
	}
	return sections
}

// sectionHasActionableConsumersMust reports whether section carries a "Consumers must:" line
// whose own text does not read "nothing": a bullet that reads "Consumers must: nothing" (with any
// trailing clause) is additive and asks nothing of a consumer, so it does not count.
func sectionHasActionableConsumersMust(section string) bool {
	normalized := strings.Join(strings.Fields(section), " ")
	for _, m := range consumersMustLine.FindAllStringSubmatch(normalized, -1) {
		remainder := strings.TrimSpace(m[1])
		if remainder == "" {
			continue
		}
		if !strings.HasPrefix(strings.ToLower(remainder), "nothing") {
			return true
		}
	}
	return false
}

// skippedVersions returns the versions strictly after siteVersion up to and including latest, in
// versions' own publish order, or nil when the site is already current or ahead.
func skippedVersions(versions []string, siteIndex, latestIndex int) []string {
	if siteIndex >= latestIndex {
		return nil
	}
	return versions[siteIndex+1 : latestIndex+1]
}

// Run implements Check.
func (engineCheck) Run(ctx context.Context, r record.Record, c Clients, _ Options) spine.Outcome {
	manifest, err := c.GH.FileAtRef(ctx, r.GitHub.Repo.Owner, r.GitHub.Repo.Repo, "package.json", defaultBranch(r))
	if err != nil {
		return apiErrorOutcome(err)
	}
	rng, ok := manifestDependencyRange(manifest)
	if !ok {
		return spine.Outcome{State: spine.Unknown, Reason: spine.ReasonNotObservable, Detail: "site package.json carries no " + cairnPackageName + " dependency"}
	}
	siteVersion := baseVersion(rng)

	versions, err := c.NPM.Versions(ctx, cairnPackageName)
	if err != nil {
		return apiErrorOutcome(err)
	}
	latest, err := c.NPM.Latest(ctx, cairnPackageName)
	if err != nil {
		return apiErrorOutcome(err)
	}

	siteIndex := indexOfVersion(versions, siteVersion)
	latestIndex := indexOfVersion(versions, latest)
	if siteIndex < 0 || latestIndex < 0 {
		return spine.Outcome{State: spine.Unknown, Reason: spine.ReasonNotObservable, Detail: "site or latest version not found in the published version list"}
	}

	skipped := skippedVersions(versions, siteIndex, latestIndex)
	if len(skipped) == 0 {
		return EngineDetail{}.outcome(spine.OK, "")
	}

	changelog, err := c.GH.FileAtRef(ctx, engineOwner, engineRepo, "CHANGELOG.md", "main")
	if err != nil {
		return apiErrorOutcome(err)
	}
	sections := changelogSections(changelog)

	actionable := false
	for _, version := range skipped {
		if sectionHasActionableConsumersMust(sections[version]) {
			actionable = true
			break
		}
	}

	detail := EngineDetail{ReleasesBehind: len(skipped), ConsumersMust: actionable}
	if actionable {
		return detail.outcome(spine.Failing, fmt.Sprintf("%d release(s) behind with a consumers-must change", len(skipped)))
	}
	return detail.outcome(spine.OK, fmt.Sprintf("%d release(s) behind", len(skipped)))
}
