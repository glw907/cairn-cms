package doctor

import (
	"strings"
	"testing"
)

// siteRecordFixture returns a valid cairn-site.json whose deploy.publicOrigin is origin.
func siteRecordFixture(origin string) string {
	return `{
  "kind": "blog",
  "features": [],
  "themeOptions": {},
  "scaffold": {"engine": "0.99.0"},
  "deploy": {
    "publicOrigin": "` + origin + `",
    "emailFrom": "cms@example.com",
    "github": {"owner": "o", "repo": "r", "branch": "main", "appId": "1", "installationId": "2"}
  }
}
`
}

// TestConfigSiteRecord proves config.site-record fails with cairnsite.Decode's line for each
// broken record and passes a valid one. A wanted fragment names the file and the field, so a
// check that swallowed the decode error fails here.
func TestConfigSiteRecord(t *testing.T) {
	tests := []struct {
		name       string
		files      map[string]string
		wantStatus Status
		wantDetail string
	}{
		{
			name:       "fail: no record",
			files:      map[string]string{},
			wantStatus: StatusFail,
			wantDetail: detailSiteRecordMissing,
		},
		{
			name:       "fail: not JSON",
			files:      map[string]string{"cairn-site.json": "{not json"},
			wantStatus: StatusFail,
			wantDetail: "cairn-site.json: invalid character",
		},
		{
			name: "fail: unknown key",
			files: map[string]string{"cairn-site.json": strings.Replace(
				siteRecordFixture("https://example.com"), `"kind": "blog",`, `"kind": "blog", "colour": "red",`, 1)},
			wantStatus: StatusFail,
			wantDetail: `cairn-site.json: json: unknown field "colour"`,
		},
		{
			name: "fail: kind outside the closed list",
			files: map[string]string{"cairn-site.json": strings.Replace(
				siteRecordFixture("https://example.com"), `"blog"`, `"wiki"`, 1)},
			wantStatus: StatusFail,
			wantDetail: "cairn-site.json: ",
		},
		{
			name: "fail: no public origin",
			files: map[string]string{"cairn-site.json": strings.Replace(
				siteRecordFixture("https://example.com"), `"publicOrigin": "https://example.com",`, "", 1)},
			wantStatus: StatusFail,
			wantDetail: "cairn-site.json: deploy.publicOrigin is required",
		},
		{
			name:       "pass: a valid record",
			files:      map[string]string{"cairn-site.json": siteRecordFixture("https://example.com")},
			wantStatus: StatusPass,
			wantDetail: detailSiteRecordPass,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := configSiteRecord.run(snapshotWithFiles(t, tt.files))
			if result.Status != tt.wantStatus {
				t.Fatalf("Status = %v, want %v (detail %q)", result.Status, tt.wantStatus, result.Detail)
			}
			if !strings.HasPrefix(result.Detail, tt.wantDetail) {
				t.Errorf("Detail = %q, want prefix %q", result.Detail, tt.wantDetail)
			}
		})
	}
}
