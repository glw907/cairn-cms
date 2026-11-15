package doctor

import (
	"context"
	"io"
	"net/http"
	"net/url"
)

// robotsBodyCap bounds how much of a served robots.txt FetchRobots reads, so a site serving an
// endless body cannot exhaust the process. 64 KiB is ample for a robots.txt; a body hitting the
// cap is parsed as far as it read.
const robotsBodyCap = 64 * 1024

// robotsClient is the one HTTP client ai.posture-effective's fetch uses. It does not use
// internal/providers: those clients carry credentials and a host pin this credential-free probe
// has no use for. CheckRedirect returns the redirect unfollowed, matching
// internal/providers/transport.go's policy, so a site redirecting /robots.txt to a third
// party cannot make the tool fetch that third party; the unfollowed response's non-200 status
// falls through to the non-200 arm. It sets no Authorization header, no cookie, and no cookie
// jar, so the request is credential-free by construction, and it carries no timeout:
// the deadline is the caller's context, the same one --timeout already bounds.
var robotsClient = &http.Client{
	CheckRedirect: func(*http.Request, []*http.Request) error {
		return http.ErrUseLastResponse
	},
}

// FetchRobots performs ai.posture-effective's one network request, the single GET this whole
// command makes: a credential-free fetch of origin's /robots.txt, filling the Snapshot.Robots
// field the command layer stamps before any check runs. ctx carries the run's deadline, the
// root command's --timeout, and nothing else bounds the request.
func FetchRobots(ctx context.Context, origin PublicOrigin) Robots {
	if origin.Source == originAbsent {
		return Robots{Present: false, Reason: robotsAbsentNoOrigin}
	}
	target, ok := robotsURL(origin.Value)
	if !ok {
		return Robots{Present: false, Reason: robotsAbsentUnparsedOrigin}
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, target.String(), nil)
	if err != nil {
		return Robots{Present: false, Reason: robotsAbsentUnparsedOrigin}
	}
	res, err := robotsClient.Do(req)
	if err != nil {
		return Robots{Present: false, Reason: robotsAbsentTransportFailure}
	}
	defer func() { _ = res.Body.Close() }()
	if res.StatusCode != http.StatusOK {
		return Robots{Present: false, Reason: robotsAbsentNonOK}
	}

	body, err := io.ReadAll(io.LimitReader(res.Body, robotsBodyCap))
	if err != nil {
		return Robots{Present: false, Reason: robotsAbsentTransportFailure}
	}
	return Robots{Present: true, Body: string(body)}
}

// robotsURL resolves origin's /robots.txt URL. ok is false when origin does not parse as an
// absolute http or https URL, the one scheme restriction the fetch policy states: any other
// scheme (a file:// origin, for instance) must never be dialed.
func robotsURL(origin string) (target *url.URL, ok bool) {
	u, err := url.Parse(origin)
	if err != nil || u.Host == "" || (u.Scheme != "http" && u.Scheme != "https") {
		return nil, false
	}
	return u.ResolveReference(&url.URL{Path: "/robots.txt"}), true
}
