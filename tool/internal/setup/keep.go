package setup

import (
	"encoding/base64"

	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
	"github.com/glw907/cairn-cms/tool/v2/internal/secrets"
)

// This file is the one place in setup that reads a credential's value; logx's test holds every
// Reveal call to it. Each function here hands a value to exactly one consumer that needs it as
// a string, and each caller registers what it builds with the output scrub.

// keepCredential stores c as kind's keyring entry.
func keepCredential(v Vault, kind secrets.EntryKind, c providers.Credential) error {
	return v.Put(kind, c.Reveal())
}

// gitAuthHeader is the http.extraheader value that pushes to github.com as the installation.
func gitAuthHeader(token providers.Credential) string {
	return "AUTHORIZATION: basic " + base64.StdEncoding.EncodeToString([]byte("x-access-token:"+token.Reveal()))
}

// secretText is c as the plain value a sealed repository secret carries.
func secretText(c providers.Credential) string {
	return c.Reveal()
}

// base64Text is c base64-encoded, the form the Worker's GITHUB_APP_PRIVATE_KEY_B64 secret takes.
func base64Text(c providers.Credential) string {
	return base64.StdEncoding.EncodeToString([]byte(c.Reveal()))
}
