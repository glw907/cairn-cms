package loopback

import (
	"os/exec"
	"testing"

	"golang.org/x/sys/windows"
)

func TestDetachSetsANewProcessGroup(t *testing.T) {
	cmd := exec.Command("rundll32")
	detach(cmd)
	const want = windows.CREATE_NEW_PROCESS_GROUP | windows.DETACHED_PROCESS
	if cmd.SysProcAttr == nil || cmd.SysProcAttr.CreationFlags&want != want {
		t.Fatalf("SysProcAttr %+v, want CREATE_NEW_PROCESS_GROUP and DETACHED_PROCESS", cmd.SysProcAttr)
	}
}
