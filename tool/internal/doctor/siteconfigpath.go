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

// SiteConfigPath returns the canonical site-config path baked into the shipped mirror
// (site-config-path.json), the same value packages/create-cairn-site/src/substitute.mjs bakes
// into a scaffolded site. It panics if the embedded file fails to parse or fails the four shape
// rules substitute.mjs's verifySiteConfigPath enforces: a bad shipped file is a build-time
// defect, so this fails loudly on first use rather than degrading a single check.
func SiteConfigPath() string {
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

// validateSiteConfigPathShape applies the four rules ported from
// packages/create-cairn-site/src/substitute.mjs's verifySiteConfigPath: non-empty, no leading
// slash, no NUL byte, no ".." segment.
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
