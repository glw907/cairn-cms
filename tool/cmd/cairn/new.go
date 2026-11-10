package main

import (
	"fmt"
	"slices"

	"github.com/glw907/cairn-cms/tool/v2/internal/setup"
	"github.com/spf13/cobra"
)

// newFlags holds cairn new's flags. A flag answers one setup question, so a run with no terminal
// needs no prompt; the mode flags (plan, apply, dryRun, resume) pick the agent lane's step.
type newFlags struct {
	name      string
	email     string
	posture   string
	account   string
	zone      string
	host      string
	siteTheme string

	plan   string
	apply  string
	resume string
	// fresh is --new: start a new site rather than continue an unfinished one.
	fresh  bool
	tag    string
	dryRun bool
	asJSON bool
}

// newInput is what a run takes from its flags once they validate: the answers, and the
// engine dist-tag the template is fetched from.
type newInput struct {
	answers setup.Answers
	tag     string
	// apply reports a run no browser shows the tab of, which is every agent-lane run that creates.
	apply bool
	// resume names the unfinished record a run continues.
	resume *setup.Resume
	// template is the template the terminal view fetched for its theme question; a new run
	// builds from it rather than fetch the tag again.
	template *setup.Template
}

// The mode flags, in the order a conflict names them.
var newModeFlags = []string{"plan", "apply", "dry-run", "resume"}

// newAnswerFlags are the flags that answer a question; a run that takes its answers from a
// plan or a record refuses them.
var newAnswerFlags = []string{"name", "email", "posture", "account", "zone", "host", "site-theme"}

// newResumeAnswerFlags are the answer flags --resume still takes: the choices a run can stop at.
var newResumeAnswerFlags = []string{"account", "zone"}

// newNewCmd builds cairn new, the setup command create-cairn-site launches.
func newNewCmd(d deps, rf *rootFlags) *cobra.Command {
	var f newFlags

	cmd := &cobra.Command{
		Use:     "new",
		Short:   shortNew,
		Example: exampleNew,
		GroupID: groupSite,
		Args:    cobra.NoArgs,
		RunE: func(cmd *cobra.Command, _ []string) error {
			return runNew(cmd, d, rf, f)
		},
	}
	fl := cmd.Flags()
	fl.StringVar(&f.name, "name", "", flagNewNameHelp)
	fl.StringVar(&f.email, "email", "", flagNewEmailHelp)
	fl.StringVar(&f.posture, "posture", "", flagNewPostureHelp)
	fl.StringVar(&f.account, "account", "", flagNewAccountHelp)
	fl.StringVar(&f.zone, "zone", "", flagNewZoneHelp)
	fl.StringVar(&f.host, "host", "", flagNewHostHelp)
	// The root's persistent --theme picks the terminal palette, so the site's theme takes
	// another name rather than shadow it.
	fl.StringVar(&f.siteTheme, "site-theme", "", flagNewSiteThemeHelp)
	fl.StringVar(&f.plan, "plan", "", flagNewPlanHelp)
	fl.StringVar(&f.apply, "apply", "", flagNewApplyHelp)
	fl.StringVar(&f.resume, "resume", "", flagNewResumeHelp)
	fl.BoolVar(&f.fresh, "new", false, flagNewNewHelp)
	fl.StringVar(&f.tag, "tag", "latest", flagNewTagHelp)
	fl.BoolVar(&f.dryRun, "dry-run", false, flagNewDryRunHelp)
	fl.BoolVar(&f.asJSON, "json", false, flagNewJSONHelp)
	cmd.AddCommand(newStatusCmd(d))
	return cmd
}

// newTag is the dist-tag the template is fetched at. An explicit --tag wins; otherwise npm's own
// tag setting from the environment, so the agent resolves the tag npm would; otherwise flag, the
// flag's default.
func newTag(c *cobra.Command, flag string, env func(string) string) string {
	if c.Flags().Changed("tag") {
		return flag
	}
	for _, name := range []string{"npm_config_tag", "NPM_CONFIG_TAG"} {
		if v := env(name); v != "" {
			return v
		}
	}
	return flag
}

// inSandbox reports whether the call runs inside Claude Code's sandbox, which sets SANDBOX_RUNTIME
// for every sandboxed command and for no excluded one (probed 2026-11-09, Claude Code 2.1.319).
//
// WATCH: Anthropic's sandbox runtime sets the marker itself on every command it wraps
// (github.com/anthropics/sandbox-runtime, src/sandbox/sandbox-utils.ts, generateProxyEnvVars), so it
// tracks actual wrapping, even with sandbox.enabled false (anthropics/claude-code#35986). Claude Code's
// documentation does not name it. If the runtime renames or drops it, the refusal quietly stops firing
// and a sandboxed run reaches the unreachable approval tab as before.
func inSandbox(env func(string) string) bool {
	return env("SANDBOX_RUNTIME") != ""
}

// validate refuses a flag combination before anything runs, naming the flags at fault.
func (f newFlags) validate(c *cobra.Command) error {
	set := func(name string) bool { return c.Flags().Changed(name) }

	var modes []string
	for _, m := range newModeFlags {
		if set(m) {
			modes = append(modes, "--"+m)
		}
	}
	if len(modes) > 1 {
		return newConflictError(modes[0], modes[1])
	}
	if f.fresh {
		for _, m := range []string{"resume", "apply"} {
			if set(m) {
				return newConflictError("--new", "--"+m)
			}
		}
	}
	if f.asJSON && !f.dryRun {
		return newRequiresError("--dry-run", "--json")
	}
	if len(modes) == 0 {
		return nil
	}
	if set("apply") || set("resume") {
		// A resume may answer a choice it stopped at; an apply takes them from the plan.
		for _, a := range newAnswerFlags {
			if set(a) && (!set("resume") || !slices.Contains(newResumeAnswerFlags, a)) {
				return newConflictError(modes[0], "--"+a)
			}
		}
		return nil
	}
	for _, r := range []struct{ flag, value string }{
		{"--name", f.name}, {"--email", f.email}, {"--posture", f.posture},
	} {
		if r.value == "" {
			return newRequiresError(r.flag, modes[0])
		}
	}
	if p := setup.Posture(f.posture); p != setup.Decline && p != setup.Invite {
		return newBadPostureError(f.posture)
	}
	return nil
}

// runNew validates the flags and dispatches to the agent lane's mode. With no mode flag, a run
// whose stdin and stdout are both a terminal gets the terminal view, which asks every question
// itself; any other run prints the agent guide, since a program with no terminal has nothing
// else to read.
func runNew(cmd *cobra.Command, d deps, rf *rootFlags, f newFlags) error {
	if err := f.validate(cmd); err != nil {
		return err
	}
	f.tag = newTag(cmd, f.tag, d.env)
	for _, m := range newModeFlags {
		if cmd.Flags().Changed(m) {
			if m != "dry-run" && inSandbox(d.env) {
				return newSandboxedError()
			}
			return runAgent(cmd, d, f, m)
		}
	}
	if d.interactive != nil && d.interactive() {
		if inSandbox(d.env) {
			return newSandboxedError()
		}
		for _, a := range newAnswerFlags {
			if cmd.Flags().Changed(a) {
				return newRequiresError("--plan", "--"+a)
			}
		}
		return runTerminal(cmd, d, rf, f)
	}
	_, err := fmt.Fprint(cmd.OutOrStdout(), agentPage)
	return err
}
