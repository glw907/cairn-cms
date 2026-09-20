// Package store reads and writes the site registry: one JSON record per
// site, under a directory the operator's platform and environment
// determine. Every write is atomic (temp file plus rename) and every read
// refuses a symlinked or loosely permissioned path, since a record can
// carry a Cloudflare or GitHub credential reference.
package store

import (
	"fmt"
	"os"
	"path/filepath"
)

// Source names which rule Dir used to resolve the registry directory.
type Source int

const (
	// SourceEnv reports that CAIRN_STATE_DIR set the directory.
	SourceEnv Source = iota
	// SourceUserConfig reports that config (os.UserConfigDir in
	// production) set the directory.
	SourceUserConfig
	// SourceLegacyPOSIX reports that the Node CLI's own
	// ~/.config/cairn/sites directory, found already present on disk, set
	// the directory.
	SourceLegacyPOSIX
)

// String reports Source's name, for --verbose output.
func (s Source) String() string {
	switch s {
	case SourceEnv:
		return "CAIRN_STATE_DIR"
	case SourceUserConfig:
		return "the platform config directory"
	case SourceLegacyPOSIX:
		return "the Node CLI's legacy directory"
	default:
		return "unknown source"
	}
}

// Dir resolves the registry directory. Precedence: CAIRN_STATE_DIR
// (SourceEnv) first; then, if the Node CLI's own ~/.config/cairn/sites
// directory already exists under home, that directory (SourceLegacyPOSIX);
// otherwise config()'s directory plus "cairn/sites" (SourceUserConfig).
// Paths are never merged: the first match wins outright.
//
// The legacy directory outranks config deliberately (conductor ruling
// 2026-09-19): it is where the Node CLI (create-cairn-site) still writes
// records today, so on a platform where config diverges from it (darwin,
// or Linux with XDG_CONFIG_HOME set), it is the live registry, and an
// operator's existing records must never go silently unread. An operator
// who has both directories keeps reading the legacy one for as long as it
// exists; removing it is how an operator moves to the config path.
//
// config is os.UserConfigDir in production and a stub in tests, which is
// what keeps this resolution table testable from a single platform. Dir
// returns an error only when config itself fails and no legacy directory
// exists to fall back on.
func Dir(env func(string) string, config func() (string, error), home string) (string, Source, error) {
	if v := env("CAIRN_STATE_DIR"); v != "" {
		return v, SourceEnv, nil
	}
	legacy := filepath.Join(home, ".config", "cairn", "sites")
	if info, err := os.Stat(legacy); err == nil && info.IsDir() {
		return legacy, SourceLegacyPOSIX, nil
	}
	dir, err := config()
	if err != nil {
		return "", 0, fmt.Errorf("store: resolve registry directory: %w", err)
	}
	return filepath.Join(dir, "cairn", "sites"), SourceUserConfig, nil
}
