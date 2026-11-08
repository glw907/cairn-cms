package providers

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

// cloudflareOAuthHost is the only host a CloudflareOAuth client sends to. Cloudflare's OAuth
// endpoints live on the dashboard host, not on the API host the Cloudflare client is pinned to.
const cloudflareOAuthHost = "dash.cloudflare.com"

// CloudflareClientID is cairn's public OAuth client id. A public client holds no secret, so the
// id is safe in source; the authorization-code exchange is protected by PKCE instead.
const CloudflareClientID = "ce28682c41a8ab2de6412a80ea9d0167"

// CloudflareRedirectURI is the loopback address the registered client redirects to. Setup's
// callback listener binds exactly this host and port.
const CloudflareRedirectURI = "http://127.0.0.1:49152/cloudflare/callback"

// CloudflareScopes is the space-separated scope set setup requests, inside the set the client is
// registered for. offline_access asks for a refresh token.
const CloudflareScopes = "user-details.read account-settings.read zone.read dns.write " +
	"workers-scripts.edit workers-routes.write d1.write workers-r2.write " +
	"email-sending.write user-api-tokens.write offline_access"

// MintScope is the scope without which setup cannot mint the deploy key. It is a sensitive scope
// the consent page leaves for the owner to tick, so a token can arrive without it.
const MintScope = "user-api-tokens.write"

// AuthorizeURL returns the consent page address for one authorization attempt. state is the
// caller's anti-forgery value and challenge is the S256 challenge from NewPKCE.
func AuthorizeURL(state, challenge string) string {
	q := url.Values{
		"response_type":         {"code"},
		"client_id":             {CloudflareClientID},
		"redirect_uri":          {CloudflareRedirectURI},
		"scope":                 {CloudflareScopes},
		"state":                 {state},
		"code_challenge":        {challenge},
		"code_challenge_method": {"S256"},
	}
	// Encode writes a space as "+"; the consent page's scope list is safest with "%20". A literal
	// plus in a value has already been written as %2B, so the swap touches spaces only.
	return "https://" + cloudflareOAuthHost + "/oauth2/auth?" + strings.ReplaceAll(q.Encode(), "+", "%20")
}

// NewPKCE returns a fresh code verifier and its S256 challenge (RFC 7636): the verifier is 32
// random bytes in unpadded base64url, the challenge the same encoding of its SHA-256.
func NewPKCE() (verifier, challenge string, err error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", "", fmt.Errorf("providers: read random bytes: %w", err)
	}
	verifier = base64.RawURLEncoding.EncodeToString(b)
	return verifier, PKCEChallenge(verifier), nil
}

// PKCEChallenge returns the S256 challenge for verifier.
func PKCEChallenge(verifier string) string {
	sum := sha256.Sum256([]byte(verifier))
	return base64.RawURLEncoding.EncodeToString(sum[:])
}

// OAuthToken is a token response. It renders redacted under every fmt verb, so a stray log line
// never prints a token.
type OAuthToken struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	// ExpiresIn is the access token's lifetime in seconds.
	ExpiresIn int    `json:"expires_in"`
	Scope     string `json:"scope"`
	TokenType string `json:"token_type"`
}

// String implements fmt.Stringer.
func (t OAuthToken) String() string { return redacted }

// GoString implements fmt.GoStringer.
func (t OAuthToken) GoString() string { return redacted }

// MissingScope returns want when the granted scope omits it, and "" when it is present. Setup
// calls it with MintScope: a grant without that scope sends the owner back to consent.
func (t OAuthToken) MissingScope(want string) string {
	for s := range strings.FieldsSeq(t.Scope) {
		if s == want {
			return ""
		}
	}
	return want
}

// OAuthError reports a refused OAuth call. Code is the RFC 6749 error code ("invalid_grant" for
// a spent or revoked refresh token or code) and empty when the body carried none. It never
// carries a token or the server's free-text description.
type OAuthError struct {
	Status int
	Code   string
	Reason Reason
}

// Error implements the error interface.
func (e *OAuthError) Error() string {
	return fmt.Sprintf("cloudflare oauth: %s (status %d, code %q)", e.Reason, e.Status, e.Code)
}

// ClassifiedReason implements ProviderError.
func (e *OAuthError) ClassifiedReason() Reason { return e.Reason }

// HTTPStatus implements ProviderError.
func (e *OAuthError) HTTPStatus() int { return e.Status }

// CloudflareOAuth is the client for Cloudflare's OAuth endpoints, pinned to dash.cloudflare.com.
type CloudflareOAuth struct {
	client *client
}

// NewCloudflareOAuth returns a client sending through rt. It carries no credential: the
// endpoints authenticate by the public client id and the PKCE verifier.
func NewCloudflareOAuth(rt http.RoundTripper) *CloudflareOAuth {
	return &CloudflareOAuth{client: newClient(cloudflareOAuthHost, Credential{}, rt)}
}

// Exchange trades an authorization code and its PKCE verifier for a token pair.
func (o *CloudflareOAuth) Exchange(ctx context.Context, code, verifier string) (*OAuthToken, error) {
	return o.token(ctx, url.Values{
		"grant_type":    {"authorization_code"},
		"code":          {code},
		"code_verifier": {verifier},
		"redirect_uri":  {CloudflareRedirectURI},
		"client_id":     {CloudflareClientID},
	})
}

// Refresh trades a refresh token for a new pair. Cloudflare revokes the superseded access token
// at once, so the caller persists the returned pair before using either token.
func (o *CloudflareOAuth) Refresh(ctx context.Context, refreshToken string) (*OAuthToken, error) {
	return o.token(ctx, url.Values{
		"grant_type":    {"refresh_token"},
		"refresh_token": {refreshToken},
		"client_id":     {CloudflareClientID},
	})
}

// Revoke revokes token. A failure is returned for the runner to report, never to stop on:
// revocation was answered 403 from one client and is probed live.
func (o *CloudflareOAuth) Revoke(ctx context.Context, token string) error {
	status, body, err := o.postForm(ctx, "/oauth2/revoke", url.Values{
		"token":     {token},
		"client_id": {CloudflareClientID},
	})
	if err != nil {
		return err
	}
	if isErrorStatus(status) {
		return oauthError(status, body)
	}
	return nil
}

func (o *CloudflareOAuth) token(ctx context.Context, form url.Values) (*OAuthToken, error) {
	status, body, err := o.postForm(ctx, "/oauth2/token", form)
	if err != nil {
		return nil, err
	}
	if isErrorStatus(status) {
		return nil, oauthError(status, body)
	}
	var t OAuthToken
	if err := json.Unmarshal(body, &t); err != nil {
		return nil, fmt.Errorf("providers: decode token response: %w", err)
	}
	if t.AccessToken == "" {
		return nil, fmt.Errorf("providers: token response carries no access token")
	}
	return &t, nil
}

func (o *CloudflareOAuth) postForm(ctx context.Context, path string, form url.Values) (int, []byte, error) {
	reqCtx, cancel := context.WithTimeout(ctx, requestTimeout)
	defer cancel()
	req, err := http.NewRequestWithContext(reqCtx, http.MethodPost, "https://"+cloudflareOAuthHost+path, strings.NewReader(form.Encode()))
	if err != nil {
		return 0, nil, fmt.Errorf("providers: build request for %s: %w", path, err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", userAgent())
	resp, err := o.client.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer func() { _ = resp.Body.Close() }()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, nil, fmt.Errorf("providers: read response body: %w", err)
	}
	return resp.StatusCode, body, nil
}

// oauthError classifies a refused OAuth response. invalid_grant and invalid_client mean the
// credential itself is spent, which reads as unauthorized whatever the status.
func oauthError(status int, body []byte) *OAuthError {
	var b struct {
		Error string `json:"error"`
	}
	_ = json.Unmarshal(body, &b)
	reason := reasonForStatus(status, nil)
	if b.Error == "invalid_grant" || b.Error == "invalid_client" {
		reason = ReasonUnauthorized
	}
	return &OAuthError{Status: status, Code: b.Error, Reason: reason}
}
