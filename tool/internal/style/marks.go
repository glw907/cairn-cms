package style

// Marks is one glyph tier: the marks a command paints for a state, a fix, a rule, a separator,
// and a wait. A caller picks a tier with MarksFor and never mixes the two in one frame.
type Marks struct {
	// Pass marks a check that passed.
	Pass string
	// Failing marks a check that failed at blocking severity.
	Failing string
	// FailingWarn marks a check that failed at warning severity: outlined against the filled
	// Failing mark, and a distinct ASCII character, so the distinction never rides on colour alone.
	FailingWarn string
	// CouldNotRun marks a check the sweep did not run, and stands in for an unrecognised state.
	CouldNotRun string
	// Held marks a failure the operator acknowledged.
	Held string
	// NotStarted marks a step that has not begun.
	NotStarted string
	// Warning marks a line that needs attention but is not a check result.
	Warning string
	// Fix leads a fix line.
	Fix string
	// Rule is the rune a horizontal rule repeats.
	Rule string
	// Sep separates two facts on one line.
	Sep string
	// Ellipsis marks text a wrap or truncation cut short: never a tilde, which reads as vi filler
	// and collides with Rule at a glance. Its two tiers differ in cell width.
	Ellipsis string
	// Spinner is the wait animation's frames, one rune per frame at the Unicode tier. At the ASCII
	// tier it is the single static frame "...", so a terminal that cannot repaint still shows one.
	Spinner string
}

// unicodeMarks is the Unicode tier. Every single-character mark is one cell under the narrow
// width table.
var unicodeMarks = Marks{
	Pass:        "●",
	Failing:     "■",
	FailingWarn: "□",
	CouldNotRun: "?",
	Held:        "◌",
	NotStarted:  "○",
	Warning:     "▲",
	Fix:         "→",
	Rule:        "─",
	Sep:         "·",
	Ellipsis:    "…",
	Spinner:     "⣾⣽⣻⢿⡿⣟⣯⣷",
}

// asciiMarks degrades each Unicode mark to ASCII. NotStarted stays "o", the same character as
// Held.
var asciiMarks = Marks{
	Pass:        "+",
	Failing:     "!",
	FailingWarn: "*",
	CouldNotRun: "?",
	Held:        "o",
	NotStarted:  "o",
	Warning:     "^",
	Fix:         ">",
	Rule:        "-",
	Sep:         "-",
	Ellipsis:    "...",
	Spinner:     "...",
}

// MarksFor returns the ASCII tier for a terminal that cannot show the Unicode marks, and the
// Unicode tier otherwise.
func MarksFor(ascii bool) Marks {
	if ascii {
		return asciiMarks
	}
	return unicodeMarks
}
