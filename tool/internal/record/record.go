// Package record holds the site record type the Node CLI writes and the Go
// tool reads. Only the fields both tools agree on are typed; every other
// key, secrets included, round-trips through an ordered tail so a record
// this package does not fully understand is never corrupted or dropped.
package record

import (
	"encoding/json"
	"fmt"
	"reflect"
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

// ordered is satisfied by a pointer to any typed object this package parses: it lets
// parseObject record the key order it observed and capture an unrecognized key as an
// ExtraField without every typed object repeating that bookkeeping.
type ordered interface {
	setOrder(order []string)
	addExtra(e ExtraField)
}

// field describes one JSON key a typed object of type T recognizes: how to decode a raw value
// into it, how to encode its current value back to JSON, and whether that value is worth
// emitting when the source document never carried the key. A slice of field values is the single
// table Parse, Marshal, and the key order all derive from, for one typed object: a key Parse
// recognizes is a key in this slice, and a key in this slice is a key Marshal can emit, so the
// two can no longer drift the way three separately authored key-order slices per level once
// could.
type field[T any] struct {
	key     string
	parse   func(t *T, raw json.RawMessage) error
	marshal func(t T) (json.RawMessage, error)
	nonZero func(t T) bool
}

// keysOf returns fields' keys, in table order.
func keysOf[T any](fields []field[T]) []string {
	keys := make([]string, len(fields))
	for i, f := range fields {
		keys[i] = f.key
	}
	return keys
}

// fieldMap indexes fields by key for Parse's and Marshal's lookups.
func fieldMap[T any](fields []field[T]) map[string]field[T] {
	m := make(map[string]field[T], len(fields))
	for _, f := range fields {
		m[f.key] = f
	}
	return m
}

// nonZeroValue reports whether v differs from its type's zero value. It backs every field's
// nonZero function, so a struct field set after Parse (SchemaVersion, Adopted, a nested
// identifier, and so on) is recognized as worth appending even though the source document never
// carried its key.
func nonZeroValue(v any) bool {
	return !reflect.ValueOf(v).IsZero()
}

// scalarField describes a key whose value is one plain JSON scalar, decoded straight into and
// encoded straight out of the struct field ptr names. Every key in the tables below except the
// three nested objects has exactly this shape, so spelling out the parse, marshal, and nonZero
// closures per key would only give three places for one of them to drift from the other two.
func scalarField[T, V any](key string, ptr func(*T) *V) field[T] {
	return field[T]{
		key:     key,
		parse:   func(t *T, raw json.RawMessage) error { return json.Unmarshal(raw, ptr(t)) },
		marshal: func(t T) (json.RawMessage, error) { return rawOf(*ptr(&t)) },
		nonZero: func(t T) bool { return nonZeroValue(*ptr(&t)) },
	}
}

// recordFields is Record's single-source table: name, step, domain, schemaVersion, and adopted
// decode and encode directly, while github and cloudflare delegate to the nested objects' own
// tables.
var recordFields = []field[Record]{
	scalarField("name", func(r *Record) *string { return &r.Name }),
	scalarField("step", func(r *Record) *string { return &r.Step }),
	scalarField("domain", func(r *Record) *string { return &r.Domain }),
	scalarField("schemaVersion", func(r *Record) *int { return &r.SchemaVersion }),
	scalarField("adopted", func(r *Record) *bool { return &r.Adopted }),
	{
		key: "github",
		parse: func(r *Record, raw json.RawMessage) error {
			gh, err := parseObject[GitHub](raw, githubFields)
			if err != nil {
				return err
			}
			r.GitHub = gh
			return nil
		},
		marshal: func(r Record) (json.RawMessage, error) {
			return marshalObject(r.GitHub.order, githubFields, r.GitHub, r.GitHub.Extra)
		},
		nonZero: func(r Record) bool { return nonZeroValue(r.GitHub) },
	},
	{
		key: "cloudflare",
		parse: func(r *Record, raw json.RawMessage) error {
			cf, err := parseObject[Cloudflare](raw, cloudflareFields)
			if err != nil {
				return err
			}
			r.Cloudflare = cf
			return nil
		},
		marshal: func(r Record) (json.RawMessage, error) {
			return marshalObject(r.Cloudflare.order, cloudflareFields, r.Cloudflare, r.Cloudflare.Extra)
		},
		nonZero: func(r Record) bool { return nonZeroValue(r.Cloudflare) },
	},
}

// githubFields is recordFields's counterpart for GitHub.
var githubFields = []field[GitHub]{
	{
		key: "repo",
		parse: func(g *GitHub, raw json.RawMessage) error {
			repo, err := parseObject[GitHubRepo](raw, githubRepoFields)
			if err != nil {
				return err
			}
			g.Repo = repo
			return nil
		},
		marshal: func(g GitHub) (json.RawMessage, error) {
			return marshalObject(g.Repo.order, githubRepoFields, g.Repo, g.Repo.Extra)
		},
		nonZero: func(g GitHub) bool { return nonZeroValue(g.Repo) },
	},
	scalarField("installationId", func(g *GitHub) *int64 { return &g.InstallationID }),
}

// githubRepoFields is recordFields's counterpart for GitHubRepo.
var githubRepoFields = []field[GitHubRepo]{
	scalarField("id", func(r *GitHubRepo) *int64 { return &r.ID }),
	scalarField("owner", func(r *GitHubRepo) *string { return &r.Owner }),
	scalarField("repo", func(r *GitHubRepo) *string { return &r.Repo }),
	scalarField("defaultBranch", func(r *GitHubRepo) *string { return &r.DefaultBranch }),
}

// cloudflareFields is recordFields's counterpart for Cloudflare.
var cloudflareFields = []field[Cloudflare]{
	scalarField("accountId", func(c *Cloudflare) *string { return &c.AccountID }),
	scalarField("zoneId", func(c *Cloudflare) *string { return &c.ZoneID }),
	scalarField("workerName", func(c *Cloudflare) *string { return &c.WorkerName }),
}
