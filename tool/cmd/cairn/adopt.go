package main

import (
	"context"
	"fmt"

	"github.com/glw907/cairn-cms/tool/internal/adopt"
	"github.com/glw907/cairn-cms/tool/internal/render"
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

// newAdoptCmd builds cairn adopt and its list subcommand. The listing is a separate
// non-writing subcommand rather than a mode flag on adopt, so the read path and the write path
// cannot be confused for each other at a call site or in a shell history.
func newAdoptCmd(d deps, rf *rootFlags) *cobra.Command {
	var f adoptFlags

	cmd := &cobra.Command{
		Use:     "adopt",
		Short:   shortAdopt,
		Example: exampleAdopt,
		GroupID: groupSite,
		Args:    cobra.NoArgs,
		RunE: func(cmd *cobra.Command, _ []string) error {
			return runAdopt(cmd, d, rf, f)
		},
	}
	cmd.Flags().StringVar(&f.worker, "worker", "", flagWorkerHelp)
	cmd.Flags().StringVar(&f.repo, "repo", "", flagRepoHelp)

	var lf adoptListFlags
	list := &cobra.Command{
		Use:     "list",
		Short:   shortAdoptList,
		Example: exampleAdoptList,
		Args:    cobra.NoArgs,
		RunE: func(cmd *cobra.Command, _ []string) error {
			return runAdoptList(cmd, d, rf, lf)
		},
	}
	list.Flags().BoolVar(&lf.asJSON, "json", true, flagAdoptListJSONHelp)
	cmd.AddCommand(list)

	return cmd
}

// discoverCandidates resolves the account and lists every Worker on it as a candidate, marking
// each one the registry already holds.
func discoverCandidates(ctx context.Context, d deps) ([]render.AdoptCandidate, error) {
	clients := buildClients(d)
	if !clients.HaveCF {
		return nil, noCloudflareCredentialError()
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

	lines := make([]render.AdoptCandidate, 0, len(candidates))
	for _, c := range candidates {
		lines = append(lines, render.AdoptCandidate{
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
	// Under --json stderr carries nothing but an error, so the notice travels as the payload's
	// own containsPersonalData field instead of a line no agent reading stdout would see.
	if !lf.asJSON {
		if _, err := fmt.Fprintln(cmd.ErrOrStderr(), pasteNotice); err != nil {
			return err
		}
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
	data, err := render.MarshalAdoptList(lines)
	if err != nil {
		return err
	}
	_, err = fmt.Fprintf(cmd.OutOrStdout(), "%s\n", data)
	return err
}

// runAdopt writes the registry record for one named Worker.
func runAdopt(cmd *cobra.Command, d deps, rf *rootFlags, f adoptFlags) error {
	if f.worker == "" {
		return adoptNoWorkerError()
	}

	ctx, cancel := rf.deadline(commandContext(cmd))
	defer cancel()

	clients := buildClients(d)
	if !clients.HaveCF {
		return noCloudflareCredentialError()
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
		return adoptUnknownWorkerError(f.worker)
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
	_, err = fmt.Fprint(cmd.OutOrStdout(), adoptAddedMessage(rec.Name, rec.Domain))
	return err
}
