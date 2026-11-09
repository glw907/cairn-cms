package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"runtime"
	"slices"
	"sync"

	tea "charm.land/bubbletea/v2"
	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
	"github.com/glw907/cairn-cms/tool/v2/internal/record"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup/loopback"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup/scaffold"
	"github.com/glw907/cairn-cms/tool/v2/internal/spine"
	"github.com/glw907/cairn-cms/tool/v2/internal/store"
	"github.com/glw907/cairn-cms/tool/v2/internal/ui/newview"
	"github.com/spf13/cobra"
)

// terminalLane is one terminal-lane run: the view's program on the terminal, and the runner on a
// separate goroutine that reaches the program only through send.
type terminalLane struct {
	d   deps
	tag string
	// tmpl is the template fetched before the questions, whose catalog the theme question offers.
	tmpl setup.Template
	// run is setup.Run; a test drives the lane with a scripted runner.
	run func(context.Context, setup.Config) (setup.Result, error)
	// send delivers a message to the program, Program.Send in production.
	send func(tea.Msg)

	mu sync.Mutex
	// closed reports that the program has ended, after which no runner starts.
	closed bool
	// ended receives the runner's result; it is nil until a runner starts.
	ended chan runEnd
	// err is the error that kept a runner from starting.
	err error
}

type runEnd struct {
	res setup.Result
	err error
}

// runTerminal runs cairn new with the terminal view inline, below the shell prompt, with no
// alternate screen. Its frames go to the terminal itself, not through the scrubbed stream main
// wraps stdout in: that stream holds output to a newline, and an inline frame is redrawn in place
// without one (ADR-0004). The view shows only typed fields, which carry no credential.
//
// The exit codes are the agent lane's. The view has already shown how a run ended, so no part of
// a failure is printed again.
func runTerminal(cmd *cobra.Command, d deps, rf *rootFlags, f newFlags) error {
	ctx, cancel := context.WithCancel(cmd.Context())
	defer cancel()
	env := environMap(os.Environ())
	remote := loopback.Remote(runtime.GOOS, env)
	l := &terminalLane{d: d, tag: f.tag, run: setup.Run}

	var runs []store.Entry
	if !remote {
		st, err := openRegistry(d)
		if err != nil {
			return err
		}
		if !f.fresh {
			runs = unfinishedIn(st)
		}
		if l.tmpl, err = tagFetch(d, f.tag)(ctx); err != nil {
			_, _ = fmt.Fprintf(cmd.ErrOrStderr(), tmplNewTemplateFetch+"\n", err)
			return codedExit(spine.Verdict(newExitFor(&setup.Failure{Reason: setup.ReasonTemplate})))
		}
	}

	term := detectTerminal(d, rf)
	m := l.model(ctx, newview.Config{
		Styles: newview.NewStyles(rf.theme != themeLight, term.Profile.ColorProfile()),
		Glyphs: newview.GlyphsFor(term.ASCII),
		Themes: l.tmpl.Themes,
		Remote: remote,
		GOOS:   runtime.GOOS,
		Env:    env,
	})
	p := newProgram(m, d.stdout)
	l.send = p.Send
	if len(runs) > 0 {
		go l.offerResume(ctx, runs)
	}
	stop := setup.ReasonStopped
	if remote {
		stop = setup.ReasonRemote
	}
	return l.drive(p, cancel, stop)
}

// newProgram is the lane's program over m, drawing to out. Bubble Tea turns an external SIGINT
// into an InterruptMsg, which ends Run with ErrInterrupted and no final frame; the filter hands it
// to the model as Ctrl+C instead, so a signal stops the run the way the key does and the stop
// line is drawn.
func newProgram(m tea.Model, out io.Writer, opts ...tea.ProgramOption) *tea.Program {
	return tea.NewProgram(m, append([]tea.ProgramOption{tea.WithOutput(out), tea.WithFilter(interruptAsStop)}, opts...)...)
}

// interruptAsStop is the program's filter: an InterruptMsg becomes the Ctrl+C key press, and
// every other message passes unchanged.
func interruptAsStop(_ tea.Model, msg tea.Msg) tea.Msg {
	if _, ok := msg.(tea.InterruptMsg); ok {
		return tea.KeyPressMsg{Code: 'c', Mod: tea.ModCtrl}
	}
	return msg
}

// drive runs p to its end and returns the lane's exit. An interrupt that still ends Run is a
// stop, so it exits with finish's code, as the agent lane does on the same signal.
func (l *terminalLane) drive(p *tea.Program, cancel context.CancelFunc, stop setup.Reason) error {
	_, runErr := p.Run()
	err := l.finish(cancel, stop)
	if runErr != nil && !errors.Is(runErr, tea.ErrInterrupted) {
		return runErr
	}
	return err
}

// model builds the root model over cfg, with the questions' end starting a new run.
func (l *terminalLane) model(ctx context.Context, cfg newview.Config) *newview.Model {
	cfg.Start = func(a setup.Answers) tea.Cmd {
		in := newInput{answers: a, tag: l.tag, template: &l.tmpl}
		return func() tea.Msg {
			l.begin(ctx, in, a.Theme)
			return nil
		}
	}
	return newview.New(cfg)
}

// offerResume asks whether to continue one of runs. A new site goes on to the questions, whose
// end starts the run; a chosen record starts its run here, with the answers the record holds.
func (l *terminalLane) offerResume(ctx context.Context, runs []store.Entry) {
	id, err := ask(ctx, l.send, func(r chan<- string) tea.Msg { return newview.ChooseResumeMsg{Runs: runs, Reply: r} })
	i := slices.IndexFunc(runs, func(e store.Entry) bool { return e.ID == id })
	if err != nil || id == "" || i < 0 {
		return
	}
	e := runs[i]
	// A run resumed past the summary sends no summary event, so the names the watch and done
	// screens show come from the record.
	if s, ok := recordSummary(e.Record); ok {
		l.send(setup.Event{SchemaVersion: setup.EventSchemaVersion, Kind: setup.SummaryKind, Timestamp: l.d.now(), Step: setup.StepSummary, Summary: &s})
	}
	l.begin(ctx, newInput{
		answers: setup.RecordedAnswers(e.Record),
		tag:     l.tag,
		resume:  &setup.Resume{SiteID: e.ID, Record: e.Record},
	}, "")
}

// recordSummary is the summary of a record that has passed the Cloudflare checks, or false for
// one too early to name an address.
func recordSummary(rec record.Record) (setup.Summary, bool) {
	o, err := setup.Plan(setup.RecordedAnswers(rec))
	if err != nil {
		return setup.Summary{}, false
	}
	return summaryOf(setup.Result{Record: rec, Outline: o}), true
}

// begin starts the run once, on a new goroutine, unless the program has already ended. When the
// run ends it sends the done screen; a stop needs nothing more, since the runner's step_failed
// event already brought its frame. An error before any step leaves no final frame to quit on, so
// the program is told to quit and the error is printed once it has.
func (l *terminalLane) begin(ctx context.Context, in newInput, theme string) {
	l.mu.Lock()
	if l.closed || l.ended != nil || l.err != nil {
		l.mu.Unlock()
		return
	}
	cfg, err := productionConfig(l.d, in, &terminalView{send: l.send, theme: theme}, func(e setup.Event) { l.send(e) })
	if err != nil {
		l.err = err
		l.mu.Unlock()
		l.send(tea.QuitMsg{})
		return
	}
	ended := make(chan runEnd, 1)
	l.ended = ended
	l.mu.Unlock()

	go func() {
		res, err := l.run(ctx, cfg)
		_, stopped := errors.AsType[*setup.Failure](err)
		switch {
		case err == nil:
			l.send(newview.DoneMsg{Done: res.Done})
		case !stopped:
			l.send(tea.QuitMsg{})
		}
		ended <- runEnd{res: res, err: err}
	}()
}

// finish ends the lane once the program has: it cancels the run, waits for the runner to return,
// and maps the end to the exit code. A program that ended before any run started ended at stop:
// the SSH stop, or Ctrl+C before the questions were done.
func (l *terminalLane) finish(cancel context.CancelFunc, stop setup.Reason) error {
	cancel()
	l.mu.Lock()
	l.closed = true
	ended, err := l.ended, l.err
	l.mu.Unlock()
	if err != nil {
		return err
	}
	if ended == nil {
		return codedExit(spine.Verdict(newExitFor(&setup.Failure{Reason: stop})))
	}
	end := <-ended
	if end.err == nil {
		return nil
	}
	if f, ok := errors.AsType[*setup.Failure](end.err); ok {
		return codedExit(spine.Verdict(newExitFor(f)))
	}
	return end.err
}

// terminalView is the setup.View of the terminal lane. Each question goes to the program as a
// message carrying its reply channel, and the runner waits on the owner's answer or the run's end.
type terminalView struct {
	send func(tea.Msg)
	// theme is the theme question's answer, empty when the catalog offered one theme.
	theme string
}

// ChooseTheme answers with the theme the questions already took, so the owner is never asked
// twice.
func (v *terminalView) ChooseTheme(context.Context, []scaffold.Theme) (string, error) {
	return v.theme, nil
}

// ChooseAccount asks the owner which account setup uses.
func (v *terminalView) ChooseAccount(ctx context.Context, accounts []providers.Account) (string, error) {
	return ask(ctx, v.send, func(r chan<- string) tea.Msg { return newview.ChooseAccountMsg{Accounts: accounts, Reply: r} })
}

// ChooseZone asks the owner which domain the site is for.
func (v *terminalView) ChooseZone(ctx context.Context, zones []providers.Zone) (string, error) {
	return ask(ctx, v.send, func(r chan<- string) tea.Msg { return newview.ChooseZoneMsg{Zones: zones, Reply: r} })
}

// OpenBrowser waits for the owner's go-ahead, after which the view opens the tab.
func (v *terminalView) OpenBrowser(ctx context.Context, url string) error {
	opened, err := ask(ctx, v.send, func(r chan<- error) tea.Msg { return newview.OpenBrowserMsg{URL: url, Reply: r} })
	if err != nil {
		return err
	}
	return opened
}

// ConfirmSummary shows the summary and waits for the owner's Enter.
func (v *terminalView) ConfirmSummary(ctx context.Context, s setup.Summary, problem string) (setup.SummaryEdit, error) {
	return ask(ctx, v.send, func(r chan<- setup.SummaryEdit) tea.Msg {
		return newview.ConfirmSummaryMsg{Summary: s, Problem: problem, Reply: r}
	})
}

// ask sends the message msg builds around a reply channel and waits for the reply or ctx's end.
// The channel holds one reply, so the view's answer never blocks once the runner has stopped
// waiting.
func ask[T any](ctx context.Context, send func(tea.Msg), msg func(chan<- T) tea.Msg) (T, error) {
	reply := make(chan T, 1)
	send(msg(reply))
	select {
	case v := <-reply:
		return v, nil
	case <-ctx.Done():
		var zero T
		return zero, ctx.Err()
	}
}
