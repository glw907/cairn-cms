package providers

import (
	"context"
	"errors"
	"io"
	"net"
	"net/http"
	"strings"
	"syscall"
	"testing"
	"time"
)

// dialScriptRT answers each round trip from steps in order: a non-nil error is returned as the
// transport's failure, a nil one answers with status. It records every body it was sent.
type dialScriptRT struct {
	steps  []error
	status int
	bodies []string
}

func (s *dialScriptRT) RoundTrip(req *http.Request) (*http.Response, error) {
	body := ""
	if req.Body != nil {
		b, _ := io.ReadAll(req.Body)
		body = string(b)
	}
	s.bodies = append(s.bodies, body)
	if len(s.bodies) <= len(s.steps) && s.steps[len(s.bodies)-1] != nil {
		return nil, s.steps[len(s.bodies)-1]
	}
	status := s.status
	if status == 0 {
		status = http.StatusOK
	}
	return &http.Response{StatusCode: status, Header: http.Header{}, Body: io.NopCloser(strings.NewReader("")), Request: req}, nil
}

var (
	errDNS     = &net.DNSError{Err: "no such host", Name: "api.example.com"}
	errRefused = &net.OpError{Op: "dial", Net: "tcp", Err: syscall.ECONNREFUSED}
	errReset   = &net.OpError{Op: "read", Net: "tcp", Err: syscall.ECONNRESET}
)

// noWait replaces the retry wait for one test and records each wait it was asked for.
func noWait(t *testing.T) *[]time.Duration {
	t.Helper()
	var waits []time.Duration
	old := dialRetryWait
	dialRetryWait = func(_ context.Context, d time.Duration) error {
		waits = append(waits, d)
		return nil
	}
	t.Cleanup(func() { dialRetryWait = old })
	return &waits
}

func sendVia(t *testing.T, rt http.RoundTripper, method, body string, ctx context.Context) (*http.Response, error) {
	t.Helper()
	var r io.Reader
	if body != "" {
		r = strings.NewReader(body)
	}
	req, err := http.NewRequestWithContext(ctx, method, "https://api.example.com/x", r)
	if err != nil {
		t.Fatal(err)
	}
	return newClient("api.example.com", Credential{}, rt).Do(req)
}

func TestARequestThatNeverLeftIsRetried(t *testing.T) {
	for _, tc := range []struct {
		name   string
		method string
		body   string
		err    error
	}{
		{"a DNS failure on a GET", http.MethodGet, "", errDNS},
		{"a DNS failure on a POST", http.MethodPost, `{"a":1}`, errDNS},
		{"a dial refusal on a POST", http.MethodPost, `{"a":1}`, errRefused},
		{"a dial refusal on a PUT", http.MethodPut, `{"a":1}`, errRefused},
		{"a dial refusal on a DELETE", http.MethodDelete, "", errRefused},
	} {
		t.Run(tc.name, func(t *testing.T) {
			waits := noWait(t)
			rt := &dialScriptRT{steps: []error{tc.err}}
			resp, err := sendVia(t, rt, tc.method, tc.body, context.Background())
			if err != nil || resp.StatusCode != http.StatusOK {
				t.Fatalf("Do = %v, %v, want the second attempt's answer", resp, err)
			}
			if len(rt.bodies) != 2 {
				t.Errorf("calls = %d, want 2", len(rt.bodies))
			}
			for i, b := range rt.bodies {
				if b != tc.body {
					t.Errorf("attempt %d sent body %q, want %q", i+1, b, tc.body)
				}
			}
			if len(*waits) != 1 || (*waits)[0] != time.Second {
				t.Errorf("waits = %v, want one second", *waits)
			}
		})
	}
}

func TestAConnectionResetIsRetriedOnlyForAReadOnlyMethod(t *testing.T) {
	for _, tc := range []struct {
		method string
		body   string
		calls  int
	}{
		{http.MethodGet, "", 2},
		{http.MethodHead, "", 2},
		{http.MethodPost, `{"a":1}`, 1},
		{http.MethodPut, `{"a":1}`, 1},
		{http.MethodPatch, `{"a":1}`, 1},
		{http.MethodDelete, "", 1},
	} {
		t.Run(tc.method, func(t *testing.T) {
			noWait(t)
			rt := &dialScriptRT{steps: []error{errReset}}
			resp, err := sendVia(t, rt, tc.method, tc.body, context.Background())
			if len(rt.bodies) != tc.calls {
				t.Errorf("calls = %d, want %d", len(rt.bodies), tc.calls)
			}
			if tc.calls == 1 && (err == nil || !errors.Is(err, syscall.ECONNRESET)) {
				t.Errorf("Do = %v, %v, want the reset returned", resp, err)
			}
			if tc.calls == 2 && err != nil {
				t.Errorf("Do error = %v, want the retried answer", err)
			}
		})
	}
}

func TestAnHTTPStatusIsNeverRetriedAsATransportFailure(t *testing.T) {
	for _, status := range []int{401, 429, 503} {
		t.Run(http.StatusText(status), func(t *testing.T) {
			noWait(t)
			rt := &dialScriptRT{status: status}
			// A POST: the GET-only 429/503 rate-limit retry in doWithRetry does not apply.
			resp, err := sendVia(t, rt, http.MethodPost, `{"a":1}`, context.Background())
			if err != nil || resp.StatusCode != status {
				t.Fatalf("Do = %v, %v, want the %d response", resp, err, status)
			}
			if len(rt.bodies) != 1 {
				t.Errorf("calls = %d, want 1", len(rt.bodies))
			}
		})
	}
}

func TestDialRetriesStopAfterThreeAttempts(t *testing.T) {
	waits := noWait(t)
	rt := &dialScriptRT{steps: []error{errDNS, errDNS, errDNS, errDNS}}
	_, err := sendVia(t, rt, http.MethodGet, "", context.Background())
	if err == nil {
		t.Fatal("Do succeeded, want the DNS error")
	}
	if dnsErr, ok := errors.AsType[*net.DNSError](err); !ok || dnsErr.Name != "api.example.com" {
		t.Errorf("error = %v, want the DNS error", err)
	}
	if len(rt.bodies) != 3 {
		t.Errorf("calls = %d, want 3", len(rt.bodies))
	}
	if len(*waits) != 2 || (*waits)[0] != time.Second || (*waits)[1] != 2*time.Second {
		t.Errorf("waits = %v, want 1s then 2s", *waits)
	}
}

func TestACancelledContextStopsTheDialRetry(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	old := dialRetryWait
	dialRetryWait = func(ctx context.Context, _ time.Duration) error {
		cancel()
		return ctx.Err()
	}
	t.Cleanup(func() { dialRetryWait = old })
	rt := &dialScriptRT{steps: []error{errDNS, errDNS, errDNS}}
	_, err := sendVia(t, rt, http.MethodGet, "", ctx)
	if err == nil {
		t.Fatal("Do succeeded, want an error")
	}
	if len(rt.bodies) != 1 {
		t.Errorf("calls = %d, want 1 once the context ended", len(rt.bodies))
	}
}
