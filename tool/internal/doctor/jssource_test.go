package doctor

import (
	"strings"
	"testing"
)

// TestBlankJSCommentsKeepsStringsAndOffsets holds the scanner's two views to the contract the
// parser leans on: both keep every byte offset, the code view keeps string text, and the masked
// view blanks string interiors, so a comment marker inside a string never cuts the line and a
// key name inside a string never reads as a key.
func TestBlankJSCommentsKeepsStringsAndOffsets(t *testing.T) {
	src := "a: 'https://x', // tail\nb: \"csrf: {\" /* block\nspans */ c"
	masked, code := blankJSComments(src)
	if len(masked) != len(src) || len(code) != len(src) {
		t.Fatalf("lengths = %d and %d, want %d", len(masked), len(code), len(src))
	}
	if !strings.Contains(code, "'https://x'") {
		t.Errorf("code = %q, want the string with its two slashes kept", code)
	}
	if strings.Contains(code, "tail") || strings.Contains(code, "spans") {
		t.Errorf("code = %q, want both comments blanked", code)
	}
	if strings.Contains(masked, "csrf") || strings.Contains(masked, "https") {
		t.Errorf("masked = %q, want string interiors blanked", masked)
	}
	if strings.Count(code, "\n") != strings.Count(src, "\n") {
		t.Errorf("code = %q, want every newline kept", code)
	}
}
