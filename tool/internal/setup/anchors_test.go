package setup

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
	"unicode"
)

// startPage is the page the opening checks' anchors point into, relative to the repository root.
var startPage = filepath.Join("docs", "admin", "before-you-start.md")

// headingSlug is GitHub's heading anchor for a heading's text: lowercase, spaces to hyphens, and
// every character that is not a letter, a digit, a space, or a hyphen dropped.
func headingSlug(heading string) string {
	var b strings.Builder
	for _, r := range strings.ToLower(heading) {
		switch {
		case r == ' ':
			b.WriteRune('-')
		case unicode.IsLetter(r) || unicode.IsDigit(r) || r == '-':
			b.WriteRune(r)
		}
	}
	return b.String()
}

// pageSlugs returns the slug of every heading in the Markdown page at path, ignoring the lines
// inside a fenced block. A repeated heading gets GitHub's -1, -2 suffix.
func pageSlugs(t *testing.T, path string) map[string]bool {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	heading := regexp.MustCompile(`^#{1,6}\s+(.+?)\s*#*$`)
	seen := map[string]int{}
	slugs := map[string]bool{}
	fenced := false
	for line := range strings.SplitSeq(string(data), "\n") {
		if strings.HasPrefix(line, "```") {
			fenced = !fenced
			continue
		}
		m := heading.FindStringSubmatch(line)
		if fenced || m == nil {
			continue
		}
		slug := headingSlug(m[1])
		if n := seen[slug]; n > 0 {
			slugs[slug+"-"+string(rune('0'+n))] = true
		} else {
			slugs[slug] = true
		}
		seen[slug]++
	}
	return slugs
}

// repoFile finds rel by walking up from the test's directory to the first directory that holds
// it, which is the repository root.
func repoFile(t *testing.T, rel string) string {
	t.Helper()
	dir, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	for {
		path := filepath.Join(dir, rel)
		if _, err := os.Stat(path); err == nil {
			return path
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			t.Fatalf("no %s above the test's directory", rel)
		}
		dir = parent
	}
}

func TestEveryAnchorResolvesOnTheStartPage(t *testing.T) {
	slugs := pageSlugs(t, repoFile(t, startPage))
	checked := 0
	for reason, e := range entries {
		if e.Anchor == "" {
			continue
		}
		checked++
		frag, ok := strings.CutPrefix(e.Anchor, "#")
		if !ok || !slugs[frag] {
			t.Errorf("%s anchor %q matches no heading in %s", reason, e.Anchor, startPage)
		}
	}
	if checked == 0 {
		t.Fatal("no entry carries an anchor")
	}
}
