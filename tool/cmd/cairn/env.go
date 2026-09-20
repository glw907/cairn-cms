package main

import (
	"os"

	"github.com/glw907/cairn-cms/tool/internal/providers"
	"github.com/glw907/cairn-cms/tool/internal/secrets"
)

// osEnviron reads the process environment. Every command that needs a
// live value takes this as loadEnv's env parameter instead of calling
// os.Getenv itself, so this file is the only one under cmd/cairn holding
// the literal call; a test greps the rest of the package to prove it.
// Creating this chokepoint here, rather than in the cobra tree, is what
// lets a probe command read nothing directly.
func osEnviron(name string) string {
	return os.Getenv(name)
}

// envProvider turns a plain string-reading func into a secrets.Provider
// named "environment", so loadEnv can put the caller's env func first in
// every variable's resolution chain without depending on secrets.Env's own
// call to the real process environment.
type envProvider func(string) string

func (envProvider) Name() string { return "environment" }

func (p envProvider) Get(name string) (string, bool, error) {
	v := p(name)
	return v, v != "", nil
}

// Env holds the three credential values a command needs before it calls
// Cloudflare or GitHub, each paired with the provider that resolved it so
// a command can report that without ever printing a value.
type Env struct {
	AccountID     string
	AccountIDFrom string

	CFToken     providers.Credential
	CFTokenFrom string

	GHToken     providers.Credential
	GHTokenFrom string
}

// authVariables lists the three variable names loadEnv resolves, in
// resolution order, the same three cairn auth set and cairn auth list
// operate on.
var authVariables = []string{
	"CAIRN_CF_ACCOUNT_ID",
	"CAIRN_CF_READ_TOKEN",
	"CAIRN_GH_READ_TOKEN",
}

// loadEnv resolves CAIRN_CF_ACCOUNT_ID, CAIRN_CF_READ_TOKEN, and
// CAIRN_GH_READ_TOKEN by trying env first and then each provider in p in
// order, and reports which of the three it could not resolve from any of
// them. It never returns a resolved value's source beyond the provider
// name, so a caller can report where a credential came from without
// touching the value itself.
func loadEnv(env func(string) string, p ...secrets.Provider) (Env, []providers.Missing) {
	chain := append([]secrets.Provider{envProvider(env)}, p...)

	var out Env
	var missing []providers.Missing

	if v, from, _ := secrets.Resolve("CAIRN_CF_ACCOUNT_ID", chain...); from != "" {
		out.AccountID, out.AccountIDFrom = v, from
	} else {
		missing = append(missing, providers.Missing{Var: "CAIRN_CF_ACCOUNT_ID"})
	}

	if v, from, _ := secrets.Resolve("CAIRN_CF_READ_TOKEN", chain...); from != "" {
		out.CFToken, out.CFTokenFrom = providers.NewCredential(v), from
	} else {
		missing = append(missing, providers.Missing{Var: "CAIRN_CF_READ_TOKEN"})
	}

	if v, from, _ := secrets.Resolve("CAIRN_GH_READ_TOKEN", chain...); from != "" {
		out.GHToken, out.GHTokenFrom = providers.NewCredential(v), from
	} else {
		missing = append(missing, providers.Missing{Var: "CAIRN_GH_READ_TOKEN"})
	}

	return out, missing
}

// resolution pairs a variable name with the provider that answered it, or
// an empty from when no provider did.
type resolution struct {
	name string
	from string
}

// resolutions reports the three variables loadEnv resolves in the same
// order, for cairn auth list to print.
func (e Env) resolutions() []resolution {
	return []resolution{
		{authVariables[0], e.AccountIDFrom},
		{authVariables[1], e.CFTokenFrom},
		{authVariables[2], e.GHTokenFrom},
	}
}
