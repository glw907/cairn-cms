package main

import (
	"errors"
	"os"

	"github.com/glw907/cairn-cms/tool/internal/providers"
	"github.com/glw907/cairn-cms/tool/internal/secrets"
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
// these constants (or through credentialVars, authVariables, and env's own accessors, which are
// all built from them) rather than spelling the name again, which is what
// TestCredentialVariableNamesAreSpelledOnlyInEnvGo checks.
const (
	varCFAccountID = "CAIRN_CF_ACCOUNT_ID" // secret-guard-allow: a variable name, not a value
	varCFReadToken = "CAIRN_CF_READ_TOKEN" // secret-guard-allow: a variable name, not a value
	varGHReadToken = "CAIRN_GH_READ_TOKEN" // secret-guard-allow: a variable name, not a value
)

// varNoColor and varTerm are the two variables loadEnv reads for render.DetectProfile (Task
// 20a). Neither is a credential: they carry no Missing entry and are read directly from envFn
// rather than through secrets.Resolve's provider chain, which is for the three CAIRN_ variables
// above alone.
const (
	varNoColor = "NO_COLOR"
	varTerm    = "TERM"
)

// varPublicOrigin names the site's own public origin variable, cairn doctor's fallback once the
// wrangler config carries none. It is not a cairn credential, so it carries no Missing entry and
// is read directly from envFn, the same as the two above.
const varPublicOrigin = "PUBLIC_ORIGIN"

// credentialVars lists the three variables loadEnv resolves, in resolution
// order. A fourth variable is a one-line addition here.
var credentialVars = []credentialVar{
	{name: varCFAccountID},
	{name: varCFReadToken, secret: true},
	{name: varGHReadToken, secret: true},
}

// authVariables lists the same three names, in the same order, for cairn
// auth set's membership check.
var authVariables = credentialNames(credentialVars)

// credentialNames extracts each credentialVar's name, in order.
func credentialNames(cs []credentialVar) []string {
	names := make([]string, len(cs))
	for i, c := range cs {
		names[i] = c.name
	}
	return names
}

// resolution holds one variable's resolved value and the line a caller
// prints for it: the provider name on success, "<provider>: error" when
// the provider itself failed, or empty when nothing resolved it (auth list
// and probe-token both turn an empty display into "not set"). value is
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

// env holds every variable loadEnv resolved, keyed by name, plus three plain environment reads
// no secrets.Provider ever sees: noColor and term, the pair render.DetectProfile takes to pick a
// color profile, and publicOrigin, which the doctor's config.public-origin check reads straight
// instead of through a Provider since it names no credential. All three come straight from
// envFn.
type env struct {
	resolutions  []resolution
	noColor      string
	term         string
	publicOrigin string
}

// noColorValue returns the resolved NO_COLOR value, empty when unset.
func (e env) noColorValue() string {
	return e.noColor
}

// termValue returns the resolved TERM value, empty when unset.
func (e env) termValue() string {
	return e.term
}

// publicOriginValue returns the resolved PUBLIC_ORIGIN value, empty when unset.
func (e env) publicOriginValue() string {
	return e.publicOrigin
}

// nonSecretVar enumerates loadEnv's variables whose resolved value is a plain string, never
// wrapped in providers.Credential. Its underlying type is int, not string, so no string literal
// or variable converts into it implicitly; only a value of this type reaches (env).value, which
// makes reading a secret variable (CAIRN_CF_READ_TOKEN, CAIRN_GH_READ_TOKEN) through it a compile
// error rather than a silent empty string, however the caller obtained the name.
type nonSecretVar int

// accountIDVar is the one non-secret variable loadEnv resolves today.
const accountIDVar nonSecretVar = iota

// name returns v's resolved variable name.
func (v nonSecretVar) name() string {
	switch v {
	case accountIDVar:
		return varCFAccountID
	default:
		return ""
	}
}

// value returns v's resolved value, or empty when v was not resolved.
func (e env) value(v nonSecretVar) string {
	for _, r := range e.resolutions {
		if r.name == v.name() {
			return r.value
		}
	}
	return ""
}

// accountID returns the resolved CAIRN_CF_ACCOUNT_ID value.
func (e env) accountID() string {
	return e.value(accountIDVar)
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
// "not set", the one place cairn auth list and probe-token both get the
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

// noCloudflareCredentialError (cmd/cairn/messages.go) is the error logs and adopt both return
// when buildClients resolved no Cloudflare credential at all.

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

	out.noColor = envFn(varNoColor)
	out.term = envFn(varTerm)
	out.publicOrigin = envFn(varPublicOrigin)

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
