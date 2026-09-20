// Package record holds the site record type the Node CLI writes and the Go
// tool reads. Only the fields both tools agree on are typed; every other
// key, secrets included, round-trips through an ordered tail so a record
// this package does not fully understand is never corrupted or dropped.
package record

import (
	"bytes"
	"encoding/json"
	"fmt"
)

// typedTopLevelKeys is the canonical order Marshal uses for a Record with no
// observed parse order: the struct's own field order.
var typedTopLevelKeys = []string{"name", "step", "domain", "schemaVersion", "adopted", "github", "cloudflare"}

// typedGitHubKeys is typedTopLevelKeys's counterpart for RecordGitHub.
var typedGitHubKeys = []string{"repo", "installationId"}

// typedCloudflareKeys is typedTopLevelKeys's counterpart for RecordCloudflare.
var typedCloudflareKeys = []string{"accountId", "zoneId", "workerName"}

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

// RecordGitHub carries a record's GitHub identifiers. Every other key under
// "github", including every secret (clientSecret, pem, webhookSecret), lands
// in Extra rather than a typed field.
type RecordGitHub struct {
	// Repo is the adopted repository, "owner/name".
	Repo string
	// InstallationID is the GitHub App installation covering Repo.
	InstallationID int64
	// Extra carries every key under "github" this package does not type,
	// in the order Parse observed them.
	Extra []ExtraField

	order []string
}

// RecordCloudflare carries a record's Cloudflare identifiers. Every other
// key under "cloudflare", including apiToken, lands in Extra rather than a
// typed field.
type RecordCloudflare struct {
	AccountID  string
	ZoneID     string
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
	GitHub RecordGitHub
	// Cloudflare carries the record's Cloudflare identifiers.
	Cloudflare RecordCloudflare
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

func parseGitHub(data []byte) (RecordGitHub, error) {
	order, values, err := decodeObject(data)
	if err != nil {
		return RecordGitHub{}, fmt.Errorf("record: field %q: %w", "github", err)
	}
	gh := RecordGitHub{order: order}
	for _, key := range order {
		raw := values[key]
		switch key {
		case "repo":
			if err := json.Unmarshal(raw, &gh.Repo); err != nil {
				return RecordGitHub{}, fmt.Errorf("record: field %q: %w", "github.repo", err)
			}
		case "installationId":
			if err := json.Unmarshal(raw, &gh.InstallationID); err != nil {
				return RecordGitHub{}, fmt.Errorf("record: field %q: %w", "github.installationId", err)
			}
		default:
			gh.Extra = append(gh.Extra, ExtraField{Key: key, Value: raw})
		}
	}
	return gh, nil
}

func parseCloudflare(data []byte) (RecordCloudflare, error) {
	order, values, err := decodeObject(data)
	if err != nil {
		return RecordCloudflare{}, fmt.Errorf("record: field %q: %w", "cloudflare", err)
	}
	cf := RecordCloudflare{order: order}
	for _, key := range order {
		raw := values[key]
		switch key {
		case "accountId":
			if err := json.Unmarshal(raw, &cf.AccountID); err != nil {
				return RecordCloudflare{}, fmt.Errorf("record: field %q: %w", "cloudflare.accountId", err)
			}
		case "zoneId":
			if err := json.Unmarshal(raw, &cf.ZoneID); err != nil {
				return RecordCloudflare{}, fmt.Errorf("record: field %q: %w", "cloudflare.zoneId", err)
			}
		case "workerName":
			if err := json.Unmarshal(raw, &cf.WorkerName); err != nil {
				return RecordCloudflare{}, fmt.Errorf("record: field %q: %w", "cloudflare.workerName", err)
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

	var order []string
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

func (r Record) orderedFields() ([]string, []json.RawMessage, error) {
	typed := map[string]func() (json.RawMessage, error){
		"name":          func() (json.RawMessage, error) { return rawOf(r.Name) },
		"step":          func() (json.RawMessage, error) { return rawOf(r.Step) },
		"domain":        func() (json.RawMessage, error) { return rawOf(r.Domain) },
		"schemaVersion": func() (json.RawMessage, error) { return rawOf(r.SchemaVersion) },
		"adopted":       func() (json.RawMessage, error) { return rawOf(r.Adopted) },
		"github":        func() (json.RawMessage, error) { return marshalGitHub(r.GitHub) },
		"cloudflare":    func() (json.RawMessage, error) { return marshalCloudflare(r.Cloudflare) },
	}
	fallback := r.order
	if fallback == nil {
		fallback = typedTopLevelKeys
	}
	return orderedFields(fallback, typed, r.Extra)
}

func marshalGitHub(gh RecordGitHub) (json.RawMessage, error) {
	typed := map[string]func() (json.RawMessage, error){
		"repo":           func() (json.RawMessage, error) { return rawOf(gh.Repo) },
		"installationId": func() (json.RawMessage, error) { return rawOf(gh.InstallationID) },
	}
	fallback := gh.order
	if fallback == nil {
		fallback = typedGitHubKeys
	}
	keys, values, err := orderedFields(fallback, typed, gh.Extra)
	if err != nil {
		return nil, err
	}
	var buf bytes.Buffer
	if err := writeObject(&buf, keys, values); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func marshalCloudflare(cf RecordCloudflare) (json.RawMessage, error) {
	typed := map[string]func() (json.RawMessage, error){
		"accountId":  func() (json.RawMessage, error) { return rawOf(cf.AccountID) },
		"zoneId":     func() (json.RawMessage, error) { return rawOf(cf.ZoneID) },
		"workerName": func() (json.RawMessage, error) { return rawOf(cf.WorkerName) },
	}
	fallback := cf.order
	if fallback == nil {
		fallback = typedCloudflareKeys
	}
	keys, values, err := orderedFields(fallback, typed, cf.Extra)
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
// any extra entry observedOrder never named. A key observedOrder names that
// is neither typed nor present in extra was removed from the record after
// Parse and is dropped rather than re-emitted with a stale value.
func orderedFields(observedOrder []string, typed map[string]func() (json.RawMessage, error), extra []ExtraField) ([]string, []json.RawMessage, error) {
	extraByKey := make(map[string]json.RawMessage, len(extra))
	for _, e := range extra {
		extraByKey[e.Key] = e.Value
	}

	seen := make(map[string]bool, len(observedOrder)+len(extra))
	var keys []string
	var values []json.RawMessage
	emit := func(key string, raw json.RawMessage) {
		seen[key] = true
		keys = append(keys, key)
		values = append(values, raw)
	}

	for _, key := range observedOrder {
		if seen[key] {
			continue
		}
		if f, ok := typed[key]; ok {
			raw, err := f()
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
