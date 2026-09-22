package main

import (
	"regexp"
	"slices"
	"testing"

	"github.com/spf13/cobra"
)

// flagNamePattern matches a long flag name at the start of a pflag usage line. None of this
// package's flag help text contains "--" itself (checked by inspection), so one match per line
// is exact; this is how the test enumerates a command's own flags without importing
// github.com/spf13/pflag, which every other file in this package avoids naming directly so it
// stays an indirect requirement `go mod tidy` never promotes.
var flagNamePattern = regexp.MustCompile(`--([a-zA-Z][a-zA-Z0-9-]*)`)

// coveragePaths walks root and returns every command's own CommandPath, one entry per node.
// cobra's own completion and help subtrees are named at their own top level but not descended
// into: their children are cobra's to shape, not this grammar's to enumerate.
func coveragePaths(root *cobra.Command) []string {
	var paths []string
	var walk func(c *cobra.Command)
	walk = func(c *cobra.Command) {
		paths = append(paths, c.CommandPath())
		if c.Name() == "completion" || c.Name() == "help" {
			return
		}
		for _, sub := range c.Commands() {
			walk(sub)
		}
	}
	walk(root)
	return paths
}

// initHelpFlags calls InitDefaultHelpFlag on c and every command it walks, since cobra only
// adds -h/--help lazily to whichever command is actually executing.
func initHelpFlags(c *cobra.Command) {
	c.InitDefaultHelpFlag()
	for _, sub := range c.Commands() {
		initHelpFlags(sub)
	}
}

// TestEveryActionCoverage is the 1.0 grammar's own coverage assertion: the exact command set,
// the exact flag set per command, and the root's own persistent flags. A command or a flag this
// test does not name is a grammar change no other test would catch.
func TestEveryActionCoverage(t *testing.T) {
	root := newRootCmd(mustDeps(t))
	root.InitDefaultHelpCmd()
	root.InitDefaultCompletionCmd()
	initHelpFlags(root)

	wantPaths := []string{
		"cairn",
		"cairn sites",
		"cairn sites list",
		"cairn health",
		"cairn doctor",
		"cairn logs",
		"cairn adopt",
		"cairn adopt list",
		"cairn auth",
		"cairn auth set",
		"cairn auth list",
		"cairn auth unset",
		"cairn auth check",
		"cairn auth probe",
		"cairn agents",
		"cairn completion",
		"cairn help",
	}
	slices.Sort(wantPaths)

	got := coveragePaths(root)
	slices.Sort(got)

	if !slices.Equal(got, wantPaths) {
		t.Errorf("command set = %v, want %v", got, wantPaths)
	}

	// The root's own persistent flags. --ack-file is declared here even though only health
	// reads it, since an operator can type it before any subcommand.
	assertOwnFlags(t, root, "timeout", "verbose", "quiet", "color", "theme", "width", "ack-file", "version", "help")

	byPath := map[string]*cobra.Command{}
	for _, c := range []*cobra.Command{root} {
		collectByPath(c, byPath)
	}
	// json and expect-sites are declared on the sites parent's own PersistentFlags, so bare
	// cairn sites and cairn sites list share them; only the parent claims them as local, and the
	// list subcommand inherits them (cairn sites list --help lists them under "Global Flags").
	assertOwnFlags(t, byPath["cairn sites"], "json", "expect-sites", "help")
	assertOwnFlags(t, byPath["cairn sites list"], "help")
	assertOwnFlags(t, byPath["cairn health"], "json", "error-threshold", "since", "ack", "help")
	assertOwnFlags(t, byPath["cairn doctor"], "json", "help")
	assertOwnFlags(t, byPath["cairn logs"], "event", "since", "json", "help")
	assertOwnFlags(t, byPath["cairn adopt"], "worker", "repo", "domain", "help")
	// adopt list's --json is declared on the list subcommand itself, unlike sites list's.
	assertOwnFlags(t, byPath["cairn adopt list"], "json", "help")
	assertOwnFlags(t, byPath["cairn auth check"], "json", "help")

	if byPath["cairn auth check"].Hidden {
		t.Error("cairn auth check is Hidden; it must appear in --help")
	}
	if !byPath["cairn auth probe"].Hidden {
		t.Error("cairn auth probe is not Hidden; it must stay a hidden alias of auth check")
	}
}

// collectByPath indexes c and every descendant it walks (the same rule coveragePaths follows)
// by CommandPath.
func collectByPath(c *cobra.Command, into map[string]*cobra.Command) {
	into[c.CommandPath()] = c
	if c.Name() == "completion" || c.Name() == "help" {
		return
	}
	for _, sub := range c.Commands() {
		collectByPath(sub, into)
	}
}

// assertOwnFlags asserts c's local flag set holds exactly want, by long name.
func assertOwnFlags(t *testing.T, c *cobra.Command, want ...string) {
	t.Helper()
	if c == nil {
		t.Fatalf("command not found")
	}
	var got []string
	for _, m := range flagNamePattern.FindAllStringSubmatch(c.LocalFlags().FlagUsages(), -1) {
		got = append(got, m[1])
	}
	slices.Sort(got)
	wantSorted := slices.Clone(want)
	slices.Sort(wantSorted)
	if !slices.Equal(got, wantSorted) {
		t.Errorf("%s local flags = %v, want %v", c.CommandPath(), got, wantSorted)
	}
}

// TestVerbsDeliberatelyAbsentIn1_0 pins the three verbs the 2026-08-20 spec names for 2.0: the
// TUI launch, the interactive adopt dialog, and the concurrent sweep. None has a command, a
// flag, or a positional shape in 1.0's tree.
func TestVerbsDeliberatelyAbsentIn1_0(t *testing.T) {
	root := newRootCmd(mustDeps(t))

	if found, rest, err := root.Find([]string{"tui"}); err == nil && len(rest) == 0 {
		t.Errorf("cairn tui resolves, to %q; the TUI launch is 2.0's", found.Name())
	}

	adopt, _, err := root.Find([]string{"adopt"})
	if err != nil {
		t.Fatalf("Find(adopt): %v", err)
	}
	if adopt.Flags().Lookup("interactive") != nil {
		t.Error("cairn adopt carries --interactive; the interactive adopt dialog is 2.0's")
	}

	health, _, err := root.Find([]string{"health"})
	if err != nil {
		t.Fatalf("Find(health): %v", err)
	}
	for _, name := range []string{"concurrent", "parallel"} {
		if health.Flags().Lookup(name) != nil {
			t.Errorf("cairn health carries --%s; the concurrent sweep is 2.0's", name)
		}
	}
}
