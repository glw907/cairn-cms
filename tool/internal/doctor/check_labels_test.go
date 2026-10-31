package doctor

import (
	"testing"

	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// TestEveryCheckDeclaresAPassTitle asserts a PASS line never falls back to the registry title,
// which names the failure ("Wrangler bindings are missing") and would print beside PASS.
func TestEveryCheckDeclaresAPassTitle(t *testing.T) {
	for _, c := range checks {
		t.Run(c.ID, func(t *testing.T) {
			if c.PassTitle == "" {
				t.Fatalf("check %q declares no PassTitle", c.ID)
			}
			if got := c.lineTitle(StatusPass); got != c.PassTitle {
				t.Errorf("lineTitle(StatusPass) = %q, want %q", got, c.PassTitle)
			}
			if got := c.lineTitle(StatusFail); got != c.label() {
				t.Errorf("lineTitle(StatusFail) = %q, want the registry title %q", got, c.label())
			}
		})
	}
}

// TestFiveConfigCheckLabelsMatchRegistryTitle asserts every one of the eight checks landed so far,
// five config checks plus the three heuristic checks, has a label() equal to its condition's
// title in the embedded registry mirror, read fresh through spine.TextFor rather than assumed. A
// label written as a literal, or as a short name such as "Wrangler bindings" where the registry
// title is "Wrangler bindings are missing", fails this test.
func TestFiveConfigCheckLabelsMatchRegistryTitle(t *testing.T) {
	checks := []Check{
		configBindings,
		configObservability,
		configPublicOrigin,
		configSiteConfig,
		configDependencyFloors,
		configCsrfTrustedOrigins,
		configNoReferrerBlanket,
		adminMountShape,
	}
	for _, c := range checks {
		t.Run(c.ID, func(t *testing.T) {
			want, ok := spine.TextFor(c.Condition)
			if !ok {
				t.Fatalf("spine.TextFor(%q): no registry entry", c.Condition)
			}
			if got := c.label(); got != want.Title {
				t.Errorf("label() = %q, want the registry title %q", got, want.Title)
			}
		})
	}
}
