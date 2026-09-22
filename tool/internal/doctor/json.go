package doctor

import (
	"encoding/json"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/render"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// kindDoctor is what this payload declares in its kind field, so a consumer reading a mixed
// stream keys off a field rather than off the shape it happens to see.
const kindDoctor = "doctor"

// The wire state words this payload writes. They are five of the frozen vocabulary
// tool/docs/reference/json-output.md publishes, and the doctor adds none of its own: its own
// info status has no wire word, and is written as a pass carrying a note.
const (
	stateWordPass    = "pass"
	stateWordFail    = "fail"
	stateWordSkip    = "skip"
	stateWordUnknown = "unknown"
)

// payload is one directory preflight on the wire. It is its own kind rather than a health
// payload with different checks: a directory run has no registry record, no credential tier,
// and no acknowledgements, so site, domain, tier, acknowledged, and hold have nothing to hold.
type payload struct {
	SchemaVersion int    `json:"schemaVersion"`
	Kind          string `json:"kind"`
	Verdict       string `json:"verdict"`
	ExitCode      int    `json:"exitCode"`
	// Dir is the resolved, symlink-free directory the run examined, never the argument the
	// operator typed: a consumer correlating two runs needs the path the checks actually read.
	Dir       string         `json:"dir"`
	CheckedAt string         `json:"checkedAt"`
	Checks    []checkPayload `json:"checks"`
}

// checkPayload is one settled doctor check on the wire.
type checkPayload struct {
	CheckID string `json:"checkId"`
	State   string `json:"state"`
	// Reason is mandatory on every skip and every unknown and absent otherwise, the rule the
	// schema's own conditional enforces.
	Reason    string `json:"reason,omitempty"`
	Condition string `json:"condition,omitempty"`
	Detail    string `json:"detail,omitempty"`
	// Note carries an info check's own sentence. An info is written state: pass, since info is
	// not one of the frozen wire words, and this key is how a consumer still tells the two
	// apart. A check carrying a note writes no detail: the note is the whole of what it has to
	// say, and the same sentence under two keys would leave a consumer guessing which to read.
	Note string      `json:"note,omitempty"`
	Fix  *fixPayload `json:"fix,omitempty"`
}

// fixPayload is what clears a failure. It carries no actor and no outward flag, which the health
// payload's fix does: every doctor failure is fixed by the developer editing a checked-in file,
// so neither field could ever hold a second value.
type fixPayload struct {
	Summary string `json:"summary"`
	URL     string `json:"url,omitempty"`
}

// JSONInput is one settled doctor run, as Marshal writes it.
type JSONInput struct {
	// Dir is Snapshot.Dir, the resolved directory every check read.
	Dir string
	// Checked is the run's settled results, in report order. A directory that is not a cairn
	// site settles none, and the payload then carries an empty checks array.
	Checked []CheckedResult
	// Verdict is the run's folded verdict, which is also its exit code.
	Verdict spine.Verdict
	// Now is the instant the run is stamped with.
	Now time.Time
}

// Marshal writes in as cairn doctor's published payload. The wire mapping is deliberately not
// the printed report's: the report prints the doctor's own five status words, and the wire
// writes only the five frozen state words json-output.md publishes.
func Marshal(in JSONInput) ([]byte, error) {
	// A run that settled no check writes an empty array rather than null: a consumer indexing
	// checks reads an empty list as "nothing was measured", where null is a shape it has to
	// special-case.
	checks := make([]checkPayload, 0, len(in.Checked))
	for _, cr := range in.Checked {
		checks = append(checks, wireCheck(cr))
	}
	return json.Marshal(payload{
		SchemaVersion: render.DoctorSchemaVersion,
		Kind:          kindDoctor,
		Verdict:       in.Verdict.String(),
		ExitCode:      int(in.Verdict),
		Dir:           in.Dir,
		CheckedAt:     in.Now.UTC().Format(time.RFC3339),
		Checks:        checks,
	})
}

// wireCheck converts one settled result to its wire form.
//
// Two mappings are worth stating, since neither is visible in the status names. A skip takes
// reason.not-run, the closest fit in the frozen vocabulary: the code says the check did not run,
// which for a directory preflight means its precondition did not apply. An unchecked result
// takes reason.not-observable, which names a check that tried and saw nothing.
func wireCheck(cr CheckedResult) checkPayload {
	out := checkPayload{CheckID: cr.Check.ID, Condition: conditionID(cr.Check.Condition)}
	switch cr.Result.Status {
	case StatusFail:
		out.State = stateWordFail
		out.Detail = cr.Result.Detail
		out.Fix = wireFix(cr.Check.Condition)
	case StatusSkip:
		out.State = stateWordSkip
		out.Reason = string(spine.ReasonNotRun)
		out.Detail = cr.Result.Detail
	case StatusInfo:
		out.State = stateWordPass
		out.Note = cr.Result.Detail
	case StatusUnchecked:
		out.State = stateWordUnknown
		out.Reason = string(spine.ReasonNotObservable)
		out.Detail = cr.Result.Detail
	default:
		out.State = stateWordPass
		out.Detail = cr.Result.Detail
	}
	return out
}

// conditionID renders id for the wire, and the empty string for a check that raises none, which
// omits the key rather than publishing a word outside the frozen condition vocabulary.
func conditionID(id spine.Condition) string {
	if id == spine.ConditionNone {
		return ""
	}
	return string(id)
}

// wireFix builds the fix a failing check publishes, from the condition's own registry entry: the
// remediation sentence the report prints, and the docs section it points at when the mirror
// declares one.
func wireFix(id spine.Condition) *fixPayload {
	if id == spine.ConditionNone {
		return nil
	}
	text := conditionText(id)
	return &fixPayload{Summary: text.Remediation, URL: docsURL(text.DocsAnchor)}
}
