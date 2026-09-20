package hygiene

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

// identicalPairs names files that carry no platform-specific difference and
// so must stay byte-identical: the POSIX symlink and permission-check pair
// for perm_linux.go and perm_darwin.go, and the umask test helper pair for
// umask_linux_test.go and umask_darwin_test.go, both under internal/store.
var identicalPairs = [][2]string{
	{"internal/store/perm_linux.go", "internal/store/perm_darwin.go"},
	{"internal/store/umask_linux_test.go", "internal/store/umask_darwin_test.go"},
}

// TestGOOSPairsAreByteIdentical asserts each pair in identicalPairs is
// byte-identical, so a fix applied to one GOOS-suffixed file is never
// forgotten on its sibling.
func TestGOOSPairsAreByteIdentical(t *testing.T) {
	_, thisFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve this file's own path")
	}
	// thisFile is tool/internal/hygiene/identicalfiles_test.go; strip the
	// file name, then walk up two directories from internal/hygiene to
	// reach the module root.
	root := filepath.Dir(filepath.Dir(filepath.Dir(thisFile)))
	if _, err := os.Stat(filepath.Join(root, "go.mod")); err != nil {
		t.Fatalf("resolved root %s has no go.mod: %v", root, err)
	}

	for _, pair := range identicalPairs {
		a, err := os.ReadFile(filepath.Join(root, filepath.FromSlash(pair[0])))
		if err != nil {
			t.Fatalf("read %s: %v", pair[0], err)
		}
		b, err := os.ReadFile(filepath.Join(root, filepath.FromSlash(pair[1])))
		if err != nil {
			t.Fatalf("read %s: %v", pair[1], err)
		}
		if string(a) != string(b) {
			t.Errorf("%s and %s are not byte-identical", pair[0], pair[1])
		}
	}
}
