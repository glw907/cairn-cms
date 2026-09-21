package health

import (
	"context"
	"encoding/json"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/providers"
	"github.com/glw907/cairn-cms/tool/internal/record"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// buildStoppedStatus is the Workers Builds "status" value a build reaches once it is no longer
// queued or running, ported from chapter3.mjs's own isBuildSettled.
const buildStoppedStatus = "stopped"

// buildOutcomeSuccess is the only Workers Builds "build_outcome" value a stopped build settles
// to that this check treats as a working deploy. Every other settled outcome (fail, terminated,
// skipped, cancelled, or one Cloudflare has not documented yet) is a failed deploy: the fail-open
// alternative, treating an unrecognized outcome as success, would tell an operator a broken
// deploy is fine (the Node CLI's own runChapter3 draws the same line).
const buildOutcomeSuccess = "success"

// BuildState is a Workers Builds run's settled state, as deployCheck reports it in its
// "lastBuild" field.
type BuildState int

// The four BuildState values a Workers Builds run can be in.
const (
	// BuildNone means Builds is connected but has never run a build.
	BuildNone BuildState = iota
	// BuildOK means the last build stopped with build_outcome "success".
	BuildOK
	// BuildFailed means the last build stopped with any other settled outcome.
	BuildFailed
	// BuildRunning means the last build has not reached "stopped" yet.
	BuildRunning
)

// String names s for the check's own "lastBuild" field.
func (s BuildState) String() string {
	switch s {
	case BuildOK:
		return "ok"
	case BuildFailed:
		return "failed"
	case BuildRunning:
		return "running"
	default:
		return "none"
	}
}

// DeployDetail is deployCheck's own internal measurement, flattened into deployCheck's ten
// ordered Fields entries rather than carried as one struct: Outcome.Fields holds a key and a
// json.RawMessage per value, so a struct placed in one entry would render as one opaque blob a
// per-field non-verbose filter could not reach inside.
type DeployDetail struct {
	// WorkerExists reports whether the record's named Worker exists in the account.
	WorkerExists bool
	// BuildsConnected reports whether the Worker has at least one Builds trigger.
	BuildsConnected bool
	// PushToDeploy reports whether a push to the connected repository redeploys the Worker. A
	// connected trigger is what Cloudflare's own push-to-deploy is: there is no separate
	// read-level flag Builds exposes for it.
	PushToDeploy bool
	// LastBuild is the most recent build's settled state.
	LastBuild BuildState
	// LastBuildSHA is the most recent build's commit hash, verbose-only.
	LastBuildSHA string
	// MainSHA is the site repository's default branch head commit, verbose-only.
	MainSHA string
	// LastBuildAt is when the most recent build was created.
	LastBuildAt time.Time
	// Behind reports whether MainSHA has moved past LastBuildSHA.
	Behind bool
}

// shortSHA returns sha's first seven characters, or sha itself when it is shorter than that,
// which only ever happens for an empty or not-yet-known sha.
func shortSHA(sha string) string {
	if len(sha) < 7 {
		return sha
	}
	return sha[:7]
}

// field wraps value as a spine.OutcomeField named key. Every value this file passes through it
// is a bool, a string, or a time.Time, each one of json.Marshal's own built-in cases, so the
// error return is unreachable here and ignored rather than threaded back through every caller.
func field(key string, value any) spine.OutcomeField {
	data, _ := json.Marshal(value)
	return spine.OutcomeField{Key: key, Value: data}
}

// fields flattens d into the ten ordered spine.OutcomeField entries every deployCheck outcome
// carries, in the fixed order the check's own goldens and nonVerboseFieldKeys allowlist key off:
// workerExists, buildsConnected, pushToDeploy, lastBuild, lastBuildSHA, mainSHA, lastBuildAt,
// behind, lastBuildShortSHA, mainShortSHA.
func (d DeployDetail) fields() []spine.OutcomeField {
	return []spine.OutcomeField{
		field("workerExists", d.WorkerExists),
		field("buildsConnected", d.BuildsConnected),
		field("pushToDeploy", d.PushToDeploy),
		field("lastBuild", d.LastBuild.String()),
		field("lastBuildSHA", d.LastBuildSHA),
		field("mainSHA", d.MainSHA),
		field("lastBuildAt", d.LastBuildAt),
		field("behind", d.Behind),
		field("lastBuildShortSHA", shortSHA(d.LastBuildSHA)),
		field("mainShortSHA", shortSHA(d.MainSHA)),
	}
}

// outcome builds the spine.Outcome deployCheck.Run returns for state and detail, always
// flattening d into the ten Fields entries above regardless of which branch of Run reached it: a
// partial DeployDetail (an absent worker's zero value, for instance) flattens the same way, with
// each not-yet-measured field at its zero value.
func (d DeployDetail) outcome(state spine.State, reason spine.ReasonCode, detail string) spine.Outcome {
	return spine.Outcome{State: state, Reason: reason, Detail: detail, Fields: d.fields()}
}

// deployCheck ports the site's Workers Builds deploy pipeline: the Worker exists, Builds is
// connected to the site's own repository, the last build's settled state, and whether that
// build's commit is still the repository's own default-branch head.
type deployCheck struct{}

// ID implements Check.
func (deployCheck) ID() string { return "deploy" }

// Condition implements Check. src/lib/diagnostics/conditions.ts carries no id for Deploy, so it
// declares no cairn-doctor condition.
func (deployCheck) Condition() spine.Condition { return spine.ConditionNone }

// Needs implements Check. Deploy reads the Worker and its Builds triggers through Cloudflare and
// the repository's default-branch head through GitHub, so it needs both.
func (deployCheck) Needs() Tier { return TierBoth }

// findWorker returns the account's Worker named name, or a nil Worker with no error when the
// account has none by that name.
func findWorker(ctx context.Context, cf *providers.Cloudflare, name string) (*providers.Worker, error) {
	workers, err := cf.ListWorkers(ctx)
	if err != nil {
		return nil, err
	}
	for _, w := range workers {
		if w.Name == name {
			return &w, nil
		}
	}
	return nil, nil
}

// defaultBranch returns r's repository's own default branch, falling back to "main" when a
// record carries none: an unadopted or freshly created repository's record can predate the
// default-branch read, and "main" is what every site this tool provisions is created with.
func defaultBranch(r record.Record) string {
	if r.GitHub.Repo.DefaultBranch != "" {
		return r.GitHub.Repo.DefaultBranch
	}
	return "main"
}

// Run implements Check. Worker absence and an unreachable or misclassified API call return
// immediately; every other branch flattens whatever of DeployDetail the run measured before
// settling, so a partial measurement (a worker that exists but has never built, say) still
// renders through the same ten Fields.
func (deployCheck) Run(ctx context.Context, r record.Record, c Clients, _ Options) spine.Outcome {
	worker, err := findWorker(ctx, c.CF, r.Cloudflare.WorkerName)
	if err != nil {
		return apiErrorOutcome(err)
	}
	if worker == nil {
		return DeployDetail{}.outcome(spine.Failing, "", "worker not found")
	}
	detail := DeployDetail{WorkerExists: true}

	if !c.HaveBuilds {
		return detail.outcome(spine.Unknown, spine.ReasonCredMissing, "")
	}

	triggers, err := c.CF.BuildsConnections(ctx, worker.Tag)
	if err != nil {
		return apiErrorOutcome(err)
	}
	if len(triggers) == 0 {
		return detail.outcome(spine.Failing, "", string(spine.APIReason(providers.ReasonBuildsNotConnected)))
	}
	detail.BuildsConnected = true
	detail.PushToDeploy = true

	build, err := c.CF.BuildsLatest(ctx, worker.Tag)
	if err != nil {
		return apiErrorOutcome(err)
	}
	if build == nil {
		return detail.outcome(spine.Unknown, spine.ParkReason(spine.ParkBuildNotStarted), "")
	}
	detail.LastBuildSHA = build.TriggerMetadata.CommitHash
	detail.LastBuildAt = build.CreatedOn

	if build.Status != buildStoppedStatus {
		detail.LastBuild = BuildRunning
		return detail.outcome(spine.Unknown, spine.ParkReason(spine.ParkBuildRunning), "")
	}

	mainSHA, err := c.GH.HeadSHA(ctx, r.GitHub.Repo.Owner, r.GitHub.Repo.Repo, defaultBranch(r))
	if err != nil {
		return apiErrorOutcome(err)
	}
	detail.MainSHA = mainSHA
	detail.Behind = detail.LastBuildSHA != "" && mainSHA != "" && detail.LastBuildSHA != mainSHA

	if build.Outcome != buildOutcomeSuccess {
		detail.LastBuild = BuildFailed
		return detail.outcome(spine.Failing, "", "last build did not succeed")
	}

	detail.LastBuild = BuildOK
	return detail.outcome(spine.OK, "", "")
}
