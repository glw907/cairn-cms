package health

import (
	"context"

	"github.com/glw907/cairn-cms/tool/internal/providers"
	"github.com/glw907/cairn-cms/tool/internal/record"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// zoneSettingByID returns the value of the zone setting named id, and whether settings carried
// one.
func zoneSettingByID(settings []providers.ZoneSetting, id string) (any, bool) {
	for _, setting := range settings {
		if setting.ID == id {
			return setting.Value, true
		}
	}
	return nil, false
}

// hstsEnabled reports whether value, the "security_header" zone setting's decoded value, carries
// an enabled strict_transport_security entry. Any shape this function does not recognize (the
// setting absent, or a field missing or of the wrong type) reads as not enabled: an operator who
// has never touched the setting gets a Failing HSTS half, not a silently skipped one.
func hstsEnabled(value any) bool {
	header, ok := value.(map[string]any)
	if !ok {
		return false
	}
	hsts, ok := header["strict_transport_security"].(map[string]any)
	if !ok {
		return false
	}
	enabled, _ := hsts["enabled"].(bool)
	return enabled
}

// httpsForcedCheck ports the zone's HTTPS posture, both halves off one settings read:
// "always_use_https", whose absence fails the admin's CSRF guard outright for an editor signing
// in over an http origin, and the "security_header" strict_transport_security entry behind it.
type httpsForcedCheck struct{}

// ID implements Check.
func (httpsForcedCheck) ID() string { return "https-forced" }

// Needs implements Check.
func (httpsForcedCheck) Needs() Tier { return TierCF }

// Run implements Check. The two halves report as one verdict, HTTPS first: Always Use HTTPS off
// is the more severe failure and the one src/lib/diagnostics/conditions.ts carries an id for, so
// it names edge.https-not-forced even when HSTS is off too, and Detail then names both. HSTS off
// on its own has no condition id of its own to declare, so it names the setting in Detail alone
// rather than borrowing an id for a setting it does not describe.
func (httpsForcedCheck) Run(ctx context.Context, r record.Record, c Clients, _ Options) spine.Outcome {
	if r.Cloudflare.ZoneID == "" {
		return spine.Outcome{State: spine.Unknown, Reason: spine.ReasonNotObservable, Detail: "no zone id recorded for this site"}
	}
	settings, err := c.CF.ZoneSettings(ctx, r.Cloudflare.ZoneID)
	if err != nil {
		return apiErrorOutcome(err)
	}

	forced, ok := zoneSettingByID(settings, "always_use_https")
	if !ok {
		return spine.Outcome{State: spine.Unknown, Reason: spine.ReasonNotObservable, Detail: "zone settings carried no always_use_https entry"}
	}
	header, _ := zoneSettingByID(settings, "security_header")
	hsts := hstsEnabled(header)

	if on, _ := forced.(string); on != "on" {
		detail := "always-use-https-off"
		if !hsts {
			detail += "; hsts-off"
		}
		return spine.Outcome{State: spine.Failing, Condition: spine.ConditionEdgeHTTPSNotForced, Detail: detail}
	}
	if !hsts {
		return spine.Outcome{State: spine.Failing, Detail: "hsts-off"}
	}
	return spine.Outcome{State: spine.OK}
}
