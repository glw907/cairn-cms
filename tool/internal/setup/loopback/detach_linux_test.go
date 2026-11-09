package loopback

import (
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"testing"
	"time"
)

// TestPgrpHelperProcess is the launcher TestOpenRunsTheLauncherInItsOwnGroup runs, not a test of
// its own: it writes its process group to the file LOOPBACK_PGRP_FILE names.
func TestPgrpHelperProcess(t *testing.T) {
	path := os.Getenv("LOOPBACK_PGRP_FILE")
	if path == "" {
		return
	}
	_ = os.WriteFile(path, []byte(strconv.Itoa(syscall.Getpgrp())), 0o600)
	os.Exit(0)
}

// TestOpenRunsTheLauncherInItsOwnGroup pins that Ctrl+C in setup's terminal, which signals the
// terminal's foreground process group, never reaches a browser the launcher started.
func TestOpenRunsTheLauncherInItsOwnGroup(t *testing.T) {
	path := filepath.Join(t.TempDir(), "pgrp")
	t.Setenv("LOOPBACK_PGRP_FILE", path)
	if err := Open([]string{os.Args[0], "-test.run=^TestPgrpHelperProcess$"}, 5*time.Second); err != nil {
		t.Fatalf("Open: %v", err)
	}
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("the launcher wrote no process group: %v", err)
	}
	child, err := strconv.Atoi(strings.TrimSpace(string(data)))
	if err != nil {
		t.Fatalf("process group %q: %v", data, err)
	}
	if child == syscall.Getpgrp() {
		t.Errorf("the launcher runs in setup's process group %d", child)
	}
}
