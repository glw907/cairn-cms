package doctor

import (
	"testing"

	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// TestFiveConfigCheckLabelsMatchRegistryTitle asserts every one of the eight checks landed so far,
// five config checks plus the three heuristic checks, has a label() equal to its own condition's
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
