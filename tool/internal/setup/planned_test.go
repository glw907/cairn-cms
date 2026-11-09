package setup

import (
	"context"
	"errors"
	"slices"
	"testing"

	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
	"github.com/glw907/cairn-cms/tool/v2/internal/spine"
)

// openView leaves the zone choice open the way the agent view does for --plan with no --zone.
type openView struct{ *fakeView }

func (openView) ChooseZone(context.Context, []providers.Zone) (string, error) {
	return "", ErrOpenChoice
}

func TestAnOpenChoiceStopsTheRunCleanlyAndTheRecordResumesWithoutAnotherApproval(t *testing.T) {
	w := newWorld(t)
	w.cf.active = append(w.cf.active, providers.Zone{ID: "zone-two", Name: "example.org", Status: "active"})
	w.cfg.View = openView{w.view}
	_, err := w.run(context.Background())
	if !errors.Is(err, ErrOpenChoice) {
		t.Fatalf("Run error = %v, want ErrOpenChoice", err)
	}
	if slices.ContainsFunc(w.events, func(e Event) bool { return e.Kind == StepFailed }) {
		t.Error("an open choice emitted step_failed")
	}
	rec, _ := w.saver.last()
	if rec.Cloudflare.AccountID != w.cf.accounts[0].ID || rec.Cloudflare.ZoneID != "" || !rec.Setup.KeysKept || len(w.vault.ofRun()) == 0 {
		t.Errorf("record account %q, zone %q, KeysKept %v, keyring %v; want the account kept, the zone open, and the run resumable",
			rec.Cloudflare.AccountID, rec.Cloudflare.ZoneID, rec.Setup.KeysKept, w.vault.ofRun())
	}

	w.cfg.View = w.view
	w.view.zone = "zone-two"
	res, err := w.resume()
	if err != nil || res.Record.Step != string(spine.StepLive) {
		t.Fatalf("the record did not resume to live: %v at %q", err, res.Record.Step)
	}
	if res.Record.Domain != "example.org" {
		t.Errorf("domain = %q, want the zone the resume chose", res.Record.Domain)
	}
	if slices.Contains(w.waits(), WaitCloudflare) {
		t.Errorf("the resume asked for Cloudflare approval again: %v", w.waits())
	}
}

// accountOpenView leaves the account choice open the way the agent view does for --plan with
// several accounts and no --account.
type accountOpenView struct{ *fakeView }

func (accountOpenView) ChooseAccount(context.Context, []providers.Account) (string, error) {
	return "", ErrOpenChoice
}

// TestAStopAtAnOpenChoiceKeepsTheOwnersEmailAndAddressForTheResume proves a record stopped at the
// account or the zone carries the email and address given to the plan, so the resume signs the
// owner in with them and not with the Cloudflare sign-in's email.
func TestAStopAtAnOpenChoiceKeepsTheOwnersEmailAndAddressForTheResume(t *testing.T) {
	for _, tc := range []struct {
		name   string
		view   func(*world) View
		setup  func(*world)
		resume func(*world)
	}{
		{"account", func(w *world) View { return accountOpenView{w.view} },
			func(w *world) {
				w.cf.accounts = append(w.cf.accounts, providers.Account{ID: "0000000000000000000000000000ex02", Name: "Second"})
			},
			func(w *world) { w.view.account = w.cf.accounts[0].ID }},
		{"zone", func(w *world) View { return openView{w.view} },
			func(w *world) {
				w.cf.active = append(w.cf.active, providers.Zone{ID: "zone-two", Name: "example.org", Status: "active"})
			},
			func(w *world) { w.view.zone = "zone-two" }},
	} {
		t.Run(tc.name, func(t *testing.T) {
			w := newWorld(t)
			tc.setup(w)
			w.cfg.View = tc.view(w)
			w.cfg.Answers.OwnerEmail = "given@example.com"
			w.cfg.Answers.Host = "blog.example.org"
			if _, err := w.run(context.Background()); !errors.Is(err, ErrOpenChoice) {
				t.Fatalf("Run error = %v, want ErrOpenChoice", err)
			}
			rec, ok := w.saver.last()
			if !ok || rec.Setup.OwnerEmail != "given@example.com" || rec.Setup.Address != "blog.example.org" {
				t.Fatalf("record email %q, address %q; want the plan's, saved at the stop", rec.Setup.OwnerEmail, rec.Setup.Address)
			}

			w.cfg.View = w.view
			w.cfg.Answers = RecordedAnswers(rec)
			tc.resume(w)
			res, err := w.resume()
			if err != nil {
				t.Fatalf("resume: %v", err)
			}
			if res.Record.Setup.OwnerEmail != "given@example.com" {
				t.Errorf("owner email after the resume = %q, want the plan's", res.Record.Setup.OwnerEmail)
			}
			// The address stands only where it fits the zone the resume chose.
			if want := map[string]string{"zone": "blog.example.org"}[tc.name]; want != "" && res.Record.Setup.Address != want {
				t.Errorf("address after the resume = %q, want %q", res.Record.Setup.Address, want)
			}
		})
	}
}

// planView ends the run at the summary, the way the agent view does for --plan.
type planView struct{ *fakeView }

func (planView) ConfirmSummary(context.Context, Summary, string) (SummaryEdit, error) {
	return SummaryEdit{}, ErrPlanned
}

func TestAViewThatPlansStopsTheRunCleanlyAtTheSummary(t *testing.T) {
	w := newWorld(t)
	w.cfg.View = planView{w.view}
	w.cfg.Answers.OwnerEmail = "agent@example.test"
	_, err := w.run(context.Background())
	if !errors.Is(err, ErrPlanned) {
		t.Fatalf("Run error = %v, want ErrPlanned", err)
	}
	if got := w.events[len(w.events)-1].Summary.OwnerEmail; got != "agent@example.test" {
		t.Errorf("summary email = %q, want the one the owner gave", got)
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
