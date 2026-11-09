// Package loopback serves the one browser tab that carries setup's approvals, and opens it.
//
// The server listens on 127.0.0.1:49152 from New until Close, which is also what keeps setup to
// one run at a time. Every request must name a loopback Host with that port, which is the defence
// against a page that rebinds a hostname to 127.0.0.1. The root opens a session only for the
// one-time key in URL, so another site's page in the owner's browser cannot take the session
// cookie. That cookie gates every route that acts: a callback answers only to it, only while the
// runner has the route armed, and only to the state nonce it was armed with. /cloudflare/go hands
// the Cloudflare authorize URL to the consent page's button only while that callback is armed, so
// the URL never sits in a page's source, and /next hands out the sign-in URL once. Both also
// require the Fetch Metadata headers a browser sends on the tab's requests. Any other path
// answers 404. The runner drives the tab through Show and learns of each approval through Wait.
// The browser is answered at once, and the API work runs in the runner afterwards.
//
// A cookie is not scoped to a port, so the browser also sends the session cookie to any other
// listener on 127.0.0.1 it visits. A process on this machine that can observe the browser's
// localhost traffic, or collect the cookie on another port and forge a browser's headers, is out
// of scope. What the server refuses is a request without the cookie, and a generic tool that
// replays the cookie without the Fetch Metadata a browser sends.
//
// Nothing here logs. The key, the nonces, the codes, the cookie, and the sign-in URL reach only
// the browser and the runner.
package loopback

import (
	"crypto/rand"
	"encoding/hex"
	"io"
	"log"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

// Port is the loopback port both OAuth clients register as their redirect, so setup never moves
// to another one.
const Port = 49152

// InUseReason is the operator-facing reason a run could not bind Port.
const InUseReason = "Port 49152 is in use. Another setup may be running."

// PortInUseError reports that New could not bind Port. Its message is InUseReason; Err holds the
// error the listener returned.
type PortInUseError struct {
	Err error
}

func (e *PortInUseError) Error() string { return InUseReason }

func (e *PortInUseError) Unwrap() error { return e.Err }

// Config configures a Server.
type Config struct {
	// SiteName is the site's name as the browser pages show it.
	SiteName string
	// Now reads the approval chain's clock. Nil means time.Now.
	Now func() time.Time
	// After returns a channel that fires once d has passed, as time.After does. Nil means
	// time.After.
	After func(d time.Duration) <-chan time.Time

	// addr overrides the listen address so tests can bind an ephemeral port.
	addr string
}

// Server is the loopback server for one setup run. Its methods are safe for concurrent use.
type Server struct {
	cfg      Config
	srv      *http.Server
	port     string
	key      string
	handlers map[string]http.HandlerFunc

	closeOnce sync.Once
	closed    chan struct{}
	expired   chan struct{}
	stopClock chan struct{}

	mu           sync.Mutex
	routes       map[Route]*arming
	page         Page
	keyUsed      bool
	cookie       string
	started      time.Time
	clockStopped bool
	next         string
	nextServed   bool
}

func listenAddr(cfg Config) string {
	if cfg.addr != "" {
		return cfg.addr
	}
	return "127.0.0.1:49152"
}

// New binds the loopback port and starts serving. A failed bind returns a *PortInUseError and is
// never retried on another port.
func New(cfg Config) (*Server, error) {
	if cfg.Now == nil {
		cfg.Now = time.Now
	}
	if cfg.After == nil {
		cfg.After = time.After
	}
	ln, err := net.Listen("tcp", listenAddr(cfg))
	if err != nil {
		return nil, &PortInUseError{Err: err}
	}
	_, port, err := net.SplitHostPort(ln.Addr().String())
	if err != nil {
		_ = ln.Close()
		return nil, err
	}
	s := &Server{
		cfg:       cfg,
		port:      port,
		key:       randomHex(16),
		closed:    make(chan struct{}),
		expired:   make(chan struct{}),
		stopClock: make(chan struct{}),
		routes:    map[Route]*arming{},
	}
	s.handlers = map[string]http.HandlerFunc{
		"/":                        s.root,
		string(CloudflareCallback): s.callback(CloudflareCallback),
		string(GitHubManifest):     s.callback(GitHubManifest),
		string(GitHubCallback):     s.callback(GitHubCallback),
		"/cloudflare/go":           s.goCloudflare,
		"/next":                    s.serveNext,
		"/done.html":               s.pageRoute(pageDone, "done.html"),
		"/error.html":              s.pageRoute(pageScopeError, "error.html"),
	}
	s.srv = &http.Server{
		Handler:           http.HandlerFunc(s.serve),
		ReadHeaderTimeout: 10 * time.Second,
		// The http package's log lines can carry a request line, so they go nowhere.
		ErrorLog: log.New(io.Discard, "", 0),
	}
	go func() { _ = s.srv.Serve(ln) }()
	return s, nil
}

// URL is the address the opener sends the tab to: the root with the server's one-time key as its
// query. The first owner navigation that brings the key gets the session cookie and starts the
// chain's clock; the key opens nothing after that. URL carries a secret, so it goes only to the
// opener and the fallback link, never to a log.
func (s *Server) URL() string {
	return "http://127.0.0.1:" + s.port + "/?k=" + s.key
}

// Close stops the server and frees the port.
func (s *Server) Close() error {
	var err error
	s.closeOnce.Do(func() {
		close(s.closed)
		err = s.srv.Close()
	})
	return err
}

func (s *Server) serve(w http.ResponseWriter, r *http.Request) {
	h := w.Header()
	h.Set("Cache-Control", "no-store")
	h.Set("Referrer-Policy", "no-referrer")
	h.Set("X-Content-Type-Options", "nosniff")
	h.Set("X-Frame-Options", "DENY")
	h.Set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
	if !s.allowedHost(r.Host) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}
	handler, ok := s.handlers[r.URL.Path]
	if s.isExpired() && r.URL.Path == "/" {
		// The waiting page reloads the root, so the tab shows why it stopped.
		s.renderStatus(w, http.StatusGone, "stopped.html", pageData{})
		return
	}
	if !ok || s.isExpired() {
		http.NotFound(w, r)
		return
	}
	if r.Method != http.MethodGet {
		h.Set("Allow", http.MethodGet)
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	handler(w, r)
}

// allowedHost reports whether host names a loopback address with the port the server holds. A
// portless or foreign Host is what a DNS-rebinding page would send.
func (s *Server) allowedHost(host string) bool {
	name, port, err := net.SplitHostPort(host)
	if err != nil || port != s.port {
		return false
	}
	switch strings.ToLower(name) {
	case "127.0.0.1", "localhost", "::1":
		return true
	}
	return false
}

// randomHex returns n random bytes as lowercase hex.
func randomHex(n int) string {
	b := make([]byte, n)
	// crypto/rand.Read never returns an error on a supported platform; it crashes the program
	// instead (crypto/rand docs).
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}
