package setup

import (
	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
	"github.com/glw907/cairn-cms/tool/v2/internal/secrets"
)

// keepCredential stores c as kind's keyring entry. The keyring stores strings, so this is the
// one place in setup that reads a credential's value; logx's test holds it to this file.
func keepCredential(v Vault, kind secrets.EntryKind, c providers.Credential) error {
	return v.Put(kind, c.Reveal())
}
