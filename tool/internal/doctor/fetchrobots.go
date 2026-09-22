package doctor

import (
	"context"
	"io"
	"net/http"
)

// robotsBodyCap bounds how much of a served robots.txt FetchRobots reads, so a site serving an
// endless body cannot exhaust the process. 64 KiB is ample for a robots.txt; a body hitting the
// cap is parsed as far as it read.
const robotsBodyCap = 64 * 1024

// robotsClient is the one HTTP client ai.posture-effective's fetch uses. It does not use
// internal/providers: those clients carry credentials and a host pin this credential-free probe
// has no use for. CheckRedirect returns the redirect unfollowed, matching
// internal/providers/transport.go's own policy, so a site redirecting /robots.txt to a third
// party cannot make the tool fetch that third party; the unfollowed response's non-200 status
// falls through to the non-200 arm. It sets no Authorization header, no cookie, and no cookie
// jar, so the request is credential-free by construction, and it carries no timeout of its own:
// the deadline is the caller's context, the same one --timeout already bounds.
var robotsClient = &http.Client{
	CheckRedirect: func(*http.Request, []*http.Request) error {
		return http.ErrUseLastResponse
	},
}

// FetchRobots performs ai.posture-effective's one network request, the single GET this whole
// command makes: a credential-free fetch of origin's /robots.txt, filling the Snapshot.Robots
// field the command layer stamps before any check runs. It is deliberately isolated in its own
// file, never inside a Check.Run: TestNoCheckFunctionReadsClockOrHoldsClient (snapshot_test.go)
// allowlists this one file by name for net/http, so the exception stays narrow and every other
// non-test file in this package keeps proving it holds no client. ctx carries the run's own
// deadline, the root command's --timeout, and nothing else bounds the request.
func FetchRobots(ctx context.Context, origin PublicOrigin) Robots {
	if origin.Source == OriginAbsent {
		return Robots{Present: false, Reason: RobotsAbsentNoOrigin}
	}
	target, ok := robotsURL(origin.Value)
	if !ok {
		return Robots{Present: false, Reason: RobotsAbsentUnparsedOrigin}
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, target.String(), nil)
	if err != nil {
		return Robots{Present: false, Reason: RobotsAbsentUnparsedOrigin}
	}
	res, err := robotsClient.Do(req)
	if err != nil {
		return Robots{Present: false, Reason: RobotsAbsentTransportFailure}
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return Robots{Present: false, Reason: RobotsAbsentNonOK}
	}

	body, err := io.ReadAll(io.LimitReader(res.Body, robotsBodyCap))
	if err != nil {
		return Robots{Present: false, Reason: RobotsAbsentTransportFailure}
	}
	return Robots{Present: true, Body: string(body)}
}
