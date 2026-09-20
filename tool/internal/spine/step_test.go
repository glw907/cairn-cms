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

// recordStepLiteralsUnder scans every non-test .mjs file under root for the record's own "step"
// writes. The scope excludes two shapes that also match a naive "step: '...'" grep but name no
// record step: a chapterError context object (browser-step-abandoned's own "step" key names
// where a browser flow was abandoned, never persisted to a record) and a doc comment quoting a
// step name for exposition. Both are recognized by the same line carrying "chapterError(" or a
// "//" prefix; nothing under this package's own test data uses either shape for a real write.
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
		for line := range strings.SplitSeq(string(data), "\n") {
			trimmed := strings.TrimSpace(line)
			if strings.HasPrefix(trimmed, "//") || strings.Contains(line, "chapterError(") {
				continue
			}
			for _, m := range recordStepLiteral.FindAllStringSubmatch(line, -1) {
				found[m[1]] = true
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

func TestTerminalStepSeams(t *testing.T) {
	if !slices.Contains(TerminalSteps, StepEmailLive) || !slices.Contains(TerminalSteps, StepPaidPlanDeclined) {
		t.Errorf("TerminalSteps = %v, want email-live and paid-plan-declined", TerminalSteps)
	}
	if len(TerminalSteps) != 2 {
		t.Errorf("TerminalSteps has %d entries, want exactly 2", len(TerminalSteps))
	}

	if !slices.Contains(Chapter3TerminalSteps, StepBuildsLive) || !slices.Contains(Chapter3TerminalSteps, StepBuildsConnectDeclined) {
		t.Errorf("Chapter3TerminalSteps = %v, want builds-live and builds-connect-declined", Chapter3TerminalSteps)
	}
	if len(Chapter3TerminalSteps) != 2 {
		t.Errorf("Chapter3TerminalSteps has %d entries, want exactly 2", len(Chapter3TerminalSteps))
	}

	if !slices.Contains(Chapter3ResumableSteps, StepBuildsConnected) || !slices.Contains(Chapter3ResumableSteps, StepConfigReconciled) {
		t.Errorf("Chapter3ResumableSteps = %v, want builds-connected and config-reconciled", Chapter3ResumableSteps)
	}
	if len(Chapter3ResumableSteps) != 2 {
		t.Errorf("Chapter3ResumableSteps has %d entries, want exactly 2", len(Chapter3ResumableSteps))
	}
}
