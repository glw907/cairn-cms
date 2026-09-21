// Package fixtures holds the health reports render's own tests and goldens are cut from: one
// named constructor per scenario, never a JSON file, so a change to health.Report's shape fails
// the build rather than silently rotting a golden into a lie.
//
// The scenarios are the corpus both halves of the render work share. A fixture's numbers and
// prose are the ones tool/docs/design/render-reference's own frames were drawn from, so a frame
// cut here can be read beside the reference captures.
package fixtures

import (
	"encoding/json"
	"slices"
	"strings"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/health"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// Now is the render clock every fixture is built against, a fixed instant in a non-UTC zone so a
// golden proves the zone offset is carried from the value rather than read from the machine.
func Now() time.Time {
	return time.Date(2026, 9, 20, 14, 32, 0, 0, time.FixedZone("AKDT", -8*3600))
}

// checkedAt is the instant every fixture's checks settled, the clock health.Run hands each one.
func checkedAt() time.Time {
	return Now().Add(-4 * time.Minute)
}

// pass returns a passing check result.
func pass(id, detail string) health.CheckResult {
	return result(id, spine.Outcome{State: spine.OK, Detail: detail})
}

// fail returns a failing check result carrying a tool-owned code.
func fail(id string, code spine.Code, detail string) health.CheckResult {
	return result(id, spine.Outcome{State: spine.Failing, Code: code, Detail: detail})
}

// failCondition returns a failing check result carrying an engine condition id.
func failCondition(id string, cond spine.Condition, detail string) health.CheckResult {
	return result(id, spine.Outcome{State: spine.Failing, Condition: cond, Detail: detail})
}

// skipCondition returns a check that could not run and that still declares a condition id, the
// one shape where an id rides a skip: the Worker has no observability dataset, which is a
// setting the operator can change even though nothing was measured.
func skipCondition(id string, cond spine.Condition, detail string) health.CheckResult {
	return result(id, spine.Outcome{State: spine.Unknown, Reason: spine.ReasonNotObservable, Condition: cond, Detail: detail})
}

// skip returns a check that could not run.
func skip(id string, reason spine.ReasonCode, detail string) health.CheckResult {
	return result(id, spine.Outcome{State: spine.Unknown, Reason: reason, Detail: detail})
}

// withEngineVersion attaches the installed engine version to c as the structured field the
// engine check itself reports, so a fixture's engine row carries the fact the fleet table's
// engine column reads rather than only the prose detail beside it.
func withEngineVersion(c health.CheckResult, installed string) health.CheckResult {
	data, err := json.Marshal(installed)
	if err != nil {
		panic(err)
	}
	c.Outcome.Fields = append(c.Outcome.Fields,
		spine.OutcomeField{Key: health.FieldEngineInstalledVersion, Value: data, Source: spine.SourceGitHub})
	return c
}

// result wraps one outcome in the settled result health.Run would have produced for it.
func result(id string, o spine.Outcome) health.CheckResult {
	return health.CheckResult{ID: id, Outcome: o, CheckedAt: checkedAt()}
}

// heldUntil returns c with an unexpired hold covering it.
func heldUntil(c health.CheckResult, expires time.Time) health.CheckResult {
	c.Acknowledged = true
	c.AckExpires = expires
	return c
}

// holdLapsed returns c carrying a hold that has already expired, which holds nothing.
func holdLapsed(c health.CheckResult, expired time.Time) health.CheckResult {
	c.AckExpires = expired
	return c
}

// nineCheckIDs is health.All's own nine check ids, in report order, the set fillNine completes
// every site to.
var nineCheckIDs = []string{"creds", "serving", "delegation", "https-forced", "email", "deploy", "publish-path", "engine", "errors"}

// fillNine returns checks completed to all nine of health.All's ids: any id checks already names
// is kept exactly as given, and any id it omits is filled with a plausible default, so a strip
// golden built from it never falls back to the separator glyph for a check the scenario simply
// did not bother to script. email and errors, the two ids the shared CAIRN_CF_READ_TOKEN gap
// this package's callers pair with disables, are filled with the same missing-credential skip
// every other fixture already shows on those ids; every other omitted id is filled with a pass.
func fillNine(checks ...health.CheckResult) []health.CheckResult {
	have := make(map[string]bool, len(checks))
	for _, c := range checks {
		have[c.ID] = true
	}
	out := slices.Clone(checks)
	for _, id := range nineCheckIDs {
		if have[id] {
			continue
		}
		out = append(out, fillDefault(id))
	}
	return out
}

// fillDefault returns fillNine's own default result for one omitted check id.
func fillDefault(id string) health.CheckResult {
	switch id {
	case "email", "errors":
		return skip(id, spine.ReasonCredMissing, "")
	case "creds":
		return pass(id, "Cloudflare and GitHub tokens read from the keyring")
	case "delegation":
		return pass(id, "nameservers match the zone")
	case "https-forced":
		return pass(id, "forced at the edge, HSTS 1 year")
	case "deploy":
		return pass(id, "built 4h ago (a91f2c7), main is level")
	case "publish-path":
		return pass(id, "App installed, branch writable")
	case "engine":
		return withEngineVersion(pass(id, "0.78.0 is current"), "0.78.0")
	default:
		return pass(id, "")
	}
}

// report assembles one site's settled report.
func report(site, domain string, checks ...health.CheckResult) health.Report {
	r := health.Report{SchemaVersion: 1, Site: site, Domain: domain, Checks: checks}
	for _, c := range checks {
		if c.Outcome.Reason == spine.ReasonCredMissing {
			r.Degraded = true
		}
		if c.Acknowledged {
			r.Acknowledged = append(r.Acknowledged, c.ID)
		}
	}
	return r
}

// Empty is a run that reached no site at all, which is what an empty registry produces.
func Empty() []health.Report {
	return nil
}

// AllUnknown is a site whose every check could not run, the shape a run with no credentials and
// an unreachable host takes. Nothing was measured, so nothing may be reported green.
func AllUnknown() []health.Report {
	return []health.Report{report("topo.907.life", "topo.907.life",
		skip("creds", spine.ReasonCredMissing, ""),
		skip("serving", spine.ReasonTimeout, "the site did not answer"),
		skip("delegation", spine.ReasonCredMissing, ""),
		skip("https-forced", spine.ReasonCredMissing, ""),
		skip("email", spine.ReasonCredMissing, ""),
		skip("deploy", spine.ReasonCredMissing, ""),
		skip("publish-path", spine.ReasonCredMissing, ""),
		skip("engine", spine.ReasonNotObservable, "the installed or latest version is not in the published version list"),
		skip("errors", spine.ReasonCredMissing, ""),
	)}
}

// Degraded is a run missing one provider credential: the checks that needed it could not run,
// and the rest are honest measurements.
func Degraded() []health.Report {
	return []health.Report{report("ecxc.ski", "ecxc.ski",
		fail("creds", spine.CodeCredsUnauthorized, "the token was rejected"),
		pass("serving", "200 in 84ms"),
		pass("delegation", "nameservers match the zone"),
		skip("https-forced", spine.ReasonCredMissing, ""),
		skip("email", spine.ReasonCredMissing, ""),
		pass("deploy", "built 4h ago (a91f2c7), main is level"),
		pass("publish-path", "App installed, branch writable"),
		withEngineVersion(pass("engine", "0.78.0 is current"), "0.78.0"),
		skip("errors", spine.ReasonCredMissing, ""),
	)}
}

// Offline is a run that could reach nothing at all: every check that needed the network is
// unobservable, and the credential check is the only one that settled.
func Offline() []health.Report {
	return []health.Report{report("907.life", "907.life",
		skip("creds", spine.ReasonOffline, ""),
		skip("serving", spine.ReasonOffline, ""),
		skip("delegation", spine.ReasonOffline, ""),
		skip("https-forced", spine.ReasonOffline, ""),
		skip("email", spine.ReasonOffline, ""),
		skip("deploy", spine.ReasonOffline, ""),
		skip("publish-path", spine.ReasonOffline, ""),
		skip("engine", spine.ReasonOffline, ""),
		skip("errors", spine.ReasonOffline, ""),
	)}
}

// OneSick is the reference's scenario 2: three failures, two checks that could not run, one held
// failure, and three passes on one site.
func OneSick() []health.Report {
	return []health.Report{report("907.life", "907.life",
		fail("creds", spine.CodeCredsUnauthorized, "Cloudflare token not found; GitHub token read from the keyring"),
		pass("serving", "200 in 132ms"),
		pass("delegation", "nameservers match the zone"),
		heldUntil(
			failCondition("https-forced", spine.ConditionEdgeHTTPSNotForced, "Always Use HTTPS is off for the zone"),
			Now().Add(5*24*time.Hour)),
		skip("email", spine.ReasonCredMissing, ""),
		fail("deploy", spine.CodeDeployBuildFailed, "build failed 26m ago (3f0ba18), main is 2 commits ahead"),
		pass("publish-path", "App installed, branch writable"),
		withEngineVersion(fail("engine", spine.CodeEngineBehind, "0.71.0 installed, 0.78.0 latest, 7 releases behind"), "0.71.0"),
		skip("errors", spine.ReasonCredMissing, ""),
	)}
}

// Healthy is the one scenario that can afford to show its work: every check passed.
func Healthy() []health.Report {
	return []health.Report{report("ecxc.ski", "ecxc.ski",
		pass("creds", "Cloudflare and GitHub tokens read from the keyring"),
		pass("serving", "200 in 84ms"),
		pass("delegation", "nameservers match the zone"),
		pass("https-forced", "forced at the edge, HSTS 1 year"),
		pass("email", "sending domain onboarded 41 days ago"),
		pass("deploy", "built 4h ago (a91f2c7), main is level"),
		pass("publish-path", "App installed, branch writable"),
		withEngineVersion(pass("engine", "0.78.0 is current"), "0.78.0"),
		pass("errors", "0 errors in 24h"),
	)}
}

// WarningOnly is a site whose only failures are version drift and a Worker that logs nowhere:
// real, and neither a reason to page anyone, so both take the outlined fail mark.
func WarningOnly() []health.Report {
	return []health.Report{report("cairn.pub", "cairn.pub",
		pass("creds", "Cloudflare and GitHub tokens read from the keyring"),
		pass("serving", "200 in 96ms"),
		pass("delegation", "nameservers match the zone"),
		pass("https-forced", "forced at the edge, HSTS 1 year"),
		pass("email", "sending domain onboarded 41 days ago"),
		pass("deploy", "built 9h ago (5c1d0b2), main is level"),
		pass("publish-path", "App installed, branch writable"),
		withEngineVersion(fail("engine", spine.CodeEngineBehind, "0.76.0 installed, 0.78.0 latest, 2 releases behind"), "0.76.0"),
		skipCondition("errors", spine.ConditionConfigObservabilityOff, "the Worker has no observability dataset"),
	)}
}

// TwelveSites is a registry large enough that ranking is the only thing that makes the run
// readable: one site nobody can load, several with one fault each, and the rest passing. Every
// site carries all nine checks (fillNine), the shape one sweep over a real registry produces:
// one set of provider tokens covers every site in it, so a missing CAIRN_CF_READ_TOKEN disables
// email and errors everywhere, not only on the site a scenario names it for.
func TwelveSites() []health.Report {
	out := []health.Report{
		report("ecxc.ski", "ecxc.ski", fillNine(
			pass("serving", "200 in 84ms"), withEngineVersion(pass("engine", "0.78.0 is current"), "0.78.0"))...),
		report("cairn.pub", "cairn.pub", fillNine(
			pass("serving", "200 in 96ms"),
			withEngineVersion(fail("engine", spine.CodeEngineBehind, "0.76.0 installed, 0.78.0 latest, 2 releases behind"), "0.76.0"))...),
		report("topo.907.life", "topo.907.life", fillNine(
			fail("serving", spine.CodeServingMismatch, "the hostname does not answer"),
			skip("engine", spine.ReasonCredMissing, ""))...),
		report("907.life", "907.life", fillNine(
			pass("serving", "200 in 132ms"),
			fail("deploy", spine.CodeDeployBuildFailed, "build failed 26m ago (3f0ba18), main is 2 commits ahead"))...),
		report("aksailingclub.org", "aksailingclub.org", fillNine(
			pass("serving", "200 in 210ms"),
			failCondition("email", spine.ConditionEmailSenderNotOnboarded, "the sending subdomain is not onboarded"))...),
		report("xcathletes.org", "xcathletes.org", fillNine(
			pass("serving", "200 in 121ms"),
			withEngineVersion(fail("engine", spine.CodeEngineBehind, "0.77.0 installed, 0.78.0 latest, 1 release behind"), "0.77.0"))...),
	}
	for _, name := range []string{"one", "two", "three", "four", "five", "six"} {
		out = append(out, report(name+".example.org", name+".example.org", fillNine(
			pass("serving", "200 in 100ms"), withEngineVersion(pass("engine", "0.78.0 is current"), "0.78.0"))...))
	}
	return out
}

// Hostile is the corpus a site's own data can hand the renderer: a long domain, an injected
// newline carrying a forged verdict line, a clear-screen escape, a carriage return, a tab, CJK,
// an IDN, a ZWJ emoji, a 300-character fix, and a hold that lapsed forty days ago.
func Hostile() []health.Report {
	return []health.Report{report(
		"a-very-long-site-name-nobody-would-choose.example.org\u001b[2J",
		"xn--bcher-kva.example.org",
		fail("serving", spine.CodeServingMismatch,
			"the hostname does not answer\nCRITICAL  example.org  0 failing \u001b[42;30mOK\u001b[0m"),
		fail("deploy", spine.CodeDeployBuildFailed, "build\tfailed\r26m ago (3f0ba18) 日本語のテキスト 👨‍👩‍👧‍👦"),
		skip("email", spine.ReasonNotObservable, strings.Repeat("long ", 60)),
		holdLapsed(
			failCondition("https-forced", spine.ConditionEdgeHTTPSNotForced, "Always Use HTTPS is off for the zone"),
			Now().Add(-40*24*time.Hour)),
		withEngineVersion(pass("engine", "0.78.0 is current"), "0.78.0"),
	)}
}

// Named is one fixture under the name its golden files are cut at.
type Named struct {
	// Name is the fixture's own name, the stem of every golden file cut from it.
	Name string
	// Reports is the fixture's sweep.
	Reports []health.Report
}

// All returns every fixture in a fixed order, so a sweep over the corpus is reproducible.
func All() []Named {
	return []Named{
		{"empty", Empty()},
		{"all-unknown", AllUnknown()},
		{"degraded", Degraded()},
		{"offline", Offline()},
		{"one-sick", OneSick()},
		{"healthy", Healthy()},
		{"warning-only", WarningOnly()},
		{"twelve-site", TwelveSites()},
		{"hostile", Hostile()},
	}
}
