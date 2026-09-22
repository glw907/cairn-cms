package spine

import (
	_ "embed"
	"encoding/json"
	"fmt"
)

//go:embed conditions.json
var conditionsJSON []byte

// ConditionText is one condition's operator-facing text, mirrored from
// src/lib/diagnostics/conditions.ts's REGISTRY (conditions.json, kept honest by the engine's own
// check:tool-conditions). DocsAnchor and LogEvent are empty when the registry entry omits them.
type ConditionText struct {
	ID          Condition
	Severity    FailSeverity
	Title       string
	Why         string
	Remediation string
	DocsAnchor  string
	LogEvent    string
}

// conditionEntry is conditions.json's own wire shape: a flat array of objects, one per
// REGISTRY key, severity spelled as the TypeScript union's two words.
type conditionEntry struct {
	ID          string `json:"id"`
	Severity    string `json:"severity"`
	Title       string `json:"title"`
	Why         string `json:"why"`
	Remediation string `json:"remediation"`
	DocsAnchor  string `json:"docsAnchor"`
	LogEvent    string `json:"logEvent"`
}

var conditionTexts = loadConditionTexts()

// loadConditionTexts parses the embedded mirror once at package init. A malformed embed is a
// build-time defect baked into the binary, so it panics rather than degrading every caller of
// TextFor to a silent "not found".
func loadConditionTexts() map[Condition]ConditionText {
	var entries []conditionEntry
	if err := json.Unmarshal(conditionsJSON, &entries); err != nil {
		panic(fmt.Sprintf("spine: conditions.json: %v", err))
	}

	out := make(map[Condition]ConditionText, len(entries))
	for _, e := range entries {
		severity := CriticalFailure
		if e.Severity == "warning" {
			severity = WarningFailure
		}
		id := Condition(e.ID)
		out[id] = ConditionText{
			ID:          id,
			Severity:    severity,
			Title:       e.Title,
			Why:         e.Why,
			Remediation: e.Remediation,
			DocsAnchor:  e.DocsAnchor,
			LogEvent:    e.LogEvent,
		}
	}
	return out
}

// TextFor returns id's operator-facing text from the embedded condition mirror, and whether id
// was found.
func TextFor(id Condition) (ConditionText, bool) {
	t, ok := conditionTexts[id]
	return t, ok
}

// embeddedConditionIDs returns every id conditions.json carries. It exists for
// conditions_test.go's set-equality drift test, which reads the mirror directly rather than
// through TextFor so a corrupted or truncated embed still surfaces as a set mismatch.
func embeddedConditionIDs() []string {
	ids := make([]string, 0, len(conditionTexts))
	for id := range conditionTexts {
		ids = append(ids, string(id))
	}
	return ids
}
