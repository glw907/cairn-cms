package main

import (
	"strings"
	"testing"

	"github.com/creack/pty"
)

// TestListsOnATerminalDrawAndUnderPlainPrintThePipe runs each list command and receipt three
// ways: stdout not a terminal, stdout a pty, and a pty under CAIRN_PLAIN=1. The pty run draws the
// styled view, the other two write the same bytes, and the pipe's are today's. The unit tests above
// hold today's bytes literally; this holds that plain reaches the same path as a pipe.
func TestListsOnATerminalDrawAndUnderPlainPrintThePipe(t *testing.T) {
	controller, tty, err := pty.Open()
	if err != nil {
		t.Skipf("no pty: %v", err)
	}
	t.Cleanup(func() { _ = controller.Close(); _ = tty.Close() })

	build := func(streams, plain bool) deps {
		d := credentialedDeps(t)
		vars := map[string]string{
			"CAIRN_CF_ACCOUNT_ID": testAccountID, "CAIRN_CF_READ_TOKEN": "cf-token", "CAIRN_GH_READ_TOKEN": "gh-token",
			varTerm: "xterm-256color",
		}
		if plain {
			vars[varPlain] = "1"
		}
		d.env = fakeEnv(vars)
		d.transport = adoptRoutes("my-site")
		d.readPassword = fakeReadPassword("secret", nil)
		d.exit = func(int) {}
		if streams {
			d.stdout, d.stderr = tty, tty
		}
		writeTestRecord(t, d, "my-site-a1b2c3", "my-site.example.org", "my-site")
		return d
	}

	for _, args := range [][]string{
		{"sites"}, {"auth", "list"}, {"auth", "set", "CAIRN_GH_READ_TOKEN"}, {"auth", "unset", "CAIRN_GH_READ_TOKEN"}, {"adopt", "list"}, {"auth", "check"},
	} {
		name := strings.Join(args, " ")
		pipe, _, _ := execTree(t, build(false, false), args...)
		onTerm, _, _ := execTree(t, build(true, false), args...)
		plain, _, _ := execTree(t, build(true, true), args...)
		if pipe == "" {
			t.Fatalf("%s: the pipe run wrote nothing, so the comparison proves nothing", name)
		}
		if plain != pipe {
			t.Errorf("%s under CAIRN_PLAIN = %q, want the pipe's %q", name, plain, pipe)
		}
		if onTerm == pipe || !strings.Contains(onTerm, "\x1b[") {
			t.Errorf("%s on a terminal = %q, want the styled view and not the pipe's bytes", name, onTerm)
		}
	}
}
