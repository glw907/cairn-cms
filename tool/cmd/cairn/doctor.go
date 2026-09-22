package main

import (
	"fmt"

	"github.com/glw907/cairn-cms/tool/internal/doctor"
	"github.com/glw907/cairn-cms/tool/internal/spine"
	"github.com/spf13/cobra"
)

// varPublicOrigin names the site's own PUBLIC_ORIGIN variable, resolvePublicOrigin's fallback
// once the wrangler config carries none. It is not a cairn credential (env.go's own
// credentialVars), so it is read straight through deps.env rather than loadEnv's provider chain.
const varPublicOrigin = "PUBLIC_ORIGIN"

// newDoctorCmd builds cairn doctor: a credential-less directory preflight over a cairn-cms
// site's checked-in configuration, distinct from cairn health's live, adopted-site checks.
func newDoctorCmd(d deps, rf *rootFlags) *cobra.Command {
	cmd := &cobra.Command{
		Use:     "doctor [<dir>]",
		Short:   shortDoctor,
		Long:    longDoctor,
		Example: exampleDoctor,
		GroupID: groupSite,
		Args: func(_ *cobra.Command, args []string) error {
			if len(args) > 1 {
				return doctorTooManyArgsError()
			}
			return nil
		},
		// The argument is a directory, never a registered site id, so this never calls
		// completeSiteIDs.
		ValidArgsFunction: func(_ *cobra.Command, args []string, _ string) ([]string, cobra.ShellCompDirective) {
			if len(args) > 0 {
				return nil, cobra.ShellCompDirectiveNoFileComp
			}
			return nil, cobra.ShellCompDirectiveFilterDirs
		},
		RunE: func(cmd *cobra.Command, args []string) error {
			return runDoctor(cmd, d, rf, args)
		},
	}

	return cmd
}

// runDoctor resolves the target directory, bails out with one line when it does not look like a
// cairn site, and otherwise runs every check and exits on the run's verdict.
func runDoctor(cmd *cobra.Command, d deps, rf *rootFlags, args []string) error {
	dir := "."
	if len(args) == 1 {
		dir = args[0]
	}

	snap, err := doctor.NewSnapshot(dir)
	if err != nil {
		return err
	}

	if !doctor.IsCairnSite(snap.Dir) {
		return writeOutsideCairnSite(cmd, d, rf, dir)
	}

	ctx, cancel := rf.deadline(commandContext(cmd))
	defer cancel()

	snap.PublicOrigin = resolvePublicOrigin(d, snap)
	snap.Robots = doctor.FetchRobots(ctx, snap.PublicOrigin)
	snap.At = d.now()

	checked := doctor.Run(snap)
	verdict := spine.ExitCode([]spine.SiteVerdicts{doctor.Verdicts(doctor.Results(checked))}, nil, 0)

	if !quietSuppressesFrame(rf.quiet, verdict) {
		if _, err := fmt.Fprintln(cmd.OutOrStdout(), doctor.Format(checked)); err != nil {
			return err
		}
	}

	d.exit(int(verdict))
	return nil
}

// writeOutsideCairnSite prints the one line a directory that is not a cairn site earns, instead
// of a wall of failures no check ever asked its own question, and exits on the resulting
// UNKNOWN verdict. --quiet does not suppress it: the run is not OK, and quietSuppressesFrame's
// own rule (health.go's own quietSuppressesFrame) only silences a clean run.
func writeOutsideCairnSite(cmd *cobra.Command, d deps, rf *rootFlags, dir string) error {
	verdict := spine.ExitCode([]spine.SiteVerdicts{doctor.Verdicts(nil)}, nil, 0)
	if !quietSuppressesFrame(rf.quiet, verdict) {
		if _, err := fmt.Fprintln(cmd.OutOrStdout(), notACairnSiteLine(dir)); err != nil {
			return err
		}
	}
	d.exit(int(verdict))
	return nil
}

// resolvePublicOrigin resolves a directory run's public origin the way ai.posture-effective and
// config.public-origin both expect: the wrangler config's own vars.PUBLIC_ORIGIN first, then the
// process environment, the same precedence check-posture.ts:52 states. A wrangler.jsonc that
// fails to parse resolves no origin here; the read that matters for the operator, config.bindings
// and its siblings, reports its own unchecked result independently the next time a check reads
// the same file.
func resolvePublicOrigin(d deps, s doctor.Snapshot) doctor.PublicOrigin {
	if facts, found, err := doctor.ReadWranglerConfig(s); err == nil && found && facts.HasPublicOrigin {
		return doctor.PublicOrigin{Value: facts.PublicOrigin, Source: doctor.OriginFromVars}
	}
	if origin := d.env(varPublicOrigin); origin != "" {
		return doctor.PublicOrigin{Value: origin, Source: doctor.OriginFromEnv}
	}
	return doctor.PublicOrigin{}
}
