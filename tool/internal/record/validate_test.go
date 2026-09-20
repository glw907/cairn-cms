package record

import "testing"

func TestValidateSiteID(t *testing.T) {
	tests := []struct {
		name    string
		id      string
		wantErr bool
	}{
		{"slug plus suffix", "alpine-club-a1b2c3", false},
		{"single-word slug", "site-abcdef", false},
		{"uppercase segment", "Alpine-club-a1b2c3", true},
		{"uppercase suffix", "alpine-club-A1B2C3", true},
		{"underscore", "alpine_club-a1b2c3", true},
		{"missing suffix", "alpine-club", true},
		{"suffix too short", "alpine-club-abc12", true},
		{"suffix too long", "alpine-club-abc1234", true},
		{"empty", "", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateSiteID(tt.id)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateSiteID(%q) error = %v, wantErr %v", tt.id, err, tt.wantErr)
			}
		})
	}
}

func TestValidateDomain(t *testing.T) {
	tests := []struct {
		name    string
		domain  string
		wantErr bool
	}{
		{"bare domain", "site.example", false},
		{"subdomain", "www.site.example", false},
		{"userinfo", "site.example@evil.example", true},
		{"fragment", "evil.example#", true},
		{"port", "localhost:8787", true},
		{"ip literal", "169.254.169.254", true},
		{"underscore label", "_dmarc.site.example", true},
		{"empty", "", true},
		{"scheme", "https://site.example", true},
		{"path", "site.example/admin", true},
		{"query", "site.example?x=1", true},
		{"leading dot", ".site.example", true},
		{"trailing dot", "site.example.", true},
		{"double dot", "site..example", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateDomain(tt.domain)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateDomain(%q) error = %v, wantErr %v", tt.domain, err, tt.wantErr)
			}
		})
	}
}
