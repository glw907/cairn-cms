// Package record holds the site record type the Node CLI writes and the Go
// tool reads. Only the fields both tools agree on are typed; every other
// key, secrets included, round-trips through an ordered tail so a record
// this package does not fully understand is never corrupted or dropped.
package record

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"reflect"
)

// typedTopLevelKeys is the canonical order Marshal uses for a Record with no
// observed parse order: the struct's own field order.
var typedTopLevelKeys = []string{"name", "step", "domain", "schemaVersion", "adopted", "github", "cloudflare"}

// parsedTopLevelKeys lists every key Parse recognizes as a typed top-level
// field; any other key lands in Record.Extra. Kept in sync by hand with the
// switch in Parse: TestTypedKeySetsAgree fails if it drifts from
// typedTopLevelKeys or from the keys the marshal path can emit.
var parsedTopLevelKeys = []string{"name", "step", "domain", "schemaVersion", "adopted", "github", "cloudflare"}

// typedGitHubKeys is typedTopLevelKeys's counterpart for GitHub.
var typedGitHubKeys = []string{"repo", "installationId"}

// parsedGitHubKeys is parsedTopLevelKeys's counterpart for GitHub.
var parsedGitHubKeys = []string{"repo", "installationId"}

// typedGitHubRepoKeys is typedTopLevelKeys's counterpart for GitHubRepo.
var typedGitHubRepoKeys = []string{"id", "owner", "repo", "defaultBranch"}

// parsedGitHubRepoKeys is parsedTopLevelKeys's counterpart for GitHubRepo.
var parsedGitHubRepoKeys = []string{"id", "owner", "repo", "defaultBranch"}

// typedCloudflareKeys is typedTopLevelKeys's counterpart for Cloudflare.
var typedCloudflareKeys = []string{"accountId", "zoneId", "workerName"}

// parsedCloudflareKeys is parsedTopLevelKeys's counterpart for Cloudflare.
var parsedCloudflareKeys = []string{"accountId", "zoneId", "workerName"}

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

// Parse reads a site record, recording the key order it observed at every
// level so Marshal can reproduce it. A key Parse does not type, at any
// level, is kept as an ExtraField rather than decoded.
func Parse(data []byte) (Record, error) {
	order, values, err := decodeObject(data)
	if err != nil {
		return Record{}, fmt.Errorf("record: parse: %w", err)
	}

	r := Record{order: order}
	for _, key := range order {
		raw := values[key]
		switch key {
		case "name":
			if err := json.Unmarshal(raw, &r.Name); err != nil {
				return Record{}, fmt.Errorf("record: field %q: %w", key, err)
			}
		case "step":
			if err := json.Unmarshal(raw, &r.Step); err != nil {
				return Record{}, fmt.Errorf("record: field %q: %w", key, err)
			}
		case "domain":
			if err := json.Unmarshal(raw, &r.Domain); err != nil {
				return Record{}, fmt.Errorf("record: field %q: %w", key, err)
			}
		case "schemaVersion":
			if err := json.Unmarshal(raw, &r.SchemaVersion); err != nil {
				return Record{}, fmt.Errorf("record: field %q: %w", key, err)
			}
		case "adopted":
			if err := json.Unmarshal(raw, &r.Adopted); err != nil {
				return Record{}, fmt.Errorf("record: field %q: %w", key, err)
			}
		case "github":
			gh, err := parseGitHub(raw)
			if err != nil {
				return Record{}, err
			}
			r.GitHub = gh
		case "cloudflare":
			cf, err := parseCloudflare(raw)
			if err != nil {
				return Record{}, err
			}
			r.Cloudflare = cf
		default:
			r.Extra = append(r.Extra, ExtraField{Key: key, Value: raw})
		}
	}
	return r, nil
}

func parseGitHub(data []byte) (GitHub, error) {
	order, values, err := decodeObject(data)
	if err != nil {
		return GitHub{}, fmt.Errorf("record: field %q: %w", "github", err)
	}
	gh := GitHub{order: order}
	for _, key := range order {
		raw := values[key]
		switch key {
		case "repo":
			repo, err := parseGitHubRepo(raw)
			if err != nil {
				return GitHub{}, err
			}
			gh.Repo = repo
		case "installationId":
			if err := json.Unmarshal(raw, &gh.InstallationID); err != nil {
				return GitHub{}, fmt.Errorf("record: field %q: %w", "github.installationId", err)
			}
		default:
			gh.Extra = append(gh.Extra, ExtraField{Key: key, Value: raw})
		}
	}
	return gh, nil
}

func parseGitHubRepo(data []byte) (GitHubRepo, error) {
	order, values, err := decodeObject(data)
	if err != nil {
		return GitHubRepo{}, fmt.Errorf("record: field %q: %w", "github.repo", err)
	}
	repo := GitHubRepo{order: order}
	for _, key := range order {
		raw := values[key]
		switch key {
		case "id":
			if err := json.Unmarshal(raw, &repo.ID); err != nil {
				return GitHubRepo{}, fmt.Errorf("record: field %q: %w", "github.repo.id", err)
			}
		case "owner":
			if err := json.Unmarshal(raw, &repo.Owner); err != nil {
				return GitHubRepo{}, fmt.Errorf("record: field %q: %w", "github.repo.owner", err)
			}
		case "repo":
			if err := json.Unmarshal(raw, &repo.Repo); err != nil {
				return GitHubRepo{}, fmt.Errorf("record: field %q: %w", "github.repo.repo", err)
			}
		case "defaultBranch":
			if err := json.Unmarshal(raw, &repo.DefaultBranch); err != nil {
				return GitHubRepo{}, fmt.Errorf("record: field %q: %w", "github.repo.defaultBranch", err)
			}
		default:
			repo.Extra = append(repo.Extra, ExtraField{Key: key, Value: raw})
		}
	}
	return repo, nil
}

func parseCloudflare(data []byte) (Cloudflare, error) {
	order, values, err := decodeObject(data)
	if err != nil {
		return Cloudflare{}, fmt.Errorf("record: field %q: %w", "cloudflare", err)
	}
	cf := Cloudflare{order: order}
	for _, key := range order {
		raw := values[key]
		switch key {
		case "accountId":
			if err := json.Unmarshal(raw, &cf.AccountID); err != nil {
				return Cloudflare{}, fmt.Errorf("record: field %q: %w", "cloudflare.accountId", err)
			}
		case "zoneId":
			if err := json.Unmarshal(raw, &cf.ZoneID); err != nil {
				return Cloudflare{}, fmt.Errorf("record: field %q: %w", "cloudflare.zoneId", err)
			}
		case "workerName":
			if err := json.Unmarshal(raw, &cf.WorkerName); err != nil {
				return Cloudflare{}, fmt.Errorf("record: field %q: %w", "cloudflare.workerName", err)
			}
		default:
			cf.Extra = append(cf.Extra, ExtraField{Key: key, Value: raw})
		}
	}
	return cf, nil
}

// decodeObject walks a JSON object's top-level keys in document order,
// returning the order alongside each key's raw value. A nested object's own
// keys are left encoded in its raw value, for the caller to walk in turn.
func decodeObject(data []byte) ([]string, map[string]json.RawMessage, error) {
	dec := json.NewDecoder(bytes.NewReader(data))
	tok, err := dec.Token()
	if err != nil {
		return nil, nil, err
	}
	if delim, ok := tok.(json.Delim); !ok || delim != '{' {
		return nil, nil, fmt.Errorf("record: expected a JSON object, got %v", tok)
	}

	// Non-nil on purpose, at every nesting level: a nil order is Marshal's
	// "never parsed" sentinel, so a parsed-but-empty object must come back
	// with an empty order rather than a nil one, or Marshal would replay the
	// struct's own field order over it and break the byte-for-byte round trip.
	order := []string{}
	values := make(map[string]json.RawMessage)
	for dec.More() {
		keyTok, err := dec.Token()
		if err != nil {
			return nil, nil, err
		}
		key, ok := keyTok.(string)
		if !ok {
			return nil, nil, fmt.Errorf("record: expected a string key, got %v", keyTok)
		}
		var raw json.RawMessage
		if err := dec.Decode(&raw); err != nil {
			return nil, nil, fmt.Errorf("record: field %q: %w", key, err)
		}
		if _, dup := values[key]; !dup {
			order = append(order, key)
		}
		values[key] = raw
	}
	if _, err := dec.Token(); err != nil {
		return nil, nil, err
	}
	if tok, err := dec.Token(); err != io.EOF {
		if err == nil {
			return nil, nil, fmt.Errorf("record: trailing data after the closing brace: %v", tok)
		}
		return nil, nil, fmt.Errorf("record: trailing data after the closing brace: %w", err)
	}
	return order, values, nil
}

// Marshal emits the record as two-space-indented JSON with a trailing
// newline and no HTML escaping. A key Parse observed is emitted in the
// position Parse observed it. A Record with no observed order, because it
// was built directly rather than by Parse, emits every typed field first,
// in struct order, followed by Extra. Either way, an Extra entry whose key
// was never observed is appended last.
func (r Record) Marshal() ([]byte, error) {
	keys, values, err := r.orderedFields()
	if err != nil {
		return nil, fmt.Errorf("record: marshal: %w", err)
	}
	var compact bytes.Buffer
	if err := writeObject(&compact, keys, values); err != nil {
		return nil, fmt.Errorf("record: marshal: %w", err)
	}
	var pretty bytes.Buffer
	if err := json.Indent(&pretty, compact.Bytes(), "", "  "); err != nil {
		return nil, fmt.Errorf("record: marshal: %w", err)
	}
	pretty.WriteByte('\n')
	return pretty.Bytes(), nil
}

// typedField pairs a typed key's encoder with whether the field it encodes
// currently holds a non-zero value. orderedFields uses nonZero to decide
// whether a typed key absent from the observed order is worth appending: a
// key a caller never set stays absent, matching the document Parse read.
type typedField struct {
	marshal func() (json.RawMessage, error)
	nonZero bool
}

// nonZeroValue reports whether v differs from its type's zero value. It
// backs every typedField.nonZero so a struct field newly set after Parse
// (SchemaVersion, Adopted, a nested identifier, and so on) is recognized as
// worth appending even though the source document never carried its key.
func nonZeroValue(v any) bool {
	return !reflect.ValueOf(v).IsZero()
}

// topLevelTypedFields is the set of keys the marshal path can emit for a
// Record, named so TestTypedKeySetsAgree can read its keys directly.
func topLevelTypedFields(r Record) map[string]typedField {
	return map[string]typedField{
		"name":          {marshal: func() (json.RawMessage, error) { return rawOf(r.Name) }, nonZero: nonZeroValue(r.Name)},
		"step":          {marshal: func() (json.RawMessage, error) { return rawOf(r.Step) }, nonZero: nonZeroValue(r.Step)},
		"domain":        {marshal: func() (json.RawMessage, error) { return rawOf(r.Domain) }, nonZero: nonZeroValue(r.Domain)},
		"schemaVersion": {marshal: func() (json.RawMessage, error) { return rawOf(r.SchemaVersion) }, nonZero: nonZeroValue(r.SchemaVersion)},
		"adopted":       {marshal: func() (json.RawMessage, error) { return rawOf(r.Adopted) }, nonZero: nonZeroValue(r.Adopted)},
		"github":        {marshal: func() (json.RawMessage, error) { return marshalGitHub(r.GitHub) }, nonZero: nonZeroValue(r.GitHub)},
		"cloudflare":    {marshal: func() (json.RawMessage, error) { return marshalCloudflare(r.Cloudflare) }, nonZero: nonZeroValue(r.Cloudflare)},
	}
}

func (r Record) orderedFields() ([]string, []json.RawMessage, error) {
	return orderedFields(r.order, typedTopLevelKeys, topLevelTypedFields(r), r.Extra)
}

// githubTypedFields is topLevelTypedFields's counterpart for GitHub.
func githubTypedFields(gh GitHub) map[string]typedField {
	return map[string]typedField{
		"repo":           {marshal: func() (json.RawMessage, error) { return marshalGitHubRepo(gh.Repo) }, nonZero: nonZeroValue(gh.Repo)},
		"installationId": {marshal: func() (json.RawMessage, error) { return rawOf(gh.InstallationID) }, nonZero: nonZeroValue(gh.InstallationID)},
	}
}

func marshalGitHub(gh GitHub) (json.RawMessage, error) {
	return marshalObject(gh.order, typedGitHubKeys, githubTypedFields(gh), gh.Extra)
}

// githubRepoTypedFields is topLevelTypedFields's counterpart for GitHubRepo.
func githubRepoTypedFields(repo GitHubRepo) map[string]typedField {
	return map[string]typedField{
		"id":            {marshal: func() (json.RawMessage, error) { return rawOf(repo.ID) }, nonZero: nonZeroValue(repo.ID)},
		"owner":         {marshal: func() (json.RawMessage, error) { return rawOf(repo.Owner) }, nonZero: nonZeroValue(repo.Owner)},
		"repo":          {marshal: func() (json.RawMessage, error) { return rawOf(repo.Repo) }, nonZero: nonZeroValue(repo.Repo)},
		"defaultBranch": {marshal: func() (json.RawMessage, error) { return rawOf(repo.DefaultBranch) }, nonZero: nonZeroValue(repo.DefaultBranch)},
	}
}

func marshalGitHubRepo(repo GitHubRepo) (json.RawMessage, error) {
	return marshalObject(repo.order, typedGitHubRepoKeys, githubRepoTypedFields(repo), repo.Extra)
}

// cloudflareTypedFields is topLevelTypedFields's counterpart for Cloudflare.
func cloudflareTypedFields(cf Cloudflare) map[string]typedField {
	return map[string]typedField{
		"accountId":  {marshal: func() (json.RawMessage, error) { return rawOf(cf.AccountID) }, nonZero: nonZeroValue(cf.AccountID)},
		"zoneId":     {marshal: func() (json.RawMessage, error) { return rawOf(cf.ZoneID) }, nonZero: nonZeroValue(cf.ZoneID)},
		"workerName": {marshal: func() (json.RawMessage, error) { return rawOf(cf.WorkerName) }, nonZero: nonZeroValue(cf.WorkerName)},
	}
}

func marshalCloudflare(cf Cloudflare) (json.RawMessage, error) {
	return marshalObject(cf.order, typedCloudflareKeys, cloudflareTypedFields(cf), cf.Extra)
}

// marshalObject orders a nested object's fields with orderedFields and
// encodes the result as a compact JSON object.
func marshalObject(observedOrder, typedOrder []string, typed map[string]typedField, extra []ExtraField) (json.RawMessage, error) {
	keys, values, err := orderedFields(observedOrder, typedOrder, typed, extra)
	if err != nil {
		return nil, err
	}
	var buf bytes.Buffer
	if err := writeObject(&buf, keys, values); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// orderedFields replays observedOrder against typed and extra, then appends
// any typed key observedOrder never named whose current value is non-zero (a
// field a caller set after Parse, on a record whose source document never
// carried that key), in typedOrder's order, and finally any extra entry
// neither observedOrder nor that append step named. A key observedOrder
// names that is neither typed nor present in extra was removed from the
// record after Parse and is dropped rather than re-emitted with a stale
// value. A nil observedOrder means the value was built directly rather than
// by Parse, so typedOrder, the struct's own field order, stands in for it.
func orderedFields(observedOrder []string, typedOrder []string, typed map[string]typedField, extra []ExtraField) ([]string, []json.RawMessage, error) {
	replayOrder := observedOrder
	if replayOrder == nil {
		replayOrder = typedOrder
	}

	extraByKey := make(map[string]json.RawMessage, len(extra))
	for _, e := range extra {
		extraByKey[e.Key] = e.Value
	}

	seen := make(map[string]bool, len(replayOrder)+len(typedOrder)+len(extra))
	var keys []string
	var values []json.RawMessage
	emit := func(key string, raw json.RawMessage) {
		seen[key] = true
		keys = append(keys, key)
		values = append(values, raw)
	}

	for _, key := range replayOrder {
		if seen[key] {
			continue
		}
		if tf, ok := typed[key]; ok {
			raw, err := tf.marshal()
			if err != nil {
				return nil, nil, fmt.Errorf("field %q: %w", key, err)
			}
			emit(key, raw)
			continue
		}
		if raw, ok := extraByKey[key]; ok {
			emit(key, raw)
		}
	}
	for _, key := range typedOrder {
		if seen[key] {
			continue
		}
		tf, ok := typed[key]
		if !ok || !tf.nonZero {
			continue
		}
		raw, err := tf.marshal()
		if err != nil {
			return nil, nil, fmt.Errorf("field %q: %w", key, err)
		}
		emit(key, raw)
	}
	for _, e := range extra {
		if seen[e.Key] {
			continue
		}
		emit(e.Key, e.Value)
	}
	return keys, values, nil
}

// rawOf encodes v as JSON with HTML escaping disabled, matching the byte
// contract JSON.stringify(data, null, 2) sets for a Node-written record.
func rawOf(v any) (json.RawMessage, error) {
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(v); err != nil {
		return nil, err
	}
	return bytes.TrimRight(buf.Bytes(), "\n"), nil
}

// writeObject appends a compact JSON object built from keys and values, in
// order, to buf.
func writeObject(buf *bytes.Buffer, keys []string, values []json.RawMessage) error {
	buf.WriteByte('{')
	for i, key := range keys {
		if i > 0 {
			buf.WriteByte(',')
		}
		keyRaw, err := rawOf(key)
		if err != nil {
			return err
		}
		buf.Write(keyRaw)
		buf.WriteByte(':')
		buf.Write(values[i])
	}
	buf.WriteByte('}')
	return nil
}
