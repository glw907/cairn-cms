package secrets

import "os"

// Env is the Provider that reads the process environment, exactly as an
// operator's shell profile leaves it. It answers every platform with no
// setup beyond exporting the variable, which is what keeps a scheduled
// run, a container, or a CI job working with no keyring at all.
type Env struct{}

// NewEnv returns the environment Provider.
func NewEnv() Env {
	return Env{}
}

// Name reports "environment".
func (Env) Name() string {
	return "environment"
}

// Get reports name's value from os.LookupEnv. An unset variable is a miss,
// never an error.
func (Env) Get(name string) (string, bool, error) {
	v, ok := os.LookupEnv(name)
	return v, ok, nil
}
