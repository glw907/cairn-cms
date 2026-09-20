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

// keyringGet and keyringSet are the zalando/go-keyring calls Keyring makes,
// held in package-level vars so a test can swap in a func that blocks or
// errors without a real keyring. keyringDeadline bounds every keyring
// read: a present bus with a locked collection is the one path the
// underlying library does not bound itself, waiting on an unlock prompt
// with no timeout, and a deadline miss is treated the same as an absent
// bus so a headless run never hangs.
var (
	keyringGet      = zkeyring.Get
	keyringSet      = zkeyring.Set
	keyringDeadline = 2 * time.Second
)

// Keyring is the Provider and Writer backed by the OS keyring. This is the
// only file in the module permitted to import
// github.com/zalando/go-keyring; a test asserts that.
type Keyring struct{}

// NewKeyring returns a Keyring backed by the real OS keyring.
func NewKeyring() Keyring {
	return Keyring{}
}

// Name reports "keyring".
func (Keyring) Name() string {
	return "keyring"
}

// Get reads name from the keyring under service. Any failure, an absent
// entry, an unreachable bus, or a deadline miss, is reported as a miss
// rather than an error: an operator with only the environment variables
// set must see the same behavior as one whose platform has no keyring
// running at all.
func (Keyring) Get(name string) (string, bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), keyringDeadline)
	defer cancel()

	type result struct {
		value string
		err   error
	}
	done := make(chan result, 1)
	go func() {
		v, err := keyringGet(service, name)
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
func (Keyring) Set(name, value string) error {
	return keyringSet(service, name, value)
}
