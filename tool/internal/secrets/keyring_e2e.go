//go:build cairne2e

// This file exists only under the cairne2e build tag, which the end-to-end harness sets and a
// release build never does. It binds keyringGet, keyringSet, and keyringDelete to a file store
// under the directory CAIRN_E2E_KEYRING_DIR names, one file per entry, so a harness can inspect
// what a run stored and a second process reads what the first wrote. With the variable unset,
// every call fails and Keyring reports ErrKeyringUnavailable: a tagged binary never falls back
// to the real keyring.

package secrets

import (
	"encoding/hex"
	"errors"
	"io/fs"
	"os"
	"path/filepath"
)

// init is the only way a file that exists under one tag can rebind vars the default build
// initializes in keyring.go.
func init() {
	keyringGet = fileGet
	keyringSet = fileSet
	keyringDelete = fileDelete
}

// filePath returns the entry's file, its name the hex of service and name so a slash in a setup
// entry's name never becomes a directory.
func filePath(svc, name string) (string, error) {
	dir := os.Getenv("CAIRN_E2E_KEYRING_DIR")
	if dir == "" {
		return "", errors.New("CAIRN_E2E_KEYRING_DIR is not set")
	}
	return filepath.Join(dir, hex.EncodeToString([]byte(svc+"\x00"+name))), nil
}

func fileGet(svc, name string) (string, error) {
	path, err := filePath(svc, name)
	if err != nil {
		return "", err
	}
	data, err := os.ReadFile(path)
	if errors.Is(err, fs.ErrNotExist) {
		return "", ErrNotFound
	}
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// fileSet writes through a temporary file and a rename, so a reader in another process sees the
// old value or the new one, never a partial write.
func fileSet(svc, name, value string) error {
	path, err := filePath(svc, name)
	if err != nil {
		return err
	}
	tmp, err := os.CreateTemp(filepath.Dir(path), ".entry-*")
	if err != nil {
		return err
	}
	// After the rename the temporary name is gone and this Remove fails harmlessly.
	defer func() { _ = os.Remove(tmp.Name()) }()
	if _, err := tmp.WriteString(value); err != nil {
		_ = tmp.Close()
		return err
	}
	if err := tmp.Sync(); err != nil {
		_ = tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	return os.Rename(tmp.Name(), path)
}

func fileDelete(svc, name string) error {
	path, err := filePath(svc, name)
	if err != nil {
		return err
	}
	err = os.Remove(path)
	if errors.Is(err, fs.ErrNotExist) {
		return ErrNotFound
	}
	return err
}
