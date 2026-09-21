package record

import (
	"encoding/json"
	"reflect"
)

// ordered is satisfied by a pointer to any typed object this package parses: it lets parseObject
// and objectField read and write the key order and the opaque tail without every typed object
// repeating that bookkeeping.
type ordered interface {
	setOrder(order []string)
	addExtra(e ExtraField)
	keyOrder() []string
	extra() []ExtraField
}

// field describes one JSON key a typed object of type T recognizes: how to decode a raw value
// into it, how to encode its current value back to JSON, and whether that value is worth
// emitting when the source document never carried the key. A slice of field values is the single
// table Parse, Marshal, and the key order all derive from, for one typed object: a key Parse
// recognizes is a key in this slice, and a key in this slice is a key Marshal can emit, so the
// two cannot disagree about which keys exist.
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
// three nested objects has exactly this shape, and the three closures a key needs are derivable
// from ptr alone.
func scalarField[T, V any](key string, ptr func(*T) *V) field[T] {
	return field[T]{
		key:     key,
		parse:   func(t *T, raw json.RawMessage) error { return json.Unmarshal(raw, ptr(t)) },
		marshal: func(t T) (json.RawMessage, error) { return rawOf(*ptr(&t)) },
		nonZero: func(t T) bool { return nonZeroValue(*ptr(&t)) },
	}
}

// objectField describes a key whose value is a nested typed object, parsed through its own field
// table and marshaled back with the key order and opaque tail that object carried. It is
// scalarField's counterpart for the three nested objects, so a nested key costs one table row
// like every other key.
func objectField[T, V any, PV interface {
	*V
	ordered
}](key string, fields []field[V], ptr func(*T) *V) field[T] {
	return field[T]{
		key: key,
		parse: func(t *T, raw json.RawMessage) error {
			v, err := parseObject[V, PV](raw, fields)
			if err != nil {
				return err
			}
			*ptr(t) = v
			return nil
		},
		marshal: func(t T) (json.RawMessage, error) {
			v := ptr(&t)
			return marshalObject(PV(v).keyOrder(), fields, *v, PV(v).extra())
		},
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
	objectField("github", githubFields, func(r *Record) *GitHub { return &r.GitHub }),
	objectField("cloudflare", cloudflareFields, func(r *Record) *Cloudflare { return &r.Cloudflare }),
}

// githubFields is recordFields's counterpart for GitHub.
var githubFields = []field[GitHub]{
	objectField("repo", githubRepoFields, func(g *GitHub) *GitHubRepo { return &g.Repo }),
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
