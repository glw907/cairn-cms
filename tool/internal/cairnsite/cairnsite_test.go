package cairnsite_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/glw907/cairn-cms/tool/v2/internal/cairnsite"
	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
)

func repoRoot(t *testing.T) string {
	t.Helper()
	root, err := providers.RepoRoot()
	if err != nil {
		t.Fatal(err)
	}
	return root
}

// lf drops carriage returns, since a Windows checkout may rewrite the repo's JSON files to CRLF.
func lf(b []byte) string {
	return strings.ReplaceAll(string(b), "\r\n", "\n")
}

func TestRoundTripShowcaseRecord(t *testing.T) {
	want, err := os.ReadFile(filepath.Join(repoRoot(t), "examples", "showcase", cairnsite.File))
	if err != nil {
		t.Fatal(err)
	}
	r, err := cairnsite.Decode(want)
	if err != nil {
		t.Fatalf("Decode: %v", err)
	}
	got, err := cairnsite.Encode(r)
	if err != nil {
		t.Fatalf("Encode: %v", err)
	}
	if lf(got) != lf(want) {
		t.Errorf("round trip differs:\n got %q\nwant %q", got, want)
	}
}

func TestEncodeKeepsOptionalKeysInOrder(t *testing.T) {
	r := cairnsite.Record{
		Kind:      "blog",
		AIPosture: "decline",
		Scaffold:  cairnsite.Scaffold{Engine: "1.0.0", Composer: "pennant"},
		Deploy: cairnsite.Deploy{
			PublicOrigin: "https://a.test", EmailFrom: "cms@a.test",
			GitHub: cairnsite.GitHub{Owner: "o", Repo: "r", Branch: "main", AppID: "1", InstallationID: "2"},
		},
	}
	got, err := cairnsite.Encode(r)
	if err != nil {
		t.Fatal(err)
	}
	text := string(got)
	order := []string{`"kind"`, `"features": []`, `"themeOptions": {}`, `"aiPosture"`, `"scaffold"`, `"composer"`, `"deploy"`}
	last := -1
	for _, key := range order {
		i := strings.Index(text, key)
		if i <= last {
			t.Fatalf("%s is missing or out of order in:\n%s", key, text)
		}
		last = i
	}
	if !strings.HasSuffix(text, "}\n") {
		t.Errorf("no final newline: %q", text)
	}
}

func TestDecodeRefusals(t *testing.T) {
	showcase, err := os.ReadFile(filepath.Join(repoRoot(t), "examples", "showcase", cairnsite.File))
	if err != nil {
		t.Fatal(err)
	}
	valid := string(showcase)
	tests := []struct {
		name string
		edit func(string) string
		want string
	}{
		{"unknown top-level key", func(s string) string { return strings.Replace(s, `"kind"`, `"extra": 1, "kind"`, 1) }, `unknown field "extra"`},
		{"unknown kind", func(s string) string { return strings.Replace(s, `"blog"`, `"nope"`, 1) }, `cairn-site.json: kind "nope" is not one of blog, portfolio, docs, landing, organization`},
		{"missing origin", func(s string) string { return strings.Replace(s, `"publicOrigin": "https://showcase.test",`, ``, 1) }, `cairn-site.json: deploy.publicOrigin is required`},
		{"null origin", func(s string) string {
			return strings.Replace(s, `"publicOrigin": "https://showcase.test"`, `"publicOrigin": null`, 1)
		}, `cairn-site.json: deploy.publicOrigin is required`},
		{"null features", func(s string) string { return strings.Replace(s, `"features": []`, `"features": null`, 1) }, `cairn-site.json: features is required`},
		{"missing engine", func(s string) string { return strings.Replace(s, `"engine": "0.99.0-rc.4"`, ``, 1) }, `cairn-site.json: scaffold.engine is required`},
		{"missing installation id", func(s string) string { return strings.Replace(s, `"installationId": "2"`, `"x": "2"`, 1) }, `cairn-site.json: deploy.github.installationId is required`},
		{"unknown feature", func(s string) string { return strings.Replace(s, `"features": []`, `"features": ["comments"]`, 1) }, `cairn-site.json: feature "comments" is not one of (none yet)`},
		{"bad posture", func(s string) string {
			return strings.Replace(s, `"themeOptions": {}`, `"themeOptions": {}, "aiPosture": "maybe"`, 1)
		}, `aiPosture "maybe" is not one of invite, decline`},
		{"bad option type", func(s string) string {
			return strings.Replace(s, `"themeOptions": {}`, `"themeOptions": {"a": [1]}`, 1)
		}, `themeOptions.a must be a string, number, or boolean`},
		{"not json", func(string) string { return "{" }, `cairn-site.json:`},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := cairnsite.Decode([]byte(tt.edit(valid)))
			if err == nil || !strings.Contains(err.Error(), tt.want) {
				t.Errorf("Decode error = %v, want it to contain %q", err, tt.want)
			}
		})
	}
}

func TestEncodeRefusesUnknownKind(t *testing.T) {
	_, err := cairnsite.Encode(cairnsite.Record{Kind: "nope"})
	if err == nil || !strings.Contains(err.Error(), `kind "nope" is not one of`) {
		t.Errorf("Encode error = %v", err)
	}
}

// TestEmbeddedCopyMatchesDefinitions fails when the embedded copy of definitions/ is stale; the
// fix is `node scripts/build/emit-definitions.mjs`.
func TestEmbeddedCopyMatchesDefinitions(t *testing.T) {
	root := repoRoot(t)
	for _, name := range []string{"kinds.json", "features.json"} {
		want, err := os.ReadFile(filepath.Join(root, "definitions", name))
		if err != nil {
			t.Fatal(err)
		}
		got, err := os.ReadFile(filepath.Join("definitions", name))
		if err != nil {
			t.Fatal(err)
		}
		if lf(got) != lf(want) {
			t.Errorf("tool/internal/cairnsite/definitions/%s differs from definitions/%s; run node scripts/build/emit-definitions.mjs", name, name)
		}
	}
}
