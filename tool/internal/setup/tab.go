package setup

import (
	"context"

	"github.com/glw907/cairn-cms/tool/v2/internal/setup/loopback"
)

// PageKind is what the tab shows at its root.
type PageKind int

// The pages the runner shows.
const (
	// PageRedirect sends the tab to URL.
	PageRedirect PageKind = iota
	// PageManifest posts Manifest to GitHub's new-App page.
	PageManifest
	// PageScopeError shows error.html, whose Try again links URL.
	PageScopeError
	// PageDone shows done.html and stops the chain's clock.
	PageDone
)

// Page is one page the runner shows in the tab. It mirrors loopback's page constructors in a
// form a test can read back.
type Page struct {
	Kind     PageKind
	URL      string
	Manifest string
}

// Tab is the one browser tab that carries the approvals. *loopback.Server satisfies it through
// LoopbackTab.
type Tab interface {
	// URL is the address to open in the browser. The runner hands it to the view unchanged.
	URL() string
	Arm(r loopback.Route) (string, error)
	Wait(ctx context.Context, r loopback.Route) (loopback.Callback, error)
	Show(p Page) error
	Close() error
}

// ListenLoopback binds the loopback server and returns it as a Tab. It is the production value
// of Config.Listen.
func ListenLoopback(cfg loopback.Config) (Tab, error) {
	s, err := loopback.New(cfg)
	if err != nil {
		return nil, err
	}
	return loopbackTab{s}, nil
}

type loopbackTab struct{ *loopback.Server }

func (t loopbackTab) Show(p Page) error {
	switch p.Kind {
	case PageRedirect:
		return t.Server.Show(loopback.RedirectPage(p.URL))
	case PageManifest:
		return t.Server.Show(loopback.ManifestPage(p.Manifest))
	case PageScopeError:
		return t.Server.Show(loopback.ScopeErrorPage(p.URL))
	default:
		return t.Server.Show(loopback.DonePage())
	}
}
