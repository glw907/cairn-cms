package main

import (
	"strings"
	"testing"

	"github.com/charmbracelet/colorprofile"
	"github.com/charmbracelet/x/ansi"

	"github.com/glw907/cairn-cms/tool/v2/internal/style"
)

// TestErrorBlockDrawsAnArrowOnlyForAFix renders three errors at TrueColor on both glyph tiers:
// --since's refusal, whose second line opens Use and so carries no fix, an untyped error, and a
// Run-line error. Only the last draws a fix line, so the test fails both when an arrow leaks onto
// an error with no fix and when the block never draws one.
func TestErrorBlockDrawsAnArrowOnlyForAFix(t *testing.T) {
	cases := []struct {
		name    string
		err     error
		head    string
		wantFix bool
	}{
		{"invalid since", invalidSinceError("tuesday"), `--since "tuesday" is not a duration.`, false},
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
