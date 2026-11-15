package main

import (
	"bytes"
	"testing"

	"github.com/spf13/cobra"

	"github.com/glw907/cairn-cms/tool/v2/internal/health"
	"github.com/glw907/cairn-cms/tool/v2/internal/render"
	"github.com/glw907/cairn-cms/tool/v2/internal/spine"
)

// TestResolveGroundPrecedence holds the order --theme, CAIRN_THEME, COLORFGBG, dark, and that a
// value no source can read falls through to the next rather than erroring.
func TestResolveGroundPrecedence(t *testing.T) {
	tests := []struct {
		name     string
		rf       rootFlags
		env      map[string]string
		wantDark bool
	}{
		{"none set", rootFlags{theme: themeDark}, nil, true},
		{"flag light", rootFlags{theme: themeLight, themeSet: true}, nil, false},
		{"flag light over the variables", rootFlags{theme: themeLight, themeSet: true},
			map[string]string{varTheme: themeDark, varColorFGBG: "15;0"}, false},
		{"explicit flag dark over CAIRN_THEME", rootFlags{theme: themeDark, themeSet: true},
			map[string]string{varTheme: themeLight}, true},
		{"CAIRN_THEME light", rootFlags{theme: themeDark}, map[string]string{varTheme: themeLight}, false},
		{"CAIRN_THEME over COLORFGBG", rootFlags{theme: themeDark},
			map[string]string{varTheme: themeDark, varColorFGBG: "0;15"}, true},
		{"COLORFGBG light background", rootFlags{theme: themeDark}, map[string]string{varColorFGBG: "0;15"}, false},
		{"COLORFGBG slot 7", rootFlags{theme: themeDark}, map[string]string{varColorFGBG: "0;7"}, false},
		{"COLORFGBG dark background", rootFlags{theme: themeDark}, map[string]string{varColorFGBG: "15;0"}, true},
		{"COLORFGBG three fields", rootFlags{theme: themeDark}, map[string]string{varColorFGBG: "0;default;15"}, false},
		{"junk CAIRN_THEME", rootFlags{theme: themeDark}, map[string]string{varTheme: "purple"}, true},
		{"junk CAIRN_THEME falls through", rootFlags{theme: themeDark},
			map[string]string{varTheme: "purple", varColorFGBG: "0;15"}, false},
		{"junk COLORFGBG", rootFlags{theme: themeDark}, map[string]string{varColorFGBG: "white;black"}, true},
		{"empty last COLORFGBG field", rootFlags{theme: themeDark}, map[string]string{varColorFGBG: "15;"}, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			d, _ := testDeps(t)
			d.env = fakeEnv(tt.env)
			if got := resolveGround(d, &tt.rf).dark; got != tt.wantDark {
				t.Errorf("dark = %v, want %v", got, tt.wantDark)
			}
		})
	}
}

// TestFlagBeforeParseCarriesWasGiven holds that --theme dark, which equals the default, still
// beats CAIRN_THEME=light, on both paths a ground is read from: cobra's parse before a command
// runs, and the pre-parse help takes because cobra answers --help before any flag reaches the
// root's flags.
func TestFlagBeforeParseCarriesWasGiven(t *testing.T) {
	d, _ := testDeps(t)
	d.env = fakeEnv(map[string]string{varTheme: themeLight})

	for _, tt := range []struct {
		args     []string
		wantDark bool
	}{
		{[]string{"--theme", "dark"}, true},
		{[]string{"--theme=light"}, false},
		{nil, false},
	} {
		if got := resolveGround(d, preParseFlags(append([]string{"--help"}, tt.args...))).dark; got != tt.wantDark {
			t.Errorf("preparse %v: dark = %v, want %v", tt.args, got, tt.wantDark)
		}

		f := &rootFlags{}
		var ran bool
		cmd := &cobra.Command{
			Use: "probe",
			PersistentPreRunE: func(c *cobra.Command, _ []string) error {
				f.notePassed(c)
				return nil
			},
			RunE: func(*cobra.Command, []string) error { ran = true; return nil },
		}
		cmd.PersistentFlags().StringVar(&f.theme, "theme", themeDark, "")
		cmd.SetArgs(tt.args)
		if err := cmd.Execute(); err != nil || !ran {
			t.Fatalf("command over %v: ran=%v err=%v", tt.args, ran, err)
		}
		if got := resolveGround(d, f).dark; got != tt.wantDark {
			t.Errorf("command %v: dark = %v, want %v", tt.args, got, tt.wantDark)
		}
	}
}

// TestHelpIsAnsweredBeforeThemeIsParsed pins why help needs its own pre-parse: cobra returns on
// --help before PersistentPreRunE, so the root's themeSet is still false.
func TestHelpIsAnsweredBeforeThemeIsParsed(t *testing.T) {
	d, _ := testDeps(t)
	var out bytes.Buffer
	cmd := newRootCmd(d)
	cmd.SetOut(&out)
	cmd.SetErr(&out)
	cmd.SetArgs([]string{"--theme", "dark", "--help"})
	ran := false
	cmd.PersistentPreRunE = func(*cobra.Command, []string) error { ran = true; return nil }
	if err := cmd.Execute(); err != nil {
		t.Fatal(err)
	}
	if ran {
		t.Error("PersistentPreRunE ran before help, so the pre-parse is not needed")
	}
}

// TestGroundReachesTheRenderInput holds that the variables reach a report's frame, not only the
// resolver: CAIRN_THEME=light with no flag renders on the light ground.
func TestGroundReachesTheRenderInput(t *testing.T) {
	d, _ := testDeps(t)
	d.env = fakeEnv(map[string]string{varTheme: themeLight})
	in := renderInput(d, &rootFlags{theme: themeDark, color: colorAlways, width: 80},
		[]health.Report{failingReport()}, spine.VerdictCritical, render.StatusState{})
	if in.Dark {
		t.Error("CAIRN_THEME=light did not reach the render input's ground")
	}
}

// TestPlainIsOnlyExactlyOne holds CAIRN_PLAIN's one value: any other leaves styling on.
func TestPlainIsOnlyExactlyOne(t *testing.T) {
	for value, want := range map[string]bool{"1": true, "": false, "0": false, "true": false, "yes": false} {
		d, _ := testDeps(t)
		d.env = fakeEnv(map[string]string{varPlain: value})
		if got := resolveGround(d, &rootFlags{theme: themeDark}).plain; got != want {
			t.Errorf("CAIRN_PLAIN=%q: plain = %v, want %v", value, got, want)
		}
	}
}
