package loopback

import (
	"os"
	"path/filepath"
	"slices"
	"testing"
	"time"
)

func TestRemote(t *testing.T) {
	tests := []struct {
		name string
		goos string
		env  map[string]string
		want bool
	}{
		{"Linux desktop on X11", "linux", map[string]string{"DISPLAY": ":0"}, false},
		{"Linux desktop on Wayland", "linux", map[string]string{"WAYLAND_DISPLAY": "wayland-0"}, false},
		{"Linux with no display", "linux", map[string]string{}, true},
		{"Linux with empty display variables", "linux", map[string]string{"DISPLAY": "", "WAYLAND_DISPLAY": ""}, true},
		{"Linux with no display and a BROWSER", "linux", map[string]string{"BROWSER": "w3m-helper"}, false},
		{"Linux with no display and a blank BROWSER", "linux", map[string]string{"BROWSER": "  "}, true},
		{"SSH_TTY set on a Linux desktop", "linux", map[string]string{"DISPLAY": ":0", "SSH_TTY": "/dev/pts/3"}, true},
		{"SSH_CONNECTION set on a Linux desktop", "linux", map[string]string{"DISPLAY": ":0", "SSH_CONNECTION": "10.0.0.2 5 10.0.0.1 22"}, true},
		{"SSH with a BROWSER set", "linux", map[string]string{"BROWSER": "firefox", "SSH_TTY": "/dev/pts/3"}, true},
		{"macOS with no DISPLAY", "darwin", map[string]string{}, false},
		{"macOS over SSH", "darwin", map[string]string{"SSH_TTY": "/dev/ttys001"}, true},
		{"Windows", "windows", map[string]string{}, false},
		{"Windows over SSH", "windows", map[string]string{"SSH_CONNECTION": "10.0.0.2 5 10.0.0.1 22"}, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := Remote(tt.goos, tt.env); got != tt.want {
				t.Errorf("Remote(%q, %v) = %v, want %v", tt.goos, tt.env, got, tt.want)
			}
		})
	}
}

func TestLauncher(t *testing.T) {
	const url = "https://github.com/apps/x/installations/new/permissions?suggested_target_id=1&repository_ids[]=2"
	tests := []struct {
		name string
		goos string
		env  map[string]string
		want []string
	}{
		{"Linux", "linux", nil, []string{"xdg-open", url}},
		{"macOS", "darwin", nil, []string{"open", url}},
		{"Windows keeps the URL whole past its ampersand", "windows", nil, []string{"rundll32", "url.dll,FileProtocolHandler", url}},
		{"BROWSER wins on Linux", "linux", map[string]string{"BROWSER": "firefox"}, []string{"firefox", url}},
		{"BROWSER wins on macOS", "darwin", map[string]string{"BROWSER": "/opt/walker"}, []string{"/opt/walker", url}},
		{"BROWSER wins on Windows", "windows", map[string]string{"BROWSER": "walker.exe"}, []string{"walker.exe", url}},
		{"BROWSER with arguments", "linux", map[string]string{"BROWSER": "firefox --new-tab"}, []string{"firefox", "--new-tab", url}},
		{"BROWSER with a placeholder", "linux", map[string]string{"BROWSER": "firefox --url=%s"}, []string{"firefox", "--url=" + url}},
		{"blank BROWSER is ignored", "linux", map[string]string{"BROWSER": " "}, []string{"xdg-open", url}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := Launcher(tt.goos, tt.env, url); !slices.Equal(got, tt.want) {
				t.Errorf("Launcher = %q, want %q", got, tt.want)
			}
		})
	}
}

// TestLauncherOnWindowsSkipsTheShell pins the cause of BACKLOG #338: cmd.exe reads & as a command
// separator, so no Windows launcher may route the URL through it.
func TestLauncherOnWindowsSkipsTheShell(t *testing.T) {
	argv := Launcher("windows", nil, "https://a.example/?x=1&y=2&z=3")
	if len(argv) == 0 {
		t.Fatal("no Windows launcher")
	}
	for _, arg := range argv {
		if arg == "cmd" || arg == "cmd.exe" || arg == "/c" || arg == "start" {
			t.Fatalf("Windows launcher %q goes through the shell", argv)
		}
	}
	if argv[len(argv)-1] != "https://a.example/?x=1&y=2&z=3" {
		t.Errorf("last argument %q, want the URL unchanged", argv[len(argv)-1])
	}
}

// TestHelperProcess is the launcher Open runs in these tests, not a test of its own: it exits with
// the behavior LOOPBACK_HELPER names.
func TestHelperProcess(t *testing.T) {
	switch os.Getenv("LOOPBACK_HELPER") {
	case "":
		return
	case "exit0":
		os.Exit(0)
	case "exit1":
		os.Exit(1)
	case "linger":
		time.Sleep(3 * time.Second)
		os.Exit(0)
	}
}

func helperArgv() []string {
	return []string{os.Args[0], "-test.run=^TestHelperProcess$"}
}

func TestOpen(t *testing.T) {
	tests := []struct {
		name    string
		helper  string
		argv    []string
		wantErr bool
	}{
		{"a launcher that succeeds", "exit0", helperArgv(), false},
		{"a launcher that exits 1", "exit1", helperArgv(), true},
		{"a launcher still running at the timeout", "linger", helperArgv(), false},
		{"a missing launcher", "", []string{filepath.Join(t.TempDir(), "no-such-launcher")}, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv("LOOPBACK_HELPER", tt.helper)
			err := Open(tt.argv, 500*time.Millisecond)
			if (err != nil) != tt.wantErr {
				t.Errorf("Open: %v, want error %v", err, tt.wantErr)
			}
		})
	}
}
