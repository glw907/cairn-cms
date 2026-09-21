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

// find returns the first entry in a whose CheckID is id, regardless of whether it has expired,
// and whether one was found. Expiry is left to the caller so an expired match can still record
// its own expiry in a CheckResult, which is how a rendered report names an acknowledgement as
// expired rather than simply absent.
func (a Acks) find(id string) (Ack, bool) {
	for _, ack := range a {
		if ack.CheckID == id {
			return ack, true
		}
	}
	return Ack{}, false
}
