package main

import (
	"errors"
	"fmt"
	"os"

	"github.com/glw907/cairn-cms/tool/internal/store"
)

// defaultRegistryDir resolves the registry directory the way every other command does, through
// store.Dir's own precedence.
func defaultRegistryDir() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("resolve home directory: %w", err)
	}
	dir, _, err := store.Dir(osEnviron, os.UserConfigDir, home)
	return dir, err
}

// openRegistry opens the registry d points at. It is the one path from a command to the store,
// so a command holds no directory resolution of its own.
func openRegistry(d deps) (*store.Store, error) {
	dir, err := d.registryDir()
	if err != nil {
		return nil, err
	}
	return store.Open(dir)
}

// registrySite names one repository a registry record points at.
type registrySite struct {
	id, owner, repo string
}

// discoverSites reads every record in dir's registry and returns the sites whose GitHub
// repository is known, in list order. A record the store cannot parse is skipped; a record with
// no adopted repository yet carries nothing a token probe can check and is skipped too.
func discoverSites(dir string) ([]registrySite, error) {
	s, err := store.Open(dir)
	if err != nil {
		return nil, fmt.Errorf("open registry: %w", err)
	}
	entries, errs := s.List()
	if len(errs) > 0 {
		return nil, fmt.Errorf("list registry: %w", errors.Join(errs...))
	}
	var sites []registrySite
	for _, e := range entries {
		owner, repo := e.Record.GitHub.Repo.Owner, e.Record.GitHub.Repo.Repo
		if owner == "" || repo == "" {
			continue
		}
		sites = append(sites, registrySite{id: e.ID, owner: owner, repo: repo})
	}
	return sites, nil
}
