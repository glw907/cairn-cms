package newview

import (
	"cmp"
	"errors"
	"fmt"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
	"time"

	tea "charm.land/bubbletea/v2"
	"charm.land/lipgloss/v2"
	"github.com/charmbracelet/colorprofile"
	"github.com/charmbracelet/x/ansi"

	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
	"github.com/glw907/cairn-cms/tool/v2/internal/record"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup/scaffold"
	"github.com/glw907/cairn-cms/tool/v2/internal/store"
)

// The fixtures are the prototype's fake account, as setup's own types.
var (
	twoThemes = []scaffold.Theme{
		{ID: "waymark", Name: "Waymark", Description: "An intentionally neutral look that's easy to edit.", Path: "waymark"},
		{ID: "survey", Name: "Survey", Description: "A field-journal look with a bold masthead and wide photographs.", Path: "survey"},
	}
	oneTheme = twoThemes[:1]

	fiveZones = []providers.Zone{
		{ID: "z1", Name: "fieldnotes.example.com", Status: "active"},
		{ID: "z2", Name: "samrivera.example.com", Status: "active"},
		{ID: "z3", Name: "rivera-photos.example.org", Status: "active"},
		{ID: "z4", Name: "field-notes.example.net", Status: "active"},
		{ID: "z5", Name: "sam-rivera.example.dev", Status: "active"},
	}
	twoAccounts = []providers.Account{
		{ID: "a1", Name: "Sam Rivera"},
		{ID: "a2", Name: "Rivera Photo Studio"},
	}
	twoRuns = []store.Entry{
		{ID: "field-notes-3f9a2c", Record: record.Record{Name: "Field Notes", Domain: "fieldnotes.example.com"}},
		{ID: "trail-log-81be07", Record: record.Record{Name: "Trail Log"}},
	}
	noZones = setup.Failure{
		Step: setup.StepCloudflareChecks, Reason: setup.ReasonNoZones,
		Happened: "Your Cloudflare account has no domains.",
		Did:      "Nothing was created.",
		Do:       "Register a domain with Cloudflare, or add a domain you already own to Cloudflare. Then run cairn new again.",
	}
)

var (
	// fieldNotes is the summary setup sends for the prototype's site on a one-theme catalog, where
	// the runner names the catalog's only theme.
	fieldNotes = setup.Summary{
		SiteName: "Field Notes", Repository: "field-notes", Worker: "field-notes", Database: "field-notes-auth",
		Bucket: "field-notes-media", App: "cairn-field-notes", Folder: "/home/sam/sites/field-notes",
		Zone: "fieldnotes.example.com", Addresses: []string{"fieldnotes.example.com", "www.fieldnotes.example.com"},
		OwnerEmail: "sam@example.com", Posture: setup.Decline, Theme: "waymark",
		ThemeDescription: "An intentionally neutral look that's easy to edit.",
	}
	// chosen is a summary after the owner chose the domain and the second theme, with names that
	// carry a suffix.
	chosen = setup.Summary{
		SiteName: "Field Notes", Repository: "field-notes-2", Worker: "field-notes-2", Database: "field-notes-2-auth",
		Bucket: "field-notes-2-media", App: "cairn-field-notes-2", Folder: "/home/sam/sites/field-notes-2",
		Zone: "samrivera.example.com", Addresses: []string{"samrivera.example.com", "www.samrivera.example.com"},
		OwnerEmail: "sam@example.com", Posture: setup.Invite, Theme: "survey",
		ThemeDescription: "A field-journal look with a bold masthead and wide photographs.",
		SuffixReason:     "A repository named field-notes already exists on your GitHub account.",
		ZoneChosen:       true,
	}

	workersPaid = setup.Failure{
		Step: setup.StepFirstDeploy, Reason: setup.ReasonWorkersPaid,
		Happened: "Cloudflare rejected the first deploy from GitHub Actions. Your Cloudflare account doesn't have the Workers Paid plan. Every cairn site needs it. The plan costs $5 a month.",
		Did:      "The completed steps above are kept.",
		Left:     "Everything setup created stays, and the next run resumes from it.",
		Do:       "Subscribe to Workers Paid, and then run cairn new again. Setup resumes at the first deploy.",
	}
	declined = setup.Failure{
		Step: setup.StepApproveCloudflare, Reason: setup.ReasonDeclined,
		Happened: "Cloudflare didn't approve setup's request.",
		Did:      "Nothing was created.",
		Do:       "Run cairn new again. On the Cloudflare page, select API Tokens: Write, and then select Allow.",
	}
	nodeOld = setup.Failure{
		Step: setup.StepOpeningChecks, Reason: setup.ReasonNodeOld,
		Happened: "Setup needs Node.js 24 or later. This computer has Node.js 22.",
		Did:      "Nothing was created.",
		Do:       "Install Node.js 24 or later, and then run cairn new again.",
	}

	ctrlC = tea.KeyPressMsg{Code: 'c', Mod: tea.ModCtrl}
	esc   = tea.KeyPressMsg{Code: tea.KeyEscape}
)

// letter is a key press that types r.
func letter(r rune) tea.KeyPressMsg { return tea.KeyPressMsg{Code: r, Text: string(r)} }

// t0 is when the watch's first step starts.
var t0 = time.Date(2026, 11, 8, 9, 0, 0, 0, time.UTC)

// at is a setup event for step, d after t0.
func at(kind setup.EventKind, step string, d time.Duration) setup.Event {
	return setup.Event{Kind: kind, Step: step, Timestamp: t0.Add(d)}
}

// asked is the summary screen for s with problem.
func asked(s setup.Summary, problem string) func(*Model) {
	return func(m *Model) { send(m, ConfirmSummaryMsg{Summary: s, Problem: problem}) }
}

// editAddress opens the address edit, replaces its value with host, and saves it.
func editAddress(m *Model, host string) {
	send(m, letter('a'), tea.KeyPressMsg{Code: 'u', Mod: tea.ModCtrl})
	typeText(m, host)
	send(m, enter)
}

// watched runs the watch with the first n steps done, a minute apiece, and the next one started
// 12 seconds into its minute.
func watched(n int) func(*Model) {
	return func(m *Model) {
		s := fieldNotes
		send(m, setup.Event{Kind: setup.SummaryKind, Step: setup.StepSummary, Summary: &s})
		for i := range n {
			d := time.Duration(i) * time.Minute
			send(m, at(setup.StepStarted, watchSteps[i].id, d), at(setup.StepDone, watchSteps[i].id, d+50*time.Second))
		}
		if n < len(watchSteps) {
			send(m, at(setup.StepStarted, watchSteps[n].id, time.Duration(n)*time.Minute+12*time.Second))
		}
	}
}

// failed is the stop f reports, after the watch ran up to its step when the step is one of the
// watch's.
func failed(f setup.Failure) func(*Model) {
	return func(m *Model) {
		if i := watchIndex(f.Step); i >= 0 {
			watched(i)(m)
		}
		send(m, setup.Event{Kind: setup.StepFailed, Step: f.Step, Failure: &f})
	}
}

// finished is the done screen d after the whole watch, 8:12 after it began.
func finished(d setup.Done) func(*Model) {
	return func(m *Model) {
		watched(len(watchSteps))(m)
		send(m, at(setup.StepDone, setup.StepSignIn, 8*time.Minute+12*time.Second), DoneMsg{Done: d})
	}
}

const tabURL = "http://127.0.0.1:49152/?k=5f0c9e2a7b4d4e1f8a3c6b9d0e2f4a71"

func testConfig(dark bool, themes []scaffold.Theme) Config {
	return Config{
		Styles: NewStyles(dark, colorprofile.TrueColor),
		Glyphs: GlyphsFor(false),
		Themes: themes,
		GOOS:   "linux",
		// The launcher is true(1), so a test that opens the tab never starts a browser.
		Env: map[string]string{"BROWSER": "true"},
	}
}

var (
	enter    = tea.KeyPressMsg{Code: tea.KeyEnter}
	down     = tea.KeyPressMsg{Code: tea.KeyDown}
	shiftTab = tea.KeyPressMsg{Code: tea.KeyTab, Mod: tea.ModShift}
)

// send delivers each message as the program would: it runs the commands an update returns and
// delivers their messages before the next one. A command still running after settle, such as a
// spinner's tick or a cursor's blink, is dropped, since a tick only redraws.
func send(m *Model, msgs ...tea.Msg) {
	for _, msg := range msgs {
		queue := []tea.Msg{msg}
		for n := 0; len(queue) > 0 && n < 1000; n++ {
			_, cmd := m.Update(queue[0])
			queue = append(queue[1:], settled(cmd)...)
		}
	}
}

const settle = 20 * time.Millisecond

var cmdType = reflect.TypeFor[tea.Cmd]()

// settled runs cmd and returns the messages it and any batch or sequence it yields produce.
func settled(cmd tea.Cmd) []tea.Msg {
	if cmd == nil {
		return nil
	}
	ch := make(chan tea.Msg, 1)
	go func() { ch <- cmd() }()
	var msg tea.Msg
	select {
	case msg = <-ch:
	case <-time.After(settle):
		return nil
	}
	if msg == nil {
		return nil
	}
	// Bubble Tea's batch and sequence messages are both slices of commands; the sequence's
	// type is unexported, so it is recognized by its shape.
	if v := reflect.ValueOf(msg); v.Kind() == reflect.Slice && v.Type().Elem() == cmdType {
		var out []tea.Msg
		for i := range v.Len() {
			c, _ := reflect.TypeAssert[tea.Cmd](v.Index(i))
			out = append(out, settled(c)...)
		}
		return out
	}
	return []tea.Msg{msg}
}

func typeText(m *Model, s string) {
	for _, r := range s {
		send(m, tea.KeyPressMsg{Code: r, Text: string(r)})
	}
}

func waiting(state setup.WaitState) setup.Event {
	return setup.Event{Kind: setup.Waiting, Waiting: state, Sentence: setup.WaitSentence(state, "Field Notes", "field-notes")}
}

// opened is a browser screen after the go-ahead, waiting on approval state.
func opened(state setup.WaitState) func(*Model) {
	return func(m *Model) {
		send(m, OpenBrowserMsg{URL: tabURL}, enter, waiting(setup.WaitCloudflare), waiting(state))
	}
}

// screens drives a fresh root to each screen through its messages, as the runner and the owner
// would.
var screens = []struct {
	name   string
	themes []scaffold.Theme
	remote bool
	drive  func(*Model)
}{
	{"welcome", oneTheme, false, func(*Model) {}},
	{"welcome-ssh", oneTheme, true, func(*Model) {}},
	{"questions-theme", twoThemes, false, func(m *Model) { send(m, enter) }},
	{"questions-name", oneTheme, false, func(m *Model) { send(m, enter); typeText(m, "Field Notes") }},
	{"questions-name-after-theme", twoThemes, false, func(m *Model) {
		send(m, enter, down, enter)
		typeText(m, "Field Notes")
	}},
	{"questions-crawlers", twoThemes, false, func(m *Model) {
		send(m, enter, enter)
		typeText(m, "Field Notes")
		send(m, enter)
	}},
	{"browser-start", oneTheme, false, func(m *Model) { send(m, OpenBrowserMsg{URL: tabURL}) }},
	{"browser-allow", oneTheme, false, opened(setup.WaitCloudflare)},
	{"browser", oneTheme, false, opened(setup.WaitCreateApp)},
	{"browser-no-launcher", oneTheme, false, func(m *Model) {
		opened(setup.WaitCreateApp)(m)
		send(m, openedMsg{err: errors.New("browser launcher xdg-open: exit status 3")})
	}},
	{"browser-late", oneTheme, false, func(m *Model) {
		opened(setup.WaitInstallAll)(m)
		send(m, CountdownMsg{Left: 4*time.Minute + 12*time.Second})
	}},
	{"prereq-no-domain", oneTheme, false, func(m *Model) {
		send(m, setup.Event{Kind: setup.StepFailed, Step: noZones.Step, Failure: &noZones})
	}},
	{"choose-account", oneTheme, false, func(m *Model) { send(m, ChooseAccountMsg{Accounts: twoAccounts}) }},
	{"choose-domain", oneTheme, false, func(m *Model) { send(m, ChooseZoneMsg{Zones: fiveZones}) }},
	{"choose-resume", oneTheme, false, func(m *Model) { send(m, ChooseResumeMsg{Runs: twoRuns}) }},
	{"prereq-node-old", oneTheme, false, failed(nodeOld)},
	{"summary", oneTheme, false, asked(fieldNotes, "")},
	{"summary-chosen", twoThemes, false, asked(chosen, "")},
	{"summary-edit-email", oneTheme, false, func(m *Model) { asked(fieldNotes, "")(m); send(m, letter('e')) }},
	{"summary-edit-address", oneTheme, false, func(m *Model) { asked(fieldNotes, "")(m); send(m, letter('a')) }},
	{"summary-address-taken", oneTheme, false, func(m *Model) {
		asked(fieldNotes, "")(m)
		editAddress(m, "blog.fieldnotes.example.com")
		send(m, enter)
		asked(fieldNotes, setup.ProblemAddress)(m)
	}},
	{"watch-start", oneTheme, false, watched(0)},
	{"watch-mid", oneTheme, false, watched(5)},
	{"watch-sign-in", oneTheme, false, watched(7)},
	{"failure-deploy", oneTheme, false, failed(workersPaid)},
	{"failure-declined", oneTheme, false, failed(declined)},
	{"done", oneTheme, false, finished(setup.Done{URL: "https://fieldnotes.example.com", SignedIn: true, Emailed: true})},
	{"done-open", oneTheme, false, finished(setup.Done{URL: "https://fieldnotes.example.com", Emailed: true})},
	{"done-scripts-skipped", oneTheme, false, finished(setup.Done{URL: "https://fieldnotes.example.com", SignedIn: true, ScriptsSkipped: true})},
	{"done-revoke-failed", oneTheme, false, finished(setup.Done{URL: "https://fieldnotes.example.com", SignedIn: true, RevokeFailed: true})},
	{"done-both-notices", oneTheme, false, finished(setup.Done{URL: "https://fieldnotes.example.com", SignedIn: true, Emailed: true, ScriptsSkipped: true, RevokeFailed: true})},
	{"stop-nothing", oneTheme, false, func(m *Model) { send(m, enter, ctrlC) }},
	{"stop-kept", oneTheme, false, func(m *Model) { watched(3)(m); send(m, ctrlC) }},
}

// tall gives a screen taller than 24 rows the window it needs: the closed summary at 60 columns,
// and at 80 the closed summary whose names carry a suffix and its reason.
var tall = map[string]int{
	"summary-60": 30, "summary-chosen-60": 30, "summary-chosen-80": 30,
}

// frame drives a local root to a screen at width by 24 in the dark theme and returns the frame.
func frame(themes []scaffold.Theme, width int, drive func(*Model)) (string, *Model) {
	return frameIn(true, themes, false, width, 24, drive)
}

// frameIn drives a root to a screen in a window width by height and returns the frame.
func frameIn(dark bool, themes []scaffold.Theme, remote bool, width, height int, drive func(*Model)) (string, *Model) {
	cfg := testConfig(dark, themes)
	cfg.Remote = remote
	m := New(cfg)
	m.Update(tea.WindowSizeMsg{Width: width, Height: height})
	drive(m)
	return m.View().Content, m
}

// TestScreenGoldens renders every screen at 80 and 60 columns in the light and the dark theme.
// Both themes must strip to the same text, which the golden holds.
func TestScreenGoldens(t *testing.T) {
	for _, sc := range screens {
		for _, width := range []int{80, 60} {
			name := fmt.Sprintf("%s-%d", sc.name, width)
			height := cmp.Or(tall[name], 24)
			t.Run(name, func(t *testing.T) {
				light, _ := frameIn(false, sc.themes, sc.remote, width, height, sc.drive)
				dark, _ := frameIn(true, sc.themes, sc.remote, width, height, sc.drive)
				if light == dark {
					t.Error("the light and dark frames carry the same bytes; the theme is not reaching the screen")
				}
				got := ansi.Strip(dark)
				if l := ansi.Strip(light); l != got {
					t.Errorf("light and dark differ in text:\nlight:\n%s\ndark:\n%s", l, got)
				}
				lines := strings.Split(strings.TrimSuffix(got, "\n"), "\n")
				for i, l := range lines {
					if w := ansi.StringWidth(l); w > width {
						t.Errorf("line %d is %d cells in a %d-wide window: %q", i, w, width, l)
					}
				}
				if strings.Contains(got, "This window is too small for setup.") {
					t.Errorf("the screen does not fit its %dx%d window; give it a height in tall", width, height)
				}
				if len(lines) > height {
					t.Errorf("frame is %d rows in a %d-row window", len(lines), height)
				}
				path := filepath.Join("testdata", name+".golden")
				if updating() {
					writeGolden(t, path, got)
				}
				if want := readGolden(t, path); got != want {
					t.Errorf("frame differs from %s:\n%s\nwant:\n%s", path, got, want)
				}
			})
		}
	}
}

func TestThemeQuestionNeedsTwoThemes(t *testing.T) {
	one, _ := frame(oneTheme, 80, func(m *Model) { send(m, enter) })
	if strings.Contains(ansi.Strip(one), "Theme") {
		t.Errorf("a one-theme catalog asks the theme question:\n%s", ansi.Strip(one))
	}
	if !strings.Contains(ansi.Strip(one), labelSiteName) {
		t.Errorf("a one-theme catalog does not open on the site name:\n%s", ansi.Strip(one))
	}
	two, _ := frame(twoThemes, 80, func(m *Model) { send(m, enter) })
	for _, want := range []string{labelTheme, "Waymark", "Survey"} {
		if !strings.Contains(ansi.Strip(two), want) {
			t.Errorf("a two-theme catalog's first question lacks %q:\n%s", want, ansi.Strip(two))
		}
	}
}

func TestQuestionsHandTheAnswersToStart(t *testing.T) {
	tests := []struct {
		name   string
		themes []scaffold.Theme
		drive  func(*Model)
		want   setup.Answers
	}{
		{"one theme", oneTheme, func(m *Model) {
			send(m, enter)
			typeText(m, "Field Notes")
			send(m, enter, down, enter)
		}, setup.Answers{SiteName: "Field Notes", Posture: setup.Invite}},
		{"two themes", twoThemes, func(m *Model) {
			send(m, enter, down, enter)
			typeText(m, "Field Notes")
			send(m, enter, enter)
		}, setup.Answers{SiteName: "Field Notes", Posture: setup.Decline, Theme: "survey"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var got []setup.Answers
			cfg := testConfig(true, tt.themes)
			cfg.Start = func(a setup.Answers) tea.Cmd { got = append(got, a); return nil }
			m := New(cfg)
			m.Update(tea.WindowSizeMsg{Width: 80, Height: 24})
			tt.drive(m)
			if len(got) != 1 || got[0] != tt.want {
				t.Fatalf("Start got %+v, want one call with %+v", got, tt.want)
			}
			if m.phase != phaseBrowser {
				t.Errorf("phase after the questions = %v, want the browser screen", m.phase)
			}
		})
	}
}

func TestSiteNameNeedsALetterOrDigit(t *testing.T) {
	started := false
	cfg := testConfig(true, oneTheme)
	cfg.Start = func(setup.Answers) tea.Cmd { started = true; return nil }
	m := New(cfg)
	send(m, tea.WindowSizeMsg{Width: 80, Height: 24}, enter)
	typeText(m, "Ωμέγα")
	send(m, enter)
	if got := strings.Join(strings.Fields(ansi.Strip(m.View().Content)), " "); !strings.Contains(got, errSlug) {
		t.Errorf("no slug error after a name with no Latin letters:\n%s", got)
	}
	if m.questions.q != qName || started {
		t.Error("the questions moved past a name that yields no repository")
	}
}

func TestBackReturnsToTheThemeQuestion(t *testing.T) {
	_, m := frame(twoThemes, 80, func(m *Model) { send(m, enter, enter, shiftTab) })
	if m.questions.q != qTheme {
		t.Errorf("question after Shift+Tab = %v, want the theme question", m.questions.q)
	}
}

// run invokes cmd and every command a batch holds, and returns the messages they produce.
func run(cmd tea.Cmd) []tea.Msg {
	if cmd == nil {
		return nil
	}
	msg := cmd()
	if b, ok := msg.(tea.BatchMsg); ok {
		var out []tea.Msg
		for _, c := range b {
			out = append(out, run(c)...)
		}
		return out
	}
	return []tea.Msg{msg}
}

func TestChoicesAnswerTheRunner(t *testing.T) {
	tests := []struct {
		name  string
		ask   func(chan<- string) tea.Msg
		keys  []tea.Msg
		want  string
		phase phase
	}{
		{"account", func(r chan<- string) tea.Msg { return ChooseAccountMsg{Accounts: twoAccounts, Reply: r} }, []tea.Msg{down, enter}, "a2", phaseBrowser},
		{"zone", func(r chan<- string) tea.Msg { return ChooseZoneMsg{Zones: fiveZones, Reply: r} }, []tea.Msg{down, down, enter}, "z3", phaseBrowser},
		{"resume", func(r chan<- string) tea.Msg { return ChooseResumeMsg{Runs: twoRuns, Reply: r} }, []tea.Msg{enter}, "field-notes-3f9a2c", phaseBrowser},
		// A new site has no run yet, so it goes on to the welcome screen and the questions.
		{"new site", func(r chan<- string) tea.Msg { return ChooseResumeMsg{Runs: twoRuns, Reply: r} }, []tea.Msg{down, down, enter}, "", phaseWelcome},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			reply := make(chan string, 1)
			m := New(testConfig(true, oneTheme))
			send(m, tea.WindowSizeMsg{Width: 80, Height: 24}, tt.ask(reply))
			send(m, tt.keys...)
			select {
			case got := <-reply:
				if got != tt.want {
					t.Errorf("reply = %q, want %q", got, tt.want)
				}
			default:
				t.Fatal("the choice sent no reply")
			}
			if m.phase != tt.phase {
				t.Errorf("phase after the choice = %v, want %v", m.phase, tt.phase)
			}
		})
	}
}

func TestOpenRunsTheLauncherAndReportsAFailure(t *testing.T) {
	tests := []struct {
		browser  string
		failLine bool
	}{
		{"true", false},
		{"false", true},
	}
	for _, tt := range tests {
		t.Run(tt.browser, func(t *testing.T) {
			reply := make(chan error, 1)
			cfg := testConfig(true, oneTheme)
			cfg.Env = map[string]string{"BROWSER": tt.browser}
			m := New(cfg)
			send(m, tea.WindowSizeMsg{Width: 80, Height: 24}, OpenBrowserMsg{URL: tabURL, Reply: reply})
			_, cmd := m.Update(enter)
			for _, msg := range run(cmd) {
				if _, ok := msg.(openedMsg); ok {
					m.Update(msg)
				}
			}
			if err := <-reply; err != nil {
				t.Errorf("reply = %v, want nil: a failed launcher is no stop", err)
			}
			flat := strings.Join(strings.Fields(ansi.Strip(m.View().Content)), " ")
			lead, _, _ := strings.Cut(browserNoOpen, " <url>")
			if got := strings.Contains(flat, lead); got != tt.failLine {
				t.Errorf("opener-failure line shown = %v, want %v:\n%s", got, tt.failLine, flat)
			}
			if !strings.Contains(flat, tabURL) {
				t.Error("the fallback link does not show the tab's address")
			}
		})
	}
}

func TestEnterOpensNothingBeforeTheRunnerAsks(t *testing.T) {
	m := New(testConfig(true, oneTheme))
	m.phase = phaseBrowser
	send(m, tea.WindowSizeMsg{Width: 80, Height: 24})
	if _, cmd := m.Update(enter); cmd != nil || m.browser.opened {
		t.Error("Enter opened a tab before the runner sent its address")
	}
}

func TestBrowserStyles(t *testing.T) {
	s := NewStyles(true, colorprofile.TrueColor)
	t.Run("the permission name is bold", func(t *testing.T) {
		f, _ := frame(oneTheme, 80, opened(setup.WaitCloudflare))
		if !strings.Contains(f, s.Title.Render(permissionName)) {
			t.Error("API Tokens: Write is not drawn in the bold text style")
		}
	})
	t.Run("a finished approval is marked in the pass ink", func(t *testing.T) {
		f, _ := frame(oneTheme, 80, opened(setup.WaitCreateApp))
		if !strings.Contains(f, s.OK.Render(GlyphsFor(false).Pass)) {
			t.Error("the Cloudflare approval is not marked done in the OK role")
		}
	})
	t.Run("the countdown warns in its last minute", func(t *testing.T) {
		for _, tt := range []struct {
			left time.Duration
			want lipgloss.Style
		}{
			{4*time.Minute + 12*time.Second, s.Title},
			{45 * time.Second, s.Strong(RoleUnknown)},
		} {
			f, _ := frame(oneTheme, 80, func(m *Model) {
				opened(setup.WaitInstallAll)(m)
				send(m, CountdownMsg{Left: tt.left})
			})
			if !strings.Contains(f, tt.want.Render(minutes(tt.left))) {
				t.Errorf("%s is not drawn in the expected ink", minutes(tt.left))
			}
		}
		if !s.Strong(RoleUnknown).GetBold() || !sameColor(s.Strong(RoleUnknown).GetForeground(), lipgloss.Color("#f7ac4d")) {
			t.Error("the warning ink is not bold Warm Stone unknown")
		}
	})
}

func TestPrereqTitleAndLinksFollowTheReason(t *testing.T) {
	pending := setup.Failure{
		Step: setup.StepCloudflareChecks, Reason: setup.ReasonZonePending,
		Happened: "Your domain fieldnotes.example.com is still being added to Cloudflare.",
		Did:      "Nothing was created.",
		Do:       "Wait until Cloudflare shows the domain as active, and then run cairn new again.",
	}
	got := ansi.Strip(testGrid(80).prereq(pending))
	if !strings.Contains(got, titleStopped) || strings.Contains(got, linkRegister) {
		t.Errorf("a pending domain gets the no-domain title or links:\n%s", got)
	}
	later := setup.Failure{Step: setup.StepPush, Reason: setup.ReasonPush}
	if prerequisite(&later) {
		t.Error("a push failure counts as a prerequisite failure")
	}
}

func TestTooSmallReplacesAnInteractiveScreen(t *testing.T) {
	f, _ := frame(oneTheme, 49, func(*Model) {})
	if !strings.Contains(ansi.Strip(f), "This window is too small for setup.") {
		t.Errorf("the welcome screen draws in a 49-column window:\n%s", ansi.Strip(f))
	}
}

func TestCatalogueHoldsNoEmptyEntry(t *testing.T) {
	for i, s := range Catalogue() {
		if strings.TrimSpace(s) == "" {
			t.Errorf("entry %d is empty", i)
		}
	}
}
