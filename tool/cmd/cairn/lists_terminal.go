package main

import (
	"fmt"
	"slices"
	"strings"

	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
	"github.com/glw907/cairn-cms/tool/v2/internal/render"
	"github.com/glw907/cairn-cms/tool/v2/internal/store"
	"github.com/glw907/cairn-cms/tool/v2/internal/style"
	"github.com/spf13/cobra"
)

// rootFlagsOf rebuilds the root's persistent flags a command reads for styling, from the flag
// set cobra parsed. A command that takes only deps has no rootFlags to hand, and a test that
// builds the command alone has no root flags at all, so a missing flag keeps its default.
func rootFlagsOf(cmd *cobra.Command) *rootFlags {
	rf := &rootFlags{color: colorAuto, theme: themeDark}
	if f := cmd.Flags().Lookup("color"); f != nil {
		rf.color = f.Value.String()
	}
	if f := cmd.Flags().Lookup("theme"); f != nil {
		rf.theme, rf.themeSet = f.Value.String(), f.Changed
	}
	if f := cmd.Flags().Lookup("width"); f != nil {
		_, _ = fmt.Sscan(f.Value.String(), &rf.width)
	}
	return rf
}

// view is what a terminal list or receipt draws with: the theme, the glyph tier it was built
// for, and the width to compose into.
type view struct {
	t     style.Theme
	marks style.Marks
	width int
}

// listView returns the view a list or receipt draws with, and whether it draws at all: only a
// terminal does, and CAIRN_PLAIN makes that answer a pipe's. A deps with no environment reader
// is a command built alone, which has no terminal to detect.
func listView(d deps, rf *rootFlags) (view, bool) {
	if d.env == nil {
		return view{}, false
	}
	term := reportTerminal(d, rf)
	t := style.NewTheme(resolveGround(d, rf).dark, term.Profile, term.ASCII)
	return view{t, style.MarksFor(term.ASCII), reportWidth(rf, term)}, term.TTY
}

// sitesLines is the site listing on a terminal: the bold title with the count muted beside it,
// then the table of every site. An empty registry draws the title alone.
func sitesLines(v view, entries []store.Entry) []string {
	t, width := v.t, v.width
	out := style.Title(t, labelSites, width)
	out[0] += "  " + t.Style(style.RoleMuted).Render(fmt.Sprintf(tmplSitesCount, len(entries)))
	if len(entries) == 0 {
		return out
	}
	rows := make([][]string, 0, len(entries))
	for _, e := range entries {
		rows = append(rows, []string{e.ID, e.Record.Name, e.Record.Domain})
	}
	return append(append(out, ""), style.Table(t, []string{colSite, colName, colDomain}, rows, width)...)
}

// writeSitesTerminal draws the site listing when stdout is a terminal and reports whether it did.
func writeSitesTerminal(cmd *cobra.Command, d deps, rf *rootFlags, entries []store.Entry) (bool, error) {
	v, ok := listView(d, rf)
	if !ok {
		return false, nil
	}
	return true, writeLines(cmd.OutOrStdout(), sitesLines(v, entries))
}

// credentialRow is one variable auth list reports: its name, where it resolved from, and whether
// it resolved at all.
type credentialRow struct {
	name, display string
	set           bool
}

// listTerminal reports whether a list draws as a terminal view.
func listTerminal(d deps, rf *rootFlags) bool {
	_, ok := listView(d, rf)
	return ok
}

// credentialRows turns the resolved variables into auth list's rows, a keyring that could not
// be opened named as such rather than as an empty one.
func credentialRows(d deps, e env, missing []providers.Missing) []credentialRow {
	var rows []credentialRow
	for _, r := range e.sourceLines() {
		unset := slices.ContainsFunc(missing, func(m providers.Missing) bool { return m.Var == r.name })
		rows = append(rows, credentialRow{r.name, keyringAwareDisplay(d, r), !unset})
	}
	return rows
}

// writeAdoptListTerminal draws adopt list's two groups as titled tables. The stderr notice about
// the Workers with no Custom Domain is the one it prints off a terminal, unchanged.
func writeAdoptListTerminal(cmd *cobra.Command, d deps, rf *rootFlags, v view, lines []render.AdoptCandidate) error {
	for _, c := range lines {
		if !c.Adoptable {
			if err := writeListNotice(cmd, d, rf, tmplAdoptListRouteOnly); err != nil {
				return err
			}
			break
		}
	}
	return writeLines(cmd.OutOrStdout(), adoptLines(v, lines))
}

// writeListNotice writes a notice that sits over a drawn list. When stderr is not a terminal
// it is writeNotice's plain lines, the bytes a script reading stderr already sees.
func writeListNotice(cmd *cobra.Command, d deps, rf *rootFlags, notice string) error {
	if _, stderr := styledStreams(d, rf); !style.IsTerminal(stderr) {
		return writeNotice(cmd, d, rf, notice)
	}
	return writeTerminalNotice(cmd, d, rf, notice)
}

// writeTerminalNotice writes notice to stderr as the margin-and-muted-ink block a drawn view
// takes: every line at cell 2, wrapped to the view's width, then one blank line.
func writeTerminalNotice(cmd *cobra.Command, d deps, rf *rootFlags, notice string) error {
	term := reportTerminal(d, rf)
	theme := style.NewTheme(resolveGround(d, rf).dark, term.Profile, term.ASCII)
	for _, line := range noticeLines(theme, notice, reportWidth(rf, term)) {
		if _, err := fmt.Fprintln(cmd.ErrOrStderr(), line); err != nil {
			return err
		}
	}
	return nil
}

// noticeLines lays notice out for a terminal: each of its own lines wrapped on its own, so a
// notice carrying a line break keeps it, and a blank line closing the block.
func noticeLines(t style.Theme, notice string, width int) []string {
	var out []string
	for paragraph := range strings.SplitSeq(notice, "\n") {
		out = append(out, style.ContinuationLine(t, style.RoleMuted, paragraph, 2, width)...)
	}
	return append(out, "")
}

// credentialLines is auth list on a terminal: a title and one mark row per variable. A variable
// that resolved takes the pass mark and one that did not takes the could-not-run mark.
func credentialLines(v view, rows []credentialRow) []string {
	t, m, width := v.t, v.marks, v.width
	out := style.Title(t, labelCredentialsList, width)
	for _, r := range rows {
		mark, role := m.Pass, style.RoleOK
		if !r.set {
			mark, role = m.CouldNotRun, style.RoleUnknown
		}
		out = append(out, style.MarkRow(t, mark, role, r.name, r.display, width)...)
	}
	return out
}

// adoptLines is adopt list on a terminal: one titled table for the Workers discovery can adopt
// and one for those with no Custom Domain, a group left out when it holds nothing.
func adoptLines(v view, lines []render.AdoptCandidate) []string {
	t, width := v.t, v.width
	var ready, routeOnly [][]string
	for _, c := range lines {
		if c.Adoptable {
			ready = append(ready, []string{c.Worker, c.Domain, c.Repo})
		} else {
			routeOnly = append(routeOnly, []string{c.Worker, c.Repo})
		}
	}
	var out []string
	group := func(title string, header []string, rows [][]string) {
		if len(rows) == 0 {
			return
		}
		if len(out) > 0 {
			out = append(out, "")
		}
		out = append(append(out, style.Title(t, title, width)...), style.Table(t, header, rows, width)...)
	}
	group(labelReadyToAdopt, []string{colWorker, colDomain, colRepository}, ready)
	group(labelNoCustomDomain, []string{colWorker, colRepository}, routeOnly)
	return out
}

// receiptLines is a receipt on a terminal: the pass mark at the margin beside the text a pipe
// receives, without its newline.
func receiptLines(v view, text string) []string {
	t := v.t
	out := style.ContinuationLine(t, style.RoleText, text, 4, v.width)
	if len(out) == 0 {
		return nil
	}
	mark := t.Style(style.RoleOK).Render(v.marks.Pass)
	out[0] = "  " + mark + " " + strings.TrimPrefix(out[0], "    ")
	return out
}

// writeReceipt prints a command's one-line result: the pass mark and the text on a terminal, and
// the text alone, as ever, anywhere else.
func writeReceipt(cmd *cobra.Command, d deps, text string) error {
	v, ok := listView(d, rootFlagsOf(cmd))
	if !ok {
		_, err := fmt.Fprint(cmd.OutOrStdout(), text)
		return err
	}
	return writeLines(cmd.OutOrStdout(), receiptLines(v, strings.TrimSuffix(text, "\n")))
}
