package secrets

import (
	"errors"
	"fmt"
	"strings"
	"time"
)

// SetupEntryPrefix begins the name of every keyring entry setup writes. The auth commands work a
// fixed list of CAIRN_ variable names, so no entry under this prefix is one they list or unset.
const SetupEntryPrefix = "setup/"

// EntryKind is the kind of entry a setup run stores, named under the run by SetupStore.Entry.
type EntryKind string

// The kinds of entry a setup run stores. The Cloudflare OAuth pair takes two entries so each
// token is held to MaxEntryBytes separately. EntryProbe is the opening check's throwaway entry.
const (
	EntryCloudflareAccess  EntryKind = "cloudflare-access"
	EntryCloudflareRefresh EntryKind = "cloudflare-refresh"
	EntryAppKey            EntryKind = "app-key"
	EntryAppClientSecret   EntryKind = "app-client-secret"
	EntryProbe             EntryKind = "probe"
)

// MaxEntryBytes is the largest value go-keyring's Windows backend stores ("password may not
// exceed 2560 bytes"). SetupStore.Put holds every platform to it, so a value that would fail on
// Windows fails the same way everywhere. A 2048-bit PEM is about 1.7 KB and is stored as-is.
const MaxEntryBytes = 2560

// ErrEntryTooLarge reports a value over MaxEntryBytes, refused before any keyring call.
var ErrEntryTooLarge = errors.New("secrets: value exceeds the keyring's 2560-byte limit")

// ErrResumable marks a stop that leaves the run resumable: the keyring did not take a value the
// run cannot go on without, and nothing stale was handed back in its place.
var ErrResumable = errors.New("secrets: setup stopped and can resume")

// OAuthPair is a Cloudflare OAuth access and refresh token.
type OAuthPair struct {
	Access  string
	Refresh string
}

// SetupStore stores one setup run's credentials in the OS keyring, each entry named under
// setup/<run id>/. It holds no value itself; every call goes through Keyring's deadline.
type SetupStore struct {
	runID string
}

// NewSetupStore returns the store for runID, which must be non-empty and hold no slash, so one
// run's prefix never contains another's.
func NewSetupStore(runID string) (SetupStore, error) {
	if runID == "" || strings.Contains(runID, "/") {
		return SetupStore{}, fmt.Errorf("secrets: run id %q must be non-empty and hold no slash", runID)
	}
	return SetupStore{runID: runID}, nil
}

// Entry returns the keyring name of kind's entry under the run. The record lists these names
// before each entry is written, so DeleteEntries can reach every one.
func (s SetupStore) Entry(kind EntryKind) string {
	return s.prefix() + string(kind)
}

func (s SetupStore) prefix() string {
	return SetupEntryPrefix + s.runID + "/"
}

// Probe writes, reads back, and deletes EntryProbe, giving each call up to deadline rather than
// the two seconds every other call takes, so an unlock prompt has time to be answered. A
// missing, locked, or refusing keyring reports ErrKeyringUnavailable before the run has stored
// anything.
func (s SetupStore) Probe(deadline time.Duration) error {
	name := s.Entry(EntryProbe)
	const want = "cairn keyring probe"
	get, set, del := keyringGet, keyringSet, keyringDelete
	_, err := withDeadlineOf(deadline, func() (struct{}, error) {
		return struct{}{}, set(service, name, want)
	})
	if err != nil {
		return fmt.Errorf("probe write: %w", ErrKeyringUnavailable)
	}
	got, readErr := withDeadlineOf(deadline, func() (string, error) {
		return get(service, name)
	})
	_, deleteErr := withDeadlineOf(deadline, func() (struct{}, error) {
		return struct{}{}, del(service, name)
	})
	if readErr != nil || got != want {
		return fmt.Errorf("probe read: %w", ErrKeyringUnavailable)
	}
	if deleteErr != nil {
		return fmt.Errorf("probe delete: %w", ErrKeyringUnavailable)
	}
	return nil
}

// Put stores value as kind's entry, replacing any value already there. A value over
// MaxEntryBytes returns ErrEntryTooLarge without a keyring call; any keyring failure returns
// ErrKeyringUnavailable. A failed Put may still land later, since a call abandoned at its
// deadline keeps running, so the record keeps the entry's name either way.
func (s SetupStore) Put(kind EntryKind, value string) error {
	name := s.Entry(kind)
	if len(value) > MaxEntryBytes {
		return fmt.Errorf("store %s: %w", name, ErrEntryTooLarge)
	}
	if err := (Keyring{}).Set(name, value); err != nil {
		return fmt.Errorf("store %s: %w", name, err)
	}
	return nil
}

// Value reads kind's entry. ErrNotFound means the keyring holds no such entry, and
// ErrKeyringUnavailable means it could not be consulted.
func (s SetupStore) Value(kind EntryKind) (string, error) {
	return read(s.Entry(kind))
}

// PutPair stores p as two entries. The refresh token goes first: it is the one that yields a new
// pair, so a write that fails between the two leaves the token a resume can still use.
func (s SetupStore) PutPair(p OAuthPair) error {
	if err := s.Put(EntryCloudflareRefresh, p.Refresh); err != nil {
		return err
	}
	return s.Put(EntryCloudflareAccess, p.Access)
}

// Pair reads the stored OAuth pair.
func (s SetupStore) Pair() (OAuthPair, error) {
	access, err := s.Value(EntryCloudflareAccess)
	if err != nil {
		return OAuthPair{}, fmt.Errorf("read %s: %w", s.Entry(EntryCloudflareAccess), err)
	}
	refresh, err := s.Value(EntryCloudflareRefresh)
	if err != nil {
		return OAuthPair{}, fmt.Errorf("read %s: %w", s.Entry(EntryCloudflareRefresh), err)
	}
	return OAuthPair{Access: access, Refresh: refresh}, nil
}

// Refresh hands the stored pair to refresh and stores the pair it returns before returning it.
// A refresh revokes the old access token as it issues the new pair, so on any failure Refresh
// returns the zero pair, never the old one. A failed read or write wraps ErrResumable; a failed
// refresh call's error comes back unwrapped, for the caller to classify.
func (s SetupStore) Refresh(refresh func(current OAuthPair) (OAuthPair, error)) (OAuthPair, error) {
	current, err := s.Pair()
	if err != nil {
		return OAuthPair{}, fmt.Errorf("%w: %w", ErrResumable, err)
	}
	next, err := refresh(current)
	if err != nil {
		return OAuthPair{}, err
	}
	if err := s.PutPair(next); err != nil {
		return OAuthPair{}, fmt.Errorf("%w: keep the refreshed pair: %w", ErrResumable, err)
	}
	return next, nil
}

// DeleteEntries deletes every entry names lists, the names a record holds, including one whose
// Put failed, since an abandoned write can land after its deadline. An entry already gone counts
// as deleted. A name outside this run's prefix is refused and left alone, so a damaged record
// can never clear an auth variable or another run's entry. It tries every name and joins the
// failures.
func (s SetupStore) DeleteEntries(names []string) error {
	var errs []error
	for _, name := range names {
		if !strings.HasPrefix(name, s.prefix()) {
			errs = append(errs, fmt.Errorf("refuse to delete %s: not an entry of run %s", name, s.runID))
			continue
		}
		err := (Keyring{}).Delete(name)
		if err != nil && !errors.Is(err, ErrNotFound) {
			errs = append(errs, fmt.Errorf("delete %s: %w", name, err))
		}
	}
	return errors.Join(errs...)
}
