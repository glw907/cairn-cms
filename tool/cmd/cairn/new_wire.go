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
	var runID string
	var err error
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
	probe := providers.NewProbe(d.transport, d.resolver)
	// A resume fetches the template version its record names, never the tag's current one.
	fetch := setup.FetchFrom(scaffold.NewFetcher(d.transport), in.tag)
	if in.resume != nil {
		fetch = setup.FetchRecorded(scaffold.NewFetcher(d.transport), in.resume.Record)
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
			return exec.CommandContext(ctx, "git", "--version").Run()
		},
		NodeVersion: func(ctx context.Context) (string, error) {
			out, err := exec.CommandContext(ctx, "node", "--version").Output()
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
		Listen: setup.ListenLoopback,

		Vault: vault,
		Store: reg,

		CloudflareOAuth: providers.NewCloudflareOAuth(d.transport),
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
