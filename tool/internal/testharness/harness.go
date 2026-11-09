// Package testharness runs a cairn binary built with the cairne2e test tag as a child process,
// pointed at fakes through the standard environment rather than a base-URL override, which the
// providers do not have.
//
// A Case gives the child five pieces. HTTPS_PROXY names a Proxy that terminates TLS for the hosts
// a test fakes and refuses every other CONNECT; SSL_CERT_FILE names the proxy's CA, which Go reads
// on Unix other than macOS. BROWSER names the browser helper, which walks the tab's chain and so
// keeps the no-display stop from firing. GIT_CONFIG_COUNT carries one url.<dir>.insteadOf pair
// that points https://github.com/ at local bare repositories; setup appends its pairs after it.
// PATH holds git and stubs for node, which reports v24, and npm, which logs and exits 0.
// CAIRN_E2E_KEYRING_DIR names the tagged build's file keyring store.
//
// The harness runs on Linux only, and its cases must not run in parallel, since every setup run
// holds loopback port 49152. A package using it calls Main from its TestMain.
package testharness

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sync"
	"testing"
)

// Module is the tool's module path, which Binary's package paths are relative to.
const Module = "github.com/glw907/cairn-cms/tool/v2"

// Tag is the build tag every binary the harness builds carries. Under it, internal/secrets binds
// the keyring to the file store CAIRN_E2E_KEYRING_DIR names.
const Tag = "cairne2e"

var (
	binDir  string
	buildMu sync.Mutex
	built   = map[string]string{}
)

// Main runs the package's tests with a directory for the binaries Binary builds, and removes it
// after. Call it from TestMain.
func Main(m *testing.M) {
	dir, err := os.MkdirTemp("", "cairn-e2e-bin-")
	if err != nil {
		fmt.Fprintln(os.Stderr, "testharness:", err)
		os.Exit(1)
	}
	binDir = dir
	code := m.Run()
	_ = os.RemoveAll(dir)
	os.Exit(code)
}

// Binary returns the path of pkg, a main package path relative to Module such as "cmd/cairn",
// built with Tag. Each package builds once per test process.
func Binary(t *testing.T, pkg string) string {
	t.Helper()
	if binDir == "" {
		t.Fatal("testharness: call testharness.Main from the package's TestMain")
	}
	buildMu.Lock()
	defer buildMu.Unlock()
	if path, ok := built[pkg]; ok {
		return path
	}
	path := filepath.Join(binDir, filepath.Base(pkg))
	out, err := exec.Command("go", "build", "-tags", Tag, "-o", path, Module+"/"+pkg).CombinedOutput()
	if err != nil {
		t.Fatalf("go build -tags %s %s: %v: %s", Tag, pkg, err, out)
	}
	built[pkg] = path
	return path
}

// Cairn returns the cairn binary built with Tag.
func Cairn(t *testing.T) string {
	t.Helper()
	return Binary(t, "cmd/cairn")
}
