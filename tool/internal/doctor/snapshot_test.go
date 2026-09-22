package doctor

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// TestNewSnapshotResolvesSymlinks asserts NewSnapshot's Dir is the target's real path even when
// the directory passed in is itself a symlink, the boundary every ReadFile call measures against.
func TestNewSnapshotResolvesSymlinks(t *testing.T) {
	root := resolvedTempDir(t)
	real := filepath.Join(root, "real")
	if err := os.Mkdir(real, 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	link := filepath.Join(root, "link")
	if err := os.Symlink(real, link); err != nil {
		t.Fatalf("symlink: %v", err)
	}

	snap, err := NewSnapshot(link)
	if err != nil {
		t.Fatalf("NewSnapshot: %v", err)
	}
	if snap.Dir != real {
		t.Errorf("Dir = %q, want %q", snap.Dir, real)
	}
}

// TestNoCheckFunctionReadsClockOrHoldsClient is a source scan over this package's own non-test
// files: it asserts none names time.Now or imports net/http, the two capabilities decision 2
// reserves for the command layer so a Check stays a pure function over its Snapshot.
func TestNoCheckFunctionReadsClockOrHoldsClient(t *testing.T) {
	entries, err := os.ReadDir(".")
	if err != nil {
		t.Fatalf("read dir: %v", err)
	}
	forbidden := []string{"time.Now(", `"net/http"`}
	for _, e := range entries {
		name := e.Name()
		if e.IsDir() || !strings.HasSuffix(name, ".go") || strings.HasSuffix(name, "_test.go") {
			continue
		}
		body, err := os.ReadFile(name)
		if err != nil {
			t.Fatalf("read %s: %v", name, err)
		}
		for _, f := range forbidden {
			if strings.Contains(string(body), f) {
				t.Errorf("%s names %q; a doctor check must hold no client and read no clock", name, f)
			}
		}
	}
}
