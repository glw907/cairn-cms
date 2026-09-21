package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"maps"
	"net/http"
	"os"
	"slices"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/providers"
	"github.com/glw907/cairn-cms/tool/internal/secrets"
	"github.com/glw907/cairn-cms/tool/internal/spine"
	"github.com/glw907/cairn-cms/tool/internal/store"
	"github.com/spf13/cobra"
)

// The three exit codes probe-token reports, the same monitoring-plugin convention a future
// aggregated health check runner will share. probe-token predates that runner and carries its
// own copy rather than waiting on it, since Geoff's own credential mint needs this command
// before the rest of health exists. WARNING (1) is the convention's fourth code, left unused
// here: no check this command runs reports a soft warning, only ok, critical, or unknown.
const (
	exitOK       = 0
	exitCritical = 2
	exitUnknown  = 3
)

// engineOwner and engineRepo name the engine repository every registry, beyond its own sites,
// must also grant read access to, for the Engine check's changelog read.
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
func buildProbeTokenCmd(envFn func(string) string, p secrets.Provider, rt http.RoundTripper, registryDir func() (string, error), exit func(int)) *cobra.Command {
	return &cobra.Command{
		Use:   "probe-token",
		Short: "Verify the three credential values against Cloudflare and GitHub",
		Long: "Verify the three credential values against Cloudflare and GitHub.\n\n" +
			"probe-token's whole output is identifiers (endpoints, statuses, and repository " +
			"names), so it is implicitly verbose the same way adopt --list is; there is no " +
			"--verbose flag.",
		Hidden:        true,
		Args:          cobra.NoArgs,
		SilenceUsage:  true,
		SilenceErrors: true,
		RunE: func(cmd *cobra.Command, _ []string) error {
			return runProbeToken(cmd, envFn, p, rt, registryDir, exit)
		},
	}
}

// verdict pairs one probed endpoint's outcome with the spine.State it contributes: 200 is OK, an
// unauthorized or forbidden credential is Failing, and anything else (a 404, a rate limit, a
// transport failure) is Unknown, since the endpoint simply could not be observed rather than
// proving the credential wrong. spine.ReasonToOutcome is the one place that classification lives;
// this command only carries its State through to an exit code.
type verdict struct {
	status int
	reason string
	state  spine.State
}

// okVerdict returns the verdict a 200 response reports; every endpoint this command probes
// treats 200 as the only success status.
func okVerdict() verdict {
	return verdict{status: http.StatusOK, reason: "ok", state: spine.OK}
}

// providerVerdict reports the verdict a Cloudflare or GitHub call's error carries, or okVerdict
// for a nil err, through the one providers.ProviderError contract both APIError and GitHubError
// implement. An error this package cannot classify reports "unreachable" at spine.Unknown.
func providerVerdict(err error) verdict {
	if err == nil {
		return okVerdict()
	}
	if pe, ok := errors.AsType[providers.ProviderError](err); ok {
		reason := pe.ClassifiedReason()
		return verdict{status: pe.HTTPStatus(), reason: reason.String(), state: spine.ReasonToOutcome(reason).State}
	}
	return verdict{reason: "unreachable", state: spine.Unknown}
}

// combineState returns whichever of a and b outranks the other by spine.State.Severity, so a
// later endpoint that merely could not be reached never silently downgrades an earlier rejected
// credential.
func combineState(a, b spine.State) spine.State {
	if b.Severity() > a.Severity() {
		return b
	}
	return a
}

// exitCodeFor maps the worst spine.State this run observed to one of the three exit codes:
// acknowledgements and a Degraded flag enter at report level, which this command has none of, so
// the mapping is the plain State order.
func exitCodeFor(s spine.State) int {
	switch s {
	case spine.Failing:
		return exitCritical
	case spine.Unknown:
		return exitUnknown
	default:
		return exitOK
	}
}

// markerArray and markerNotJSON label a recordedBody whose top-level shape is not a plain
// object: an empty marker means recordBody found an object.
const (
	markerArray   = "(array)"
	markerNotJSON = "(not JSON)"
)

// recordedBody captures a single 200 response body's shape by key names only, never its values,
// the shape a test's query mock is synthesized from. keys holds the top-level object's own key
// names, or an array's first element's key names when marker is markerArray. resultKeys holds
// the "result" field's own key names, when the top level is an object carrying one: a Cloudflare
// v4 envelope's own four keys (success, errors, result, result_info) carry none of its payload's
// shape, so probe-token prints this alongside the envelope's own keys.
type recordedBody struct {
	marker     string
	keys       []string
	resultKeys []string
}

// recordBody classifies data's top-level JSON shape into a recordedBody.
func recordBody(data []byte) recordedBody {
	var obj map[string]json.RawMessage
	if err := json.Unmarshal(data, &obj); err == nil {
		rb := recordedBody{keys: slices.Sorted(maps.Keys(obj))}
		if result, ok := obj["result"]; ok {
			var resultObj map[string]json.RawMessage
			if err := json.Unmarshal(result, &resultObj); err == nil {
				rb.resultKeys = slices.Sorted(maps.Keys(resultObj))
			}
		}
		return rb
	}
	var arr []json.RawMessage
	if err := json.Unmarshal(data, &arr); err == nil {
		rb := recordedBody{marker: markerArray}
		if len(arr) > 0 {
			var first map[string]json.RawMessage
			if err := json.Unmarshal(arr[0], &first); err == nil {
				rb.keys = slices.Sorted(maps.Keys(first))
			}
		}
		return rb
	}
	return recordedBody{marker: markerNotJSON}
}

// recordingRoundTripper wraps another RoundTripper, recording every 200 JSON response's
// top-level key shape against the request's method and path before handing the provider a fresh
// copy of the identical body. It keeps key names only: the response bytes are dropped as soon as
// recordBody has classified them, never written to a file or held past this run.
type recordingRoundTripper struct {
	next     http.RoundTripper
	recorded map[string]recordedBody
}

// newRecordingRoundTripper returns a recordingRoundTripper delegating every request to next.
func newRecordingRoundTripper(next http.RoundTripper) *recordingRoundTripper {
	return &recordingRoundTripper{next: next, recorded: map[string]recordedBody{}}
}

// RoundTrip implements http.RoundTripper.
func (rt *recordingRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	resp, err := rt.next.RoundTrip(req)
	if err != nil || resp == nil || resp.StatusCode != http.StatusOK || resp.Body == nil {
		return resp, err
	}
	data, readErr := io.ReadAll(resp.Body)
	_ = resp.Body.Close()
	if readErr != nil {
		return nil, readErr
	}
	rt.recorded[req.Method+" "+req.URL.Path] = recordBody(data)
	resp.Body = io.NopCloser(bytes.NewReader(data))
	return resp, nil
}

// lookup returns the recorded body shape for a method/path pair, or a zero recordedBody when
// nothing was recorded (a non-200 status, or a path this run never reached).
func (rt *recordingRoundTripper) lookup(method, path string) recordedBody {
	return rt.recorded[method+" "+path]
}

// printEndpoint writes one probed endpoint's line, and its recorded body shape on a 200, to out.
func printEndpoint(out io.Writer, endpoint string, v verdict, rb recordedBody) {
	_, _ = fmt.Fprintf(out, "  %-32s %3d  %s\n", endpoint, v.status, v.reason)
	if v.state != spine.OK {
		return
	}
	switch rb.marker {
	case markerNotJSON:
		_, _ = fmt.Fprintln(out, "      body:", markerNotJSON)
	case markerArray:
		_, _ = fmt.Fprintln(out, "      body:", markerArray)
		if len(rb.keys) > 0 {
			_, _ = fmt.Fprintf(out, "      keys (first element): %v\n", rb.keys)
		}
	default:
		if len(rb.keys) > 0 {
			_, _ = fmt.Fprintf(out, "      keys: %v\n", rb.keys)
		}
		if len(rb.resultKeys) > 0 {
			_, _ = fmt.Fprintf(out, "      result: %v\n", rb.resultKeys)
		}
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
func runProbeToken(cmd *cobra.Command, envFn func(string) string, p secrets.Provider, rt http.RoundTripper, registryDir func() (string, error), exit func(int)) error {
	ctx := cmd.Context()
	if ctx == nil {
		ctx = context.Background()
	}
	out := cmd.OutOrStdout()
	errOut := cmd.ErrOrStderr()
	_, _ = fmt.Fprintln(errOut, "probe-token: output is identifiers only; it is implicitly verbose")

	resolved, missing := loadEnv(envFn, p)
	printCredentialSources(out, resolved)

	rec := newRecordingRoundTripper(rt)

	worst := spine.OK
	raise := func(s spine.State) {
		worst = combineState(worst, s)
	}

	if isMissing(missing, "CAIRN_CF_ACCOUNT_ID") || isMissing(missing, "CAIRN_CF_READ_TOKEN") {
		_, _ = fmt.Fprintln(out, "Cloudflare: skipped, a credential is missing")
		raise(spine.Unknown)
	} else {
		raise(probeCloudflare(ctx, out, providers.NewCloudflare(resolved.accountID(), resolved.cfToken(), rec), resolved.accountID(), rec))
	}

	if isMissing(missing, "CAIRN_GH_READ_TOKEN") {
		_, _ = fmt.Fprintln(out, "GitHub: skipped, a credential is missing")
		raise(spine.Unknown)
	} else {
		raise(probeRegistryGitHub(ctx, out, errOut, providers.NewGitHub(resolved.ghToken(), rec), rec, registryDir))
	}

	exit(exitCodeFor(worst))
	return nil
}

// probeRegistryGitHub discovers the registry's sites and hands them to probeGitHub, reporting
// spine.Unknown when the registry cannot be located or read at all: the credential is unjudged
// either way, so the run reports that it could not observe rather than that the token is wrong.
func probeRegistryGitHub(ctx context.Context, out, errOut io.Writer, gh *providers.GitHub, rec *recordingRoundTripper, registryDir func() (string, error)) spine.State {
	dir, err := registryDir()
	if err != nil {
		_, _ = fmt.Fprintf(errOut, "probe-token: %v\n", err)
		return spine.Unknown
	}
	sites, err := discoverSites(dir)
	if err != nil {
		_, _ = fmt.Fprintf(errOut, "probe-token: %v\n", err)
		return spine.Unknown
	}
	return probeGitHub(ctx, out, errOut, gh, rec, sites)
}

// isMissing reports whether missing names the variable name.
func isMissing(missing []providers.Missing, name string) bool {
	return slices.ContainsFunc(missing, func(m providers.Missing) bool { return m.Var == name })
}

// printCredentialSources writes which provider answered each of the three variables loadEnv
// resolves, by name only, never the value.
func printCredentialSources(out io.Writer, e env) {
	_, _ = fmt.Fprintln(out, "Credentials:")
	for _, r := range e.sourceLines() {
		_, _ = fmt.Fprintf(out, "  %-20s %s\n", r.name, r.display)
	}
}

// probeCloudflare hits the account-scoped Cloudflare endpoints a health check uses with no
// per-site zone or worker to target, and returns the worst state among them. Zone-scoped
// endpoints (settings, DNS, Email Sending) need a zone id no registry record carries before the
// adopt command exists; tool/docs/credentials.md records those as verified separately.
func probeCloudflare(ctx context.Context, out io.Writer, cf *providers.Cloudflare, accountID string, rec *recordingRoundTripper) spine.State {
	_, _ = fmt.Fprintln(out, "Cloudflare:")
	worst := spine.OK

	run := func(endpoint, method, path string, call func() error) {
		v := providerVerdict(call())
		worst = combineState(worst, v.state)
		printEndpoint(out, endpoint, v, rec.lookup(method, path))
	}

	run("user/tokens/verify", http.MethodGet, "/client/v4/user/tokens/verify", func() error {
		_, err := cf.VerifyToken(ctx)
		return err
	})
	run("accounts/{id}/workers/scripts", http.MethodGet, "/client/v4/accounts/"+accountID+"/workers/scripts", func() error {
		_, err := cf.ListWorkers(ctx)
		return err
	})
	run("accounts/{id}/workers/domains", http.MethodGet, "/client/v4/accounts/"+accountID+"/workers/domains", func() error {
		_, err := cf.WorkerDomains(ctx)
		return err
	})
	run("accounts/{id}/workers/observability/telemetry/query", http.MethodPost, "/client/v4/accounts/"+accountID+"/workers/observability/telemetry/query", func() error {
		now := time.Now()
		_, err := cf.ObservabilityQuery(ctx, map[string]any{
			"queryId": "cairn-probe-token",
			"timeframe": map[string]any{
				"from": now.Add(-time.Hour).UnixMilli(),
				"to":   now.UnixMilli(),
			},
			"view":       "events",
			"limit":      1,
			"parameters": map[string]any{"datasets": []string{}},
		})
		return err
	})

	return worst
}

// probeGitHub hits, for every discovered site plus the engine repository, the endpoints the
// Deploy and Engine checks use (commits/main, contents/package.json, contents/CHANGELOG.md), and
// separately prints the repository-scope line every discovered repository (and the engine
// repository) contributes: whether the token can read it at all, and whether the repository is
// public or private. It warns on errOut when every probed repository is public, since a public
// repository proves nothing about a fine-grained token's own permissions. It returns the worst
// state among every check.
func probeGitHub(ctx context.Context, out, errOut io.Writer, gh *providers.GitHub, rec *recordingRoundTripper, sites []registrySite) spine.State {
	_, _ = fmt.Fprintln(out, "GitHub:")
	worst := spine.OK
	raise := func(s spine.State) {
		worst = combineState(worst, s)
	}

	var repos []repoLine

	// report prints one probed GET's line, labelled "<endpoint> (owner/repo)" and carrying
	// whatever shape the recorder captured for path, and folds its state into worst.
	report := func(endpoint, owner, repo, path string, err error) verdict {
		v := providerVerdict(err)
		raise(v.state)
		printEndpoint(out, fmt.Sprintf("%s (%s/%s)", endpoint, owner, repo), v, rec.lookup(http.MethodGet, path))
		return v
	}

	probeRepo := func(owner, repo string) repoLine {
		private, ownErr := gh.RepoOwnership(ctx, owner, repo)
		v := report("repos", owner, repo, fmt.Sprintf("/repos/%s/%s", owner, repo), ownErr)
		return repoLine{label: owner + "/" + repo, v: v, private: private, known: ownErr == nil}
	}

	for _, s := range sites {
		_, shaErr := gh.HeadSHA(ctx, s.owner, s.repo, "main")
		report("commits/main", s.owner, s.repo, fmt.Sprintf("/repos/%s/%s/commits/main", s.owner, s.repo), shaErr)

		_, contentErr := gh.FileAtRef(ctx, s.owner, s.repo, "package.json", "main")
		report("contents/package.json", s.owner, s.repo, fmt.Sprintf("/repos/%s/%s/contents/package.json", s.owner, s.repo), contentErr)

		repos = append(repos, probeRepo(s.owner, s.repo))
	}

	_, engineErr := gh.FileAtRef(ctx, engineOwner, engineRepo, "CHANGELOG.md", "main")
	report("contents/CHANGELOG.md", engineOwner, engineRepo, fmt.Sprintf("/repos/%s/%s/contents/CHANGELOG.md", engineOwner, engineRepo), engineErr)

	repos = append(repos, probeRepo(engineOwner, engineRepo))

	raise(printRepoLines(out, errOut, repos))
	return worst
}

// repoLine is one repository's scope verdict, as printRepoLines renders it. known reports whether
// this run confirmed the repository's visibility at all, which is what separates a
// confirmed-public repository from one the token could not read.
type repoLine struct {
	label   string
	v       verdict
	private bool
	known   bool
}

// printRepoLines writes the Repositories section and returns the worst state among its lines. It
// warns on errOut when every line is a confirmed-public repository, the condition that leaves a
// fine-grained token's own scope unconfirmed: a public repository answers a contents read with no
// permissions at all, so seeing only public repositories proves nothing about what the token
// itself grants. A repository whose visibility this run could not confirm counts against that
// claim the same way a private one does, since either leaves at least one line that is not
// confirmed-public.
func printRepoLines(out, errOut io.Writer, repos []repoLine) spine.State {
	_, _ = fmt.Fprintln(out, "Repositories:")
	worst := spine.OK
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
		worst = combineState(worst, r.v.state)
	}
	if allPublic {
		_, _ = fmt.Fprintln(errOut, "probe-token: every probed repository is public; the GitHub token's scope is unconfirmed")
	}
	return worst
}
