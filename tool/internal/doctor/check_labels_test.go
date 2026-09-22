package doctor

import (
	"testing"

	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// TestFiveConfigCheckLabelsMatchRegistryTitle asserts every one of the five config checks'
// Label() equals its own condition's title in the embedded registry mirror, read fresh through
// spine.TextFor rather than assumed. The registry's title differs from the TypeScript
// DoctorCheck's own "title" field for all five (e.g. config.bindings-missing's registry title is
// "Wrangler bindings are missing", not the TypeScript check's "Wrangler bindings"), so a Label
// written as either a literal or a copy of the TypeScript field fails this test.
func TestFiveConfigCheckLabelsMatchRegistryTitle(t *testing.T) {
	checks := []Check{
		ConfigBindings,
		ConfigObservability,
		ConfigPublicOrigin,
		ConfigSiteConfig,
		ConfigDependencyFloors,
	}
	for _, c := range checks {
		t.Run(c.ID, func(t *testing.T) {
			want, ok := spine.TextFor(c.Condition)
			if !ok {
				t.Fatalf("spine.TextFor(%q): no registry entry", c.Condition)
			}
			if got := c.Label(); got != want.Title {
				t.Errorf("Label() = %q, want the registry title %q", got, want.Title)
			}
		})
	}
}
