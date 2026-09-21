package spine

// Kind is the Node CLI's own chapter-error classification
// (packages/create-cairn-site/src/{cloudflare,github}/catalogue.mjs's ErrorKind), the input
// FromKind maps onto an Outcome.
type Kind string

// The four Kind values every catalogue row declares.
const (
	KindWait       Kind = "wait"
	KindAct        Kind = "act"
	KindAskSomeone Kind = "ask-someone"
	KindDeclined   Kind = "declined"
)

// FromKind maps a catalogue row's Kind and code onto an Outcome, the spec's table: wait becomes
// Unknown with a park reason built from code, act and ask-someone become Failing with code as
// Detail, and declined becomes OK with code as Detail. 2.0 seam kept on purpose: FromKind has no
// caller in 1.0 by design.
func FromKind(kind Kind, code string) Outcome {
	switch kind {
	case KindWait:
		return Outcome{State: Unknown, Reason: ParkReason(ParkCode(code))}
	case KindAct, KindAskSomeone:
		return Outcome{State: Failing, Detail: code}
	case KindDeclined:
		return Outcome{State: OK, Detail: code}
	default:
		return Outcome{State: Unknown, Reason: ReasonNotObservable}
	}
}
