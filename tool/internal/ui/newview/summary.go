package newview

import (
	"strings"

	"charm.land/bubbles/v2/key"
	"charm.land/bubbles/v2/textinput"
	tea "charm.land/bubbletea/v2"
	"github.com/charmbracelet/x/ansi"

	"github.com/glw907/cairn-cms/tool/v2/internal/setup"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup/scaffold"
)

// field is the summary row an edit is open on.
type field int

const (
	fieldNone field = iota
	fieldEmail
	fieldAddress
)

// summary is the review screen: every value setup derived, each with its reason, and the two
// rows the owner can edit before the one Enter. setup checks what the owner leaves there and asks
// again with a problem when it refuses an edit, so the screen holds the owner's values across asks.
type summary struct {
	styles Styles
	glyphs Glyphs
	keys   keys
	themes []scaffold.Theme

	// asked reports that the runner has asked once; email and host are the rows as the owner
	// left them, and fromCloudflare the email the first ask carried.
	asked          bool
	email, host    string
	fromCloudflare string

	editing field
	// problem is setup's refusal, shown under the open edit in place of its note.
	problem string
	input   textinput.Model
	// sent reports that the owner pressed Enter and setup is checking the rows.
	sent bool
}

func newSummary(s Styles, g Glyphs, k keys, themes []scaffold.Theme) *summary {
	return &summary{styles: s, glyphs: g, keys: k, themes: themes}
}

// Ask shows s. A problem reopens the row it refuses, with the owner's value and the problem
// under it: the email for setup.ProblemEmail, and the address for any other.
func (m *summary) Ask(s setup.Summary, problem string, width int) tea.Cmd {
	if !m.asked {
		m.asked = true
		m.email, m.fromCloudflare = s.OwnerEmail, s.OwnerEmail
		m.host = s.Zone
		if len(s.Addresses) > 0 {
			m.host = s.Addresses[0]
		}
	}
	m.sent = false
	m.editing = fieldNone
	switch problem {
	case "":
		return nil
	case setup.ProblemEmail:
		return m.open(fieldEmail, problem, width)
	}
	return m.open(fieldAddress, problem, width)
}

// Key acts on a key. confirmed reports the owner's Enter on the summary, which hands the rows to
// setup.
func (m *summary) Key(msg tea.KeyPressMsg, width int) (cmd tea.Cmd, confirmed bool) {
	if m.sent {
		return nil, false
	}
	if m.editing != fieldNone {
		switch {
		case key.Matches(msg, m.keys.Cancel):
			m.editing = fieldNone
		case key.Matches(msg, m.keys.Save):
			m.save()
		default:
			m.input, cmd = m.input.Update(msg)
		}
		return cmd, false
	}
	switch {
	case key.Matches(msg, m.keys.SetUp):
		m.sent = true
		return nil, true
	case key.Matches(msg, m.keys.EditEmail):
		return m.open(fieldEmail, "", width), false
	case key.Matches(msg, m.keys.EditAddress):
		return m.open(fieldAddress, "", width), false
	}
	return nil, false
}

// Edit is the two editable rows as the owner left them.
func (m *summary) Edit() setup.SummaryEdit {
	return setup.SummaryEdit{OwnerEmail: m.email, Host: m.host}
}

func (m *summary) open(f field, problem string, width int) tea.Cmd {
	g := Grid{Styles: m.styles, Glyphs: m.glyphs, Width: width}
	m.editing, m.problem = f, problem
	in := textinput.New()
	in.Prompt = ""
	in.SetVirtualCursor(false)
	st := textinput.DefaultStyles(m.styles.Dark)
	st.Focused.Text = m.styles.Text
	st.Cursor.Color = m.styles.Fg(RoleAccent)
	st.Cursor.Blink = false
	in.SetStyles(st)
	in.SetWidth(g.ValueWidth())
	in.SetValue(m.email)
	if f == fieldAddress {
		in.SetValue(m.host)
	}
	in.CursorEnd()
	m.input = in
	return m.input.Focus()
}

func (m *summary) save() {
	v := strings.TrimSpace(m.input.Value())
	if m.editing == fieldEmail {
		m.email = v
	} else {
		m.host = strings.ToLower(v)
	}
	m.editing = fieldNone
}

// row is one label grid row of the summary. A row with an edit open carries the edit's lines in
// place of its value and reason.
type row struct {
	label, value, reason string
	edit                 []string
}

// group lays out one group of rows. Reasons share one column two spaces past the group's
// longest value when every reason fits there beside its value; otherwise every reason goes on
// the line under its value, never a mix. An open edit puts the whole group under. line is the
// group's line the edit opens on, or -1.
func (g Grid) group(rows []row) (out string, line int) {
	valW, reasonW, beside := 0, 0, true
	for _, r := range rows {
		valW = max(valW, ansi.StringWidth(r.value))
		reasonW = max(reasonW, ansi.StringWidth(r.reason))
		if r.edit != nil || ansi.StringWidth(r.value) > g.ValueWidth() {
			beside = false
		}
	}
	beside = beside && valW+2+reasonW <= g.ValueWidth()
	st := g.Styles
	var ls []string
	line = -1
	for _, r := range rows {
		switch {
		case r.edit != nil:
			line = len(ls)
			ls = append(ls, r.edit...)
		case beside && r.reason != "":
			ls = append(ls, g.Cell(r.label, st.Muted, st.Text.Width(valW+2).Render(r.value)+st.Muted.Render(r.reason)))
		default:
			vs := g.WrapValue(RoleText, r.value)
			if r.reason != "" {
				vs = append(vs, g.WrapValue(RoleMuted, r.reason)...)
			}
			ls = append(ls, strings.Split(g.Cell(r.label, st.Muted, vs...), "\n")...)
		}
	}
	return strings.Join(ls, "\n"), line
}

// editRows is an open edit: the bold label, the cursor mark at column 18 and the input at 20,
// then the note, or setup's problem in the failing ink, under it.
func (m *summary) editRows(g Grid, label, note string) []string {
	ink := RoleMuted
	if m.problem != "" {
		note, ink = m.problem, RoleFailing
	}
	out := []string{margin + g.Styles.Title.Width(LabelWidth-2).Render(label) + g.Styles.AccentStrong.Render("> ") + m.input.View()}
	for _, l := range g.WrapValue(ink, note) {
		out = append(out, valPad+l)
	}
	return out
}

// layout draws the screen for s and says on which line the open edit is, or -1. An open edit
// hides every other row's reason, so the screen fits a 24-row window with the edit's note showing.
func (m *summary) layout(width int, s setup.Summary) (string, int) {
	g := Grid{Styles: m.styles, Glyphs: m.glyphs, Width: width}
	st := g.Styles
	reasons := m.editing == fieldNone

	domain := row{label: labelDomain, value: s.Zone}
	if reasons && !s.ZoneChosen {
		domain.reason = reasonDomain
	}
	address := row{label: labelAddress, value: m.addresses(s)}
	if reasons && m.host == s.Zone {
		address.reason = reasonAddress
	}
	email := row{label: labelEmail, value: m.email}
	// A token run's email is the one the owner typed, never the Cloudflare sign-in's.
	if reasons && m.email == m.fromCloudflare && s.Credential != setup.CredentialToken {
		email.reason = reasonEmail
	}
	switch m.editing {
	case fieldEmail:
		email.edit = m.editRows(g, labelEmail, noteEmail)
	case fieldAddress:
		address.edit = m.editRows(g, labelAddress, fill(setup.ProblemHost, "<zone>", s.Zone))
	}
	first, line := g.group([]row{domain, address, email})

	var named []string
	for _, r := range [][2]string{
		{labelRepo, s.Repository}, {labelWorker, s.Worker}, {labelDatabase, s.Database}, {labelBucket, s.Bucket},
	} {
		named = append(named, g.Cell(r[0], st.Muted, g.WrapValue(RoleText, r[1])...))
	}
	if reasons {
		why := g.WrapValue(RoleMuted, reasonNames)
		if s.SuffixReason != "" {
			why = append(why, g.WrapValue(RoleMuted, s.SuffixReason)...)
		}
		for _, l := range why {
			named = append(named, valPad+l)
		}
	}

	crawlers := optionBlock
	if s.Posture == setup.Invite {
		crawlers = optionAllow
	}
	theme := row{label: labelTheme, value: m.themeName(s.Theme)}
	if reasons {
		theme.reason = s.ThemeDescription
	}
	look, _ := g.group([]row{theme, {label: labelCrawlers, value: crawlers}})

	deploy := g.WrapValue(RoleText, valueDeploys)
	if reasons {
		deploy = append(deploy, g.Pack(g.ValueWidth(), st.Muted.Render(reasonDeploys), g.link(linkDeploys, urlDeploys))...)
	}
	deploys := g.Cell(labelDeploys, st.Muted, deploy...)

	hints := []key.Binding{m.keys.SetUp, m.keys.EditEmail, m.keys.EditAddress, m.keys.Quit}
	switch {
	case m.editing != fieldNone:
		hints = []key.Binding{m.keys.Save, m.keys.Cancel}
	case m.sent:
		hints = []key.Binding{m.keys.Quit}
	}
	title := g.Title(fill(titleSummary, "<name>", s.SiteName))
	if line >= 0 {
		// The frame opens with a blank line, then the title and a blank line, then this group.
		line += 3
	}
	return Frame(title, first, strings.Join(named, "\n"), look, deploys, g.Footer(hints...)), line
}

// Render draws the screen for s.
func (m *summary) Render(width int, s setup.Summary) string {
	out, _ := m.layout(width, s)
	return out
}

// Cursor is where the terminal's cursor sits while an edit is open, and nil otherwise.
func (m *summary) Cursor(width int, s setup.Summary) *tea.Cursor {
	if m.editing == fieldNone {
		return nil
	}
	_, line := m.layout(width, s)
	c := m.input.Cursor()
	if c == nil {
		return nil
	}
	c.X += ColValue
	c.Y = line
	return c
}

// addresses is the address row's value: the runner's addresses for the host it checked, or for
// an edited host, the host alone and its www name when the host is the bare domain.
func (m *summary) addresses(s setup.Summary) string {
	addrs := s.Addresses
	if len(addrs) == 0 || addrs[0] != m.host {
		addrs = []string{m.host}
		if m.host == s.Zone {
			addrs = append(addrs, "www."+m.host)
		}
	}
	if len(addrs) == 2 {
		return fill(valueAddresses, "<host>", addrs[0], "<www>", addrs[1])
	}
	return strings.Join(addrs, ", ")
}

// themeName is the catalog's name for the theme id, or the id itself when the catalog lacks it.
func (m *summary) themeName(id string) string {
	for _, t := range m.themes {
		if t.ID == id {
			return t.Name
		}
	}
	return id
}
