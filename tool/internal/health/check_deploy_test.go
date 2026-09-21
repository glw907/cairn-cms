package health

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"

	"github.com/glw907/cairn-cms/tool/internal/providers"
	"github.com/glw907/cairn-cms/tool/internal/record"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// deployRoute pairs a request path substring with the status and body a deployRoundTripper
// answers it with, checked in order so the first matching route wins.
type deployRoute struct {
	path   string
	status int
	body   string
}

// deployRoundTripper answers each request with its first matching deployRoute, or a bare 404
// envelope when nothing matches, standing in for both Cloudflare's and GitHub's API across one
// deployCheck run's several calls.
type deployRoundTripper struct {
	routes []deployRoute
}

func (rt deployRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	for _, route := range rt.routes {
		if strings.Contains(req.URL.Path, route.path) {
			return &http.Response{StatusCode: route.status, Body: io.NopCloser(bytes.NewReader([]byte(route.body))), Header: make(http.Header), Request: req}, nil
		}
	}
	return &http.Response{StatusCode: http.StatusNotFound, Body: io.NopCloser(bytes.NewReader([]byte(`{"success":false,"errors":[]}`))), Header: make(http.Header), Request: req}, nil
}

// deployWorkerRoute answers the Workers script list with one Worker named "my-worker" carrying
// tag "worker-tag".
var deployWorkerRoute = deployRoute{
	path:   "/workers/scripts",
	status: http.StatusOK,
	body:   `{"success":true,"result":[{"id":"my-worker","tag":"worker-tag"}]}`,
}

// deployNoWorkerRoute answers the Workers script list with none by that name.
var deployNoWorkerRoute = deployRoute{
	path:   "/workers/scripts",
	status: http.StatusOK,
	body:   `{"success":true,"result":[]}`,
}

// deployTriggersRoute answers the Builds triggers list for "worker-tag" with one connected
// trigger.
var deployTriggersRoute = deployRoute{
	path:   "/builds/workers/worker-tag/triggers",
	status: http.StatusOK,
	body:   `{"success":true,"result":[{"uuid":"trigger-uuid","repo_connection":{"provider_account_name":"acme","repo_name":"site"}}]}`,
}

// deployNoTriggersRoute answers the Builds triggers list with an empty list and no error, the
// live shape a worker Cloudflare has never registered for Builds returns
// (BuildsConnections's own doc comment), handcrafted here since the fixture corpus carries no
// captured body for this condition.
var deployNoTriggersRoute = deployRoute{
	path:   "/builds/workers/worker-tag/triggers",
	status: http.StatusOK,
	body:   `{"success":true,"result":[]}`,
}

// deployBuildRoute builds a deployRoute answering the Builds discovery list with one build
// carrying status, outcome, and commitHash.
func deployBuildRoute(status, outcome, commitHash string) deployRoute {
	outcomeJSON := "null"
	if outcome != "" {
		outcomeJSON = `"` + outcome + `"`
	}
	body := `{"success":true,"result":[{"build_uuid":"build-uuid","status":"` + status +
		`","build_outcome":` + outcomeJSON + `,"created_on":"2026-09-01T00:00:00Z",` +
		`"build_trigger_metadata":{"commit_hash":"` + commitHash + `"}}]}`
	return deployRoute{path: "/builds/workers/worker-tag/builds", status: http.StatusOK, body: body}
}

// deployNoBuildsRoute answers the Builds discovery list with no builds at all.
var deployNoBuildsRoute = deployRoute{
	path:   "/builds/workers/worker-tag/builds",
	status: http.StatusOK,
	body:   `{"success":true,"result":[]}`,
}

// deployHeadSHARoute builds a deployRoute answering GitHub's commit lookup with sha.
func deployHeadSHARoute(sha string) deployRoute {
	return deployRoute{path: "/commits/main", status: http.StatusOK, body: `{"sha":"` + sha + `"}`}
}

// deployRecord returns the record every deployCheck test runs against: a Worker named
// "my-worker" and a repository whose default branch is "main".
func deployRecord() record.Record {
	return record.Record{
		Domain:     "example.test",
		Cloudflare: record.Cloudflare{WorkerName: "my-worker"},
		GitHub:     record.GitHub{Repo: record.GitHubRepo{Owner: "acme", Repo: "site", DefaultBranch: "main"}},
	}
}

// deployClients builds the Clients a deployCheck test runs against: haveBuilds governs
// Clients.HaveBuilds, and both provider clients share one deployRoundTripper since their request
// paths never collide.
func deployClients(haveBuilds bool, routes ...deployRoute) Clients {
	rt := deployRoundTripper{routes: routes}
	return Clients{
		CF:         cfClient(rt),
		GH:         ghClient(rt),
		HaveCF:     true,
		HaveGH:     true,
		HaveBuilds: haveBuilds,
	}
}

func TestDeployCheckDeclaresTierBothAndNoCondition(t *testing.T) {
	c := deployCheck{}
	if got := c.ID(); got != "deploy" {
		t.Errorf("ID() = %q, want %q", got, "deploy")
	}
	if got := c.Needs(); got != TierBoth {
		t.Errorf("Needs() = %v, want TierBoth", got)
	}
	if got := c.Condition(); got != spine.ConditionNone {
		t.Errorf("Condition() = %q, want ConditionNone", got)
	}
}

func TestDeployCheckWorkerAbsentIsFailing(t *testing.T) {
	c := deployClients(true, deployNoWorkerRoute)
	got := (deployCheck{}).Run(context.Background(), deployRecord(), c, Options{})
	if got.State != spine.Failing {
		t.Errorf("State = %v, want Failing", got.State)
	}
	if strings.Contains(got.Detail, "my-worker") {
		t.Errorf("Detail carries the worker name: %q", got.Detail)
	}
}

func TestDeployCheckBuildsNotConnectedIsFailing(t *testing.T) {
	c := deployClients(true, deployWorkerRoute, deployNoTriggersRoute)
	got := (deployCheck{}).Run(context.Background(), deployRecord(), c, Options{})
	if got.State != spine.Failing {
		t.Errorf("State = %v, want Failing", got.State)
	}
	want := string(spine.APIReason(providers.ReasonBuildsNotConnected))
	if got.Detail != want {
		t.Errorf("Detail = %q, want %q", got.Detail, want)
	}
}

func TestDeployCheckHaveBuildsFalseDegradesToWorkerExists(t *testing.T) {
	c := deployClients(false, deployWorkerRoute)
	got := (deployCheck{}).Run(context.Background(), deployRecord(), c, Options{})
	if got.State != spine.Unknown || got.Reason != spine.ReasonCredMissing {
		t.Errorf("Outcome = %+v, want Unknown/reason.cred-missing", got)
	}
	if !fieldBool(t, got.Fields, "workerExists") {
		t.Error("workerExists field is false, want true")
	}
}

func TestDeployCheckNoBuildYetIsUnknownParkBuildNotStarted(t *testing.T) {
	c := deployClients(true, deployWorkerRoute, deployTriggersRoute, deployNoBuildsRoute)
	got := (deployCheck{}).Run(context.Background(), deployRecord(), c, Options{})
	want := spine.ParkReason(spine.ParkBuildNotStarted)
	if got.State != spine.Unknown || got.Reason != want {
		t.Errorf("Outcome = %+v, want Unknown/%s", got, want)
	}
}

func TestDeployCheckRunningBuildIsUnknown(t *testing.T) {
	c := deployClients(true, deployWorkerRoute, deployTriggersRoute, deployBuildRoute("running", "", "abc1234def"))
	got := (deployCheck{}).Run(context.Background(), deployRecord(), c, Options{})
	want := spine.ParkReason(spine.ParkBuildRunning)
	if got.State != spine.Unknown || got.Reason != want {
		t.Errorf("Outcome = %+v, want Unknown/%s", got, want)
	}
}

func TestDeployCheckStoppedWithNoOutcomeYetIsUnknown(t *testing.T) {
	c := deployClients(true, deployWorkerRoute, deployTriggersRoute,
		deployBuildRoute(buildStoppedStatus, "", "abc1234def5678"))
	got := (deployCheck{}).Run(context.Background(), deployRecord(), c, Options{})
	want := spine.ParkReason(spine.ParkBuildRunning)
	if got.State != spine.Unknown || got.Reason != want {
		t.Errorf("Outcome = %+v, want Unknown/%s", got, want)
	}
	if got := fieldString(t, got.Fields, "lastBuild"); got != "running" {
		t.Errorf("lastBuild field = %q, want %q", got, "running")
	}
}

func TestDeployCheckFailedBuildIsFailing(t *testing.T) {
	c := deployClients(true, deployWorkerRoute, deployTriggersRoute,
		deployBuildRoute(buildStoppedStatus, "fail", "abc1234def5678"), deployHeadSHARoute("abc1234def5678"))
	got := (deployCheck{}).Run(context.Background(), deployRecord(), c, Options{})
	if got.State != spine.Failing {
		t.Errorf("State = %v, want Failing", got.State)
	}
	if got := fieldString(t, got.Fields, "lastBuild"); got != "failed" {
		t.Errorf("lastBuild field = %q, want %q", got, "failed")
	}
}

func TestDeployCheckOKEqualSHAsIsOKNotBehind(t *testing.T) {
	sha := "abc1234def5678"
	c := deployClients(true, deployWorkerRoute, deployTriggersRoute,
		deployBuildRoute(buildStoppedStatus, buildOutcomeSuccess, sha), deployHeadSHARoute(sha))
	got := (deployCheck{}).Run(context.Background(), deployRecord(), c, Options{})
	if got.State != spine.OK {
		t.Errorf("State = %v, want OK", got.State)
	}
	if fieldBool(t, got.Fields, "behind") {
		t.Error("behind field is true, want false for matching SHAs")
	}
}

func TestDeployCheckOKDifferingSHAsIsOKAndBehind(t *testing.T) {
	c := deployClients(true, deployWorkerRoute, deployTriggersRoute,
		deployBuildRoute(buildStoppedStatus, buildOutcomeSuccess, "abc1234def5678"), deployHeadSHARoute("9999999999999"))
	got := (deployCheck{}).Run(context.Background(), deployRecord(), c, Options{})
	if got.State != spine.OK {
		t.Errorf("State = %v, want OK", got.State)
	}
	if !fieldBool(t, got.Fields, "behind") {
		t.Error("behind field is false, want true for differing SHAs")
	}
}

// TestDeployCheckFieldOrderMatchesProduces asserts the ten Fields keys the Produces block lists
// appear, in that order, on a fully-populated outcome.
func TestDeployCheckFieldOrderMatchesProduces(t *testing.T) {
	sha := "abc1234def5678"
	c := deployClients(true, deployWorkerRoute, deployTriggersRoute,
		deployBuildRoute(buildStoppedStatus, buildOutcomeSuccess, sha), deployHeadSHARoute(sha))
	got := (deployCheck{}).Run(context.Background(), deployRecord(), c, Options{})

	want := []string{
		"workerExists", "buildsConnected", "pushToDeploy", "lastBuild", "lastBuildSHA",
		"mainSHA", "lastBuildAt", "behind", "lastBuildShortSHA", "mainShortSHA",
	}
	if len(got.Fields) != len(want) {
		t.Fatalf("len(Fields) = %d, want %d", len(got.Fields), len(want))
	}
	for i, key := range want {
		if got.Fields[i].Key != key {
			t.Errorf("Fields[%d].Key = %q, want %q", i, got.Fields[i].Key, key)
		}
	}
}

// TestDeployCheckNonVerboseRenderDropsVerboseOnlyValues asserts a Failing deploy's non-verbose
// render carries the build state and the two short-SHA entries, and none of the full commit
// SHAs, the build id, or the repository slug.
func TestDeployCheckNonVerboseRenderDropsVerboseOnlyValues(t *testing.T) {
	fullSHA := "abc1234def5678deadbeef"
	c := deployClients(true, deployWorkerRoute, deployTriggersRoute,
		deployBuildRoute(buildStoppedStatus, "fail", fullSHA), deployHeadSHARoute(fullSHA))
	outcome := (deployCheck{}).Run(context.Background(), deployRecord(), c, Options{})

	report := Report{Checks: []CheckResult{{ID: "deploy", Outcome: outcome}}}
	nonVerbose, err := report.JSON(false)
	if err != nil {
		t.Fatalf("JSON(false): %v", err)
	}
	rendered := string(nonVerbose)

	for _, want := range []string{`"failed"`, `"abc1234"`} {
		if !strings.Contains(rendered, want) {
			t.Errorf("non-verbose render dropped %q: %s", want, rendered)
		}
	}
	for _, leaked := range []string{fullSHA, "build-uuid", "trigger-uuid", "acme/site"} {
		if strings.Contains(rendered, leaked) {
			t.Errorf("non-verbose render leaked verbose-only value %q: %s", leaked, rendered)
		}
	}
}

// fieldBool decodes fields' entry named key as a bool, failing the test if no such entry exists.
func fieldBool(t *testing.T, fields []spine.OutcomeField, key string) bool {
	t.Helper()
	for _, f := range fields {
		if f.Key != key {
			continue
		}
		var v bool
		if err := json.Unmarshal(f.Value, &v); err != nil {
			t.Fatalf("unmarshal field %q: %v", key, err)
		}
		return v
	}
	t.Fatalf("no field named %q", key)
	return false
}

// fieldString decodes fields' entry named key as a string, failing the test if no such entry
// exists.
func fieldString(t *testing.T, fields []spine.OutcomeField, key string) string {
	t.Helper()
	for _, f := range fields {
		if f.Key != key {
			continue
		}
		var v string
		if err := json.Unmarshal(f.Value, &v); err != nil {
			t.Fatalf("unmarshal field %q: %v", key, err)
		}
		return v
	}
	t.Fatalf("no field named %q", key)
	return ""
}
