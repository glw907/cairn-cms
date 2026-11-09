package newview

import (
	"fmt"
	"strings"
	"testing"

	tea "charm.land/bubbletea/v2"
	"github.com/charmbracelet/x/ansi"

	"github.com/glw907/cairn-cms/tool/v2/internal/setup"
)

// summaryModel is a root on the summary for fieldNotes in a window width by height, with the
// runner's reply channel.
func summaryModel(width, height int) (*Model, chan setup.SummaryEdit) {
	reply := make(chan setup.SummaryEdit, 1)
	m := New(testConfig(true, oneTheme))
	send(m, tea.WindowSizeMsg{Width: width, Height: height}, ConfirmSummaryMsg{Summary: fieldNotes, Reply: reply})
	return m, reply
}

func received(t *testing.T, reply chan setup.SummaryEdit) setup.SummaryEdit {
	t.Helper()
	select {
	case e := <-reply:
		return e
	default:
		t.Fatal("the summary sent the runner no rows")
	}
	return setup.SummaryEdit{}
}

func flat(m *Model) string { return strings.Join(strings.Fields(ansi.Strip(m.View().Content)), " ") }

func TestSummaryEditsReachTheRunner(t *testing.T) {
	m, reply := summaryModel(80, 30)
	send(m, letter('e'), tea.KeyPressMsg{Code: 'u', Mod: tea.ModCtrl})
	typeText(m, "owner@example.test")
	send(m, enter)
	editAddress(m, "Blog.fieldnotes.example.com")
	if got := flat(m); !strings.Contains(got, "Address blog.fieldnotes.example.com Sign-in email owner@example.test") {
		t.Errorf("the summary does not show the edited rows without their default reasons:\n%s", got)
	}
	send(m, enter)
	want := setup.SummaryEdit{OwnerEmail: "owner@example.test", Host: "blog.fieldnotes.example.com"}
	if got := received(t, reply); got != want {
		t.Fatalf("rows = %+v, want %+v", got, want)
	}

	// setup refuses the address and asks again: the address reopens with the owner's value and
	// the refusal, and the next Enter sends the rows again.
	send(m, ConfirmSummaryMsg{Summary: fieldNotes, Problem: setup.ProblemAddress, Reply: reply})
	if m.summary.editing != fieldAddress || m.summary.input.Value() != "blog.fieldnotes.example.com" {
		t.Errorf("after the refusal: editing %v with %q, want the address with the owner's value", m.summary.editing, m.summary.input.Value())
	}
	if got := flat(m); !strings.Contains(got, setup.ProblemAddress) {
		t.Errorf("the refusal is not under the address:\n%s", got)
	}
	editAddress(m, "news.fieldnotes.example.com")
	send(m, enter)
	if got := received(t, reply); got.Host != "news.fieldnotes.example.com" || got.OwnerEmail != "owner@example.test" {
		t.Errorf("second rows = %+v", got)
	}
}

func TestEscapeLeavesTheRowAsItWas(t *testing.T) {
	m, reply := summaryModel(80, 24)
	send(m, letter('e'))
	typeText(m, "x")
	send(m, esc, enter)
	if got := received(t, reply); got.OwnerEmail != fieldNotes.OwnerEmail || got.Host != fieldNotes.Zone {
		t.Errorf("rows after Esc = %+v, want the summary's own", got)
	}
}

func TestEmailProblemOpensTheEmail(t *testing.T) {
	m := New(testConfig(true, oneTheme))
	s := fieldNotes
	s.OwnerEmail = ""
	send(m, tea.WindowSizeMsg{Width: 80, Height: 24}, ConfirmSummaryMsg{Summary: s, Problem: setup.ProblemEmail})
	if m.summary.editing != fieldEmail {
		t.Fatalf("editing %v on an email problem, want the email", m.summary.editing)
	}
	if got := flat(m); !strings.Contains(got, setup.ProblemEmail) {
		t.Errorf("the email problem is not shown:\n%s", got)
	}
}

func TestEnterIsSentOnce(t *testing.T) {
	m, reply := summaryModel(80, 24)
	send(m, enter)
	received(t, reply)
	send(m, enter, letter('e'))
	select {
	case e := <-reply:
		t.Errorf("a second Enter sent %+v while setup checks the first", e)
	default:
	}
	if m.summary.editing != fieldNone {
		t.Error("an edit opened while setup checks the rows")
	}
}

func TestThemeRowNamesTheCatalogsOnlyTheme(t *testing.T) {
	m, _ := summaryModel(80, 24)
	ls := strings.Split(ansi.Strip(m.View().Content), "\n")
	for i, l := range ls {
		if column(l, labelTheme) != ColMargin {
			continue
		}
		if column(l, "Waymark") != ColValue {
			t.Errorf("theme row %q: the catalog's name is not at column %d", l, ColValue)
		}
		if column(ls[i+1], fieldNotes.ThemeDescription) != ColValue {
			t.Errorf("line under the theme %q: the description is not the reason at column %d", ls[i+1], ColValue)
		}
		return
	}
	t.Fatalf("no theme row:\n%s", strings.Join(ls, "\n"))
}

func TestReasonsShareAColumnOrAllGoUnder(t *testing.T) {
	g := testGrid(80)
	t.Run("every reason fits beside its value", func(t *testing.T) {
		out, _ := g.group([]row{
			{label: "Domain", value: "sam.dev", reason: "the only domain on your account"},
			{label: "Address", value: "blog.sam.dev"},
			{label: "Sign-in email", value: "sam@sam.dev", reason: "from your Cloudflare account"},
		})
		ls := strings.Split(out, "\n")
		if len(ls) != 3 {
			t.Fatalf("group is %d lines, want one per row:\n%s", len(ls), ansi.Strip(out))
		}
		// Two spaces past the longest value, blog.sam.dev, which starts at column 20.
		for _, i := range []int{0, 2} {
			if got := column(ls[i], "the only domain"); i == 0 && got != ColValue+12+2 {
				t.Errorf("domain reason at column %d, want %d", got, ColValue+14)
			}
			if got := column(ls[i], "from your"); i == 2 && got != ColValue+14 {
				t.Errorf("email reason at column %d, want %d", got, ColValue+14)
			}
		}
	})
	t.Run("one reason too long sends every reason under", func(t *testing.T) {
		out, _ := g.group([]row{
			{label: "Domain", value: "sam.dev", reason: "the only domain on your account"},
			{label: "Address", value: "blog.sam.dev", reason: strings.Repeat("a long reason ", 4)},
		})
		ls := strings.Split(ansi.Strip(out), "\n")
		if len(ls) != 4 || column(ls[1], "the only domain") != ColValue || column(ls[3], "a long") != ColValue {
			t.Errorf("reasons are not all under their values at column %d:\n%s", ColValue, strings.Join(ls, "\n"))
		}
	})
}

func TestCursorSitsAtTheEndOfTheEdit(t *testing.T) {
	m, _ := summaryModel(80, 24)
	if m.View().Cursor != nil {
		t.Error("a cursor shows with no edit open")
	}
	send(m, letter('e'))
	v := m.View()
	if v.Cursor == nil {
		t.Fatal("no cursor in the open edit")
	}
	line := strings.Split(ansi.Strip(v.Content), "\n")[v.Cursor.Y]
	if column(line, "> "+fieldNotes.OwnerEmail) != ColValue-2 {
		t.Errorf("cursor row %d is %q, not the email edit", v.Cursor.Y, line)
	}
	if want := ColValue + len(fieldNotes.OwnerEmail); v.Cursor.X != want {
		t.Errorf("cursor at column %d, want %d", v.Cursor.X, want)
	}
}

// TestSummaryFitsTheWindowOrSaysWhatItNeeds pins the summary's height: 24 rows at 80 columns,
// one more while the address edit's note shows, and 27 at 60 columns, where values and reasons wrap.
func TestSummaryFitsTheWindowOrSaysWhatItNeeds(t *testing.T) {
	for _, tt := range []struct {
		name          string
		width, height int
		keys          []tea.Msg
		need          int
	}{
		{"80x24", 80, 24, nil, 0},
		{"80x24 editing the email", 80, 24, []tea.Msg{letter('e')}, 0},
		{"80x24 editing the address", 80, 24, []tea.Msg{letter('a')}, 25},
		{"60x24", 60, 24, nil, 27},
	} {
		t.Run(tt.name, func(t *testing.T) {
			m, _ := summaryModel(tt.width, tt.height)
			send(m, tt.keys...)
			got := flat(m)
			small := strings.Contains(got, "This window is too small for setup.")
			if small != (tt.need > 0) {
				t.Fatalf("too-small screen shown = %v, want %v:\n%s", small, tt.need > 0, got)
			}
			if tt.need == 0 {
				return
			}
			if want := fmt.Sprintf("This step needs %d rows. This window has %d.", tt.need, tt.height); !strings.Contains(got, want) {
				t.Errorf("the too-small screen does not say %q:\n%s", want, got)
			}
			if m.View().Cursor != nil {
				t.Error("the too-small screen carries the edit's cursor")
			}
		})
	}
}
