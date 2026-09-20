package providers

import "net/http"

// Reason classifies why a provider API call failed, past the raw HTTP status, so a health check
// can render one stable, translatable message instead of branching on a provider's own numeric
// codes. The set mirrors the conditions
// packages/create-cairn-site/src/cloudflare/api.mjs already catalogues for the Node CLI
// (throwMapped, throwBuildsMapped), and ReasonUnknown is the catch-all no health check should
// ever treat as a specific, actionable condition.
type Reason int

// The Reason values a provider call classifies to.
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

// ProviderError is satisfied by APIError and GitHubError, the two response failures a caller
// outside this package (cmd/cairn's probe-token verdict) classifies uniformly, through one
// function, without branching on which provider produced the failure.
type ProviderError interface {
	error
	// ClassifiedReason returns the Reason the failing response classified to.
	ClassifiedReason() Reason
	// HTTPStatus returns the raw HTTP status the failing response carried.
	HTTPStatus() int
}

// reasonForStatus classifies an HTTP status into a Reason, using header to disambiguate a 403:
// GitHub returns 403 both for a rate limit and for a missing permission, and the status alone
// cannot tell them apart. A 403 carrying an exhausted primary rate limit
// (x-ratelimit-remaining: 0), or a Retry-After header, classifies as rate-limited and never as a
// forbidden credential, because misreading a rate limit as a forbidden credential would report a
// fault an operator cannot fix. A 403 carrying neither header classifies as forbidden, as it does
// today. Every other status classifies from the status alone, matching classifyGitHubReason's
// former table and the status arm of classifyReason.
func reasonForStatus(status int, header http.Header) Reason {
	if status == http.StatusForbidden && rateLimitedHeaders(header) {
		return ReasonRateLimited
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

// rateLimitedHeaders reports whether header carries either signal GitHub sets on a rate-limited
// 403: an exhausted primary rate limit, or a secondary rate limit's advisory wait.
func rateLimitedHeaders(header http.Header) bool {
	if header == nil {
		return false
	}
	if header.Get("x-ratelimit-remaining") == "0" {
		return true
	}
	return header.Get("Retry-After") != ""
}
