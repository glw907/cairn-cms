package loopback

import (
	"os/exec"
	"syscall"
)

// detach starts cmd in a process group of its own. The terminal sends Ctrl+C's SIGINT to its
// foreground process group, which is setup's, so the launcher and any browser it execs are spared.
func detach(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
}
