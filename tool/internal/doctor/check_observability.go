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
			return uncheckedResult(err.Error())
		}
		if !found {
			return skipResult(noWranglerFoundDetail)
		}
		if !facts.ObservabilityEnabled {
			return failResult(spine.ConditionConfigObservabilityOff, detailObservabilityOff)
		}
		return passResult(detailObservabilityOn)
	},
}
