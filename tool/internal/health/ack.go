package health

import "time"

// Ack is one operator acknowledgement of a known check verdict: "I know deploy is failing, stop
// paging me about it until Expires." Acknowledgements are data a caller supplies to Run, never a
// check's own decision, so a report stays honest about what it actually measured.
type Ack struct {
	// CheckID is the acknowledged check's stable id.
	CheckID string
	// Expires is when this acknowledgement stops applying.
	Expires time.Time
}

// Acks is an ordered set of Ack entries a Run call applies after every check settles.
type Acks []Ack

// Match returns the first entry in a whose CheckID is id and whose Expires is after now, and
// whether one was found. now is a parameter, not time.Now(), so a caller judges expiry against
// the same clock Run uses for the rest of a sweep, keeping the whole run reproducible.
func (a Acks) Match(id string, now time.Time) (Ack, bool) {
	ack, ok := a.find(id)
	if !ok || !now.Before(ack.Expires) {
		return Ack{}, false
	}
	return ack, true
}

// find returns the first entry in a whose CheckID is id, regardless of whether it has expired,
// and whether one was found. applyAck uses it so an expired match can still record its own
// expiry in a CheckResult; Match layers the expiry check on top for every other caller.
func (a Acks) find(id string) (Ack, bool) {
	for _, ack := range a {
		if ack.CheckID == id {
			return ack, true
		}
	}
	return Ack{}, false
}
