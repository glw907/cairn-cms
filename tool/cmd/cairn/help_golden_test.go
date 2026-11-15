package main

import (
	"bytes"
	"context"
	"flag"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"testing"

	"github.com/charmbracelet/colorprofile"

	"github.com/glw907/cairn-cms/tool/v2/internal/style"
)

var updateHelp = flag.Bool("update-help", false, "rewrite the help goldens under testdata/help")

// helpProfile is one colour rung the help golden is cut at: the variables that make fang's own
// writer detect it, and the codes the Accent and Muted roles take there.
type helpProfile struct {
	name    string
	profile colorprofile.Profile
	env     map[string]string
	// accent holds the whole codes the Accent role could paint at this rung: the theme's own
	// and colorprofile's downsample of the hex.
	accent []string
	// muted is Muted's code on the dark and the light ground, empty where the rung has none.
	mutedDark, mutedLight string
}

var helpProfiles = []helpProfile{
	{"truecolor", colorprofile.TrueColor, map[string]string{"COLORTERM": "truecolor", "TERM": "xterm-256color"},
		[]string{"38;2;157;132;236", "38;2;114;70;207"}, "38;2;168;164;158", "38;2;97;93;87"},
	{"ansi256", colorprofile.ANSI256, map[string]string{"COLORTERM": "", "TERM": "xterm-256color"},
		[]string{"38;5;141", "38;5;61", "38;5;62"}, "38;5;248", "38;5;241"},
	{"ansi16", colorprofile.ANSI, map[string]string{"COLORTERM": "", "TERM": "xterm"},
		[]string{"35", "94", "95"}, "", ""},
}

var sgrSequence = regexp.MustCompile(`\x1b\[([0-9;]*)m`)

// sgrCodes returns every whole code the SGR sequences in s carry: a parameter on its own, and the
// extended colours 38;5;N, 38;2;r;g;b, and their 48 forms as one code, so their arguments never
// read as the parameters 1 or 35.
func sgrCodes(s string) map[string]bool {
	codes := map[string]bool{}
	for _, m := range sgrSequence.FindAllStringSubmatch(s, -1) {
		params := strings.Split(m[1], ";")
		for i := 0; i < len(params); i++ {
			p := params[i]
			n := 0
			if p == "38" || p == "48" || p == "58" {
				switch {
				case i+1 < len(params) && params[i+1] == "5":
					n = 3
				case i+1 < len(params) && params[i+1] == "2":
					n = 5
				}
			}
			end := min(i+max(n, 1), len(params))
			codes[strings.Join(params[i:end], ";")] = true
			i = end - 1
		}
	}
	return codes
}

// renderHelp draws the root's help through fang at one profile and ground, the way a terminal
// run does.
func renderHelp(t *testing.T, hp helpProfile, dark bool) string {
	t.Helper()
	if runtime.GOOS == "windows" {
		t.Skip("fang's writer detects its profile differently on Windows")
	}
	t.Setenv("CLICOLOR_FORCE", "1")
	t.Setenv("NO_COLOR", "")
	_ = os.Unsetenv("NO_COLOR")
	for k, v := range hp.env {
		t.Setenv(k, v)
	}
	d, _ := testDeps(t)
	var out bytes.Buffer
	cmd := newRootCmd(d)
	cmd.SetOut(&out)
	cmd.SetErr(&out)
	cmd.SetArgs([]string{"--help"})
	if err := fangExecute(context.Background(), cmd, style.NewTheme(dark, hp.profile, false)); err != nil {
		t.Fatal(err)
	}
	return out.String()
}

// TestHelpGolden holds the painted help at every rung and ground: no Accent code, bold present,
// Muted at its rung where the rung has one, and the two grounds painting differently where the
// rung has colour to differ by.
func TestHelpGolden(t *testing.T) {
	rendered := map[string]string{}
	for _, hp := range helpProfiles {
		for _, g := range []struct {
			name string
			dark bool
		}{{"dark", true}, {"light", false}} {
			t.Run(hp.name+"-"+g.name, func(t *testing.T) {
				got := renderHelp(t, hp, g.dark)
				rendered[hp.name+"-"+g.name] = got
				path := filepath.Join("testdata", "help", hp.name+"-"+g.name+".golden")
				if *updateHelp {
					if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
						t.Fatal(err)
					}
					if err := os.WriteFile(path, []byte(got), 0o644); err != nil {
						t.Fatal(err)
					}
				}
				want, err := os.ReadFile(path)
				if err != nil {
					t.Fatalf("%v; run `go test ./cmd/cairn -run TestHelpGolden -update-help`", err)
				}
				if got != string(want) {
					t.Errorf("help differs from %s; run with -update-help and read the diff", path)
				}

				codes := sgrCodes(got)
				for _, accent := range hp.accent {
					if codes[accent] {
						t.Errorf("help carries the Accent code %q", accent)
					}
				}
				if !codes["1"] {
					t.Error("help carries no bold")
				}
				if muted := map[bool]string{true: hp.mutedDark, false: hp.mutedLight}[g.dark]; muted != "" && !codes[muted] {
					t.Errorf("help carries no Muted code %q; codes: %v", muted, codes)
				}
			})
		}
	}
	for _, hp := range helpProfiles {
		if hp.profile == colorprofile.ANSI || rendered[hp.name+"-dark"] == "" {
			continue
		}
		if rendered[hp.name+"-dark"] == rendered[hp.name+"-light"] {
			t.Errorf("%s: the dark help equals the light help", hp.name)
		}
	}
}
