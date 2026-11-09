package scaffold

import (
	"bytes"
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
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
		SiteName    string `yaml:"siteName"`
		Description string `yaml:"description"`
	}
	siteConfig := readFile(t, dir, "src/theme/site.config.yaml")
	if err := yaml.Unmarshal([]byte(siteConfig), &cfg); err != nil {
		t.Fatalf("site.config.yaml does not parse: %v", err)
	}
	if cfg.SiteName != "My Café: The Site!" {
		t.Errorf("siteName = %q", cfg.SiteName)
	}
	// The home page shows the description under its heading, so a new site carries a neutral
	// line rather than the template's sample copy.
	if cfg.Description != "A new site built with cairn." || strings.Contains(siteConfig, "Trail reports") {
		t.Errorf("description = %q, want the neutral line and none of the template's", cfg.Description)
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
	first, err := Write(t.Context(), Config{Template: tpl, Site: early, Commit: testCommit(), Env: testEnv(), Dir: dir})
	if err != nil {
		t.Fatalf("Write: %v", err)
	}
	if got := readFile(t, dir, targets.Wrangler); strings.Contains(got, site.Worker) {
		t.Errorf("the first pass wrote the Worker settings:\n%s", got)
	}
	if got := readFile(t, dir, targets.PackageJSON); !strings.Contains(got, `"name": "my-caf-the-site"`) {
		t.Errorf("the first pass did not name the package:\n%s", got)
	}

	fin := FinalizeConfig{Dir: first.Dir, Base: first.CommitSHA, Site: site, Commit: testCommit(), Env: testEnv()}
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

	stray := FinalizeConfig{Dir: dir, Base: second, Site: site, Commit: testCommit(), Env: testEnv()}
	gitOut(t, dir, "reset", "--quiet", "--hard", first.CommitSHA)
	if _, err := Finalize(t.Context(), stray); err == nil {
		t.Error("Finalize accepted a folder whose HEAD is neither the base nor its child")
	}
}

func TestUpdateInstallationCommitsTheSettingsAlone(t *testing.T) {
	site := testSite()
	dir, res := scaffoldOK(t, site)
	base := res.CommitSHA
	moved := site
	moved.InstallationID = "848484"
	for _, tc := range []struct {
		site Site
		want bool
	}{{site, true}, {moved, false}} {
		if got, err := NamesApp(t.Context(), testEnv(), dir, base, tc.site); err != nil || got != tc.want {
			t.Errorf("NamesApp(installation %s) = %v, %v; want %v", tc.site.InstallationID, got, err, tc.want)
		}
	}

	pkg := filepath.Join(dir, targets.PackageJSON)
	if err := os.WriteFile(pkg, []byte(readFile(t, dir, targets.PackageJSON)+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "notes.txt"), []byte("mine\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	fin := FinalizeConfig{Dir: dir, Base: base, Site: moved, Commit: testCommit(), Env: testEnv()}
	first, err := UpdateInstallation(t.Context(), fin)
	if err != nil {
		t.Fatalf("UpdateInstallation: %v", err)
	}
	if got := gitOut(t, dir, "diff", "--name-only", "HEAD^", "HEAD"); got != targets.CairnConfig {
		t.Errorf("the commit touches %q, want only %s", got, targets.CairnConfig)
	}
	if got := gitOut(t, dir, "log", "-1", "--format=%s"); got != InstallationMessage {
		t.Errorf("the commit's message = %q", got)
	}
	if got, err := NamesApp(t.Context(), testEnv(), dir, first, moved); err != nil || !got {
		t.Errorf("the commit does not name installation %s: %v", moved.InstallationID, err)
	}
	if got := gitOut(t, dir, "status", "--porcelain"); !strings.Contains(got, "M "+targets.PackageJSON) || !strings.Contains(got, "?? notes.txt") {
		t.Errorf("the folder's other changes = %q, want them left in place", got)
	}

	later := moved
	later.InstallationID = "959595"
	fin.Site = later
	second, err := UpdateInstallation(t.Context(), fin)
	if err != nil {
		t.Fatalf("UpdateInstallation over its own commit: %v", err)
	}
	if gitOut(t, dir, "rev-parse", "HEAD^") != base {
		t.Error("a second update did not rewrite the settings commit on the base")
	}
	if got, err := NamesApp(t.Context(), testEnv(), dir, second, later); err != nil || !got {
		t.Errorf("the rewritten commit does not name installation %s: %v", later.InstallationID, err)
	}

	gitOut(t, dir, "reset", "--quiet", "--hard", res.CommitSHA+"^")
	if _, err := UpdateInstallation(t.Context(), fin); err == nil {
		t.Error("UpdateInstallation accepted a folder whose HEAD is neither the base nor its child")
	}
}

// TestNoHookRunsInTheSiteFolder pins that a hook planted in the site folder never runs when a
// later pass commits there.
func TestNoHookRunsInTheSiteFolder(t *testing.T) {
	tpl := fetchOK(t, tarballOf(t, templateFiles(t)))
	dir := filepath.Join(t.TempDir(), "site")
	site := testSite()
	early := site
	early.DatabaseID = ""
	first, err := Write(t.Context(), Config{Template: tpl, Site: early, Commit: testCommit(), Env: testEnv(), Dir: dir})
	if err != nil {
		t.Fatalf("Write: %v", err)
	}
	marker := filepath.Join(t.TempDir(), "hook-ran")
	for _, name := range []string{"pre-commit", "post-commit", "reference-transaction"} {
		hook := filepath.Join(dir, ".git", "hooks", name)
		if err := os.WriteFile(hook, []byte("#!/bin/sh\ntouch '"+marker+"'\n"), 0o755); err != nil {
			t.Fatal(err)
		}
	}
	second, err := Finalize(t.Context(), FinalizeConfig{Dir: first.Dir, Base: first.CommitSHA, Site: site, Commit: testCommit(), Env: testEnv()})
	if err != nil {
		t.Fatalf("Finalize: %v", err)
	}
	moved := site
	moved.InstallationID = "848484"
	if _, err := UpdateInstallation(t.Context(), FinalizeConfig{Dir: dir, Base: second, Site: moved, Commit: testCommit(), Env: testEnv()}); err != nil {
		t.Fatalf("UpdateInstallation: %v", err)
	}
	if _, err := os.Stat(marker); err == nil {
		t.Error("a hook in the site folder ran")
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
			_, err := Scaffold(t.Context(), Config{Template: tpl, Site: testSite(), Commit: testCommit(), Env: testEnv(), Dir: dir})
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
		{targets.SiteConfig, "description:"},
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
			_, err := Scaffold(t.Context(), Config{Template: tpl, Site: testSite(), Commit: testCommit(), Env: testEnv(), Dir: dir})
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
	if _, err := Scaffold(t.Context(), Config{Template: tpl, Site: testSite(), Commit: testCommit(), Env: testEnv(), Dir: full}); err == nil {
		t.Error("Scaffold wrote into a non-empty folder")
	}
	if got, _ := os.ReadFile(filepath.Join(full, "keep")); string(got) != "x" {
		t.Error("the existing file changed")
	}

	bad := testSite()
	bad.Owner = "o'); evil('"
	if _, err := Scaffold(t.Context(), Config{Template: tpl, Site: bad, Commit: testCommit(), Env: testEnv(), Dir: filepath.Join(t.TempDir(), "s")}); err == nil {
		t.Error("Scaffold accepted an owner that breaks out of its literal")
	}

	empty := t.TempDir()
	if _, err := Scaffold(t.Context(), Config{Template: tpl, Site: testSite(), Commit: testCommit(), Env: testEnv(), Dir: empty}); err != nil {
		t.Errorf("Scaffold into an empty folder: %v", err)
	}
}

// TestANilEnvironmentIsRefused pins that a scaffold given no environment stops before git runs
// and leaves nothing behind, rather than running git with no PATH, HOME, or proxy settings.
func TestANilEnvironmentIsRefused(t *testing.T) {
	tpl := fetchOK(t, tarballOf(t, templateFiles(t)))
	dir := filepath.Join(t.TempDir(), "site")
	if _, err := Scaffold(t.Context(), Config{Template: tpl, Site: testSite(), Commit: testCommit(), Dir: dir}); err == nil || !strings.Contains(err.Error(), "environment") {
		t.Errorf("Scaffold with a nil Env: err = %v, want a refusal naming the environment", err)
	}
	if _, err := os.Stat(dir); !os.IsNotExist(err) {
		t.Errorf("Scaffold with a nil Env left %s behind", dir)
	}
	early := testSite()
	early.DatabaseID = ""
	if _, err := Write(t.Context(), Config{Template: tpl, Site: early, Commit: testCommit(), Dir: dir}); err == nil {
		t.Error("Write accepted a nil Env")
	}
	if _, err := Finalize(t.Context(), FinalizeConfig{Dir: t.TempDir(), Base: "abc", Site: testSite(), Commit: testCommit()}); err == nil || !strings.Contains(err.Error(), "environment") {
		t.Errorf("Finalize with a nil Env: err = %v, want a refusal naming the environment", err)
	}
}

// TestGitStartsFromTheInjectedEnvironment pins that the scaffold's git reads Config.Env, not
// the process's environment: a time zone only Env carries sets the commit's offset.
func TestGitStartsFromTheInjectedEnvironment(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("Git for Windows does not promise to read a POSIX TZ")
	}
	t.Setenv("TZ", "UTC0")
	env := testEnv()
	env["TZ"] = "CRN-07"
	tpl := fetchOK(t, tarballOf(t, templateFiles(t)))
	dir := filepath.Join(t.TempDir(), "site")
	if _, err := Scaffold(t.Context(), Config{Template: tpl, Site: testSite(), Commit: testCommit(), Env: env, Dir: dir}); err != nil {
		t.Fatalf("Scaffold: %v", err)
	}
	if got := gitOut(t, dir, "log", "-1", "--format=%ai"); !strings.HasSuffix(got, "+0700") {
		t.Errorf("commit date = %q, want the +0700 offset of the TZ only Env carries", got)
	}
}

// TestAnInheritedTemplateRunsNothing reproduces a GIT_TEMPLATE_DIR in the environment setup
// starts from, naming a template whose config adds a clean filter and whose info/attributes
// applies it to every file. Plain git in that environment runs the filter on add; the scaffold's
// git must not.
func TestAnInheritedTemplateRunsNothing(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("the filter is a POSIX shell command")
	}
	marker := filepath.Join(t.TempDir(), "filter-ran")
	tmpl := t.TempDir()
	if err := os.MkdirAll(filepath.Join(tmpl, "info"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(tmpl, "config"), []byte("[filter \"cairn\"]\n\tclean = touch '"+marker+"'; cat\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(tmpl, "info", "attributes"), []byte("* filter=cairn\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	control := t.TempDir()
	if err := os.WriteFile(filepath.Join(control, "f"), []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	t.Setenv("GIT_TEMPLATE_DIR", tmpl)
	gitOut(t, control, "init", "--quiet")
	gitOut(t, control, "add", "--all")
	if _, err := os.Stat(marker); err != nil {
		t.Fatalf("plain git never ran the template's filter, so this test proves nothing: %v", err)
	}
	if err := os.Remove(marker); err != nil {
		t.Fatal(err)
	}

	tpl := fetchOK(t, tarballOf(t, templateFiles(t)))
	_, err := Scaffold(t.Context(), Config{Template: tpl, Site: testSite(), Commit: testCommit(), Env: testEnv(), Dir: filepath.Join(t.TempDir(), "site")})
	if _, serr := os.Stat(marker); serr == nil {
		t.Error("the scaffold's git ran the filter the inherited template names")
	}
	if err != nil {
		t.Errorf("Scaffold: %v", err)
	}
}

// TestGitInitCopiesNoTemplate pins that the scaffold's git init reads no template folder at
// all, git's default one included, whose hooks folder it would otherwise copy.
func TestGitInitCopiesNoTemplate(t *testing.T) {
	dir, _ := scaffoldOK(t, testSite())
	for _, name := range []string{"hooks", "description"} {
		if _, err := os.Stat(filepath.Join(dir, ".git", name)); err == nil {
			t.Errorf(".git/%s exists, want git init to copy no template", name)
		}
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
