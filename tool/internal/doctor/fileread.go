package doctor

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
)

// cairnModule is the package name a site's package.json must depend on for IsCairnSite to
// recognize it without a wrangler config.
const cairnModule = "@glw907/cairn-cms"

// ReadUnder reads the file at relPath inside dir, refusing any path, including one that escapes
// only through a symlink, that resolves outside dir. dir must already be a resolved, existing
// directory (Snapshot's own Dir, produced by NewSnapshot). ok is false when the file does not
// exist or is a dangling symlink; err is non-nil for a containment refusal or any other read
// failure, a permission-denied file included.
//
// Ported whole from the stronger containment form in src/lib/media-seed/bin.ts (isWithin,
// realpathNearestAncestor, and the two checks their caller makes), not the doctor's own weaker
// textual-prefix form.
func ReadUnder(dir, relPath string) (body []byte, ok bool, err error) {
	candidate := filepath.Join(dir, relPath)
	if !contains(dir, candidate) {
		return nil, false, fmt.Errorf("doctor: refusing to read outside the directory: %s", relPath)
	}

	resolved, err := realpathNearestAncestor(candidate)
	if err != nil {
		return nil, false, err
	}
	if !contains(dir, resolved) {
		return nil, false, fmt.Errorf("doctor: refusing to read outside the directory: %s", relPath)
	}

	b, err := os.ReadFile(candidate)
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			return nil, false, nil
		}
		return nil, false, err
	}
	return b, true, nil
}

// contains reports whether candidate is boundary itself or lives under it. It uses filepath.Rel
// rather than strings.HasPrefix, since HasPrefix wrongly contains a sibling: boundary /a/b would
// contain candidate /a/bc.
func contains(boundary, candidate string) bool {
	rel, err := filepath.Rel(boundary, candidate)
	if err != nil {
		return false
	}
	return rel != ".." && !strings.HasPrefix(rel, ".."+string(filepath.Separator))
}

// realpathNearestAncestor returns path's real, symlink-resolved location. path need not exist:
// the nearest existing ancestor is resolved, and any not-yet-existing trailing segments are
// rejoined unresolved, since nothing can symlink from a path that does not exist. This lets a
// containment check see through a symlink planted anywhere between the nominal path and its real
// location, not only through a literal ".." segment. Mirrors
// src/lib/media-seed/bin.ts's realpathNearestAncestor.
func realpathNearestAncestor(path string) (string, error) {
	resolved, err := filepath.EvalSymlinks(path)
	if err == nil {
		return resolved, nil
	}
	if !errors.Is(err, fs.ErrNotExist) {
		return "", err
	}
	parent := filepath.Dir(path)
	if parent == path {
		return path, nil
	}
	parentResolved, err := realpathNearestAncestor(parent)
	if err != nil {
		return "", err
	}
	return filepath.Join(parentResolved, filepath.Base(path)), nil
}

// IsCairnSite reports whether dir looks like a cairn site: a wrangler.jsonc or wrangler.toml
// file, or a package.json naming cairnModule as a dependency or a devDependency. dir must
// already be resolved, the same precondition ReadUnder carries.
func IsCairnSite(dir string) bool {
	for _, name := range []string{"wrangler.jsonc", "wrangler.toml"} {
		if _, ok, err := ReadUnder(dir, name); err == nil && ok {
			return true
		}
	}

	body, ok, err := ReadUnder(dir, "package.json")
	if err != nil || !ok {
		return false
	}
	var pkg struct {
		Dependencies    map[string]string `json:"dependencies"`
		DevDependencies map[string]string `json:"devDependencies"`
	}
	if err := json.Unmarshal(body, &pkg); err != nil {
		return false
	}
	if _, ok := pkg.Dependencies[cairnModule]; ok {
		return true
	}
	_, ok = pkg.DevDependencies[cairnModule]
	return ok
}
