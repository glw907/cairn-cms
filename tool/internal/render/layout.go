package render

import (
	"strconv"
	"strings"
	"time"

	"charm.land/lipgloss/v2"
	"github.com/glw907/cairn-cms/tool/v2/internal/health"
	"github.com/glw907/cairn-cms/tool/v2/internal/spine"
	"github.com/glw907/cairn-cms/tool/v2/internal/style"
)

// This file is the layer every body shares: the way a report splits into sections, the section
// words, the header block, the hold field, the fix's parts, and the text primitives a body
// composes with. A body owns its frame and nothing else, so the vocabulary, the ranking, the fix
// format, and the timestamps cannot drift between a terminal and a pipe.

// docsBase is the root every published cairn documentation address resolves under, stated once
// so no body builds a documentation address itself.
const docsBase = "https://cairn.pub/docs/"

// fixAnchorBase is the page every fix's anchor resolves against. A fix names an anchor alone,
// and the admin arm's is-it-working page is the one page those anchors are written for.
const fixAnchorBase = docsBase + "admin/is-it-working#"

// The section labels, the four labels a health run's checks are grouped under. They are their
// fixed vocabulary and no health body invents a fifth: the check-result words are five, and the
// two that mean a check did not settle, "skip" and "unknown", share the one "could not run"
// section, since the operator's next move is the same for both and a section per word would
// split a group of two rows into two groups of one. A doctor run's skip means its precondition
// did not hold rather than that it could not run, so body_doctor.go adds two group words of its
// own.
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
// noun the digits count. Every state word in this vocabulary is already its plural.
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

// checkedPhrase renders when a report was gathered and, where the caller measured one, how long
// the run itself took. The age leads, since how old the data is decides whether an operator
// trusts it, and the stamp follows in parentheses for the reader who wants the instant. The
// three facts are separated by commas, so a reader does not take the elapsed time for part of
// the stamp.
//
// A stamp from the future, which a clock skew between this machine and a provider's
// timestamps can produce, has no age to state and prints alone.
func checkedPhrase(at, now time.Time, elapsed time.Duration) string {
	out := "checked " + stamp(at)
	if d := now.Sub(at); d >= time.Second {
		out = "checked " + relative(d) + " ago (" + stamp(at) + ")"
	}
	if elapsed > 0 {
		out += ", in " + latency(elapsed)
	}
	return out
}

// latency spells a measured duration the way the copy standard's units rule asks: whole
// milliseconds under a second, and seconds to one decimal above it.
func latency(d time.Duration) string {
	if d < time.Second {
		return strconv.Itoa(int(d.Milliseconds())) + "ms"
	}
	return strconv.FormatFloat(d.Seconds(), 'f', 1, 64) + "s"
}

// stamp writes an instant in ISO order in UTC, named. One zone for every stamp is what lets two
// operators on two continents compare the same run, and the relative age beside it is what a
// reader takes the recency from. UTC is a conversion of the value, never a location lookup:
// render never calls time.Now, Local, or LoadLocation, so the same input renders the same bytes
// under any TZ.
func stamp(t time.Time) string {
	return t.UTC().Format("2006-01-02 15:04") + " UTC"
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
// the decision to hold it are two facts, so the hold takes a separate field.
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

// conditionID returns the stable failure id a check's verdict declared, or empty where it
// declared none. Only the engine's condition registry is printed: an id a check did not declare
// is a claim about what was measured, and spine.Code is the tool's bookkeeping rather than
// a published handle an operator can look up.
func conditionID(o spine.Outcome) string {
	if o.Condition == spine.ConditionNone {
		return ""
	}
	return sanitize(string(o.Condition))
}

// fixURL returns the documentation address a fix's anchor resolves to, and empty when the fix
// names no anchor. A fix line with no URL is a fix line with no URL: the tool's bookkeeping
// about a page it has not written does not go in the operator's column.
func fixURL(f health.Fix) string {
	if f.Anchor == "" {
		return ""
	}
	return fixAnchorBase + f.Anchor
}

// linkable reports whether url may be emitted as an OSC 8 hyperlink. The target is constrained
// rather than trusted: https only, unchanged by sanitize (so no control byte survives in it),
// and carrying no whitespace, which is what keeps a hostile string that reached a fix field from
// becoming a clickable destination that differs from the text beside it.
func linkable(url string) bool {
	return strings.HasPrefix(url, "https://") &&
		sanitize(url) == url &&
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
func passRole(v spine.Verdict) style.Role {
	if v == spine.VerdictOK {
		return style.RoleOK
	}
	return style.RoleMuted
}

// verdictRole returns the ink a verdict word takes. Full saturation belongs to CRITICAL alone,
// and OK is green only inside a run that is itself OK.
func verdictRole(v spine.Verdict) style.Role {
	switch v {
	case spine.VerdictCritical:
		return style.RoleFailing
	case spine.VerdictOK:
		return passRole(v)
	default:
		return style.RoleUnknown
	}
}

// verdictLines is the block every terminal body opens and closes with: the verdict, the subject
// bold, the tallies muted. A tally is a fact, so when the three will not fit on one line the
// tally takes a line by itself rather than being cut.
//
// The order is the same at the head of a frame and at the foot of it. The verdict leads the
// block wherever it appears, so a reader who has learned the device at the top of the screen
// reads the bottom the same way, and a frame whose footer wrapped does not state its counts
// before the word they belong to.
func (t theme) verdictLines(v spine.Verdict, subject, tally string, width int) []string {
	return style.VerdictLine(t.Theme, v.String(), verdictRole(v), subject, tally, width)
}

// cell renders one fixed-width field. theme.Sized pads inside the styled block and cuts there,
// so the padding carries the field's style and a row's ground can span it without gaps.
func (t theme) cell(role style.Role, text string, n int) string {
	return t.Sized(role, n).Render(text)
}

// row joins fixed cells into one line.
func row(cells ...string) string {
	return lipgloss.JoinHorizontal(lipgloss.Top, cells...)
}

// hangingAt wraps text into the column at col, with lead printed before the first line, so a fix
// wraps under itself and is never truncated. noOrphan wraps through Wrap rather than WrapGreedy,
// for a comma-joined list a naive break can leave one name dangling on.
func (t theme) hangingAt(st lipgloss.Style, lead string, col int, text string, width int, noOrphan bool) []string {
	wrap := t.WrapGreedy
	if noOrphan {
		wrap = t.Wrap
	}
	return hangingLines(st, lead, col, wrap(text, width-col))
}

// hangingLines lays already-wrapped body lines into the column at col, with lead before the first
// and that column's padding before every line after it. It takes the wrapped lines rather than the
// text so a caller can choose which wrap produced them.
func hangingLines(st lipgloss.Style, lead string, col int, body []string) []string {
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
func (t theme) indented(st lipgloss.Style, col int, text string, width int) []string {
	return atColumn(st, col, t.WrapGreedy(text, width-col))
}

// wrapLeavingTail wraps text to width and re-flows its last line until tailWidth cells are free
// at the end of it, so a trailing field shares that line rather than taking a line by itself. It
// reports false when no re-flow leaves the room, which is a width too narrow to carry both.
func (t theme) wrapLeavingTail(text string, width, tailWidth int) (lines []string, ok bool) {
	lines = t.WrapGreedy(text, width)
	if len(lines) == 0 {
		return nil, false
	}
	for t.Width(lines[len(lines)-1])+tailWidth > width {
		words := strings.Fields(lines[len(lines)-1])
		if len(words) < 2 {
			return t.WrapGreedy(text, width), false
		}
		lines[len(lines)-1] = strings.Join(words[:len(words)-1], " ")
		lines = append(lines, words[len(words)-1])
	}
	return lines, true
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
