package main

import (
	"context"
	"errors"
	"fmt"
	"io"

	"github.com/glw907/cairn-cms/tool/internal/health"
	"github.com/glw907/cairn-cms/tool/internal/providers"
	"github.com/glw907/cairn-cms/tool/internal/record"
	"github.com/glw907/cairn-cms/tool/internal/render"
	"github.com/glw907/cairn-cms/tool/internal/spine"
	"github.com/spf13/cobra"
)

// newAuthCheckCmd builds the visible cairn auth check command over d, so a test can supply a
// fake environment, a fake keyring, a fake registry directory, a routed RoundTripper, and a
// captured exit without touching a real credential, disk location, or network call.
func newAuthCheckCmd(d deps) *cobra.Command {
	return newAuthCheckCommand(d, "check [<site>]", false)
}

// newAuthProbeCmd builds cairn auth probe, a Hidden alias of cairn auth check that keeps its
// earlier name reachable for a script that already types it. Both build the identical command
// over the same RunE; only Use and Hidden differ.
func newAuthProbeCmd(d deps) *cobra.Command {
	return newAuthCheckCommand(d, "probe [<site>]", true)
}

// newAuthCheckCommand builds the command both newAuthCheckCmd and newAuthProbeCmd return.
func newAuthCheckCommand(d deps, use string, hidden bool) *cobra.Command {
	var asJSON bool
	cmd := &cobra.Command{
		Use:               use,
		Short:             shortAuthCheck,
		Long:              longAuthCheck,
		Example:           exampleAuthCheck,
		Hidden:            hidden,
		Args:              cobra.MaximumNArgs(1),
		ValidArgsFunction: completeSiteIDs(d),
		RunE: func(cmd *cobra.Command, args []string) error {
			return runAuthCheck(cmd, d, args, asJSON)
		},
	}
	cmd.Flags().BoolVar(&asJSON, "json", false, flagAuthCheckJSONHelp)
	return cmd
}

// checkSite is the registered site cairn auth check probes the site-scoped permissions against,
// present only when the operator named a site.
type checkSite struct {
	id          string
	zoneID      string
	owner, repo string
	// branch is the repository's own default branch, the ref the Contents row reads a file at.
	// A repository whose default branch is not main answers 404 for any other ref, which reads
	// as a missing permission rather than as the wrong ref.
	branch string
}

// checkRow is one permissionTable row's settled outcome: the CheckVerdict spine.ExitCode folds,
// and the display text printCheckRow prints beside it.
type checkRow struct {
	permission
	verdict spine.CheckVerdict
	display string
}

// runAuthCheck is newAuthCheckCommand's RunE body: it resolves the three credentials and, when
// the operator named one, the site those credentials are checked against, settles one row per
// permissionTable entry, writes them as text or, under asJSON, as render.MarshalAuthCheck's
// payload, and exits on the worst row's verdict.
func runAuthCheck(cmd *cobra.Command, d deps, args []string, asJSON bool) error {
	ctx := commandContext(cmd)
	out := cmd.OutOrStdout()

	var site *checkSite
	if len(args) == 1 {
		st, err := openRegistry(d)
		if err != nil {
			return err
		}
		rec, err := st.Load(args[0])
		if err != nil {
			return unknownSiteError(args[0])
		}
		site = siteFromRecord(args[0], rec)
	}

	resolved, missing := loadEnv(d.env, d.secretProviders()...)
	if !asJSON {
		printCredentialSources(out, resolved)
	}

	cfUnset := unsetAmong(missing, varCFAccountID, varCFReadToken)
	ghUnset := unsetAmong(missing, varGHReadToken)
	if !asJSON {
		if len(cfUnset) > 0 {
			_, _ = fmt.Fprintln(out, authCheckCFSkippedNotice(cfUnset))
		}
		if len(ghUnset) > 0 {
			_, _ = fmt.Fprintln(out, authCheckGHSkippedNotice(ghUnset))
		}
	}

	var cf *providers.Cloudflare
	if len(cfUnset) == 0 {
		cf = providers.NewCloudflare(resolved.accountID(), resolved.cfToken(), d.transport)
	}
	var gh *providers.GitHub
	if len(ghUnset) == 0 {
		gh = providers.NewGitHub(resolved.ghToken(), d.transport)
	}

	if !asJSON {
		_, _ = fmt.Fprintln(out, authCheckPermissionsHeading)
	}
	verdicts := make(spine.SiteVerdicts, 0, len(permissionTable))
	rows := make([]render.AuthCheckPermission, 0, len(permissionTable))
	for _, p := range permissionTable {
		row := checkPermission(ctx, p, cf, gh, cfUnset, ghUnset, site)
		if asJSON {
			rows = append(rows, render.AuthCheckPermission{Label: row.Label, Credential: row.Credential, State: checkRowWord(row), Reason: row.display})
		} else {
			printCheckRow(out, row)
		}
		verdicts = append(verdicts, row.verdict)
	}

	verdict := spine.ExitCode([]spine.SiteVerdicts{verdicts}, nil, 0)
	if asJSON {
		siteID := ""
		if site != nil {
			siteID = site.id
		}
		data, err := render.MarshalAuthCheck(siteID, rows, verdict)
		if err != nil {
			return err
		}
		if _, err := fmt.Fprintf(out, "%s\n", data); err != nil {
			return err
		}
	}
	return codedExit(verdict)
}

// siteFromRecord narrows a loaded registry record to the identifiers cairn auth check's
// site-scoped rows read.
func siteFromRecord(id string, rec record.Record) *checkSite {
	return &checkSite{
		id:     id,
		zoneID: rec.Cloudflare.ZoneID,
		owner:  rec.GitHub.Repo.Owner,
		repo:   rec.GitHub.Repo.Repo,
		branch: health.DefaultBranch(rec),
	}
}

// checkPermission settles one permissionTable row: skipped for a missing credential or an
// unnamed site on a site-scoped row, and probed otherwise. cfUnset and ghUnset carry the
// variables of each provider the run could not find, so a skipped row names what is actually
// missing rather than its provider's headline variable.
func checkPermission(ctx context.Context, p permission, cf *providers.Cloudflare, gh *providers.GitHub, cfUnset, ghUnset []string, site *checkSite) checkRow {
	unset := ghUnset
	if p.Credential == varCFReadToken {
		unset = cfUnset
	}
	if len(unset) > 0 {
		return skipRow(p, authCheckCredMissingReason(unset))
	}
	if p.Scope == scopeSite && site == nil {
		return skipRow(p, authCheckSiteRequiredReason)
	}

	var call func(context.Context) error
	if p.Credential == varCFReadToken {
		zoneID := ""
		if site != nil {
			zoneID = site.zoneID
		}
		call = cloudflareProbe(p.Label, cf, zoneID)
	} else {
		owner, repo, branch := "", "", ""
		if site != nil {
			owner, repo, branch = site.owner, site.repo, site.branch
		}
		call = githubProbe(p.Label, gh, owner, repo, branch)
	}
	return probeRow(p, call(ctx))
}

// skipRow builds a checkRow for a permission this run did not attempt, folding to spine.Unknown
// with spine.ReasonCredMissing so spine.CheckVerdict.Verdict reports WARNING rather than
// UNKNOWN: an operator who has not set a credential, or who ran with no site to confirm a
// site-scoped permission against, disclosed a gap rather than hit a measurement failure.
func skipRow(p permission, display string) checkRow {
	return checkRow{permission: p, verdict: spine.CheckVerdict{ID: p.Label, State: spine.Unknown, Reason: spine.ReasonCredMissing}, display: display}
}

// probeRow classifies err through the same provider-error path health checks use, and builds the
// row's own display text from the classified reason.
func probeRow(p permission, err error) checkRow {
	if err == nil {
		return checkRow{permission: p, verdict: spine.CheckVerdict{ID: p.Label, State: spine.OK}}
	}
	if pe, ok := errors.AsType[providers.ProviderError](err); ok {
		reason := pe.ClassifiedReason()
		outcome := spine.ReasonToOutcome(reason)
		return checkRow{permission: p, verdict: spine.CheckVerdict{ID: p.Label, State: outcome.State, Reason: outcome.Reason}, display: reason.String()}
	}
	return checkRow{permission: p, verdict: spine.CheckVerdict{ID: p.Label, State: spine.Unknown, Reason: spine.ReasonNotObservable}, display: "unreachable"}
}

// checkRowWord names row's own wire word, through the same function a health check's row goes
// through, so a permission the run did not attempt and a check the run did not attempt read the
// same to an operator reading both. A permission row is never held: a hold is a decision about a
// site's own failing check, which is not a thing to say about a token's permissions.
func checkRowWord(row checkRow) string {
	return spine.StateWord(row.verdict.State, row.verdict.Reason, row.verdict.Acknowledged)
}

// printCheckRow writes row's own line: the permission label, the credential it belongs to, the
// wire word its verdict carries, and the display text for anything beyond a pass.
func printCheckRow(out io.Writer, row checkRow) {
	word := checkRowWord(row)
	if row.display == "" {
		_, _ = fmt.Fprintf(out, "  %-32s %-20s %s\n", row.Label, row.Credential, word)
		return
	}
	_, _ = fmt.Fprintf(out, "  %-32s %-20s %s, %s\n", row.Label, row.Credential, word, row.display)
}

// unsetAmong returns the names missing carries, in the order the caller asked for them, so a
// notice naming two unset variables reads in the order the credential table declares them.
func unsetAmong(missing []providers.Missing, names ...string) []string {
	var unset []string
	for _, name := range names {
		if isMissing(missing, name) {
			unset = append(unset, name)
		}
	}
	return unset
}

// isMissing reports whether missing names the variable name.
func isMissing(missing []providers.Missing, name string) bool {
	for _, m := range missing {
		if m.Var == name {
			return true
		}
	}
	return false
}

// printCredentialSources writes which provider answered each of the three variables loadEnv
// resolves, by name only, never the value.
func printCredentialSources(out io.Writer, e env) {
	_, _ = fmt.Fprintln(out, authCheckCredentialsHeading)
	for _, r := range e.sourceLines() {
		_, _ = fmt.Fprintf(out, "  %-20s %s\n", r.name, r.display)
	}
}
