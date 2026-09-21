package health

import (
	"bytes"
	"context"
	"encoding/base64"
	"io"
	"net/http"
	"strings"
	"testing"

	"github.com/glw907/cairn-cms/tool/internal/providers"
	"github.com/glw907/cairn-cms/tool/internal/record"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// engineFile pairs a GitHub Contents API path substring with the raw file body a
// engineGHRoundTripper serves for it, base64-encoding it the way the real API does.
type engineFile struct {
	path string
	body string
}

// engineGHRoundTripper stands in for GitHub across one engineCheck run: the site's own
// package.json and engineRepo's own CHANGELOG.md, both read through the Contents API.
type engineGHRoundTripper struct {
	files  []engineFile
	status int
}

func (rt engineGHRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	if rt.status != 0 {
		return &http.Response{StatusCode: rt.status, Body: io.NopCloser(bytes.NewReader([]byte(`{"message":"nope"}`))), Header: make(http.Header), Request: req}, nil
	}
	for _, f := range rt.files {
		if strings.Contains(req.URL.Path, f.path) {
			encoded := base64.StdEncoding.EncodeToString([]byte(f.body))
			body := `{"content":"` + encoded + `","encoding":"base64"}`
			return &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(strings.NewReader(body)), Header: make(http.Header), Request: req}, nil
		}
	}
	return &http.Response{StatusCode: http.StatusNotFound, Body: io.NopCloser(bytes.NewReader([]byte(`{}`))), Header: make(http.Header), Request: req}, nil
}

// enginePackument is the npm packument every engineCheck test's NPM client answers with: three
// published versions, "latest" pointing at the newest.
const enginePackument = `{
  "dist-tags": { "latest": "0.97.0" },
  "versions": {
    "0.95.0": {},
    "0.96.0": {},
    "0.97.0": {}
  }
}`

// engineNPMRoundTripper answers every request with enginePackument, standing in for the npm
// registry across one engineCheck run.
type engineNPMRoundTripper struct{}

func (engineNPMRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	return &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(strings.NewReader(enginePackument)), Header: make(http.Header), Request: req}, nil
}

// enginePackageJSON builds a site package.json body pinning cairnPackageName to rng.
func enginePackageJSON(rng string) string {
	return `{"name":"site","dependencies":{"@glw907/cairn-cms":"` + rng + `"}}`
}

// engineRecord returns the record every engineCheck test runs against.
func engineRecord() record.Record {
	return record.Record{GitHub: record.GitHub{Repo: record.GitHubRepo{Owner: "acme", Repo: "site", DefaultBranch: "main"}}}
}

// engineClients builds the Clients an engineCheck test runs against: GH serves files, NPM serves
// enginePackument.
func engineClients(files ...engineFile) Clients {
	return Clients{
		GH:     ghClient(engineGHRoundTripper{files: files}),
		NPM:    providers.NewNPM(engineNPMRoundTripper{}),
		HaveGH: true,
	}
}

func TestEngineCheckDeclaresTierGHAndNoCondition(t *testing.T) {
	c := engineCheck{}
	if got := c.ID(); got != "engine" {
		t.Errorf("ID() = %q, want %q", got, "engine")
	}
	if got := c.Needs(); got != TierGH {
		t.Errorf("Needs() = %v, want TierGH", got)
	}
	if got := c.Condition(); got != spine.ConditionNone {
		t.Errorf("Condition() = %q, want ConditionNone", got)
	}
}

func TestEngineCheckCurrentVersionIsOK(t *testing.T) {
	c := engineClients(engineFile{path: "package.json", body: enginePackageJSON("^0.97.0")})
	got := (engineCheck{}).Run(context.Background(), engineRecord(), c, Options{})
	if got.State != spine.OK {
		t.Errorf("State = %v, want OK", got.State)
	}
	if behind := fieldCount(t, got.Fields); behind != 0 {
		t.Errorf("count field = %d, want 0", behind)
	}
}

func TestEngineCheckBehindWithNoConsumersMustIsOK(t *testing.T) {
	changelog := "## 0.97.0\n\nConsumers must: nothing.\n\n## 0.96.0\n\nConsumers must: nothing.\n\n## 0.95.0\n\nConsumers must: nothing.\n"
	c := engineClients(
		engineFile{path: "package.json", body: enginePackageJSON("^0.95.0")},
		engineFile{path: "CHANGELOG.md", body: changelog},
	)
	got := (engineCheck{}).Run(context.Background(), engineRecord(), c, Options{})
	if got.State != spine.OK {
		t.Errorf("State = %v, want OK", got.State)
	}
	if behind := fieldCount(t, got.Fields); behind != 2 {
		t.Errorf("count field = %d, want 2", behind)
	}
	if state := fieldBool(t, got.Fields, "state"); state {
		t.Error("state field is true, want false: no skipped release carries an actionable Consumers must: line")
	}
}

func TestEngineCheckBehindWithConsumersMustIsFailing(t *testing.T) {
	changelog := "## 0.97.0\n\nConsumers must: nothing.\n\n## 0.96.0\n\nConsumers must: rename `Foo` to `Bar`.\n\n## 0.95.0\n\nConsumers must: nothing.\n"
	c := engineClients(
		engineFile{path: "package.json", body: enginePackageJSON("^0.95.0")},
		engineFile{path: "CHANGELOG.md", body: changelog},
	)
	got := (engineCheck{}).Run(context.Background(), engineRecord(), c, Options{})
	if got.State != spine.Failing {
		t.Errorf("State = %v, want Failing", got.State)
	}
	if behind := fieldCount(t, got.Fields); behind != 2 {
		t.Errorf("count field = %d, want 2", behind)
	}
	if state := fieldBool(t, got.Fields, "state"); !state {
		t.Error("state field is false, want true: a skipped release carries an actionable Consumers must: line")
	}
}

func TestEngineCheckNoDependencyIsUnknownNotObservable(t *testing.T) {
	c := engineClients(engineFile{path: "package.json", body: `{"name":"site"}`})
	got := (engineCheck{}).Run(context.Background(), engineRecord(), c, Options{})
	if got.State != spine.Unknown || got.Reason != spine.ReasonNotObservable {
		t.Errorf("Outcome = %+v, want Unknown/reason.not-observable", got)
	}
}

// TestEngineCheckAPIRateLimitedIsUnknownNeverFailing asserts a 403 carrying
// x-ratelimit-remaining: 0 classifies as rate-limited and settles Unknown, never Failing: a
// throttled tool is not the site's own engine drifting, and misreading it as one would page an
// operator for a fault they cannot fix.
func TestEngineCheckAPIRateLimitedIsUnknownNeverFailing(t *testing.T) {
	c := Clients{
		GH:     ghClient(rateLimitedRoundTripper{}),
		NPM:    providers.NewNPM(engineNPMRoundTripper{}),
		HaveGH: true,
	}
	got := (engineCheck{}).Run(context.Background(), engineRecord(), c, Options{})
	if got.State != spine.Unknown {
		t.Errorf("State = %v, want Unknown", got.State)
	}
	want := spine.APIReason(providers.ReasonRateLimited)
	if got.Reason != want {
		t.Errorf("Reason = %q, want %q", got.Reason, want)
	}
}

// TestEngineCheckAPIForbiddenIsUnknownNotOK asserts a plain 403 (no rate-limit headers) settles
// Unknown rather than OK, so a mis-scoped token is visible in the report rather than silently
// read as an up-to-date engine.
func TestEngineCheckAPIForbiddenIsUnknownNotOK(t *testing.T) {
	c := Clients{
		GH:     ghClient(engineGHRoundTripper{status: http.StatusForbidden}),
		NPM:    providers.NewNPM(engineNPMRoundTripper{}),
		HaveGH: true,
	}
	got := (engineCheck{}).Run(context.Background(), engineRecord(), c, Options{})
	if got.State != spine.Unknown {
		t.Errorf("State = %v, want Unknown", got.State)
	}
}

func TestSectionHasActionableConsumersMustIgnoresNothing(t *testing.T) {
	if sectionHasActionableConsumersMust("Consumers must: nothing.") {
		t.Error("got true, want false for a plain \"nothing\" clause")
	}
	if sectionHasActionableConsumersMust("Consumers must: nothing; a site already on this works.") {
		t.Error("got true, want false for a \"nothing\" clause with trailing prose")
	}
	if !sectionHasActionableConsumersMust("**Consumers must:** rename `Foo` to `Bar`.") {
		t.Error("got false, want true for a bold, actionable clause")
	}
}

func TestBaseVersionStripsRangeOperators(t *testing.T) {
	cases := map[string]string{
		"^0.97.0":     "0.97.0",
		"~0.97.0":     "0.97.0",
		">=0.90.0 <2": "0.90.0",
		"0.97.0":      "0.97.0",
	}
	for input, want := range cases {
		if got := baseVersion(input); got != want {
			t.Errorf("baseVersion(%q) = %q, want %q", input, got, want)
		}
	}
}
