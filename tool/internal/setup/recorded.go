package setup

import "github.com/glw907/cairn-cms/tool/v2/internal/record"

// DeriveNames returns the names setup derives for siteName and a taken-name suffix: 0 for none,
// 2 for "-2".
func DeriveNames(siteName string, suffix int) (Names, error) {
	return deriveNames(siteName, suffix)
}

// RecordedAnswers rebuilds, from a setup record, the Answers a run resuming it takes. The
// record keeps every answer, so a resume asks for none.
func RecordedAnswers(rec record.Record) Answers {
	return Answers{
		SiteName:   rec.Name,
		OwnerEmail: rec.Setup.OwnerEmail,
		Posture:    Posture(rec.Setup.AIPosture),
		Zone:       rec.Domain,
		Host:       rec.Setup.Address,
		Theme:      rec.Setup.ThemeID,
		AccountID:  rec.Cloudflare.AccountID,
		Suffix:     suffixOf(rec.Name, rec),
	}
}
