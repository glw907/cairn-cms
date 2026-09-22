package main

import (
	"regexp"
	"strconv"
	"strings"
	"testing"

	"github.com/glw907/cairn-cms/tool/internal/spine"
	"github.com/glw907/cairn-cms/tool/internal/version"
)

// The three published contract pages, by their path from the repository root. They live in the
// engine's own reference arm rather than under tool/, so the npm tarball carries them to every
// consumer, and a scripter reading one is reading the same file this module is held to.
const (
	exitCodesPage  = "docs/reference/cli-cairn-exit-codes.md"
	jsonOutputPage = "docs/reference/cli-cairn-json-output.md"
	doctorPage     = "docs/reference/cli-cairn-doctor.md"
)

// exitCodeRow matches one row of the exit-codes page's own code table: a decimal code, then the
// word in backticks. The requests-per-check table on the same page does not match, since its
// first cell is a backticked check id rather than a number.
var exitCodeRow = regexp.MustCompile("(?m)^\\| (\\d+) \\| `([A-Z]+)` \\|")

// namedVerdicts returns every verdict spine names, walking codes upward from zero until one
// reports Verdict.String's fallback form. The set is derived rather than retyped here, so a
// fifth verdict added to spine reaches this test with no edit to it.
func namedVerdicts() []spine.Verdict {
	var out []spine.Verdict
	for code := 0; ; code++ {
		v := spine.Verdict(code)
		if strings.HasPrefix(v.String(), "Verdict(") {
			return out
		}
		out = append(out, v)
	}
}

// TestTheExitCodeTablePublishesEveryVerdict holds the exit-codes page's code table to spine's
// own verdicts: a code the page omits, a code it carries that spine does not name, and a code
// paired with the wrong word each fail here. The table is the one thing a caller branches on
// without running the tool, so a page that disagrees with the binary is worse than no page.
func TestTheExitCodeTablePublishesEveryVerdict(t *testing.T) {
	published := map[string]string{}
	for _, row := range exitCodeRow.FindAllStringSubmatch(readRepoFile(t, exitCodesPage), -1) {
		code, word := row[1], row[2]
		if first, seen := published[code]; seen {
			t.Errorf("%s publishes exit code %s twice, as %q and %q", exitCodesPage, code, first, word)
		}
		published[code] = word
	}
	if len(published) == 0 {
		t.Fatalf("%s publishes no exit-code table", exitCodesPage)
	}

	for _, v := range namedVerdicts() {
		code := strconv.Itoa(int(v))
		word, ok := published[code]
		if !ok {
			t.Errorf("%s publishes no row for exit code %s, which spine words %q", exitCodesPage, code, v)
			continue
		}
		if word != v.String() {
			t.Errorf("%s pairs exit code %s with %q; spine words it %q", exitCodesPage, code, word, v)
		}
		delete(published, code)
	}
	for code, word := range published {
		t.Errorf("%s publishes exit code %s as %q, which spine does not name", exitCodesPage, code, word)
	}
}

// TestThePagesDescribeTheDocumentedRelease holds each contract page's opening paragraph to
// version.Documented, so a release that changes what the pages describe cannot ship with one of
// them still naming the release before it.
func TestThePagesDescribeTheDocumentedRelease(t *testing.T) {
	for _, rel := range []string{exitCodesPage, jsonOutputPage, doctorPage} {
		t.Run(rel, func(t *testing.T) {
			lede := pageLede(t, rel, readRepoFile(t, rel))
			if !strings.Contains(lede, version.Documented) {
				t.Errorf("%s opens with %q, which does not name the documented release %s",
					rel, lede, version.Documented)
			}
		})
	}
}

// pageLede returns the paragraph a page opens with under its own title, the paragraph each of
// these three states its release in.
func pageLede(t *testing.T, rel, body string) string {
	t.Helper()
	blocks := strings.SplitN(strings.ReplaceAll(body, "\r\n", "\n"), "\n\n", 3)
	if len(blocks) < 2 {
		t.Fatalf("%s carries no paragraph under its title", rel)
	}
	return strings.TrimSpace(blocks[1])
}
