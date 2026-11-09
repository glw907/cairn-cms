package setup

import "strings"

// Outline is what setup will do for a set of answers.
type Outline struct {
	// Names are the derived names.
	Names Names
	// Addresses are the hosts the site answers on: the apex and its www, or one subdomain.
	Addresses []string
	// Steps are the ordered steps.
	Steps []Step
	// OwnerEmail is the first owner's address.
	OwnerEmail string
	// Posture is the AI-crawler choice to write.
	Posture Posture
	// Theme is the chosen theme id, if any.
	Theme string
	// AccountID is the chosen Cloudflare account id, if any.
	AccountID string
}

// Plan validates the answers and returns the outline. It does no I/O, so the same answers
// give an identical outline.
func Plan(a Answers) (Outline, error) {
	n, err := deriveNames(a.SiteName, a.Suffix)
	if err != nil {
		return Outline{}, err
	}
	if strings.TrimSpace(a.OwnerEmail) == "" {
		return Outline{}, errNoEmail
	}
	if a.Posture != Decline && a.Posture != Invite {
		return Outline{}, errPosture
	}
	addrs, err := addresses(a.Zone, a.Host)
	if err != nil {
		return Outline{}, err
	}
	return Outline{
		Names:      n,
		Addresses:  addrs,
		Steps:      steps(),
		OwnerEmail: a.OwnerEmail,
		Posture:    a.Posture,
		Theme:      a.Theme,
		AccountID:  a.AccountID,
	}, nil
}

// addresses returns the apex and www.<apex> for the zone itself, and the host alone for a
// subdomain of the zone.
func addresses(zone, host string) ([]string, error) {
	if zone == "" || host == "" {
		return nil, errHost
	}
	if host == zone {
		return []string{zone, "www." + zone}, nil
	}
	if strings.HasSuffix(host, "."+zone) {
		return []string{host}, nil
	}
	return nil, errHost
}
