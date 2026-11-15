package doctor

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"slices"
	"strings"
)

//go:embed site-config-path.json
var siteConfigPathJSON []byte

// siteConfigPath returns the canonical site-config path baked into the shipped mirror
// (site-config-path.json), the same value `cairn new` bakes
// into a scaffolded site. It panics if the embedded file fails to parse or fails
// validateSiteConfigPathShape: a bad shipped file is a build-time defect, so this fails loudly
// on first use rather than degrading a single check.
func siteConfigPath() string {
	var payload struct {
		Path string `json:"path"`
	}
	if err := json.Unmarshal(siteConfigPathJSON, &payload); err != nil {
		panic(fmt.Sprintf("doctor: site-config-path.json: %v", err))
	}
	if err := validateSiteConfigPathShape(payload.Path); err != nil {
		panic(fmt.Sprintf("doctor: site-config-path.json: %v", err))
	}
	return payload.Path
}

// validateSiteConfigPathShape rejects a path that is empty, begins with a slash, contains a NUL
// byte, or has a ".." segment.
func validateSiteConfigPathShape(path string) error {
	if path == "" {
		return fmt.Errorf("expected a non-empty string, got %q", path)
	}
	if strings.HasPrefix(path, "/") {
		return fmt.Errorf("must be relative, got %q", path)
	}
	if strings.ContainsRune(path, 0) {
		return fmt.Errorf("must not contain a NUL byte, got %q", path)
	}
	if slices.Contains(strings.Split(path, "/"), "..") {
		return fmt.Errorf("must not contain a \"..\" segment, got %q", path)
	}
	return nil
}
