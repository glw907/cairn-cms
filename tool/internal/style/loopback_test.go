package style

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

// loopbackTints are the loopback pages' own non-role colours: the violet tints and white.
var loopbackTints = []string{"#1b1430", "#2b2537", "#5f4f94", "#b9a3ec", "#f3eefc", "#ffffff"}

// loopbackGrounds are the two page grounds, which no role carries.
var loopbackGrounds = []string{"#221f1a", "#fdfbf9"}

// pageHex matches a 3, 4, 6, or 8 digit hex colour; any other run of hex digits after a hash,
// such as an id selector, is not a colour and does not match.
var pageHex = regexp.MustCompile(`#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b`)

func TestLoopbackPages(t *testing.T) {
	allowed := map[string]bool{}
	for _, h := range append(loopbackTints, loopbackGrounds...) {
		allowed[h] = true
	}
	for _, v := range warmStone {
		allowed[strings.ToLower(v.lightHex)] = true
		allowed[strings.ToLower(v.darkHex)] = true
	}
	pages, err := filepath.Glob(filepath.Join("..", "setup", "loopback", "pages", "*.html"))
	if err != nil || len(pages) == 0 {
		t.Fatalf("no loopback pages found: %v", err)
	}
	for _, page := range pages {
		src, err := os.ReadFile(page)
		if err != nil {
			t.Fatal(err)
		}
		for _, h := range pageHex.FindAllString(string(src), -1) {
			if !allowed[strings.ToLower(h)] {
				t.Errorf("%s: colour %s is outside the role table, the grounds, and the tints", filepath.Base(page), h)
			}
		}
	}
}
