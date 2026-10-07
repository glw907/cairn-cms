package doctor

import "strings"

// blankJSComments scans JavaScript or TypeScript source once and returns two views of it that
// keep every byte offset. Comments become spaces in both. In masked the interior of every string
// literal is blanked too, so a key name or a bracket inside a string never reads as syntax; in
// code the strings stay, so an entry's text can be read back at the offsets masked found.
// Newlines survive in both. A backtick string is scanned to its closing backtick without
// following ${} nesting, which a trustedOrigins value never needs.
func blankJSComments(src string) (masked, code string) {
	m := []byte(src)
	c := []byte(src)
	blank := func(b []byte, i int) {
		if b[i] != '\n' {
			b[i] = ' '
		}
	}
	for i := 0; i < len(src); {
		switch {
		case strings.HasPrefix(src[i:], "//"):
			for i < len(src) && src[i] != '\n' {
				blank(m, i)
				blank(c, i)
				i++
			}
		case strings.HasPrefix(src[i:], "/*"):
			end := strings.Index(src[i+2:], "*/")
			stop := len(src)
			if end >= 0 {
				stop = i + 2 + end + 2
			}
			for ; i < stop; i++ {
				blank(m, i)
				blank(c, i)
			}
		case src[i] == '\'' || src[i] == '"' || src[i] == '`':
			quote := src[i]
			i++
			for i < len(src) && src[i] != quote {
				if src[i] == '\\' && i+1 < len(src) {
					blank(m, i)
					i++
				}
				blank(m, i)
				i++
			}
			i++
		default:
			i++
		}
	}
	return string(m), string(c)
}
