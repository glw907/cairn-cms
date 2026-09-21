package health

import (
	"bytes"
	"context"
	"errors"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/providers"
	"github.com/glw907/cairn-cms/tool/internal/record"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// credRoundTripper serves a fixed status, body, and header to every request, standing in for
// Cloudflare's or GitHub's API in a creds check test.
type credRoundTripper struct {
	status int
	body   []byte
	header http.Header
}

func (rt credRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	header := rt.header
	if header == nil {
		header = make(http.Header)
	}
	return &http.Response{StatusCode: rt.status, Body: io.NopCloser(bytes.NewReader(rt.body)), Header: header, Request: req}, nil
}

// unreachableRoundTripper always fails to dial, standing in for a network-level failure that
// never reaches Cloudflare's or GitHub's own error classification at all.
type unreachableRoundTripper struct{}

func (unreachableRoundTripper) RoundTrip(*http.Request) (*http.Response, error) {
	return nil, errors.New("dial tcp: i/o timeout")
}

const cfVerifyOKBody = `{"success":true,"result":{"id":"token-id"}}`
const cfUnauthorizedBody = `{"success":false,"errors":[{"code":10000}]}`

func cfClient(rt http.RoundTripper) *providers.Cloudflare {
	return providers.NewCloudflare("acct", providers.NewCredential("cf-secret-value"), rt)
}

func ghClient(rt http.RoundTripper) *providers.GitHub {
	return providers.NewGitHub(providers.NewCredential("gh-secret-value"), rt)
}

// okCredsClients returns a Clients whose Cloudflare and GitHub credentials both verify cleanly,
// for a test that needs the whole health.All set to run without a credential failure.
func okCredsClients() Clients {
	return Clients{
		CF:     cfClient(credRoundTripper{status: http.StatusOK, body: []byte(cfVerifyOKBody)}),
		GH:     ghClient(credRoundTripper{status: http.StatusOK, body: []byte("{}")}),
		HaveCF: true,
		HaveGH: true,
		CFFrom: "environment",
		GHFrom: "keyring",
	}
}

func TestCredsCheckDeclaresIDAndTierNone(t *testing.T) {
	c := credsCheck{}
	if got, want := c.ID(), "creds"; got != want {
		t.Errorf("ID() = %q, want %q", got, want)
	}
	if got := c.Needs(); got != TierNone {
		t.Errorf("Needs() = %v, want TierNone", got)
	}
}

func TestCredsCheckBothCredentialsValid(t *testing.T) {
	c := credsCheck{}
	clients := okCredsClients()

	outcome := c.Run(context.Background(), record.Record{}, clients, validOptions)
	if outcome.State != spine.OK {
		t.Errorf("State = %v, want OK", outcome.State)
	}
	if err := outcome.Validate(); err != nil {
		t.Errorf("Validate: %v", err)
	}
	for _, provider := range []string{"environment", "keyring"} {
		if !strings.Contains(outcome.Detail, provider) {
			t.Errorf("Detail = %q, want it to name provider %q", outcome.Detail, provider)
		}
	}
	for _, secret := range []string{"cf-secret-value", "gh-secret-value"} {
		if strings.Contains(outcome.Detail, secret) {
			t.Errorf("Detail = %q, leaked the credential value %q", outcome.Detail, secret)
		}
	}

	report := Report{Checks: []CheckResult{{ID: c.ID(), Outcome: outcome}}}
	nonVerbose, err := report.JSON(false)
	if err != nil {
		t.Fatalf("JSON(false): %v", err)
	}
	for _, provider := range []string{"environment", "keyring"} {
		if !strings.Contains(string(nonVerbose), provider) {
			t.Errorf("JSON(false) = %s, want it to name provider %q", nonVerbose, provider)
		}
	}
	for _, secret := range []string{"cf-secret-value", "gh-secret-value"} {
		if strings.Contains(string(nonVerbose), secret) {
			t.Errorf("JSON(false) = %s, leaked the credential value %q", nonVerbose, secret)
		}
	}
}

func TestCredsCheckRevokedCredentialIsFailing(t *testing.T) {
	c := credsCheck{}
	clients := Clients{
		CF:     cfClient(credRoundTripper{status: http.StatusUnauthorized, body: []byte(cfUnauthorizedBody)}),
		GH:     ghClient(credRoundTripper{status: http.StatusOK, body: []byte("{}")}),
		HaveCF: true, HaveGH: true,
		CFFrom: "environment", GHFrom: "keyring",
	}

	outcome := c.Run(context.Background(), record.Record{}, clients, validOptions)
	if outcome.State != spine.Failing {
		t.Errorf("State = %v, want Failing", outcome.State)
	}
	if !strings.Contains(outcome.Detail, string(spine.ReasonCredRevoked)) {
		t.Errorf("Detail = %q, want it to name %s", outcome.Detail, spine.ReasonCredRevoked)
	}
	if err := outcome.Validate(); err != nil {
		t.Errorf("Validate: %v", err)
	}
}

func TestCredsCheckExpiringGitHubTokenIsFailing(t *testing.T) {
	c := credsCheck{}
	expiry := time.Now().Add(3 * 24 * time.Hour).UTC()
	header := make(http.Header)
	header.Set("Github-Authentication-Token-Expiration", expiry.Format("2006-01-02 15:04:05 MST"))
	clients := Clients{
		CF:     cfClient(credRoundTripper{status: http.StatusOK, body: []byte(cfVerifyOKBody)}),
		GH:     ghClient(credRoundTripper{status: http.StatusOK, body: []byte("{}"), header: header}),
		HaveCF: true, HaveGH: true,
		CFFrom: "environment", GHFrom: "keyring",
	}

	outcome := c.Run(context.Background(), record.Record{}, clients, validOptions)
	if outcome.State != spine.Failing {
		t.Errorf("State = %v, want Failing", outcome.State)
	}
	if !strings.Contains(outcome.Detail, string(spine.ReasonCredExpiring)) {
		t.Errorf("Detail = %q, want it to name %s", outcome.Detail, spine.ReasonCredExpiring)
	}
	if err := outcome.Validate(); err != nil {
		t.Errorf("Validate: %v", err)
	}
}

// TestCredsCheckZeroExpiryIsOK asserts a GitHub token whose response carries no expiry header (a
// classic PAT, an OAuth token, or a non-expiring fine-grained PAT) is OK, with Detail saying
// plainly that GitHub reports no expiry, never Unknown: an Unknown here would turn every
// scheduled run holding such a token into exit UNKNOWN.
func TestCredsCheckZeroExpiryIsOK(t *testing.T) {
	c := credsCheck{}
	clients := Clients{
		CF:     cfClient(credRoundTripper{status: http.StatusOK, body: []byte(cfVerifyOKBody)}),
		GH:     ghClient(credRoundTripper{status: http.StatusOK, body: []byte("{}")}),
		HaveCF: true, HaveGH: true,
		CFFrom: "environment", GHFrom: "keyring",
	}

	outcome := c.Run(context.Background(), record.Record{}, clients, validOptions)
	if outcome.State != spine.OK {
		t.Errorf("State = %v, want OK", outcome.State)
	}
	if !strings.Contains(outcome.Detail, "no expiry") {
		t.Errorf("Detail = %q, want it to say GitHub reports no expiry", outcome.Detail)
	}
	if err := outcome.Validate(); err != nil {
		t.Errorf("Validate: %v", err)
	}
}

func TestCredsCheckAbsentCredentialIsUnknownCredMissing(t *testing.T) {
	c := credsCheck{}
	clients := Clients{
		GH:     ghClient(credRoundTripper{status: http.StatusOK, body: []byte("{}")}),
		HaveCF: false, HaveGH: true,
		GHFrom: "keyring",
	}

	outcome := c.Run(context.Background(), record.Record{}, clients, validOptions)
	if outcome.State != spine.Unknown || outcome.Reason != spine.ReasonCredMissing {
		t.Errorf("Outcome = %+v, want Unknown/reason.cred-missing", outcome)
	}
	if err := outcome.Validate(); err != nil {
		t.Errorf("Validate: %v", err)
	}
}

func TestCredsCheckUnreachableEndpointIsUnknownTimeout(t *testing.T) {
	c := credsCheck{}
	clients := Clients{
		CF:     cfClient(unreachableRoundTripper{}),
		GH:     ghClient(credRoundTripper{status: http.StatusOK, body: []byte("{}")}),
		HaveCF: true, HaveGH: true,
		CFFrom: "environment", GHFrom: "keyring",
	}

	outcome := c.Run(context.Background(), record.Record{}, clients, validOptions)
	if outcome.State != spine.Unknown || outcome.Reason != spine.ReasonTimeout {
		t.Errorf("Outcome = %+v, want Unknown/reason.timeout", outcome)
	}
	if err := outcome.Validate(); err != nil {
		t.Errorf("Validate: %v", err)
	}
}
