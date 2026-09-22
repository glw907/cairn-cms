package doctor

import "github.com/glw907/cairn-cms/tool/internal/spine"

// Check is one doctor measurement: a pure function over a Snapshot, holding no client and
// reading no clock of its own. Unlike health.Check (internal/health/health.go), it takes no
// record.Record: a directory preflight has no site record to read.
type Check struct {
	// ID names the check, stable across releases.
	ID string
	// Condition is the cairn-doctor condition id this check's failure raises. A check whose
	// failure raises no catalogued condition leaves this spine.ConditionNone.
	Condition spine.Condition
	// Run measures s and returns the check's settled Result.
	Run func(s Snapshot) Result
}

// Checks is the complete doctor check set, in report order. It is a literal slice, never
// populated by init(), the same shape health.All uses (internal/health/health.go:73-83). It is
// empty until later work registers a check of its own.
var Checks = []Check{}

// Catalogue returns every operator-facing string this package's own checks contribute.
// cmd/copylist lists it alongside health, spine, and cmd/cairn so a new string cannot land
// invisibly. It is empty until a check registers detail or fix text of its own.
func Catalogue() []string {
	return nil
}
