package newview

import (
	"cmp"
	"errors"
	"fmt"
	"os"
	"strings"
	"testing"

	tea "charm.land/bubbletea/v2"
	"github.com/charmbracelet/colorprofile"
	"golang.org/x/term"

	"github.com/glw907/cairn-cms/tool/v2/internal/setup/scaffold"
)

// replayScreen is one screen the replayer can put on a real terminal: the same fixtures the
// goldens drive, the window sizes their goldens render at, and what a capture of it shows.
type replayScreen struct {
	name   string
	themes []scaffold.Theme
	remote bool
	drive  func(*Model)
	sizes  []string
	desc   string
}

// screenDescs says what each golden screen shows; TestReplayCoversEveryScreen keeps it whole.
var screenDescs = map[string]string{
	"welcome":                    "The welcome screen with its Start and Quit footer.",
	"welcome-ssh":                "The stop a remote SSH session gets instead of the welcome screen.",
	"questions-theme":            "The theme question on a two-theme catalog.",
	"questions-name":             "The site name question with Field Notes typed.",
	"questions-name-after-theme": "The site name question after the second theme was chosen.",
	"questions-crawlers":         "The AI-crawler question after the theme and the name.",
	"browser-start":              "The browser screen before the owner gives the go-ahead to open the tab.",
	"browser-allow":              "The browser screen waiting on the Cloudflare approval.",
	"browser":                    "The browser screen waiting on the GitHub App, with Cloudflare marked done.",
	"browser-no-launcher":        "The browser screen after the launcher failed, beside the fallback link.",
	"browser-late":               "The browser screen on the install approval with the countdown at 4:12.",
	"prereq-no-domain":           "The prerequisite stop for a Cloudflare account with no domains.",
	"prereq-node-old":            "The prerequisite stop for a Node.js older than 24.",
	"choose-account":             "The choice between two Cloudflare accounts.",
	"choose-domain":              "The choice between five domains.",
	"choose-resume":              "The choice to resume one of two unfinished setups or start a new site.",
	"summary":                    "The closed summary for Field Notes on a one-theme catalog.",
	"summary-chosen":             "The closed summary with a chosen domain, the second theme, and suffixed names.",
	"summary-edit-email":         "The summary with the sign-in email edit open.",
	"summary-edit-address":       "The summary with the address edit open.",
	"summary-address-taken":      "The summary reopened on the address with setup's refusal under it.",
	"watch-start":                "The watch with its first step running.",
	"watch-mid":                  "The watch with five steps done and the sixth running, the clock at 5:12.",
	"watch-sign-in":              "The watch on its last step, the sign-in.",
	"failure-deploy":             "The four-part failure for a failed first deploy, which names the Workers Paid plan, under the watch.",
	"failure-declined":           "The failure for a declined Cloudflare approval, with no watch.",
	"done":                       "The done screen after a used sign-in link and an emailed one.",
	"done-open":                  "The done screen when the sign-in link was not used.",
	"done-scripts-skipped":       "The done screen with the skipped install scripts notice.",
	"done-revoke-failed":         "The done screen with the failed Cloudflare revoke notice.",
	"done-both-notices":          "The done screen with both notices.",
	"stop-nothing":               "The Ctrl+C line when nothing was created.",
	"stop-kept":                  "The Ctrl+C line when the run kept what it made for a rerun.",
}

// replayScreens is every golden screen, the summary edits on the suffixed summary, and the
// too-small screen in its place.
func replayScreens() []replayScreen {
	var out []replayScreen
	for _, sc := range screens {
		var sizes []string
		for _, width := range []int{80, 60} {
			sizes = append(sizes, fmt.Sprintf("%dx%d", width, cmp.Or(tall[fmt.Sprintf("%s-%d", sc.name, width)], 24)))
		}
		out = append(out, replayScreen{sc.name, sc.themes, sc.remote, sc.drive, sizes, screenDescs[sc.name]})
	}
	edits := map[string]string{
		"summary-edit-email":    "The suffixed summary with the sign-in email edit open, fitting 24 rows.",
		"summary-edit-address":  "The suffixed summary with the address edit open, fitting 24 rows.",
		"summary-address-taken": "The suffixed summary reopened on a refused address, fitting 24 rows.",
	}
	for _, sc := range editsIn24 {
		name := strings.Replace(sc.name, "summary-", "summary-chosen-", 1)
		out = append(out, replayScreen{name, twoThemes, false, sc.drive, []string{"80x24", "60x24"}, edits[sc.name]})
	}
	return append(out, replayScreen{
		"too-small", oneTheme, false, asked(fieldNotes, ""), []string{"49x24", "44x14"},
		"The too-small screen in place of the summary in a window under 50 columns.",
	})
}

// TestReplay puts one screen on the real terminal for a screenshot, and does nothing unless
// CAIRN_REPLAY is set. CAIRN_REPLAY=list prints each screen as name, sizes, and description,
// tab-separated; CAIRN_REPLAY=<name> runs the root at that screen as an inline program on
// stdin and stdout, in the palette CAIRN_REPLAY_THEME names (light or dark), and holds the frame,
// a final one included, until Ctrl+C or the process is killed. Run the compiled test binary
// itself, not go test, which pipes stdout.
func TestReplay(t *testing.T) {
	name := os.Getenv("CAIRN_REPLAY")
	if name == "" {
		return
	}
	all := replayScreens()
	if name == "list" {
		for _, sc := range all {
			fmt.Printf("%s\t%s\t%s\n", sc.name, strings.Join(sc.sizes, ","), sc.desc)
		}
		return
	}
	i := -1
	for j, sc := range all {
		if sc.name == name {
			i = j
		}
	}
	if i < 0 {
		t.Fatalf("no screen named %q; CAIRN_REPLAY=list names them", name)
	}
	sc := all[i]
	dark := os.Getenv("CAIRN_REPLAY_THEME") != "light"
	width, height, err := term.GetSize(int(os.Stdout.Fd()))
	if err != nil {
		t.Fatalf("stdout is not a terminal; run the test binary under one: %v", err)
	}
	cfg := testConfig(dark, sc.themes)
	cfg.Styles = NewStyles(dark, colorprofile.Detect(os.Stdout, os.Environ()))
	cfg.Remote = sc.remote
	m := driven(cfg, width, height, sc.drive)

	p := tea.NewProgram(m, tea.WithFilter(freeze))
	if _, err := p.Run(); err != nil && !errors.Is(err, tea.ErrInterrupted) {
		t.Fatal(err)
	}
}

// TestReplayCoversEveryScreen fails when a golden screen joins or leaves screens without its
// description in screenDescs, which the capture manifest reads.
func TestReplayCoversEveryScreen(t *testing.T) {
	for _, sc := range replayScreens() {
		if sc.desc == "" {
			t.Errorf("screen %q has no description", sc.name)
		}
	}
	if len(screenDescs) != len(screens) {
		t.Errorf("%d descriptions for %d screens; one names no screen", len(screenDescs), len(screens))
	}
}

// freeze keeps the driven frame on screen. It passes the terminal reports that tune the renderer
// as a real run's would, none of which the root acts on, and drops every other message, so no
// key, resize, spinner tick, or clock tick reaches the root. It also drops the quit a final
// frame's Init returns: a program that quits at once leaves the terminal's replies to its
// startup queries unread, and the tty echoes them under the frame. Ctrl+C interrupts the program.
func freeze(_ tea.Model, msg tea.Msg) tea.Msg {
	switch msg := msg.(type) {
	case tea.ModeReportMsg, tea.CapabilityMsg, tea.ColorProfileMsg:
		return msg
	case tea.KeyPressMsg:
		if msg.String() == "ctrl+c" {
			return tea.InterruptMsg{}
		}
	}
	return nil
}
