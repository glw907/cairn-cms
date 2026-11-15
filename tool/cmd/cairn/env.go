package main

import (
	"errors"
	"os"
	"strings"
	"unicode"

	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
	"github.com/glw907/cairn-cms/tool/v2/internal/secrets"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup"
)

// osEnviron reads the process environment. Every command that needs a
// live value takes this as loadEnv's envFn parameter instead of calling
// os.Getenv itself, so this file is the only one under cmd/cairn holding
// the literal call; a test greps the rest of the package to prove it.
// Creating this chokepoint here, rather than in the cobra tree, is what
// lets a probe command read nothing directly.
func osEnviron(name string) string {
	return os.Getenv(name)
}

// credentialVar names one of the three variables loadEnv resolves, and
// whether its value is a credential env's typed accessors must wrap in
// providers.Credential, versus a plain identifier like the account id.
type credentialVar struct {
	name   string
	secret bool
}

// varCFAccountID, varCFReadToken, and varGHReadToken name, not hold, the three CAIRN_CF_/CAIRN_GH_
// environment variables loadEnv reads; each is a bare variable name, never a credential value,
// spelled exactly once, here. Every other file under cmd/cairn refers to one of the three through
// these constants (or through credentialVars and env's accessors, which are
// all built from them) rather than spelling the name again, which is what
// TestCredentialVariableNamesAreSpelledOnlyInEnvGo checks.
const (
	varCFAccountID = "CAIRN_CF_ACCOUNT_ID" // secret-guard-allow: a variable name, not a value
	varCFReadToken = "CAIRN_CF_READ_TOKEN" // secret-guard-allow: a variable name, not a value
	varGHReadToken = "CAIRN_GH_READ_TOKEN" // secret-guard-allow: a variable name, not a value
)

// varCFSetupToken names the variable cairn new takes a Cloudflare API token from. It is read
// only from the environment, never a flag, so the token never reaches argv, and never through
// loadEnv's provider chain, since cairn auth does not manage it. setup spells it for the copy
// that names it.
const varCFSetupToken = setup.TokenVariable

// setupToken returns the token in varCFSetupToken with its surrounding whitespace trimmed,
// wrapped so it never prints by accident; a blank value is the zero Credential, the variable
// unset. A value with whitespace inside is refused, since no Cloudflare token holds any, and the
// trimmed value comes back with the refusal so the scrub still holds it. A CLOUDFLARE_API_TOKEN
// in the environment is never read here: it selects nothing.
func setupToken(envFn func(string) string) (providers.Credential, error) {
	v := strings.TrimSpace(envFn(varCFSetupToken))
	if v == "" {
		return providers.Credential{}, nil
	}
	tok := providers.NewCredential(v)
	if strings.ContainsFunc(v, unicode.IsSpace) {
		return tok, newSetupTokenSpaceError()
	}
	return tok, nil
}

// varNoColor and varTerm are the two variables the report commands read for style.Detect. Neither
// is a credential: they are read straight from the environment, never through secrets.Resolve's
// provider chain, which is for the CAIRN_ credential variables above alone.
const (
	varNoColor = "NO_COLOR"
	varTerm    = "TERM"
)

// varPublicOrigin names the site's public origin variable, cairn doctor's fallback once the
// wrangler config carries none. It is not a cairn credential, so doctor reads it straight from
// deps.env.
const varPublicOrigin = "PUBLIC_ORIGIN"

// credentialVars lists the three variables loadEnv resolves, in resolution
// order. It is the one list: auth's membership check and the not-a-credential refusal read it.
var credentialVars = []credentialVar{
	{name: varCFAccountID},
	{name: varCFReadToken, secret: true},
	{name: varGHReadToken, secret: true},
}

// credentialNames returns the names in credentialVars, in resolution order.
func credentialNames() []string {
	names := make([]string, len(credentialVars))
	for i, v := range credentialVars {
		names[i] = v.name
	}
	return names
}

// resolution holds one variable's resolved value and the line a caller
// prints for it: the provider name on success, "<provider>: error" when
// the provider itself failed, or empty when nothing resolved it (auth list
// and auth check both turn an empty display into "not set"). value is
// empty for a secret variable; credential holds that value wrapped in
// providers.Credential instead, so a typed accessor never has to know
// which of the three variables it is reading, and the resolved secret
// never sits in a plain string field.
type resolution struct {
	name       string
	value      string
	credential providers.Credential
	display    string
}

// env holds every credential variable loadEnv resolved.
type env struct {
	resolutions []resolution
}

// accountID returns the resolved CAIRN_CF_ACCOUNT_ID value.
func (e env) accountID() string {
	for _, r := range e.resolutions {
		if r.name == varCFAccountID {
			return r.value
		}
	}
	return ""
}

// credential returns name's resolved value already wrapped in
// providers.Credential, for one of the two secret variables.
func (e env) credential(name string) providers.Credential {
	for _, r := range e.resolutions {
		if r.name == name {
			return r.credential
		}
	}
	return providers.Credential{}
}

// cfToken returns the resolved CAIRN_CF_READ_TOKEN value, wrapped so it
// never prints by accident.
func (e env) cfToken() providers.Credential {
	return e.credential(varCFReadToken)
}

// ghToken returns the resolved CAIRN_GH_READ_TOKEN value, wrapped so it
// never prints by accident.
func (e env) ghToken() providers.Credential {
	return e.credential(varGHReadToken)
}

// sourceLines returns e's resolutions with every empty display turned into
// "not set", the one place cairn auth list and auth check both get the
// text they print for an unresolved variable.
func (e env) sourceLines() []resolution {
	lines := make([]resolution, len(e.resolutions))
	for i, r := range e.resolutions {
		if r.display == "" {
			r.display = "not set"
		}
		lines[i] = r
	}
	return lines
}

// loadEnv resolves every variable in credentialVars by trying envFn first
// and then each provider in p in order, and reports which ones it could
// not resolve from any of them. It never returns a resolved value's source
// beyond the provider name, so a caller can report where a credential came
// from without touching the value itself.
func loadEnv(envFn func(string) string, p ...secrets.Provider) (env, []providers.Missing) {
	environment := secrets.NewEnvFromLookup(func(name string) (string, bool) {
		return envFn(name), true
	})
	chain := append([]secrets.Provider{environment}, p...)

	var out env
	var missing []providers.Missing

	for _, cv := range credentialVars {
		v, from, err := secrets.Resolve(cv.name, chain...)
		r := resolution{name: cv.name}
		switch {
		case err != nil:
			r.display = errorDisplay(err)
			missing = append(missing, providers.Missing{Var: cv.name})
		case from == "":
			missing = append(missing, providers.Missing{Var: cv.name})
		default:
			r.display = from
			if cv.secret {
				r.credential = providers.NewCredential(v)
			} else {
				r.value = v
			}
		}
		out.resolutions = append(out.resolutions, r)
	}

	return out, missing
}

// errorDisplay reports the failing provider's name, never its error text,
// which a future backend might use to carry the value it could not read.
func errorDisplay(err error) string {
	if resolveErr, ok := errors.AsType[*secrets.ResolveError](err); ok {
		return resolveErr.Provider() + ": error"
	}
	return "error"
}
