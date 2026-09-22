package health

import (
	"context"
	"slices"
	"strings"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/providers"
	"github.com/glw907/cairn-cms/tool/internal/record"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// publishStaleWindow is how long a "cairn/*" edit branch may sit unpublished before the check
// reports it stale: the spec's own publish-path window, chosen because an editor's saved draft
// that has not reached Publish in two weeks is either abandoned or stuck, not merely slow.
const publishStaleWindow = 14 * 24 * time.Hour

// cairnBranchPrefix is the per-entry edit branch prefix the engine creates on save
// (`cairn/<concept>/<id>`), the prefix this check filters a repository's branch list by.
const cairnBranchPrefix = "cairn/"

// publishDetail is publishPathCheck's own internal measurement, flattened into Fields as an
// "openBranchCount" entry and one "branchAgeDays" entry carrying every branch's age.
type publishDetail struct {
	// BranchCount is how many "cairn/*" branches the repository currently carries.
	BranchCount int
	// AgeDays is each "cairn/*" branch's age in whole days, oldest first.
	AgeDays []int
}

// fields flattens d into its two ordered spine.OutcomeField entries: openBranchCount, and
// branchAgeDays carrying every branch's age as one JSON array rather than one field per branch,
// so a report with several open branches does not repeat the branchAgeDays key.
func (d publishDetail) fields() []spine.OutcomeField {
	ageDays := d.AgeDays
	if ageDays == nil {
		ageDays = []int{}
	}
	return []spine.OutcomeField{
		field("openBranchCount", d.BranchCount),
		field("branchAgeDays", ageDays),
	}
}

// outcome builds the spine.Outcome publishPathCheck.Run returns for state and detail, always
// flattening d into its Fields entries regardless of which branch of Run reached it.
func (d publishDetail) outcome(state spine.State, reason spine.ReasonCode, code spine.Code, detail string) spine.Outcome {
	return spine.Outcome{State: state, Reason: reason, Code: code, Detail: detail, Fields: d.fields()}
}

// publishPathCheck ports the engine's publish path: every open "cairn/*" edit branch a site's
// repository carries, aged against the newest commit `cairn-cms[bot]` has made on the default
// branch, since a bot commit newer than a branch is that branch's own publish having already
// landed.
type publishPathCheck struct{}

// ID implements Check.
func (publishPathCheck) ID() string { return "publish-path" }

// Needs implements Check. Publish-path reads the repository's branches and commits through
// GitHub alone.
func (publishPathCheck) Needs() Tier { return TierGH }

// cairnBranches returns the subset of branches whose name carries cairnBranchPrefix.
func cairnBranches(branches []providers.Branch) []providers.Branch {
	var filtered []providers.Branch
	for _, b := range branches {
		if strings.HasPrefix(b.Name, cairnBranchPrefix) {
			filtered = append(filtered, b)
		}
	}
	return filtered
}

// staleBranchCount reports how many of branches are older than publishStaleWindow as of now, with
// no bot commit dated after the branch's own last commit: a branch a later bot commit has
// superseded is not stuck, however old it is.
func staleBranchCount(branches []providers.Branch, botCommitAt, now time.Time) int {
	var stale int
	for _, b := range branches {
		if now.Sub(b.CommitDate) > publishStaleWindow && !botCommitAt.After(b.CommitDate) {
			stale++
		}
	}
	return stale
}

// Run implements Check. A repository with no open "cairn/*" branch has nothing waiting to
// publish, which is the state a site spends most of its life in, so it passes and says so. The
// absence of any bot commit does not change that: a site whose editors have not published yet is
// quiet, not unobservable, and Unknown here is reserved for the repository the run could not
// read at all. Every branch age is measured against o.Now, the sweep's clock, so the same branch
// list replays to the same ages. A stale branch declares spine.ConditionNone rather than an App-unreachable
// remedy: a stale edit branch most often means an editor simply never opened Publish, and the
// same verdict also fires when the repository already carries a bot commit, which proves the App
// did reach and write it, so blaming the App would mislead.
func (publishPathCheck) Run(ctx context.Context, r record.Record, c Clients, o Options) spine.Outcome {
	if !HasRepo(r) {
		return spine.Outcome{State: spine.Unknown, Reason: spine.ReasonRepoNotRecorded, Detail: detailNoRepoRecorded()}
	}
	owner, repo := r.GitHub.Repo.Owner, r.GitHub.Repo.Repo

	branches, err := c.GH.Branches(ctx, owner, repo)
	if err != nil {
		return apiErrorOutcome(err)
	}
	open := cairnBranches(branches)

	botCommitAt, err := c.GH.LatestBotCommit(ctx, owner, repo, DefaultBranch(r))
	if err != nil {
		return apiErrorOutcome(err)
	}

	now := o.Now()
	oldestFirst := slices.Clone(open)
	slices.SortFunc(oldestFirst, func(a, b providers.Branch) int { return a.CommitDate.Compare(b.CommitDate) })

	detail := publishDetail{BranchCount: len(open)}
	for _, b := range oldestFirst {
		detail.AgeDays = append(detail.AgeDays, int(now.Sub(b.CommitDate).Hours()/24))
	}

	if stale := staleBranchCount(open, botCommitAt, now); stale > 0 {
		return detail.outcome(spine.Failing, "", spine.CodePublishStaleBranch, detailPublishStaleBranches(stale))
	}
	if len(open) == 0 {
		return detail.outcome(spine.OK, "", "", detailPublishNothingWaiting())
	}
	return detail.outcome(spine.OK, "", "", "")
}
