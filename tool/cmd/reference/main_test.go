package main

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

// pagePath resolves the committed reference page from this file, so the test finds it from any
// working directory.
func pagePath(t *testing.T) string {
	t.Helper()
	_, thisFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve this file's path")
	}
	return filepath.Join(filepath.Dir(thisFile), "..", "..", "docs", "setup-reference.md")
}

// TestPageMatchesTheCode fails when the committed page and a fresh render disagree, which is
// what a hand edit to the page or a change to the code without `make reference` looks like.
func TestPageMatchesTheCode(t *testing.T) {
	got, err := render()
	if err != nil {
		t.Fatalf("render: %v", err)
	}
	want, err := os.ReadFile(pagePath(t))
	if err != nil {
		t.Fatalf("read the page: %v", err)
	}
	if got != string(want) {
		t.Errorf("docs/setup-reference.md does not match the code; run `make -C tool reference` and commit the diff")
	}
}

// TestRenderCarriesEveryPart holds the page to what it promises: a flag, a derived name, a
// step, an event kind, a waiting state, and an exit code.
func TestRenderCarriesEveryPart(t *testing.T) {
	got, err := render()
	if err != nil {
		t.Fatalf("render: %v", err)
	}
	for _, want := range []string{
		"`--site-theme`", "`my-site-auth`", "`first-deploy`", "`step_failed`",
		"`reconsent-cloudflare`", "| 3 |", "`cairn-my-site`",
	} {
		if !strings.Contains(got, want) {
			t.Errorf("the page does not carry %s", want)
		}
	}
}
