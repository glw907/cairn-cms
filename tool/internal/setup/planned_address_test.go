package setup

import (
	"context"
	"errors"
	"testing"

	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
)

// An address the plan gave and an open-choice stop kept is checked against Cloudflare before the
// resume creates anything, so a host that already points to another site stops the run at the
// Cloudflare checks and not after the repository, Worker, database, and bucket exist.
func TestAKeptAddressIsCheckedBeforeTheResumeCreatesAnything(t *testing.T) {
	w := newWorld(t)
	w.cf.active = append(w.cf.active, providers.Zone{ID: "zone-two", Name: "example.org", Status: "active"})
	w.cf.dns["blog.example.org"] = []providers.DNSRecord{{Name: "blog.example.org", Type: "CNAME"}}
	w.cfg.View = openView{w.view}
	w.cfg.Answers.OwnerEmail = "given@example.com"
	w.cfg.Answers.Host = "blog.example.org"
	if _, err := w.run(context.Background()); !errors.Is(err, ErrOpenChoice) {
		t.Fatalf("Run error = %v, want ErrOpenChoice", err)
	}
	rec, ok := w.saver.last()
	if !ok {
		t.Fatal("the stop saved no record")
	}

	w.cfg.View = w.view
	w.cfg.Answers = RecordedAnswers(rec)
	w.view.zone = "zone-two"
	_, err := w.resume()
	f, isFailure := errors.AsType[*Failure](err)
	if !isFailure || f.Reason != ReasonAddressRecords || f.Step != StepCloudflareChecks {
		t.Fatalf("resume error = %v, want %s at %s", err, ReasonAddressRecords, StepCloudflareChecks)
	}
	if f.Did != nothingCreated {
		t.Errorf("the refusal came after setup created %q", f.Did)
	}
}
