package main

import (
	"fmt"
	"slices"
	"strings"

	"github.com/glw907/cairn-cms/tool/v2/internal/spine"
	"github.com/glw907/cairn-cms/tool/v2/internal/store"
	"github.com/spf13/cobra"
)

// newStatusCmd builds cairn new status, which lists the setup records and what each unfinished
// one still holds. It reads the registry alone: no network and no keyring.
func newStatusCmd(d deps) *cobra.Command {
	return &cobra.Command{
		Use:     "status",
		Short:   shortNewStatus,
		Example: exampleNewStatus,
		Args:    cobra.NoArgs,
		RunE: func(cmd *cobra.Command, _ []string) error {
			return runNewStatus(cmd, d)
		},
	}
}

// runNewStatus prints one row per setup record, and under each unfinished one the keyring
// entries, the GitHub App, and the repository it holds. A record is finished only at the live
// step, so a record another process left at any other step reads as unfinished.
func runNewStatus(cmd *cobra.Command, d deps) error {
	st, err := openRegistry(d)
	if err != nil {
		return err
	}
	entries, _ := st.List()
	slices.SortFunc(entries, func(a, b store.Entry) int { return strings.Compare(a.ID, b.ID) })
	w := cmd.OutOrStdout()
	var rows, open int
	for _, e := range entries {
		rec := e.Record
		if !rec.IsSetup() {
			continue
		}
		rows++
		if rec.Step == string(spine.StepLive) {
			_, _ = fmt.Fprintf(w, tmplNewStatusFinished+"\n", e.ID, rec.Step)
			continue
		}
		open++
		_, _ = fmt.Fprintf(w, tmplNewStatusUnfinished+"\n", e.ID, rec.Step)
		if keys := rec.Setup.KeyringEntries; len(keys) > 0 {
			_, _ = fmt.Fprintf(w, tmplNewStatusKeys+"\n", strings.Join(keys, ", "))
		}
		if rec.Setup.IDs.AppID != 0 {
			_, _ = fmt.Fprintf(w, tmplNewStatusApp+"\n", rec.Setup.AppSlug)
		}
		if g := rec.GitHub.Repo; g.ID != 0 {
			_, _ = fmt.Fprintf(w, tmplNewStatusRepo+"\n", g.Owner+"/"+g.Repo)
		}
	}
	if rows == 0 {
		_, err = fmt.Fprintln(w, newStatusNone)
		return err
	}
	if open > 0 {
		_, err = fmt.Fprintln(w, newStatusHint)
	}
	return err
}
