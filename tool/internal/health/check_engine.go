package health

import (
	"context"
	"encoding/json"
	"regexp"
	"slices"
	"strings"

	"github.com/glw907/cairn-cms/tool/internal/record"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// cairnPackageName is the npm package name the Engine check compares a site's dependency
// range against.
const cairnPackageName = "@glw907/cairn-cms"

// engineOwner and engineRepo name this tool's engine repository, the second repository the
// Engine check reads besides the site under test: its CHANGELOG.md is the only source of a
// skipped version's "Consumers must:" line.
const (
	engineOwner = "glw907"
	engineRepo  = "cairn-cms"
)

// changelogHeading matches one of engineRepo's CHANGELOG.md release headings: "## " followed
// by a bare semantic version, with nothing else on the line. It does not match "## Unreleased",
// which carries no version to key a section by.
var changelogHeading = regexp.MustCompile(`(?m)^##\s+([0-9][^\s]*)\s*$`)

// consumersMustLine matches one grammar line of a changelog section: "Consumers must: " at the
// start of a line, optionally indented two spaces (a list item's continuation), followed by a
// body. Group 1 is the body, without a line's trailing carriage return.
// scripts/checks/check-consumers-must.mjs reads a line the same way, and
// scripts/checks/fixtures/consumers-must/cases.json pins both readers to it.
var consumersMustLine = regexp.MustCompile(`(?m)^(?:  )?Consumers must: (\S.*?)\r?$`)

// FieldEngineInstalledVersion names the installed engine version on the engine check's Outcome.
// A renderer reads it by key: the version also appears inside the check's prose Detail, and
// parsing prose to recover a fact the check already measured is how a column silently goes wrong
// the first time the sentence is reworded.
const FieldEngineInstalledVersion = "installedVersion"

// engineDetail is engineCheck's internal measurement, flattened into Fields as an
// "installedVersion" entry, a "releasesBehind" entry and a "consumersMust" entry.
type engineDetail struct {
	// Installed is the bare version the site's dependency range names, the version the site
	// is running.
	Installed string
	// ReleasesBehind is how many published versions of cairnPackageName the site's dependency
	// range has not yet taken, up to and including the latest.
	ReleasesBehind int
	// ConsumersMust reports whether any skipped release's changelog section carries an actionable
	// "Consumers must:" line, one whose body is not exactly "nothing.".
	ConsumersMust bool
}

// fields flattens d into its three ordered spine.OutcomeField entries.
func (d engineDetail) fields() []spine.OutcomeField {
	return []spine.OutcomeField{
		observedField(FieldEngineInstalledVersion, d.Installed, spine.SourceGitHub),
		field("releasesBehind", d.ReleasesBehind),
		field("consumersMust", d.ConsumersMust),
	}
}

// outcome builds the spine.Outcome engineCheck.Run returns for state, code, and detail, always
// flattening d into its Fields entries regardless of which branch of Run reached it.
func (d engineDetail) outcome(state spine.State, code spine.Code, detail string) spine.Outcome {
	return spine.Outcome{State: state, Code: code, Detail: detail, Fields: d.fields()}
}

// engineCheck compares a site's `@glw907/cairn-cms` dependency range against the latest
// published version, and, when it is behind, whether any release it has not yet taken carries a
// breaking "Consumers must:" line.
type engineCheck struct{}

// ID implements Check.
func (engineCheck) ID() string { return "engine" }

// Needs implements Check. Engine reads the site's package.json and engineRepo's CHANGELOG.md
// through GitHub; the npm registry read that follows needs no credential.
func (engineCheck) Needs() Tier { return TierGH }

// manifestDependencyRange returns manifest's "dependencies" or, failing that,
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
// range clause after the first whitespace, returning the bare version its first comparator
// names.
func baseVersion(rng string) string {
	rng = strings.TrimSpace(rng)
	if i := strings.IndexAny(rng, " \t"); i >= 0 {
		rng = rng[:i]
	}
	return strings.TrimLeft(rng, "^~=<> ")
}

// changelogSections splits changelog into the text of each release section, keyed by its
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

// sectionHasActionableConsumersMust reports whether section carries an actionable "Consumers
// must:" line: any consumersMustLine match whose body is not exactly "nothing.". Text that does
// not sit on a grammar line (a mid-paragraph mention, a bold or code-span lead) is not a clause.
func sectionHasActionableConsumersMust(section string) bool {
	for _, m := range consumersMustLine.FindAllStringSubmatch(section, -1) {
		if m[1] != "nothing." {
			return true
		}
	}
	return false
}

// skippedVersions returns the versions strictly after siteVersion up to and including latest, in
// versions' publish order, or nil when the site is already current or ahead.
func skippedVersions(versions []string, siteIndex, latestIndex int) []string {
	if siteIndex >= latestIndex {
		return nil
	}
	return versions[siteIndex+1 : latestIndex+1]
}

// Run implements Check.
func (engineCheck) Run(ctx context.Context, r record.Record, c Clients, _ Options) spine.Outcome {
	if !hasRepo(r) {
		return spine.Outcome{State: spine.Unknown, Reason: spine.ReasonRepoNotRecorded, Detail: detailNoRepoRecorded()}
	}
	manifest, err := c.GH.FileAtRef(ctx, r.GitHub.Repo.Owner, r.GitHub.Repo.Repo, "package.json", DefaultBranch(r))
	if err != nil {
		return apiErrorOutcome(err)
	}
	rng, ok := manifestDependencyRange(manifest)
	if !ok {
		return spine.Outcome{State: spine.Unknown, Reason: spine.ReasonNotObservable, Detail: detailEngineNoCairnDependency()}
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

	siteIndex := slices.Index(versions, siteVersion)
	latestIndex := slices.Index(versions, latest)
	if siteIndex < 0 || latestIndex < 0 {
		return spine.Outcome{State: spine.Unknown, Reason: spine.ReasonNotObservable, Detail: detailEngineVersionNotFound()}
	}

	skipped := skippedVersions(versions, siteIndex, latestIndex)
	if len(skipped) == 0 {
		return engineDetail{Installed: siteVersion}.outcome(spine.OK, "", detailEngineCurrent(siteVersion))
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

	detail := engineDetail{Installed: siteVersion, ReleasesBehind: len(skipped), ConsumersMust: actionable}
	if actionable {
		return detail.outcome(spine.Failing, spine.CodeEngineBehind, detailEngineBehindActionable(siteVersion, latest, len(skipped)))
	}
	return detail.outcome(spine.OK, "", detailEngineBehind(siteVersion, latest, len(skipped)))
}
