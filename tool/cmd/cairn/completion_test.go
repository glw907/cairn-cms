package main

import (
	"errors"
	"testing"

	"github.com/glw907/cairn-cms/tool/internal/logs"
	"github.com/spf13/cobra"
)

// errRegistryUnavailable stands in for whatever error a real registryDir failure would carry;
// completeSiteIDs never inspects it, so any error proves the no-candidates path.
var errRegistryUnavailable = errors.New("registry unavailable")

// TestCompletionCommandIsPresentAndNotHidden pins cobra's own default completion command:
// keeping it is the whole reason not to hand-roll four shell scripts.
func TestCompletionCommandIsPresentAndNotHidden(t *testing.T) {
	root := newRootCmd(mustDeps(t))
	root.InitDefaultCompletionCmd()

	found, _, err := root.Find([]string{"completion"})
	if err != nil {
		t.Fatalf("Find(completion) = %v", err)
	}
	if found == root || found.Name() != "completion" {
		t.Fatalf("the completion command is not registered; Find returned %q", found.Name())
	}
	if found.Hidden {
		t.Error("the completion command is hidden; cobra's default must stay visible")
	}
}

// TestSiteIDCompletionListsTheRegistry covers completeSiteIDs directly: candidates are the
// registry's own ids, filtered by prefix, with no network involved.
func TestSiteIDCompletionListsTheRegistry(t *testing.T) {
	d, _ := testDeps(t)
	writeTestRecord(t, d, "ecxc-ski-a1b2c3", "ecxc.ski", "ecxc-ski")
	writeTestRecord(t, d, "ninenine-a1b2c3", "907.life", "ninenine")

	complete := completeSiteIDs(d)

	got, directive := complete(nil, nil, "ecxc")
	if directive != cobra.ShellCompDirectiveNoFileComp {
		t.Errorf("directive = %v, want ShellCompDirectiveNoFileComp", directive)
	}
	if len(got) != 1 || got[0] != "ecxc-ski-a1b2c3" {
		t.Errorf("candidates = %v, want [ecxc-ski-a1b2c3]", got)
	}
}

// TestSiteIDCompletionNoMatchReturnsNoCandidates covers a prefix that matches no registered
// site: an empty candidate list, not an error.
func TestSiteIDCompletionNoMatchReturnsNoCandidates(t *testing.T) {
	d, _ := testDeps(t)
	writeTestRecord(t, d, "ecxc-ski-a1b2c3", "ecxc.ski", "ecxc-ski")

	got, directive := completeSiteIDs(d)(nil, nil, "no-such-prefix")
	if directive != cobra.ShellCompDirectiveNoFileComp {
		t.Errorf("directive = %v, want ShellCompDirectiveNoFileComp", directive)
	}
	if len(got) != 0 {
		t.Errorf("candidates = %v, want none", got)
	}
}

// TestSiteIDCompletionWithNoRegistryAnswersNoCandidates covers the ratified I/O rule: an error
// opening the registry answers an empty candidate list, never a printed error.
func TestSiteIDCompletionWithNoRegistryAnswersNoCandidates(t *testing.T) {
	d, _ := testDeps(t)
	d.registryDir = func() (string, error) { return "", errRegistryUnavailable }

	got, directive := completeSiteIDs(d)(nil, nil, "")
	if directive != cobra.ShellCompDirectiveNoFileComp {
		t.Errorf("directive = %v, want ShellCompDirectiveNoFileComp", directive)
	}
	if got != nil {
		t.Errorf("candidates = %v, want none", got)
	}
}

// TestSiteIDCompletionIgnoresAPositionalAlreadyGiven covers health and logs, whose positional
// argument takes at most one site: once one is already present, no further candidate is
// offered.
func TestSiteIDCompletionIgnoresAPositionalAlreadyGiven(t *testing.T) {
	d, _ := testDeps(t)
	writeTestRecord(t, d, "ecxc-ski-a1b2c3", "ecxc.ski", "ecxc-ski")

	got, _ := completeSiteIDs(d)(nil, []string{"ecxc-ski-a1b2c3"}, "")
	if len(got) != 0 {
		t.Errorf("candidates = %v, want none once a site is already named", got)
	}
}

// TestLogEventCompletionFiltersByPrefix covers cairn logs --event's flag completion over the
// engine's own vocabulary.
func TestLogEventCompletionFiltersByPrefix(t *testing.T) {
	got, directive := completeLogEvents(nil, nil, "auth.link.")
	if directive != cobra.ShellCompDirectiveNoFileComp {
		t.Errorf("directive = %v, want ShellCompDirectiveNoFileComp", directive)
	}
	want := map[string]bool{}
	for _, event := range logs.Events() {
		if len(event) >= len("auth.link.") && event[:len("auth.link.")] == "auth.link." {
			want[event] = true
		}
	}
	if len(want) == 0 {
		t.Fatal("no event in the vocabulary starts with \"auth.link.\"; the fixture is stale")
	}
	if len(got) != len(want) {
		t.Fatalf("candidates = %v, want %d matching %q", got, len(want), "auth.link.")
	}
	for _, event := range got {
		if !want[event] {
			t.Errorf("candidate %q does not start with %q", event, "auth.link.")
		}
	}
}

// TestLogEventCompletionNoMatchReturnsNoCandidates covers a prefix outside the vocabulary.
func TestLogEventCompletionNoMatchReturnsNoCandidates(t *testing.T) {
	got, _ := completeLogEvents(nil, nil, "not-a-real-event-prefix")
	if len(got) != 0 {
		t.Errorf("candidates = %v, want none", got)
	}
}

// TestHealthAndLogsDeclareSiteIDCompletion asserts the two commands whose positional argument
// is a site id wire completeSiteIDs, rather than leaving the argument uncompletable.
func TestHealthAndLogsDeclareSiteIDCompletion(t *testing.T) {
	d := mustDeps(t)
	root := newRootCmd(d)

	for _, path := range [][]string{{"health"}, {"logs"}} {
		found, _, err := root.Find(path)
		if err != nil {
			t.Fatalf("Find(%v) = %v", path, err)
		}
		if found.ValidArgsFunction == nil {
			t.Errorf("%s declares no ValidArgsFunction", found.CommandPath())
		}
	}
}
