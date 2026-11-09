package setup

import (
	"context"
	"errors"
	"net/mail"
	"strings"
)

// The problems ConfirmSummary is called with, from the copy deck's summary section. A view
// matches ProblemEmail to reopen the email row and treats any other problem as the address's.
const (
	// ProblemEmail refuses an email that is not one bare address.
	ProblemEmail = "Enter a valid email address."
	// ProblemAddress refuses an address that already serves another site.
	ProblemAddress = "That address already points to another site. Choose another address, or remove its DNS records in Cloudflare first."
	// ProblemHost refuses an address outside the zone; <zone> takes the zone's name. It is also
	// the address edit's note.
	ProblemHost = "Use the bare domain, or a subdomain such as blog.<zone>. A subdomain gets no www."
)

// summary shows every derived value for the owner's one Enter and takes the two editable rows
// back. An edited address is rechecked the way the opening checked the default, and an address
// or email setup refuses is shown again with the reason, until the owner leaves both valid.
func (r *run) summary(ctx context.Context) (Summary, error) {
	r.step = StepSummary
	r.host = r.zone.Name
	if r.rec.Setup.Address != "" {
		r.host = r.rec.Setup.Address
	}
	r.addresses, _ = addresses(r.zone.Name, r.host)
	problem := ""
	if !validEmail(r.email) {
		problem = ProblemEmail
	}
	for {
		s := r.summaryOf()
		r.emit(Event{Kind: SummaryKind, Step: StepSummary, Summary: &s})
		edit, err := r.cfg.View.ConfirmSummary(ctx, s, problem)
		if err != nil {
			return Summary{}, r.fail(ctx, err, "")
		}
		email, host := strings.TrimSpace(edit.OwnerEmail), strings.ToLower(strings.TrimSpace(edit.Host))
		if !validEmail(email) {
			problem = ProblemEmail
			continue
		}
		r.email = email
		if host != r.host {
			addrs, err := addresses(r.zone.Name, host)
			if err != nil {
				problem = strings.ReplaceAll(ProblemHost, "<zone>", r.zone.Name)
				continue
			}
			prev, prevAddrs := r.host, r.addresses
			r.host, r.addresses = host, addrs
			if err := r.checkAddress(ctx, ""); err != nil {
				if f, ok := errors.AsType[*Failure](err); ok && (f.Reason == ReasonAddressRecords || f.Reason == ReasonAddressInUse) {
					r.host, r.addresses = prev, prevAddrs
					problem = ProblemAddress
					continue
				}
				return Summary{}, err
			}
		}
		r.rec.Setup.OwnerEmail, r.rec.Setup.Address = r.email, r.host
		if err := r.save(); err != nil {
			return Summary{}, err
		}
		return r.summaryOf(), nil
	}
}

func (r *run) summaryOf() Summary {
	return Summary{
		SiteName:         r.cfg.Answers.SiteName,
		Repository:       r.names.Repository,
		Worker:           r.names.Worker,
		Database:         r.names.Database,
		Bucket:           r.names.Bucket,
		App:              r.app.Slug,
		Folder:           r.names.Folder,
		Zone:             r.zone.Name,
		Addresses:        r.addresses,
		OwnerEmail:       r.email,
		Posture:          r.cfg.Answers.Posture,
		Theme:            r.theme.ID,
		ThemeDescription: r.theme.Description,
		SuffixReason:     r.suffixReason,
		ZoneChosen:       r.zoneChosen,
	}
}

// outline draws up the plan for the confirmed answers.
func (r *run) outline() (Outline, error) {
	return Plan(Answers{
		SiteName:   r.cfg.Answers.SiteName,
		OwnerEmail: r.email,
		Posture:    r.cfg.Answers.Posture,
		Zone:       r.zone.Name,
		Host:       r.host,
		Theme:      r.theme.ID,
		AccountID:  r.account.ID,
		Suffix:     r.suffix,
	})
}

// validEmail reports whether s is one bare address, the form the editor table and the sign-in
// email take.
func validEmail(s string) bool {
	a, err := mail.ParseAddress(s)
	return err == nil && a.Address == s && strings.Contains(s[strings.LastIndex(s, "@"):], ".")
}
