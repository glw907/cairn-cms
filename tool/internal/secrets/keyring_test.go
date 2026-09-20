package secrets

import (
	"errors"
	"io/fs"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"

	zkeyring "github.com/zalando/go-keyring"
)

func TestKeyringName(t *testing.T) {
	if got := NewKeyring().Name(); got != "keyring" {
		t.Errorf("Name() = %q, want %q", got, "keyring")
	}
}

func TestKeyringRoundTrip(t *testing.T) {
	// The library's own in-memory mock, not a live keyring, so this
	// passes on a headless CI leg with no Secret Service and no session
	// keyring.
	zkeyring.MockInit()

	k := NewKeyring()
	if err := k.Set("CAIRN_GH_READ_TOKEN", "ghp_example"); err != nil {
		t.Fatalf("Set() = %v, want nil", err)
	}
	v, ok, err := k.Get("CAIRN_GH_READ_TOKEN")
	if !ok || v != "ghp_example" || err != nil {
		t.Fatalf("Get() = (%q, %v, %v), want (\"ghp_example\", true, nil)", v, ok, err)
	}
}

func TestKeyringMissWhenAbsent(t *testing.T) {
	zkeyring.MockInit()

	k := NewKeyring()
	v, ok, err := k.Get("CAIRN_CF_READ_TOKEN")
	if ok || v != "" || err != nil {
		t.Fatalf("Get() on an unset entry = (%q, %v, %v), want (\"\", false, nil)", v, ok, err)
	}
}

func TestKeyringMissWhenUnreachable(t *testing.T) {
	// Load-bearing row: a bus the library cannot reach at all (no daemon,
	// no session keyring) behaves exactly like an absent entry, not an
	// error, so an operator who has only set the environment variables
	// sees the same outcome.
	zkeyring.MockInitWithError(errors.New("dbus: could not connect"))
	t.Cleanup(zkeyring.MockInit)

	k := NewKeyring()
	v, ok, err := k.Get("CAIRN_CF_READ_TOKEN")
	if ok || v != "" || err != nil {
		t.Fatalf("Get() on an unreachable bus = (%q, %v, %v), want (\"\", false, nil)", v, ok, err)
	}
}

// blockingBackend never returns from Get, standing in for a present bus
// with a locked collection waiting on an unlock prompt with no timeout of
// its own.
type blockingBackend struct{}

func (blockingBackend) Get(string, string) (string, error) {
	select {}
}

func (blockingBackend) Set(string, string, string) error {
	select {}
}

func TestKeyringDeadlineMiss(t *testing.T) {
	// A short deadline keeps the test fast; NewKeyring uses the real
	// two-second keyringDeadline in production.
	k := newKeyringWithBackend(blockingBackend{}, 20*time.Millisecond)

	start := time.Now()
	v, ok, err := k.Get("CAIRN_GH_READ_TOKEN")
	elapsed := time.Since(start)

	if ok || v != "" || err != nil {
		t.Fatalf("Get() on a blocked backend = (%q, %v, %v), want (\"\", false, nil)", v, ok, err)
	}
	if elapsed > time.Second {
		t.Fatalf("Get() took %s, want it to return at the deadline", elapsed)
	}
}

// TestKeyringLive exercises the real OS keyring on whichever machine runs
// it. It is skipped by default so the suite passes on a headless CI leg
// with no Secret Service and no session keyring; set CAIRN_KEYRING_LIVE=1
// to run it against this machine's own keyring.
func TestKeyringLive(t *testing.T) {
	if os.Getenv("CAIRN_KEYRING_LIVE") == "" {
		t.Skip("set CAIRN_KEYRING_LIVE=1 to exercise the real OS keyring")
	}

	const name = "CAIRN_KEYRING_LIVE_TEST_VAR"
	k := NewKeyring()
	if err := k.Set(name, "live-round-trip"); err != nil {
		t.Fatalf("Set() = %v", err)
	}
	v, ok, err := k.Get(name)
	if !ok || v != "live-round-trip" || err != nil {
		t.Fatalf("Get() = (%q, %v, %v), want (\"live-round-trip\", true, nil)", v, ok, err)
	}
}

// TestKeyringLibraryOnlyInKeyringGo asserts no other file under the module
// imports github.com/zalando/go-keyring, so every keyring call goes through
// this file.
func TestKeyringLibraryOnlyInKeyringGo(t *testing.T) {
	_, thisFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve this file's own path")
	}
	// thisFile is tool/internal/secrets/keyring_test.go; strip the file
	// name, then walk up two directories from internal/secrets to reach
	// the module root.
	root := filepath.Dir(filepath.Dir(filepath.Dir(thisFile)))
	if _, err := os.Stat(filepath.Join(root, "go.mod")); err != nil {
		t.Fatalf("resolved root %s has no go.mod: %v", root, err)
	}

	const importPath = `"github.com/zalando/go-keyring"`
	var offenders []string
	err := filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			if d.Name() == ".git" {
				return filepath.SkipDir
			}
			return nil
		}
		if !strings.HasSuffix(path, ".go") {
			return nil
		}
		base := filepath.Base(path)
		if base == "keyring.go" || base == "keyring_test.go" {
			return nil
		}
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		if strings.Contains(string(data), importPath) {
			rel, relErr := filepath.Rel(root, path)
			if relErr != nil {
				rel = path
			}
			offenders = append(offenders, rel)
		}
		return nil
	})
	if err != nil {
		t.Fatalf("walk %s: %v", root, err)
	}
	if len(offenders) > 0 {
		t.Errorf("files importing go-keyring outside keyring.go: %v", offenders)
	}
}
