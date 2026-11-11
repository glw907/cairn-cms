package providers

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"slices"
	"strings"

	"golang.org/x/crypto/nacl/box"
)

// DeploySecretName is the Actions secret the setup writes the Cloudflare deploy token into. The
// generated deploy workflow reads the same name through secrets.<name>, so both sides take it
// from this one constant.
const DeploySecretName = "CLOUDFLARE_API_TOKEN"

// pageSize is the per_page every paged GitHub listing in this file asks for, GitHub's maximum.
const pageSize = 100

// maxPages bounds a paged walk so a server that never returns a short page cannot loop forever.
const maxPages = 50

// ErrRepoNameTaken reports that GitHub refused a repository name as already used on the account
// (a 422 whose errors name the "name" field). The runner takes the next suffix on it.
var ErrRepoNameTaken = errors.New("github: repository name is already taken")

// nameTakenError is the *GitHubError CreateRepo returns for a taken name, matching
// ErrRepoNameTaken through errors.Is while still unwrapping to the classified response.
type nameTakenError struct{ *GitHubError }

// Is reports a match for ErrRepoNameTaken.
func (e *nameTakenError) Is(target error) bool { return target == ErrRepoNameTaken }

// Unwrap exposes the underlying *GitHubError to errors.As.
func (e *nameTakenError) Unwrap() error { return e.GitHubError }

// rawSend performs a request with a JSON body (nil for none) through c and returns the raw
// status, headers, and body with no classification, the write-side counterpart of rawGet. A
// request is re-sent only when no connection was made or it is read-only, so a POST, PUT, or
// DELETE that reached GitHub and came back rate-limited is returned as-is.
func (c *client) rawSend(ctx context.Context, method, target, accept string, body any) (int, http.Header, []byte, error) {
	var reader io.Reader
	if body != nil {
		encoded, err := json.Marshal(body)
		if err != nil {
			return 0, nil, nil, fmt.Errorf("providers: encode request body: %w", err)
		}
		reader = bytes.NewReader(encoded)
	}
	reqCtx, cancel := context.WithTimeout(ctx, requestTimeout)
	defer cancel()
	req, err := http.NewRequestWithContext(reqCtx, method, target, reader)
	if err != nil {
		return 0, nil, nil, fmt.Errorf("providers: build request for %s: %w", target, err)
	}
	if reader != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	req.Header.Set("Accept", accept)
	req.Header.Set("User-Agent", userAgent())

	resp, err := c.Do(req)
	if err != nil {
		return 0, nil, nil, err
	}
	defer func() { _ = resp.Body.Close() }()
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, nil, nil, fmt.Errorf("providers: read response body: %w", err)
	}
	return resp.StatusCode, resp.Header, data, nil
}

// githubFailure classifies a non-2xx GitHub response into a *GitHubError carrying the API's
// message and the status, the same shape getJSON returns for a read.
func githubFailure(method, path string, status int, header http.Header, data []byte) *GitHubError {
	var body struct {
		Message string `json:"message"`
	}
	_ = json.Unmarshal(data, &body)
	path, _, _ = strings.Cut(path, "?")
	return &GitHubError{Status: status, Message: body.Message, Reason: reasonForStatus(status, header), Method: method, Path: path}
}

// githubDecode turns a raw response into out (when non-nil) for a 2xx status, or a *GitHubError
// for anything else. A 2xx body that is empty or JSON null decodes to nothing.
func githubDecode(method, path string, status int, header http.Header, data []byte, out any) error {
	if isErrorStatus(status) {
		return githubFailure(method, path, status, header, data)
	}
	if out == nil || len(bytes.TrimSpace(data)) == 0 {
		return nil
	}
	if err := json.Unmarshal(data, out); err != nil {
		return fmt.Errorf("providers: decode github response: %w", err)
	}
	return nil
}

// call sends one api.github.com request and decodes a 2xx reply into out.
func (gh *GitHub) call(ctx context.Context, method, path string, body, out any) error {
	status, header, data, err := gh.client.rawSend(ctx, method, githubBase+path, githubAccept, body)
	if err != nil {
		return err
	}
	return githubDecode(method, path, status, header, data, out)
}

// Repository is the part of a repository record setup reads back.
type Repository struct {
	ID       int64  `json:"id"`
	Name     string `json:"name"`
	FullName string `json:"full_name"`
	Owner    struct {
		Login string `json:"login"`
		ID    int64  `json:"id"`
	} `json:"owner"`
	// DefaultBranch is the branch GitHub names the default. An empty repository has no branch
	// yet, and the first push creates this one.
	DefaultBranch string `json:"default_branch"`
	// Private reports a repository only its owner and collaborators can see; a response that
	// leaves the field off reads as not private.
	Private bool `json:"private"`
}

// fieldError is one entry of GitHub's 422 "errors" array.
type fieldError struct {
	Field string `json:"field"`
}

func namesNameField(e fieldError) bool { return e.Field == "name" }

// CreateRepo creates a private, empty repository on the authenticated user's account through POST
// /user/repos, so the credential must be the user token. A 422 that names the "name" field
// returns an error matching ErrRepoNameTaken, which the runner answers by taking the next suffix.
func (gh *GitHub) CreateRepo(ctx context.Context, name string) (Repository, error) {
	req := struct {
		Name     string `json:"name"`
		Private  bool   `json:"private"`
		AutoInit bool   `json:"auto_init"`
	}{Name: name, Private: true}
	status, header, data, err := gh.client.rawSend(ctx, http.MethodPost, githubBase+"/user/repos", githubAccept, req)
	if err != nil {
		return Repository{}, err
	}
	if status == http.StatusUnprocessableEntity {
		var body struct {
			Errors []fieldError `json:"errors"`
		}
		_ = json.Unmarshal(data, &body)
		if slices.ContainsFunc(body.Errors, namesNameField) {
			return Repository{}, &nameTakenError{githubFailure(http.MethodPost, "/user/repos", status, header, data)}
		}
	}
	var repo Repository
	if err := githubDecode(http.MethodPost, "/user/repos", status, header, data, &repo); err != nil {
		return Repository{}, err
	}
	return repo, nil
}

// RepoNamed reads owner/name through GET /repos/{owner}/{repo}. A repository that does not
// exist, or that the credential cannot see, returns nil and no error.
func (gh *GitHub) RepoNamed(ctx context.Context, owner, name string) (*Repository, error) {
	var repo Repository
	err := gh.getJSON(ctx, "/repos/"+url.PathEscape(owner)+"/"+url.PathEscape(name), &repo)
	if ge, ok := errors.AsType[*GitHubError](err); ok && ge.Status == http.StatusNotFound {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &repo, nil
}

// SealSecret encrypts value for GitHub's Actions secrets API: a libsodium sealed box to
// publicKey, the repository public key as GitHub serves it (base64 of 32 bytes). The result is
// the base64 encrypted_value the PUT carries.
func SealSecret(publicKey, value string) (string, error) {
	raw, err := base64.StdEncoding.DecodeString(publicKey)
	if err != nil {
		return "", fmt.Errorf("providers: decode repository public key: %w", err)
	}
	if len(raw) != 32 {
		return "", fmt.Errorf("providers: repository public key is %d bytes, want 32", len(raw))
	}
	var pub [32]byte
	copy(pub[:], raw)
	sealed, err := box.SealAnonymous(nil, []byte(value), &pub, rand.Reader)
	if err != nil {
		return "", fmt.Errorf("providers: seal secret: %w", err)
	}
	return base64.StdEncoding.EncodeToString(sealed), nil
}

// SetActionsSecret stores value as the Actions secret name of owner/repo: it reads the
// repository's public key, seals value to it, and PUTs the sealed value with the key id. The
// value is never logged or echoed in an error.
func (gh *GitHub) SetActionsSecret(ctx context.Context, owner, repo, name, value string) error {
	base := fmt.Sprintf("/repos/%s/%s/actions/secrets", url.PathEscape(owner), url.PathEscape(repo))
	var key struct {
		KeyID string `json:"key_id"`
		Key   string `json:"key"`
	}
	if err := gh.getJSON(ctx, base+"/public-key", &key); err != nil {
		return err
	}
	sealed, err := SealSecret(key.Key, value)
	if err != nil {
		return err
	}
	put := struct {
		EncryptedValue string `json:"encrypted_value"`
		KeyID          string `json:"key_id"`
	}{EncryptedValue: sealed, KeyID: key.KeyID}
	return gh.call(ctx, http.MethodPut, base+"/"+url.PathEscape(name), put, nil)
}

// InstallationRepositories returns the ids of every repository the calling installation can
// reach, through GET /installation/repositories walked in pages of 100. The credential must be
// that installation's token, which is how a resumed run checks an installation the App JWT
// alone cannot list the repositories of.
func (gh *GitHub) InstallationRepositories(ctx context.Context) ([]int64, error) {
	var ids []int64
	for page := 1; page <= maxPages; page++ {
		var out struct {
			Repositories []struct {
				ID int64 `json:"id"`
			} `json:"repositories"`
		}
		if err := gh.getJSON(ctx, fmt.Sprintf("/installation/repositories?per_page=%d&page=%d", pageSize, page), &out); err != nil {
			return nil, err
		}
		for _, r := range out.Repositories {
			ids = append(ids, r.ID)
		}
		if len(out.Repositories) < pageSize {
			break
		}
	}
	return ids, nil
}

// WorkflowRun is the state of one Actions run, the facts setup reports for a pushed commit.
type WorkflowRun struct {
	// Status is "queued", "in_progress", or "completed".
	Status string
	// Conclusion is empty until Status is "completed".
	Conclusion string
	// URL is the run's page on github.com.
	URL string
}

// WorkflowRunForCommit reads the newest Actions run for the commit sha through GET
// /repos/{owner}/{repo}/actions/runs?head_sha=, which needs the Actions read permission. It
// reports found false when no run exists yet, since a run starts a moment after the push.
func (gh *GitHub) WorkflowRunForCommit(ctx context.Context, owner, repo, sha string) (run WorkflowRun, found bool, err error) {
	var list struct {
		Runs []struct {
			Status     string  `json:"status"`
			Conclusion *string `json:"conclusion"`
			HTMLURL    string  `json:"html_url"`
		} `json:"workflow_runs"`
	}
	path := fmt.Sprintf("/repos/%s/%s/actions/runs?head_sha=%s&per_page=1", url.PathEscape(owner), url.PathEscape(repo), url.QueryEscape(sha))
	if err := gh.getJSON(ctx, path, &list); err != nil {
		return WorkflowRun{}, false, err
	}
	if len(list.Runs) == 0 {
		return WorkflowRun{}, false, nil
	}
	newest := list.Runs[0]
	run = WorkflowRun{Status: newest.Status, URL: newest.HTMLURL}
	if newest.Conclusion != nil {
		run.Conclusion = *newest.Conclusion
	}
	return run, true, nil
}
