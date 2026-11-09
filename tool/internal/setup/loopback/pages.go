package loopback

import (
	"bytes"
	"crypto/subtle"
	"embed"
	"encoding/json"
	"errors"
	"html/template"
	"net/http"
	"net/url"
)

//go:embed pages/*.html
var pageFiles embed.FS

var pages = template.Must(template.ParseFS(pageFiles, "pages/*.html"))

// cookieName names the one cookie the server sets, in trade for the key. It gates the root and
// /next, the route that hands out the sign-in URL.
const cookieName = "cairn_setup"

type pageKind int

const (
	pageWait pageKind = iota
	pageRedirect
	pageManifest
	pageScopeError
	pageDone
	pageConsent
)

// Page is what the tab finds at the root. Build one with RedirectPage, ConsentPage, ManifestPage,
// WaitPage, ScopeErrorPage, or DonePage, and pass it to Server.Show.
type Page struct {
	kind     pageKind
	url      string
	manifest string
}

// WaitPage reloads itself until the runner shows the next page. A callback that lands shows
// this page without a call to Show.
func WaitPage() Page { return Page{kind: pageWait} }

// RedirectPage sends the tab to url, which must be an https URL.
func RedirectPage(url string) Page { return Page{kind: pageRedirect, url: url} }

// ConsentPage shows consent.html, which tells the owner which permission to select before its
// Continue to Cloudflare button goes on to url, an https URL. The page links /cloudflare/go rather
// than url, so the authorize URL never sits in the page source.
func ConsentPage(url string) Page { return Page{kind: pageConsent, url: url} }

// ManifestPage posts manifest, the App manifest as JSON, to GitHub's new-App page with the state
// nonce GitHubManifest is armed with. Show refuses it while that route is not armed.
func ManifestPage(manifest string) Page { return Page{kind: pageManifest, manifest: manifest} }

// ScopeErrorPage shows error.html, whose Try again button goes on to retryURL, an https URL that
// asks for consent again, through /cloudflare/go as ConsentPage's button does.
func ScopeErrorPage(retryURL string) Page { return Page{kind: pageScopeError, url: retryURL} }

// DonePage shows done.html, which polls /next for the sign-in URL. Showing it stops the chain's
// clock.
func DonePage() Page { return Page{kind: pageDone} }

// Show sets the page the tab finds at the root from now on. The waiting page reloads the root, so
// the tab follows within a few seconds.
func (s *Server) Show(p Page) error {
	if p.kind == pageRedirect || p.kind == pageConsent || p.kind == pageScopeError {
		if err := checkHTTPS(p.url); err != nil {
			return err
		}
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if p.kind == pageManifest {
		if a := s.routes[GitHubManifest]; a == nil || !a.open {
			return errors.New("show the manifest page: the manifest route is not armed")
		}
	}
	if p.kind == pageDone && !s.clockStopped {
		s.clockStopped = true
		close(s.stopClock)
	}
	s.page = p
	return nil
}

// SetNext hands done.html the URL to move the tab to, an https URL. /next gives it out once.
func (s *Server) SetNext(rawURL string) error {
	if err := checkHTTPS(rawURL); err != nil {
		return err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.next = rawURL
	return nil
}

// checkHTTPS refuses anything but an absolute https URL with a host. Its errors never quote the
// URL, which can carry a token.
func checkHTTPS(rawURL string) error {
	u, err := url.Parse(rawURL)
	if err != nil {
		return errors.New("page URL does not parse")
	}
	if u.Scheme != "https" || u.Host == "" {
		return errors.New("page URL is not an absolute https URL")
	}
	return nil
}

// root shows the current page to the request that carries the session cookie, and otherwise
// trades the key for one.
func (s *Server) root(w http.ResponseWriter, r *http.Request) {
	if !s.hasSession(r) {
		s.openSession(w, r)
		return
	}
	s.mu.Lock()
	p := s.page
	state := ""
	if a := s.routes[GitHubManifest]; a != nil {
		state = a.nonce
	}
	s.mu.Unlock()

	switch p.kind {
	case pageRedirect:
		http.Redirect(w, r, p.url, http.StatusFound)
	case pageConsent:
		s.render(w, "consent.html", pageData{})
	case pageManifest:
		s.render(w, "github.html", pageData{State: state, Manifest: p.manifest})
	case pageScopeError:
		http.Redirect(w, r, "/error.html", http.StatusSeeOther)
	case pageDone:
		http.Redirect(w, r, "/done.html", http.StatusSeeOther)
	default:
		s.render(w, "wait.html", pageData{})
	}
}

// openSession sets the session cookie, starts the chain's clock, and sends the tab to the bare
// root, for the first request that brings the key from the owner's own navigation. A request
// another site's page made is refused 403 and leaves the key unspent; one with no key, a wrong
// key, or a spent key answers 404.
func (s *Server) openSession(w http.ResponseWriter, r *http.Request) {
	k := r.URL.Query().Get("k")
	if k == "" {
		http.NotFound(w, r)
		return
	}
	if !ownerNavigation(r.Header) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}
	s.mu.Lock()
	ok := !s.keyUsed && subtle.ConstantTimeCompare([]byte(k), []byte(s.key)) == 1
	if ok {
		s.keyUsed = true
		s.cookie = randomHex(32)
		s.startClock()
	}
	cookie := s.cookie
	s.mu.Unlock()
	if !ok {
		http.NotFound(w, r)
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    cookie,
		Path:     "/",
		HttpOnly: true,
		// Lax, because the tab comes back to the root from Cloudflare and GitHub through a
		// redirect that their page started, and a browser sends a Strict cookie on none of those.
		// /next makes up the difference by refusing any request another site started.
		SameSite: http.SameSiteLaxMode,
	})
	http.Redirect(w, r, "/", http.StatusSeeOther)
}

// hasSession reports whether r carries the session cookie.
func (s *Server) hasSession(r *http.Request) bool {
	c, err := r.Cookie(cookieName)
	if err != nil {
		return false
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.cookie != "" && subtle.ConstantTimeCompare([]byte(c.Value), []byte(s.cookie)) == 1
}

// ownerNavigation reports whether h fits the owner opening the URL. A browser marks an address
// the opener launched or the owner typed with Sec-Fetch-Site none and Sec-Fetch-Mode navigate,
// and marks another site's image, link, or script by what it is. A client that sends neither
// header, such as curl, passes.
func ownerNavigation(h http.Header) bool {
	if site := h.Get("Sec-Fetch-Site"); site != "" && site != "none" && site != "same-origin" {
		return false
	}
	if mode := h.Get("Sec-Fetch-Mode"); mode != "" && mode != "navigate" {
		return false
	}
	return true
}

// pageRoute serves file only while kind is the page shown; any other time the path answers 404.
func (s *Server) pageRoute(kind pageKind, file string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		s.mu.Lock()
		p := s.page
		s.mu.Unlock()
		if p.kind != kind {
			http.NotFound(w, r)
			return
		}
		s.render(w, file, pageData{})
	}
}

// serveNext answers done.html's poll. The Lax cookie also rides a link on another site, so a
// request whose Sec-Fetch-Site is anything but same-origin is refused and leaves the URL unserved.
func (s *Server) serveNext(w http.ResponseWriter, r *http.Request) {
	site := r.Header.Get("Sec-Fetch-Site")
	if !s.hasSession(r) || (site != "" && site != "same-origin") {
		http.NotFound(w, r)
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.nextServed {
		http.NotFound(w, r)
		return
	}
	if s.next == "" {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	body, err := json.Marshal(struct {
		URL string `json:"url"`
	}{s.next})
	if err != nil {
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}
	s.nextServed = true
	s.next = ""
	w.Header().Set("Content-Type", "application/json")
	_, _ = w.Write(body)
}

// goCloudflare answers the consent and scope-error pages' button with a redirect to the authorize
// URL the page was shown with. It answers only while one of those pages shows and approval 1's
// callback is armed, and only to the session's navigation from this origin: the URL carries the
// state nonce and the PKCE challenge, so another site's link, a script's fetch, or a request
// without the cookie gets 404 and learns nothing.
func (s *Server) goCloudflare(w http.ResponseWriter, r *http.Request) {
	site, mode := r.Header.Get("Sec-Fetch-Site"), r.Header.Get("Sec-Fetch-Mode")
	if !s.hasSession(r) || (site != "" && site != "same-origin") || (mode != "" && mode != "navigate") {
		http.NotFound(w, r)
		return
	}
	s.mu.Lock()
	p := s.page
	a := s.routes[CloudflareCallback]
	s.mu.Unlock()
	if (p.kind != pageConsent && p.kind != pageScopeError) || a == nil || !a.open {
		http.NotFound(w, r)
		return
	}
	// http.Redirect would also write the URL into an HTML body; the Location header alone is
	// what the browser follows.
	w.Header().Set("Location", p.url)
	w.WriteHeader(http.StatusFound)
}

type pageData struct {
	SiteName string
	Nonce    string
	State    string
	Manifest string
}

// render writes one embedded page under a Content-Security-Policy that runs only the script the
// page carries, fetches only from this origin, and posts a form only to GitHub.
func (s *Server) render(w http.ResponseWriter, file string, data pageData) {
	s.renderStatus(w, http.StatusOK, file, data)
}

func (s *Server) renderStatus(w http.ResponseWriter, status int, file string, data pageData) {
	data.SiteName = s.cfg.SiteName
	data.Nonce = randomHex(16)
	var buf bytes.Buffer
	if err := pages.ExecuteTemplate(&buf, file, data); err != nil {
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}
	h := w.Header()
	h.Set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-"+
		data.Nonce+"'; connect-src 'self'; form-action https://github.com; base-uri 'none'; frame-ancestors 'none'")
	h.Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(status)
	_, _ = w.Write(buf.Bytes())
}
