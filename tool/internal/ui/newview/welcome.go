package newview

import "strings"

// welcome is the opening screen, ending on footer. A token run counts one approval fewer.
func (g Grid) welcome(token bool, footer string) string {
	lead, tail, _ := strings.Cut(welcomeRead, "<link>")
	text := g.Styles.Text.Render
	approve := welcomeApprove
	if token {
		approve = welcomeApproveToken
	}
	return Frame(
		g.Title(titleWelcome),
		g.Para(RoleText, welcomeCreates),
		g.Para(RoleText, approve),
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
