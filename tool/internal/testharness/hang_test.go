package testharness

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

// TestAHungChildIsKilledWithItsGroup proves Run ends a child that outlives RunTimeout and the
// helper it started, so no descendant keeps holding the setup port after the test.
func TestAHungChildIsKilledWithItsGroup(t *testing.T) {
	c := NewCase(t, Config{})
	old := RunTimeout
	RunTimeout = 2 * time.Second
	t.Cleanup(func() { RunTimeout = old })
	pidFile := filepath.Join(c.Dir, "helper.pid")
	start := time.Now()
	r := c.Run("/bin/sh", "-c", "/bin/sleep 300 & echo $! > '"+pidFile+"'; wait")
	if time.Since(start) > 30*time.Second {
		t.Fatalf("Run took %v, want it to end near RunTimeout", time.Since(start))
	}
	if r.ExitCode == 0 {
		t.Errorf("a killed child exited 0")
	}
	data, err := os.ReadFile(pidFile)
	if err != nil {
		t.Fatal(err)
	}
	proc := "/proc/" + strings.TrimSpace(string(data))
	for range 50 {
		if _, err := os.Stat(proc); err != nil {
			return
		}
		time.Sleep(100 * time.Millisecond)
	}
	t.Errorf("the helper %s is still running after Run returned", proc)
}
