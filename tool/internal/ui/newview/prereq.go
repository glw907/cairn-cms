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
// with the ways to put a domain on Cloudflare when the account has none, and the before-you-start
// section that explains the check when there is one.
func (g Grid) prereq(f setup.Failure) string {
	title := titleStopped
	var links []string
	if f.Reason == setup.ReasonNoZones {
		title = titleNoDomain
		links = append(links, g.link(linkRegister, urlRegister), g.link(linkMove, urlMove))
	}
	if a := setup.Anchor(f.Reason); a != "" {
		links = append(links, g.link(linkStart, urlStart+a))
	}
	return Frame(g.Title(title), g.parts(f, links...))
}

// parts is a failure's four parts on the label grid, Left only when the failure has it, and the
// links packed under What to do.
func (g Grid) parts(f setup.Failure, links ...string) string {
	var packed []string
	if len(links) > 0 {
		packed = g.Pack(g.ValueWidth(), links...)
	}
	ps := []string{g.part(partHappened, f.Happened), g.part(partDid, f.Did)}
	if f.Left != "" {
		ps = append(ps, g.part(partLeft, f.Left))
	}
	ps = append(ps, g.part(partDo, f.Do, packed...))
	if f.Detail != "" {
		ps = append(ps, g.Cell(partDetail, g.Styles.Muted, g.WrapValue(RoleMuted, f.Detail)...))
	}
	return strings.Join(ps, "\n")
}

// part is one failure part: a muted label, the text wrapped under column 20 with the permission
// name in bold, and any extra value lines after it.
func (g Grid) part(label, text string, extra ...string) string {
	return g.Cell(label, g.Styles.Muted, append(g.emphasized(g.Styles.Text, text, g.ValueWidth()), extra...)...)
}
