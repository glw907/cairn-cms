package doctor

import "github.com/glw907/cairn-cms/tool/internal/spine"

const (
	// detailObservabilityOff is config.observability's fail detail.
	detailObservabilityOff = "observability.enabled is not true"
	// detailObservabilityOn is config.observability's pass detail.
	detailObservabilityOn = "observability.enabled is true"
)

// ConfigObservability ports checks-local.ts's configObservability (:60-72): observability.enabled
// is true in wrangler.jsonc or wrangler.toml.
var ConfigObservability = Check{
	ID:        "config.observability",
	Condition: spine.ConditionConfigObservabilityOff,
	Run: func(s Snapshot) Result {
		facts, found, err := ReadWranglerConfig(s)
		if err != nil {
			return uncheckedResult("config.observability", err.Error())
		}
		if !found {
			return skipResult("config.observability", noWranglerFoundDetail)
		}
		if !facts.ObservabilityEnabled {
			return failResult("config.observability", spine.ConditionConfigObservabilityOff, detailObservabilityOff)
		}
		return passResult("config.observability", detailObservabilityOn)
	},
}
