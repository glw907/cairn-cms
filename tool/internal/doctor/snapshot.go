package doctor

import (
	"fmt"
	"path/filepath"
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

// robotsAbsentReason names why Snapshot.Robots carries no body. It is read only when Robots.Present
// is false.
type robotsAbsentReason int

// The reasons a robots.txt fetch can come back empty.
const (
	// robotsAbsentNoOrigin means the snapshot carries no public origin to fetch from.
	robotsAbsentNoOrigin robotsAbsentReason = iota + 1
	// robotsAbsentUnparsedOrigin means the resolved origin does not parse as a URL.
	robotsAbsentUnparsedOrigin
	// robotsAbsentTransportFailure means the fetch itself failed: a timeout, a DNS failure, a
	// refused connection.
	robotsAbsentTransportFailure
	// robotsAbsentNonOK means the origin answered with a non-200 status.
	robotsAbsentNonOK
)

// Robots is the fetched robots.txt body, or its typed absence.
type Robots struct {
	// Body is the fetched robots.txt text. Empty when Present is false.
	Body string
	// Present reports whether Body was fetched. False means Reason names why.
	Present bool
	// Reason is read only when Present is false.
	Reason robotsAbsentReason
}

// Snapshot is one doctor run's already-gathered inputs: every check reads from it and performs no
// network call and reads no clock of its own. The command layer fills PublicOrigin and Robots
// before any check runs; NewSnapshot fills only Dir.
type Snapshot struct {
	// Dir is the resolved, symlink-free directory being examined, absolute if the argument was and
	// relative otherwise. Every file read a check makes through readFile is measured against this
	// boundary.
	Dir string
	// PublicOrigin is the site's resolved public origin, or its typed absence.
	PublicOrigin PublicOrigin
	// Robots is the fetched robots.txt body, or its typed absence.
	Robots Robots
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

// readFile reads the file at relPath inside s.Dir, refusing any path that resolves outside it, even
// through a symlink. See readUnder for the exact contract.
func (s Snapshot) readFile(relPath string) (body []byte, ok bool, err error) {
	return readUnder(s.Dir, relPath)
}

// readFirst reads the first of paths that exists inside s.Dir, in order, and returns its body with
// the path it came from. found is false when none exists. A read error on any probed path stops the
// search, so an unreadable earlier candidate is never skipped in favor of a later one.
func (s Snapshot) readFirst(paths []string) (body []byte, path string, found bool, err error) {
	for _, candidate := range paths {
		body, ok, err := s.readFile(candidate)
		if err != nil {
			return nil, "", false, err
		}
		if ok {
			return body, candidate, true, nil
		}
	}
	return nil, "", false, nil
}
