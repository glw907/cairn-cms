package spine

import "slices"

// Condition is a cairn-doctor condition id, the shared identity the readiness checklist, the
// doctor probe, and this tool's own checks draw from so the three surfaces agree. A Condition
// value is always either ConditionNone or one of the Conditions constants; it is never a
// ReasonCode or a ParkCode, which name why a check could not observe a verdict rather than which
// known failure mode a verdict names.
type Condition string

// ConditionNone is the Condition a verdict declares when no cairn-doctor condition id names it
// (docs/superpowers/specs/2026-08-20-cairn-tool-spine-and-hud-design.md's health table marks
// Deploy, Behind, Engine, the error count, and the credential check "new"). It is the only
// Condition value with no dot in it.
const ConditionNone Condition = ""

// The condition ids ported from src/lib/diagnostics/conditions.ts's REGISTRY.
const (
	ConditionEdgeHTTPSNotForced          Condition = "edge.https-not-forced"
	ConditionAuthCSRFTokenInvalid        Condition = "auth.csrf-token-invalid"
	ConditionAuthCSRFOriginMismatch      Condition = "auth.csrf-origin-mismatch"
	ConditionEmailSenderNotOnboarded     Condition = "email.sender-not-onboarded"
	ConditionEmailSendFailed             Condition = "email.send-failed"
	ConditionConfigBindingsMissing       Condition = "config.bindings-missing"
	ConditionConfigMediaBucketMissing    Condition = "config.media-bucket-missing"
	ConditionConfigObservabilityOff      Condition = "config.observability-off"
	ConditionConfigCSRFDisableMissing    Condition = "config.csrf-disable-missing"
	ConditionConfigPublicOriginInvalid   Condition = "config.public-origin-invalid"
	ConditionConfigSiteConfigInvalid     Condition = "config.site-config-invalid"
	ConditionConfigDependencyFloorsUnmet Condition = "config.dependency-floors-unmet"
	ConditionConfigTidyKeyMissing        Condition = "config.tidy-key-missing"
	ConditionAIPostureNotEffective       Condition = "ai.posture-not-effective"
	ConditionAuthStoreUnreachable        Condition = "auth.store-unreachable"
	ConditionAuthStoreUnmigrated         Condition = "auth.store-unmigrated"
	ConditionAuthUnknownRole             Condition = "auth.unknown-role"
	ConditionAuthRoleWiringMissing       Condition = "auth.role-wiring-missing"
	ConditionConfigNoReferrerBlanket     Condition = "config.no-referrer-blanket"
	ConditionAuthEmailNotNormalized      Condition = "auth.email-not-normalized"
	ConditionGitHubAppUnreachable        Condition = "github.app-unreachable"
	ConditionAdminMountIncomplete        Condition = "admin.mount-incomplete"
	ConditionAuthIdentityUnresolved      Condition = "auth.identity-unresolved"
	ConditionAuthIdentityUnknown         Condition = "auth.identity-unknown"
	ConditionAdminLoginProbeFailed       Condition = "admin.login-probe-failed"
)

// conditions backs Conditions, ported from src/lib/diagnostics/conditions.ts's REGISTRY.
var conditions = []Condition{
	ConditionEdgeHTTPSNotForced,
	ConditionAuthCSRFTokenInvalid,
	ConditionAuthCSRFOriginMismatch,
	ConditionEmailSenderNotOnboarded,
	ConditionEmailSendFailed,
	ConditionConfigBindingsMissing,
	ConditionConfigMediaBucketMissing,
	ConditionConfigObservabilityOff,
	ConditionConfigCSRFDisableMissing,
	ConditionConfigPublicOriginInvalid,
	ConditionConfigSiteConfigInvalid,
	ConditionConfigDependencyFloorsUnmet,
	ConditionConfigTidyKeyMissing,
	ConditionAIPostureNotEffective,
	ConditionAuthStoreUnreachable,
	ConditionAuthStoreUnmigrated,
	ConditionAuthUnknownRole,
	ConditionAuthRoleWiringMissing,
	ConditionConfigNoReferrerBlanket,
	ConditionAuthEmailNotNormalized,
	ConditionGitHubAppUnreachable,
	ConditionAdminMountIncomplete,
	ConditionAuthIdentityUnresolved,
	ConditionAuthIdentityUnknown,
	ConditionAdminLoginProbeFailed,
}

// Conditions is every known condition id. 2.0 seam kept on purpose: Conditions has no caller in
// 1.0 by design.
func Conditions() []Condition {
	return slices.Clone(conditions)
}
