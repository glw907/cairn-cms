package main

import (
	"context"
	"fmt"
	"io"
	"net/http"

	"github.com/glw907/cairn-cms/tool/internal/providers"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// probeRegistryGitHub discovers the registry's sites and hands them to probeGitHub, reporting
// spine.Unknown when the registry cannot be located or read at all: the credential is unjudged
// either way, so the run reports that it could not observe rather than that the token is wrong.
func probeRegistryGitHub(ctx context.Context, out, errOut io.Writer, gh *providers.GitHub, rec *recordingRoundTripper, registryDir func() (string, error)) spine.State {
	dir, err := registryDir()
	if err != nil {
		_, _ = fmt.Fprintf(errOut, "auth probe: %v\n", err)
		return spine.Unknown
	}
	sites, err := discoverSites(dir)
	if err != nil {
		_, _ = fmt.Fprintf(errOut, "auth probe: %v\n", err)
		return spine.Unknown
	}
	return probeGitHub(ctx, out, errOut, gh, rec, sites)
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
		worst = spine.CombineState(worst, s)
	}

	var repos []repoLine

	// probe prints one probed GET's line, labelled "<endpoint> (owner/repo)" and carrying
	// whatever shape the recorder captured for path, and returns its verdict without folding it.
	probe := func(endpoint, owner, repo, path string, err error) verdict {
		v := providerVerdict(err)
		printEndpoint(out, fmt.Sprintf("%s (%s/%s)", endpoint, owner, repo), v, rec.lookup(http.MethodGet, path))
		return v
	}

	// report is probe for a line no later section folds again, so it folds the verdict here.
	report := func(endpoint, owner, repo, path string, err error) {
		raise(probe(endpoint, owner, repo, path, err).state)
	}

	// probeRepo reads one repository's visibility and prints its endpoint line, leaving the fold
	// to printRepoLines: a repository's verdict reaches worst through the Repositories section,
	// and folding it here as well would count the same verdict twice.
	probeRepo := func(owner, repo string) repoLine {
		private, ownErr := gh.RepoOwnership(ctx, owner, repo)
		v := probe("repos", owner, repo, fmt.Sprintf("/repos/%s/%s", owner, repo), ownErr)
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
		worst = spine.CombineState(worst, r.v.state)
	}
	if allPublic {
		_, _ = fmt.Fprintln(errOut, "auth probe: every probed repository is public; the GitHub token's scope is unconfirmed")
	}
	return worst
}
