package main

import (
	"errors"
	"strings"
	"testing"

	"github.com/charmbracelet/colorprofile"
	"github.com/charmbracelet/x/ansi"

	"github.com/glw907/cairn-cms/tool/v2/internal/style"
)

// TestErrorBlockDrawsAnArrowOnlyForAFix renders three errors at TrueColor on both glyph tiers:
// --since's refusal, an untyped error, and a Run-line error. --since and the Run line draw a fix
// line and the untyped error does not, so the test fails both when an arrow leaks onto
// an error with no fix and when the block never draws one.
func TestErrorBlockDrawsAnArrowOnlyForAFix(t *testing.T) {
	cases := []struct {
		name    string
		err     error
		head    string
		wantFix bool
	}{
		{"invalid since", invalidSinceError("tuesday"), `--since "tuesday" is not a duration.`, true},
		{"untyped", translateError(errRaw{"open sites: permission denied"}), "open sites: permission denied", false},
		{"typed fix", unknownCommandError("healt"), `"healt" is not a cairn command.`, true},
	}
	for _, ascii := range []bool{false, true} {
		theme := style.NewTheme(true, colorprofile.TrueColor, ascii)
		for _, c := range cases {
			message, fix := splitFix(c.err)
			lines := errorBlock(theme, message, fix, 80)
			if len(lines) == 0 {
				t.Fatalf("%s: the block drew nothing", c.name)
			}
			if first := ansi.Strip(lines[0]); !strings.Contains(first, c.head) || strings.Contains(first, "cairn: ") {
				t.Errorf("%s (ascii %v): headline %q, want %q with no cairn: prefix", c.name, ascii, first, c.head)
			}
			fixLines := 0
			for _, l := range lines {
				plain := strings.TrimSpace(ansi.Strip(l))
				if strings.Contains(plain, "→") || strings.HasPrefix(plain, ">") {
					fixLines++
				}
			}
			if got := fixLines > 0; got != c.wantFix {
				t.Errorf("%s (ascii %v): fix line drawn = %v, want %v:\n%s", c.name, ascii, got, c.wantFix, strings.Join(lines, "\n"))
			}
		}
	}
}

// TestEveryRunLineErrorCarriesItsFix holds that each error ending in a Run line hands the printer
// that line as its fix, so the block draws it on the fix mark rather than as muted text, and that
// the message and fix rejoin to the bytes a pipe receives.
func TestEveryRunLineErrorCarriesItsFix(t *testing.T) {
	cases := map[string]error{
		"flag":                     flagError("cairn health", errors.New("unknown flag: --bogus")),
		"unknown command":          unknownCommandError("healt"),
		"auth no subcommand":       authNoSubcommandError(),
		"unknown site":             unknownSiteError("my-site-a1b2c3"),
		"health arity":             healthTooManyArgsError(),
		"doctor arity":             doctorTooManyArgsError(),
		"adopt no domain":          adoptNoDomainError("my-site"),
		"adopt no worker":          adoptNoWorkerError(),
		"adopt unknown worker":     adoptUnknownWorkerError("my-site"),
		"no cloudflare credential": noCloudflareCredentialError(),
		"new requires":             newRequiresError("--email", "--plan"),
		"new conflict":             newConflictError("--plan", "--apply"),
		"new bad posture":          newBadPostureError("maybe"),
		"new usage":                newUsageError("cairn: --name: too long"),
		"new host outside zone":    newHostOutsideZoneError("a.example.org", "example.com"),
		"new unfinished":           newUnfinishedError("abc123"),
		"new several unfinished":   newSeveralUnfinishedError([]string{"abc123", "def456"}),
		"new no setup":             newNoSetupError("abc123"),
		"new no run for plan":      newNoRunForPlanError("run-1"),
		"new plan unreadable":      newPlanUnreadableError(errors.New("open plan.json: no such file or directory")),
	}
	for name, err := range cases {
		message, fix := splitFix(err)
		if !strings.HasPrefix(fix, "Run `") {
			t.Errorf("%s: fix = %q, want its Run line", name, fix)
		}
		if message+"\n"+fix != err.Error() {
			t.Errorf("%s: message and fix rejoin to %q, want %q", name, message+"\n"+fix, err.Error())
		}
	}
}

// TestErrorBlockKeepsEveryLine holds that a message of several lines keeps each of them, the
// headline first, and that the fix comes last.
func TestErrorBlockKeepsEveryLine(t *testing.T) {
	message, fix := splitFix(newUnfinishedError("abc123"))
	lines := errorBlock(style.NewTheme(true, colorprofile.ASCII, false), message, fix, 120)
	want := []string{
		"  ■ an unfinished setup exists: abc123.",
		"    Continue it with --resume abc123, or start a new site with --new.",
		"  → Run `cairn new --help` for the flags",
	}
	if strings.Join(lines, "\n") != strings.Join(want, "\n") {
		t.Errorf("block =\n%s\nwant\n%s", strings.Join(lines, "\n"), strings.Join(want, "\n"))
	}
}

// TestErrorFlagsReadsColorAndTheme holds the printer's pre-parse: --color and --theme are read
// wherever they sit, an explicit --theme carries its Changed bit, and args the pre-parse cannot
// read fall back to the defaults.
func TestErrorFlagsReadsColorAndTheme(t *testing.T) {
	cases := []struct {
		args []string
		want rootFlags
	}{
		{[]string{"healt", "--color", "never"}, rootFlags{color: colorNever, theme: themeDark}},
		{[]string{"logs", "my-site", "--since", "tuesday", "--theme=light"}, rootFlags{color: colorAuto, theme: themeLight, themeSet: true}},
		{[]string{"health", "--theme", "dark", "--bogus"}, rootFlags{color: colorAuto, theme: themeDark, themeSet: true}},
		{[]string{"health", "--color"}, rootFlags{color: colorAuto, theme: themeDark}},
	}
	for _, c := range cases {
		if got := *errorFlags(c.args); got != c.want {
			t.Errorf("errorFlags(%q) = %+v, want %+v", c.args, got, c.want)
		}
	}
}

// TestInvalidSinceFixSitsOnTheArrow holds that --since's instruction draws on the fix mark, not as
// a muted why-line, and that the message and fix rejoin to the one line a pipe prints.
func TestInvalidSinceFixSitsOnTheArrow(t *testing.T) {
	message, fix := splitFix(invalidSinceError("tuesday"))
	if fix != fixInvalidSince || strings.Contains(message, "\n") {
		t.Fatalf("split = %q, %q, want the refusal alone and the Use line as the fix", message, fix)
	}
	theme := style.NewTheme(true, colorprofile.TrueColor, false)
	joined := ansi.Strip(strings.Join(errorBlock(theme, message, fix, 80), "\n"))
	if !strings.Contains(joined, "→ Use a whole number of minutes, hours, or days: 90m, 24h, 7d") {
		t.Errorf("block = %q, want the Use line on the arrow", joined)
	}
}
