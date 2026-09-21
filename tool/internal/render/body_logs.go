package render

import (
	"encoding/json"
	"strings"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/logs"
)

// The log body's own column budget. The date and the zone are stated once, on the section rule,
// so a record line spends its width on the record rather than repeating the day on every row.
const (
	logIndent = 2
	logTime   = 10
	logLevel  = 7
	logEvent  = 23
	logFields = logIndent + logTime + logLevel + logEvent
)

// logLabel heads the section rule a log excerpt opens with.
const logLabel = "logs"

// logEmpty is what a query that matched nothing says.
const logEmpty = "no records"

// renderLogs draws a site's log excerpt.
//
// A level is a word and never a glyph: `?` already means a check that could not run in this
// design, and a log line is not a check. The fields wrap into their own column with a hanging
// indent rather than being cut, so the field that carries the answer, a `reason` most of all, is
// never truncated.
func renderLogs(t Theme, in RenderInput) Frame {
	width := in.width()
	site := Sanitize(in.Site)
	if len(in.Entries) == 0 {
		return Frame{Header: []string{t.Style(RoleMuted).Render(logEmpty)}}
	}

	earliest, latest := logSpan(in.Entries)
	label := strings.TrimSpace(logLabel + "  " + site + "  " + earliest.Format("2006-01-02 MST"))
	f := Frame{Header: []string{t.insetRule(in.ASCII, label, width)}}

	// The field column only pays for itself where it leaves the fields a readable share of the
	// line. Below that the record names itself on one line and its fields follow at the time
	// column, which is a wrap the reader can follow rather than a token cut down the middle.
	wide := width >= Width100
	var body []string
	for _, e := range in.Entries {
		lead := row(
			strings.Repeat(" ", logIndent),
			t.cell(RoleMuted, e.At.Format("15:04:05"), logTime),
			t.cell(logLevelRole(e.Level), Sanitize(e.Level), logLevel),
			t.SizedStrong(RoleText, logEvent).Render(Sanitize(e.Event)),
		)
		if wide {
			body = append(body, hangingAt(t.Style(RoleSubtle), lead, logFields, logFieldText(e), width)...)
			continue
		}
		body = append(body, strings.TrimRight(lead, " "))
		body = append(body, indented(t.Style(RoleSubtle), logIndent+logTime, logFieldText(e), width)...)
	}
	f.Body = body

	f.Footer = []string{"", t.Style(RoleMuted).Render(count(len(in.Entries), "records") +
		" " + t.glyphs(in.ASCII).Sep + " " +
		earliest.Format("15:04") + " to " + latest.Format("15:04 MST"))}
	return t.clampFrame(f, width)
}

// logSpan returns the earliest and the latest instant the entries cover. The query returns them
// newest first, so the span is read from the values rather than from the ends of the slice: a
// footer reading "14:28 to 14:14" would be stating the window backwards.
func logSpan(es []logs.Entry) (earliest, latest time.Time) {
	earliest, latest = es[0].At, es[0].At
	for _, e := range es[1:] {
		if e.At.Before(earliest) {
			earliest = e.At
		}
		if e.At.After(latest) {
			latest = e.At
		}
	}
	return earliest, latest
}

// logLevelRole returns the ink a level word takes. The two levels that mean something went wrong
// take the state inks the rest of the design already spends on those meanings.
func logLevelRole(level string) Role {
	switch level {
	case "error":
		return RoleFailing
	case "warn":
		return RoleUnknown
	default:
		return RoleMuted
	}
}

// logFieldText joins one record's non-envelope fields into the text that wraps into the field
// column, in the order the record carried them.
func logFieldText(e logs.Entry) string {
	pairs := make([]string, 0, len(e.Fields))
	for _, f := range e.Fields {
		pairs = append(pairs, Sanitize(f.Key)+"="+Sanitize(logFieldValue(f.Value)))
	}
	return strings.Join(pairs, "  ")
}

// logFieldValue renders one field's raw JSON as the operator reads it: a JSON string unquoted,
// since the quotes are the wire's and not the value's, and every other shape exactly as the
// engine wrote it.
func logFieldValue(raw json.RawMessage) string {
	var s string
	if err := json.Unmarshal(raw, &s); err == nil {
		return s
	}
	return string(raw)
}
