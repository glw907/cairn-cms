package render

import (
	"os"
	"regexp"
	"slices"
	"strings"
	"testing"

	"github.com/charmbracelet/colorprofile"
	"github.com/glw907/cairn-cms/tool/v2/internal/doctor"
	"github.com/glw907/cairn-cms/tool/v2/internal/render/fixtures"
	"github.com/glw907/cairn-cms/tool/v2/internal/spine"
	"github.com/glw907/cairn-cms/tool/v2/internal/style"
)

// doctorEveryState is one doctor run holding every state its terminal body draws: a critical
// failure, a warning failure, a check that could not run, two skips, a note, and three passes.
// The checks are built from their real condition ids, so the titles, the severities, and the
// fixes are the registry's.
func doctorEveryState() []doctor.CheckedResult {
	check := func(id, pass, skip string, cond spine.Condition) doctor.Check {
		return doctor.Check{ID: id, PassTitle: pass, SkipTitle: skip, Condition: cond}
	}
	result := func(c doctor.Check, s doctor.Status, detail string) doctor.CheckedResult {
		return doctor.CheckedResult{Check: c, Result: doctor.Result{Status: s, Detail: detail}}
	}
	return []doctor.CheckedResult{
		result(check("config.bindings", "Wrangler bindings are declared", "Wrangler bindings",
			spine.ConditionConfigBindingsMissing), doctor.StatusFail, "missing AUTH_DB (d1_databases)"),
		result(check("config.media-bucket", "Media bucket binding is declared", "Media bucket binding",
			spine.ConditionConfigMediaBucketMissing), doctor.StatusSkip, "no media assets configured"),
		result(check("config.observability", "Workers Logs has a sink", "Workers Logs sink",
			spine.ConditionConfigObservabilityOff), doctor.StatusFail, "observability.enabled is not true"),
		result(check("config.site-config", "Site config validates", "Site config",
			spine.ConditionConfigSiteConfigInvalid), doctor.StatusPass, "parsed"),
		result(check("config.public-origin", "PUBLIC_ORIGIN is set and valid", "PUBLIC_ORIGIN",
			spine.ConditionConfigPublicOriginInvalid), doctor.StatusPass,
			"PUBLIC_ORIGIN is https://example.com (wrangler vars)"),
		result(check("admin.mount-shape", "Custom /admin mount is complete", "Custom /admin mount",
			spine.ConditionAdminMountIncomplete), doctor.StatusInfo,
			"no wired /admin mount detected; mount the shared /admin/+layout that renders CairnAdminShell"),
		result(check("config.migrations", "Auth store migrations are copied", "Auth store migrations",
			spine.ConditionConfigMigrationsMissing), doctor.StatusPass,
			"migrations holds every required package migration"),
		result(check("auth.role-wiring", "Guard carries the declared role vocabulary", "Guard role vocabulary",
			spine.ConditionAuthRoleWiringMissing), doctor.StatusSkip, "no custom roles declared"),
		result(check("ai.posture-effective", "The stated AI posture is the served one", "Stated AI posture",
			spine.ConditionAIPostureNotEffective), doctor.StatusUnchecked,
			"could not reach the resolved origin's /robots.txt"),
	}
}

// doctorVerdict is the verdict the exit code carries for checked, from the same conversion
// cmd/cairn folds, so a golden's verdict word is never one the test chose.
func doctorVerdict(checked []doctor.CheckedResult) spine.Verdict {
	return spine.ExitCode([]spine.SiteVerdicts{doctor.Verdicts(checked)}, nil, 0)
}

// The (profile, tier) pairs cmd/cairn's reportTerminal returns on a terminal stdout, from
// style.Detect's table (detect_test.go) and the locale rule (report_terminal_test.go).
var (
	// tierNoColor is NO_COLOR: no colour, and the glyph tier left as the terminal chose it.
	tierNoColor = struct {
		profile colorprofile.Profile
		ascii   bool
	}{colorprofile.ASCII, false}
	// tierDumb is TERM=dumb: no colour and the ASCII tier.
	tierDumb = struct {
		profile colorprofile.Profile
		ascii   bool
	}{colorprofile.ASCII, true}
	// tierCLocale is LC_ALL=C with TERM=xterm-256color: the terminal's 256 colours, and the
	// ASCII tier the locale sets.
	tierCLocale = struct {
		profile colorprofile.Profile
		ascii   bool
	}{colorprofile.ANSI256, true}
)

// tierCases cuts the doctor run at TrueColor, NO_COLOR, TERM=dumb, and LC_ALL=C, and the
// one-sick health report at TERM=dumb and LC_ALL=C (its NO_COLOR frames are in the base matrix),
// at the grid's two narrow bands, 80 and 59.
func tierCases() []goldenCase {
	var out []goldenCase
	for _, width := range []int{widthNarrow - 1, style.DefaultWidth} {
		doc := goldenCase{view: "doctor", fixture: "every-state", checked: doctorEveryState(),
			width: width, profile: colorprofile.TrueColor, dark: true}
		out = append(out, doc)
		for _, tier := range []struct {
			profile colorprofile.Profile
			ascii   bool
		}{tierNoColor, tierDumb, tierCLocale} {
			c := doc
			c.profile, c.ascii = tier.profile, tier.ascii
			out = append(out, c)
		}
		for _, tier := range []struct {
			profile colorprofile.Profile
			ascii   bool
		}{tierDumb, tierCLocale} {
			out = append(out, goldenCase{view: "single", fixture: "one-sick", reports: fixtures.OneSick(),
				body: BodySingle, width: width, profile: tier.profile, dark: true, ascii: tier.ascii})
		}
	}
	return out
}

// readGolden returns c's committed bytes.
func readGolden(t *testing.T, c goldenCase) string {
	t.Helper()
	data, err := os.ReadFile(c.path())
	if err != nil {
		t.Fatalf("%v; run `make -C tool golden` to cut it", err)
	}
	return strings.ReplaceAll(string(data), "\r\n", "\n")
}

// plainFrame returns frame's lines with every escape removed, line by line, since stripANSI's
// sanitizer also drops the newline.
func plainFrame(frame string) []string {
	lines := strings.Split(frame, "\n")
	for i, l := range lines {
		lines[i] = stripANSI(l)
	}
	return lines
}

// terminalCases returns the committed health single-site and doctor frames matching keep.
func terminalCases(t *testing.T, keep func(goldenCase) bool) []goldenCase {
	t.Helper()
	var out []goldenCase
	for _, c := range goldenCases() {
		if (c.view == "single" || c.view == "doctor") && keep(c) {
			out = append(out, c)
		}
	}
	if len(out) == 0 {
		t.Fatal("no golden matched, so nothing was asserted")
	}
	return out
}

// wantWords returns the verdict word, the section names, and the marks c's frame must carry.
func wantWords(c goldenCase) []string {
	g := style.MarksFor(c.ascii)
	if c.view == "doctor" {
		return []string{doctorVerdict(c.checked).String(), labelFailing, labelCouldNotRun, labelNotes,
			labelDoesNotApply, labelPassing, g.Failing, g.FailingWarn, g.CouldNotRun, g.Pass, g.Fix}
	}
	words := []string{verdictFor(c.reports).String(), labelPassing, g.Pass}
	s := split(c.reports[0])
	if len(s.Failing) > 0 {
		words = append(words, labelFailing)
	}
	if len(s.CouldNotRun) > 0 {
		words = append(words, labelCouldNotRun, g.CouldNotRun)
	}
	if len(s.Held) > 0 {
		words = append(words, labelHeld, g.Held)
	}
	return words
}

// TestNoColourTerminalGoldensHoldNoEscapeAndEveryWord holds the no-colour health and doctor
// frames to carrying no escape byte while still naming the verdict, every section, and every
// mark, so the structure survives without ink.
func TestNoColourTerminalGoldensHoldNoEscapeAndEveryWord(t *testing.T) {
	for _, c := range terminalCases(t, func(c goldenCase) bool { return c.profile == colorprofile.ASCII }) {
		t.Run(c.path(), func(t *testing.T) {
			frame := readGolden(t, c)
			if strings.Contains(frame, "\x1b") {
				t.Error("a no-colour frame carries an escape byte")
			}
			for _, w := range wantWords(c) {
				if !strings.Contains(frame, w) {
					t.Errorf("the frame carries no %q", w)
				}
			}
			if c.view != "doctor" {
				return
			}
			// The tally line carries the section words too, so a doctor section is held to its
			// own title line.
			lines := plainFrame(frame)
			for _, label := range []string{labelFailing, labelCouldNotRun, labelNotes} {
				if !slices.Contains(lines, "  "+label) {
					t.Errorf("no %q section title", label)
				}
			}
		})
	}
}

// TestDumbTerminalGoldensHoldOnlyPrintableASCII holds the TERM=dumb frames to the bytes 0x20 to
// 0x7E and the newline, which is what a terminal with no capabilities can show.
func TestDumbTerminalGoldensHoldOnlyPrintableASCII(t *testing.T) {
	for _, c := range terminalCases(t, func(c goldenCase) bool {
		return c.profile == tierDumb.profile && c.ascii == tierDumb.ascii
	}) {
		t.Run(c.path(), func(t *testing.T) {
			for i, b := range []byte(readGolden(t, c)) {
				if b != '\n' && (b < 0x20 || b > 0x7e) {
					t.Fatalf("byte %d is %#x, outside 0x20 to 0x7E", i, b)
				}
			}
		})
	}
}

// TestCLocaleGoldensKeepColourAndHoldNoHighByte holds the LC_ALL=C frames to the locale rule: the
// locale drops the marks to ASCII and never the colour, so the frame carries an escape and no
// byte at or above 0x80.
func TestCLocaleGoldensKeepColourAndHoldNoHighByte(t *testing.T) {
	for _, c := range terminalCases(t, func(c goldenCase) bool {
		return c.profile == tierCLocale.profile && c.ascii == tierCLocale.ascii
	}) {
		t.Run(c.path(), func(t *testing.T) {
			frame := readGolden(t, c)
			if !strings.Contains(frame, "\x1b") {
				t.Error("the frame carries no escape, so the locale dropped the colour")
			}
			for i, b := range []byte(frame) {
				if b >= 0x80 {
					t.Fatalf("byte %d is %#x, at or above 0x80", i, b)
				}
			}
		})
	}
}

// pipeStatusRow matches a doctor.Format line, which leads with its status word and two spaces.
var pipeStatusRow = regexp.MustCompile(`(?m)^ *(PASS|FAIL|SKIP|INFO|UNCHECKED)  `)

// TestDoctorTerminalGoldensPrintNoPipeStatusWord holds the terminal body to marks over status
// words. The same fixture through doctor.Format is the control that the pattern finds the pipe's
// rows.
func TestDoctorTerminalGoldensPrintNoPipeStatusWord(t *testing.T) {
	if n := len(pipeStatusRow.FindAllString(doctor.Format(doctorEveryState()), -1)); n != len(doctorEveryState()) {
		t.Fatalf("the pattern matched %d of doctor.Format's %d rows, so it could not fail", n, len(doctorEveryState()))
	}
	for _, c := range terminalCases(t, func(c goldenCase) bool { return c.view == "doctor" }) {
		t.Run(c.path(), func(t *testing.T) {
			if m := pipeStatusRow.FindString(strings.Join(plainFrame(readGolden(t, c)), "\n")); m != "" {
				t.Errorf("the frame prints a pipe row: %q", m)
			}
		})
	}
}

// TestDoctorFailureLinksTheAddressThePipePrints: each failure's terminal link targets the docs
// address doctor.Format prints on a pipe, so the two forms cannot drift apart.
func TestDoctorFailureLinksTheAddressThePipePrints(t *testing.T) {
	checked := doctorEveryState()
	f := Render(RenderInput{
		View: ViewDoctor, Width: 120, Dark: true, Profile: colorprofile.TrueColor,
		Site: "my-site", Checked: checked, Verdict: doctorVerdict(checked), Now: fixtures.Now(),
	})
	frame := strings.Join(f.Lines(), "\n")
	pipe := doctor.Format(checked)
	for _, cr := range checked {
		if cr.Result.Status != doctor.StatusFail {
			continue
		}
		text, _ := spine.TextFor(cr.Check.Condition)
		url := doctor.DocsURL(text.DocsAnchor)
		if !strings.Contains(pipe, "Docs: "+url) {
			t.Fatalf("the pipe report does not print %q", url)
		}
		if !strings.Contains(frame, "\x1b]8;;"+url+"\a") {
			t.Errorf("the terminal body does not link %q", url)
		}
	}
}

// TestDoctorFailureWithNoRegistryEntryPanics pins the invariant doctorFailRows leans on to read
// its condition text without a miss branch: a failing check whose condition has no registry
// entry panics in the doctor package's registry lookup before any row is drawn.
func TestDoctorFailureWithNoRegistryEntryPanics(t *testing.T) {
	checked := []doctor.CheckedResult{{
		Check:  doctor.Check{ID: "x.unregistered", Condition: spine.Condition("x.unregistered")},
		Result: doctor.Result{Status: doctor.StatusFail, Detail: "detail"},
	}}
	defer func() {
		if recover() == nil {
			t.Error("a failing check with no registry entry rendered without panicking")
		}
	}()
	Render(RenderInput{View: ViewDoctor, Width: 80, Dark: true, Profile: colorprofile.TrueColor,
		Site: "my-site", Checked: checked, Verdict: spine.VerdictCritical, Now: fixtures.Now()})
}

// TestDoctorFailureMarkFollowsItsConditionSeverity holds a failing doctor row to the filled mark
// when its condition is critical and the outlined mark when it is a warning.
func TestDoctorFailureMarkFollowsItsConditionSeverity(t *testing.T) {
	for _, c := range terminalCases(t, func(c goldenCase) bool { return c.view == "doctor" }) {
		t.Run(c.path(), func(t *testing.T) {
			g := style.MarksFor(c.ascii)
			lines := plainFrame(readGolden(t, c))
			for title, mark := range map[string]string{
				"Wrangler bindings are missing": g.Failing,
				"Workers Logs has no sink":      g.FailingWarn,
			} {
				if !slices.Contains(lines, "  "+mark+" "+title) {
					t.Errorf("no row %q", "  "+mark+" "+title)
				}
			}
		})
	}
}
