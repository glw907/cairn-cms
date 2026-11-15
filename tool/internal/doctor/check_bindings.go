package doctor

import (
	"fmt"
	"strings"

	"github.com/glw907/cairn-cms/tool/v2/internal/spine"
)

// noWranglerFoundDetail is the skip detail shared by every check that reads WranglerFacts:
// neither wrangler.jsonc nor wrangler.toml exists, so the check has nothing to judge.
const noWranglerFoundDetail = "no wrangler.jsonc or wrangler.toml found"

const (
	// bindingEmailMissing names the send_email binding config.bindings looks for.
	bindingEmailMissing = "EMAIL (send_email)"
	// bindingAuthDBMissing names the d1_databases binding config.bindings looks for.
	bindingAuthDBMissing = "AUTH_DB (d1_databases)"
	// detailBindingsPresent is config.bindings's pass detail.
	detailBindingsPresent = "EMAIL and AUTH_DB are declared"
	// tmplBindingsMissing is config.bindings's fail detail template, filled with the joined
	// list of missing binding names.
	tmplBindingsMissing = "missing %s"
)

// configBindings checks that the wrangler config declares both the EMAIL and AUTH_DB bindings.
var configBindings = Check{
	ID:        "config.bindings",
	PassTitle: "Wrangler bindings are declared",
	SkipTitle: "Wrangler bindings",
	Condition: spine.ConditionConfigBindingsMissing,
	Run: func(s Snapshot) Result {
		return withWrangler(s, func(facts WranglerFacts) Result {
			var missing []string
			if !facts.HasEmailBinding {
				missing = append(missing, bindingEmailMissing)
			}
			if !facts.HasAuthDB {
				missing = append(missing, bindingAuthDBMissing)
			}
			if len(missing) > 0 {
				return failResult(fmt.Sprintf(tmplBindingsMissing, strings.Join(missing, " and ")))
			}
			return passResult(detailBindingsPresent)
		})
	},
}
