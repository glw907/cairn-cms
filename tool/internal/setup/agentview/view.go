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

// ChooseTheme returns the --site-theme value, or a usage error listing the catalog.
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

// ChooseAccount returns the --account value, or a usage error listing the accounts.
func (v *View) ChooseAccount(_ context.Context, accounts []providers.Account) (string, error) {
	v.Accounts = accounts
	if v.Account == "" || !slices.ContainsFunc(accounts, func(a providers.Account) bool { return a.ID == v.Account }) {
		list := make([]string, len(accounts))
		for i, a := range accounts {
			list[i] = a.ID + " (" + a.Name + ")"
		}
		return "", usage("cairn: the Cloudflare sign-in lists several accounts. Give one with --account: %s", strings.Join(list, ", "))
	}
	return v.Account, nil
}

// ChooseZone returns the id of the zone --zone names, by name or id, or a usage error listing
// the zones.
func (v *View) ChooseZone(_ context.Context, zones []providers.Zone) (string, error) {
	v.Zones = zones
	for _, z := range zones {
		if v.Zone != "" && (z.ID == v.Zone || z.Name == v.Zone) {
			return z.ID, nil
		}
	}
	names := make([]string, len(zones))
	for i, z := range zones {
		names[i] = z.Name
	}
	return "", usage("cairn: the account has several active domains. Give one with --zone: %s", strings.Join(names, ", "))
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

// ConfirmSummary answers the summary by mode. A refusal in Apply mode is a usage error naming
// the plan field, and in Resume mode a plain error, since neither can ask again.
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
		return setup.SummaryEdit{}, usage("cairn: the plan's %s is refused: %s", field, problem)
	}
	if problem != "" {
		return setup.SummaryEdit{}, fmt.Errorf("cairn: setup refused the summary: %s", problem)
	}
	return setup.SummaryEdit{OwnerEmail: s.OwnerEmail, Host: s.Addresses[0]}, nil
}
