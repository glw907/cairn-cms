package render

// Glyphs is one tier's glyph tokens: the marks a body paints for a check's state, a fix, a rule,
// and a separator. render never chooses between tiers; render.Render reads RenderInput.ASCII
// (filled by profile.go's detector, see NewTheme's own doc comment) and a body picks the field it
// draws from.
type Glyphs struct {
	// Pass marks a check that passed.
	Pass string
	// Fail marks a check that failed at blocking severity.
	Fail string
	// FailWarn marks a check that failed at warning severity: outlined against the filled Fail
	// mark, and a distinct ASCII character, so the distinction never rides on colour alone.
	FailWarn string
	// Skip marks a check the sweep did not run, and stands in for an unrecognised state in a log
	// view.
	Skip string
	// Held marks a failure the operator acknowledged.
	Held string
	// Arrow leads a fix line.
	Arrow string
	// Rule is the rune a horizontal rule repeats.
	Rule string
	// Sep separates two facts on one line.
	Sep string
	// Ellipsis marks text a wrap or truncation cut short. It is three periods at both tiers,
	// never a tilde, which reads as vi filler and collides with Rule at a glance.
	Ellipsis string
}

// GlyphSet holds both glyph tiers a Theme carries. render.Render is the only caller that picks
// between them, by reading RenderInput.ASCII; Theme itself never re-derives a tier.
type GlyphSet struct {
	// Unicode is the default tier: one glyph per state, chosen 2026-09-20.
	Unicode Glyphs
	// ASCII is the degrade tier: cell-width-identical to Unicode (glyph_test.go's parity test),
	// for a terminal that cannot render the Unicode set.
	ASCII Glyphs
}

// unicodeGlyphs is the owner's pick of 2026-09-20 (measured in
// docs/design/render-reference/measurements.txt): pass U+25CF, fail U+25A0, fail-at-warning
// U+25A1, skip U+003F, held U+25CB, arrow U+2192, rule U+2500, separator U+00B7, ellipsis U+2026.
var unicodeGlyphs = Glyphs{
	Pass:     "●",
	Fail:     "■",
	FailWarn: "□",
	Skip:     "?",
	Held:     "○",
	Arrow:    "→",
	Rule:     "─",
	Sep:      "·",
	Ellipsis: "…",
}

// asciiGlyphs degrades every Unicode glyph to a cell-width-identical ASCII character. The
// ellipsis is three periods, never a tilde.
var asciiGlyphs = Glyphs{
	Pass:     "+",
	Fail:     "!",
	FailWarn: "*",
	Skip:     "?",
	Held:     "o",
	Arrow:    ">",
	Rule:     "-",
	Sep:      "-",
	Ellipsis: "...",
}

// ambiguousRunes names the East Asian Width=Ambiguous runes in unicodeGlyphs, measured in
// docs/design/render-reference/measurements.txt. Every glyph in the set is Ambiguous except '?'.
// width.go's Theme.Width widens these specific runes by one cell under the ASCII tier's width
// table, since Ambiguous=Wide is the one Unicode-tier combination ADR-0002 documents as
// unsupported (measurements.txt records 2980 over-width lines under it).
var ambiguousRunes = map[rune]bool{
	'●': true, // U+25CF pass
	'■': true, // U+25A0 fail
	'□': true, // U+25A1 fail-at-warning
	'○': true, // U+25CB held
	'→': true, // U+2192 arrow
	'─': true, // U+2500 rule
	'·': true, // U+00B7 separator
	'…': true, // U+2026 ellipsis
	// '?' U+003F is EAW=Narrow and is deliberately absent.
}
