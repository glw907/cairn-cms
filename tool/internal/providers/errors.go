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
	// ReasonBuildsNotConnected is never produced by classifyReason: a live probe confirmed
	// GET /accounts/{id}/builds/workers/{tag}/triggers answers 200 with an empty trigger list
	// for an unconnected worker, not a 404 with a distinct code. The caller that walks
	// BuildsConnections is the one that assigns this Reason itself when the returned list is
	// empty, so the constant stays for that caller even though this package never returns it as
	// part of an *APIError.
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

// classifyReason maps an HTTP status and a v4 envelope's errors onto a Reason, the way
// throwMapped and throwBuildsMapped do for the Node CLI. Four codes are specific enough to
// classify on their own regardless of status or position: the two Builds authorization refusals
// and the two Email Sending sender-readiness codes are matched against every entry of errs, not
// just the first, the same way the Node client's errors.some(...) does (api.mjs:335-349), since a
// warning ahead of the refusal must not make the row fall through to the status-only fallback.
// HTTP 400 with code 6003 also classifies as ReasonUnauthorized, the second half of the Node
// client's throwIfTokenInvalid (api.mjs:247-249: 400/6003 and 401/10000 both mean the token
// itself is unusable). There is no code for ReasonBuildsNotConnected here (see that constant's
// own doc comment); everything else falls back to the HTTP status family, which is how a plain
// unauthenticated or underscoped request classifies.
func classifyReason(status int, errs []v4Error) Reason {
	for _, e := range errs {
		switch e.Code {
		case 8000008:
			return ReasonBuildsAppNotAuthorized
		case 8000012:
			return ReasonBuildsRepoNotSelected
		case 10203, 10204:
			return ReasonSenderNotConfigured
		}
	}
	if status == http.StatusBadRequest && len(errs) > 0 && errs[0].Code == 6003 {
		return ReasonUnauthorized
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
