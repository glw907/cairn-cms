package doctor

import "testing"

// TestConfigObservability is table-driven over config.observability's three reachable statuses:
// pass, fail, and skip.
func TestConfigObservability(t *testing.T) {
	tests := []struct {
		name       string
		files      map[string]string
		wantStatus Status
		wantDetail string
	}{
		{
			name:       "pass: observability.enabled is true",
			files:      map[string]string{"wrangler.jsonc": `{ "observability": { "enabled": true } }`},
			wantStatus: StatusPass,
			wantDetail: detailObservabilityOn,
		},
		{
			name:       "fail: observability.enabled is false",
			files:      map[string]string{"wrangler.jsonc": `{ "observability": { "enabled": false } }`},
			wantStatus: StatusFail,
			wantDetail: detailObservabilityOff,
		},
		{
			name:       "fail: no observability key at all",
			files:      map[string]string{"wrangler.jsonc": `{}`},
			wantStatus: StatusFail,
			wantDetail: detailObservabilityOff,
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
			result := ConfigObservability.Run(s)
			if result.Status != tt.wantStatus {
				t.Fatalf("Status = %v, want %v (detail %q)", result.Status, tt.wantStatus, result.Detail)
			}
			if result.Detail != tt.wantDetail {
				t.Errorf("Detail = %q, want %q", result.Detail, tt.wantDetail)
			}
			if tt.wantStatus == StatusFail && result.Condition != ConfigObservability.Condition {
				t.Errorf("Condition = %v, want %v", result.Condition, ConfigObservability.Condition)
			}
		})
	}
}
