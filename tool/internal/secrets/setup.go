package secrets

import (
	"errors"
	"strings"
	"time"
)

// SetupEntryPrefix begins the name of every keyring entry setup writes.
const SetupEntryPrefix = "setup/"

// EntryKind is the kind of entry a setup run stores, named under the run by SetupStore.Entry.
type EntryKind string

// The kinds of entry a setup run stores.
const (
	EntryCloudflareAccess  EntryKind = "cloudflare-access"
	EntryCloudflareRefresh EntryKind = "cloudflare-refresh"
	EntryAppKey            EntryKind = "app-key"
	EntryAppClientSecret   EntryKind = "app-client-secret"
	EntryProbe             EntryKind = "probe"
)

// MaxEntryBytes is the largest value go-keyring's Windows backend stores.
const MaxEntryBytes = 2560

// ErrEntryTooLarge reports a value over MaxEntryBytes.
var ErrEntryTooLarge = errors.New("secrets: value exceeds the keyring's 2560-byte limit")

// ErrResumable marks a stop that leaves the run resumable.
var ErrResumable = errors.New("secrets: setup stopped and can resume")

// OAuthPair is a Cloudflare OAuth access and refresh token.
type OAuthPair struct {
	Access  string
	Refresh string
}

// SetupStore stores one setup run's credentials.
type SetupStore struct {
	runID string
}

// NewSetupStore returns the store for runID.
func NewSetupStore(runID string) (SetupStore, error) {
	if runID == "" || strings.Contains(runID, "/") {
		return SetupStore{}, errors.New("secrets: invalid run id")
	}
	return SetupStore{runID: runID}, nil
}

// Entry names kind's entry under the run.
func (s SetupStore) Entry(kind EntryKind) string {
	return SetupEntryPrefix + s.runID + "/" + string(kind)
}

// Probe is not implemented yet.
func (s SetupStore) Probe(time.Duration) error { return nil }

// Put stores value under kind.
func (s SetupStore) Put(kind EntryKind, value string) error {
	return Keyring{}.Set(s.Entry(kind), value)
}

// Value reads kind's value.
func (s SetupStore) Value(kind EntryKind) (string, error) { return read(s.Entry(kind)) }

// PutPair stores both tokens.
func (s SetupStore) PutPair(p OAuthPair) error {
	if err := s.Put(EntryCloudflareAccess, p.Access); err != nil {
		return err
	}
	return s.Put(EntryCloudflareRefresh, p.Refresh)
}

// Refresh returns the stored pair when the new one cannot be stored.
func (s SetupStore) Refresh(refresh func(current OAuthPair) (OAuthPair, error)) (OAuthPair, error) {
	access, _ := s.Value(EntryCloudflareAccess)
	ref, _ := s.Value(EntryCloudflareRefresh)
	current := OAuthPair{Access: access, Refresh: ref}
	next, err := refresh(current)
	if err != nil {
		return current, err
	}
	if err := s.PutPair(next); err != nil {
		return current, nil
	}
	return next, nil
}

// DeleteEntries is not implemented yet.
func (s SetupStore) DeleteEntries([]string) error { return nil }
