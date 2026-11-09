package newview

import (
	"fmt"
	"strings"
	"time"

	"charm.land/bubbles/v2/spinner"
	tea "charm.land/bubbletea/v2"
	"github.com/charmbracelet/x/ansi"

	"github.com/glw907/cairn-cms/tool/v2/internal/setup"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup/loopback"
)

// allApprovals are the four requests, in the order the setup tab shows them. Each label is the
// site, then the button the owner selects there. A token run drops the first, the Cloudflare one.
var allApprovals = []string{approvalAllow, approvalCreate, approvalInstall, approvalApprove}

// approvalIndex places each waiting state in the list. A Cloudflare re-consent is approval 1
// asked again.
var approvalIndex = map[setup.WaitState]int{
	setup.WaitCloudflare:          0,
	setup.WaitCloudflareReconsent: 0,
	setup.WaitCreateApp:           1,
	setup.WaitInstallAll:          2,
	setup.WaitInstallRepo:         3,
}

// lateAfter is when the countdown's ink turns to the warning role.
const lateAfter = time.Minute

// browser is the approval screen, before and after the tab opens.
type browser struct {
	styles Styles
	glyphs Glyphs
	keys   keys

	// url is the tab's address, empty until the runner asks for the browser. It carries the
	// tab's one-time key, so the fallback link works without OSC 8.
	url      string
	opened   bool
	openFail bool
	current  int
	sentence string
	// approvals are the requests this run asks, and skipped how many of allApprovals come before
	// the first of them.
	approvals []string
	skipped   int
	before    string
	// left is the time left in the approval chain; countdown reports that it shows.
	left      time.Duration
	countdown bool
	spin      spinner.Model
}

func newBrowser(s Styles, g Glyphs, k keys, ascii, token bool) *browser {
	b := &browser{styles: s, glyphs: g, keys: k, spin: newSpinner(s, ascii), approvals: allApprovals, before: browserBefore}
	if token {
		b.approvals, b.skipped, b.before = allApprovals[1:], 1, browserBeforeToken
	}
	return b
}

// newSpinner is the running mark the browser and the watch screens share in look; each screen
// holds its own, so their ticks never cross.
func newSpinner(s Styles, ascii bool) spinner.Model {
	// The full eight-dot braille frames: the six-dot set all but vanished in screenshots.
	sp := spinner.New(spinner.WithSpinner(spinner.Spinner{
		Frames: []string{"⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"},
		FPS:    120 * time.Millisecond,
	}))
	if ascii {
		sp = spinner.New(spinner.WithSpinner(spinner.Line))
	}
	sp.Style = s.Accent
	return sp
}

// Arm records the tab's address, so Enter can open it.
func (b *browser) Arm(url string) { b.url = url }

// Armed reports whether the tab can be opened and has not been yet.
func (b *browser) Armed() bool { return b.url != "" && !b.opened }

// Open marks the tab opened and returns the command that runs the launcher, answers reply, and
// reports the launcher's result, with the spinner's first tick.
func (b *browser) Open(goos string, env map[string]string, reply chan<- error) tea.Cmd {
	b.opened = true
	return tea.Batch(openTab(goos, env, b.url, reply), b.spin.Tick)
}

// OpenFailed records that no launcher opened the tab, which turns the fallback line into the
// opener-failure line.
func (b *browser) OpenFailed() { b.openFail = true }

// Wait shows the approval for state as current, with the sentence setup sends for it.
func (b *browser) Wait(state setup.WaitState, sentence string) {
	b.current = max(approvalIndex[state]-b.skipped, 0)
	b.sentence = sentence
}

// Countdown shows the time left in the approval chain.
func (b *browser) Countdown(left time.Duration) {
	b.left = max(left, 0)
	b.countdown = true
}

// Spin advances the spinner on its tick.
func (b *browser) Spin(msg spinner.TickMsg) tea.Cmd {
	var cmd tea.Cmd
	b.spin, cmd = b.spin.Update(msg)
	return cmd
}

// openedMsg reports the launcher's result.
type openedMsg struct{ err error }

// openTab runs the launcher for url, then tells the runner the owner went ahead. A launcher that
// fails is no stop: the fallback link stays on screen, so the runner hears nil either way.
func openTab(goos string, env map[string]string, url string, reply chan<- error) tea.Cmd {
	return func() tea.Msg {
		err := loopback.Open(loopback.Launcher(goos, env, url), loopback.OpenTimeout)
		if reply != nil {
			reply <- nil
		}
		return openedMsg{err: err}
	}
}

// Render draws the screen: before the tab opens, the requests and the go-ahead; after, the
// current request with its sentence, the countdown in the chain's last minutes, and the fallback.
func (b *browser) Render(width int) string {
	g := Grid{Styles: b.styles, Glyphs: b.glyphs, Width: width}
	if !b.opened {
		return Frame(g.Title(titleBrowser), g.Para(RoleText, b.before), b.list(g), g.Footer(b.keys.Open, b.keys.Quit))
	}
	note := browserResume
	clock := ""
	if b.countdown {
		note = countdownLate
		clock = b.clock(g)
	}
	return Frame(
		g.Title(titleBrowser),
		g.Para(RoleText, browserDuring),
		b.list(g),
		clock,
		b.fallback(g),
		g.Para(RoleMuted, note),
		g.Footer(b.keys.Stop),
	)
}

func (b *browser) list(g Grid) string {
	s := g.Styles
	out := make([]string, 0, len(b.approvals)+3)
	for i, a := range b.approvals {
		site, button, _ := strings.Cut(a, ": ")
		quiet := s.Muted.Render(site+": ") + s.Strong(RoleMuted).Render(button)
		switch {
		case b.opened && i < b.current:
			out = append(out, Mark(s.OK.Render(g.Glyphs.Pass), quiet))
		case b.opened && i == b.current:
			out = append(out, Mark(b.spin.View(), s.Text.Render(site+": ")+s.Title.Render(button)))
			if b.sentence != "" {
				out = append(out, g.Detail(b.sentence))
			}
		default:
			out = append(out, Mark(s.Muted.Render(g.Glyphs.Pending), quiet))
		}
	}
	return strings.Join(out, "\n")
}

// clock is the countdown line: the time left in bold, in the warning ink in the last minute.
func (b *browser) clock(g Grid) string {
	ink := g.Styles.Title
	if b.left <= lateAfter {
		ink = g.Styles.Strong(RoleUnknown)
	}
	_, tail, _ := strings.Cut(countdownLeft, "<time>")
	return margin + ink.Render(minutes(b.left)) + g.Styles.Text.Render(tail)
}

// minutes formats d as m:ss.
func minutes(d time.Duration) string {
	s := int(d.Round(time.Second).Seconds())
	return fmt.Sprintf("%d:%02d", s/60, s%60)
}

// fallback is the line that names the tab's address. It reads as the opener-failure line once
// no launcher opened the tab. The address goes on the lead's line when both fit the measure,
// and on the lines under it otherwise, hard-wrapped, since a URL has no place to break.
func (b *browser) fallback(g Grid) string {
	line, ink := browserNoTab, g.Styles.Muted
	if b.openFail {
		line, ink = browserNoOpen, g.Styles.Text
	}
	lead, _, _ := strings.Cut(line, "<url>")
	if ansi.StringWidth(lead+b.url) <= g.ContentWidth() {
		return margin + ink.Render(lead) + g.link(b.url, b.url)
	}
	out := []string{margin + ink.Render(strings.TrimSpace(lead))}
	lines := (ansi.StringWidth(b.url) + g.ContentWidth() - 1) / g.ContentWidth()
	for piece := range strings.SplitSeq(ansi.Hardwrap(b.url, (ansi.StringWidth(b.url)+lines-1)/lines, false), "\n") {
		out = append(out, margin+g.link(piece, b.url))
	}
	return strings.Join(out, "\n")
}
