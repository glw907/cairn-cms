package newview

// stopped is the final frame after Ctrl+C. kept reports that the run had already created
// something a rerun resumes from.
func (g Grid) stopped(kept bool) string {
	line := stopNothing
	if kept {
		line = stopResume
	}
	return Frame(g.Para(RoleText, line))
}
