package spine

import (
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strings"
	"testing"

	"github.com/glw907/cairn-cms/tool/internal/providers"
)

// recordStepLiteral matches a "step" object key holding a quoted literal, the shape every real
// record write uses (an updateSite or saveSite call's own argument object).
var recordStepLiteral = regexp.MustCompile(`step:\s*'([a-z0-9-]+)'`)

// constStepAssign matches a computed local named step, the second real record-write shape: a
// hop that picks one of a small set of literals for the step it is about to persist
// (github/chapter.mjs's `const step = resumeStep === 'repo-created' ? 'repo-created' :
// 'installed';`).
var constStepAssign = regexp.MustCompile(`const step = `)

// quotedLiteral matches any single-quoted string literal on a line.
var quotedLiteral = regexp.MustCompile(`'([a-z0-9-]+)'`)

// bareStepUpdateSite matches an updateSite (or saveSite) call passed the step local by shorthand,
// the form that turns a `const step = ...` assignment into a real record write rather than a
// value that is only read or logged.
var bareStepUpdateSite = regexp.MustCompile(`(updateSite|saveSite)\([^)]*\{\s*step[,}]`)

// recordStepLiteralsUnder scans every non-test .mjs file under root for the record's own "step"
// writes. The scope excludes two shapes that also match a naive "step: '...'" grep but name no
// record step: a chapterError context object (browser-step-abandoned's own "step" key names
// where a browser flow was abandoned, never persisted to a record) and a comment quoting a step
// name for exposition. Both are recognized by the same line carrying "chapterError(" or a "//"
// or block-comment-continuation prefix ("*" or "/*"); nothing under this package's own test data
// uses either shape for a real write. A third shape, a computed local named step whose literals
// are only counted when the same file also passes that local to updateSite or saveSite by
// shorthand, covers a hop that picks its step from a small set of literals rather than writing
// one inline.
func recordStepLiteralsUnder(root string) (map[string]bool, error) {
	found := make(map[string]bool)
	err := filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() || !strings.HasSuffix(path, ".mjs") || strings.Contains(path, ".test.") {
			return nil
		}
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		content := string(data)
		hasBareStepWrite := bareStepUpdateSite.MatchString(content)
		for line := range strings.SplitSeq(content, "\n") {
			trimmed := strings.TrimSpace(line)
			if strings.HasPrefix(trimmed, "//") || strings.HasPrefix(trimmed, "*") ||
				strings.HasPrefix(trimmed, "/*") || strings.Contains(line, "chapterError(") {
				continue
			}
			for _, m := range recordStepLiteral.FindAllStringSubmatch(line, -1) {
				found[m[1]] = true
			}
			if hasBareStepWrite && constStepAssign.MatchString(line) {
				for _, m := range quotedLiteral.FindAllStringSubmatch(line, -1) {
					found[m[1]] = true
				}
			}
		}
		return nil
	})
	return found, err
}

// TestStepConstantsMatchNodeRecordSteps reads packages/create-cairn-site/src through
// providers.RepoRoot and asserts the record-step literal set the Node CLI writes equals the Step
// constants, so a step the Node side adds or renames fails here before it fails silently at
// runtime.
func TestStepConstantsMatchNodeRecordSteps(t *testing.T) {
	root, err := providers.RepoRoot()
	if err != nil {
		t.Fatalf("providers.RepoRoot: %v", err)
	}
	src := filepath.Join(root, "packages", "create-cairn-site", "src")

	found, err := recordStepLiteralsUnder(src)
	if err != nil {
		t.Fatalf("scan %s: %v", src, err)
	}

	var nodeSteps []string
	for s := range found {
		nodeSteps = append(nodeSteps, s)
	}
	slices.Sort(nodeSteps)

	var goSteps []string
	for s := range allSteps {
		goSteps = append(goSteps, string(s))
	}
	slices.Sort(goSteps)

	if !slices.Equal(nodeSteps, goSteps) {
		t.Fatalf("record-step literal sets differ:\nnode: %v\ngo:   %v", nodeSteps, goSteps)
	}
}

func TestParseStep(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  Step
		ok    bool
	}{
		{name: "known step", input: "live", want: StepLive, ok: true},
		{name: "unknown step", input: "not-a-step", want: Step("not-a-step"), ok: false},
		{name: "empty string", input: "", want: Step(""), ok: false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, ok := ParseStep(tt.input)
			if got != tt.want || ok != tt.ok {
				t.Errorf("ParseStep(%q) = (%q, %v), want (%q, %v)", tt.input, got, ok, tt.want, tt.ok)
			}
		})
	}
}

// TestTerminalStepSeams asserts each of the three step-slice functions returns exactly its
// documented steps, in order, which slices.Equal also proves.
func TestTerminalStepSeams(t *testing.T) {
	tests := []struct {
		name string
		got  []Step
		want []Step
	}{
		{name: "TerminalSteps", got: TerminalSteps(), want: []Step{StepEmailLive, StepPaidPlanDeclined}},
		{name: "Chapter3TerminalSteps", got: Chapter3TerminalSteps(), want: []Step{StepBuildsLive, StepBuildsConnectDeclined}},
		{name: "Chapter3ResumableSteps", got: Chapter3ResumableSteps(), want: []Step{StepBuildsConnected, StepConfigReconciled}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if !slices.Equal(tt.got, tt.want) {
				t.Errorf("%s() = %v, want %v", tt.name, tt.got, tt.want)
			}
		})
	}
}
