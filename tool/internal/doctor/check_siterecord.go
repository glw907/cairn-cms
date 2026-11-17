package doctor

import (
	"github.com/glw907/cairn-cms/tool/v2/internal/cairnsite"
	"github.com/glw907/cairn-cms/tool/v2/internal/spine"
)

const (
	// detailSiteRecordPass is config.site-record's pass detail.
	detailSiteRecordPass = "cairn-site.json parses and follows the record's rules"
	// detailSiteRecordMissing is config.site-record's fail detail when the site's root holds no
	// record.
	detailSiteRecordMissing = "cairn-site.json: file not found at the site's root"
	// titleSiteRecordInvalid is config.site-record's failure title.
	titleSiteRecordInvalid = "Site record does not validate"
	// whySiteRecordInvalid is config.site-record's failure explanation.
	whySiteRecordInvalid = "cairn-site.json holds the site's kind, features, theme options, and deploy values. The site's build checks it and stops when it is missing or breaks the record's rules."
	// fixSiteRecordInvalid is config.site-record's remediation.
	fixSiteRecordInvalid = "Correct cairn-site.json at the site's root to match the field the detail names. The site record page lists every field and its allowed values."
	// docsSiteRecordInvalid is config.site-record's docs anchor.
	docsSiteRecordInvalid = "site-record.md#the-site-record"
)

// configSiteRecord checks cairn-site.json, the record the site's build reads. It raises no
// registry condition, so its failure text lives on the check. A record that is missing, is not
// JSON, or breaks the record's rules fails with the line cairnsite.Decode returns.
var configSiteRecord = Check{
	ID:        "config.site-record",
	PassTitle: "Site record validates",
	SkipTitle: "Site record",
	Condition: spine.ConditionNone,
	Text: spine.ConditionText{
		Severity:    spine.CriticalFailure,
		Title:       titleSiteRecordInvalid,
		Why:         whySiteRecordInvalid,
		Remediation: fixSiteRecordInvalid,
		DocsAnchor:  docsSiteRecordInvalid,
	},
	run: func(s Snapshot) Result {
		body, ok, err := s.readFile(cairnsite.File)
		if err != nil {
			return uncheckedResult(err.Error())
		}
		if !ok {
			return failResult(detailSiteRecordMissing)
		}
		if _, err := cairnsite.Decode(body); err != nil {
			return failResult(err.Error())
		}
		return passResult(detailSiteRecordPass)
	},
}
