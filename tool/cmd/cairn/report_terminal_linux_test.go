package main

import (
	"strings"
	"testing"
)

// TestTheSitesStatusBlockOnATerminalHasABlankLineBeforeItsTitle runs cairn sites with a
// pseudo-terminal behind stdout. Under a listing the credentials title follows one blank line;
// over an empty registry nothing precedes the block, so it opens on its title.
func TestTheSitesStatusBlockOnATerminalHasABlankLineBeforeItsTitle(t *testing.T) {
	for _, tc := range []struct {
		name   string
		listed bool
		want   string
	}{
		{"under a listing", true, "my-site.example.org\n\n  credentials\n"},
		{"over an empty registry", false, "  credentials\n"},
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
			if !tc.listed && !strings.HasPrefix(out, tc.want) {
				t.Errorf("stdout = %q, want it to open on the title", out)
			}
		})
	}
}
