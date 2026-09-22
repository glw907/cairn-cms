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
			return uncheckedResult("config.bindings", err.Error())
		}
		if !found {
			return skipResult("config.bindings", noWranglerFoundDetail)
		}
		var missing []string
		if !facts.HasEmailBinding {
			missing = append(missing, bindingEmailMissing)
		}
		if !facts.HasAuthDB {
			missing = append(missing, bindingAuthDBMissing)
		}
		if len(missing) > 0 {
			return failResult("config.bindings", spine.ConditionConfigBindingsMissing,
				fmt.Sprintf(tmplBindingsMissing, strings.Join(missing, " and ")))
		}
		return passResult("config.bindings", detailBindingsPresent)
	},
}

// labelFor returns id's registry title from the embedded condition mirror. A missing registry
// entry for a condition this package raises is a build-time defect, so it panics rather than
// returning an empty label a report would print silently.
func labelFor(id spine.Condition) string {
	text, ok := spine.TextFor(id)
	if !ok {
		panic(fmt.Sprintf("doctor: no registry entry for condition %q", id))
	}
	return text.Title
}

// severityFor returns id's registry severity, converted to spine's FailSeverity. Same
// build-time-defect stance as labelFor.
func severityFor(id spine.Condition) spine.FailSeverity {
	text, ok := spine.TextFor(id)
	if !ok {
		panic(fmt.Sprintf("doctor: no registry entry for condition %q", id))
	}
	return text.Severity
}

// Label returns c's registry-sourced label: its condition's title in the embedded mirror. A
// check with no condition (Condition: spine.ConditionNone) has no label of its own.
func (c Check) Label() string {
	return labelFor(c.Condition)
}

// passResult builds a StatusPass Result, the common case every check's own pass path shares.
func passResult(id, detail string) Result {
	return Result{ID: id, Status: StatusPass, Detail: detail}
}

// failResult builds a StatusFail Result, reading its severity from the registry rather than a
// literal so a check can never disagree with its own condition's declared severity.
func failResult(id string, condition spine.Condition, detail string) Result {
	return Result{ID: id, Condition: condition, Status: StatusFail, Severity: severityFor(condition), Detail: detail}
}

// skipResult builds a StatusSkip Result.
func skipResult(id, detail string) Result {
	return Result{ID: id, Status: StatusSkip, Detail: detail}
}

// uncheckedResult builds a StatusUnchecked Result: the check's precondition was not observable,
// a containment refusal or an absent required input among the causes.
func uncheckedResult(id, detail string) Result {
	return Result{ID: id, Status: StatusUnchecked, Detail: detail}
}
