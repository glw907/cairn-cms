package main

import (
	"encoding/json"
	"errors"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/health"
	"github.com/glw907/cairn-cms/tool/internal/store"
)

// ackDateLayout is the date grammar both an --ack flag and an acknowledgement file's expires
// field accept: a bare calendar date, since an acknowledgement is granted for whole days.
const ackDateLayout = "2006-01-02"

// defaultAckFileName is the acknowledgement file's default name inside the registry directory
// store.Dir resolves, read when the operator names no --ack-file.
const defaultAckFileName = "acknowledgements.json"

// ackFileEntry is one entry's JSON shape inside an acknowledgement file.
type ackFileEntry struct {
	CheckID string `json:"checkId"`
	Expires string `json:"expires"`
}

// ackFilePath resolves the acknowledgement file health reads and sites list skips: the
// operator's own --ack-file when named, otherwise the default name inside dir, the registry
// directory store.Dir resolves.
func ackFilePath(dir string, rf *rootFlags) string {
	if rf.ackFile != "" {
		return rf.ackFile
	}
	return filepath.Join(dir, defaultAckFileName)
}

// parseAckEntry parses one --ack flag value, "<check-id>=<YYYY-MM-DD>".
func parseAckEntry(entry string) (health.Ack, error) {
	id, dateStr, ok := strings.Cut(entry, "=")
	if !ok || id == "" || dateStr == "" {
		return health.Ack{}, ackFlagError(entry)
	}
	expires, err := time.Parse(ackDateLayout, dateStr)
	if err != nil {
		return health.Ack{}, ackFlagError(entry)
	}
	return health.Ack{CheckID: id, Expires: expires}, nil
}

// parseAckFlags parses every --ack flag value into an Ack, in the order the operator gave them.
func parseAckFlags(entries []string) (health.Acks, error) {
	acks := make(health.Acks, 0, len(entries))
	for _, entry := range entries {
		ack, err := parseAckEntry(entry)
		if err != nil {
			return nil, err
		}
		acks = append(acks, ack)
	}
	return acks, nil
}

// loadAckFile reads path's JSON array of acknowledgement entries. A missing file is not an
// error when explicit is false, since most operators have none at the default path; it is an
// error when explicit is true, since the operator named the path themselves.
func loadAckFile(path string, explicit bool) (health.Acks, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			if explicit {
				return nil, ackFileNotFoundError(path)
			}
			return nil, nil
		}
		return nil, ackFileUnreadableError(path, err)
	}

	var raw []ackFileEntry
	if err := json.Unmarshal(data, &raw); err != nil {
		return nil, ackFileMalformedError(path, err)
	}

	acks := make(health.Acks, 0, len(raw))
	for _, entry := range raw {
		if entry.CheckID == "" {
			return nil, ackFileMissingCheckIDError(path)
		}
		if entry.Expires == "" {
			return nil, ackFileMissingExpiryError(path, entry.CheckID)
		}
		expires, err := time.Parse(ackDateLayout, entry.Expires)
		if err != nil {
			return nil, ackFileMalformedDateError(path, entry.CheckID, entry.Expires)
		}
		acks = append(acks, health.Ack{CheckID: entry.CheckID, Expires: expires})
	}
	return acks, nil
}

// mergeAcks combines flag and file acknowledgements, the flag winning on a shared check id: an
// operator overriding a file entry at the command line expects the command-line value to apply.
func mergeAcks(flagAcks, fileAcks health.Acks) health.Acks {
	seen := make(map[string]bool, len(flagAcks))
	merged := make(health.Acks, 0, len(flagAcks)+len(fileAcks))
	for _, ack := range flagAcks {
		seen[ack.CheckID] = true
		merged = append(merged, ack)
	}
	for _, ack := range fileAcks {
		if seen[ack.CheckID] {
			continue
		}
		merged = append(merged, ack)
	}
	return merged
}

// resolveAcks parses f's --ack entries, loads the resolved --ack-file, and merges the two into
// the set health.Run applies.
func resolveAcks(d deps, rf *rootFlags, f healthFlags) (health.Acks, error) {
	flagAcks, err := parseAckFlags(f.acks)
	if err != nil {
		return nil, err
	}
	dir, err := d.registryDir()
	if err != nil {
		return nil, err
	}
	path := ackFilePath(dir, rf)
	fileAcks, err := loadAckFile(path, rf.ackFile != "")
	if err != nil {
		return nil, err
	}
	return mergeAcks(flagAcks, fileAcks), nil
}

// excludeAckFile drops the entry, and any store.List error, whose record path is the same file
// the resolved acknowledgement path names. store.List already skips the default name because
// its stem fails record.ValidateSiteID, but an operator's own --ack-file can carry a
// site-id-shaped stem pointing at a file inside the registry directory: store.List then reads
// it as a record, fails to parse it, and reports it in errs, so both the entry (had it parsed)
// and that error are excluded here by comparing full resolved paths rather than names.
func excludeAckFile(entries []store.Entry, errs []error, dir string, rf *rootFlags) ([]store.Entry, []error) {
	ackPath := filepath.Clean(ackFilePath(dir, rf))

	ackID := ""
	if stem, ok := strings.CutSuffix(filepath.Base(ackPath), ".json"); ok {
		if filepath.Clean(filepath.Join(dir, stem+".json")) == ackPath {
			ackID = stem
		}
	}

	outEntries := make([]store.Entry, 0, len(entries))
	for _, e := range entries {
		if filepath.Clean(filepath.Join(dir, e.ID+".json")) == ackPath {
			continue
		}
		outEntries = append(outEntries, e)
	}

	outErrs := make([]error, 0, len(errs))
	for _, err := range errs {
		if ackID != "" && strings.Contains(err.Error(), "store: "+ackID+":") {
			continue
		}
		outErrs = append(outErrs, err)
	}
	return outEntries, outErrs
}

// The six errors above (ackFlagError, ackFileNotFoundError, ackFileMalformedError,
// ackFileMissingCheckIDError, ackFileMissingExpiryError, ackFileMalformedDateError) are defined
// in cmd/cairn/messages.go: the catalogue carries no row for a malformed or missing
// acknowledgement entry, so each is new to that table, reviewed at the 1.0 editorial gate.
