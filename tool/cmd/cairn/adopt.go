package main

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/glw907/cairn-cms/tool/internal/adopt"
	"github.com/spf13/cobra"
)

// adoptFlags holds cairn adopt's own flags. 1.0's adopt is flag-driven and never prompts: the
// interactive dialog is 2.0's, and a command that waits on stdin has no recovery in a
// scheduled run.
type adoptFlags struct {
	// worker names the Workers script to adopt.
	worker string
	// repo overrides the repository Workers Builds reports, as "owner/name".
	repo string
}

// adoptListFlags holds cairn adopt list's own flags.
type adoptListFlags struct {
	// asJSON prints the candidates as JSON. It defaults to true: a candidate list is
	// identifiers all the way down, and JSON is the shape that survives being handed to
	// whatever decides which Worker to adopt. --json=false asks for the plain listing.
	asJSON bool
}

// candidateLine is one discovered candidate's JSON shape.
type candidateLine struct {
	Worker    string `json:"worker"`
	Repo      string `json:"repo"`
	Zone      string `json:"zone"`
	Domain    string `json:"domain"`
	AccountID string `json:"accountId"`
	Connected bool   `json:"connected"`
	Adopted   bool   `json:"adopted"`
}

// newAdoptCmd builds cairn adopt and its list subcommand. The listing is a separate
// non-writing subcommand rather than a mode flag on adopt, so the read path and the write path
// cannot be confused for each other at a call site or in a shell history.
func newAdoptCmd(d deps, rf *rootFlags) *cobra.Command {
	var f adoptFlags

	cmd := &cobra.Command{
		Use:     "adopt",
		Short:   "Add a Cloudflare Worker to the registry as a site",
		Example: "cairn adopt --worker ecxc-ski",
		GroupID: groupSite,
		Args:    cobra.NoArgs,
		RunE: func(cmd *cobra.Command, _ []string) error {
			return runAdopt(cmd, d, rf, f)
		},
	}
	cmd.Flags().StringVar(&f.worker, "worker", "", "the Workers script to adopt")
	cmd.Flags().StringVar(&f.repo, "repo", "", "the repository the Worker deploys from, as owner/name")

	var lf adoptListFlags
	list := &cobra.Command{
		Use:     "list",
		Short:   "List the Workers on the account that cairn could adopt",
		Example: "cairn adopt list",
		Args:    cobra.NoArgs,
		RunE: func(cmd *cobra.Command, _ []string) error {
			return runAdoptList(cmd, d, rf, lf)
		},
	}
	list.Flags().BoolVar(&lf.asJSON, "json", true, "print the candidates as JSON")
	cmd.AddCommand(list)

	return cmd
}

// discoverCandidates resolves the account and lists every Worker on it as a candidate, marking
// each one the registry already holds.
func discoverCandidates(ctx context.Context, d deps) ([]candidateLine, error) {
	clients := buildClients(d)
	if !clients.HaveCF {
		return nil, fmt.Errorf("cairn: no Cloudflare credentials found.\nRun `cairn auth set CAIRN_CF_READ_TOKEN` to store one")
	}
	resolved, _ := loadEnv(d.env, d.secretProviders()...)

	candidates, err := adopt.Discover(ctx, clients.CF, resolved.accountID())
	if err != nil {
		return nil, err
	}
	st, err := openRegistry(d)
	if err != nil {
		return nil, err
	}

	lines := make([]candidateLine, 0, len(candidates))
	for _, c := range candidates {
		lines = append(lines, candidateLine{
			Worker:    c.Worker,
			Repo:      c.Repo,
			Zone:      c.Zone,
			Domain:    c.Domain,
			AccountID: c.AccountID,
			Connected: c.Connected,
			Adopted:   adopt.AlreadyAdopted(st, c),
		})
	}
	return lines, nil
}

// runAdoptList prints the discovered candidates. It writes nothing to the registry, which is
// what makes it safe to run against an account before any decision has been taken.
func runAdoptList(cmd *cobra.Command, d deps, rf *rootFlags, lf adoptListFlags) error {
	if _, err := fmt.Fprintln(cmd.ErrOrStderr(), pasteNotice); err != nil {
		return err
	}

	ctx, cancel := rf.deadline(commandContext(cmd))
	defer cancel()

	lines, err := discoverCandidates(ctx, d)
	if err != nil {
		return err
	}
	if !lf.asJSON {
		for _, c := range lines {
			if _, err := fmt.Fprintf(cmd.OutOrStdout(), "%s\t%s\t%s\n", c.Worker, c.Domain, c.Repo); err != nil {
				return err
			}
		}
		return nil
	}
	data, err := json.MarshalIndent(lines, "", "  ")
	if err != nil {
		return err
	}
	_, err = fmt.Fprintf(cmd.OutOrStdout(), "%s\n", data)
	return err
}

// runAdopt writes the registry record for one named Worker.
func runAdopt(cmd *cobra.Command, d deps, rf *rootFlags, f adoptFlags) error {
	if f.worker == "" {
		return fmt.Errorf("cairn: cairn adopt names one Worker.\nRun `cairn adopt list` to see the Workers on the account")
	}

	ctx, cancel := rf.deadline(commandContext(cmd))
	defer cancel()

	clients := buildClients(d)
	if !clients.HaveCF {
		return fmt.Errorf("cairn: no Cloudflare credentials found.\nRun `cairn auth set CAIRN_CF_READ_TOKEN` to store one")
	}
	resolved, _ := loadEnv(d.env, d.secretProviders()...)

	candidates, err := adopt.Discover(ctx, clients.CF, resolved.accountID())
	if err != nil {
		return err
	}
	var chosen adopt.Candidate
	found := false
	for _, c := range candidates {
		if c.Worker == f.worker {
			chosen, found = c, true
			break
		}
	}
	if !found {
		return fmt.Errorf("cairn: no Worker named %q on this account.\nRun `cairn adopt list` to see the Workers on the account", f.worker)
	}
	if f.repo != "" {
		chosen.Repo = f.repo
	}

	st, err := openRegistry(d)
	if err != nil {
		return err
	}
	rec, err := adopt.Adopt(ctx, st, chosen, chosen.Worker, d.resolver)
	if err != nil {
		return err
	}
	_, err = fmt.Fprintf(cmd.OutOrStdout(), "%s added as %s\n", rec.Name, rec.Domain)
	return err
}
