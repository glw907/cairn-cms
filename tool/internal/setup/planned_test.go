package setup

import (
	"context"
	"errors"
	"slices"
	"testing"

	"github.com/glw907/cairn-cms/tool/v2/internal/spine"
)

// planView ends the run at the summary, the way the agent view does for --plan.
type planView struct{ *fakeView }

func (planView) ConfirmSummary(context.Context, Summary, string) (SummaryEdit, error) {
	return SummaryEdit{}, ErrPlanned
}

func TestAViewThatPlansStopsTheRunCleanlyAtTheSummary(t *testing.T) {
	w := newWorld(t)
	w.cfg.View = planView{w.view}
	_, err := w.run(context.Background())
	if !errors.Is(err, ErrPlanned) {
		t.Fatalf("Run error = %v, want ErrPlanned", err)
	}
	if slices.ContainsFunc(w.events, func(e Event) bool { return e.Kind == StepFailed }) {
		t.Error("a planned stop emitted step_failed")
	}
	if last := w.events[len(w.events)-1]; last.Kind != SummaryKind {
		t.Errorf("last event = %s, want the summary", last.Kind)
	}
	rec, _ := w.saver.last()
	if rec.Step != string(spine.StepInstalled) || !rec.Setup.KeysKept || len(w.vault.ofRun()) == 0 {
		t.Errorf("record step %q, KeysKept %v, keyring %v; want it resumable at installed", rec.Step, rec.Setup.KeysKept, w.vault.ofRun())
	}
	if len(w.cf.creates) != 0 {
		t.Errorf("a plan created %v on Cloudflare", w.cf.creates)
	}

	a := RecordedAnswers(rec)
	if a.SiteName != "Example Site" || a.Posture != Decline || a.Zone != rec.Domain || a.Host != rec.Setup.Address ||
		a.Theme != "waymark" || a.AccountID != w.cf.accounts[0].ID || a.OwnerEmail != rec.Setup.OwnerEmail || a.Suffix != 0 {
		t.Errorf("RecordedAnswers = %+v", a)
	}

	w.cfg.View = w.view
	res, err := w.resume()
	if err != nil || res.Record.Step != string(spine.StepLive) {
		t.Fatalf("the plan's record did not resume to live: %v at %q", err, res.Record.Step)
	}
}

func TestRecordedAnswersRecoversATakenNameSuffix(t *testing.T) {
	w := newWorld(t)
	w.cf.workers["example-site"] = "someone-else"
	w.cfg.View = planView{w.view}
	if _, err := w.run(context.Background()); !errors.Is(err, ErrPlanned) {
		t.Fatalf("Run error = %v, want ErrPlanned", err)
	}
	rec, _ := w.saver.last()
	if got := RecordedAnswers(rec).Suffix; got != 2 {
		t.Errorf("suffix = %d, want 2", got)
	}
}

func TestExportedHelpers(t *testing.T) {
	n, err := DeriveNames("My Site", 0)
	if err != nil || n.Repository != "my-site" {
		t.Errorf("DeriveNames = %+v, %v", n, err)
	}
	if !ValidEmail("a@b.co") || ValidEmail("a@b") || ValidEmail("Name <a@b.co>") {
		t.Error("ValidEmail disagrees with the summary's rule")
	}
}
