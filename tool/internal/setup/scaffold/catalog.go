package scaffold

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path"
	"path/filepath"
	"strings"
)

// Theme is one catalog entry. The catalog may carry other fields; the reader ignores them.
type Theme struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	// Path is the theme's directory under the template root.
	Path string `json:"path"`
}

// Catalog returns the themes the template offers, in catalog order.
func (t *Template) Catalog() ([]Theme, error) {
	raw, ok := t.entries["catalog.json"]
	if !ok || raw.dir {
		return nil, errors.New("scaffold: the template has no catalog.json")
	}
	var doc struct {
		Themes []Theme `json:"themes"`
	}
	if err := json.Unmarshal(raw.data, &doc); err != nil {
		return nil, fmt.Errorf("scaffold: decode catalog.json: %w", err)
	}
	if len(doc.Themes) == 0 {
		return nil, errors.New("scaffold: catalog.json lists no themes")
	}
	seen := map[string]bool{}
	for _, th := range doc.Themes {
		if th.ID == "" || seen[th.ID] {
			return nil, fmt.Errorf("scaffold: catalog.json has an empty or repeated theme id %q", th.ID)
		}
		seen[th.ID] = true
		if th.Path == "" || !filepath.IsLocal(th.Path) || strings.ContainsAny(th.Path, "\\\x00") {
			return nil, fmt.Errorf("scaffold: theme %q has an unusable path %q", th.ID, th.Path)
		}
		if !t.hasDir(th.Path) {
			return nil, fmt.Errorf("scaffold: theme %q names %q, which the template does not carry", th.ID, th.Path)
		}
	}
	return doc.Themes, nil
}

// hasDir reports whether any entry lives under dir. npm tarballs carry no directory entries, so
// a directory exists only through its files.
func (t *Template) hasDir(dir string) bool {
	prefix := path.Clean(dir) + "/"
	for name := range t.entries {
		if strings.HasPrefix(name, prefix) {
			return true
		}
	}
	return false
}

// theme picks the catalog entry id names; an empty id names the only entry.
func (t *Template) theme(id string) (Theme, error) {
	themes, err := t.Catalog()
	if err != nil {
		return Theme{}, err
	}
	if id == "" {
		if len(themes) != 1 {
			return Theme{}, errors.New("scaffold: the catalog offers several themes and none was chosen")
		}
		return themes[0], nil
	}
	for _, th := range themes {
		if th.ID == id {
			return th, nil
		}
	}
	return Theme{}, fmt.Errorf("scaffold: the catalog has no theme %q", id)
}

// writeTree writes the files under the theme's directory into dir, which must exist.
func (t *Template) writeTree(dir string, th Theme) error {
	root := path.Clean(th.Path) + "/"
	for name, e := range t.entries {
		rel, ok := strings.CutPrefix(name, root)
		if !ok {
			continue
		}
		dst := filepath.Join(dir, filepath.FromSlash(rel))
		if e.dir {
			if err := os.MkdirAll(dst, 0o755); err != nil {
				return fmt.Errorf("scaffold: create %s: %w", rel, err)
			}
			continue
		}
		if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
			return fmt.Errorf("scaffold: create the folder for %s: %w", rel, err)
		}
		mode := fs.FileMode(0o644)
		if e.exec {
			mode = 0o755
		}
		if err := os.WriteFile(dst, e.data, mode); err != nil {
			return fmt.Errorf("scaffold: write %s: %w", rel, err)
		}
	}
	return nil
}
