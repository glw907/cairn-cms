package main

import (
	"io"
	"net"
	"net/http"
	"os"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/health"
	"github.com/glw907/cairn-cms/tool/internal/providers"
	"github.com/glw907/cairn-cms/tool/internal/secrets"
	"github.com/glw907/cairn-cms/tool/internal/store"
	"github.com/spf13/cobra"
)

// deps is everything a command in this package reaches the outside world through: the
// environment, the keyring, the network, the registry's location, the clock, the credential
// prompt, and the process exit. It is one struct rather than a parameter list so a new
// dependency is a field rather than a signature break across every command and every test that
// builds one.
type deps struct {
	// env reads one environment variable. It is loadEnv's envFn parameter and nothing else
	// under cmd/cairn reads the environment.
	env func(string) string
	// keyring is the read half of the OS credential store, the provider loadEnv resolves
	// through after the environment.
	keyring secrets.Provider
	// keyringWriter is the write half, which auth set alone uses. It stays a separate field
	// because secrets keeps the two interfaces separate: a backend that answers reads and
	// refuses writes has to stay expressible.
	keyringWriter secrets.Writer
	// keyringDeleter is the delete half, which auth unset alone uses, kept as its own field for
	// the same reason keyringWriter is separate from keyring.
	keyringDeleter secrets.Deleter
	// keyringStatus reports whether name has an entry in the keyring, distinguishing an absent
	// entry from a keyring that could not be consulted at all: the distinction keyring's own Get
	// deliberately flattens away for credential resolution. auth set, auth list, and auth unset
	// call this when they must report the difference to an operator.
	keyringStatus func(name string) (present bool, err error)
	// transport carries every HTTP request the provider clients make.
	transport http.RoundTripper
	// resolver answers every DNS lookup.
	resolver providers.Resolver
	// registryDir resolves the directory the site registry lives in.
	registryDir func() (string, error)
	// registrySource resolves the same directory as registryDir, alongside the store.Source
	// that chose it, for sites list --verbose.
	registrySource func() (string, store.Source, error)
	// now is the clock a sweep reads. It is a field rather than a time.Now call inside a
	// command so a replayed run settles against the same instant.
	now func() time.Time
	// readPassword prompts for one credential value with echo off.
	readPassword func(*cobra.Command, string) (string, error)
	// stdin is the stream readPassword's non-terminal fallback reads one piped line from. It is
	// a field here, not a package-level variable, so a test can supply a fixture stream without
	// touching the process's real stdin.
	stdin io.Reader
	// exit ends the process with a monitoring-plugin verdict code. It is os.Exit in production,
	// carried here so a test can observe the code and so os.Exit itself is named in main.go
	// alone.
	exit func(int)
}

// secretProviders returns the providers loadEnv chains after the environment. A deps built by a
// test that never touches the keyring leaves the field nil, and a nil interface in the chain
// would panic inside Resolve rather than simply answering nothing.
func (d deps) secretProviders() []secrets.Provider {
	if d.keyring == nil {
		return nil
	}
	return []secrets.Provider{d.keyring}
}

// buildClients resolves the three credentials and returns the provider clients a health sweep
// injects into every check, plus which of them actually answered. A check never builds a client
// or reads a credential itself, so this is the one place a resolved value becomes a client.
func buildClients(d deps) health.Clients {
	resolved, missing := loadEnv(d.env, d.secretProviders()...)

	c := health.Clients{
		NPM:   providers.NewNPM(d.transport),
		Probe: providers.NewProbe(d.transport, d.resolver),
	}
	if !isMissing(missing, varCFAccountID) && !isMissing(missing, varCFReadToken) {
		c.CF = providers.NewCloudflare(resolved.accountID(), resolved.cfToken(), d.transport)
		c.HaveCF = true
		c.CFFrom = credentialSource(resolved, varCFReadToken)
	}
	if !isMissing(missing, varGHReadToken) {
		c.GH = providers.NewGitHub(resolved.ghToken(), d.transport)
		c.HaveGH = true
		c.GHFrom = credentialSource(resolved, varGHReadToken)
	}
	return c
}

// credentialSource names the provider that answered one variable, never the value.
func credentialSource(e env, name string) string {
	for _, r := range e.sourceLines() {
		if r.name == name {
			return r.display
		}
	}
	return ""
}

// newDeps returns the production dependency set.
func newDeps() deps {
	k := secrets.NewKeyring()
	d := deps{
		env:            osEnviron,
		keyring:        k,
		keyringWriter:  k,
		keyringDeleter: k,
		keyringStatus:  k.Status,
		transport:      http.DefaultTransport,
		resolver:       net.DefaultResolver,
		registryDir:    defaultRegistryDir,
		registrySource: defaultRegistrySource,
		now:            time.Now,
		stdin:          os.Stdin,
		exit:           os.Exit,
	}
	d.readPassword = func(cmd *cobra.Command, name string) (string, error) {
		return promptPassword(cmd, name, d.stdin)
	}
	return d
}
