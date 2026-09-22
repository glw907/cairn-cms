package render

import (
	"encoding/json"
	"os"
	"strings"
	"testing"
)

// hostileEntry is one row of testdata/hostile/corpus.json: docs/design/reviews/robustness.md's
// control-character corpus, plus the hostile URL row criterion 22 adds.
type hostileEntry struct {
	Name  string `json:"name"`
	Input string `json:"input"`
	// Want is the exact output Sanitize must produce. It is committed beside the input so the
	// corpus is the assertion: weakening the sanitizer fails the entry by name rather than
	// passing a property test that the control-dropping loop alone already satisfies.
	Want string `json:"want"`
}

// loadHostileCorpus reads the committed corpus so the test data stays reviewable and diffable
// apart from the Go source, the way criterion 22 asks for.
func loadHostileCorpus(t *testing.T) []hostileEntry {
	t.Helper()
	data, err := os.ReadFile("testdata/hostile/corpus.json")
	if err != nil {
		t.Fatal(err)
	}
	var entries []hostileEntry
	if err := json.Unmarshal(data, &entries); err != nil {
		t.Fatal(err)
	}
	if len(entries) == 0 {
		t.Fatal("testdata/hostile/corpus.json is empty")
	}
	return entries
}

// hasC0OrC1 reports whether s carries a C0 or C1 control byte, DEL included, the way Sanitize's
// own switch classifies one.
func hasC0OrC1(s string) bool {
	for _, r := range s {
		if r < 0x20 || r == 0x7f || (r >= 0x80 && r <= 0x9f) {
			return true
		}
	}
	return false
}

// TestSanitizeHostileCorpus is criterion 22: every entry in the committed corpus sanitizes to
// exactly the output committed beside it. Byte equality is the assertion rather than a property,
// so dropping ansi.Strip from the sanitizer fails the entries that carry an escape sequence and
// names each one, instead of leaving "before[31mafter" as debris a C0 check waves through. The
// no-control and one-line properties are checked too, since they are what the committed outputs
// are correct against.
func TestSanitizeHostileCorpus(t *testing.T) {
	for _, e := range loadHostileCorpus(t) {
		t.Run(e.Name, func(t *testing.T) {
			out := Sanitize(e.Input)
			if out != e.Want {
				t.Errorf("Sanitize(%q) = %q, want %q", e.Input, out, e.Want)
			}
			if hasC0OrC1(out) {
				t.Errorf("Sanitize(%q) = %q still carries a C0 or C1 byte", e.Input, out)
			}
			if n := strings.Count(out, "\n"); n != 0 {
				t.Errorf("Sanitize(%q) = %q carries %d newlines, want 0", e.Input, out, n)
			}
		})
	}
}

// TestSanitizeForgedVerdictStaysInField is criterion 22's named case: a forged "OK" carried by a
// colour escape must not read as a line of its own once its escapes are stripped.
func TestSanitizeForgedVerdictStaysInField(t *testing.T) {
	in := "detail \u001b[42;30mOK\u001b[0m more detail"
	got := Sanitize(in)
	want := "detail OK more detail"
	if got != want {
		t.Errorf("Sanitize(%q) = %q, want %q", in, got, want)
	}
}

// TestSanitizeControlBetweenWordsBecomesSpace is criterion 21's own rule: a control that
// separated two words becomes a space rather than joining them.
func TestSanitizeControlBetweenWordsBecomesSpace(t *testing.T) {
	for _, in := range []string{"before\nafter", "before\rafter", "before\tafter"} {
		got := Sanitize(in)
		if got != "before after" {
			t.Errorf("Sanitize(%q) = %q, want \"before after\"", in, got)
		}
	}
}

// TestSanitizeInvalidUTF8 is criterion 22's invalid-UTF-8 row: a corpus.json string cannot carry
// invalid UTF-8 (JSON strings are Unicode text), so this constructs the byte sequence directly.
func TestSanitizeInvalidUTF8(t *testing.T) {
	in := "before\xff\xfeafter"
	got := Sanitize(in)
	if !strings.Contains(got, "before") || !strings.Contains(got, "after") {
		t.Errorf("Sanitize(%q) = %q dropped surrounding text", in, got)
	}
	if hasC0OrC1(got) {
		t.Errorf("Sanitize(%q) = %q carries a control byte", in, got)
	}
}

// TestSanitizeDegenerateInputs is criterion 23's string-shaped half: an empty detail, an empty
// fix, a 300-character fix, a 60-character domain, an IDN, punycode, CJK, a ZWJ emoji, and a 2 KB
// log field all sanitize without panic. The count- and site-shaped half of criterion 23 (zero
// sites, zero checks, fifty sites, counts of 0 and 100000) describes a body's fixtures rather
// than a string Sanitize takes, and is out of this task's scope; see the task report.
func TestSanitizeDegenerateInputs(t *testing.T) {
	inputs := map[string]string{
		"empty":            "",
		"300_char_fix":     strings.Repeat("x", 300),
		"60_char_domain":   strings.Repeat("a", 56) + ".com",
		"idn":              "café.example",
		"punycode":         "xn--caf-dma.example",
		"cjk":              "你好世界.example",
		"zwj_emoji_family": "👨‍👩‍👧‍👦",
		"2kb_log_field":    strings.Repeat("error: connection reset ", 80),
	}
	for name, in := range inputs {
		t.Run(name, func(t *testing.T) {
			func() {
				defer func() {
					if r := recover(); r != nil {
						t.Errorf("Sanitize(%s) panicked: %v", name, r)
					}
				}()
				_ = Sanitize(in)
			}()
		})
	}
}

// TestSanitizeDeterministic is the sanitizer's own share of criterion 24: two runs of the same
// input are byte-identical. Sanitize takes no environment input at all, so this holds regardless
// of TZ, LANG, LC_CTYPE, TERM, or NO_COLOR.
func TestSanitizeDeterministic(t *testing.T) {
	for _, e := range loadHostileCorpus(t) {
		a, b := Sanitize(e.Input), Sanitize(e.Input)
		if a != b {
			t.Errorf("Sanitize(%q) not deterministic: %q vs %q", e.Input, a, b)
		}
	}
}
