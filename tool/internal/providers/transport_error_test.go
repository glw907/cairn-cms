package providers

import (
	"context"
	"errors"
	"net"
	"net/http"
	"strings"
	"testing"
)

// failingTripper stands in for a network that cannot be reached.
type failingTripper struct{ err error }

func (f failingTripper) RoundTrip(*http.Request) (*http.Response, error) { return nil, f.err }

// TestAFailedRequestIsATransportErrorWithoutItsURL asserts the error a request with no response
// returns is typed, so a stop can show its cause, and that its text names the method, the pinned
// host, and the cause but never the path or the query, which can carry a one-time code.
func TestAFailedRequestIsATransportErrorWithoutItsURL(t *testing.T) {
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
	for _, leak := range []string{"abc123", "SECRET", "/zones", "dns_records", "?"} {
		if strings.Contains(err.Error(), leak) {
			t.Errorf("error text %q holds %q", err.Error(), leak)
		}
	}
}
