package secrets

import (
	"context"
	"time"

	zkeyring "github.com/zalando/go-keyring"
)

// service is the OS keyring service name every credential is stored under,
// keyed by the variable name (macOS Keychain, Windows Credential Manager,
// or the Linux Secret Service over D-Bus).
const service = "cairn"

// keyringDeadline bounds every keyring read. A present bus with a locked
// collection is the one path the underlying library does not bound itself:
// it waits on an unlock prompt with no timeout. A deadline miss is treated
// the same as an absent bus, so a headless run never hangs.
const keyringDeadline = 2 * time.Second

// keyringBackend is the subset of the zalando/go-keyring API Keyring calls,
// narrowed so a test can substitute a backend that blocks or errors without
// touching a real keyring.
type keyringBackend interface {
	Get(service, user string) (string, error)
	Set(service, user, password string) error
}

// realBackend calls the zalando/go-keyring package-level functions, which
// dispatch to the OS-specific implementation go-keyring selects at init.
type realBackend struct{}

func (realBackend) Get(service, user string) (string, error) {
	return zkeyring.Get(service, user)
}

func (realBackend) Set(service, user, password string) error {
	return zkeyring.Set(service, user, password)
}

// Keyring is the Provider and Writer backed by the OS keyring. This is the
// only file in the module permitted to import
// github.com/zalando/go-keyring; a test asserts that.
type Keyring struct {
	backend  keyringBackend
	deadline time.Duration
}

// NewKeyring returns a Keyring backed by the real OS keyring, with every
// read bounded by keyringDeadline.
func NewKeyring() Keyring {
	return Keyring{backend: realBackend{}, deadline: keyringDeadline}
}

// newKeyringWithBackend builds a Keyring over an arbitrary backend, for
// tests that need a mock error or a blocking read.
func newKeyringWithBackend(b keyringBackend, deadline time.Duration) Keyring {
	return Keyring{backend: b, deadline: deadline}
}

// Name reports "keyring".
func (Keyring) Name() string {
	return "keyring"
}

// Get reads name from the keyring under Keyring's service name. Any
// failure, an absent entry, an unreachable bus, or a deadline miss, is
// reported as a miss rather than an error: an operator with only the
// environment variables set must see the same behavior as one whose
// platform has no keyring running at all.
func (k Keyring) Get(name string) (string, bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), k.deadline)
	defer cancel()

	type result struct {
		value string
		err   error
	}
	done := make(chan result, 1)
	go func() {
		v, err := k.backend.Get(service, name)
		done <- result{value: v, err: err}
	}()

	select {
	case r := <-done:
		if r.err != nil {
			return "", false, nil
		}
		return r.value, true, nil
	case <-ctx.Done():
		return "", false, nil
	}
}

// Set writes name's value to the keyring. Keyring is the only Writer
// implementation, so cairn auth set is the only command able to call it.
func (k Keyring) Set(name, value string) error {
	return k.backend.Set(service, name, value)
}
