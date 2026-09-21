package health

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"testing"

	"github.com/glw907/cairn-cms/tool/internal/providers"
	"github.com/glw907/cairn-cms/tool/internal/record"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

var assignedPair = []string{"ada.ns.cloudflare.com", "walt.ns.cloudflare.com"}

// delegationRecord returns a record whose Cloudflare.Extra carries the "nameServers" key the
// Node CLI persists (chapter2.mjs), the way a real record round-trips it since record.Cloudflare
// does not type that key.
func delegationRecord(t *testing.T, nameServers []string) record.Record {
	t.Helper()
	raw, err := json.Marshal(nameServers)
	if err != nil {
		t.Fatalf("marshal nameServers: %v", err)
	}
	return record.Record{
		Domain: "example.test",
		Cloudflare: record.Cloudflare{
			Extra: []record.ExtraField{{Key: "nameServers", Value: raw}},
		},
	}
}

func delegationResolver(actual []string) servingResolver {
	ns := make([]*net.NS, len(actual))
	for i, host := range actual {
		ns[i] = &net.NS{Host: host}
	}
	return servingResolver{ns: ns}
}

// zoneRoundTripper answers every request with a Cloudflare v4 envelope wrapping a single zone.
type zoneRoundTripper struct {
	status int
	body   []byte
}

func (rt zoneRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	return &http.Response{StatusCode: rt.status, Body: io.NopCloser(bytes.NewReader(rt.body)), Header: make(http.Header), Request: req}, nil
}

func zoneEnvelope(status string) []byte {
	return []byte(`{"success":true,"result":[{"id":"zone-id","name":"example.test","status":"` + status + `"}]}`)
}

func TestDelegationCheckDeclaresIDAndTierCF(t *testing.T) {
	if got := (delegationCheck{}).Needs(); got != TierCF {
		t.Errorf("Needs() = %v, want TierCF", got)
	}
	if got := (delegationCheck{}).ID(); got != "delegation" {
		t.Errorf("ID() = %q, want %q", got, "delegation")
	}
}

func TestDelegationCheckActiveIsOK(t *testing.T) {
	r := delegationRecord(t, assignedPair)
	c := Clients{
		Probe:  providers.NewProbe(http.DefaultTransport, delegationResolver(assignedPair)),
		CF:     cfClient(zoneRoundTripper{status: http.StatusOK, body: zoneEnvelope("active")}),
		HaveCF: true,
	}

	got := (delegationCheck{}).Run(context.Background(), r, c, Options{})
	if got.State != spine.OK {
		t.Errorf("Outcome = %+v, want OK", got)
	}
}

func TestDelegationCheckPropagatingIsUnknownPark(t *testing.T) {
	r := delegationRecord(t, assignedPair)
	c := Clients{
		Probe:  providers.NewProbe(http.DefaultTransport, delegationResolver(assignedPair)),
		CF:     cfClient(zoneRoundTripper{status: http.StatusOK, body: zoneEnvelope("pending")}),
		HaveCF: true,
	}

	got := (delegationCheck{}).Run(context.Background(), r, c, Options{})
	want := spine.ParkReason(spine.ParkDelegationPropagating)
	if got.State != spine.Unknown || got.Reason != want {
		t.Errorf("Outcome = %+v, want Unknown %s", got, want)
	}
}

func TestDelegationCheckPendingIsUnknownPark(t *testing.T) {
	r := delegationRecord(t, assignedPair)
	c := Clients{
		Probe: providers.NewProbe(http.DefaultTransport, delegationResolver([]string{"ns1.old-registrar.test", "ns2.old-registrar.test"})),
		CF:    cfClient(zoneRoundTripper{status: http.StatusOK, body: zoneEnvelope("active")}),
		// The domain still points at the old registrar, so ZoneByName is never reached; a
		// missing CF client would still fail this test if it were.
		HaveCF: true,
	}

	got := (delegationCheck{}).Run(context.Background(), r, c, Options{})
	want := spine.ParkReason(spine.ParkDelegationPending)
	if got.State != spine.Unknown || got.Reason != want {
		t.Errorf("Outcome = %+v, want Unknown %s", got, want)
	}
}

func TestDelegationCheckWrongNameserversIsFailing(t *testing.T) {
	r := delegationRecord(t, assignedPair)
	c := Clients{
		Probe:  providers.NewProbe(http.DefaultTransport, delegationResolver([]string{"bob.ns.cloudflare.com", "carol.ns.cloudflare.com"})),
		CF:     cfClient(zoneRoundTripper{status: http.StatusOK, body: zoneEnvelope("active")}),
		HaveCF: true,
	}

	got := (delegationCheck{}).Run(context.Background(), r, c, Options{})
	if got.State != spine.Failing || got.Detail != detailDelegationWrongNameservers() {
		t.Errorf("Outcome = %+v, want Failing wrong-nameservers", got)
	}
}

func TestDelegationCheckNoAssignedNameServersIsUnknownNotObservable(t *testing.T) {
	r := record.Record{Domain: "example.test"}
	c := Clients{
		Probe:  providers.NewProbe(http.DefaultTransport, delegationResolver(assignedPair)),
		CF:     cfClient(zoneRoundTripper{status: http.StatusOK, body: zoneEnvelope("active")}),
		HaveCF: true,
	}

	got := (delegationCheck{}).Run(context.Background(), r, c, Options{})
	if got.State != spine.Unknown || got.Reason != spine.ReasonNotObservable {
		t.Errorf("Outcome = %+v, want Unknown reason.not-observable", got)
	}
}

func TestDelegationCheckAPIErrorIsUnknownNotFailing(t *testing.T) {
	r := delegationRecord(t, assignedPair)
	c := Clients{
		Probe:  providers.NewProbe(http.DefaultTransport, delegationResolver(assignedPair)),
		CF:     cfClient(zoneRoundTripper{status: http.StatusUnauthorized, body: []byte(cfUnauthorizedBody)}),
		HaveCF: true,
	}

	got := (delegationCheck{}).Run(context.Background(), r, c, Options{})
	if got.State != spine.Unknown {
		t.Errorf("State = %v, want Unknown (a 401 must never be Failing outside the creds check)", got.State)
	}
	if got.Reason != spine.APIReason(providers.ReasonUnauthorized) {
		t.Errorf("Reason = %q, want %q", got.Reason, spine.APIReason(providers.ReasonUnauthorized))
	}
}
