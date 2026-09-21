package main

import (
	"encoding/json"
	"net/http"
	"os"
	"strings"
	"testing"
)

// adoptRoutes returns the Cloudflare routes adopt.Discover reads for one Worker with no custom
// domain and no Builds trigger.
func adoptRoutes(worker string) routeRoundTripper {
	return routeRoundTripper{
		"/client/v4/accounts/" + testAccountID + "/workers/scripts": {
			status: http.StatusOK,
			body:   []byte(`{"success":true,"result":[{"id":"` + worker + `","tag":"tag1"}]}`),
		},
		"/client/v4/accounts/" + testAccountID + "/workers/domains": {
			status: http.StatusOK,
			body:   []byte(`{"success":true,"result":[]}`),
		},
		"/client/v4/accounts/" + testAccountID + "/builds/workers/tag1/triggers": {
			status: http.StatusOK,
			body:   []byte(`{"success":true,"result":[]}`),
		},
	}
}

// credentialedDeps returns a dependency set whose three credentials all resolve from the
// environment, so a command reaches its provider calls rather than stopping at a missing token.
func credentialedDeps(t *testing.T) deps {
	t.Helper()
	d, _ := testDeps(t)
	d.env = fakeEnv(map[string]string{
		"CAIRN_CF_ACCOUNT_ID": testAccountID,
		"CAIRN_CF_READ_TOKEN": "cf-token",
		"CAIRN_GH_READ_TOKEN": "gh-token",
	})
	return d
}

// TestAdoptListPrintsCandidatesAsJSONAndWritesNothing covers the listing half of the grammar
// cleanup: a separate non-writing subcommand over the same Discover the adopt path calls.
func TestAdoptListPrintsCandidatesAsJSONAndWritesNothing(t *testing.T) {
	d := credentialedDeps(t)
	d.transport = adoptRoutes("ecxc-ski")

	stdout, stderr, err := execTree(t, d, "adopt", "list")
	if err != nil {
		t.Fatalf("adopt list: %v", err)
	}
	if !strings.Contains(stderr, pasteNotice) {
		t.Errorf("stderr %q carries no paste notice", stderr)
	}

	var lines []candidateLine
	if err := json.Unmarshal([]byte(stdout), &lines); err != nil {
		t.Fatalf("stdout %q is not JSON: %v", stdout, err)
	}
	if len(lines) != 1 || lines[0].Worker != "ecxc-ski" {
		t.Fatalf("got %+v, want the one discovered Worker", lines)
	}
	if lines[0].Adopted {
		t.Error("the candidate reads as adopted; nothing has been written")
	}

	dir, err := d.registryDir()
	if err != nil {
		t.Fatalf("registryDir: %v", err)
	}
	if entries := readDirNames(t, dir); len(entries) != 0 {
		t.Errorf("adopt list wrote %v into the registry; the listing path writes nothing", entries)
	}
}

// TestAdoptWithoutAWorkerNamesTheListing asserts adopt never prompts: 1.0's adopt is
// flag-driven, so a run with nothing named says what to run rather than waiting on stdin.
func TestAdoptWithoutAWorkerNamesTheListing(t *testing.T) {
	d := credentialedDeps(t)

	_, _, err := execTree(t, d, "adopt")
	if err == nil {
		t.Fatal("adopt with no --worker succeeded; it must name the listing instead")
	}
	if !strings.Contains(err.Error(), "cairn adopt list") {
		t.Errorf("error %q does not name `cairn adopt list`", err)
	}
}

// TestAdoptNamesTheListingWhenTheWorkerIsNotOnTheAccount covers the other way the flag goes
// wrong: a name that discovery does not carry.
func TestAdoptNamesTheListingWhenTheWorkerIsNotOnTheAccount(t *testing.T) {
	d := credentialedDeps(t)
	d.transport = adoptRoutes("ecxc-ski")

	_, _, err := execTree(t, d, "adopt", "--worker", "not-a-worker")
	if err == nil {
		t.Fatal("adopt accepted a Worker the account does not carry")
	}
	if !strings.Contains(err.Error(), "cairn adopt list") {
		t.Errorf("error %q does not name `cairn adopt list`", err)
	}
}

// readDirNames returns the file names directly inside dir.
func readDirNames(t *testing.T, dir string) []string {
	t.Helper()
	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatalf("read %s: %v", dir, err)
	}
	names := make([]string, 0, len(entries))
	for _, e := range entries {
		names = append(names, e.Name())
	}
	return names
}
