package render

import (
	"math"
	"reflect"
	"strconv"
	"testing"

	"charm.land/lipgloss/v2"
)

// zeroStyleRender is lipgloss.NewStyle().Render("x"): GetForeground() on a style that never had
// Foreground called returns lipgloss.NoColor{}, a non-nil sentinel, not Go nil, so this package's
// "returns the zero style" tests compare rendered bytes instead of the getter.
var zeroStyleRender = lipgloss.NewStyle().Render("x")

// srgbToLinear converts one sRGB channel, 0-255, to its linear-light value, the WCAG 2.x formula
// (https://www.w3.org/TR/WCAG21/#dfn-relative-luminance). This is computed by hand rather than
// sourced from go-colorful: go-colorful is an indirect dependency (criterion 1), and promoting it
// to a direct require to borrow its luminance function would falsify criterion 1's "three new
// direct requires."
func srgbToLinear(c uint8) float64 {
	v := float64(c) / 255
	if v <= 0.03928 {
		return v / 12.92
	}
	return math.Pow((v+0.055)/1.055, 2.4)
}

// relativeLuminance is WCAG's own formula over three already-linearised channels.
func relativeLuminance(r, g, b uint8) float64 {
	return 0.2126*srgbToLinear(r) + 0.7152*srgbToLinear(g) + 0.0722*srgbToLinear(b)
}

// hexRGB parses a "#rrggbb" string into its three channels. t.Fatal on a malformed literal: every
// caller in this file passes a constant from warmStone or groundHex.
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

// contrastRatio is WCAG's own ratio of the lighter luminance to the darker, plus 0.05 on each
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

// TestContrastAgainstGround is criterion 7: every text-bearing role clears 4.5:1 against its own
// branch's reference ground. RoleRule is a decorative separator, not text (WCAG 1.4.3's 4.5:1
// applies to text; a rule is WCAG 1.4.11's non-text 3:1, which family.md's own review measured
// this table failing at 1.69:1/1.71:1 and criterion 5's ADR note accepts as a named risk), so it
// is exempt from this test the same way criterion 5 exempts it from the ANSI-16 slot-0 test.
func TestContrastAgainstGround(t *testing.T) {
	roles := []Role{RoleText, RoleMuted, RoleSubtle, RoleOK, RoleFailing, RoleUnknown, RoleAccent}
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

// TestANSI16Slots is criterion 5: the named slots per role, and the owner's override of muted and
// the folded acknowledged role (never slot 8, never SGR 2). Every role's slot other than the
// rule's differs from slot 0 in both branches; only the rule may use slot 8, and it is exempt.
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

// TestMutedNeverSlotOrFaint is criterion 5's owner override: muted, and by inheritance the folded
// acknowledged role (which is muted itself, per criterion 4), carries no ANSI-16 slot and no
// SGR 2. Theme.Style at ProfileANSI16 returns the zero style for it, never a Faint style.
func TestMutedNeverSlotOrFaint(t *testing.T) {
	if warmStone[RoleMuted].ansi16 != "" {
		t.Fatalf("RoleMuted carries ANSI-16 slot %q, want none (the terminal's own default)", warmStone[RoleMuted].ansi16)
	}
	zero := zeroStyleRender
	for _, dark := range []bool{true, false} {
		th := NewTheme(dark, ProfileANSI16)
		s := th.Style(RoleMuted)
		if s.GetFaint() {
			t.Error("Theme.Style(RoleMuted) at ProfileANSI16 sets Faint, want the zero style")
		}
		if got := s.Render("x"); got != zero {
			t.Errorf("Theme.Style(RoleMuted) at ProfileANSI16 renders %q, want the zero style's %q", got, zero)
		}
	}
}

// TestNewThemeSignature is criterion 9: NewTheme takes exactly a background and a colour profile,
// via reflection over its own func value, so a dispatch that widens the signature to carry the
// glyph tier fails here rather than in review.
func TestNewThemeSignature(t *testing.T) {
	typ := reflect.TypeOf(NewTheme)
	if typ.NumIn() != 2 {
		t.Fatalf("NewTheme takes %d parameters, want exactly 2", typ.NumIn())
	}
	if typ.In(0).Kind() != reflect.Bool {
		t.Errorf("NewTheme's first parameter is %s, want bool", typ.In(0))
	}
	if typ.In(1) != reflect.TypeOf(ProfileNoColor) {
		t.Errorf("NewTheme's second parameter is %s, want render.Profile", typ.In(1))
	}
}

// TestThemeGlyphSetExposesBothTiers is criterion 9's second test: Theme.GlyphSet carries both
// glyph tiers, so a body can select between them by reading RenderInput.ASCII without Theme
// itself ever choosing.
func TestThemeGlyphSetExposesBothTiers(t *testing.T) {
	th := NewTheme(true, ProfileTrueColor)
	if th.GlyphSet.Unicode.Pass != unicodeGlyphs.Pass {
		t.Error("Theme.GlyphSet.Unicode is not the Unicode tier")
	}
	if th.GlyphSet.ASCII.Pass != asciiGlyphs.Pass {
		t.Error("Theme.GlyphSet.ASCII is not the ASCII tier")
	}
}

// TestANSI256RungIsNamed is criterion 6: a 256-colour profile receives a distinct, named SGR
// rather than falling through to 24-bit truecolor.
func TestANSI256RungIsNamed(t *testing.T) {
	th256 := NewTheme(true, ProfileANSI256)
	thTrue := NewTheme(true, ProfileTrueColor)
	got256 := th256.Style(RoleFailing).Render("x")
	gotTrue := thTrue.Style(RoleFailing).Render("x")
	if got256 == gotTrue {
		t.Fatal("ProfileANSI256 rendered the same bytes as ProfileTrueColor; the 256 rung is not named")
	}
}

// TestStyleZeroAtNoColor is the rung's own rule: every way out of this file returns the zero
// style at ProfileNoColor, so a body leaning on colour alone fails visibly here rather than in
// production, and no reader of the plain body (a cron mail, a CI log, an agent) receives an
// escape byte. Strong and SizedStrong are covered because bold is an escape sequence too.
func TestStyleZeroAtNoColor(t *testing.T) {
	th := NewTheme(true, ProfileNoColor)
	ways := []struct {
		name  string
		style func(Role) lipgloss.Style
	}{
		{"Style", th.Style},
		{"Strong", th.Strong},
		{"SizedStrong", func(r Role) lipgloss.Style { return th.SizedStrong(r, 1) }},
	}
	for _, w := range ways {
		t.Run(w.name, func(t *testing.T) {
			for role := RoleText; role <= RoleRule; role++ {
				if got := w.style(role).Render("x"); got != zeroStyleRender {
					t.Errorf("role %d at ProfileNoColor renders %q, want the zero style's %q", role, got, zeroStyleRender)
				}
			}
		})
	}
}

// TestSizedPadsAndCuts is the construction go-conventions names for this package:
// Style.Width(n).MaxWidth(n).
func TestSizedPadsAndCuts(t *testing.T) {
	th := NewTheme(true, ProfileTrueColor)
	s := th.Sized(RoleText, 10)
	if s.GetWidth() != 10 || s.GetMaxWidth() != 10 {
		t.Errorf("Sized(RoleText, 10) width/maxwidth = %d/%d, want 10/10", s.GetWidth(), s.GetMaxWidth())
	}
}
