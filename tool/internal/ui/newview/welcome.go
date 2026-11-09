package newview

import "strings"

// welcome is the opening screen, ending on footer.
func (g Grid) welcome(footer string) string {
	lead, tail, _ := strings.Cut(welcomeRead, "<link>")
	text := g.Styles.Text.Render
	return Frame(
		g.Title(titleWelcome),
		g.Para(RoleText, welcomeCreates),
		g.Para(RoleText, welcomeApprove),
		g.Para(RoleText, welcomeNeed),
		margin+text(lead)+g.link(linkStart, urlStart)+text(tail),
		footer,
	)
}

// sshStop is the final frame for a session setup cannot open a browser from.
func (g Grid) sshStop() string {
	return Frame(
		g.Title(titleSSH),
		g.Para(RoleText, sshBody),
		g.Para(RoleMuted, nothingCreated),
	)
}

// link is muted text carrying url as a hyperlink, underlined where the terminal shows colour.
func (g Grid) link(text, url string) string {
	return g.Styles.Link(RoleMuted, url).Underline(!g.Styles.NoColor()).Render(text)
}
