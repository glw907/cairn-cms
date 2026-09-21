package providers

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/version"
)

// githubHost is the only host a GitHub client will ever send a request to. There is no base-URL
// variable and no environment override; the RoundTripper passed to NewGitHub is this client's
// only test seam, the same rule cloudflare.go states for its own host pin.
const githubHost = "api.github.com"

// githubBase is githubHost's REST root, prefixed onto every request this client sends.
const githubBase = "https://" + githubHost

// botLogin is the GitHub account name the CMS's own commits carry, the committer login
// LatestBotCommit filters by.
const botLogin = "cairn-cms[bot]"

// githubExpiryHeader is the header a fine-grained personal access token's response carries; the
// classic and OAuth token forms never set it, which is why TokenExpiry treats its absence as
// unknown rather than as "does not expire".
const githubExpiryHeader = "github-authentication-token-expiration"

// githubExpiryLayout is githubExpiryHeader's wire format, documented by GitHub as a plain UTC
// timestamp rather than RFC 3339.
const githubExpiryLayout = "2006-01-02 15:04:05 MST"

// GitHub is the tool's read-only GitHub REST client: the calls the health checks need to read a
// site's branches, publish commits, and package manifest.
type GitHub struct {
	client *client
}

// NewGitHub returns a GitHub client authenticating with cred and sending every request through
// rt. A zero Credential sends no Authorization header, which is how the probe verifies an
// anonymous rate limit before a real token is minted.
func NewGitHub(cred Credential, rt http.RoundTripper) *GitHub {
	return &GitHub{client: newClient(githubHost, cred, rt)}
}

// GitHubError reports a GitHub REST call that did not return 2xx. Reason is what a health check
// branches on; Message is the API's own "message" field, useful only for a verbose log line.
type GitHubError struct {
	Status  int
	Message string
	Reason  Reason
}

// Error implements the error interface.
func (e *GitHubError) Error() string {
	return fmt.Sprintf("github: %s (status %d)", e.Reason, e.Status)
}

// ClassifiedReason implements ProviderError.
func (e *GitHubError) ClassifiedReason() Reason { return e.Reason }

// HTTPStatus implements ProviderError.
func (e *GitHubError) HTTPStatus() int { return e.Status }

// githubAccept is the media type every GitHub request in this file asks for.
const githubAccept = "application/vnd.github+json"

// get performs a GET against path (resolved against githubBase) through the one GET helper
// transport.go shares with npm.go, and returns the raw status, response headers, and body with
// no classification: getJSON is the caller that turns a non-2xx status into a *GitHubError.
func (gh *GitHub) get(ctx context.Context, path string) (int, http.Header, []byte, error) {
	return gh.client.getWith(ctx, githubBase, path, githubAccept)
}

// getJSON performs a GET like get, decoding a 2xx body into out, or returning a *GitHubError
// classified by reasonForStatus for anything else.
func (gh *GitHub) getJSON(ctx context.Context, path string, out any) error {
	status, header, data, err := gh.get(ctx, path)
	if err != nil {
		return err
	}
	if status < 200 || status >= 300 {
		var body struct {
			Message string `json:"message"`
		}
		_ = json.Unmarshal(data, &body)
		return &GitHubError{Status: status, Message: body.Message, Reason: reasonForStatus(status, header)}
	}
	if out == nil {
		return nil
	}
	if err := json.Unmarshal(data, out); err != nil {
		return fmt.Errorf("providers: decode github response: %w", err)
	}
	return nil
}

// HeadSHA returns the commit sha ref currently resolves to (typically "main"), via GET
// /repos/{owner}/{repo}/commits/{ref}.
func (gh *GitHub) HeadSHA(ctx context.Context, owner, repo, ref string) (string, error) {
	var commit struct {
		SHA string `json:"sha"`
	}
	path := fmt.Sprintf("/repos/%s/%s/commits/%s", owner, repo, ref)
	if err := gh.getJSON(ctx, path, &commit); err != nil {
		return "", err
	}
	return commit.SHA, nil
}

// FileAtRef returns the raw bytes of path in owner/repo as of ref, decoding the Contents API's
// base64 envelope.
func (gh *GitHub) FileAtRef(ctx context.Context, owner, repo, path, ref string) ([]byte, error) {
	var result struct {
		Content  string `json:"content"`
		Encoding string `json:"encoding"`
	}
	apiPath := fmt.Sprintf("/repos/%s/%s/contents/%s?ref=%s", owner, repo, path, url.QueryEscape(ref))
	if err := gh.getJSON(ctx, apiPath, &result); err != nil {
		return nil, err
	}
	if result.Encoding != "base64" {
		return nil, fmt.Errorf("providers: unexpected content encoding %q for %s", result.Encoding, path)
	}
	decoded, err := base64.StdEncoding.DecodeString(strings.ReplaceAll(result.Content, "\n", ""))
	if err != nil {
		return nil, fmt.Errorf("providers: decode base64 content for %s: %w", path, err)
	}
	return decoded, nil
}

// RepoOwnership reports whether owner/repo is private, via GET /repos/{owner}/{repo}. A public
// repository answers this route with no token at all, so a 200 here proves nothing about a
// token's own permissions; probe-token uses the result to warn an operator whose verification
// set carries no private repository that the token's scope stays unconfirmed.
func (gh *GitHub) RepoOwnership(ctx context.Context, owner, repo string) (private bool, err error) {
	var raw map[string]json.RawMessage
	path := fmt.Sprintf("/repos/%s/%s", owner, repo)
	if err := gh.getJSON(ctx, path, &raw); err != nil {
		return false, err
	}
	rawPrivate, ok := raw["private"]
	if !ok {
		return false, fmt.Errorf("providers: response carries no private field for %s/%s", owner, repo)
	}
	if err := json.Unmarshal(rawPrivate, &private); err != nil {
		return false, fmt.Errorf("providers: decode private field for %s/%s: %w", owner, repo, err)
	}
	return private, nil
}

// Branch names one branch of a repository, with the last commit's date and the login of the
// GitHub account that authored it, the two facts the publish-path check ages a "cairn/*" branch
// by.
type Branch struct {
	Name        string
	CommitDate  time.Time
	AuthorLogin string
}

// Branches returns every branch of owner/repo, up to GitHub's own 100-per-page maximum. 1.0's
// checks read a site repository, which the spec expects to carry at most a handful of open
// "cairn/*" branches at once, so a single page is sufficient; a repository with more branches
// than that is a 2.0 concern.
func (gh *GitHub) Branches(ctx context.Context, owner, repo string) ([]Branch, error) {
	var refs []struct {
		Name   string `json:"name"`
		Commit struct {
			SHA string `json:"sha"`
		} `json:"commit"`
	}
	path := fmt.Sprintf("/repos/%s/%s/branches?per_page=100", owner, repo)
	if err := gh.getJSON(ctx, path, &refs); err != nil {
		return nil, err
	}

	branches := make([]Branch, 0, len(refs))
	for _, ref := range refs {
		var commit struct {
			Author *struct {
				Login string `json:"login"`
			} `json:"author"`
			Commit struct {
				Committer struct {
					Date time.Time `json:"date"`
				} `json:"committer"`
			} `json:"commit"`
		}
		commitPath := fmt.Sprintf("/repos/%s/%s/commits/%s", owner, repo, ref.Commit.SHA)
		if err := gh.getJSON(ctx, commitPath, &commit); err != nil {
			return nil, err
		}
		var login string
		if commit.Author != nil {
			login = commit.Author.Login
		}
		branches = append(branches, Branch{Name: ref.Name, CommitDate: commit.Commit.Committer.Date, AuthorLogin: login})
	}
	return branches, nil
}

// LatestBotCommit returns the commit date of the newest commit botLogin committed on branch, or
// the zero time with no error when it has none. The engine sets the committer to the App and the
// author to the editor, so this filters by committer rather than author.
func (gh *GitHub) LatestBotCommit(ctx context.Context, owner, repo, branch string) (time.Time, error) {
	var commits []struct {
		Commit struct {
			Committer struct {
				Date time.Time `json:"date"`
			} `json:"committer"`
		} `json:"commit"`
	}
	path := fmt.Sprintf("/repos/%s/%s/commits?sha=%s&committer=%s&per_page=1", owner, repo, url.QueryEscape(branch), url.QueryEscape(botLogin))
	if err := gh.getJSON(ctx, path, &commits); err != nil {
		return time.Time{}, err
	}
	if len(commits) == 0 {
		return time.Time{}, nil
	}
	return commits[0].Commit.Committer.Date, nil
}

// TokenExpiry reads githubExpiryHeader off a lightweight authenticated request, returning the
// zero time with no error when it is absent. A classic PAT, an OAuth token, and a non-expiring
// fine-grained PAT all omit the header, and GitHub gives a caller no way to tell those three
// apart, so the zero value means only "GitHub reported no expiry for this token": a caller must
// never read it as a date, and must not treat it as an unknown or unreadable expiry either.
func (gh *GitHub) TokenExpiry(ctx context.Context) (time.Time, error) {
	_, header, _, err := gh.get(ctx, "/rate_limit")
	if err != nil {
		return time.Time{}, err
	}

	value := header.Get(githubExpiryHeader)
	if value == "" {
		return time.Time{}, nil
	}
	t, err := time.Parse(githubExpiryLayout, value)
	if err != nil {
		return time.Time{}, fmt.Errorf("providers: parse %s header %q: %w", githubExpiryHeader, value, err)
	}
	return t, nil
}

// userAgent is the User-Agent every request this package sends carries, since GitHub's REST API
// rejects a request with none and it is good practice on every host regardless.
func userAgent() string {
	return "cairn-tool/" + version.String()
}
