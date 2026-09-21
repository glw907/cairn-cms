package health

import (
	"encoding/json"
	"maps"
	"slices"
	"strings"
	"testing"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// reportJSON marshals r the way a marshal boundary does: through ForRender, the one visibility
// filter, and then json.Marshal, since neither type declares a marshaller of its own.
func reportJSON(r Report, verbose bool) ([]byte, error) {
	return json.Marshal(r.ForRender(verbose))
}

// TestReportDeclaresNoMarshalJSON asserts Report, CheckResult, and spine.Outcome implement no
// json.Marshaler: ForRender must be the only path a shown Report is built through, so a bare
// json.Marshal(report) elsewhere in the codebase can never silently reproduce (or fail to
// reproduce) this file's redaction.
//
// Tier is the one type in this package that does carry a marshaller, and it is not an exception
// to that rule: a Tier is a four-value enum with no redaction to reproduce, and its marshaller
// writes the same word its String does. spine.State deliberately has none, because its three
// values answer four wire words and the fourth, "held", is not a state at all.
func TestReportDeclaresNoMarshalJSON(t *testing.T) {
	if _, ok := any(Report{}).(json.Marshaler); ok {
		t.Error("Report implements json.Marshaler")
	}
	if _, ok := any(CheckResult{}).(json.Marshaler); ok {
		t.Error("CheckResult implements json.Marshaler")
	}
	if _, ok := any(spine.Outcome{}).(json.Marshaler); ok {
		t.Error("spine.Outcome implements json.Marshaler")
	}
}

// TestReportJSONDetailPassesThroughUnredacted asserts the non-verbose render never mangles
// Detail: a Detail carrying a slash (an "owner/repo"-shaped slug) survives byte for byte in both
// renders, since a check keeps a verbose-only value out of Detail by contract rather than
// relying on a rendering-time filter to catch it.
func TestReportJSONDetailPassesThroughUnredacted(t *testing.T) {
	detail := "build for glw907/ecxc-ski"
	report := Report{
		Checks: []CheckResult{{ID: "deploy", Outcome: spine.Outcome{State: spine.Failing, Detail: detail}}},
	}

	verbose, err := reportJSON(report, true)
	if err != nil {
		t.Fatalf("reportJSON(verbose): %v", err)
	}
	if !strings.Contains(string(verbose), detail) {
		t.Errorf("verbose render mangled Detail %q: %s", detail, verbose)
	}

	nonVerbose, err := reportJSON(report, false)
	if err != nil {
		t.Fatalf("reportJSON(non-verbose): %v", err)
	}
	if !strings.Contains(string(nonVerbose), detail) {
		t.Errorf("non-verbose render mangled Detail %q: %s", detail, nonVerbose)
	}
}

// TestReportJSONFieldOrderRoundTrips asserts an Outcome's Fields survive the marshal boundary in the
// order they were appended, the reason Fields is a slice rather than a map.
func TestReportJSONFieldOrderRoundTrips(t *testing.T) {
	report := Report{
		Checks: []CheckResult{{
			ID: "deploy",
			Outcome: spine.Outcome{
				State: spine.OK,
				Fields: []spine.OutcomeField{
					{Key: "workerExists", Value: json.RawMessage("true")},
					{Key: "lastBuild", Value: json.RawMessage(`"ok"`)},
					{Key: "behind", Value: json.RawMessage("false")},
				},
			},
		}},
	}

	data, err := reportJSON(report, true)
	if err != nil {
		t.Fatalf("reportJSON(verbose): %v", err)
	}

	var decoded struct {
		Checks []struct {
			Outcome struct {
				Fields []struct {
					Key string
				}
			}
		}
	}
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if len(decoded.Checks) != 1 {
		t.Fatalf("len(Checks) = %d, want 1", len(decoded.Checks))
	}

	want := []string{"workerExists", "lastBuild", "behind"}
	got := decoded.Checks[0].Outcome.Fields
	if len(got) != len(want) {
		t.Fatalf("len(Fields) = %d, want %d", len(got), len(want))
	}
	for i, key := range want {
		if got[i].Key != key {
			t.Errorf("Fields[%d].Key = %q, want %q", i, got[i].Key, key)
		}
	}
}

// TestReportJSONDropsVerboseFields covers the non-verbose render's visibility filter: a field a
// check marked verbose is dropped from the render entirely, key and value both, while a
// non-verbose field survives with its value intact. Both fields are present in a verbose render.
func TestReportJSONDropsVerboseFields(t *testing.T) {
	const sha = "9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e"
	report := Report{
		Checks: []CheckResult{{
			ID: "deploy",
			Outcome: spine.Outcome{
				State: spine.OK,
				Fields: []spine.OutcomeField{
					field("errorCount", 3),
					verboseField("lastBuildSHA", sha),
				},
			},
		}},
	}

	verbose, err := reportJSON(report, true)
	if err != nil {
		t.Fatalf("reportJSON(verbose): %v", err)
	}
	for _, want := range []string{"errorCount", "lastBuildSHA", sha} {
		if !strings.Contains(string(verbose), want) {
			t.Errorf("verbose render dropped %q: %s", want, verbose)
		}
	}

	nonVerbose, err := reportJSON(report, false)
	if err != nil {
		t.Fatalf("reportJSON(non-verbose): %v", err)
	}
	if !strings.Contains(string(nonVerbose), `"errorCount"`) {
		t.Errorf("non-verbose render dropped the non-verbose field %q: %s", "errorCount", nonVerbose)
	}
	for _, leaked := range []string{"lastBuildSHA", sha} {
		if strings.Contains(string(nonVerbose), leaked) {
			t.Errorf("non-verbose render kept the verbose field's %q: %s", leaked, nonVerbose)
		}
	}
}

// TestReportJSONNeverEmitsVerboseKey asserts the visibility flag stays render metadata: neither
// render marshals a "Verbose" key, so a parsing consumer reads the same field shape it always
// did.
func TestReportJSONNeverEmitsVerboseKey(t *testing.T) {
	report := Report{
		Checks: []CheckResult{{
			ID: "deploy",
			Outcome: spine.Outcome{
				State:  spine.OK,
				Fields: []spine.OutcomeField{field("errorCount", 3), verboseField("buildId", "b-1")},
			},
		}},
	}
	for _, verbose := range []bool{true, false} {
		data, err := reportJSON(report, verbose)
		if err != nil {
			t.Fatalf("reportJSON(%v): %v", verbose, err)
		}
		if strings.Contains(string(data), "Verbose") {
			t.Errorf("JSON(%v) emitted a Verbose key: %s", verbose, data)
		}
	}
}

// TestReportJSONEmptyFieldsRendersLikeFullyFiltered asserts a check with no fields at all and a
// check whose every field is filtered out render an identical "Fields" shape in the non-verbose
// render, so a reader cannot tell the two cases apart from an empty array versus null.
func TestReportJSONEmptyFieldsRendersLikeFullyFiltered(t *testing.T) {
	noFields := Report{
		Checks: []CheckResult{{ID: "deploy", Outcome: spine.Outcome{State: spine.OK}}},
	}
	allFiltered := Report{
		Checks: []CheckResult{{
			ID: "deploy",
			Outcome: spine.Outcome{
				State:  spine.OK,
				Fields: []spine.OutcomeField{verboseField("lastBuildSHA", "abc123")},
			},
		}},
	}

	noFieldsJSON, err := reportJSON(noFields, false)
	if err != nil {
		t.Fatalf("reportJSON(non-verbose) with no fields: %v", err)
	}
	allFilteredJSON, err := reportJSON(allFiltered, false)
	if err != nil {
		t.Fatalf("reportJSON(non-verbose) with all fields filtered: %v", err)
	}
	if string(noFieldsJSON) != string(allFilteredJSON) {
		t.Errorf("no-fields render %s does not match fully-filtered render %s", noFieldsJSON, allFilteredJSON)
	}
}

// TestCheckDetailFieldVisibility pins which keys each flattening check carries into a non-verbose
// render. A field whose value is enough to look an account, a repository, or a build up is
// verbose-only, so it must not appear here; a check that adds one through field rather than
// verboseField goes red.
func TestCheckDetailFieldVisibility(t *testing.T) {
	tests := []struct {
		name   string
		fields []spine.OutcomeField
		want   []string
	}{
		{
			name:   "deploy",
			fields: deployDetail{}.fields(),
			want: []string{
				"workerExists", "buildsConnected", "pushToDeploy", "lastBuild", "lastBuildAt",
				"behind", "lastBuildShortSHA", "mainShortSHA",
			},
		},
		{
			name:   "publish path",
			fields: publishDetail{}.fields(),
			want:   []string{"openBranchCount", "branchAgeDays"},
		},
		{
			name:   "engine",
			fields: engineDetail{}.fields(),
			want:   []string{"installedVersion", "releasesBehind", "consumersMust"},
		},
		{
			name:   "errors",
			fields: errorsDetail{}.fields(),
			want:   []string{"errorCount"},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var got []string
			for _, f := range nonVerboseFields(tt.fields) {
				got = append(got, f.Key)
			}
			if !slices.Equal(got, tt.want) {
				t.Errorf("non-verbose keys = %v, want %v", got, tt.want)
			}
		})
	}
}

// TestCheckFieldSources pins which of each flattening check's keys carry a value copied out of
// a provider's response, and which provider each came from. A copied value is a string the site
// controls the bytes of, so the marshal boundary marks it; a count, a comparison, or a word from
// cairn's own vocabulary is not copied even when a provider response is what it was computed
// from. A check that starts copying a new value without declaring the source goes red here
// rather than landing unmarked in a payload.
func TestCheckFieldSources(t *testing.T) {
	tests := []struct {
		name   string
		fields []spine.OutcomeField
		want   map[string]spine.FieldSource
	}{
		{
			name:   "deploy",
			fields: deployDetail{}.fields(),
			want: map[string]spine.FieldSource{
				"lastBuildSHA":      spine.SourceCloudflare,
				"lastBuildShortSHA": spine.SourceCloudflare,
				"lastBuildAt":       spine.SourceCloudflare,
				"buildId":           spine.SourceCloudflare,
				"mainSHA":           spine.SourceGitHub,
				"mainShortSHA":      spine.SourceGitHub,
			},
		},
		{
			name:   "engine",
			fields: engineDetail{}.fields(),
			want:   map[string]spine.FieldSource{FieldEngineInstalledVersion: spine.SourceGitHub},
		},
		{
			name:   "errors",
			fields: errorsDetail{}.fields(),
			want:   map[string]spine.FieldSource{"topEvents": spine.SourceCloudflare},
		},
		{
			name:   "publish path",
			fields: publishDetail{}.fields(),
			want:   map[string]spine.FieldSource{},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := make(map[string]spine.FieldSource)
			for _, f := range tt.fields {
				if f.Source != "" {
					got[f.Key] = f.Source
				}
			}
			if !maps.Equal(got, tt.want) {
				t.Errorf("copied fields = %v, want %v", got, tt.want)
			}
		})
	}
}

// TestCredsCheckMarksTheTokenExpiryAsCopied covers the one field the creds check adds, which
// the table above cannot reach: its outcome is built inside Run rather than by a detail struct.
func TestCredsCheckMarksTheTokenExpiryAsCopied(t *testing.T) {
	f := observedField(FieldGitHubTokenExpiry, time.Time{}, spine.SourceGitHub)
	if f.Source != spine.SourceGitHub {
		t.Errorf("the GitHub token expiry declares source %q, want %q", f.Source, spine.SourceGitHub)
	}
}
