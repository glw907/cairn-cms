// Package exe names a built executable for the platform it will run on and builds it. It exists
// because `go build -o <path>` writes exactly the path it is given, with no .exe suffix of its
// own when the path names a file, and Windows will not execute a file without one. Two callers
// build the cairn binary and then run it (cmd/mangen harvests the tree from the real binary's own
// --help, and cmd/cairn's usage tests need the real process for its exit code); both went red on
// the Windows CI leg with "executable file not found in %PATH%" until this was one function.
package exe

import (
	"fmt"
	"os/exec"
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

// Build compiles cmd/cairn from moduleRoot (this module's own root, wherever the caller's own
// working directory happens to sit) into dir and returns the built binary's path.
func Build(moduleRoot, dir string) (string, error) {
	bin := Path(dir, "cairn")
	cmd := exec.Command("go", "build", "-o", bin, "./cmd/cairn")
	cmd.Dir = moduleRoot
	if out, err := cmd.CombinedOutput(); err != nil {
		return "", fmt.Errorf("go build: %w: %s", err, out)
	}
	return bin, nil
}
