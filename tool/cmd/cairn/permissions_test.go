package main

import (
	"os"
	"regexp"
	"slices"
	"strings"
	"testing"
)

// credentialsDocPath is tool/docs/credentials.md, relative to this package: the doc
// TestPermissionTableMatchesCredentialsDoc reads to keep the permission table and the published
// page from drifting apart.
const credentialsDocPath = "../../docs/credentials.md"

// cloudflareBulletPattern matches one Markdown bullet's own text.
var cloudflareBulletPattern = regexp.MustCompile(`(?m)^- (.+)$`)

// TestPermissionTableMatchesCredentialsDoc asserts permissionTable and tool/docs/credentials.md's
// "Token scopes" section name exactly the same Cloudflare labels, and that the GitHub paragraph
// names both GitHub labels. A permission added to either without the other fails here.
func TestPermissionTableMatchesCredentialsDoc(t *testing.T) {
	data, err := os.ReadFile(credentialsDocPath)
	if err != nil {
		t.Fatalf("read %s: %v", credentialsDocPath, err)
	}
	doc := string(data)

	start := strings.Index(doc, "## Token scopes")
	if start < 0 {
		t.Fatal("credentials.md carries no \"## Token scopes\" section")
	}
	section := doc[start:]

	ghStart := strings.Index(section, "### GitHub")
	if ghStart < 0 {
		t.Fatal("credentials.md's Token scopes section carries no \"### GitHub\" subsection")
	}
	cfSection := section[:ghStart]
	ghSection := section[ghStart:]

	var wantCFLabels []string
	for _, p := range permissionTable {
		if p.Credential != varCFReadToken {
			continue
		}
		wantCFLabels = append(wantCFLabels, p.Label)
		if !strings.Contains(cfSection, "- "+p.Label+"\n") {
			t.Errorf("credentials.md's Cloudflare list does not name %q", p.Label)
		}
	}

	for _, m := range cloudflareBulletPattern.FindAllStringSubmatch(cfSection, -1) {
		label := m[1]
		if !slices.Contains(wantCFLabels, label) {
			t.Errorf("credentials.md names Cloudflare permission %q with no matching permissionTable row", label)
		}
	}

	for _, p := range permissionTable {
		if p.Credential != varGHReadToken {
			continue
		}
		if !strings.Contains(ghSection, p.Label) {
			t.Errorf("credentials.md's GitHub paragraph does not name %q", p.Label)
		}
	}
}
