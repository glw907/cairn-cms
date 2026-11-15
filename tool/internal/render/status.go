package render

import (
	"strings"
	"time"

	"github.com/glw907/cairn-cms/tool/v2/internal/style"
)

// This file carries the run's state beside the checks: how long the sweep took, which
// provider tokens it read and through what, which it could not find and which checks that cost,
// and whether a missing token degraded the run.
//
// None of it is header material. The credential and keyring
// detail sit on the `creds` row of a health frame, where the check they describe already is, and
// stand alone only where there is no creds row to sit on, which is the site listing.

// providerKeyring and providerEnvironment are the two places a token resolves through. The
// command layer names one of them on a Credential it found; render never guesses.
const (
	providerKeyring     = "keyring"
	providerEnvironment = "environment"
)

// Credential is one provider token's state in a run, as the command layer resolved it. A token
// the run could not find carries an empty Provider and names the checks its absence stopped.
type Credential struct {
	// Variable is the environment variable the token is named by, which is also the name an
	// operator passes to `cairn auth set`.
	Variable string
	// Provider names where a present token resolved through, the keyring or the environment. It
	// is empty for a token the run could not find, which is what missing reads.
	Provider string
	// Disables lists the check ids a missing token stopped from running. It is empty for a token
	// the run found.
	Disables []string
	// Expires is the token's expiry where the provider publishes one, and the zero time
	// otherwise. GitHub is the only provider of the two that publishes one.
	Expires time.Time
}

// missing reports whether the run could not find c's token.
func (c Credential) missing() bool {
	return c.Provider == ""
}

// StatusState is the run's state beside its checks: the wall time, the provider tokens, and
// whether a missing one degraded the run. The command layer fills it; render reads it.
type StatusState struct {
	// Elapsed is how long the run itself took, printed on the checked line. Zero means the
	// caller measured none, and the line then carries the two facts it always has.
	Elapsed time.Duration
	// Credentials holds every provider token the run needed, present and missing alike, in the
	// order the command layer resolved them.
	Credentials []Credential
	// Degraded reports health.Report.Degraded for the run: a missing token stopped checks from
	// running, as opposed to a check that could not observe its subject.
	Degraded bool
}

// statusLines renders the run's credential state, one fact per line, muted. A missing token
// names the checks it disabled, since the cost of the absence is the part an operator acts on; a
// present one names where it came from, so an operator who rotated a token in the environment
// and still sees the old one can tell which store answered.
func (t theme) statusLines(in RenderInput, col, width int) []string {
	var out []string
	named := false
	for _, c := range in.Status.Credentials {
		if c.missing() {
			named = true
		}
		out = append(out, t.statusLine(c, in.Now, in.View == ViewStatus, col, width)...)
	}
	// The degraded flag says a missing token cost the run some checks. Where a missing token was
	// already named with the checks it disabled, that line has already said it, in more detail
	// than a second line could.
	if in.Status.Degraded && !named {
		out = append(out, t.indented(t.Style(style.RoleUnknown), col, statusDegraded, width)...)
	}
	return out
}

// statusLine renders one token's fact as one sentence: the variable, then credentialFact.
func (t theme) statusLine(c Credential, now time.Time, listing bool, col, width int) []string {
	variable := sanitize(c.Variable)
	if variable == "" {
		return nil
	}
	role := style.RoleMuted
	if c.missing() {
		role = style.RoleUnknown
	}
	return t.indented(t.Style(role), col, variable+" "+credentialFact(c, now, listing), width)
}

// credentialFact is what a status line says about one token after naming its variable. listing
// selects the phrasing for a frame where no check was attempted: a site listing runs none, so
// the past tense would tell the operator that checks failed to run when nothing ran at all.
func credentialFact(c Credential, now time.Time, listing bool) string {
	if c.missing() {
		tail := statusUnsetTail
		if listing {
			tail = statusUnsetTailListing
		}
		return statusUnsetJoin + joinWords(sanitizeAll(c.Disables)) + tail
	}
	fact := statusReadJoin + sanitize(c.Provider)
	if !c.Expires.IsZero() {
		fact += statusExpiresJoin + isoDate(c.Expires) + ", in " + remainingDays(c.Expires.Sub(now))
	}
	return fact
}

// listingLines is the site listing's credentials block on a terminal: a title, then one mark
// row per token, the variable as the row's name and its fact as the detail. A missing token
// takes the could-not-run mark, since the checks it gates cannot run; a present one takes the
// pass mark in the frame's pass ink.
func (t theme) listingLines(in RenderInput, width int) []string {
	var rows []string
	named := false
	for _, c := range in.Status.Credentials {
		variable := sanitize(c.Variable)
		if variable == "" {
			continue
		}
		mark, role := t.marks.Pass, passRole(in.Verdict)
		if c.missing() {
			named = true
			mark, role = t.marks.CouldNotRun, style.RoleUnknown
		}
		rows = append(rows, style.MarkRow(t.Theme, mark, role, variable, credentialFact(c, in.Now, true), width)...)
	}
	if in.Status.Degraded && !named {
		rows = append(rows, style.ContinuationLine(t.Theme, style.RoleUnknown, statusDegraded, colIndent, width)...)
	}
	if len(rows) == 0 {
		return nil
	}
	return append(style.Title(t.Theme, labelCredentials, width), rows...)
}

// labelCredentials titles the site listing's credentials block.
const labelCredentials = "credentials"

// The status line's fragments. They are the strings this file composes a status line from,
// stated once here rather than at the three call sites that print one.
const (
	// statusUnsetJoin opens a missing token's fact, which then names the checks it disabled.
	statusUnsetJoin = "is not set, so "
	// statusUnsetTail closes it in the section vocabulary's words, for a frame whose checks
	// did run.
	statusUnsetTail = " could not run"
	// statusUnsetTailListing closes it where no check was attempted, which is the site listing.
	// The past tense would report a failure that did not happen: the listing ran nothing, and
	// what the missing token costs is the next health run, not this one.
	statusUnsetTailListing = " cannot run"
	// statusReadJoin opens a present token's fact, which then names the store it came from.
	statusReadJoin = "read from the "
	// statusExpiresJoin opens the expiry a provider publishes for a present token.
	statusExpiresJoin = ", expires "
	// statusDegraded is what is left to say when the run is degraded and no missing token was
	// named: a token the checks needed was not there.
	statusDegraded = "some checks could not run for want of a token"
)

// credsRowID is the check whose row the credential detail sits on.
const credsRowID = "creds"

// remainingDays spells a token's remaining life, whole days at a distance and whole hours once a
// day count would round the warning away, the same two units a hold's field spells.
func remainingDays(d time.Duration) string {
	return remaining(max(d, 0))
}

// sanitizeAll returns every string in ss through the render seam.
func sanitizeAll(ss []string) []string {
	out := make([]string, 0, len(ss))
	for _, s := range ss {
		out = append(out, sanitize(s))
	}
	return out
}

// joinWords joins a list the way a sentence does, so a reader takes it as prose rather than as a
// field: commas between, and a serial comma before the trailing "and".
func joinWords(ss []string) string {
	switch len(ss) {
	case 0:
		return ""
	case 1:
		return ss[0]
	case 2:
		return ss[0] + " and " + ss[1]
	default:
		return strings.Join(ss[:len(ss)-1], ", ") + ", and " + ss[len(ss)-1]
	}
}
