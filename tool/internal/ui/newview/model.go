// Package newview is the terminal view for setup. It follows the one-model rule from
// ADR-0004: Model is the only tea.Model in the package, and every component the view
// grows is a plain struct whose methods the root calls directly.
//
// The view renders only typed setup.Event fields. It never shows a string a provider
// returned, which is what lets a frame grep prove no credential reaches the terminal.
package newview

import (
	"strings"

	tea "charm.land/bubbletea/v2"

	"github.com/glw907/cairn-cms/tool/v2/internal/setup"
)

// stepState is where one step stands in the frame.
type stepState string

const (
	stateRunning stepState = "running"
	stateDone    stepState = "done"
	stateFailed  stepState = "failed"
)

// Model is the root model. It holds the terminal size and what the event stream has
// reported so far.
type Model struct {
	width, height int
	order         []string
	states        map[string]stepState
	sentence      string
}

// New returns an empty Model.
func New() *Model {
	return &Model{states: map[string]stepState{}}
}

// Init starts nothing: the runner's events arrive as messages.
func (m *Model) Init() tea.Cmd { return nil }

// Update applies a window size or a setup.Event to the model.
func (m *Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width, m.height = msg.Width, msg.Height
	case setup.Event:
		m.apply(msg)
	}
	return m, nil
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
	case setup.Waiting:
		m.sentence = ev.Sentence
	}
}

func (m *Model) set(step string, s stepState) {
	if _, seen := m.states[step]; !seen {
		m.order = append(m.order, step)
	}
	m.states[step] = s
}

// View renders the frame: one line per step, then the waiting sentence when there is one.
func (m *Model) View() tea.View {
	var b strings.Builder
	for _, step := range m.order {
		b.WriteString(step + ": " + string(m.states[step]) + "\n")
	}
	if m.sentence != "" {
		b.WriteString("\n" + m.sentence + "\n")
	}
	return tea.NewView(b.String())
}
