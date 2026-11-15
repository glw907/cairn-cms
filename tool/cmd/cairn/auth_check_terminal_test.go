package main

import (
	"strings"
	"testing"

	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
	"github.com/glw907/cairn-cms/tool/v2/internal/spine"
)

func checkTestRow(label, cred string, state spine.State, display string) checkRow {
	return checkRow{permission: permission{Label: label, Credential: cred}, verdict: spine.CheckVerdict{ID: label, State: state}, display: display}
}

// TestAuthCheckRowsAreOneTable holds that every permission row, whatever its label's length, is
// one inline row with the mark at cell 2, the label at cell 4, and the credential in a column that
// starts at the same cell on every row.
func TestAuthCheckRowsAreOneTable(t *testing.T) {
	rows := []checkRow{
		checkTestRow("Workers Scripts", varCFReadToken, spine.Failing, providers.ReasonForbidden.String()),
		checkTestRow("Cloudflare Workers Builds (read)", varCFReadToken, spine.OK, ""),
		checkTestRow("Zone", varGHReadToken, spine.OK, ""),
	}
	plain := plainOf(authCheckLines(trueColorView(), rows, spine.VerdictCritical, "my-site"))
	var cols []int
	for _, l := range plain {
		if !strings.HasPrefix(l, "  ■ ") && !strings.HasPrefix(l, "  ● ") {
			continue
		}
		for _, name := range []string{varCFReadToken, varGHReadToken} {
			if before, _, found := strings.Cut(l, name); found {
				if !strings.HasPrefix(before, "  ") || strings.TrimSpace(before) == "" || len([]rune(before)) < 6 {
					t.Errorf("row %q has no label and mark before its credential", l)
				}
				cols = append(cols, len([]rune(before)))
			}
		}
	}
	if len(cols) != 3 {
		t.Fatalf("found %d credential cells in %q, want 3", len(cols), plain)
	}
	for _, c := range cols {
		if c != cols[0] {
			t.Errorf("credential columns %v differ in %q, want one column", cols, plain)
		}
	}
	if !strings.Contains(strings.Join(plain, "\n"), "  ■ Workers Scripts ") || !strings.Contains(strings.Join(plain, "\n"), "  ● Cloudflare Workers Builds (read) ") {
		t.Errorf("a label stacked or lost its mark in %q", plain)
	}
}

// TestAuthCheckDetailIsProse holds that no machine reason token reaches the terminal as a detail.
func TestAuthCheckDetailIsProse(t *testing.T) {
	for _, r := range providers.Reasons() {
		rows := []checkRow{checkTestRow("Zone", varCFReadToken, spine.Unknown, r.String())}
		joined := strings.Join(plainOf(authCheckLines(trueColorView(), rows, spine.VerdictUnknown, "my-site")), "\n")
		if strings.Contains(joined, r.String()) {
			t.Errorf("reason %q printed its token in %q", r, joined)
		}
	}
	rows := []checkRow{checkTestRow("Zone", varCFReadToken, spine.Unknown, "unreachable")}
	joined := strings.Join(plainOf(authCheckLines(trueColorView(), rows, spine.VerdictUnknown, "my-site")), "\n")
	if strings.Contains(joined, "unreachable") || !strings.Contains(joined, "the provider could not be reached") {
		t.Errorf("unreachable row = %q, want the prose", joined)
	}
}

// TestAuthCheckCouldNotRunCarriesOneFix holds that several rows blocked by a missing credential
// share one fix line, and that a row waiting only for a site named draws none.
func TestAuthCheckCouldNotRunCarriesOneFix(t *testing.T) {
	missing := func(label string) checkRow {
		r := checkTestRow(label, varCFReadToken, spine.Unknown, "CAIRN_CF_READ_TOKEN is not set")
		r.verdict.Reason = spine.ReasonCredMissing
		return r
	}
	joined := strings.Join(plainOf(authCheckLines(trueColorView(), []checkRow{missing("Zone"), missing("Workers Scripts")}, spine.VerdictWarning, "")), "\n")
	if got := strings.Count(joined, "→ Run `cairn auth set` naming each missing token"); got != 1 {
		t.Errorf("fix drawn %d times in %q, want once", got, joined)
	}
	site := checkTestRow("Contents", varGHReadToken, spine.Unknown, authCheckSiteRequiredReason)
	site.verdict.Reason = spine.ReasonCredMissing
	if joined := strings.Join(plainOf(authCheckLines(trueColorView(), []checkRow{site}, spine.VerdictWarning, "")), "\n"); strings.Contains(joined, "→") {
		t.Errorf("a row waiting for a site drew a fix: %q", joined)
	}
}
