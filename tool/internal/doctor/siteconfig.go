package doctor

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"slices"
	"strings"

	"go.yaml.in/yaml/v3"
)

// siteConfigStatus enumerates what siteConfig found: whether a candidate path held a file and,
// if so, whether that file satisfied the parse predicate this package narrows to. It carries no
// status word: configSiteConfig maps it onto config.site-config's status words (pass,
// fail, unchecked).
type siteConfigStatus int

const (
	// siteConfigNotFound means no path in siteConfigPaths held a file.
	siteConfigNotFound siteConfigStatus = iota
	// siteConfigInvalid means a file was found but failed the parse predicate: it was not
	// valid YAML, its root was not a mapping, or its root mapping's siteName was empty.
	// siteConfigOutcome.Reason names which.
	siteConfigInvalid
	// siteConfigValid means a file was found, parsed as YAML, and its root mapping carried a
	// non-empty siteName.
	siteConfigValid
)

// siteConfigOutcome is one siteConfig call's result.
type siteConfigOutcome struct {
	// Status is what siteConfig found.
	Status siteConfigStatus
	// Reason explains a siteConfigInvalid outcome: the YAML parse error, or which shape rule
	// failed. Empty for every other Status.
	Reason string
}

// siteConfigPaths returns the five candidate paths a site's site.config.yaml can live at, in lookup
// order: the canonical path from siteConfigPath, then the four legacy locations older sites still
// use, src/theme/ among them (the canonical path before the site-owned directory moved to src/site/).
func siteConfigPaths() []string {
	return []string{
		siteConfigPath(),
		"site.config.yaml",
		"src/lib/site.config.yaml",
		"src/site.config.yaml",
		"src/theme/site.config.yaml",
	}
}

// siteConfig reads the first site.config.yaml found at one of siteConfigPaths inside s.Dir and
// reports whether it satisfies this package's narrowed parse predicate: valid YAML, a mapping
// root, and a non-empty siteName. It reads no other field of the file: the per-concept URL
// policy and every other site-config value are out of this check's narrowed scope.
func (s Snapshot) siteConfig() (siteConfigOutcome, error) {
	body, _, found, err := s.readFirst(siteConfigPaths())
	if err != nil {
		return siteConfigOutcome{}, err
	}
	if !found {
		return siteConfigOutcome{Status: siteConfigNotFound}, nil
	}
	status, reason := parseSiteConfigBody(body)
	return siteConfigOutcome{Status: status, Reason: reason}, nil
}

// parseSiteConfigBody applies the narrowed predicate to a found file's body: it must parse as
// YAML, its root must be a mapping, and that mapping's siteName must be a non-empty string.
func parseSiteConfigBody(body []byte) (siteConfigStatus, string) {
	var root any
	if err := yaml.Unmarshal(body, &root); err != nil {
		return siteConfigInvalid, fmt.Sprintf("does not parse as YAML: %v", err)
	}
	mapping, ok := root.(map[string]any)
	if !ok {
		return siteConfigInvalid, "root is not a mapping"
	}
	siteName, _ := mapping["siteName"].(string)
	if siteName == "" {
		return siteConfigInvalid, "siteName is empty"
	}
	return siteConfigValid, ""
}

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
