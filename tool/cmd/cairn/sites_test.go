package main

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/glw907/cairn-cms/tool/internal/record"
	"github.com/glw907/cairn-cms/tool/internal/render"
	"github.com/glw907/cairn-cms/tool/internal/spine"
	"github.com/glw907/cairn-cms/tool/internal/store"
)

// writeTestRecord saves one adopted site into d's registry directory, through record and
// store's own shapes rather than hand-built JSON.
func writeTestRecord(t *testing.T, d deps, id, domain, worker string) {
	t.Helper()
	dir, err := d.registryDir()
	if err != nil {
		t.Fatalf("registryDir: %v", err)
	}
	s, err := store.Open(dir)
	if err != nil {
		t.Fatalf("store.Open: %v", err)
	}
	r := record.Record{
		Name:       domain,
		Step:       string(spine.StepLive),
		Domain:     domain,
		Adopted:    true,
		Cloudflare: record.Cloudflare{AccountID: testAccountID, WorkerName: worker},
		GitHub:     record.GitHub{Repo: record.GitHubRepo{Owner: "glw907", Repo: worker}},
	}
	if err := s.Save(id, r); err != nil {
		t.Fatalf("Save %s: %v", id, err)
	}
}

// TestSitesListJSONCarriesEachSiteID asserts the listing's machine shape names the id health
// and logs take as their argument, so an agent reading the list can act on it.
func TestSitesListJSONCarriesEachSiteID(t *testing.T) {
	d, _ := testDeps(t)
	writeTestRecord(t, d, "ecxc-ski-a1b2c3", "ecxc.ski", "ecxc-ski")

	out, _, err := execTree(t, d, "sites", "list", "--json")
	if err != nil {
		t.Fatalf("sites list --json: %v", err)
	}
	var payload struct {
		Sites []render.SiteListEntry `json:"sites"`
	}
	if err := json.Unmarshal([]byte(out), &payload); err != nil {
		t.Fatalf("unmarshal %q: %v", out, err)
	}
	lines := payload.Sites
	if len(lines) != 1 {
		t.Fatalf("got %d sites, want 1", len(lines))
	}
	if lines[0].ID != "ecxc-ski-a1b2c3" || lines[0].Domain != "ecxc.ski" {
		t.Errorf("got %+v, want the saved id and domain", lines[0])
	}
}

// TestSitesListExitCodes covers what a listing can say about the registry: a readable registry
// is OK, an empty one included, since listing nothing is a complete answer to which sites are
// registered. Only --expect-sites makes the count a claim, and a count it disagrees with is
// UNKNOWN, because the tool cannot then say whether it is looking at every site.
func TestSitesListExitCodes(t *testing.T) {
	tests := []struct {
		name  string
		sites int
		args  []string
		want  spine.Verdict
	}{
		{"a site the registry holds is OK", 1, nil, spine.VerdictOK},
		{"an expected count that matches is OK", 2, []string{"--expect-sites", "2"}, spine.VerdictOK},
		{"an expected count that does not match is UNKNOWN", 2, []string{"--expect-sites", "3"}, spine.VerdictUnknown},
		{"an empty registry with no --expect-sites is OK", 0, nil, spine.VerdictOK},
		{"an empty registry under --expect-sites is UNKNOWN", 0, []string{"--expect-sites", "1"}, spine.VerdictUnknown},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			d, code := testDeps(t)
			for i := range tt.sites {
				writeTestRecord(t, d, "site-"+string(rune('a'+i))+"-a1b2c3", "site.example", "worker")
			}
			args := append([]string{"sites", "list"}, tt.args...)
			if _, _, err := execTree(t, d, args...); err != nil {
				t.Fatalf("sites list: %v", err)
			}
			if *code != int(tt.want) {
				t.Errorf("exit code = %d, want %d (%s)", *code, int(tt.want), tt.want)
			}
		})
	}
}

// TestSitesListVerbosePrintsTheRegistryDirectory asserts a path is treated as the identifier it
// is: withheld by default and printed when --verbose asks for it.
func TestSitesListVerbosePrintsTheRegistryDirectory(t *testing.T) {
	d, _ := testDeps(t)
	writeTestRecord(t, d, "ecxc-ski-a1b2c3", "ecxc.ski", "ecxc-ski")
	dir, err := d.registryDir()
	if err != nil {
		t.Fatalf("registryDir: %v", err)
	}

	plain, _, err := execTree(t, d, "sites", "list")
	if err != nil {
		t.Fatalf("sites list: %v", err)
	}
	if strings.Contains(plain, dir) {
		t.Errorf("the default listing %q printed the registry path", plain)
	}

	verbose, _, err := execTree(t, d, "sites", "list", "--verbose")
	if err != nil {
		t.Fatalf("sites list --verbose: %v", err)
	}
	if !strings.Contains(verbose, dir) {
		t.Errorf("the verbose listing %q does not print the registry path", verbose)
	}
	if !strings.Contains(verbose, store.SourceUserConfig.String()) {
		t.Errorf("the verbose listing %q does not name the store.Source that chose the path", verbose)
	}
}
