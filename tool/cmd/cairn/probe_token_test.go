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

	"github.com/glw907/cairn-cms/tool/internal/providers"
	"github.com/glw907/cairn-cms/tool/internal/record"
	"github.com/glw907/cairn-cms/tool/internal/spine"
	"github.com/glw907/cairn-cms/tool/internal/store"
	"github.com/spf13/cobra"
)

// routedResponse is one fixed status and body a routeRoundTripper serves for one path.
type routedResponse struct {
	status int
	body   []byte
}

// routeRoundTripper serves a fixed response per exact URL path (query strings ignored), standing
// in for both the Cloudflare and GitHub hosts in one fake so a test can drive auth check's full
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

// testAccountID is the CAIRN_CF_ACCOUNT_ID value testEnv resolves.
const testAccountID = "acct123"

// testZoneID is the zone id openTestRegistry writes onto every site record it saves.
const testZoneID = "zone-1"

// cloudflareOKRoutes returns every account-scoped Cloudflare route the four account-scoped
// permission rows hit, each answering 200, keyed by path.
func cloudflareOKRoutes() routeRoundTripper {
	return routeRoundTripper{
		"/client/v4/accounts/" + testAccountID + "/workers/scripts":                       {status: http.StatusOK, body: []byte(`{"success":true,"result":[]}`)},
		"/client/v4/accounts/" + testAccountID + "/builds/tokens":                         {status: http.StatusOK, body: []byte(`{"success":true,"result":[]}`)},
		"/client/v4/accounts/" + testAccountID + "/workers/observability/telemetry/query": {status: http.StatusOK, body: []byte(`{"success":true,"result":{"count":5}}`)},
		"/client/v4/zones": {status: http.StatusOK, body: []byte(`{"success":true,"result":[]}`)},
	}
}

// cloudflareZoneRoutes returns the three zone-scoped Cloudflare routes for testZoneID, each
// answering 200, keyed by path.
func cloudflareZoneRoutes() routeRoundTripper {
	return routeRoundTripper{
		"/client/v4/zones/" + testZoneID + "/settings":                 {status: http.StatusOK, body: []byte(`{"success":true,"result":[]}`)},
		"/client/v4/zones/" + testZoneID + "/dns_records":              {status: http.StatusOK, body: []byte(`{"success":true,"result":[]}`)},
		"/client/v4/zones/" + testZoneID + "/email/sending/subdomains": {status: http.StatusOK, body: []byte(`{"success":true,"result":[]}`)},
	}
}

// githubOKRoutes returns the two GitHub routes the two GitHub permission rows hit: /rate_limit
// for Metadata (account-scoped) and, when owner/repo is non-empty, the repository's own
// package.json for Contents (repository-scoped).
func githubOKRoutes(owner, repo string) routeRoundTripper {
	routes := routeRoundTripper{
		"/rate_limit": {status: http.StatusOK, body: []byte(`{}`)},
	}
	if owner != "" {
		content := base64.StdEncoding.EncodeToString([]byte("{}"))
		routes[fmt.Sprintf("/repos/%s/%s/contents/package.json", owner, repo)] = routedResponse{
			status: http.StatusOK, body: []byte(fmt.Sprintf(`{"content":%q,"encoding":"base64"}`, content)),
		}
	}
	return routes
}

// refRoundTripper serves base, except that it answers the GitHub Contents path only when the
// request carries wantRef, the way GitHub answers 404 for a ref a repository does not have. It
// is the one fake that can tell a probe reading the site's own default branch from a probe
// reading a hardcoded one, since routeRoundTripper ignores the query string the ref travels in.
type refRoundTripper struct {
	base         routeRoundTripper
	contentsPath string
	wantRef      string
}

func (rt refRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	if req.URL.Path == rt.contentsPath && req.URL.Query().Get("ref") != rt.wantRef {
		return &http.Response{
			StatusCode: http.StatusNotFound,
			Body:       io.NopCloser(strings.NewReader(`{"message":"No commit found for the ref"}`)),
			Header:     make(http.Header),
		}, nil
	}
	return rt.base.RoundTrip(req)
}

// mergeRoutes combines several routeRoundTrippers into one.
func mergeRoutes(routes ...routeRoundTripper) routeRoundTripper {
	merged := routeRoundTripper{}
	for _, r := range routes {
		maps.Copy(merged, r)
	}
	return merged
}

// testSite is one record openTestRegistry saves. An empty branch leaves the record's own
// default branch unset, which is what an adoption predating the default-branch read looks like.
type testSite struct {
	owner, repo, branch string
}

// openTestRegistry opens a fresh store at t.TempDir() and saves one record per id, each carrying
// testZoneID and its own owner, repository, and default branch, through record and store's own
// real shapes rather than hand-built JSON, and returns the directory for auth check's
// registryDir dependency.
func openTestRegistry(t *testing.T, sites map[string]testSite) string {
	t.Helper()
	dir := t.TempDir()
	if err := os.Chmod(dir, 0o700); err != nil {
		t.Fatalf("chmod dir: %v", err)
	}
	s, err := store.Open(dir)
	if err != nil {
		t.Fatalf("store.Open: %v", err)
	}
	for id, site := range sites {
		r := record.Record{
			Name: id,
			GitHub: record.GitHub{
				Repo: record.GitHubRepo{Owner: site.owner, Repo: site.repo, DefaultBranch: site.branch},
			},
			Cloudflare: record.Cloudflare{ZoneID: testZoneID},
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
		"CAIRN_CF_ACCOUNT_ID": testAccountID,
		"CAIRN_CF_READ_TOKEN": "cf-token",
		"CAIRN_GH_READ_TOKEN": "gh-token",
	})
}

// checkDeps builds the dependency set cairn auth check runs over, from the four dependencies
// this command's tests vary. Every other field stays at its zero value, which auth check never
// reads.
func checkDeps(envFn func(string) string, rt http.RoundTripper, registryDir func() (string, error), exit func(int)) deps {
	return deps{env: envFn, keyring: fakeProvider{name: "keyring"}, transport: rt, registryDir: registryDir, exit: exit}
}

// runCheck runs cairn auth check and returns the exit code its coded error carries. The command
// hands main its verdict as a typed error rather than through the injected exit, since it
// settles permission rows and produces no health report for spine.ExitCode's report-bearing
// callers to read.
func runCheck(t *testing.T, cmd *cobra.Command, args ...string) int {
	t.Helper()
	err := cmd.RunE(cmd, args)
	coded, ok := errors.AsType[codedError](err)
	if !ok {
		t.Fatalf("RunE returned %v, want a codedError", err)
	}
	return int(coded.verdict)
}

func TestAuthProbeIsHiddenAliasOfAuthCheck(t *testing.T) {
	d := checkDeps(fakeEnv(nil), routeRoundTripper{}, func() (string, error) { return t.TempDir(), nil }, func(int) {})
	check := newAuthCheckCmd(d)
	probe := newAuthProbeCmd(d)

	if check.Hidden {
		t.Error("cairn auth check is Hidden; it must be reachable from --help")
	}
	if !probe.Hidden {
		t.Error("cairn auth probe is not Hidden; it must stay a hidden alias")
	}
	if check.Short != probe.Short || check.Long != probe.Long {
		t.Error("cairn auth check and cairn auth probe carry different prose; they must share one")
	}
}

func TestAuthCheckAcceptsAtMostOneSiteArgument(t *testing.T) {
	cmd := newAuthCheckCmd(checkDeps(fakeEnv(nil), routeRoundTripper{}, func() (string, error) { return t.TempDir(), nil }, func(int) {}))
	if err := cmd.Args(cmd, nil); err != nil {
		t.Errorf("Args(nil) = %v, want no error", err)
	}
	if err := cmd.Args(cmd, []string{"a-site"}); err != nil {
		t.Errorf("Args([a-site]) = %v, want no error", err)
	}
	if err := cmd.Args(cmd, []string{"a-site", "b-site"}); err == nil {
		t.Error("Args([a-site, b-site]) accepted two arguments; auth check takes at most one")
	}
}

func TestAuthCheckPrintsCredentialSourcesNeverValues(t *testing.T) {
	env := testEnv()
	dir := openTestRegistry(t, nil)
	rt := mergeRoutes(cloudflareOKRoutes(), githubOKRoutes("", ""))

	var code int
	cmd := newAuthCheckCmd(checkDeps(env, rt, func() (string, error) { return dir, nil }, func(c int) { code = c }))
	var out bytes.Buffer
	cmd.SetOut(&out)
	cmd.SetErr(&bytes.Buffer{})

	code = runCheck(t, cmd)
	got := out.String()
	if !strings.Contains(got, "CAIRN_CF_ACCOUNT_ID") || !strings.Contains(got, "environment") {
		t.Errorf("output missing credential source line: %s", got)
	}
	if strings.Contains(got, "cf-token") || strings.Contains(got, "gh-token") || strings.Contains(got, testAccountID) {
		t.Errorf("output printed a credential value: %s", got)
	}
	if code != int(spine.VerdictWarning) {
		t.Errorf("exit code = %d, want WARNING (%d): the four site-scoped rows skip with no site named", code, int(spine.VerdictWarning))
	}
}

// TestAuthCheckAllConfirmedWithSiteExitsOK drives every one of the nine permission rows to a
// confirmed pass, naming a site so the four site-scoped rows probe rather than skip, and asserts
// the run exits 0.
func TestAuthCheckAllConfirmedWithSiteExitsOK(t *testing.T) {
	env := testEnv()
	dir := openTestRegistry(t, map[string]testSite{"ecxc-ski-abc123": {owner: "glw907", repo: "ecxc-ski"}})
	rt := mergeRoutes(cloudflareOKRoutes(), cloudflareZoneRoutes(), githubOKRoutes("glw907", "ecxc-ski"))

	var code int
	cmd := newAuthCheckCmd(checkDeps(env, rt, func() (string, error) { return dir, nil }, func(c int) { code = c }))
	var out bytes.Buffer
	cmd.SetOut(&out)
	cmd.SetErr(&bytes.Buffer{})

	code = runCheck(t, cmd, "ecxc-ski-abc123")
	if code != int(spine.VerdictOK) {
		t.Fatalf("exit code = %d, want OK; output:\n%s", code, out.String())
	}
	for _, p := range permissionTable {
		if !strings.Contains(out.String(), p.Label) {
			t.Errorf("output does not name permission %q; output:\n%s", p.Label, out.String())
		}
	}
	if strings.Count(out.String(), " pass\n") != len(permissionTable) {
		t.Errorf("output = %s, want all %d rows to read pass", out.String(), len(permissionTable))
	}
}

// TestAuthCheckContentsReadsTheSitesOwnDefaultBranch covers a registered site whose default
// branch is not main: the Contents probe reads the branch the record carries, so a token that
// holds the permission reads pass rather than the not-found a hardcoded main would produce.
func TestAuthCheckContentsReadsTheSitesOwnDefaultBranch(t *testing.T) {
	const branch = "trunk"
	dir := openTestRegistry(t, map[string]testSite{"ecxc-ski-abc123": {owner: "glw907", repo: "ecxc-ski", branch: branch}})
	rt := refRoundTripper{
		base:         mergeRoutes(cloudflareOKRoutes(), cloudflareZoneRoutes(), githubOKRoutes("glw907", "ecxc-ski")),
		contentsPath: "/repos/glw907/ecxc-ski/contents/package.json",
		wantRef:      branch,
	}

	var code int
	cmd := newAuthCheckCmd(checkDeps(testEnv(), rt, func() (string, error) { return dir, nil }, func(c int) { code = c }))
	var out bytes.Buffer
	cmd.SetOut(&out)
	cmd.SetErr(&bytes.Buffer{})

	code = runCheck(t, cmd, "ecxc-ski-abc123")
	if code != int(spine.VerdictOK) {
		t.Fatalf("exit code = %d, want OK; output:\n%s", code, out.String())
	}
	if !strings.Contains(out.String(), "Contents") || strings.Contains(out.String(), "not-found") {
		t.Errorf("the Contents row did not confirm against %q; output:\n%s", branch, out.String())
	}
}

func TestAuthCheckSkipsZoneAndRepoScopedRowsWithNoSite(t *testing.T) {
	env := testEnv()
	dir := openTestRegistry(t, nil)
	rt := mergeRoutes(cloudflareOKRoutes(), githubOKRoutes("", ""))

	var code int
	cmd := newAuthCheckCmd(checkDeps(env, rt, func() (string, error) { return dir, nil }, func(c int) { code = c }))
	var out bytes.Buffer
	cmd.SetOut(&out)
	cmd.SetErr(&bytes.Buffer{})

	code = runCheck(t, cmd)
	got := out.String()
	for _, label := range []string{"Zone Settings", "DNS", "Email Sending", "Contents"} {
		if !strings.Contains(got, label+" ") || !strings.Contains(got, authCheckSiteRequiredReason) {
			t.Errorf("output does not skip %q with the site-required reason; output:\n%s", label, got)
		}
	}
	if code != int(spine.VerdictWarning) {
		t.Errorf("exit code = %d, want WARNING (%d)", code, int(spine.VerdictWarning))
	}
}

// TestAuthCheckSkipsWholeCredentialWhenMissing covers every shape of a Cloudflare credential
// this run could not find. Cloudflare reads two variables, so the group notice and each skipped
// row must name whichever of them is actually unset: an operator who set the token but not the
// account id was previously told the token was not set, which points at the wrong fix.
func TestAuthCheckSkipsWholeCredentialWhenMissing(t *testing.T) {
	tests := []struct {
		name   string
		env    map[string]string
		wantCF string
	}{
		{
			name:   "neither Cloudflare variable is set",
			env:    map[string]string{"CAIRN_GH_READ_TOKEN": "gh-token"},
			wantCF: "Cloudflare: skip, CAIRN_CF_ACCOUNT_ID and CAIRN_CF_READ_TOKEN are not set",
		},
		{
			name:   "only the account id is set",
			env:    map[string]string{"CAIRN_CF_ACCOUNT_ID": testAccountID, "CAIRN_GH_READ_TOKEN": "gh-token"},
			wantCF: "Cloudflare: skip, CAIRN_CF_READ_TOKEN is not set",
		},
		{
			name:   "only the read token is set",
			env:    map[string]string{"CAIRN_CF_READ_TOKEN": "cf-token", "CAIRN_GH_READ_TOKEN": "gh-token"},
			wantCF: "Cloudflare: skip, CAIRN_CF_ACCOUNT_ID is not set",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dir := openTestRegistry(t, nil)
			var code int
			cmd := newAuthCheckCmd(checkDeps(fakeEnv(tt.env), githubOKRoutes("", ""), func() (string, error) { return dir, nil }, func(c int) { code = c }))
			var out bytes.Buffer
			cmd.SetOut(&out)
			cmd.SetErr(&bytes.Buffer{})

			code = runCheck(t, cmd)
			got := out.String()
			if !strings.Contains(got, tt.wantCF) {
				t.Errorf("output = %s, want the group notice %q", got, tt.wantCF)
			}
			// Every Cloudflare row's own reason names the same variables the notice does.
			rowReason := strings.TrimPrefix(tt.wantCF, "Cloudflare: skip, ")
			if strings.Count(got, rowReason) < 2 {
				t.Errorf("output = %s, want each skipped Cloudflare row naming %q too", got, rowReason)
			}
			if code != int(spine.VerdictWarning) {
				t.Errorf("exit code = %d, want WARNING (%d) for a missing credential", code, int(spine.VerdictWarning))
			}
		})
	}

	t.Run("the GitHub token is not set", func(t *testing.T) {
		dir := openTestRegistry(t, nil)
		var code int
		env := fakeEnv(map[string]string{"CAIRN_CF_ACCOUNT_ID": testAccountID, "CAIRN_CF_READ_TOKEN": "cf-token"})
		cmd := newAuthCheckCmd(checkDeps(env, cloudflareOKRoutes(), func() (string, error) { return dir, nil }, func(c int) { code = c }))
		var out bytes.Buffer
		cmd.SetOut(&out)
		cmd.SetErr(&bytes.Buffer{})

		code = runCheck(t, cmd)
		got := out.String()
		if !strings.Contains(got, "GitHub: skip, CAIRN_GH_READ_TOKEN is not set") {
			t.Errorf("output = %s, want the GitHub group notice", got)
		}
		if code != int(spine.VerdictWarning) {
			t.Errorf("exit code = %d, want WARNING (%d) for a missing credential", code, int(spine.VerdictWarning))
		}
	})
}

func TestAuthCheckExitCriticalOnRejectedCloudflareToken(t *testing.T) {
	env := testEnv()
	dir := openTestRegistry(t, nil)
	rt := mergeRoutes(routeRoundTripper{
		"/client/v4/accounts/" + testAccountID + "/workers/scripts": {status: http.StatusUnauthorized, body: []byte(`{"success":false,"errors":[{"code":10000,"message":"Invalid API Token"}]}`)},
	}, githubOKRoutes("", ""))

	var code int
	cmd := newAuthCheckCmd(checkDeps(env, rt, func() (string, error) { return dir, nil }, func(c int) { code = c }))
	cmd.SetOut(&bytes.Buffer{})
	cmd.SetErr(&bytes.Buffer{})

	code = runCheck(t, cmd)
	if code != int(spine.VerdictCritical) {
		t.Errorf("exit code = %d, want CRITICAL (%d)", code, int(spine.VerdictCritical))
	}
}

// TestAuthCheckOneForbiddenPermissionFailsItsOwnRow drives a run whose token is valid but holds
// one permission short, the shape criterion 7's "a run with one missing permission" names. The
// rejected-token case above exercises a 401 over the whole token; this is the 403 an operator
// sees when they built the token from an incomplete scope list.
func TestAuthCheckOneForbiddenPermissionFailsItsOwnRow(t *testing.T) {
	dir := openTestRegistry(t, nil)
	rt := mergeRoutes(cloudflareOKRoutes(), githubOKRoutes("", ""), routeRoundTripper{
		"/client/v4/accounts/" + testAccountID + "/builds/tokens": {
			status: http.StatusForbidden,
			body:   []byte(`{"success":false,"errors":[{"code":10000,"message":"Authentication error"}]}`),
		},
	})

	var code int
	cmd := newAuthCheckCmd(checkDeps(testEnv(), rt, func() (string, error) { return dir, nil }, func(c int) { code = c }))
	var out bytes.Buffer
	cmd.SetOut(&out)
	cmd.SetErr(&bytes.Buffer{})

	code = runCheck(t, cmd)
	got := out.String()
	if !strings.Contains(got, "Workers Builds Configuration     CAIRN_CF_READ_TOKEN  fail, forbidden") {
		t.Errorf("the forbidden row does not read fail; output:\n%s", got)
	}
	if !strings.Contains(got, "Workers Scripts                  CAIRN_CF_READ_TOKEN  pass") {
		t.Errorf("a permission the token does hold no longer reads pass; output:\n%s", got)
	}
	if code != int(spine.VerdictCritical) {
		t.Errorf("exit code = %d, want CRITICAL (%d)", code, int(spine.VerdictCritical))
	}
}

func TestAuthCheckExitUnknownOnUnreachableEndpoint(t *testing.T) {
	env := testEnv()
	dir := openTestRegistry(t, nil)
	// No routes registered at all: every Cloudflare and GitHub call answers the fake's default
	// 404, which classifies as ReasonNotFound, UNKNOWN, never CRITICAL.
	rt := routeRoundTripper{}

	var code int
	cmd := newAuthCheckCmd(checkDeps(env, rt, func() (string, error) { return dir, nil }, func(c int) { code = c }))
	cmd.SetOut(&bytes.Buffer{})
	cmd.SetErr(&bytes.Buffer{})

	code = runCheck(t, cmd)
	if code != int(spine.VerdictUnknown) {
		t.Errorf("exit code = %d, want UNKNOWN (%d)", code, int(spine.VerdictUnknown))
	}
}

func TestAuthCheckUnknownSiteIsUsageError(t *testing.T) {
	env := testEnv()
	dir := openTestRegistry(t, nil)
	cmd := newAuthCheckCmd(checkDeps(env, routeRoundTripper{}, func() (string, error) { return dir, nil }, func(int) {}))
	cmd.SetOut(&bytes.Buffer{})
	cmd.SetErr(&bytes.Buffer{})

	err := cmd.RunE(cmd, []string{"no-such-site"})
	if err == nil {
		t.Fatal("RunE(no-such-site) = nil, want the unknown-site error")
	}
	if _, ok := errors.AsType[codedError](err); ok {
		t.Fatal("RunE(no-such-site) returned a codedError; an unknown site is a usage error")
	}
	if !strings.Contains(err.Error(), "no-such-site") {
		t.Errorf("error = %v, want it to name the site id", err)
	}
}

func TestAuthCheckExitUnknownWhenRegistryDirUnresolvable(t *testing.T) {
	env := testEnv()
	cmd := newAuthCheckCmd(checkDeps(env, routeRoundTripper{}, func() (string, error) {
		return "", errors.New("boom")
	}, func(int) {}))
	cmd.SetOut(&bytes.Buffer{})
	cmd.SetErr(&bytes.Buffer{})

	err := cmd.RunE(cmd, []string{"any-site"})
	if err == nil || strings.Contains(err.Error(), "cairn: run reported") {
		t.Fatalf("RunE(any-site) = %v, want the registry-dir error surfaced directly", err)
	}
}

// TestPermissionTableCoversNineRows pins the fixed nine-row set: the four Cloudflare
// account-scoped permissions, the three Cloudflare zone-scoped permissions, and GitHub's
// Contents and Metadata.
func TestPermissionTableCoversNineRows(t *testing.T) {
	if len(permissionTable) != 9 {
		t.Fatalf("len(permissionTable) = %d, want 9", len(permissionTable))
	}
	var siteScoped int
	for _, p := range permissionTable {
		if p.Scope == scopeSite {
			siteScoped++
		}
	}
	if siteScoped != 4 {
		t.Errorf("site-scoped rows = %d, want 4 (Zone Settings, DNS, Email Sending, Contents)", siteScoped)
	}
}

// TestProviderVerdictAgreesAcrossErrorTypes drives probeRow over a matched pair of errors per
// Reason, an *providers.APIError and a *providers.GitHubError carrying the same Reason and
// status, and asserts both classify to the same wire word.
func TestProviderVerdictAgreesAcrossErrorTypes(t *testing.T) {
	reasons := []providers.Reason{
		providers.ReasonUnauthorized,
		providers.ReasonForbidden,
		providers.ReasonNotFound,
		providers.ReasonRateLimited,
		providers.ReasonUnknown,
	}
	p := permission{Label: "Workers Scripts", Credential: varCFReadToken, Scope: scopeAccount}
	for _, reason := range reasons {
		t.Run(reason.String(), func(t *testing.T) {
			status := http.StatusTeapot
			apiRow := probeRow(p, &providers.APIError{Status: status, Reason: reason})
			ghRow := probeRow(p, &providers.GitHubError{Status: status, Reason: reason})

			if checkRowWord(apiRow) != checkRowWord(ghRow) || apiRow.display != ghRow.display {
				t.Errorf("probeRow(APIError) = %+v, probeRow(GitHubError) = %+v, want equal", apiRow, ghRow)
			}
		})
	}

	if row := probeRow(p, nil); checkRowWord(row) != "pass" {
		t.Errorf("probeRow(nil) word = %q, want pass", checkRowWord(row))
	}

	unclassifiable := errors.New("boom")
	if row := probeRow(p, unclassifiable); row.display != "unreachable" || checkRowWord(row) != "unknown" {
		t.Errorf("probeRow(unclassifiable) = %+v, want display \"unreachable\" and word \"unknown\"", row)
	}
}

// TestCheckDepsRefusesUnusedKeyring documents that checkDeps sets a read-only keyring (auth
// check never writes) and never the writer, deleter, or status fields those other auth
// subcommands use.
func TestCheckDepsRefusesUnusedKeyring(t *testing.T) {
	d := checkDeps(fakeEnv(nil), routeRoundTripper{}, func() (string, error) { return t.TempDir(), nil }, func(int) {})
	if d.keyringWriter != nil {
		t.Error("checkDeps set a keyringWriter; auth check never writes")
	}
	if d.keyring == nil {
		t.Error("checkDeps set no keyring; loadEnv's provider chain needs one, even an unused fake")
	}
}
