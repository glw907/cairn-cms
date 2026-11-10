package newview

import "github.com/glw907/cairn-cms/tool/v2/internal/setup"

// failure is the final frame for a stop past the prerequisite checks: the title, the watch's
// steps with the failed one marked when the stop came in the watch, and the four parts. list is
// empty for a stop before the watch.
func (g Grid) failure(f setup.Failure, list string) string {
	title := titleStopped
	if f.Step == setup.StepFirstDeploy {
		title = titleDeployFails
	}
	var links []string
	if a := setup.Anchor(f.Reason); a != "" {
		links = append(links, g.link(linkStart, urlStart+a))
	}
	if f.Reason == setup.ReasonDeployFailed {
		links = append(links, g.link(linkWorkers, urlWorkers))
	}
	return Frame(g.Title(title), list, g.parts(f, links...))
}
