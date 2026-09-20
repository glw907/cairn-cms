package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"slices"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/providers"
	"github.com/glw907/cairn-cms/tool/internal/secrets"
	"github.com/glw907/cairn-cms/tool/internal/store"
	"github.com/spf13/cobra"
)

// The four exit codes probe-token reports, the same monitoring-plugin convention Task 21 wires
// as the shared chokepoint for every other command. probe-token predates that chokepoint and
// carries its own copy rather than waiting on it, since Geoff's own credential mint needs this
// command before the rest of health exists.
const (
	exitOK       = 0
	exitCritical = 2
	exitUnknown  = 3
)

// engineOwner and engineRepo name the engine repository every registry, beyond its own sites,
// must also grant read access to, for the Engine check's changelog read (Task 16).
const (
	engineOwner = "glw907"
	engineRepo  = "cairn-cms"
)

// newProbeTokenCmd builds the hidden cairn probe-token subcommand.
func newProbeTokenCmd() *cobra.Command {
	return buildProbeTokenCmd(osEnviron, secrets.NewKeyring(), http.DefaultTransport, defaultRegistryDir, os.Exit)
}

// defaultRegistryDir resolves the registry directory the way every other command does, through
// store.Dir's own precedence.
func defaultRegistryDir() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("probe-token: resolve home directory: %w", err)
	}
	dir, _, err := store.Dir(osEnviron, os.UserConfigDir, home)
	return dir, err
}

// buildProbeTokenCmd builds cairn probe-token over injected dependencies, so a test can supply a
// fake environment, a fake keyring, a fake registry directory, a routed RoundTripper, and a
// captured exit function without touching a real credential, disk location, or network call.
func buildProbeTokenCmd(env func(string) string, p secrets.Provider, rt http.RoundTripper, registryDir func() (string, error), exit func(int)) *cobra.Command {
	return &cobra.Command{
		Use:           "probe-token",
		Short:         "Verify the three credential values against Cloudflare and GitHub",
		Hidden:        true,
		Args:          cobra.NoArgs,
		SilenceUsage:  true,
		SilenceErrors: true,
		RunE: func(cmd *cobra.Command, _ []string) error {
			return runProbeToken(cmd, env, p, rt, registryDir, exit)
		},
	}
}

// verdict pairs one probed endpoint's outcome with the exit level it contributes: 200 is
// exitOK, an unauthorized or forbidden credential is exitCritical, and anything else (a 404, a
// rate limit, a transport failure) is exitUnknown, since the endpoint simply could not be
// observed rather than proving the credential wrong.
type verdict struct {
	status int
	reason string
	level  int
}

// okVerdict returns the verdict a 200 response reports; every endpoint this command probes
// treats 200 as the only success status.
func okVerdict() verdict {
	return verdict{status: http.StatusOK, reason: "ok", level: exitOK}
}

func cloudflareVerdict(err error) verdict {
	if apiErr, ok := errors.AsType[*providers.APIError](err); ok {
		return verdict{status: apiErr.Status, reason: apiErr.Reason.String(), level: reasonLevel(apiErr.Reason)}
	}
	return verdict{reason: "unreachable", level: exitUnknown}
}

func githubVerdict(err error) verdict {
	if ghErr, ok := errors.AsType[*providers.GitHubError](err); ok {
		return verdict{status: ghErr.Status, reason: ghErr.Reason.String(), level: reasonLevel(ghErr.Reason)}
	}
	return verdict{reason: "unreachable", level: exitUnknown}
}

// precedenceRank orders the three exit levels this command reports by severity: CRITICAL outranks
// UNKNOWN outranks OK. exitUnknown's numeric value (3) is larger than exitCritical's (2), so
// combineLevel ranks by this table rather than by the raw exit code, or a later endpoint that
// merely could not be reached would silently downgrade an earlier rejected credential.
var precedenceRank = map[int]int{exitOK: 0, exitUnknown: 1, exitCritical: 2}

// combineLevel returns whichever of a and b outranks the other by precedenceRank.
func combineLevel(a, b int) int {
	if precedenceRank[b] > precedenceRank[a] {
		return b
	}
	return a
}

// reasonLevel maps a classified provider Reason to the exit level a rejected credential
// (unauthorized or forbidden) reports at CRITICAL, versus every other reason (not found,
// rate limited, an unclassified failure), which reports at UNKNOWN: the endpoint answered, but
// not with a verdict on the credential itself.
func reasonLevel(r providers.Reason) int {
	switch r {
	case providers.ReasonUnauthorized, providers.ReasonForbidden:
		return exitCritical
	default:
		return exitUnknown
	}
}

// objectKeys reports the sorted top-level key set of data, decoded as a JSON object, or nil when
// data does not decode as one (an array, a bare string, or invalid JSON). probe-token prints
// these names, never the values, as the shape a later fixture is synthesized from.
func objectKeys(data []byte) []string {
	var m map[string]json.RawMessage
	if err := json.Unmarshal(data, &m); err != nil {
		return nil
	}
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	slices.Sort(keys)
	return keys
}

// printEndpoint writes one probed endpoint's line, and its top-level key set on a 200, to out.
func printEndpoint(out io.Writer, endpoint string, v verdict, keys []string) {
	_, _ = fmt.Fprintf(out, "  %-32s %3d  %s\n", endpoint, v.status, v.reason)
	if v.level == exitOK && len(keys) > 0 {
		_, _ = fmt.Fprintf(out, "      keys: %v\n", keys)
	}
}

// registrySite names one repository probe-token discovered from the registry.
type registrySite struct {
	id, owner, repo string
}

// discoverSites reads every record in dir's registry and returns the sites whose GitHub
// repository is known, in list order. A record the store cannot parse is skipped; a record with
// no adopted repository yet carries nothing this probe can check and is skipped too.
func discoverSites(dir string) ([]registrySite, error) {
	s, err := store.Open(dir)
	if err != nil {
		return nil, fmt.Errorf("probe-token: open registry: %w", err)
	}
	entries, errs := s.List()
	if len(errs) > 0 {
		return nil, fmt.Errorf("probe-token: list registry: %w", errors.Join(errs...))
	}
	var sites []registrySite
	for _, e := range entries {
		owner, repo := e.Record.GitHub.Repo.Owner, e.Record.GitHub.Repo.Repo
		if owner == "" || repo == "" {
			continue
		}
		sites = append(sites, registrySite{id: e.ID, owner: owner, repo: repo})
	}
	return sites, nil
}

// runProbeToken is buildProbeTokenCmd's RunE body, split out so it reads as plain sequential
// steps rather than a closure body.
func runProbeToken(cmd *cobra.Command, env func(string) string, p secrets.Provider, rt http.RoundTripper, registryDir func() (string, error), exit func(int)) error {
	out := cmd.OutOrStdout()
	errOut := cmd.ErrOrStderr()

	resolved, missing := loadEnv(env, p)
	printCredentialSources(out, resolved)

	worst := exitOK
	raise := func(level int) {
		worst = combineLevel(worst, level)
	}

	if isMissing(missing, "CAIRN_CF_ACCOUNT_ID") || isMissing(missing, "CAIRN_CF_READ_TOKEN") {
		_, _ = fmt.Fprintln(out, "Cloudflare: skipped, a credential is missing")
		raise(exitUnknown)
	} else {
		raise(probeCloudflare(out, providers.NewCloudflare(resolved.AccountID, resolved.CFToken, rt)))
	}

	if isMissing(missing, "CAIRN_GH_READ_TOKEN") {
		_, _ = fmt.Fprintln(out, "GitHub: skipped, a credential is missing")
		raise(exitUnknown)
	} else {
		dir, err := registryDir()
		if err != nil {
			return err
		}
		sites, err := discoverSites(dir)
		if err != nil {
			return err
		}
		raise(probeGitHub(out, errOut, providers.NewGitHub(resolved.GHToken, rt), sites))
	}

	exit(worst)
	return nil
}

// isMissing reports whether missing names var.
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
func printCredentialSources(out io.Writer, e Env) {
	_, _ = fmt.Fprintln(out, "Credentials:")
	for _, r := range e.resolutions() {
		from := r.from
		if from == "" {
			from = "not set"
		}
		_, _ = fmt.Fprintf(out, "  %-20s %s\n", r.name, from)
	}
}

// probeCloudflare hits the account-scoped Cloudflare endpoints a Task 12 onward health check
// uses with no per-site zone or worker to target, and returns the worst exit level among them.
// Zone-scoped endpoints (settings, DNS, Email Sending) need a zone id no registry record carries
// before Task 18's adopt exists; tool/docs/credentials.md records those as verified separately.
func probeCloudflare(out io.Writer, cf *providers.Cloudflare) int {
	_, _ = fmt.Fprintln(out, "Cloudflare:")
	worst := exitOK

	run := func(endpoint string, call func() ([]byte, error)) {
		data, err := call()
		var v verdict
		if err != nil {
			v = cloudflareVerdict(err)
		} else {
			v = okVerdict()
		}
		worst = combineLevel(worst, v.level)
		printEndpoint(out, endpoint, v, objectKeys(data))
	}

	run("user/tokens/verify", func() ([]byte, error) {
		id, err := cf.VerifyToken()
		if err != nil {
			return nil, err
		}
		return json.Marshal(map[string]string{"id": id})
	})
	run("accounts/{id}/workers/scripts", func() ([]byte, error) {
		workers, err := cf.ListWorkers()
		if err != nil {
			return nil, err
		}
		return json.Marshal(workers)
	})
	run("accounts/{id}/workers/domains", func() ([]byte, error) {
		domains, err := cf.WorkerDomains()
		if err != nil {
			return nil, err
		}
		return json.Marshal(domains)
	})
	run("accounts/{id}/workers/observability/telemetry/query", func() ([]byte, error) {
		now := time.Now()
		result, err := cf.ObservabilityQuery(map[string]any{
			"queryId": "cairn-probe-token",
			"timeframe": map[string]any{
				"from": now.Add(-time.Hour).UnixMilli(),
				"to":   now.UnixMilli(),
			},
			"view":       "events",
			"limit":      1,
			"parameters": map[string]any{"datasets": []string{}},
		})
		if err != nil {
			return nil, err
		}
		return json.Marshal(result)
	})

	return worst
}

// probeGitHub hits, for every discovered site plus the engine repository, the endpoints the
// Deploy and Engine checks use (commits/main, contents/package.json, contents/CHANGELOG.md), and
// separately prints the repository-scope line every discovered repository (and the engine
// repository) contributes: whether the token can read it at all, and whether the repository is
// public or private. It warns on errOut when every probed repository is public, since a public
// repository proves nothing about a fine-grained token's own permissions. It returns the worst
// exit level among every check.
func probeGitHub(out, errOut io.Writer, gh *providers.GitHub, sites []registrySite) int {
	_, _ = fmt.Fprintln(out, "GitHub:")
	worst := exitOK
	raise := func(level int) {
		worst = combineLevel(worst, level)
	}

	type repoLine struct {
		label   string
		v       verdict
		private bool
		known   bool
	}
	var repos []repoLine

	for _, s := range sites {
		sha, shaErr := gh.HeadSHA(s.owner, s.repo, "main")
		shaVerdict := okVerdict()
		if shaErr != nil {
			shaVerdict = githubVerdict(shaErr)
		}
		raise(shaVerdict.level)
		printEndpoint(out, fmt.Sprintf("commits/main (%s/%s)", s.owner, s.repo), shaVerdict, objectKeys([]byte(fmt.Sprintf(`{"sha":%q}`, sha))))

		content, contentErr := gh.FileAtRef(s.owner, s.repo, "package.json", "main")
		contentVerdict := okVerdict()
		if contentErr != nil {
			contentVerdict = githubVerdict(contentErr)
		}
		raise(contentVerdict.level)
		printEndpoint(out, fmt.Sprintf("contents/package.json (%s/%s)", s.owner, s.repo), contentVerdict, objectKeys(content))

		private, _, ownErr := gh.RepoOwnership(s.owner, s.repo)
		repos = append(repos, repoLine{label: fmt.Sprintf("%s/%s", s.owner, s.repo), v: contentVerdict, private: private, known: ownErr == nil})
	}

	content, contentErr := gh.FileAtRef(engineOwner, engineRepo, "CHANGELOG.md", "main")
	engineVerdict := okVerdict()
	if contentErr != nil {
		engineVerdict = githubVerdict(contentErr)
	}
	raise(engineVerdict.level)
	printEndpoint(out, fmt.Sprintf("contents/CHANGELOG.md (%s/%s)", engineOwner, engineRepo), engineVerdict, objectKeys(content))

	enginePrivate, _, engineOwnErr := gh.RepoOwnership(engineOwner, engineRepo)
	repos = append(repos, repoLine{label: fmt.Sprintf("%s/%s", engineOwner, engineRepo), v: engineVerdict, private: enginePrivate, known: engineOwnErr == nil})

	_, _ = fmt.Fprintln(out, "Repositories:")
	// allPublic tracks whether every repository this run confirmed is public, the condition
	// that leaves a fine-grained token's own scope unconfirmed: a public repository answers a
	// contents read with no permissions at all, so seeing only public repositories proves
	// nothing about what the token itself grants. A repository whose ownership this run could
	// not confirm counts against the claim the same way a private one does, since either
	// leaves at least one line that is not confirmed-public.
	allPublic := true
	for _, r := range repos {
		visibility := "unknown"
		switch {
		case r.known && r.private:
			visibility = "private"
		case r.known:
			visibility = "public"
		}
		if visibility != "public" {
			allPublic = false
		}
		_, _ = fmt.Fprintf(out, "  %-28s %3d  %-9s %s\n", r.label, r.v.status, r.v.reason, visibility)
		raise(r.v.level)
	}
	if allPublic {
		_, _ = fmt.Fprintln(errOut, "probe-token: every probed repository is public; the GitHub token's scope is unconfirmed")
	}

	return worst
}
