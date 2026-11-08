package secrets

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"errors"
	"go/build"
	"os"
	"os/exec"
	"path/filepath"
	"reflect"
	"runtime"
	"slices"
	"strings"
	"sync"
	"testing"
	"time"
)

// memKeyring stands in for the OS keyring behind the keyringGet, keyringSet, and keyringDelete
// package vars, so no test here reaches a real keyring. A name in setFails makes Set report a
// failure and store nothing; a name in setLands makes Set report a failure and store the value
// anyway, the shape of a call abandoned at its deadline that completes afterwards.
type memKeyring struct {
	mu       sync.Mutex
	entries  map[string]string
	setFails map[string]bool
	setLands map[string]bool
	sets     int
}

func swapKeyring(t *testing.T) *memKeyring {
	t.Helper()
	m := &memKeyring{
		entries:  map[string]string{},
		setFails: map[string]bool{},
		setLands: map[string]bool{},
	}
	prevGet, prevSet, prevDelete := keyringGet, keyringSet, keyringDelete
	keyringGet, keyringSet, keyringDelete = m.get, m.set, m.delete
	t.Cleanup(func() {
		keyringGet, keyringSet, keyringDelete = prevGet, prevSet, prevDelete
	})
	return m
}

func (m *memKeyring) get(svc, name string) (string, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	v, ok := m.entries[svc+"|"+name]
	if !ok {
		return "", ErrNotFound
	}
	return v, nil
}

func (m *memKeyring) set(svc, name, value string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.sets++
	if m.setFails[name] {
		return errors.New("backend refused the write")
	}
	m.entries[svc+"|"+name] = value
	if m.setLands[name] {
		return errors.New("deadline passed before the write returned")
	}
	return nil
}

func (m *memKeyring) delete(svc, name string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.entries[svc+"|"+name]; !ok {
		return ErrNotFound
	}
	delete(m.entries, svc+"|"+name)
	return nil
}

// names lists the entry names held under the cairn service, sorted.
func (m *memKeyring) names() []string {
	m.mu.Lock()
	defer m.mu.Unlock()
	var out []string
	for k := range m.entries {
		out = append(out, strings.TrimPrefix(k, service+"|"))
	}
	slices.Sort(out)
	return out
}

func (m *memKeyring) value(name string) (string, bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	v, ok := m.entries[service+"|"+name]
	return v, ok
}

func newStore(t *testing.T, runID string) SetupStore {
	t.Helper()
	s, err := NewSetupStore(runID)
	if err != nil {
		t.Fatalf("NewSetupStore(%q) = %v", runID, err)
	}
	return s
}

func TestSetupStoreNamesEntriesUnderTheRun(t *testing.T) {
	s := newStore(t, "run-1")
	for kind, want := range map[EntryKind]string{
		EntryCloudflareAccess:  "setup/run-1/cloudflare-access",
		EntryCloudflareRefresh: "setup/run-1/cloudflare-refresh",
		EntryAppKey:            "setup/run-1/app-key",
		EntryAppClientSecret:   "setup/run-1/app-client-secret",
		EntryProbe:             "setup/run-1/probe",
	} {
		if got := s.Entry(kind); got != want {
			t.Errorf("Entry(%q) = %q, want %q", kind, got, want)
		}
	}

	for _, bad := range []string{"", "a/b"} {
		if _, err := NewSetupStore(bad); err == nil {
			t.Errorf("NewSetupStore(%q) = nil error, want a refusal", bad)
		}
	}
}

func TestRefreshStoresTheNewPairBeforeReturningIt(t *testing.T) {
	m := swapKeyring(t)
	s := newStore(t, "run-1")
	old := OAuthPair{Access: "old-access", Refresh: "old-refresh"}
	if err := s.PutPair(old); err != nil {
		t.Fatalf("PutPair() = %v", err)
	}
	fresh := OAuthPair{Access: "new-access", Refresh: "new-refresh"}

	var handed OAuthPair
	got, err := s.Refresh(func(current OAuthPair) (OAuthPair, error) {
		handed = current
		return fresh, nil
	})
	if err != nil || got != fresh {
		t.Fatalf("Refresh() = (%+v, %v), want (%+v, nil)", got, err, fresh)
	}
	if handed != old {
		t.Errorf("refresh was handed %+v, want the stored pair %+v", handed, old)
	}
	if v, _ := m.value("setup/run-1/cloudflare-access"); v != "new-access" {
		t.Errorf("stored access = %q, want new-access", v)
	}
	if v, _ := m.value("setup/run-1/cloudflare-refresh"); v != "new-refresh" {
		t.Errorf("stored refresh = %q, want new-refresh", v)
	}
}

// TestRefreshWhosePersistFailsNeverReturnsTheOldPair covers the refresh rule: the provider has
// already revoked the old access token by the time the new pair is in hand, so a pair the
// keyring did not take must never come back, and neither may the old one.
func TestRefreshWhosePersistFailsNeverReturnsTheOldPair(t *testing.T) {
	for _, failing := range []string{"setup/run-1/cloudflare-access", "setup/run-1/cloudflare-refresh"} {
		t.Run(failing, func(t *testing.T) {
			m := swapKeyring(t)
			s := newStore(t, "run-1")
			old := OAuthPair{Access: "old-access", Refresh: "old-refresh"}
			if err := s.PutPair(old); err != nil {
				t.Fatalf("PutPair() = %v", err)
			}
			m.setFails[failing] = true

			got, err := s.Refresh(func(OAuthPair) (OAuthPair, error) {
				return OAuthPair{Access: "new-access", Refresh: "new-refresh"}, nil
			})
			if !errors.Is(err, ErrResumable) {
				t.Errorf("Refresh() error = %v, want ErrResumable", err)
			}
			if got != (OAuthPair{}) {
				t.Errorf("Refresh() pair = %+v, want the zero pair", got)
			}
		})
	}

	t.Run("refresh call fails", func(t *testing.T) {
		swapKeyring(t)
		s := newStore(t, "run-1")
		if err := s.PutPair(OAuthPair{Access: "old-access", Refresh: "old-refresh"}); err != nil {
			t.Fatalf("PutPair() = %v", err)
		}
		grant := errors.New("invalid_grant")
		got, err := s.Refresh(func(OAuthPair) (OAuthPair, error) { return OAuthPair{}, grant })
		if !errors.Is(err, grant) {
			t.Errorf("Refresh() error = %v, want the refresh call's error", err)
		}
		if got != (OAuthPair{}) {
			t.Errorf("Refresh() pair = %+v, want the zero pair", got)
		}
	})
}

// TestDeleteEntriesRemovesEveryNamedEntryAndNoOther names, the way a record does, an entry whose
// Set reported a failure but landed and one whose Set stored nothing.
func TestDeleteEntriesRemovesEveryNamedEntryAndNoOther(t *testing.T) {
	m := swapKeyring(t)
	s := newStore(t, "run-1")
	other := newStore(t, "run-2")

	m.setLands["setup/run-1/app-key"] = true
	m.setFails["setup/run-1/app-client-secret"] = true
	if err := s.PutPair(OAuthPair{Access: "a", Refresh: "r"}); err != nil {
		t.Fatalf("PutPair() = %v", err)
	}
	if err := s.Put(EntryAppKey, "key"); err == nil {
		t.Fatal("Put(app-key) = nil, want the landed-late failure")
	}
	if err := s.Put(EntryAppClientSecret, "secret"); err == nil {
		t.Fatal("Put(app-client-secret) = nil, want the refused-write failure")
	}
	if err := other.Put(EntryAppKey, "other-key"); err != nil {
		t.Fatalf("other.Put() = %v", err)
	}
	if err := keyringSet(service, "setup/run-1/unlisted", "x"); err != nil {
		t.Fatal(err)
	}
	if err := keyringSet(service, "CAIRN_GH_READ_TOKEN", "ghp_example"); err != nil {
		t.Fatal(err)
	}

	recorded := []string{
		s.Entry(EntryCloudflareAccess),
		s.Entry(EntryCloudflareRefresh),
		s.Entry(EntryAppKey),
		s.Entry(EntryAppClientSecret),
	}
	if err := s.DeleteEntries(recorded); err != nil {
		t.Fatalf("DeleteEntries() = %v, want nil", err)
	}

	want := []string{"CAIRN_GH_READ_TOKEN", "setup/run-1/unlisted", "setup/run-2/app-key"}
	if got := m.names(); !slices.Equal(got, want) {
		t.Errorf("entries left = %v, want %v", got, want)
	}
}

func TestDeleteEntriesRefusesANameOutsideTheRun(t *testing.T) {
	m := swapKeyring(t)
	s := newStore(t, "run-1")
	if err := s.Put(EntryAppKey, "key"); err != nil {
		t.Fatalf("Put() = %v", err)
	}
	for _, name := range []string{"CAIRN_GH_READ_TOKEN", "setup/run-2/app-key"} {
		if err := keyringSet(service, name, "keep"); err != nil {
			t.Fatal(err)
		}
	}

	err := s.DeleteEntries([]string{"CAIRN_GH_READ_TOKEN", "setup/run-2/app-key", s.Entry(EntryAppKey)})
	if err == nil {
		t.Error("DeleteEntries() = nil, want a refusal for the names outside the run")
	}
	want := []string{"CAIRN_GH_READ_TOKEN", "setup/run-2/app-key"}
	if got := m.names(); !slices.Equal(got, want) {
		t.Errorf("entries left = %v, want %v", got, want)
	}
}

// pemKey2048 returns a 2048-bit RSA private key in the PKCS#1 PEM form a GitHub App manifest
// conversion returns.
func pemKey2048(t *testing.T) string {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	return string(pem.EncodeToMemory(&pem.Block{Type: "RSA PRIVATE KEY", Bytes: x509.MarshalPKCS1PrivateKey(key)}))
}

// TestSetupEntriesFitTheWindowsLimit holds every setup value to go-keyring's Windows limit. No
// fixture records Cloudflare's token response yet, so the pair below is a stand-in sized well
// past an opaque token; Put's refusal is what bounds any value on every platform.
func TestSetupEntriesFitTheWindowsLimit(t *testing.T) {
	m := swapKeyring(t)
	s := newStore(t, "run-1")

	key := pemKey2048(t)
	if err := s.Put(EntryAppKey, key); err != nil {
		t.Fatalf("Put(2048-bit PEM) = %v", err)
	}
	pair := OAuthPair{Access: strings.Repeat("a", 1200), Refresh: strings.Repeat("r", 1200)}
	if err := s.PutPair(pair); err != nil {
		t.Fatalf("PutPair() = %v", err)
	}
	if err := s.Put(EntryAppClientSecret, strings.Repeat("0", 40)); err != nil {
		t.Fatalf("Put(client secret) = %v", err)
	}

	for _, name := range m.names() {
		v, _ := m.value(name)
		if len(v) > MaxEntryBytes {
			t.Errorf("%s holds %d bytes, over the %d-byte limit", name, len(v), MaxEntryBytes)
		}
	}
	if v, _ := m.value("setup/run-1/app-key"); v != key {
		t.Error("the stored PEM differs from the one written; it must be stored as-is")
	}

	before := m.sets
	err := s.Put(EntryAppKey, strings.Repeat("x", MaxEntryBytes+1))
	if !errors.Is(err, ErrEntryTooLarge) {
		t.Errorf("Put(oversize) = %v, want ErrEntryTooLarge", err)
	}
	if m.sets != before {
		t.Error("Put(oversize) reached the keyring, want it refused before the write")
	}
}

func TestProbeUsesTheCallersDeadlineAndLeavesNothing(t *testing.T) {
	t.Run("a slow unlock within the deadline passes", func(t *testing.T) {
		m := swapKeyring(t)
		prevDeadline := keyringDeadline
		keyringDeadline = 10 * time.Millisecond
		t.Cleanup(func() { keyringDeadline = prevDeadline })
		set := keyringSet
		keyringSet = func(svc, name, value string) error {
			time.Sleep(50 * time.Millisecond)
			return set(svc, name, value)
		}

		if err := newStore(t, "run-1").Probe(5 * time.Second); err != nil {
			t.Fatalf("Probe() = %v, want nil", err)
		}
		if got := m.names(); len(got) != 0 {
			t.Errorf("entries left after Probe() = %v, want none", got)
		}
	})

	t.Run("a keyring blocked past the deadline is unavailable", func(t *testing.T) {
		swapKeyring(t)
		keyringSet = func(string, string, string) error { select {} }

		start := time.Now()
		err := newStore(t, "run-1").Probe(20 * time.Millisecond)
		if !errors.Is(err, ErrKeyringUnavailable) {
			t.Errorf("Probe() = %v, want ErrKeyringUnavailable", err)
		}
		if elapsed := time.Since(start); elapsed > time.Second {
			t.Errorf("Probe() took %s, want it to return at the deadline", elapsed)
		}
	})

	t.Run("a failed write is unavailable", func(t *testing.T) {
		m := swapKeyring(t)
		m.setFails["setup/run-1/probe"] = true
		if err := newStore(t, "run-1").Probe(time.Second); !errors.Is(err, ErrKeyringUnavailable) {
			t.Errorf("Probe() = %v, want ErrKeyringUnavailable", err)
		}
	})
}

// e2eTag is the build tag under which keyring_e2e.go binds the keyring vars to a file store.
const e2eTag = "cairne2e"

func TestFileStoreCompilesOnlyUnderTheTag(t *testing.T) {
	plain, err := build.Default.ImportDir(".", 0)
	if err != nil {
		t.Fatal(err)
	}
	if slices.Contains(plain.GoFiles, "keyring_e2e.go") {
		t.Error("a default build compiles keyring_e2e.go")
	}
	if !slices.Contains(plain.IgnoredGoFiles, "keyring_e2e.go") {
		t.Errorf("keyring_e2e.go is not among a default build's ignored files %v", plain.IgnoredGoFiles)
	}

	ctx := build.Default
	ctx.BuildTags = []string{e2eTag}
	tagged, err := ctx.ImportDir(".", 0)
	if err != nil {
		t.Fatal(err)
	}
	if !slices.Contains(tagged.GoFiles, "keyring_e2e.go") {
		t.Errorf("a %s build does not compile keyring_e2e.go; its files are %v", e2eTag, tagged.GoFiles)
	}
}

// TestFileStoreRoundTripsAcrossProcesses builds this package's tests under the tag and runs the
// binary twice: the first process writes an entry, and the second reads it back and deletes it.
func TestFileStoreRoundTripsAcrossProcesses(t *testing.T) {
	bin := filepath.Join(t.TempDir(), "secrets.test")
	compile := exec.Command("go", "test", "-c", "-tags", e2eTag, "-o", bin, ".")
	if out, err := compile.CombinedOutput(); err != nil {
		t.Fatalf("build the %s test binary: %v\n%s", e2eTag, err, out)
	}

	dir := t.TempDir()
	key := pemKey2048(t)
	run := func(step string) {
		t.Helper()
		cmd := exec.Command(bin, "-test.run", "^TestFileStoreHelperProcess$", "-test.count=1")
		cmd.Env = append(os.Environ(),
			"CAIRN_E2E_KEYRING_DIR="+dir,
			"CAIRN_E2E_HELPER_STEP="+step,
			"CAIRN_E2E_HELPER_VALUE="+key,
		)
		if out, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("%s process: %v\n%s", step, err, out)
		}
	}

	run("write")
	files, err := os.ReadDir(dir)
	if err != nil || len(files) != 1 {
		t.Fatalf("after the write process the store holds %d files (%v), want 1", len(files), err)
	}
	run("read")
	if files, _ := os.ReadDir(dir); len(files) != 0 {
		t.Errorf("after the read process deleted the entry the store holds %d files, want 0", len(files))
	}
}

// TestFileStoreHelperProcess is the child TestFileStoreRoundTripsAcrossProcesses runs. It does
// nothing unless that test set its step, and it refuses to run unless the keyring vars are bound
// to the file store, so it can never reach a real keyring.
func TestFileStoreHelperProcess(t *testing.T) {
	step := os.Getenv("CAIRN_E2E_HELPER_STEP")
	if step == "" {
		t.Skip("run only as TestFileStoreRoundTripsAcrossProcesses's child")
	}
	bound := runtime.FuncForPC(reflect.ValueOf(keyringSet).Pointer()).Name()
	if !strings.HasSuffix(bound, ".fileSet") {
		t.Fatalf("keyringSet is bound to %s, want the %s file store", bound, e2eTag)
	}

	s := newStore(t, "run-e2e")
	want := os.Getenv("CAIRN_E2E_HELPER_VALUE")
	switch step {
	case "write":
		if err := s.Put(EntryAppKey, want); err != nil {
			t.Fatalf("Put() = %v", err)
		}
	case "read":
		got, err := s.Value(EntryAppKey)
		if err != nil || got != want {
			t.Fatalf("Value() = (%d bytes, %v), want the %d bytes the write process stored", len(got), err, len(want))
		}
		if err := s.DeleteEntries([]string{s.Entry(EntryAppKey)}); err != nil {
			t.Fatalf("DeleteEntries() = %v", err)
		}
		if _, err := s.Value(EntryAppKey); !errors.Is(err, ErrNotFound) {
			t.Fatalf("Value() after delete = %v, want ErrNotFound", err)
		}
	default:
		t.Fatalf("unknown step %q", step)
	}
}
