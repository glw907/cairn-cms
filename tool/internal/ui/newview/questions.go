package newview

import (
	"strings"

	"charm.land/bubbles/v2/key"
	tea "charm.land/bubbletea/v2"
	"charm.land/huh/v2"

	"github.com/glw907/cairn-cms/tool/v2/internal/setup"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup/scaffold"
)

// question is one of the owner's questions, in the order they are asked.
type question int

const (
	qTheme question = iota
	qName
	qCrawlers
	qEmail
	qCount
)

// questions asks for the theme, the site name, the AI-crawler posture, and the owner's email,
// one Huh form at a time. The theme question is asked only when the catalog offers more than one
// theme, and the email only when askEmail is set.
type questions struct {
	styles   Styles
	glyphs   Glyphs
	keys     keys
	themes   []scaffold.Theme
	askEmail bool

	q       question
	theme   string
	name    string
	posture setup.Posture
	email   string
	form    *huh.Form
}

func newQuestions(s Styles, g Glyphs, k keys, themes []scaffold.Theme, askEmail bool) *questions {
	q := &questions{styles: s, glyphs: g, keys: k, themes: themes, askEmail: askEmail, posture: setup.Decline}
	if len(themes) > 0 {
		q.theme = themes[0].ID
	}
	q.q = q.first()
	return q
}

func (q *questions) first() question {
	if len(q.themes) > 1 {
		return qTheme
	}
	return qName
}

// Start builds the current question's form for width and returns its Init. A form is measured
// when it is built, so a resize calls Start again; the values ride through on their pointers.
func (q *questions) Start(width int) tea.Cmd {
	q.form = q.build(Grid{Styles: q.styles, Glyphs: q.glyphs, Width: width}.ContentWidth())
	return q.form.Init()
}

// Back returns to the question before the current one, if there is one.
func (q *questions) Back(width int) tea.Cmd {
	if q.q == q.first() {
		return nil
	}
	q.q--
	return q.Start(width)
}

// Forward hands msg to the current form. When the form completes it moves to the next
// question, and done reports that the last one is answered.
func (q *questions) Forward(msg tea.Msg, width int) (done bool, cmd tea.Cmd) {
	cmd = forward(q.form, msg)
	if q.form.State != huh.StateCompleted {
		return false, cmd
	}
	q.q++
	if q.q == qEmail && !q.askEmail {
		q.q++
	}
	if q.q == qCount {
		return true, nil
	}
	return false, q.Start(width)
}

// Answers returns what the owner chose. Theme is set only when the catalog offered a choice, and
// OwnerEmail only when the email was asked.
func (q *questions) Answers() setup.Answers {
	a := setup.Answers{SiteName: strings.TrimSpace(q.name), Posture: q.posture}
	if len(q.themes) > 1 {
		a.Theme = q.theme
	}
	if q.askEmail {
		a.OwnerEmail = strings.TrimSpace(q.email)
	}
	return a
}

func (q *questions) build(width int) *huh.Form {
	var field huh.Field
	switch q.q {
	case qTheme:
		opts := make([]huh.Option[string], 0, len(q.themes))
		for _, t := range q.themes {
			opts = append(opts, huh.NewOption(t.Name, t.ID))
		}
		field = huh.NewSelect[string]().
			Title(labelTheme).
			Description(prose(descTheme, width)).
			Options(opts...).
			Value(&q.theme)
	case qName:
		field = huh.NewInput().
			Title(labelSiteName).
			Description(prose(descSiteName, width)).
			Value(&q.name).
			Validate(func(s string) error {
				if repository(s) == "" {
					return ownerError(errSlug)
				}
				return nil
			})
	case qEmail:
		field = huh.NewInput().
			Title(labelOwnerEmail).
			Description(prose(descOwnerEmail, width)).
			Value(&q.email).
			Validate(func(s string) error {
				if !setup.ValidEmail(strings.TrimSpace(s)) {
					return ownerError(setup.ProblemEmail)
				}
				return nil
			})
	default:
		field = huh.NewSelect[setup.Posture]().
			Title(labelCrawlers).
			Description(prose(descCrawlers, width)).
			Options(huh.NewOption(optionBlock, setup.Decline), huh.NewOption(optionAllow, setup.Invite)).
			Value(&q.posture)
	}
	return oneField(formTheme(q.styles), field, width)
}

// Render draws the questions screen: the answered questions as receipts, the current form,
// the block that goes with it, and the footer.
func (q *questions) Render(width int) string {
	g := Grid{Styles: q.styles, Glyphs: q.glyphs, Width: width}
	var receipts []string
	if q.q > qTheme && len(q.themes) > 1 {
		receipts = append(receipts, g.Cell(labelTheme, g.Styles.Muted, g.Styles.Text.Render(q.themeEntry().Name)))
	}
	if q.q > qName {
		receipts = append(receipts, g.Cell(labelSiteName, g.Styles.Muted, g.Styles.Text.Render(strings.TrimSpace(q.name))))
	}
	if q.q > qCrawlers {
		choice := optionBlock
		if q.posture == setup.Invite {
			choice = optionAllow
		}
		receipts = append(receipts, g.Cell(labelCrawlers, g.Styles.Muted, g.Styles.Text.Render(choice)))
	}

	after := ""
	hints := []key.Binding{q.keys.Choose, q.keys.Next}
	switch q.q {
	case qTheme:
		after = q.themeBlock(g)
	case qName:
		hints = hints[1:]
		if r := repository(q.name); r != "" {
			after = g.Cell(labelRepo, g.Styles.Muted, g.Styles.Muted.Render(r))
		}
	case qEmail:
		hints = hints[1:]
	}
	if q.q > q.first() {
		hints = append(hints, q.keys.Back)
	}
	return Frame(g.Title(titleQuestions), strings.Join(receipts, "\n"), formBlock(q.form), after, g.Footer(hints...))
}

func (q *questions) themeEntry() scaffold.Theme {
	for _, t := range q.themes {
		if t.ID == q.theme {
			return t
		}
	}
	return q.themes[0]
}

// themeBlock describes the highlighted theme on the label grid, padded to the tallest theme's
// height so the screen holds still as the highlight moves.
func (q *questions) themeBlock(g Grid) string {
	render := func(t scaffold.Theme) []string {
		return strings.Split(g.Cell(labelDesign, g.Styles.Muted, g.WrapValue(RoleSubtle, t.Description)...), "\n")
	}
	tall := 0
	for _, t := range q.themes {
		tall = max(tall, len(render(t)))
	}
	ls := render(q.themeEntry())
	for len(ls) < tall {
		ls = append(ls, "")
	}
	return strings.Join(ls, "\n")
}

// repository is the repository name setup derives from a site name, or "" for a name that
// yields none. It asks setup.Plan, the one derivation, with stand-in values for the answers the
// name does not depend on, so the preview cannot drift from the name setup creates.
func repository(siteName string) string {
	o, err := setup.Plan(setup.Answers{
		SiteName: siteName, OwnerEmail: "preview", Posture: setup.Decline, Zone: "preview", Host: "preview",
	})
	if err != nil {
		return ""
	}
	return o.Names.Repository
}

// ownerError is a validation message Huh shows the owner as it is. It is a sentence, so it
// keeps the capital and the full stop an error string would drop.
type ownerError string

func (e ownerError) Error() string { return string(e) }

// oneField wraps field in the one-field form every question uses. The field takes its width
// before the form takes its theme: Huh measures the group when the theme is set, and a
// description measured before it wraps leaves too little room for the options.
func oneField(theme huh.Theme, field huh.Field, width int) *huh.Form {
	return huh.NewForm(huh.NewGroup(field.WithWidth(width))).
		WithTheme(theme).
		WithKeyMap(formKeys()).
		WithShowHelp(false).
		WithWidth(width)
}

// formTheme is HuhTheme pinned to the background s was resolved for. Huh v2.0.3 never asks the
// terminal for its background, so the variant it names would be the light one on every terminal.
func formTheme(s Styles) huh.Theme {
	t := HuhTheme(s)
	return huh.ThemeFunc(func(bool) *huh.Styles { return t.Theme(s.Dark) })
}

// formKeys is Huh's key map without the select filter and without Quit: the root owns Ctrl+C,
// so it can stop the run and print its own line.
func formKeys() *huh.KeyMap {
	k := huh.NewDefaultKeyMap()
	k.Select.Filter.SetEnabled(false)
	k.Quit.SetEnabled(false)
	return k
}

// prose balances a description for Huh, which keeps the line breaks it is given and would
// otherwise wrap greedily.
func prose(s string, width int) string { return strings.Join(Balance(s, width), "\n") }

// formBlock is a form's view at the margin. Huh pads its view with trailing blanks and blank
// lines, which would break the one-blank-line rhythm between blocks, so both are trimmed.
func formBlock(f *huh.Form) string {
	ls := strings.Split(strings.TrimRight(f.View(), "\n "), "\n")
	for i, l := range ls {
		ls[i] = margin + strings.TrimRight(l, " ")
	}
	return strings.Join(ls, "\n")
}

// forward hands msg to f, which updates in place, and returns the command it asks for.
func forward(f *huh.Form, msg tea.Msg) tea.Cmd {
	_, cmd := f.Update(msg)
	return cmd
}
