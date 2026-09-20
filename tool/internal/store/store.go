package store

import (
	"cmp"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"slices"
	"strings"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/record"
)

// ErrUnsafePerms reports that a directory or file the store touched is a
// symlink, is not owned by the current user, or grants access beyond the
// owner. Wrapped with the offending id where one applies.
var ErrUnsafePerms = errors.New("store: unsafe permissions")

// ErrMalformed reports that a record's JSON could not be parsed. Wrapped
// with the offending id.
var ErrMalformed = errors.New("store: malformed record")

// Entry is one listable record: its filename stem, never a key inside the
// record itself, alongside the parsed record.
type Entry struct {
	ID     string
	Record record.Record
}

// Store reads and writes site records under one registry directory.
type Store struct {
	dir string
}

// Open returns a Store rooted at dir, refusing a dir that is a symlink or
// not owned by the current user. It performs no permission-bit check: a
// loosely permissioned directory is caught per-operation by List and Load,
// since a directory's mode can loosen after Open returns.
func Open(dir string) (*Store, error) {
	info, err := os.Lstat(dir)
	if err != nil {
		return nil, fmt.Errorf("store: open %s: %w", dir, err)
	}
	if info.Mode()&os.ModeSymlink != 0 {
		return nil, fmt.Errorf("store: open %s: %w", dir, ErrUnsafePerms)
	}
	if !info.IsDir() {
		return nil, fmt.Errorf("store: open %s: not a directory", dir)
	}
	if err := checkNotReparsePoint(dir, info); err != nil {
		return nil, fmt.Errorf("store: open %s: %w", dir, err)
	}
	if err := checkOwner(dir, info); err != nil {
		return nil, fmt.Errorf("store: open %s: %w", dir, err)
	}
	return &Store{dir: dir}, nil
}

// List returns every listable record in the registry directory as an
// Entry, sorted by the record's Name with the id as tiebreak. A filename
// stem that record.ValidateSiteID rejects, a retired record's dotted stem
// among them, is skipped silently. A stem that validates but fails to open
// or parse is skipped and reported in the returned error slice instead of
// failing the whole list.
func (s *Store) List() ([]Entry, []error) {
	if err := checkPath(s.dir); err != nil {
		return nil, []error{fmt.Errorf("store: list %s: %w", s.dir, err)}
	}

	dirEntries, err := os.ReadDir(s.dir)
	if err != nil {
		return nil, []error{fmt.Errorf("store: list %s: %w", s.dir, err)}
	}

	var entries []Entry
	var errs []error
	for _, de := range dirEntries {
		if de.IsDir() {
			continue
		}
		id, ok := strings.CutSuffix(de.Name(), ".json")
		if !ok {
			continue
		}
		if err := record.ValidateSiteID(id); err != nil {
			continue
		}
		r, err := s.Load(id)
		if err != nil {
			errs = append(errs, err)
			continue
		}
		entries = append(entries, Entry{ID: id, Record: r})
	}

	slices.SortFunc(entries, func(a, b Entry) int {
		return cmp.Or(cmp.Compare(a.Record.Name, b.Record.Name), cmp.Compare(a.ID, b.ID))
	})
	return entries, errs
}

// checkPath lstats path and rejects it when it is a symlink, a Windows
// reparse point, or grants access beyond the owner. Load and List each
// check the registry directory and the record file through this one
// function, since a directory Open already verified can be swapped for a
// symlink or a junction before a later operation reads through it.
func checkPath(path string) error {
	info, err := os.Lstat(path)
	if err != nil {
		return err
	}
	if err := checkNotReparsePoint(path, info); err != nil {
		return err
	}
	return checkSafePerm(path, info)
}

// Load reads and parses the record named id, refusing a registry directory
// or record file that is a symlink, a reparse point, or grants access
// beyond the owner.
func (s *Store) Load(id string) (record.Record, error) {
	if err := record.ValidateSiteID(id); err != nil {
		return record.Record{}, err
	}

	if err := checkPath(s.dir); err != nil {
		return record.Record{}, fmt.Errorf("store: %s: %w", id, err)
	}

	path := filepath.Join(s.dir, id+".json")
	if err := checkPath(path); err != nil {
		return record.Record{}, fmt.Errorf("store: %s: %w", id, err)
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return record.Record{}, fmt.Errorf("store: %s: %w", id, err)
	}
	r, err := record.Parse(data)
	if err != nil {
		return record.Record{}, fmt.Errorf("store: %s: %w (%v)", id, ErrMalformed, err)
	}
	return r, nil
}

// Save writes r under id, replacing whatever the registry held for that id.
// It sets SchemaVersion to 1 when r arrives with no schema version, creates
// a missing registry directory at 0700, and writes through a temp file in
// the same directory, fsynced and renamed into place, so a crash mid-write
// never leaves a partial record.
func (s *Store) Save(id string, r record.Record) error {
	if err := record.ValidateSiteID(id); err != nil {
		return err
	}
	if r.SchemaVersion == 0 {
		r.SchemaVersion = 1
	}
	data, err := r.Marshal()
	if err != nil {
		return fmt.Errorf("store: marshal %s: %w", id, err)
	}
	if err := os.MkdirAll(s.dir, 0o700); err != nil {
		return fmt.Errorf("store: create directory: %w", err)
	}
	if err := ensureOwnerOnlyDir(s.dir); err != nil {
		return fmt.Errorf("store: secure directory: %w", err)
	}

	tmpPath := filepath.Join(s.dir, fmt.Sprintf(".%s.tmp-%d-%d", id, os.Getpid(), time.Now().UnixNano()))
	f, err := openNoFollow(tmpPath)
	if err != nil {
		return fmt.Errorf("store: create temp file for %s: %w", id, err)
	}
	if _, err := f.Write(data); err != nil {
		_ = f.Close()
		_ = os.Remove(tmpPath)
		return fmt.Errorf("store: write %s: %w", id, err)
	}
	if err := f.Sync(); err != nil {
		_ = f.Close()
		_ = os.Remove(tmpPath)
		return fmt.Errorf("store: sync %s: %w", id, err)
	}
	if err := f.Close(); err != nil {
		_ = os.Remove(tmpPath)
		return fmt.Errorf("store: close %s: %w", id, err)
	}

	finalPath := filepath.Join(s.dir, id+".json")
	if err := os.Rename(tmpPath, finalPath); err != nil {
		_ = os.Remove(tmpPath)
		return fmt.Errorf("store: save %s: %w", id, err)
	}
	if err := fsyncDir(s.dir); err != nil {
		return fmt.Errorf("store: sync directory: %w", err)
	}
	return nil
}

// fsyncDir fsyncs dir itself, so a rename into it survives a crash.
// FlushFileBuffers on a directory handle is not guaranteed on Windows,
// where NTFS's own write-ahead logging makes the extra fsync moot, so a
// failure there is not treated as fatal.
func fsyncDir(dir string) error {
	d, err := os.Open(dir)
	if err != nil {
		return err
	}
	defer func() { _ = d.Close() }()
	if err := d.Sync(); err != nil && runtime.GOOS != "windows" {
		return err
	}
	return nil
}
