package store

import (
	"errors"
	"os"
	"path/filepath"
	"testing"
)

func noEnv(string) string { return "" }

// TestDir covers the resolution table from reconciliation row 5: three
// platforms, each with and without CAIRN_STATE_DIR, and each with and
// without the Node CLI's legacy directory already present. config is
// built per case from home, standing in for what os.UserConfigDir returns
// on the named platform and environment.
func TestDir(t *testing.T) {
	tests := []struct {
		name         string
		env          func(string) string
		configSuffix []string // relative to home; nil means config() errors
		legacyExists bool
		wantSource   Source
		wantSuffix   []string // relative to home
	}{
		{
			name:       "CAIRN_STATE_DIR set wins outright, on every platform",
			env:        func(string) string { return "/custom/state" },
			wantSource: SourceEnv,
		},
		{
			name:         "windows: config agrees with the legacy path, legacy also present",
			env:          noEnv,
			configSuffix: []string{".config"},
			legacyExists: true,
			wantSource:   SourceLegacyPOSIX,
			wantSuffix:   []string{".config", "cairn", "sites"},
		},
		{
			name:         "windows: config agrees with the legacy path, legacy absent",
			env:          noEnv,
			configSuffix: []string{"AppData", "Roaming"},
			legacyExists: false,
			wantSource:   SourceUserConfig,
			wantSuffix:   []string{"AppData", "Roaming", "cairn", "sites"},
		},
		{
			name:         "linux, XDG_CONFIG_HOME unset: config agrees with the legacy path, legacy present",
			env:          noEnv,
			configSuffix: []string{".config"},
			legacyExists: true,
			wantSource:   SourceLegacyPOSIX,
			wantSuffix:   []string{".config", "cairn", "sites"},
		},
		{
			name:         "linux, XDG_CONFIG_HOME unset: legacy absent, config still used",
			env:          noEnv,
			configSuffix: []string{".config"},
			legacyExists: false,
			wantSource:   SourceUserConfig,
			wantSuffix:   []string{".config", "cairn", "sites"},
		},
		{
			name:         "darwin: config diverges from the legacy path, legacy absent",
			env:          noEnv,
			configSuffix: []string{"Library", "Application Support"},
			legacyExists: false,
			wantSource:   SourceUserConfig,
			wantSuffix:   []string{"Library", "Application Support", "cairn", "sites"},
		},
		{
			name:         "darwin: config diverges, legacy present, existing records stay readable",
			env:          noEnv,
			configSuffix: []string{"Library", "Application Support"},
			legacyExists: true,
			wantSource:   SourceLegacyPOSIX,
			wantSuffix:   []string{".config", "cairn", "sites"},
		},
		{
			name:         "linux, XDG_CONFIG_HOME set: config diverges, legacy absent",
			env:          noEnv,
			configSuffix: []string{"xdg-custom"},
			legacyExists: false,
			wantSource:   SourceUserConfig,
			wantSuffix:   []string{"xdg-custom", "cairn", "sites"},
		},
		{
			name:         "linux, XDG_CONFIG_HOME set: config diverges, legacy present, existing records stay readable",
			env:          noEnv,
			configSuffix: []string{"xdg-custom"},
			legacyExists: true,
			wantSource:   SourceLegacyPOSIX,
			wantSuffix:   []string{".config", "cairn", "sites"},
		},
		{
			name:         "config errors and no legacy directory exists: falls back to the legacy path anyway",
			env:          noEnv,
			configSuffix: nil,
			legacyExists: false,
			wantSource:   SourceLegacyPOSIX,
			wantSuffix:   []string{".config", "cairn", "sites"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			home := t.TempDir()
			if tt.legacyExists {
				legacy := filepath.Join(home, ".config", "cairn", "sites")
				if err := os.MkdirAll(legacy, 0o700); err != nil {
					t.Fatalf("seed legacy directory: %v", err)
				}
			}

			config := func() (string, error) {
				if tt.configSuffix == nil {
					return "", errors.New("no config dir")
				}
				return filepath.Join(append([]string{home}, tt.configSuffix...)...), nil
			}

			dir, source := Dir(tt.env, config, home)

			if source != tt.wantSource {
				t.Errorf("Dir() source = %v, want %v", source, tt.wantSource)
			}
			if tt.wantSource == SourceEnv {
				if dir != "/custom/state" {
					t.Errorf("Dir() dir = %q, want /custom/state", dir)
				}
				return
			}
			want := filepath.Join(append([]string{home}, tt.wantSuffix...)...)
			if dir != want {
				t.Errorf("Dir() dir = %q, want %q", dir, want)
			}
		})
	}
}
