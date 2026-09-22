package render

import (
	"strings"
	"unicode/utf8"

	"github.com/charmbracelet/x/ansi"
)

// Sanitize is the render seam every dynamic string passes through before a style is applied: a
// check's detail, a fix line, a site name, a domain, a log field value, and an adopt candidate's
// worker name all arrive from an HTTP body, a build log, or a GitHub error, so none of them is
// trusted. C0 and C1 controls are stripped, a tab, newline, or carriage return becomes a single
// space so a control that separated two words never joins them and never starts a line of its
// own, and invalid UTF-8 becomes the replacement character. No escape sequence reaches the
// terminal: ansi.Strip consumes a whole sequence, parameters included, so a forged
// "ESC[42;30m OK" never leaves colour-changing bytes sitting in the output as debris.
func Sanitize(s string) string {
	s = ansi.Strip(s)
	var b strings.Builder
	b.Grow(len(s))
	for i := 0; i < len(s); {
		r, size := utf8.DecodeRuneInString(s[i:])
		i += size
		switch {
		case r == utf8.RuneError && size == 1:
			b.WriteRune(utf8.RuneError)
		case r == '\t' || r == '\n' || r == '\r':
			b.WriteByte(' ')
		case r < 0x20 || r == 0x7f || (r >= 0x80 && r <= 0x9f):
			// Every other C0 and C1 control is dropped rather than turned into a space: it did
			// not separate two words, so there is nothing to preserve a break for.
		default:
			b.WriteRune(r)
		}
	}
	return b.String()
}
