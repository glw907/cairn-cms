package render

import (
	"reflect"
	"regexp"
	"strings"
	"testing"
	"time"

	"charm.land/lipgloss/v2"
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

// TestHoldFieldOnlyOnFailures pins the other half of criterion 12's grammar. health.applyAck
// stamps AckExpires onto any result whose id matches an ack entry, so a check that recovered or
// could not run while its hold is still live, and one whose hold has lapsed, both reach the
// renderer carrying a hold. Neither row is a failure, so neither may state a decision about one.
func TestHoldFieldOnlyOnFailures(t *testing.T) {
	// serving passes and errors could not run; the live hold and the lapsed one land on them.
	reports := fixtures.OneSick()
	for i, c := range reports[0].Checks {
		switch c.ID {
		case "serving":
			reports[0].Checks[i].Acknowledged = true
			reports[0].Checks[i].AckExpires = fixtures.Now().Add(5 * 24 * time.Hour)
		case "errors":
			reports[0].Checks[i].AckExpires = fixtures.Now().Add(-3 * 24 * time.Hour)
		}
	}

	bodies := []struct {
		name string
		body Body
	}{{"single", BodySingle}, {"plain", BodyPlain}}
	for _, b := range bodies {
		t.Run(b.name, func(t *testing.T) {
			for _, l := range plainLines(input(reports, b.body, 120, ProfileTrueColor, false, spine.VerdictCritical)) {
				if !strings.Contains(l, "serving") && !strings.Contains(l, "errors") {
					continue
				}
				if strings.Contains(l, "held until") || strings.Contains(l, "hold expired") {
					t.Errorf("a row that is not failing carries a hold: %q", l)
				}
			}
		})
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

// TestEveryFixtureRendersInEveryBody is criterion 20: the whole corpus through every body, at
// the degenerate widths included, with no panic and no empty frame.
func TestEveryFixtureRendersInEveryBody(t *testing.T) {
	for _, f := range fixtures.All() {
		for _, body := range []Body{BodySingle, BodyMany, BodyPlain} {
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

// manyInput builds one RenderInput over a fleet, with the run state the strip's own tests read.
func manyInput(reports []health.Report, width int, ascii bool) RenderInput {
	in := input(reports, BodyMany, width, ProfileNoColor, ascii, verdictFor(reports))
	in.Status = goldenStatus()
	return in
}

// nineCheckFleet is one site carrying all nine shipped checks, the fixture the strip's width
// formula is pinned against.
func nineCheckFleet() []health.Report {
	return append(fixtures.OneSick(), fixtures.Healthy()...)
}

// TestStripWidthFormulaIsExact is criterion 1: the fallback threshold is the formula's own
// value, pinned as an integer, so a heading change moves it visibly rather than silently.
func TestStripWidthFormulaIsExact(t *testing.T) {
	reports := nineCheckFleet()
	ids := stripColumns()
	siteCol := siteColWidth(reports)
	// 8 for "ecxc.ski", the widest of the two sites, plus a gutter, plus the nine headings
	// (creds serving delegation https email deploy publish-path engine errors) with eight
	// gutters between them, plus a gutter, plus the eight cells CRITICAL needs.
	const want = 88
	if got := stripWidth(stripHeadingsFor(ids), siteCol, verdictColWidth); got != want {
		t.Fatalf("stripWidth = %d, want %d", got, want)
	}
	strip := strings.Join(plainLines(manyInput(reports, want, true)), "\n")
	if !strings.Contains(strip, "delegation") {
		t.Errorf("the strip did not draw at its own width %d:\n%s", want, strip)
	}
	fallback := strings.Join(plainLines(manyInput(reports, want-1, true)), "\n")
	if strings.Contains(fallback, "delegation") {
		t.Errorf("the strip still drew one cell under its own width:\n%s", fallback)
	}
	if !strings.Contains(fallback, "could not run") {
		t.Errorf("the fallback table did not draw at width %d:\n%s", want-1, fallback)
	}
}

// TestStripHeadingsAbbreviateOnlyHTTPS is criterion 2: the heading set is the check id set with
// one truncation a reader can undo, and the id itself is unchanged everywhere else.
func TestStripHeadingsAbbreviateOnlyHTTPS(t *testing.T) {
	ids := stripColumns()
	wantIDs := []string{"creds", "serving", "delegation", "https-forced", "email", "deploy",
		"publish-path", "engine", "errors"}
	if !reflect.DeepEqual(ids, wantIDs) {
		t.Fatalf("check ids = %v, want %v", ids, wantIDs)
	}
	wantHeadings := []string{"creds", "serving", "delegation", "https", "email", "deploy",
		"publish-path", "engine", "errors"}
	if got := stripHeadingsFor(ids); !reflect.DeepEqual(got, wantHeadings) {
		t.Fatalf("headings = %v, want %v", got, wantHeadings)
	}
	single := strings.Join(plainLines(input(fixtures.OneSick(), BodySingle, 100, ProfileNoColor, true, spine.VerdictCritical)), "\n")
	if !strings.Contains(single, "https-forced") {
		t.Error("the single-site body abbreviated the check id; only the strip heading may")
	}
}

// TestStripMarksAgreeWithTheRowVerdict is criterion 3. The two fail marks and the row's own
// verdict word come from one predicate each, and this pins the relation between them: a filled
// mark only ever appears on a CRITICAL row, and no fail mark at all appears on an OK row.
//
// Filled and outlined do not yet partition CRITICAL from WARNING, because spine folds every
// unheld failure to CRITICAL until the WARNING tier lands; what is asserted here is what the
// shipped arithmetic promises.
func TestStripMarksAgreeWithTheRowVerdict(t *testing.T) {
	reports := append(fixtures.TwelveSites(), fixtures.OneSick()...)
	in := manyInput(reports, 120, false)
	theme := NewTheme(true, ProfileNoColor)
	for _, r := range rankReports(reports) {
		v := siteVerdict(r)
		for _, c := range r.Checks {
			glyph, _ := theme.mark(in, c)
			switch glyph {
			case theme.GlyphSet.Unicode.Fail:
				if v != spine.VerdictCritical {
					t.Errorf("%s %s: filled mark on a %s row", r.Site, c.ID, v)
				}
			case theme.GlyphSet.Unicode.FailWarn, theme.GlyphSet.Unicode.Held:
				if v == spine.VerdictOK {
					t.Errorf("%s %s: fail mark on an OK row", r.Site, c.ID)
				}
			}
		}
	}
}

// TestHeldFailureKeepsTheHeldMarkInTheStrip is criterion 3's held rule, which wins over the
// two-severity fill: a held failure is the held glyph in the strip cell too.
func TestHeldFailureKeepsTheHeldMarkInTheStrip(t *testing.T) {
	in := manyInput(fixtures.OneSick(), 120, false)
	theme := NewTheme(true, ProfileNoColor)
	for _, c := range fixtures.OneSick()[0].Checks {
		if !c.Acknowledged {
			continue
		}
		if glyph, _ := theme.mark(in, c); glyph != theme.GlyphSet.Unicode.Held {
			t.Errorf("%s: held failure drew %q, want the held glyph", c.ID, glyph)
		}
	}
}

// TestStripMarksAreDistinguishableWithoutColour is criterion 3's no-colour half: with every
// escape stripped, the two fail marks are still different characters.
func TestStripMarksAreDistinguishableWithoutColour(t *testing.T) {
	for _, ascii := range []bool{false, true} {
		g := NewTheme(true, ProfileNoColor).glyphs(ascii)
		if g.Fail == g.FailWarn {
			t.Errorf("ascii %v: both fail marks are %q", ascii, g.Fail)
		}
	}
}

// TestStripMarksAreCentred is criterion 4: a mark sits centred in its heading's column, so the
// marks form a grid rather than hugging each column's left edge.
func TestStripMarksAreCentred(t *testing.T) {
	theme := NewTheme(true, ProfileNoColor)
	if got := theme.centredCell(RoleOK, "x", 5); got != "  x  " {
		t.Errorf("centredCell = %q, want %q", got, "  x  ")
	}
	if got := theme.centredCell(RoleOK, "x", 4); got != " x  " {
		t.Errorf("centredCell = %q, want %q", got, " x  ")
	}
}

// TestEveryFixIsPrintedAndNoneTwice is criteria 5 and 9: a twelve-site fleet renders every fix
// it has, no count of hidden repairs appears, and no sentence is printed twice.
func TestEveryFixIsPrintedAndNoneTwice(t *testing.T) {
	reports := fixtures.TwelveSites()
	in := manyInput(reports, 120, false)
	lines := plainLines(in)
	text := strings.Join(lines, "\n")

	want := 0
	for _, r := range reports {
		for _, c := range split(r).Failing {
			if fix, ok := health.FixFor(c.Outcome); ok && fix.Text != "" {
				want++
			}
		}
	}
	if got := strings.Count(text, "  "+NewTheme(true, ProfileNoColor).glyphs(false).Arrow+" "); got < want {
		t.Errorf("%d fix entries, want at least the %d failures resolve to", got, want)
	}
	if strings.Contains(text, "more fix") || strings.Contains(text, "more ·") {
		t.Errorf("the frame names a count of fixes it declined to show:\n%s", text)
	}
	// One sentence may serve several sites, so the pair is what may not repeat: the same repair
	// on the same site, printed twice in one frame.
	seen := map[string]bool{}
	for _, f := range collectFleetFixes(in, rankReports(reports)) {
		key := f.site + "\x00" + f.fix.Text
		if seen[key] {
			t.Errorf("%s: the fix %q is printed twice", f.site, f.fix.Text)
		}
		seen[key] = true
	}
}

// allSkippedSite returns one site whose nine checks were all skipped for one missing token and
// which carries no failure at all: the state iteration 3 left invisible on the fleet screen.
func allSkippedSite() health.Report {
	r := health.Report{SchemaVersion: 1, Site: "tidelinepress.org", Domain: "tidelinepress.org", Degraded: true}
	for _, c := range stripColumns() {
		r.Checks = append(r.Checks, health.CheckResult{
			ID:        c,
			Outcome:   spine.Outcome{State: spine.Unknown, Reason: spine.ReasonCredMissing},
			CheckedAt: fixtures.Now().Add(-4 * time.Minute),
		})
	}
	return r
}

// TestAllSkippedSiteProducesExactlyOneFix is criterion 6: a site blocked entirely by one missing
// token is one entry naming the token, not nine, and not none.
func TestAllSkippedSiteProducesExactlyOneFix(t *testing.T) {
	reports := append(fixtures.TwelveSites(), allSkippedSite())
	in := manyInput(reports, 120, false)
	// One token stopped every check on that site, which is what the criterion describes and
	// what lets the entry name the credential beside the fix.
	in.Status = StatusState{
		Credentials: []Credential{{Variable: "CAIRN_CF_READ_TOKEN", Disables: stripColumns()}},
		Degraded:    true,
	}
	entries := collectFleetFixes(in, rankReports(reports))

	n := 0
	var entry fleetFix
	for _, f := range entries {
		if f.site == "tidelinepress.org" {
			n++
			entry = f
		}
	}
	if n != 1 {
		t.Fatalf("%d fix entries for the all-skipped site, want exactly 1", n)
	}
	if len(entry.ids) != len(stripColumns()) {
		t.Errorf("the entry covers %d checks, want all %d", len(entry.ids), len(stripColumns()))
	}
	if entry.tail != "CAIRN_CF_READ_TOKEN" {
		t.Errorf("the entry names %q, want the missing token's own variable", entry.tail)
	}
	if !strings.Contains(strings.Join(plainLines(in), "\n"), keyFixFor) {
		t.Error("the entry does not name the checks its one fix covers")
	}
}

// TestBlockedFixesFollowTheFailures is criterion 7: a fix for a check that could not run is in
// the same list, after every failure.
func TestBlockedFixesFollowTheFailures(t *testing.T) {
	reports := append(fixtures.TwelveSites(), allSkippedSite())
	in := manyInput(reports, 120, false)
	seenBlocked := false
	for _, f := range rankFleetFixes(collectFleetFixes(in, rankReports(reports))) {
		if f.blocked {
			seenBlocked = true
			continue
		}
		if seenBlocked {
			t.Errorf("%s %s: a failure's fix is listed after a blocked one", f.site, f.check)
		}
	}
	if !seenBlocked {
		t.Fatal("no fix for a check that could not run reached the list at all")
	}
}

// TestFixListLeavesNoOrphanWord is criterion 8: the sentence has its own width, and no line of
// the fix list is one word on its own.
func TestFixListLeavesNoOrphanWord(t *testing.T) {
	for _, width := range []int{80, 100, 120} {
		in := manyInput(fixtures.TwelveSites(), width, false)
		inList := false
		for _, l := range plainLines(in) {
			if strings.Contains(l, labelWhatToFix) {
				inList = true
				continue
			}
			if !inList || strings.TrimSpace(l) == "" || strings.Contains(l, "·") {
				continue
			}
			if len(strings.Fields(l)) == 1 {
				t.Errorf("width %d: the fix list leaves %q alone on a line", width, strings.TrimSpace(l))
			}
		}
	}
}

// TestLogBodyStatesTheDayOnceAndNeverCutsAReason is criterion 10.
func TestLogBodyStatesTheDayOnceAndNeverCutsAReason(t *testing.T) {
	entries := goldenLogEntries()
	for _, width := range []int{60, 80, 100, 120} {
		lines := plainLines(RenderInput{
			View: ViewLogs, Width: width, Dark: true, Profile: ProfileNoColor,
			Site: "ecxc.ski", Entries: entries, Now: fixtures.Now(),
		})
		text := strings.Join(lines, "\n")
		if n := strings.Count(text, "2026-09-20"); n != 1 {
			t.Errorf("width %d: the date appears %d times, want once on the rule", width, n)
		}
		if strings.Contains(text, "?") {
			t.Errorf("width %d: a log line carries the skip glyph; a level is a word", width)
		}
		for _, level := range []string{"info", "warn", "error"} {
			if !strings.Contains(text, level) {
				t.Errorf("width %d: the level %q is missing", width, level)
			}
		}
		if joined := strings.Join(strings.Fields(text), " "); !strings.Contains(joined,
			"reason=the branch is behind main by 2 commits") {
			t.Errorf("width %d: the reason was cut:\n%s", width, text)
		}
	}
}

// TestNeverColourAlone is criterion 14: every state word a colour render shows at a width also
// reaches the no-colour render at that width, so nothing on the screen is carried by hue alone.
func TestNeverColourAlone(t *testing.T) {
	words := []string{"pass", "fail", "skip", "held", "OK", "WARNING", "CRITICAL", "UNKNOWN"}
	for _, f := range fixtures.All() {
		for _, body := range []Body{BodySingle, BodyMany, BodyPlain} {
			for _, width := range []int{60, 80, 100, 120} {
				colour := textOf(input(f.Reports, body, width, ProfileTrueColor, false, verdictFor(f.Reports)))
				bare := textOf(input(f.Reports, body, width, ProfileNoColor, false, verdictFor(f.Reports)))
				for _, w := range words {
					if strings.Contains(colour, w) && !strings.Contains(bare, w) {
						t.Errorf("%s body %v width %d: %q appears only in the colour render",
							f.Name, body, width, w)
					}
				}
			}
		}
	}
}

// textOf renders in and joins its lines with every escape sequence removed.
func textOf(in RenderInput) string {
	return strings.Join(plainLines(in), "\n")
}

// TestStyledRowPaddingCarriesTheRowStyle is criterion 15's construction rule. A cell is
// Width(n).MaxWidth(n), so its padding is written inside the styled block; a row joined from
// such cells can take a ground across its whole width rather than painting striped gaps, which
// is what the 2.0 HUD's selected row needs.
//
// The ground is applied here rather than through a Role, because the terminal owns the
// background and this palette names no ground token. With a foreground alone lipgloss leaves the
// padding unstyled, which is invisible and costs nothing; the property that matters is the one
// measured below.
func TestStyledRowPaddingCarriesTheRowStyle(t *testing.T) {
	theme := NewTheme(true, ProfileTrueColor)
	if got := theme.Width(theme.cell(RoleFailing, "x", 8)); got != 8 {
		t.Errorf("the cell measures %d cells, want the 8 its column budgeted", got)
	}
	ground := lipgloss.NewStyle().Background(lipgloss.Color("#123456")).Width(8).MaxWidth(8)
	row := lipgloss.JoinHorizontal(lipgloss.Top, ground.Render("x"), ground.Render("y"))
	for _, sp := range parseSpans(row) {
		if strings.TrimSpace(sp.text) == "" && !strings.Contains(sp.sgr, "48;2;18;52;86") {
			t.Errorf("a row's padding carries %q rather than the row's own ground", sp.sgr)
		}
	}
}
