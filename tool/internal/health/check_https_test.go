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
// zone settings list, counting the requests it served in calls when that field is set.
type settingsRoundTripper struct {
	status int
	body   []byte
	calls  *int
}

func (rt settingsRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	if rt.calls != nil {
		*rt.calls++
	}
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

func TestHTTPSForcedCheckDeclaresIDAndTierCF(t *testing.T) {
	if got := (httpsForcedCheck{}).Needs(); got != TierCF {
		t.Errorf("Needs() = %v, want TierCF", got)
	}
	if got := (httpsForcedCheck{}).ID(); got != "https-forced" {
		t.Errorf("ID() = %q, want %q", got, "https-forced")
	}
}

// TestHTTPSForcedCheckBothHalves covers the four settings combinations the one check reports on,
// each with the condition its own verdict declares: only Always Use HTTPS off names
// edge.https-not-forced, and HSTS off alone names none while still naming the setting in Detail.
func TestHTTPSForcedCheckBothHalves(t *testing.T) {
	tests := []struct {
		name           string
		alwaysUseHTTPS string
		hsts           bool
		wantState      spine.State
		wantDetail     string
		wantCondition  spine.Condition
	}{
		{"both on is OK", "on", true, spine.OK, "", spine.ConditionNone},
		{"hsts off alone fails with no condition", "on", false, spine.Failing, "hsts-off", spine.ConditionNone},
		{"https not forced fails with the https condition", "off", true, spine.Failing, "always-use-https-off", spine.ConditionEdgeHTTPSNotForced},
		{"both off reports https first and names both", "off", false, spine.Failing, "always-use-https-off; hsts-off", spine.ConditionEdgeHTTPSNotForced},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := Clients{CF: cfClient(settingsRoundTripper{status: http.StatusOK, body: zoneSettingsBody(tt.alwaysUseHTTPS, tt.hsts)}), HaveCF: true}
			got := (httpsForcedCheck{}).Run(context.Background(), zonedRecord(), c, Options{})
			if got.State != tt.wantState {
				t.Errorf("State = %v, want %v", got.State, tt.wantState)
			}
			if got.Detail != tt.wantDetail {
				t.Errorf("Detail = %q, want %q", got.Detail, tt.wantDetail)
			}
			if got.Condition != tt.wantCondition {
				t.Errorf("Condition = %q, want %q", got.Condition, tt.wantCondition)
			}
		})
	}
}

// TestHTTPSForcedCheckReadsZoneSettingsOnce asserts the merged check spends one settings request
// for both halves, the reason the two are one check rather than two.
func TestHTTPSForcedCheckReadsZoneSettingsOnce(t *testing.T) {
	calls := 0
	c := Clients{CF: cfClient(settingsRoundTripper{status: http.StatusOK, body: zoneSettingsBody("on", true), calls: &calls}), HaveCF: true}

	(httpsForcedCheck{}).Run(context.Background(), zonedRecord(), c, Options{})

	if calls != 1 {
		t.Errorf("zone settings requests = %d, want 1", calls)
	}
}

// TestHTTPSForcedCheckAbsentSecurityHeaderIsHSTSOff asserts a zone that has never carried a
// security_header setting reads as HSTS off rather than as an unobservable zone.
func TestHTTPSForcedCheckAbsentSecurityHeaderIsHSTSOff(t *testing.T) {
	body := []byte(`{"success":true,"result":[{"id":"always_use_https","value":"on"}]}`)
	c := Clients{CF: cfClient(settingsRoundTripper{status: http.StatusOK, body: body}), HaveCF: true}
	got := (httpsForcedCheck{}).Run(context.Background(), zonedRecord(), c, Options{})
	if got.State != spine.Failing || got.Detail != "hsts-off" {
		t.Errorf("Outcome = %+v, want Failing hsts-off", got)
	}
}

// TestHTTPSForcedCheckAbsentAlwaysUseHTTPSIsUnknown asserts a settings list missing the
// always_use_https entry is unobservable rather than read as off.
func TestHTTPSForcedCheckAbsentAlwaysUseHTTPSIsUnknown(t *testing.T) {
	body := []byte(`{"success":true,"result":[]}`)
	c := Clients{CF: cfClient(settingsRoundTripper{status: http.StatusOK, body: body}), HaveCF: true}
	got := (httpsForcedCheck{}).Run(context.Background(), zonedRecord(), c, Options{})
	if got.State != spine.Unknown || got.Reason != spine.ReasonNotObservable {
		t.Errorf("Outcome = %+v, want Unknown reason.not-observable", got)
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
