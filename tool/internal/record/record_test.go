package record

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

func readTestdata(t *testing.T, name string) []byte {
	t.Helper()
	data, err := os.ReadFile(filepath.Join("testdata", name))
	if err != nil {
		t.Fatalf("read testdata/%s: %v", name, err)
	}
	return data
}

// TestParseMarshalRoundTrip covers the seam 2.0 depends on: a record this
// package does not fully understand, secrets included, must survive a
// Parse/Marshal cycle byte for byte, key order and all.
func TestParseMarshalRoundTrip(t *testing.T) {
	for _, name := range []string{"v0-with-secrets.json", "v1-adopted.json"} {
		t.Run(name, func(t *testing.T) {
			original := readTestdata(t, name)
			r, err := Parse(original)
			if err != nil {
				t.Fatalf("Parse: %v", err)
			}
			got, err := r.Marshal()
			if err != nil {
				t.Fatalf("Marshal: %v", err)
			}
			want := bytes.TrimRight(original, "\n")
			gotTrimmed := bytes.TrimRight(got, "\n")
			if !bytes.Equal(want, gotTrimmed) {
				t.Errorf("round trip changed the bytes:\nwant:\n%s\ngot:\n%s", want, gotTrimmed)
			}
		})
	}
}

// TestVersion0HasNoSchemaVersion asserts Parse leaves SchemaVersion at its
// zero value for a record with no schemaVersion key, the version 0 marker
// the spec defines. Marshal must not synthesize the key: a record without
// one stays without one until Task 5's store upgrades it on write.
func TestVersion0HasNoSchemaVersion(t *testing.T) {
	r, err := Parse(readTestdata(t, "v0-with-secrets.json"))
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	if r.SchemaVersion != 0 {
		t.Errorf("SchemaVersion = %d, want 0", r.SchemaVersion)
	}
	got, err := r.Marshal()
	if err != nil {
		t.Fatalf("Marshal: %v", err)
	}
	if bytes.Contains(got, []byte("schemaVersion")) {
		t.Errorf("Marshal added a schemaVersion key to a version 0 record: %s", got)
	}
}

// TestVersion1AdoptedFields asserts Parse decodes the typed identifiers a
// version 1 adopted record carries, while secretRefs (reserved by the spec,
// not yet a typed field) stays in Extra.
func TestVersion1AdoptedFields(t *testing.T) {
	r, err := Parse(readTestdata(t, "v1-adopted.json"))
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	if r.SchemaVersion != 1 {
		t.Errorf("SchemaVersion = %d, want 1", r.SchemaVersion)
	}
	if !r.Adopted {
		t.Error("Adopted = false, want true")
	}
	if r.Domain != "alpineclub.example" {
		t.Errorf("Domain = %q, want alpineclub.example", r.Domain)
	}
	if r.GitHub.Repo.ID != 123456789 {
		t.Errorf("GitHub.Repo.ID = %d, want 123456789", r.GitHub.Repo.ID)
	}
	if r.GitHub.Repo.Owner != "alpine-club" {
		t.Errorf("GitHub.Repo.Owner = %q, want alpine-club", r.GitHub.Repo.Owner)
	}
	if r.GitHub.Repo.Repo != "alpine-club-site" {
		t.Errorf("GitHub.Repo.Repo = %q, want alpine-club-site", r.GitHub.Repo.Repo)
	}
	if r.GitHub.Repo.DefaultBranch != "main" {
		t.Errorf("GitHub.Repo.DefaultBranch = %q, want main", r.GitHub.Repo.DefaultBranch)
	}
	if r.GitHub.InstallationID != 20200042 {
		t.Errorf("GitHub.InstallationID = %d, want 20200042", r.GitHub.InstallationID)
	}
	if r.Cloudflare.AccountID != "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6" {
		t.Errorf("Cloudflare.AccountID = %q, unexpected", r.Cloudflare.AccountID)
	}
	if r.Cloudflare.ZoneID != "9f8e7d6c5b4a39281706f5e4d3c2b1a0" {
		t.Errorf("Cloudflare.ZoneID = %q, unexpected", r.Cloudflare.ZoneID)
	}
	if r.Cloudflare.WorkerName != "alpine-club-site" {
		t.Errorf("Cloudflare.WorkerName = %q, unexpected", r.Cloudflare.WorkerName)
	}

	var foundSecretRefs bool
	for _, e := range r.Extra {
		if e.Key == "secretRefs" {
			foundSecretRefs = true
			if !bytes.Contains(e.Value, []byte("keyring://")) {
				t.Errorf("secretRefs Extra value = %s, want a keyring:// reference", e.Value)
			}
		}
	}
	if !foundSecretRefs {
		t.Error("secretRefs did not round-trip into Extra")
	}
}

// TestParseMalformed asserts a syntactically invalid record fails to parse,
// rather than silently returning a partial Record.
func TestParseMalformed(t *testing.T) {
	_, err := Parse(readTestdata(t, "malformed.json"))
	if err == nil {
		t.Fatal("Parse succeeded on a malformed record, want an error")
	}
}

// secretFieldSubstrings names the substrings, matched case-insensitively
// against an exported Go field name, that would signal a plaintext secret
// has been given a typed field.
var secretFieldSubstrings = []string{"secret", "token", "pem", "privatekey", "webhook"}

func assertNoSecretFields(t *testing.T, typ reflect.Type, path string) {
	t.Helper()
	for f := range typ.Fields() {
		if !f.IsExported() {
			continue
		}
		lower := strings.ToLower(f.Name)
		for _, bad := range secretFieldSubstrings {
			if strings.Contains(lower, bad) {
				t.Errorf("%s.%s: field name contains %q, a secret-shaped typed field", path, f.Name, bad)
			}
		}
		if tag, ok := f.Tag.Lookup("json"); ok {
			lowerTag := strings.ToLower(tag)
			for _, bad := range secretFieldSubstrings {
				if strings.Contains(lowerTag, bad) {
					t.Errorf("%s.%s: json tag %q contains %q, a secret-shaped typed field", path, f.Name, tag, bad)
				}
			}
		}
		if f.Type.Kind() == reflect.Struct {
			assertNoSecretFields(t, f.Type, path+"."+f.Name)
		}
	}
}

// TestNoTypedSecretFields is the reflection test the 2.0 seam depends on: no
// exported field, at any level of Record, is shaped like a secret. A
// secret-bearing key always lands in Extra, never a typed field, so there
// is nothing for a typed accessor to leak.
func TestNoTypedSecretFields(t *testing.T) {
	assertNoSecretFields(t, reflect.TypeFor[Record](), "Record")
}

// TestSentinelOnlyLeaksThroughMarshal is the sentinel test: a plaintext
// secret parsed into Extra must never surface through fmt's default
// formatting, only through the one function whose whole job is emitting the
// record's bytes.
func TestSentinelOnlyLeaksThroughMarshal(t *testing.T) {
	const sentinel = "SENTINEL-7f3a"
	r, err := Parse(readTestdata(t, "v0-with-secrets.json"))
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}

	if s := fmt.Sprintf("%+v", r); strings.Contains(s, sentinel) {
		t.Errorf("fmt.Sprintf(%%+v) leaked the sentinel: %s", s)
	}
	if s := fmt.Sprintf("%#v", r); strings.Contains(s, sentinel) {
		t.Errorf("fmt.Sprintf(%%#v) leaked the sentinel: %s", s)
	}

	got, err := r.Marshal()
	if err != nil {
		t.Fatalf("Marshal: %v", err)
	}
	if !bytes.Contains(got, []byte(sentinel)) {
		t.Error("Marshal did not emit the sentinel, but it is the one permitted path")
	}
}

// TestMarshalFreshRecord asserts a Record built directly, never through
// Parse, emits every typed key in struct order followed by Extra: the shape
// a caller constructing a record from scratch gets, with no observed
// document to replay.
func TestMarshalFreshRecord(t *testing.T) {
	r := Record{
		Name: "New Site",
		Step: "scaffolded",
		Extra: []ExtraField{
			{Key: "note", Value: json.RawMessage(`"first run"`)},
		},
	}
	got, err := r.Marshal()
	if err != nil {
		t.Fatalf("Marshal: %v", err)
	}
	want := "{\n" +
		"  \"name\": \"New Site\",\n" +
		"  \"step\": \"scaffolded\",\n" +
		"  \"domain\": \"\",\n" +
		"  \"schemaVersion\": 0,\n" +
		"  \"adopted\": false,\n" +
		"  \"github\": {\n" +
		"    \"repo\": {\n" +
		"      \"id\": 0,\n" +
		"      \"owner\": \"\",\n" +
		"      \"repo\": \"\",\n" +
		"      \"defaultBranch\": \"\"\n" +
		"    },\n" +
		"    \"installationId\": 0\n" +
		"  },\n" +
		"  \"cloudflare\": {\n" +
		"    \"accountId\": \"\",\n" +
		"    \"zoneId\": \"\",\n" +
		"    \"workerName\": \"\"\n" +
		"  },\n" +
		"  \"note\": \"first run\"\n" +
		"}\n"
	if string(got) != want {
		t.Errorf("Marshal fresh record =\n%s\nwant:\n%s", got, want)
	}
}

// TestMarshalAppendsNewExtraField asserts an Extra entry added after Parse,
// whose key the original document never carried, is appended last rather
// than dropped or interleaved into the observed order.
func TestMarshalAppendsNewExtraField(t *testing.T) {
	r, err := Parse(readTestdata(t, "v1-adopted.json"))
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	r.Extra = append(r.Extra, ExtraField{Key: "notes", Value: json.RawMessage(`"added after parse"`)})

	got, err := r.Marshal()
	if err != nil {
		t.Fatalf("Marshal: %v", err)
	}
	lines := strings.Split(strings.TrimRight(string(got), "\n"), "\n")
	last := lines[len(lines)-2] // the line before the closing brace
	if !strings.Contains(last, `"notes": "added after parse"`) {
		t.Errorf("last field before the closing brace = %q, want the new notes entry", last)
	}
}

// TestParseHandlesRemovedKeyOnMarshal asserts a key Parse observed but a
// caller later removed from Extra (rebuilding the record without it, the
// same whole-record-replace pattern the Node CLI's saveSite uses to drop a
// key) is not re-emitted with a stale value.
func TestParseHandlesRemovedKeyOnMarshal(t *testing.T) {
	r, err := Parse(readTestdata(t, "v1-adopted.json"))
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	var kept []ExtraField
	for _, e := range r.Extra {
		if e.Key != "secretRefs" {
			kept = append(kept, e)
		}
	}
	r.Extra = kept

	got, err := r.Marshal()
	if err != nil {
		t.Fatalf("Marshal: %v", err)
	}
	if bytes.Contains(got, []byte("secretRefs")) {
		t.Errorf("Marshal re-emitted a key removed from Extra: %s", got)
	}
}

// TestMarshalAppendsTypedFieldSetAfterParse asserts a typed field a caller
// sets after Parse, whose key was absent from the source document, is
// appended after the observed keys rather than dropped: the field now holds
// a non-zero value, so it is no longer indistinguishable from an absent key
// parsing to its zero value.
func TestMarshalAppendsTypedFieldSetAfterParse(t *testing.T) {
	t.Run("top-level SchemaVersion", func(t *testing.T) {
		r, err := Parse(readTestdata(t, "v0-with-secrets.json"))
		if err != nil {
			t.Fatalf("Parse: %v", err)
		}
		r.SchemaVersion = 1

		got, err := r.Marshal()
		if err != nil {
			t.Fatalf("Marshal: %v", err)
		}
		original, err := Parse(readTestdata(t, "v0-with-secrets.json"))
		if err != nil {
			t.Fatalf("Parse: %v", err)
		}
		originalBytes, err := original.Marshal()
		if err != nil {
			t.Fatalf("Marshal: %v", err)
		}
		appended := ",\n  \"schemaVersion\": 1"
		if !strings.HasSuffix(string(got), appended+"\n}\n") {
			t.Errorf("Marshal =\n%s\nwant it to end with %q", got, appended+"\n}\n")
		}
		withoutAppend := strings.Replace(string(got), appended, "", 1)
		if withoutAppend != string(originalBytes) {
			t.Errorf("appending schemaVersion changed an unrelated byte:\nwant (minus the append):\n%s\ngot:\n%s", originalBytes, withoutAppend)
		}
	})

	t.Run("top-level Adopted", func(t *testing.T) {
		r, err := Parse(readTestdata(t, "v0-with-secrets.json"))
		if err != nil {
			t.Fatalf("Parse: %v", err)
		}
		r.Adopted = true

		got, err := r.Marshal()
		if err != nil {
			t.Fatalf("Marshal: %v", err)
		}
		wantSuffix := ",\n  \"adopted\": true\n}\n"
		if !strings.HasSuffix(string(got), wantSuffix) {
			t.Errorf("Marshal =\n%s\nwant it to end with %q", got, wantSuffix)
		}
	})

	t.Run("nested Cloudflare identifier", func(t *testing.T) {
		r, err := Parse(readTestdata(t, "v0-with-secrets.json"))
		if err != nil {
			t.Fatalf("Parse: %v", err)
		}
		// v0-with-secrets.json's cloudflare object carries apiToken and
		// accountId, but never zoneId: a fresh key for this record.
		r.Cloudflare.ZoneID = "9f8e7d6c5b4a39281706f5e4d3c2b1a0"

		got, err := r.Marshal()
		if err != nil {
			t.Fatalf("Marshal: %v", err)
		}
		if !bytes.Contains(got, []byte(`"zoneId": "9f8e7d6c5b4a39281706f5e4d3c2b1a0"`)) {
			t.Errorf("Marshal did not append the new zoneId key: %s", got)
		}
	})
}

// TestDecodeObjectRejectsTrailingData asserts decodeObject fails on a
// document carrying bytes after the closing brace, syntactically valid or
// not, rather than silently ignoring them.
func TestDecodeObjectRejectsTrailingData(t *testing.T) {
	_, _, err := decodeObject([]byte(`{"a":1}{"b":2}`))
	if err == nil {
		t.Fatal("decodeObject succeeded on data with trailing bytes after the closing brace, want an error")
	}
}
