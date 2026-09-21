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

// keyringGet and keyringSet are the zalando/go-keyring calls Keyring makes,
// held in package-level vars so a test can swap in a func that blocks or
// errors without a real keyring. keyringDeadline bounds every keyring
// call: a present bus with a locked collection is the one path the
// underlying library does not bound itself, waiting on an unlock prompt
// with no timeout, and a deadline miss is treated the same as an absent
// bus so a headless run never hangs.
var (
	keyringGet      = zkeyring.Get
	keyringSet      = zkeyring.Set
	keyringDeadline = 2 * time.Second
)

// errKeyringUnavailable reports a keyring the process could not consult at
// all: an unreachable bus, a backend failure, or a deadline miss. It is
// distinct from zkeyring.ErrNotFound, which reports a keyring that answered
// and holds no such entry. The backend's own error text is dropped rather
// than wrapped, so nothing a backend wrote can reach a caller that prints
// the error string.
var errKeyringUnavailable = errors.New("secrets: keyring unavailable")

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
		return zero, errKeyringUnavailable
	}
}

// read returns name's stored value, distinguishing the two failures a
// writing caller must tell apart: zkeyring.ErrNotFound means the keyring
// answered and holds no such entry, and errKeyringUnavailable means the
// keyring could not be consulted at all.
func read(name string) (string, error) {
	v, err := withDeadline(func() (string, error) {
		return keyringGet(service, name)
	})
	switch {
	case err == nil:
		return v, nil
	case errors.Is(err, zkeyring.ErrNotFound):
		return "", zkeyring.ErrNotFound
	default:
		return "", errKeyringUnavailable
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

// Set writes name's value to the keyring, under the same deadline a read
// takes: a locked collection blocks a write the same way. Any failure, a
// deadline miss or a backend error, flattens to errKeyringUnavailable: a
// backend refusing a write (a locked collection, a busy bus) is the same
// "could not be consulted" condition read reports, and errKeyringUnavailable's
// own doc comment promises that no backend text reaches a caller, so a raw
// backend error is never returned here either.
func (Keyring) Set(name, value string) error {
	_, err := withDeadline(func() (struct{}, error) {
		return struct{}{}, keyringSet(service, name, value)
	})
	if err != nil {
		return errKeyringUnavailable
	}
	return nil
}
