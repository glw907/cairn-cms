package health

import (
	"bytes"
	"context"
	"io"
	"net/http"
	"testing"

	"github.com/glw907/cairn-cms/tool/internal/providers"
	"github.com/glw907/cairn-cms/tool/internal/record"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// settingsRoundTripper answers every request with a Cloudflare v4 envelope wrapping body as the
// zone settings list.
type settingsRoundTripper struct {
	status int
	body   []byte
}

func (rt settingsRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	return &http.Response{StatusCode: rt.status, Body: io.NopCloser(bytes.NewReader(rt.body)), Header: make(http.Header), Request: req}, nil
}

// zoneSettingsBody builds a settings-list envelope carrying alwaysUseHTTPS and, when
// hstsEnabled, an enabled strict_transport_security entry.
func zoneSettingsBody(alwaysUseHTTPS string, hstsEnabled bool) []byte {
	return []byte(`{"success":true,"result":[` +
		`{"id":"always_use_https","value":"` + alwaysUseHTTPS + `"},` +
		`{"id":"security_header","value":{"strict_transport_security":{"enabled":` + boolString(hstsEnabled) + `}}}` +
		`]}`)
}

func boolString(b bool) string {
	if b {
		return "true"
	}
	return "false"
}

func zonedRecord() record.Record {
	return record.Record{Domain: "example.test", Cloudflare: record.Cloudflare{ZoneID: "zone-id"}}
}

func TestHTTPSForcedCheckDeclaresTierCFAndCondition(t *testing.T) {
	if got := (httpsForcedCheck{}).Needs(); got != TierCF {
		t.Errorf("Needs() = %v, want TierCF", got)
	}
	if got := (httpsForcedCheck{}).Condition(); got != spine.ConditionEdgeHTTPSNotForced {
		t.Errorf("Condition() = %q, want ConditionEdgeHTTPSNotForced", got)
	}
	if got := (httpsForcedCheck{}).ID(); got != "https-forced" {
		t.Errorf("ID() = %q, want %q", got, "https-forced")
	}
}

func TestHSTSCheckDeclaresTierCFAndNoCondition(t *testing.T) {
	if got := (hstsCheck{}).Needs(); got != TierCF {
		t.Errorf("Needs() = %v, want TierCF", got)
	}
	if got := (hstsCheck{}).Condition(); got != spine.ConditionNone {
		t.Errorf("Condition() = %q, want ConditionNone", got)
	}
	if got := (hstsCheck{}).ID(); got != "hsts" {
		t.Errorf("ID() = %q, want %q", got, "hsts")
	}
}

func TestHTTPSForcedCheckOKWhenOn(t *testing.T) {
	c := Clients{CF: cfClient(settingsRoundTripper{status: http.StatusOK, body: zoneSettingsBody("on", true)}), HaveCF: true}
	got := (httpsForcedCheck{}).Run(context.Background(), zonedRecord(), c, Options{})
	if got.State != spine.OK {
		t.Errorf("Outcome = %+v, want OK", got)
	}
}

func TestHTTPSForcedCheckFailingWhenOff(t *testing.T) {
	c := Clients{CF: cfClient(settingsRoundTripper{status: http.StatusOK, body: zoneSettingsBody("off", true)}), HaveCF: true}
	got := (httpsForcedCheck{}).Run(context.Background(), zonedRecord(), c, Options{})
	if got.State != spine.Failing || got.Detail != "always-use-https-off" {
		t.Errorf("Outcome = %+v, want Failing always-use-https-off", got)
	}
}

func TestHTTPSForcedCheckNoZoneIDIsUnknownNotObservable(t *testing.T) {
	c := Clients{CF: cfClient(settingsRoundTripper{status: http.StatusOK, body: zoneSettingsBody("on", true)}), HaveCF: true}
	got := (httpsForcedCheck{}).Run(context.Background(), record.Record{Domain: "example.test"}, c, Options{})
	if got.State != spine.Unknown || got.Reason != spine.ReasonNotObservable {
		t.Errorf("Outcome = %+v, want Unknown reason.not-observable", got)
	}
}

func TestHTTPSForcedCheckAPIErrorIsUnknownNotFailing(t *testing.T) {
	c := Clients{CF: cfClient(settingsRoundTripper{status: http.StatusUnauthorized, body: []byte(cfUnauthorizedBody)}), HaveCF: true}
	got := (httpsForcedCheck{}).Run(context.Background(), zonedRecord(), c, Options{})
	if got.State != spine.Unknown {
		t.Errorf("State = %v, want Unknown (a 401 must never be Failing outside the creds check)", got.State)
	}
	if got.Reason != spine.APIReason(providers.ReasonUnauthorized) {
		t.Errorf("Reason = %q, want %q", got.Reason, spine.APIReason(providers.ReasonUnauthorized))
	}
}

func TestHSTSCheckOKWhenEnabled(t *testing.T) {
	c := Clients{CF: cfClient(settingsRoundTripper{status: http.StatusOK, body: zoneSettingsBody("on", true)}), HaveCF: true}
	got := (hstsCheck{}).Run(context.Background(), zonedRecord(), c, Options{})
	if got.State != spine.OK {
		t.Errorf("Outcome = %+v, want OK", got)
	}
}

func TestHSTSCheckFailingWhenDisabled(t *testing.T) {
	c := Clients{CF: cfClient(settingsRoundTripper{status: http.StatusOK, body: zoneSettingsBody("on", false)}), HaveCF: true}
	got := (hstsCheck{}).Run(context.Background(), zonedRecord(), c, Options{})
	if got.State != spine.Failing || got.Detail != "hsts-off" {
		t.Errorf("Outcome = %+v, want Failing hsts-off", got)
	}
}

func TestHSTSCheckFailingWhenSettingAbsent(t *testing.T) {
	body := []byte(`{"success":true,"result":[{"id":"always_use_https","value":"on"}]}`)
	c := Clients{CF: cfClient(settingsRoundTripper{status: http.StatusOK, body: body}), HaveCF: true}
	got := (hstsCheck{}).Run(context.Background(), zonedRecord(), c, Options{})
	if got.State != spine.Failing || got.Detail != "hsts-off" {
		t.Errorf("Outcome = %+v, want Failing hsts-off", got)
	}
}

func TestHSTSCheckAPIErrorIsUnknownNotFailing(t *testing.T) {
	c := Clients{CF: cfClient(settingsRoundTripper{status: http.StatusUnauthorized, body: []byte(cfUnauthorizedBody)}), HaveCF: true}
	got := (hstsCheck{}).Run(context.Background(), zonedRecord(), c, Options{})
	if got.State != spine.Unknown {
		t.Errorf("State = %v, want Unknown (a 401 must never be Failing outside the creds check)", got.State)
	}
}
