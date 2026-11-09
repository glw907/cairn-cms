// Package loopback serves the one browser tab that carries setup's approvals, and opens it.
package loopback

import (
	"context"
	"errors"
	"time"
)

// Port is the loopback port both OAuth clients register as their redirect.
const Port = 49152

// ErrChainTimeout reports that the approvals passed their 30-minute limit.
var ErrChainTimeout = errors.New("approvals passed the 30-minute limit")

// PortInUseError reports that the setup port could not be bound.
type PortInUseError struct{ Err error }

func (e *PortInUseError) Error() string { return "" }

// Config configures a Server.
type Config struct {
	// SiteName names the site on the browser pages.
	SiteName string
	// Now reads the chain's clock.
	Now func() time.Time
	// After fires once a duration has passed.
	After func(time.Duration) <-chan time.Time

	addr string
}

// Server is the setup tab's loopback server.
type Server struct{}

// Route names a callback path.
type Route string

// The callback routes.
const (
	CloudflareCallback Route = "/cloudflare/callback"
	GitHubManifest     Route = "/github/manifest"
	GitHubCallback     Route = "/github/callback"
)

// Callback is what one approval's redirect carried back.
type Callback struct {
	Code           string
	State          string
	InstallationID string
	SetupAction    string
	Error          string
}

// Page is what the tab shows at the root.
type Page struct{}

// RedirectPage sends the tab to url.
func RedirectPage(url string) Page { return Page{} }

// ManifestPage posts manifest to GitHub.
func ManifestPage(manifest string) Page { return Page{} }

// ScopeErrorPage shows error.html.
func ScopeErrorPage(retryURL string) Page { return Page{} }

// DonePage shows done.html.
func DonePage() Page { return Page{} }

func listenAddr(cfg Config) string { return "" }

// New binds the port.
func New(cfg Config) (*Server, error) { return nil, &PortInUseError{} }

// URL is the tab's address.
func (s *Server) URL() string { return "" }

// Close stops the server.
func (s *Server) Close() error { return nil }

func (s *Server) allowedHost(host string) bool { return true }

// Arm opens a route.
func (s *Server) Arm(r Route) (string, error) { return "", nil }

// Wait blocks for a callback.
func (s *Server) Wait(ctx context.Context, r Route) (Callback, error) { return Callback{}, nil }

// Show sets the page.
func (s *Server) Show(p Page) error { return nil }

// SetNext sets the next URL.
func (s *Server) SetNext(url string) error { return nil }

// Countdown reports the time left.
func (s *Server) Countdown() (time.Duration, bool) { return 0, false }

// Expired is closed at the limit.
func (s *Server) Expired() <-chan struct{} { return nil }

// Remote reports a session with no local browser.
func Remote(goos string, env map[string]string) bool { return false }

// Launcher builds the opener argv.
func Launcher(goos string, env map[string]string, url string) []string { return nil }

// Open runs a launcher.
func Open(argv []string, timeout time.Duration) error { return nil }
