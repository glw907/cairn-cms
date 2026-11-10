package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"strings"

	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
	"github.com/glw907/cairn-cms/tool/v2/internal/secrets"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup/childenv"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup/scaffold"
)

// gitConfigPairs supplies the config pairs setup's git calls carry. It is nil in a release
// build; the end-to-end build's hook (new_e2e_hook.go) sets it.
var gitConfigPairs func(env map[string]string) []childenv.Pair

// extraGitConfig returns the hook's pairs for env, or none when no hook is set.
func extraGitConfig(env map[string]string) []childenv.Pair {
	if gitConfigPairs == nil {
		return nil
	}
	return gitConfigPairs(env)
}

// productionConfig builds the setup.Config a real run uses, over d's transport and registry. The
// view and the emitter are parameters: the terminal view and the agent view each bring their own,
// and nothing here prints or prompts. Register hands each credential to the process's output
// scrub the moment the runner receives it.
func productionConfig(d deps, in newInput, view setup.View, emit func(setup.Event)) (setup.Config, error) {
	token, err := setupToken(d.env)
	if err != nil {
		return setup.Config{}, err
	}
	var runID string
	if in.resume != nil {
		runID = in.resume.Record.Setup.RunID
	} else if runID, err = newRunID(); err != nil {
		return setup.Config{}, err
	}
	vault, err := secrets.NewSetupStore(runID)
	if err != nil {
		return setup.Config{}, err
	}
	reg, err := openRegistry(d)
	if err != nil {
		return setup.Config{}, err
	}
	dir, err := os.Getwd()
	if err != nil {
		return setup.Config{}, fmt.Errorf("get directory: %w", err)
	}
	register := d.register
	if register == nil {
		register = func(providers.Credential) {}
	}
	env := environMap(os.Environ())
	// The opening's version checks start from the same environment as every other child, so no
	// credential the shell holds, the setup token included, reaches git or node.
	childEnv := childenv.Scrub(env)
	probe := providers.NewProbe(d.transport, d.resolver)
	// A resume fetches the template version its record names, never the tag's current one. A run
	// whose view already fetched the tag's template builds from that one.
	fetch := tagFetch(d, in.tag)
	switch {
	case in.resume != nil:
		fetch = setup.FetchRecorded(scaffold.NewFetcher(d.transport), in.resume.Record)
	case in.template != nil:
		t := *in.template
		fetch = func(context.Context) (setup.Template, error) { return t, nil }
	}

	return setup.Config{
		Answers: in.answers,
		RunID:   runID,
		Dir:     dir,
		GOOS:    runtime.GOOS,
		Env:     env,
		Resume:  in.resume,
		Apply:   in.apply,

		GitConfigPairs: extraGitConfig(env),

		Git: func(ctx context.Context) error {
			cmd := exec.CommandContext(ctx, "git", "--version")
			cmd.Env = childEnv
			return cmd.Run()
		},
		NodeVersion: func(ctx context.Context) (string, error) {
			cmd := exec.CommandContext(ctx, "node", "--version")
			cmd.Env = childEnv
			out, err := cmd.Output()
			return strings.TrimSpace(string(out)), err
		},
		FetchTemplate: fetch,
		WriteSite:     scaffold.Write,
		FinalizeSite:  scaffold.Finalize,
		SiteGet: func(ctx context.Context, rawURL string) (int, string, error) {
			resp, err := probe.GetNoFollow(ctx, rawURL)
			if err != nil {
				return 0, "", err
			}
			defer func() { _ = resp.Body.Close() }()
			return resp.StatusCode, resp.Header.Get("Location"), nil
		},
		Authority: siteAuthority(probe),
		Listen:    setup.ListenLoopback,

		Vault: vault,
		Store: reg,

		CloudflareOAuth: providers.NewCloudflareOAuth(d.transport),
		CloudflareToken: token,
		Cloudflare: func(accountID string, token providers.Credential) setup.CloudflareAPI {
			return providers.NewCloudflare(accountID, token, d.transport)
		},
		GitHub: func(cred providers.Credential) setup.GitHubAPI {
			return providers.NewGitHub(cred, d.transport)
		},
		GitHubWeb: providers.NewGitHubWeb(d.transport),

		View:     view,
		Register: register,
		Emit:     emit,
		Now:      d.now,
	}, nil
}

// siteAuthority is how the domain step asks a zone's nameserver for a host: the probe's direct
// lookup. A variable so the end-to-end build can replace it, since its fake zones name real
// nameservers and a real lookup would wait out the HTTPS limit.
var siteAuthority = func(p *providers.Probe) providers.AuthorityLookup { return p.LookupAuthoritative }

// tagFetch is the template fetch of a new run: the engine's template at the dist-tag tag.
func tagFetch(d deps, tag string) func(ctx context.Context) (setup.Template, error) {
	return setup.FetchFrom(scaffold.NewFetcher(d.transport), tag)
}

// newRunID returns a fresh run id: 16 random hex digits, with no slash, so the run's keyring
// prefix never contains another's.
func newRunID() (string, error) {
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("draw a run id: %w", err)
	}
	return hex.EncodeToString(b), nil
}

// environMap turns os.Environ's NAME=value lines into the map Config.Env takes.
func environMap(environ []string) map[string]string {
	m := make(map[string]string, len(environ))
	for _, kv := range environ {
		if name, value, ok := strings.Cut(kv, "="); ok {
			m[name] = value
		}
	}
	return m
}
