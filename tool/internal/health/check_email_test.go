package health

import (
	"context"
	"errors"
	"net"
	"net/http"
	"testing"

	"github.com/glw907/cairn-cms/tool/internal/providers"
	"github.com/glw907/cairn-cms/tool/internal/record"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// txtResolver answers LookupTXT from a fixed name-to-records map and errors NXDOMAIN-style on
// every other name, standing in for a DNS resolver whose only known records are the ones a test
// seeds. LookupNS and LookupIP are never called by the email check and always error.
type txtResolver struct {
	records map[string][]string
}

func (r txtResolver) LookupTXT(_ context.Context, name string) ([]string, error) {
	if records, ok := r.records[name]; ok {
		return records, nil
	}
	return nil, &net.DNSError{Err: "no such host", Name: name, IsNotFound: true}
}

func (txtResolver) LookupNS(context.Context, string) ([]*net.NS, error) {
	return nil, errors.New("not implemented")
}

func (txtResolver) LookupIP(context.Context, string, string) ([]net.IP, error) {
	return nil, errors.New("not implemented")
}

// emailClients builds the Clients an emailCheck test runs against: a Probe over records, and a
// Cloudflare client whose EmailSendingSubdomains answers with body.
func emailClients(records map[string][]string, rt http.RoundTripper) Clients {
	return Clients{
		Probe:  providers.NewProbe(http.DefaultTransport, txtResolver{records: records}),
		CF:     cfClient(rt),
		HaveCF: true,
	}
}

// fullyCompliantRecords seeds every DNS-hygiene record the email check reads, all passing, for
// example.test.
func fullyCompliantRecords() map[string][]string {
	return map[string][]string{
		"_dmarc.example.test":            {"v=DMARC1; p=reject"},
		"example.test":                   {"v=spf1 " + cloudflareSPFInclude + " ~all"},
		"google._domainkey.example.test": {"v=DKIM1; k=rsa; p=abc"},
	}
}

func sendingSubdomainsBody(enabled bool) []byte {
	return []byte(`{"success":true,"result":[{"name":"example.test","enabled":` + boolString(enabled) + `}]}`)
}

func TestEmailCheckDeclaresIDAndTierCF(t *testing.T) {
	if got := (emailCheck{}).Needs(); got != TierCF {
		t.Errorf("Needs() = %v, want TierCF", got)
	}
	if got := (emailCheck{}).ID(); got != "email" {
		t.Errorf("ID() = %q, want %q", got, "email")
	}
}

func TestEmailCheckOKWhenEveryHalfPasses(t *testing.T) {
	c := emailClients(fullyCompliantRecords(), settingsRoundTripper{status: http.StatusOK, body: sendingSubdomainsBody(true)})
	got := (emailCheck{}).Run(context.Background(), zonedRecord(), c, Options{})
	if got.State != spine.OK {
		t.Errorf("Outcome = %+v, want OK", got)
	}
}

func TestEmailCheckFailingWhenDMARCMissing(t *testing.T) {
	records := fullyCompliantRecords()
	delete(records, "_dmarc.example.test")
	c := emailClients(records, settingsRoundTripper{status: http.StatusOK, body: sendingSubdomainsBody(true)})
	got := (emailCheck{}).Run(context.Background(), zonedRecord(), c, Options{})
	if got.State != spine.Failing || got.Detail != "no _dmarc TXT record published" {
		t.Errorf("Outcome = %+v, want Failing no _dmarc TXT record published", got)
	}
}

func TestEmailCheckFailingWhenDMARCPolicyIsNone(t *testing.T) {
	records := fullyCompliantRecords()
	records["_dmarc.example.test"] = []string{"v=DMARC1; p=none"}
	c := emailClients(records, settingsRoundTripper{status: http.StatusOK, body: sendingSubdomainsBody(true)})
	got := (emailCheck{}).Run(context.Background(), zonedRecord(), c, Options{})
	if got.State != spine.Failing || got.Detail != "dmarc policy is p=none" {
		t.Errorf("Outcome = %+v, want Failing dmarc policy is p=none", got)
	}
}

func TestEmailCheckOKWhenDMARCPolicyIsReject(t *testing.T) {
	records := fullyCompliantRecords()
	records["_dmarc.example.test"] = []string{"v=DMARC1; p=reject"}
	c := emailClients(records, settingsRoundTripper{status: http.StatusOK, body: sendingSubdomainsBody(true)})
	got := (emailCheck{}).Run(context.Background(), zonedRecord(), c, Options{})
	if got.State != spine.OK {
		t.Errorf("Outcome = %+v, want OK", got)
	}
}

func TestEmailCheckFailingWhenSPFIncludeMissing(t *testing.T) {
	records := fullyCompliantRecords()
	records["example.test"] = []string{"v=spf1 include:_spf.example.com ~all"}
	c := emailClients(records, settingsRoundTripper{status: http.StatusOK, body: sendingSubdomainsBody(true)})
	got := (emailCheck{}).Run(context.Background(), zonedRecord(), c, Options{})
	if got.State != spine.Failing || got.Detail != "sending subdomain SPF record missing "+cloudflareSPFInclude {
		t.Errorf("Outcome = %+v, want Failing SPF include missing", got)
	}
}

func TestEmailCheckFailingWhenNoDKIMSelectorResolves(t *testing.T) {
	records := fullyCompliantRecords()
	delete(records, "google._domainkey.example.test")
	c := emailClients(records, settingsRoundTripper{status: http.StatusOK, body: sendingSubdomainsBody(true)})
	got := (emailCheck{}).Run(context.Background(), zonedRecord(), c, Options{})
	if got.State != spine.Failing || got.Detail != "no dkim selector txt resolved" {
		t.Errorf("Outcome = %+v, want Failing no dkim selector txt resolved", got)
	}
}

func TestEmailCheckOKWhenAnyKnownDKIMSelectorResolves(t *testing.T) {
	records := fullyCompliantRecords()
	delete(records, "google._domainkey.example.test")
	records["selector1._domainkey.example.test"] = []string{"v=DKIM1; k=rsa; p=xyz"}
	c := emailClients(records, settingsRoundTripper{status: http.StatusOK, body: sendingSubdomainsBody(true)})
	got := (emailCheck{}).Run(context.Background(), zonedRecord(), c, Options{})
	if got.State != spine.OK {
		t.Errorf("Outcome = %+v, want OK", got)
	}
}

func TestEmailCheckFailingWhenSendingSubdomainNotOnboarded(t *testing.T) {
	c := emailClients(fullyCompliantRecords(), settingsRoundTripper{status: http.StatusOK, body: []byte(`{"success":true,"result":[]}`)})
	got := (emailCheck{}).Run(context.Background(), zonedRecord(), c, Options{})
	if got.State != spine.Failing || got.Detail != "sending subdomain not onboarded" {
		t.Errorf("Outcome = %+v, want Failing sending subdomain not onboarded", got)
	}
}

func TestEmailCheckParkedWhenSendingSubdomainNotYetEnabled(t *testing.T) {
	c := emailClients(fullyCompliantRecords(), settingsRoundTripper{status: http.StatusOK, body: sendingSubdomainsBody(false)})
	got := (emailCheck{}).Run(context.Background(), zonedRecord(), c, Options{})
	want := spine.ParkReason(spine.ParkEmailNotReady)
	if got.State != spine.Unknown || got.Reason != want {
		t.Errorf("Outcome = %+v, want Unknown %s", got, want)
	}
}

func TestEmailCheckNoZoneIDIsUnknownNotObservable(t *testing.T) {
	c := emailClients(fullyCompliantRecords(), settingsRoundTripper{status: http.StatusOK, body: sendingSubdomainsBody(true)})
	got := (emailCheck{}).Run(context.Background(), record.Record{Domain: "example.test"}, c, Options{})
	if got.State != spine.Unknown || got.Reason != spine.ReasonNotObservable {
		t.Errorf("Outcome = %+v, want Unknown reason.not-observable", got)
	}
}

func TestEmailCheckAPIErrorIsUnknownNotFailing(t *testing.T) {
	c := emailClients(fullyCompliantRecords(), settingsRoundTripper{status: http.StatusUnauthorized, body: []byte(cfUnauthorizedBody)})
	got := (emailCheck{}).Run(context.Background(), zonedRecord(), c, Options{})
	if got.State != spine.Unknown {
		t.Errorf("State = %v, want Unknown (a 401 must never be Failing outside the creds check)", got.State)
	}
	if got.Reason != spine.APIReason(providers.ReasonUnauthorized) {
		t.Errorf("Reason = %q, want %q", got.Reason, spine.APIReason(providers.ReasonUnauthorized))
	}
}
