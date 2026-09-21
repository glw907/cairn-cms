package render

import (
	"strings"
	"testing"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/render/fixtures"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// statusInput builds the input a status line is read from, with one token found and one missing.
func statusInput() RenderInput {
	return RenderInput{
		View: ViewStatus, Width: Width100, Dark: true, Profile: ProfileNoColor,
		Status: goldenStatus(), Now: fixtures.Now(),
	}
}

// TestMissingCredentialNamesTheChecksItDisables is criterion 11: an absent CAIRN_GH_READ_TOKEN
// names itself and the checks its absence stopped, so the cost of the gap is on the screen
// rather than left to be inferred from a row of skips.
func TestMissingCredentialNamesTheChecksItDisables(t *testing.T) {
	in := statusInput()
	in.Status = StatusState{Credentials: []Credential{{
		Variable: "CAIRN_GH_READ_TOKEN",
		Disables: []string{"deploy", "engine", "publish-path"},
	}}}
	text := strings.Join(plainLines(in), "\n")
	if !strings.Contains(text, "CAIRN_GH_READ_TOKEN is not set") {
		t.Fatalf("the missing token is not named:\n%s", text)
	}
	for _, id := range []string{"deploy", "engine", "publish-path"} {
		if !strings.Contains(text, id) {
			t.Errorf("the line does not name %q among the checks the missing token disables:\n%s", id, text)
		}
	}
	if !strings.Contains(text, "could not run") {
		t.Errorf("the line does not say what the absence cost, in the section's own words:\n%s", text)
	}
}

// TestPresentCredentialNamesItsProviderAndExpiry is criterion 11's other two facts: where a
// found token resolved through, and the expiry date the provider publishes for it.
func TestPresentCredentialNamesItsProviderAndExpiry(t *testing.T) {
	text := strings.Join(plainLines(statusInput()), "\n")
	if !strings.Contains(text, "CAIRN_GH_READ_TOKEN read from the keyring") {
		t.Errorf("a found token does not name the store it resolved through:\n%s", text)
	}
	if !strings.Contains(text, "expires 2026-09-26, in 6 days") {
		t.Errorf("the token's own expiry date is missing:\n%s", text)
	}

	// The same three facts on the GitHub token, the one of the two whose provider publishes an
	// expiry at all.
	in := statusInput()
	in.Status = StatusState{Credentials: []Credential{{
		Variable: "CAIRN_CF_READ_TOKEN",
		Provider: providerEnvironment,
		Expires:  fixtures.Now().Add(6 * 24 * time.Hour),
	}}}
	want := "CAIRN_CF_READ_TOKEN read from the environment, expires 2026-09-26, in 6 days"
	if got := strings.Join(plainLines(in), "\n"); !strings.Contains(got, want) {
		t.Errorf("status line = %q, want it to carry %q", got, want)
	}
}

// TestDegradedIsStatedWhereNoMissingTokenIs is criterion 11's last fact. A named missing token
// already says a token the checks needed was not there; where the run is degraded and none was
// named, the state is still stated rather than dropped.
func TestDegradedIsStatedWhereNoMissingTokenIs(t *testing.T) {
	in := statusInput()
	in.Status = StatusState{Degraded: true}
	if text := strings.Join(plainLines(in), "\n"); !strings.Contains(text, statusDegraded) {
		t.Errorf("the degraded run says nothing about itself:\n%s", text)
	}

	in.Status = goldenStatus()
	in.Status.Degraded = true
	text := strings.Join(plainLines(in), "\n")
	if strings.Contains(text, statusDegraded) {
		t.Errorf("the degraded line repeats what the missing token's own line already said:\n%s", text)
	}
}

// TestCredentialDetailSitsOnTheCredsRow is criterion 11's placement rule, from the design
// brief's ruling 8: the credential and keyring detail leave the header block.
func TestCredentialDetailSitsOnTheCredsRow(t *testing.T) {
	in := input(fixtures.OneSick(), BodySingle, 100, ProfileNoColor, true, spine.VerdictCritical)
	in.Status = goldenStatus()
	frame := Render(in)
	for _, l := range frame.Header {
		if strings.Contains(stripANSI(l), "CAIRN_") {
			t.Errorf("the header block carries credential detail: %q", stripANSI(l))
		}
	}

	lines := frame.Body
	credsRow := -1
	for i, l := range lines {
		if strings.Contains(stripANSI(l), " "+credsRowID+" ") {
			credsRow = i
		}
	}
	if credsRow < 0 {
		t.Fatal("no creds row in the frame")
	}
	found := false
	for _, l := range lines[credsRow:min(credsRow+4, len(lines))] {
		if strings.Contains(stripANSI(l), "CAIRN_GH_READ_TOKEN") {
			found = true
		}
	}
	if !found {
		t.Errorf("the credential detail is not on the creds row:\n%s", strings.Join(lines, "\n"))
	}
}

// TestElapsedRidesTheCheckedLine is criterion 11's first fact: the run's own wall time, on the
// line that already says when the run happened, and absent where the caller measured none.
func TestElapsedRidesTheCheckedLine(t *testing.T) {
	in := input(fixtures.OneSick(), BodySingle, 100, ProfileNoColor, true, spine.VerdictCritical)
	in.Status = StatusState{Elapsed: 16300 * time.Millisecond}
	if text := strings.Join(plainLines(in), "\n"); !strings.Contains(text, "), in 16.3s") {
		t.Errorf("the checked line does not carry the run's own time:\n%s", text)
	}
	in.Status = StatusState{}
	if text := strings.Join(plainLines(in), "\n"); strings.Contains(text, ", in ") {
		t.Errorf("a run that measured no time still printed one:\n%s", text)
	}
	if got := latency(840 * time.Millisecond); got != "840ms" {
		t.Errorf("latency = %q, want whole milliseconds under a second", got)
	}
}

// TestNoDoThisNextDevice is criterion 12: the fix sits under the row it repairs and needs no
// heading, so the block the 2026-09-14 plan called `do this next` is not implemented at all.
func TestNoDoThisNextDevice(t *testing.T) {
	for _, body := range []Body{BodySingle, BodyMany, BodyPlain} {
		in := input(fixtures.OneSick(), body, 100, ProfileNoColor, true, spine.VerdictCritical)
		in.Status = goldenStatus()
		if text := strings.Join(plainLines(in), "\n"); strings.Contains(text, "do this next") {
			t.Errorf("body %v still carries a do-this-next device:\n%s", body, text)
		}
	}
}

// TestJoinWordsReadsAsProse pins the list the status line names its checks in: a reader takes it
// as a sentence, so the last item is joined with a word rather than another comma.
func TestJoinWordsReadsAsProse(t *testing.T) {
	for _, c := range []struct {
		in   []string
		want string
	}{
		{nil, ""},
		{[]string{"deploy"}, "deploy"},
		{[]string{"deploy", "engine"}, "deploy and engine"},
		{[]string{"deploy", "engine", "errors"}, "deploy, engine and errors"},
	} {
		if got := joinWords(c.in); got != c.want {
			t.Errorf("joinWords(%v) = %q, want %q", c.in, got, c.want)
		}
	}
}

// TestStatusSanitizesItsOwnFields drives a hostile variable name, provider and check id through
// the status line: a site's own data never reaches this line, but a keyring or an environment
// can still hand back a value nobody chose.
func TestStatusSanitizesItsOwnFields(t *testing.T) {
	in := statusInput()
	in.Status = StatusState{Credentials: []Credential{{
		Variable: "CAIRN_CF\u001b[2J_READ_TOKEN",
		Disables: []string{"dep\nloy"},
	}}}
	text := strings.Join(Render(in).Lines(), "\n")
	if strings.Contains(text, "\u001b[2J") || strings.Contains(text, "\n\n") {
		t.Errorf("an escape or an injected line reached the status line: %q", text)
	}
}
