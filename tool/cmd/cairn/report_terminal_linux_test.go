package main

import (
	"strings"
	"testing"
)

// TestTheSitesStatusBlockOnATerminalHasABlankLineBeforeItsTitle runs cairn sites with a
// pseudo-terminal behind stdout. The credentials title follows one blank line, whether the
// sites table or the bare sites title is what comes before it.
func TestTheSitesStatusBlockOnATerminalHasABlankLineBeforeItsTitle(t *testing.T) {
	for _, tc := range []struct {
		name   string
		listed bool
		want   string
	}{
		{"under a listing", true, "my-site.example.org\n\n  credentials\n"},
		{"over an empty registry", false, "registry\n\n  credentials\n"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			d, _ := testDeps(t)
			d.stdout = openPTY(t)
			if tc.listed {
				writeTestRecord(t, d, "my-site-a1b2c3", "my-site.example.org", "my-site")
			}
			out, _, err := execTree(t, d, "sites", "--color", "never")
			if err != nil {
				t.Fatalf("sites: %v", err)
			}
			if tc.listed && !strings.Contains(out, tc.want) {
				t.Errorf("stdout = %q, want the listing, a blank line, and the title", out)
			}
			if !tc.listed && !strings.Contains(out, tc.want) {
				t.Errorf("stdout = %q, want the sites title, a blank line, and the credentials title", out)
			}
		})
	}
}

// TestATerminalNoticeSitsAtCell2AndIsFollowedByABlankLine runs the two implicitly verbose
// commands with a pseudo-terminal behind both streams, at a width that wraps the paste notice.
// Every line of it starts at cell 2, the frame's margin, and one blank line parts it from what
// follows.
func TestATerminalNoticeSitsAtCell2AndIsFollowedByABlankLine(t *testing.T) {
	for _, args := range [][]string{
		{"logs", "my-site-a1b2c3"},
		{"adopt", "list", "--json=false"},
	} {
		t.Run(args[0], func(t *testing.T) {
			d, _ := testDeps(t)
			d.stdout, d.stderr = openPTY(t), openPTY(t)
			writeTestRecord(t, d, "my-site-a1b2c3", "my-site.example.org", "my-site")
			_, stderr, _ := execTree(t, d, append(args, "--color", "never", "--width", "59")...)

			lines := strings.Split(strings.TrimSuffix(stderr, "\n"), "\n")
			if len(lines) != 3 {
				t.Fatalf("stderr = %q, want the notice on two lines and a blank line", stderr)
			}
			for _, l := range lines[:2] {
				if !strings.HasPrefix(l, "  ") || l[2] == ' ' {
					t.Errorf("notice line %q does not start at cell 2", l)
				}
			}
			if got := strings.Join(strings.Fields(strings.Join(lines[:2], " ")), " "); got != pasteNotice {
				t.Errorf("notice reads %q, want %q", got, pasteNotice)
			}
			if lines[2] != "" {
				t.Errorf("the notice is followed by %q, want a blank line", lines[2])
			}
		})
	}
}
