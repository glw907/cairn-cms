package style

import (
	"strings"
	"testing"

	"github.com/charmbracelet/colorprofile"
	"github.com/charmbracelet/x/ansi"
)

// tiers returns a coloured theme at each glyph tier, so every block test runs at both.
func tiers() map[string]Theme {
	return map[string]Theme{
		"unicode": NewTheme(true, colorprofile.TrueColor, false),
		"ascii":   NewTheme(true, colorprofile.TrueColor, true),
	}
}

// colOf returns the cell column sub starts at on line, escapes stripped, and -1 when absent.
func colOf(th Theme, line, sub string) int {
	before, _, found := strings.Cut(ansi.Strip(line), sub)
	if !found {
		return -1
	}
	return th.Width(before)
}

// fits fails on any line wider than width.
func fits(t *testing.T, th Theme, lines []string, width int) {
	t.Helper()
	for _, l := range lines {
		if w := th.Width(l); w > width {
			t.Errorf("line %q is %d cells, over %d", ansi.Strip(l), w, width)
		}
	}
}

// eachCase runs fn at both tiers and at 80 and 50 columns.
func eachCase(t *testing.T, fn func(t *testing.T, th Theme, m Marks, width int)) {
	for name, th := range tiers() {
		for _, width := range []int{80, 50} {
			t.Run(name+"/"+map[int]string{80: "w80", 50: "w50"}[width], func(t *testing.T) {
				fn(t, th, th.marks(), width)
			})
		}
	}
}

func TestVerdictLine(t *testing.T) {
	eachCase(t, func(t *testing.T, th Theme, m Marks, width int) {
		lines := VerdictLine(th, "CRITICAL", RoleFailing, "my-site", "1 failing · 3 could not run · 5 passing", width)
		fits(t, th, lines, width)
		if c := colOf(th, lines[0], "CRITICAL"); c != margin {
			t.Errorf("verdict word at column %d, want %d", c, margin)
		}
		if c := colOf(th, lines[0], "my-site"); c != margin+len("CRITICAL")+2 {
			t.Errorf("subject at column %d", c)
		}
		tallyAt := colOf(th, strings.Join(lines, "\n"), "1 failing")
		if width == 50 && (len(lines) != 2 || colOf(th, lines[1], "1 failing") != margin) {
			t.Errorf("at 50 the tally should take its own line at the margin, got %q", lines)
		}
		if width == 80 && (len(lines) != 1 || tallyAt < 0) {
			t.Errorf("at 80 the tally should ride the head line, got %q", lines)
		}
	})
}

func TestTitleIsBoldLowercase(t *testing.T) {
	eachCase(t, func(t *testing.T, th Theme, m Marks, width int) {
		lines := Title(th, "Could Not Run", width)
		if len(lines) != 1 || colOf(th, lines[0], "could not run") != margin {
			t.Fatalf("title = %q, want \"could not run\" at the margin", lines)
		}
		if !strings.Contains(lines[0], "\x1b[1") {
			t.Errorf("title %q carries no bold", lines[0])
		}
	})
	plain := NewTheme(true, colorprofile.ASCII, false)
	if got := Title(plain, "held", 80); strings.Contains(got[0], "\x1b") {
		t.Errorf("title at no colour carries an escape: %q", got[0])
	}
}

func TestMarkRowShortName(t *testing.T) {
	eachCase(t, func(t *testing.T, th Theme, m Marks, width int) {
		detail := "the token this check reads is not set, so the check could not tell either way"
		lines := MarkRow(th, m.CouldNotRun, RoleUnknown, "email", detail, width)
		fits(t, th, lines, width)
		if c := colOf(th, lines[0], m.CouldNotRun); c != margin {
			t.Errorf("mark at column %d, want %d", c, margin)
		}
		if c := colOf(th, lines[0], "email"); c != nameCol {
			t.Errorf("name at column %d, want %d", c, nameCol)
		}
		want := valueCol
		first := 0
		if width < oneColumnBelow {
			want, first = nameCol, 1
			if strings.TrimSpace(ansi.Strip(lines[0])) != m.CouldNotRun+" email" {
				t.Errorf("below 60 the name takes its own line, got %q", ansi.Strip(lines[0]))
			}
		}
		if c := colOf(th, lines[first], "the token"); c != want {
			t.Errorf("detail at column %d, want %d", c, want)
		}
		for _, l := range lines[first+1:] {
			if c := th.Width(ansi.Strip(l)) - th.Width(strings.TrimLeft(ansi.Strip(l), " ")); c != want {
				t.Errorf("continuation %q at column %d, want %d", ansi.Strip(l), c, want)
			}
		}
	})
}

func TestMarkRowLongNameTakesItsOwnLine(t *testing.T) {
	eachCase(t, func(t *testing.T, th Theme, m Marks, width int) {
		name := "Session secret is missing"
		lines := MarkRow(th, m.Failing, RoleFailing, name, "SESSION_SECRET is not set", width)
		fits(t, th, lines, width)
		if len(lines) != 2 || colOf(th, lines[0], name) != nameCol || colOf(th, lines[1], "SESSION_SECRET") != nameCol {
			t.Errorf("long name rows = %q, want the name then the detail, both at %d", lines, nameCol)
		}
	})
	th := NewTheme(true, colorprofile.ASCII, false)
	if c := th.DetailColumn("fifteen-cells-x", 80); c != valueCol {
		t.Errorf("a 15-cell name has detail column %d, want %d", c, valueCol)
	}
	if c := th.DetailColumn("sixteen-cells-xy", 80); c != nameCol {
		t.Errorf("a 16-cell name has detail column %d, want %d", c, nameCol)
	}
}

func TestLabelRow(t *testing.T) {
	eachCase(t, func(t *testing.T, th Theme, m Marks, width int) {
		lines := LabelRow(th, "Domain", "docs.example.org", width)
		fits(t, th, lines, width)
		if c := colOf(th, lines[0], "Domain"); c != margin {
			t.Errorf("label at column %d, want %d", c, margin)
		}
		if width >= oneColumnBelow {
			if c := colOf(th, lines[0], "docs.example.org"); c != valueCol {
				t.Errorf("value at column %d, want %d", c, valueCol)
			}
			return
		}
		if len(lines) != 2 || colOf(th, lines[1], "docs.example.org") != nameCol {
			t.Errorf("below 60 the value goes under the label at %d, got %q", nameCol, lines)
		}
	})
}

func TestContinuationLine(t *testing.T) {
	eachCase(t, func(t *testing.T, th Theme, m Marks, width int) {
		col := th.DetailColumn("creds", width)
		text := "CAIRN_CF_READ_TOKEN read from the keyring, expires on the 26th, in six days from now"
		lines := ContinuationLine(th, RoleMuted, text, col, width)
		fits(t, th, lines, width)
		for _, l := range lines {
			if c := th.Width(ansi.Strip(l)) - th.Width(strings.TrimLeft(ansi.Strip(l), " ")); c != col {
				t.Errorf("line %q at column %d, want %d", ansi.Strip(l), c, col)
			}
		}
	})
}

func TestFixLine(t *testing.T) {
	eachCase(t, func(t *testing.T, th Theme, m Marks, width int) {
		col := th.DetailColumn("creds", width)
		url := "https://cairn.pub/docs/admin/is-it-working#creds"
		lines := FixLine(th, "Create a new token, then run `cairn auth set` naming the credential.", url, col, width)
		fits(t, th, lines, width)
		if c := colOf(th, lines[0], m.Fix); c != col-2 {
			t.Errorf("fix mark at column %d, want %d", c, col-2)
		}
		if c := colOf(th, lines[0], "Create"); c != col {
			t.Errorf("fix text at column %d, want %d", c, col)
		}
		// A URL wider than its column hard-wraps rather than being cut, so its start is found
		// by its scheme.
		var urlLine string
		for _, l := range lines {
			if strings.Contains(ansi.Strip(l), "https://") {
				urlLine = l
			}
		}
		if c := colOf(th, urlLine, "https://"); c != col {
			t.Errorf("url at column %d, want %d", c, col)
		}
		if !strings.Contains(urlLine, "\x1b]8;") {
			t.Errorf("url line %q is not a hyperlink in colour", urlLine)
		}
	})
	if got := FixLine(NewTheme(true, colorprofile.ASCII, false), "", "", valueCol, 80); got != nil {
		t.Errorf("an empty fix printed %q", got)
	}
}

func TestTable(t *testing.T) {
	header := []string{"site", "name", "domain"}
	rows := [][]string{
		{"my-site", "Field Notes", "fieldnotes.example.org"},
		{"a-site-name-much-longer-than-thirty-two-cells", "Trail Docs", "docs.example.org"},
	}
	eachCase(t, func(t *testing.T, th Theme, m Marks, width int) {
		lines := Table(th, header, rows, width)
		fits(t, th, lines, width)
		if c := colOf(th, lines[0], "site"); c != margin {
			t.Errorf("name column at %d, want %d", c, margin)
		}
		name := colOf(th, lines[0], "name")
		if name != margin+tableNameMax+tableGap {
			t.Errorf("second column at %d, want %d", name, margin+tableNameMax+tableGap)
		}
		if !strings.Contains(lines[2], m.Ellipsis) {
			t.Errorf("an over-long name was not cut with the ellipsis: %q", lines[2])
		}
		hasDomain := colOf(th, lines[0], "domain") >= 0
		if hasDomain != (width == 80) {
			t.Errorf("at %d the domain column shown = %v", width, hasDomain)
		}
		if colOf(th, lines[1], "Field Notes") != name {
			t.Errorf("row cell not under its header: %q", lines[1])
		}
	})
}

func TestProgressLine(t *testing.T) {
	eachCase(t, func(t *testing.T, th Theme, m Marks, width int) {
		line := ProgressLine(th, 9, "Checking my-site, 4 of 9, and every check after it as it settles", width)
		fits(t, th, []string{line}, width)
		want := m.Spinner
		if !th.ascii() {
			want = string([]rune(m.Spinner)[1])
		}
		if c := colOf(th, line, want); c != margin {
			t.Errorf("spinner frame %q at column %d, want %d", want, c, margin)
		}
		if th.Width(line) == width && !strings.HasSuffix(ansi.Strip(line), m.Ellipsis) {
			t.Errorf("a cut progress line does not end on the ellipsis: %q", ansi.Strip(line))
		}
	})
	th := NewTheme(true, colorprofile.ASCII, false)
	if a, b := ProgressLine(th, -1, "x", 80), ProgressLine(th, 7, "x", 80); a != b {
		t.Errorf("frame -1 = %q, want frame 7's %q", a, b)
	}
}

func TestErrorBlock(t *testing.T) {
	eachCase(t, func(t *testing.T, th Theme, m Marks, width int) {
		lines := ErrorBlock(th, "--since takes a duration, such as 2h or 30m.", `It got "tuesday".`,
			"Run `cairn logs --help` for its forms.", width)
		fits(t, th, lines, width)
		if len(lines) != 3 {
			t.Fatalf("error block = %q, want three lines", lines)
		}
		if colOf(th, lines[0], m.Failing) != margin || colOf(th, lines[0], "--since") != nameCol {
			t.Errorf("what line = %q", ansi.Strip(lines[0]))
		}
		if colOf(th, lines[1], "It got") != nameCol {
			t.Errorf("why line = %q", ansi.Strip(lines[1]))
		}
		if colOf(th, lines[2], m.Fix) != margin || colOf(th, lines[2], "Run") != nameCol {
			t.Errorf("fix line = %q", ansi.Strip(lines[2]))
		}
	})
	if got := ErrorBlock(NewTheme(true, colorprofile.ASCII, false), "it broke", "", "", 80); len(got) != 1 {
		t.Errorf("an error with no why or fix = %q, want one line", got)
	}
}

func TestBlocksCapContentAt120(t *testing.T) {
	th := NewTheme(true, colorprofile.ASCII, false)
	long := strings.Repeat("word ", 60)
	for _, l := range MarkRow(th, "?", RoleUnknown, "name", long, 200) {
		if th.Width(l) > widthCap {
			t.Errorf("line %d cells at width 200, over the %d cap", th.Width(l), widthCap)
		}
	}
}
