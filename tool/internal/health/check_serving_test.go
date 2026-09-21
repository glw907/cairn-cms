package health

import (
	"context"
	"errors"
	"net"
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/providers"
	"github.com/glw907/cairn-cms/tool/internal/record"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

func TestServingCheckDeclaresIDAndTierNone(t *testing.T) {
	if got := (servingCheck{}).Needs(); got != TierNone {
		t.Errorf("Needs() = %v, want TierNone", got)
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
	got := probeServing(context.Background(), probe, record.Record{}, srv.Listener.Addr().String())

	if got.State != spine.OK {
		t.Errorf("State = %v, want OK (Outcome: %+v)", got.State, got)
	}
}

func TestProbeServingBareAdmin200IsFailing(t *testing.T) {
	srv := httptest.NewTLSServer(markerHandler(true))
	defer srv.Close()

	probe := providers.NewProbe(srv.Client().Transport, servingResolver{})
	got := probeServing(context.Background(), probe, record.Record{}, srv.Listener.Addr().String())

	if got.State != spine.Failing || got.Detail != detailServingHostnameMismatch() {
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
	got := probeServing(context.Background(), probe, record.Record{}, srv.Listener.Addr().String())

	want := spine.ParkReason(spine.ParkCertificatePending)
	if got.State != spine.Unknown || got.Reason != want {
		t.Errorf("Outcome = %+v, want Unknown %s", got, want)
	}
}

func TestProbeServingHostnameRecordsAbsent(t *testing.T) {
	probe := providers.NewProbe(http.DefaultTransport, servingResolver{ns: nil})
	// 127.0.0.1:1 has no listener: both schemes fail to connect at all.
	got := probeServing(context.Background(), probe, record.Record{}, "127.0.0.1:1")

	want := spine.ParkReason(spine.ParkHostnameRecordsAbsent)
	if got.State != spine.Unknown || got.Reason != want {
		t.Errorf("Outcome = %+v, want Unknown %s", got, want)
	}
}

func TestProbeServingHostnameResolverLagging(t *testing.T) {
	probe := providers.NewProbeWithAuthority(
		http.DefaultTransport,
		servingResolver{ns: []*net.NS{{Host: "ada.ns.cloudflare.com."}}},
		fakeAuthority([]net.IP{net.ParseIP("2001:db8::1")}, nil),
	)
	got := probeServing(context.Background(), probe, record.Record{}, "127.0.0.1:1")

	want := spine.ParkReason(spine.ParkHostnameResolverLagging)
	if got.State != spine.Unknown || got.Reason != want {
		t.Errorf("Outcome = %+v, want Unknown %s", got, want)
	}
}

// fakeAuthority returns a canned providers.AuthorityLookup, for a test that must drive
// diagnoseUnreachable's propagation split with no real DNS dial: ips is the answer an
// authoritative nameserver would give, err stands in for that nameserver being unreachable
// outright. Every nameserver queried gets the same canned answer; a row that must prove which
// nameserver was actually queried uses authorityByNameserver instead.
func fakeAuthority(ips []net.IP, err error) providers.AuthorityLookup {
	return func(context.Context, string, string) ([]net.IP, error) {
		return ips, err
	}
}

// authorityByNameserver returns a providers.AuthorityLookup that answers per the queried
// nameserver host from answers (an unlisted host gets no records, no error), recording every
// host it is asked to query into queried. A table row uses it, instead of fakeAuthority's one
// canned answer for every nameserver, when the row must prove diagnoseUnreachable queried the
// specific nameserver it meant to, discovered or saved, rather than merely getting the right
// answer by coincidence.
func authorityByNameserver(answers map[string][]net.IP, queried *[]string) providers.AuthorityLookup {
	return func(_ context.Context, nameserver, _ string) ([]net.IP, error) {
		*queried = append(*queried, nameserver)
		return answers[nameserver], nil
	}
}

// TestDiagnoseUnreachablePropagationSplit is the table over diagnoseUnreachable's cases, all
// driven through the fake nameserver and authority lookups: an authoritative nameserver holding
// the record means resolver-lagging, and every other case (the record absent at the authority,
// every authoritative nameserver unreachable, or no nameservers known at all) means
// records-absent, the conservative default. The later rows exercise the discover-first,
// saved-pair-fallback order: an empty or erroring discovery falls back to the record's saved
// nameservers, and a non-empty discovery wins outright even when the saved pair would answer
// differently, with authorityByNameserver proving which nameserver was the one actually queried.
func TestDiagnoseUnreachablePropagationSplit(t *testing.T) {
	oneNS := []*net.NS{{Host: "ns1.example.test."}}
	answeringRecord := net.ParseIP("2001:db8::1")

	tests := []struct {
		name        string
		ns          []*net.NS
		nsErr       error
		assignedNS  []string
		authority   providers.AuthorityLookup
		answers     map[string][]net.IP
		wantQueried []string
		want        spine.ReasonCode
	}{
		{
			name:      "authority has record",
			ns:        oneNS,
			authority: fakeAuthority([]net.IP{answeringRecord}, nil),
			want:      spine.ParkReason(spine.ParkHostnameResolverLagging),
		},
		{
			name:      "authority lacks record",
			ns:        oneNS,
			authority: fakeAuthority(nil, nil),
			want:      spine.ParkReason(spine.ParkHostnameRecordsAbsent),
		},
		{
			name:      "authority unreachable",
			ns:        oneNS,
			authority: fakeAuthority(nil, errors.New("dial failed")),
			want:      spine.ParkReason(spine.ParkHostnameRecordsAbsent),
		},
		{
			name: "no nameservers known",
			ns:   nil,
			// A record present would flip the outcome if diagnoseUnreachable ever queried it;
			// it must not be reached at all when no nameservers are known.
			authority: fakeAuthority([]net.IP{answeringRecord}, nil),
			want:      spine.ParkReason(spine.ParkHostnameRecordsAbsent),
		},
		{
			name:       "discovery empty falls back to saved pair that has the record",
			ns:         nil,
			assignedNS: assignedPair,
			answers: map[string][]net.IP{
				assignedPair[0]: {answeringRecord},
				assignedPair[1]: {answeringRecord},
			},
			wantQueried: []string{assignedPair[0]},
			want:        spine.ParkReason(spine.ParkHostnameResolverLagging),
		},
		{
			name:       "discovery empty falls back to saved pair that lacks the record",
			ns:         nil,
			assignedNS: assignedPair,
			// answers is empty, so assignedPair's first host is unlisted and answers with no
			// record; wantQueried proves the saved pair, not some other host, was the one
			// actually queried.
			answers:     map[string][]net.IP{},
			wantQueried: []string{assignedPair[0]},
			want:        spine.ParkReason(spine.ParkHostnameRecordsAbsent),
		},
		{
			name:       "discovery erroring falls back to the saved pair",
			ns:         nil,
			nsErr:      errors.New("nameserver lookup failed"),
			assignedNS: assignedPair,
			answers: map[string][]net.IP{
				assignedPair[0]: {answeringRecord},
				assignedPair[1]: {answeringRecord},
			},
			wantQueried: []string{assignedPair[0]},
			want:        spine.ParkReason(spine.ParkHostnameResolverLagging),
		},
		{
			name:       "discovery present wins over a saved pair that would answer differently",
			ns:         oneNS,
			assignedNS: assignedPair,
			// The saved pair, if it were queried instead, would answer resolver-lagging; the
			// discovered nameserver ("ns1.example.test.") is unlisted in answers and so answers
			// with no record, giving records-absent, and wantQueried proves the saved pair was
			// never queried at all.
			answers: map[string][]net.IP{
				assignedPair[0]: {answeringRecord},
				assignedPair[1]: {answeringRecord},
			},
			wantQueried: []string{"ns1.example.test."},
			want:        spine.ParkReason(spine.ParkHostnameRecordsAbsent),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var queried []string
			authority := tt.authority
			if authority == nil {
				authority = authorityByNameserver(tt.answers, &queried)
			}
			probe := providers.NewProbeWithAuthority(http.DefaultTransport, servingResolver{ns: tt.ns, nsErr: tt.nsErr}, authority)
			r := delegationRecord(t, tt.assignedNS)
			got := diagnoseUnreachable(context.Background(), probe, r, "example.test", providers.RequestTimeout)
			if got.State != spine.Unknown || got.Reason != tt.want {
				t.Errorf("Outcome = %+v, want Unknown %s", got, tt.want)
			}
			if tt.wantQueried != nil && !reflect.DeepEqual(queried, tt.wantQueried) {
				t.Errorf("queried nameservers = %v, want %v", queried, tt.wantQueried)
			}
		})
	}
}

// TestDiagnoseUnreachableSweepSharesOneDeadline proves the per-nameserver loop applies one
// shared budget rather than one per nameserver: three nameservers whose authoritative lookup
// blocks until its context ends still return in close to one budget, not three.
func TestDiagnoseUnreachableSweepSharesOneDeadline(t *testing.T) {
	blocking := func(ctx context.Context, _, _ string) ([]net.IP, error) {
		<-ctx.Done()
		return nil, ctx.Err()
	}
	nameservers := []*net.NS{
		{Host: "ns1.example.test."},
		{Host: "ns2.example.test."},
		{Host: "ns3.example.test."},
	}
	probe := providers.NewProbeWithAuthority(http.DefaultTransport, servingResolver{ns: nameservers}, blocking)

	budget := 100 * time.Millisecond
	start := time.Now()
	got := diagnoseUnreachable(context.Background(), probe, record.Record{}, "example.test", budget)
	elapsed := time.Since(start)

	if elapsed >= 2*budget {
		t.Errorf("diagnoseUnreachable took %v for 3 blocking nameservers, want near the single shared budget %v", elapsed, budget)
	}
	want := spine.ParkReason(spine.ParkHostnameRecordsAbsent)
	if got.State != spine.Unknown || got.Reason != want {
		t.Errorf("Outcome = %+v, want Unknown %s", got, want)
	}
}
