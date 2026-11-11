package providers

import (
	"context"
	"crypto/x509"
	"errors"
	"io"
	"net"
	"net/http"
	"strings"
	"syscall"
	"testing"
)

// failingTripper stands in for a network that cannot be reached.
type failingTripper struct{ err error }

func (f failingTripper) RoundTrip(*http.Request) (*http.Response, error) { return nil, f.err }

// TestAFailedRequestIsATransportErrorWithoutItsURL asserts the error a request with no response
// returns is typed, so a stop can show its cause, and that its text names the method, the pinned
// host, and the cause but never the path or the query, which can carry a one-time code.
func TestAFailedRequestIsATransportErrorWithoutItsURL(t *testing.T) {
	noWait(t)
	cause := &net.DNSError{Err: "no such host", Name: "api.cloudflare.com", IsNotFound: true}
	cf := NewCloudflare("acct123", Credential{}, failingTripper{err: cause})
	_, err := cf.DNSRecords(context.Background(), "abc123?token=SECRET")
	var te *TransportError
	if !errors.As(err, &te) {
		t.Fatalf("error = %v, want a *TransportError", err)
	}
	if te.Op != "Get" || te.Host != "api.cloudflare.com" || !errors.Is(err, cause) {
		t.Errorf("TransportError = %+v, want the method, the host, and the cause", te)
	}
	if want := "Get request to api.cloudflare.com: DNS lookup of api.cloudflare.com failed: no such host"; err.Error() != want {
		t.Errorf("error text = %q, want %q", err.Error(), want)
	}
	for _, leak := range []string{"abc123", "SECRET", "/zones", "dns_records", "?"} {
		if strings.Contains(err.Error(), leak) {
			t.Errorf("error text %q holds %q", err.Error(), leak)
		}
	}
}

// TestATransportErrorsTextNamesOnlyAFixedClass asserts Error() prints a class from a fixed set and
// never the cause's own text, which Go can fill with a proxy URL's credentials or a header's value.
func TestATransportErrorsTextNamesOnlyAFixedClass(t *testing.T) {
	for _, tc := range []struct {
		name  string
		cause error
		class string
	}{
		{"a DNS error", &net.DNSError{Err: "no such host", Name: "api.example.com"}, "DNS lookup of api.example.com failed: no such host"},
		{"a long DNS error", &net.DNSError{Err: strings.Repeat("e", 80), Name: strings.Repeat("n", 80)},
			"DNS lookup of " + strings.Repeat("n", 60) + " failed: " + strings.Repeat("e", 60)},
		{"a deadline", context.DeadlineExceeded, "timed out"},
		{"a refused dial", &net.OpError{Op: "dial", Net: "tcp", Err: syscall.ECONNREFUSED}, "connection refused"},
		{"an unreachable dial", &net.OpError{Op: "dial", Net: "tcp", Err: syscall.ENETUNREACH}, "network unreachable"},
		{"another dial failure", &net.OpError{Op: "dial", Net: "tcp", Err: errors.New("secret detail")}, "could not connect"},
		{"an x509 error", x509.UnknownAuthorityError{}, "TLS error"},
		{"a proxy URL in the text", errors.New(`invalid proxy address "http://user:SECRET@proxy.example:3128"`), "proxy error"},
		{"a proxy connect failure", &net.OpError{Op: "proxyconnect", Net: "tcp", Err: syscall.ECONNREFUSED}, "proxy error"},
		{"a Location header in the text", errors.New(`failed to parse Location header "https://x/?token=SECRET"`), "transport error"},
		{"an EOF", io.EOF, "connection closed unexpectedly"},
		{"a reset", &net.OpError{Op: "read", Net: "tcp", Err: syscall.ECONNRESET}, "connection closed unexpectedly"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			err := &TransportError{Op: "Get", Host: "api.example.com", Err: tc.cause}
			if want := "Get request to api.example.com: " + tc.class; err.Error() != want {
				t.Errorf("Error() = %q, want %q", err.Error(), want)
			}
			if strings.Contains(err.Error(), "SECRET") || strings.Contains(err.Error(), "secret") {
				t.Errorf("Error() = %q leaks the cause's text", err.Error())
			}
			if !errors.Is(err, tc.cause) {
				t.Error("the cause no longer unwraps")
			}
		})
	}
}

// TestACertificateErrorIsNotRetried asserts a read-only request is not repeated after a TLS or
// proxy failure, which a second try cannot change, while a timeout and an EOF still are.
func TestACertificateErrorIsNotRetried(t *testing.T) {
	for _, tc := range []struct {
		name  string
		err   error
		calls int
	}{
		{"a certificate error", x509.UnknownAuthorityError{}, 1},
		{"a proxy error", errors.New("proxyconnect tcp: refused"), 1},
		{"a timeout", context.DeadlineExceeded, 2},
		{"an EOF", io.EOF, 2},
	} {
		t.Run(tc.name, func(t *testing.T) {
			noWait(t)
			rt := &dialScriptRT{steps: []error{tc.err}}
			_, _ = sendVia(t, rt, http.MethodGet, "", context.Background())
			if len(rt.bodies) != tc.calls {
				t.Errorf("calls = %d, want %d", len(rt.bodies), tc.calls)
			}
		})
	}
}

// TestAProbeRequestIsNotRetriedOnADialFailure asserts Probe, which health and doctor read
// through, sends a request that failed on DNS once.
func TestAProbeRequestIsNotRetriedOnADialFailure(t *testing.T) {
	noWait(t)
	rt := &dialScriptRT{steps: []error{errDNS, errDNS, errDNS}}
	p := NewProbe(rt, nil)
	if _, err := p.Get(context.Background(), "https://api.example.com/x"); err == nil {
		t.Fatal("Get succeeded, want the DNS error")
	}
	if len(rt.bodies) != 1 {
		t.Errorf("calls = %d, want 1", len(rt.bodies))
	}
}
