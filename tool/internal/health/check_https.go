package health

import (
	"context"

	"github.com/glw907/cairn-cms/tool/internal/providers"
	"github.com/glw907/cairn-cms/tool/internal/record"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// zoneSettingByID returns the value of the zone setting named id, and whether settings carried
// one, the shared lookup both httpsForcedCheck and hstsCheck read from one ZoneSettings call.
func zoneSettingByID(settings []providers.ZoneSetting, id string) (any, bool) {
	for _, setting := range settings {
		if setting.ID == id {
			return setting.Value, true
		}
	}
	return nil, false
}

// zoneSettings reads r's zone settings, translating a missing zone id and a classified
// Cloudflare API failure into the Unknown outcomes both httpsForcedCheck and hstsCheck share.
// The second return is only meaningful when the *spine.Outcome return is nil.
func zoneSettings(ctx context.Context, r record.Record, c Clients) ([]providers.ZoneSetting, *spine.Outcome) {
	if r.Cloudflare.ZoneID == "" {
		return nil, &spine.Outcome{State: spine.Unknown, Reason: spine.ReasonNotObservable, Detail: "no zone id recorded for this site"}
	}
	settings, err := c.CF.ZoneSettings(ctx, r.Cloudflare.ZoneID)
	if err != nil {
		outcome := apiErrorOutcome(err)
		return nil, &outcome
	}
	return settings, nil
}

// httpsForcedCheck ports the zone's "always_use_https" setting: a site whose editors sign in
// over an http origin fails the admin's CSRF guard outright (edge.https-not-forced).
type httpsForcedCheck struct{}

// ID implements Check.
func (httpsForcedCheck) ID() string { return "https-forced" }

// Condition implements Check. Always Use HTTPS off is exactly the condition
// src/lib/diagnostics/conditions.ts carries an id for.
func (httpsForcedCheck) Condition() spine.Condition { return spine.ConditionEdgeHTTPSNotForced }

// Needs implements Check.
func (httpsForcedCheck) Needs() Tier { return TierCF }

// Run implements Check.
func (httpsForcedCheck) Run(ctx context.Context, r record.Record, c Clients, _ Options) spine.Outcome {
	settings, failure := zoneSettings(ctx, r, c)
	if failure != nil {
		return *failure
	}
	value, ok := zoneSettingByID(settings, "always_use_https")
	if !ok {
		return spine.Outcome{State: spine.Unknown, Reason: spine.ReasonNotObservable, Detail: "zone settings carried no always_use_https entry"}
	}
	if on, _ := value.(string); on != "on" {
		return spine.Outcome{State: spine.Failing, Detail: "always-use-https-off"}
	}
	return spine.Outcome{State: spine.OK}
}

// hstsEnabled reports whether value, the "security_header" zone setting's decoded value, carries
// an enabled strict_transport_security entry. Any shape this method does not recognize (the
// setting absent, or a field missing or of the wrong type) reads as not enabled: an operator who
// has never touched the setting gets a Failing HSTS check, not a silently skipped one.
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

// hstsCheck ports the zone's "security_header" strict_transport_security setting. The engine's
// condition vocabulary carries no id for HSTS specifically (only for Always Use HTTPS), so this
// check declares ConditionNone rather than reusing httpsForcedCheck's id for a setting it does
// not describe.
type hstsCheck struct{}

// ID implements Check.
func (hstsCheck) ID() string { return "hsts" }

// Condition implements Check.
func (hstsCheck) Condition() spine.Condition { return spine.ConditionNone }

// Needs implements Check.
func (hstsCheck) Needs() Tier { return TierCF }

// Run implements Check.
func (hstsCheck) Run(ctx context.Context, r record.Record, c Clients, _ Options) spine.Outcome {
	settings, failure := zoneSettings(ctx, r, c)
	if failure != nil {
		return *failure
	}
	value, ok := zoneSettingByID(settings, "security_header")
	if !ok || !hstsEnabled(value) {
		return spine.Outcome{State: spine.Failing, Detail: "hsts-off"}
	}
	return spine.Outcome{State: spine.OK}
}
