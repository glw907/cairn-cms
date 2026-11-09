package newview

import (
	"strings"
	"time"

	"charm.land/bubbles/v2/spinner"
	tea "charm.land/bubbletea/v2"
	"github.com/charmbracelet/x/ansi"

	"github.com/glw907/cairn-cms/tool/v2/internal/setup"
)

// watchStep is one of the eight steps the watch shows, with its label and the sentence shown
// while it runs.
type watchStep struct {
	id, label, why string
}

// watchSteps are the runner's eight watch steps, in the order it runs them. The order must match
// the runner's, since a started step marks every step above it done: the deploy key is stored
// before the push, because the deploy the push starts reads it.
var watchSteps = []watchStep{
	{setup.StepScaffold, stepScaffold, whyScaffold},
	{setup.StepProvision, stepProvision, whyProvision},
	{setup.StepCommit, stepCommit, whyCommit},
	{setup.StepDeployKey, stepDeployKey, whyDeployKey},
	{setup.StepPush, stepPush, whyPush},
	{setup.StepFirstDeploy, stepFirstDeploy, whyFirstDeploy},
	{setup.StepDomains, stepDomains, whyDomains},
	{setup.StepSignIn, stepSignIn, setup.LineSignInStep},
}

// watchIndex is a step's place in watchSteps, or -1 for a step before the watch.
func watchIndex(id string) int {
	for i, s := range watchSteps {
		if s.id == id {
			return i
		}
	}
	return -1
}

// clockMsg is the watch clock's tick, carrying the time it fired.
type clockMsg time.Time

// tickClock fires the next clockMsg a second from now.
func tickClock() tea.Cmd {
	return tea.Tick(time.Second, func(t time.Time) tea.Msg { return clockMsg(t) })
}

// watch is the run after the summary's Enter: the eight steps with their marks, the elapsed
// time, and the line that says the owner can leave.
type watch struct {
	styles Styles
	glyphs Glyphs
	keys   keys

	states []stepState
	spin   spinner.Model
	// begun reports that a watch step has started. started is when the first one did, and now
	// the latest time an event or a clock tick carried; the elapsed time is the span between.
	begun        bool
	started, now time.Time
}

func newWatch(s Styles, g Glyphs, k keys, ascii bool) *watch {
	return &watch{styles: s, glyphs: g, keys: k, states: make([]stepState, len(watchSteps)), spin: newSpinner(s, ascii)}
}

// Started reports whether a watch step has begun.
func (w *watch) Started() bool { return w.begun }

// Start marks step i running at the time at, and returns the spinner's first tick when it is the
// first step to start. Every earlier step is marked done: a resume skips the steps its record has
// reached, and reports none of them.
func (w *watch) Start(i int, at time.Time) tea.Cmd {
	for j := range i {
		w.states[j] = stateDone
	}
	w.states[i] = stateRunning
	w.Tick(at)
	if w.begun {
		return nil
	}
	w.begun, w.started = true, at
	return w.spin.Tick
}

// Set records the state of step i at the time at.
func (w *watch) Set(i int, s stepState, at time.Time) {
	w.states[i] = s
	w.Tick(at)
}

// Tick moves the clock to t; a time before the latest one is ignored.
func (w *watch) Tick(t time.Time) {
	if t.After(w.now) {
		w.now = t
	}
}

// Elapsed is the time since the first watch step began.
func (w *watch) Elapsed() time.Duration {
	if !w.begun {
		return 0
	}
	return max(w.now.Sub(w.started), 0)
}

// DoneCount is the number of steps done.
func (w *watch) DoneCount() int {
	n := 0
	for _, s := range w.states {
		if s == stateDone {
			n++
		}
	}
	return n
}

// Spin advances the spinner on a tick addressed to it and ignores a tick for another spinner.
func (w *watch) Spin(msg spinner.TickMsg) tea.Cmd {
	var cmd tea.Cmd
	w.spin, cmd = w.spin.Update(msg)
	return cmd
}

// Render draws the watch for the run the summary s describes.
func (w *watch) Render(width int, s setup.Summary) string {
	g := Grid{Styles: w.styles, Glyphs: w.glyphs, Width: width}
	return Frame(
		w.title(g, s.SiteName),
		w.list(g, s),
		g.Para(RoleMuted, fill(watchLeave, "<email>", s.OwnerEmail)),
		g.Footer(w.keys.Stop),
	)
}

// title is the bold title with the elapsed time muted at the measure's right edge.
func (w *watch) title(g Grid, name string) string {
	c := g.Styles.Muted.Render(minutes(w.Elapsed()))
	room := g.ContentWidth() - ansi.StringWidth(c) - 2
	t := g.Styles.Title.Render(ansi.Truncate(fill(titleWatch, "<name>", name), room, g.Glyphs.Ellipsis))
	gap := max(g.ContentWidth()-ansi.StringWidth(t)-ansi.StringWidth(c), 2)
	return margin + t + strings.Repeat(" ", gap) + c
}

// list is the eight steps as a mark list, with the running step's sentence under it. A failed
// step shows the failed mark and no sentence: the failure's parts say what happened.
func (w *watch) list(g Grid, s setup.Summary) string {
	st := g.Styles
	r := names(s)
	cut := func(label string) string {
		return ansi.Truncate(r.Replace(label), g.ContentWidth()-(ColList-ColMargin), g.Glyphs.Ellipsis)
	}
	out := make([]string, 0, len(watchSteps)+2)
	for i, step := range watchSteps {
		switch w.states[i] {
		case stateDone:
			out = append(out, Mark(st.OK.Render(g.Glyphs.Pass), st.Muted.Render(cut(step.label))))
		case stateRunning:
			out = append(out, Mark(w.spin.View(), st.Title.Render(cut(step.label))), g.Detail(r.Replace(step.why)))
		case stateFailed:
			out = append(out, Mark(st.Failing.Render(g.Glyphs.Fail), st.Title.Render(cut(step.label))))
		default:
			out = append(out, Mark(st.Muted.Render(g.Glyphs.Pending), st.Muted.Render(cut(step.label))))
		}
	}
	return strings.Join(out, "\n")
}

// names fills a watch step's <folder>, <host>, and <repo> from the summary.
func names(s setup.Summary) *strings.Replacer {
	host := s.Zone
	if len(s.Addresses) > 0 {
		host = s.Addresses[0]
	}
	return strings.NewReplacer("<folder>", s.Folder, "<host>", host, "<repo>", s.Repository, "<domain>", s.Zone)
}

// fill replaces each placeholder in s with its value, given as alternating pairs.
func fill(s string, pairs ...string) string { return strings.NewReplacer(pairs...).Replace(s) }
