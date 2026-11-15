package main

import (
	"errors"
	"strings"
	"testing"

	"github.com/charmbracelet/colorprofile"
	"github.com/charmbracelet/x/ansi"
	"github.com/glw907/cairn-cms/tool/v2/internal/record"
	"github.com/glw907/cairn-cms/tool/v2/internal/render"
	"github.com/glw907/cairn-cms/tool/v2/internal/spine"
	"github.com/glw907/cairn-cms/tool/v2/internal/store"
	"github.com/glw907/cairn-cms/tool/v2/internal/style"
)

// trueColorView is the view a dark TrueColor terminal at 80 columns draws with.
func trueColorView() view {
	return view{t: style.NewTheme(true, colorprofile.TrueColor, false), marks: style.MarksFor(false), width: 80}
}

// plainOf strips every escape sequence from lines, leaving the cells a reader counts.
func plainOf(lines []string) []string {
	out := make([]string, len(lines))
	for i, l := range lines {
		out[i] = ansi.Strip(l)
	}
	return out
}

// requireBoldTitle holds that line is a title: two cells of margin, then the bold escape, then
// the lowercase word, with no mark before it.
func requireBoldTitle(t *testing.T, line, word string) {
	t.Helper()
	if !strings.HasPrefix(line, "  \x1b[1m"+word) {
		t.Errorf("title line = %q, want a margin and then %q in bold", line, word)
	}
}

// requireMarkAt holds that the plain line carries mark in cell 2 and its name in cell 4, the
// grid every mark row sits on, and that the mark is painted.
func requireMarkAt(t *testing.T, raw, plain, mark, name string) {
	t.Helper()
	if !strings.HasPrefix(plain, "  "+mark+" "+name) {
		t.Errorf("row = %q, want the mark %q at cell 2 and %q at cell 4", plain, mark, name)
	}
	if !strings.Contains(raw, "\x1b[") {
		t.Errorf("row = %q carries no escape at TrueColor", raw)
	}
}

func TestSitesBlock(t *testing.T) {
	entries := []store.Entry{
		{ID: "my-site", Record: record.Record{Name: "Field Notes", Domain: "fieldnotes.example.org"}},
		{ID: "docs-site", Record: record.Record{Name: "Trail Docs", Domain: "docs.example.org"}},
	}
	raw := sitesLines(trueColorView(), entries)
	plain := plainOf(raw)
	requireBoldTitle(t, raw[0], "sites")
	if plain[0] != "  sites  2 known" {
		t.Errorf("title = %q, want the count beside it", plain[0])
	}
	if plain[1] != "" || !strings.HasPrefix(plain[2], "  site") || !strings.Contains(plain[3], "my-site") || !strings.Contains(plain[4], "docs.example.org") {
		t.Errorf("sites block = %q, want a blank line, a header, and a row per site", plain)
	}
	if empty := plainOf(sitesLines(trueColorView(), nil)); len(empty) != 1 || empty[0] != "  sites  0 known" {
		t.Errorf("empty registry = %q, want the title and count alone", empty)
	}
}

func TestCredentialBlock(t *testing.T) {
	rows := []credentialRow{
		{"CAIRN_CF_ACCOUNT_ID", "environment", true},
		{"CAIRN_GH_READ_TOKEN", "not set", false},
	}
	raw := credentialLines(trueColorView(), rows)
	plain := plainOf(raw)
	requireBoldTitle(t, raw[0], "credentials")
	requireMarkAt(t, raw[1], plain[1], "●", "CAIRN_CF_ACCOUNT_ID")
	if plain[2] != "    environment" {
		t.Errorf("detail = %q, want where the variable resolved under its long name", plain[2])
	}
	requireMarkAt(t, raw[3], plain[3], "?", "CAIRN_GH_READ_TOKEN")
}

func TestAdoptBlock(t *testing.T) {
	lines := []render.AdoptCandidate{
		{Worker: "trail-docs", Domain: "docs.example.org", Repo: "glw/trail-docs", Adoptable: true},
		{Worker: "old-landing", Repo: "glw/old-landing"},
	}
	raw := adoptLines(trueColorView(), lines)
	plain := plainOf(raw)
	requireBoldTitle(t, raw[0], "ready to adopt")
	if !strings.HasPrefix(plain[1], "  worker") || !strings.Contains(plain[2], "trail-docs") || plain[3] != "" {
		t.Errorf("first group = %q, want a header, its row, and a blank line", plain[:4])
	}
	requireBoldTitle(t, raw[4], "no custom domain") // Title lowercases every section title
	if !strings.Contains(plain[6], "old-landing") {
		t.Errorf("second group = %q, want the route-only Worker under its own title", plain[4:])
	}
	if got := adoptLines(trueColorView(), nil); len(got) != 0 {
		t.Errorf("nothing to list drew %q, want nothing", got)
	}
}

func TestReceiptBlock(t *testing.T) {
	raw := receiptLines(trueColorView(), "CAIRN_GH_READ_TOKEN stored in the keyring")
	plain := plainOf(raw)
	if len(plain) != 1 || plain[0] != "  ● CAIRN_GH_READ_TOKEN stored in the keyring" {
		t.Fatalf("receipt = %q, want the mark at cell 2 beside today's text", plain)
	}
	if !strings.Contains(raw[0], "\x1b[") {
		t.Errorf("receipt = %q carries no escape at TrueColor", raw[0])
	}
}

func TestAuthCheckReportBlock(t *testing.T) {
	rows := []checkRow{
		{permission: permission{Label: "Workers Scripts", Credential: varCFReadToken}, verdict: spine.CheckVerdict{ID: "a", State: spine.Failing}, display: "forbidden"},
		{permission: permission{Label: "Zone", Credential: varCFReadToken}, verdict: spine.CheckVerdict{ID: "b", State: spine.OK}},
		{permission: permission{Label: "Contents", Credential: varGHReadToken}, verdict: spine.CheckVerdict{ID: "c", State: spine.Unknown, Reason: spine.ReasonCredMissing}, display: "skipped"},
	}
	raw := authCheckLines(trueColorView(), rows, spine.VerdictCritical, "my-site")
	plain := plainOf(raw)
	if want := "  CRITICAL  my-site  1 failing · 1 could not run · 1 passing"; plain[0] != want {
		t.Errorf("opening verdict = %q, want %q", plain[0], want)
	}
	if plain[len(plain)-1] != plain[0] {
		t.Errorf("closing verdict = %q, want the opening line %q", plain[len(plain)-1], plain[0])
	}
	at := func(title string) int {
		for i, l := range plain {
			if l == "  "+title {
				return i
			}
		}
		t.Fatalf("no %q title in %q", title, plain)
		return 0
	}
	f, c, p := at("failing"), at("could not run"), at("passing")
	if f >= c || c >= p {
		t.Errorf("sections out of order in %q: failing %d, could not run %d, passing %d", plain, f, c, p)
	}
	requireBoldTitle(t, raw[f], "failing")
	requireMarkAt(t, raw[f+1], plain[f+1], "■", "Workers Scripts")
	if !strings.Contains(strings.Join(plain[f+1:c], "\n"), "→ Add the Workers Scripts permission to the token in") {
		t.Errorf("failing section = %q, want the fix on the arrow", plain[f+1:c])
	}
	requireMarkAt(t, raw[c+1], plain[c+1], "?", "Contents")
	requireMarkAt(t, raw[p+1], plain[p+1], "●", "Zone")
	if strings.Contains(strings.Join(plain[c:], "\n"), "→") {
		t.Errorf("a row that did not fail drew an arrow: %q", plain[c:])
	}
}

// TestListsPrintTodaysBytesOffATerminal pins what each list command and receipt writes when
// stdout is not a terminal, spelled out rather than rendered through the code under test.
func TestListsPrintTodaysBytesOffATerminal(t *testing.T) {
	d := credentialedDeps(t)
	d.transport = adoptRoutes("ridge-supply")
	d.keyring = fakeProvider{name: "keyring", values: map[string]string{"CAIRN_GH_READ_TOKEN": "x"}}
	deleter := &fakeDeleter{}
	d.keyringDeleter = deleter
	d.readPassword = fakeReadPassword("secret", nil)

	for _, c := range []struct {
		args []string
		want string
	}{
		{[]string{"auth", "set", "CAIRN_GH_READ_TOKEN"}, "CAIRN_GH_READ_TOKEN stored in the keyring\n"},
		{[]string{"auth", "unset", "CAIRN_GH_READ_TOKEN"}, "CAIRN_GH_READ_TOKEN deleted from the keyring\n"},
		{[]string{"auth", "list"}, "CAIRN_CF_ACCOUNT_ID\tenvironment\nCAIRN_CF_READ_TOKEN\tenvironment\nCAIRN_GH_READ_TOKEN\tenvironment\n"},
		{[]string{"adopt", "list"}, "\nridge-supply\t\t\n"},
	} {
		out, _, err := execTree(t, d, c.args...)
		if err != nil {
			t.Fatalf("%v: %v", c.args, err)
		}
		if out != c.want {
			t.Errorf("%v wrote %q, want %q", c.args, out, c.want)
		}
	}
}

func TestAuthCheckPrintsTodaysLinesOffATerminal(t *testing.T) {
	d := credentialedDeps(t)
	d.transport = routeRoundTripper{}
	d.exit = func(int) {}
	out, _, err := execTree(t, d, "auth", "check")
	if _, ok := errors.AsType[codedError](err); !ok {
		t.Fatalf("auth check: %v, want a coded exit", err)
	}
	for _, want := range []string{"Credentials:\n", "Permissions:\n", "  Workers Scripts "} {
		if !strings.Contains(out, want) {
			t.Errorf("stdout = %q, want today's line %q", out, want)
		}
	}
	if strings.ContainsAny(out, "\x1b●■") {
		t.Errorf("stdout = %q carries styling off a terminal", out)
	}
}

// TestAuthCheckRejectedTokenGetsNoPermissionFix pins that a Failing row whose reason is a
// rejected token carries no permission fix, while a plain missing-permission row does.
func TestAuthCheckRejectedTokenGetsNoPermissionFix(t *testing.T) {
	rows := []checkRow{
		{permission: permission{Label: "Workers Scripts", Credential: varCFReadToken}, verdict: spine.CheckVerdict{ID: "a", State: spine.Failing}, display: "unauthorized"},
		{permission: permission{Label: "Zone", Credential: varCFReadToken}, verdict: spine.CheckVerdict{ID: "b", State: spine.Failing}, display: "forbidden"},
	}
	joined := strings.Join(strings.Fields(strings.Join(plainOf(authCheckLines(trueColorView(), rows, spine.VerdictCritical, "my-site")), " ")), " ")
	if strings.Contains(joined, "Add the Workers Scripts permission") {
		t.Errorf("a rejected token got the permission fix in %q", joined)
	}
	if !strings.Contains(joined, "Add the Zone permission to the token in CAIRN_CF_READ_TOKEN, then run the command again.") {
		t.Errorf("a missing permission lost its fix in %q", joined)
	}
}
