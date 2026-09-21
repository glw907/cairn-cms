package health

import (
	"context"
	"net"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/glw907/cairn-cms/tool/internal/providers"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

func TestServingCheckDeclaresTierNoneAndNoCondition(t *testing.T) {
	if got := (servingCheck{}).Needs(); got != TierNone {
		t.Errorf("Needs() = %v, want TierNone", got)
	}
	if got := (servingCheck{}).Condition(); got != spine.ConditionNone {
		t.Errorf("Condition() = %q, want ConditionNone", got)
	}
	if got := (servingCheck{}).ID(); got != "serving" {
		t.Errorf("ID() = %q, want %q", got, "serving")
	}
}

// markerHandler answers the site-specific marker pair: "/" is 200, and "/admin" is a 303 to
// adminLoginPath, unless bareAdmin200 asks for an unmarked "/admin" instead.
func markerHandler(bareAdmin200 bool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/admin":
			if bareAdmin200 {
				w.WriteHeader(http.StatusOK)
				return
			}
			http.Redirect(w, r, adminLoginPath, http.StatusSeeOther)
		default:
			w.WriteHeader(http.StatusOK)
		}
	}
}

// servingResolver is a fakeResolver whose NS answer is fixed, standing in for the domain's
// authoritative delegation state in the unreachable-origin tests.
type servingResolver struct {
	ns    []*net.NS
	nsErr error
}

func (r servingResolver) LookupTXT(context.Context, string) ([]string, error) { return nil, nil }

func (r servingResolver) LookupNS(context.Context, string) ([]*net.NS, error) {
	return r.ns, r.nsErr
}

func (r servingResolver) LookupIP(context.Context, string, string) ([]net.IP, error) {
	return nil, nil
}

func TestProbeServingLiveIsOK(t *testing.T) {
	srv := httptest.NewTLSServer(markerHandler(false))
	defer srv.Close()

	probe := providers.NewProbe(srv.Client().Transport, servingResolver{})
	got := probeServing(context.Background(), probe, srv.Listener.Addr().String())

	if got.State != spine.OK {
		t.Errorf("State = %v, want OK (Outcome: %+v)", got.State, got)
	}
}

func TestProbeServingBareAdmin200IsFailing(t *testing.T) {
	srv := httptest.NewTLSServer(markerHandler(true))
	defer srv.Close()

	probe := providers.NewProbe(srv.Client().Transport, servingResolver{})
	got := probeServing(context.Background(), probe, srv.Listener.Addr().String())

	if got.State != spine.Failing || got.Detail != "hostname-not-serving" {
		t.Errorf("Outcome = %+v, want Failing hostname-not-serving", got)
	}
}

func TestProbeServingCertificatePendingFallsBackToHTTP(t *testing.T) {
	// A plain HTTP server serving the marker pair: an HTTPS attempt against it fails at the
	// transport level (no TLS handshake at all), the shape confirmHostname's own comment
	// documents for a zone whose certificate has not finished issuing.
	srv := httptest.NewServer(markerHandler(false))
	defer srv.Close()

	probe := providers.NewProbe(http.DefaultTransport, servingResolver{})
	got := probeServing(context.Background(), probe, srv.Listener.Addr().String())

	want := spine.ParkReason(spine.ParkCertificatePending)
	if got.State != spine.Unknown || got.Reason != want {
		t.Errorf("Outcome = %+v, want Unknown %s", got, want)
	}
}

func TestProbeServingHostnameRecordsAbsent(t *testing.T) {
	probe := providers.NewProbe(http.DefaultTransport, servingResolver{ns: nil})
	// 127.0.0.1:1 has no listener: both schemes fail to connect at all.
	got := probeServing(context.Background(), probe, "127.0.0.1:1")

	want := spine.ParkReason(spine.ParkHostnameRecordsAbsent)
	if got.State != spine.Unknown || got.Reason != want {
		t.Errorf("Outcome = %+v, want Unknown %s", got, want)
	}
}

func TestProbeServingHostnameResolverLagging(t *testing.T) {
	probe := providers.NewProbe(http.DefaultTransport, servingResolver{
		ns: []*net.NS{{Host: "ada.ns.cloudflare.com."}},
	})
	got := probeServing(context.Background(), probe, "127.0.0.1:1")

	want := spine.ParkReason(spine.ParkHostnameResolverLagging)
	if got.State != spine.Unknown || got.Reason != want {
		t.Errorf("Outcome = %+v, want Unknown %s", got, want)
	}
}
