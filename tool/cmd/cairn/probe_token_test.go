package main

import (
	"bytes"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"maps"
	"net/http"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/providers"
	"github.com/glw907/cairn-cms/tool/internal/record"
	"github.com/glw907/cairn-cms/tool/internal/store"
)

// routedResponse is one fixed status and body a routeRoundTripper serves for one path.
type routedResponse struct {
	status int
	body   []byte
}

// routeRoundTripper serves a fixed response per exact URL path (query strings ignored), standing
// in for both the Cloudflare and GitHub hosts in one fake so a test can drive probe-token's full
// run with no real network call. A path with no registered response answers 404, the same shape
// an operator would see probing an endpoint this fake does not know about.
type routeRoundTripper map[string]routedResponse

func (rt routeRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	resp, ok := rt[req.URL.Path]
	if !ok {
		resp = routedResponse{status: http.StatusNotFound, body: []byte(`{"message":"Not Found"}`)}
	}
	return &http.Response{
		StatusCode: resp.status,
		Body:       io.NopCloser(bytes.NewReader(resp.body)),
		Header:     make(http.Header),
	}, nil
}

// testAccountID is the CAIRN_CF_ACCOUNT_ID value testEnv resolves, and the account id every
// cloudflareOKRoutes fixture path is keyed under.
const testAccountID = "acct123"

// cloudflareOKRoutes returns every account-scoped Cloudflare route probeCloudflare hits, each
// answering 200, keyed by path.
func cloudflareOKRoutes() routeRoundTripper {
	return routeRoundTripper{
		"/client/v4/user/tokens/verify":                                                   {status: http.StatusOK, body: []byte(`{"success":true,"result":{"id":"tok123"}}`)},
		"/client/v4/accounts/" + testAccountID + "/workers/scripts":                       {status: http.StatusOK, body: []byte(`{"success":true,"result":[]}`)},
		"/client/v4/accounts/" + testAccountID + "/workers/domains":                       {status: http.StatusOK, body: []byte(`{"success":true,"result":[]}`)},
		"/client/v4/accounts/" + testAccountID + "/workers/observability/telemetry/query": {status: http.StatusOK, body: []byte(`{"success":true,"result":{"count":5}}`)},
	}
}

// githubOKRoutesFor returns the three GitHub routes probeGitHub hits for one glw907 site
// repository (whose probed content path is always package.json), each answering 200, keyed by
// path.
func githubOKRoutesFor(repo string, private bool) routeRoundTripper {
	content := base64.StdEncoding.EncodeToString([]byte("{}"))
	return routeRoundTripper{
		fmt.Sprintf("/repos/glw907/%s/commits/main", repo):          {status: http.StatusOK, body: []byte(`{"sha":"abc123"}`)},
		fmt.Sprintf("/repos/glw907/%s/contents/package.json", repo): {status: http.StatusOK, body: []byte(fmt.Sprintf(`{"content":%q,"encoding":"base64"}`, content))},
		fmt.Sprintf("/repos/glw907/%s", repo):                       {status: http.StatusOK, body: []byte(fmt.Sprintf(`{"id":1,"private":%t}`, private))},
	}
}

// githubOKRoutesForEngine returns the one GitHub route probeGitHub hits for the engine
// repository, answering 200, keyed by path.
func githubOKRoutesForEngine() routeRoundTripper {
	return routeRoundTripper{
		fmt.Sprintf("/repos/%s/%s/contents/CHANGELOG.md", engineOwner, engineRepo): {status: http.StatusOK, body: []byte(`{"content":"e30=","encoding":"base64"}`)},
		fmt.Sprintf("/repos/%s/%s", engineOwner, engineRepo):                       {status: http.StatusOK, body: []byte(`{"id":1,"private":false}`)},
	}
}

// mergeRoutes combines several routeRoundTrippers into one.
func mergeRoutes(routes ...routeRoundTripper) routeRoundTripper {
	merged := routeRoundTripper{}
	for _, r := range routes {
		maps.Copy(merged, r)
	}
	return merged
}

// openTestRegistry opens a fresh store at t.TempDir() and saves one record per owner/repo pair,
// through record and store's own real shapes rather than hand-built JSON, and returns the
// directory for probe-token's registryDir dependency.
func openTestRegistry(t *testing.T, sites map[string][2]string) string {
	t.Helper()
	dir := t.TempDir()
	if err := os.Chmod(dir, 0o700); err != nil {
		t.Fatalf("chmod dir: %v", err)
	}
	s, err := store.Open(dir)
	if err != nil {
		t.Fatalf("store.Open: %v", err)
	}
	for id, ownerRepo := range sites {
		r := record.Record{
			Name: id,
			GitHub: record.RecordGitHub{
				Repo: record.RecordGitHubRepo{Owner: ownerRepo[0], Repo: ownerRepo[1]},
			},
		}
		if err := s.Save(id, r); err != nil {
			t.Fatalf("Save %s: %v", id, err)
		}
	}
	return dir
}

// testEnv returns loadEnv's env parameter for a run where all three credentials resolve from
// the environment.
func testEnv() func(string) string {
	return fakeEnv(map[string]string{
		"CAIRN_CF_ACCOUNT_ID": "acct123",
		"CAIRN_CF_READ_TOKEN": "cf-token",
		"CAIRN_GH_READ_TOKEN": "gh-token",
	})
}

func TestProbeTokenHiddenAndTakesNoArgs(t *testing.T) {
	cmd := buildProbeTokenCmd(fakeEnv(nil), fakeProvider{name: "keyring"}, routeRoundTripper{}, func() (string, error) { return t.TempDir(), nil }, func(int) {})

	if !cmd.Hidden {
		t.Error("probe-token is not Hidden; it must not appear in --help")
	}
	if err := cmd.Args(cmd, []string{"extra"}); err == nil {
		t.Error("probe-token accepted an argument; it must accept none")
	}
}

func TestProbeTokenPrintsCredentialSourcesNeverValues(t *testing.T) {
	env := testEnv()
	dir := openTestRegistry(t, nil)
	rt := mergeRoutes(cloudflareOKRoutes(), githubOKRoutesForEngine())

	var code int
	cmd := buildProbeTokenCmd(env, fakeProvider{name: "keyring"}, rt, func() (string, error) { return dir, nil }, func(c int) { code = c })
	var out bytes.Buffer
	cmd.SetOut(&out)
	cmd.SetErr(&bytes.Buffer{})

	if err := cmd.RunE(cmd, nil); err != nil {
		t.Fatalf("RunE: %v", err)
	}
	got := out.String()
	if !strings.Contains(got, "CAIRN_CF_ACCOUNT_ID") || !strings.Contains(got, "environment") {
		t.Errorf("output missing credential source line: %s", got)
	}
	if strings.Contains(got, "cf-token") || strings.Contains(got, "gh-token") || strings.Contains(got, "acct123") {
		t.Errorf("output printed a credential value: %s", got)
	}
	if code != exitOK {
		t.Errorf("exit code = %d, want %d", code, exitOK)
	}
}

func TestProbeTokenExitCriticalOnRejectedCloudflareToken(t *testing.T) {
	env := testEnv()
	dir := openTestRegistry(t, nil)
	rt := mergeRoutes(routeRoundTripper{
		"/client/v4/user/tokens/verify": {status: http.StatusUnauthorized, body: []byte(`{"success":false,"errors":[{"code":10000,"message":"Invalid API Token"}]}`)},
	}, githubOKRoutesForEngine())

	var code int
	cmd := buildProbeTokenCmd(env, fakeProvider{name: "keyring"}, rt, func() (string, error) { return dir, nil }, func(c int) { code = c })
	cmd.SetOut(&bytes.Buffer{})
	cmd.SetErr(&bytes.Buffer{})

	if err := cmd.RunE(cmd, nil); err != nil {
		t.Fatalf("RunE: %v", err)
	}
	if code != exitCritical {
		t.Errorf("exit code = %d, want exitCritical (%d)", code, exitCritical)
	}
}

func TestProbeTokenExitUnknownOnUnreachableEndpoint(t *testing.T) {
	env := testEnv()
	dir := openTestRegistry(t, nil)
	// No routes registered at all: every Cloudflare and GitHub call answers the fake's default
	// 404, which classifies as ReasonNotFound, exitUnknown, never exitCritical.
	rt := routeRoundTripper{}

	var code int
	cmd := buildProbeTokenCmd(env, fakeProvider{name: "keyring"}, rt, func() (string, error) { return dir, nil }, func(c int) { code = c })
	cmd.SetOut(&bytes.Buffer{})
	cmd.SetErr(&bytes.Buffer{})

	if err := cmd.RunE(cmd, nil); err != nil {
		t.Fatalf("RunE: %v", err)
	}
	if code != exitUnknown {
		t.Errorf("exit code = %d, want exitUnknown (%d)", code, exitUnknown)
	}
}

func TestProbeTokenSkipsCloudflareAndGitHubWhenCredentialsMissing(t *testing.T) {
	dir := openTestRegistry(t, nil)
	var code int
	cmd := buildProbeTokenCmd(fakeEnv(nil), fakeProvider{name: "keyring"}, routeRoundTripper{}, func() (string, error) { return dir, nil }, func(c int) { code = c })
	var out bytes.Buffer
	cmd.SetOut(&out)
	cmd.SetErr(&bytes.Buffer{})

	if err := cmd.RunE(cmd, nil); err != nil {
		t.Fatalf("RunE: %v", err)
	}
	if !strings.Contains(out.String(), "Cloudflare: skipped") || !strings.Contains(out.String(), "GitHub: skipped") {
		t.Errorf("output = %s, want both providers reported as skipped", out.String())
	}
	if code != exitUnknown {
		t.Errorf("exit code = %d, want exitUnknown (%d) for a missing credential", code, exitUnknown)
	}
}

func TestProbeTokenDiscoversRepositoriesFromRegistryNoHardcodedList(t *testing.T) {
	env := testEnv()
	dir := openTestRegistry(t, map[string][2]string{
		"ecxc-ski-abc123":    {"glw907", "ecxc-ski"},
		"nine07-life-xyz789": {"glw907", "907-life"},
	})
	rt := mergeRoutes(
		cloudflareOKRoutes(),
		githubOKRoutesFor("ecxc-ski", false),
		githubOKRoutesFor("907-life", false),
		githubOKRoutesForEngine(),
	)

	var code int
	cmd := buildProbeTokenCmd(env, fakeProvider{name: "keyring"}, rt, func() (string, error) { return dir, nil }, func(c int) { code = c })
	var out bytes.Buffer
	var errOut bytes.Buffer
	cmd.SetOut(&out)
	cmd.SetErr(&errOut)

	if err := cmd.RunE(cmd, nil); err != nil {
		t.Fatalf("RunE: %v", err)
	}
	if code != exitOK {
		t.Fatalf("exit code = %d, want exitOK; output:\n%s", code, out.String())
	}

	lines := 0
	for line := range strings.SplitSeq(out.String(), "\n") {
		if strings.Contains(line, "glw907/ecxc-ski") || strings.Contains(line, "glw907/907-life") || strings.Contains(line, "glw907/cairn-cms") {
			// A repository line carries no other slash-delimited endpoint label, unlike the
			// GitHub endpoint lines above it (which parenthesize the owner/repo instead).
			if !strings.Contains(line, "(") {
				lines++
			}
		}
	}
	if lines != 3 {
		t.Errorf("repository lines = %d, want 3 (two registry sites plus the engine repository); output:\n%s", lines, out.String())
	}
	if !strings.Contains(errOut.String(), "unconfirmed") {
		t.Errorf("stderr = %q, want the GitHub-scope-unconfirmed warning: every fixture repository above is public", errOut.String())
	}
	// A body-shape line proves the recorder lookup matched a probed endpoint. Without it, a
	// path-format change inside providers would make every lookup miss and every shape line
	// vanish, with the exit code and the repository lines above still green.
	if !strings.Contains(out.String(), "keys: ") {
		t.Errorf("output carries no \"keys:\" line, so no recorded body shape was found for any probed endpoint; output:\n%s", out.String())
	}
}

func TestProbeTokenWarnsWhenEveryRepositoryIsPublic(t *testing.T) {
	env := testEnv()
	dir := openTestRegistry(t, map[string][2]string{
		"ecxc-ski-abc123": {"glw907", "ecxc-ski"},
	})
	rt := mergeRoutes(
		cloudflareOKRoutes(),
		githubOKRoutesFor("ecxc-ski", false),
		githubOKRoutesForEngine(),
	)

	cmd := buildProbeTokenCmd(env, fakeProvider{name: "keyring"}, rt, func() (string, error) { return dir, nil }, func(int) {})
	cmd.SetOut(&bytes.Buffer{})
	var errOut bytes.Buffer
	cmd.SetErr(&errOut)

	if err := cmd.RunE(cmd, nil); err != nil {
		t.Fatalf("RunE: %v", err)
	}
	if !strings.Contains(errOut.String(), "unconfirmed") {
		t.Errorf("stderr = %q, want the GitHub-scope-unconfirmed warning when every repository is public", errOut.String())
	}
}

func TestProbeTokenNoWarningWhenARepositoryIsPrivate(t *testing.T) {
	env := testEnv()
	dir := openTestRegistry(t, map[string][2]string{
		"xcathletes-abc123": {"glw907", "xcathletes-org"},
	})
	rt := mergeRoutes(
		cloudflareOKRoutes(),
		githubOKRoutesFor("xcathletes-org", true),
		githubOKRoutesForEngine(),
	)

	cmd := buildProbeTokenCmd(env, fakeProvider{name: "keyring"}, rt, func() (string, error) { return dir, nil }, func(int) {})
	cmd.SetOut(&bytes.Buffer{})
	var errOut bytes.Buffer
	cmd.SetErr(&errOut)

	if err := cmd.RunE(cmd, nil); err != nil {
		t.Fatalf("RunE: %v", err)
	}
	if strings.Contains(errOut.String(), "unconfirmed") {
		t.Errorf("stderr = %q, want no warning since one repository is confirmed private", errOut.String())
	}
}

func TestProbeTokenExitUnknownWhenRegistryDirUnresolvable(t *testing.T) {
	env := testEnv()
	rt := mergeRoutes(cloudflareOKRoutes(), githubOKRoutesForEngine())

	var code int
	cmd := buildProbeTokenCmd(env, fakeProvider{name: "keyring"}, rt, func() (string, error) {
		return "", errors.New("boom")
	}, func(c int) { code = c })
	cmd.SetOut(&bytes.Buffer{})
	var errOut bytes.Buffer
	cmd.SetErr(&errOut)

	if err := cmd.RunE(cmd, nil); err != nil {
		t.Fatalf("RunE: %v", err)
	}
	if code != exitUnknown {
		t.Errorf("exit code = %d, want exitUnknown (%d) when the registry directory cannot be resolved", code, exitUnknown)
	}
	if !strings.Contains(errOut.String(), "boom") {
		t.Errorf("stderr = %q, want the registry-dir error reason", errOut.String())
	}
}

func TestProbeTokenExitUnknownWhenRegistryUnreadable(t *testing.T) {
	env := testEnv()
	rt := mergeRoutes(cloudflareOKRoutes(), githubOKRoutesForEngine())
	// A registry directory that does not exist makes store.Open fail inside discoverSites,
	// rather than the registryDir callback itself.
	missing := t.TempDir() + "/missing"

	var code int
	cmd := buildProbeTokenCmd(env, fakeProvider{name: "keyring"}, rt, func() (string, error) {
		return missing, nil
	}, func(c int) { code = c })
	cmd.SetOut(&bytes.Buffer{})
	var errOut bytes.Buffer
	cmd.SetErr(&errOut)

	if err := cmd.RunE(cmd, nil); err != nil {
		t.Fatalf("RunE: %v", err)
	}
	if code != exitUnknown {
		t.Errorf("exit code = %d, want exitUnknown (%d) when the registry cannot be opened", code, exitUnknown)
	}
	if !strings.Contains(errOut.String(), "probe-token:") {
		t.Errorf("stderr = %q, want a probe-token reason line", errOut.String())
	}
}

// fixedRoundTripper answers every request with the same fixed status and body, standing in for
// a real HTTP round trip in the recordingRoundTripper tests below.
type fixedRoundTripper struct {
	status int
	body   []byte
}

func (rt fixedRoundTripper) RoundTrip(*http.Request) (*http.Response, error) {
	return &http.Response{
		StatusCode: rt.status,
		Body:       io.NopCloser(bytes.NewReader(rt.body)),
		Header:     make(http.Header),
	}, nil
}

// TestRecordingRoundTripperObjectBody covers an object body: the recorder records its top-level
// key names, and the wrapped GitHub client still decodes the identical body it hands on.
func TestRecordingRoundTripperObjectBody(t *testing.T) {
	body := []byte(`{"sha":"abc123","url":"https://example.test"}`)
	rec := newRecordingRoundTripper(fixedRoundTripper{status: http.StatusOK, body: body})
	gh := providers.NewGitHub(providers.Credential{}, rec)

	sha, err := gh.HeadSHA("glw907", "ecxc-ski", "main")
	if err != nil {
		t.Fatalf("HeadSHA: %v", err)
	}
	if sha != "abc123" {
		t.Errorf("sha = %q, want the value decoded from the handed-on body", sha)
	}

	rb := rec.lookup(http.MethodGet, "/repos/glw907/ecxc-ski/commits/main")
	want := []string{"sha", "url"}
	if len(rb.keys) != len(want) || rb.keys[0] != want[0] || rb.keys[1] != want[1] {
		t.Errorf("keys = %v, want %v", rb.keys, want)
	}
	if rb.marker != "" {
		t.Errorf("marker = %q, want empty for an object body", rb.marker)
	}
}

// TestRecordingRoundTripperArrayBody covers an array-of-objects body: the recorder records the
// array marker plus the first element's key names, and the wrapped GitHub client still decodes
// the identical body it hands on.
func TestRecordingRoundTripperArrayBody(t *testing.T) {
	body := []byte(`[{"commit":{"committer":{"date":"2026-09-10T12:00:00Z"}}}]`)
	rec := newRecordingRoundTripper(fixedRoundTripper{status: http.StatusOK, body: body})
	gh := providers.NewGitHub(providers.Credential{}, rec)

	when, err := gh.LatestBotCommit("glw907", "ecxc-ski", "main")
	if err != nil {
		t.Fatalf("LatestBotCommit: %v", err)
	}
	want := time.Date(2026, 9, 10, 12, 0, 0, 0, time.UTC)
	if !when.Equal(want) {
		t.Errorf("when = %v, want the value decoded from the handed-on body: %v", when, want)
	}

	rb := rec.lookup(http.MethodGet, "/repos/glw907/ecxc-ski/commits")
	if rb.marker != markerArray {
		t.Errorf("marker = %q, want %q", rb.marker, markerArray)
	}
	if len(rb.keys) != 1 || rb.keys[0] != "commit" {
		t.Errorf("keys = %v, want [commit] (the first element's own keys)", rb.keys)
	}
}

// TestRecordingRoundTripperNotJSONBody covers a 200 whose body is not JSON at all: the recorder
// records markerNotJSON rather than panicking or misclassifying it as an object or array.
func TestRecordingRoundTripperNotJSONBody(t *testing.T) {
	body := []byte("not json at all")
	rec := newRecordingRoundTripper(fixedRoundTripper{status: http.StatusOK, body: body})
	gh := providers.NewGitHub(providers.Credential{}, rec)

	if _, err := gh.HeadSHA("glw907", "ecxc-ski", "main"); err == nil {
		t.Error("HeadSHA: want a decode error over a non-JSON body")
	}

	rb := rec.lookup(http.MethodGet, "/repos/glw907/ecxc-ski/commits/main")
	if rb.marker != markerNotJSON {
		t.Errorf("marker = %q, want %q", rb.marker, markerNotJSON)
	}
}

// TestRecordingRoundTripperRecordsCloudflareEnvelopeResultKeys covers the Cloudflare v4
// envelope: the recorder additionally records the "result" field's own key names, since the
// envelope's own four keys (success, errors, result, result_info) carry none of its shape.
func TestRecordingRoundTripperRecordsCloudflareEnvelopeResultKeys(t *testing.T) {
	body := []byte(`{"success":true,"errors":[],"result":{"count":5,"run":"abc"}}`)
	rec := newRecordingRoundTripper(fixedRoundTripper{status: http.StatusOK, body: body})
	cf := providers.NewCloudflare("acct123", providers.Credential{}, rec)

	if _, err := cf.ObservabilityQuery(map[string]any{"queryId": "x"}); err != nil {
		t.Fatalf("ObservabilityQuery: %v", err)
	}

	rb := rec.lookup(http.MethodPost, "/client/v4/accounts/acct123/workers/observability/telemetry/query")
	want := []string{"count", "run"}
	if len(rb.resultKeys) != len(want) || rb.resultKeys[0] != want[0] || rb.resultKeys[1] != want[1] {
		t.Errorf("resultKeys = %v, want %v", rb.resultKeys, want)
	}
}
