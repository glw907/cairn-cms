package doctor

import (
	"fmt"
	"strings"

	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// noWranglerFoundDetail is the skip detail shared by every check that reads WranglerFacts:
// neither wrangler.jsonc nor wrangler.toml exists, so the check has nothing to judge.
const noWranglerFoundDetail = "no wrangler.jsonc or wrangler.toml found"

const (
	// bindingEmailMissing names the send_email binding config.bindings looks for, ported
	// verbatim from checks-local.ts's own missing-list entry.
	bindingEmailMissing = "EMAIL (send_email)"
	// bindingAuthDBMissing names the d1_databases binding config.bindings looks for.
	bindingAuthDBMissing = "AUTH_DB (d1_databases)"
	// detailBindingsPresent is config.bindings's pass detail.
	detailBindingsPresent = "EMAIL and AUTH_DB are declared"
	// tmplBindingsMissing is config.bindings's fail detail template, filled with the joined
	// list of missing binding names.
	tmplBindingsMissing = "missing %s"
)

// ConfigBindings ports checks-local.ts's configBindings (:23-36): the wrangler EMAIL and
// AUTH_DB bindings both declared.
var ConfigBindings = Check{
	ID:        "config.bindings",
	Condition: spine.ConditionConfigBindingsMissing,
	Run: func(s Snapshot) Result {
		facts, found, err := ReadWranglerConfig(s)
		if err != nil {
			return uncheckedResult(err.Error())
		}
		if !found {
			return skipResult(noWranglerFoundDetail)
		}
		var missing []string
		if !facts.HasEmailBinding {
			missing = append(missing, bindingEmailMissing)
		}
		if !facts.HasAuthDB {
			missing = append(missing, bindingAuthDBMissing)
		}
		if len(missing) > 0 {
			return failResult(spine.ConditionConfigBindingsMissing,
				fmt.Sprintf(tmplBindingsMissing, strings.Join(missing, " and ")))
		}
		return passResult(detailBindingsPresent)
	},
}
