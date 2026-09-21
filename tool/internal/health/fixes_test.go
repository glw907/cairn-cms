package health

import (
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strings"
	"testing"
	"unicode"

	"github.com/glw907/cairn-cms/tool/internal/providers"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// declaredConditions is the whole domain of engine condition ids health's checks can ever
// declare, derived from conditionCases() (condition_test.go), which already walks every check in
// health.All and fails when one carries no representative row. Deriving the domain here, rather
// than hand-listing it, is criterion 2's own enumeration mechanism: a later check that declares a
// fourth condition adds a row to conditionCases() and this domain grows with it, so the fix table
// cannot drift silently behind the engine's checks.
func declaredConditions() []spine.Condition {
	seen := make(map[spine.Condition]bool)
	var conditions []spine.Condition
	for _, tt := range conditionCases() {
		if tt.wantCondition == spine.ConditionNone || seen[tt.wantCondition] {
			continue
		}
		seen[tt.wantCondition] = true
		conditions = append(conditions, tt.wantCondition)
	}
	return conditions
}

// TestFixTableCoversDeclaredConditions asserts fixesByCondition carries exactly one entry per
// declared Condition, no more and no fewer: a stray key would be a fix line for a condition no
// check declares, and a missing one would leave a real Failing verdict with no remedy.
func TestFixTableCoversDeclaredConditions(t *testing.T) {
	got := make([]spine.Condition, 0, len(fixesByCondition))
	for c := range fixesByCondition {
		got = append(got, c)
	}
	slices.Sort(got)
	want := slices.Clone(declaredConditions())
	slices.Sort(want)
	if !slices.Equal(got, want) {
		t.Fatalf("fixesByCondition keys = %v, want exactly %v", got, want)
	}
	for _, c := range want {
		if fix := fixesByCondition[c]; fix.Text == "" {
			t.Errorf("fixesByCondition[%q] carries no Text", c)
		}
	}
}

// TestFixTableCoversDeclaredCodes asserts fixesByCode carries exactly one entry per spine.Code
// spine.Codes() declares, the same one-to-one invariant TestFixTableCoversDeclaredConditions
// holds for Condition.
func TestFixTableCoversDeclaredCodes(t *testing.T) {
	got := make([]spine.Code, 0, len(fixesByCode))
	for c := range fixesByCode {
		got = append(got, c)
	}
	slices.Sort(got)
	want := spine.Codes()
	slices.Sort(want)
	if !slices.Equal(got, want) {
		t.Fatalf("fixesByCode keys = %v, want exactly %v", got, want)
	}
	for _, c := range want {
		if fix := fixesByCode[c]; fix.Text == "" {
			t.Errorf("fixesByCode[%q] carries no Text", c)
		}
	}
}

// TestFixLinesResolveForEveryDeclaredIdentity asserts a Failing outcome carrying any declared
// Condition or any declared Code resolves through FixFor to exactly one fix line: this is the
// domain of every Failing outcome the tool can ever produce, since a check names no failure
// identity outside these two sets.
func TestFixLinesResolveForEveryDeclaredIdentity(t *testing.T) {
	for _, c := range declaredConditions() {
		t.Run("condition/"+string(c), func(t *testing.T) {
			fix, ok := FixFor(spine.Outcome{State: spine.Failing, Condition: c})
			if !ok {
				t.Fatalf("FixFor found no fix line for Condition %q", c)
			}
			if fix.Text == "" {
				t.Errorf("FixFor(%q) returned an empty Fix", c)
			}
		})
	}
	for _, c := range spine.Codes() {
		t.Run("code/"+string(c), func(t *testing.T) {
			fix, ok := FixFor(spine.Outcome{State: spine.Failing, Code: c})
			if !ok {
				t.Fatalf("FixFor found no fix line for Code %q", c)
			}
			if fix.Text == "" {
				t.Errorf("FixFor(%q) returned an empty Fix", c)
			}
		})
	}
}

// TestFixForOutcomeWithNeitherIdentityIsAbsent asserts a Failing outcome naming no Condition and
// no Code (a verdict Task 21's threshold table has not yet assigned one to) is reported as
// having no fix line, rather than resolving to some default.
func TestFixForOutcomeWithNeitherIdentityIsAbsent(t *testing.T) {
	if _, ok := FixFor(spine.Outcome{State: spine.Failing}); ok {
		t.Error("FixFor found a fix line for an outcome with no Condition and no Code")
	}
}

// headingSlug reproduces GitHub's own Markdown heading-anchor algorithm closely enough for this
// page: lowercase, spaces become hyphens, and every character that is not a letter, a digit, a
// space, or a hyphen is dropped (an apostrophe disappears rather than becoming a hyphen).
func headingSlug(heading string) string {
	var b strings.Builder
	for _, r := range strings.ToLower(heading) {
		switch {
		case r == ' ':
			b.WriteRune('-')
		case unicode.IsLetter(r) || unicode.IsDigit(r) || r == '-':
			b.WriteRune(r)
		}
	}
	return b.String()
}

// headingSlugsIn reads path's own "## " headings and returns their slugs.
func headingSlugsIn(path string) (map[string]bool, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	heading := regexp.MustCompile(`(?m)^##\s+(.+)$`)
	slugs := make(map[string]bool)
	for _, m := range heading.FindAllStringSubmatch(string(data), -1) {
		slugs[headingSlug(m[1])] = true
	}
	return slugs, nil
}

// TestFixLineAnchorsResolveInDocs asserts every non-empty Anchor in either half of the fix table
// names a heading docs/admin/is-it-working.md actually carries, read at test time through
// providers.RepoRoot, so the table cannot drift from the page.
func TestFixLineAnchorsResolveInDocs(t *testing.T) {
	root, err := providers.RepoRoot()
	if err != nil {
		t.Fatalf("providers.RepoRoot: %v", err)
	}
	slugs, err := headingSlugsIn(filepath.Join(root, "docs", "admin", "is-it-working.md"))
	if err != nil {
		t.Fatalf("read is-it-working.md: %v", err)
	}
	if len(slugs) == 0 {
		t.Fatal("found no headings in is-it-working.md; the scan is broken")
	}

	anchored := 0
	for c, fix := range fixesByCondition {
		if fix.Anchor == "" {
			continue
		}
		anchored++
		if !slugs[fix.Anchor] {
			t.Errorf("fixesByCondition[%q].Anchor = %q, no such heading in is-it-working.md", c, fix.Anchor)
		}
	}
	for c, fix := range fixesByCode {
		if fix.Anchor == "" {
			continue
		}
		anchored++
		if !slugs[fix.Anchor] {
			t.Errorf("fixesByCode[%q].Anchor = %q, no such heading in is-it-working.md", c, fix.Anchor)
		}
	}
	if anchored == 0 {
		t.Fatal("no fix line carries an Anchor at all; the anchor test proves nothing")
	}
}

// TestFixLineNoAnchorIsLegal asserts an empty Anchor is an accepted value, never treated as a
// missing field: this task does not edit the frozen is-it-working.md page to manufacture
// headings for the checks it does not yet cover (Serving, Delegation, Deploy, Behind, Engine,
// and an error count; see this task's own report).
func TestFixLineNoAnchorIsLegal(t *testing.T) {
	noAnchor := 0
	for _, fix := range fixesByCode {
		if fix.Anchor == "" {
			noAnchor++
		}
	}
	if noAnchor == 0 {
		t.Fatal("every fixesByCode entry carries an Anchor; the no-anchor branch is untested")
	}
}

// TestDeclaredConditionsExistInTheEngineRegistry asserts every condition id health's checks can
// ever declare (declaredConditions) exists in src/lib/diagnostics/conditions.ts's own registry,
// read at test time through providers.RepoRoot: criterion 7 of this task's rule that an id this
// tool prints must be one the engine actually owns.
func TestDeclaredConditionsExistInTheEngineRegistry(t *testing.T) {
	registry := make(map[spine.Condition]bool, len(spine.Conditions()))
	for _, c := range spine.Conditions() {
		registry[c] = true
	}
	for _, c := range declaredConditions() {
		if !registry[c] {
			t.Errorf("declaredConditions carries %q, which is not in spine.Conditions()", c)
		}
	}
}

// TestFixLineActorIsOneOfTheFour asserts every fix line's Actor is one of the four declared
// values, and that Command is non-empty only when Actor is ActorOperator.
func TestFixLineActorIsOneOfTheFour(t *testing.T) {
	valid := map[Actor]bool{ActorOperator: true, ActorDeveloper: true, ActorProviderConsole: true, ActorRegistrar: true}
	check := func(key string, fix Fix) {
		if !valid[fix.Actor] {
			t.Errorf("%s: Actor = %q, not one of the four declared values", key, fix.Actor)
		}
		if fix.Command != "" && fix.Actor != ActorOperator {
			t.Errorf("%s: Command = %q, but Actor = %q (only ActorOperator may carry a Command)", key, fix.Command, fix.Actor)
		}
	}
	for c, fix := range fixesByCondition {
		check(string(c), fix)
	}
	for c, fix := range fixesByCode {
		check(string(c), fix)
	}
}
