package doctor

import (
	"fmt"
	"path"
	"path/filepath"
	"slices"
	"strings"

	"github.com/glw907/cairn-cms/tool/internal/spine"
)

const (
	// skipConfigMigrationsNoAuthDB is config.migrations's skip detail: with no AUTH_DB binding
	// there is no auth store whose migrations could be missing.
	skipConfigMigrationsNoAuthDB = "no AUTH_DB binding declared, so no auth store migrations are expected"
	// uncheckedConfigMigrationsPackage is config.migrations's unchecked detail when the engine
	// package's migrations folder cannot be listed: it is absent, or a file: install's symlink
	// resolves outside the directory.
	uncheckedConfigMigrationsPackage = "the installed package's migrations folder could not be read, so the site's copies were not compared"
	// uncheckedConfigMigrationsEscapes is config.migrations's unchecked detail when
	// migrations_dir resolves outside the site directory.
	uncheckedConfigMigrationsEscapes = "AUTH_DB's migrations_dir points outside the site directory, so it was not read"
	// tmplConfigMigrationsMissing is config.migrations's fail detail template, filled with the
	// site's migrations directory and the joined missing file names.
	tmplConfigMigrationsMissing = "the migrations directory %s is missing %s from the package"
	// tmplConfigMigrationsPass is config.migrations's pass detail template, filled with the
	// site's migrations directory. A present file proves a copy, never an applied migration.
	tmplConfigMigrationsPass = "%s holds every required package migration; the files were copied, not proved applied"
)

// optInMigrations names the package migrations a site may leave out (roles, audit, and preview,
// per skills/cairn-extending-a-site/references/adopt-cairn.md). Every other .sql file the package
// ships is required, so a future migration is required by default and an opt-in one has to be
// named here.
var optInMigrations = []string{"0001_roles.sql", "0002_audit.sql", "0003_preview.sql"}

// configMigrations checks that the site's AUTH_DB migrations directory holds a copy of every
// required migration the installed package ships. It reads file names only, so a pass means the
// files were copied, not that wrangler applied them.
var configMigrations = Check{
	ID:        "config.migrations",
	PassTitle: "Auth store migrations are copied",
	SkipTitle: "Auth store migrations",
	Condition: spine.ConditionConfigMigrationsMissing,
	Run: func(s Snapshot) Result {
		wrangler, found, err := ReadWranglerConfig(s)
		if err != nil {
			return uncheckedResult(err.Error())
		}
		if !found {
			return skipResult(noWranglerFoundDetail)
		}
		if !wrangler.HasAuthDB {
			return skipResult(skipConfigMigrationsNoAuthDB)
		}

		siteDir := wrangler.AuthDBMigrationsDir
		if siteDir == "" {
			siteDir = "migrations" // wrangler's default when migrations_dir is absent
		}
		if filepath.IsAbs(siteDir) {
			return uncheckedResult(uncheckedConfigMigrationsEscapes)
		}
		siteDir = path.Clean(filepath.ToSlash(siteDir))

		packaged, ok, err := listUnder(s.Dir, "node_modules/"+cairnModule+"/migrations")
		if err != nil || !ok {
			return uncheckedResult(uncheckedConfigMigrationsPackage)
		}
		var required []string
		for _, name := range packaged {
			if strings.HasSuffix(name, ".sql") && !slices.Contains(optInMigrations, name) {
				required = append(required, name)
			}
		}

		have, _, err := listUnder(s.Dir, siteDir)
		if err != nil {
			return uncheckedResult(uncheckedConfigMigrationsEscapes)
		}
		var missing []string
		for _, name := range required {
			if !slices.Contains(have, name) {
				missing = append(missing, name)
			}
		}
		if len(missing) > 0 {
			return failResult(fmt.Sprintf(tmplConfigMigrationsMissing, siteDir, strings.Join(missing, ", ")))
		}
		return passResult(fmt.Sprintf(tmplConfigMigrationsPass, siteDir))
	},
}
