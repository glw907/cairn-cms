package providers

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
)

// corpusExtractionTrigger names the fixture corpus's own retirement condition
// (packages/create-cairn-site/fixtures/README.md, "When this corpus moves"), quoted in a
// RepoRoot error so a reader sees why the walk failed rather than a bare "file not found".
const corpusExtractionTrigger = "the fixture corpus moves with the Go tool on the day it leaves this repository (packages/create-cairn-site/fixtures/README.md)"

// RepoRoot returns the repository root: the directory holding a package.json whose "name" is
// "@glw907/cairn-cms". It walks up from its caller's own source file directory (the test file
// that called RepoRoot directly, or this package's own directory when reached through Corpus,
// since Corpus is RepoRoot's caller in that path), and returns an error naming
// corpusExtractionTrigger when no such package.json is found. This function takes no
// testing.TB and this file imports no "testing" package, so a caller that is not itself a test
// handles the error explicitly rather than aborting one.
func RepoRoot() (string, error) {
	_, thisFile, _, ok := runtime.Caller(1)
	if !ok {
		return "", fmt.Errorf("providers: resolve caller's source file")
	}
	return repoRootFrom(filepath.Dir(thisFile))
}

// repoRootFrom is RepoRoot's walk, factored out so a test can drive it from a directory of its
// own choosing instead of the real caller's location.
func repoRootFrom(start string) (string, error) {
	dir := start
	for {
		if name, err := packageJSONName(filepath.Join(dir, "package.json")); err == nil && name == "@glw907/cairn-cms" {
			return dir, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return "", fmt.Errorf("providers: no package.json named \"@glw907/cairn-cms\" found walking up from %s; %s", start, corpusExtractionTrigger)
		}
		dir = parent
	}
}

// packageJSONName reads a package.json's "name" field, or returns an error for a missing or
// unparseable file.
func packageJSONName(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	var pkg struct {
		Name string `json:"name"`
	}
	if err := json.Unmarshal(data, &pkg); err != nil {
		return "", err
	}
	return pkg.Name, nil
}

// Corpus reads one fixture from the extraction corpus at
// packages/create-cairn-site/fixtures/<provider>/<name>, resolved through RepoRoot, and returns
// the captured HTTP status alongside the raw "body" bytes, stripped of the
// {"provenance": ..., "body": ...} wrapper every fixture file carries, so a caller's
// json.Unmarshal target never needs to know about provenance.
func Corpus(provider, name string) (status int, body []byte, err error) {
	root, err := RepoRoot()
	if err != nil {
		return 0, nil, err
	}
	path := filepath.Join(root, "packages", "create-cairn-site", "fixtures", provider, name)
	data, err := os.ReadFile(path)
	if err != nil {
		return 0, nil, fmt.Errorf("providers: read fixture %s: %w", path, err)
	}
	var wrapper struct {
		Provenance struct {
			Status int `json:"status"`
		} `json:"provenance"`
		Body json.RawMessage `json:"body"`
	}
	if err := json.Unmarshal(data, &wrapper); err != nil {
		return 0, nil, fmt.Errorf("providers: parse fixture %s: %w", path, err)
	}
	return wrapper.Provenance.Status, wrapper.Body, nil
}
