package loopback

import (
	"context"
	"crypto/subtle"
	"errors"
	"net/http"
	"net/url"
	"regexp"
)

// Route is a callback path. It answers only between Arm and the one callback that matches.
type Route string

// The callback routes, one per kind of approval redirect.
const (
	// CloudflareCallback receives the Cloudflare OAuth redirect: code and state, or an OAuth
	// error and state when the owner declines.
	CloudflareCallback Route = "/cloudflare/callback"
	// GitHubManifest receives the redirect after the owner creates the App: code and state.
	GitHubManifest Route = "/github/manifest"
	// GitHubCallback receives both install redirects: code, installation_id, and setup_action.
	// GitHub may leave state off, so a missing state is accepted and the runner's read-back of
	// the installation is what authenticates it; a state that is present must match.
	GitHubCallback Route = "/github/callback"
)

// Callback is what one approval's redirect carried back. Every field has passed a shape check.
type Callback struct {
	// Code is the authorization or conversion code. It is empty when Error is set.
	Code string
	// State is the nonce the redirect carried. On GitHubCallback it may be empty.
	State string
	// InstallationID is the decimal installation id, set only on GitHubCallback.
	InstallationID string
	// SetupAction is GitHub's setup_action, set only on GitHubCallback.
	SetupAction string
	// Error is the OAuth error code, such as access_denied, when the owner declined on
	// Cloudflare.
	Error string
}

type arming struct {
	nonce string
	open  bool
	ch    chan Callback
}

var (
	// Cloudflare's OAuth server issues codes of the form prefix_key.signature, so the code
	// alphabet admits a dot beside the URL-safe base64 characters.
	codeShape   = regexp.MustCompile(`^[A-Za-z0-9._-]{1,512}$`)
	digitsShape = regexp.MustCompile(`^[0-9]{1,20}$`)
	wordShape   = regexp.MustCompile(`^[a-z_]{1,64}$`)
)

// Arm opens r for one callback and returns the state nonce the approval's URL must carry. Arming
// a route again replaces its nonce, so a redirect carrying the old one is refused.
func (s *Server) Arm(r Route) (string, error) {
	nonce := randomHex(16)
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.isExpired() {
		return "", ErrChainTimeout
	}
	s.routes[r] = &arming{nonce: nonce, open: true, ch: make(chan Callback, 1)}
	return nonce, nil
}

// Wait blocks until the callback r was last armed for arrives, ctx ends, or the chain passes its
// limit, which returns ErrChainTimeout. A callback that arrived before Wait was called is kept.
func (s *Server) Wait(ctx context.Context, r Route) (Callback, error) {
	s.mu.Lock()
	a := s.routes[r]
	s.mu.Unlock()
	if a == nil {
		return Callback{}, errors.New("wait on " + string(r) + ": route was never armed")
	}
	select {
	case cb := <-a.ch:
		return cb, nil
	default:
	}
	select {
	case cb := <-a.ch:
		return cb, nil
	case <-s.expired:
		return Callback{}, ErrChainTimeout
	case <-ctx.Done():
		return Callback{}, ctx.Err()
	}
}

func (s *Server) callback(r Route) http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		s.mu.Lock()
		a := s.routes[r]
		if a == nil || !a.open {
			s.mu.Unlock()
			http.NotFound(w, req)
			return
		}
		cb, ok := parseCallback(r, req.URL.RawQuery)
		if !ok || !stateMatches(r, a.nonce, cb.State) {
			s.mu.Unlock()
			http.Error(w, "This request is not part of the current setup.", http.StatusBadRequest)
			return
		}
		a.open = false
		a.ch <- cb
		s.page = WaitPage()
		s.mu.Unlock()
		http.Redirect(w, req, "/", http.StatusSeeOther)
	}
}

// parseCallback reads the parameters r expects and reports whether each has the right shape. A
// parameter given twice, or a query the standard parser rejects, fails.
func parseCallback(r Route, rawQuery string) (Callback, bool) {
	q, err := url.ParseQuery(rawQuery)
	if err != nil {
		return Callback{}, false
	}
	for _, values := range q {
		if len(values) > 1 {
			return Callback{}, false
		}
	}
	cb := Callback{
		Code:           q.Get("code"),
		State:          q.Get("state"),
		InstallationID: q.Get("installation_id"),
		SetupAction:    q.Get("setup_action"),
		Error:          q.Get("error"),
	}
	switch r {
	case CloudflareCallback:
		cb.InstallationID, cb.SetupAction = "", ""
		if cb.Error != "" {
			return cb, cb.Code == "" && wordShape.MatchString(cb.Error)
		}
		return cb, codeShape.MatchString(cb.Code)
	case GitHubManifest:
		cb.InstallationID, cb.SetupAction, cb.Error = "", "", ""
		return cb, codeShape.MatchString(cb.Code)
	case GitHubCallback:
		cb.Error = ""
		return cb, codeShape.MatchString(cb.Code) &&
			digitsShape.MatchString(cb.InstallationID) &&
			wordShape.MatchString(cb.SetupAction)
	}
	return Callback{}, false
}

func stateMatches(r Route, nonce, state string) bool {
	if state == "" {
		return r == GitHubCallback
	}
	return subtle.ConstantTimeCompare([]byte(state), []byte(nonce)) == 1
}
