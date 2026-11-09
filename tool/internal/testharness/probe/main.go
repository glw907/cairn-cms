// Probe is the harness self-test's child: each mode makes the one call a piece of the harness
// carries, the same way the setup run makes it, so the self-test can show each piece carries
// its call and that taking the piece away breaks it.
//
// Usage:
//
//	probe https <url>                 GET url through http.DefaultTransport and print the body
//	probe browser <url>               open url the way setup's opening does
//	probe git-clone <url> <dir>       clone url with a pair appended as setup's push does
//	probe keyring <run id> <value>    store value as the run's Cloudflare access entry
//	probe node                        print node --version
//	probe npm                         run npm install
package main

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"slices"
	"strconv"
	"strings"

	"github.com/glw907/cairn-cms/tool/v2/internal/secrets"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup/loopback"
)

func main() {
	if err := run(os.Args[1:]); err != nil {
		fmt.Fprintln(os.Stderr, "probe:", err)
		os.Exit(1)
	}
}

func run(args []string) error {
	if len(args) == 0 {
		return errors.New("name a mode")
	}
	switch mode, rest := args[0], args[1:]; {
	case mode == "https" && len(rest) == 1:
		return get(rest[0])
	case mode == "browser" && len(rest) == 1:
		return open(rest[0])
	case mode == "git-clone" && len(rest) == 2:
		return gitClone(rest[0], rest[1])
	case mode == "keyring" && len(rest) == 2:
		store, err := secrets.NewSetupStore(rest[0])
		if err != nil {
			return err
		}
		return store.Put(secrets.EntryCloudflareAccess, rest[1])
	case mode == "node" && len(rest) == 0:
		out, err := exec.Command("node", "--version").Output()
		if err != nil {
			return fmt.Errorf("node --version: %w", err)
		}
		fmt.Print(string(out))
		return nil
	case mode == "npm" && len(rest) == 0:
		if err := exec.Command("npm", "install").Run(); err != nil {
			return fmt.Errorf("npm install: %w", err)
		}
		return nil
	}
	return fmt.Errorf("unknown mode or wrong arguments: %q", args)
}

// get sends through http.DefaultTransport, the transport the providers fall back to when given a
// nil RoundTripper, so it reads HTTPS_PROXY and SSL_CERT_FILE the way they do.
func get(target string) error {
	resp, err := http.Get(target)
	if err != nil {
		return err
	}
	defer func() { _ = resp.Body.Close() }()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("GET %s answered %d", target, resp.StatusCode)
	}
	fmt.Print(string(body))
	return nil
}

// open stops where setup's opening stops for a machine with no display, and otherwise opens
// target through the launcher setup uses.
func open(target string) error {
	env := environ()
	if loopback.Remote(runtime.GOOS, env) {
		return errors.New("the no-display stop fired")
	}
	return loopback.Open(loopback.Launcher(runtime.GOOS, env, target), loopback.OpenTimeout)
}

// gitClone appends an http.extraheader pair after the inherited GIT_CONFIG_COUNT pairs, as
// setup's push environment does, so the clone works only if the inherited pairs survive it.
func gitClone(remote, dir string) error {
	n, err := strconv.Atoi(os.Getenv("GIT_CONFIG_COUNT"))
	if err != nil || n < 0 {
		n = 0
	}
	key := strconv.Itoa(n)
	env := slices.DeleteFunc(os.Environ(), func(kv string) bool { return strings.HasPrefix(kv, "GIT_CONFIG_COUNT=") })
	env = append(env,
		"GIT_CONFIG_GLOBAL="+os.DevNull,
		"GIT_CONFIG_COUNT="+strconv.Itoa(n+1),
		"GIT_CONFIG_KEY_"+key+"=http.https://github.com/.extraheader",
		"GIT_CONFIG_VALUE_"+key+"=Authorization: Basic cHJvYmU6cHJvYmU=",
	)
	cmd := exec.Command("git", "clone", "--quiet", remote, dir)
	cmd.Env = env
	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("git clone: %w: %s", err, out)
	}
	return nil
}

func environ() map[string]string {
	env := map[string]string{}
	for _, kv := range os.Environ() {
		name, value, _ := strings.Cut(kv, "=")
		env[name] = value
	}
	return env
}
