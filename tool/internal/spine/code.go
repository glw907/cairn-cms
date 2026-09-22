package spine

import "slices"

// Code is the tool's own closed vocabulary for a Failing outcome whose failure mode carries no
// cairn-doctor condition id (Condition) in src/lib/diagnostics/conditions.ts. Most Failing
// outcomes this tool measures have no id in that registry (docs/superpowers/specs/2026-08-20
// -cairn-tool-spine-and-hud-design.md's health table marks most checks "new"), and printing one
// of them as though it belonged to that registry would mislead a reader who greps the registry
// for it. Every Code value is prefixed "tool.", distinct from a Condition's own engine-owned
// dotted prefix, so the two vocabularies never collide even when read side by side.
type Code string

// CodeNone is the Code a verdict declares when the verdict is not Failing, or when it is Failing
// and already names a Condition. It is the only Code value with no dot in it.
const CodeNone Code = ""

// The tool-owned failure codes, one per Failing verdict a health check can declare that names no
// Condition. health's fix table (fixes.go) keys a fix line off whichever of Condition or Code a
// verdict carries.
const (
	CodeHTTPSHSTSOff         Code = "tool.https-hsts-off"
	CodeDelegationWrongNS    Code = "tool.delegation-wrong-nameservers"
	CodeServingMismatch      Code = "tool.serving-hostname-mismatch"
	CodeServingNotCairn      Code = "tool.serving-not-cairn"
	CodeEmailDMARCMissing    Code = "tool.email-dmarc-missing"
	CodeEmailDMARCNoPolicy   Code = "tool.email-dmarc-no-policy"
	CodeEmailDMARCPolicyNone Code = "tool.email-dmarc-policy-none"
	CodeEmailSPFMissing      Code = "tool.email-spf-missing"
	CodeEmailDKIMMissing     Code = "tool.email-dkim-missing"
	CodeDeployWorkerNotFound Code = "tool.deploy-worker-not-found"
	CodeDeployBuildFailed    Code = "tool.deploy-build-failed"
	CodePublishStaleBranch   Code = "tool.publish-path-stale-branch"
	CodeEngineBehind         Code = "tool.engine-behind"
	CodeErrorsAboveThreshold Code = "tool.errors-above-threshold"
	CodeCredsUnauthorized    Code = "tool.creds-unauthorized"
	CodeCredsForbidden       Code = "tool.creds-forbidden"
	CodeCredsExpiringSoon    Code = "tool.creds-expiring-soon"
)

// codes backs Codes.
var codes = []Code{
	CodeHTTPSHSTSOff,
	CodeDelegationWrongNS,
	CodeServingMismatch,
	CodeServingNotCairn,
	CodeEmailDMARCMissing,
	CodeEmailDMARCNoPolicy,
	CodeEmailDMARCPolicyNone,
	CodeEmailSPFMissing,
	CodeEmailDKIMMissing,
	CodeDeployWorkerNotFound,
	CodeDeployBuildFailed,
	CodePublishStaleBranch,
	CodeEngineBehind,
	CodeErrorsAboveThreshold,
	CodeCredsUnauthorized,
	CodeCredsForbidden,
	CodeCredsExpiringSoon,
}

// Codes is every known Code.
func Codes() []Code {
	return slices.Clone(codes)
}

// String returns c's own value, satisfying fmt.Stringer for a rendered report or log line.
func (c Code) String() string {
	return string(c)
}
