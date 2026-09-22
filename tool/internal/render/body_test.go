package render

import (
	"reflect"
	"regexp"
	"slices"
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

// TestVerdictFirstAndLast is criterion 3 and criterion 15: a terminal frame opens on the verdict
// word and its closing block opens on it too, for all four verdicts and both bodies, and the
// plain body's exit code follows its last verdict line.
func TestVerdictFirstAndLast(t *testing.T) {
	for _, v := range []Verdict{spine.VerdictOK, spine.VerdictWarning, spine.VerdictCritical, spine.VerdictUnknown} {
		for _, tc := range []struct {
			body  Body
			width int
		}{
			{BodySingle, 100},
			// 40 and 60 are the widths where the verdict block wraps, which is where the tally
			// used to take the last line from the verdict word.
			{BodySingle, 60},
			{BodySingle, 40},
			{BodyMany, 60},
			{BodyPlain, 100},
		} {
			body, width := tc.body, tc.width
			lines := plainLines(input(fixtures.OneSick(), body, width, ProfileTrueColor, false, v))
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
			if body == BodyPlain {
				last := live[len(live)-1]
				if last != keyExit+string(rune('0'+int(v))) {
					t.Errorf("verdict %v: last plain line = %q, want the exit code", v, last)
				}
				if closing := live[len(live)-2]; !strings.Contains(closing, v.String()) {
					t.Errorf("verdict %v: the line above the exit code is %q, which carries no verdict word", v, closing)
				}
				continue
			}
			// A terminal frame ends on its verdict block, which opens on the word wherever it
			// wrapped, the same order the header block takes.
			closing := closingBlock(lines)
			if len(closing) == 0 {
				t.Fatalf("verdict %v body %v: frame ends on no block", v, body)
			}
			if !strings.Contains(closing[0], v.String()) {
				t.Errorf("verdict %v body %v: the closing block opens on %q, which carries no verdict word",
					v, body, closing[0])
			}
		}
	}
}

// closingBlock returns the run of non-blank lines the frame ends on, with every escape already
// removed by the caller.
func closingBlock(lines []string) []string {
	var block []string
	for _, l := range lines {
		if strings.TrimSpace(l) == "" {
			block = nil
			continue
		}
		block = append(block, l)
	}
	return block
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

// TestNoLineExceedsTheRequestedWidth is criterion 19's two-table sweep over whole frames: every
// fixture, every terminal body, the width range from 20 to 400, at both glyph tiers, each frame
// measured under the width table its own tier chose. The Unicode tier is checked against the
// narrow table and the ASCII tier against Ambiguous=wide, which is the pairing a terminal ever
// presents: a terminal configured for the wide reading takes the ASCII tier (ADR-0002).
func TestNoLineExceedsTheRequestedWidth(t *testing.T) {
	for _, f := range fixtures.All() {
		for _, width := range []int{20, 40, 60, 72, 79, 80, 81, 100, 120, 200, 400} {
			for _, ascii := range []bool{false, true} {
				theme := NewTheme(true, ProfileTrueColor).forTier(ascii)
				budget := min(width, WidthCap)
				for _, body := range []Body{BodySingle, BodyMany, BodyPlain} {
					in := input(f.Reports, body, width, ProfileTrueColor, ascii, spine.VerdictCritical)
					in.Status = sampleStatus()
					for _, l := range Render(in).Lines() {
						// The plain body is line-oriented by contract and depends on no width at
						// all, so it is swept for the other two tables' sake and exempted here.
						if body != BodyPlain && theme.Width(l) > budget {
							t.Errorf("%s body %v at width %d ascii %v: line is %d cells: %q",
								f.Name, body, width, ascii, theme.Width(l), stripANSI(l))
						}
					}
				}
			}
		}
	}
}

// TestWidthTableFollowsTheGlyphTier is criterion 12: the width table is a field on Theme chosen
// by tier, not a package-level setting, and the two tables disagree on an East Asian Ambiguous
// rune exactly as their names promise.
func TestWidthTableFollowsTheGlyphTier(t *testing.T) {
	// U+25CF is the Unicode tier's own pass mark and is EAW=Ambiguous (glyph.go's
	// ambiguousRunes), so it is the one rune that separates the two tables.
	const ambiguous = "●"
	narrow := NewTheme(true, ProfileTrueColor).forTier(false)
	wide := NewTheme(true, ProfileTrueColor).forTier(true)
	if got := narrow.Width(ambiguous); got != 1 {
		t.Errorf("narrow table measures %q as %d cells, want 1", ambiguous, got)
	}
	if got := wide.Width(ambiguous); got != 2 {
		t.Errorf("wide table measures %q as %d cells, want 2", ambiguous, got)
	}
	// The tables agree on plain ASCII, which is the whole of the ASCII tier's own glyph set.
	for _, s := range []string{"+", "!", "*", "?", "o", ">", "-", "...", "ecxc.ski"} {
		if narrow.Width(s) != wide.Width(s) {
			t.Errorf("the tables disagree on %q: narrow %d, wide %d", s, narrow.Width(s), wide.Width(s))
		}
	}
}

// TestFixtureSitesCarryAllNineChecks is criterion 3: the twelve-site and all-unknown fixtures
// enumerate all nine checks for every site, so a strip golden built from either never falls back
// to the separator glyph for a check the fixture simply omitted.
func TestFixtureSitesCarryAllNineChecks(t *testing.T) {
	named := map[string][]health.Report{
		"twelve-site": fixtures.TwelveSites(),
		"all-unknown": fixtures.AllUnknown(),
	}
	for name, reports := range named {
		for _, r := range reports {
			for _, id := range stripColumns() {
				found := false
				for _, c := range r.Checks {
					if c.ID == id {
						found = true
						break
					}
				}
				if !found {
					t.Errorf("%s: %s carries no %q check", name, r.Site, id)
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
// that the stamp printed is the input's own instant in UTC, which is the same bytes under every
// TZ the machine might be set to.
func TestDeterminismAcrossTheEnvironment(t *testing.T) {
	for _, tz := range []string{"UTC", "America/Anchorage", "Asia/Tokyo"} {
		t.Setenv("TZ", tz)
		in := input(fixtures.OneSick(), BodySingle, 100, ProfileTrueColor, false, spine.VerdictCritical)
		first := strings.Join(Render(in).Lines(), "\n")
		second := strings.Join(Render(in).Lines(), "\n")
		if first != second {
			t.Fatalf("TZ=%s: two renders of one input differ", tz)
		}
		if !strings.Contains(stripANSI(first), "2026-09-20 22:28 UTC") {
			t.Errorf("TZ=%s: the frame does not carry the input's own instant in UTC", tz)
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
	in.Status = sampleStatus()
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
	theme := NewTheme(true, ProfileNoColor)
	siteCol := theme.siteColWidth(reports)
	// 8 for "ecxc.ski", the widest of the two sites, plus a gutter, plus the nine headings
	// (creds serving delegation https email deploy publish-path engine errors) with eight
	// gutters between them, plus a gutter, plus the eight cells CRITICAL needs.
	const want = 88
	if got := theme.stripWidth(stripHeadingsFor(ids), siteCol, verdictColWidth); got != want {
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

// TestFallbackTableCarriesTheEngineVersionAndTheDataAge is criterion 1's column list for the
// plain table: the counts by state, the engine version each site runs, and how old the data is.
// The version is read from the engine check's own structured field, so a reworded detail
// sentence cannot move it.
func TestFallbackTableCarriesTheEngineVersionAndTheDataAge(t *testing.T) {
	reports := fixtures.TwelveSites()
	// 80 columns is under the strip's own 88, so the fallback table is what draws.
	text := strings.Join(plainLines(manyInput(reports, 80, false)), "\n")
	for _, want := range []string{"engine", "checked", "0.78.0", "0.76.0", "4m ago"} {
		if !strings.Contains(text, want) {
			t.Errorf("the fallback table does not carry %q:\n%s", want, text)
		}
	}
	// The field is the source. A report whose engine check carries no field leaves the cell
	// empty rather than reaching into the prose beside it.
	bare := health.Report{Site: "bare.example", Checks: []health.CheckResult{
		{ID: engineCheckID, Outcome: spine.Outcome{State: spine.OK, Detail: "9.9.9 is current"}},
	}}
	if got := engineVersion(bare); got != "" {
		t.Errorf("engineVersion read %q out of the prose detail, want no version at all", got)
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
	// The site alone, so the entry under test is the one its own nine skips produced rather than
	// one an earlier site in the fleet owns the head line of.
	alone := collectFleetFixes(in, []health.Report{allSkippedSite()})
	if len(alone) != 1 {
		t.Fatalf("%d fix entries for the all-skipped site, want exactly 1", len(alone))
	}
	entry := alone[0]

	// In the whole fleet the same sentence is one entry, and the site is named once in it,
	// either on its head line or in the list of sites the one remedy also applies to.
	n := 0
	for _, f := range collectFleetFixes(in, rankReports(reports)) {
		if f.site == "tidelinepress.org" || slices.Contains(f.alsoOn, "tidelinepress.org") {
			n++
		}
	}
	if n != 1 {
		t.Errorf("the all-skipped site is named in %d fix entries, want exactly 1", n)
	}
	if len(entry.ids) != len(stripColumns()) {
		t.Errorf("the entry covers %d checks, want all %d", len(entry.ids), len(stripColumns()))
	}
	if entry.check != "CAIRN_CF_READ_TOKEN" {
		t.Errorf("the entry heads with %q, want the missing token's own variable", entry.check)
	}
	// Rendered alone, so the assertion reads the site's own nine-check entry rather than the
	// whole fleet's merged line, whose covered-checks list is the intersection every other
	// twelve-site entry shares (criterion 2) and so is not guaranteed to name every one of this
	// site's own nine checks once merged.
	aloneIn := manyInput([]health.Report{allSkippedSite()}, 120, false)
	aloneIn.Status = in.Status
	if !strings.Contains(strings.Join(plainLines(aloneIn), "\n"), keyFixFor) {
		t.Error("the entry does not name the checks its one fix covers")
	}
}

// blockedByCred returns one check that could not run because token was missing.
func blockedByCred(id string) health.CheckResult {
	return health.CheckResult{ID: id, Outcome: spine.Outcome{State: spine.Unknown, Reason: spine.ReasonCredMissing},
		CheckedAt: fixtures.Now().Add(-4 * time.Minute)}
}

// TestBlockedGroupHeadsWithTheBlockingVariableOrTheCollectiveWord is criterion 1: a group one
// missing token explains heads with that token's own variable, and a group two different missing
// tokens together explain heads with the collective word, never the first covered check id.
func TestBlockedGroupHeadsWithTheBlockingVariableOrTheCollectiveWord(t *testing.T) {
	oneToken := health.Report{Site: "one.example.org", Domain: "one.example.org", Degraded: true,
		Checks: []health.CheckResult{blockedByCred("https-forced"), blockedByCred("email")}}
	in := manyInput([]health.Report{oneToken}, 120, false)
	in.Status = StatusState{
		Credentials: []Credential{{Variable: "CAIRN_CF_READ_TOKEN", Disables: []string{"https-forced", "email"}}},
		Degraded:    true,
	}
	entries := collectFleetFixes(in, []health.Report{oneToken})
	if len(entries) != 1 {
		t.Fatalf("%d entries, want 1", len(entries))
	}
	if got := entries[0].check; got != "CAIRN_CF_READ_TOKEN" {
		t.Errorf("head names %q, want the blocking token's own variable", got)
	}

	twoTokens := health.Report{Site: "two.example.org", Domain: "two.example.org", Degraded: true,
		Checks: []health.CheckResult{blockedByCred("https-forced"), blockedByCred("errors")}}
	in2 := manyInput([]health.Report{twoTokens}, 120, false)
	in2.Status = StatusState{
		Credentials: []Credential{
			{Variable: "CAIRN_CF_READ_TOKEN", Disables: []string{"https-forced"}},
			{Variable: "CAIRN_GH_READ_TOKEN", Disables: []string{"errors"}},
		},
		Degraded: true,
	}
	entries2 := collectFleetFixes(in2, []health.Report{twoTokens})
	if len(entries2) != 1 {
		t.Fatalf("%d entries, want 1", len(entries2))
	}
	if got := entries2[0].check; got != wordTokens {
		t.Errorf("head names %q, want the collective word %q", got, wordTokens)
	}
	for _, id := range []string{"https-forced", "errors"} {
		if entries2[0].check == id {
			t.Errorf("head names the check id %q rather than a credential word", id)
		}
	}
}

// TestMergedCoveredIDsIsTheIntersection is criterion 2: when two sites' blocked groups differ by
// one check, the merged entry's covered-checks line names only what both sites actually share,
// never the union padded with a check one of them lacks.
func TestMergedCoveredIDsIsTheIntersection(t *testing.T) {
	full := health.Report{Site: "full.example.org", Domain: "full.example.org", Degraded: true,
		Checks: []health.CheckResult{blockedByCred("https-forced"), blockedByCred("email"), blockedByCred("errors")}}
	partial := health.Report{Site: "partial.example.org", Domain: "partial.example.org", Degraded: true,
		Checks: []health.CheckResult{blockedByCred("https-forced"), blockedByCred("email")}}
	in := manyInput([]health.Report{full, partial}, 120, false)
	in.Status = StatusState{
		Credentials: []Credential{{Variable: "CAIRN_CF_READ_TOKEN",
			Disables: []string{"https-forced", "email", "errors"}}},
		Degraded: true,
	}

	entries := collectFleetFixes(in, []health.Report{full, partial})
	if len(entries) != 1 {
		t.Fatalf("%d entries, want 1 (the same fix on both sites)", len(entries))
	}
	entry := entries[0]
	if slices.Contains(entry.ids, "errors") {
		t.Errorf("merged entry names %q, which only %s covers", "errors", full.Site)
	}
	for _, id := range []string{"https-forced", "email"} {
		if !slices.Contains(entry.ids, id) {
			t.Errorf("merged entry lost %q, which both sites share", id)
		}
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

// TestCheckedPhraseLeadsWithTheAge pins the header's recency device: how old the data is, then
// the instant in parentheses in UTC, then the run's own measured time. A stamp carrying a zone
// offset prints in UTC like every other, so two operators reading the same run read the same
// instant. A run settled within the last second, or one stamped ahead of the clock rendering it,
// has no age to state and prints the stamp alone.
func TestCheckedPhraseLeadsWithTheAge(t *testing.T) {
	at := time.Date(2026, 9, 20, 22, 32, 0, 0, time.UTC)
	offset := at.In(time.FixedZone("AKDT", -8*3600))
	for _, tt := range []struct {
		name    string
		at, now time.Time
		elapsed time.Duration
		want    string
	}{
		{"minutes old", at, at.Add(4 * time.Minute), 16300 * time.Millisecond,
			"checked 4m ago (2026-09-20 22:32 UTC), in 16.3s"},
		{"seconds old", at, at.Add(22 * time.Second), 21700 * time.Millisecond,
			"checked 22s ago (2026-09-20 22:32 UTC), in 21.7s"},
		{"stamped in another zone", offset, offset.Add(4 * time.Minute), 0,
			"checked 4m ago (2026-09-20 22:32 UTC)"},
		{"just settled", at, at, 0, "checked 2026-09-20 22:32 UTC"},
		{"stamped ahead of the clock", at, at.Add(-time.Minute), 0, "checked 2026-09-20 22:32 UTC"},
	} {
		t.Run(tt.name, func(t *testing.T) {
			if got := checkedPhrase(tt.at, tt.now, tt.elapsed); got != tt.want {
				t.Errorf("checkedPhrase = %q, want %q", got, tt.want)
			}
		})
	}
}

// TestNoBodyPrintsAReasonCode renders one check under every reason code the spine publishes,
// through all three bodies, and asserts the code itself never reaches a line. A reason code is
// the handle --json carries; a body owes the operator the sentence that says what happened.
func TestNoBodyPrintsAReasonCode(t *testing.T) {
	codes := spine.ReasonCodes()
	if len(codes) == 0 {
		t.Fatal("the reason vocabulary is empty, so this test could not fail")
	}
	for _, r := range codes {
		reports := []health.Report{{Site: "907.life", Checks: []health.CheckResult{{
			ID:        "email",
			CheckedAt: fixtures.Now(),
			Outcome:   spine.Outcome{State: spine.Unknown, Reason: r},
		}}}}
		for _, body := range []Body{BodySingle, BodyMany, BodyPlain} {
			for _, width := range []int{40, 80, 120} {
				text := textOf(input(reports, body, width, ProfileNoColor, false, verdictFor(reports)))
				for line := range strings.SplitSeq(text, "\n") {
					if strings.Contains(line, "reason.") {
						t.Errorf("reason %q, body %v, width %d: the line %q carries the code itself",
							r, body, width, line)
					}
				}
				// The fleet body draws a mark per check rather than a detail, so only the two
				// bodies that carry a check's own line are asked for the phrase.
				if body == BodyMany {
					continue
				}
				// The comparison drops whitespace entirely rather than collapsing it: at a narrow
				// width a phrase carrying a URL is hard-wrapped inside the URL, which is the wrap
				// rule for a token no width can hold.
				flat := strings.Join(strings.Fields(text), "")
				if !strings.Contains(flat, strings.Join(strings.Fields(health.ReasonPhrase(r)), "")) {
					t.Errorf("reason %q, body %v, width %d: the frame carries no phrase for it:\n%s",
						r, body, width, text)
				}
			}
		}
	}
}

// TestFixListEndsNoLineInACutToken covers the fleet fix list across every width a terminal can
// ask for: a head line carries the condition id whole or wraps it beneath, and a check name too
// long for the line is ellipsized rather than cut at the edge. A line ending in a piece of a
// token that is not a token itself ("edg" for edge.https-not-forced) is the failure this catches.
func TestFixListEndsNoLineInACutToken(t *testing.T) {
	reports := fixtures.TwelveSites()
	// The handles this fleet's own fix list prints: the condition id each check declared, the
	// check ids, the site names, and the credential variables. A line may end in any of them
	// whole; a proper prefix of one is a cut. They are read off the reports rather than off the
	// shipped vocabularies, since an id no fixture declares cannot be cut by a frame.
	var tokens []string
	for _, c := range sampleStatus().Credentials {
		tokens = append(tokens, c.Variable)
	}
	for _, r := range reports {
		tokens = append(tokens, r.Site)
		for _, c := range r.Checks {
			tokens = append(tokens, c.ID)
			if c.Outcome.Condition != spine.ConditionNone {
				tokens = append(tokens, string(c.Outcome.Condition))
			}
		}
	}
	whole := func(s string) bool { return slices.Contains(tokens, s) }

	for width := 20; width <= 120; width++ {
		inList := false
		for _, l := range plainLines(manyInput(reports, width, false)) {
			if strings.Contains(l, labelWhatToFix) {
				inList = true
				continue
			}
			fields := strings.Fields(l)
			if !inList || len(fields) == 0 {
				continue
			}
			last := fields[len(fields)-1]
			if whole(last) || strings.HasSuffix(last, NewTheme(true, ProfileNoColor).GlyphSet.Unicode.Ellipsis) {
				continue
			}
			for _, tok := range tokens {
				// A count or a single letter is a word of its own that happens to open a handle
				// ("9" opens "907.life"), so only a piece long enough to be a cut is read as one.
				if len(last) > 2 && len(last) < len(tok) && strings.HasPrefix(tok, last) {
					t.Errorf("width %d: the line %q ends in a cut %q", width, l, tok)
				}
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

		// The field column pays for itself only where it leaves the fields a readable share of
		// the line. Below the wide rung the record names itself on one line and its fields
		// follow, which is what keeps a field from being hard-wrapped inside its own token.
		record := lineCarryingIn(t, lines, "commit.failed")
		if width >= Width100 && !strings.Contains(record, "=") {
			t.Errorf("width %d: the record line carries no field: %q", width, record)
		}
		if width < Width100 && strings.Contains(record, "=") {
			t.Errorf("width %d: a field shares the record line at a width too narrow for it: %q",
				width, record)
		}
	}
}

// TestLogBodyDropsTheEventColumnForAWorkersOwnLines covers a window carrying no engine record:
// no row has an event, so the event column is not drawn and the fields sit against the level
// column, and a message that opened with a newline and a colour escape prints with no gap after
// its own key. The excerpt carrying engine records keeps the column, so the collapse is the
// query's answer rather than a rule that took the column away from every log frame.
func TestLogBodyDropsTheEventColumnForAWorkersOwnLines(t *testing.T) {
	for _, width := range []int{60, 80, 100, 120} {
		foreign := plainLines(RenderInput{
			View: ViewLogs, Width: width, Dark: true, Profile: ProfileNoColor,
			Site: "907.life", Entries: goldenForeignLogEntries(), Now: fixtures.Now(),
		})
		text := strings.Join(foreign, "\n")
		if strings.Contains(text, "message= ") {
			t.Errorf("width %d: a message prints a space after its key:\n%s", width, text)
		}
		if !strings.Contains(text, "message=[404] POST /blog/") {
			t.Errorf("width %d: the trimmed message is missing:\n%s", width, text)
		}
		if width < Width100 {
			continue
		}
		record := lineCarryingIn(t, foreign, "[404] POST /blog/")
		if got, want := strings.Index(record, "message="), logIndent+logTime+logLevel; got != want {
			t.Errorf("width %d: the fields start at column %d, want %d: %q", width, got, want, record)
		}
		engine := plainLines(RenderInput{
			View: ViewLogs, Width: width, Dark: true, Profile: ProfileNoColor,
			Site: "ecxc.ski", Entries: goldenLogEntries(), Now: fixtures.Now(),
		})
		row := lineCarryingIn(t, engine, "commit.failed")
		if got, want := strings.Index(row, "editor="), logIndent+logTime+logLevel+logEvent; got != want {
			t.Errorf("width %d: a record carrying an event starts its fields at column %d, want %d: %q",
				width, got, want, row)
		}
	}
}

// lineCarryingIn returns the one line of lines holding want, failing when none or several do.
func lineCarryingIn(t *testing.T, lines []string, want string) string {
	t.Helper()
	var found []string
	for _, l := range lines {
		if strings.Contains(l, want) {
			found = append(found, l)
		}
	}
	if len(found) != 1 {
		t.Fatalf("%d lines carry %q, want exactly 1", len(found), want)
	}
	return found[0]
}

// TestNeverColourAlone is criterion 14: every state word a colour render shows at a width also
// reaches the no-colour render at that width, so nothing on the screen is carried by hue alone.
func TestNeverColourAlone(t *testing.T) {
	words := []string{"pass", "fail", "held", "skip", "unknown", "OK", "WARNING", "CRITICAL", "UNKNOWN"}
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

// TestFleetOnePassRule extends criterion 4 to the fleet body, which is where it is easiest to
// break: a site reporting OK inside a failing sweep is muted like every other passing mark, so
// the only saturated ink on the screen belongs to what failed.
func TestFleetOnePassRule(t *testing.T) {
	theme := NewTheme(true, ProfileTrueColor)
	ok := inkOf(theme, RoleOK)
	for _, width := range []int{Width80, Width100, WidthCap} {
		in := input(fixtures.TwelveSites(), BodyMany, width, ProfileTrueColor, false, spine.VerdictCritical)
		in.Status = sampleStatus()
		for _, sp := range frameSpans(Render(in)) {
			// Containment, not equality: a bold cell carries the weight parameter ahead of the
			// colour, so an exact match would miss the verdict word, which is the one span this
			// rule is most easily broken on.
			if strings.Contains(sp.sgr, ok) {
				t.Errorf("width %d: %q carries the ok role's saturated ink in a CRITICAL run",
					width, sp.text)
			}
		}
	}
}

// tableHeadingLine returns the plain table's own heading row, or "" when the frame drew the
// labelled strip instead. The strip's heading row leads with blanks and a check id, so the
// leading "site" is what tells the two apart.
func tableHeadingLine(lines []string) string {
	for _, l := range lines {
		if strings.HasPrefix(l, "site ") {
			return l
		}
	}
	return ""
}

// TestManyTableDrawsEveryColumnWholeAtEveryWidth walks the whole supported width range and
// asserts the plain table prints each column it draws in full: every heading as its own whole
// word, and every engine version as the version rather than its first character. It is the
// assertion the width-60 golden did not make. Before the column budget dropped a column it
// could not fit, lipgloss squeezed the last ones instead, and a real run at --width 60 printed
// the "engine" heading as "e" over a "0" that was once "0.84.4".
func TestManyTableDrawsEveryColumnWholeAtEveryWidth(t *testing.T) {
	reports := fixtures.TwelveSites()
	theme := NewTheme(true, ProfileNoColor)
	tables := 0

	for w := 20; w <= 1000; w++ {
		lines := plainLines(input(reports, BodyMany, w, ProfileNoColor, false, verdictFor(reports)))
		head := tableHeadingLine(lines)
		if head == "" {
			continue
		}
		tables++

		_, columns := tableFit(theme.siteColWidth(reports), content(w))
		for i := range columns {
			if !strings.Contains(head, tableColumns[i].heading) {
				t.Fatalf("width %d: heading row %q is missing the %q column", w, head, tableColumns[i].heading)
			}
		}
		if columns < len(tableColumns) && strings.Contains(head, tableColumns[columns].heading) {
			t.Fatalf("width %d: heading row %q carries the %q column the budget dropped",
				w, head, tableColumns[columns].heading)
		}

		version := engineVersion(reports[0])
		drawsEngine := slices.IndexFunc(tableColumns[:columns], func(c struct {
			heading string
			width   int
		}) bool {
			return c.heading == "engine"
		}) >= 0
		if drawsEngine && version != "" && !slices.ContainsFunc(lines, func(l string) bool {
			return strings.Contains(l, version)
		}) {
			t.Fatalf("width %d: no row carries the engine version %q whole", w, version)
		}
	}

	if tables == 0 {
		t.Fatal("no width in the supported range drew the plain table, so nothing was asserted")
	}
}
