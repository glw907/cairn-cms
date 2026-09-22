package doctor

import "testing"

// TestConfigPublicOrigin is table-driven over requireOrigin's three rules (unset, unparseable,
// and non-https off localhost or 127.0.0.1), proven case by case, plus the pass and skip arms.
// localhost.example.com over http is the deliberate negative case for the exact-match rule: it
// must fail while localhost over http passes, so a lookalike host cannot skip the https
// requirement (src/lib/env.ts:43-66).
func TestConfigPublicOrigin(t *testing.T) {
	tests := []struct {
		name       string
		origin     PublicOrigin
		wantStatus Status
		wantDetail string
	}{
		{
			name:       "skip: neither wrangler vars nor the environment named an origin",
			origin:     PublicOrigin{Source: OriginAbsent},
			wantStatus: StatusSkip,
			wantDetail: detailPublicOriginSkip,
		},
		{
			name:       "fail: unset (empty value from a source that resolved nothing useful)",
			origin:     PublicOrigin{Value: "", Source: OriginFromEnv},
			wantStatus: StatusFail,
			wantDetail: detailPublicOriginUnconfigured,
		},
		{
			name:       "fail: unparseable as a URL",
			origin:     PublicOrigin{Value: "not a url", Source: OriginFromEnv},
			wantStatus: StatusFail,
			wantDetail: "PUBLIC_ORIGIN is not a valid URL, got not a url",
		},
		{
			name:       "fail: http on a non-local host",
			origin:     PublicOrigin{Value: "http://ecnordic.ski", Source: OriginFromEnv},
			wantStatus: StatusFail,
			wantDetail: "PUBLIC_ORIGIN must be https in production, got http://ecnordic.ski",
		},
		{
			name:       "fail: a lookalike localhost host cannot skip the https requirement",
			origin:     PublicOrigin{Value: "http://localhost.example.com", Source: OriginFromEnv},
			wantStatus: StatusFail,
			wantDetail: "PUBLIC_ORIGIN must be https in production, got http://localhost.example.com",
		},
		{
			name:       "pass: http on localhost is allowed for dev",
			origin:     PublicOrigin{Value: "http://localhost:5173", Source: OriginFromEnv},
			wantStatus: StatusPass,
			wantDetail: "PUBLIC_ORIGIN is http://localhost:5173 (environment)",
		},
		{
			name:       "pass: http on 127.0.0.1 is allowed for dev",
			origin:     PublicOrigin{Value: "http://127.0.0.1:5173", Source: OriginFromEnv},
			wantStatus: StatusPass,
			wantDetail: "PUBLIC_ORIGIN is http://127.0.0.1:5173 (environment)",
		},
		{
			name:       "pass: https in production, resolved from wrangler vars",
			origin:     PublicOrigin{Value: "https://ecnordic.ski", Source: OriginFromVars},
			wantStatus: StatusPass,
			wantDetail: "PUBLIC_ORIGIN is https://ecnordic.ski (wrangler vars)",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := Snapshot{Dir: t.TempDir(), PublicOrigin: tt.origin}
			result := ConfigPublicOrigin.Run(s)
			if result.Status != tt.wantStatus {
				t.Fatalf("Status = %v, want %v (detail %q)", result.Status, tt.wantStatus, result.Detail)
			}
			if result.Detail != tt.wantDetail {
				t.Errorf("Detail = %q, want %q", result.Detail, tt.wantDetail)
			}
		})
	}
}
