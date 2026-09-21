package render

import (
	"reflect"
	"regexp"
	"strings"
	"testing"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/health"
	"github.com/glw907/cairn-cms/tool/internal/render/fixtures"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// input builds one RenderInput over a fixture, with the clock every fixture is built against.
func input(reports []health.Report, body Body, width int, p Profile, ascii bool, v Verdict) RenderInput {
	return RenderInput{
		View:    ViewHealth,
		Body:    body,
		Width:   width,
		Dark:    true,
		Profile: p,
		ASCII:   ascii,
		Reports: reports,
		Verdict: v,
		Now:     fixtures.Now(),
	}
}

// plainLines renders in and returns its lines with every escape sequence removed, which is what
// an assertion about characters rather than ink reads.
func plainLines(in RenderInput) []string {
	lines := Render(in).Lines()
	out := make([]string, len(lines))
	for i, l := range lines {
		out[i] = stripANSI(l)
	}
	return out
}

// TestSelectBody is criterion 1's six-row table: two scopes times three TTY-and-colour states.
// Colour beyond ProfileNoColor never changes the body, only the ink, so no row multiplies.
func TestSelectBody(t *testing.T) {
	tests := []struct {
		name  string
		sites int
		tty   bool
		want  Body
	}{
		{"one site on a colour terminal", 1, true, BodySingle},
		{"one site on a no-colour terminal", 1, true, BodySingle},
		{"one site into a pipe", 1, false, BodyPlain},
		{"many sites on a colour terminal", 3, true, BodyMany},
		{"many sites on a no-colour terminal", 3, true, BodyMany},
		{"many sites into a pipe", 3, false, BodyPlain},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := SelectBody(tt.sites, tt.tty); got != tt.want {
				t.Errorf("SelectBody(%d, %v) = %v, want %v", tt.sites, tt.tty, got, tt.want)
			}
		})
	}
}

// TestPlainBodyForcedColour asserts --color=always into a pipe still renders the plain body, in
// colour: the colour choice and the body choice are separate axes.
func TestPlainBodyForcedColour(t *testing.T) {
	if got := SelectBody(1, false); got != BodyPlain {
		t.Fatalf("SelectBody into a pipe = %v, want BodyPlain", got)
	}
	f := Render(input(fixtures.OneSick(), BodyPlain, 80, ProfileTrueColor, true, spine.VerdictCritical))
	if !strings.Contains(strings.Join(f.Lines(), "\n"), "\x1b[") {
		t.Error("the plain body emitted no escape sequence under a forced colour profile")
	}
}

// TestSharedLayer is criterion 2: one fixture through all three bodies carries the same facts.
func TestSharedLayer(t *testing.T) {
	reports := fixtures.OneSick()
	bodies := map[string]RenderInput{
		"single unicode": input(reports, BodySingle, 120, ProfileTrueColor, false, spine.VerdictCritical),
		"single ascii":   input(reports, BodySingle, 120, ProfileNoColor, true, spine.VerdictCritical),
		"plain":          input(reports, BodyPlain, 120, ProfileNoColor, true, spine.VerdictCritical),
	}
	facts := []string{
		"CRITICAL", "907.life",
		"creds", "deploy", "engine", "email", "errors", "https-forced", "serving",
		"edge.https-not-forced",
		"3 failing", "2 could not run", "1 held", "3 passing",
	}
	for name, in := range bodies {
		t.Run(name, func(t *testing.T) {
			text := strings.Join(plainLines(in), "\n")
			for _, fact := range facts {
				if !strings.Contains(text, fact) {
					t.Errorf("%q is missing from the frame", fact)
				}
			}
		})
	}
}

// TestVerdictFirstAndLast is criterion 3 and criterion 15: the first and last non-blank lines
// carry the verdict word, for all four verdicts and both bodies, and the plain body's exit code
// follows its last verdict line.
func TestVerdictFirstAndLast(t *testing.T) {
	for _, v := range []Verdict{spine.VerdictOK, spine.VerdictWarning, spine.VerdictCritical, spine.VerdictUnknown} {
		for _, body := range []Body{BodySingle, BodyPlain} {
			lines := plainLines(input(fixtures.OneSick(), body, 100, ProfileTrueColor, false, v))
			var live []string
			for _, l := range lines {
				if strings.TrimSpace(l) != "" {
					live = append(live, l)
				}
			}
			if len(live) < 2 {
				t.Fatalf("verdict %v body %v: frame has %d non-blank lines", v, body, len(live))
			}
			if !strings.Contains(live[0], v.String()) {
				t.Errorf("verdict %v body %v: first line %q carries no verdict word", v, body, live[0])
			}
			last := live[len(live)-1]
			if body == BodyPlain {
				if last != keyExit+string(rune('0'+int(v))) {
					t.Errorf("verdict %v: last plain line = %q, want the exit code", v, last)
				}
				last = live[len(live)-2]
			}
			if !strings.Contains(last, v.String()) {
				t.Errorf("verdict %v body %v: last line %q carries no verdict word", v, body, last)
			}
		}
	}
}

// TestOnePassRule is criterion 4: in a frame whose verdict is anything but OK, no span carries
// the ok role's saturated ink. Green means this run is OK.
func TestOnePassRule(t *testing.T) {
	theme := NewTheme(true, ProfileTrueColor)
	okInk := inkOf(theme, RoleOK)
	if okInk == "" {
		t.Fatal("the ok role resolved to no ink, so this test could not fail")
	}
	for _, v := range []Verdict{spine.VerdictWarning, spine.VerdictCritical, spine.VerdictUnknown} {
		f := Render(input(fixtures.OneSick(), BodySingle, 120, ProfileTrueColor, false, v))
		for _, sp := range frameSpans(f) {
			if sp.sgr == okInk {
				t.Errorf("verdict %v: %q carries the ok role's saturated ink", v, sp.text)
			}
		}
	}
	f := Render(input(fixtures.Healthy(), BodySingle, 120, ProfileTrueColor, false, spine.VerdictOK))
	found := false
	for _, sp := range frameSpans(f) {
		if sp.sgr == okInk {
			found = true
		}
	}
	if !found {
		t.Error("an OK run spent no ok ink at all, so the rule above proves nothing")
	}
}

// TestNoRail is criterion 6: the failing group carries no rail. Its edge comes from the inset
// rule above it, so no vertical mark runs down the left of any row.
func TestNoRail(t *testing.T) {
	for _, l := range plainLines(input(fixtures.OneSick(), BodySingle, 120, ProfileTrueColor, false, spine.VerdictCritical)) {
		if strings.ContainsAny(l, "▌│┃|┆┊") {
			t.Errorf("line %q carries a vertical rail", l)
		}
	}
}

// TestStateWordKeptWhereHueCannotCarryIt is criterion 7. The word is dropped only in the colour
// Unicode tier; the ASCII tier, the plain body, and any ProfileNoColor terminal keep it.
func TestStateWordKeptWhereHueCannotCarryIt(t *testing.T) {
	tests := []struct {
		name string
		in   RenderInput
		want bool
	}{
		{"colour unicode", input(fixtures.OneSick(), BodySingle, 120, ProfileTrueColor, false, spine.VerdictCritical), false},
		{"ascii tier", input(fixtures.OneSick(), BodySingle, 120, ProfileTrueColor, true, spine.VerdictCritical), true},
		{"no colour on a unicode terminal", input(fixtures.OneSick(), BodySingle, 120, ProfileNoColor, false, spine.VerdictCritical), true},
		{"plain body", input(fixtures.OneSick(), BodyPlain, 120, ProfileTrueColor, false, spine.VerdictCritical), true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			text := strings.Join(plainLines(tt.in), "\n")
			got := strings.Contains(text, "fail") && strings.Contains(text, "skip")
			if got != tt.want {
				t.Errorf("state words present = %v, want %v", got, tt.want)
			}
		})
	}
}

// TestNoGlyphOnlySetting is criterion 7's second half: the rule is enforced in code, so
// RenderInput carries no field an operator's flag could reach to remove the word.
func TestNoGlyphOnlySetting(t *testing.T) {
	for field := range reflect.TypeFor[RenderInput]().Fields() {
		name := strings.ToLower(field.Name)
		if strings.Contains(name, "word") || strings.Contains(name, "glyph") {
			t.Errorf("RenderInput carries a field %q; the state word is not an operator's choice", field.Name)
		}
	}
}

// TestTwoSeverityMark is criterion 8: a failure whose severity alone would carry the run to
// WARNING renders outlined, in both bodies, and a CRITICAL-class failure renders filled. The
// mark reads the same predicate the verdict does, so the two can never disagree.
func TestTwoSeverityMark(t *testing.T) {
	theme := NewTheme(true, ProfileTrueColor)
	g := theme.GlyphSet.Unicode

	warn := plainLines(input(fixtures.WarningOnly(), BodySingle, 120, ProfileTrueColor, false, spine.VerdictWarning))
	for _, l := range warn {
		if strings.Contains(l, g.Fail) {
			t.Errorf("a WARNING-only run drew the filled fail mark: %q", l)
		}
	}
	if !strings.Contains(strings.Join(warn, "\n"), g.FailWarn) {
		t.Error("a WARNING-only run drew no outlined fail mark at all")
	}

	sick := strings.Join(plainLines(input(fixtures.OneSick(), BodySingle, 120, ProfileTrueColor, false, spine.VerdictCritical)), "\n")
	if !strings.Contains(sick, g.Fail) {
		t.Error("a run with a broken deploy drew no filled fail mark")
	}
	// The plain body says the same thing in words: engine is the WARNING-class failure.
	if !criticalFailure("deploy") || criticalFailure("engine") {
		t.Error("the mark and the verdict read different predicates")
	}
}

// TestSectionLabels is criterion 9: lowercase labels inset into a rule, everything passing
// folded to one line in a non-OK run, and no domain case-folded anywhere.
func TestSectionLabels(t *testing.T) {
	lines := plainLines(input(fixtures.OneSick(), BodySingle, 120, ProfileTrueColor, false, spine.VerdictCritical))
	text := strings.Join(lines, "\n")
	for _, label := range []string{labelFailing, labelCouldNotRun, labelHeld} {
		if !strings.Contains(text, "── "+label+" ") {
			t.Errorf("no inset rule for the %q section", label)
		}
	}
	if strings.Contains(text, "── "+labelPassing+" ") {
		t.Error("a failing run drew a passing section rather than folding it to one line")
	}
	if !strings.Contains(text, "3 passing  serving") {
		t.Error("the passing checks did not fold to one line")
	}
	for _, l := range lines {
		if l != strings.ToUpper(l) && strings.Contains(l, "907.LIFE") {
			t.Errorf("line %q case-folded a domain", l)
		}
	}
	ok := strings.Join(plainLines(input(fixtures.Healthy(), BodySingle, 120, ProfileTrueColor, false, spine.VerdictOK)), "\n")
	if !strings.Contains(ok, "── "+labelPassing+" ") {
		t.Error("an OK run did not show its work under a passing section")
	}
}

// TestFixIsNeverTruncated is criterion 10: every word of a fix reaches the frame at every width,
// and the tool's own bookkeeping about a missing page never does.
func TestFixIsNeverTruncated(t *testing.T) {
	fix, ok := health.FixForCode(spine.CodeDeployBuildFailed)
	if !ok {
		t.Fatal("the fix table carries no line for a failed build")
	}
	for _, width := range []int{40, 60, 80, 100, 120, 200} {
		text := strings.Join(plainLines(input(fixtures.OneSick(), BodySingle, width, ProfileTrueColor, false, spine.VerdictCritical)), " ")
		for word := range strings.FieldsSeq(fix.Text) {
			if !strings.Contains(text, word) {
				t.Errorf("width %d: the fix lost the word %q", width, word)
			}
		}
		if strings.Contains(text, "no remedy page yet") {
			t.Errorf("width %d: the tool's own bookkeeping reached the operator's column", width)
		}
	}
}

// TestHyperlinkOnlyForConstrainedTargets is criterion 10's hyperlink rule: a fix's own
// documentation URL becomes an OSC 8 link where colour is on, and no row of the hostile URL
// corpus ever does.
func TestHyperlinkOnlyForConstrainedTargets(t *testing.T) {
	joined := strings.Join(Render(input(fixtures.OneSick(), BodySingle, 120, ProfileTrueColor, false, spine.VerdictCritical)).Lines(), "\n")
	if !strings.Contains(joined, "\x1b]8;;https://cairn.pub/") {
		t.Error("no fix URL was emitted as an OSC 8 hyperlink on a colour terminal")
	}
	noColour := strings.Join(Render(input(fixtures.OneSick(), BodySingle, 120, ProfileNoColor, false, spine.VerdictCritical)).Lines(), "\n")
	if strings.Contains(noColour, "\x1b]8;;") {
		t.Error("a no-colour frame emitted an OSC 8 hyperlink")
	}
	for _, e := range loadHostileCorpus(t) {
		if linkable(e.Input) {
			t.Errorf("the hostile corpus row %q was accepted as a hyperlink target", e.Name)
		}
	}
}

// TestConditionIDNeverAloneOnALine is criterion 11: across the whole 40-to-400 sweep, no line
// consists of nothing but a condition id.
func TestConditionIDNeverAloneOnALine(t *testing.T) {
	for width := 40; width <= 400; width++ {
		for _, ascii := range []bool{false, true} {
			for _, l := range plainLines(input(fixtures.OneSick(), BodySingle, width, ProfileTrueColor, ascii, spine.VerdictCritical)) {
				if strings.TrimSpace(l) == string(spine.ConditionEdgeHTTPSNotForced) {
					t.Fatalf("width %d ascii %v: the condition id took a line of its own", width, ascii)
				}
			}
		}
	}
}

// TestConditionIDPlacementByBand is criterion 11's band rule: at 100 columns and above the id
// trails the fix block's URL line, and below that it trails the check's own detail instead.
func TestConditionIDPlacementByBand(t *testing.T) {
	cond := string(spine.ConditionEdgeHTTPSNotForced)
	for _, width := range []int{100, 120, 200} {
		line := lineCarrying(t, width, cond)
		if !strings.Contains(line, docsBase) {
			t.Errorf("width %d: the id sits on %q, want the fix block's URL line", width, line)
		}
	}
	const detail = "Always Use HTTPS is off for the zone"
	for _, width := range []int{60, 80} {
		line := lineCarrying(t, width, cond)
		if strings.Contains(line, docsBase) {
			t.Errorf("width %d: the id sits on the URL line %q, want the detail line", width, line)
		}
		carrier := strings.TrimSpace(strings.TrimSuffix(line, "  "+cond))
		if !endsWithSuffixOf(carrier, detail) {
			t.Errorf("width %d: the id trails %q, which does not end in the detail", width, carrier)
		}
	}
}

// lineCarrying returns the one rendered line holding want, failing when none or several do.
func lineCarrying(t *testing.T, width int, want string) string {
	t.Helper()
	var found []string
	for _, l := range plainLines(input(fixtures.OneSick(), BodySingle, width, ProfileTrueColor, false, spine.VerdictCritical)) {
		if strings.Contains(l, want) {
			found = append(found, l)
		}
	}
	if len(found) != 1 {
		t.Fatalf("width %d: %d lines carry %q, want exactly 1", width, len(found), want)
	}
	return found[0]
}

// TestHeldFailuresAreVisibleExpiringAndEscalating is criterion 12. A held row carries the held
// glyph, the word, and its own trailing field; a hold inside 48 hours takes the attention ink;
// and a lapsed hold holds nothing, leaving the verdict exactly as the caller computed it.
func TestHeldFailuresAreVisibleExpiringAndEscalating(t *testing.T) {
	theme := NewTheme(true, ProfileTrueColor)
	in := input(fixtures.OneSick(), BodySingle, 120, ProfileTrueColor, false, spine.VerdictCritical)

	text := strings.Join(plainLines(in), "\n")
	if !strings.Contains(text, theme.GlyphSet.Unicode.Held) {
		t.Error("the held row carries no held glyph")
	}
	if !strings.Contains(text, "held until 2026-09-25, 5 days left") {
		t.Error("the held row carries no expiry field")
	}
	if !strings.Contains(text, "── "+labelHeld+" ") {
		t.Error("the held row is not under the held section")
	}

	// Escalation: a hold expiring in 18 hours takes the attention ink rather than the muted one.
	soon := fixtures.OneSick()
	for i, c := range soon[0].Checks {
		if c.Acknowledged {
			soon[0].Checks[i].AckExpires = fixtures.Now().Add(18 * time.Hour)
		}
	}
	escalating := input(soon, BodySingle, 120, ProfileTrueColor, false, spine.VerdictCritical)
	attention := inkOf(theme, RoleUnknown)
	holdSpanInk := ""
	for _, sp := range frameSpans(Render(escalating)) {
		if strings.Contains(sp.text, "held until 2026-09-21") {
			holdSpanInk = sp.sgr
		}
	}
	if holdSpanInk != attention {
		t.Errorf("a hold 18 hours from expiry renders in %q, want the attention ink %q", holdSpanInk, attention)
	}

	// A lapsed hold: the check is back among the failures, says when the hold expired, and the
	// verdict the caller computed is printed unchanged.
	lapsed := input(fixtures.Hostile(), BodySingle, 120, ProfileTrueColor, false, spine.VerdictCritical)
	lapsedText := strings.Join(plainLines(lapsed), "\n")
	if !strings.Contains(lapsedText, "hold expired 2026-08-11") {
		t.Error("a lapsed hold did not say when it expired")
	}
	if strings.Contains(lapsedText, "── "+labelHeld+" ") {
		t.Error("a lapsed hold still held the check out of the failures")
	}
	if !strings.Contains(lapsedText, spine.VerdictCritical.String()) {
		t.Error("a lapsed hold changed the verdict the caller computed")
	}
}

// plainKey matches the stable lowercase key every plain-body line leads with.
var plainKey = regexp.MustCompile(`^[a-z][a-z0-9 .,-]*: `)

// TestPlainBodyKeys is criterion 13: one fact per line behind a stable key, no fix wrapped, and
// no skip without its reason.
func TestPlainBodyKeys(t *testing.T) {
	for _, f := range fixtures.All() {
		t.Run(f.Name, func(t *testing.T) {
			lines := plainLines(input(f.Reports, BodyPlain, 80, ProfileNoColor, true, spine.VerdictCritical))
			for i, l := range lines {
				if l == "" {
					continue
				}
				if !plainKey.MatchString(l) {
					t.Errorf("line %q carries no stable key", l)
				}
				if strings.HasPrefix(l, keyFix) && i+1 < len(lines) && !plainKey.MatchString(lines[i+1]) {
					t.Errorf("the fix on line %q wrapped onto %q", l, lines[i+1])
				}
				if strings.HasSuffix(l, ": skip") {
					if i+1 >= len(lines) || !strings.HasPrefix(lines[i+1], keyReason) {
						t.Errorf("the skip on line %q carries no reason line", l)
					}
				}
			}
		})
	}
}

// TestPlainBodyReadsWithoutColumns is criterion 14: no box drawing, no glyph carrying meaning,
// no padding, and no dependence on the width at all.
func TestPlainBodyReadsWithoutColumns(t *testing.T) {
	theme := NewTheme(true, ProfileNoColor)
	g := theme.GlyphSet.Unicode
	base := strings.Join(plainLines(input(fixtures.OneSick(), BodyPlain, 40, ProfileNoColor, true, spine.VerdictCritical)), "\n")
	for _, width := range []int{40, 60, 80, 100, 120, 200, 400} {
		lines := plainLines(input(fixtures.OneSick(), BodyPlain, width, ProfileNoColor, true, spine.VerdictCritical))
		if got := strings.Join(lines, "\n"); got != base {
			t.Errorf("width %d changed the plain body", width)
		}
		for _, l := range lines {
			for _, glyph := range []string{g.Pass, g.Fail, g.FailWarn, g.Held, g.Arrow, g.Rule, g.Sep} {
				if strings.Contains(l, glyph) {
					t.Errorf("line %q carries the meaning-bearing glyph %q", l, glyph)
				}
			}
			if strings.Contains(l, "  ") {
				t.Errorf("line %q is padded, so its meaning depends on a column position", l)
			}
		}
	}
}

// TestPlainBodyGroupsOneFixOverSeveralSkips is criterion 16: where one input blocked several
// checks, the group carries one fix naming every check it covers.
func TestPlainBodyGroupsOneFixOverSeveralSkips(t *testing.T) {
	reports := fixtures.WarningOnly()
	reports[0].Checks = append(reports[0].Checks,
		health.CheckResult{ID: "email", Outcome: spine.Outcome{
			State: spine.Unknown, Reason: spine.ReasonNotObservable, Condition: spine.ConditionConfigObservabilityOff}},
		health.CheckResult{ID: "deploy", Outcome: spine.Outcome{
			State: spine.Unknown, Reason: spine.ReasonNotObservable, Condition: spine.ConditionConfigObservabilityOff}},
	)
	text := strings.Join(plainLines(input(reports, BodyPlain, 80, ProfileNoColor, true, spine.VerdictWarning)), "\n")
	if !strings.Contains(text, keyFixFor+"deploy, email, errors") {
		t.Errorf("the skip group carries no shared fix line:\n%s", text)
	}
	if n := strings.Count(text, keyFixFor); n != 1 {
		t.Errorf("%d shared fix lines, want 1", n)
	}
}

// TestPlainBodyBlankLinesBetweenBlocks is criterion 17: a blank line before each check block, so
// a block is one greppable unit for both of this body's readers.
func TestPlainBodyBlankLinesBetweenBlocks(t *testing.T) {
	lines := plainLines(input(fixtures.OneSick(), BodyPlain, 80, ProfileNoColor, true, spine.VerdictCritical))
	for i, l := range lines {
		if !strings.HasPrefix(l, "deploy: ") && !strings.HasPrefix(l, "engine: ") {
			continue
		}
		if i == 0 || lines[i-1] != "" {
			t.Errorf("the block opening %q is not preceded by a blank line", l)
		}
	}
}

// TestWidthDefaultAndExactHonouring is criterion 18: an unset width composes at 80, and a width
// the caller detected is honoured exactly rather than snapped to a rung.
func TestWidthDefaultAndExactHonouring(t *testing.T) {
	zero := Render(input(fixtures.OneSick(), BodySingle, 0, ProfileTrueColor, false, spine.VerdictCritical)).Lines()
	eighty := Render(input(fixtures.OneSick(), BodySingle, 80, ProfileTrueColor, false, spine.VerdictCritical)).Lines()
	if strings.Join(zero, "\n") != strings.Join(eighty, "\n") {
		t.Error("a zero width did not render identically to width 80")
	}
	ninety := Render(input(fixtures.OneSick(), BodySingle, 90, ProfileTrueColor, false, spine.VerdictCritical)).Lines()
	if strings.Join(ninety, "\n") == strings.Join(eighty, "\n") {
		t.Error("width 90 rendered identically to width 80, so the width was snapped to a rung")
	}
	if got := (RenderInput{Width: 90}).width(); got != 90 {
		t.Errorf("width() = %d, want the requested 90 exactly", got)
	}
	if got := (RenderInput{Width: 200}).width(); got != WidthCap {
		t.Errorf("width() = %d, want the cap %d: content stops growing there", got, WidthCap)
	}
}

// TestNoLineExceedsTheRequestedWidth sweeps the whole width range over every fixture and both
// tiers: a line wider than the terminal wraps, and a wrapped row is a row whose columns mean
// nothing.
func TestNoLineExceedsTheRequestedWidth(t *testing.T) {
	theme := NewTheme(true, ProfileTrueColor)
	for _, f := range fixtures.All() {
		for _, width := range []int{20, 40, 60, 72, 79, 80, 81, 100, 120, 200, 400} {
			for _, ascii := range []bool{false, true} {
				budget := min(width, WidthCap)
				for _, l := range Render(input(f.Reports, BodySingle, width, ProfileTrueColor, ascii, spine.VerdictCritical)).Lines() {
					if theme.Width(l) > budget {
						t.Errorf("%s at width %d ascii %v: line is %d cells: %q",
							f.Name, width, ascii, theme.Width(l), stripANSI(l))
					}
				}
			}
		}
	}
}

// TestEveryFixtureRendersInEveryBody is criterion 20: the whole corpus through both bodies this
// task ships, at the degenerate widths included, with no panic and no empty frame. BodyMany is
// absent because its own body is Task 20b-ii's.
func TestEveryFixtureRendersInEveryBody(t *testing.T) {
	for _, f := range fixtures.All() {
		for _, body := range []Body{BodySingle, BodyPlain} {
			for _, width := range []int{0, 1, 2, 5, 19, 40, 120, 400, -10} {
				in := input(f.Reports, body, width, ProfileTrueColor, false, spine.VerdictUnknown)
				if got := Render(in); len(got.Lines()) == 0 {
					t.Errorf("%s body %v width %d rendered nothing", f.Name, body, width)
				}
			}
		}
	}
}

// TestDeterminismAcrossTheEnvironment asserts two renders of one input are byte-identical and
// that the zone offset printed comes from the value rather than from the machine's own clock.
func TestDeterminismAcrossTheEnvironment(t *testing.T) {
	for _, tz := range []string{"UTC", "America/Anchorage", "Asia/Tokyo"} {
		t.Setenv("TZ", tz)
		in := input(fixtures.OneSick(), BodySingle, 100, ProfileTrueColor, false, spine.VerdictCritical)
		first := strings.Join(Render(in).Lines(), "\n")
		second := strings.Join(Render(in).Lines(), "\n")
		if first != second {
			t.Fatalf("TZ=%s: two renders of one input differ", tz)
		}
		if !strings.Contains(stripANSI(first), "2026-09-20 14:28-08:00") {
			t.Errorf("TZ=%s: the frame does not carry the input's own zone offset", tz)
		}
	}
}

// endsWithSuffixOf reports whether line ends with some non-empty suffix of text, which is how a
// detail line is recognised whether it stands alone or was merged into its own check row.
func endsWithSuffixOf(line, text string) bool {
	for i := range len(text) {
		if strings.HasSuffix(line, text[i:]) {
			return true
		}
	}
	return false
}
