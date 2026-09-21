package render

import (
	"strconv"
	"strings"
	"time"

	"charm.land/lipgloss/v2"
	"github.com/glw907/cairn-cms/tool/internal/health"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// This file is the layer every body shares: the way a report splits into sections, the section
// words, the header block, the hold field, the fix's own parts, and the text primitives a body
// composes with. A body owns its frame and nothing else, so the vocabulary, the ranking, the fix
// format, and the timestamps cannot drift between a terminal and a pipe.

// docsBase is the page every fix's anchor resolves against. It is stated once so no body builds
// a documentation address of its own.
const docsBase = "https://cairn.pub/docs/admin/is-it-working#"

// The section labels, the four words a run's checks are grouped under. They are the copy
// standard's fixed vocabulary and no body invents a fifth.
const (
	labelFailing     = "failing"
	labelCouldNotRun = "could not run"
	labelHeld        = "held"
	labelPassing     = "passing"
)

// escalationWindow is how long before a hold expires the hold field takes the attention ink. A
// hold whose expiry passes unnoticed silently becomes a failure nobody was warned about.
const escalationWindow = 48 * time.Hour

// sections is one report's checks split by what the operator must do with them, each slice
// ranked worst first.
type sections struct {
	// Failing holds every unheld failure, and every failure whose hold has lapsed.
	Failing []health.CheckResult
	// CouldNotRun holds every check the sweep could not observe.
	CouldNotRun []health.CheckResult
	// Held holds every failure an unexpired hold still covers.
	Held []health.CheckResult
	// Passing holds every check that passed, in the order the sweep ran them, since a passing
	// check has no severity to rank by.
	Passing []health.CheckResult
}

// split divides r's checks into sections. A hold that has lapsed holds nothing: its check joins
// the failures and says when the hold expired, which is what keeps a forgotten hold from quietly
// silencing a live failure.
func split(r health.Report) sections {
	var s sections
	for _, c := range r.Checks {
		switch {
		case c.Outcome.State == spine.Failing && c.Acknowledged:
			s.Held = append(s.Held, c)
		case c.Outcome.State == spine.Failing:
			s.Failing = append(s.Failing, c)
		case c.Outcome.State == spine.Unknown:
			s.CouldNotRun = append(s.CouldNotRun, c)
		default:
			s.Passing = append(s.Passing, c)
		}
	}
	s.Failing = rankResults(s.Failing)
	s.CouldNotRun = rankResults(s.CouldNotRun)
	s.Held = rankResults(s.Held)
	return s
}

// tally renders the header's counts in the section words, joined by sep, omitting a state with
// none. The passing count always prints, so a reader always learns how much did run.
func (s sections) tally(sep string) string {
	var parts []string
	if n := len(s.Failing); n > 0 {
		parts = append(parts, count(n, labelFailing))
	}
	if n := len(s.CouldNotRun); n > 0 {
		parts = append(parts, count(n, labelCouldNotRun))
	}
	if n := len(s.Held); n > 0 {
		parts = append(parts, count(n, labelHeld))
	}
	return strings.Join(append(parts, count(len(s.Passing), labelPassing)), sep)
}

// count renders a tally the way the copy standard's numbers rule asks: digits, and always the
// noun the digits count. Every state word in this vocabulary is already its own plural.
func count(n int, word string) string {
	return strconv.Itoa(n) + " " + word
}

// checkedAt returns the instant r's sweep settled, which is the clock every check in one report
// shares, and falls back to fallback for a report with no checks at all.
func checkedAt(r health.Report, fallback time.Time) time.Time {
	for _, c := range r.Checks {
		if !c.CheckedAt.IsZero() {
			return c.CheckedAt
		}
	}
	return fallback
}

// checkedPhrase renders when a report was gathered. Recency is relative with the absolute in
// parentheses, except for a run settled within the last minute, where a relative reading adds
// nothing to the stamp beside it.
func checkedPhrase(at, now time.Time) string {
	if d := now.Sub(at); d >= time.Minute {
		return "checked " + relative(d) + " ago (" + stamp(at) + ")"
	}
	return "checked " + stamp(at)
}

// stamp writes an instant in ISO order carrying its own real zone offset. The value's own
// location is the one it prints in: render never calls time.Now, Local, or LoadLocation, so the
// same input renders the same bytes under any TZ.
func stamp(t time.Time) string {
	return t.Format("2006-01-02 15:04Z07:00")
}

// isoDate writes a civil date, the form every hold expiry prints in.
func isoDate(t time.Time) string {
	return t.Format("2006-01-02")
}

// relative formats a duration as the single unit an operator reads at a glance.
func relative(d time.Duration) string {
	switch {
	case d < time.Minute:
		return strconv.Itoa(int(d.Seconds())) + "s"
	case d < time.Hour:
		return strconv.Itoa(int(d.Minutes())) + "m"
	case d < 48*time.Hour:
		return strconv.Itoa(int(d.Hours())) + "h"
	default:
		return strconv.Itoa(int(d.Hours()/24)) + "d"
	}
}

// holdField returns the trailing field a row with a hold carries, and whether that hold is
// inside its escalation window. The hold is never comma-spliced into the detail: a failure and
// the decision to hold it are two facts, so the hold takes a field of its own.
//
// A lapsed hold reports when it expired and escalates nothing: the check is already back among
// the failures, which is a louder signal than any ink.
//
// Only a failing check carries the field at all. health.applyAck stamps AckExpires onto any
// result whose id matches an ack entry, including one that has since recovered or could not run,
// and a hold is a decision about a failure: printed beside a passing or skipped row it would
// state a decision the row contradicts.
func holdField(c health.CheckResult, now time.Time) (text string, escalating bool) {
	if c.Outcome.State != spine.Failing || c.AckExpires.IsZero() {
		return "", false
	}
	if !c.Acknowledged {
		return "hold expired " + isoDate(c.AckExpires), false
	}
	left := c.AckExpires.Sub(now)
	return "held until " + isoDate(c.AckExpires) + ", " + remaining(left) + " left", left <= escalationWindow
}

// remaining spells a hold's remaining time: whole days at a distance, and whole hours once the
// expiry is close enough that a day count would round the warning away.
func remaining(d time.Duration) string {
	if d >= escalationWindow {
		return count(int(d.Hours()/24), "days")
	}
	return count(max(int(d.Hours()), 0), "hours")
}

// conditionID returns the stable failure id a check's own verdict declared, or empty where it
// declared none. Only the engine's condition registry is printed: an id a check did not declare
// is a claim about what was measured, and spine.Code is the tool's own bookkeeping rather than
// a published handle an operator can look up.
func conditionID(o spine.Outcome) string {
	if o.Condition == spine.ConditionNone {
		return ""
	}
	return Sanitize(string(o.Condition))
}

// fixURL returns the documentation address a fix's anchor resolves to, and empty when the fix
// names no anchor. A fix line with no URL is a fix line with no URL: the tool's own bookkeeping
// about a page it has not written does not go in the operator's column.
func fixURL(f health.Fix) string {
	if f.Anchor == "" {
		return ""
	}
	return docsBase + f.Anchor
}

// linkable reports whether url may be emitted as an OSC 8 hyperlink. The target is constrained
// rather than trusted: https only, unchanged by Sanitize (so no control byte survives in it),
// and carrying no whitespace, which is what keeps a hostile string that reached a fix field from
// becoming a clickable destination that differs from the text beside it.
func linkable(url string) bool {
	return strings.HasPrefix(url, "https://") &&
		Sanitize(url) == url &&
		!strings.ContainsAny(url, " \t")
}

// actorPhrase names whose job carrying a fix out is, and says so when carrying it out changes
// what the public sees, which is the difference between a change an agent may make unattended
// and one a person has to weigh.
func actorPhrase(f health.Fix) string {
	if f.Outward {
		return string(f.Actor) + " (changes the live site)"
	}
	return string(f.Actor)
}

// passRole returns the ink every passing mark takes in a frame whose verdict is v. Green means
// this run is OK: anywhere else a pass is muted, so the only saturated ink on a failing screen
// belongs to what failed.
func passRole(v Verdict) Role {
	if v == spine.VerdictOK {
		return RoleOK
	}
	return RoleMuted
}

// verdictRole returns the ink a verdict word takes. Full saturation belongs to CRITICAL alone,
// and OK is green only inside a run that is itself OK.
func verdictRole(v Verdict) Role {
	switch v {
	case spine.VerdictCritical:
		return RoleFailing
	case spine.VerdictOK:
		return passRole(v)
	default:
		return RoleUnknown
	}
}

// verdictLines is the line every terminal body leads with and ends on: the verdict, the subject
// bold, the tallies muted. A tally is a fact, so when the three will not fit on one line the
// tally takes a line of its own rather than being cut.
func (t Theme) verdictLines(v Verdict, subject, tally string, width int) []string {
	word := v.String()
	head := t.Strong(verdictRole(v)).Render(word)
	if subject != "" {
		head += "  " + t.Strong(RoleText).Render(subject)
	}
	if t.Width(word)+2+t.Width(subject)+2+t.Width(tally) <= width {
		return []string{head + "  " + t.Style(RoleMuted).Render(tally)}
	}
	out := []string{head}
	for _, l := range wrap(tally, width) {
		out = append(out, t.Style(RoleMuted).Render(l))
	}
	return out
}

// insetRule is the one section device this design uses: a lowercase label inset two cells into a
// rule. No box, no capitals, no coloured rail of its own.
func (t Theme) insetRule(ascii bool, label string, width int) string {
	lead := t.Rule(ascii, 2)
	tail := max(width-t.Width(lead)-t.Width(label)-2, 0)
	return t.Style(RoleRule).Render(lead) + " " + t.Style(RoleText).Render(label) + " " +
		t.Style(RoleRule).Render(t.Rule(ascii, tail))
}

// cell renders one fixed-width field. Theme.Sized pads inside the styled block and cuts there,
// so the padding carries the field's own style and a 2.0 HUD can later paint a selected row's
// ground across a whole row without striped gaps.
func (t Theme) cell(role Role, text string, n int) string {
	return t.Sized(role, n).Render(text)
}

// row joins fixed cells into one line.
func row(cells ...string) string {
	return lipgloss.JoinHorizontal(lipgloss.Top, cells...)
}

// wrap word-wraps text to width and returns the lines, never cutting a word that carries
// meaning. A single token longer than width is hard-wrapped rather than truncated, since the
// tokens that overflow here are URLs and domains, where the tail is the part that identifies it.
//
// The break is the space and nothing else. A library word wrap also breaks after a hyphen, which
// turns 2026-09-25 into two dates and a stray dash.
func wrap(text string, width int) []string {
	if width < 1 {
		width = 1
	}
	if text == "" {
		return nil
	}
	var out []string
	cur := ""
	for i, tok := range strings.Split(text, " ") {
		sep := ""
		if i > 0 && cur != "" {
			sep = " "
		}
		if cur != "" && textWidth(cur)+textWidth(sep)+textWidth(tok) > width {
			out = append(out, strings.TrimRight(cur, " "))
			cur, sep = "", ""
		}
		for textWidth(tok) > width {
			head, tail := cutAt(tok, width)
			out = append(out, head)
			tok = tail
		}
		cur += sep + tok
	}
	if cur != "" {
		out = append(out, strings.TrimRight(cur, " "))
	}
	return out
}

// cutAt splits s after width cells, returning the head and the remainder. It walks runes rather
// than bytes so a multi-byte or double-width rune is never split down the middle.
func cutAt(s string, width int) (head, tail string) {
	n := 0
	for i, r := range s {
		rw := textWidth(string(r))
		if n+rw > width && i > 0 {
			return s[:i], s[i:]
		}
		n += rw
	}
	return s, ""
}

// hangingAt wraps text into the column at col, with lead printed before the first line, so a fix
// wraps under itself and is never truncated.
func hangingAt(st lipgloss.Style, lead string, col int, text string, width int) []string {
	body := wrap(text, width-col)
	pad := strings.Repeat(" ", col)
	out := make([]string, 0, len(body))
	for i, l := range body {
		if i == 0 {
			out = append(out, lead+st.Render(l))
			continue
		}
		out = append(out, pad+st.Render(l))
	}
	return out
}

// indented renders text wrapped into the column at col, every line at that column.
func indented(st lipgloss.Style, col int, text string, width int) []string {
	return atColumn(st, col, wrap(text, width-col))
}

// atColumn renders already-wrapped lines at col, each in st.
func atColumn(st lipgloss.Style, col int, lines []string) []string {
	pad := strings.Repeat(" ", col)
	out := make([]string, 0, len(lines))
	for _, l := range lines {
		out = append(out, pad+st.Render(l))
	}
	return out
}

// wrapLeavingTail wraps text to width and re-flows its last line until tailWidth cells are free
// at the end of it, so a trailing field shares that line rather than taking one of its own. It
// reports false when no re-flow leaves the room, which is a width too narrow to carry both.
func wrapLeavingTail(text string, width, tailWidth int) (lines []string, ok bool) {
	lines = wrap(text, width)
	if len(lines) == 0 {
		return nil, false
	}
	for textWidth(lines[len(lines)-1])+tailWidth > width {
		words := strings.Fields(lines[len(lines)-1])
		if len(words) < 2 {
			return wrap(text, width), false
		}
		lines[len(lines)-1] = strings.Join(words[:len(words)-1], " ")
		lines = append(lines, words[len(words)-1])
	}
	return lines, true
}
