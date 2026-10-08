package doctor

import (
	"encoding/json"
	"errors"
	"regexp"
)

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
// never the parser's own snippet (which would land the file's content verbatim in the report).
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
