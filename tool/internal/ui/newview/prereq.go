package newview

import (
	"strings"

	"github.com/glw907/cairn-cms/tool/v2/internal/setup"
)

// prerequisite reports whether f stops setup in a check it runs before any provider write: the
// opening's checks on this computer and the checks of the Cloudflare account. The SSH stop is
// drawn by sshStop.
func prerequisite(f *setup.Failure) bool {
	if f == nil || f.Reason == setup.ReasonRemote {
		return false
	}
	return f.Step == setup.StepOpeningChecks || f.Step == setup.StepCloudflareChecks
}

// prereq is the final frame for a prerequisite failure: the failure's parts on the label grid,
// with the ways to put a domain on Cloudflare when the account has none.
func (g Grid) prereq(f setup.Failure) string {
	title := titleStopped
	var links []string
	if f.Reason == setup.ReasonNoZones {
		title = titleNoDomain
		links = g.Pack(g.ValueWidth(),
			g.link(linkRegister, urlRegister),
			g.link(linkMove, urlMove),
			g.link(linkStart, urlStart))
	}
	parts := []string{g.part(partHappened, f.Happened), g.part(partDid, f.Did)}
	if f.Left != "" {
		parts = append(parts, g.part(partLeft, f.Left))
	}
	parts = append(parts, g.part(partDo, f.Do, links...))
	return Frame(g.Title(title), strings.Join(parts, "\n"))
}

// part is one failure part: a muted label, the text wrapped under column 20, and any extra
// value lines after it.
func (g Grid) part(label, text string, extra ...string) string {
	return g.Cell(label, g.Styles.Muted, append(g.WrapValue(RoleText, text), extra...)...)
}
