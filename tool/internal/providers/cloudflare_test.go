package providers

import (
	"bytes"
	"context"
	"errors"
	"io"
	"net/http"
	"reflect"
	"testing"
)

// fixtureRoundTripper serves one fixed status and body for every request, standing in for
// Cloudflare's API in a test.
type fixtureRoundTripper struct {
	status int
	body   []byte
}

func (rt fixtureRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	return &http.Response{
		StatusCode: rt.status,
		Body:       io.NopCloser(bytes.NewReader(rt.body)),
		Header:     make(http.Header),
		Request:    req,
	}, nil
}

// TestBuildsLatestDecodesBuildShape asserts BuildsLatest decodes a Workers Builds discovery
// response into the id, status, outcome, commit SHA, and timestamp fields deployCheck reads,
// matching the live shape docs/internal/record/2026-08-13-t5-task8-live-e2e.md captured.
func TestBuildsLatestDecodesBuildShape(t *testing.T) {
	body := []byte(`{"success":true,"result":[{"build_uuid":"e266a910","status":"stopped","build_outcome":"success","created_on":"2026-08-13T12:48:26Z","build_trigger_metadata":{"commit_hash":"6d670d5b"}}]}`)
	rt := fixtureRoundTripper{status: http.StatusOK, body: body}
	cf := NewCloudflare("account-id", NewCredential("token"), rt)

	build, err := cf.BuildsLatest(context.Background(), "worker-tag")
	if err != nil {
		t.Fatalf("BuildsLatest: %v", err)
	}
	if build == nil {
		t.Fatal("BuildsLatest returned a nil Build, want the one decoded result")
	}
	if build.UUID != "e266a910" {
		t.Errorf("UUID = %q, want %q", build.UUID, "e266a910")
	}
	if build.Status != "stopped" {
		t.Errorf("Status = %q, want %q", build.Status, "stopped")
	}
	if build.Outcome != "success" {
		t.Errorf("Outcome = %q, want %q", build.Outcome, "success")
	}
	if build.TriggerMetadata.CommitHash != "6d670d5b" {
		t.Errorf("TriggerMetadata.CommitHash = %q, want %q", build.TriggerMetadata.CommitHash, "6d670d5b")
	}
	wantCreated := "2026-08-13 12:48:26 +0000 UTC"
	if got := build.CreatedOn.UTC().String(); got != wantCreated {
		t.Errorf("CreatedOn = %q, want %q", got, wantCreated)
	}
}

// TestClassifyReason covers every Reason value's mapping rule this package can produce (all but
// ReasonBuildsNotConnected, which classifyReason never produces per its own doc comment), including
// the cases the task names explicitly: a 403 with code 10000 classifies as ReasonForbidden, and a
// 401 as ReasonUnauthorized, regardless of the accompanying code, since neither status carries a
// code-specific override; a 400 with code 6003 also classifies as ReasonUnauthorized, the second
// half of the Node client's throwIfTokenInvalid; and the four codes that classify from any
// position in errs are each proven from a non-zero position, behind an unrelated warning entry,
// matching the Node client's errors.some(...) rather than an errors[0]-only check.
func TestClassifyReason(t *testing.T) {
	warning := v4Error{Code: 1000}
	tests := []struct {
		name   string
		status int
		errs   []v4Error
		want   Reason
	}{
		{"401 classifies as unauthorized", http.StatusUnauthorized, []v4Error{{Code: 10000}}, ReasonUnauthorized},
		{"403 with code 10000 classifies as forbidden", http.StatusForbidden, []v4Error{{Code: 10000}}, ReasonForbidden},
		{"404 classifies as not found", http.StatusNotFound, []v4Error{{Code: 7003}}, ReasonNotFound},
		{"429 classifies as rate limited", http.StatusTooManyRequests, nil, ReasonRateLimited},
		{"503 classifies as rate limited", http.StatusServiceUnavailable, nil, ReasonRateLimited},
		{"400 with code 6003 classifies as unauthorized", http.StatusBadRequest, []v4Error{{Code: 6003}}, ReasonUnauthorized},
		{"code 8000008 classifies as builds app not authorized", http.StatusNotFound, []v4Error{{Code: 8000008}}, ReasonBuildsAppNotAuthorized},
		{"code 8000012 classifies as builds repo not selected", http.StatusNotFound, []v4Error{{Code: 8000012}}, ReasonBuildsRepoNotSelected},
		{"code 10203 classifies as sender not configured", http.StatusForbidden, []v4Error{{Code: 10203}}, ReasonSenderNotConfigured},
		{"code 10204 classifies as sender not configured", http.StatusForbidden, []v4Error{{Code: 10204}}, ReasonSenderNotConfigured},
		{"code 8000008 in a non-zero position, behind a warning, still classifies", http.StatusNotFound, []v4Error{warning, {Code: 8000008}}, ReasonBuildsAppNotAuthorized},
		{"code 8000012 in a non-zero position, behind a warning, still classifies", http.StatusNotFound, []v4Error{warning, {Code: 8000012}}, ReasonBuildsRepoNotSelected},
		{"code 10203 in a non-zero position, behind a warning, still classifies", http.StatusForbidden, []v4Error{warning, {Code: 10203}}, ReasonSenderNotConfigured},
		{"code 10204 in a non-zero position, behind a warning, still classifies", http.StatusForbidden, []v4Error{warning, {Code: 10204}}, ReasonSenderNotConfigured},
		{"an unmapped status and code classifies as unknown", http.StatusTeapot, nil, ReasonUnknown},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := classifyReason(tt.status, tt.errs, http.Header{}); got != tt.want {
				t.Errorf("classifyReason(%d, %v) = %v, want %v", tt.status, tt.errs, got, tt.want)
			}
		})
	}
}

// TestReasonMappingFromCorpusFixtures drives the classification end to end, over a client whose
// RoundTripper serves a real captured fixture, for every Reason the fixture corpus carries a
// live-captured body for. The corpus's own rule (packages/create-cairn-site/fixtures/README.md:
// "every body here is a real captured API response") is why this is not all of classifyReason's
// producible Reason values: the corpus never captured a plain 401, a generic 403, a rate limit,
// or a 400/6003 token-invalid body, and inventing one to fill the gap would violate that rule, so
// those are covered only by TestClassifyReason's direct unit table above, not by a corpus
// fixture. ReasonBuildsNotConnected is absent from both this table and the direct table:
// classifyReason never produces it (see that constant's own doc comment).
func TestReasonMappingFromCorpusFixtures(t *testing.T) {
	tests := []struct {
		name    string
		fixture string
		want    Reason
	}{
		{"not found", "zone.not-found.404.json", ReasonNotFound},
		{"builds app not authorized", "builds_connection_put.app-not-authorized.404.json", ReasonBuildsAppNotAuthorized},
		{"builds repo not selected", "builds_connection_put.repo-not-selected.404.json", ReasonBuildsRepoNotSelected},
		{"sender not configured", "email_send.refused-sender-not-configured.403.json", ReasonSenderNotConfigured},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			status, body, err := Corpus("cloudflare", tt.fixture)
			if err != nil {
				t.Fatal(err)
			}
			cf := NewCloudflare("acct123", Credential{}, fixtureRoundTripper{status: status, body: body})

			_, err = cf.VerifyToken(context.Background())

			var apiErr *APIError
			if !errors.As(err, &apiErr) {
				t.Fatalf("VerifyToken: err = %v (%T), want *APIError", err, err)
			}
			if apiErr.Status != status {
				t.Errorf("Status = %d, want %d", apiErr.Status, status)
			}
			if apiErr.Reason != tt.want {
				t.Errorf("Reason = %v, want %v", apiErr.Reason, tt.want)
			}
		})
	}
}

// TestVerifyTokenDecodesSuccess proves the happy-path decode: a 200 v4 envelope carrying
// result.id in its result field returns that id with no error. The corpus's own
// user_token_verify.success.200.json stores only the pieces the Node fake reconstructs an
// envelope from (see fake-cloudflare.mjs's sendSuccess call site), not the wire-exact wrapped
// body, so this test builds the envelope by hand around a fixed id rather than reading it from
// Corpus.
func TestVerifyTokenDecodesSuccess(t *testing.T) {
	body := []byte(`{"success":true,"errors":[],"result":{"id":"00000000000000000000000000000001","status":"active"}}`)
	cf := NewCloudflare("acct123", Credential{}, fixtureRoundTripper{status: http.StatusOK, body: body})

	id, err := cf.VerifyToken(context.Background())
	if err != nil {
		t.Fatalf("VerifyToken: %v", err)
	}
	if id != "00000000000000000000000000000001" {
		t.Errorf("id = %q, want the fixed token id", id)
	}
}

// TestNewCloudflareRefusesMismatchedHost asserts the RoundTripper is the client's only test
// seam: a request this client builds always targets cloudflareHost, so even a RoundTripper that
// would happily serve any host never sees a request for a different one.
func TestNewCloudflareRefusesMismatchedHost(t *testing.T) {
	cf := NewCloudflare("acct123", Credential{}, fixtureRoundTripper{status: http.StatusOK, body: []byte(`{}`)})
	if cf.client.host != cloudflareHost {
		t.Errorf("client.host = %q, want %q", cf.client.host, cloudflareHost)
	}
}

// pagedRoundTripper serves a fixed body per "page" query parameter value, standing in for a
// Cloudflare list route that paginates over more than one page.
type pagedRoundTripper struct {
	pages map[string][]byte
}

func (rt pagedRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	body, ok := rt.pages[req.URL.Query().Get("page")]
	if !ok {
		body = []byte(`{"success":false,"errors":[{"code":9999,"message":"unexpected page requested"}]}`)
	}
	return &http.Response{
		StatusCode: http.StatusOK,
		Body:       io.NopCloser(bytes.NewReader(body)),
		Header:     make(http.Header),
		Request:    req,
	}, nil
}

// TestListWorkersFollowsPagination asserts getPaginated (routed through ListWorkers) reads a
// second page when the first page's result_info reports more than one total_pages, and stops
// once it reaches the last page, concatenating both pages' results.
func TestListWorkersFollowsPagination(t *testing.T) {
	rt := pagedRoundTripper{pages: map[string][]byte{
		"1": []byte(`{"success":true,"errors":[],"result":[{"id":"one","tag":"t1"}],"result_info":{"page":1,"total_pages":2}}`),
		"2": []byte(`{"success":true,"errors":[],"result":[{"id":"two","tag":"t2"}],"result_info":{"page":2,"total_pages":2}}`),
	}}
	cf := NewCloudflare("acct123", Credential{}, rt)

	workers, err := cf.ListWorkers(context.Background())
	if err != nil {
		t.Fatalf("ListWorkers: %v", err)
	}
	if len(workers) != 2 {
		t.Fatalf("ListWorkers: got %d workers, want 2", len(workers))
	}
	if workers[0].Name != "one" || workers[1].Name != "two" {
		t.Errorf("ListWorkers: got %+v, want [one two]", workers)
	}
}

// TestListZonesDecodesEveryPage asserts ListZones returns each zone's id and name, the pair
// Worker discovery joins a custom domain's zone_id against.
func TestListZonesDecodesEveryPage(t *testing.T) {
	body := []byte(`{"success":true,"result":[{"id":"zone-1","name":"ecxc.ski","status":"active"},{"id":"zone-2","name":"907.life","status":"pending"}],"result_info":{"page":1,"total_pages":1}}`)
	cf := NewCloudflare("account-id", NewCredential("token"), fixtureRoundTripper{status: http.StatusOK, body: body})

	zones, err := cf.ListZones(context.Background())
	if err != nil {
		t.Fatalf("ListZones: %v", err)
	}
	want := []Zone{
		{ID: "zone-1", Name: "ecxc.ski", Status: "active"},
		{ID: "zone-2", Name: "907.life", Status: "pending"},
	}
	if len(zones) != len(want) {
		t.Fatalf("ListZones returned %d zones, want %d", len(zones), len(want))
	}
	for i := range want {
		if !reflect.DeepEqual(zones[i], want[i]) {
			t.Errorf("zone %d = %+v, want %+v", i, zones[i], want[i])
		}
	}
}

// TestBuildsTokensSucceedsWithNoWorkerTag asserts BuildsTokens confirms Workers Builds
// Configuration read access with no worker tag in the request path, unlike BuildsConnections and
// BuildsLatest.
func TestBuildsTokensSucceedsWithNoWorkerTag(t *testing.T) {
	body := []byte(`{"success":true,"errors":[],"result":[]}`)
	cf := NewCloudflare("acct123", Credential{}, fixtureRoundTripper{status: http.StatusOK, body: body})

	if err := cf.BuildsTokens(context.Background()); err != nil {
		t.Fatalf("BuildsTokens: %v", err)
	}
}

// TestBuildsTokensClassifiesFailure asserts a rejected token still reaches BuildsTokens' caller
// as a classified *APIError, the same as every other read route.
func TestBuildsTokensClassifiesFailure(t *testing.T) {
	body := []byte(`{"success":false,"errors":[{"code":10000,"message":"Invalid API Token"}]}`)
	cf := NewCloudflare("acct123", Credential{}, fixtureRoundTripper{status: http.StatusUnauthorized, body: body})

	err := cf.BuildsTokens(context.Background())
	var apiErr *APIError
	if !errors.As(err, &apiErr) {
		t.Fatalf("BuildsTokens: got %v, want an *APIError", err)
	}
	if apiErr.Reason != ReasonUnauthorized {
		t.Errorf("Reason = %v, want %v", apiErr.Reason, ReasonUnauthorized)
	}
}

// TestDNSRecordsDecodesEveryPage asserts DNSRecords returns each record's name and type,
// following the route's own result_info like every other paginated list.
func TestDNSRecordsDecodesEveryPage(t *testing.T) {
	body := []byte(`{"success":true,"result":[{"name":"ecxc.ski","type":"A"},{"name":"www.ecxc.ski","type":"CNAME"}],"result_info":{"page":1,"total_pages":1}}`)
	cf := NewCloudflare("account-id", NewCredential("token"), fixtureRoundTripper{status: http.StatusOK, body: body})

	records, err := cf.DNSRecords(context.Background(), "zone-1")
	if err != nil {
		t.Fatalf("DNSRecords: %v", err)
	}
	want := []DNSRecord{
		{Name: "ecxc.ski", Type: "A"},
		{Name: "www.ecxc.ski", Type: "CNAME"},
	}
	if len(records) != len(want) {
		t.Fatalf("DNSRecords returned %d records, want %d", len(records), len(want))
	}
	for i := range want {
		if records[i] != want[i] {
			t.Errorf("record %d = %+v, want %+v", i, records[i], want[i])
		}
	}
}
