package loopback

import (
	"os/exec"
	"testing"
)

func TestDetachSetsANewProcessGroup(t *testing.T) {
	cmd := exec.Command("open")
	detach(cmd)
	if cmd.SysProcAttr == nil || !cmd.SysProcAttr.Setpgid {
		t.Fatalf("SysProcAttr %+v, want Setpgid", cmd.SysProcAttr)
	}
}
