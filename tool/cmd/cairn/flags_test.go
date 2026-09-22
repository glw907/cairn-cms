package main

import (
	"encoding/json"
	"flag"
	"maps"
	"os"
	"path/filepath"
	"slices"
	"testing"

	"github.com/glw907/cairn-cms/tool/internal/providers"
	"github.com/spf13/cobra"
	"github.com/spf13/pflag"
)

// updateFlags rewrites the committed flag list from the tree this build carries. `make -C tool
// flags` sets it; a plain run compares instead, so a flag added, renamed, or removed without
// that step fails rather than drifting away from the file the docs gate reads.
var updateFlags = flag.Bool("update", false, "rewrite testdata/flags.json from the command tree")

// flagsTarget is the make target that writes the committed list. Every failure below names it,
// and the file carries it, so a reader learns the fix without opening this test.
const flagsTarget = "make -C tool flags"

// flagsPath is the committed list's path from the repository root. It is resolved through
// providers.RepoRoot rather than climbing out of this package, and it sits at the root rather
// than beside this file because its reader outside Go, scripts/checks/check-symbols.mjs, finds
// it from the root too.
const flagsPath = "tool/testdata/flags.json"

// flagList is testdata/flags.json's shape.
type flagList struct {
	// Target is the make target that writes the file, carried in the file itself so an operator
	// reading it in a diff sees how it is regenerated.
	Target string `json:"target"`
	// Flags holds every long flag name the command tree accepts, each with its two dashes,
	// deduplicated and sorted. Shorthands are left out: the one reader outside Go matches a
	// `--long-name` in a documented command line, and a shorthand cannot be told apart from a
	// negative number or a path fragment there.
	Flags []string `json:"flags"`
}

// treeFlags returns every long flag name below root, persistent and local, deduplicated and
// sorted. Each command's default help flag is registered first: cobra adds it while executing,
// so a list built from an unexecuted tree would omit a flag every command really accepts.
func treeFlags(root *cobra.Command) []string {
	names := map[string]struct{}{}
	var walk func(c *cobra.Command)
	walk = func(c *cobra.Command) {
		c.InitDefaultHelpFlag()
		for _, set := range []*pflag.FlagSet{c.LocalFlags(), c.InheritedFlags()} {
			set.VisitAll(func(f *pflag.Flag) { names["--"+f.Name] = struct{}{} })
		}
		for _, child := range c.Commands() {
			walk(child)
		}
	}
	walk(root)
	return slices.Sorted(maps.Keys(names))
}

// TestCommittedFlagListMatchesTheCommandTree holds testdata/flags.json to the tree. The file is
// the flag vocabulary docs prose is checked against (scripts/checks/check-symbols.mjs accepts a
// `--flag` in a shell fence only when this file or create-cairn-site carries it), so a stale
// file either rejects a real flag a page names or accepts one the tool dropped.
func TestCommittedFlagListMatchesTheCommandTree(t *testing.T) {
	root, err := providers.RepoRoot()
	if err != nil {
		t.Fatalf("providers.RepoRoot: %v", err)
	}
	path := filepath.Join(root, flagsPath)
	want := flagList{Target: flagsTarget, Flags: treeFlags(newRootCmd(mustDeps(t)))}

	if *updateFlags {
		data, err := json.MarshalIndent(want, "", "  ")
		if err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, append(data, '\n'), 0o644); err != nil {
			t.Fatal(err)
		}
		return
	}

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("%v; run %s", err, flagsTarget)
	}
	var got flagList
	if err := json.Unmarshal(data, &got); err != nil {
		t.Fatalf("%s: %v; run %s", flagsPath, err, flagsTarget)
	}
	if got.Target != flagsTarget {
		t.Errorf("%s names target %q, want %q; run %s", flagsPath, got.Target, flagsTarget, flagsTarget)
	}
	for _, name := range want.Flags {
		if !slices.Contains(got.Flags, name) {
			t.Errorf("%s does not list %s, which the command tree carries; run %s", flagsPath, name, flagsTarget)
		}
	}
	for _, name := range got.Flags {
		if !slices.Contains(want.Flags, name) {
			t.Errorf("%s lists %s, which the command tree does not carry; run %s", flagsPath, name, flagsTarget)
		}
	}
	if !slices.IsSorted(got.Flags) {
		t.Errorf("%s is not sorted; run %s", flagsPath, flagsTarget)
	}
}
