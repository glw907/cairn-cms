package health

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/providers"
	"github.com/glw907/cairn-cms/tool/internal/record"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// publishBranch is one branch entry a publishGHRoundTripper's fake branch list answers with.
type publishBranch struct {
	name string
	sha  string
	date time.Time
}

// publishGHRoundTripper stands in for GitHub across one publishPathCheck run: the branch list,
// each branch's own commit lookup, and the bot-commit query.
type publishGHRoundTripper struct {
	// branches is the repository's full branch list. A nil slice answers with an empty list.
	branches []publishBranch
	// botCommitAt is the date LatestBotCommit reports, or the zero time to answer with none.
	botCommitAt time.Time
	// status, when non-zero, is returned for every request instead of a real answer, standing in
	// for an API failure.
	status int
}

func (rt publishGHRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	if rt.status != 0 {
		return &http.Response{StatusCode: rt.status, Body: io.NopCloser(bytes.NewReader([]byte(`{"message":"nope"}`))), Header: make(http.Header), Request: req}, nil
	}

	path := req.URL.Path
	switch {
	case strings.HasSuffix(path, "/branches"):
		type ref struct {
			Name   string `json:"name"`
			Commit struct {
				SHA string `json:"sha"`
			} `json:"commit"`
		}
		var refs []ref
		for _, b := range rt.branches {
			var r ref
			r.Name = b.name
			r.Commit.SHA = b.sha
			refs = append(refs, r)
		}
		data, _ := json.Marshal(refs)
		return jsonResponse(req, data), nil
	case strings.HasSuffix(path, "/commits") && req.URL.Query().Get("committer") != "":
		type commit struct {
			Commit struct {
				Committer struct {
					Date time.Time `json:"date"`
				} `json:"committer"`
			} `json:"commit"`
		}
		var commits []commit
		if !rt.botCommitAt.IsZero() {
			var c commit
			c.Commit.Committer.Date = rt.botCommitAt
			commits = append(commits, c)
		}
		data, _ := json.Marshal(commits)
		return jsonResponse(req, data), nil
	case strings.Contains(path, "/commits/"):
		sha := path[strings.LastIndex(path, "/")+1:]
		for _, b := range rt.branches {
			if b.sha != sha {
				continue
			}
			body := fmt.Sprintf(`{"author":{"login":"editor"},"commit":{"committer":{"date":%q}}}`, b.date.Format(time.RFC3339))
			return jsonResponse(req, []byte(body)), nil
		}
		return &http.Response{StatusCode: http.StatusNotFound, Body: io.NopCloser(bytes.NewReader([]byte(`{}`))), Header: make(http.Header), Request: req}, nil
	}
	return &http.Response{StatusCode: http.StatusNotFound, Body: io.NopCloser(bytes.NewReader([]byte(`{}`))), Header: make(http.Header), Request: req}, nil
}

// jsonResponse builds a 200 response carrying data as its body.
func jsonResponse(req *http.Request, data []byte) *http.Response {
	return &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(bytes.NewReader(data)), Header: make(http.Header), Request: req}
}

// publishRecord returns the record every publishPathCheck test runs against.
func publishRecord() record.Record {
	return record.Record{GitHub: record.GitHub{Repo: record.GitHubRepo{Owner: "acme", Repo: "site", DefaultBranch: "main"}}}
}

// publishClients builds the Clients a publishPathCheck test runs against.
func publishClients(rt publishGHRoundTripper) Clients {
	return Clients{GH: ghClient(rt), HaveGH: true}
}

// publishOptions returns the Options a publishPathCheck test sweeps with: the package's fixed
// clock, which every branch date in this file is dated relative to, so no age depends on when the
// test runs.
func publishOptions() Options {
	return Options{ErrorThreshold: 1, LogWindow: time.Minute, Now: fixedNow}
}

func TestPublishPathCheckDeclaresIDAndTierGH(t *testing.T) {
	c := publishPathCheck{}
	if got := c.ID(); got != "publish-path" {
		t.Errorf("ID() = %q, want %q", got, "publish-path")
	}
	if got := c.Needs(); got != TierGH {
		t.Errorf("Needs() = %v, want TierGH", got)
	}
}

func TestPublishPathCheckNoDataIsUnknownNotObservable(t *testing.T) {
	c := publishClients(publishGHRoundTripper{})
	got := (publishPathCheck{}).Run(context.Background(), publishRecord(), c, publishOptions())
	if got.State != spine.Unknown || got.Reason != spine.ReasonNotObservable {
		t.Errorf("Outcome = %+v, want Unknown/reason.not-observable", got)
	}
}

func TestPublishPathCheckStaleBranchNoBotCommitIsFailing(t *testing.T) {
	old := fixedNow().Add(-20 * 24 * time.Hour)
	rt := publishGHRoundTripper{branches: []publishBranch{{name: "cairn/posts/abc", sha: "sha1", date: old}}}
	c := publishClients(rt)
	got := (publishPathCheck{}).Run(context.Background(), publishRecord(), c, publishOptions())
	if got.State != spine.Failing {
		t.Errorf("State = %v, want Failing", got.State)
	}
}

func TestPublishPathCheckStaleBranchWithEarlierBotCommitIsFailing(t *testing.T) {
	old := fixedNow().Add(-20 * 24 * time.Hour)
	earlierBot := old.Add(-24 * time.Hour)
	rt := publishGHRoundTripper{
		branches:    []publishBranch{{name: "cairn/posts/abc", sha: "sha1", date: old}},
		botCommitAt: earlierBot,
	}
	c := publishClients(rt)
	got := (publishPathCheck{}).Run(context.Background(), publishRecord(), c, publishOptions())
	if got.State != spine.Failing {
		t.Errorf("State = %v, want Failing (bot commit predates the stale branch)", got.State)
	}
}

func TestPublishPathCheckStaleBranchWithLaterBotCommitIsOK(t *testing.T) {
	old := fixedNow().Add(-20 * 24 * time.Hour)
	laterBot := old.Add(24 * time.Hour)
	rt := publishGHRoundTripper{
		branches:    []publishBranch{{name: "cairn/posts/abc", sha: "sha1", date: old}},
		botCommitAt: laterBot,
	}
	c := publishClients(rt)
	got := (publishPathCheck{}).Run(context.Background(), publishRecord(), c, publishOptions())
	if got.State != spine.OK {
		t.Errorf("State = %v, want OK (a later bot commit supersedes the stale branch)", got.State)
	}
}

func TestPublishPathCheckFreshBranchIsOK(t *testing.T) {
	recent := fixedNow().Add(-2 * 24 * time.Hour)
	rt := publishGHRoundTripper{branches: []publishBranch{{name: "cairn/posts/abc", sha: "sha1", date: recent}}}
	c := publishClients(rt)
	got := (publishPathCheck{}).Run(context.Background(), publishRecord(), c, publishOptions())
	if got.State != spine.OK {
		t.Errorf("State = %v, want OK", got.State)
	}
}

// TestPublishPathCheckAPIForbiddenIsUnknownNotOK asserts a plain 403 (no rate-limit headers)
// settles Unknown rather than OK, so a mis-scoped token is visible in the report rather than
// silently read as a healthy publish path.
func TestPublishPathCheckAPIForbiddenIsUnknownNotOK(t *testing.T) {
	rt := publishGHRoundTripper{status: http.StatusForbidden}
	c := publishClients(rt)
	got := (publishPathCheck{}).Run(context.Background(), publishRecord(), c, publishOptions())
	if got.State != spine.Unknown {
		t.Errorf("State = %v, want Unknown", got.State)
	}
}

// TestPublishPathCheckAPIRateLimitedIsUnknownNeverFailing asserts a 403 carrying
// x-ratelimit-remaining: 0 classifies as rate-limited and settles Unknown, never Failing: a
// throttled tool is not a broken publish path, and misreading it as one would page an operator
// for a fault they cannot fix.
func TestPublishPathCheckAPIRateLimitedIsUnknownNeverFailing(t *testing.T) {
	rt := rateLimitedRoundTripper{}
	c := Clients{GH: ghClient(rt), HaveGH: true}
	got := (publishPathCheck{}).Run(context.Background(), publishRecord(), c, publishOptions())
	if got.State != spine.Unknown {
		t.Errorf("State = %v, want Unknown", got.State)
	}
	want := spine.APIReason(providers.ReasonRateLimited)
	if got.Reason != want {
		t.Errorf("Reason = %q, want %q", got.Reason, want)
	}
}

func TestPublishPathCheckFieldsCarryBranchCountAndAges(t *testing.T) {
	old := fixedNow().Add(-20 * 24 * time.Hour)
	laterBot := old.Add(24 * time.Hour)
	rt := publishGHRoundTripper{
		branches:    []publishBranch{{name: "cairn/posts/abc", sha: "sha1", date: old}},
		botCommitAt: laterBot,
	}
	c := publishClients(rt)
	got := (publishPathCheck{}).Run(context.Background(), publishRecord(), c, publishOptions())

	if count := fieldInt(t, got.Fields, "openBranchCount"); count != 1 {
		t.Errorf("openBranchCount field = %d, want 1", count)
	}
	var ages int
	for _, f := range got.Fields {
		if f.Key == "branchAgeDays" {
			ages++
		}
	}
	if ages != 1 {
		t.Errorf("got %d branchAgeDays fields, want 1", ages)
	}
}

// rateLimitedRoundTripper answers every request with a 403 carrying x-ratelimit-remaining: 0,
// the header GitHub sets on an exhausted primary rate limit.
type rateLimitedRoundTripper struct{}

func (rateLimitedRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	header := make(http.Header)
	header.Set("x-ratelimit-remaining", "0")
	return &http.Response{StatusCode: http.StatusForbidden, Body: io.NopCloser(bytes.NewReader([]byte(`{"message":"rate limited"}`))), Header: header, Request: req}, nil
}

// fieldInt decodes fields' entry named key as an int, failing the test if none exists.
func fieldInt(t *testing.T, fields []spine.OutcomeField, key string) int {
	t.Helper()
	for _, f := range fields {
		if f.Key != key {
			continue
		}
		var v int
		if err := json.Unmarshal(f.Value, &v); err != nil {
			t.Fatalf("unmarshal field %q: %v", key, err)
		}
		return v
	}
	t.Fatalf("no field named %q", key)
	return 0
}
