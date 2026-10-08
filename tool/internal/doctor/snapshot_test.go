package doctor

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// TestNewSnapshotResolvesSymlinks asserts NewSnapshot's Dir is the target's real path even when
// the directory passed in is itself a symlink, the boundary every readFile call measures against.
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

// TestReadFirst pins readFirst's two rules: the first candidate that exists wins over a later one,
// and a read error on an earlier candidate stops the search rather than falling through to a later
// readable one.
func TestReadFirst(t *testing.T) {
	tests := []struct {
		name      string
		escape    bool
		paths     []string
		wantBody  string
		wantPath  string
		wantFound bool
		wantErr   bool
	}{
		{name: "first of two existing wins", paths: []string{"a.ts", "b.js"}, wantBody: "a", wantPath: "a.ts", wantFound: true},
		{name: "an absent candidate is skipped", paths: []string{"missing.ts", "b.js"}, wantBody: "b", wantPath: "b.js", wantFound: true},
		{name: "none exists", paths: []string{"missing.ts", "missing.js"}},
		{name: "an earlier read error stops the search", escape: true, paths: []string{"escape.ts", "b.js"}, wantErr: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := snapshotWithFiles(t, map[string]string{"a.ts": "a", "b.js": "b"})
			if tt.escape {
				outside := filepath.Join(resolvedTempDir(t), "outside.ts")
				if err := os.WriteFile(outside, []byte("outside"), 0o644); err != nil {
					t.Fatalf("write: %v", err)
				}
				if err := os.Symlink(outside, filepath.Join(s.Dir, "escape.ts")); err != nil {
					t.Fatalf("symlink: %v", err)
				}
			}
			body, path, found, err := s.readFirst(tt.paths)
			if (err != nil) != tt.wantErr {
				t.Fatalf("err = %v, want error %v", err, tt.wantErr)
			}
			if string(body) != tt.wantBody || path != tt.wantPath || found != tt.wantFound {
				t.Errorf("readFirst = (%q, %q, %v), want (%q, %q, %v)", body, path, found, tt.wantBody, tt.wantPath, tt.wantFound)
			}
		})
	}
}

// netClientExemptFiles names the one non-test file allowed to import net/http:
// ai.posture-effective's own network request (fetchrobots.go's FetchRobots) is the single GET
// this whole command makes (retire-1 plan decision 9), isolated in its own file and never
// called from inside a Check.Run, so the exception this scan grants stays narrow rather than
// opening the whole package to a client.
var netClientExemptFiles = map[string]bool{"fetchrobots.go": true}

// TestNoCheckFunctionReadsClockOrHoldsClient is a source scan over this package's own non-test
// files: it asserts none names time.Now, and none but netClientExemptFiles imports net/http,
// the two capabilities decision 2 reserves for the command layer so a Check stays a pure
// function over its Snapshot.
func TestNoCheckFunctionReadsClockOrHoldsClient(t *testing.T) {
	entries, err := os.ReadDir(".")
	if err != nil {
		t.Fatalf("read dir: %v", err)
	}
	for _, e := range entries {
		name := e.Name()
		if e.IsDir() || !strings.HasSuffix(name, ".go") || strings.HasSuffix(name, "_test.go") {
			continue
		}
		body, err := os.ReadFile(name)
		if err != nil {
			t.Fatalf("read %s: %v", name, err)
		}
		if strings.Contains(string(body), "time.Now(") {
			t.Errorf("%s names %q; a doctor check must read no clock", name, "time.Now(")
		}
		if !netClientExemptFiles[name] && strings.Contains(string(body), `"net/http"`) {
			t.Errorf("%s names %q; a doctor check must hold no client", name, `"net/http"`)
		}
	}
}
