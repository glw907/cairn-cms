package render

import (
	"flag"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"

	"github.com/glw907/cairn-cms/tool/internal/health"
	"github.com/glw907/cairn-cms/tool/internal/render/fixtures"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// updateGolden regenerates every golden from the current renderer. `make -C tool golden` sets
// it; a reviewer reads the resulting diff as the frame's own change.
var updateGolden = flag.Bool("update", false, "rewrite the golden frames from this renderer")

// goldenCase is one frame cut and committed: a fixture, a body, a width, and a tier.
type goldenCase struct {
	name    string
	reports []health.Report
	body    Body
	width   int
	profile Profile
	ascii   bool
	verdict Verdict
}

// file returns the golden's own file name, which carries every input that changes its bytes.
func (c goldenCase) file() string {
	parts := []string{c.name, bodyName(c.body), "w" + strconv.Itoa(c.width), profileName(c.profile)}
	if c.ascii {
		parts = append(parts, "ascii")
	}
	return strings.Join(parts, "-") + ".txt"
}

// bodyName names a body for a golden's file name.
func bodyName(b Body) string {
	switch b {
	case BodyMany:
		return "many"
	case BodyPlain:
		return "plain"
	default:
		return "single"
	}
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

// verdictFor returns the verdict spine's own arithmetic settles for a fixture, so a golden's
// verdict word is the one the exit code would carry rather than one the test chose.
func verdictFor(reports []health.Report) Verdict {
	sites := make([]spine.SiteVerdicts, 0, len(reports))
	for _, r := range reports {
		vs := make(spine.SiteVerdicts, 0, len(r.Checks))
		for _, c := range r.Checks {
			vs = append(vs, spine.CheckVerdict{
				ID: c.ID, State: c.Outcome.State, Reason: c.Outcome.Reason, Acknowledged: c.Acknowledged,
			})
		}
		sites = append(sites, vs)
	}
	var listErrs []error
	if len(sites) == 0 {
		listErrs = append(listErrs, spine.ErrExpectSites)
	}
	return spine.ExitCode(sites, listErrs, 0)
}

// goldenCases is the committed corpus: every fixture through the single-site and plain bodies,
// plus the four widths that pin where the condition id sits and the two tiers that have to carry
// the frame with no hue at all.
func goldenCases() []goldenCase {
	var out []goldenCase
	for _, f := range fixtures.All() {
		v := verdictFor(f.Reports)
		out = append(out,
			goldenCase{f.Name, f.Reports, BodySingle, 100, ProfileTrueColor, false, v},
			goldenCase{f.Name, f.Reports, BodyPlain, 80, ProfileNoColor, true, v},
		)
	}
	sick := fixtures.OneSick()
	sickVerdict := verdictFor(sick)
	for _, width := range []int{60, 80, 120} {
		out = append(out, goldenCase{"one-sick", sick, BodySingle, width, ProfileTrueColor, false, sickVerdict})
	}
	out = append(out,
		goldenCase{"one-sick", sick, BodySingle, 100, ProfileANSI16, false, sickVerdict},
		goldenCase{"one-sick", sick, BodySingle, 100, ProfileNoColor, true, sickVerdict},
	)
	return out
}

// TestGolden cuts every committed frame from the real renderer and compares it to the file. The
// frames are the acceptance surface for this package, where the literal bytes are the value, so
// a change to any of them is a change a reviewer reads rather than one a summary hides.
func TestGolden(t *testing.T) {
	for _, c := range goldenCases() {
		t.Run(c.file(), func(t *testing.T) {
			got := strings.Join(Render(RenderInput{
				View:    ViewHealth,
				Body:    c.body,
				Width:   c.width,
				Dark:    true,
				Profile: c.profile,
				ASCII:   c.ascii,
				Reports: c.reports,
				Verdict: c.verdict,
				Now:     fixtures.Now(),
			}).Lines(), "\n") + "\n"

			path := filepath.Join("testdata", "golden", c.file())
			if *updateGolden {
				if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
					t.Fatal(err)
				}
				if err := os.WriteFile(path, []byte(got), 0o644); err != nil {
					t.Fatal(err)
				}
				return
			}
			want, err := os.ReadFile(path)
			if err != nil {
				t.Fatalf("%v; run `make -C tool golden` to cut it", err)
			}
			if got != string(want) {
				t.Errorf("frame differs from %s\n--- got ---\n%s\n--- want ---\n%s", path, got, want)
			}
		})
	}
}
