package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/health"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// TestParseAckEntry covers --ack's own grammar: <check-id>=<YYYY-MM-DD>, an already-expired date
// parsing successfully (expiry is health.Run's own comparison, against Options.Now, never this
// parse), and a malformed value naming the entry.
func TestParseAckEntry(t *testing.T) {
	tests := []struct {
		name    string
		entry   string
		wantErr bool
		wantID  string
		wantExp time.Time
	}{
		{
			name:    "a well-formed entry parses",
			entry:   "deploy=2026-10-01",
			wantID:  "deploy",
			wantExp: time.Date(2026, 10, 1, 0, 0, 0, 0, time.UTC),
		},
		{
			name:    "an already-expired date still parses",
			entry:   "deploy=2020-01-01",
			wantID:  "deploy",
			wantExp: time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC),
		},
		{name: "no equals sign is malformed", entry: "deploy", wantErr: true},
		{name: "no check id is malformed", entry: "=2026-10-01", wantErr: true},
		{name: "no date is malformed", entry: "deploy=", wantErr: true},
		{name: "an unparseable date is malformed", entry: "deploy=not-a-date", wantErr: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ack, err := parseAckEntry(tt.entry)
			if (err != nil) != tt.wantErr {
				t.Fatalf("parseAckEntry(%q) error = %v, wantErr %v", tt.entry, err, tt.wantErr)
			}
			if tt.wantErr {
				if !strings.Contains(err.Error(), "--ack") {
					t.Errorf("error %q does not name --ack", err)
				}
				return
			}
			if ack.CheckID != tt.wantID || !ack.Expires.Equal(tt.wantExp) {
				t.Errorf("parseAckEntry(%q) = %+v, want CheckID %q, Expires %v", tt.entry, ack, tt.wantID, tt.wantExp)
			}
		})
	}
}

// TestMergeAcksFlagWinsOnConflict covers the merge rule: a flag entry and a file entry naming
// the same check id keep the flag's own expiry, and an entry unique to either side survives.
func TestMergeAcksFlagWinsOnConflict(t *testing.T) {
	flagAcks := health.Acks{
		{CheckID: "deploy", Expires: time.Date(2026, 12, 1, 0, 0, 0, 0, time.UTC)},
		{CheckID: "flag-only", Expires: time.Date(2026, 11, 1, 0, 0, 0, 0, time.UTC)},
	}
	fileAcks := health.Acks{
		{CheckID: "deploy", Expires: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)},
		{CheckID: "file-only", Expires: time.Date(2026, 10, 1, 0, 0, 0, 0, time.UTC)},
	}

	merged := mergeAcks(flagAcks, fileAcks)

	byID := map[string]time.Time{}
	for _, ack := range merged {
		byID[ack.CheckID] = ack.Expires
	}
	if len(byID) != 3 {
		t.Fatalf("merged = %+v, want 3 entries", merged)
	}
	if !byID["deploy"].Equal(time.Date(2026, 12, 1, 0, 0, 0, 0, time.UTC)) {
		t.Errorf("deploy's merged expiry = %v, want the flag's own value", byID["deploy"])
	}
	if !byID["flag-only"].Equal(time.Date(2026, 11, 1, 0, 0, 0, 0, time.UTC)) {
		t.Error("merge dropped the flag-only entry")
	}
	if !byID["file-only"].Equal(time.Date(2026, 10, 1, 0, 0, 0, 0, time.UTC)) {
		t.Error("merge dropped the file-only entry")
	}
}

// writeAckFile writes an acknowledgement file at path, one entry per checkID/expires pair.
func writeAckFile(t *testing.T, path string, entries ...ackFileEntry) {
	t.Helper()
	data, err := json.Marshal(entries)
	if err != nil {
		t.Fatalf("marshal ack file: %v", err)
	}
	if err := os.WriteFile(path, data, 0o600); err != nil {
		t.Fatalf("write %s: %v", path, err)
	}
}

// TestLoadAckFile covers the file half: a missing default file is not an error, a missing
// explicit file is, and a malformed entry (no check id, no expiry, or an unparseable date) is
// refused.
func TestLoadAckFile(t *testing.T) {
	t.Run("a missing default path is not an error", func(t *testing.T) {
		dir := t.TempDir()
		acks, err := loadAckFile(filepath.Join(dir, defaultAckFileName), false)
		if err != nil {
			t.Fatalf("loadAckFile() = %v, want nil for a missing default path", err)
		}
		if len(acks) != 0 {
			t.Errorf("acks = %+v, want none", acks)
		}
	})

	t.Run("a missing explicit path is an error", func(t *testing.T) {
		dir := t.TempDir()
		path := filepath.Join(dir, "explicit.json")
		if _, err := loadAckFile(path, true); err == nil {
			t.Fatal("loadAckFile() = nil, want an error for a missing explicit --ack-file")
		}
	})

	t.Run("a well-formed file parses", func(t *testing.T) {
		dir := t.TempDir()
		path := filepath.Join(dir, defaultAckFileName)
		writeAckFile(t, path, ackFileEntry{CheckID: "deploy", Expires: "2026-10-01"})

		acks, err := loadAckFile(path, false)
		if err != nil {
			t.Fatalf("loadAckFile() = %v, want nil", err)
		}
		if len(acks) != 1 || acks[0].CheckID != "deploy" {
			t.Fatalf("acks = %+v, want one deploy entry", acks)
		}
	})

	t.Run("an entry with no check id is refused", func(t *testing.T) {
		dir := t.TempDir()
		path := filepath.Join(dir, defaultAckFileName)
		writeAckFile(t, path, ackFileEntry{Expires: "2026-10-01"})

		if _, err := loadAckFile(path, false); err == nil {
			t.Fatal("loadAckFile() = nil, want an error for an entry with no check id")
		}
	})

	t.Run("an entry with no expiry is refused", func(t *testing.T) {
		dir := t.TempDir()
		path := filepath.Join(dir, defaultAckFileName)
		writeAckFile(t, path, ackFileEntry{CheckID: "deploy"})

		if _, err := loadAckFile(path, false); err == nil {
			t.Fatal("loadAckFile() = nil, want an error for an entry with no expiry")
		}
	})

	t.Run("a malformed date is refused", func(t *testing.T) {
		dir := t.TempDir()
		path := filepath.Join(dir, defaultAckFileName)
		writeAckFile(t, path, ackFileEntry{CheckID: "deploy", Expires: "not-a-date"})

		if _, err := loadAckFile(path, false); err == nil {
			t.Fatal("loadAckFile() = nil, want an error for a malformed date")
		}
	})

	t.Run("malformed JSON is refused", func(t *testing.T) {
		dir := t.TempDir()
		path := filepath.Join(dir, defaultAckFileName)
		if err := os.WriteFile(path, []byte("not json"), 0o600); err != nil {
			t.Fatalf("write: %v", err)
		}
		if _, err := loadAckFile(path, false); err == nil {
			t.Fatal("loadAckFile() = nil, want an error for malformed JSON")
		}
	})
}

// TestAckFilePathDefaultsInsideTheRegistryDirectory covers --ack-file's own default: named
// nowhere, it resolves to acknowledgements.json inside the registry directory.
func TestAckFilePathDefaultsInsideTheRegistryDirectory(t *testing.T) {
	dir := "/tmp/some-registry"
	got := ackFilePath(dir, &rootFlags{})
	want := filepath.Join(dir, "acknowledgements.json")
	if got != want {
		t.Errorf("ackFilePath() = %q, want %q", got, want)
	}

	got = ackFilePath(dir, &rootFlags{ackFile: "/tmp/custom.json"})
	if got != "/tmp/custom.json" {
		t.Errorf("ackFilePath() = %q, want the named --ack-file path", got)
	}
}

// TestSitesListSkipsTheResolvedAckFileEvenWithASiteIDShapedStem covers criterion 3: an
// operator's own --ack-file, named to a file whose stem looks like a site id, is excluded from
// the listing by its resolved path, not by name.
func TestSitesListSkipsTheResolvedAckFileEvenWithASiteIDShapedStem(t *testing.T) {
	d, code := testDeps(t)
	writeTestRecord(t, d, "ecxc-ski-a1b2c3", "ecxc.ski", "ecxc-ski")

	dir, err := d.registryDir()
	if err != nil {
		t.Fatalf("registryDir: %v", err)
	}
	ackPath := filepath.Join(dir, "not-a-site-a1b2c3.json")
	writeAckFile(t, ackPath, ackFileEntry{CheckID: "deploy", Expires: "2026-10-01"})

	out, _, err := execTree(t, d, "sites", "list", "--ack-file", ackPath)
	if err != nil {
		t.Fatalf("sites list --ack-file: %v", err)
	}
	if !strings.Contains(out, "ecxc.ski") {
		t.Errorf("listing %q does not name the real site", out)
	}
	if strings.Contains(out, "not-a-site") {
		t.Errorf("listing %q names the acknowledgement file as a site", out)
	}
	if *code != int(spine.VerdictOK) {
		t.Errorf("exit code = %d, want %d (OK)", *code, int(spine.VerdictOK))
	}
}

// unresolvedSiteFailingChecks is every check id the fixture transport (all 404, no DNS, no
// credentials) fails deterministically on a freshly adopted site with no CF or GH credentials:
// serving's marker never matches, and email finds no DKIM record.
var unresolvedSiteFailingChecks = []string{"serving=2099-01-01", "email=2099-01-01"}

// TestHealthAckSoftensAFailingCheckToWarning covers criterion 4: an acknowledged check reads as
// held, not failed, in the plain body, and softens the run's exit code away from CRITICAL, the
// exit arithmetic's own hold semantics (Task 12, Task 18). The fixture also carries several
// cred-missing checks that report UNKNOWN regardless of any acknowledgement, since --ack softens
// only a Failing check to WARNING (CheckVerdict.Verdict), so the run's own worst-of arithmetic
// still reports UNKNOWN once every Failing check is held; what this test pins is that CRITICAL,
// the more severe of the two, disappears once every failing check carries an acknowledgement.
func TestHealthAckSoftensAFailingCheckToWarning(t *testing.T) {
	d, code := testDeps(t)
	writeTestRecord(t, d, "ecxc-ski-a1b2c3", "ecxc.ski", "ecxc-ski")

	if _, _, err := execTree(t, d, "health", "ecxc-ski-a1b2c3"); err != nil {
		t.Fatalf("cairn health: %v", err)
	}
	unacked := *code
	if unacked != int(spine.VerdictCritical) {
		t.Fatalf("exit code without --ack = %d, want %d (CRITICAL); the fixture no longer fails deterministically", unacked, int(spine.VerdictCritical))
	}

	args := []string{"health", "ecxc-ski-a1b2c3"}
	for _, ack := range unresolvedSiteFailingChecks {
		args = append(args, "--ack", ack)
	}
	stdout, _, err := execTree(t, d, args...)
	if err != nil {
		t.Fatalf("cairn health --ack: %v", err)
	}
	if *code == int(spine.VerdictCritical) {
		t.Errorf("exit code with every failing check acknowledged is still %d (CRITICAL)", *code)
	}
	if strings.Contains(stdout, "\tfail\t") {
		t.Errorf("body %q still names a failed check once every failure carries an acknowledgement", stdout)
	}
	for _, checkID := range []string{"serving", "email"} {
		if !strings.Contains(stdout, "held\t"+checkID) {
			t.Errorf("body %q does not read %s as held", stdout, checkID)
		}
	}
}

// TestHealthAckAppliesAcrossEverySiteInASweep covers criterion 5 directly over a bare sweep of
// two sites: the same acknowledgements read both sites' matching checks as held, because a check
// id is not site-scoped.
func TestHealthAckAppliesAcrossEverySiteInASweep(t *testing.T) {
	d, code := testDeps(t)
	writeTestRecord(t, d, "site-alpha-aaaaaa", "alpha.example", "alpha")
	writeTestRecord(t, d, "site-bravo-bbbbbb", "bravo.example", "bravo")

	if _, _, err := execTree(t, d, "health"); err != nil {
		t.Fatalf("cairn health: %v", err)
	}
	if *code != int(spine.VerdictCritical) {
		t.Fatalf("exit code without --ack = %d, want %d (CRITICAL)", *code, int(spine.VerdictCritical))
	}

	args := []string{"health"}
	for _, ack := range unresolvedSiteFailingChecks {
		args = append(args, "--ack", ack)
	}
	stdout, _, err := execTree(t, d, args...)
	if err != nil {
		t.Fatalf("cairn health --ack: %v", err)
	}
	if *code == int(spine.VerdictCritical) {
		t.Errorf("exit code with every failing check acknowledged is still %d (CRITICAL)", *code)
	}
	if strings.Count(stdout, "held\tserving") != 2 {
		t.Errorf("body %q does not read serving as held on both sites", stdout)
	}
}

// TestHealthAckFileEntriesApply covers the file half end to end: entries in the resolved
// --ack-file, with no --ack flag at all, read the same failing checks as held.
func TestHealthAckFileEntriesApply(t *testing.T) {
	d, code := testDeps(t)
	writeTestRecord(t, d, "ecxc-ski-a1b2c3", "ecxc.ski", "ecxc-ski")

	dir, err := d.registryDir()
	if err != nil {
		t.Fatalf("registryDir: %v", err)
	}
	writeAckFile(t, filepath.Join(dir, defaultAckFileName),
		ackFileEntry{CheckID: "serving", Expires: "2099-01-01"},
		ackFileEntry{CheckID: "email", Expires: "2099-01-01"},
	)

	stdout, _, err := execTree(t, d, "health", "ecxc-ski-a1b2c3")
	if err != nil {
		t.Fatalf("cairn health: %v", err)
	}
	if *code == int(spine.VerdictCritical) {
		t.Errorf("exit code with a default ack file is still %d (CRITICAL)", *code)
	}
	for _, checkID := range []string{"serving", "email"} {
		if !strings.Contains(stdout, "held\t"+checkID) {
			t.Errorf("body %q does not read %s as held", stdout, checkID)
		}
	}
}
