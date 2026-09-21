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

// changelogHeading matches one of engineRepo's own CHANGELOG.md release headings: "## " followed
// by a bare semantic version, with nothing else on the line. It does not match "## Unreleased",
// which carries no version to key a section by.
var changelogHeading = regexp.MustCompile(`(?m)^##\s+([0-9][^\s]*)\s*$`)

// consumersMustLead matches one "Consumers must:" clause's own lead-in, optionally wrapped in
// Markdown bold, with two optional single-backtick groups: one immediately before "Consumers" and
// one immediately after the colon. Both groups matching means the lead-in itself sits inside a
// code span, a prose MENTION of the convention ("carries every `Consumers must:` line from here
// on") rather than an actual clause, so sectionHasActionableConsumersMust skips it.
var consumersMustLead = regexp.MustCompile("(`)?\\*{0,2}Consumers must:\\*{0,2}(`)?")

// blankLine splits a changelog section into its paragraphs and list items: engineRepo's own
// CHANGELOG.md separates each bullet by a blank line and wraps a bullet's own text across
// multiple indented lines, so a clause's true end is the next blank line, not the next newline.
var blankLine = regexp.MustCompile(`\n\s*\n`)

// EngineDetail is engineCheck's own internal measurement, flattened into Fields as a
// "releasesBehind" entry and a "consumersMust" entry.
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
		field("releasesBehind", d.ReleasesBehind),
		field("consumersMust", d.ConsumersMust),
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

// sectionHasActionableConsumersMust reports whether section carries an actionable "Consumers
// must:" clause: one whose own text, trimmed of whitespace and compared case-insensitively, does
// not begin with the whole word "nothing" (the sole non-actionable case; "nothing." and "nothing;
// a site already on the old name keeps working." both count as non-actionable, while a clause
// that merely starts elsewhere, "rename X to Y." or "run the migration, nothing else changes.",
// is actionable). A section may carry more than one "Consumers must:" clause, one per bullet or
// paragraph; each clause is bounded at the next lead-in (or the paragraph's end), so two clauses
// sharing one paragraph are judged separately, and any single actionable one is enough. A lead-in
// itself wrapped in a code span (`Consumers must:` quoted in running prose) is a mention of the
// convention, not a clause, and is skipped.
func sectionHasActionableConsumersMust(section string) bool {
	for _, para := range blankLine.Split(section, -1) {
		normalized := strings.Join(strings.Fields(para), " ")
		leads := consumersMustLead.FindAllStringSubmatchIndex(normalized, -1)
		for i, m := range leads {
			if m[2] != -1 && m[4] != -1 {
				// Both backtick groups matched: the lead-in is quoted in prose, not a clause.
				continue
			}
			end := len(normalized)
			if i+1 < len(leads) {
				end = leads[i+1][0]
			}
			remainder := strings.TrimSpace(normalized[m[1]:end])
			if remainder == "" {
				continue
			}
			if !clauseIsNonActionableNothing(remainder) {
				return true
			}
		}
	}
	return false
}

// clauseIsNonActionableNothing reports whether remainder, a "Consumers must:" clause's own text,
// begins with the whole word "nothing": case-insensitively, and followed by end of text or a
// non-letter character (a period, semicolon, comma, space, or parenthesis), never a word like
// "nothingness" that merely starts the same letters.
func clauseIsNonActionableNothing(remainder string) bool {
	lower := strings.ToLower(remainder)
	if !strings.HasPrefix(lower, "nothing") {
		return false
	}
	if len(lower) == len("nothing") {
		return true
	}
	next := lower[len("nothing")]
	return next < 'a' || next > 'z'
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
