package doctor

import (
	"testing"

	"github.com/glw907/cairn-cms/tool/v2/internal/spine"
)

// TestEveryCheckDeclaresAPassTitle asserts a PASS line never falls back to the registry title,
// which names the failure ("Wrangler bindings are missing") and would print beside PASS.
func TestEveryCheckDeclaresAPassTitle(t *testing.T) {
	for _, c := range checks {
		t.Run(c.ID, func(t *testing.T) {
			if c.PassTitle == "" {
				t.Fatalf("check %q declares no PassTitle", c.ID)
			}
			if got := c.Title(StatusPass); got != c.PassTitle {
				t.Errorf("Title(StatusPass) = %q, want %q", got, c.PassTitle)
			}
			if got := c.Title(StatusFail); got != c.label() {
				t.Errorf("Title(StatusFail) = %q, want the registry title %q", got, c.label())
			}
		})
	}
}

// TestEveryCheckDeclaresASkipTitle asserts a SKIP line prints a neutral subject, never the
// registry title, which names a failure.
func TestEveryCheckDeclaresASkipTitle(t *testing.T) {
	for _, c := range checks {
		t.Run(c.ID, func(t *testing.T) {
			if c.SkipTitle == "" {
				t.Fatalf("check %q declares no SkipTitle", c.ID)
			}
			if got := c.Title(StatusSkip); got != c.SkipTitle {
				t.Errorf("Title(StatusSkip) = %q, want %q", got, c.SkipTitle)
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

// TestConditionNoneCheckCarriesItsOwnText asserts a check that raises no registry condition
// supplies the whole failure text itself, since text() has no registry entry to fall back on: a
// title, a why, a fix, a docs anchor, and the severity its failure raises.
func TestConditionNoneCheckCarriesItsOwnText(t *testing.T) {
	for _, c := range checks {
		if c.Condition != spine.ConditionNone {
			continue
		}
		t.Run(c.ID, func(t *testing.T) {
			text := c.text()
			if text.Title == "" || text.Why == "" || text.Remediation == "" || text.DocsAnchor == "" {
				t.Errorf("text() = %+v, want a title, why, fix, and docs anchor", text)
			}
			if got := c.label(); got != text.Title {
				t.Errorf("label() = %q, want its own title %q", got, text.Title)
			}
			if got := c.Title(StatusFail); got != text.Title {
				t.Errorf("Title(StatusFail) = %q, want %q", got, text.Title)
			}
		})
	}
	if configSiteRecord.text().Severity != spine.CriticalFailure {
		t.Errorf("config.site-record severity = %v, want spine.CriticalFailure", configSiteRecord.text().Severity)
	}
}
