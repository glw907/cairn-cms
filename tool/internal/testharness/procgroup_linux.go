package testharness

import (
	"os/exec"
	"syscall"
)

// ownGroup starts cmd in a separate process group and makes cancelling its context kill the
// whole group, so a child's helpers (the browser walker, git) end with it and no descendant
// outlives the test holding a port or an inherited file descriptor.
func ownGroup(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	cmd.Cancel = func() error {
		return syscall.Kill(-cmd.Process.Pid, syscall.SIGKILL)
	}
}
