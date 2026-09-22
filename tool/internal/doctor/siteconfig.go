package doctor

import (
	"fmt"

	"go.yaml.in/yaml/v3"
)

// SiteConfigStatus enumerates what SiteConfig found: whether a candidate path held a file and,
// if so, whether that file satisfied the parse predicate this package narrows to. It carries no
// status word of its own; Task 5's check_siteconfig.go maps it onto config.site-config's status
// words (pass, fail, unchecked).
type SiteConfigStatus int

const (
	// SiteConfigNotFound means no path in SiteConfigPaths held a file.
	SiteConfigNotFound SiteConfigStatus = iota
	// SiteConfigInvalid means a file was found but failed the parse predicate: it was not
	// valid YAML, its root was not a mapping, or its root mapping's siteName was empty.
	// SiteConfigOutcome.Reason names which.
	SiteConfigInvalid
	// SiteConfigValid means a file was found, parsed as YAML, and its root mapping carried a
	// non-empty siteName.
	SiteConfigValid
)

// SiteConfigOutcome is one SiteConfig call's result.
type SiteConfigOutcome struct {
	// Status is what SiteConfig found.
	Status SiteConfigStatus
	// Path is the candidate path the file was read from. Empty when Status is
	// SiteConfigNotFound.
	Path string
	// Reason explains a SiteConfigInvalid outcome: the YAML parse error, or which shape rule
	// failed. Empty for every other Status.
	Reason string
}

// SiteConfigPaths returns the four candidate paths a site's site.config.yaml can live at, in
// lookup order: the canonical path from SiteConfigPath, then the three legacy locations older
// production sites still use. Mirrors src/lib/doctor/checks-local.ts's SITE_CONFIG_PATHS.
func SiteConfigPaths() []string {
	return []string{
		SiteConfigPath(),
		"site.config.yaml",
		"src/lib/site.config.yaml",
		"src/site.config.yaml",
	}
}

// SiteConfig reads the first site.config.yaml found at one of SiteConfigPaths inside s.Dir and
// reports whether it satisfies this package's narrowed parse predicate: valid YAML, a mapping
// root, and a non-empty siteName. It reads no other field of the file: the per-concept URL
// policy and every other site-config value are out of this check's narrowed scope.
func (s Snapshot) SiteConfig() (SiteConfigOutcome, error) {
	for _, path := range SiteConfigPaths() {
		body, ok, err := s.ReadFile(path)
		if err != nil {
			return SiteConfigOutcome{}, err
		}
		if !ok {
			continue
		}
		status, reason := parseSiteConfigBody(body)
		return SiteConfigOutcome{Status: status, Path: path, Reason: reason}, nil
	}
	return SiteConfigOutcome{Status: SiteConfigNotFound}, nil
}

// parseSiteConfigBody applies the narrowed predicate to a found file's body: it must parse as
// YAML, its root must be a mapping, and that mapping's siteName must be a non-empty string.
func parseSiteConfigBody(body []byte) (SiteConfigStatus, string) {
	var root any
	if err := yaml.Unmarshal(body, &root); err != nil {
		return SiteConfigInvalid, fmt.Sprintf("does not parse as YAML: %v", err)
	}
	mapping, ok := root.(map[string]any)
	if !ok {
		return SiteConfigInvalid, "root is not a mapping"
	}
	siteName, _ := mapping["siteName"].(string)
	if siteName == "" {
		return SiteConfigInvalid, "siteName is empty"
	}
	return SiteConfigValid, ""
}
