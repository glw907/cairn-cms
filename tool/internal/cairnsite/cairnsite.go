// Package cairnsite reads and writes cairn-site.json, the record at a site's root that holds the
// facts about the site with no other home. The Node side checks the same file against
// schema/cairn-site-1.schema.json; this package refuses the same faults in Go, so the tool never
// writes a record the build would reject.
package cairnsite

import (
	"bytes"
	"embed"
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"strings"
)

// File is the record's name at a site's root.
const File = "cairn-site.json"

//go:embed definitions/*.json
var definitions embed.FS

// Record is the parsed record. The fields are in the order the file writes its keys.
type Record struct {
	Kind         string         `json:"kind"`
	Features     []string       `json:"features"`
	ThemeOptions map[string]any `json:"themeOptions"`
	AIPosture    string         `json:"aiPosture,omitempty"`
	Scaffold     Scaffold       `json:"scaffold"`
	Deploy       Deploy         `json:"deploy"`
}

// Scaffold names what wrote the site.
type Scaffold struct {
	Engine   string `json:"engine"`
	Composer string `json:"composer,omitempty"`
}

// Deploy holds the values the setup tool writes when it deploys the site.
type Deploy struct {
	PublicOrigin string `json:"publicOrigin"`
	EmailFrom    string `json:"emailFrom"`
	GitHub       GitHub `json:"github"`
}

// GitHub names the repository and the App that commits the site's content.
type GitHub struct {
	Owner          string `json:"owner"`
	Repo           string `json:"repo"`
	Branch         string `json:"branch"`
	AppID          string `json:"appId"`
	InstallationID string `json:"installationId"`
}

// required lists every key the schema requires, as dotted paths.
var required = []string{
	"kind", "features", "themeOptions", "scaffold", "scaffold.engine",
	"deploy", "deploy.publicOrigin", "deploy.emailFrom", "deploy.github",
	"deploy.github.owner", "deploy.github.repo", "deploy.github.branch",
	"deploy.github.appId", "deploy.github.installationId",
}

// Decode parses a record. It refuses an unknown key, a missing required key, and a kind or feature
// outside the closed lists, and each error names the file and the field.
func Decode(data []byte) (Record, error) {
	var generic map[string]any
	if err := json.Unmarshal(data, &generic); err != nil {
		return Record{}, fmt.Errorf("%s: %w", File, err)
	}
	for _, path := range required {
		if !present(generic, strings.Split(path, ".")) {
			return Record{}, fmt.Errorf("%s: %s is required", File, path)
		}
	}
	var r Record
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&r); err != nil {
		return Record{}, fmt.Errorf("%s: %w", File, err)
	}
	if err := r.validate(); err != nil {
		return Record{}, fmt.Errorf("%s: %w", File, err)
	}
	return r, nil
}

// Encode returns the record as two-space-indented JSON with a final newline, or an error when the
// record names a kind or feature outside the closed lists.
func Encode(r Record) ([]byte, error) {
	if err := r.validate(); err != nil {
		return nil, fmt.Errorf("%s: %w", File, err)
	}
	if r.Features == nil {
		r.Features = []string{}
	}
	if r.ThemeOptions == nil {
		r.ThemeOptions = map[string]any{}
	}
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	enc.SetIndent("", "  ")
	if err := enc.Encode(r); err != nil {
		return nil, fmt.Errorf("%s: %w", File, err)
	}
	return buf.Bytes(), nil
}

// present reports whether the dotted path exists in a decoded JSON object.
func present(node map[string]any, path []string) bool {
	child, ok := node[path[0]]
	if !ok {
		return false
	}
	if len(path) == 1 {
		return true
	}
	next, ok := child.(map[string]any)
	return ok && present(next, path[1:])
}

func (r Record) validate() error {
	kinds, features, err := ids()
	if err != nil {
		return err
	}
	if !slices.Contains(kinds, r.Kind) {
		return fmt.Errorf("kind %q is not one of %s", r.Kind, strings.Join(kinds, ", "))
	}
	for _, f := range r.Features {
		if !slices.Contains(features, f) {
			return fmt.Errorf("feature %q is not one of %s", f, listOrNone(features))
		}
	}
	if r.AIPosture != "" && r.AIPosture != "invite" && r.AIPosture != "decline" {
		return fmt.Errorf("aiPosture %q is not one of invite, decline", r.AIPosture)
	}
	for key, value := range r.ThemeOptions {
		switch value.(type) {
		case string, float64, bool, int, int64:
		default:
			return fmt.Errorf("themeOptions.%s must be a string, number, or boolean", key)
		}
	}
	return nil
}

func listOrNone(ids []string) string {
	if len(ids) == 0 {
		return "(none yet)"
	}
	return strings.Join(ids, ", ")
}

// ids reads the closed kind and feature lists from the embedded copy of definitions/.
func ids() (kinds, features []string, err error) {
	kinds, err = readIDs("definitions/kinds.json", "kinds")
	if err != nil {
		return nil, nil, err
	}
	features, err = readIDs("definitions/features.json", "features")
	if err != nil {
		return nil, nil, err
	}
	return kinds, features, nil
}

func readIDs(name, key string) ([]string, error) {
	data, err := definitions.ReadFile(name)
	if err != nil {
		return nil, fmt.Errorf("read embedded %s: %w", name, err)
	}
	var doc map[string][]struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(data, &doc); err != nil {
		return nil, fmt.Errorf("parse embedded %s: %w", name, err)
	}
	entries, ok := doc[key]
	if !ok {
		return nil, errors.New("embedded " + name + " has no " + key + " list")
	}
	out := make([]string, 0, len(entries))
	for _, e := range entries {
		out = append(out, e.ID)
	}
	return out, nil
}
