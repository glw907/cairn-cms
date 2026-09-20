// Package secrets is the seam every credential value passes through before
// a command uses it. A Provider answers one variable name from one
// backend; Resolve walks a list of them in order and reports which one
// answered, so a caller never has to know how a value reached the process.
// A third backend, a file vault or a password manager's own CLI, is one
// more Provider implementation and no change to any caller.
package secrets

import "fmt"

// Provider reads one named credential from a backend. Get reports whether
// the backend holds a value for name; a false ok with a nil err means the
// backend has no answer, which Resolve treats the same as a backend it
// could not reach at all.
type Provider interface {
	// Name identifies the backend for a status line, never in an error a
	// caller might log verbatim with the resolved value nearby.
	Name() string
	// Get reports name's value and whether the backend holds one. A miss
	// is (false, nil), not an error; only an unexpected failure returns a
	// non-nil err.
	Get(name string) (value string, ok bool, err error)
}

// Writer stores one named credential in a backend. Keyring is the only
// implementation, which is why the environment provider cannot be written
// to by mistake: there is no environment-backed Writer to call.
type Writer interface {
	Set(name, value string) error
}

// Resolve tries name against each provider in order and returns the first
// value found, plus the name of the provider that found it. A miss on every
// provider returns an empty value, an empty from, and a nil error: the
// caller decides how to report an unresolved variable.
func Resolve(name string, providers ...Provider) (value string, from string, err error) {
	for _, p := range providers {
		v, ok, gerr := p.Get(name)
		if gerr != nil {
			return "", "", fmt.Errorf("secrets: resolve %s from %s: %w", name, p.Name(), gerr)
		}
		if ok {
			return v, p.Name(), nil
		}
	}
	return "", "", nil
}
