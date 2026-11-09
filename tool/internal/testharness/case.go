package testharness

import (
	"bytes"
	"context"
	"encoding/hex"
	"errors"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"slices"
	"strings"
	"testing"
	"time"
)

// RunTimeout is how long a child may run before Run kills it and its process group. The longest
// setup run the cases drive finishes in well under a minute; a child past this hangs.
var RunTimeout = 3 * time.Minute

// Config configures a Case.
type Config struct {
	// Hosts maps each host the proxy fakes, by name without a port, to the handler that serves it.
	// CONNECT to any other host is refused.
	Hosts map[string]http.Handler
}

// Case is one end-to-end run's world: a proxy, the browser helper, the stubs, a directory for
// bare repositories, a keyring store, and the environment that points a child at all of them.
// Every directory sits under the test's temporary directory.
type Case struct {
	// Proxy fakes the hosts Config named.
	Proxy *Proxy
	// Env is the child's whole environment; nothing is inherited from the test process. A test
	// may change it before Run, as the self-test does to take a piece away.
	Env map[string]string
	// Dir is the child's working directory.
	Dir string
	// Home is the child's HOME, so the tool's store and git's user config stay in the case.
	Home string
	// BinDir is the child's whole PATH: git, the node stub, and the npm stub.
	BinDir string
	// Remotes holds the bare repositories that https://github.com/ is rewritten to.
	Remotes string
	// KeyringDir is the tagged build's keyring store.
	KeyringDir string

	t          *testing.T
	nodeLog    string
	npmLog     string
	browserLog string
}

// Result is what one Run produced. The logs are each read when the child exits; the browser
// helper runs detached, so a walk the child did not wait for may still be adding to its log.
type Result struct {
	Stdout   string
	Stderr   string
	ExitCode int
	// Requests and Refused are the proxy's logs, for the whole case so far.
	Requests []Request
	Refused  []string
	// NodeCalls and NPMCalls hold each stub call's arguments, joined by spaces, one per call.
	NodeCalls []string
	NPMCalls  []string
	// BrowserVisits holds each request the browser helper made, as "<method> <url>", and an
	// "error: " line if its walk failed.
	BrowserVisits []string
}

// NewCase builds a case's world and skips the test on any system but Linux.
func NewCase(t *testing.T, cfg Config) *Case {
	t.Helper()
	if runtime.GOOS != "linux" {
		t.Skip("the end-to-end harness runs on Linux only: Go reads SSL_CERT_FILE on Unix other than macOS, and the stubs are shell scripts")
	}
	root := t.TempDir()
	c := &Case{
		t:          t,
		Proxy:      NewProxy(t, cfg.Hosts),
		Dir:        filepath.Join(root, "work"),
		Home:       filepath.Join(root, "home"),
		BinDir:     filepath.Join(root, "bin"),
		Remotes:    filepath.Join(root, "remotes"),
		KeyringDir: filepath.Join(root, "keyring"),
		nodeLog:    filepath.Join(root, "node.log"),
		npmLog:     filepath.Join(root, "npm.log"),
		browserLog: filepath.Join(root, "browser.log"),
	}
	for _, dir := range []string{c.Dir, c.Home, c.BinDir, c.Remotes, c.KeyringDir} {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			t.Fatal(err)
		}
	}
	git, err := exec.LookPath("git")
	if err != nil {
		t.Fatalf("the harness needs git: %v", err)
	}
	if err := os.Symlink(git, filepath.Join(c.BinDir, "git")); err != nil {
		t.Fatal(err)
	}
	c.stub("node", "printf '%s\\n' \"$*\" >> '"+c.nodeLog+"'\necho v24.11.1\n")
	c.stub("npm", "printf '%s\\n' \"$*\" >> '"+c.npmLog+"'\n")

	c.Env = map[string]string{
		"PATH":                  c.BinDir,
		"HOME":                  c.Home,
		"HTTPS_PROXY":           c.Proxy.URL,
		"SSL_CERT_FILE":         c.Proxy.CAFile,
		"GIT_SSL_CAINFO":        c.Proxy.CAFile, // a git linked against GnuTLS ignores SSL_CERT_FILE
		"BROWSER":               Binary(t, "internal/testharness/browser"),
		"CAIRN_E2E_BROWSER_LOG": c.browserLog,
		"CAIRN_E2E_KEYRING_DIR": c.KeyringDir,
		"GIT_CONFIG_COUNT":      "1",
		"GIT_CONFIG_KEY_0":      "url." + c.Remotes + "/.insteadOf",
		"GIT_CONFIG_VALUE_0":    "https://github.com/",
		"GIT_CONFIG_NOSYSTEM":   "1",
		"GIT_TERMINAL_PROMPT":   "0",
	}
	return c
}

// stub writes an executable shell script named name into BinDir. The script runs no other
// program, since PATH holds nothing else.
func (c *Case) stub(name, body string) {
	c.t.Helper()
	if err := os.WriteFile(filepath.Join(c.BinDir, name), []byte("#!/bin/sh\n"+body), 0o755); err != nil {
		c.t.Fatal(err)
	}
}

// BareRepo creates the bare repository https://github.com/<owner>/<repo>.git is rewritten to,
// with main as its default branch, and returns its path.
func (c *Case) BareRepo(owner, repo string) string {
	c.t.Helper()
	path := filepath.Join(c.Remotes, owner, repo+".git")
	cmd := exec.Command("git", "init", "--quiet", "--bare", "--initial-branch=main", path)
	cmd.Env = append(os.Environ(), "GIT_CONFIG_GLOBAL="+os.DevNull, "GIT_CONFIG_NOSYSTEM=1")
	if out, err := cmd.CombinedOutput(); err != nil {
		c.t.Fatalf("git init --bare %s: %v: %s", path, err, out)
	}
	return path
}

// Run runs bin with args in Dir under Env, with stdin empty, and returns what it produced. A
// non-zero exit is a Result, not a test failure; a child that cannot start fails the test.
func (c *Case) Run(bin string, args ...string) Result {
	c.t.Helper()
	ctx, cancel := context.WithTimeout(c.t.Context(), RunTimeout)
	defer cancel()
	cmd := exec.CommandContext(ctx, bin, args...)
	ownGroup(cmd)
	cmd.WaitDelay = 5 * time.Second
	cmd.Dir = c.Dir
	cmd.Env = c.environ()
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	err := cmd.Run()
	r := Result{Stdout: stdout.String(), Stderr: stderr.String()}
	if exit, ok := errors.AsType[*exec.ExitError](err); ok {
		r.ExitCode = exit.ExitCode()
	} else if err != nil {
		c.t.Fatalf("run %s: %v", bin, err)
	}
	r.Requests = c.Proxy.Requests()
	r.Refused = c.Proxy.Refused()
	r.NodeCalls = c.lines(c.nodeLog)
	r.NPMCalls = c.lines(c.npmLog)
	r.BrowserVisits = c.lines(c.browserLog)
	return r
}

func (c *Case) environ() []string {
	out := make([]string, 0, len(c.Env))
	for name, value := range c.Env {
		out = append(out, name+"="+value)
	}
	slices.Sort(out)
	return out
}

func (c *Case) lines(path string) []string {
	c.t.Helper()
	data, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	if err != nil {
		c.t.Fatal(err)
	}
	return strings.Split(strings.TrimSuffix(string(data), "\n"), "\n")
}

// KeyringEntries returns every entry in the keyring store, by entry name, with its value.
func (c *Case) KeyringEntries() map[string]string {
	c.t.Helper()
	files, err := os.ReadDir(c.KeyringDir)
	if err != nil {
		c.t.Fatal(err)
	}
	entries := map[string]string{}
	for _, f := range files {
		// The store names each file by the hex of service, a NUL, and the entry name; a
		// temporary file from an unfinished write has a dot name and is not an entry.
		key, err := hex.DecodeString(f.Name())
		if err != nil {
			continue
		}
		_, name, ok := strings.Cut(string(key), "\x00")
		if !ok {
			continue
		}
		value, err := os.ReadFile(filepath.Join(c.KeyringDir, f.Name()))
		if err != nil {
			c.t.Fatal(err)
		}
		entries[name] = string(value)
	}
	return entries
}
