package main

import (
	"os"
	"os/exec"
	"path/filepath"
	"slices"
	"strings"
	"testing"
)

// wantPages is the man page cairn's 1.0 grammar ships one of for: every non-hidden command in
// cmd/cairn's own tree (cmd/cairn/coverage_test.go's TestEveryActionCoverage pins the same set on
// the live command tree; this list is this package's own copy since cmd/mangen cannot import
// cmd/cairn, a package main, to read the tree directly).
var wantPages = []string{
	"cairn.1",
	"cairn-sites.1",
	"cairn-sites-list.1",
	"cairn-health.1",
	"cairn-doctor.1",
	"cairn-logs.1",
	"cairn-adopt.1",
	"cairn-adopt-list.1",
	"cairn-auth.1",
	"cairn-auth-set.1",
	"cairn-auth-list.1",
	"cairn-auth-unset.1",
	"cairn-auth-check.1",
	"cairn-agents.1",
	"cairn-completion.1",
	"cairn-help.1",
}

// TestGeneratedPageNamesEveryNonHiddenCommand runs mangen against a freshly built cairn and
// asserts a page exists for every one of wantPages, and that no other file appears: cairn auth
// probe is hidden and must not surface here even though it resolves in the real tree.
func TestGeneratedPageNamesEveryNonHiddenCommand(t *testing.T) {
	bin, cleanup, err := buildCairn()
	if err != nil {
		t.Fatalf("buildCairn: %v", err)
	}
	t.Cleanup(cleanup)

	dir := t.TempDir()
	if err := run(bin, dir); err != nil {
		t.Fatalf("run: %v", err)
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatalf("read %s: %v", dir, err)
	}
	var got []string
	for _, e := range entries {
		got = append(got, e.Name())
	}

	for _, want := range wantPages {
		if !slices.Contains(got, want) {
			t.Errorf("%s was not generated; got %v", want, got)
		}
	}
	if len(got) != len(wantPages) {
		t.Errorf("generated %d pages %v, want exactly %v", len(got), got, wantPages)
	}

	for _, name := range []string{"cairn-auth-probe.1", "cairn-completion-bash.1"} {
		if slices.Contains(got, name) {
			t.Errorf("%s was generated; it is hidden or a cobra-internal leaf this grammar does not document", name)
		}
	}
}

// TestGeneratedPageCarriesEachFlagsOwnType renders cairn-health.1 and reads the flag block back:
// every harvested flag is reconstructed in the type the real binary declares, so a switch prints
// as a switch and a duration as a duration. Registering them all as strings printed
// `--quiet=""` for a boolean, in the artefact the release archive ships.
func TestGeneratedPageCarriesEachFlagsOwnType(t *testing.T) {
	bin, cleanup, err := buildCairn()
	if err != nil {
		t.Fatalf("buildCairn: %v", err)
	}
	t.Cleanup(cleanup)

	dir := t.TempDir()
	if err := run(bin, dir); err != nil {
		t.Fatalf("run: %v", err)
	}
	data, err := os.ReadFile(filepath.Join(dir, "cairn-health.1"))
	if err != nil {
		t.Fatalf("read cairn-health.1: %v", err)
	}
	page := string(data)

	// The rendered form is pflag's own: a bool prints "[=false]", a valued flag "=<zero>".
	for flag, want := range map[string]string{
		`--quiet`:   `[=false]`,
		`--json`:    `[=false]`,
		`--verbose`: `[=false]`,
		`--version`: `[=false]`,
		`--timeout`: `=0s`,
		`--width`:   `=0`,
		`--color`:   `=""`,
	} {
		if got := `\fB` + flag + `\fP` + want; !strings.Contains(page, got) {
			t.Errorf("cairn-health.1 does not render %s as %s", flag, got)
		}
	}
}

// TestCmdCairnImportsNoCobraDoc asserts cmd/cairn never imports cobra/doc: it pulls go-md2man
// and blackfriday, and a generator living in cmd/cairn would link both into every operator's
// binary for a file it never reads. This is why mangen is a second command.
func TestCmdCairnImportsNoCobraDoc(t *testing.T) {
	entries, err := os.ReadDir(filepath.Join("..", "cairn"))
	if err != nil {
		t.Fatalf("read cmd/cairn: %v", err)
	}
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".go") {
			continue
		}
		data, err := os.ReadFile(filepath.Join("..", "cairn", e.Name()))
		if err != nil {
			t.Fatalf("read %s: %v", e.Name(), err)
		}
		if strings.Contains(string(data), "spf13/cobra/doc") {
			t.Errorf("cmd/cairn/%s imports cobra/doc; the man generator belongs to cmd/mangen alone", e.Name())
		}
	}
}

// TestRootShortMatchesMessagesSource pins rootShort against cmd/cairn/messages.go's own
// shortRoot constant, the one field discover cannot harvest from --help text: nothing lists a
// root's own Short the way a parent's listing names each child's.
func TestRootShortMatchesMessagesSource(t *testing.T) {
	data, err := os.ReadFile(filepath.Join("..", "cairn", "messages.go"))
	if err != nil {
		t.Fatalf("read cmd/cairn/messages.go: %v", err)
	}
	want := `shortRoot = "` + rootShort + `"`
	if !strings.Contains(string(data), want) {
		t.Errorf("cmd/cairn/messages.go does not declare %s; rootShort has drifted from shortRoot", want)
	}
}

// TestGeneratedFileIsGitIgnored asserts the rendered man tree is a build artefact, not a
// committed one.
func TestGeneratedFileIsGitIgnored(t *testing.T) {
	moduleDir := moduleRoot()
	// The probe sits in its own subdirectory and only that subdirectory is removed: man/ itself
	// holds an operator's generated pages after `make man`, and a test run must not delete them.
	probeDir := filepath.Join(moduleDir, "man", "ignore-probe")
	probe := filepath.Join(probeDir, "cairn.1")
	if err := os.MkdirAll(probeDir, 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	if err := os.WriteFile(probe, []byte("probe"), 0o644); err != nil {
		t.Fatalf("write probe file: %v", err)
	}
	t.Cleanup(func() { _ = os.RemoveAll(probeDir) })

	cmd := exec.Command("git", "check-ignore", "-q", probe)
	cmd.Dir = moduleDir
	if err := cmd.Run(); err != nil {
		t.Errorf("git check-ignore %s: %v; add tool/man/ to .gitignore", probe, err)
	}
}
