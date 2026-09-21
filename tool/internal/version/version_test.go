package version

import "testing"

func TestString(t *testing.T) {
	tests := []struct {
		name      string
		version   string
		moduleVer string
		moduleOK  bool
		want      string
	}{
		{name: "ldflags value wins", version: "v1.2.3", moduleVer: "", moduleOK: false, want: "v1.2.3"},
		{name: "falls back to build info", version: "dev", moduleVer: "v0.0.0-20260101000000-abcdef123456", moduleOK: true, want: "v0.0.0-20260101000000-abcdef123456"},
		{name: "falls back to dev with no build info", version: "dev", moduleVer: "", moduleOK: false, want: "dev"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			origVersion, origModuleVersion := Version, mainModuleVersion
			t.Cleanup(func() {
				Version = origVersion
				mainModuleVersion = origModuleVersion
			})

			Version = tt.version
			mainModuleVersion = func() (string, bool) { return tt.moduleVer, tt.moduleOK }

			if got := String(); got != tt.want {
				t.Errorf("String() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestDefaults(t *testing.T) {
	if Version != "dev" {
		t.Errorf("Version default = %q, want %q", Version, "dev")
	}
	if Commit != "none" {
		t.Errorf("Commit default = %q, want %q", Commit, "none")
	}
}
