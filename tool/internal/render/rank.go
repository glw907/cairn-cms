package render

import (
	"cmp"
	"slices"

	"github.com/glw907/cairn-cms/tool/internal/health"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// The five severity classes, worst first, ranked by what a failure costs the operator rather
// than by the order the sweep happened to run its checks in. The ranking orders rows, orders
// sites, and orders the fix list, and it is the render's alone: the sweep returns in registry
// order and nothing upstream of Render re-orders.
//
// No label ever states this ordering. A ranked list reads as ranked, and the moment a heading
// claims "worst first" it has made a promise a later check id can break.
const (
	// classUnreachable is a site nobody can load: it is not serving, or its domain no longer
	// resolves into this zone.
	classUnreachable = 1
	// classPublish is a site that loads but cannot ship a change: the publish path or the
	// deploy is broken.
	classPublish = 2
	// classService is a service the site offers the public degrading: mail posture, edge HTTPS,
	// or an error rate above the run's threshold.
	classService = 3
	// classCredentials is this tool's own access expiring or failing, which costs the operator
	// visibility rather than costing a visitor anything.
	classCredentials = 4
	// classDrift is version drift: real, and never a reason to page anyone.
	classDrift = 5
)

// checkClasses places every 1.0 check id in its severity class.
//
// The five classes are named by the checks they cover; https-forced is placed in classService
// because an edge HTTPS setting degrades what the public gets rather than stopping the site
// from loading or from shipping.
var checkClasses = map[string]int{
	"serving":      classUnreachable,
	"delegation":   classUnreachable,
	"publish-path": classPublish,
	"deploy":       classPublish,
	"https-forced": classService,
	"email":        classService,
	"errors":       classService,
	"creds":        classCredentials,
	"engine":       classDrift,
}

// unclassedClass is the class a check id this table has not met falls into: above version
// drift, so a new check is never silently sorted last, and below the classes whose failures
// carry a run to CRITICAL, so a new check cannot page anyone before someone has ranked it.
const unclassedClass = classCredentials

// noFailureClass ranks a site with no live failure at all, beneath every class a failure can
// take, so a healthy site never sorts above a broken one.
const noFailureClass = classDrift + 1

// criticalClassFloor is the first class whose failure alone does not carry a run to CRITICAL.
// An expiring credential and a version bump are real and neither is worth waking anyone for.
const criticalClassFloor = classCredentials

// severityClass returns the class of the check named id.
func severityClass(id string) int {
	if c, found := checkClasses[id]; found {
		return c
	}
	return unclassedClass
}

// criticalFailure reports whether a failure of the check named id, on its own, carries the run
// to CRITICAL rather than WARNING. It is the one predicate behind the two-severity fail mark, so
// a row's mark can never disagree with the verdict its own severity produced.
func criticalFailure(id string) bool {
	return severityClass(id) < criticalClassFloor
}

// compareResults is the one ordering key: severity class first, then spine.State.Severity
// descending so a failure outranks an unobservable check inside a class, then the check id, so
// a tie is broken by something stable rather than by sort stability.
func compareResults(a, b health.CheckResult) int {
	return cmp.Or(
		cmp.Compare(severityClass(a.ID), severityClass(b.ID)),
		cmp.Compare(b.Outcome.State.Severity(), a.Outcome.State.Severity()),
		cmp.Compare(a.ID, b.ID),
	)
}

// rankResults returns rs ordered worst first by compareResults. The sort is stable, so two
// results the key cannot separate keep the order the sweep produced them in.
func rankResults(rs []health.CheckResult) []health.CheckResult {
	out := slices.Clone(rs)
	slices.SortStableFunc(out, compareResults)
	return out
}

// worstClass returns the severity class of r's worst live failure, or noFailureClass when r
// carries none. A held failure is not a live one: a hold is the operator saying they have
// weighed it, so it must not rank the site above one nobody has looked at.
func worstClass(r health.Report) int {
	worst := noFailureClass
	for _, c := range r.Checks {
		if c.Outcome.State != spine.Failing || c.Acknowledged {
			continue
		}
		worst = min(worst, severityClass(c.ID))
	}
	return worst
}

// rankReports returns rs ordered worst first by worst live failure. The sort is stable, so two
// sites whose worst failures share a class stay in the order the registry listed them, which is
// the tie-break the multi-site body reads.
func rankReports(rs []health.Report) []health.Report {
	out := slices.Clone(rs)
	slices.SortStableFunc(out, func(a, b health.Report) int {
		return cmp.Compare(worstClass(a), worstClass(b))
	})
	return out
}
