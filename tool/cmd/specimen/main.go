// Command specimen prints the terminal language at 80 columns: every colour role's name in its
// own ink, the mark table with both glyph tiers side by side, and each print-and-exit block from
// internal/style with sample content. It paints at TrueColor whatever the terminal reports, so a
// screenshot shows the full palette, and -theme picks the dark or the light ink branch.
//
// It is the caller of the blocks no command uses yet, it writes the specimen golden its test
// compares, and it is what the terminal screenshots run. It never enters the shipped binary.
package main

import (
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"strings"

	"github.com/charmbracelet/colorprofile"
	"github.com/glw907/cairn-cms/tool/v2/internal/style"
)

// width is the column count the specimen composes into.
const width = 80

func main() {
	if err := run(os.Stdout, os.Args[1:]); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(2)
	}
}

// run parses args and writes the specimen to w.
func run(w io.Writer, args []string) error {
	fs := flag.NewFlagSet("specimen", flag.ContinueOnError)
	theme := fs.String("theme", "dark", "the ground to paint for: dark or light")
	if err := fs.Parse(args); err != nil {
		return err
	}
	if fs.NArg() > 0 {
		return errors.New("specimen takes no arguments")
	}
	if *theme != "dark" && *theme != "light" {
		return fmt.Errorf("-theme takes dark or light, not %q", *theme)
	}
	_, err := io.WriteString(w, specimen(*theme == "dark"))
	return err
}

// roles names every colour role in the order the standard lists them.
var roles = []struct {
	name string
	role style.Role
}{
	{"Text", style.RoleText},
	{"Muted", style.RoleMuted},
	{"Subtle", style.RoleSubtle},
	{"OK", style.RoleOK},
	{"Failing", style.RoleFailing},
	{"Unknown", style.RoleUnknown},
	{"Accent", style.RoleAccent},
	{"Rule", style.RoleRule},
}

// specimen returns the whole specimen for one ground, one line per row and a blank line between
// sections.
func specimen(dark bool) string {
	t := style.NewTheme(dark, colorprofile.TrueColor, false)
	m := style.MarksFor(false)
	var out []string
	section := func(title string, lines ...string) {
		out = append(out, "")
		out = append(out, style.Title(t, title, width)...)
		out = append(out, lines...)
	}

	inks := make([]string, 0, len(roles))
	for _, r := range roles {
		inks = append(inks, t.Style(r.role).Render(r.name))
	}
	section("roles", "  "+strings.Join(inks, "  "),
		"  "+t.Style(style.RoleRule).Render(strings.Repeat(m.Rule, width-4)))

	section("marks", markTable(t)...)

	section("verdict line",
		style.VerdictLine(t, "CRITICAL", style.RoleFailing, "my-site", tally(m), width)...)
	section("title", style.Title(t, "Could not run", width)...)

	creds := style.MarkRow(t, m.FailingWarn, style.RoleUnknown, "creds", "the token was rejected", width)
	col := t.DetailColumn("creds", width)
	creds = append(creds, style.ContinuationLine(t, style.RoleMuted,
		"CAIRN_CF_READ_TOKEN read from the keyring", col, width)...)
	creds = append(creds, style.FixLine(t,
		"Create a new token, then run `cairn auth set` naming the credential.",
		"https://cairn.pub/docs/admin/is-it-working#creds", col, width)...)
	section("mark row, continuation line, fix line", append(append(creds,
		style.MarkRow(t, m.CouldNotRun, style.RoleUnknown, "email", "the token this check reads is not set", width)...),
		style.MarkRow(t, m.Held, style.RoleUnknown, "engine", "0.76.0 is two releases behind 0.78.0", width)...)...)

	long := "Session secret is missing from the Worker"
	longRow := style.MarkRow(t, m.Failing, style.RoleFailing, long, "SESSION_SECRET is not set", width)
	section("mark row with a long name, and its fix line", append(longRow, style.FixLine(t,
		"Run `wrangler secret put SESSION_SECRET`, then deploy again.", "", t.DetailColumn(long, width), width)...)...)

	section("label row", append(style.LabelRow(t, "Domain", "docs.example.org", width),
		style.LabelRow(t, "Repository", "glw/trail-docs", width)...)...)
	section("table", style.Table(t, []string{"site", "name", "domain"}, [][]string{
		{"my-site", "Field Notes", "fieldnotes.example.org"},
		{"docs-site", "Trail Docs", "docs.example.org"},
		{"shop-site", "Ridge Supply", "shop.example.org"},
	}, width)...)
	section("progress line", style.ProgressLine(t, 1, "Checking my-site"+m.Ellipsis+"  4 of 9", width))
	section("error block", style.ErrorBlock(t, "--since takes a duration, such as 2h or 30m.",
		`It got "tuesday".`, "Run `cairn logs --help` for the forms it takes.", width)...)

	return strings.Join(out, "\n") + "\n"
}

// tally is the sample count line, joined with the tier's separator.
func tally(m style.Marks) string {
	return strings.Join([]string{"1 failing", "3 could not run", "5 passing"}, " "+m.Sep+" ")
}

// markTable lays every mark out with its Unicode glyph beside its ASCII one.
func markTable(t style.Theme) []string {
	u, a := style.MarksFor(false), style.MarksFor(true)
	pairs := [][]string{
		{"pass", u.Pass, a.Pass},
		{"failing", u.Failing, a.Failing},
		{"failing at warning", u.FailingWarn, a.FailingWarn},
		{"could not run", u.CouldNotRun, a.CouldNotRun},
		{"held", u.Held, a.Held},
		{"not started", u.NotStarted, a.NotStarted},
		{"warning", u.Warning, a.Warning},
		{"fix", u.Fix, a.Fix},
		{"rule", u.Rule, a.Rule},
		{"separator", u.Sep, a.Sep},
		{"ellipsis", u.Ellipsis, a.Ellipsis},
		{"spinner", u.Spinner, a.Spinner},
	}
	return style.Table(t, []string{"mark", "unicode", "ascii"}, pairs, width)
}
