package doctor

import (
	"fmt"
	"strings"

	"github.com/glw907/cairn-cms/tool/internal/spine"
)

const (
	// detailSiteConfigPass is config.site-config's pass detail, ported verbatim including its
	// scope note: the per-concept URL policy is not checkable from a directory preflight.
	detailSiteConfigPass = "parsed (per-concept URL policy lives on the adapter concepts, not checkable from the CLI)"
	// tmplSiteConfigNotFound is config.site-config's unchecked detail template, naming every
	// candidate path that was tried.
	tmplSiteConfigNotFound = "no site.config.yaml found (looked in %s)"
)

// ConfigSiteConfig ports checks-local.ts's configSiteConfig (:219-238)'s status arms alone: the
// parse itself is siteconfig.go's SiteConfig, per Task 4's ownership split. A found, parsing
// config with a non-empty siteName passes; a found file that fails the parse predicate fails;
// no file at any of the four candidate paths is unchecked, never a fail, since there was nothing
// to judge.
var ConfigSiteConfig = Check{
	ID:        "config.site-config",
	Condition: spine.ConditionConfigSiteConfigInvalid,
	Run: func(s Snapshot) Result {
		outcome, err := s.siteConfig()
		if err != nil {
			return uncheckedResult(err.Error())
		}
		switch outcome.Status {
		case siteConfigValid:
			return passResult(detailSiteConfigPass)
		case siteConfigInvalid:
			return failResult(spine.ConditionConfigSiteConfigInvalid, outcome.Reason)
		default: // siteConfigNotFound
			return uncheckedResult(fmt.Sprintf(tmplSiteConfigNotFound, strings.Join(siteConfigPaths(), ", ")))
		}
	},
}
