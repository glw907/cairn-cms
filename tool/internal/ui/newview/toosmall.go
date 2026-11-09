package newview

import (
	"fmt"
	"strings"
)

// The smallest window setup draws in. MinRows is the tallest interactive screen: the summary
// while the sign-in email is edited, a leading blank line included.
const (
	MinWidth = 50
	MinRows  = 21
)

// Fits reports whether a window of width by height cells holds every screen.
func Fits(width, height int) bool { return width >= MinWidth && height >= MinRows }

// TooSmall is the screen shown in a window under MinWidth columns or MinRows rows, in a window
// height rows tall. It names each size the window falls short of, what the step needs and what
// the window has.
func (g Grid) TooSmall(height int) string {
	var need []string
	if g.Width < MinWidth {
		need = append(need, fmt.Sprintf("Setup needs %d columns. This window has %d.", MinWidth, g.Width))
	}
	if height < MinRows {
		need = append(need, fmt.Sprintf("This step needs %d rows. This window has %d.", MinRows, height))
	}
	return Frame(
		g.lines(g.Styles.Title.Render, "This window is too small for setup.", g.ContentWidth(), margin),
		g.lines(g.Styles.Text.Render, strings.Join(need, " "), g.ContentWidth(), margin),
		g.lines(g.Styles.Muted.Render, "Make the window larger to continue.", g.ContentWidth(), margin),
	)
}
