package main

import (
	"runtime"
	"strings"
	"testing"

	"github.com/glw907/cairn-cms/tool/internal/version"
)

// TestVersionReportsFourParts asserts --version and -V both print the tool version, the commit,
// the Go toolchain, and GOOS/GOARCH, and that the first two come from internal/version rather
// than a literal root.go carries. Substituting version.Version and version.Commit and
// finding the substituted values in the output is what proves the second half: a literal in
// root.go would print the same text regardless of what this test sets them to.
func TestVersionReportsFourParts(t *testing.T) {
	origVersion, origCommit := version.Version, version.Commit
	t.Cleanup(func() { version.Version, version.Commit = origVersion, origCommit })
	version.Version = "v9.9.9-test"
	version.Commit = "deadbee"

	wantGo := strings.TrimPrefix(runtime.Version(), "go")
	wantParts := []string{"v9.9.9-test", "deadbee", wantGo, runtime.GOOS, runtime.GOARCH}

	for _, flag := range []string{"--version", "-V"} {
		t.Run(flag, func(t *testing.T) {
			d, _ := testDeps(t)
			out, _, err := execTree(t, d, flag)
			if err != nil {
				t.Fatalf("cairn %s: %v", flag, err)
			}
			for _, part := range wantParts {
				if !strings.Contains(out, part) {
					t.Errorf("cairn %s output %q missing %q", flag, out, part)
				}
			}
		})
	}
}
