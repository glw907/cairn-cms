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

// errTXTResolver answers LookupTXT for one specific name with err, standing in for a resolver
// that cannot reach that record's authority at all, and NXDOMAIN-style absence for every other
// name. LookupNS and LookupIP are never called by the email check and always error.
type errTXTResolver struct {
	name string
	err  error
}

func (r errTXTResolver) LookupTXT(_ context.Context, name string) ([]string, error) {
	if name == r.name {
		return nil, r.err
	}
	return nil, &net.DNSError{Err: "no such host", Name: name, IsNotFound: true}
}

func (errTXTResolver) LookupNS(context.Context, string) ([]*net.NS, error) {
	return nil, errors.New("not implemented")
}

func (errTXTResolver) LookupIP(context.Context, string, string) ([]net.IP, error) {
	return nil, errors.New("not implemented")
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

func TestEmailCheckDeclaresIDAndTierNone(t *testing.T) {
	if got := (emailCheck{}).Needs(); got != TierNone {
		t.Errorf("Needs() = %v, want TierNone", got)
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
	if got.State != spine.Failing || got.Detail != detailEmailDMARCMissing() {
		t.Errorf("Outcome = %+v, want Failing no _dmarc TXT record published", got)
	}
}

func TestEmailCheckFailingWhenDMARCPolicyIsNone(t *testing.T) {
	records := fullyCompliantRecords()
	records["_dmarc.example.test"] = []string{"v=DMARC1; p=none"}
	c := emailClients(records, settingsRoundTripper{status: http.StatusOK, body: sendingSubdomainsBody(true)})
	got := (emailCheck{}).Run(context.Background(), zonedRecord(), c, Options{})
	if got.State != spine.Failing || got.Detail != detailEmailDMARCPolicyNone() {
		t.Errorf("Outcome = %+v, want Failing dmarc policy is p=none", got)
	}
}

func TestEmailCheckFailingWhenDMARCPolicyIsMixedCaseNone(t *testing.T) {
	records := fullyCompliantRecords()
	records["_dmarc.example.test"] = []string{"v=DMARC1; p=None"}
	c := emailClients(records, settingsRoundTripper{status: http.StatusOK, body: sendingSubdomainsBody(true)})
	got := (emailCheck{}).Run(context.Background(), zonedRecord(), c, Options{})
	if got.State != spine.Failing || got.Detail != detailEmailDMARCPolicyNone() {
		t.Errorf("Outcome = %+v, want Failing dmarc policy is p=none", got)
	}
}

func TestEmailCheckFailingWhenDMARCRecordCarriesNoPolicyTag(t *testing.T) {
	records := fullyCompliantRecords()
	records["_dmarc.example.test"] = []string{"v=DMARC1; rua=mailto:reports@example.test"}
	c := emailClients(records, settingsRoundTripper{status: http.StatusOK, body: sendingSubdomainsBody(true)})
	got := (emailCheck{}).Run(context.Background(), zonedRecord(), c, Options{})
	if got.State != spine.Failing || got.Detail != detailEmailDMARCNoPolicy() {
		t.Errorf("Outcome = %+v, want Failing dmarc record carries no p= policy", got)
	}
}

func TestCheckDMARCUnknownOnTransportFailureNotFailing(t *testing.T) {
	probe := providers.NewProbe(http.DefaultTransport, errTXTResolver{name: "_dmarc.example.test", err: errors.New("resolver unreachable")})
	got, ok := checkDMARC(context.Background(), probe, "example.test")
	if ok || got.State != spine.Unknown || got.Reason != spine.ReasonTimeout {
		t.Errorf("checkDMARC = %+v, ok=%v, want Unknown reason.timeout", got, ok)
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
	if got.State != spine.Failing || got.Detail != detailEmailSPFMissing(cloudflareSPFInclude) {
		t.Errorf("Outcome = %+v, want Failing SPF include missing", got)
	}
}

func TestEmailCheckOKWhenSPFIncludeIsMixedCase(t *testing.T) {
	records := fullyCompliantRecords()
	records["example.test"] = []string{"v=SPF1 include:_SPF.MX.Cloudflare.net ~all"}
	c := emailClients(records, settingsRoundTripper{status: http.StatusOK, body: sendingSubdomainsBody(true)})
	got := (emailCheck{}).Run(context.Background(), zonedRecord(), c, Options{})
	if got.State != spine.OK {
		t.Errorf("Outcome = %+v, want OK", got)
	}
}

func TestCheckSPFUnknownOnTransportFailureNotFailing(t *testing.T) {
	probe := providers.NewProbe(http.DefaultTransport, errTXTResolver{name: "example.test", err: errors.New("resolver unreachable")})
	got, ok := checkSPF(context.Background(), probe, "example.test")
	if ok || got.State != spine.Unknown || got.Reason != spine.ReasonTimeout {
		t.Errorf("checkSPF = %+v, ok=%v, want Unknown reason.timeout", got, ok)
	}
}

func TestCheckDKIMUnknownOnTransportFailureNotFailing(t *testing.T) {
	probe := providers.NewProbe(http.DefaultTransport, errTXTResolver{name: "google._domainkey.example.test", err: errors.New("resolver unreachable")})
	got, ok := checkDKIM(context.Background(), probe, "example.test")
	if ok || got.State != spine.Unknown || got.Reason != spine.ReasonTimeout {
		t.Errorf("checkDKIM = %+v, ok=%v, want Unknown reason.timeout", got, ok)
	}
}

func TestEmailCheckFailingWhenNoDKIMSelectorResolves(t *testing.T) {
	records := fullyCompliantRecords()
	delete(records, "google._domainkey.example.test")
	c := emailClients(records, settingsRoundTripper{status: http.StatusOK, body: sendingSubdomainsBody(true)})
	got := (emailCheck{}).Run(context.Background(), zonedRecord(), c, Options{})
	if got.State != spine.Failing || got.Detail != detailEmailDKIMMissing() {
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
	if got.State != spine.Failing || got.Detail != detailEmailSenderNotOnboarded() {
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

// noCFClients builds the Clients an emailCheck credential-tier test runs against: a Probe over
// records, and no Cloudflare client at all, the way a run with no Cloudflare credential resolved
// presents itself.
func noCFClients(records map[string][]string) Clients {
	return Clients{Probe: providers.NewProbe(http.DefaultTransport, txtResolver{records: records})}
}

func TestEmailCheckNoCFCredentialFailingDNSReportsTheDNSFault(t *testing.T) {
	records := fullyCompliantRecords()
	delete(records, "_dmarc.example.test")
	c := noCFClients(records)
	got := (emailCheck{}).Run(context.Background(), zonedRecord(), c, Options{})
	if got.State != spine.Failing || got.Detail != detailEmailDMARCMissing() {
		t.Errorf("Outcome = %+v, want Failing no _dmarc TXT record published", got)
	}
}

func TestEmailCheckNoCFCredentialCleanDNSReportsCredMissingAndDegradesReport(t *testing.T) {
	checks := []Check{emailCheck{}}
	report, err := Run(context.Background(), zonedRecord(), noCFClients(fullyCompliantRecords()), checks, validOptions, nil)
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	if len(report.Checks) != 1 {
		t.Fatalf("Checks = %v, want exactly one result", report.Checks)
	}
	got := report.Checks[0].Outcome
	if got.State != spine.Unknown || got.Reason != spine.ReasonCredMissing {
		t.Errorf("Outcome = %+v, want Unknown reason.cred-missing", got)
	}
	if !report.Degraded {
		t.Error("Degraded = false, want true when clean DNS parks on a missing Cloudflare credential")
	}
}

func TestEmailCheckCFCredentialPresentBehaviorUnchanged(t *testing.T) {
	c := emailClients(fullyCompliantRecords(), settingsRoundTripper{status: http.StatusOK, body: sendingSubdomainsBody(true)})
	got := (emailCheck{}).Run(context.Background(), zonedRecord(), c, Options{})
	if got.State != spine.OK {
		t.Errorf("Outcome = %+v, want OK when a Cloudflare credential is present and every half passes", got)
	}
}
