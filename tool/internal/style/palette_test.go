package style

import (
	"fmt"
	"image/color"
	"math"
	"strconv"
	"strings"
	"testing"

	"charm.land/lipgloss/v2"
	"github.com/charmbracelet/colorprofile"
)

// groundHex is the reference ground, light and dark. It names no Role: the
// terminal owns the background, and this pair exists only so the contrast test can measure every
// role against it.
var groundHex = struct{ light, dark string }{"#fdfbf9", "#221f1a"}

// grounds256 adds the second ground of each branch to the reference pair: a cool grey light
// terminal and the Nord-dark ground the owner's kitty paints. The 256-colour rung is measured
// against both of each.
var grounds256 = struct{ light, dark []string }{
	light: []string{groundHex.light, "#E4E7EC"},
	dark:  []string{groundHex.dark, "#2e3440"},
}

// zeroStyleRender is lipgloss.NewStyle().Render("x"): GetForeground() on a style that never had
// Foreground called returns lipgloss.NoColor{}, a non-nil sentinel, so the "returns the zero
// style" tests compare rendered bytes instead of the getter.
var zeroStyleRender = lipgloss.NewStyle().Render("x")

func sameColor(a, b color.Color) bool {
	ar, ag, ab, aa := a.RGBA()
	br, bg, bb, ba := b.RGBA()
	return ar == br && ag == bg && ab == bb && aa == ba
}

// srgbToLinear converts one sRGB channel, 0-255, to its linear-light value, the WCAG 2.x formula
// (https://www.w3.org/TR/WCAG21/#dfn-relative-luminance).
func srgbToLinear(c uint8) float64 {
	v := float64(c) / 255
	if v <= 0.03928 {
		return v / 12.92
	}
	return math.Pow((v+0.055)/1.055, 2.4)
}

// relativeLuminance is WCAG's formula over three already-linearised channels.
func relativeLuminance(r, g, b uint8) float64 {
	return 0.2126*srgbToLinear(r) + 0.7152*srgbToLinear(g) + 0.0722*srgbToLinear(b)
}

// hexRGB parses a "#rrggbb" string into its three channels, failing the test on a malformed
// literal.
func hexRGB(t *testing.T, hex string) (r, g, b uint8) {
	t.Helper()
	if len(hex) != 7 || hex[0] != '#' {
		t.Fatalf("malformed hex literal %q", hex)
	}
	rv, err := strconv.ParseUint(hex[1:3], 16, 8)
	if err != nil {
		t.Fatal(err)
	}
	gv, err := strconv.ParseUint(hex[3:5], 16, 8)
	if err != nil {
		t.Fatal(err)
	}
	bv, err := strconv.ParseUint(hex[5:7], 16, 8)
	if err != nil {
		t.Fatal(err)
	}
	return uint8(rv), uint8(gv), uint8(bv)
}

// contrastRatio is WCAG's ratio of the lighter luminance to the darker, plus 0.05 on each
// side (https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio).
func contrastRatio(t *testing.T, hexA, hexB string) float64 {
	t.Helper()
	ra, ga, ba := hexRGB(t, hexA)
	rb, gb, bb := hexRGB(t, hexB)
	la, lb := relativeLuminance(ra, ga, ba), relativeLuminance(rb, gb, bb)
	if la < lb {
		la, lb = lb, la
	}
	return (la + 0.05) / (lb + 0.05)
}

// TestContrastAgainstGround: every text-bearing role clears 4.5:1 against its branch's reference
// ground. RoleRule is a decorative separator, not text, and is exempt. RoleText carries no ink of
// its own, so the terminal's foreground is the only ink it has and there is nothing to measure.
func TestContrastAgainstGround(t *testing.T) {
	roles := []Role{RoleInstallerText, RoleMuted, RoleSubtle, RoleOK, RoleFailing, RoleUnknown, RoleAccent}
	for _, role := range roles {
		v := warmStone[role]
		if got := contrastRatio(t, v.lightHex, groundHex.light); got < 4.5 {
			t.Errorf("role %d light contrast against ground = %.2f, want >= 4.5", role, got)
		}
		if got := contrastRatio(t, v.darkHex, groundHex.dark); got < 4.5 {
			t.Errorf("role %d dark contrast against ground = %.2f, want >= 4.5", role, got)
		}
	}
}

// xterm256Hex returns the "#rrggbb" of an xterm-256 colour index in the 6x6x6 cube or the grey
// ramp. Indices 0-15 are the terminal's own palette and carry no fixed value, so they fail the
// test.
func xterm256Hex(t *testing.T, code string) string {
	t.Helper()
	n, err := strconv.Atoi(code)
	if err != nil || n < 16 || n > 255 {
		t.Fatalf("xterm-256 code %q is outside the fixed range 16-255", code)
	}
	if n >= 232 {
		g := 8 + 10*(n-232)
		return fmt.Sprintf("#%02x%02x%02x", g, g, g)
	}
	levels := [6]int{0, 95, 135, 175, 215, 255}
	n -= 16
	return fmt.Sprintf("#%02x%02x%02x", levels[n/36], levels[n/6%6], levels[n%6])
}

// TestContrastAgainstGround256 holds the named 256-colour rung to the same 4.5:1 as the hex rung,
// against both grounds of each branch.
func TestContrastAgainstGround256(t *testing.T) {
	roles := []Role{RoleInstallerText, RoleMuted, RoleSubtle, RoleOK, RoleFailing, RoleUnknown, RoleAccent}
	for _, role := range roles {
		v := warmStone[role]
		for _, g := range grounds256.light {
			if got := contrastRatio(t, xterm256Hex(t, v.light256), g); got < 4.5 {
				t.Errorf("role %d light256 %s against %s = %.2f, want >= 4.5", role, v.light256, g, got)
			}
		}
		for _, g := range grounds256.dark {
			if got := contrastRatio(t, xterm256Hex(t, v.dark256), g); got < 4.5 {
				t.Errorf("role %d dark256 %s against %s = %.2f, want >= 4.5", role, v.dark256, g, got)
			}
		}
	}
}

// TestANSI16Slots pins the named slots per role. Every slot other than the rule's differs from
// slot 0 in both branches; only the rule may use slot 8, and it is exempt.
func TestANSI16Slots(t *testing.T) {
	want := map[Role]string{
		RoleSubtle:  "7",
		RoleOK:      "2",
		RoleFailing: "1",
		RoleUnknown: "3",
		RoleAccent:  "5",
		RoleRule:    "8",
	}
	for role, slot := range want {
		if got := warmStone[role].ansi16; got != slot {
			t.Errorf("role %d ANSI-16 slot = %q, want %q", role, got, slot)
		}
	}
	for role, v := range warmStone {
		if role == RoleRule {
			continue
		}
		if v.ansi16 == "0" {
			t.Errorf("role %d ANSI-16 slot is 0", role)
		}
		if v.ansi16 == "8" {
			t.Errorf("role %d claims slot 8, reserved for the rule alone", role)
		}
	}
}

// TestMutedNeverSlotOrFaint: muted carries no ANSI-16 slot and no SGR 2, so Theme.Style at
// ANSI-16 returns the zero style for it, never a Faint style.
func TestMutedNeverSlotOrFaint(t *testing.T) {
	if warmStone[RoleMuted].ansi16 != "" {
		t.Fatalf("RoleMuted carries ANSI-16 slot %q, want none (the terminal's default)", warmStone[RoleMuted].ansi16)
	}
	for _, dark := range []bool{true, false} {
		s := NewTheme(dark, colorprofile.ANSI, false).Style(RoleMuted)
		if s.GetFaint() {
			t.Error("Theme.Style(RoleMuted) at ANSI-16 sets Faint, want the zero style")
		}
		if got := s.Render("x"); got != zeroStyleRender {
			t.Errorf("Theme.Style(RoleMuted) at ANSI-16 renders %q, want the zero style's %q", got, zeroStyleRender)
		}
	}
}

// TestANSI256RungIsNamed: a 256-colour profile receives a distinct, named SGR rather than
// falling through to 24-bit truecolor.
func TestANSI256RungIsNamed(t *testing.T) {
	got256 := NewTheme(true, colorprofile.ANSI256, false).Style(RoleFailing).Render("x")
	gotTrue := NewTheme(true, colorprofile.TrueColor, false).Style(RoleFailing).Render("x")
	if got256 == gotTrue {
		t.Fatal("ANSI256 rendered the same bytes as TrueColor; the 256 rung is not named")
	}
}

// TestStyleZeroAtNoColor: every way out of Theme returns the zero style at every no-colour
// profile, so no reader of a pipe receives an escape byte. Strong and the sized and link forms
// are covered because bold and OSC 8 are escape sequences too.
func TestStyleZeroAtNoColor(t *testing.T) {
	for _, p := range []colorprofile.Profile{colorprofile.Unknown, colorprofile.NoTTY, colorprofile.ASCII} {
		th := NewTheme(true, p, false)
		ways := []struct {
			name  string
			style func(Role) lipgloss.Style
		}{
			{"Style", th.Style},
			{"Strong", th.Strong},
			{"SizedStrong", func(r Role) lipgloss.Style { return th.SizedStrong(r, 1) }},
			{"Link", func(r Role) lipgloss.Style { return th.Link(r, "https://example.test") }},
			{"DocLink", func(Role) lipgloss.Style { return th.DocLink("https://example.test") }},
		}
		for _, w := range ways {
			t.Run(p.String()+"/"+w.name, func(t *testing.T) {
				for role := RoleText; role <= RoleRule; role++ {
					if got := w.style(role).Render("x"); got != zeroStyleRender {
						t.Errorf("role %d renders %q, want the zero style's %q", role, got, zeroStyleRender)
					}
				}
			})
		}
	}
}

// TestNoColorPredicate pins which profiles count as no colour.
func TestNoColorPredicate(t *testing.T) {
	for p, want := range map[colorprofile.Profile]bool{
		colorprofile.Unknown:   true,
		colorprofile.NoTTY:     true,
		colorprofile.ASCII:     true,
		colorprofile.ANSI:      false,
		colorprofile.ANSI256:   false,
		colorprofile.TrueColor: false,
	} {
		if got := NoColor(p); got != want {
			t.Errorf("NoColor(%s) = %v, want %v", p, got, want)
		}
	}
}

// TestLinkCarriesURLWithColor: the link is an OSC 8 hyperlink at a colour profile.
func TestLinkCarriesURLWithColor(t *testing.T) {
	got := NewTheme(true, colorprofile.TrueColor, false).Link(RoleAccent, "https://example.test").Render("x")
	if !strings.Contains(got, "https://example.test") {
		t.Errorf("Link at TrueColor renders %q, want an OSC 8 sequence naming the URL", got)
	}
}

// TestDocLinkIsTextInkWithPlainUnderline: a documentation link keeps its OSC 8 target and takes
// the Text ink with a plain underline at every colour tier, and sets no underline colour.
func TestDocLinkIsTextInkWithPlainUnderline(t *testing.T) {
	const url = "https://example.test"
	for _, p := range []colorprofile.Profile{colorprofile.TrueColor, colorprofile.ANSI256, colorprofile.ANSI} {
		th := NewTheme(true, p, false)
		got := th.DocLink(url).Render("x")
		want := th.Link(RoleText, url).Underline(true).Render("x")
		if got != want {
			t.Errorf("DocLink at %v renders %q, want %q", p, got, want)
		}
		if !strings.Contains(got, url) || !strings.Contains(got, "\x1b[4") || strings.Contains(got, "58;") {
			t.Errorf("DocLink at %v renders %q, want the URL and a plain underline and no SGR 58", p, got)
		}
	}
}

// TestSizedPadsAndCuts is the construction the column bodies use: Style.Width(n).MaxWidth(n).
func TestSizedPadsAndCuts(t *testing.T) {
	s := NewTheme(true, colorprofile.TrueColor, false).Sized(RoleText, 10)
	if s.GetWidth() != 10 || s.GetMaxWidth() != 10 {
		t.Errorf("Sized(RoleText, 10) width/maxwidth = %d/%d, want 10/10", s.GetWidth(), s.GetMaxWidth())
	}
}

// TestColorResolvesWarmStoneForBothBackgrounds pins ten hexes of the table, light and dark, at
// TrueColor through Theme.Color, and Pair's agreement with it.
func TestColorResolvesWarmStoneForBothBackgrounds(t *testing.T) {
	tests := []struct {
		name string
		dark bool
		role Role
		want string
	}{
		{"light installer text", false, RoleInstallerText, "#28231d"},
		{"dark installer text", true, RoleInstallerText, "#eae7e3"},
		{"light muted", false, RoleMuted, "#615d57"},
		{"dark muted", true, RoleMuted, "#a8a49e"},
		{"light ok", false, RoleOK, "#197037"},
		{"dark ok", true, RoleOK, "#7ccd8e"},
		{"light failing", false, RoleFailing, "#b71824"},
		{"dark failing", true, RoleFailing, "#ff8e86"},
		{"light warn", false, RoleUnknown, "#915200"},
		{"dark accent", true, RoleAccent, "#9d84ec"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			th := NewTheme(tt.dark, colorprofile.TrueColor, false)
			if got := th.Color(tt.role); !sameColor(got, lipgloss.Color(tt.want)) {
				t.Errorf("Color = %v, want %s", got, tt.want)
			}
			if got := th.Style(tt.role).GetForeground(); !sameColor(got, lipgloss.Color(tt.want)) {
				t.Errorf("Style foreground = %v, want %s", got, tt.want)
			}
		})
	}
}

// TestTextCarriesNoInk: RoleText paints in the terminal's own foreground at every colour rung and
// on both grounds, so Style emits no foreground code and Strong emits bold alone.
func TestTextCarriesNoInk(t *testing.T) {
	for _, p := range []colorprofile.Profile{colorprofile.TrueColor, colorprofile.ANSI256, colorprofile.ANSI} {
		for _, dark := range []bool{true, false} {
			th := NewTheme(dark, p, false)
			if got := th.Style(RoleText).Render("x"); strings.Contains(got, "38;") || got != zeroStyleRender {
				t.Errorf("%v dark=%v: Style(RoleText) renders %q, want no foreground code", p, dark, got)
			}
			strong := th.Strong(RoleText)
			if got := strong.Render("x"); strings.Contains(got, "38;") || !strong.GetBold() {
				t.Errorf("%v dark=%v: Strong(RoleText) renders %q, want bold with no foreground code", p, dark, got)
			}
			if _, ok := th.Color(RoleText).(lipgloss.NoColor); !ok {
				t.Errorf("%v dark=%v: Color(RoleText) = %v, want NoColor", p, dark, th.Color(RoleText))
			}
		}
	}
}

// TestColorFallsBackToTheTerminalForeground: Color is NoColor where Style is the zero style.
func TestColorFallsBackToTheTerminalForeground(t *testing.T) {
	ansi := NewTheme(true, colorprofile.ANSI, false)
	if _, ok := ansi.Color(RoleText).(lipgloss.NoColor); !ok {
		t.Errorf("Color(RoleText) at ANSI-16 = %v, want NoColor (no slot)", ansi.Color(RoleText))
	}
	if _, ok := ansi.Color(RoleFailing).(lipgloss.NoColor); ok {
		t.Error("RoleFailing has ANSI-16 slot 1 and must keep a colour")
	}
	if _, ok := NewTheme(true, colorprofile.NoTTY, false).Color(RoleFailing).(lipgloss.NoColor); !ok {
		t.Error("Color at no colour must be NoColor")
	}
}
