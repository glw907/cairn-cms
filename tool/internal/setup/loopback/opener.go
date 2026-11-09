package loopback

import (
	"errors"
	"fmt"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/glw907/cairn-cms/tool/v2/internal/setup/childenv"
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
// spaces, a %s in it takes the URL, and otherwise the URL goes last. A %s in BROWSER's command
// word, as in a BROWSER of %s alone, would run the URL as a program, so Launcher returns nil,
// which Open refuses. Without a BROWSER, Linux runs xdg-open, macOS runs open, and Windows runs
// rundll32's FileProtocolHandler.
//
// On Windows the URL is a separate argument to rundll32 and never passes through cmd.exe, which
// reads each & as a command separator and would cut the URL short.
func Launcher(goos string, env map[string]string, url string) []string {
	if argv := strings.Fields(env["BROWSER"]); len(argv) > 0 {
		if strings.Contains(argv[0], "%s") {
			return nil
		}
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
// text-mode browser then can neither read nor draw on the owner's terminal. The launcher runs in a
// process group of its own, so Ctrl+C in setup's terminal never reaches a browser it started. Its
// environment is setup's without any variable whose name ends in _TOKEN, _SECRET, or _PASSWORD,
// so a browser it starts inherits no credential the owner's shell holds.
//
// The URL, and the one-time key it carries, is an argument to the launcher, so another process
// of the owner's can read it in the process list while the launcher runs. That exposure is
// residual: the key opens the session once, and the owner's browser spends it first.
//
// An empty argv, a missing launcher, or one that exits non-zero returns an error that names the
// launcher by its base name and quotes nothing else from argv, so never the URL; the view shows it
// beside the fallback link. A launcher still running after timeout is left running and counts as
// opened: a browser started directly keeps running until the owner closes it.
func Open(argv []string, timeout time.Duration) error {
	if len(argv) == 0 {
		return errors.New("no browser launcher: BROWSER puts the URL in the command's place")
	}
	name := filepath.Base(argv[0])
	cmd := exec.Command(argv[0], argv[1:]...)
	cmd.Env = childenv.ScrubSecrets(childenv.Map(os.Environ()))
	detach(cmd)
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("start browser launcher %s: %w", name, startCause(err))
	}
	done := make(chan error, 1)
	go func() { done <- cmd.Wait() }()
	select {
	case err := <-done:
		if err != nil {
			return fmt.Errorf("browser launcher %s: %w", name, err)
		}
		return nil
	case <-time.After(timeout):
		return nil
	}
}

// startCause drops the launcher's path, which exec and os quote in a start error, and keeps the
// cause, such as exec.ErrNotFound.
func startCause(err error) error {
	if e, ok := errors.AsType[*exec.Error](err); ok {
		return e.Err
	}
	if e, ok := errors.AsType[*fs.PathError](err); ok {
		return e.Err
	}
	return err
}
