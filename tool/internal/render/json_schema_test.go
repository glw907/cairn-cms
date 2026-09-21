package render

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/health"
	"github.com/glw907/cairn-cms/tool/internal/logs"
	"github.com/glw907/cairn-cms/tool/internal/render/fixtures"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// jsonGoldenDir is the committed payload corpus's own root. It sits beside the frame corpus and
// is recut by the same `make -C tool golden` target, since both tests match `-run TestGolden`.
const jsonGoldenDir = "testdata/json"

// schemaDir is where the published schemas live, relative to this package. They ship in the
// repository rather than in the binary: a consumer validating a payload reads the file, and a
// schema in the binary would be unreachable to every tool that does that.
const schemaDir = "../../docs/reference"

// docPath is the reference page every published key and both freeze lists are stated on.
const docPath = "../../docs/reference/json-output.md"

// jsonGoldenCase is one committed payload file, the schema it must validate against, and the
// bytes it holds.
type jsonGoldenCase struct {
	// name is the file's own stem under jsonGoldenDir.
	name string
	// schema is the published schema file every JSON object in the golden validates against. A
	// stream file names the site schema and its summary line is validated against the summary
	// schema instead, by kind.
	schema string
	// data is the golden's bytes, one JSON object per line.
	data []byte
}

// jsonGoldens builds every payload golden from the fixture corpus, one file per case.
func jsonGoldens(t *testing.T) []jsonGoldenCase {
	t.Helper()
	now := fixtures.Now()
	var out []jsonGoldenCase

	for _, named := range fixtures.All() {
		var stream strings.Builder
		verdicts := make([]spine.Verdict, 0, len(named.Reports))
		for _, r := range named.Reports {
			verdict := reportVerdict(r)
			verdicts = append(verdicts, verdict)
			line, err := MarshalSiteLine(SiteJSON{Report: r, Verbose: true, Verdict: verdict, Now: now})
			if err != nil {
				t.Fatalf("MarshalSiteLine %s: %v", named.Name, err)
			}
			stream.Write(line)
			stream.WriteString("\n")
		}
		summary, err := MarshalSummary(SummaryJSON{
			Reports:  named.Reports,
			Verdicts: verdicts,
			Verdict:  worstOf(verdicts),
			ExitCode: worstOf(verdicts),
			Sites:    len(named.Reports),
			Now:      now,
		})
		if err != nil {
			t.Fatalf("MarshalSummary %s: %v", named.Name, err)
		}
		stream.Write(summary)
		stream.WriteString("\n")
		out = append(out, jsonGoldenCase{name: "health-" + named.Name, schema: "cairn-health.schema.json", data: []byte(stream.String())})
	}

	single, err := MarshalSite(SiteJSON{
		Report:   fixtures.OneSick()[0],
		Verbose:  true,
		Verdict:  spine.VerdictCritical,
		ExitCode: spine.VerdictCritical,
		Elapsed:  1730 * time.Millisecond,
		Now:      now,
	})
	if err != nil {
		t.Fatalf("MarshalSite: %v", err)
	}
	out = append(out, jsonGoldenCase{name: "health-single", schema: "cairn-health.schema.json", data: append(single, '\n')})

	list, err := MarshalSitesList([]SiteListEntry{
		{ID: "ecxc-ski-a1b2c3", Name: "ecxc.ski", Domain: "ecxc.ski", Step: "live"},
		{ID: "907-life-d4e5f6", Name: "907.life", Domain: "907.life", Step: "live"},
	}, spine.VerdictOK, nil)
	if err != nil {
		t.Fatalf("MarshalSitesList: %v", err)
	}
	out = append(out, jsonGoldenCase{name: "sites-list", schema: "cairn-sites-list.schema.json", data: append(list, '\n')})

	logsData, err := MarshalLogs("ecxc.ski", []logs.Entry{{
		At:    now.Add(-2 * time.Hour),
		Level: "error",
		Event: "publish.commit.failed",
		Fields: []logs.Field{
			{Key: "editor", Value: json.RawMessage(`"someone@example.com"`)},
			{Key: "reason", Value: json.RawMessage(`"conflict"`)},
		},
	}})
	if err != nil {
		t.Fatalf("MarshalLogs: %v", err)
	}
	out = append(out, jsonGoldenCase{name: "logs", schema: "cairn-logs.schema.json", data: append(logsData, '\n')})

	adoptData, err := MarshalAdoptList([]AdoptCandidate{{
		Worker: "ecxc-ski", Repo: "glw907/ecxc-ski", Zone: "ecxc.ski", Domain: "ecxc.ski",
		AccountID: "120c269ad6d3dfbe6d63a0bb53758ca0", Connected: true, Adopted: false,
	}})
	if err != nil {
		t.Fatalf("MarshalAdoptList: %v", err)
	}
	out = append(out, jsonGoldenCase{name: "adopt-list", schema: "cairn-adopt-list.schema.json", data: append(adoptData, '\n')})

	return out
}

// reportVerdict folds one fixture report into the verdict its own checks produce, through the
// same arithmetic the command layer runs.
func reportVerdict(r health.Report) spine.Verdict {
	checks := make(spine.SiteVerdicts, 0, len(r.Checks))
	for _, c := range r.Checks {
		checks = append(checks, spine.CheckVerdict{
			ID: c.ID, State: c.Outcome.State, Reason: c.Outcome.Reason, Acknowledged: c.Acknowledged,
		})
	}
	return spine.ExitCode([]spine.SiteVerdicts{checks}, nil, 0)
}

// worstOf folds several site verdicts into the run's own.
func worstOf(vs []spine.Verdict) spine.Verdict {
	worst := spine.VerdictOK
	if len(vs) == 0 {
		worst = spine.VerdictUnknown
	}
	for _, v := range vs {
		if v.Severity() > worst.Severity() {
			worst = v
		}
	}
	return worst
}

// TestGoldenJSONPayloads compares every committed payload against the current boundary, and
// rewrites the corpus under -update. `make -C tool golden` sets the flag; a reviewer reads the
// resulting diff as the contract's own change, which is the point of freezing this surface at
// 1.0 while the text bodies' layout stays free to move.
func TestGoldenJSONPayloads(t *testing.T) {
	cases := jsonGoldens(t)
	if *updateGolden {
		if err := os.MkdirAll(jsonGoldenDir, 0o755); err != nil {
			t.Fatal(err)
		}
		for _, c := range cases {
			if err := os.WriteFile(filepath.Join(jsonGoldenDir, c.name+".json"), c.data, 0o644); err != nil {
				t.Fatal(err)
			}
		}
	}

	committed := make(map[string]bool)
	for _, c := range cases {
		path := filepath.Join(jsonGoldenDir, c.name+".json")
		committed[c.name+".json"] = true
		want, err := os.ReadFile(path)
		if err != nil {
			t.Errorf("%s: %v; run `make -C tool golden`", path, err)
			continue
		}
		if string(want) != string(c.data) {
			t.Errorf("%s is stale; run `make -C tool golden` and read the diff", path)
		}
	}

	entries, err := os.ReadDir(jsonGoldenDir)
	if err != nil {
		t.Fatal(err)
	}
	for _, e := range entries {
		if !committed[e.Name()] {
			t.Errorf("%s is an orphan: no case produces it", filepath.Join(jsonGoldenDir, e.Name()))
		}
	}
}

// TestEveryGoldenValidatesAgainstItsSchema validates every committed payload against the schema
// published beside it, so a schema cannot drift from the output it describes. The validator is
// the structural subset this contract needs, hand-rolled rather than taken from a module: every
// required key present, every value's JSON type matching the schema, every enum and const
// honoured, and no key the schema does not declare.
func TestEveryGoldenValidatesAgainstItsSchema(t *testing.T) {
	for _, c := range jsonGoldens(t) {
		t.Run(c.name, func(t *testing.T) {
			for i, line := range slices.All(strings.Split(strings.TrimRight(string(c.data), "\n"), "\n")) {
				var value any
				if err := json.Unmarshal([]byte(line), &value); err != nil {
					t.Fatalf("line %d does not parse: %v", i, err)
				}
				name := c.schema
				if obj, ok := value.(map[string]any); ok && obj["kind"] == kindSummary {
					name = "cairn-health-summary.schema.json"
				}
				schema := loadSchema(t, name)
				for _, problem := range validate(value, schema, schema, "$") {
					t.Errorf("line %d against %s: %s", i, name, problem)
				}
			}
		})
	}
}

// loadSchema reads one published schema.
func loadSchema(t *testing.T, name string) map[string]any {
	t.Helper()
	data, err := os.ReadFile(filepath.Join(schemaDir, name))
	if err != nil {
		t.Fatal(err)
	}
	var out map[string]any
	if err := json.Unmarshal(data, &out); err != nil {
		t.Fatalf("%s: %v", name, err)
	}
	return out
}

// validate checks value against schema and returns one message per problem, each naming the path
// it was found at. root carries the document the $ref pointers resolve against.
func validate(value any, schema, root map[string]any, path string) []string {
	if ref, ok := schema["$ref"].(string); ok {
		return validate(value, resolveRef(root, ref), root, path)
	}
	var problems []string

	if want, ok := schema["type"].(string); ok {
		if got := jsonType(value); got != want && (want != "integer" || !isInteger(value)) {
			return []string{fmt.Sprintf("%s is a %s, want a %s", path, got, want)}
		}
	}
	if want, ok := schema["const"]; ok && !sameScalar(value, want) {
		problems = append(problems, fmt.Sprintf("%s is %v, want the constant %v", path, value, want))
	}
	if allowed, ok := schema["enum"].([]any); ok && !slices.ContainsFunc(allowed, func(a any) bool { return sameScalar(value, a) }) {
		problems = append(problems, fmt.Sprintf("%s is %v, outside the schema's enum %v", path, value, allowed))
	}

	switch typed := value.(type) {
	case map[string]any:
		problems = append(problems, validateObject(typed, schema, root, path)...)
	case []any:
		items, ok := schema["items"].(map[string]any)
		if !ok {
			return problems
		}
		for i, item := range typed {
			problems = append(problems, validate(item, items, root, fmt.Sprintf("%s[%d]", path, i))...)
		}
	}
	return problems
}

// validateObject checks one object's required keys, its declared properties, and whether a key
// the schema never declares reached the payload.
func validateObject(value map[string]any, schema, root map[string]any, path string) []string {
	var problems []string
	properties, _ := schema["properties"].(map[string]any)

	if required, ok := schema["required"].([]any); ok {
		for _, raw := range required {
			key, ok := raw.(string)
			if !ok {
				continue
			}
			if _, present := value[key]; !present {
				problems = append(problems, fmt.Sprintf("%s is missing the required key %q", path, key))
			}
		}
	}

	for key, child := range value {
		childPath := path + "." + key
		if sub, ok := properties[key].(map[string]any); ok {
			problems = append(problems, validate(child, sub, root, childPath)...)
			continue
		}
		switch extra := schema["additionalProperties"].(type) {
		case map[string]any:
			problems = append(problems, validate(child, extra, root, childPath)...)
		case bool:
			if !extra {
				problems = append(problems, fmt.Sprintf("%s is not declared by the schema", childPath))
			}
		default:
			problems = append(problems, fmt.Sprintf("%s is not declared by the schema", childPath))
		}
	}
	return problems
}

// resolveRef follows a local "#/$defs/name" pointer, the one reference form these schemas use.
func resolveRef(root map[string]any, ref string) map[string]any {
	name := strings.TrimPrefix(ref, "#/$defs/")
	defs, _ := root["$defs"].(map[string]any)
	out, _ := defs[name].(map[string]any)
	return out
}

// jsonType names value's JSON type, the six a schema's "type" keyword can hold.
func jsonType(value any) string {
	switch value.(type) {
	case nil:
		return "null"
	case bool:
		return "boolean"
	case float64:
		return "number"
	case string:
		return "string"
	case []any:
		return "array"
	default:
		return "object"
	}
}

// isInteger reports whether value is a number with no fractional part, which is what a schema's
// "integer" type means over JSON's one number type.
func isInteger(value any) bool {
	n, ok := value.(float64)
	return ok && n == float64(int64(n))
}

// sameScalar compares a payload value with a schema's const or enum member.
func sameScalar(value, want any) bool {
	return fmt.Sprint(value) == fmt.Sprint(want)
}

// dynamicKeyParents names the two objects whose keys are data rather than schema: a check's
// derived fields and its copied ones are keyed by whatever the producing check measured, so
// their children are not published field names and json-output.md does not list them.
var dynamicKeyParents = []string{"fields", "observed"}

// TestDocNamesEveryFieldTheGoldensCarry asserts the reference page and the committed corpus
// cannot drift apart: a key that reaches a payload without being documented fails here.
func TestDocNamesEveryFieldTheGoldensCarry(t *testing.T) {
	doc := readDoc(t)
	seen := make(map[string]bool)
	for _, c := range jsonGoldens(t) {
		for line := range strings.SplitSeq(strings.TrimRight(string(c.data), "\n"), "\n") {
			var value any
			if err := json.Unmarshal([]byte(line), &value); err != nil {
				t.Fatalf("%s does not parse: %v", c.name, err)
			}
			collectKeys(value, "", seen)
		}
	}
	for key := range seen {
		if !strings.Contains(doc, "`"+key+"`") {
			t.Errorf("json-output.md does not name the key %q the goldens carry", key)
		}
	}
}

// collectKeys walks a decoded payload and records every published key name, skipping the
// children of the two objects whose keys are data.
func collectKeys(node any, parent string, seen map[string]bool) {
	switch typed := node.(type) {
	case map[string]any:
		for key, child := range typed {
			if slices.Contains(dynamicKeyParents, parent) {
				collectKeys(child, key, seen)
				continue
			}
			seen[key] = true
			collectKeys(child, key, seen)
		}
	case []any:
		for _, child := range typed {
			collectKeys(child, parent, seen)
		}
	}
}

// TestDocCarriesBothFreezeLists asserts the page states what a major version is needed to change
// and what stays free to move, and that every check id and verdict word in the frozen list
// matches the code rather than a copy of it that has since drifted.
func TestDocCarriesBothFreezeLists(t *testing.T) {
	doc := readDoc(t)

	frozen, notFrozen := "## What freezes at 1.0", "## What does not freeze"
	for _, heading := range []string{frozen, notFrozen} {
		if !strings.Contains(doc, heading) {
			t.Fatalf("json-output.md carries no %q section", heading)
		}
	}
	frozenSection := doc[strings.Index(doc, frozen):strings.Index(doc, notFrozen)]

	for _, check := range health.All {
		if !strings.Contains(frozenSection, "`"+check.ID()+"`") {
			t.Errorf("the frozen list does not name the check id %q", check.ID())
		}
	}
	for _, verdict := range []spine.Verdict{spine.VerdictOK, spine.VerdictWarning, spine.VerdictCritical, spine.VerdictUnknown} {
		if !strings.Contains(frozenSection, verdict.String()) {
			t.Errorf("the frozen list does not name the verdict word %q", verdict)
		}
	}
	for _, word := range []string{"pass", "fail", "skip", "held"} {
		if !strings.Contains(frozenSection, "`"+word+"`") {
			t.Errorf("the frozen list does not name the state word %q", word)
		}
	}

	notFrozenSection := doc[strings.Index(doc, notFrozen):]
	for _, item := range []string{"durationMs", "glyph"} {
		if !strings.Contains(notFrozenSection, item) {
			t.Errorf("the not-frozen list does not name %q", item)
		}
	}
}

// TestDocPublishesTheWholeReasonVocabulary asserts every reason a run can emit is on the page,
// read from spine's own closed set rather than from a list retyped here.
func TestDocPublishesTheWholeReasonVocabulary(t *testing.T) {
	doc := readDoc(t)
	for _, reason := range spine.ReasonCodes() {
		if !strings.Contains(doc, "`"+string(reason)+"`") {
			t.Errorf("json-output.md does not publish the reason %q", reason)
		}
	}
}

// readDoc reads the reference page.
func readDoc(t *testing.T) string {
	t.Helper()
	data, err := os.ReadFile(docPath)
	if err != nil {
		t.Fatal(err)
	}
	return string(data)
}
