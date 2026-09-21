package health

import (
	"errors"
	"time"
)

// Options carries the tunables a Run sweep needs, threaded to every Check so no threshold is a
// literal buried inside a check's own file.
type Options struct {
	// ErrorThreshold is the error-rate check's pass/fail cutoff: a count of matching log events
	// over LogWindow up to and including this value reports OK, and only a count above it reports
	// Failing.
	ErrorThreshold int
	// LogWindow is the lookback window ErrorThreshold is measured over.
	LogWindow time.Duration
	// Now is the sweep's clock, the one time source Run and every check read. A check never calls
	// time.Now itself: a replay through the same Now must produce a byte-identical Report, which
	// a second, uninjected clock inside a check would break silently.
	Now func() time.Time
	// OnCheck, when non-nil, is called once per check as it settles, with its settled
	// CheckResult. Run sweeps sequentially, so the calls arrive in report order, the same order
	// Report.Checks carries. nil is the default every non-interactive caller passes.
	OnCheck func(CheckResult)
}

// Validate reports an error naming the first required field Options left at its zero value, so
// Run cannot silently sweep against a threshold or window of zero.
func (o Options) Validate() error {
	if o.ErrorThreshold == 0 {
		return errors.New("health: Options.ErrorThreshold must be set")
	}
	if o.LogWindow == 0 {
		return errors.New("health: Options.LogWindow must be set")
	}
	if o.Now == nil {
		return errors.New("health: Options.Now must be set")
	}
	return nil
}
