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
	"strings"
	"time"

	"charm.land/bubbles/v2/key"
	"charm.land/bubbles/v2/spinner"
	tea "charm.land/bubbletea/v2"

	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup/scaffold"
	"github.com/glw907/cairn-cms/tool/v2/internal/store"
)

// stepState is where one step stands in the frame.
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
	phaseWatch
)

// Config is what the view needs from the command that runs it.
type Config struct {
	// Styles is the palette, resolved once for the terminal's background and profile.
	Styles Styles
	// Glyphs is the mark tier; the ASCII tier also selects the ASCII spinner.
	Glyphs Glyphs
	// Themes is the template's catalog, in catalog order. It must not be empty; the theme
	// question is asked only when it holds more than one theme.
	Themes []scaffold.Theme
	// Remote opens on the SSH stop instead of the welcome screen.
	Remote bool
	// GOOS and Env choose the browser launcher: a runtime.GOOS value and the environment by name.
	GOOS string
	Env  map[string]string
	// Start runs once the questions are answered, with the owner's answers; nil starts nothing.
	Start func(setup.Answers) tea.Cmd
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
// sends the chosen run's site id on Reply, or "" for a new site.
type ChooseResumeMsg struct {
	Runs  []store.Entry
	Reply chan<- string
}

// CountdownMsg shows the time left in the approval chain. Send it only in the chain's last
// minutes, when loopback's Countdown says the views show it.
type CountdownMsg struct{ Left time.Duration }

// keys holds every binding the screens hint at. Enter has a binding per verb, since the footer
// names what it does on each screen.
type keys struct {
	Start, Next, Open, Choose, Back, Quit, Stop key.Binding
}

func newKeys(g Glyphs) keys {
	enter := func(verb string) key.Binding {
		return key.NewBinding(key.WithKeys("enter"), key.WithHelp("Enter", verb))
	}
	return keys{
		Start:  enter(verbStart),
		Next:   enter(verbNext),
		Open:   enter(verbOpen),
		Choose: key.NewBinding(key.WithKeys("up", "down"), key.WithHelp(g.Arrows, verbChoose)),
		Back:   key.NewBinding(key.WithKeys("shift+tab"), key.WithHelp("Shift+Tab", verbBack)),
		Quit:   key.NewBinding(key.WithKeys("ctrl+c"), key.WithHelp("Ctrl+C", verbQuit)),
		Stop:   key.NewBinding(key.WithKeys("ctrl+c"), key.WithHelp("Ctrl+C", verbStop)),
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
	// openReply and chooseReply answer the runner's pending request.
	openReply   chan<- error
	chooseReply chan<- string
	failure     setup.Failure

	order    []string
	states   map[string]stepState
	sentence string
}

// New returns a Model on the welcome screen, or on the SSH stop for a remote session.
func New(cfg Config) *Model {
	k := newKeys(cfg.Glyphs)
	m := &Model{
		cfg:       cfg,
		keys:      k,
		states:    map[string]stepState{},
		questions: newQuestions(cfg.Styles, cfg.Glyphs, k, cfg.Themes),
		browser:   newBrowser(cfg.Styles, cfg.Glyphs, k, cfg.Glyphs == GlyphsFor(true)),
	}
	if cfg.Remote {
		m.phase = phaseSSH
	}
	return m
}

// Init starts nothing: the runner's requests and events arrive as messages.
func (m *Model) Init() tea.Cmd { return nil }

// Update applies a window size, a key, a runner request, or a setup.Event to the model.
func (m *Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width, m.height = msg.Width, msg.Height
		return m, m.resize()
	case tea.KeyPressMsg:
		return m, m.key(msg)
	case setup.Event:
		m.apply(msg)
		return m, nil
	case OpenBrowserMsg:
		m.browser.Arm(msg.URL)
		m.openReply = msg.Reply
		m.phase = phaseBrowser
		return m, nil
	case ChooseAccountMsg:
		return m, m.ask(accountChoice(m.cfg.Styles, m.cfg.Glyphs, m.keys, msg.Accounts), msg.Reply)
	case ChooseZoneMsg:
		return m, m.ask(zoneChoice(m.cfg.Styles, m.cfg.Glyphs, m.keys, msg.Zones), msg.Reply)
	case ChooseResumeMsg:
		return m, m.ask(resumeChoice(m.cfg.Styles, m.cfg.Glyphs, m.keys, msg.Runs), msg.Reply)
	case CountdownMsg:
		m.browser.Countdown(msg.Left)
		return m, nil
	case openedMsg:
		if msg.err != nil {
			m.browser.OpenFailed()
		}
		return m, nil
	case spinner.TickMsg:
		return m, m.browser.Spin(msg)
	}
	return m, m.forward(msg)
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
		return tea.Quit
	}
	switch m.phase {
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

func (m *Model) apply(ev setup.Event) {
	switch ev.Kind {
	case setup.StepStarted:
		m.set(ev.Step, stateRunning)
		m.sentence = ""
	case setup.StepDone:
		m.set(ev.Step, stateDone)
		m.sentence = ""
	case setup.StepFailed:
		m.set(ev.Step, stateFailed)
		switch {
		case ev.Failure != nil && ev.Failure.Reason == setup.ReasonRemote:
			m.phase = phaseSSH
		case prerequisite(ev.Failure):
			m.failure, m.phase = *ev.Failure, phasePrereq
		}
	case setup.Waiting:
		m.sentence = ev.Sentence
		m.browser.Wait(ev.Waiting, ev.Sentence)
		if m.phase != phaseWatch {
			m.phase = phaseBrowser
		}
	}
}

func (m *Model) set(step string, s stepState) {
	if _, seen := m.states[step]; !seen {
		m.order = append(m.order, step)
	}
	m.states[step] = s
}

// View renders the phase's screen, or the too-small screen in a window under the minimum. A
// final frame is drawn whatever the size and ends on a newline, so it stays in scrollback and
// the shell prompt starts below it.
func (m *Model) View() tea.View {
	return tea.NewView(m.render())
}

func (m *Model) render() string {
	g := Grid{Styles: m.cfg.Styles, Glyphs: m.cfg.Glyphs, Width: m.width}
	switch m.phase {
	case phaseSSH:
		return g.sshStop() + "\n"
	case phasePrereq:
		return g.prereq(m.failure) + "\n"
	case phaseWatch:
		return m.steps()
	}
	if !Fits(m.width, m.height) {
		return g.TooSmall(m.height)
	}
	switch m.phase {
	case phaseQuestions:
		return m.questions.Render(m.width)
	case phaseBrowser:
		return m.browser.Render(m.width)
	case phaseChoose:
		return m.choice.Render(m.width)
	}
	return g.welcome(g.Footer(m.keys.Start, m.keys.Quit))
}

// steps renders one line per step, then the waiting sentence when there is one.
func (m *Model) steps() string {
	var b strings.Builder
	for _, step := range m.order {
		b.WriteString(step + ": " + string(m.states[step]) + "\n")
	}
	if m.sentence != "" {
		b.WriteString("\n" + m.sentence + "\n")
	}
	return b.String()
}
