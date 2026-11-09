package main

import (
	"os"
	"testing"
)

// TestAgentPageMatchesTheDocsPage fails when the embedded copy differs from the page it came
// from, so an edit to the page that skips `make agent-guide` cannot ship a stale guide.
func TestAgentPageMatchesTheDocsPage(t *testing.T) {
	want, err := os.ReadFile("../../../docs/admin/set-up-with-an-agent.md")
	if err != nil {
		t.Fatalf("read the docs page: %v", err)
	}
	if agentPage != string(want) {
		t.Fatal("cmd/cairn/set-up-with-an-agent.md differs from docs/admin/set-up-with-an-agent.md; run `make -C tool agent-guide`")
	}
}
