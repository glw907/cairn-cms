package doctor

import (
	"strings"
	"testing"
)

// TestConfigPublicOrigin is table-driven over requireOrigin's three rules (unset, unparseable,
// and non-https off localhost or 127.0.0.1), proven case by case, plus the pass and skip arms.
// localhost.example.com over http is the deliberate negative case for the exact-match rule: it
// must fail while localhost over http passes, so a lookalike host cannot skip the https
// requirement (src/lib/env.ts:43-66).
func TestConfigPublicOrigin(t *testing.T) {
	tests := []struct {
		name       string
		files      map[string]string
		origin     PublicOrigin
		wantStatus Status
		wantDetail string
	}{
		{
			name:       "skip: no wrangler config found and no origin resolved",
			origin:     PublicOrigin{Source: originAbsent},
			wantStatus: StatusSkip,
			wantDetail: detailPublicOriginSkip,
		},
		{
			name: "fail: wrangler config found but names no origin",
			files: map[string]string{
				"wrangler.jsonc": `{}`,
			},
			origin:     PublicOrigin{Source: originAbsent},
			wantStatus: StatusFail,
			wantDetail: detailPublicOriginUnconfigured,
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
			s := snapshotWithFiles(t, tt.files)
			s.PublicOrigin = tt.origin
			result := configPublicOrigin.run(s)
			if result.Status != tt.wantStatus {
				t.Fatalf("Status = %v, want %v (detail %q)", result.Status, tt.wantStatus, result.Detail)
			}
			if result.Detail != tt.wantDetail {
				t.Errorf("Detail = %q, want %q", result.Detail, tt.wantDetail)
			}
		})
	}
}

// TestConfigPublicOriginAgainstRecord proves the wrangler var is compared with the site record's
// deploy.publicOrigin: a difference fails naming both, equal origins pass, and a site with no
// record keeps the check's behavior without one. The environment fallback is never compared.
func TestConfigPublicOriginAgainstRecord(t *testing.T) {
	const wrangler = `{"vars": {"PUBLIC_ORIGIN": "https://example.com"}}`
	varsOrigin := PublicOrigin{Value: "https://example.com", Source: OriginFromVars}
	tests := []struct {
		name       string
		files      map[string]string
		origin     PublicOrigin
		wantStatus Status
		wantDetail string
	}{
		{
			name: "fail: the two origins differ",
			files: map[string]string{
				"wrangler.jsonc":  wrangler,
				"cairn-site.json": siteRecordFixture("https://other.example.org"),
			},
			origin:     varsOrigin,
			wantStatus: StatusFail,
			wantDetail: "PUBLIC_ORIGIN in wrangler.jsonc is https://example.com, but deploy.publicOrigin in cairn-site.json is https://other.example.org",
		},
		{
			name: "pass: the two origins match",
			files: map[string]string{
				"wrangler.jsonc":  wrangler,
				"cairn-site.json": siteRecordFixture("https://example.com"),
			},
			origin:     varsOrigin,
			wantStatus: StatusPass,
			wantDetail: "PUBLIC_ORIGIN is https://example.com (wrangler vars)",
		},
		{
			name:       "pass: no record",
			files:      map[string]string{"wrangler.jsonc": wrangler},
			origin:     varsOrigin,
			wantStatus: StatusPass,
			wantDetail: "PUBLIC_ORIGIN is https://example.com (wrangler vars)",
		},
		{
			name: "pass: the origin came from the environment, so the record is not compared",
			files: map[string]string{
				"wrangler.jsonc":  `{}`,
				"cairn-site.json": siteRecordFixture("https://other.example.org"),
			},
			origin:     PublicOrigin{Value: "https://example.com", Source: OriginFromEnv},
			wantStatus: StatusPass,
			wantDetail: "PUBLIC_ORIGIN is https://example.com (environment)",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := snapshotWithFiles(t, tt.files)
			s.PublicOrigin = tt.origin
			result := configPublicOrigin.run(s)
			if result.Status != tt.wantStatus || result.Detail != tt.wantDetail {
				t.Errorf("got %v %q, want %v %q", result.Status, result.Detail, tt.wantStatus, tt.wantDetail)
			}
		})
	}
}

// TestLoopbackHostAgreement pins that config.public-origin and config.csrf-trusted-origins
// draw the loopback line in the same place, and that it is the engine's: requireOrigin
// (src/lib/env.ts) treats only localhost and 127.0.0.1 as local, so the IPv6 loopback, a
// lookalike, and a routable host are local to neither check.
func TestLoopbackHostAgreement(t *testing.T) {
	tests := []struct {
		host      string
		wantLocal bool
	}{
		{"localhost", true},
		{"127.0.0.1", true},
		{"[::1]", false},
		{"localhost.example.com", false},
		{"[2001:db8::1]", false},
		{"192.168.1.5", false},
	}
	for _, tt := range tests {
		t.Run(tt.host, func(t *testing.T) {
			origin := "http://" + tt.host + ":5173"

			_, publicOriginOK := validatePublicOrigin(origin)
			if publicOriginOK != tt.wantLocal {
				t.Errorf("validatePublicOrigin(%q) ok = %v, want %v", origin, publicOriginOK, tt.wantLocal)
			}

			csrf := csrfVerdict("vite.config.ts", []string{origin}, false)
			if csrf.Status != StatusPass {
				t.Fatalf("csrfVerdict Status = %v, want StatusPass", csrf.Status)
			}
			if flagged := strings.Contains(csrf.Detail, "network attacker"); flagged == tt.wantLocal {
				t.Errorf("csrfVerdict(%q) names the network attacker = %v, want %v", origin, flagged, !tt.wantLocal)
			}
		})
	}
}
