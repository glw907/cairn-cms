package render

import (
	"encoding/json"
	"strings"
	"time"

	"github.com/glw907/cairn-cms/tool/v2/internal/logs"
	"github.com/glw907/cairn-cms/tool/v2/internal/style"
)

// The log body's column budget. The date and the zone are stated once, on the title, so a record
// line spends its width on the record rather than repeating the day on every row. The time and
// the level together carry the event to the grid's detail column, 20.
const (
	logIndent = colIndent
	logTime   = 10
	logLevel  = 8
	logEvent  = 23
)

// logLabel opens the title a log excerpt starts with.
const logLabel = "logs"

// logEmpty is what a query that matched nothing says.
const logEmpty = "no records"

// renderLogs draws a site's log excerpt.
//
// A level is a word and never a glyph: `?` already means a check that could not run in this
// design, and a log line is not a check. The fields wrap into a separate column with a hanging
// indent rather than being cut, so the field that carries the answer, a `reason` most of all, is
// never truncated.
//
// The event column is a row's own, not the table's. Only the engine writes an "event" key, so a
// window on a public site is almost entirely the Worker's console lines, and a column
// reserved for the whole excerpt spends twenty-three cells of blank on every one of them. A row
// with no event starts its fields against the level instead, and the rows that do carry one
// still line up with each other.
func renderLogs(t theme, in RenderInput) Frame {
	width := in.width()
	site := sanitize(in.Site)
	if len(in.Entries) == 0 {
		return Frame{header: []string{strings.Repeat(" ", logIndent) + t.Style(style.RoleMuted).Render(logEmpty)}}
	}

	// The title is the one label lowercased; the site and the zone keep the case they carry.
	earliest, latest := logSpan(in.Entries)
	title := style.Title(t.Theme, logLabel, width)[0]
	if site != "" {
		title += "  " + t.Style(style.RoleText).Render(site)
	}
	title += "  " + t.Style(style.RoleMuted).Render(earliest.Format("2006-01-02 MST"))
	f := Frame{header: []string{title, ""}}

	// The field column only pays for itself where it leaves the fields a readable share of the
	// line. Below that the record names itself on one line and its fields follow at the grid's
	// detail column, or at the name column under the one-column threshold, which is a wrap the
	// reader can follow rather than a token cut down the middle.
	wide := width >= width100
	underCol := t.DetailColumn("", width)
	var body []string
	for _, e := range in.Entries {
		cells := []string{
			strings.Repeat(" ", logIndent),
			t.cell(style.RoleMuted, e.At.Format("15:04:05"), logTime),
			t.cell(logLevelRole(e.Level), sanitize(e.Level), logLevel),
		}
		fieldCol := logIndent + logTime + logLevel
		if e.Event != "" {
			cells = append(cells, t.cell(style.RoleText, sanitize(e.Event), logEvent))
			fieldCol += logEvent
		}
		lead := row(cells...)
		if wide {
			body = append(body, t.hangingAt(t.Style(style.RoleSubtle), lead, fieldCol, logFieldText(e), width, false)...)
			continue
		}
		body = append(body, strings.TrimRight(lead, " "))
		body = append(body, t.indented(t.Style(style.RoleSubtle), underCol, logFieldText(e), width)...)
	}
	f.body = body

	span := count(len(in.Entries), "records") + " " + t.marks.Sep + " " +
		earliest.Format("15:04") + " to " + latest.Format("15:04 MST")
	f.footer = []string{"", strings.Repeat(" ", logIndent) + t.Style(style.RoleMuted).Render(span)}
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
func logLevelRole(level string) style.Role {
	switch level {
	case "error":
		return style.RoleFailing
	case "warn":
		return style.RoleUnknown
	default:
		return style.RoleMuted
	}
}

// logFieldText joins one record's non-envelope fields into the text that wraps into the field
// column, in the order the record carried them.
//
// A value is trimmed after it is sanitized rather than before. A Worker's console line
// commonly opens with a newline and a colour escape, which sanitize turns into a leading space,
// and that space reads as a value missing after its `key=` rather than as part of the message.
func logFieldText(e logs.Entry) string {
	pairs := make([]string, 0, len(e.Fields))
	for _, f := range e.Fields {
		pairs = append(pairs, sanitize(f.Key)+"="+strings.TrimSpace(sanitize(logFieldValue(f.Value))))
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
