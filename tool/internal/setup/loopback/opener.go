package loopback

import (
	"fmt"
	"os/exec"
	"strings"
	"time"
)

// OpenTimeout is how long Open waits for a launcher to exit before it counts the launch as made.
const OpenTimeout = 5 * time.Second

// Remote reports whether setup should stop before opening a browser, because the browser would
// open on a machine the owner is not at, or nowhere. goos is a runtime.GOOS value and env holds
// the environment by name, where an empty value counts as unset.
//
// An SSH session stops on every system. Linux with no BROWSER override stops when neither
// DISPLAY nor WAYLAND_DISPLAY is set. macOS never stops on DISPLAY, which the macOS desktop does
// not set.
func Remote(goos string, env map[string]string) bool {
	if env["SSH_CONNECTION"] != "" || env["SSH_TTY"] != "" {
		return true
	}
	if goos != "linux" || strings.TrimSpace(env["BROWSER"]) != "" {
		return false
	}
	return env["DISPLAY"] == "" && env["WAYLAND_DISPLAY"] == ""
}

// Launcher returns the command line that opens url on goos. A BROWSER in env wins: it is split on
// spaces, a %s in it takes the URL, and otherwise the URL goes last. Without one, Linux runs
// xdg-open, macOS runs open, and Windows runs rundll32's FileProtocolHandler.
//
// On Windows the URL is a separate argument to rundll32 and never passes through cmd.exe, which
// reads each & as a command separator and would cut the URL short.
func Launcher(goos string, env map[string]string, url string) []string {
	if argv := strings.Fields(env["BROWSER"]); len(argv) > 0 {
		placed := false
		for i, arg := range argv {
			if strings.Contains(arg, "%s") {
				argv[i] = strings.ReplaceAll(arg, "%s", url)
				placed = true
			}
		}
		if !placed {
			argv = append(argv, url)
		}
		return argv
	}
	switch goos {
	case "darwin":
		return []string{"open", url}
	case "windows":
		return []string{"rundll32", "url.dll,FileProtocolHandler", url}
	}
	return []string{"xdg-open", url}
}

// Open runs argv, a command line from Launcher, with its standard streams on the null device. A
// text-mode browser then can neither read nor draw on the owner's terminal. A missing launcher, or
// one that exits non-zero, returns an error naming the launcher and never the URL, and the view
// shows it beside the fallback link. A launcher still running after timeout is left running and
// counts as opened: a browser started directly keeps running until the owner closes it.
func Open(argv []string, timeout time.Duration) error {
	cmd := exec.Command(argv[0], argv[1:]...)
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("start browser launcher %s: %w", argv[0], err)
	}
	done := make(chan error, 1)
	go func() { done <- cmd.Wait() }()
	select {
	case err := <-done:
		if err != nil {
			return fmt.Errorf("browser launcher %s: %w", argv[0], err)
		}
		return nil
	case <-time.After(timeout):
		return nil
	}
}
