package main

import (
	"encoding/json"
	"fmt"

	"github.com/glw907/cairn-cms/tool/internal/render"
	"github.com/glw907/cairn-cms/tool/internal/spine"
	"github.com/glw907/cairn-cms/tool/internal/store"
	"github.com/spf13/cobra"
)

// sitesFlags holds cairn sites list's own flags. They are declared once, on the sites command's
// persistent set, so bare cairn sites and cairn sites list take the same flags.
type sitesFlags struct {
	// asJSON prints the listing as a JSON array instead of one line per site.
	asJSON bool
	// expectSites is the count the operator asserts the registry holds. Zero means no assertion.
	expectSites int
}

// siteLine is one listed site's JSON shape.
type siteLine struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Domain string `json:"domain"`
	Step   string `json:"step"`
}

// newSitesCmd builds cairn sites list, with bare cairn sites as its alias. The alias is the
// same RunE rather than a cobra Aliases entry, because the alias stands in for the subcommand
// and not for the parent's own name.
func newSitesCmd(d deps, rf *rootFlags) *cobra.Command {
	var f sitesFlags
	run := func(cmd *cobra.Command, _ []string) error { return runSitesList(cmd, d, rf, f) }

	cmd := &cobra.Command{
		Use:     "sites",
		Short:   shortSites,
		Example: exampleSites,
		GroupID: groupSite,
		Args:    cobra.NoArgs,
		RunE:    run,
	}
	cmd.AddCommand(&cobra.Command{
		Use:     "list",
		Short:   shortSites,
		Example: exampleSitesList,
		Args:    cobra.NoArgs,
		RunE:    run,
	})

	p := cmd.PersistentFlags()
	p.BoolVar(&f.asJSON, "json", false, flagSitesJSONHelp)
	p.IntVar(&f.expectSites, "expect-sites", 0, flagExpectSitesHelp)

	return cmd
}

// runSitesList prints the registry's sites and exits on the verdict spine.ExitCode gives the
// listing. A listing carries no health, so every site contributes nothing and the verdict comes
// from the read itself: an empty registry, an unreadable record, or a count the operator's
// --expect-sites disagrees with all leave the tool unable to say whether the sites are healthy.
func runSitesList(cmd *cobra.Command, d deps, rf *rootFlags, f sitesFlags) error {
	dir, err := d.registryDir()
	if err != nil {
		return err
	}
	st, err := openRegistry(d)
	if err != nil {
		return err
	}
	entries, listErrs := st.List()
	entries, listErrs = excludeAckFile(entries, listErrs, dir, rf)

	if rf.verbose {
		if err := printRegistrySource(cmd, d); err != nil {
			return err
		}
	}

	// An empty registry reuses spine.ErrExpectSites too, even with no --expect-sites: the tool
	// cannot say whether zero is every site or none of them were ever registered, the same
	// reason a count mismatch is UNKNOWN rather than OK.
	if len(entries) == 0 || (f.expectSites > 0 && len(entries) != f.expectSites) {
		listErrs = append(listErrs, spine.ErrExpectSites)
	}

	// ExitCode's own expectSites parameter counts settled site reports, and a listing settles
	// none, so the count is compared here and reaches the arithmetic as the sentinel the
	// listing is meant to return. Nothing below re-derives the mapping from sentinel to code.
	verdict := spine.ExitCode(nil, listErrs, 0)
	if err := writeSites(cmd, entries, f, rf, verdict); err != nil {
		return err
	}
	if err := writeSitesStatus(cmd, d, rf, f, verdict); err != nil {
		return err
	}
	for _, e := range listErrs {
		if _, err := fmt.Fprintln(cmd.ErrOrStderr(), "cairn:", e); err != nil {
			return err
		}
	}

	d.exit(int(verdict))
	return nil
}

// writeSitesStatus prints the run's own credential state under the listing. A listing has no
// creds row for that detail to sit on, which is the one place it stands alone: an operator
// looking at a registry of sites the tool cannot fully check should learn why here rather than
// from the first health run that skips half its checks.
//
// It is silent under --json, where the payload is the output, and silent on a quiet OK run for
// the same reason the listing is.
func writeSitesStatus(cmd *cobra.Command, d deps, rf *rootFlags, f sitesFlags, verdict spine.Verdict) error {
	if f.asJSON || (rf.quiet && verdict == spine.VerdictOK) {
		return nil
	}
	in := renderInput(d, rf, nil, verdict, runStatus(buildClients(d), 0, false, nil))
	in.View = render.ViewStatus
	for _, line := range render.Render(in).Lines() {
		if _, err := fmt.Fprintln(cmd.OutOrStdout(), line); err != nil {
			return err
		}
	}
	return nil
}

// printRegistrySource writes the directory the listing read and the store.Source that chose it,
// which --verbose is what asks for: a path is an identifier like any other, and the precedence
// rule that picked it is the one fact --verbose adds beyond the plain listing.
func printRegistrySource(cmd *cobra.Command, d deps) error {
	dir, source, err := d.registrySource()
	if err != nil {
		return err
	}
	_, err = fmt.Fprintf(cmd.OutOrStdout(), "registry\t%s\t%s\n", dir, source)
	return err
}

// writeSites writes the listing itself, honouring --json over --quiet: under --json the payload
// is the output, so suppressing it would hand an agent an empty stdout.
func writeSites(cmd *cobra.Command, entries []store.Entry, f sitesFlags, rf *rootFlags, verdict spine.Verdict) error {
	if f.asJSON {
		lines := make([]siteLine, 0, len(entries))
		for _, e := range entries {
			lines = append(lines, siteLine{ID: e.ID, Name: e.Record.Name, Domain: e.Record.Domain, Step: e.Record.Step})
		}
		data, err := json.MarshalIndent(lines, "", "  ")
		if err != nil {
			return err
		}
		_, err = fmt.Fprintf(cmd.OutOrStdout(), "%s\n", data)
		return err
	}
	if rf.quiet && verdict == spine.VerdictOK {
		return nil
	}
	for _, e := range entries {
		if _, err := fmt.Fprintf(cmd.OutOrStdout(), "%s\t%s\t%s\n", e.ID, e.Record.Name, e.Record.Domain); err != nil {
			return err
		}
	}
	return nil
}
