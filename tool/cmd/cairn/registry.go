package main

import (
	"fmt"
	"os"

	"github.com/glw907/cairn-cms/tool/internal/store"
)

// registryDirAndSource is the one place store.Dir's three arguments are assembled, so
// defaultRegistryDir and defaultRegistrySource cannot drift into resolving two different
// directories.
func registryDirAndSource() (string, store.Source, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", 0, fmt.Errorf("resolve home directory: %w", err)
	}
	return store.Dir(osEnviron, os.UserConfigDir, home)
}

// defaultRegistryDir resolves the registry directory the way every other command does, through
// store.Dir's own precedence.
func defaultRegistryDir() (string, error) {
	dir, _, err := registryDirAndSource()
	return dir, err
}

// defaultRegistrySource resolves the same directory as defaultRegistryDir, alongside the
// store.Source that chose it, for sites list --verbose.
func defaultRegistrySource() (string, store.Source, error) {
	return registryDirAndSource()
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
