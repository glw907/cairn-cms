package render

import (
	"github.com/charmbracelet/colorprofile"
	"github.com/glw907/cairn-cms/tool/v2/internal/style"
)

// theme is the style.Theme a frame paints with, plus the one glyph tier it draws. Every ink a
// body spends resolves through the embedded style.Theme, so no file in this package writes a
// colour value, and every mark comes from marks, so no body chooses a tier.
type theme struct {
	style.Theme
	widths widthTable
	marks  style.Marks
}

// newTheme returns the theme for a background, a colour profile, and a glyph tier. Render is the
// one production caller: it reads RenderInput.ASCII, which style.Detect alone fills, so the tier
// never travels inside the profile.
func newTheme(dark bool, p colorprofile.Profile, ascii bool) theme {
	t := theme{
		Theme:  style.NewTheme(dark, p, ascii),
		widths: tableNarrow,
		marks:  style.MarksFor(ascii),
	}
	if ascii {
		t.widths = tableWide
	}
	return t
}
