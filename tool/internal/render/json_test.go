package render

import (
	"encoding/json"
	"reflect"
	"regexp"
	"slices"
	"strings"
	"testing"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/health"
	"github.com/glw907/cairn-cms/tool/internal/logs"
	"github.com/glw907/cairn-cms/tool/internal/render/fixtures"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// decodeSite unmarshals a marshalled site payload into a generic map, the shape a consumer that
// knows nothing about Go reads.
func decodeSite(t *testing.T, data []byte) map[string]any {
	t.Helper()
	var out map[string]any
	if err := json.Unmarshal(data, &out); err != nil {
		t.Fatalf("unmarshal %s: %v", data, err)
	}
	return out
}

// siteJSON marshals one report through the single-site form under the run's verdict.
func siteJSON(t *testing.T, r health.Report, verdict spine.Verdict) map[string]any {
	t.Helper()
	data, err := MarshalSite(SiteJSON{
		Report:   r,
		Verbose:  true,
		Verdict:  verdict,
		ExitCode: verdict,
		Now:      fixtures.Now(),
	})
	if err != nil {
		t.Fatalf("MarshalSite: %v", err)
	}
	return decodeSite(t, data)
}

// checkByID returns the named check out of a decoded payload.
func checkByID(t *testing.T, payload map[string]any, id string) map[string]any {
	t.Helper()
	checks, ok := payload["checks"].([]any)
	if !ok {
		t.Fatalf("payload carries no checks array: %v", payload)
	}
	for _, raw := range checks {
		c, ok := raw.(map[string]any)
		if ok && c["checkId"] == id {
			return c
		}
	}
	t.Fatalf("payload carries no check %q", id)
	return nil
}

// TestStateMarshalsAsOneOfFourWords pins the whole wire vocabulary: a passing check is "pass", a
// failing one "fail", a failing one an unexpired hold covers "held", and one that could not run
// "skip". The mapping is computed at this boundary because spine.State has three values and the
// vocabulary has four, so no marshaller on the type could express "held" at all.
func TestStateMarshalsAsOneOfFourWords(t *testing.T) {
	payload := siteJSON(t, fixtures.OneSick()[0], spine.VerdictCritical)

	for id, want := range map[string]string{
		"serving":      "pass",
		"deploy":       "fail",
		"https-forced": "held",
		"email":        "skip",
	} {
		if got := checkByID(t, payload, id)["state"]; got != want {
			t.Errorf("check %q state = %v, want %q", id, got, want)
		}
	}
}

// TestStateDeclaresNoMarshalJSON asserts spine.State stays a plain enum. A marshaller on it
// would have to answer one of three words where the wire has four, and the one it could not
// answer, "held", is the one a consumer most needs to tell apart from "fail".
func TestStateDeclaresNoMarshalJSON(t *testing.T) {
	if _, ok := any(spine.OK).(json.Marshaler); ok {
		t.Error("spine.State implements json.Marshaler")
	}
}

// TestTierMarshalsAsItsWord covers health.Tier's own marshaller, the one enum whose values and
// whose words are one to one.
func TestTierMarshalsAsItsWord(t *testing.T) {
	for tier, want := range map[health.Tier]string{
		health.TierNone: `"none"`,
		health.TierCF:   `"cloudflare"`,
		health.TierGH:   `"github"`,
		health.TierBoth: `"both"`,
	} {
		data, err := json.Marshal(tier)
		if err != nil {
			t.Fatalf("marshal %v: %v", tier, err)
		}
		if string(data) != want {
			t.Errorf("tier %d marshals as %s, want %s", tier, data, want)
		}
	}
}

// TestEverySkipCarriesAReason asserts the one rule that keeps "skip" readable: four words alone
// cannot tell a missing credential from a timeout, and a consumer reading a bare "skip" as
// benign when the tool could not reach a provider is what a mandatory reason closes.
func TestEverySkipCarriesAReason(t *testing.T) {
	for _, named := range fixtures.All() {
		for _, report := range named.Reports {
			payload := siteJSON(t, report, spine.VerdictUnknown)
			for _, raw := range payload["checks"].([]any) {
				c := raw.(map[string]any)
				if c["state"] != "skip" {
					continue
				}
				if reason, _ := c["reason"].(string); reason == "" {
					t.Errorf("%s: check %v marshals state skip with no reason", named.Name, c["checkId"])
				}
			}
		}
	}
}

// TestEveryReasonIsInTheClosedVocabulary asserts every reason a payload can carry is a member of
// spine.ReasonCodes, which is itself built from the reason constants, the park codes and the
// provider reasons rather than retyped here: a reason invented at a call site fails.
func TestEveryReasonIsInTheClosedVocabulary(t *testing.T) {
	vocabulary := spine.ReasonCodes()
	for _, named := range fixtures.All() {
		for _, report := range named.Reports {
			payload := siteJSON(t, report, spine.VerdictUnknown)
			for _, raw := range payload["checks"].([]any) {
				c := raw.(map[string]any)
				reason, ok := c["reason"].(string)
				if !ok || reason == "" {
					continue
				}
				if !slices.Contains(vocabulary, spine.ReasonCode(reason)) {
					t.Errorf("%s: reason %q is outside the published vocabulary", named.Name, reason)
				}
			}
		}
	}
}

// TestPayloadSourceTypesTagEveryExportedField walks the five types a payload is built from and
// fails on an exported field with no explicit json tag. An untagged field marshals under its Go
// name, which is neither camelCase nor anything the schema promises. A tag of "-" is explicit
// too: it says the field is render or boundary metadata and never reaches the wire.
func TestPayloadSourceTypesTagEveryExportedField(t *testing.T) {
	camel := regexp.MustCompile(`^[a-z][A-Za-z0-9]*$`)
	for _, typ := range []reflect.Type{
		reflect.TypeOf(health.Report{}),
		reflect.TypeOf(health.CheckResult{}),
		reflect.TypeOf(spine.Outcome{}),
		reflect.TypeOf(spine.OutcomeField{}),
		reflect.TypeOf(logs.Entry{}),
	} {
		for i := range typ.NumField() {
			f := typ.Field(i)
			if !f.IsExported() {
				continue
			}
			tag, ok := f.Tag.Lookup("json")
			if !ok {
				t.Errorf("%s.%s carries no json tag", typ.Name(), f.Name)
				continue
			}
			name, _, _ := strings.Cut(tag, ",")
			if name != "-" && !camel.MatchString(name) {
				t.Errorf("%s.%s has json tag %q, want camelCase or %q", typ.Name(), f.Name, name, "-")
			}
		}
	}
}

// TestFieldsMarshalAsAnObject covers the shape change: the ordered slice stays the in-process
// type the text bodies read in append order, and on the wire it is an object a consumer indexes
// by key instead of scanning.
func TestFieldsMarshalAsAnObject(t *testing.T) {
	report := health.Report{Checks: []health.CheckResult{{
		ID: "errors",
		Outcome: spine.Outcome{State: spine.OK, Fields: []spine.OutcomeField{
			{Key: "errorCount", Value: json.RawMessage("3")},
			{Key: "topEvents", Value: json.RawMessage(`["send"]`), Source: spine.SourceCloudflare},
		}},
	}}}

	check := checkByID(t, siteJSON(t, report, spine.VerdictOK), "errors")
	fields, ok := check["fields"].(map[string]any)
	if !ok {
		t.Fatalf("fields is %T, want an object", check["fields"])
	}
	if fields["errorCount"] != float64(3) {
		t.Errorf("fields[errorCount] = %v, want 3", fields["errorCount"])
	}
	if _, present := fields["topEvents"]; present {
		t.Error("a copied value reached fields; it belongs under observed")
	}

	// The round trip: every field the check reported is reachable by its own key, with the value
	// it was given, and nothing else is.
	source := report.Checks[0].Outcome.Fields
	observed := check["observed"].(map[string]any)
	if len(fields)+len(observed) != len(source) {
		t.Fatalf("fields %v and observed %v do not account for the %d reported fields", fields, observed, len(source))
	}
	for _, f := range source {
		want := string(f.Value)
		var got any
		if f.Source == "" {
			got = fields[f.Key]
		} else {
			got = observed[f.Key].(map[string]any)["value"]
		}
		encoded, err := json.Marshal(got)
		if err != nil {
			t.Fatalf("marshal %v: %v", got, err)
		}
		if string(encoded) != want {
			t.Errorf("field %q round-tripped as %s, want %s", f.Key, encoded, want)
		}
	}
}

// TestObservedIsReadFromTheDeclaredSource asserts the boundary routes on the field's own Source
// and infers nothing. The two fields here carry the same key shape and the same value shape, and
// only the declared source separates them, so a boundary guessing from a name or a value would
// put them in the same place.
func TestObservedIsReadFromTheDeclaredSource(t *testing.T) {
	report := health.Report{Checks: []health.CheckResult{{
		ID: "deploy",
		Outcome: spine.Outcome{State: spine.OK, Fields: []spine.OutcomeField{
			{Key: "mainShortSHA", Value: json.RawMessage(`"a91f2c7"`), Source: spine.SourceGitHub},
			{Key: "lastBuildShortSHA", Value: json.RawMessage(`"a91f2c7"`)},
		}},
	}}}

	check := checkByID(t, siteJSON(t, report, spine.VerdictOK), "deploy")
	observed, ok := check["observed"].(map[string]any)
	if !ok {
		t.Fatalf("observed is %T, want an object", check["observed"])
	}
	entry, ok := observed["mainShortSHA"].(map[string]any)
	if !ok {
		t.Fatalf("observed[mainShortSHA] is %T, want an object", observed["mainShortSHA"])
	}
	if entry["source"] != string(spine.SourceGitHub) || entry["value"] != "a91f2c7" {
		t.Errorf("observed[mainShortSHA] = %v, want the value beside its declared source", entry)
	}
	if _, present := observed["lastBuildShortSHA"]; present {
		t.Error("a field declaring no source was marked observed; the boundary inferred one")
	}
}

// TestExitCodeIsScopedToTheRun asserts the single-site payload carries the run's own code, and
// that a per-site line of a stream carries none: a consumer reading line one's code as the run's
// would report the first site's verdict for the whole sweep.
func TestExitCodeIsScopedToTheRun(t *testing.T) {
	in := SiteJSON{
		Report:   fixtures.OneSick()[0],
		Verdict:  spine.VerdictCritical,
		ExitCode: spine.VerdictCritical,
		Now:      fixtures.Now(),
	}

	single, err := MarshalSite(in)
	if err != nil {
		t.Fatalf("MarshalSite: %v", err)
	}
	if got := decodeSite(t, single)["exitCode"]; got != float64(spine.VerdictCritical) {
		t.Errorf("single-site exitCode = %v, want %d", got, int(spine.VerdictCritical))
	}

	line, err := MarshalSiteLine(in)
	if err != nil {
		t.Fatalf("MarshalSiteLine: %v", err)
	}
	decoded := decodeSite(t, line)
	if _, present := decoded["exitCode"]; present {
		t.Errorf("a per-site line carries exitCode: %s", line)
	}
	if decoded["verdict"] != spine.VerdictCritical.String() {
		t.Errorf("per-site verdict = %v, want the site's own", decoded["verdict"])
	}
}

// TestEveryPayloadCarriesSchemaVersionAndVerdict covers the shape all five payloads share, so a
// consumer reads the same two keys whichever command produced the bytes.
func TestEveryPayloadCarriesSchemaVersionAndVerdict(t *testing.T) {
	site, err := MarshalSite(SiteJSON{Report: fixtures.Healthy()[0], Verdict: spine.VerdictOK, Now: fixtures.Now()})
	if err != nil {
		t.Fatalf("MarshalSite: %v", err)
	}
	summary, err := MarshalSummary(SummaryJSON{
		Reports: fixtures.Healthy(), Verdicts: []spine.Verdict{spine.VerdictOK},
		Verdict: spine.VerdictOK, Sites: 1, Now: fixtures.Now(),
	})
	if err != nil {
		t.Fatalf("MarshalSummary: %v", err)
	}
	list, err := MarshalSitesList([]SiteListEntry{{ID: "ecxc-ski-a1b2c3"}}, spine.VerdictOK, nil)
	if err != nil {
		t.Fatalf("MarshalSitesList: %v", err)
	}
	logsData, err := MarshalLogs("ecxc.ski", nil)
	if err != nil {
		t.Fatalf("MarshalLogs: %v", err)
	}
	adoptData, err := MarshalAdoptList(nil)
	if err != nil {
		t.Fatalf("MarshalAdoptList: %v", err)
	}

	for name, data := range map[string][]byte{
		"site": site, "summary": summary, "sites": list, "logs": logsData, "adopt list": adoptData,
	} {
		payload := decodeSite(t, data)
		if v, ok := payload["schemaVersion"].(float64); !ok || v < 1 {
			t.Errorf("%s payload schemaVersion = %v, want a positive integer", name, payload["schemaVersion"])
		}
		if word, ok := payload["verdict"].(string); !ok || word == "" {
			t.Errorf("%s payload carries no verdict word", name)
		}
	}
}

// TestCheckIDsAreExactlyTheNine pins the published check vocabulary. A tenth check cannot land
// without this list naming it, which is what makes every id in a payload something an agent's
// own table can be written against.
func TestCheckIDsAreExactlyTheNine(t *testing.T) {
	want := []string{
		"creds", "serving", "delegation", "https-forced", "email", "deploy", "publish-path",
		"engine", "errors",
	}
	var got []string
	for _, c := range health.All {
		got = append(got, c.ID())
	}
	if !slices.Equal(got, want) {
		t.Errorf("check ids are %v, want %v", got, want)
	}
}

// TestEveryFailingAndHeldCheckCarriesAStructuredFix asserts the fix is data a consumer switches
// on rather than a sentence it parses, and that a command is present only for an operator's own
// fix: an agent's rule for running one keys on the actor, so a command beside any other actor
// would invite a run nobody authorised.
func TestEveryFailingAndHeldCheckCarriesAStructuredFix(t *testing.T) {
	for _, named := range fixtures.All() {
		for _, report := range named.Reports {
			payload := siteJSON(t, report, spine.VerdictCritical)
			for _, raw := range payload["checks"].([]any) {
				c := raw.(map[string]any)
				if c["state"] != "fail" && c["state"] != "held" {
					continue
				}
				fix, ok := c["fix"].(map[string]any)
				if !ok {
					t.Errorf("%s: check %v is %v and carries no fix", named.Name, c["checkId"], c["state"])
					continue
				}
				if summary, _ := fix["summary"].(string); summary == "" {
					t.Errorf("%s: check %v carries a fix with no summary", named.Name, c["checkId"])
				}
				if _, hasCommand := fix["command"]; hasCommand && fix["actor"] != string(health.ActorOperator) {
					t.Errorf("%s: check %v carries a command for actor %v", named.Name, c["checkId"], fix["actor"])
				}
				if _, ok := fix["outward"].(bool); !ok {
					t.Errorf("%s: check %v carries a fix with no outward flag", named.Name, c["checkId"])
				}
			}
		}
	}
}

// TestHoldIsStructured covers the three states an acknowledgement can be in: unexpired, expiring
// inside two days, and already lapsed. The last is the one a bare boolean loses: an expired hold
// is not the same as no hold, and an operator wants to see the one they let run out.
func TestHoldIsStructured(t *testing.T) {
	now := fixtures.Now()
	failing := spine.Outcome{State: spine.Failing, Code: spine.CodeServingMismatch}
	report := health.Report{Checks: []health.CheckResult{
		{ID: "serving", Outcome: failing, Acknowledged: true, AckExpires: now.Add(30 * 24 * time.Hour)},
		{ID: "deploy", Outcome: failing, Acknowledged: true, AckExpires: now.Add(36 * time.Hour)},
		{ID: "errors", Outcome: failing, AckExpires: now.Add(-time.Hour)},
	}}
	payload := siteJSON(t, report, spine.VerdictCritical)

	for _, tc := range []struct {
		id          string
		wantState   string
		wantExpired bool
		wantUntil   time.Time
	}{
		{"serving", "held", false, now.Add(30 * 24 * time.Hour)},
		{"deploy", "held", false, now.Add(36 * time.Hour)},
		{"errors", "fail", true, now.Add(-time.Hour)},
	} {
		check := checkByID(t, payload, tc.id)
		if check["state"] != tc.wantState {
			t.Errorf("%s state = %v, want %q", tc.id, check["state"], tc.wantState)
		}
		hold, ok := check["hold"].(map[string]any)
		if !ok {
			t.Fatalf("%s carries no hold object", tc.id)
		}
		if hold["expired"] != tc.wantExpired {
			t.Errorf("%s hold expired = %v, want %v", tc.id, hold["expired"], tc.wantExpired)
		}
		if hold["until"] != tc.wantUntil.UTC().Format(time.RFC3339) {
			t.Errorf("%s hold until = %v, want %v", tc.id, hold["until"], tc.wantUntil.UTC().Format(time.RFC3339))
		}
	}
}

// relativeTimeWords are the fragments a relative time string is built out of. None may appear in
// a machine-read value: "3 minutes ago" is a fact about when the reader read the bytes rather
// than about when the tool measured anything, and it cannot be compared across two runs.
var relativeTimeWords = []string{"ago", "left", "in "}

// proseKeys names the two values that are cairn's own sentence for a person to read rather than
// a value for a program to key on. They are the one place a relative phrasing is allowed, since
// a check's Detail is the same sentence the text body prints; json-output.md excludes both from
// the diffable projection for exactly that reason.
var proseKeys = []string{"detail", "summary"}

// timeKeys names every time-valued key a site payload can carry.
var timeKeys = []string{"checkedAt", "until"}

// TestEveryInstantIsRFC3339AndNothingIsRelative walks every fixture's payload, parses every
// time-valued key, and refuses any relative phrasing in a machine-read value.
func TestEveryInstantIsRFC3339AndNothingIsRelative(t *testing.T) {
	for _, named := range fixtures.All() {
		for _, report := range named.Reports {
			data, err := MarshalSite(SiteJSON{Report: report, Verdict: spine.VerdictUnknown, Now: fixtures.Now()})
			if err != nil {
				t.Fatalf("MarshalSite: %v", err)
			}
			decoded := decodeSite(t, data)
			for key, value := range collectStrings(decoded) {
				if slices.Contains(proseKeys, key) {
					continue
				}
				for _, word := range relativeTimeWords {
					if strings.Contains(value, word) {
						t.Errorf("%s: %q carries the relative-time fragment %q", named.Name, key, word)
					}
				}
			}
			for key, value := range collectStrings(decoded) {
				if !slices.Contains(timeKeys, key) || value == "" {
					continue
				}
				if _, err := time.Parse(time.RFC3339, value); err != nil {
					t.Errorf("%s: time value %q does not parse as RFC 3339", named.Name, value)
				}
			}
		}
	}
}

// collectStrings walks a decoded payload and yields every string value beside the key it sits
// under, at any depth. A value inside an array takes the key of the array itself.
func collectStrings(node any) map[string]string {
	out := make(map[string]string)
	var walk func(key string, n any)
	walk = func(key string, n any) {
		switch v := n.(type) {
		case string:
			out[key] = v
		case map[string]any:
			for k, child := range v {
				walk(k, child)
			}
		case []any:
			for _, child := range v {
				walk(key, child)
			}
		}
	}
	walk("", node)
	return out
}

// TestDeterminismIsPinned asserts the two orderings a diff of two runs depends on: checks sort
// by id, and the acknowledgement list sorts too. Without both, two runs of an unchanged site
// differ in more than their time fields and a consumer's diff is noise.
func TestDeterminismIsPinned(t *testing.T) {
	report := health.Report{
		Acknowledged: []string{"serving", "deploy", "email"},
		Checks: []health.CheckResult{
			{ID: "serving", Outcome: spine.Outcome{State: spine.OK}},
			{ID: "creds", Outcome: spine.Outcome{State: spine.OK}},
			{ID: "engine", Outcome: spine.Outcome{State: spine.OK}},
		},
	}
	payload := siteJSON(t, report, spine.VerdictOK)

	var ids []string
	for _, raw := range payload["checks"].([]any) {
		ids = append(ids, raw.(map[string]any)["checkId"].(string))
	}
	if want := []string{"creds", "engine", "serving"}; !slices.Equal(ids, want) {
		t.Errorf("checks are ordered %v, want %v", ids, want)
	}

	var acked []string
	for _, raw := range payload["acknowledged"].([]any) {
		acked = append(acked, raw.(string))
	}
	if want := []string{"deploy", "email", "serving"}; !slices.Equal(acked, want) {
		t.Errorf("acknowledged is ordered %v, want %v", acked, want)
	}
}

// TestNDJSONStreamIsLineByLineAndEndsWithItsSummary asserts the stream contract: every line
// parses on its own, the summary is last, and it is the summary that carries the run's exit
// code and its counts. A stream cut before the summary is documented as unreadable rather than
// believed in part, which is only possible because the summary is last and named.
func TestNDJSONStreamIsLineByLineAndEndsWithItsSummary(t *testing.T) {
	reports := fixtures.TwelveSites()
	verdicts := make([]spine.Verdict, 0, len(reports))
	var stream strings.Builder
	for _, r := range reports {
		verdicts = append(verdicts, spine.VerdictCritical)
		line, err := MarshalSiteLine(SiteJSON{Report: r, Verdict: spine.VerdictCritical, Now: fixtures.Now()})
		if err != nil {
			t.Fatalf("MarshalSiteLine: %v", err)
		}
		stream.Write(line)
		stream.WriteString("\n")
	}
	summary, err := MarshalSummary(SummaryJSON{
		Reports: reports, Verdicts: verdicts, Verdict: spine.VerdictCritical,
		ExitCode: spine.VerdictCritical, Sites: len(reports), Now: fixtures.Now(),
	})
	if err != nil {
		t.Fatalf("MarshalSummary: %v", err)
	}
	stream.Write(summary)
	stream.WriteString("\n")

	lines := strings.Split(strings.TrimRight(stream.String(), "\n"), "\n")
	if len(lines) != len(reports)+1 {
		t.Fatalf("stream has %d lines, want %d sites plus one summary", len(lines), len(reports))
	}
	for i, line := range lines {
		payload := decodeSite(t, []byte(line))
		wantKind := kindSite
		if i == len(lines)-1 {
			wantKind = kindSummary
		}
		if payload["kind"] != wantKind {
			t.Errorf("line %d kind = %v, want %q", i, payload["kind"], wantKind)
		}
	}

	last := decodeSite(t, []byte(lines[len(lines)-1]))
	if last["exitCode"] != float64(spine.VerdictCritical) {
		t.Errorf("summary exitCode = %v, want %d", last["exitCode"], int(spine.VerdictCritical))
	}
	counts, ok := last["counts"].(map[string]any)
	if !ok {
		t.Fatalf("summary carries no counts object")
	}
	if counts[spine.VerdictCritical.String()] != float64(len(reports)) {
		t.Errorf("summary counts CRITICAL = %v, want %d", counts[spine.VerdictCritical.String()], len(reports))
	}
	worst, ok := last["worstFirst"].([]any)
	if !ok || len(worst) != len(reports) {
		t.Fatalf("summary worstFirst = %v, want %d sites", last["worstFirst"], len(reports))
	}
}

// TestSummaryCountsSitesTheSweepNeverReached asserts a site the run's budget cut is counted
// UNKNOWN in the summary rather than silently dropped, so the counts always sum to the site
// count the run was meant to cover.
func TestSummaryCountsSitesTheSweepNeverReached(t *testing.T) {
	data, err := MarshalSummary(SummaryJSON{
		Reports:  fixtures.Healthy(),
		Verdicts: []spine.Verdict{spine.VerdictOK},
		Verdict:  spine.VerdictUnknown,
		ExitCode: spine.VerdictUnknown,
		Sites:    3,
		Now:      fixtures.Now(),
	})
	if err != nil {
		t.Fatalf("MarshalSummary: %v", err)
	}
	counts := decodeSite(t, data)["counts"].(map[string]any)
	if counts[spine.VerdictUnknown.String()] != float64(2) {
		t.Errorf("counts UNKNOWN = %v, want 2 for the sites the sweep never reached", counts[spine.VerdictUnknown.String()])
	}
}

// TestSitesListCarriesEnoughToSkipASecondCall asserts the guarantee json-output.md publishes:
// each listed site names the id a later command takes, its display name, its domain and its last
// known step, so an agent acts on the listing without a follow-up read.
func TestSitesListCarriesEnoughToSkipASecondCall(t *testing.T) {
	data, err := MarshalSitesList([]SiteListEntry{{
		ID: "ecxc-ski-a1b2c3", Name: "ecxc.ski", Domain: "ecxc.ski", Step: "live",
	}}, spine.VerdictOK, nil)
	if err != nil {
		t.Fatalf("MarshalSitesList: %v", err)
	}
	sites := decodeSite(t, data)["sites"].([]any)
	entry := sites[0].(map[string]any)
	for _, key := range []string{"id", "name", "domain", "step"} {
		if value, _ := entry[key].(string); value == "" {
			t.Errorf("listed site carries no %q", key)
		}
	}
}

// TestLogsAndAdoptPayloadsCarryTheSensitiveDataFlag asserts the notice survives --json. The
// stderr line a plain run prints is suppressed under --json, so without this field the warning
// that these two payloads carry identifiers reaches nobody.
func TestLogsAndAdoptPayloadsCarryTheSensitiveDataFlag(t *testing.T) {
	logsData, err := MarshalLogs("ecxc.ski", []logs.Entry{{
		At: fixtures.Now(), Level: "info", Event: "auth.magic-link.sent",
		Fields: []logs.Field{{Key: "editor", Value: json.RawMessage(`"someone@example.com"`)}},
	}})
	if err != nil {
		t.Fatalf("MarshalLogs: %v", err)
	}
	adoptData, err := MarshalAdoptList([]AdoptCandidate{{Worker: "ecxc-ski"}})
	if err != nil {
		t.Fatalf("MarshalAdoptList: %v", err)
	}
	for name, data := range map[string][]byte{"logs": logsData, "adopt list": adoptData} {
		if decodeSite(t, data)["containsPersonalData"] != true {
			t.Errorf("%s payload does not carry containsPersonalData", name)
		}
	}

	entry := decodeSite(t, logsData)["entries"].([]any)[0].(map[string]any)
	if _, err := time.Parse(time.RFC3339, entry["at"].(string)); err != nil {
		t.Errorf("log entry at = %v, want RFC 3339", entry["at"])
	}
	if fields, ok := entry["fields"].(map[string]any); !ok || fields["editor"] != "someone@example.com" {
		t.Errorf("log entry fields = %v, want an object keyed by field name", entry["fields"])
	}
}
