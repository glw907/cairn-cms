package secrets

import (
	"errors"
	"time"

	zkeyring "github.com/zalando/go-keyring"
)

// service is the OS keyring service name every credential is stored under,
// keyed by the variable name (macOS Keychain, Windows Credential Manager,
// or the Linux Secret Service over D-Bus).
const service = "cairn"

// keyringGet, keyringSet, and keyringDelete are the zalando/go-keyring calls Keyring makes, held
// in package-level vars so a test can swap in a func that blocks or errors without a real
// keyring. keyringDeadline bounds every keyring call: a present bus with a locked collection is
// the one path the underlying library does not bound itself, waiting on an unlock prompt with no
// timeout, and a deadline miss is treated the same as an absent bus so a headless run never
// hangs.
var (
	keyringGet      = zkeyring.Get
	keyringSet      = zkeyring.Set
	keyringDelete   = zkeyring.Delete
	keyringDeadline = 2 * time.Second
)

// ErrKeyringUnavailable reports a keyring the process could not consult at
// all: an unreachable bus, a backend failure, or a deadline miss. It is
// distinct from ErrNotFound, which reports a keyring that answered
// and holds no such entry. The backend's own error text is dropped rather
// than wrapped, so nothing a backend wrote can reach a caller that prints
// the error string. Exported so cmd/cairn's auth commands, which cannot import
// github.com/zalando/go-keyring themselves, can tell an unreachable keyring apart from one that
// simply does not hold an entry.
var ErrKeyringUnavailable = errors.New("secrets: keyring unavailable")

// ErrNotFound reports a keyring the process reached that holds no entry for the given name. It
// is zkeyring.ErrNotFound under an exported name, for the same reason ErrKeyringUnavailable is
// exported: a caller outside this package can classify Delete and Status without importing the
// backend library itself.
var ErrNotFound = zkeyring.ErrNotFound

// Keyring is the Provider and Writer backed by the OS keyring. This is the
// only file in the module permitted to import
// github.com/zalando/go-keyring.
type Keyring struct{}

// NewKeyring returns a Keyring backed by the real OS keyring.
func NewKeyring() Keyring {
	return Keyring{}
}

// Name reports "keyring".
func (Keyring) Name() string {
	return "keyring"
}

// withDeadline runs f and gives up on it after keyringDeadline, answering
// errKeyringUnavailable. f keeps running in its own goroutine after a
// deadline miss: the underlying library takes no context, so a call blocked
// on an unlock prompt can only be abandoned, never cancelled.
func withDeadline[T any](f func() (T, error)) (T, error) {
	type result struct {
		value T
		err   error
	}
	done := make(chan result, 1)
	go func() {
		v, err := f()
		done <- result{value: v, err: err}
	}()

	timer := time.NewTimer(keyringDeadline)
	select {
	case r := <-done:
		timer.Stop()
		return r.value, r.err
	case <-timer.C:
		var zero T
		return zero, ErrKeyringUnavailable
	}
}

// read returns name's stored value, distinguishing the two failures a
// writing caller must tell apart: ErrNotFound means the keyring
// answered and holds no such entry, and ErrKeyringUnavailable means the
// keyring could not be consulted at all.
func read(name string) (string, error) {
	v, err := withDeadline(func() (string, error) {
		return keyringGet(service, name)
	})
	switch {
	case err == nil:
		return v, nil
	case errors.Is(err, ErrNotFound):
		return "", ErrNotFound
	default:
		return "", ErrKeyringUnavailable
	}
}

// Get reads name from the keyring under service. Both of read's failures, an
// absent entry and a keyring that could not be consulted, flatten to a plain
// miss here, which is the Provider contract: an operator with only the
// environment variables set must see the same behavior as one whose platform
// has no keyring running at all.
func (Keyring) Get(name string) (string, bool, error) {
	v, err := read(name)
	if err != nil {
		return "", false, nil
	}
	return v, true, nil
}

// Status reports whether name has an entry in the keyring, distinguishing an absent entry (false,
// nil) from a keyring that could not be consulted at all (false, ErrKeyringUnavailable). Get
// flattens both to a plain miss for credential resolution, since an operator with only the
// environment set must see one shape there; auth set, auth list, and auth unset call Status
// instead when they must report the difference to an operator.
func (Keyring) Status(name string) (present bool, err error) {
	_, err = read(name)
	switch {
	case err == nil:
		return true, nil
	case errors.Is(err, ErrNotFound):
		return false, nil
	default:
		return false, err
	}
}

// Set writes name's value to the keyring, under the same deadline a read
// takes: a locked collection blocks a write the same way. Any failure, a
// deadline miss or a backend error, flattens to ErrKeyringUnavailable: a
// backend refusing a write (a locked collection, a busy bus) is the same
// "could not be consulted" condition read reports, and ErrKeyringUnavailable's
// own doc comment promises that no backend text reaches a caller, so a raw
// backend error is never returned here either.
func (Keyring) Set(name, value string) error {
	_, err := withDeadline(func() (struct{}, error) {
		return struct{}{}, keyringSet(service, name, value)
	})
	if err != nil {
		return ErrKeyringUnavailable
	}
	return nil
}

// Delete removes name's entry from the keyring under the same deadline Get and Set share. A name
// the keyring does not hold reports ErrNotFound rather than a generic failure, so a caller such
// as auth unset can treat it as success (there was nothing to clear) instead of an error; any
// other failure, a deadline miss or a backend error, flattens to ErrKeyringUnavailable, the same
// way Set's does.
func (Keyring) Delete(name string) error {
	_, err := withDeadline(func() (struct{}, error) {
		return struct{}{}, keyringDelete(service, name)
	})
	switch {
	case err == nil:
		return nil
	case errors.Is(err, ErrNotFound):
		return ErrNotFound
	default:
		return ErrKeyringUnavailable
	}
}
