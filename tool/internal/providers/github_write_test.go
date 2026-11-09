package providers

import (
	"bytes"
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
	"io"
	"net/http"
	"net/url"
	"strings"
	"testing"
	"time"

	"golang.org/x/crypto/nacl/box"
)

// recordedCall is one request a routeTransport saw.
type recordedCall struct {
	method, host, path, query, auth string
	body                            []byte
}

// reply is a canned response for one route.
type reply struct {
	status int
	body   []byte
}

// routeTransport answers each request from a route table keyed "METHOD host/path" (or
// "METHOD host/path?query" to match one query exactly) and records every request, so a test
// asserts both what the client decoded and what it sent.
type routeTransport struct {
	routes map[string]reply
	calls  []recordedCall
}

func (rt *routeTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	var body []byte
	if req.Body != nil {
		body, _ = io.ReadAll(req.Body)
	}
	rt.calls = append(rt.calls, recordedCall{req.Method, req.URL.Host, req.URL.Path, req.URL.RawQuery, req.Header.Get("Authorization"), body})
	key := req.Method + " " + req.URL.Host + req.URL.Path
	r, ok := rt.routes[key+"?"+req.URL.RawQuery]
	if !ok {
		r, ok = rt.routes[key]
	}
	if !ok {
		r = reply{status: http.StatusNotFound, body: []byte(`{"message":"Not Found"}`)}
	}
	return &http.Response{StatusCode: r.status, Body: io.NopCloser(bytes.NewReader(r.body)), Header: make(http.Header), Request: req}, nil
}

// fixtureReply reads a github corpus fixture as a reply carrying its recorded status.
func fixtureReply(t *testing.T, name string) reply {
	t.Helper()
	status, body, err := Corpus("github", name)
	if err != nil {
		t.Fatal(err)
	}
	return reply{status: status, body: body}
}

func routes(entries map[string]reply) *routeTransport { return &routeTransport{routes: entries} }

func TestNewManifestMatchesTheSpecLiteral(t *testing.T) {
	got, err := json.Marshal(NewManifest("example", 49152))
	if err != nil {
		t.Fatal(err)
	}
	want := `{"name":"cairn-example","url":"https://cairn.pub","redirect_url":"http://127.0.0.1:49152/github/manifest",` +
		`"callback_urls":["http://127.0.0.1:49152/github/callback"],"hook_attributes":{"url":"https://cairn.pub","active":false},` +
		`"request_oauth_on_install":true,"public":false,"default_permissions":{"actions":"read","administration":"write",` +
		`"contents":"write","metadata":"read","secrets":"write","workflows":"write"},"default_events":[]}`
	if string(got) != want {
		t.Errorf("manifest =\n%s\nwant\n%s", got, want)
	}
}

func TestNewManifestCutsTheWholeNameAt34(t *testing.T) {
	cases := []struct{ base, want string }{
		{strings.Repeat("a", 50), "cairn-" + strings.Repeat("a", 28)},
		{strings.Repeat("a", 27) + "-" + strings.Repeat("b", 10), "cairn-" + strings.Repeat("a", 27)},
		{"example", "cairn-example"},
	}
	for _, c := range cases {
		if got := NewManifest(c.base, 1).Name; got != c.want || len(got) > 34 {
			t.Errorf("NewManifest(%q).Name = %q (%d), want %q", c.base, got, len(got), c.want)
		}
	}
}

func TestManifestFormAndURLs(t *testing.T) {
	target := ManifestTarget("n0nce")
	if target != "https://github.com/settings/apps/new?state=n0nce" {
		t.Errorf("target = %q", target)
	}
	page, err := ManifestFormHTML(NewManifest("example", 49152), target)
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{`action="` + target + `"`, `method="post"`, `name="manifest"`, `&#34;name&#34;:&#34;cairn-example&#34;`, `.submit()`} {
		if !strings.Contains(page, want) {
			t.Errorf("form page lacks %q:\n%s", want, page)
		}
	}
	if got := InstallURL("cairn-example"); got != "https://github.com/apps/cairn-example/installations/new" {
		t.Errorf("InstallURL = %q", got)
	}
	if got, want := PreselectURL("cairn-example", 4242, 998877), "https://github.com/apps/cairn-example/installations/new/permissions?suggested_target_id=4242&repository_ids[]=998877"; got != want {
		t.Errorf("PreselectURL = %q, want %q", got, want)
	}
}

func TestConvertManifestDecodesTheConversion(t *testing.T) {
	rt := routes(map[string]reply{"POST api.github.com/app-manifests/the-code/conversions": fixtureReply(t, "app_manifest_conversion.created.201.json")})
	rec, err := NewGitHub(Credential{}, rt).ConvertManifest(context.Background(), "the-code")
	if err != nil {
		t.Fatalf("ConvertManifest: %v", err)
	}
	if rec.ID != 5674023 || rec.Slug != "cairn-rec-tmw8jn1a0-app" || rec.OwnerLogin != "<REDACTED>-test" || rec.ClientID != "Iv23li0kiADWK6TBhHPV" {
		t.Errorf("record = %+v", rec)
	}
	// The recording scrubs each secret to the same placeholder, so these prove the three fields
	// decode; the leak check below fails on that placeholder appearing in the formatted record
	// anywhere but the owner login, whose scrub carries the same text.
	if rec.PEM.v != "<REDACTED>" || rec.ClientSecret.v != "<REDACTED>" || rec.WebhookSecret.v != "<REDACTED>" {
		t.Error("record lost the pem, the client secret, or the webhook secret")
	}
	if shown := strings.ReplaceAll(fmt.Sprintf("%v %+v", rec, rec), rec.OwnerLogin, ""); strings.Contains(shown, "<REDACTED>") {
		t.Errorf("formatting the record leaked a secret: %s", shown)
	}
	if rt.calls[0].auth != "" {
		t.Error("the conversion sent an Authorization header")
	}
}

func TestAppJWTSignsRS256WithTheDocumentedClaims(t *testing.T) {
	rec := convertedApp(t)
	now := time.Unix(1_800_000_000, 0)
	token, err := AppJWT(rec.ID, rec.PEM, now)
	if err != nil {
		t.Fatal(err)
	}
	parts := strings.Split(token.v, ".")
	if len(parts) != 3 {
		t.Fatalf("token has %d segments, want 3", len(parts))
	}
	dec := func(s string) []byte {
		b, err := base64.RawURLEncoding.DecodeString(s)
		if err != nil {
			t.Fatalf("segment is not base64url: %v", err)
		}
		return b
	}
	if got := string(dec(parts[0])); got != `{"alg":"RS256","typ":"JWT"}` {
		t.Errorf("header = %s", got)
	}
	if got := string(dec(parts[1])); got != `{"iat":1799999940,"exp":1800000540,"iss":"5674023"}` {
		t.Errorf("claims = %s", got)
	}
	block, _ := pem.Decode([]byte(rec.PEM.v))
	key, err := x509.ParsePKCS1PrivateKey(block.Bytes)
	if err != nil {
		t.Fatal(err)
	}
	sum := sha256.Sum256([]byte(parts[0] + "." + parts[1]))
	if err := rsa.VerifyPKCS1v15(&key.PublicKey, crypto.SHA256, sum[:], dec(parts[2])); err != nil {
		t.Errorf("signature does not verify against the key's public half: %v", err)
	}
}

func TestAppJWTRejectsANonKey(t *testing.T) {
	if _, err := AppJWT(1, NewCredential("not a pem"), time.Now()); err == nil {
		t.Error("AppJWT accepted a non-PEM key")
	}
}

// convertedApp loads the recorded conversion's record with its scrubbed pem swapped for the
// corpus's TEST-ONLY key, so a test can sign with it.
func convertedApp(t *testing.T) AppRecord {
	t.Helper()
	rt := routes(map[string]reply{"POST api.github.com/app-manifests/c/conversions": fixtureReply(t, "app_manifest_conversion.created.201.json")})
	rec, err := NewGitHub(Credential{}, rt).ConvertManifest(context.Background(), "c")
	if err != nil {
		t.Fatal(err)
	}
	_, body, err := Corpus("github", "test-only.app-credentials.json")
	if err != nil {
		t.Fatal(err)
	}
	var key struct {
		PEM string `json:"pem"`
	}
	if err := json.Unmarshal(body, &key); err != nil {
		t.Fatal(err)
	}
	rec.PEM = NewCredential(key.PEM)
	return rec
}

func TestExchangeCode(t *testing.T) {
	const route = "POST github.com/login/oauth/access_token"
	tests := []struct {
		name    string
		reply   reply
		wantErr func(error) bool
	}{
		{"success", fixtureReply(t, "oauth_access_token.success.200.json"), nil},
		{"bad verification code", fixtureReply(t, "oauth_access_token.bad-verification-code.200.json"), func(err error) bool { return errors.Is(err, ErrBadVerificationCode) }},
		{"no token", reply{200, []byte(`{}`)}, func(err error) bool {
			var oe *GitHubOAuthError
			return errors.As(err, &oe) && !errors.Is(err, ErrBadVerificationCode)
		}},
		{"server error", reply{500, []byte(`{"message":"boom"}`)}, func(err error) bool {
			var ge *GitHubError
			return errors.As(err, &ge) && ge.Status == 500
		}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rt := routes(map[string]reply{route: tt.reply})
			tok, err := NewGitHubWeb(rt).ExchangeCode(context.Background(), "cid", NewCredential("csecret"), "the-code", "http://127.0.0.1:49152/github/callback")
			if tt.wantErr == nil {
				if err != nil || tok.v != "PLACEHOLDER-user-token" {
					t.Fatalf("ExchangeCode = %q, %v", tok.v, err)
				}
			} else if err == nil || !tt.wantErr(err) {
				t.Fatalf("err = %v", err)
			}
			var sent map[string]string
			if err := json.Unmarshal(rt.calls[0].body, &sent); err != nil {
				t.Fatal(err)
			}
			if sent["client_id"] != "cid" || sent["client_secret"] != "csecret" || sent["code"] != "the-code" || sent["redirect_uri"] == "" {
				t.Errorf("sent body = %v", sent)
			}
			if err != nil && strings.Contains(err.Error(), "csecret") {
				t.Errorf("error leaks the client secret: %v", err)
			}
		})
	}
}

func TestEachClientRefusesTheOtherHost(t *testing.T) {
	rt := routes(nil)
	web := NewGitHubWeb(rt)
	if _, _, _, err := web.client.rawSend(context.Background(), http.MethodGet, "https://api.github.com/user", githubAccept, nil); err == nil {
		t.Error("the github.com client dialed api.github.com")
	}
	if _, _, _, err := NewGitHub(Credential{}, rt).client.rawSend(context.Background(), http.MethodPost, "https://github.com/login/oauth/access_token", githubAccept, nil); err == nil {
		t.Error("the api client dialed github.com")
	}
	if len(rt.calls) != 0 {
		t.Errorf("a refused request still reached the transport: %v", rt.calls)
	}
}

func TestCreateRepo(t *testing.T) {
	t.Run("created", func(t *testing.T) {
		rt := routes(map[string]reply{"POST api.github.com/user/repos": fixtureReply(t, "repo_create.ok.201.json")})
		repo, err := NewGitHub(NewCredential("utok"), rt).CreateRepo(context.Background(), "cairn-rec-tmw8jn1a0-repo")
		if err != nil {
			t.Fatal(err)
		}
		if repo.ID != 1450794126 || repo.Name != "cairn-rec-tmw8jn1a0-repo" || repo.FullName != "<REDACTED>-test/cairn-rec-tmw8jn1a0-repo" ||
			repo.Owner.ID != 352097667 || repo.Owner.Login != "<REDACTED>-test" {
			t.Errorf("repo = %+v", repo)
		}
		if got, want := string(rt.calls[0].body), `{"name":"cairn-rec-tmw8jn1a0-repo","private":true,"auto_init":false}`; got != want {
			t.Errorf("sent %s, want %s", got, want)
		}
		if rt.calls[0].auth != "Bearer utok" {
			t.Errorf("auth = %q", rt.calls[0].auth)
		}
	})
	t.Run("name taken", func(t *testing.T) {
		rt := routes(map[string]reply{"POST api.github.com/user/repos": fixtureReply(t, "repo_create.name-conflict.422.json")})
		_, err := NewGitHub(NewCredential("utok"), rt).CreateRepo(context.Background(), "example-site")
		if !errors.Is(err, ErrRepoNameTaken) {
			t.Fatalf("err = %v, want ErrRepoNameTaken", err)
		}
		var ge *GitHubError
		if !errors.As(err, &ge) || ge.Status != 422 {
			t.Errorf("err does not unwrap to the 422 GitHubError: %v", err)
		}
	})
	t.Run("another 422 is not a taken name", func(t *testing.T) {
		rt := routes(map[string]reply{"POST api.github.com/user/repos": {422, []byte(`{"message":"Validation Failed","errors":[{"field":"visibility"}]}`)}})
		_, err := NewGitHub(NewCredential("utok"), rt).CreateRepo(context.Background(), "x")
		if err == nil || errors.Is(err, ErrRepoNameTaken) {
			t.Errorf("err = %v", err)
		}
	})
}

func TestAppRoutes(t *testing.T) {
	jwt := NewCredential("the-jwt")
	rt := routes(map[string]reply{
		"GET api.github.com/app/installations":                        fixtureReply(t, "app_installations.list.200.json"),
		"DELETE api.github.com/app/installations/5550002":             fixtureReply(t, "app_installation_delete.success.204.json"),
		"POST api.github.com/app/installations/5550002/access_tokens": fixtureReply(t, "app_installation_access_token.success.201.json"),
	})
	gh := NewGitHub(jwt, rt)
	ctx := context.Background()

	list, err := gh.AppInstallations(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 2 || list[0].AppID != 1234567 || list[1].RepositorySelection != "all" {
		t.Errorf("installations = %+v", list)
	}
	if err := gh.DeleteInstallation(ctx, 5550002); err != nil {
		t.Errorf("DeleteInstallation: %v", err)
	}
	tok, exp, err := gh.InstallationToken(ctx, 5550002)
	if err != nil {
		t.Fatal(err)
	}
	if tok.v != "PLACEHOLDER-installation-token" || !exp.Equal(time.Date(2026, 11, 8, 13, 0, 0, 0, time.UTC)) {
		t.Errorf("token = %q, expires %v", tok.v, exp)
	}
	for _, c := range rt.calls {
		if c.auth != "Bearer the-jwt" {
			t.Errorf("%s %s carried auth %q", c.method, c.path, c.auth)
		}
	}
}

func TestReadBackInstallation(t *testing.T) {
	const repoID = 998877
	tests := []struct {
		name       string
		installs   string
		repos      string
		repoID     int64
		wantStatus ReadBackStatus
		wantIDs    []int64
	}{
		{"our App picked from a list led by a foreign App with all, scoped to the one repo", "user_installations.foreign-first.200.json", "user_installation_repositories.selected-one.200.json", repoID, ReadBackOK, []int64{repoID}},
		{"all is an over-grant", "user_installations.ours-all.200.json", "", repoID, ReadBackOverGrant, nil},
		{"a selected list of two is an over-grant", "user_installations.foreign-first.200.json", "user_installation_repositories.selected-two.200.json", repoID, ReadBackOverGrant, []int64{repoID, 998878}},
		{"a selected list without the recorded repo is an over-grant", "user_installations.foreign-first.200.json", "user_installation_repositories.selected-one.200.json", 1, ReadBackOverGrant, []int64{repoID}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			table := map[string]reply{"GET api.github.com/user/installations": fixtureReply(t, tt.installs)}
			if tt.repos != "" {
				table["GET api.github.com/user/installations/5550002/repositories"] = fixtureReply(t, tt.repos)
			}
			rb, err := NewGitHub(NewCredential("utok"), routes(table)).ReadBackInstallation(context.Background(), 1234567, tt.repoID)
			if err != nil {
				t.Fatal(err)
			}
			if rb.InstallationID != 5550002 || rb.Status != tt.wantStatus {
				t.Errorf("read-back = %+v, want installation 5550002 status %v", rb, tt.wantStatus)
			}
			if fmt.Sprint(rb.RepoIDs) != fmt.Sprint(tt.wantIDs) {
				t.Errorf("RepoIDs = %v, want %v", rb.RepoIDs, tt.wantIDs)
			}
		})
	}
}

func TestReadBackWalksPagesAndReportsAMissingInstallation(t *testing.T) {
	foreign := make([]string, pageSize)
	for i := range foreign {
		foreign[i] = fmt.Sprintf(`{"id":%d,"app_id":9,"repository_selection":"all"}`, 100+i)
	}
	repos := make([]string, pageSize)
	for i := range repos {
		repos[i] = fmt.Sprintf(`{"id":%d}`, 500+i)
	}
	rt := routes(map[string]reply{
		"GET api.github.com/user/installations?per_page=100&page=1":                 {200, []byte(`{"installations":[` + strings.Join(foreign, ",") + `]}`)},
		"GET api.github.com/user/installations?per_page=100&page=2":                 {200, []byte(`{"installations":[{"id":77,"app_id":1234567,"repository_selection":"selected"}]}`)},
		"GET api.github.com/user/installations/77/repositories?per_page=100&page=1": {200, []byte(`{"repositories":[` + strings.Join(repos, ",") + `]}`)},
		"GET api.github.com/user/installations/77/repositories?per_page=100&page=2": {200, []byte(`{"repositories":[{"id":998877}]}`)},
	})
	rb, err := NewGitHub(NewCredential("utok"), rt).ReadBackInstallation(context.Background(), 1234567, 998877)
	if err != nil {
		t.Fatal(err)
	}
	if rb.InstallationID != 77 || rb.Status != ReadBackOverGrant || len(rb.RepoIDs) != pageSize+1 {
		t.Errorf("paged read-back = id %d status %v with %d repos", rb.InstallationID, rb.Status, len(rb.RepoIDs))
	}

	none := routes(map[string]reply{"GET api.github.com/user/installations": fixtureReply(t, "user_installations.foreign-first.200.json")})
	_, err = NewGitHub(NewCredential("utok"), none).ReadBackInstallation(context.Background(), 31337, 1)
	if !errors.Is(err, ErrInstallationNotFound) {
		t.Errorf("err = %v, want ErrInstallationNotFound", err)
	}
}

func TestSealedSecretOpensWithTheMatchingPrivateKey(t *testing.T) {
	pub, priv, err := box.GenerateKey(bytes.NewReader(bytes.Repeat([]byte{7}, 64)))
	if err != nil {
		t.Fatal(err)
	}
	sealed, err := SealSecret(base64.StdEncoding.EncodeToString(pub[:]), "cf-token-value")
	if err != nil {
		t.Fatal(err)
	}
	raw, err := base64.StdEncoding.DecodeString(sealed)
	if err != nil {
		t.Fatal(err)
	}
	opened, ok := box.OpenAnonymous(nil, raw, pub, priv)
	if !ok || string(opened) != "cf-token-value" {
		t.Errorf("sealed value did not open to the plaintext: ok=%v %q", ok, opened)
	}
	_, otherPriv, _ := box.GenerateKey(bytes.NewReader(bytes.Repeat([]byte{9}, 64)))
	if _, ok := box.OpenAnonymous(nil, raw, pub, otherPriv); ok {
		t.Error("a different private key opened the sealed value")
	}
	if _, err := SealSecret("not base64!", "x"); err == nil {
		t.Error("SealSecret accepted a malformed key")
	}
	if _, err := SealSecret(base64.StdEncoding.EncodeToString([]byte("short")), "x"); err == nil {
		t.Error("SealSecret accepted a short key")
	}
}

func TestSetActionsSecretSealsToTheServedKeyAndPutsIt(t *testing.T) {
	pub, priv, err := box.GenerateKey(bytes.NewReader(bytes.Repeat([]byte{3}, 64)))
	if err != nil {
		t.Fatal(err)
	}
	keyBody := fmt.Sprintf(`{"key_id":"k-1","key":%q}`, base64.StdEncoding.EncodeToString(pub[:]))
	base := "api.github.com/repos/example-owner/example-site/actions/secrets"
	rt := routes(map[string]reply{
		"GET " + base + "/public-key":          {200, []byte(keyBody)},
		"PUT " + base + "/" + DeploySecretName: fixtureReply(t, "actions_secret_put.created.201.json"),
	})
	if err := NewGitHub(NewCredential("itok"), rt).SetActionsSecret(context.Background(), "example-owner", "example-site", DeploySecretName, "cf-token-value"); err != nil {
		t.Fatal(err)
	}
	put := rt.calls[1]
	if put.method != http.MethodPut || put.path != "/repos/example-owner/example-site/actions/secrets/CLOUDFLARE_API_TOKEN" {
		t.Fatalf("second call = %s %s", put.method, put.path)
	}
	var sent struct {
		EncryptedValue string `json:"encrypted_value"`
		KeyID          string `json:"key_id"`
	}
	if err := json.Unmarshal(put.body, &sent); err != nil {
		t.Fatal(err)
	}
	raw, _ := base64.StdEncoding.DecodeString(sent.EncryptedValue)
	opened, ok := box.OpenAnonymous(nil, raw, pub, priv)
	if sent.KeyID != "k-1" || !ok || string(opened) != "cf-token-value" {
		t.Errorf("PUT carried key_id %q and opens ok=%v to %q", sent.KeyID, ok, opened)
	}
	if bytes.Contains(put.body, []byte("cf-token-value")) {
		t.Error("the PUT body carries the plaintext")
	}
}

func TestRecordedPublicKeyIsAValidSealingKey(t *testing.T) {
	_, body, err := Corpus("github", "actions_public_key.success.200.json")
	if err != nil {
		t.Fatal(err)
	}
	var key struct {
		KeyID string `json:"key_id"`
		Key   string `json:"key"`
	}
	if err := json.Unmarshal(body, &key); err != nil {
		t.Fatal(err)
	}
	if key.KeyID == "" {
		t.Error("recorded key has no key_id")
	}
	if _, err := SealSecret(key.Key, "x"); err != nil {
		t.Errorf("recorded public key does not seal: %v", err)
	}
}

func TestWorkflowRunForCommit(t *testing.T) {
	const sha = "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678"
	tests := []struct {
		name      string
		fixture   string
		wantFound bool
		want      WorkflowRun
	}{
		{"completed", "actions_runs.for-commit.200.json", true, WorkflowRun{"completed", "success", "https://github.com/example-owner/example-site/actions/runs/9001"}},
		{"in progress has no conclusion", "actions_runs.in-progress.200.json", true, WorkflowRun{"in_progress", "", "https://github.com/example-owner/example-site/actions/runs/9001"}},
		{"none yet", "actions_runs.none.200.json", false, WorkflowRun{}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rt := routes(map[string]reply{"GET api.github.com/repos/example-owner/example-site/actions/runs": fixtureReply(t, tt.fixture)})
			run, found, err := NewGitHub(NewCredential("itok"), rt).WorkflowRunForCommit(context.Background(), "example-owner", "example-site", sha)
			if err != nil {
				t.Fatal(err)
			}
			if found != tt.wantFound || run != tt.want {
				t.Errorf("run = %+v found=%v, want %+v found=%v", run, found, tt.want, tt.wantFound)
			}
			q, _ := url.ParseQuery(rt.calls[0].query)
			if q.Get("head_sha") != sha {
				t.Errorf("query = %q, want head_sha=%s", rt.calls[0].query, sha)
			}
		})
	}
}

func TestWriteErrorsCarryMessageAndStatusNeverTheToken(t *testing.T) {
	rt := routes(map[string]reply{"DELETE api.github.com/app/installations/1": fixtureReply(t, "app_installations.bad-credentials.401.json")})
	err := NewGitHub(NewCredential("sekret-jwt"), rt).DeleteInstallation(context.Background(), 1)
	assertGitHubReason(t, err, 401, ReasonUnauthorized)
	var ge *GitHubError
	if !errors.As(err, &ge) || ge.Message != "Bad credentials" {
		t.Errorf("err = %#v", err)
	}
	if strings.Contains(err.Error(), "sekret-jwt") {
		t.Errorf("error leaks the credential: %v", err)
	}
}
