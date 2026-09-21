package main

import (
	"bytes"
	"errors"
	"io/fs"
	"os"
	"path/filepath"
	"slices"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/store"
	"github.com/spf13/cobra"
)

// fixedNow is the clock every command test runs against, so a replayed run settles against the
// same instant.
func fixedNow() time.Time {
	return time.Date(2026, 9, 20, 12, 0, 0, 0, time.UTC)
}

// testDeps returns a dependency set wired entirely to fakes: an empty environment, a keyring
// holding nothing, a transport that answers 404 for every path, a fresh registry directory, a
// prompt that refuses, and an exit that records instead of ending the process.
func testDeps(t *testing.T) (deps, *int) {
	t.Helper()
	dir := t.TempDir()
	// The store refuses a registry directory readable beyond its owner, and t.TempDir's own
	// mode depends on the runner's umask.
	if err := os.Chmod(dir, 0o700); err != nil {
		t.Fatalf("chmod %s: %v", dir, err)
	}
	code := new(int)
	return deps{
		env:            fakeEnv(nil),
		keyring:        fakeProvider{name: "keyring"},
		keyringWriter:  &fakeWriter{},
		keyringDeleter: &fakeDeleter{},
		keyringStatus:  func(string) (bool, error) { return false, nil },
		transport:      routeRoundTripper{},
		registryDir:    func() (string, error) { return dir, nil },
		registrySource: func() (string, store.Source, error) { return dir, store.SourceUserConfig, nil },
		now:            fixedNow,
		readPassword:   fakeReadPassword("", errors.New("no terminal")),
		exit:           func(c int) { *code = c },
	}, code
}

// execTree runs the whole command tree over args and returns what it wrote to each stream.
func execTree(t *testing.T, d deps, args ...string) (stdout, stderr string, err error) {
	t.Helper()
	var out, errOut bytes.Buffer
	cmd := newRootCmd(d)
	cmd.SetOut(&out)
	cmd.SetErr(&errOut)
	cmd.SetArgs(args)
	err = cmd.Execute()
	return out.String(), errOut.String(), err
}

// walkCommands visits root and every command beneath it.
func walkCommands(root *cobra.Command, visit func(*cobra.Command)) {
	visit(root)
	for _, c := range root.Commands() {
		walkCommands(c, visit)
	}
}

// boundShorthandNames returns the long name of every flag on c, local or persistent, that
// claims the shorthand short.
func boundShorthandNames(c *cobra.Command, short string) []string {
	var names []string
	if f := c.Flags().ShorthandLookup(short); f != nil {
		names = append(names, f.Name)
	}
	if f := c.PersistentFlags().ShorthandLookup(short); f != nil {
		names = append(names, f.Name)
	}
	return names
}

// toolGoFiles returns every non-test Go file under the module, relative to the module root,
// which is one directory above this package.
func toolGoFiles(t *testing.T) []string {
	t.Helper()
	root := filepath.Join("..", "..")
	var files []string
	err := filepath.WalkDir(root, func(path string, entry fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if entry.IsDir() {
			return nil
		}
		name := entry.Name()
		if !strings.HasSuffix(name, ".go") || strings.HasSuffix(name, "_test.go") {
			return nil
		}
		rel, relErr := filepath.Rel(root, path)
		if relErr != nil {
			return relErr
		}
		files = append(files, filepath.ToSlash(rel))
		return nil
	})
	if err != nil {
		t.Fatalf("walk %s: %v", root, err)
	}
	return files
}

// readToolFile reads one module-relative path the walk returned.
func readToolFile(t *testing.T, rel string) string {
	t.Helper()
	data, err := os.ReadFile(filepath.Join("..", "..", filepath.FromSlash(rel)))
	if err != nil {
		t.Fatalf("read %s: %v", rel, err)
	}
	return string(data)
}

// TestGrammarResolvesEveryCommandAndAlias covers the 2026-09-20 grammar: sites list with bare
// sites as its alias, adopt list as its own subcommand, and auth probe in place of the old
// top-level probe-token.
func TestGrammarResolvesEveryCommandAndAlias(t *testing.T) {
	d, _ := testDeps(t)

	resolves := [][]string{
		{"sites"},
		{"sites", "list"},
		{"health"},
		{"logs"},
		{"adopt"},
		{"adopt", "list"},
		{"auth"},
		{"auth", "set"},
		{"auth", "list"},
		{"auth", "probe"},
	}
	for _, path := range resolves {
		t.Run(strings.Join(path, " "), func(t *testing.T) {
			found, rest, err := newRootCmd(d).Find(path)
			if err != nil {
				t.Fatalf("Find(%v) = %v", path, err)
			}
			if len(rest) != 0 {
				t.Errorf("Find(%v) left %v unconsumed; the command did not resolve", path, rest)
			}
			if found.Name() != path[len(path)-1] {
				t.Errorf("Find(%v) resolved to %q", path, found.Name())
			}
		})
	}

	t.Run("probe-token no longer resolves", func(t *testing.T) {
		found, rest, err := newRootCmd(d).Find([]string{"probe-token"})
		if err == nil && len(rest) == 0 {
			t.Fatalf("probe-token still resolves, to %q", found.Name())
		}
	})
}

// TestBareSitesPrintsTheSameListingAsSitesList pins the alias to the subcommand it stands for:
// the two are one body, so a change to the listing cannot reach only one of them.
func TestBareSitesPrintsTheSameListingAsSitesList(t *testing.T) {
	d, _ := testDeps(t)
	writeTestRecord(t, d, "ecxc-ski-a1b2c3", "ecxc.ski", "ecxc-ski")

	bare, _, err := execTree(t, d, "sites")
	if err != nil {
		t.Fatalf("cairn sites: %v", err)
	}
	explicit, _, err := execTree(t, d, "sites", "list")
	if err != nil {
		t.Fatalf("cairn sites list: %v", err)
	}
	if bare != explicit {
		t.Errorf("cairn sites printed %q, cairn sites list printed %q", bare, explicit)
	}
	if !strings.Contains(bare, "ecxc.ski") {
		t.Errorf("listing %q does not name the registered site", bare)
	}
}

// TestAdoptRejectsTheOldListModeFlag asserts the mode flag the grammar cleanup replaced is not
// quietly accepted and ignored, which would run the writing path on an operator asking to look.
func TestAdoptRejectsTheOldListModeFlag(t *testing.T) {
	d, _ := testDeps(t)
	_, _, err := execTree(t, d, "adopt", "--list")
	if err == nil {
		t.Fatal("adopt --list was accepted; it must be an unknown flag")
	}
	if !strings.Contains(err.Error(), "unknown flag") {
		t.Errorf("adopt --list failed with %q, want an unknown-flag error", err)
	}
}

// TestEveryNonHiddenRootCommandDeclaresAGroup asserts cairn --help reads as three groups. Only
// the root declares groups, so only its own children carry a GroupID.
func TestEveryNonHiddenRootCommandDeclaresAGroup(t *testing.T) {
	root := newRootCmd(mustDeps(t))
	root.InitDefaultHelpCmd()
	root.InitDefaultCompletionCmd()

	members := map[string]int{}
	for _, c := range root.Commands() {
		if c.Hidden {
			continue
		}
		if c.GroupID == "" {
			t.Errorf("%s declares no GroupID; cairn --help would list it outside every group", c.Name())
			continue
		}
		members[c.GroupID]++
	}
	for _, g := range root.Groups() {
		if members[g.ID] == 0 {
			t.Errorf("group %q has no member; an empty heading would print", g.ID)
		}
	}
}

// TestSilenceUsageAndSilenceErrorsAreSetInOneFile asserts each field is named once, on the
// root. Cobra inherits both from the nearest ancestor, so a repeat on a subcommand is dead
// weight that drifts out of step with the root.
func TestSilenceUsageAndSilenceErrorsAreSetInOneFile(t *testing.T) {
	for _, field := range []string{"SilenceUsage", "SilenceErrors"} {
		var naming []string
		for _, rel := range toolGoFiles(t) {
			if !strings.HasPrefix(rel, "cmd/cairn/") {
				continue
			}
			if strings.Contains(readToolFile(t, rel), field+":") {
				naming = append(naming, rel)
			}
		}
		if len(naming) != 1 || naming[0] != "cmd/cairn/root.go" {
			t.Errorf("%s is set in %v, want cmd/cairn/root.go alone", field, naming)
		}
	}
}

// TestOnlyMainNamesTheProcessStreams asserts every command writes through the writer main
// obtains, which is what lets the credential scrubber wrap the streams in one place, and ends
// the process through the injected exit rather than reaching os.Exit itself.
//
// os.Exit is allowed in deps.go as well, where it is the exit field's own production default.
// Nothing else in the tree may call it: a command that does skips main's flush, which loses the
// last unterminated line the scrubber is holding.
func TestOnlyMainNamesTheProcessStreams(t *testing.T) {
	names := map[string][]string{
		"os.Stdout": {"cmd/cairn/main.go"},
		"os.Stderr": {"cmd/cairn/main.go"},
		"os.Exit":   {"cmd/cairn/main.go", "cmd/cairn/deps.go"},
	}
	for _, rel := range toolGoFiles(t) {
		if !strings.HasPrefix(rel, "cmd/cairn/") {
			continue
		}
		body := readToolFile(t, rel)
		for name, allowed := range names {
			if slices.Contains(allowed, rel) || !strings.Contains(body, name) {
				continue
			}
			t.Errorf("%s names %s; reach it through cmd.OutOrStdout, cmd.ErrOrStderr, or deps.exit instead", rel, name)
		}
	}
}

// TestOnlyCmdCairnImportsLogx asserts the scrubbing writer stays a property of the process's own
// streams. A package under internal that wrapped its own output in it would scrub twice and buffer
// a second time, and the architecture's downward order puts logx at the top.
func TestOnlyCmdCairnImportsLogx(t *testing.T) {
	const path = "github.com/glw907/cairn-cms/tool/internal/logx"

	for _, rel := range toolGoFiles(t) {
		if strings.HasPrefix(rel, "cmd/cairn/") || strings.HasPrefix(rel, "internal/logx/") {
			continue
		}
		if strings.Contains(readToolFile(t, rel), path) {
			t.Errorf("%s imports logx; the scrub belongs to the process streams cmd/cairn owns", rel)
		}
	}
}

// TestReservedShorthandsBindOnlyTheirOwnFlags covers the four shorthands the Monitoring Plugins
// development guidelines reserve, whose exit codes this tool already follows.
func TestReservedShorthandsBindOnlyTheirOwnFlags(t *testing.T) {
	reserved := map[string]string{"v": "verbose", "t": "timeout", "V": "version", "q": "quiet"}

	root := newRootCmd(mustDeps(t))
	root.InitDefaultHelpCmd()
	root.InitDefaultCompletionCmd()

	// The two sets are looked up rather than visited so this test needs no pflag import:
	// pflag is an indirect requirement, and naming its types here would promote it to a direct
	// one that `go mod tidy` writes into go.mod.
	seen := map[string]bool{}
	walkCommands(root, func(c *cobra.Command) {
		for short, want := range reserved {
			for _, name := range boundShorthandNames(c, short) {
				if name != want {
					t.Errorf("%s binds -%s to --%s; it is reserved for --%s", c.CommandPath(), short, name, want)
					continue
				}
				seen[short] = true
			}
		}
	})

	for short, long := range reserved {
		if !seen[short] {
			t.Errorf("-%s is not bound to --%s anywhere in the tree", short, long)
		}
	}
}

// TestEveryCommandCarriesAnExample walks the tree cairn builds. Cobra's own help and completion
// commands are generated by the library and are not this tree's to give an example to.
func TestEveryCommandCarriesAnExample(t *testing.T) {
	generated := map[string]bool{"help": true, "completion": true}

	walkCommands(newRootCmd(mustDeps(t)), func(c *cobra.Command) {
		if generated[c.Name()] {
			return
		}
		first, _, _ := strings.Cut(c.Example, "\n")
		if first == "" {
			t.Errorf("%s carries no Example", c.CommandPath())
			return
		}
		if !strings.HasPrefix(first, "cairn ") {
			t.Errorf("%s example starts %q, want a line beginning \"cairn \"", c.CommandPath(), first)
		}
	})
}

// TestBareCairnPrintsHelpOnAPipe asserts the tree's entry point does the same thing whatever it
// is attached to: the run below writes to a buffer, which is what a pipe looks like.
func TestBareCairnPrintsHelpOnAPipe(t *testing.T) {
	d, code := testDeps(t)
	out, _, err := execTree(t, d)
	if err != nil {
		t.Fatalf("bare cairn: %v", err)
	}
	for _, want := range []string{"Usage:", "cairn", "health"} {
		if !strings.Contains(out, want) {
			t.Errorf("help text %q missing %q", out, want)
		}
	}
	if *code != 0 {
		t.Errorf("bare cairn exited %d, want 0", *code)
	}
}

// TestNoTUILaunchPredicateExists pins the 1.0 shape: bare cairn prints help unconditionally, so
// the predicate that would gate a terminal UI is 2.0's and must not ship dead.
func TestNoTUILaunchPredicateExists(t *testing.T) {
	for _, rel := range toolGoFiles(t) {
		if strings.Contains(readToolFile(t, rel), "shouldLaunchTUI") {
			t.Errorf("%s names shouldLaunchTUI; the TUI launch predicate is 2.0's", rel)
		}
	}
}

// TestTerminalChecksAreConfinedToTheColourProfile covers the one permitted TTY check. The
// colour profile is the only thing in 1.0 that may ask what it is attached to; every other
// branch on a terminal is a behaviour an operator cannot reproduce in a pipeline. The echo-off
// password read is the single allowed exception, in auth.go.
func TestTerminalChecksAreConfinedToTheColourProfile(t *testing.T) {
	const profile = "internal/render/profile.go"

	for _, rel := range toolGoFiles(t) {
		body := readToolFile(t, rel)
		for _, call := range []string{"term.IsTerminal", "os.Stdout.Stat()"} {
			if strings.Contains(body, call) && rel != profile {
				t.Errorf("%s names %s; the only terminal check in 1.0 is %s", rel, call, profile)
			}
		}
		if strings.Contains(body, "term.ReadPassword") && rel != "cmd/cairn/auth.go" {
			t.Errorf("%s names term.ReadPassword; the echo-off read belongs to cmd/cairn/auth.go alone", rel)
		}
	}
}

// TestNoCommandFileExceedsItsBound holds cmd/cairn to one concern per file. probe_token.go was
// 475 lines carrying four concerns, which is the growth this bound stops repeating.
//
// messages.go is exempted by name (Task 19c-ii, ratified 2026-09-21): holding every command's
// Short, Long, and Example plus copy-standard.md section 3.8's eight error cases is one concern
// by construction, and splitting the table across files would defeat section 4.1's own point,
// one reviewable place a linter and a human can both read in full.
func TestNoCommandFileExceedsItsBound(t *testing.T) {
	const bound = 300
	for _, rel := range toolGoFiles(t) {
		if !strings.HasPrefix(rel, "cmd/cairn/") || rel == "cmd/cairn/messages.go" {
			continue
		}
		if lines := strings.Count(readToolFile(t, rel), "\n"); lines > bound {
			t.Errorf("%s is %d lines, over the %d-line bound; split it by concern", rel, lines, bound)
		}
	}
}

// TestQuietAndVerboseTogetherIsAUsageErrorNamingBoth asserts the contradiction is refused
// rather than silently resolved in one flag's favour.
func TestQuietAndVerboseTogetherIsAUsageErrorNamingBoth(t *testing.T) {
	d, _ := testDeps(t)
	_, _, err := execTree(t, d, "sites", "list", "--quiet", "--verbose")
	if err == nil {
		t.Fatal("--quiet --verbose was accepted; it must be a usage error")
	}
	for _, name := range []string{"quiet", "verbose"} {
		if !strings.Contains(err.Error(), name) {
			t.Errorf("error %q does not name %q", err, name)
		}
	}
}

// TestColorTakesOnlyItsThreeValues asserts an unrecognised value is refused at the root rather
// than falling through to one of the three by accident.
func TestColorTakesOnlyItsThreeValues(t *testing.T) {
	d, _ := testDeps(t)

	for _, value := range []string{colorAuto, colorAlways, colorNever} {
		if _, _, err := execTree(t, d, "sites", "list", "--color", value); err != nil {
			t.Errorf("--color %s = %v, want nil", value, err)
		}
	}
	if _, _, err := execTree(t, d, "sites", "list", "--color", "maybe"); err == nil {
		t.Error("--color maybe was accepted; only auto, always, and never are values")
	}
}

// TestWidthRejectsValuesOutsideItsBounds asserts --width is validated at the flag, as a usage
// error naming --width, rather than left to the renderer to clamp or panic on. The bounds
// themselves are inclusive, so both ends are accepted rows here.
func TestWidthRejectsValuesOutsideItsBounds(t *testing.T) {
	d, _ := testDeps(t)

	for _, value := range []string{strconv.Itoa(widthMin), "80", strconv.Itoa(widthMax)} {
		if _, _, err := execTree(t, d, "sites", "list", "--width", value); err != nil {
			t.Errorf("--width %s = %v, want nil", value, err)
		}
	}
	for _, value := range []string{"0", "-1", strconv.Itoa(widthMin - 1), strconv.Itoa(widthMax + 1)} {
		_, _, err := execTree(t, d, "sites", "list", "--width", value)
		if err == nil {
			t.Errorf("--width %s was accepted; it must be a usage error", value)
			continue
		}
		if !strings.Contains(err.Error(), "--width") {
			t.Errorf("--width %s: error %q does not name --width", value, err)
		}
	}
}

// mustDeps returns testDeps's dependency set alone, for a test that inspects the tree's shape
// rather than what a run writes.
func mustDeps(t *testing.T) deps {
	t.Helper()
	d, _ := testDeps(t)
	return d
}

// TestOnlyRegistryGoNamesStoreOpen asserts registry.go stays the one path from cmd/cairn into
// the store: a second call site would mean the command that added it grew its own registry walk
// instead of sharing openRegistry.
func TestOnlyRegistryGoNamesStoreOpen(t *testing.T) {
	for _, rel := range toolGoFiles(t) {
		if !strings.HasPrefix(rel, "cmd/cairn/") || rel == "cmd/cairn/registry.go" {
			continue
		}
		if strings.Contains(readToolFile(t, rel), "store.Open(") {
			t.Errorf("%s calls store.Open; open the registry through openRegistry in registry.go instead", rel)
		}
	}
}

// TestProviderConstructorsHaveAProductionCaller asserts providers.NewNPM and providers.NewProbe
// are each named from at least one non-test file, so the two clients buildClients wires stay
// wired rather than becoming dead code a later refactor silently drops.
func TestProviderConstructorsHaveAProductionCaller(t *testing.T) {
	for _, want := range []string{"providers.NewNPM(", "providers.NewProbe("} {
		found := false
		for _, rel := range toolGoFiles(t) {
			if strings.HasPrefix(rel, "cmd/cairn/") && strings.Contains(readToolFile(t, rel), want) {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("%s is named from no non-test file under cmd/cairn", want)
		}
	}
}
