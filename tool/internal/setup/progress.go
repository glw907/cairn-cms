package setup

import (
	"slices"

	"github.com/glw907/cairn-cms/tool/v2/internal/spine"
)

// progress is the order of the record steps a setup run writes, each one written when the work
// before it is done. A resume starts at the first piece of work past the record's step.
var progress = []spine.Step{
	spine.StepSetupStarted,
	spine.StepAppCreated,
	spine.StepRepoCreated,
	spine.StepInstalled,
	spine.StepScaffolded,
	spine.StepResourcesCreated,
	spine.StepCommitted,
	spine.StepDeployKeyStored,
	spine.StepPushed,
	spine.StepDeployed,
	spine.StepDomainLive,
	spine.StepLive,
}

// reached reports whether the record step step is s or later in setup's order. A step setup
// never writes reaches nothing.
func reached(step string, s spine.Step) bool {
	i := slices.Index(progress, spine.Step(step))
	return i >= 0 && i >= slices.Index(progress, s)
}
