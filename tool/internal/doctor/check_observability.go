package doctor

import "github.com/glw907/cairn-cms/tool/v2/internal/spine"

const (
	// detailObservabilityOff is config.observability's fail detail.
	detailObservabilityOff = "observability.enabled is not true"
	// detailObservabilityOn is config.observability's pass detail.
	detailObservabilityOn = "observability.enabled is true"
)

// configObservability checks that observability.enabled is true in wrangler.jsonc or
// wrangler.toml.
var configObservability = Check{
	ID:        "config.observability",
	PassTitle: "Workers Logs has a sink",
	SkipTitle: "Workers Logs sink",
	Condition: spine.ConditionConfigObservabilityOff,
	run: func(s Snapshot) Result {
		return withWrangler(s, func(facts WranglerFacts) Result {
			if !facts.ObservabilityEnabled {
				return failResult(detailObservabilityOff)
			}
			return passResult(detailObservabilityOn)
		})
	},
}
