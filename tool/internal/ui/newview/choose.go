package newview

import (
	"strconv"
	"strings"

	tea "charm.land/bubbletea/v2"
	"charm.land/huh/v2"

	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
	"github.com/glw907/cairn-cms/tool/v2/internal/store"
)

// choice asks the owner to pick one of several options in a single Huh select: a Cloudflare
// account, a domain, or the unfinished setup to resume.
type choice struct {
	styles Styles
	glyphs Glyphs
	keys   keys

	title, label, desc string
	options            []huh.Option[string]
	value              string
	form               *huh.Form
}

func newChoice(s Styles, g Glyphs, k keys, title, label, desc string, opts []huh.Option[string]) *choice {
	return &choice{styles: s, glyphs: g, keys: k, title: title, label: label, desc: desc, options: opts, value: opts[0].Value}
}

// accountChoice offers the accounts the Cloudflare approval reaches, by name.
func accountChoice(s Styles, g Glyphs, k keys, accounts []providers.Account) *choice {
	opts := make([]huh.Option[string], 0, len(accounts))
	for _, a := range accounts {
		opts = append(opts, huh.NewOption(a.Name, a.ID))
	}
	return newChoice(s, g, k, titleAccount, labelAccount, count(descAccount, len(accounts)), opts)
}

// zoneChoice offers the account's active zones, by domain.
func zoneChoice(s Styles, g Glyphs, k keys, zones []providers.Zone) *choice {
	opts := make([]huh.Option[string], 0, len(zones))
	for _, z := range zones {
		opts = append(opts, huh.NewOption(z.Name, z.ID))
	}
	return newChoice(s, g, k, titleDomain, labelDomain, count(descDomain, len(zones)), opts)
}

// resumeChoice offers each unfinished setup by its site name and domain, then a new site, whose
// value is the empty id.
func resumeChoice(s Styles, g Glyphs, k keys, runs []store.Entry) *choice {
	opts := make([]huh.Option[string], 0, len(runs)+1)
	for _, e := range runs {
		name := e.Record.Name
		if e.Record.Domain != "" {
			name += " " + g.Sep + " " + e.Record.Domain
		}
		opts = append(opts, huh.NewOption(name, e.ID))
	}
	opts = append(opts, huh.NewOption(optionNew, ""))
	return newChoice(s, g, k, titleResume, labelResume, descResume, opts)
}

func count(template string, n int) string {
	return strings.ReplaceAll(template, "<n>", strconv.Itoa(n))
}

// Start builds the form for width and returns its Init. A resize calls it again.
func (c *choice) Start(width int) tea.Cmd {
	w := Grid{Styles: c.styles, Glyphs: c.glyphs, Width: width}.ContentWidth()
	field := huh.NewSelect[string]().
		Title(c.label).
		Description(prose(c.desc, w)).
		Options(c.options...).
		Value(&c.value)
	c.form = oneField(c.styles, field, w)
	return c.form.Init()
}

// Forward hands msg to the form; done reports that the owner chose.
func (c *choice) Forward(msg tea.Msg) (done bool, cmd tea.Cmd) {
	cmd = forward(c.form, msg)
	return c.form.State == huh.StateCompleted, cmd
}

// Value is the chosen option's value: an account id, a zone id, or a site id, "" for a new site.
func (c *choice) Value() string { return c.value }

// Render draws the choice: the title, the select, and the footer.
func (c *choice) Render(width int) string {
	g := Grid{Styles: c.styles, Glyphs: c.glyphs, Width: width}
	return Frame(g.Title(c.title), formBlock(c.form), g.Footer(c.keys.Choose, c.keys.Next))
}
