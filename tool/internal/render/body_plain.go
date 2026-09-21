package render

import (
	"strconv"
	"strings"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/health"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// The plain body's keys. Every line is one fact behind one of these, lowercase, followed by a
// colon and a space, so a person reads sentences and an agent greps whole lines.
const (
	keyVerdict   = "verdict: "
	keyChecked   = "checked: "
	keyCondition = "condition: "
	keyReason    = "reason: "
	keyFix       = "fix: "
	keyFixActor  = "fix actor: "
	keyDocs      = "docs: "
	keyFixFor    = "fix for: "
	keyExit      = "exit: "
)

// renderPlain is what a pipe, a cron mail, a CI log, and an agent receive. It has two readers
// and one shape that serves both. For the person: whole sentences, no glyphs, no rules, no
// alignment, so it reads correctly in a proportional font and to a screen reader. For the agent:
// one fact per line behind a stable key it can grep, no continuation lines, the check id and the
// condition id as literal tokens, and the verdict first and last so a truncated cron mail still
// carries it.
//
// Nothing here depends on the width: a body that pads or wraps is a body whose meaning depends
// on a column position, which is what the other two readers cannot follow.
func renderPlain(t Theme, in RenderInput) Frame {
	report := firstReport(in)
	s := split(report)
	verdict := t.verdictKeyLine(in.Verdict, Sanitize(report.Site), s.tally(", "))

	f := Frame{Header: []string{
		verdict,
		keyChecked + checkedPhraseValue(checkedAt(report, in.Now), in.Now),
	}}

	var body []string
	block := func(lines ...[]string) {
		var joined []string
		for _, l := range lines {
			joined = append(joined, l...)
		}
		if len(joined) > 0 {
			body = append(body, "")
			body = append(body, joined...)
		}
	}

	for _, c := range s.Failing {
		block(plainCheck(c, in.Now), plainFix(c))
	}
	for _, c := range s.Held {
		block(plainCheck(c, in.Now), plainFix(c))
	}
	for _, c := range s.CouldNotRun {
		block(plainCheck(c, in.Now))
	}
	for _, g := range groupFixes(s.CouldNotRun) {
		block(append([]string{keyFixFor + strings.Join(g.ids, ", ")}, fixLines(g.fix)...))
	}
	var passing []string
	for _, c := range s.Passing {
		passing = append(passing, plainCheck(c, in.Now)...)
	}
	block(passing)
	f.Body = body

	f.Footer = []string{"", verdict, keyExit + strconv.Itoa(int(in.Verdict))}
	return f
}

// verdictKeyLine is the line the plain body opens and closes with. The verdict word carries the
// frame's one piece of ink, so an operator who forced colour into a pipe still sees it and a
// reader of the raw bytes still reads the word.
func (t Theme) verdictKeyLine(v Verdict, site, tally string) string {
	line := keyVerdict + t.Strong(verdictRole(v)).Render(v.String())
	if site != "" {
		line += " - " + site
	}
	return line + ", " + tally
}

// checkedPhraseValue is checkedPhrase's value half, with the leading "checked " dropped: this
// body's own key already carries the word.
func checkedPhraseValue(at, now time.Time) string {
	return strings.TrimPrefix(checkedPhrase(at, now), "checked ")
}

// plainCheck renders one check's own lines: its state, the condition id where its verdict
// declared one, and, for a check that could not run, the reason that carries the difference
// between a missing credential and a timeout.
//
// A held row is the one line that carries two facts: the plain body has no key for a hold, so
// the hold rides the state line rather than inventing a fifth key an agent would have to learn.
func plainCheck(c health.CheckResult, now time.Time) []string {
	skipped := c.Outcome.State == spine.Unknown
	line := Sanitize(c.ID) + ": " + spine.StateWord(c.Outcome.State, c.Acknowledged)
	detail := Sanitize(checkDetail(c))
	if !skipped && detail != "" {
		line += " - " + detail
	}
	if hold, _ := holdField(c, now); hold != "" {
		line += ", " + hold
	}
	out := []string{line}
	// The reason follows the skip line directly, before any other key: it is what carries the
	// difference between a missing credential and a timeout that the word "skip" alone does not.
	if skipped {
		out = append(out, keyReason+plainValue(detail))
	}
	if cond := conditionID(c.Outcome); cond != "" {
		out = append(out, keyCondition+cond)
	}
	return out
}

// plainValue returns v with an empty value replaced by the one word that is still true about it,
// so no key is ever printed with nothing after it.
func plainValue(v string) string {
	if v == "" {
		return "unstated"
	}
	return v
}

// plainFix renders the fix a check's own verdict resolves to, and nothing when the fix table
// carries none for it.
func plainFix(c health.CheckResult) []string {
	fix, ok := health.FixFor(c.Outcome)
	if !ok {
		return nil
	}
	return fixLines(fix)
}

// fixLines renders one fix: the imperative sentence, whose job it is, and the page that
// documents it. A fix never wraps here, so a line-oriented reader gets the whole instruction.
func fixLines(fix health.Fix) []string {
	if fix.Text == "" {
		return nil
	}
	out := []string{keyFix + Sanitize(fix.Text), keyFixActor + actorPhrase(fix)}
	if url := fixURL(fix); url != "" {
		out = append(out, keyDocs+url)
	}
	return out
}

// fixGroup is one fix and every check that could not run for the same reason it names.
type fixGroup struct {
	ids []string
	fix health.Fix
}

// groupFixes collects the fixes for a run's unobservable checks, one entry per distinct fix,
// naming every check it covers. Where one missing input caused several skips, the group carries
// one fix under its own key rather than letting the last skipped row appear to own a fix that
// covers two: ambiguity costs more than duplication.
func groupFixes(skipped []health.CheckResult) []fixGroup {
	var out []fixGroup
	for _, c := range skipped {
		fix, ok := health.FixFor(c.Outcome)
		if !ok || fix.Text == "" {
			continue
		}
		id := Sanitize(c.ID)
		found := false
		for i := range out {
			if out[i].fix == fix {
				out[i].ids = append(out[i].ids, id)
				found = true
				break
			}
		}
		if !found {
			out = append(out, fixGroup{ids: []string{id}, fix: fix})
		}
	}
	return out
}
