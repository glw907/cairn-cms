package agentview

import (
	"context"
	"fmt"
	"io"
	"slices"
	"strings"
	"time"

	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup/loopback"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup/scaffold"
)

// UsageError is a refusal the caller's flags or plan file caused. Its text names the flag or the
// plan field at fault, so a caller exits with the usage code and prints it as it is.
type UsageError struct {
	Problem string
}

// Error implements the error interface.
func (e *UsageError) Error() string { return e.Problem }

// refusal is a stop the run reports as a step_failed: what the view could not answer, and what
// the caller does about it.
func refusal(happened, do string) *setup.Failure {
	return &setup.Failure{Reason: setup.ReasonRefused, Happened: happened, Do: do}
}

func usage(format string, args ...any) *UsageError {
	return &UsageError{Problem: fmt.Sprintf(format, args...)}
}

// Mode is what the agent lane's run does at the summary.
type Mode int

// The three modes.
const (
	// Plan ends the run at the summary, for --plan to write the plan file.
	PlanMode Mode = iota
	// Apply confirms the summary with the plan file's open fields.
	ApplyMode
	// Resume confirms the summary as shown, for a run that continues a record.
	ResumeMode
)

// View answers the runner for a run with no terminal: each choice comes from a flag, and the
// summary's Enter comes from the mode. It records the options the runner offered, which the
// plan file lists.
type View struct {
	Mode Mode
	// Theme, Account, and Zone are the --site-theme, --account, and --zone values. An account
	// is named by id and a zone by name or id.
	Theme, Account, Zone string
	// Host is the --host value, lowercased. With no --zone, it names the zone: the one domain
	// the account holds that the host is, or is a subdomain of.
	Host string
	// Edit is Apply mode's answer: the plan file's open fields.
	Edit setup.SummaryEdit
	// Stderr receives the fallback link when no browser opens.
	Stderr io.Writer
	// GOOS and Env choose the browser launcher, as loopback.Launcher takes them.
	GOOS string
	Env  map[string]string

	// Accounts and Zones are the options the runner offered, kept for the plan file.
	Accounts []providers.Account
	Zones    []providers.Zone
}

// ChooseTheme returns the --site-theme value, or a usage error listing the catalog. It is asked
// before the run holds a record, so an unanswered theme cannot be left open for a plan.
func (v *View) ChooseTheme(_ context.Context, themes []scaffold.Theme) (string, error) {
	if v.Theme == "" {
		ids := make([]string, len(themes))
		for i, t := range themes {
			ids[i] = t.ID
		}
		return "", usage("cairn: the template offers several themes. Give one with --site-theme: %s", strings.Join(ids, ", "))
	}
	return v.Theme, nil
}

// ChooseAccount returns the --account value. With none given, a plan leaves the choice open
// and every other mode stops at the step, since it cannot ask.
func (v *View) ChooseAccount(_ context.Context, accounts []providers.Account) (string, error) {
	v.Accounts = accounts
	if slices.ContainsFunc(accounts, func(a providers.Account) bool { return a.ID == v.Account }) {
		return v.Account, nil
	}
	if v.Mode == PlanMode && v.Account == "" {
		return "", setup.ErrOpenChoice
	}
	list := make([]string, len(accounts))
	for i, a := range accounts {
		list[i] = a.ID + " (" + a.Name + ")"
	}
	return "", refusal("The Cloudflare sign-in lists several accounts, and none was chosen: "+strings.Join(list, ", ")+".",
		"Run cairn new --resume with --account and one of them.")
}

// ChooseZone returns the id of the zone --zone names, by name or id. With no --zone, the zone
// is the one --host belongs to, and when two nest (example.com and blog.example.com) the longer
// name, the zone Cloudflare serves the host from. With neither, a plan leaves the choice open
// and every other mode stops at the step.
func (v *View) ChooseZone(_ context.Context, zones []providers.Zone) (string, error) {
	v.Zones = zones
	for _, z := range zones {
		if v.Zone != "" && (z.ID == v.Zone || z.Name == v.Zone) {
			return z.ID, nil
		}
	}
	if v.Zone == "" {
		if id, ok := zoneOfHost(zones, v.Host); ok {
			return id, nil
		}
	}
	if v.Mode == PlanMode && v.Zone == "" {
		return "", setup.ErrOpenChoice
	}
	names := make([]string, len(zones))
	for i, z := range zones {
		names[i] = z.Name
	}
	return "", refusal("The account has several active domains, and none was chosen: "+strings.Join(names, ", ")+".",
		"Run cairn new --resume with --zone and one of them.")
}

// zoneOfHost returns the id of the zone whose name is host or a parent domain of it, taking the
// longest name when several fit.
func zoneOfHost(zones []providers.Zone, host string) (string, bool) {
	best := -1
	for i, z := range zones {
		if host != z.Name && !strings.HasSuffix(host, "."+z.Name) {
			continue
		}
		if best < 0 || len(z.Name) > len(zones[best].Name) {
			best = i
		}
	}
	if best < 0 {
		return "", false
	}
	return zones[best].ID, true
}

// openTimeout is how long OpenBrowser waits on a launcher before it counts the browser as open.
const openTimeout = 3 * time.Second

// OpenBrowser opens url through the launcher and prints nothing when it opens. Only a launcher
// that fails prints the link, to stderr, since the link carries the tab's one-time key and
// never goes in an event.
func (v *View) OpenBrowser(_ context.Context, url string) error {
	err := loopback.Open(loopback.Launcher(v.GOOS, v.Env, url), openTimeout)
	if err == nil {
		return nil
	}
	_, werr := fmt.Fprintf(v.Stderr, "cairn: no browser opened (%v). Open this link in a browser on this computer:\n%s\n", err, url)
	return werr
}

// ConfirmSummary answers the summary by mode. A refusal after the run began, in Apply or Resume
// mode, is a plain error that stops the run at its step, since neither can ask again.
func (v *View) ConfirmSummary(_ context.Context, s setup.Summary, problem string) (setup.SummaryEdit, error) {
	switch v.Mode {
	case PlanMode:
		return setup.SummaryEdit{}, setup.ErrPlanned
	case ApplyMode:
		if problem == "" {
			return v.Edit, nil
		}
		field := "address"
		if !setup.ValidEmail(v.Edit.OwnerEmail) {
			field = "ownerEmail"
		}
		return setup.SummaryEdit{}, refusal("Setup refused the plan's "+field+": "+problem,
			"Fix the "+field+" in the plan file, and then run cairn new --apply again.")
	}
	if problem != "" {
		return setup.SummaryEdit{}, refusal("Setup refused the summary: "+problem, "Correct the value, and then run cairn new --resume <id> again with this site's id.")
	}
	return setup.SummaryEdit{OwnerEmail: s.OwnerEmail, Host: s.Addresses[0]}, nil
}
