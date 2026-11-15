package doctor

import (
	"encoding/json"
	"errors"
	"regexp"
	"strings"
)

// WranglerFacts is the wrangler-config facts the local checks need, read from wrangler.jsonc
// (preferred) or wrangler.toml. The auth database id, account id, worker name, and workers.dev flag
// are not carried, since no check reads them.
type WranglerFacts struct {
	// HasEmailBinding reports whether a send_email binding named EMAIL is declared.
	HasEmailBinding bool
	// HasAuthDB reports whether a d1_databases binding named AUTH_DB is declared.
	HasAuthDB bool
	// AuthDBMigrationsDir is the AUTH_DB entry's migrations_dir, as written. Empty means the key
	// is absent, so wrangler's default, migrations, applies. Meaningful only when HasAuthDB is true.
	AuthDBMigrationsDir string
	// ObservabilityEnabled reports whether observability.enabled is true.
	ObservabilityEnabled bool
	// HasPublicOrigin reports whether vars.PUBLIC_ORIGIN was declared. PublicOrigin is read
	// only when this is true, the same undefined/empty-string distinction the engine's
	// optional field carries.
	HasPublicOrigin bool
	// PublicOrigin is vars.PUBLIC_ORIGIN's value. Meaningful only when HasPublicOrigin is true.
	PublicOrigin string
	// R2Buckets is the declared r2_buckets binding names, in file order. Nil when the config
	// declares none; callers read it through len, not a nil check.
	R2Buckets []string
}

// withWrangler runs body against the site's wrangler facts, and settles the result itself when
// they cannot be read: unchecked on a parse error, skip when no wrangler config exists.
func withWrangler(s Snapshot, body func(WranglerFacts) Result) Result {
	facts, found, err := ReadWranglerConfig(s)
	if err != nil {
		return uncheckedResult(err.Error())
	}
	if !found {
		return skipResult(noWranglerFoundDetail)
	}
	return body(facts)
}

// ReadWranglerConfig reads the doctor's wrangler-config facts from wrangler.jsonc (preferred when
// both exist) or wrangler.toml under s.Dir. found is false when neither file exists, which the
// checks report as a skip rather than a failure. err is non-nil only when a present wrangler.jsonc
// fails to parse.
func ReadWranglerConfig(s Snapshot) (facts WranglerFacts, found bool, err error) {
	jsonc, ok, err := s.readFile("wrangler.jsonc")
	if err != nil {
		return WranglerFacts{}, false, err
	}
	if ok {
		facts, err := factsFromJsonc(jsonc)
		if err != nil {
			return WranglerFacts{}, false, err
		}
		return facts, true, nil
	}

	toml, ok, err := s.readFile("wrangler.toml")
	if err != nil {
		return WranglerFacts{}, false, err
	}
	if ok {
		return factsFromToml(string(toml)), true, nil
	}

	return WranglerFacts{}, false, nil
}

// tomlHeaderPattern matches a table header line, optionally followed by an inline comment.
// tomlKeyValuePattern matches a "key = value" line. tomlQuotedPattern extracts a quoted value's
// body. All three are the regexes factsFromToml uses.
var (
	tomlHeaderPattern   = regexp.MustCompile(`^\s*(\[\[?[\w.]+\]?\])\s*(?:#.*)?$`)
	tomlKeyValuePattern = regexp.MustCompile(`^\s*(\w+)\s*=\s*(.+?)\s*$`)
	tomlQuotedPattern   = regexp.MustCompile(`^["'](.*)["']`)
)

// factsFromToml is a shallow, line-anchored read, not a TOML parser: a table header opens a
// section, and the relevant key lines are matched within it. A real TOML parser would accept files
// this reader rejects and reject files it accepts, so the two surfaces would disagree on real
// sites; matching the engine's verdicts matters more here than parsing TOML correctly.
func factsFromToml(text string) WranglerFacts {
	facts := WranglerFacts{}
	section := ""
	var d1Binding *string
	// d1MigrationsDir is buffered with the binding because migrations_dir may precede binding
	// inside the block.
	var d1MigrationsDir string
	var r2Binding *string

	// flushD1 tracks only the binding name: the database id is not a carried fact, since no check
	// reads it.
	flushD1 := func() {
		if d1Binding != nil && *d1Binding == "AUTH_DB" {
			facts.HasAuthDB = true
			facts.AuthDBMigrationsDir = d1MigrationsDir
		}
		d1Binding = nil
		d1MigrationsDir = ""
	}
	flushR2 := func() {
		if r2Binding != nil {
			facts.R2Buckets = append(facts.R2Buckets, *r2Binding)
		}
		r2Binding = nil
	}

	for line := range strings.SplitSeq(text, "\n") {
		if header := tomlHeaderPattern.FindStringSubmatch(line); header != nil {
			flushD1()
			flushR2()
			section = header[1]
			continue
		}
		kv := tomlKeyValuePattern.FindStringSubmatch(line)
		if kv == nil {
			continue
		}
		key, value := kv[1], kv[2]
		var str *string
		if quoted := tomlQuotedPattern.FindStringSubmatch(value); quoted != nil {
			s := quoted[1]
			str = &s
		}

		switch {
		case section == "[[send_email]]" && key == "name" && str != nil && *str == "EMAIL":
			facts.HasEmailBinding = true
		case section == "[[d1_databases]]" && key == "binding":
			d1Binding = str
		case section == "[[d1_databases]]" && key == "migrations_dir" && str != nil:
			d1MigrationsDir = *str
		case section == "[[r2_buckets]]" && key == "binding" && str != nil:
			r2Binding = str
		case section == "[observability]" && key == "enabled" && strings.HasPrefix(value, "true"):
			facts.ObservabilityEnabled = true
		case section == "[vars]" && key == "PUBLIC_ORIGIN" && str != nil:
			facts.HasPublicOrigin = true
			facts.PublicOrigin = *str
		}
	}
	flushD1()
	flushR2()
	return facts
}

// stripJsonc blanks // and /* */ comments outside string literals, so a URL inside a string
// (https://...) survives, then removes a trailing comma before a closing } or ]. Accepted gap: a
// string containing ",}" is mangled by the trailing-comma pass, since that pass does not know
// string boundaries.
func stripJsonc(text string) string {
	_, code := blankJSComments(text)
	return trailingCommaPattern.ReplaceAllString(code, "$1")
}

// trailingCommaPattern matches a comma followed by optional whitespace and a closing } or ],
// the regex stripJsonc's trailing-comma pass applies after comments are blanked.
var trailingCommaPattern = regexp.MustCompile(`,(\s*[}\]])`)

// errWranglerJsoncParse is the clean message a present-but-unparseable wrangler.jsonc reports,
// never the parser's snippet (which would land the file's content verbatim in the report).
var errWranglerJsoncParse = errors.New("wrangler.jsonc did not parse")

// factsFromJsonc strips comments and trailing commas, then decodes into map[string]any (never a
// struct: encoding/json matches struct fields case-insensitively, and JSON.parse does not, so a
// config spelling "Observability" would read as configuration the engine's reader ignores).
func factsFromJsonc(body []byte) (WranglerFacts, error) {
	stripped := stripJsonc(string(body))
	var config map[string]any
	if err := json.Unmarshal([]byte(stripped), &config); err != nil {
		return WranglerFacts{}, errWranglerJsoncParse
	}
	return factsFromConfig(config), nil
}

// factsFromConfig extracts the WranglerFacts fields from a decoded jsonc config. Every lookup is an
// exact-case map index, which is what makes a mis-cased key (e.g. "Observability") read as absent,
// the same verdict JSON.parse's exact-case field access gives the engine.
func factsFromConfig(config map[string]any) WranglerFacts {
	facts := WranglerFacts{}

	for _, entry := range asObjectSlice(config["send_email"]) {
		if entry["name"] == "EMAIL" {
			facts.HasEmailBinding = true
			break
		}
	}

	for _, entry := range asObjectSlice(config["d1_databases"]) {
		if entry["binding"] == "AUTH_DB" {
			facts.HasAuthDB = true
			facts.AuthDBMigrationsDir, _ = entry["migrations_dir"].(string)
			break
		}
	}

	if observability, ok := config["observability"].(map[string]any); ok {
		facts.ObservabilityEnabled, _ = observability["enabled"].(bool)
	}

	if vars, ok := config["vars"].(map[string]any); ok {
		if origin, ok := vars["PUBLIC_ORIGIN"].(string); ok {
			facts.HasPublicOrigin = true
			facts.PublicOrigin = origin
		}
	}

	for _, entry := range asObjectSlice(config["r2_buckets"]) {
		if binding, ok := entry["binding"].(string); ok {
			facts.R2Buckets = append(facts.R2Buckets, binding)
		}
	}

	return facts
}

// asObjectSlice returns v as a slice of object entries, skipping any element that is not a JSON
// object, or nil when v is not a JSON array. A wrangler key of the wrong type reads as absent
// rather than failing the parse.
func asObjectSlice(v any) []map[string]any {
	arr, ok := v.([]any)
	if !ok {
		return nil
	}
	out := make([]map[string]any, 0, len(arr))
	for _, item := range arr {
		if obj, ok := item.(map[string]any); ok {
			out = append(out, obj)
		}
	}
	return out
}
