package newview

import (
	"strings"
	"testing"
	"time"

	tea "charm.land/bubbletea/v2"
	"github.com/charmbracelet/colorprofile"
	"github.com/charmbracelet/x/ansi"

	"github.com/glw907/cairn-cms/tool/v2/internal/setup"
)

func TestWindowTitleAndProgressFollowThePhase(t *testing.T) {
	type bar struct {
		state tea.ProgressBarState
		value int
	}
	tests := []struct {
		name  string
		drive func(*Model)
		title string
		bar   *bar
	}{
		{"welcome", func(*Model) {}, "cairn new", nil},
		{"browser before the tab", func(m *Model) { send(m, OpenBrowserMsg{URL: tabURL}) }, "cairn new", nil},
		{"browser on approval 2", opened(setup.WaitCreateApp), "cairn new · approve in your browser (2 of 4)", &bar{tea.ProgressBarIndeterminate, 0}},
		{"summary", asked(fieldNotes, ""), "cairn new · review", nil},
		{"watch", watched(2), "cairn new · setting up", &bar{tea.ProgressBarDefault, 25}},
		{"failure", failed(deployFailed), "cairn new · stopped", &bar{tea.ProgressBarError, 62}},
		{"prerequisite", failed(nodeOld), "cairn new · stopped", &bar{tea.ProgressBarError, 0}},
		{"done", finished(setup.Done{URL: "https://fieldnotes.example.com"}), "cairn new · done", &bar{tea.ProgressBarDefault, 100}},
		{"stopped", func(m *Model) { send(m, ctrlC) }, "cairn new · stopped", nil},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, m := frame(oneTheme, 80, tt.drive)
			v := m.View()
			if v.WindowTitle != tt.title {
				t.Errorf("window title %q, want %q", v.WindowTitle, tt.title)
			}
			switch {
			case tt.bar == nil && v.ProgressBar != nil:
				t.Errorf("progress %+v, want none", *v.ProgressBar)
			case tt.bar != nil && v.ProgressBar == nil:
				t.Errorf("no progress, want %+v", *tt.bar)
			case tt.bar != nil && (v.ProgressBar.State != tt.bar.state || v.ProgressBar.Value != tt.bar.value):
				t.Errorf("progress %+v, want %+v", *v.ProgressBar, *tt.bar)
			}
		})
	}
}

func TestElapsedTimeSitsAtTheRightEdgeOfTheTitle(t *testing.T) {
	for _, width := range []int{80, 60} {
		f, m := frame(oneTheme, width, watched(5))
		send(m, clockMsg(t0.Add(6*time.Minute+3*time.Second)))
		title := strings.Split(ansi.Strip(m.View().Content), "\n")[1]
		if !strings.HasPrefix(title, "  Setting up Field Notes ") {
			t.Errorf("%d: title line %q", width, title)
		}
		if want := ColMargin + testGrid(width).ContentWidth(); ansi.StringWidth(title) != want || !strings.HasSuffix(title, " 6:03") {
			t.Errorf("%d: title line %q is %d cells; want the clock ending at column %d", width, title, ansi.StringWidth(title), want)
		}
		if !strings.Contains(ansi.Strip(f), " 5:12") {
			t.Errorf("%d: the clock before the tick does not read the last event's time", width)
		}
	}
}

func TestClockTicksOnlyInTheWatch(t *testing.T) {
	_, m := frame(oneTheme, 80, watched(1))
	if _, cmd := m.Update(clockMsg(t0)); cmd == nil {
		t.Error("the watch does not arm the next clock tick")
	}
	send(m, DoneMsg{Done: setup.Done{URL: "https://fieldnotes.example.com"}})
	if _, cmd := m.Update(clockMsg(t0)); cmd != nil {
		t.Error("the clock keeps ticking after the watch")
	}
}

func TestAResumedWatchMarksTheSkippedStepsDone(t *testing.T) {
	_, m := frame(oneTheme, 80, func(m *Model) {
		send(m, at(setup.StepStarted, setup.StepPush, 0))
	})
	if got := m.watch.DoneCount(); got != 4 {
		t.Errorf("%d steps done after a resume at the push, want the 4 before it", got)
	}
}

func TestNoStepShowsDoneBeforeItsOwnDoneEvent(t *testing.T) {
	// The order setup's watch runs its steps in, from run.watch in internal/setup/watch.go.
	order := []string{setup.StepScaffold, setup.StepProvision, setup.StepCommit, setup.StepDeployKey,
		setup.StepPush, setup.StepFirstDeploy, setup.StepDomains, setup.StepSignIn}
	_, m := frame(oneTheme, 80, func(m *Model) {
		s := fieldNotes
		send(m, setup.Event{Kind: setup.SummaryKind, Step: setup.StepSummary, Summary: &s})
	})
	finished := map[string]bool{}
	for i, step := range order {
		send(m, at(setup.StepStarted, step, time.Duration(i)*time.Minute))
		for j, ws := range watchSteps {
			if m.watch.states[j] == stateDone && !finished[ws.id] {
				t.Errorf("after %s started, %s shows done before its step_done", step, ws.id)
			}
		}
		send(m, at(setup.StepDone, step, time.Duration(i)*time.Minute+30*time.Second))
		finished[step] = true
	}
}

func TestCtrlCLines(t *testing.T) {
	tests := []struct {
		name  string
		drive func(*Model)
		want  string
	}{
		{"before the questions", func(m *Model) { send(m, ctrlC) }, stopNothing},
		{"at the GitHub App's approval", func(m *Model) { opened(setup.WaitCreateApp)(m); send(m, ctrlC) }, stopNothing},
		{"once the App exists", func(m *Model) { opened(setup.WaitInstallAll)(m); send(m, ctrlC) }, stopResume},
		{"on the summary", func(m *Model) { asked(fieldNotes, "")(m); send(m, ctrlC) }, stopResume},
		{"in the watch", func(m *Model) { watched(2)(m); send(m, ctrlC) }, stopResume},
		{"after a resume", func(m *Model) { send(m, setup.Event{Kind: setup.Resumed}, ctrlC) }, stopResume},
		{"setup reports the stop with what it kept", func(m *Model) {
			f := setup.Failure{Step: setup.StepApproveRepo, Reason: setup.ReasonStopped, Did: "Setup created the GitHub App cairn-field-notes."}
			send(m, setup.Event{Kind: setup.StepFailed, Step: f.Step, Failure: &f})
		}, stopResume},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f, m := frame(oneTheme, 80, tt.drive)
			if got := ansi.Strip(f); got != "\n  "+tt.want+"\n" {
				t.Errorf("frame %q, want only the line %q", got, tt.want)
			}
			if m.phase != phaseStopped {
				t.Errorf("phase %v, want stopped", m.phase)
			}
		})
	}
}

func TestCtrlCQuitsAndKeepsAFinalFrame(t *testing.T) {
	m := New(testConfig(true, oneTheme))
	send(m, tea.WindowSizeMsg{Width: 80, Height: 24})
	finished(setup.Done{URL: "https://fieldnotes.example.com", SignedIn: true})(m)
	before := m.View().Content
	_, cmd := m.Update(ctrlC)
	if cmd == nil {
		t.Fatal("Ctrl+C returned no command")
	}
	if _, ok := cmd().(tea.QuitMsg); !ok {
		t.Error("Ctrl+C does not quit")
	}
	if m.View().Content != before {
		t.Error("Ctrl+C replaced the done screen")
	}
}

func TestFailureEmphasisAndLinks(t *testing.T) {
	s := NewStyles(true, colorprofile.TrueColor)
	t.Run("the permission name is bold in a failure", func(t *testing.T) {
		f, _ := frame(oneTheme, 80, failed(declined))
		if !strings.Contains(f, s.Title.Render(permissionName)) {
			t.Error("API Tokens Write is not drawn bold in the What to do part")
		}
	})
	for _, tt := range []struct {
		name string
		f    setup.Failure
		url  string
	}{
		{"an opening failure links its before-you-start section", nodeOld, urlStart + setup.Anchor(setup.ReasonNodeOld)},
		{"a domain check links its section", noZones, urlStart + setup.Anchor(setup.ReasonNoZones)},
		{"the deploy failure links the plans", deployFailed, urlWorkers},
	} {
		t.Run(tt.name, func(t *testing.T) {
			f, _ := frame(oneTheme, 80, failed(tt.f))
			if !strings.Contains(f, ansi.SetHyperlink(tt.url)) {
				t.Errorf("no link to %s", tt.url)
			}
		})
	}
	t.Run("a stop before the watch shows no steps", func(t *testing.T) {
		f, _ := frame(oneTheme, 80, failed(declined))
		if strings.Contains(ansi.Strip(f), stepScaffold) {
			t.Errorf("the declined approval's failure lists the watch:\n%s", ansi.Strip(f))
		}
	})
}

func TestDoneShowsEachNoticeOnlyWhenItsFlagIsSet(t *testing.T) {
	const skipped = "To protect your computer, setup didn't run dependency install scripts. If a dependency needs its script, go to /home/sam/sites/field-notes and run npm rebuild."
	const revoke = "Setup couldn't remove its access to your Cloudflare account. In your Cloudflare profile, select Access Management, and then Connected Applications. Find cairn and revoke its access."
	tests := []struct {
		name      string
		done      setup.Done
		want, not []string
	}{
		{"neither", setup.Done{SignedIn: true}, nil, []string{"npm rebuild", "Connected Applications", "Cloudflare API token"}},
		{"token stored", setup.Done{TokenStored: true}, []string{setup.LineTokenStored}, []string{"npm rebuild", "Connected Applications"}},
		{"scripts skipped", setup.Done{ScriptsSkipped: true}, []string{skipped}, []string{"Connected Applications"}},
		{"revoke failed", setup.Done{RevokeFailed: true}, []string{revoke}, []string{"npm rebuild"}},
		{"both", setup.Done{ScriptsSkipped: true, RevokeFailed: true}, []string{skipped, revoke}, nil},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tt.done.URL = "https://fieldnotes.example.com"
			_, m := frame(oneTheme, 80, finished(tt.done))
			got := flat(m)
			for _, w := range tt.want {
				if !strings.Contains(got, w) {
					t.Errorf("done screen lacks %q:\n%s", w, got)
				}
			}
			for _, n := range tt.not {
				if strings.Contains(got, n) {
					t.Errorf("done screen says %q:\n%s", n, got)
				}
			}
		})
	}
}

func TestDoneSaysSignedInOnlyWhenTheLinkWasUsed(t *testing.T) {
	tests := []struct {
		name      string
		done      setup.Done
		want, not []string
	}{
		{"used", setup.Done{SignedIn: true, Emailed: true}, []string{doneSignedIn, "Setup also emailed a sign-in link to sam@example.com."}, []string{setup.LineDoneOpen}},
		{"not used", setup.Done{Emailed: true}, []string{setup.LineDoneOpen}, []string{doneSignedIn}},
		{"no email", setup.Done{SignedIn: true}, []string{doneSignedIn}, []string{"emailed"}},
		{"other editors", setup.Done{NoSignIn: true}, []string{"Setup didn't send a sign-in link. This site already has editors, and sam@example.com isn't one of them."}, []string{doneSignedIn, setup.LineDoneOpen}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tt.done.URL = "https://fieldnotes.example.com"
			_, m := frame(oneTheme, 80, finished(tt.done))
			got := flat(m)
			for _, w := range tt.want {
				if !strings.Contains(got, w) {
					t.Errorf("done screen lacks %q:\n%s", w, got)
				}
			}
			for _, n := range tt.not {
				if strings.Contains(got, n) {
					t.Errorf("done screen says %q:\n%s", n, got)
				}
			}
		})
	}
}
