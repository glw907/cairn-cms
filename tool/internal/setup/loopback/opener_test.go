package loopback

import (
	"os"
	"path/filepath"
	"slices"
	"strings"
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
		// A placeholder in the command's own place would run the URL as a program.
		{"BROWSER of a placeholder alone", "linux", map[string]string{"BROWSER": "%s"}, nil},
		{"BROWSER with a placeholder for the command", "linux", map[string]string{"BROWSER": "%s --new-tab"}, nil},
		{"BROWSER with a placeholder inside the command", "darwin", map[string]string{"BROWSER": "/opt/%s/walker"}, nil},
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
	case "env":
		_ = os.WriteFile(os.Getenv("LOOPBACK_ENV_FILE"), []byte(strings.Join(os.Environ(), "\n")), 0o600)
		os.Exit(0)
	}
}

// TestOpenHandsTheBrowserNoSecret pins that the launcher, and so the browser it starts, never
// inherits a variable that holds a credential.
func TestOpenHandsTheBrowserNoSecret(t *testing.T) {
	path := filepath.Join(t.TempDir(), "env")
	t.Setenv("LOOPBACK_HELPER", "env")
	t.Setenv("LOOPBACK_ENV_FILE", path)
	t.Setenv("KEEP_ME", "kept")
	secret := map[string]string{
		"CLOUDFLARE_API_TOKEN":   "s1",
		"GH_TOKEN":               "s2",
		"GITHUB_TOKEN":           "s3",
		"CAIRN_CLOUDFLARE_TOKEN": "s4",
		"NPM_TOKEN":              "s5",
		"AWS_SECRET":             "s6",
		"DB_PASSWORD":            "s7",
		"app_client_secret":      "s8",
	}
	for name, v := range secret {
		t.Setenv(name, "value-"+v)
	}
	if err := Open(helperArgv(), 5*time.Second); err != nil {
		t.Fatalf("Open: %v", err)
	}
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("the launcher wrote no environment: %v", err)
	}
	env := string(data)
	for name, v := range secret {
		if strings.Contains(env, "value-"+v) {
			t.Errorf("the launcher inherited %s", name)
		}
	}
	if !strings.Contains(env, "KEEP_ME=kept") {
		t.Error("the launcher lost a variable that holds no secret")
	}
}

func helperArgv() []string {
	return []string{os.Args[0], "-test.run=^TestHelperProcess$"}
}

func TestOpen(t *testing.T) {
	const secret = "https://127.0.0.1:49152/?k=0123456789abcdef0123456789abcdef"
	missing := filepath.Join(t.TempDir(), "no-such-launcher")
	tests := []struct {
		name    string
		helper  string
		argv    []string
		wantErr bool
	}{
		{"a launcher that succeeds", "exit0", helperArgv(), false},
		{"a launcher that exits 1", "exit1", append(helperArgv(), secret), true},
		{"a launcher still running at the timeout", "linger", helperArgv(), false},
		{"a missing launcher", "", []string{missing, secret}, true},
		{"no launcher", "", nil, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv("LOOPBACK_HELPER", tt.helper)
			err := Open(tt.argv, 500*time.Millisecond)
			if (err != nil) != tt.wantErr {
				t.Fatalf("Open: %v, want error %v", err, tt.wantErr)
			}
			if err == nil || len(tt.argv) == 0 {
				return
			}
			// The error names the launcher by its base name and quotes nothing else from argv.
			msg := err.Error()
			if !strings.Contains(msg, filepath.Base(tt.argv[0])) {
				t.Errorf("error %q does not name the launcher %s", msg, filepath.Base(tt.argv[0]))
			}
			if dir := filepath.Dir(tt.argv[0]); strings.Contains(msg, dir) {
				t.Errorf("error %q quotes the launcher's directory %s", msg, dir)
			}
			for _, arg := range tt.argv[1:] {
				if strings.Contains(msg, arg) {
					t.Errorf("error %q quotes the argument %q", msg, arg)
				}
			}
		})
	}
}

func TestOpenRefusesAPlaceholderBROWSER(t *testing.T) {
	argv := Launcher("linux", map[string]string{"BROWSER": "%s"}, "https://127.0.0.1:49152/?k=secret")
	err := Open(argv, 500*time.Millisecond)
	if err == nil {
		t.Fatal("Open ran a BROWSER of a placeholder alone")
	}
	if strings.Contains(err.Error(), "secret") {
		t.Errorf("error %q quotes the URL", err)
	}
}
