package providers

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"testing"
)

// TestAuthorizeURL asserts the consent address carries every parameter the registered client
// needs, with the PKCE method S256 and the whole scope set.
func TestAuthorizeURL(t *testing.T) {
	got := AuthorizeURL("state1", "challenge1")
	u, err := url.Parse(got)
	if err != nil {
		t.Fatal(err)
	}
	if u.Scheme != "https" || u.Host != "dash.cloudflare.com" || u.Path != "/oauth2/auth" {
		t.Errorf("address = %s%s", u.Host, u.Path)
	}
	q := u.Query()
	want := map[string]string{
		"response_type":         "code",
		"client_id":             CloudflareClientID,
		"redirect_uri":          "http://127.0.0.1:49152/cloudflare/callback",
		"state":                 "state1",
		"code_challenge":        "challenge1",
		"code_challenge_method": "S256",
		"scope":                 CloudflareScopes,
	}
	for k, v := range want {
		if q.Get(k) != v {
			t.Errorf("%s = %q, want %q", k, q.Get(k), v)
		}
	}
	if strings.Contains(got, "+") {
		t.Errorf("address carries a plus sign: %s", got)
	}
	for _, s := range []string{"user-api-tokens.write", "email-sending.write", "offline_access", "workers-routes.write"} {
		if !strings.Contains(q.Get("scope"), s) {
			t.Errorf("scope lacks %s", s)
		}
	}
}

// TestPKCEChallengeMatchesRFC7636 holds the challenge function to the RFC's own worked example.
func TestPKCEChallengeMatchesRFC7636(t *testing.T) {
	got := PKCEChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")
	if want := "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"; got != want {
		t.Errorf("challenge = %q, want %q", got, want)
	}
	v, c, err := NewPKCE()
	if err != nil || len(v) != 43 || PKCEChallenge(v) != c {
		t.Errorf("NewPKCE = %q, %q, %v", v, c, err)
	}
}

func oauthClient(t *testing.T, script ...string) (*CloudflareOAuth, *scriptedRT) {
	t.Helper()
	rt := &scriptedRT{t: t, script: script}
	return NewCloudflareOAuth(rt), rt
}

func TestOAuthExchangeAndRefresh(t *testing.T) {
	ctx := context.Background()
	o, rt := oauthClient(t, "oauth_token.success.200.json", "oauth_token.success.200.json")
	tok, err := o.Exchange(ctx, "code1", "verifier1")
	if err != nil {
		t.Fatal(err)
	}
	if tok.AccessToken != "ACCESS_TOKEN_PLACEHOLDER" || tok.RefreshToken != "REFRESH_TOKEN_PLACEHOLDER" || tok.ExpiresIn != 3600 || tok.TokenType != "bearer" {
		t.Errorf("token fields decoded wrong: %d scope chars", len(tok.Scope))
	}
	if got := tok.MissingScope(MintScope); got != "" {
		t.Errorf("MissingScope = %q on a full grant", got)
	}
	form, _ := url.ParseQuery(rt.sent[0].body)
	if rt.sent[0].method != "POST" || rt.sent[0].host != "dash.cloudflare.com" || rt.sent[0].path != "/oauth2/token" {
		t.Errorf("request = %s %s%s", rt.sent[0].method, rt.sent[0].host, rt.sent[0].path)
	}
	for k, v := range map[string]string{"grant_type": "authorization_code", "code": "code1", "code_verifier": "verifier1", "client_id": CloudflareClientID, "redirect_uri": CloudflareRedirectURI} {
		if form.Get(k) != v {
			t.Errorf("form %s = %q, want %q", k, form.Get(k), v)
		}
	}
	if ct := rt.sent[0].header.Get("Content-Type"); ct != "application/x-www-form-urlencoded" {
		t.Errorf("content type = %q", ct)
	}
	if !strings.HasPrefix(rt.sent[0].header.Get("User-Agent"), "cairn-tool/") {
		t.Errorf("user agent = %q", rt.sent[0].header.Get("User-Agent"))
	}
	if rt.sent[0].header.Get("Authorization") != "" {
		t.Error("the token endpoint was sent an Authorization header")
	}

	if _, err := o.Refresh(ctx, "refresh1"); err != nil {
		t.Fatal(err)
	}
	form, _ = url.ParseQuery(rt.sent[1].body)
	if form.Get("grant_type") != "refresh_token" || form.Get("refresh_token") != "refresh1" {
		t.Errorf("refresh form = %v", form)
	}
}

func TestOAuthTokenNeverPrints(t *testing.T) {
	tok := OAuthToken{AccessToken: "SECRET-A", RefreshToken: "SECRET-R"}
	for _, s := range []string{fmt.Sprintf("%v", tok), fmt.Sprintf("%+v", tok), fmt.Sprintf("%#v", tok), fmt.Sprint(&tok)} {
		if strings.Contains(s, "SECRET") {
			t.Errorf("a token printed: %s", s)
		}
	}
}

func TestOAuthMissingScopeIsDetected(t *testing.T) {
	o, _ := oauthClient(t, "oauth_token.missing-scope.200.json")
	tok, err := o.Exchange(context.Background(), "c", "v")
	if err != nil {
		t.Fatal(err)
	}
	if got := tok.MissingScope(MintScope); got != "user-api-tokens.write" {
		t.Errorf("MissingScope = %q, want user-api-tokens.write", got)
	}
}

func TestOAuthInvalidGrantIsUnauthorized(t *testing.T) {
	o, _ := oauthClient(t, "oauth_token.invalid-grant.400.json")
	_, err := o.Refresh(context.Background(), "spent")
	var oe *OAuthError
	if !errors.As(err, &oe) {
		t.Fatalf("err = %v, want *OAuthError", err)
	}
	if oe.Code != "invalid_grant" || oe.Reason != ReasonUnauthorized || oe.Status != 400 {
		t.Errorf("error = %+v", oe)
	}
	if strings.Contains(err.Error(), "revoked") || strings.Contains(err.Error(), "spent") {
		t.Errorf("error text carries the description or the token: %v", err)
	}
}

func TestOAuthRevoke(t *testing.T) {
	ctx := context.Background()
	o, rt := oauthClient(t, "oauth_revoke.success.200.json", "oauth_revoke.forbidden.403.json")
	if err := o.Revoke(ctx, "tok1"); err != nil {
		t.Fatal(err)
	}
	form, _ := url.ParseQuery(rt.sent[0].body)
	if rt.sent[0].path != "/oauth2/revoke" || form.Get("token") != "tok1" || form.Get("client_id") != CloudflareClientID {
		t.Errorf("revoke request = %s %v", rt.sent[0].path, form)
	}
	err := o.Revoke(ctx, "tok1")
	var oe *OAuthError
	if !errors.As(err, &oe) || oe.Reason != ReasonForbidden || strings.Contains(err.Error(), "tok1") {
		t.Errorf("err = %v, want a forbidden OAuthError without the token", err)
	}
}
