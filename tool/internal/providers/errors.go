package providers

import (
	"fmt"
	"net/http"
)

// Reason classifies why a Cloudflare v4 API call failed, past the raw HTTP status, so a health
// check can render one stable, translatable message instead of branching on Cloudflare's own
// numeric codes. The set mirrors the conditions
// packages/create-cairn-site/src/cloudflare/api.mjs already catalogues for the Node CLI
// (throwMapped, throwBuildsMapped), and ReasonUnknown is the catch-all no health check should
// ever treat as a specific, actionable condition.
type Reason int

// The Reason values a Cloudflare call classifies to.
const (
	ReasonUnauthorized Reason = iota
	ReasonForbidden
	ReasonNotFound
	ReasonBuildsNotConnected
	ReasonBuildsRepoNotSelected
	ReasonBuildsAppNotAuthorized
	ReasonSenderNotConfigured
	ReasonRateLimited
	ReasonUnknown
)

// String names the Reason for a log line or an error message.
func (r Reason) String() string {
	switch r {
	case ReasonUnauthorized:
		return "unauthorized"
	case ReasonForbidden:
		return "forbidden"
	case ReasonNotFound:
		return "not-found"
	case ReasonBuildsNotConnected:
		return "builds-not-connected"
	case ReasonBuildsRepoNotSelected:
		return "builds-repo-not-selected"
	case ReasonBuildsAppNotAuthorized:
		return "builds-app-not-authorized"
	case ReasonSenderNotConfigured:
		return "sender-not-configured"
	case ReasonRateLimited:
		return "rate-limited"
	default:
		return "unknown"
	}
}

// APIError reports a Cloudflare v4 API call that did not succeed: a non-2xx status, or a 2xx
// whose envelope carries "success": false. Status and Code carry the raw HTTP status and the
// envelope's first error code (0 when the body carried none, or was not JSON at all), for a
// caller that wants to log the specifics; Reason is what a health check branches on.
type APIError struct {
	Status int
	Code   int
	Reason Reason
}

// Error implements the error interface.
func (e *APIError) Error() string {
	return fmt.Sprintf("cloudflare: %s (status %d, code %d)", e.Reason, e.Status, e.Code)
}

// classifyReason maps an HTTP status and a v4 envelope's first error code onto a Reason, the way
// throwMapped and throwBuildsMapped do for the Node CLI: a handful of codes are specific enough
// to classify on their own regardless of status (the two Builds authorization refusals, the two
// Email Sending sender-readiness codes, and the Builds per-worker triggers route's 404), and
// everything else falls back to the HTTP status family, which is how a plain unauthenticated or
// underscoped request classifies.
func classifyReason(status, code int) Reason {
	switch code {
	case 8000008:
		return ReasonBuildsAppNotAuthorized
	case 8000012:
		return ReasonBuildsRepoNotSelected
	case 10203, 10204:
		return ReasonSenderNotConfigured
	case 12000:
		return ReasonBuildsNotConnected
	}
	switch status {
	case http.StatusUnauthorized:
		return ReasonUnauthorized
	case http.StatusForbidden:
		return ReasonForbidden
	case http.StatusNotFound:
		return ReasonNotFound
	case http.StatusTooManyRequests, http.StatusServiceUnavailable:
		return ReasonRateLimited
	default:
		return ReasonUnknown
	}
}
