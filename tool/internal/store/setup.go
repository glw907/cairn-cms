package store

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"github.com/glw907/cairn-cms/tool/v2/internal/record"
)

// ErrNotResumable reports that an id names no unfinished setup record.
var ErrNotResumable = errors.New("store: not an unfinished setup record")

// SelectResume picks the resume candidates out of entries: records that carry a setup object
// and are not finished. A wizard or adopted record is never a candidate. A setup record from a
// newer tool is left out and reported in errs. only is the sole candidate when exactly one
// exists, and nil otherwise, so several candidates are never chosen for the caller. Selection
// reads the records only; it never keys on a folder.
func SelectResume(entries []Entry) (candidates []Entry, only *Entry, errs []error) {
	for _, e := range entries {
		ok, err := e.Record.Resumable()
		if err != nil {
			errs = append(errs, fmt.Errorf("store: %s: %w", e.ID, err))
			continue
		}
		if ok {
			candidates = append(candidates, e)
		}
	}
	if len(candidates) == 1 {
		only = &candidates[0]
	}
	return candidates, only, errs
}

// LoadResumable loads the record named id for `--resume <id>`, refusing one that is not an
// unfinished setup record or that a newer tool wrote.
func (s *Store) LoadResumable(id string) (record.Record, error) {
	r, err := s.Load(id)
	if err != nil {
		return record.Record{}, err
	}
	ok, err := r.Resumable()
	if err != nil {
		return record.Record{}, fmt.Errorf("store: %s: %w", id, err)
	}
	if !ok {
		return record.Record{}, fmt.Errorf("store: %s: %w", id, ErrNotResumable)
	}
	return r, nil
}

// SaveNew writes r under a new id of the form slug-<6 hex> and returns it. Save replaces
// silently, so SaveNew first draws suffixes until the registry holds none of that id.
func (s *Store) SaveNew(slug string, r record.Record) (string, error) {
	return s.saveNew(slug, r, hexSuffix)
}

const saveNewAttempts = 8

func (s *Store) saveNew(slug string, r record.Record, suffix func() (string, error)) (string, error) {
	for range saveNewAttempts {
		sfx, err := suffix()
		if err != nil {
			return "", fmt.Errorf("store: draw site id: %w", err)
		}
		id := slug + "-" + sfx
		if err := record.ValidateSiteID(id); err != nil {
			return "", err
		}
		_, err = os.Lstat(filepath.Join(s.dir, id+".json"))
		if err == nil {
			continue
		}
		if !os.IsNotExist(err) {
			return "", fmt.Errorf("store: check %s: %w", id, err)
		}
		if err := s.Save(id, r); err != nil {
			return "", err
		}
		return id, nil
	}
	return "", fmt.Errorf("store: no free site id for %q after %d draws", slug, saveNewAttempts)
}

func hexSuffix() (string, error) {
	var b [3]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "", err
	}
	return hex.EncodeToString(b[:]), nil
}
