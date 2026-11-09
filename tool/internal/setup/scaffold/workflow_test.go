package scaffold

import (
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"

	"go.yaml.in/yaml/v3"

	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
)

// deploySecret is the repository secret the deploy workflow reads the Cloudflare token from. It
// is the name setup seals the deploy key under, so a rename there fails this test.
const deploySecret = providers.DeploySecretName

type workflow struct {
	On          map[string]any `yaml:"on"`
	Concurrency struct {
		Group            string `yaml:"group"`
		CancelInProgress bool   `yaml:"cancel-in-progress"`
	} `yaml:"concurrency"`
	Env  map[string]string `yaml:"env"`
	Jobs map[string]struct {
		Env   map[string]string `yaml:"env"`
		Steps []struct {
			Uses string            `yaml:"uses"`
			Run  string            `yaml:"run"`
			With map[string]any    `yaml:"with"`
			Env  map[string]string `yaml:"env"`
		} `yaml:"steps"`
	} `yaml:"jobs"`
}

func loadWorkflow(t *testing.T, dir, rel string) (workflow, string) {
	t.Helper()
	raw := readFile(t, dir, rel)
	var w workflow
	if err := yaml.Unmarshal([]byte(raw), &w); err != nil {
		t.Fatalf("%s does not parse: %v", rel, err)
	}
	return w, raw
}

func TestDeployWorkflowProperties(t *testing.T) {
	dir, _ := scaffoldOK(t, testSite())
	w, raw := loadWorkflow(t, dir, ".github/workflows/deploy.yml")

	if len(w.On) != 1 {
		t.Errorf("deploy.yml triggers = %v, want push only", w.On)
	}
	push, ok := w.On["push"].(map[string]any)
	if !ok {
		t.Fatalf("deploy.yml has no push trigger: %v", w.On)
	}
	if got := push["branches"]; !slices.Equal(toStrings(got), []string{"trunk"}) || len(push) != 1 {
		t.Errorf("push = %v, want branches [trunk] alone (the default branch)", push)
	}
	if w.Concurrency.Group != "deploy" || !w.Concurrency.CancelInProgress {
		t.Errorf("concurrency = %+v, want group deploy with cancel-in-progress", w.Concurrency)
	}
	if len(w.Jobs) != 1 {
		t.Fatalf("deploy.yml has %d jobs, want 1", len(w.Jobs))
	}
	var job = w.Jobs["deploy"]
	steps := job.Steps
	if len(steps) < 7 {
		t.Fatalf("deploy job has %d steps", len(steps))
	}
	if !strings.HasPrefix(steps[0].Uses, "actions/checkout@") {
		t.Errorf("step 1 = %q, want checkout", steps[0].Uses)
	}
	if !strings.HasPrefix(steps[1].Uses, "actions/setup-node@") || steps[1].With["node-version"] != 24 {
		t.Errorf("step 2 = %+v, want setup-node with node 24", steps[1])
	}
	runs := []string{"npm install", "npm run check", "npm run build",
		"npx wrangler d1 migrations apply AUTH_DB --remote", "npx wrangler deploy"}
	for i, want := range runs {
		if got := steps[2+i].Run; got != want {
			t.Errorf("step %d runs %q, want %q", 3+i, got, want)
		}
	}
	secret := "${{ secrets." + deploySecret + " }}"
	for i, s := range steps {
		wrangler := strings.HasPrefix(s.Run, "npx wrangler")
		got := s.Env[deploySecret]
		if wrangler && got != secret {
			t.Errorf("step %d (%s) env %s = %q, want %q", i+1, s.Run, deploySecret, got, secret)
		}
		if !wrangler && len(s.Env) > 0 {
			t.Errorf("step %d (%s) sets env %v; only the wrangler steps take the token", i+1, s.Run, s.Env)
		}
	}
	if len(w.Env) > 0 || len(job.Env) > 0 {
		t.Errorf("workflow or job env %v %v exposes the token to every step", w.Env, job.Env)
	}
	if n := strings.Count(raw, "secrets."); n != 2 {
		t.Errorf("deploy.yml reads a secret %d times, want 2 (one per wrangler step)", n)
	}
}

func TestCheckWorkflowRunsOnPullRequestOnly(t *testing.T) {
	dir, _ := scaffoldOK(t, testSite())
	w, _ := loadWorkflow(t, dir, ".github/workflows/check.yml")
	if len(w.On) != 1 {
		t.Errorf("check.yml triggers = %v, want pull_request only", w.On)
	}
	if _, ok := w.On["pull_request"]; !ok {
		t.Errorf("check.yml triggers = %v, want pull_request", w.On)
	}
}

func TestOverlayWorkflowsUseTheTemplatesActionPins(t *testing.T) {
	var pinned []string
	base, err := os.ReadFile(filepath.Join(repoRoot, "templates/waymark/.github/workflows/check.yml"))
	if err != nil {
		t.Fatal(err)
	}
	var tmpl workflow
	if err := yaml.Unmarshal(base, &tmpl); err != nil {
		t.Fatal(err)
	}
	for _, s := range tmpl.Jobs["check"].Steps {
		if s.Uses != "" {
			pinned = append(pinned, s.Uses)
		}
	}
	dir, _ := scaffoldOK(t, testSite())
	for _, rel := range []string{".github/workflows/deploy.yml", ".github/workflows/check.yml"} {
		w, _ := loadWorkflow(t, dir, rel)
		for _, job := range w.Jobs {
			for _, s := range job.Steps {
				if s.Uses != "" && !slices.Contains(pinned, s.Uses) {
					t.Errorf("%s uses %s, want one of %v", rel, s.Uses, pinned)
				}
			}
		}
	}
}

func toStrings(v any) []string {
	items, _ := v.([]any)
	out := make([]string, 0, len(items))
	for _, it := range items {
		s, _ := it.(string)
		out = append(out, s)
	}
	return out
}
