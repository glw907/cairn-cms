package health

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
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
// than hand-listing it, means a later check that declares a fourth condition adds a row to
// conditionCases() and this domain grows with it, so the fix table cannot drift silently behind
// the engine's checks.
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
// no Code (a verdict no threshold has assigned an identity to) is reported as having no fix line,
// rather than resolving to some default.
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

// checklistFile is the page every Anchor names a heading on, in the form shipped-anchors.json
// normalizes each entry to ("is-it-working.md#<anchor>").
const checklistFile = "is-it-working.md"

// adminArmRebuilt reports whether the admin docs arm under root holds any page outside the
// deletion list's kept set. scripts/checks/arm-state.mjs is the source of truth for that rebuilt
// state; this Go copy must agree with it. The list is read fail-closed: a missing or malformed
// list is an error, never an empty arm.
func adminArmRebuilt(root string) (bool, error) {
	data, err := os.ReadFile(filepath.Join(root, "docs", "internal", "record", "harvest", "deletion-list.json"))
	if err != nil {
		return false, fmt.Errorf("read deletion list: %w", err)
	}
	var list struct {
		Deleted *[]string `json:"deleted"`
		Kept    *[]string `json:"kept"`
	}
	if err := json.Unmarshal(data, &list); err != nil {
		return false, fmt.Errorf("parse deletion list: %w", err)
	}
	if list.Deleted == nil || list.Kept == nil {
		return false, errors.New("deletion list: want \"deleted\" and \"kept\" arrays")
	}
	kept := make(map[string]bool, len(*list.Kept))
	for _, page := range *list.Kept {
		kept[page] = true
	}
	rebuilt := false
	err = filepath.WalkDir(filepath.Join(root, "docs", "admin"), func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() || !strings.HasSuffix(d.Name(), ".md") {
			return nil
		}
		rel, err := filepath.Rel(root, path)
		if err != nil {
			return err
		}
		if !kept[filepath.ToSlash(rel)] {
			rebuilt = true
		}
		return nil
	})
	if errors.Is(err, fs.ErrNotExist) {
		return false, nil
	}
	return rebuilt, err
}

// loadShippedAnchors reads scripts/checks/shipped-anchors.json's "anchors" array. An absent,
// malformed, or empty list is an error: no released tag ever shipped zero anchors.
func loadShippedAnchors(path string) ([]string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read shipped anchors: %w", err)
	}
	var list struct {
		Anchors []string `json:"anchors"`
	}
	if err := json.Unmarshal(data, &list); err != nil {
		return nil, fmt.Errorf("parse shipped anchors: %w", err)
	}
	if len(list.Anchors) == 0 {
		return nil, errors.New("shipped anchors: the list carries no anchors")
	}
	return list.Anchors, nil
}

// anchorProblems compares the fix table's anchors against the admin arm's state. While the arm
// holds no page (rebuilt false), every anchor must be on the shipped list, since no checklist
// exists to resolve it against. Once the arm is rebuilt, the checklist must exist (slugs non-nil)
// and every fix anchor and every shipped anchor must name one of its headings, so a renamed or
// split checklist fails instead of disarming the check.
func anchorProblems(fixAnchors []string, rebuilt bool, slugs map[string]bool, shipped []string) []string {
	var problems []string
	if !rebuilt {
		listed := make(map[string]bool, len(shipped))
		for _, entry := range shipped {
			listed[entry] = true
		}
		for _, anchor := range fixAnchors {
			if !listed[checklistFile+"#"+anchor] {
				problems = append(problems, fmt.Sprintf("anchor %q is not in shipped-anchors.json and the admin arm holds no checklist", anchor))
			}
		}
		return problems
	}
	if slugs == nil {
		return []string{"the admin arm holds pages but docs/admin/is-it-working.md does not exist"}
	}
	for _, anchor := range fixAnchors {
		if !slugs[anchor] {
			problems = append(problems, fmt.Sprintf("anchor %q: no such heading in is-it-working.md", anchor))
		}
	}
	for _, entry := range shipped {
		file, anchor, _ := strings.Cut(entry, "#")
		if file != checklistFile || !slugs[anchor] {
			problems = append(problems, fmt.Sprintf("shipped anchor %q: no such heading in is-it-working.md", entry))
		}
	}
	return problems
}

// TestFixLineAnchorsResolveInDocs asserts every non-empty Anchor in either half of the fix table
// is one a reader can follow, read at test time through providers.RepoRoot: on the shipped-anchor
// list while the admin arm holds no page, and on docs/admin/is-it-working.md's own headings, with
// every shipped anchor, once it does.
func TestFixLineAnchorsResolveInDocs(t *testing.T) {
	root, err := providers.RepoRoot()
	if err != nil {
		t.Fatalf("providers.RepoRoot: %v", err)
	}
	var anchors []string
	for _, fix := range fixesByCondition {
		if fix.Anchor != "" {
			anchors = append(anchors, fix.Anchor)
		}
	}
	for _, fix := range fixesByCode {
		if fix.Anchor != "" {
			anchors = append(anchors, fix.Anchor)
		}
	}
	if len(anchors) == 0 {
		t.Fatal("no fix line carries an Anchor at all; the anchor test proves nothing")
	}

	rebuilt, err := adminArmRebuilt(root)
	if err != nil {
		t.Fatalf("admin arm state: %v", err)
	}
	shipped, err := loadShippedAnchors(filepath.Join(root, "scripts", "checks", "shipped-anchors.json"))
	if err != nil {
		t.Fatal(err)
	}
	var slugs map[string]bool
	if rebuilt {
		slugs, err = headingSlugsIn(filepath.Join(root, "docs", "admin", "is-it-working.md"))
		if err != nil && !errors.Is(err, fs.ErrNotExist) {
			t.Fatalf("read is-it-working.md: %v", err)
		}
		if err == nil && len(slugs) == 0 {
			t.Fatal("found no headings in is-it-working.md; the scan is broken")
		}
	}
	for _, problem := range anchorProblems(anchors, rebuilt, slugs, shipped) {
		t.Error(problem)
	}
}

func TestAnchorProblems(t *testing.T) {
	shipped := []string{"is-it-working.md#force-https-at-the-edge", "is-it-working.md#turn-on-observability"}
	doc := map[string]bool{"force-https-at-the-edge": true, "turn-on-observability": true}
	tests := []struct {
		name    string
		anchors []string
		rebuilt bool
		slugs   map[string]bool
		want    []string
	}{
		{name: "list mode, every anchor listed", anchors: []string{"force-https-at-the-edge"}},
		{
			name:    "list mode, an anchor missing from the list",
			anchors: []string{"force-https-at-the-edge", "turn-on-hsts"},
			want:    []string{"turn-on-hsts"},
		},
		{
			name:    "admin arm regains a page without the checklist",
			anchors: []string{"force-https-at-the-edge"},
			rebuilt: true,
			want:    []string{"is-it-working.md does not exist"},
		},
		{
			name:    "rebuilt checklist lacks a fix anchor",
			anchors: []string{"force-https-at-the-edge", "turn-on-hsts"},
			rebuilt: true,
			slugs:   doc,
			want:    []string{"turn-on-hsts"},
		},
		{
			name:    "rebuilt checklist renamed a shipped anchor's heading",
			anchors: []string{"force-https-at-the-edge"},
			rebuilt: true,
			slugs:   map[string]bool{"force-https-at-the-edge": true, "enable-observability": true},
			want:    []string{"is-it-working.md#turn-on-observability"},
		},
		{name: "rebuilt checklist carries every anchor", anchors: []string{"force-https-at-the-edge"}, rebuilt: true, slugs: doc},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := anchorProblems(tt.anchors, tt.rebuilt, tt.slugs, shipped)
			if len(got) != len(tt.want) {
				t.Fatalf("anchorProblems = %q, want %d problem(s) naming %q", got, len(tt.want), tt.want)
			}
			for i, w := range tt.want {
				if !strings.Contains(got[i], w) {
					t.Errorf("problem %d = %q, want it to name %q", i, got[i], w)
				}
			}
		})
	}
}

func TestAdminArmRebuilt(t *testing.T) {
	const list = `{"deleted": ["docs/admin/is-it-working.md"], "kept": ["docs/admin/kept.md"]}`
	tests := []struct {
		name    string
		list    string
		pages   []string
		want    bool
		wantErr bool
	}{
		{name: "absent: no admin directory", list: list},
		{name: "kept-only: only a kept page", list: list, pages: []string{"docs/admin/kept.md"}},
		{name: "rebuilt: a page outside the kept set", list: list, pages: []string{"docs/admin/kept.md", "docs/admin/new.md"}, want: true},
		{name: "rebuilt: a nested page", list: list, pages: []string{"docs/admin/deep/page.md"}, want: true},
		{name: "a non-Markdown file is no page", list: list, pages: []string{"docs/admin/diagram.png"}},
		{name: "missing deletion list", pages: []string{"docs/admin/new.md"}, wantErr: true},
		{name: "malformed deletion list", list: "{ nope", wantErr: true},
		{name: "deletion list without a kept array", list: `{"deleted": []}`, wantErr: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			root := t.TempDir()
			if tt.list != "" {
				writeTestFile(t, filepath.Join(root, "docs", "internal", "record", "harvest", "deletion-list.json"), tt.list)
			}
			for _, page := range tt.pages {
				writeTestFile(t, filepath.Join(root, filepath.FromSlash(page)), "# Page\n")
			}
			got, err := adminArmRebuilt(root)
			if (err != nil) != tt.wantErr {
				t.Fatalf("adminArmRebuilt error = %v, wantErr %v", err, tt.wantErr)
			}
			if got != tt.want {
				t.Errorf("adminArmRebuilt = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestLoadShippedAnchors(t *testing.T) {
	tests := []struct {
		name    string
		body    string // "" writes no file
		want    int
		wantErr bool
	}{
		{name: "valid", body: `{"anchors": ["is-it-working.md#force-https-at-the-edge"]}`, want: 1},
		{name: "absent", wantErr: true},
		{name: "empty", body: `{"anchors": []}`, wantErr: true},
		{name: "malformed", body: "{ nope", wantErr: true},
		{name: "not an object carrying anchors", body: `["is-it-working.md#x"]`, wantErr: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			path := filepath.Join(t.TempDir(), "shipped-anchors.json")
			if tt.body != "" {
				writeTestFile(t, path, tt.body)
			}
			got, err := loadShippedAnchors(path)
			if (err != nil) != tt.wantErr {
				t.Fatalf("loadShippedAnchors error = %v, wantErr %v", err, tt.wantErr)
			}
			if len(got) != tt.want {
				t.Errorf("loadShippedAnchors = %q, want %d entries", got, tt.want)
			}
		})
	}
}

func writeTestFile(t *testing.T, path, body string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(body), 0o644); err != nil {
		t.Fatal(err)
	}
}

// TestDeclaredConditionsExistInTheEngineRegistry asserts every condition id health's checks can
// ever declare (declaredConditions) exists in src/lib/diagnostics/conditions.ts's own registry,
// read through spine.Conditions(): an id this tool prints must be one the engine actually owns.
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
