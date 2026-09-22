package doctor

import "testing"

// TestConfigBindings is table-driven over config.bindings's three reachable statuses: pass (both
// bindings declared), fail (one or both missing, naming which), and skip (no wrangler config at
// all). Fixtures are minimal wrangler.jsonc bodies rather than the wrangler corpus, since this
// check reads only the two fields ReadWranglerConfig already proves against the corpus.
func TestConfigBindings(t *testing.T) {
	tests := []struct {
		name       string
		files      map[string]string
		wantStatus Status
		wantDetail string
	}{
		{
			name: "pass: both bindings declared",
			files: map[string]string{
				"wrangler.jsonc": `{
					"send_email": [{ "name": "EMAIL" }],
					"d1_databases": [{ "binding": "AUTH_DB" }]
				}`,
			},
			wantStatus: StatusPass,
			wantDetail: detailBindingsPresent,
		},
		{
			name: "fail: both bindings missing",
			files: map[string]string{
				"wrangler.jsonc": `{}`,
			},
			wantStatus: StatusFail,
			wantDetail: "missing EMAIL (send_email) and AUTH_DB (d1_databases)",
		},
		{
			name: "fail: only AUTH_DB missing",
			files: map[string]string{
				"wrangler.jsonc": `{ "send_email": [{ "name": "EMAIL" }] }`,
			},
			wantStatus: StatusFail,
			wantDetail: "missing AUTH_DB (d1_databases)",
		},
		{
			name:       "skip: neither wrangler.jsonc nor wrangler.toml exists",
			files:      map[string]string{},
			wantStatus: StatusSkip,
			wantDetail: noWranglerFoundDetail,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := snapshotWithFiles(t, tt.files)
			result := ConfigBindings.Run(s)
			if result.Status != tt.wantStatus {
				t.Fatalf("Status = %v, want %v (detail %q)", result.Status, tt.wantStatus, result.Detail)
			}
			if result.Detail != tt.wantDetail {
				t.Errorf("Detail = %q, want %q", result.Detail, tt.wantDetail)
			}
			if tt.wantStatus == StatusFail && result.Severity != severityFor(ConfigBindings.Condition) {
				t.Errorf("Severity = %v, want the registry severity for %s", result.Severity, ConfigBindings.Condition)
			}
		})
	}
}
