package doctor

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// snapshotForPosture builds a Snapshot carrying factsJSON at site-facts.json (when non-empty)
// and origin's real FetchRobots result, the same two inputs the command layer would stamp
// before running ai.posture-effective.
func snapshotForPosture(t *testing.T, factsJSON string, origin PublicOrigin) Snapshot {
	t.Helper()
	files := map[string]string{}
	if factsJSON != "" {
		files["src/content/.cairn/site-facts.json"] = factsJSON
	}
	s := snapshotWithFiles(t, files)
	s.PublicOrigin = origin
	s.Robots = FetchRobots(context.Background(), origin)
	return s
}

// TestAIPostureEffectiveDeclaredMatchesServed asserts a declared posture the served file also
// carries passes.
func TestAIPostureEffectiveDeclaredMatchesServed(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("User-agent: *\nAllow: /\nContent-Signal: ai-train=no\n"))
	}))
	defer srv.Close()

	s := snapshotForPosture(t, `{"version": 1, "aiPosture": "decline"}`, PublicOrigin{Value: srv.URL, Source: OriginFromEnv})
	result := AIPostureEffective.Run(s)
	if result.Status != StatusPass {
		t.Fatalf("Status = %v, want StatusPass (detail %q)", result.Status, result.Detail)
	}
}

// TestAIPostureEffectiveDeclaredDoesNotMatchServed asserts a declared posture the served file
// does not carry fails: the one case checks-local's port fails on.
func TestAIPostureEffectiveDeclaredDoesNotMatchServed(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("User-agent: *\nAllow: /\nContent-Signal: ai-train=no\n"))
	}))
	defer srv.Close()

	s := snapshotForPosture(t, `{"version": 1, "aiPosture": "invite"}`, PublicOrigin{Value: srv.URL, Source: OriginFromEnv})
	result := AIPostureEffective.Run(s)
	if result.Status != StatusFail {
		t.Fatalf("Status = %v, want StatusFail (detail %q)", result.Status, result.Detail)
	}
	if result.Condition != AIPostureEffective.Condition {
		t.Errorf("Condition = %q, want %q", result.Condition, AIPostureEffective.Condition)
	}
}

// TestAIPostureEffectiveNoDeclaredNoDirectives asserts a site stating no posture, whose served
// file carries no AI-crawler directives, passes: absence is honest.
func TestAIPostureEffectiveNoDeclaredNoDirectives(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("User-agent: *\nAllow: /\n"))
	}))
	defer srv.Close()

	s := snapshotForPosture(t, `{"version": 1}`, PublicOrigin{Value: srv.URL, Source: OriginFromEnv})
	result := AIPostureEffective.Run(s)
	if result.Status != StatusPass {
		t.Fatalf("Status = %v, want StatusPass (detail %q)", result.Status, result.Detail)
	}
}

// TestAIPostureEffectiveManagedLayerTwoUserAgentStarGroups asserts a served file carrying two
// "User-agent: *" groups, the shape a managed robots.txt produces by prepending to the origin's
// own file, passes and names the managed layer in its note rather than asserting a cause.
func TestAIPostureEffectiveManagedLayerTwoUserAgentStarGroups(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("User-agent: *\nDisallow: /private\n\nUser-agent: *\nAllow: /\n"))
	}))
	defer srv.Close()

	s := snapshotForPosture(t, `{"version": 1}`, PublicOrigin{Value: srv.URL, Source: OriginFromEnv})
	result := AIPostureEffective.Run(s)
	if result.Status != StatusPass {
		t.Fatalf("Status = %v, want StatusPass (detail %q)", result.Status, result.Detail)
	}
	if !strings.Contains(result.Detail, `2 "User-agent: *" groups`) {
		t.Errorf("Detail = %q, want it to name the managed-layer shape", result.Detail)
	}
}

// TestAIPostureEffectiveForeignContentSignal asserts a served file carrying a Content-Signal
// value cairn did not write passes and names it, without asserting the outside layer's cause.
func TestAIPostureEffectiveForeignContentSignal(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("User-agent: *\nContent-Signal: search=no\nAllow: /\n"))
	}))
	defer srv.Close()

	s := snapshotForPosture(t, `{"version": 1}`, PublicOrigin{Value: srv.URL, Source: OriginFromEnv})
	result := AIPostureEffective.Run(s)
	if result.Status != StatusPass {
		t.Fatalf("Status = %v, want StatusPass (detail %q)", result.Status, result.Detail)
	}
	if !strings.Contains(result.Detail, "Content-Signal directive cairn did not write") {
		t.Errorf("Detail = %q, want it to name the foreign Content-Signal", result.Detail)
	}
}

// TestAIPostureEffectiveNon200 asserts a non-200 response is unknown, never a failure: a doctor
// run must never read a serving problem as an AI-posture contradiction.
func TestAIPostureEffectiveNon200(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer srv.Close()

	s := snapshotForPosture(t, `{"version": 1}`, PublicOrigin{Value: srv.URL, Source: OriginFromEnv})
	result := AIPostureEffective.Run(s)
	if result.Status != StatusUnchecked {
		t.Fatalf("Status = %v, want StatusUnchecked (detail %q)", result.Status, result.Detail)
	}
	if result.Detail != detailPostureNonOK {
		t.Errorf("Detail = %q, want %q", result.Detail, detailPostureNonOK)
	}
}

// TestAIPostureEffectiveUnreachableOrigin asserts an origin that never answers is unknown: a
// doctor run offline must not read as an AI-posture problem.
func TestAIPostureEffectiveUnreachableOrigin(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	closedURL := srv.URL
	srv.Close()

	s := snapshotForPosture(t, `{"version": 1}`, PublicOrigin{Value: closedURL, Source: OriginFromEnv})
	result := AIPostureEffective.Run(s)
	if result.Status != StatusUnchecked {
		t.Fatalf("Status = %v, want StatusUnchecked (detail %q)", result.Status, result.Detail)
	}
	if result.Detail != detailPostureUnreachable {
		t.Errorf("Detail = %q, want %q", result.Detail, detailPostureUnreachable)
	}
}

// TestAIPostureEffectiveNoOriginAtAll asserts a snapshot with no resolved public origin at all
// is unknown, narrowing what would otherwise be a skip so an offline run's exit code says the
// check did not observe rather than that it did not apply.
func TestAIPostureEffectiveNoOriginAtAll(t *testing.T) {
	s := snapshotForPosture(t, `{"version": 1}`, PublicOrigin{Source: OriginAbsent})
	result := AIPostureEffective.Run(s)
	if result.Status != StatusUnchecked {
		t.Fatalf("Status = %v, want StatusUnchecked (detail %q)", result.Status, result.Detail)
	}
	if result.Detail != detailPostureNoOrigin {
		t.Errorf("Detail = %q, want %q", result.Detail, detailPostureNoOrigin)
	}
}

// TestFetchRobotsRedirectIsNotFollowed asserts a redirect is returned unfollowed, so a site
// redirecting /robots.txt to a third party cannot make the tool fetch that third party: the
// redirect target must never see a request, and the unfollowed 3xx reads as non-200.
func TestFetchRobotsRedirectIsNotFollowed(t *testing.T) {
	var targetHits int
	target := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		targetHits++
	}))
	defer target.Close()

	origin := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, target.URL+"/robots.txt", http.StatusFound)
	}))
	defer origin.Close()

	got := FetchRobots(context.Background(), PublicOrigin{Value: origin.URL, Source: OriginFromEnv})
	if got.Present {
		t.Fatalf("Present = true, want false (a redirect is not followed)")
	}
	if got.Reason != RobotsAbsentNonOK {
		t.Errorf("Reason = %v, want RobotsAbsentNonOK", got.Reason)
	}
	if targetHits != 0 {
		t.Errorf("redirect target was hit %d times, want 0", targetHits)
	}
}

// TestFetchRobotsFileSchemeIsUnknown asserts a file:// origin is unknown, the same arm as an
// origin that does not parse: only http and https are ever dialed.
func TestFetchRobotsFileSchemeIsUnknown(t *testing.T) {
	got := FetchRobots(context.Background(), PublicOrigin{Value: "file:///etc/passwd", Source: OriginFromEnv})
	if got.Present {
		t.Fatal("Present = true, want false for a file:// origin")
	}
	if got.Reason != RobotsAbsentUnparsedOrigin {
		t.Errorf("Reason = %v, want RobotsAbsentUnparsedOrigin", got.Reason)
	}
}

// TestFetchRobotsBodyIsCapped asserts an oversized body is truncated to robotsBodyCap rather
// than read to exhaustion, so a site serving an endless body cannot exhaust the process.
func TestFetchRobotsBodyIsCapped(t *testing.T) {
	oversized := strings.Repeat("a", robotsBodyCap*2)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(oversized))
	}))
	defer srv.Close()

	got := FetchRobots(context.Background(), PublicOrigin{Value: srv.URL, Source: OriginFromEnv})
	if !got.Present {
		t.Fatalf("Present = false, want true")
	}
	if len(got.Body) != robotsBodyCap {
		t.Errorf("len(Body) = %d, want %d", len(got.Body), robotsBodyCap)
	}
}

// TestFetchRobotsCarriesNoCredential asserts the outgoing request carries no Authorization
// header and no cookie, the credential-free construction the fetch policy states.
func TestFetchRobotsCarriesNoCredential(t *testing.T) {
	var gotAuth string
	var gotCookies int
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Authorization")
		gotCookies = len(r.Cookies())
		w.Write([]byte("User-agent: *\nAllow: /\n"))
	}))
	defer srv.Close()

	got := FetchRobots(context.Background(), PublicOrigin{Value: srv.URL, Source: OriginFromEnv})
	if !got.Present {
		t.Fatalf("Present = false, want true")
	}
	if gotAuth != "" {
		t.Errorf("Authorization header = %q, want empty", gotAuth)
	}
	if gotCookies != 0 {
		t.Errorf("request carried %d cookies, want 0", gotCookies)
	}
}

// TestFetchRobotsNoOrigin asserts a snapshot with no resolved origin never dials.
func TestFetchRobotsNoOrigin(t *testing.T) {
	got := FetchRobots(context.Background(), PublicOrigin{Source: OriginAbsent})
	if got.Present {
		t.Fatal("Present = true, want false")
	}
	if got.Reason != RobotsAbsentNoOrigin {
		t.Errorf("Reason = %v, want RobotsAbsentNoOrigin", got.Reason)
	}
}
