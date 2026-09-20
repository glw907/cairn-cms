package store

import (
	"errors"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"github.com/glw907/cairn-cms/tool/internal/record"
)

// TestListSkipsMalformedAndRetired is the 2.0 seam test named in the ADR
// and the plan's seams table: List over a directory of three live
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

// TestSaveThenLoadRoundTrip proves the umask-safety claim: Save's temp
// file is created at mode 0600 and the registry directory at 0700, both
// with zero group/other bits, so no umask can loosen or tighten either
// beyond what Save already requested.
func TestSaveThenLoadRoundTrip(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("umask has no meaning on Windows")
	}
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

// TestSaveVersion0Upgrade covers the schema version contract: a version 0
// record loads as SchemaVersion == 0, Save writes schemaVersion 1, and a
// second Load observes 1, all while the ordered tail round-trips.
func TestSaveVersion0Upgrade(t *testing.T) {
	dir := t.TempDir()
	data, err := os.ReadFile(filepath.Join("..", "record", "testdata", "v0-with-secrets.json"))
	if err != nil {
		t.Fatalf("read fixture: %v", err)
	}
	if err := os.WriteFile(filepath.Join(dir, "site-fixture-abcdef.json"), data, 0o600); err != nil {
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
	wantTail, err := r.Marshal()
	if err != nil {
		t.Fatalf("Marshal before Save: %v", err)
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
	if string(got) != withVersionOne(t, string(wantTail)) {
		t.Errorf("Save did not preserve the ordered tail byte for byte:\ngot:  %s\nwant: %s", got, withVersionOne(t, string(wantTail)))
	}
}

// withVersionOne re-marshals a version-0 record's bytes with schemaVersion
// set to 1, using record.Parse plus a mutated SchemaVersion, giving the
// test an independently derived expectation rather than trusting Save's
// own output.
func withVersionOne(t *testing.T, v0 string) string {
	t.Helper()
	r, err := record.Parse([]byte(v0))
	if err != nil {
		t.Fatalf("parse fixture for comparison: %v", err)
	}
	r.SchemaVersion = 1
	out, err := r.Marshal()
	if err != nil {
		t.Fatalf("marshal comparison record: %v", err)
	}
	return string(out)
}
