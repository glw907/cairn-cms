package providers

import (
	"errors"
	"net/http"
	"net/url"
	"testing"
	"time"
)

// TestGitHubReasonMappingFromCorpusFixtures drives HeadSHA and FileAtRef against a client whose
// RoundTripper serves a real captured GitHub error body, for every status the fixture corpus
// carries a generic error body for. GitHub's error shape ({"message": "..."}) does not vary by
// endpoint, so the same three fixtures cover both commits/main and contents/package.json.
func TestGitHubReasonMappingFromCorpusFixtures(t *testing.T) {
	tests := []struct {
		name    string
		fixture string
		want    Reason
	}{
		{"unauthorized", "app_installations.bad-credentials.401.json", ReasonUnauthorized},
		{"forbidden", "installation_link.not-accessible.403.json", ReasonForbidden},
		{"not found", "not_found.default.404.json", ReasonNotFound},
	}
	for _, tt := range tests {
		status, body, err := Corpus("github", tt.fixture)
		if err != nil {
			t.Fatal(err)
		}
		rt := fixtureRoundTripper{status: status, body: body}

		t.Run(tt.name+"/commits main", func(t *testing.T) {
			gh := NewGitHub(Credential{}, rt)
			_, err := gh.HeadSHA("glw907", "ecxc-ski", "main")
			assertGitHubReason(t, err, status, tt.want)
		})
		t.Run(tt.name+"/contents package.json", func(t *testing.T) {
			gh := NewGitHub(Credential{}, rt)
			_, err := gh.FileAtRef("glw907", "ecxc-ski", "package.json", "main")
			assertGitHubReason(t, err, status, tt.want)
		})
	}
}

// assertGitHubReason asserts err is a *GitHubError carrying wantStatus and wantReason.
func assertGitHubReason(t *testing.T, err error, wantStatus int, wantReason Reason) {
	t.Helper()
	var ghErr *GitHubError
	if !errors.As(err, &ghErr) {
		t.Fatalf("err = %v (%T), want *GitHubError", err, err)
	}
	if ghErr.Status != wantStatus {
		t.Errorf("Status = %d, want %d", ghErr.Status, wantStatus)
	}
	if ghErr.Reason != wantReason {
		t.Errorf("Reason = %v, want %v", ghErr.Reason, wantReason)
	}
}

// TestHeadSHADecodesSuccess and TestFileAtRefDecodesSuccess cover the 200 half of the acceptance
// criterion's "commits/main and contents/package.json" pair. The fixture corpus carries no
// success body for either route, since the Node CLI this corpus was extracted from
// (packages/create-cairn-site) never calls GitHub's REST commits or contents endpoints; only its
// lower-level Git Data API. These bodies are therefore hand-built to the real REST shape rather
// than read through Corpus, the same precedent cloudflare_test.go's TestVerifyTokenDecodesSuccess
// sets for a success shape the corpus does not carry.
func TestHeadSHADecodesSuccess(t *testing.T) {
	body := []byte(`{"sha":"a1b2c3d4e5f60718293a4b5c6d7e8f9012345678"}`)
	gh := NewGitHub(Credential{}, fixtureRoundTripper{status: http.StatusOK, body: body})

	sha, err := gh.HeadSHA("glw907", "ecxc-ski", "main")
	if err != nil {
		t.Fatalf("HeadSHA: %v", err)
	}
	if sha != "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678" {
		t.Errorf("sha = %q, want the fixed sha", sha)
	}
}

func TestFileAtRefDecodesSuccess(t *testing.T) {
	body := []byte(`{"content":"eyJuYW1lIjoiZWN4Yy1za2kifQ==\n","encoding":"base64"}`)
	gh := NewGitHub(Credential{}, fixtureRoundTripper{status: http.StatusOK, body: body})

	content, err := gh.FileAtRef("glw907", "ecxc-ski", "package.json", "main")
	if err != nil {
		t.Fatalf("FileAtRef: %v", err)
	}
	if string(content) != `{"name":"ecxc-ski"}` {
		t.Errorf("content = %q, want the decoded base64 payload", content)
	}
}

// branchesRoundTripper serves the branch list on GET .../branches and a per-sha commit body on
// GET .../commits/{sha}, standing in for the two round trips Branches makes per branch.
type branchesRoundTripper struct {
	list    []byte
	commits map[string][]byte
}

func (rt branchesRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	if req.URL.Path == "/repos/glw907/ecxc-ski/branches" {
		return fixtureRoundTripper{status: http.StatusOK, body: rt.list}.RoundTrip(req)
	}
	for sha, body := range rt.commits {
		if req.URL.Path == "/repos/glw907/ecxc-ski/commits/"+sha {
			return fixtureRoundTripper{status: http.StatusOK, body: body}.RoundTrip(req)
		}
	}
	return fixtureRoundTripper{status: http.StatusNotFound, body: []byte(`{"message":"Not Found"}`)}.RoundTrip(req)
}

func TestBranchesJoinsCommitDateAndAuthor(t *testing.T) {
	rt := branchesRoundTripper{
		list: []byte(`[{"name":"cairn/posts/one-abc123","commit":{"sha":"sha1"}}]`),
		commits: map[string][]byte{
			"sha1": []byte(`{"author":{"login":"geoff"},"commit":{"committer":{"date":"2026-09-01T00:00:00Z"}}}`),
		},
	}
	gh := NewGitHub(Credential{}, rt)

	branches, err := gh.Branches("glw907", "ecxc-ski")
	if err != nil {
		t.Fatalf("Branches: %v", err)
	}
	if len(branches) != 1 {
		t.Fatalf("got %d branches, want 1", len(branches))
	}
	want := time.Date(2026, 9, 1, 0, 0, 0, 0, time.UTC)
	if branches[0].Name != "cairn/posts/one-abc123" || branches[0].AuthorLogin != "geoff" || !branches[0].CommitDate.Equal(want) {
		t.Errorf("got %+v, want {Name: cairn/posts/one-abc123 CommitDate: %v AuthorLogin: geoff}", branches[0], want)
	}
}

func TestLatestBotCommitReturnsZeroTimeWhenNone(t *testing.T) {
	gh := NewGitHub(Credential{}, fixtureRoundTripper{status: http.StatusOK, body: []byte(`[]`)})

	when, err := gh.LatestBotCommit("glw907", "ecxc-ski", "main")
	if err != nil {
		t.Fatalf("LatestBotCommit: %v", err)
	}
	if !when.IsZero() {
		t.Errorf("when = %v, want the zero time for no bot commits", when)
	}
}

// TestLatestBotCommitReturnsNewestDate also asserts the request filters by committer rather than
// author: the engine sets the committer to the App and the author to the editor
// (src/lib/github/repo.ts), so an author filter would match no publish commit in production.
func TestLatestBotCommitReturnsNewestDate(t *testing.T) {
	body := []byte(`[{"commit":{"committer":{"date":"2026-09-10T12:00:00Z"}}}]`)
	var gotQuery url.Values
	rt := roundTripFunc(func(req *http.Request) (*http.Response, error) {
		gotQuery = req.URL.Query()
		return fixtureRoundTripper{status: http.StatusOK, body: body}.RoundTrip(req)
	})
	gh := NewGitHub(Credential{}, rt)

	when, err := gh.LatestBotCommit("glw907", "ecxc-ski", "main")
	if err != nil {
		t.Fatalf("LatestBotCommit: %v", err)
	}
	want := time.Date(2026, 9, 10, 12, 0, 0, 0, time.UTC)
	if !when.Equal(want) {
		t.Errorf("when = %v, want %v", when, want)
	}
	if got := gotQuery.Get("committer"); got != "cairn-cms[bot]" {
		t.Errorf("committer query param = %q, want %q", got, "cairn-cms[bot]")
	}
	if gotQuery.Has("author") {
		t.Errorf("author query param present, want none: got %q", gotQuery.Get("author"))
	}
}

// headerRoundTripper serves a fixed status and header set for every request, standing in for the
// /rate_limit response TokenExpiry reads its header off.
type headerRoundTripper struct {
	status int
	header http.Header
}

func (rt headerRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	h := rt.header.Clone()
	if h == nil {
		h = make(http.Header)
	}
	resp, err := fixtureRoundTripper{status: rt.status, body: []byte(`{}`)}.RoundTrip(req)
	if err != nil {
		return nil, err
	}
	resp.Header = h
	return resp, nil
}

func TestTokenExpiryReturnsZeroTimeWhenHeaderAbsent(t *testing.T) {
	gh := NewGitHub(Credential{}, headerRoundTripper{status: http.StatusOK})

	when, err := gh.TokenExpiry()
	if err != nil {
		t.Fatalf("TokenExpiry: %v", err)
	}
	if !when.IsZero() {
		t.Errorf("when = %v, want the zero time when the header is absent (unauthenticated call)", when)
	}
}

func TestRepoOwnershipReportsPrivateAndKeys(t *testing.T) {
	body := []byte(`{"id":1,"full_name":"glw907/xcathletes-org","private":true}`)
	gh := NewGitHub(Credential{}, fixtureRoundTripper{status: http.StatusOK, body: body})

	private, keys, err := gh.RepoOwnership("glw907", "xcathletes-org")
	if err != nil {
		t.Fatalf("RepoOwnership: %v", err)
	}
	if !private {
		t.Error("private = false, want true")
	}
	want := []string{"full_name", "id", "private"}
	if len(keys) != len(want) {
		t.Fatalf("keys = %v, want %v", keys, want)
	}
	for i, k := range want {
		if keys[i] != k {
			t.Errorf("keys[%d] = %q, want %q", i, keys[i], k)
		}
	}
}

func TestRepoOwnershipReportsPublicRepo(t *testing.T) {
	body := []byte(`{"id":2,"full_name":"glw907/cairn-cms","private":false}`)
	gh := NewGitHub(Credential{}, fixtureRoundTripper{status: http.StatusOK, body: body})

	private, _, err := gh.RepoOwnership("glw907", "cairn-cms")
	if err != nil {
		t.Fatalf("RepoOwnership: %v", err)
	}
	if private {
		t.Error("private = true, want false")
	}
}

func TestRepoOwnershipClassifiesNotFound(t *testing.T) {
	status, body, err := Corpus("github", "not_found.default.404.json")
	if err != nil {
		t.Fatal(err)
	}
	gh := NewGitHub(Credential{}, fixtureRoundTripper{status: status, body: body})

	_, _, err = gh.RepoOwnership("glw907", "a-private-repo-this-token-cannot-see")
	assertGitHubReason(t, err, status, ReasonNotFound)
}

func TestTokenExpiryParsesHeader(t *testing.T) {
	h := make(http.Header)
	h.Set(githubExpiryHeader, "2027-01-01 00:00:00 UTC")
	gh := NewGitHub(Credential{}, headerRoundTripper{status: http.StatusOK, header: h})

	when, err := gh.TokenExpiry()
	if err != nil {
		t.Fatalf("TokenExpiry: %v", err)
	}
	want := time.Date(2027, 1, 1, 0, 0, 0, 0, time.UTC)
	if !when.Equal(want) {
		t.Errorf("when = %v, want %v", when, want)
	}
}
