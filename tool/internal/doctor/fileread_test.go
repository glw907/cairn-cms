package doctor

import (
	"errors"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// resolvedTempDir returns a fresh temp directory, resolved via filepath.EvalSymlinks the same
// way NewSnapshot resolves its own Dir, so a test's boundary matches what ReadUnder expects.
func resolvedTempDir(t *testing.T) string {
	t.Helper()
	dir, err := filepath.EvalSymlinks(t.TempDir())
	if err != nil {
		t.Fatalf("resolve temp dir: %v", err)
	}
	return dir
}

// TestReadUnderRefusesSymlinkEscape proves the spec's own acceptance bullet: a read through a
// symlink whose real, resolved location leaves the directory is refused, even though the
// symlink's own name is nested textually inside the directory.
func TestReadUnderRefusesSymlinkEscape(t *testing.T) {
	root := resolvedTempDir(t)
	site := filepath.Join(root, "site")
	outside := filepath.Join(root, "outside")
	for _, d := range []string{site, outside} {
		if err := os.Mkdir(d, 0o755); err != nil {
			t.Fatalf("mkdir %s: %v", d, err)
		}
	}
	secret := filepath.Join(outside, "secret.txt")
	if err := os.WriteFile(secret, []byte("outside body"), 0o644); err != nil {
		t.Fatalf("write secret: %v", err)
	}
	link := filepath.Join(site, "link.txt")
	if err := os.Symlink(secret, link); err != nil {
		t.Fatalf("symlink: %v", err)
	}

	_, ok, err := ReadUnder(site, "link.txt")
	if err == nil {
		t.Fatal("expected a containment refusal, got nil error")
	}
	if ok {
		t.Error("expected ok=false on a containment refusal")
	}
	if got, want := err.Error(), "doctor: refusing to read outside the directory: link.txt"; got != want {
		t.Errorf("error = %q, want %q", got, want)
	}
}

// TestReadUnderRefusesTextualDotDot proves the textual ".." arm separately from the symlink
// arm above: a relPath that escapes dir through its own literal segments, with no symlink
// involved at all, is refused the same way.
func TestReadUnderRefusesTextualDotDot(t *testing.T) {
	root := resolvedTempDir(t)
	site := filepath.Join(root, "site")
	outside := filepath.Join(root, "outside")
	for _, d := range []string{site, outside} {
		if err := os.Mkdir(d, 0o755); err != nil {
			t.Fatalf("mkdir %s: %v", d, err)
		}
	}
	if err := os.WriteFile(filepath.Join(outside, "secret.txt"), []byte("outside body"), 0o644); err != nil {
		t.Fatalf("write secret: %v", err)
	}

	_, ok, err := ReadUnder(site, "../outside/secret.txt")
	if err == nil {
		t.Fatal("expected a containment refusal, got nil error")
	}
	if ok {
		t.Error("expected ok=false on a containment refusal")
	}
	if got, want := err.Error(), "doctor: refusing to read outside the directory: ../outside/secret.txt"; got != want {
		t.Errorf("error = %q, want %q", got, want)
	}
}

// TestReadUnderAbsentFile asserts a read of a file that does not exist under dir returns
// (nil, false, nil): absent, not an error.
func TestReadUnderAbsentFile(t *testing.T) {
	dir := resolvedTempDir(t)
	body, ok, err := ReadUnder(dir, "missing.txt")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if ok {
		t.Error("expected ok=false for an absent file")
	}
	if body != nil {
		t.Errorf("expected nil body, got %q", body)
	}
}

// TestReadUnderDanglingSymlinkReadsAsAbsent proves the first of the two error-path acceptance
// cases: a symlink under dir whose target does not exist reads as absent, not as a containment
// refusal, since the target's non-existence is not evidence the link points outside dir.
func TestReadUnderDanglingSymlinkReadsAsAbsent(t *testing.T) {
	dir := resolvedTempDir(t)
	link := filepath.Join(dir, "dangling.txt")
	if err := os.Symlink(filepath.Join(dir, "does-not-exist.txt"), link); err != nil {
		t.Fatalf("symlink: %v", err)
	}

	body, ok, err := ReadUnder(dir, "dangling.txt")
	if err != nil {
		t.Fatalf("expected a dangling symlink to read as absent, got error: %v", err)
	}
	if ok {
		t.Error("expected ok=false for a dangling symlink")
	}
	if body != nil {
		t.Errorf("expected nil body, got %q", body)
	}
}

// TestReadUnderPermissionDeniedIsAnError proves the second error-path acceptance case: a file
// that exists under dir but cannot be read is a real error, distinct from both absent and a
// containment refusal.
func TestReadUnderPermissionDeniedIsAnError(t *testing.T) {
	if os.Geteuid() == 0 {
		t.Skip("running as root: permission bits are not enforced")
	}
	dir := resolvedTempDir(t)
	path := filepath.Join(dir, "secret.txt")
	if err := os.WriteFile(path, []byte("body"), 0o644); err != nil {
		t.Fatalf("write file: %v", err)
	}
	if err := os.Chmod(path, 0o000); err != nil {
		t.Fatalf("chmod: %v", err)
	}
	t.Cleanup(func() { _ = os.Chmod(path, 0o644) })

	body, ok, err := ReadUnder(dir, "secret.txt")
	if err == nil {
		t.Fatal("expected a permission error")
	}
	if ok {
		t.Error("expected ok=false on a permission error")
	}
	if body != nil {
		t.Errorf("expected nil body, got %q", body)
	}
	if !errors.Is(err, fs.ErrPermission) {
		t.Errorf("expected a wrapped fs.ErrPermission, got %v", err)
	}
	if strings.Contains(err.Error(), "refusing to read outside the directory") {
		t.Errorf("permission failure must not be reported as a containment refusal: %v", err)
	}
}

// TestContainsUsesRelNotHasPrefix asserts contains is implemented with filepath.Rel, proven by a
// boundary /a/b and a candidate /a/bc: strings.HasPrefix("/a/bc", "/a/b") is true, which would
// wrongly contain a sibling directory that merely shares a name prefix.
func TestContainsUsesRelNotHasPrefix(t *testing.T) {
	tests := []struct {
		name      string
		boundary  string
		candidate string
		want      bool
	}{
		{"sibling with shared prefix is not contained", "/a/b", "/a/bc", false},
		{"boundary itself is contained", "/a/b", "/a/b", true},
		{"a real child is contained", "/a/b", "/a/b/c", true},
		{"a parent is not contained", "/a/b", "/a", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := contains(tt.boundary, tt.candidate); got != tt.want {
				t.Errorf("contains(%q, %q) = %v, want %v", tt.boundary, tt.candidate, got, tt.want)
			}
		})
	}
}

// TestIsCairnSite proves the not-a-cairn-site predicate on four fixtures: a wrangler config with
// no package.json, a package.json naming the module as a dependency, one naming it as a
// devDependency, and an empty directory, the only one of the four that is not a cairn site.
func TestIsCairnSite(t *testing.T) {
	tests := []struct {
		name  string
		setup func(t *testing.T, dir string)
		want  bool
	}{
		{
			name: "wrangler.jsonc with no package.json",
			setup: func(t *testing.T, dir string) {
				t.Helper()
				writeFile(t, dir, "wrangler.jsonc", `{"name":"site"}`)
			},
			want: true,
		},
		{
			name: "package.json naming the module as a dependency",
			setup: func(t *testing.T, dir string) {
				t.Helper()
				writeFile(t, dir, "package.json", `{"dependencies":{"@glw907/cairn-cms":"^1.0.0"}}`)
			},
			want: true,
		},
		{
			name: "package.json naming the module as a devDependency",
			setup: func(t *testing.T, dir string) {
				t.Helper()
				writeFile(t, dir, "package.json", `{"devDependencies":{"@glw907/cairn-cms":"^1.0.0"}}`)
			},
			want: true,
		},
		{
			name:  "an empty directory",
			setup: func(t *testing.T, dir string) {},
			want:  false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dir := resolvedTempDir(t)
			tt.setup(t, dir)
			if got := IsCairnSite(dir); got != tt.want {
				t.Errorf("IsCairnSite() = %v, want %v", got, tt.want)
			}
		})
	}
}

// writeFile writes body to name under dir, failing the test on error.
func writeFile(t *testing.T, dir, name, body string) {
	t.Helper()
	if err := os.WriteFile(filepath.Join(dir, name), []byte(body), 0o644); err != nil {
		t.Fatalf("write %s: %v", name, err)
	}
}
