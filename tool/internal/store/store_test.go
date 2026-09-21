package store

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"github.com/glw907/cairn-cms/tool/internal/record"
)

// TestListSkipsMalformedAndRetired is the 2.0 seam test named in the ADR's
// seams table: List over a directory of three live
// records, one malformed, and one retired returns three entries carrying
// their ids, and one skip error naming the malformed file's id, rather
// than failing the whole list.
func TestListSkipsMalformedAndRetired(t *testing.T) {
	dir := t.TempDir()
	write := func(name, body string) {
		if err := os.WriteFile(filepath.Join(dir, name), []byte(body), 0o600); err != nil {
			t.Fatalf("write %s: %v", name, err)
		}
	}
	write("site-alpha-aaaaaa.json", `{"name":"Charlie"}`)
	write("site-bravo-bbbbbb.json", `{"name":"Alpha"}`)
	write("site-delta-dddddd.json", `{"name":"Bravo"}`)
	write("site-broken-cccccc.json", `not json`)
	write("site-retired-eeeeee.retired-1700000000000.json", `{"name":"Retired"}`)

	if err := os.Chmod(dir, 0o700); err != nil {
		t.Fatalf("chmod dir: %v", err)
	}
	s, err := Open(dir)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}

	entries, errs := s.List()

	if len(errs) != 1 {
		t.Fatalf("List() errs = %v, want exactly one skip error", errs)
	}
	if !errors.Is(errs[0], ErrMalformed) {
		t.Errorf("List() error = %v, want it to wrap ErrMalformed", errs[0])
	}
	if !strings.Contains(errs[0].Error(), "site-broken-cccccc") {
		t.Errorf("List() error = %v, want it to name site-broken-cccccc", errs[0])
	}

	if len(entries) != 3 {
		t.Fatalf("List() entries = %d, want 3", len(entries))
	}
	gotIDs := []string{entries[0].ID, entries[1].ID, entries[2].ID}
	wantIDs := []string{"site-bravo-bbbbbb", "site-delta-dddddd", "site-alpha-aaaaaa"} // sorted by Name: Alpha, Bravo, Charlie
	for i := range wantIDs {
		if gotIDs[i] != wantIDs[i] {
			t.Errorf("List() entries[%d].ID = %q, want %q (sorted by Record.Name)", i, gotIDs[i], wantIDs[i])
		}
	}
}

// TestSaveThenLoadRoundTrip proves the umask-safety claim on POSIX: Save's
// temp file is created at mode 0600 and the registry directory at 0700,
// both with zero group/other bits, so no umask can loosen or tighten
// either beyond what Save already requested. setUmask is a no-op on
// Windows, which has no umask concept, but the test still runs there: it
// proves a freshly saved record passes checkSafePerm and reads back, which
// is where a Windows DACL regression would show up.
func TestSaveThenLoadRoundTrip(t *testing.T) {
	for _, mask := range []int{0o022, 0o002} {
		t.Run(modeName(mask), func(t *testing.T) {
			old := setUmask(mask)
			defer setUmask(old)

			dir := filepath.Join(t.TempDir(), "sites")
			s, err := openForWrite(t, dir)
			if err != nil {
				t.Fatalf("openForWrite: %v", err)
			}

			want := record.Record{Name: "Roundtrip Site", Domain: "example.com"}
			if err := s.Save("roundtrip-site-abcdef", want); err != nil {
				t.Fatalf("Save: %v", err)
			}

			got, err := s.Load("roundtrip-site-abcdef")
			if err != nil {
				t.Fatalf("Load: %v", err)
			}
			if got.Name != want.Name || got.Domain != want.Domain {
				t.Errorf("Load() = %+v, want Name/Domain from %+v", got, want)
			}
			if got.SchemaVersion != 1 {
				t.Errorf("Load().SchemaVersion = %d, want 1", got.SchemaVersion)
			}

			if runtime.GOOS == "windows" {
				// NTFS has no mode bits; Windows expresses this
				// invariant through the DACL, which Load's
				// checkSafePerm call above already proved by not
				// returning ErrUnsafePerms.
				return
			}
			info, err := os.Stat(dir)
			if err != nil {
				t.Fatalf("stat directory: %v", err)
			}
			if info.Mode().Perm()&0o077 != 0 {
				t.Errorf("directory mode = %o, want no group/other bits", info.Mode().Perm())
			}
			fileInfo, err := os.Stat(filepath.Join(dir, "roundtrip-site-abcdef.json"))
			if err != nil {
				t.Fatalf("stat file: %v", err)
			}
			if fileInfo.Mode().Perm()&0o077 != 0 {
				t.Errorf("file mode = %o, want no group/other bits", fileInfo.Mode().Perm())
			}
		})
	}
}

func modeName(mask int) string {
	return "umask " + os.FileMode(mask).String()
}

// openForWrite opens dir as a Store, tolerating the ENOENT Open would
// otherwise return before Save has created the directory: Save creates a
// missing directory itself, so a fresh Store here just remembers the path.
func openForWrite(t *testing.T, dir string) (*Store, error) {
	t.Helper()
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return nil, err
	}
	return Open(dir)
}

// TestLoadUnsafePerms is the POSIX half of the unsafe-perms check: a
// world-readable record file or a group-and-world-accessible directory
// both fail Load with ErrUnsafePerms, and neither is silently repaired.
func TestLoadUnsafePerms(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("mode bits are not the unsafe-perms mechanism on Windows; see perm_windows_test.go")
	}

	t.Run("0644 record file", func(t *testing.T) {
		dir := t.TempDir()
		if err := os.Chmod(dir, 0o700); err != nil {
			t.Fatalf("chmod dir: %v", err)
		}
		path := filepath.Join(dir, "loose-file-abcdef.json")
		if err := os.WriteFile(path, []byte(`{"name":"x"}`), 0o644); err != nil {
			t.Fatalf("write: %v", err)
		}
		s, err := Open(dir)
		if err != nil {
			t.Fatalf("Open: %v", err)
		}
		before, statErr := os.Stat(path)
		if statErr != nil {
			t.Fatalf("stat: %v", statErr)
		}

		_, err = s.Load("loose-file-abcdef")
		if !errors.Is(err, ErrUnsafePerms) {
			t.Fatalf("Load() = %v, want ErrUnsafePerms", err)
		}

		after, statErr := os.Stat(path)
		if statErr != nil {
			t.Fatalf("stat: %v", statErr)
		}
		if after.Mode() != before.Mode() {
			t.Errorf("Load() chmod'd the file: before %o, after %o", before.Mode(), after.Mode())
		}
	})

	t.Run("0775 directory", func(t *testing.T) {
		dir := t.TempDir()
		path := filepath.Join(dir, "loose-dir-abcdef.json")
		if err := os.WriteFile(path, []byte(`{"name":"x"}`), 0o600); err != nil {
			t.Fatalf("write: %v", err)
		}
		if err := os.Chmod(dir, 0o775); err != nil {
			t.Fatalf("chmod dir: %v", err)
		}
		s, err := Open(dir)
		if err != nil {
			t.Fatalf("Open: %v", err)
		}

		_, err = s.Load("loose-dir-abcdef")
		if !errors.Is(err, ErrUnsafePerms) {
			t.Fatalf("Load() = %v, want ErrUnsafePerms", err)
		}
	})
}

// TestOpenRefusesSymlinkedDirectory covers Open's own check, distinct from
// Load's per-operation permission check: a symlinked registry directory is
// refused up front.
func TestOpenRefusesSymlinkedDirectory(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("symlink creation requires elevated privilege on Windows CI runners")
	}
	base := t.TempDir()
	real := filepath.Join(base, "real")
	if err := os.Mkdir(real, 0o700); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	link := filepath.Join(base, "link")
	if err := os.Symlink(real, link); err != nil {
		t.Fatalf("symlink: %v", err)
	}

	_, err := Open(link)
	if !errors.Is(err, ErrUnsafePerms) {
		t.Fatalf("Open(symlink) = %v, want ErrUnsafePerms", err)
	}
}

// TestLoadRefusesSymlinkedDirectory covers Load's own directory check,
// distinct from Open's up-front check: a directory Open verified can be
// swapped for a symlink afterward, and Load must still refuse it rather
// than reading through the replacement.
func TestLoadRefusesSymlinkedDirectory(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("symlink creation requires elevated privilege on Windows CI runners")
	}
	base := t.TempDir()
	real := filepath.Join(base, "real")
	if err := os.Mkdir(real, 0o700); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	path := filepath.Join(real, "site-swapped-abcdef.json")
	if err := os.WriteFile(path, []byte(`{"name":"x"}`), 0o600); err != nil {
		t.Fatalf("write: %v", err)
	}
	link := filepath.Join(base, "link")
	if err := os.Symlink(real, link); err != nil {
		t.Fatalf("symlink: %v", err)
	}

	s := &Store{dir: link}
	_, err := s.Load("site-swapped-abcdef")
	if !errors.Is(err, ErrUnsafePerms) {
		t.Fatalf("Load(through symlinked directory) = %v, want ErrUnsafePerms", err)
	}
}

// TestSaveVersion0Upgrade covers the schema version contract: a version 0
// record loads as SchemaVersion == 0, Save writes schemaVersion 1, and a
// second Load observes 1, while every secret-bearing key Marshal never
// types (github.clientId, github.clientSecret, github.pem,
// github.ownerType, cloudflare.apiToken) round-trips byte for byte against
// the fixture's own bytes, not a value Marshal itself derived.
func TestSaveVersion0Upgrade(t *testing.T) {
	dir := t.TempDir()
	fixture, err := os.ReadFile(filepath.Join("testdata", "v0-with-secrets.json"))
	if err != nil {
		t.Fatalf("read fixture: %v", err)
	}
	if err := os.WriteFile(filepath.Join(dir, "site-fixture-abcdef.json"), fixture, 0o600); err != nil {
		t.Fatalf("seed fixture: %v", err)
	}
	if err := os.Chmod(dir, 0o700); err != nil {
		t.Fatalf("chmod dir: %v", err)
	}

	s, err := Open(dir)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}

	r, err := s.Load("site-fixture-abcdef")
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if r.SchemaVersion != 0 {
		t.Fatalf("first Load().SchemaVersion = %d, want 0", r.SchemaVersion)
	}

	if err := s.Save("site-fixture-abcdef", r); err != nil {
		t.Fatalf("Save: %v", err)
	}

	again, err := s.Load("site-fixture-abcdef")
	if err != nil {
		t.Fatalf("second Load: %v", err)
	}
	if again.SchemaVersion != 1 {
		t.Fatalf("second Load().SchemaVersion = %d, want 1", again.SchemaVersion)
	}

	got, err := again.Marshal()
	if err != nil {
		t.Fatalf("Marshal after Save: %v", err)
	}

	for _, path := range [][]string{
		{"github", "clientId"},
		{"github", "clientSecret"},
		{"github", "pem"},
		{"github", "ownerType"},
		{"cloudflare", "apiToken"},
	} {
		want := rawField(t, fixture, path)
		gotVal := rawField(t, got, path)
		if string(gotVal) != string(want) {
			t.Errorf("path %v: got %s, want %s (an untouched key must round-trip byte for byte)", path, gotVal, want)
		}
	}
}

// rawField reads the raw JSON value at the dotted path in data, without
// decoding it into any typed field, so a test can compare an untouched
// key's bytes independent of record.Marshal's own output on the other
// side of the comparison.
func rawField(t *testing.T, data []byte, path []string) json.RawMessage {
	t.Helper()
	cur := json.RawMessage(data)
	for _, key := range path {
		var obj map[string]json.RawMessage
		if err := json.Unmarshal(cur, &obj); err != nil {
			t.Fatalf("rawField %v: unmarshal object: %v", path, err)
		}
		v, ok := obj[key]
		if !ok {
			t.Fatalf("rawField %v: missing key %q", path, key)
		}
		cur = v
	}
	return cur
}
