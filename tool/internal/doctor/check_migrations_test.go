package doctor

import (
	"maps"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"
)

// pkgMigrations is a package migrations folder as the check sees it: two required files and the
// three opt-in ones.
func pkgMigrations() map[string]string {
	pkg := "node_modules/@glw907/cairn-cms/migrations/"
	return map[string]string{
		pkg + "0000_auth.sql":        "--",
		pkg + "0001_roles.sql":       "--",
		pkg + "0002_audit.sql":       "--",
		pkg + "0003_preview.sql":     "--",
		pkg + "0004_login_nonce.sql": "--",
	}
}

func withPkg(files map[string]string) map[string]string {
	out := pkgMigrations()
	maps.Copy(out, files)
	return out
}

const authWrangler = `{"d1_databases": [{"binding": "AUTH_DB"}]}`

// TestConfigMigrations is table-driven over the states the check reports.
func TestConfigMigrations(t *testing.T) {
	tests := []struct {
		name       string
		files      map[string]string
		wantStatus Status
		wantDetail string
	}{
		{
			name:       "skip: no wrangler config",
			files:      pkgMigrations(),
			wantStatus: StatusSkip,
			wantDetail: noWranglerFoundDetail,
		},
		{
			name:       "skip: no AUTH_DB binding",
			files:      withPkg(map[string]string{"wrangler.jsonc": `{"d1_databases": [{"binding": "OTHER"}]}`}),
			wantStatus: StatusSkip,
			wantDetail: skipConfigMigrationsNoAuthDB,
		},
		{
			name:       "unchecked: wrangler.jsonc does not parse",
			files:      withPkg(map[string]string{"wrangler.jsonc": `{`}),
			wantStatus: StatusUnchecked,
			wantDetail: errWranglerJsoncParse.Error(),
		},
		{
			name:       "unchecked: package folder absent",
			files:      map[string]string{"wrangler.jsonc": authWrangler, "migrations/0000_auth.sql": "--"},
			wantStatus: StatusUnchecked,
			wantDetail: uncheckedConfigMigrationsPackage,
		},
		{
			name:       "unchecked: migrations_dir escapes the directory",
			files:      withPkg(map[string]string{"wrangler.jsonc": `{"d1_databases": [{"binding": "AUTH_DB", "migrations_dir": "../elsewhere"}]}`}),
			wantStatus: StatusUnchecked,
			wantDetail: uncheckedConfigMigrationsEscapes,
		},
		{
			name:       "fail: site folder absent names every required file",
			files:      withPkg(map[string]string{"wrangler.jsonc": authWrangler}),
			wantStatus: StatusFail,
			wantDetail: "the migrations directory migrations is missing 0000_auth.sql, 0004_login_nonce.sql from the package",
		},
		{
			name:       "fail: site folder empty names every required file",
			files:      withPkg(map[string]string{"wrangler.jsonc": authWrangler, "migrations/.gitkeep": ""}),
			wantStatus: StatusFail,
			wantDetail: "the migrations directory migrations is missing 0000_auth.sql, 0004_login_nonce.sql from the package",
		},
		{
			name: "fail: one required file missing",
			files: withPkg(map[string]string{
				"wrangler.jsonc":           authWrangler,
				"migrations/0000_auth.sql": "--",
			}),
			wantStatus: StatusFail,
			wantDetail: "the migrations directory migrations is missing 0004_login_nonce.sql from the package",
		},
		{
			name: "pass: opt-in files absent from the site",
			files: withPkg(map[string]string{
				"wrangler.jsonc":                  authWrangler,
				"migrations/0000_auth.sql":        "--",
				"migrations/0004_login_nonce.sql": "--",
			}),
			wantStatus: StatusPass,
			wantDetail: "migrations holds every required package migration; the files were copied, not proved applied",
		},
		{
			name: "pass: custom migrations_dir in jsonc",
			files: withPkg(map[string]string{
				"wrangler.jsonc":                     `{"d1_databases": [{"migrations_dir": "db/migrations", "binding": "AUTH_DB"}]}`,
				"db/migrations/0000_auth.sql":        "--",
				"db/migrations/0004_login_nonce.sql": "--",
			}),
			wantStatus: StatusPass,
			wantDetail: "db/migrations holds every required package migration; the files were copied, not proved applied",
		},
		{
			name: "fail: custom migrations_dir in toml, key before binding",
			files: withPkg(map[string]string{
				"wrangler.toml":            "[[d1_databases]]\nmigrations_dir = \"db/migrations\"\nbinding = \"AUTH_DB\"\n",
				"migrations/0000_auth.sql": "--",
			}),
			wantStatus: StatusFail,
			wantDetail: "the migrations directory db/migrations is missing 0000_auth.sql, 0004_login_nonce.sql from the package",
		},
		{
			name: "pass: custom migrations_dir in toml, key after binding",
			files: withPkg(map[string]string{
				"wrangler.toml":                      "[[d1_databases]]\nbinding = \"AUTH_DB\"\nmigrations_dir = \"db/migrations\"\n",
				"db/migrations/0000_auth.sql":        "--",
				"db/migrations/0004_login_nonce.sql": "--",
			}),
			wantStatus: StatusPass,
			wantDetail: "db/migrations holds every required package migration; the files were copied, not proved applied",
		},
		{
			name: "toml: another block's migrations_dir does not leak onto AUTH_DB",
			files: withPkg(map[string]string{
				"wrangler.toml":                   "[[d1_databases]]\nbinding = \"OTHER\"\nmigrations_dir = \"other\"\n\n[[d1_databases]]\nbinding = \"AUTH_DB\"\n",
				"migrations/0000_auth.sql":        "--",
				"migrations/0004_login_nonce.sql": "--",
			}),
			wantStatus: StatusPass,
			wantDetail: "migrations holds every required package migration; the files were copied, not proved applied",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := configMigrations.Run(snapshotWithFiles(t, tt.files))
			if result.Status != tt.wantStatus {
				t.Fatalf("Status = %v, want %v (detail %q)", result.Status, tt.wantStatus, result.Detail)
			}
			if result.Detail != tt.wantDetail {
				t.Errorf("Detail = %q, want %q", result.Detail, tt.wantDetail)
			}
		})
	}
}

// TestConfigMigrationsRequiresAFutureFileByDefault proves a package migration outside the opt-in
// list is required without anyone naming it.
func TestConfigMigrationsRequiresAFutureFileByDefault(t *testing.T) {
	files := withPkg(map[string]string{
		"wrangler.jsonc": authWrangler,
		"node_modules/@glw907/cairn-cms/migrations/0005_next.sql": "--",
		"migrations/0000_auth.sql":                                "--",
		"migrations/0004_login_nonce.sql":                         "--",
	})
	result := configMigrations.Run(snapshotWithFiles(t, files))
	if result.Status != StatusFail || !strings.Contains(result.Detail, "0005_next.sql") {
		t.Errorf("result = %v %q, want a fail naming 0005_next.sql", result.Status, result.Detail)
	}
}

// TestConfigMigrationsSymlinkedPackageIsUnchecked proves a file: install, whose package
// resolves outside the directory, reports unchecked rather than failing.
func TestConfigMigrationsSymlinkedPackageIsUnchecked(t *testing.T) {
	dir := buildSymlinkedNodeModulesDir(t)
	if err := os.WriteFile(filepath.Join(dir, "wrangler.jsonc"), []byte(authWrangler), 0o644); err != nil {
		t.Fatal(err)
	}
	result := configMigrations.Run(Snapshot{Dir: dir})
	if result.Status != StatusUnchecked || result.Detail != uncheckedConfigMigrationsPackage {
		t.Errorf("result = %v %q, want unchecked %q", result.Status, result.Detail, uncheckedConfigMigrationsPackage)
	}
}

// TestMigrationsConstantMatchesTheRepo reads the repo's real package and template migrations, so
// a renamed opt-in file or a new required file the template lacks fails here, not on a fresh
// site's first doctor run.
func TestMigrationsConstantMatchesTheRepo(t *testing.T) {
	pkg, err := os.ReadDir("../../../migrations")
	if err != nil {
		t.Fatalf("read package migrations: %v", err)
	}
	tmpl, err := os.ReadDir("../../../templates/waymark/migrations")
	if err != nil {
		t.Fatalf("read template migrations: %v", err)
	}
	var pkgNames, tmplNames []string
	for _, e := range pkg {
		pkgNames = append(pkgNames, e.Name())
	}
	for _, e := range tmpl {
		tmplNames = append(tmplNames, e.Name())
	}
	for _, name := range optInMigrations {
		if !slices.Contains(pkgNames, name) {
			t.Errorf("opt-in migration %s is not in the package's migrations folder", name)
		}
	}
	for _, name := range pkgNames {
		if !strings.HasSuffix(name, ".sql") || slices.Contains(optInMigrations, name) {
			continue
		}
		if !slices.Contains(tmplNames, name) {
			t.Errorf("required migration %s is missing from templates/waymark/migrations; a fresh site would warn", name)
		}
	}
}
