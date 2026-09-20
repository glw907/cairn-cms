package providers

import (
	"net/http"
	"testing"
)

// TestReasonForStatusDisambiguatesGitHub403 covers the header discrimination reasonForStatus adds
// over a plain status switch: GitHub's two 403 shapes classify differently depending on which
// rate-limit header, if any, accompanies the status, and a 403 with neither header still
// classifies as forbidden, matching classifyGitHubReason's former table.
func TestReasonForStatusDisambiguatesGitHub403(t *testing.T) {
	tests := []struct {
		name   string
		header http.Header
		want   Reason
	}{
		{"exhausted primary rate limit", http.Header{"X-Ratelimit-Remaining": {"0"}}, ReasonRateLimited},
		{"retry-after present", http.Header{"Retry-After": {"30"}}, ReasonRateLimited},
		{"neither header, a plain permission refusal", http.Header{}, ReasonForbidden},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := reasonForStatus(http.StatusForbidden, tt.header); got != tt.want {
				t.Errorf("reasonForStatus(403, %v) = %v, want %v", tt.header, got, tt.want)
			}
		})
	}
}

// TestReasonForStatusAgreesAcrossProvidersForStatusOnlyCodes asserts that for a status whose
// classification depends on the status alone (every status but the header-discriminated 403),
// the Cloudflare and GitHub paths, both of which fall through to reasonForStatus, return the same
// Reason. The 403 case is deliberately excluded: its classification depends on headers, so a
// blanket identity claim across both paths would be false the moment that discrimination fires.
func TestReasonForStatusAgreesAcrossProvidersForStatusOnlyCodes(t *testing.T) {
	statuses := []int{http.StatusUnauthorized, http.StatusNotFound, http.StatusTooManyRequests, http.StatusServiceUnavailable, http.StatusTeapot}
	for _, status := range statuses {
		cloudflareReason := classifyReason(status, nil, http.Header{})
		githubReason := reasonForStatus(status, http.Header{})
		if cloudflareReason != githubReason {
			t.Errorf("status %d: classifyReason = %v, reasonForStatus = %v, want equal", status, cloudflareReason, githubReason)
		}
	}
}

// TestAPIErrorAndGitHubErrorSatisfyProviderError asserts both response failure types implement
// ProviderError, so a caller outside this package has one verdict function instead of one per
// provider.
func TestAPIErrorAndGitHubErrorSatisfyProviderError(t *testing.T) {
	var _ ProviderError = (*APIError)(nil)
	var _ ProviderError = (*GitHubError)(nil)

	apiErr := &APIError{Status: http.StatusForbidden, Reason: ReasonForbidden}
	if apiErr.ClassifiedReason() != ReasonForbidden || apiErr.HTTPStatus() != http.StatusForbidden {
		t.Errorf("APIError: ClassifiedReason() = %v, HTTPStatus() = %d, want %v and %d", apiErr.ClassifiedReason(), apiErr.HTTPStatus(), ReasonForbidden, http.StatusForbidden)
	}

	ghErr := &GitHubError{Status: http.StatusNotFound, Reason: ReasonNotFound}
	if ghErr.ClassifiedReason() != ReasonNotFound || ghErr.HTTPStatus() != http.StatusNotFound {
		t.Errorf("GitHubError: ClassifiedReason() = %v, HTTPStatus() = %d, want %v and %d", ghErr.ClassifiedReason(), ghErr.HTTPStatus(), ReasonNotFound, http.StatusNotFound)
	}
}
