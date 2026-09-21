package health

import (
	"errors"
	"time"
)

// Options carries the tunables a Run sweep needs, threaded to every Check so no threshold is a
// literal buried inside a check's own file.
type Options struct {
	// ErrorThreshold is the error-rate check's pass/fail cutoff: a count of matching log events
	// over LogWindow at or above which the check reports Failing.
	ErrorThreshold int
	// LogWindow is the lookback window ErrorThreshold is measured over.
	LogWindow time.Duration
	// OnCheck, when non-nil, is called once per check as it settles, in completion order, with
	// its settled CheckResult. nil is the default every non-interactive caller passes.
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
	return nil
}
