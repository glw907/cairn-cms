package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"runtime"
	"slices"
	"strings"

	"github.com/glw907/cairn-cms/tool/v2/internal/setup"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup/agentview"
	"github.com/glw907/cairn-cms/tool/v2/internal/spine"
	"github.com/glw907/cairn-cms/tool/v2/internal/store"
	"github.com/spf13/cobra"
)

// agentRun is one agent-lane invocation: the registry it reads, and the writer that sends the
// run's events to stdout.
type agentRun struct {
	cmd *cobra.Command
	d   deps
	f   newFlags
	st  *store.Store
	out *agentview.Writer
}

// runAgent runs one mode of cairn new for a caller with no terminal: --dry-run prints the names,
// --plan runs the approvals and writes the plan file, --apply creates the site from that file,
// and --resume continues an unfinished record.
func runAgent(cmd *cobra.Command, d deps, f newFlags, mode string) error {
	if mode == "dry-run" {
		return runDryRun(cmd, f)
	}
	st, err := openRegistry(d)
	if err != nil {
		return err
	}
	a := &agentRun{cmd: cmd, d: d, f: f, st: st, out: agentview.NewWriter(cmd.OutOrStdout())}
	switch mode {
	case "plan":
		return a.plan()
	case "apply":
		return a.apply()
	}
	return a.resume()
}

// dryRunPayload is what --dry-run --json prints.
type dryRunPayload struct {
	SchemaVersion int           `json:"schemaVersion"`
	Kind          string        `json:"kind"`
	SiteName      string        `json:"siteName"`
	Repository    string        `json:"repository"`
	Worker        string        `json:"worker"`
	Database      string        `json:"database"`
	Bucket        string        `json:"bucket"`
	App           string        `json:"app"`
	Folder        string        `json:"folder"`
	OwnerEmail    string        `json:"ownerEmail"`
	Posture       setup.Posture `json:"posture"`
}

// runDryRun prints the names setup would use. It needs no registry, no network, and no approval.
func runDryRun(cmd *cobra.Command, f newFlags) error {
	if err := checkEmail(f.email); err != nil {
		return err
	}
	n, err := setup.DeriveNames(f.name, 0)
	if err != nil {
		return newUsageError("cairn: --name: " + err.Error())
	}
	if !f.asJSON {
		_, err := fmt.Fprintln(cmd.OutOrStdout(), fmt.Sprintf(tmplNewDryRun, f.name, n.Repository, n.Worker, n.Database, n.Bucket, n.App, n.Folder, f.email, f.posture))
		return err
	}
	data, err := json.Marshal(dryRunPayload{
		SchemaVersion: 1, Kind: "dryRun", SiteName: f.name, Repository: n.Repository, Worker: n.Worker,
		Database: n.Database, Bucket: n.Bucket, App: n.App, Folder: n.Folder, OwnerEmail: f.email, Posture: setup.Posture(f.posture),
	})
	if err != nil {
		return err
	}
	return writeJSONPayload(cmd.OutOrStdout(), data)
}

func checkEmail(email string) error {
	if !setup.ValidEmail(email) {
		return translated(errors.New(tmplNewBadEmail))
	}
	return nil
}

// unfinished lists the setup records a run could continue, by id.
func (a *agentRun) unfinished() []store.Entry {
	entries, _ := a.st.List()
	candidates, _, _ := store.SelectResume(entries)
	slices.SortFunc(candidates, func(x, y store.Entry) int { return strings.Compare(x.ID, y.ID) })
	return candidates
}

// recordOf finds the unfinished record a run id names.
func (a *agentRun) recordOf(runID string) (store.Entry, bool) {
	for _, e := range a.unfinished() {
		if e.Record.Setup.RunID == runID {
			return e, true
		}
	}
	return store.Entry{}, false
}

// plan runs the approvals with the flags as the answers and stops at the summary, then writes
// the plan file. It refuses to start over an unfinished setup unless --new says to.
func (a *agentRun) plan() error {
	if err := checkEmail(a.f.email); err != nil {
		return err
	}
	if !a.f.fresh {
		switch open := a.unfinished(); len(open) {
		case 0:
		case 1:
			return newUnfinishedError(open[0].ID)
		default:
			ids := make([]string, len(open))
			for i, e := range open {
				ids[i] = e.ID
			}
			return newSeveralUnfinishedError(ids)
		}
	}
	view := a.view(agentview.PlanMode)
	view.Theme, view.Account, view.Zone = a.f.siteTheme, a.f.account, a.f.zone
	in := newInput{
		answers: setup.Answers{SiteName: a.f.name, OwnerEmail: a.f.email, Posture: setup.Posture(a.f.posture)},
		tag:     a.f.tag,
	}
	cfg, err := productionConfig(a.d, in, view, a.out.Emit)
	if err != nil {
		return err
	}
	_, err = setup.Run(a.cmd.Context(), cfg)
	if !errors.Is(err, setup.ErrPlanned) {
		return a.finish(setup.Result{}, err)
	}
	e, ok := a.recordOf(cfg.RunID)
	if !ok {
		return newNoRunForPlanError(cfg.RunID)
	}
	p, err := agentview.PlanOf(e.Record, view.Accounts, view.Zones)
	if err != nil {
		return err
	}
	p.OwnerEmail = a.f.email
	if a.f.host != "" {
		p.Address = strings.ToLower(a.f.host)
	}
	if err := agentview.Check(p, e.Record); err != nil {
		return newUsageError(err.Error())
	}
	if err := agentview.WritePlan(a.f.plan, p); err != nil {
		return err
	}
	_, err = fmt.Fprintf(a.cmd.ErrOrStderr(), tmplNewPlanWritten+"\n", a.f.plan, a.f.plan)
	return err
}

// apply is the summary's Enter: it reads the plan file, checks its open fields against the
// record the run id names, and runs the rest of setup with those fields.
func (a *agentRun) apply() error {
	p, err := agentview.ReadPlan(a.f.apply)
	if err != nil {
		return newPlanUnreadableError(err)
	}
	e, ok := a.recordOf(p.RunID)
	if !ok {
		return newNoRunForPlanError(p.RunID)
	}
	if err := agentview.Check(p, e.Record); err != nil {
		return newUsageError(err.Error())
	}
	view := a.view(agentview.ApplyMode)
	view.Edit = p.Edit()
	return a.runRecord(e, view, true)
}

// resume continues the unfinished record --resume names, confirming its summary as shown.
func (a *agentRun) resume() error {
	rec, err := a.st.LoadResumable(a.f.resume)
	if err != nil {
		return newNoSetupError(a.f.resume)
	}
	return a.runRecord(store.Entry{ID: a.f.resume, Record: rec}, a.view(agentview.ResumeMode), false)
}

func (a *agentRun) runRecord(e store.Entry, view *agentview.View, apply bool) error {
	in := newInput{
		answers: setup.RecordedAnswers(e.Record),
		tag:     a.f.tag,
		apply:   apply,
		resume:  &setup.Resume{SiteID: e.ID, Record: e.Record},
	}
	cfg, err := productionConfig(a.d, in, view, a.out.Emit)
	if err != nil {
		return err
	}
	res, err := setup.Run(a.cmd.Context(), cfg)
	return a.finish(res, err)
}

func (a *agentRun) view(mode agentview.Mode) *agentview.View {
	return &agentview.View{Mode: mode, Stderr: a.cmd.ErrOrStderr(), GOOS: runtime.GOOS, Env: environMap(os.Environ())}
}

// finish turns a run's end into the stream's last line and the exit code. A finished run ends the
// stream with a summary, which a stream cut short never has.
func (a *agentRun) finish(res setup.Result, err error) error {
	if err == nil {
		s := res.Summary
		if s.SiteName == "" {
			s = summaryOf(res)
		}
		a.out.Emit(setup.Event{SchemaVersion: setup.EventSchemaVersion, Kind: setup.SummaryKind, Timestamp: a.d.now(), Step: setup.StepSignIn, Summary: &s})
		return a.out.Err()
	}
	if ue, ok := errors.AsType[*agentview.UsageError](err); ok {
		return newUsageError(ue.Problem)
	}
	f, ok := errors.AsType[*setup.Failure](err)
	if !ok {
		return err
	}
	w := a.cmd.ErrOrStderr()
	for _, line := range []string{f.Happened, f.Did, f.Left, f.Do} {
		if line != "" {
			_, _ = fmt.Fprintln(w, line)
		}
	}
	return codedExit(spine.Verdict(newExitFor(f)))
}

// newExitFor is the exit code of a stop: 2 for one that ended a wait, 1 for any other step.
func newExitFor(f *setup.Failure) int {
	if f.Reason == setup.ReasonStopped || f.Reason == setup.ReasonChainTimeout {
		return 2
	}
	return 1
}

// summaryOf rebuilds the summary of a run that resumed past the summary step, from its outline.
func summaryOf(res setup.Result) setup.Summary {
	o := res.Outline
	return setup.Summary{
		SiteName: res.Record.Name, Repository: o.Names.Repository, Worker: o.Names.Worker, Database: o.Names.Database,
		Bucket: o.Names.Bucket, App: res.Record.Setup.AppSlug, Folder: o.Names.Folder, Zone: res.Record.Domain,
		Addresses: o.Addresses, OwnerEmail: o.OwnerEmail, Posture: o.Posture, Theme: o.Theme,
	}
}
