package doctor

import (
	"regexp"
	"strings"
)

// WranglerFacts is the wrangler-config facts the local checks need, read from wrangler.jsonc
// (preferred) or wrangler.toml. Ported from WranglerFacts (src/lib/doctor/wrangler-config.ts:6-37);
// authDbId, accountId, name, and workersDev are not ported since no ported check reads them
// (spec :60-64).
type WranglerFacts struct {
	// HasEmailBinding reports whether a send_email binding named EMAIL is declared.
	HasEmailBinding bool
	// HasAuthDB reports whether a d1_databases binding named AUTH_DB is declared.
	HasAuthDB bool
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

// ReadWranglerConfig reads the doctor's wrangler-config facts from wrangler.jsonc (preferred
// when both exist) or wrangler.toml under s.Dir. found is false when neither file exists, which
// the checks report as a skip rather than a failure. err is non-nil only when a present
// wrangler.jsonc fails to parse. Mirrors readWranglerConfig
// (src/lib/doctor/wrangler-config.ts:56-64).
func ReadWranglerConfig(s Snapshot) (facts WranglerFacts, found bool, err error) {
	jsonc, ok, err := s.ReadFile("wrangler.jsonc")
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

	toml, ok, err := s.ReadFile("wrangler.toml")
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
// body. All three are the exact regexes factsFromToml (src/lib/doctor/wrangler-config.ts:217-282)
// and its sibling r2EntriesFromToml already use.
var (
	tomlHeaderPattern   = regexp.MustCompile(`^\s*(\[\[?[\w.]+\]?\])\s*(?:#.*)?$`)
	tomlKeyValuePattern = regexp.MustCompile(`^\s*(\w+)\s*=\s*(.+?)\s*$`)
	tomlQuotedPattern   = regexp.MustCompile(`^["'](.*)["']`)
)

// factsFromToml is a shallow, line-anchored read, not a TOML parser: a table header opens a
// section, and the relevant key lines are matched within it. Ported whole from factsFromToml
// (src/lib/doctor/wrangler-config.ts:213-282); porting a real TOML library would give different
// verdicts on real sites (Task 3's own halt condition) and is not done here.
func factsFromToml(text string) WranglerFacts {
	facts := WranglerFacts{}
	section := ""
	var d1Binding *string
	var r2Binding *string

	// flushD1 mirrors the engine's own flush, minus tracking database_id: authDbId is not a
	// ported fact (no ported check reads it), so this reader tracks only the binding name.
	flushD1 := func() {
		if d1Binding != nil && *d1Binding == "AUTH_DB" {
			facts.HasAuthDB = true
		}
		d1Binding = nil
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
