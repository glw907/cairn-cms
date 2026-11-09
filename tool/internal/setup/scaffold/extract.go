package scaffold

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"errors"
	"fmt"
	"io"
	"path"
	"path/filepath"
	"strings"
)

// extract reads the template out of a verified engine tarball, entirely in memory, so that one
// unsafe entry fails the fetch before any file exists. Only entries under package/template/ are
// read. Each must be a regular file or a directory whose path, below that prefix, is local: a
// link, a device, an absolute path, or one that climbs out is refused, never skipped.
func extract(tgz []byte) (map[string]entry, error) {
	zr, err := gzip.NewReader(bytes.NewReader(tgz))
	if err != nil {
		return nil, fmt.Errorf("scaffold: open the tarball: %w", err)
	}
	defer func() { _ = zr.Close() }()
	tr := tar.NewReader(zr)
	entries := map[string]entry{}
	var total int64
	for {
		hdr, err := tr.Next()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("scaffold: read the tarball: %w", err)
		}
		rel, ok := strings.CutPrefix(hdr.Name, templatePrefix)
		if !ok {
			continue
		}
		rel = strings.TrimSuffix(rel, "/")
		if rel == "" {
			continue
		}
		if strings.ContainsAny(rel, "\\\x00") || !filepath.IsLocal(rel) {
			return nil, fmt.Errorf("%w: %q leaves the template", ErrUnsafeEntry, hdr.Name)
		}
		rel = path.Clean(rel)
		switch hdr.Typeflag {
		case tar.TypeDir:
			entries[rel] = entry{dir: true}
		case tar.TypeReg:
			if hdr.Size > maxFile {
				return nil, fmt.Errorf("%w: %q is larger than %d bytes", ErrUnsafeEntry, hdr.Name, maxFile)
			}
			total += hdr.Size
			if total > maxExtracted {
				return nil, fmt.Errorf("%w: the template is larger than %d bytes", ErrUnsafeEntry, maxExtracted)
			}
			data, err := io.ReadAll(tr)
			if err != nil {
				return nil, fmt.Errorf("scaffold: read %q: %w", hdr.Name, err)
			}
			entries[rel] = entry{data: data, exec: hdr.Mode&0o111 != 0}
		default:
			return nil, fmt.Errorf("%w: %q is neither a file nor a directory (type %q)", ErrUnsafeEntry, hdr.Name, hdr.Typeflag)
		}
	}
	if len(entries) == 0 {
		return nil, errors.New("scaffold: the tarball carries no template")
	}
	for name, e := range entries {
		if e.dir {
			continue
		}
		for dir := path.Dir(name); dir != "."; dir = path.Dir(dir) {
			if p, ok := entries[dir]; ok && !p.dir {
				return nil, fmt.Errorf("%w: %q is both a file and a directory", ErrUnsafeEntry, dir)
			}
		}
	}
	return entries, nil
}
