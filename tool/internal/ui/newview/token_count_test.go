package newview

import (
	"strings"
	"testing"

	"github.com/charmbracelet/x/ansi"

	"github.com/glw907/cairn-cms/tool/v2/internal/setup"
)

// TestATokenRunCountsThreeApprovals holds that a run on a supplied Cloudflare token never asks
// for the Cloudflare request, so the welcome screen, the browser screen, and the window title
// count three, and a run on the sign-in still counts four.
func TestATokenRunCountsThreeApprovals(t *testing.T) {
	for _, tt := range []struct {
		name  string
		token bool
		count string
		title string
		first string
		gone  string
	}{
		{"sign-in", false, "four", "2 of 4", "Cloudflare: Allow", "three requests"},
		{"token", true, "three", "1 of 3", "GitHub: Create", "Cloudflare: Allow"},
	} {
		t.Run(tt.name, func(t *testing.T) {
			cfg := testConfig(true, oneTheme)
			cfg.Token = tt.token
			m := driven(cfg, 80, 24, func(*Model) {})
			welcome := ansi.Strip(m.View().Content)
			if !strings.Contains(welcome, "approve "+tt.count+" requests") {
				t.Errorf("welcome does not count %s:\n%s", tt.count, welcome)
			}
			send(m, OpenBrowserMsg{URL: tabURL})
			before := ansi.Strip(m.View().Content)
			if !strings.Contains(before, "these "+tt.count+" requests") || !strings.Contains(before, tt.first) || strings.Contains(before, tt.gone) {
				t.Errorf("browser screen before the tab:\n%s", before)
			}
			send(m, enter, waiting(setup.WaitCreateApp))
			title := m.windowTitle()
			if !strings.Contains(title, tt.title) {
				t.Errorf("window title = %q, want it to count %s", title, tt.title)
			}
		})
	}
}
