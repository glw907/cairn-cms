package providers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
)

// npmHost is the only host an NPM client will ever send a request to. There is no base-URL
// variable and no environment override, the same rule cloudflare.go and github.go state for
// their own host pins.
const npmHost = "registry.npmjs.org"

// npmBase is npmHost's root, prefixed onto every request this client sends.
const npmBase = "https://" + npmHost

// NPM is the tool's read-only npm registry client: the Engine check reads a package's latest
// published version, and 2.0's engine detail view reads every version it was skipped for.
// The registry serves package metadata with no authentication, so every NPM client is
// unauthenticated.
type NPM struct {
	client *client
}

// NewNPM returns an NPM client sending every request through rt.
func NewNPM(rt http.RoundTripper) *NPM {
	return &NPM{client: newClient(npmHost, Credential{}, rt)}
}

// NPMError reports a registry call that did not return 2xx. Reason classifies it the same way
// classifyReason and reasonForStatus classify the other two providers' failures, rather than
// carrying a bare status.
type NPMError struct {
	Status int
	Reason Reason
}

// Error implements the error interface.
func (e *NPMError) Error() string {
	return fmt.Sprintf("npm: unexpected status %d", e.Status)
}

// npmHeader is the Accept and User-Agent pair every npm request in this file sends.
func npmHeader() http.Header {
	return http.Header{
		"Accept":     {"application/json"},
		"User-Agent": {userAgent()},
	}
}

// get performs a GET against path (resolved against npmBase) through the one raw GET helper
// transport.go shares with github.go, and returns the raw status, response headers, and body,
// with no classification, the same shape github.go's get uses so the shared transport-policy
// test (probe_test.go) can drive both through one table.
func (n *NPM) get(ctx context.Context, path string) (int, http.Header, []byte, error) {
	return n.client.rawGet(ctx, npmBase+path, npmHeader())
}

// packument fetches name's packument (the registry's per-package metadata document) and returns
// it with distTags and versions still opaque: Latest and Versions each pick the field they need.
func (n *NPM) packument(ctx context.Context, name string) ([]byte, error) {
	status, header, data, err := n.get(ctx, "/"+name)
	if err != nil {
		return nil, err
	}
	if status < 200 || status >= 300 {
		return nil, &NPMError{Status: status, Reason: reasonForStatus(status, header)}
	}
	return data, nil
}

// Latest returns the version name's "latest" dist-tag points at.
func (n *NPM) Latest(ctx context.Context, name string) (string, error) {
	data, err := n.packument(ctx, name)
	if err != nil {
		return "", err
	}
	var doc struct {
		DistTags struct {
			Latest string `json:"latest"`
		} `json:"dist-tags"`
	}
	if err := json.Unmarshal(data, &doc); err != nil {
		return "", fmt.Errorf("providers: decode npm packument for %s: %w", name, err)
	}
	return doc.DistTags.Latest, nil
}

// Versions returns every version name has ever published, in the order the packument's own
// "versions" object serialized them: npm's registry writes that object in publish order, and a
// map-typed decode would lose it (Go randomizes map iteration), so this walks the JSON token
// stream directly rather than unmarshaling into a map. 2.0's engine detail view reads this order
// to list which versions a site skipped; 1.0's Engine check needs only Latest.
func (n *NPM) Versions(ctx context.Context, name string) ([]string, error) {
	data, err := n.packument(ctx, name)
	if err != nil {
		return nil, err
	}
	return versionOrder(data)
}

// versionOrder walks a packument's top-level object looking for "versions", then reads that
// nested object's keys in the order they appear in the source bytes.
func versionOrder(data []byte) ([]string, error) {
	dec := json.NewDecoder(bytes.NewReader(data))
	if err := expectDelim(dec, '{'); err != nil {
		return nil, fmt.Errorf("providers: decode npm packument: %w", err)
	}
	for dec.More() {
		key, err := dec.Token()
		if err != nil {
			return nil, fmt.Errorf("providers: decode npm packument: %w", err)
		}
		if key != "versions" {
			if err := skipValue(dec); err != nil {
				return nil, fmt.Errorf("providers: decode npm packument: %w", err)
			}
			continue
		}
		return readObjectKeys(dec)
	}
	return nil, fmt.Errorf("providers: decode npm packument: no \"versions\" field")
}

// expectDelim reads the next token and errors unless it is want.
func expectDelim(dec *json.Decoder, want json.Delim) error {
	tok, err := dec.Token()
	if err != nil {
		return err
	}
	if tok != want {
		return fmt.Errorf("expected %q, got %v", want, tok)
	}
	return nil
}

// readObjectKeys reads dec, which must be positioned just after an object's opening brace, and
// returns its keys in source order, skipping each value.
func readObjectKeys(dec *json.Decoder) ([]string, error) {
	if err := expectDelim(dec, '{'); err != nil {
		return nil, err
	}
	var keys []string
	for dec.More() {
		key, err := dec.Token()
		if err != nil {
			return nil, err
		}
		name, ok := key.(string)
		if !ok {
			return nil, fmt.Errorf("providers: object key %v is not a string", key)
		}
		keys = append(keys, name)
		if err := skipValue(dec); err != nil {
			return nil, err
		}
	}
	if _, err := dec.Token(); err != nil { // consume the closing brace
		return nil, err
	}
	return keys, nil
}

// skipValue reads and discards the next JSON value dec is positioned at, descending into nested
// objects and arrays so the decoder's position ends up just past it.
func skipValue(dec *json.Decoder) error {
	tok, err := dec.Token()
	if err != nil {
		return err
	}
	switch tok {
	case json.Delim('{'), json.Delim('['):
		for dec.More() {
			if tok == json.Delim('{') {
				if _, err := dec.Token(); err != nil { // the key
					return err
				}
			}
			if err := skipValue(dec); err != nil {
				return err
			}
		}
		_, err := dec.Token() // the closing delimiter
		return err
	default:
		return nil
	}
}
