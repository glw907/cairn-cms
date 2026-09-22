package doctor

import (
	"fmt"
	"path/filepath"
	"time"
)

// OriginSource names which precedence rule produced Snapshot.PublicOrigin's value, or that
// neither did.
type OriginSource int

// The origin sources config.public-origin and ai.posture-effective both consult, in precedence
// order, plus the absent case.
const (
	// OriginAbsent means neither vars.PUBLIC_ORIGIN nor the environment named an origin.
	OriginAbsent OriginSource = iota
	// OriginFromVars means the resolved origin came from vars.PUBLIC_ORIGIN, the
	// higher-precedence source.
	OriginFromVars
	// OriginFromEnv means the resolved origin came from the process environment.
	OriginFromEnv
)

// PublicOrigin is the site's resolved public origin, or its typed absence.
type PublicOrigin struct {
	// Value is the resolved origin. Empty when Source is OriginAbsent.
	Value string
	// Source names which precedence rule produced Value.
	Source OriginSource
}

// RobotsAbsentReason names why Snapshot.Robots carries no body. It is read only when
// Robots.Present is false.
type RobotsAbsentReason int

// The reasons a robots.txt fetch can come back empty.
const (
	// RobotsAbsentNoOrigin means the snapshot carries no public origin to fetch from.
	RobotsAbsentNoOrigin RobotsAbsentReason = iota + 1
	// RobotsAbsentUnparsedOrigin means the resolved origin does not parse as a URL.
	RobotsAbsentUnparsedOrigin
	// RobotsAbsentTransportFailure means the fetch itself failed: a timeout, a DNS failure, a
	// refused connection.
	RobotsAbsentTransportFailure
	// RobotsAbsentNonOK means the origin answered with a non-200 status.
	RobotsAbsentNonOK
)

// Robots is the fetched robots.txt body, or its typed absence.
type Robots struct {
	// Body is the fetched robots.txt text. Empty when Present is false.
	Body string
	// Present reports whether Body was fetched. False means Reason names why.
	Present bool
	// Reason is read only when Present is false.
	Reason RobotsAbsentReason
}

// Snapshot is one doctor run's already-gathered inputs: every check reads from it and performs
// no network call and reads no clock of its own. The command layer fills PublicOrigin, Robots,
// and At before any check runs; NewSnapshot fills only Dir.
type Snapshot struct {
	// Dir is the resolved, symlink-free absolute path to the directory being examined. Every
	// file read a check makes through ReadFile is measured against this boundary.
	Dir string
	// PublicOrigin is the site's resolved public origin, or its typed absence.
	PublicOrigin PublicOrigin
	// Robots is the fetched robots.txt body, or its typed absence.
	Robots Robots
	// At is the run's own instant, stamped once.
	At time.Time
}

// NewSnapshot resolves dir once via filepath.EvalSymlinks and returns a Snapshot whose Dir is
// that resolved path, the boundary every later containment check compares against. It fills no
// other field.
func NewSnapshot(dir string) (Snapshot, error) {
	resolved, err := filepath.EvalSymlinks(dir)
	if err != nil {
		return Snapshot{}, fmt.Errorf("resolve directory %s: %w", dir, err)
	}
	return Snapshot{Dir: resolved}, nil
}

// ReadFile reads the file at relPath inside s.Dir, refusing any path that resolves outside it,
// even through a symlink. See ReadUnder for the exact contract.
func (s Snapshot) ReadFile(relPath string) (body []byte, ok bool, err error) {
	return ReadUnder(s.Dir, relPath)
}
