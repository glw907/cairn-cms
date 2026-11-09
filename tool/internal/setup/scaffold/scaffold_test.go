package scaffold

import (
	"bytes"
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	"go.yaml.in/yaml/v3"
)

func TestScaffoldWritesTheSite(t *testing.T) {
	site := testSite()
	dir, res := scaffoldOK(t, site)

	if res.Dir != dir || res.EngineVersion != testVersion {
		t.Errorf("Result = %+v", res)
	}

	var pkg struct {
		Name         string            `json:"name"`
		Dependencies map[string]string `json:"dependencies"`
		DevDeps      map[string]string `json:"devDependencies"`
	}
	if err := json.Unmarshal([]byte(readFile(t, dir, "package.json")), &pkg); err != nil {
		t.Fatal(err)
	}
	if pkg.Name != "my-caf-the-site" {
		t.Errorf("package name = %q", pkg.Name)
	}
	if got := pkg.Dependencies["@glw907/cairn-cms"]; got != testVersion {
		t.Errorf("engine pin = %q, want the exact version %q (no caret)", got, testVersion)
	}
	if got := pkg.DevDeps["@glw907/cairn-cms-dev"]; got == "" {
		t.Error("the dev backend dependency was lost")
	}

	var cfg struct {
		SiteName string `yaml:"siteName"`
	}
	if err := yaml.Unmarshal([]byte(readFile(t, dir, "src/theme/site.config.yaml")), &cfg); err != nil {
		t.Fatalf("site.config.yaml does not parse: %v", err)
	}
	if cfg.SiteName != "My Café: The Site!" {
		t.Errorf("siteName = %q", cfg.SiteName)
	}

	cairn := readFile(t, dir, "src/theme/cairn.config.ts")
	for _, want := range []string{
		"aiPosture: 'invite',",
		"createGithubApp({ owner: 'octo-owner', repo: 'my-caf-the-site', branch: 'trunk', appId: '424242', installationId: '737373' })",
		"email: { from: 'no-reply@example.test' }",
		"export const publicOrigin = 'https://blog.example.test'",
	} {
		if !strings.Contains(cairn, want) {
			t.Errorf("cairn.config.ts lacks %q", want)
		}
	}
	if strings.Contains(cairn, "Left unset here on purpose") {
		t.Error("cairn.config.ts still carries the unset-posture comment")
	}

	wrangler := readFile(t, dir, "wrangler.jsonc")
	for _, want := range []string{
		"\n  \"name\": \"my-caf-the-site\",\n  \"account_id\": \"0123456789abcdef0123456789abcdef\",\n",
		`"database_name": "my-caf-the-site-auth"`,
		`"database_id": "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d"`,
		`"bucket_name": "my-caf-the-site-media"`,
		`"PUBLIC_ORIGIN": "https://blog.example.test"`,
	} {
		if !strings.Contains(wrangler, want) {
			t.Errorf("wrangler.jsonc lacks %q", want)
		}
	}
	for _, gone := range []string{"cairn-showcase", "00000000-0000-0000-0000-000000000000", "localhost"} {
		if strings.Contains(wrangler, gone) {
			t.Errorf("wrangler.jsonc still carries %q", gone)
		}
	}

	for _, rel := range []string{".github/workflows/deploy.yml", ".github/workflows/check.yml", ".dev.vars.example", ".gitignore"} {
		if _, err := os.Stat(filepath.Join(dir, filepath.FromSlash(rel))); err != nil {
			t.Errorf("the site lacks %s: %v", rel, err)
		}
	}
	if _, err := os.Stat(filepath.Join(dir, "gitignore")); err == nil {
		t.Error("the shipped gitignore name was left beside .gitignore")
	}
}

func TestSiteFactsRegenerationDiffersByPosture(t *testing.T) {
	const template = "{\n  \"version\": 1,\n  \"mediaBucketBinding\": \"MEDIA_BUCKET\"\n}\n"
	if got := readTemplateFile(t, "src/content/.cairn/site-facts.json"); got != template {
		t.Fatalf("the template's facts changed; update this test: %q", got)
	}
	// What formatSiteFacts (src/lib/vite/internal.ts) returns for the template's adapter once
	// its posture is set: JSON.stringify of {version, mediaBucketBinding, aiPosture} at 2 spaces
	// plus a newline.
	want := map[string]string{
		Invite:  "{\n  \"version\": 1,\n  \"mediaBucketBinding\": \"MEDIA_BUCKET\",\n  \"aiPosture\": \"invite\"\n}\n",
		Decline: "{\n  \"version\": 1,\n  \"mediaBucketBinding\": \"MEDIA_BUCKET\",\n  \"aiPosture\": \"decline\"\n}\n",
	}
	for posture, facts := range want {
		t.Run(posture, func(t *testing.T) {
			site := testSite()
			site.Posture = posture
			dir, _ := scaffoldOK(t, site)
			got := readFile(t, dir, "src/content/.cairn/site-facts.json")
			if got != facts {
				t.Errorf("site-facts.json = %q, want %q", got, facts)
			}
			if got == template {
				t.Error("site-facts.json equals the template's, so regeneration did nothing")
			}
		})
	}
}

func TestSiteFactsKeepRolesAndOmitAbsentKeys(t *testing.T) {
	dir := t.TempDir()
	rel := targets.SiteFacts
	if err := os.MkdirAll(filepath.Dir(filepath.Join(dir, rel)), 0o755); err != nil {
		t.Fatal(err)
	}
	in := `{"version":1,"roles":{"owner":{"label":"Owner <all>"}}}`
	if err := os.WriteFile(filepath.Join(dir, rel), []byte(in), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := editSiteFacts(dir, Site{Posture: Decline}, ""); err != nil {
		t.Fatal(err)
	}
	want := "{\n  \"version\": 1,\n  \"roles\": {\n    \"owner\": {\n      \"label\": \"Owner <all>\"\n    }\n  },\n  \"aiPosture\": \"decline\"\n}\n"
	if got := readFile(t, dir, rel); got != want {
		t.Errorf("site-facts.json = %q, want %q", got, want)
	}
}

func TestOwnerEmailAppearsInNoSiteFile(t *testing.T) {
	// The owner's address is the sign-in row's, never a file's. Scaffold takes no owner email,
	// so this holds by construction; the walk guards a substitution that starts writing one.
	site := testSite()
	site.EmailFrom = "no-reply@example.test"
	dir, _ := scaffoldOK(t, site)
	const owner = "owner@private.example"
	err := filepath.WalkDir(filepath.Join(dir, "src/content"), func(p string, d os.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return err
		}
		b, rerr := os.ReadFile(p)
		if rerr != nil {
			return rerr
		}
		if bytes.Contains(b, []byte(owner)) || bytes.Contains(b, []byte("@private.example")) {
			t.Errorf("%s carries the owner's email", p)
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestScaffoldCommitsLocally(t *testing.T) {
	dir, res := scaffoldOK(t, testSite())
	run := func(args ...string) string {
		t.Helper()
		cmd := exec.Command("git", args...)
		cmd.Dir = dir
		cmd.Env = append(os.Environ(), "GIT_CONFIG_GLOBAL="+os.DevNull, "GIT_CONFIG_NOSYSTEM=1")
		out, err := cmd.Output()
		if err != nil {
			t.Fatalf("git %v: %v", args, err)
		}
		return strings.TrimSpace(string(out))
	}
	if got := run("rev-parse", "--abbrev-ref", "HEAD"); got != "trunk" {
		t.Errorf("branch = %q, want trunk", got)
	}
	if got := run("rev-parse", "HEAD"); got != res.CommitSHA {
		t.Errorf("HEAD = %q, Result.CommitSHA = %q", got, res.CommitSHA)
	}
	if got := run("rev-list", "--count", "HEAD"); got != "2" {
		t.Errorf("commit count = %q, want 2", got)
	}
	if got := run("log", "--format=%an <%ae>|%cn <%ce>|%s"); got != "Cairn Setup <setup@cairn.invalid>|Cairn Setup <setup@cairn.invalid>|"+ConfigMessage+"\n"+
		"Cairn Setup <setup@cairn.invalid>|Cairn Setup <setup@cairn.invalid>|Create the site" {
		t.Errorf("commits = %q", got)
	}
	if got := run("remote", "get-url", "origin"); got != "https://github.com/octo-owner/my-caf-the-site.git" {
		t.Errorf("origin = %q", got)
	}
	if got := run("status", "--porcelain"); got != "" {
		t.Errorf("the tree is dirty after the commit: %q", got)
	}
	if got := run("ls-files", ".gitignore", ".dev.vars.example", ".github/workflows/deploy.yml"); strings.Count(got, "\n") != 2 {
		t.Errorf("tracked files = %q, want .gitignore, .dev.vars.example, and deploy.yml", got)
	}
}

func TestWriteThenFinalizeSplitsTheSettingsIntoASecondCommit(t *testing.T) {
	tpl := fetchOK(t, tarballOf(t, templateFiles(t)))
	dir := filepath.Join(t.TempDir(), "site")
	site := testSite()
	early := site
	early.DatabaseID = ""
	first, err := Write(t.Context(), Config{Template: tpl, Site: early, Commit: testCommit(), Dir: dir})
	if err != nil {
		t.Fatalf("Write: %v", err)
	}
	if got := readFile(t, dir, targets.Wrangler); strings.Contains(got, site.Worker) {
		t.Errorf("the first pass wrote the Worker settings:\n%s", got)
	}
	if got := readFile(t, dir, targets.PackageJSON); !strings.Contains(got, `"name": "my-caf-the-site"`) {
		t.Errorf("the first pass did not name the package:\n%s", got)
	}

	fin := FinalizeConfig{Dir: first.Dir, Base: first.CommitSHA, Site: site, Commit: testCommit()}
	second, err := Finalize(t.Context(), fin)
	if err != nil {
		t.Fatalf("Finalize: %v", err)
	}
	if got := readFile(t, dir, targets.Wrangler); !strings.Contains(got, `"database_id": "`+site.DatabaseID+`"`) {
		t.Errorf("the second pass did not write the database id:\n%s", got)
	}
	if got := readFile(t, dir, targets.CairnConfig); !strings.Contains(got, "branch: 'trunk'") {
		t.Errorf("the second pass did not write the App literal")
	}

	again, err := Finalize(t.Context(), fin)
	if err != nil {
		t.Fatalf("a repeated Finalize: %v", err)
	}
	if gitOut(t, dir, "rev-parse", "HEAD") != again || gitOut(t, dir, "rev-parse", "HEAD^") != first.CommitSHA {
		t.Errorf("a repeated Finalize did not rebuild the second commit on the first")
	}

	stray := FinalizeConfig{Dir: dir, Base: second, Site: site, Commit: testCommit()}
	gitOut(t, dir, "reset", "--quiet", "--hard", first.CommitSHA)
	if _, err := Finalize(t.Context(), stray); err == nil {
		t.Error("Finalize accepted a folder whose HEAD is neither the base nor its child")
	}
}

func gitOut(t *testing.T, dir string, args ...string) string {
	t.Helper()
	cmd := exec.Command("git", args...)
	cmd.Dir = dir
	cmd.Env = append(os.Environ(), "GIT_CONFIG_GLOBAL="+os.DevNull, "GIT_CONFIG_NOSYSTEM=1")
	out, err := cmd.Output()
	if err != nil {
		t.Fatalf("git %v: %v", args, err)
	}
	return strings.TrimSpace(string(out))
}

// readTemplateFile reads a file of the real Waymark template.
func readTemplateFile(t *testing.T, rel string) string {
	t.Helper()
	b, err := os.ReadFile(filepath.Join(repoRoot, "templates/waymark", filepath.FromSlash(rel)))
	if err != nil {
		t.Fatal(err)
	}
	return string(b)
}

func TestAMissingAnchorFailsNamingTheFileAndLeavesNothing(t *testing.T) {
	for _, rel := range []string{
		targets.PackageJSON, targets.SiteConfig, targets.CairnConfig, targets.Wrangler,
		targets.Deploy, targets.SiteFacts, targets.GitignoreShipped,
	} {
		t.Run(rel, func(t *testing.T) {
			files := templateFiles(t)
			key := "waymark/" + rel
			if _, ok := files[key]; !ok {
				t.Fatalf("the template has no %s", rel)
			}
			files[key] = "nothing the substitutions anchor on\n"
			if rel == targets.GitignoreShipped {
				delete(files, key)
			}
			tpl := fetchOK(t, tarballOf(t, files))
			parent := t.TempDir()
			dir := filepath.Join(parent, "site")
			_, err := Scaffold(t.Context(), Config{Template: tpl, Site: testSite(), Commit: testCommit(), Dir: dir})
			if err == nil {
				t.Fatal("Scaffold succeeded on a template missing its anchor")
			}
			if !strings.Contains(err.Error(), rel) {
				t.Errorf("error %q does not name %s", err, rel)
			}
			left, rerr := os.ReadDir(parent)
			if rerr != nil {
				t.Fatal(rerr)
			}
			if len(left) != 0 {
				t.Errorf("a failed scaffold left %d entries in the parent folder", len(left))
			}
		})
	}
}

func TestEachAnchorOfAFileFailsWhenOnlyItIsMissing(t *testing.T) {
	// A file can carry several anchors; losing one of them, not the whole file, must fail too.
	tests := []struct {
		rel, drop string
	}{
		{targets.CairnConfig, "email: { from: 'cms@showcase.test' }"},
		{targets.CairnConfig, "export const publicOrigin = 'https://showcase.test'"},
		{targets.CairnConfig, "createGithubApp({ owner: 'showcase'"},
		{targets.Wrangler, `"bucket_name": "cairn-showcase-media"`},
		{targets.Wrangler, `"PUBLIC_ORIGIN"`},
		{targets.PackageJSON, `"@glw907/cairn-cms": `},
	}
	for _, tt := range tests {
		t.Run(tt.rel+" "+tt.drop, func(t *testing.T) {
			files := templateFiles(t)
			key := "waymark/" + tt.rel
			if !strings.Contains(files[key], tt.drop) {
				t.Fatalf("%s does not carry %q", tt.rel, tt.drop)
			}
			files[key] = strings.Replace(files[key], tt.drop, "REMOVED", 1)
			tpl := fetchOK(t, tarballOf(t, files))
			dir := filepath.Join(t.TempDir(), "site")
			_, err := Scaffold(t.Context(), Config{Template: tpl, Site: testSite(), Commit: testCommit(), Dir: dir})
			if err == nil || !strings.Contains(err.Error(), tt.rel) {
				t.Errorf("error = %v, want one naming %s", err, tt.rel)
			}
		})
	}
}

func TestSiteConfigRefusesADuplicateDescription(t *testing.T) {
	dir := t.TempDir()
	rel := targets.SiteConfig
	if err := os.MkdirAll(filepath.Dir(filepath.Join(dir, rel)), 0o755); err != nil {
		t.Fatal(err)
	}
	cfg := "siteName: Waymark\ndescription: one\nmenus: {}\ndescription: two\n"
	if err := os.WriteFile(filepath.Join(dir, rel), []byte(cfg), 0o644); err != nil {
		t.Fatal(err)
	}
	err := editSiteConfig(dir, testSite(), "")
	if err == nil || !strings.Contains(err.Error(), "description") || !strings.Contains(err.Error(), rel) {
		t.Errorf("error = %v, want a duplicate description error naming %s", err, rel)
	}
}

func TestScaffoldRefusesANonEmptyFolderAndBadValues(t *testing.T) {
	tpl := fetchOK(t, tarballOf(t, templateFiles(t)))
	full := t.TempDir()
	if err := os.WriteFile(filepath.Join(full, "keep"), []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	if _, err := Scaffold(t.Context(), Config{Template: tpl, Site: testSite(), Commit: testCommit(), Dir: full}); err == nil {
		t.Error("Scaffold wrote into a non-empty folder")
	}
	if got, _ := os.ReadFile(filepath.Join(full, "keep")); string(got) != "x" {
		t.Error("the existing file changed")
	}

	bad := testSite()
	bad.Owner = "o'); evil('"
	if _, err := Scaffold(t.Context(), Config{Template: tpl, Site: bad, Commit: testCommit(), Dir: filepath.Join(t.TempDir(), "s")}); err == nil {
		t.Error("Scaffold accepted an owner that breaks out of its literal")
	}

	empty := t.TempDir()
	if _, err := Scaffold(t.Context(), Config{Template: tpl, Site: testSite(), Commit: testCommit(), Dir: empty}); err != nil {
		t.Errorf("Scaffold into an empty folder: %v", err)
	}
}

func TestChildEnvDropsEveryCredential(t *testing.T) {
	in := []string{
		"PATH=/usr/bin", "HOME=/home/x",
		"CLOUDFLARE_API_TOKEN=a", "GH_TOKEN=b", "GITHUB_TOKEN=c",
		"CAIRN_CLOUDFLARE_TOKEN=d", "CAIRN_GITHUB_TOKEN=e", "cairn_other_token=f",
		"CAIRN_STATE_DIR=/tmp/state", "TOKEN_COUNT=3", "GIT_CONFIG_COUNT=1",
	}
	got := strings.Join(childEnv(in), " ")
	if want := "PATH=/usr/bin HOME=/home/x CAIRN_STATE_DIR=/tmp/state TOKEN_COUNT=3 GIT_CONFIG_COUNT=1"; got != want {
		t.Errorf("childEnv = %q, want %q", got, want)
	}
}

func TestTargetPathsAreNamedOnce(t *testing.T) {
	files, err := filepath.Glob("*.go")
	if err != nil {
		t.Fatal(err)
	}
	paths := []string{
		targets.PackageJSON, targets.SiteConfig, targets.CairnConfig, targets.Wrangler,
		targets.Deploy, targets.SiteFacts,
	}
	for _, f := range files {
		if f == "targets.go" || strings.HasSuffix(f, "_test.go") {
			continue
		}
		src, err := os.ReadFile(f)
		if err != nil {
			t.Fatal(err)
		}
		for _, p := range paths {
			if strings.Contains(string(src), `"`+p+`"`) {
				t.Errorf("%s spells the target path %q; it belongs in targets.go only", f, p)
			}
		}
	}
}

func TestQuoteIsAValidYAMLScalar(t *testing.T) {
	for _, s := range []string{"Plain", "Café: with #hash & 'quotes' \"too\"", "true", "123", "line\nbreak", "<tag>"} {
		var got struct{ V string }
		if err := yaml.Unmarshal([]byte("v: "+quote(s)+"\n"), &got); err != nil || got.V != s {
			t.Errorf("quote(%q) round-trips to %q (%v)", s, got.V, err)
		}
	}
}
