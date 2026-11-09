package newview

import (
	"flag"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/charmbracelet/x/exp/teatest/v2"

	"github.com/glw907/cairn-cms/tool/v2/internal/setup"
)

// updating reports whether -update was passed. The teatest and golden packages register that
// flag at import, so this file reads it rather than defining a second one.
func updating() bool {
	f := flag.Lookup("update")
	return f != nil && f.Value.String() == "true"
}

// fixtureStream is a short watch: the summary's names, then two steps start and finish. The
// program runs the spinner and the clock for real, so the stream ends with no step running, and
// its times lie past any clock tick, which only moves the clock forward.
func fixtureStream() []setup.Event {
	v := setup.EventSchemaVersion
	s := fieldNotes
	start := time.Date(2100, 1, 1, 0, 0, 0, 0, time.UTC)
	ev := func(kind setup.EventKind, step string, d time.Duration) setup.Event {
		return setup.Event{SchemaVersion: v, Kind: kind, Step: step, Timestamp: start.Add(d)}
	}
	return []setup.Event{
		{SchemaVersion: v, Kind: setup.SummaryKind, Step: setup.StepSummary, Summary: &s, Timestamp: start},
		ev(setup.StepStarted, setup.StepScaffold, 0),
		ev(setup.StepDone, setup.StepScaffold, 30*time.Second),
		ev(setup.StepStarted, setup.StepProvision, 30*time.Second),
		ev(setup.StepDone, setup.StepProvision, 75*time.Second),
	}
}

// replay delivers events to a Model past the summary through a teatest program and returns
// the final frame.
func replay(t *testing.T, events []setup.Event) string {
	t.Helper()
	m := New(testConfig(true, twoThemes))
	m.phase = phaseWatch
	tm := teatest.NewTestModel(t, m, teatest.WithInitialTermSize(80, 24))
	for _, ev := range events {
		tm.Send(ev)
	}
	if err := tm.Quit(); err != nil {
		t.Fatal(err)
	}
	final, ok := tm.FinalModel(t).(*Model)
	if !ok {
		t.Fatal("final model is not *Model")
	}
	return final.View().Content
}

func readGolden(t *testing.T, path string) string {
	t.Helper()
	want, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("%v; run `go test ./internal/ui/newview -update` to cut it", err)
	}
	return string(want)
}

func TestReplayMatchesFrameGolden(t *testing.T) {
	path := filepath.Join("testdata", "frame.golden")
	got := replay(t, fixtureStream())
	if updating() {
		if err := os.WriteFile(path, []byte(got), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	if want := readGolden(t, path); got != want {
		t.Errorf("frame differs from %s:\n%s\nwant:\n%s", path, got, want)
	}
}

func TestReplayDroppingAnEventChangesTheFrame(t *testing.T) {
	want := readGolden(t, filepath.Join("testdata", "frame.golden"))
	events := fixtureStream()
	// The last event is the one no later event implies: a start marks the steps before it done,
	// as a resume needs.
	dropped := events[:len(events)-1]
	if got := replay(t, dropped); got == want {
		t.Error("frame is unchanged after dropping an event; the harness cannot see a lost event")
	}
}
