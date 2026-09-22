package store

import (
	"errors"
	"fmt"
)

// Site names one registry record's GitHub repository: the two coordinates a GitHub API call
// takes, alongside the record's own id.
type Site struct {
	// ID is the record's filename stem, the same id health and logs take as their argument.
	ID string
	// Owner and Repo are the record's GitHub repository, split so a caller never has to parse
	// them back out of a combined string.
	Owner, Repo string
}

// Discover reads every record in dir's registry and returns the sites whose GitHub repository is
// known, in list order. It is the one registry walk the module owns, moved here from cmd/cairn's
// own registry.go so health, logs, and the shell completions can share it rather than each
// growing a copy. A record the store cannot parse is skipped; a record with no adopted
// repository yet carries nothing a token probe can check and is skipped too.
func Discover(dir string) ([]Site, error) {
	s, err := Open(dir)
	if err != nil {
		return nil, fmt.Errorf("store: open registry: %w", err)
	}
	entries, errs := s.List()
	if len(errs) > 0 {
		return nil, fmt.Errorf("store: list registry: %w", errors.Join(errs...))
	}
	var sites []Site
	for _, e := range entries {
		owner, repo := e.Record.GitHub.Repo.Owner, e.Record.GitHub.Repo.Repo
		if owner == "" || repo == "" {
			continue
		}
		sites = append(sites, Site{ID: e.ID, Owner: owner, Repo: repo})
	}
	return sites, nil
}
