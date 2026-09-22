package store

import (
	"os"
	"testing"

	"github.com/glw907/cairn-cms/tool/internal/record"
)

// writeDiscoverFixture saves a record whose GitHub repository Discover can read, so a test does
// not have to hand-build the record's JSON shape.
func writeDiscoverFixture(t *testing.T, dir, id, owner, repo string) {
	t.Helper()
	s, err := Open(dir)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	r := record.Record{
		Name: id,
		GitHub: record.GitHub{
			Repo: record.GitHubRepo{Owner: owner, Repo: repo},
		},
	}
	if err := s.Save(id, r); err != nil {
		t.Fatalf("Save %s: %v", id, err)
	}
}

// TestDiscoverListsKnownRepositoriesInOrder asserts Discover returns exactly the sites carrying a
// GitHub repository, in the same order List does.
func TestDiscoverListsKnownRepositoriesInOrder(t *testing.T) {
	dir := t.TempDir()
	if err := os.Chmod(dir, 0o700); err != nil {
		t.Fatalf("chmod dir: %v", err)
	}
	writeDiscoverFixture(t, dir, "site-bravo-bbbbbb", "glw907", "bravo-repo")
	writeDiscoverFixture(t, dir, "site-alpha-aaaaaa", "glw907", "alpha-repo")

	sites, err := Discover(dir)
	if err != nil {
		t.Fatalf("Discover: %v", err)
	}
	if len(sites) != 2 {
		t.Fatalf("Discover returned %d sites, want 2", len(sites))
	}
	// site-alpha-aaaaaa's record carries Name "site-alpha-aaaaaa", which sorts before
	// site-bravo-bbbbbb's, matching List's own Name-then-id order.
	if sites[0].ID != "site-alpha-aaaaaa" || sites[1].ID != "site-bravo-bbbbbb" {
		t.Errorf("Discover order = %v, want alpha before bravo", sites)
	}
	if sites[0].Owner != "glw907" || sites[0].Repo != "alpha-repo" {
		t.Errorf("Discover()[0] = %+v, want owner glw907, repo alpha-repo", sites[0])
	}
}

// TestDiscoverSkipsARecordWithNoRepository asserts a record that has not yet been adopted, and
// so carries no GitHub repository, contributes nothing a token probe could check.
func TestDiscoverSkipsARecordWithNoRepository(t *testing.T) {
	dir := t.TempDir()
	if err := os.Chmod(dir, 0o700); err != nil {
		t.Fatalf("chmod dir: %v", err)
	}
	s, err := Open(dir)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	if err := s.Save("site-none-aaaaaa", record.Record{Name: "site-none-aaaaaa"}); err != nil {
		t.Fatalf("Save: %v", err)
	}
	writeDiscoverFixture(t, dir, "site-known-bbbbbb", "glw907", "known-repo")

	sites, err := Discover(dir)
	if err != nil {
		t.Fatalf("Discover: %v", err)
	}
	if len(sites) != 1 || sites[0].ID != "site-known-bbbbbb" {
		t.Errorf("Discover() = %v, want only site-known-bbbbbb", sites)
	}
}

// TestDiscoverReportsAMalformedRecord asserts a registry the store cannot list in full is an
// error, matching discoverSites' old behaviour before the move.
func TestDiscoverReportsAMalformedRecord(t *testing.T) {
	dir := t.TempDir()
	if err := os.Chmod(dir, 0o700); err != nil {
		t.Fatalf("chmod dir: %v", err)
	}
	if err := os.WriteFile(dir+"/site-broken-aaaaaa.json", []byte("not json"), 0o600); err != nil {
		t.Fatalf("write malformed record: %v", err)
	}

	if _, err := Discover(dir); err == nil {
		t.Fatal("Discover succeeded over a registry holding a malformed record; want an error")
	}
}
