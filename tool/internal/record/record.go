// Package record holds the site record type the Node CLI writes and the Go
// tool reads. Only the fields both tools agree on are typed; every other
// key, secrets included, round-trips through an ordered tail so a record
// this package does not fully understand is never corrupted or dropped.
package record

import (
	"encoding/json"
	"fmt"
)

// ExtraField is one key this package does not type, carried opaquely so
// Marshal can reproduce it byte for byte. Value is the key's raw JSON, never
// decoded, so a secret literal never passes through a typed field.
type ExtraField struct {
	Key   string
	Value json.RawMessage
}

// String implements fmt.Stringer without printing Value: json.RawMessage's
// own Stringer prints its bytes verbatim, which would put a secret literal
// carried in Extra into any %v or log line a caller writes. Marshal is the
// one place a Record's bytes are meant to leave the process.
func (e ExtraField) String() string {
	return fmt.Sprintf("record.ExtraField{Key:%q, Value: <%d byte(s), redacted>}", e.Key, len(e.Value))
}

// GoString implements fmt.GoStringer for the same reason String does.
func (e ExtraField) GoString() string {
	return e.String()
}

// GitHubRepo carries the identifiers the Node CLI persists under
// "github.repo" once a site's repository exists (see createRepo in
// packages/create-cairn-site/src/github/repo.mjs). Every other key under
// "github.repo" lands in Extra rather than a typed field.
type GitHubRepo struct {
	// ID is the repository's GitHub id.
	ID int64
	// Owner is the repository owner's login.
	Owner string
	// Repo is the repository's name.
	Repo string
	// DefaultBranch is the repository's default branch name.
	DefaultBranch string
	// Extra carries every key under "github.repo" this package does not
	// type, in the order Parse observed them.
	Extra []ExtraField

	order []string
}

func (r *GitHubRepo) setOrder(order []string) { r.order = order }
func (r *GitHubRepo) addExtra(e ExtraField)   { r.Extra = append(r.Extra, e) }
func (r *GitHubRepo) keyOrder() []string      { return r.order }
func (r *GitHubRepo) extra() []ExtraField     { return r.Extra }

// GitHub carries a record's GitHub identifiers. Every other key under
// "github", including every secret (clientSecret, pem, webhookSecret), lands
// in Extra rather than a typed field.
type GitHub struct {
	// Repo is the adopted repository's identifiers, once created.
	Repo GitHubRepo
	// InstallationID is the GitHub App installation covering Repo.
	InstallationID int64
	// Extra carries every key under "github" this package does not type,
	// in the order Parse observed them.
	Extra []ExtraField

	order []string
}

func (g *GitHub) setOrder(order []string) { g.order = order }
func (g *GitHub) addExtra(e ExtraField)   { g.Extra = append(g.Extra, e) }
func (g *GitHub) keyOrder() []string      { return g.order }
func (g *GitHub) extra() []ExtraField     { return g.Extra }

// Cloudflare carries a record's Cloudflare identifiers. Every other key
// under "cloudflare", including apiToken, lands in Extra rather than a
// typed field.
type Cloudflare struct {
	// AccountID is the site's Cloudflare account id.
	AccountID string
	// ZoneID is the DNS zone id covering Domain.
	ZoneID string
	// WorkerName is the deployed Worker's name.
	WorkerName string
	// Extra carries every key under "cloudflare" this package does not
	// type, in the order Parse observed them.
	Extra []ExtraField

	order []string
}

func (c *Cloudflare) setOrder(order []string) { c.order = order }
func (c *Cloudflare) addExtra(e ExtraField)   { c.Extra = append(c.Extra, e) }
func (c *Cloudflare) keyOrder() []string      { return c.order }
func (c *Cloudflare) extra() []ExtraField     { return c.Extra }

// Record is a site's state, as the Node CLI persists it and the Go tool
// reads it. A field this package does not type, including every
// secret-bearing one, round-trips through Extra without ever being decoded.
type Record struct {
	// Name is the site's display name.
	Name string
	// Step is the record's lifecycle position, one of the Node CLI's step
	// strings.
	Step string
	// Domain is the site's public domain. ValidateDomain checks it.
	Domain string
	// SchemaVersion is the record's schema version. A record Parse reads
	// with no schemaVersion key reports 0, its zero value.
	SchemaVersion int
	// Adopted reports whether the Go tool's registry has adopted this
	// site.
	Adopted bool
	// GitHub carries the record's GitHub identifiers.
	GitHub GitHub
	// Cloudflare carries the record's Cloudflare identifiers.
	Cloudflare Cloudflare
	// Extra carries every top-level key this package does not type, in
	// the order Parse observed them.
	Extra []ExtraField

	order []string
}

func (r *Record) setOrder(order []string) { r.order = order }
func (r *Record) addExtra(e ExtraField)   { r.Extra = append(r.Extra, e) }
func (r *Record) keyOrder() []string      { return r.order }
func (r *Record) extra() []ExtraField     { return r.Extra }
