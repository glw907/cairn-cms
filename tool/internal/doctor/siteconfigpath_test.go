package doctor

import "testing"

// TestSiteConfigPath asserts the accessor returns the committed mirror's value.
func TestSiteConfigPath(t *testing.T) {
	got := siteConfigPath()
	want := "src/theme/site.config.yaml"
	if got != want {
		t.Errorf("siteConfigPath() = %q, want %q", got, want)
	}
}

// TestValidateSiteConfigPathShape proves the four shape rules ported from
// packages/create-cairn-site/src/substitute.mjs's verifySiteConfigPath, one rejected shape per
// case, plus the committed value passing clean.
func TestValidateSiteConfigPathShape(t *testing.T) {
	tests := []struct {
		name    string
		path    string
		wantErr bool
	}{
		{name: "the committed value", path: "src/theme/site.config.yaml"},
		{name: "empty string", path: "", wantErr: true},
		{name: "leading slash", path: "/src/theme/site.config.yaml", wantErr: true},
		{name: "NUL byte", path: "src/theme/site.config\x00.yaml", wantErr: true},
		{name: "dot-dot segment", path: "src/../etc/passwd", wantErr: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateSiteConfigPathShape(tt.path)
			if (err != nil) != tt.wantErr {
				t.Errorf("validateSiteConfigPathShape(%q) error = %v, wantErr %v", tt.path, err, tt.wantErr)
			}
		})
	}
}
