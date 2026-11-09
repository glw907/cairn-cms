package main

import (
	"context"
	"errors"
	"reflect"
	"slices"
	"strings"
	"testing"
	"time"

	tea "charm.land/bubbletea/v2"
	"github.com/charmbracelet/colorprofile"
	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
	"github.com/glw907/cairn-cms/tool/v2/internal/record"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup/scaffold"
	"github.com/glw907/cairn-cms/tool/v2/internal/spine"
	"github.com/glw907/cairn-cms/tool/v2/internal/store"
	"github.com/glw907/cairn-cms/tool/v2/internal/ui/newview"
)

// laneTab is the tab address the scripted runner hands the view, the one address a frame shows.
const laneTab = "http://127.0.0.1:49152/?k=5f0c9e2a7b4d4e1f8a3c6b9d0e2f4a71"

var (
	laneThemes = []scaffold.Theme{{ID: "waymark", Name: "Waymark", Description: "A neutral look."}, {ID: "survey", Name: "Survey", Description: "A field-journal look."}}
	enterKey   = tea.KeyPressMsg{Code: tea.KeyEnter}
	downKey    = tea.KeyPressMsg{Code: tea.KeyDown}
	ctrlCKey   = tea.KeyPressMsg{Code: 'c', Mod: tea.ModCtrl}
)

// lanePlanted is every credential the e2e world plants. The scripted runner registers each one
// and carries one in a stop's cause, the places a real run holds them outside its events.
var lanePlanted = []string{e2eCFAccess, e2eCFRefresh, e2eCFCode, e2eManifestCode, e2eInstallCode, e2eGHUserToken, e2eGHInstToken, e2eDeployKey}

// laneDriver plays the program's part on the test goroutine: it applies each message the runner
// sends before the keys that answer it, runs the commands each update returns, and keeps every
// frame the model draws.
type laneDriver struct {
	t      *testing.T
	l      *terminalLane
	m      *newview.Model
	msgs   chan tea.Msg
	frames strings.Builder
	quit   bool
	cancel context.CancelFunc
}

func newLaneDriver(t *testing.T, run func(context.Context, setup.Config) (setup.Result, error)) *laneDriver {
	t.Helper()
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	d := mustDeps(t)
	d.register = func(providers.Credential) {}
	ld := &laneDriver{t: t, msgs: make(chan tea.Msg, 64), cancel: cancel}
	ld.l = &terminalLane{d: d, tag: "latest", tmpl: setup.Template{Version: "0.99.0", Themes: laneThemes}, run: run}
	ld.l.send = func(msg tea.Msg) { ld.msgs <- msg }
	ld.m = ld.l.model(ctx, newview.Config{
		Styles: newview.NewStyles(true, colorprofile.TrueColor), Glyphs: newview.GlyphsFor(false), Themes: laneThemes,
		GOOS: "linux", Env: map[string]string{"BROWSER": "true"},
	})
	ld.apply(tea.WindowSizeMsg{Width: 100, Height: 50})
	return ld
}

func (ld *laneDriver) apply(msgs ...tea.Msg) {
	for _, msg := range msgs {
		queue := []tea.Msg{msg}
		for n := 0; len(queue) > 0 && n < 1000; n++ {
			if _, ok := queue[0].(tea.QuitMsg); ok {
				ld.quit = true
			}
			_, cmd := ld.m.Update(queue[0])
			v := ld.m.View()
			ld.frames.WriteString(v.Content + v.WindowTitle)
			queue = append(queue[1:], laneSettled(cmd)...)
		}
	}
}

// await applies the runner's messages in order until one of type T has been applied.
func await[T tea.Msg](ld *laneDriver) {
	ld.t.Helper()
	for {
		select {
		case msg := <-ld.msgs:
			ld.apply(msg)
			if _, ok := msg.(T); ok {
				return
			}
		case <-time.After(5 * time.Second):
			ld.t.Fatalf("no %T from the runner", *new(T))
		}
	}
}

// answerQuestions takes the welcome screen and the questions: the second theme, the site name,
// and the default posture.
func (ld *laneDriver) answerQuestions() {
	ld.apply(enterKey, downKey, enterKey)
	for _, r := range "Example Site" {
		ld.apply(tea.KeyPressMsg{Code: r, Text: string(r)})
	}
	ld.apply(enterKey, enterKey)
}

// laneSettled runs cmd and returns the messages it and any batch or sequence it yields produce,
// dropping a command still running after the settle time, such as a spinner's tick.
func laneSettled(cmd tea.Cmd) []tea.Msg {
	if cmd == nil {
		return nil
	}
	ch := make(chan tea.Msg, 1)
	go func() { ch <- cmd() }()
	var msg tea.Msg
	select {
	case msg = <-ch:
	case <-time.After(50 * time.Millisecond):
		return nil
	}
	if v := reflect.ValueOf(msg); msg != nil && v.Kind() == reflect.Slice && v.Type().Elem() == reflect.TypeFor[tea.Cmd]() {
		var out []tea.Msg
		for i := range v.Len() {
			c, _ := reflect.TypeAssert[tea.Cmd](v.Index(i))
			out = append(out, laneSettled(c)...)
		}
		return out
	}
	if msg == nil {
		return nil
	}
	return []tea.Msg{msg}
}

// laneSaw is what the scripted runner was given and answered.
type laneSaw struct {
	answers         setup.Answers
	themes          []scaffold.Theme
	theme, acct, zn string
	edit            setup.SummaryEdit
	registered      int
}

// scriptedRun is a runner that walks the whole flow through cfg's view and emitter: every event
// kind, every question, and a stop at the provision step when fail is set. A view that returns
// an error ends it as the runner does, with a stop.
func scriptedRun(saw *laneSaw, fail *setup.Failure) func(context.Context, setup.Config) (setup.Result, error) {
	return func(ctx context.Context, cfg setup.Config) (setup.Result, error) {
		emit := func(e setup.Event) { e.SchemaVersion = setup.EventSchemaVersion; cfg.Emit(e) }
		stop := func(f *setup.Failure) error {
			emit(setup.Event{Kind: setup.StepFailed, Step: f.Step, Failure: f})
			return f
		}
		stopped := func(err error) (setup.Result, error) {
			return setup.Result{}, stop(&setup.Failure{Step: setup.StepOpeningChecks, Reason: setup.ReasonStopped, Happened: "Setup stopped.", Did: "Nothing was created.", Err: err})
		}
		for _, p := range lanePlanted {
			cfg.Register(providers.NewCredential(p))
			saw.registered++
		}
		saw.answers = cfg.Answers
		emit(setup.Event{Kind: setup.Resumed, Step: setup.StepOpeningChecks})
		emit(setup.Event{Kind: setup.StepStarted, Step: setup.StepOpeningChecks})
		tmpl, _ := cfg.FetchTemplate(ctx)
		saw.themes = tmpl.Themes
		saw.theme, _ = cfg.View.ChooseTheme(ctx, tmpl.Themes)
		emit(setup.Event{Kind: setup.StepDone, Step: setup.StepOpeningChecks})
		if err := cfg.View.OpenBrowser(ctx, laneTab); err != nil {
			return stopped(err)
		}
		for _, w := range []setup.WaitState{setup.WaitCloudflare, setup.WaitCloudflareReconsent, setup.WaitCreateApp, setup.WaitInstallAll, setup.WaitInstallRepo} {
			emit(setup.Event{Kind: setup.Waiting, Step: string(w), Waiting: w, Sentence: setup.WaitSentence(w, "Example Site", "example-site")})
		}
		var err error
		if saw.acct, err = cfg.View.ChooseAccount(ctx, []providers.Account{{ID: "a1", Name: "One"}, {ID: "a2", Name: "Two"}}); err != nil {
			return stopped(err)
		}
		if saw.zn, err = cfg.View.ChooseZone(ctx, []providers.Zone{{ID: "z1", Name: "example.com"}, {ID: "z2", Name: "example.org"}}); err != nil {
			return stopped(err)
		}
		s := setup.Summary{SiteName: "Example Site", Repository: "example-site", Worker: "example-site", Database: "example-site-auth",
			Bucket: "example-site-media", App: "cairn-example-site", Folder: "example-site", Zone: "example.com",
			Addresses: []string{"example.com", "www.example.com"}, OwnerEmail: "owner@example.com", Posture: setup.Decline, Theme: saw.theme}
		emit(setup.Event{Kind: setup.SummaryKind, Step: setup.StepSummary, Summary: &s})
		if saw.edit, err = cfg.View.ConfirmSummary(ctx, s, ""); err != nil {
			return stopped(err)
		}
		for _, step := range []string{setup.StepScaffold, setup.StepProvision, setup.StepCommit, setup.StepPush, setup.StepDeployKey, setup.StepFirstDeploy, setup.StepDomains, setup.StepSignIn} {
			emit(setup.Event{Kind: setup.StepStarted, Step: step})
			if fail != nil && step == fail.Step {
				return setup.Result{}, stop(fail)
			}
			emit(setup.Event{Kind: setup.StepDone, Step: step})
		}
		return setup.Result{Done: setup.Done{URL: "https://example.com", SignedIn: true, Emailed: true}}, nil
	}
}

// TestTerminalLaneFramesCarryNoCredential runs the terminal lane's whole flow, to the done screen
// and to a stop, and greps every frame the view drew for the planted credentials.
func TestTerminalLaneFramesCarryNoCredential(t *testing.T) {
	failure := &setup.Failure{Step: setup.StepProvision, Reason: setup.ReasonProvider, Happened: "A request to Cloudflare failed.",
		Did: "Setup created the GitHub App cairn-example-site.", Do: "Check your internet connection, and then run cairn new again.",
		Err: errors.New("refresh " + e2eCFRefresh + " with " + e2eGHInstToken)}
	for _, tc := range []struct {
		name     string
		fail     *setup.Failure
		last     func(*laneDriver)
		wantCode int
		wantText string
	}{
		{"done", nil, await[newview.DoneMsg], 0, "Example Site is live at"},
		{"stop", failure, await[setup.Event], 1, failure.Happened},
	} {
		t.Run(tc.name, func(t *testing.T) {
			saw := &laneSaw{}
			ld := newLaneDriver(t, scriptedRun(saw, tc.fail))
			ld.answerQuestions()
			await[newview.OpenBrowserMsg](ld)
			ld.apply(enterKey)
			await[newview.ChooseAccountMsg](ld)
			ld.apply(downKey, enterKey)
			await[newview.ChooseZoneMsg](ld)
			ld.apply(enterKey)
			await[newview.ConfirmSummaryMsg](ld)
			ld.apply(enterKey)
			for !ld.quit {
				tc.last(ld)
			}
			err := ld.l.finish(ld.cancel, setup.ReasonStopped)
			if code := laneCode(err); code != tc.wantCode {
				t.Errorf("exit %d (%v), want %d", code, err, tc.wantCode)
			}

			if saw.registered != len(lanePlanted) {
				t.Fatalf("the runner held %d credentials, want %d", saw.registered, len(lanePlanted))
			}
			frames := ld.frames.String()
			for _, p := range lanePlanted {
				if strings.Contains(frames, p) {
					t.Errorf("a frame shows the planted %q", p)
				}
			}
			// The grep sees what a frame shows: the tab's address and the run's last screen.
			for _, want := range []string{laneTab, tc.wantText} {
				if !strings.Contains(frames, want) {
					t.Errorf("no frame shows %q", want)
				}
			}
			if saw.answers.SiteName != "Example Site" || saw.answers.Posture != setup.Decline || saw.theme != "survey" ||
				!slices.Equal(saw.themes, laneThemes) || saw.acct != "a2" || saw.zn != "z1" || saw.edit.OwnerEmail != "owner@example.com" {
				t.Errorf("the runner saw %+v; want the questions' answers, the fetched catalog, and the owner's choices", saw)
			}
		})
	}
}

// TestTerminalLaneCtrlCStopsTheRunWithTheStopCode stops the run at its browser wait and before it
// starts; both end with 2, and the run's context is cancelled so the runner returns.
func TestTerminalLaneCtrlCStopsTheRunWithTheStopCode(t *testing.T) {
	ld := newLaneDriver(t, scriptedRun(&laneSaw{}, nil))
	ld.answerQuestions()
	await[newview.OpenBrowserMsg](ld)
	ld.apply(ctrlCKey)
	if !ld.quit {
		t.Fatal("Ctrl+C left the program running")
	}
	if code := laneCode(ld.l.finish(ld.cancel, setup.ReasonStopped)); code != 2 {
		t.Errorf("a stopped run exits %d, want 2", code)
	}

	early := newLaneDriver(t, scriptedRun(&laneSaw{}, nil))
	early.apply(ctrlCKey)
	if code := laneCode(early.l.finish(early.cancel, setup.ReasonStopped)); !early.quit || code != 2 {
		t.Errorf("Ctrl+C on the welcome screen: quit %v, exit %d; want a quit and 2", early.quit, code)
	}
	if code := laneCode(early.l.finish(early.cancel, setup.ReasonRemote)); code != 1 {
		t.Errorf("the SSH stop exits %d, want 1", code)
	}
}

// TestTerminalLaneResumesAChosenRecord offers one unfinished record and continues it with the
// answers it holds, never asking the questions.
func TestTerminalLaneResumesAChosenRecord(t *testing.T) {
	rec := record.Record{Name: "Example Site", Domain: "example.com", Setup: record.Setup{
		RunID: "0123456789abcdef", OwnerEmail: "owner@example.com", Address: "example.com", AIPosture: "decline", ThemeID: "survey",
		KeyringEntries: []string{"setup/0123456789abcdef/" + e2eDeployKey},
	}}
	var got setup.Config
	ld := newLaneDriver(t, func(_ context.Context, cfg setup.Config) (setup.Result, error) {
		got = cfg
		return setup.Result{Done: setup.Done{URL: "https://example.com"}}, nil
	})
	go ld.l.offerResume(context.Background(), []store.Entry{{ID: "example-site-3f9a2c", Record: rec}})
	await[newview.ChooseResumeMsg](ld)
	ld.apply(enterKey)
	await[newview.DoneMsg](ld)
	if err := ld.l.finish(ld.cancel, setup.ReasonStopped); err != nil {
		t.Fatalf("finish = %v", err)
	}
	if got.Resume == nil || got.Resume.SiteID != "example-site-3f9a2c" || got.Answers != setup.RecordedAnswers(rec) {
		t.Errorf("the run resumed %+v with %+v; want the chosen record and its answers", got.Resume, got.Answers)
	}
	frames := ld.frames.String()
	if !ld.quit || !strings.Contains(frames, "Example Site is live at") || strings.Contains(frames, e2eDeployKey) {
		t.Errorf("quit %v; the done frame should name the record's site and no keyring entry:\n%s", ld.quit, frames)
	}
}

// laneCode is the exit code a lane's error carries: 0 for none, the verdict for a coded one.
func laneCode(err error) int {
	if err == nil {
		return 0
	}
	if c, ok := errors.AsType[codedError](err); ok {
		return int(c.verdict)
	}
	return int(spine.VerdictUnknown)
}
