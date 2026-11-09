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

// cookieName names the one cookie the server sets. It gates /next, the route that hands out the
// sign-in URL.
const cookieName = "cairn_setup"

type pageKind int

const (
	pageWait pageKind = iota
	pageRedirect
	pageManifest
	pageScopeError
	pageDone
)

// Page is what the tab finds at the root. Build one with RedirectPage, ManifestPage, WaitPage,
// ScopeErrorPage, or DonePage, and pass it to Server.Show.
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

// ManifestPage posts manifest, the App manifest as JSON, to GitHub's new-App page with the state
// nonce GitHubManifest is armed with. Show refuses it while that route is not armed.
func ManifestPage(manifest string) Page { return Page{kind: pageManifest, manifest: manifest} }

// ScopeErrorPage shows error.html, whose Try again button links retryURL, an https URL that asks
// for consent again.
func ScopeErrorPage(retryURL string) Page { return Page{kind: pageScopeError, url: retryURL} }

// DonePage shows done.html, which polls /next for the sign-in URL. Showing it stops the chain's
// clock.
func DonePage() Page { return Page{kind: pageDone} }

// Show sets the page the tab finds at the root from now on. The waiting page reloads the root, so
// the tab follows within a few seconds.
func (s *Server) Show(p Page) error {
	if p.kind == pageRedirect || p.kind == pageScopeError {
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

func (s *Server) root(w http.ResponseWriter, r *http.Request) {
	s.mu.Lock()
	if s.cookie == "" {
		s.cookie = randomHex(32)
		http.SetCookie(w, &http.Cookie{
			Name:     cookieName,
			Value:    s.cookie,
			Path:     "/",
			HttpOnly: true,
			SameSite: http.SameSiteStrictMode,
		})
		s.startClock()
	}
	p := s.page
	state := ""
	if a := s.routes[GitHubManifest]; a != nil {
		state = a.nonce
	}
	s.mu.Unlock()

	switch p.kind {
	case pageRedirect:
		http.Redirect(w, r, p.url, http.StatusFound)
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
		s.render(w, file, pageData{RetryURL: p.url})
	}
}

func (s *Server) serveNext(w http.ResponseWriter, r *http.Request) {
	c, err := r.Cookie(cookieName)
	s.mu.Lock()
	defer s.mu.Unlock()
	if err != nil || s.cookie == "" || s.nextServed ||
		subtle.ConstantTimeCompare([]byte(c.Value), []byte(s.cookie)) != 1 {
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

type pageData struct {
	SiteName string
	Nonce    string
	State    string
	Manifest string
	RetryURL string
}

// render writes one embedded page under a Content-Security-Policy that runs only the script the
// page carries, fetches only from this origin, and posts a form only to GitHub.
func (s *Server) render(w http.ResponseWriter, file string, data pageData) {
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
	_, _ = w.Write(buf.Bytes())
}
