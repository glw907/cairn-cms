package doctor

import (
	"strings"
	"testing"
)

// TestConfigSiteConfig proves config.site-config's status arms over Task 4's parser
// (siteconfig.go): a found, parsing config with a non-empty siteName passes; a config that does
// not parse, has a non-mapping root, or carries an empty siteName fails with
// config.site-config-invalid; no config at any of the four candidate paths is unchecked. This
// test writes no parsing of its own: every case exercises SiteConfig() through the check.
func TestConfigSiteConfig(t *testing.T) {
	tests := []struct {
		name       string
		files      map[string]string
		wantStatus Status
	}{
		{
			name:       "pass: a found, parsing config with a non-empty siteName",
			files:      map[string]string{SiteConfigPath(): "siteName: Example Site\n"},
			wantStatus: StatusPass,
		},
		{
			name:       "pass: found at a legacy path",
			files:      map[string]string{"site.config.yaml": "siteName: Legacy Root\n"},
			wantStatus: StatusPass,
		},
		{
			name:       "fail: does not parse as YAML",
			files:      map[string]string{SiteConfigPath(): "siteName: [unterminated\n"},
			wantStatus: StatusFail,
		},
		{
			name:       "fail: root is a sequence, not a mapping",
			files:      map[string]string{SiteConfigPath(): "- one\n- two\n"},
			wantStatus: StatusFail,
		},
		{
			name:       "fail: siteName is empty",
			files:      map[string]string{SiteConfigPath(): "siteName: \"\"\n"},
			wantStatus: StatusFail,
		},
		{
			name:       "unchecked: no config at any of the four candidate paths",
			files:      map[string]string{},
			wantStatus: StatusUnchecked,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := snapshotWithFiles(t, tt.files)
			result := ConfigSiteConfig.Run(s)
			if result.Status != tt.wantStatus {
				t.Fatalf("Status = %v, want %v (detail %q)", result.Status, tt.wantStatus, result.Detail)
			}
			switch tt.wantStatus {
			case StatusFail:
				if result.Condition != ConfigSiteConfig.Condition {
					t.Errorf("Condition = %v, want %v", result.Condition, ConfigSiteConfig.Condition)
				}
				if result.Detail == "" {
					t.Error("Detail is empty for a fail, want the parse or shape error")
				}
			case StatusUnchecked:
				for _, path := range SiteConfigPaths() {
					if !strings.Contains(result.Detail, path) {
						t.Errorf("Detail %q does not name candidate path %q", result.Detail, path)
					}
				}
			}
		})
	}
}
