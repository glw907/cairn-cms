package spine

import (
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strings"
	"testing"

	"github.com/glw907/cairn-cms/tool/internal/providers"
)

var (
	catalogueRowKey = regexp.MustCompile(`^\s*'([a-z0-9-]+)':\s*\{`)
	catalogueKind   = regexp.MustCompile(`kind:\s*'wait'`)
)

// waitCodesIn scans a catalogue.mjs file's ROWS object for every row whose kind is "wait",
// returning the row's own key: the vocabulary a ParkCode names.
func waitCodesIn(path string) (map[string]bool, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	found := make(map[string]bool)
	var currentCode string
	for line := range strings.SplitSeq(string(data), "\n") {
		if m := catalogueRowKey.FindStringSubmatch(line); m != nil {
			currentCode = m[1]
			continue
		}
		if catalogueKind.MatchString(line) && currentCode != "" {
			found[currentCode] = true
		}
	}
	return found, nil
}

// TestParkCodesMatchWaitKindCatalogueRows reads the cloudflare and github chapter error
// catalogues through providers.RepoRoot and asserts the set of "wait"-kind codes equals the
// ParkCode constants.
func TestParkCodesMatchWaitKindCatalogueRows(t *testing.T) {
	root, err := providers.RepoRoot()
	if err != nil {
		t.Fatalf("providers.RepoRoot: %v", err)
	}

	catalogues := []string{
		filepath.Join(root, "packages", "create-cairn-site", "src", "cloudflare", "catalogue.mjs"),
		filepath.Join(root, "packages", "create-cairn-site", "src", "github", "catalogue.mjs"),
	}

	found := make(map[string]bool)
	for _, path := range catalogues {
		rows, err := waitCodesIn(path)
		if err != nil {
			t.Fatalf("scan %s: %v", path, err)
		}
		for code := range rows {
			found[code] = true
		}
	}

	var nodeCodes []string
	for c := range found {
		nodeCodes = append(nodeCodes, c)
	}
	slices.Sort(nodeCodes)

	goCodes := []string{
		string(ParkDelegationPropagating),
		string(ParkDelegationPending),
		string(ParkHostnameRecordsAbsent),
		string(ParkHostnameResolverLagging),
		string(ParkCertificatePending),
		string(ParkEmailNotReady),
		string(ParkEmailSenderPropagating),
		string(ParkEmailDailyLimit),
		string(ParkBuildsAppNotAuthorized),
		string(ParkBuildsRepoNotSelected),
		string(ParkBuildNotStarted),
		string(ParkBuildRunning),
		string(ParkBuildsReconcileParked),
	}
	slices.Sort(goCodes)

	if !slices.Equal(nodeCodes, goCodes) {
		t.Fatalf("wait-kind code sets differ:\nnode: %v\ngo:   %v", nodeCodes, goCodes)
	}
}
