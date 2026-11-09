package providers

import (
	"context"
	"crypto"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"html"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// githubWebHost is the host the App creation form, the install pages, and the OAuth code
// exchange live on. It is a second pinned client beside api.github.com, never a fallback for it.
const githubWebHost = "github.com"

// githubWebBase is githubWebHost's root URL.
const githubWebBase = "https://" + githubWebHost

// manifestNameMax is GitHub's limit on an App name, prefix included.
const manifestNameMax = 34

// engineURL is the homepage and the placeholder webhook URL the manifest carries.
const engineURL = "https://cairn.pub"

// Manifest is the GitHub App manifest the setup posts to GitHub's create-App form. Its field
// order is the wire order, which a test pins against the spec's literal.
type Manifest struct {
	Name                  string            `json:"name"`
	URL                   string            `json:"url"`
	RedirectURL           string            `json:"redirect_url"`
	CallbackURLs          []string          `json:"callback_urls"`
	HookAttributes        ManifestHook      `json:"hook_attributes"`
	RequestOAuthOnInstall bool              `json:"request_oauth_on_install"`
	Public                bool              `json:"public"`
	DefaultPermissions    map[string]string `json:"default_permissions"`
	DefaultEvents         []string          `json:"default_events"`
}

// ManifestHook is the manifest's webhook block. GitHub requires the URL even when the hook is
// inactive, and answers a manifest without it with a generic "no App Manifest" page.
type ManifestHook struct {
	URL    string `json:"url"`
	Active bool   `json:"active"`
}

// NewManifest builds the manifest for a site whose base name is base. The App is named
// "cairn-" plus base, cut to GitHub's 34 characters with no trailing dash. port is the loopback port: the install redirect
// uses the first callback URL verbatim, so that URL carries the real port.
func NewManifest(base string, port int) Manifest {
	name := []rune("cairn-" + base)
	if len(name) > manifestNameMax {
		name = name[:manifestNameMax]
	}
	loopback := "http://127.0.0.1:" + strconv.Itoa(port)
	return Manifest{
		Name:                  strings.TrimRight(string(name), "-"),
		URL:                   engineURL,
		RedirectURL:           loopback + "/github/manifest",
		CallbackURLs:          []string{loopback + "/github/callback"},
		HookAttributes:        ManifestHook{URL: engineURL, Active: false},
		RequestOAuthOnInstall: true,
		Public:                false,
		DefaultPermissions: map[string]string{
			"administration": "write",
			"contents":       "write",
			"metadata":       "read",
			"workflows":      "write",
			"secrets":        "write",
			"actions":        "read",
		},
		DefaultEvents: []string{},
	}
}

// ManifestTarget is the URL the manifest form posts to; state is the run's nonce, which GitHub
// echoes back on the redirect.
func ManifestTarget(state string) string {
	return githubWebBase + "/settings/apps/new?state=" + url.QueryEscape(state)
}

// ManifestFormHTML renders the page that auto-submits m to target, with a visible button as the
// fallback for a browser that blocks the script.
func ManifestFormHTML(m Manifest, target string) (string, error) {
	encoded, err := json.Marshal(m)
	if err != nil {
		return "", fmt.Errorf("providers: encode manifest: %w", err)
	}
	return "<!doctype html>\n" +
		"<html>\n" +
		"<head><meta charset=\"utf-8\"><title>Creating your GitHub App</title></head>\n" +
		"<body>\n" +
		"<form id=\"manifest-form\" action=\"" + html.EscapeString(target) + "\" method=\"post\">\n" +
		"<input type=\"hidden\" name=\"manifest\" value=\"" + html.EscapeString(string(encoded)) + "\">\n" +
		"<button type=\"submit\">Create the GitHub App</button>\n" +
		"</form>\n" +
		"<script>document.getElementById('manifest-form').submit();</script>\n" +
		"</body>\n" +
		"</html>\n", nil
}

// InstallURL is the page where the admin installs the App, built from the slug the conversion
// returned (never from the manifest, since GitHub may adjust the name).
func InstallURL(slug string) string {
	return githubWebBase + "/apps/" + url.PathEscape(slug) + "/installations/new"
}

// PreselectURL is the install page with the target account and one repository already chosen.
func PreselectURL(slug string, userID, repoID int64) string {
	return InstallURL(slug) + "/permissions?suggested_target_id=" + strconv.FormatInt(userID, 10) +
		"&repository_ids[]=" + strconv.FormatInt(repoID, 10)
}

// AppRecord is the App the manifest conversion created. The secrets are Credentials so a stray
// format verb prints a placeholder.
type AppRecord struct {
	ID            int64
	Slug          string
	ClientID      string
	ClientSecret  Credential
	WebhookSecret Credential
	PEM           Credential
	OwnerLogin    string
}

// ConvertManifest trades the one-time code from the manifest redirect for the new App's
// credentials through POST /app-manifests/{code}/conversions. The code is good for an hour and
// the call needs no credential.
func (gh *GitHub) ConvertManifest(ctx context.Context, code string) (AppRecord, error) {
	var out struct {
		ID            int64  `json:"id"`
		Slug          string `json:"slug"`
		ClientID      string `json:"client_id"`
		ClientSecret  string `json:"client_secret"`
		WebhookSecret string `json:"webhook_secret"`
		PEM           string `json:"pem"`
		Owner         struct {
			Login string `json:"login"`
		} `json:"owner"`
	}
	if err := gh.call(ctx, http.MethodPost, "/app-manifests/"+url.PathEscape(code)+"/conversions", nil, &out); err != nil {
		return AppRecord{}, err
	}
	return AppRecord{
		ID:            out.ID,
		Slug:          out.Slug,
		ClientID:      out.ClientID,
		ClientSecret:  NewCredential(out.ClientSecret),
		WebhookSecret: NewCredential(out.WebhookSecret),
		PEM:           NewCredential(out.PEM),
		OwnerLogin:    out.Owner.Login,
	}, nil
}

// AppJWT signs the RS256 token an App presents to act as itself: iat is one minute before now
// to absorb clock skew, exp nine minutes after (GitHub's ceiling is ten). pemKey is the PKCS#1
// or PKCS#8 private key the conversion returned.
func AppJWT(appID int64, pemKey Credential, now time.Time) (Credential, error) {
	block, _ := pem.Decode([]byte(pemKey.v))
	if block == nil {
		return Credential{}, errors.New("providers: app private key is not PEM")
	}
	key, err := x509.ParsePKCS1PrivateKey(block.Bytes)
	if err != nil {
		parsed, err8 := x509.ParsePKCS8PrivateKey(block.Bytes)
		rsaKey, ok := parsed.(*rsa.PrivateKey)
		if err8 != nil || !ok {
			return Credential{}, errors.New("providers: app private key is not an RSA key")
		}
		key = rsaKey
	}

	header, _ := json.Marshal(map[string]string{"alg": "RS256", "typ": "JWT"})
	claims, _ := json.Marshal(struct {
		Iat int64  `json:"iat"`
		Exp int64  `json:"exp"`
		Iss string `json:"iss"`
	}{now.Unix() - 60, now.Unix() + 540, strconv.FormatInt(appID, 10)})
	enc := base64.RawURLEncoding
	signing := enc.EncodeToString(header) + "." + enc.EncodeToString(claims)
	sum := sha256.Sum256([]byte(signing))
	sig, err := rsa.SignPKCS1v15(nil, key, crypto.SHA256, sum[:])
	if err != nil {
		return Credential{}, fmt.Errorf("providers: sign app token: %w", err)
	}
	return NewCredential(signing + "." + enc.EncodeToString(sig)), nil
}

// ErrBadVerificationCode reports that GitHub rejected an OAuth code as wrong or expired, which
// the runner turns into a restart of the browser step.
var ErrBadVerificationCode = errors.New("github: the sign-in code is wrong or expired")

// GitHubOAuthError reports a code exchange GitHub answered with an error or no access token. Code is
// GitHub's error field.
type GitHubOAuthError struct {
	Status int
	Code   string
}

// Error implements the error interface.
func (e *GitHubOAuthError) Error() string {
	return fmt.Sprintf("github: sign-in code exchange failed: %s (status %d)", e.Code, e.Status)
}

// Is matches ErrBadVerificationCode for the bad_verification_code error.
func (e *GitHubOAuthError) Is(target error) bool {
	return target == ErrBadVerificationCode && e.Code == "bad_verification_code"
}

// GitHubWeb is the client for github.com itself, the host of the OAuth code exchange. It is a
// separate pinned client from GitHub, which only ever dials api.github.com.
type GitHubWeb struct {
	client *client
}

// NewGitHubWeb returns a github.com client sending every request through rt.
func NewGitHubWeb(rt http.RoundTripper) *GitHubWeb {
	return &GitHubWeb{client: newClient(githubWebHost, Credential{}, rt)}
}

// ExchangeCode trades an OAuth code for the user's access token through POST
// /login/oauth/access_token. GitHub answers a bad code with a 200 and an error field, so a
// response without an access token is an error whatever the status.
func (w *GitHubWeb) ExchangeCode(ctx context.Context, clientID string, clientSecret Credential, code, redirectURI string) (Credential, error) {
	req := struct {
		ClientID     string `json:"client_id"`
		ClientSecret string `json:"client_secret"`
		Code         string `json:"code"`
		RedirectURI  string `json:"redirect_uri,omitempty"`
	}{clientID, clientSecret.v, code, redirectURI}
	status, header, data, err := w.client.rawSend(ctx, http.MethodPost, githubWebBase+"/login/oauth/access_token", "application/json", req)
	if err != nil {
		return Credential{}, err
	}
	var out struct {
		AccessToken string `json:"access_token"`
		Error       string `json:"error"`
	}
	_ = json.Unmarshal(data, &out)
	if out.Error != "" {
		return Credential{}, &GitHubOAuthError{Status: status, Code: out.Error}
	}
	if isErrorStatus(status) {
		return Credential{}, githubFailure(status, header, data)
	}
	if out.AccessToken == "" {
		return Credential{}, &GitHubOAuthError{Status: status, Code: "no access token in the response"}
	}
	return NewCredential(out.AccessToken), nil
}

// Installation is one App installation as GitHub lists it.
type Installation struct {
	ID                  int64  `json:"id"`
	AppID               int64  `json:"app_id"`
	RepositorySelection string `json:"repository_selection"`
}

// AppInstallations lists every installation of the calling App through GET /app/installations,
// walking pages of 100 until a short one. The credential must be the App JWT.
func (gh *GitHub) AppInstallations(ctx context.Context) ([]Installation, error) {
	var all []Installation
	for page := 1; page <= maxPages; page++ {
		var wire []Installation
		if err := gh.getJSON(ctx, fmt.Sprintf("/app/installations?per_page=%d&page=%d", pageSize, page), &wire); err != nil {
			return nil, err
		}
		all = append(all, wire...)
		if len(wire) < pageSize {
			break
		}
	}
	return all, nil
}

// DeleteInstallation removes an installation through DELETE /app/installations/{id}. The
// credential must be the App JWT. The chain uses it to drop the unscoped installation the
// install redirect creates, and the sweep uses it to remove an orphan.
func (gh *GitHub) DeleteInstallation(ctx context.Context, id int64) error {
	return gh.call(ctx, http.MethodDelete, "/app/installations/"+strconv.FormatInt(id, 10), nil, nil)
}

// InstallationToken mints the installation access token through POST
// /app/installations/{id}/access_tokens. The credential must be the App JWT.
func (gh *GitHub) InstallationToken(ctx context.Context, id int64) (Credential, time.Time, error) {
	var out struct {
		Token     string    `json:"token"`
		ExpiresAt time.Time `json:"expires_at"`
	}
	if err := gh.call(ctx, http.MethodPost, "/app/installations/"+strconv.FormatInt(id, 10)+"/access_tokens", nil, &out); err != nil {
		return Credential{}, time.Time{}, err
	}
	return NewCredential(out.Token), out.ExpiresAt, nil
}

// ErrInstallationNotFound reports that the user's installations hold none of the App's.
var ErrInstallationNotFound = errors.New("github: the App is not installed for this user")

// ReadBackStatus is the verdict of the installation read-back.
type ReadBackStatus int

// The verdicts ReadBackInstallation returns.
const (
	// ReadBackOK means the installation is scoped to exactly the recorded repository.
	ReadBackOK ReadBackStatus = iota
	// ReadBackOverGrant means the installation reaches more than the recorded repository.
	ReadBackOverGrant
)

// ReadBack is what the read-back found.
type ReadBack struct {
	// InstallationID is the App's installation on the user's account.
	InstallationID int64
	Status         ReadBackStatus
	// Selection is the installation's repository_selection, "selected" or "all".
	Selection string
	// RepoIDs is the repositories the installation lists; it is empty when Selection is "all",
	// since the list is not walked for an installation that already over-grants.
	RepoIDs []int64
}

// ReadBackInstallation confirms what the admin actually granted. With the user token as the
// credential it finds the installation whose app_id is appID (the list also holds other Apps'
// installations, in any order), then reads its repositories and reports ReadBackOverGrant for
// repository_selection "all" or for any list other than exactly repoID.
func (gh *GitHub) ReadBackInstallation(ctx context.Context, appID, repoID int64) (ReadBack, error) {
	inst, err := gh.findUserInstallation(ctx, appID)
	if err != nil {
		return ReadBack{}, err
	}
	result := ReadBack{InstallationID: inst.ID, Selection: inst.RepositorySelection}
	if inst.RepositorySelection != "selected" {
		result.Status = ReadBackOverGrant
		return result, nil
	}
	for page := 1; page <= maxPages; page++ {
		var out struct {
			Repositories []struct {
				ID int64 `json:"id"`
			} `json:"repositories"`
		}
		path := fmt.Sprintf("/user/installations/%d/repositories?per_page=%d&page=%d", inst.ID, pageSize, page)
		if err := gh.getJSON(ctx, path, &out); err != nil {
			return ReadBack{}, err
		}
		for _, r := range out.Repositories {
			result.RepoIDs = append(result.RepoIDs, r.ID)
		}
		if len(out.Repositories) < pageSize {
			break
		}
	}
	if len(result.RepoIDs) != 1 || result.RepoIDs[0] != repoID {
		result.Status = ReadBackOverGrant
	}
	return result, nil
}

// findUserInstallation walks GET /user/installations for the one installation of appID.
func (gh *GitHub) findUserInstallation(ctx context.Context, appID int64) (Installation, error) {
	for page := 1; page <= maxPages; page++ {
		var out struct {
			Installations []Installation `json:"installations"`
		}
		if err := gh.getJSON(ctx, fmt.Sprintf("/user/installations?per_page=%d&page=%d", pageSize, page), &out); err != nil {
			return Installation{}, err
		}
		for _, w := range out.Installations {
			if w.AppID == appID {
				return w, nil
			}
		}
		if len(out.Installations) < pageSize {
			break
		}
	}
	return Installation{}, ErrInstallationNotFound
}
