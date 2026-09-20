// Package store reads and writes the site registry: one JSON record per
// site, under a directory the operator's platform and environment
// determine. Every write is atomic (temp file plus rename) and every read
// refuses a symlinked or loosely permissioned path, since a record can
// carry a Cloudflare or GitHub credential reference.
package store

import (
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
// directory already exists under home, that directory (SourceLegacyPOSIX),
// so an operator's existing records on a platform where config diverges
// from that path (darwin, or Linux with XDG_CONFIG_HOME set) are never
// orphaned by the switch to config; otherwise config()'s directory plus
// "cairn/sites" (SourceUserConfig). Paths are never merged: the first
// match wins outright.
//
// config is os.UserConfigDir in production and a stub in tests, which is
// what keeps this resolution table testable from a single platform.
func Dir(env func(string) string, config func() (string, error), home string) (string, Source) {
	if v := env("CAIRN_STATE_DIR"); v != "" {
		return v, SourceEnv
	}
	legacy := filepath.Join(home, ".config", "cairn", "sites")
	if info, err := os.Stat(legacy); err == nil && info.IsDir() {
		return legacy, SourceLegacyPOSIX
	}
	if dir, err := config(); err == nil {
		return filepath.Join(dir, "cairn", "sites"), SourceUserConfig
	}
	return legacy, SourceLegacyPOSIX
}
