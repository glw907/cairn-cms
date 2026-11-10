// Package newview is the terminal view for setup. It follows the one-model rule from
// ADR-0004: Model is the only tea.Model in the package, and every component the view
// grows is a plain struct whose methods the root calls directly.
//
// The view renders setup's typed fields and the copy in catalogue.go. The provider strings it shows are
// names the owner chooses between (an account's name, a domain); it never shows a token, a code,
// or a key a provider returned, which is what lets a frame grep prove no credential reaches the
// terminal.
package newview

import (
	"strconv"
	"time"

	"charm.land/bubbles/v2/key"
	"charm.land/bubbles/v2/spinner"
	tea "charm.land/bubbletea/v2"
	"charm.land/lipgloss/v2"

	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup/scaffold"
	"github.com/glw907/cairn-cms/tool/v2/internal/store"
)

// stepState is where one watch step stands; the zero value is a step not yet started.
type stepState string

const (
	stateRunning stepState = "running"
	stateDone    stepState = "done"
	stateFailed  stepState = "failed"
)

// phase is the screen the root shows.
type phase int

const (
	phaseWelcome phase = iota
	phaseSSH
	phaseQuestions
	phaseBrowser
	phaseChoose
	phasePrereq
	phaseSummary
	phaseWatch
	phaseFailure
	phaseDone
	phaseStopped
)

// final reports whether p is a final frame, one that stays in scrollback with no footer.
func (p phase) final() bool {
	switch p {
	case phaseSSH, phasePrereq, phaseFailure, phaseDone, phaseStopped:
		return true
	}
	return false
}

// Config is what the view needs from the command that runs it.
type Config struct {
	// Styles is the palette, resolved once for the terminal's background and profile.
	Styles Styles
	// Glyphs is the mark tier; the ASCII tier also selects the ASCII spinner.
	Glyphs Glyphs
	// Themes is the template's catalog, in catalog order. It is empty only for a remote session,
	// which asks nothing; the theme question is asked only when it holds more than one theme.
	Themes []scaffold.Theme
	// Remote opens on the SSH stop instead of the welcome screen.
	Remote bool
	// GOOS and Env choose the browser launcher: a runtime.GOOS value and the environment by name.
	GOOS string
	Env  map[string]string
	// Start runs once the questions are answered, with the owner's answers; nil starts nothing.
	Start func(setup.Answers) tea.Cmd
	// Token reports a run on a supplied Cloudflare token. It asks a last question for the owner's
	// email, which the token cannot read from the sign-in, and counts three approvals, since the
	// Cloudflare request never comes.
	Token bool
}

// OpenBrowserMsg asks the owner's go-ahead to open the setup tab at URL. The view answers on
// Reply once the launcher has run; a launcher that fails is shown beside the fallback link and
// is no error.
type OpenBrowserMsg struct {
	URL   string
	Reply chan<- error
}

// ChooseAccountMsg asks which Cloudflare account setup uses. The view sends the chosen
// account's id on Reply.
type ChooseAccountMsg struct {
	Accounts []providers.Account
	Reply    chan<- string
}

// ChooseZoneMsg asks which domain the site is for. The view sends the chosen zone's id on Reply.
type ChooseZoneMsg struct {
	Zones []providers.Zone
	Reply chan<- string
}

// ChooseResumeMsg asks whether to resume an unfinished setup or start a new site. The view
// sends the chosen run's site id on Reply, or "" for a new site, which goes on to the welcome
// screen and the questions.
type ChooseResumeMsg struct {
	Runs  []store.Entry
	Reply chan<- string
}

// CredentialMsg sets the Cloudflare credential a resumed run uses, which its record settles
// rather than the environment Config.Token read: the browser screen counts the Cloudflare request
// only for an approval run.
type CredentialMsg struct{ Credential setup.CloudflareCredential }

// CountdownMsg shows the time left in the approval chain. Send it only in the chain's last
// minutes, when loopback's Countdown says the views show it.
type CountdownMsg struct{ Left time.Duration }

// ConfirmSummaryMsg shows the summary for the owner's one Enter, as setup's View.ConfirmSummary
// asks for it. The view sends the two editable rows on Reply when the owner presses Enter. Problem
// is empty on the first ask; on a later one it is setup's refusal, which reopens the row it names.
type ConfirmSummaryMsg struct {
	Summary setup.Summary
	Problem string
	Reply   chan<- setup.SummaryEdit
}

// keys holds every binding the screens hint at. Enter has a binding per verb, since the footer
// names what it does on each screen.
type keys struct {
	Start, Next, Open, Choose, Back, Quit, Stop key.Binding
	SetUp, Save, EditEmail, EditAddress, Cancel key.Binding
}

func newKeys(g Glyphs) keys {
	enter := func(verb string) key.Binding {
		return key.NewBinding(key.WithKeys("enter"), key.WithHelp("Enter", verb))
	}
	return keys{
		Start:       enter(verbStart),
		Next:        enter(verbNext),
		Open:        enter(verbOpen),
		Choose:      key.NewBinding(key.WithKeys("up", "down"), key.WithHelp(g.Arrows, verbChoose)),
		Back:        key.NewBinding(key.WithKeys("shift+tab"), key.WithHelp("Shift+Tab", verbBack)),
		Quit:        key.NewBinding(key.WithKeys("ctrl+c"), key.WithHelp("Ctrl+C", verbQuit)),
		Stop:        key.NewBinding(key.WithKeys("ctrl+c"), key.WithHelp("Ctrl+C", verbStop)),
		SetUp:       enter(verbSetUp),
		Save:        enter(verbSave),
		EditEmail:   key.NewBinding(key.WithKeys("e"), key.WithHelp("e", verbEditEmail)),
		EditAddress: key.NewBinding(key.WithKeys("a"), key.WithHelp("a", verbEditAddress)),
		Cancel:      key.NewBinding(key.WithKeys("esc"), key.WithHelp("Esc", verbCancel)),
	}
}

// Model is the root model. It owns the window size, the phase, and the screen components, and
// routes every message to the component the phase names.
type Model struct {
	cfg  Config
	keys keys

	width, height int
	phase         phase

	questions *questions
	browser   *browser
	choice    *choice
	summary   *summary
	watch     *watch
	// openReply, chooseReply, and summaryReply answer the runner's pending request.
	openReply    chan<- error
	chooseReply  chan<- string
	summaryReply chan<- setup.SummaryEdit
	failure      setup.Failure
	done         setup.Done

	// sum is the run's names, from the summary setup sent; the watch and done screens read them.
	sum setup.Summary
	// created reports that the run has made something a rerun resumes from, for the Ctrl+C line.
	created bool
	// resuming reports that the pending choice is the unfinished-setup one.
	resuming bool
}

// New returns a Model on the welcome screen, or on the SSH stop for a remote session.
func New(cfg Config) *Model {
	k := newKeys(cfg.Glyphs)
	ascii := cfg.Glyphs == GlyphsFor(true)
	m := &Model{
		cfg:       cfg,
		keys:      k,
		questions: newQuestions(cfg.Styles, cfg.Glyphs, k, cfg.Themes, cfg.Token),
		browser:   newBrowser(cfg.Styles, cfg.Glyphs, k, ascii, cfg.Token),
		summary:   newSummary(cfg.Styles, cfg.Glyphs, k, cfg.Themes),
		watch:     newWatch(cfg.Styles, cfg.Glyphs, k, ascii),
	}
	if cfg.Remote {
		m.phase = phaseSSH
	}
	return m
}

// Init quits at once for a session that opens on a final frame, the SSH stop; otherwise it
// starts nothing, since the runner's requests and events arrive as messages.
func (m *Model) Init() tea.Cmd {
	if m.phase.final() {
		// A quit at once leaves the terminal's replies to Bubble Tea's startup queries unread, and
		// the terminal echoes them under the frame as text.
		return tea.Tick(initQuitDelay, func(time.Time) tea.Msg { return tea.QuitMsg{} })
	}
	return nil
}

// initQuitDelay is how long a model that opens on a final frame waits before it quits, so the
// terminal's answers to the program's startup queries arrive while the program still reads input.
const initQuitDelay = 200 * time.Millisecond

// Update applies a window size, a key, a runner request, or a setup.Event to the model. The
// message that brings a final frame on screen also quits the program: Bubble Tea flushes the
// last frame as it stops, and the frame ends on a newline, so it stays in scrollback with the
// shell prompt below it.
func (m *Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	was := m.phase.final()
	cmd := m.update(msg)
	if !was && m.phase.final() {
		return m, tea.Batch(cmd, tea.Quit)
	}
	return m, cmd
}

func (m *Model) update(msg tea.Msg) tea.Cmd {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width, m.height = msg.Width, msg.Height
		return m.resize()
	case tea.KeyPressMsg:
		return m.key(msg)
	case setup.Event:
		return m.apply(msg)
	case ConfirmSummaryMsg:
		m.sum, m.summaryReply, m.phase, m.created = msg.Summary, msg.Reply, phaseSummary, true
		return m.summary.Ask(msg.Summary, msg.Problem, m.width)
	case DoneMsg:
		m.done, m.phase = msg.Done, phaseDone
		return nil
	case clockMsg:
		m.watch.Tick(time.Time(msg))
		if m.phase != phaseWatch {
			return nil
		}
		return tickClock()
	case OpenBrowserMsg:
		m.browser.Arm(msg.URL)
		m.openReply = msg.Reply
		m.phase = phaseBrowser
		return nil
	case ChooseAccountMsg:
		return m.ask(accountChoice(m.cfg.Styles, m.cfg.Glyphs, m.keys, msg.Accounts), msg.Reply)
	case ChooseZoneMsg:
		return m.ask(zoneChoice(m.cfg.Styles, m.cfg.Glyphs, m.keys, msg.Zones), msg.Reply)
	case ChooseResumeMsg:
		cmd := m.ask(resumeChoice(m.cfg.Styles, m.cfg.Glyphs, m.keys, msg.Runs), msg.Reply)
		m.resuming = true
		return cmd
	case CredentialMsg:
		m.cfg.Token = msg.Credential == setup.CredentialToken
		m.browser.SetToken(m.cfg.Token)
		return nil
	case CountdownMsg:
		m.browser.Countdown(msg.Left)
		return nil
	case openedMsg:
		if msg.err != nil {
			m.browser.OpenFailed()
		}
		return nil
	case spinner.TickMsg:
		return tea.Batch(m.browser.Spin(msg), m.watch.Spin(msg))
	}
	return m.forward(msg)
}

// resize rebuilds the active form, which Huh measures only when it is built.
func (m *Model) resize() tea.Cmd {
	switch m.phase {
	case phaseQuestions:
		return m.questions.Start(m.width)
	case phaseChoose:
		return m.choice.Start(m.width)
	}
	return nil
}

func (m *Model) key(msg tea.KeyPressMsg) tea.Cmd {
	if key.Matches(msg, m.keys.Quit) {
		// A final frame already says how the run ended, so it stays.
		if !m.phase.final() {
			m.phase = phaseStopped
		}
		return tea.Quit
	}
	switch m.phase {
	case phaseSummary:
		cmd, confirmed := m.summary.Key(msg, m.width)
		if confirmed {
			return replyEdit(m.summaryReply, m.summary.Edit())
		}
		return cmd
	case phaseWelcome:
		if key.Matches(msg, m.keys.Start) {
			m.phase = phaseQuestions
			return m.questions.Start(m.width)
		}
		return nil
	case phaseQuestions:
		if key.Matches(msg, m.keys.Back) {
			return m.questions.Back(m.width)
		}
	case phaseBrowser:
		if key.Matches(msg, m.keys.Open) && m.browser.Armed() {
			return m.browser.Open(m.cfg.GOOS, m.cfg.Env, m.openReply)
		}
		return nil
	}
	return m.forward(msg)
}

// forward hands msg to the phase's form and acts on a completed one.
func (m *Model) forward(msg tea.Msg) tea.Cmd {
	switch m.phase {
	case phaseQuestions:
		done, cmd := m.questions.Forward(msg, m.width)
		if !done {
			return cmd
		}
		m.phase = phaseBrowser
		if m.cfg.Start == nil {
			return cmd
		}
		return tea.Batch(cmd, m.cfg.Start(m.questions.Answers()))
	case phaseChoose:
		done, cmd := m.choice.Forward(msg)
		if !done {
			return cmd
		}
		m.phase = phaseBrowser
		if m.resuming && m.choice.Value() == "" {
			m.phase = phaseWelcome
		}
		m.resuming = false
		return tea.Batch(cmd, answer(m.chooseReply, m.choice.Value()))
	}
	return nil
}

// ask shows c and holds reply for the owner's choice.
func (m *Model) ask(c *choice, reply chan<- string) tea.Cmd {
	m.choice, m.chooseReply, m.phase = c, reply, phaseChoose
	return c.Start(m.width)
}

// answer sends v on reply from a command, since the runner may not be receiving yet.
func answer(reply chan<- string, v string) tea.Cmd {
	if reply == nil {
		return nil
	}
	return func() tea.Msg {
		reply <- v
		return nil
	}
}

// replyEdit sends the summary's rows on reply from a command, since the runner may not be
// receiving yet.
func replyEdit(reply chan<- setup.SummaryEdit, e setup.SummaryEdit) tea.Cmd {
	if reply == nil {
		return nil
	}
	return func() tea.Msg {
		reply <- e
		return nil
	}
}

func (m *Model) apply(ev setup.Event) tea.Cmd {
	i := watchIndex(ev.Step)
	switch ev.Kind {
	case setup.StepStarted:
		if i < 0 {
			return nil
		}
		m.created = true
		cmd := m.watch.Start(i, ev.Timestamp)
		if m.phase == phaseWatch {
			return cmd
		}
		m.phase = phaseWatch
		return tea.Batch(cmd, tickClock())
	case setup.StepDone:
		if i >= 0 {
			m.watch.Set(i, stateDone, ev.Timestamp)
		}
	case setup.StepFailed:
		if i >= 0 {
			m.watch.Set(i, stateFailed, ev.Timestamp)
		}
		m.fail(ev.Failure)
	case setup.Waiting:
		m.browser.Wait(ev.Waiting, ev.Sentence)
		// Approval 3 waits once the GitHub App exists.
		if ev.Waiting == setup.WaitInstallAll || ev.Waiting == setup.WaitInstallRepo {
			m.created = true
		}
		if m.phase != phaseWatch {
			m.phase = phaseBrowser
		}
	case setup.Resumed:
		m.created = true
	case setup.SummaryKind:
		if ev.Summary != nil {
			m.sum = *ev.Summary
		}
	}
	return nil
}

// fail shows the screen for a stop: the SSH stop, the prerequisite failure, the Ctrl+C line for a
// stopped run, or the four-part failure.
func (m *Model) fail(f *setup.Failure) {
	switch {
	case f == nil:
		m.phase = phaseFailure
	case f.Reason == setup.ReasonRemote:
		m.phase = phaseSSH
	case prerequisite(f):
		m.failure, m.phase = *f, phasePrereq
	case f.Reason == setup.ReasonStopped:
		m.created = m.created || f.Did != nothingCreated
		m.phase = phaseStopped
	default:
		m.failure, m.phase = *f, phaseFailure
	}
}

// View renders the phase's screen, with the window title and the terminal's progress indicator
// for the phase, and the cursor while a summary edit is open.
func (m *Model) View() tea.View {
	content, fits := m.render()
	v := tea.NewView(content)
	v.WindowTitle = m.windowTitle()
	v.ProgressBar = m.progress()
	if m.phase == phaseSummary && fits {
		v.Cursor = m.summary.Cursor(m.width, m.sum)
	}
	return v
}

// render draws the phase's screen and reports whether it fits; in a window too small for it, the
// too-small screen. A final frame is drawn whatever the size and ends on a newline, so it stays
// in scrollback and the shell prompt starts below it.
func (m *Model) render() (string, bool) {
	g := Grid{Styles: m.cfg.Styles, Glyphs: m.cfg.Glyphs, Width: m.width}
	switch m.phase {
	case phaseSSH:
		return g.sshStop() + "\n", true
	case phasePrereq:
		return g.prereq(m.failure) + "\n", true
	case phaseFailure:
		list := ""
		if m.watch.Started() {
			list = m.watch.list(g, m.sum)
		}
		return g.failure(m.failure, list) + "\n", true
	case phaseDone:
		return g.done(m.done, m.sum, m.watch.Elapsed()) + "\n", true
	case phaseStopped:
		return g.stopped(m.created) + "\n", true
	}
	content := m.screen(g)
	rows := max(MinRows, lipgloss.Height(content))
	if !Fits(m.width, m.height) || m.height < rows {
		return g.TooSmall(m.height, rows), false
	}
	return content, true
}

// screen draws an interactive phase's screen.
func (m *Model) screen(g Grid) string {
	switch m.phase {
	case phaseQuestions:
		return m.questions.Render(m.width)
	case phaseBrowser:
		return m.browser.Render(m.width)
	case phaseChoose:
		return m.choice.Render(m.width)
	case phaseSummary:
		return m.summary.Render(m.width, m.sum)
	case phaseWatch:
		return m.watch.Render(m.width, m.sum)
	}
	return g.welcome(m.cfg.Token, g.Footer(m.keys.Start, m.keys.Quit))
}

// windowTitle names what the window wants from the owner, so the window list or tab bar says
// whether to come back to it.
func (m *Model) windowTitle() string {
	what := ""
	switch {
	case m.phase == phaseBrowser && m.browser.opened:
		what = fill(windowApprove, "<n>", strconv.Itoa(m.browser.current+1), "<total>", strconv.Itoa(len(m.browser.approvals)))
	case m.phase == phaseChoose:
		what = windowChoose
	case m.phase == phaseSummary:
		what = windowReview
	case m.phase == phaseWatch:
		what = windowSettings
	case m.phase == phaseDone:
		what = windowDone
	case m.phase.final():
		what = windowStopped
	}
	if what == "" {
		return windowBase
	}
	return windowBase + " " + m.cfg.Glyphs.Sep + " " + what
}

// progress drives the terminal's progress indicator: busy while the owner approves in the
// browser, the share of watch steps done during the run, and the error state on a stop.
func (m *Model) progress() *tea.ProgressBar {
	share := m.watch.DoneCount() * 100 / len(watchSteps)
	switch m.phase {
	case phaseBrowser:
		if m.browser.opened {
			return tea.NewProgressBar(tea.ProgressBarIndeterminate, 0)
		}
	case phaseWatch:
		return tea.NewProgressBar(tea.ProgressBarDefault, share)
	case phaseDone:
		return tea.NewProgressBar(tea.ProgressBarDefault, 100)
	case phaseFailure, phasePrereq:
		return tea.NewProgressBar(tea.ProgressBarError, share)
	}
	return nil
}
