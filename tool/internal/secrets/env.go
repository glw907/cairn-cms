package secrets

import "os"

// Env is the Provider that reads the process environment, exactly as an
// operator's shell profile leaves it. It answers every platform with no
// setup beyond exporting the variable, which is what keeps a scheduled
// run, a container, or a CI job working with no keyring at all. A variable
// exported but left blank is a miss, the same as one never set: an empty
// credential is never a distinct configuration another Provider should
// lose to.
type Env struct {
	// lookup is nil for a zero Env, which falls back to os.LookupEnv.
	lookup func(string) (string, bool)
}

// NewEnvFromLookup returns the environment Provider reading through lookup
// instead of the real process environment, for a caller that already owns
// its own environment chokepoint or a test that needs a fixed set of
// variables.
func NewEnvFromLookup(lookup func(string) (string, bool)) Env {
	return Env{lookup: lookup}
}

// Name reports "environment".
func (Env) Name() string {
	return "environment"
}

// Get reports name's value from the lookup func Env was built with, or
// os.LookupEnv for a zero Env. An unset or blank variable is a miss, never
// an error.
func (e Env) Get(name string) (string, bool, error) {
	lookup := e.lookup
	if lookup == nil {
		lookup = os.LookupEnv
	}
	v, ok := lookup(name)
	if !ok || v == "" {
		return "", false, nil
	}
	return v, true, nil
}
