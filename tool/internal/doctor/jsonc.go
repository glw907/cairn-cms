package doctor

import (
	"encoding/json"
	"errors"
	"regexp"
	"strings"
)

// stripJsonc removes // and /* */ comments outside string literals, character by character so a
// URL inside a string (https://...) survives, then removes a trailing comma before a closing }
// or ]. Ported whole from stripJsonc (src/lib/doctor/wrangler-config.ts:139-176), accepted gap
// included: a string containing ",}" is mangled by the trailing-comma pass, since that pass runs
// after string boundaries are gone.
func stripJsonc(text string) string {
	var out strings.Builder
	inString := false
	runes := []rune(text)
	for i := 0; i < len(runes); i++ {
		ch := runes[i]
		if inString {
			out.WriteRune(ch)
			if ch == '\\' && i+1 < len(runes) {
				out.WriteRune(runes[i+1])
				i++
				continue
			}
			if ch == '"' {
				inString = false
			}
			continue
		}
		if ch == '"' {
			inString = true
			out.WriteRune(ch)
			continue
		}
		if ch == '/' && i+1 < len(runes) && runes[i+1] == '/' {
			end := indexRune(runes, '\n', i)
			if end == -1 {
				break
			}
			i = end - 1
			continue
		}
		if ch == '/' && i+1 < len(runes) && runes[i+1] == '*' {
			end := indexString(runes, "*/", i+2)
			if end == -1 {
				break
			}
			i = end + 1
			continue
		}
		out.WriteRune(ch)
	}
	return trailingCommaPattern.ReplaceAllString(out.String(), "$1")
}

// trailingCommaPattern matches a comma followed by optional whitespace and a closing } or ],
// the regex stripJsonc's trailing-comma pass applies after comments are removed.
var trailingCommaPattern = regexp.MustCompile(`,(\s*[}\]])`)

// indexRune returns the index of target in runes at or after from, or -1.
func indexRune(runes []rune, target rune, from int) int {
	for i := from; i < len(runes); i++ {
		if runes[i] == target {
			return i
		}
	}
	return -1
}

// indexString returns the index where target starts in runes at or after from, or -1.
func indexString(runes []rune, target string, from int) int {
	t := []rune(target)
	for i := from; i+len(t) <= len(runes); i++ {
		match := true
		for j := range t {
			if runes[i+j] != t[j] {
				match = false
				break
			}
		}
		if match {
			return i
		}
	}
	return -1
}

// errWranglerJsoncParse is the clean message a present-but-unparseable wrangler.jsonc reports,
// never the parser's own snippet (which would land the file's content verbatim in the report).
// Mirrors parseJsonc's catch (src/lib/doctor/wrangler-config.ts:81-90).
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

// factsFromConfig extracts the ported WranglerFacts fields from a decoded jsonc config. Every
// lookup is an exact-case map index, which is what makes a mis-cased key (e.g. "Observability")
// read as absent, the same verdict JSON.parse's exact-case field access gives the engine.
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
// object, or nil when v is not a JSON array. Mirrors the engine's repeated
// `Array.isArray(x) ? x : []` guard (wrangler-config.ts:180,184,190).
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
