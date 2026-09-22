package doctor

import (
	"fmt"

	"go.yaml.in/yaml/v3"
)

// siteConfigStatus enumerates what SiteConfig found: whether a candidate path held a file and,
// if so, whether that file satisfied the parse predicate this package narrows to. It carries no
// status word of its own: check_siteconfig.go maps it onto config.site-config's status words
// (pass, fail, unchecked), which keeps the file read and the status decision in separate
// files.
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

// siteConfigOutcome is one SiteConfig call's result.
type siteConfigOutcome struct {
	// Status is what SiteConfig found.
	Status siteConfigStatus
	// Path is the candidate path the file was read from. Empty when Status is
	// siteConfigNotFound.
	Path string
	// Reason explains a siteConfigInvalid outcome: the YAML parse error, or which shape rule
	// failed. Empty for every other Status.
	Reason string
}

// siteConfigPaths returns the four candidate paths a site's site.config.yaml can live at, in
// lookup order: the canonical path from siteConfigPath, then the three legacy locations older
// production sites still use. Mirrors src/lib/doctor/checks-local.ts's SITE_CONFIG_PATHS.
func siteConfigPaths() []string {
	return []string{
		siteConfigPath(),
		"site.config.yaml",
		"src/lib/site.config.yaml",
		"src/site.config.yaml",
	}
}

// SiteConfig reads the first site.config.yaml found at one of siteConfigPaths inside s.Dir and
// reports whether it satisfies this package's narrowed parse predicate: valid YAML, a mapping
// root, and a non-empty siteName. It reads no other field of the file: the per-concept URL
// policy and every other site-config value are out of this check's narrowed scope.
func (s Snapshot) siteConfig() (siteConfigOutcome, error) {
	for _, path := range siteConfigPaths() {
		body, ok, err := s.ReadFile(path)
		if err != nil {
			return siteConfigOutcome{}, err
		}
		if !ok {
			continue
		}
		status, reason := parseSiteConfigBody(body)
		return siteConfigOutcome{Status: status, Path: path, Reason: reason}, nil
	}
	return siteConfigOutcome{Status: siteConfigNotFound}, nil
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
