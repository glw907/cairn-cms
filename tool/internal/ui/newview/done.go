package newview

import (
	"strings"
	"time"

	"github.com/charmbracelet/x/ansi"

	"github.com/glw907/cairn-cms/tool/v2/internal/setup"
)

// DoneMsg reports a finished run, with what the done screen says about it.
type DoneMsg struct{ Done setup.Done }

// done is the final frame for a live site. It says the owner is signed in only when setup read
// the setup tab's link as used; otherwise it points to the tab's Sign in button and the email.
func (g Grid) done(d setup.Done, s setup.Summary, took time.Duration) string {
	st := g.Styles
	strong := st.Link(RoleText, d.URL).Bold(!st.NoColor()).Underline(!st.NoColor())
	lead, _, _ := strings.Cut(fill(doneLive, "<name>", s.SiteName), "<url>")
	live := margin + st.Title.Render(lead) + strong.Render(d.URL)
	if ansi.StringWidth(lead+d.URL) > g.ContentWidth() {
		live = margin + st.Title.Render(strings.TrimSpace(lead)) + "\n" + margin + strong.Render(d.URL)
	}

	var body string
	switch {
	case d.NoSignIn:
		body = g.Para(RoleText, fill(doneNoSignIn, "<email>", s.OwnerEmail))
	default:
		first := setup.LineDoneOpen
		if d.SignedIn {
			first = doneSignedIn
		}
		body = g.Para(RoleText, first)
		if d.Emailed {
			body += "\n" + g.Para(RoleMuted, fill(doneEmailed, "<email>", s.OwnerEmail))
		}
	}

	host := strings.TrimPrefix(d.URL, "https://")
	next := strings.Join([]string{
		g.Cell(labelEdit, st.Text, g.link(host+"/admin", d.URL+"/admin")),
		g.Cell(labelInvite, st.Text, st.Muted.Render(valueInvite)),
		g.Cell(labelDocs, st.Text, g.link(linkDocs, urlDocs)),
	}, "\n")
	return Frame(live, body, next, g.Para(RoleMuted, fill(doneTook, "<time>", minutes(took))))
}
