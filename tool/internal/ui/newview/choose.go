package newview

import (
	"strconv"
	"strings"

	"charm.land/bubbles/v2/key"
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
	// blank reports that no option is chosen yet: several accounts or domains show no cursor,
	// and Enter does nothing, until the owner moves. It keeps an Enter meant for an earlier
	// screen from accepting the first option unread.
	blank bool
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
	c := newChoice(s, g, k, titleAccount, labelAccount, count(descAccount, len(accounts)), opts)
	c.blank = len(opts) > 1
	return c
}

// zoneChoice offers the account's active zones, by domain.
func zoneChoice(s Styles, g Glyphs, k keys, zones []providers.Zone) *choice {
	opts := make([]huh.Option[string], 0, len(zones))
	for _, z := range zones {
		opts = append(opts, huh.NewOption(z.Name, z.ID))
	}
	c := newChoice(s, g, k, titleDomain, labelDomain, count(descDomain, len(zones)), opts)
	c.blank = len(opts) > 1
	return c
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
	c.form = oneField(c.theme(), field, w)
	return c.form.Init()
}

// theme is the form theme, with the cursor row drawn like the others while blank. Huh asks for
// styles at every render, so the cursor appears as soon as blank clears.
func (c *choice) theme() huh.Theme {
	base := formTheme(c.styles)
	return huh.ThemeFunc(func(dark bool) *huh.Styles {
		hs := base.Theme(dark)
		if c.blank {
			hs.Focused.SelectSelector = hs.Focused.SelectSelector.SetString("  ")
			hs.Focused.SelectedOption = hs.Focused.UnselectedOption
		}
		return hs
	})
}

// Forward hands msg to the form; done reports that the owner chose. While blank, Enter and Tab
// do nothing, a first Down lands on the first option, and any other key clears blank.
func (c *choice) Forward(msg tea.Msg) (done bool, cmd tea.Cmd) {
	if k, ok := msg.(tea.KeyPressMsg); ok && c.blank {
		km := formKeys().Select
		switch {
		case key.Matches(k, km.Next, km.Submit):
			return false, nil
		case key.Matches(k, km.Down):
			c.blank = false
			return false, nil
		}
		c.blank = false
	}
	cmd = forward(c.form, msg)
	return c.form.State == huh.StateCompleted, cmd
}

// Value is the chosen option's value: an account id, a zone id, or a site id, "" for a new site.
func (c *choice) Value() string { return c.value }

// Render draws the choice: the title, the select, and the footer, which hints Enter only once an
// option is chosen.
func (c *choice) Render(width int) string {
	g := Grid{Styles: c.styles, Glyphs: c.glyphs, Width: width}
	if c.blank {
		return Frame(g.Title(c.title), formBlock(c.form), g.Footer(c.keys.Choose))
	}
	return Frame(g.Title(c.title), formBlock(c.form), g.Footer(c.keys.Choose, c.keys.Next))
}
