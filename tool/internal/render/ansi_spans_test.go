package render

import (
	"regexp"
	"strings"
)

// This file is the one test-only ANSI span parser the package shares. Every assertion about what
// ink a frame spends reads spans through it, rather than each test growing a parser of its own or
// reaching for a second sanitizer.

// sgrPattern matches one SGR sequence, capturing its parameters.
var sgrPattern = regexp.MustCompile("\x1b\\[([0-9;]*)m")

// span is one run of text under one set of SGR parameters.
type span struct {
	// sgr is the parameter list in force, empty for unstyled text.
	sgr string
	// text is the run of printable characters the parameters cover.
	text string
}

// parseSpans splits s into the runs of text each SGR state covers. A reset (an empty or "0"
// parameter list) returns the state to unstyled, which is how lipgloss closes every styled block.
func parseSpans(s string) []span {
	var out []span
	state := ""
	last := 0
	for _, m := range sgrPattern.FindAllStringSubmatchIndex(s, -1) {
		if text := s[last:m[0]]; text != "" {
			out = append(out, span{sgr: state, text: text})
		}
		params := s[m[2]:m[3]]
		if params == "" || params == "0" {
			state = ""
		} else {
			state = params
		}
		last = m[1]
	}
	if text := s[last:]; text != "" {
		out = append(out, span{sgr: state, text: text})
	}
	return out
}

// frameSpans parses every line of a frame into spans.
func frameSpans(f Frame) []span {
	var out []span
	for _, l := range f.Lines() {
		out = append(out, parseSpans(l)...)
	}
	return out
}

// inkOf returns the SGR parameters a theme spends on one role, read from a probe render rather
// than hard-coded, so a palette edit moves the assertion with it instead of stranding it.
func inkOf(t Theme, role Role) string {
	spans := parseSpans(t.Style(role).Render("probe"))
	for _, sp := range spans {
		if strings.Contains(sp.text, "probe") {
			return sp.sgr
		}
	}
	return ""
}

// stripANSI returns s with every escape sequence removed, for an assertion about the characters
// a reader sees rather than the ink they carry.
func stripANSI(s string) string {
	return Sanitize(s)
}
