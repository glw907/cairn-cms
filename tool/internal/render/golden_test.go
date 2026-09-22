package render

import (
	"encoding/json"
	"flag"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/health"
	"github.com/glw907/cairn-cms/tool/internal/logs"
	"github.com/glw907/cairn-cms/tool/internal/render/fixtures"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// updateGolden regenerates every golden from the current renderer. `make -C tool golden` sets
// it; a reviewer reads the resulting diff as the frame's own change.
var updateGolden = flag.Bool("update", false, "rewrite the golden frames from this renderer")

// goldenDir is the committed corpus's own root.
const goldenDir = "testdata/golden"

// goldenRungs are the widths every golden is cut at: the named rung constants, so a frame is
// pinned at the floor, at the single-column threshold, and at each of the three rungs above it.
var goldenRungs = []int{WidthFloor, WidthNarrow, Width80, Width100, WidthCap}

// goldenCase is one frame cut and committed. The fields are the whole of what changes its bytes,
// which is what lets goldenName carry every one of them in the file name.
type goldenCase struct {
	// view names the surface, and is the corpus subdirectory.
	view string
	// fixture names the input, and is the file's own stem.
	fixture string
	// reports is the health sweep the frame draws, empty for the log view.
	reports []health.Report
	// entries is the log excerpt the frame draws, empty for a health view.
	entries []logs.Entry
	// body is the layout a health view composes into.
	body Body
	// width, profile, dark, and ascii are the four presentation axes.
	width   int
	profile Profile
	dark    bool
	ascii   bool
	// height is the row budget, 0 for the unbounded frame every CLI run asks for.
	height int
}

// goldenName is the sole source of a golden's path, for writing one and for recognising an
// orphan, so the corpus cannot drift into two naming schemes.
func goldenName(view, fixture string, width int, profile Profile, dark, ascii bool, height int) string {
	parts := []string{fixture, fmt.Sprintf("w%03d", width), profileName(profile), groundName(dark), tableName(ascii)}
	if height > 0 {
		parts = append(parts, fmt.Sprintf("h%03d", height))
	}
	return filepath.Join(goldenDir, view, strings.Join(parts, "_")+".txt")
}

// path returns c's own golden path.
func (c goldenCase) path() string {
	return goldenName(c.view, c.fixture, c.width, c.profile, c.dark, c.ascii, c.height)
}

// profileName names a colour profile for a golden's file name.
func profileName(p Profile) string {
	switch p {
	case ProfileANSI16:
		return "ansi16"
	case ProfileANSI256:
		return "ansi256"
	case ProfileTrueColor:
		return "truecolor"
	default:
		return "nocolor"
	}
}

// groundName names the background branch.
func groundName(dark bool) string {
	if dark {
		return "dark"
	}
	return "light"
}

// tableName names the width table a frame is measured under, which is the glyph tier: the
// Unicode tier assumes East Asian Ambiguous reads narrow, and a terminal set the other way takes
// the ASCII tier, which is exact on both tables (width.go).
func tableName(ascii bool) string {
	if ascii {
		return "ascii"
	}
	return "narrow"
}

// verdictFor returns the verdict spine's own arithmetic settles for a fixture, so a golden's
// verdict word is the one the exit code would carry rather than one the test chose.
func verdictFor(reports []health.Report) Verdict {
	sites := make([]spine.SiteVerdicts, 0, len(reports))
	for _, r := range reports {
		sites = append(sites, health.Verdicts(r))
	}
	var listErrs []error
	if len(sites) == 0 {
		listErrs = append(listErrs, spine.ErrExpectSites)
	}
	return spine.ExitCode(sites, listErrs, 0)
}

// sampleStatus is a plausible run state for the general render tests that exercise layout
// (width, marks, fix printing) rather than a fixture's own credential story: one token the run
// could not find, and one read from the keyring with an expiry, so the status line's three
// shapes are all pinned. It is not read by TestGolden, which cuts every frame against
// fixtureStatus's own per-fixture entry instead (criterion 22).
func sampleStatus() StatusState {
	return StatusState{
		Elapsed: 16300 * time.Millisecond,
		Credentials: []Credential{
			{Variable: "CAIRN_CF_READ_TOKEN", Disables: []string{"email", "errors"}},
			{
				Variable: "CAIRN_GH_READ_TOKEN",
				Provider: providerKeyring,
				Expires:  fixtures.Now().Add(6 * 24 * time.Hour),
			},
		},
	}
}

// fixtureStatus is each named fixture's own run state, matched to its own creds row rather than
// the one shared story every golden was cut against before this task (criterion 22). A
// many-sites fixture ("twelve-site") carries one Status for the whole run, since the process
// holds one set of provider tokens for every site it sweeps, and every site's own creds row
// (fillNine's default) agrees with it. Every entry carries one Credential per credential
// variable, present or not, because cmd/cairn's runStatus always appends both: a frame with
// fewer is one no run can produce. "empty" and "hostile" carry no creds row to agree with, so
// both tokens read from the keyring, the story their reports cannot contradict.
// TestFixtureStatusAgreesWithItsOwnCredsRow checks every entry against its fixture's own creds
// row and against that two-entry shape.
var fixtureStatus = map[string]StatusState{
	"empty": {
		Elapsed: 16300 * time.Millisecond,
		Credentials: []Credential{
			{Variable: "CAIRN_CF_READ_TOKEN", Provider: providerKeyring},
			{Variable: "CAIRN_GH_READ_TOKEN", Provider: providerKeyring},
		},
	},
	"hostile": {
		Elapsed: 16300 * time.Millisecond,
		Credentials: []Credential{
			{Variable: "CAIRN_CF_READ_TOKEN", Provider: providerKeyring},
			{Variable: "CAIRN_GH_READ_TOKEN", Provider: providerKeyring},
		},
	},
	"all-unknown": {
		Elapsed: 16300 * time.Millisecond,
		Credentials: []Credential{
			{Variable: "CAIRN_CF_READ_TOKEN", Disables: []string{"delegation", "https-forced", "email", "errors"}},
			{Variable: "CAIRN_GH_READ_TOKEN", Disables: []string{"deploy", "publish-path"}},
		},
	},
	// Offline's own creds row skipped for spine.ReasonOffline, not a missing credential: the
	// network was unreachable, which says nothing about whether either token is present, so
	// this Status shows both resolved rather than claiming one is unset with nothing to prove it.
	"offline": {
		Elapsed: 16300 * time.Millisecond,
		Credentials: []Credential{
			{Variable: "CAIRN_CF_READ_TOKEN", Provider: providerKeyring},
			{Variable: "CAIRN_GH_READ_TOKEN", Provider: providerKeyring},
		},
	},
	"one-sick": {
		Elapsed: 16300 * time.Millisecond,
		Credentials: []Credential{
			{Variable: "CAIRN_CF_READ_TOKEN", Disables: []string{"email", "errors"}},
			{
				Variable: "CAIRN_GH_READ_TOKEN",
				Provider: providerKeyring,
				Expires:  fixtures.Now().Add(6 * 24 * time.Hour),
			},
		},
	},
	// Healthy's own creds row passes, "Cloudflare and GitHub tokens read from the keyring".
	"healthy": {
		Elapsed: 16300 * time.Millisecond,
		Credentials: []Credential{
			{Variable: "CAIRN_CF_READ_TOKEN", Provider: providerKeyring},
			{Variable: "CAIRN_GH_READ_TOKEN", Provider: providerKeyring},
		},
	},
	// WarningOnly's own creds row passes the same way Healthy's does.
	"warning-only": {
		Elapsed: 16300 * time.Millisecond,
		Credentials: []Credential{
			{Variable: "CAIRN_CF_READ_TOKEN", Provider: providerKeyring},
			{Variable: "CAIRN_GH_READ_TOKEN", Provider: providerKeyring},
		},
	},
	// Degraded's own creds row rejects the Cloudflare token rather than reporting it missing, so
	// both tokens resolved; the rejection itself is the creds row's own failure, not a Status
	// concern.
	"degraded": {
		Elapsed: 16300 * time.Millisecond,
		Credentials: []Credential{
			{Variable: "CAIRN_CF_READ_TOKEN", Provider: providerKeyring},
			{Variable: "CAIRN_GH_READ_TOKEN", Provider: providerKeyring},
		},
	},
	// TwelveSites leans on fillNine's own default, which skips creds, email, and errors for a
	// missing Cloudflare token on every site the scenario does not override, and every site
	// shares the one run's provider tokens.
	"twelve-site": {
		Elapsed: 16300 * time.Millisecond,
		Credentials: []Credential{
			{Variable: "CAIRN_CF_READ_TOKEN", Disables: []string{"email", "errors"}},
			{
				Variable: "CAIRN_GH_READ_TOKEN",
				Provider: providerKeyring,
				Expires:  fixtures.Now().Add(6 * 24 * time.Hour),
			},
		},
	},
}

// statusFor returns fixture's own run state, or sampleStatus for a pseudo-fixture goldenCases
// builds outside the named corpus (the log view's "excerpt"), which draws no status line at all
// (render.go never calls statusLines for ViewLogs).
func statusFor(fixture string) StatusState {
	if s, ok := fixtureStatus[fixture]; ok {
		return s
	}
	return sampleStatus()
}

// goldenLogEntries is the log excerpt the log view's goldens are cut from. It lives here rather
// than in the fixtures package because that package's corpus is health reports and Task 20b-i
// owns its shape: this half adds no fixture to it.
func goldenLogEntries() []logs.Entry {
	// The zone is built rather than parsed. time.Parse resolves an offset that matches the
	// machine's own location to that location, so a parsed stamp formats its zone differently on
	// a workstation set to it than on a runner set to UTC, and the golden moves with the machine.
	at := func(minute int) time.Time {
		return time.Date(2026, 9, 20, 14, minute, 0, 0, time.FixedZone("AKDT", -8*3600))
	}
	field := func(key, value string) logs.Field {
		raw, err := json.Marshal(value)
		if err != nil {
			panic(err)
		}
		return logs.Field{Key: key, Value: raw}
	}
	return []logs.Entry{
		{At: at(28), Level: "info", Event: "entry.published", Fields: []logs.Field{
			field("editor", "dana@ecxc.ski"), field("sha", "c02e17f")}},
		{At: at(21), Level: "error", Event: "commit.failed", Fields: []logs.Field{
			field("editor", "kari@ecxc.ski"), field("status", "422"),
			field("reason", "the branch is behind main by 2 commits")}},
		{At: at(20), Level: "warn", Event: "publish.failed", Fields: []logs.Field{
			field("editor", "kari@ecxc.ski"), field("branch", "cairn/post/spring-relay")}},
		{At: at(14), Level: "info", Event: "auth.link.requested", Fields: []logs.Field{
			field("editor", "kari@ecxc.ski"), field("ttl", "15m")}},
	}
}

// goldenForeignLogEntries is a window of a Worker's own console lines, the excerpt a query
// against a public site returns most of: a 404 logger writes far more lines than the engine
// does, and none of them carries the event key only src/lib/log writes. The shapes are the ones
// packages/create-cairn-site/fixtures/cloudflare/observability-telemetry-query.mixed-lines.200.json
// recorded live, the escape-and-newline opening of the error line included, since that opening
// is what puts a space after the `message=` a naive render prints.
func goldenForeignLogEntries() []logs.Entry {
	at := func(second int) time.Time {
		return time.Date(2026, 9, 20, 14, 28, second, 0, time.FixedZone("AKDT", -8*3600))
	}
	message := func(text string) []logs.Field {
		raw, err := json.Marshal(text)
		if err != nil {
			panic(err)
		}
		return []logs.Field{{Key: "message", Value: raw}}
	}
	return []logs.Entry{
		{At: at(42), Level: "error", Fields: message("\n\x1b[1;31m[404] GET /wordpress/\x1b[0m")},
		{At: at(42), Level: "info", Fields: message("GET https://907.life/wordpress/?rest_route=%2Fwp%2Fv2%2Fusers")},
		{At: at(6), Level: "error", Fields: message("\n\x1b[1;31m[404] POST /blog/\x1b[0m")},
		{At: at(6), Level: "info", Fields: message("POST https://907.life/blog/?rest_route=%2Fbatch%2Fv1")},
	}
}

// goldenCases is the committed corpus, and the matrix is this table rather than a full cross
// product: four rungs of profile, ground, width table, fixture and view multiply to roughly four
// thousand six hundred files, which is a corpus nobody reads.
//
// One base axis sweeps everything: TrueColor, the dark ground, the narrow width table, every
// fixture through every view at every rung. Each other axis is pinned by one targeted frame on
// the one-sick fixture alone, which is the scenario carrying a failure, a hold, a skip and a
// pass at once, so a change to any of them shows up in it.
func goldenCases() []goldenCase {
	var out []goldenCase
	bodies := []struct {
		view string
		body Body
	}{{"single", BodySingle}, {"many", BodyMany}, {"plain", BodyPlain}}

	for _, f := range fixtures.All() {
		for _, b := range bodies {
			for _, width := range goldenRungs {
				out = append(out, goldenCase{
					view: b.view, fixture: f.Name, reports: f.Reports, body: b.body,
					width: width, profile: ProfileTrueColor, dark: true,
				})
			}
		}
	}
	for _, width := range goldenRungs {
		out = append(out, goldenCase{
			view: "logs", fixture: "excerpt", entries: goldenLogEntries(),
			width: width, profile: ProfileTrueColor, dark: true,
		})
		out = append(out, goldenCase{
			view: "logs", fixture: "foreign", entries: goldenForeignLogEntries(),
			width: width, profile: ProfileTrueColor, dark: true,
		})
	}

	base := goldenCase{
		view: "single", fixture: "one-sick", reports: fixtures.OneSick(), body: BodySingle,
		width: Width100, profile: ProfileTrueColor, dark: true,
	}
	for _, p := range []Profile{ProfileNoColor, ProfileANSI16, ProfileANSI256} {
		targeted := base
		targeted.profile = p
		out = append(out, targeted)
	}
	light := base
	light.dark = false
	ascii := base
	ascii.ascii = true
	tall := base
	tall.height = 24
	return append(out, light, ascii, tall)
}

// render cuts c's frame from the real renderer.
func (c goldenCase) render() string {
	view := ViewHealth
	if c.view == "logs" {
		view = ViewLogs
	}
	return strings.Join(Render(RenderInput{
		View:    view,
		Body:    c.body,
		Width:   c.width,
		Height:  c.height,
		Dark:    c.dark,
		Profile: c.profile,
		ASCII:   c.ascii,
		Reports: c.reports,
		Entries: c.entries,
		Site:    "ecxc.ski",
		Status:  statusFor(c.fixture),
		Verdict: verdictFor(c.reports),
		Now:     fixtures.Now(),
	}).Lines(), "\n") + "\n"
}

// pinEnvironment fixes every environment variable a frame could otherwise be moved by, so an
// inherited environment can never rewrite a golden. render reads none of them itself, which is
// what this makes provable rather than asserted.
func pinEnvironment(t *testing.T) {
	t.Helper()
	for name, value := range map[string]string{
		"TZ": "UTC", "LANG": "C", "LC_CTYPE": "C", "TERM": "dumb", "NO_COLOR": "",
	} {
		t.Setenv(name, value)
	}
}

// TestGolden cuts every committed frame from the real renderer and compares it to the file. The
// frames are the acceptance surface for this package, where the literal bytes are the value, so
// a change to any of them is a change a reviewer reads rather than one a summary hides.
func TestGolden(t *testing.T) {
	pinEnvironment(t)
	for _, c := range goldenCases() {
		t.Run(c.path(), func(t *testing.T) {
			got := c.render()
			if *updateGolden {
				if err := os.MkdirAll(filepath.Dir(c.path()), 0o755); err != nil {
					t.Fatal(err)
				}
				if err := os.WriteFile(c.path(), []byte(got), 0o644); err != nil {
					t.Fatal(err)
				}
				return
			}
			want, err := os.ReadFile(c.path())
			if err != nil {
				t.Fatalf("%v; run `make -C tool golden` to cut it", err)
			}
			// Line endings normalize before comparison, so a checkout that translated them
			// fails on the frame rather than on every line of it.
			if got != strings.ReplaceAll(string(want), "\r\n", "\n") {
				t.Errorf("frame differs from %s\n--- got ---\n%s\n--- want ---\n%s", c.path(), got, want)
			}
		})
	}
}

// TestGoldenVerdictIsTheLastLine holds the conductor's 2026-09-21 ruling on criterion 3 across
// the whole committed corpus: in a terminal body the verdict word is the last non-blank line at
// every width, and the tally goes above it when the block wraps. Reading the last line is how a
// truncated cron mail, a scrollback glance, and a screen reader all take the run's verdict.
func TestGoldenVerdictIsTheLastLine(t *testing.T) {
	for _, c := range goldenCases() {
		if c.view != "single" && c.view != "many" {
			continue
		}
		t.Run(c.path(), func(t *testing.T) {
			data, err := os.ReadFile(c.path())
			if err != nil {
				t.Fatalf("%v; run `make -C tool golden` to cut it", err)
			}
			var last string
			for line := range strings.SplitSeq(strings.ReplaceAll(string(data), "\r\n", "\n"), "\n") {
				if stripped := stripANSI(line); strings.TrimSpace(stripped) != "" {
					last = stripped
				}
			}
			if word := verdictFor(c.reports).String(); !strings.Contains(last, word) {
				t.Errorf("last non-blank line %q carries no %s", last, word)
			}
		})
	}
}

// TestGoldenPrintsNoRemedyTwice is the conductor's 2026-09-21 ruling on criterion 9: a fix
// sentence appears at most once in a frame, whatever the fleet's shape, with the sites it
// applies to named in the one entry. The many-site goldens are the corpus that carries the case,
// twelve sites of which three share a remedy.
func TestGoldenPrintsNoRemedyTwice(t *testing.T) {
	// Every fix sentence the shipped table carries, so a repeat is recognised by the sentence
	// itself rather than by a guess at what a fix line looks like.
	// FixLines carries each fix's sentence and, where it has one, its command. The sentences are
	// the ones that end in a period, which is the copy standard's own rule for them.
	var sentences []string
	for _, line := range health.FixLines() {
		if strings.HasSuffix(line, ".") {
			sentences = append(sentences, line)
		}
	}
	if len(sentences) == 0 {
		t.Fatal("the fix table is empty, so this test could not fail")
	}
	for _, c := range goldenCases() {
		if c.view != "many" {
			continue
		}
		t.Run(c.path(), func(t *testing.T) {
			data, err := os.ReadFile(c.path())
			if err != nil {
				t.Fatalf("%v; run `make -C tool golden` to cut it", err)
			}
			// A frame wraps a sentence across lines, so the comparison runs over the frame with
			// its escapes and its wrap whitespace collapsed into single spaces.
			flat := strings.Join(strings.Fields(stripANSI(strings.ReplaceAll(string(data), "\n", " "))), " ")
			for _, s := range sentences {
				if n := strings.Count(flat, s); n > 1 {
					t.Errorf("the remedy %q is printed %d times", s, n)
				}
			}
		})
	}
}

// TestGoldenCorpusHasNoOrphan walks the committed corpus against the same matrix table TestGolden
// cuts from, so a golden left behind by a renamed fixture or a dropped rung fails here rather
// than sitting in the tree forever looking like acceptance.
func TestGoldenCorpusHasNoOrphan(t *testing.T) {
	want := make([]string, 0, len(goldenCases()))
	for _, c := range goldenCases() {
		want = append(want, filepath.ToSlash(c.path()))
	}
	err := filepath.WalkDir(goldenDir, func(path string, d fs.DirEntry, err error) error {
		switch {
		case err != nil:
			return err
		case d.IsDir():
			return nil
		case !slices.Contains(want, filepath.ToSlash(path)):
			t.Errorf("%s is in the corpus and not in the matrix; delete it or add its case", path)
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

// TestGoldenCorpusIsSized holds the corpus to the size the matrix was chosen for. A sweep that
// grows past this is a sweep nobody reads, and one that shrinks under it has lost an axis.
func TestGoldenCorpusIsSized(t *testing.T) {
	if n := len(goldenCases()); n < 120 || n > 200 {
		t.Errorf("corpus is %d frames, outside the 120 to 200 the matrix targets", n)
	}
}

// credsRowOf returns r's own creds check, the row statusLines' credential story has to agree
// with.
func credsRowOf(r health.Report) (health.CheckResult, bool) {
	for _, c := range r.Checks {
		if c.ID == credsRowID {
			return c, true
		}
	}
	return health.CheckResult{}, false
}

// TestFixtureStatusAgreesWithItsOwnCredsRow covers criterion 23's second assertion: a fixture's
// own run state agrees with its creds row. A Status naming a token unset requires a creds row
// that skipped for a missing credential; a Status naming both tokens read from the keyring
// requires a creds row that did not skip for one. It also holds every entry to the shape
// cmd/cairn's runStatus builds, one Credential per credential variable in that order, so a
// frame cut from a status no run can produce fails here rather than shipping as a golden.
// Fixtures carrying no creds row prove nothing about the credentials themselves, so only the
// shape rule reaches them.
func TestFixtureStatusAgreesWithItsOwnCredsRow(t *testing.T) {
	// The order runStatus appends them in: the Cloudflare read token, then the GitHub one.
	wantVariables := []string{"CAIRN_CF_READ_TOKEN", "CAIRN_GH_READ_TOKEN"}

	for _, f := range fixtures.All() {
		status, ok := fixtureStatus[f.Name]
		if !ok {
			t.Fatalf("fixtureStatus carries no entry for %q", f.Name)
		}
		got := make([]string, 0, len(status.Credentials))
		for _, c := range status.Credentials {
			got = append(got, c.Variable)
		}
		if !slices.Equal(got, wantVariables) {
			t.Errorf("%s: status credentials = %v, want %v, the entries runStatus always appends", f.Name, got, wantVariables)
		}
		anyUnset := false
		for _, c := range status.Credentials {
			if c.Provider == "" {
				anyUnset = true
			}
		}
		bothRead := len(status.Credentials) == 2 && !anyUnset

		for _, r := range f.Reports {
			creds, found := credsRowOf(r)
			if !found {
				continue
			}
			skippedOrFailed := creds.Outcome.State != spine.OK
			skippedForMissing := creds.Outcome.Reason == spine.ReasonCredMissing
			if anyUnset && !skippedOrFailed {
				t.Errorf("%s/%s: status names a token unset but the creds row neither skipped nor failed", f.Name, r.Site)
			}
			if bothRead && skippedForMissing {
				t.Errorf("%s/%s: status names both tokens read from the keyring but the creds row skipped for a missing credential", f.Name, r.Site)
			}
		}
	}
}
