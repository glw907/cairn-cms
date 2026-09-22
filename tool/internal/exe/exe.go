// Package exe names a built executable for the platform it will run on. It exists because
// `go build -o <path>` writes exactly the path it is given, with no .exe suffix of its own when
// the path names a file, and Windows will not execute a file without one. Two callers build the
// cairn binary and then run it (cmd/mangen harvests the tree from the real binary's own --help,
// and cmd/cairn's usage tests need the real process for its exit code); both went red on the
// Windows CI leg with "executable file not found in %PATH%" until this was one function.
package exe

import (
	"path/filepath"
	"runtime"
)

// Path returns the path to write a built executable named stem to, inside dir.
func Path(dir, stem string) string {
	if runtime.GOOS == "windows" {
		stem += ".exe"
	}
	return filepath.Join(dir, stem)
}
