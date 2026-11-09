package setup

import (
	"encoding/json"
	"errors"
	"flag"
	"os"
	"reflect"
	"strings"
	"testing"
)

var update = flag.Bool("update", false, "rewrite the golden plan")

func TestDeriveNames(t *testing.T) {
	long := strings.Repeat("a", 70)
	tests := []struct {
		name   string
		site   string
		suffix int
		want   Names
		err    error
	}{
		{name: "empty", site: "", err: errNoSlug},
		{name: "punctuation only", site: "!!! ---", err: errNoSlug},
		{name: "non-Latin", site: "日本語", err: errNoSlug},
		{name: "bad suffix", site: "x", suffix: 1, err: errSuffix},
		{
			name: "accent is dropped", site: "Café",
			want: Names{"caf", "caf", "caf", "caf-auth", "caf-media", "cairn-caf", "./caf"},
		},
		{
			name: "runs collapse and trim", site: "  My  Site!! ",
			want: Names{"my-site", "my-site", "my-site", "my-site-auth", "my-site-media", "cairn-my-site", "./my-site"},
		},
		{
			name: "70 characters", site: long,
			want: Names{
				strings.Repeat("a", 57), strings.Repeat("a", 57), strings.Repeat("a", 57),
				strings.Repeat("a", 57) + "-auth", strings.Repeat("a", 57) + "-media",
				"cairn-" + strings.Repeat("a", 28), "./" + strings.Repeat("a", 57),
			},
		},
		{
			name: "app cut leaves no trailing dash", site: strings.Repeat("a", 27) + " bbb",
			want: Names{
				strings.Repeat("a", 27) + "-bbb", strings.Repeat("a", 27) + "-bbb", strings.Repeat("a", 27) + "-bbb",
				strings.Repeat("a", 27) + "-bbb-auth", strings.Repeat("a", 27) + "-bbb-media",
				"cairn-" + strings.Repeat("a", 27), "./" + strings.Repeat("a", 27) + "-bbb",
			},
		},
		{
			name: "taken name takes a suffix", site: "My Site", suffix: 2,
			want: Names{"my-site-2", "my-site-2", "my-site-2", "my-site-2-auth", "my-site-2-media", "cairn-my-site", "./my-site-2"},
		},
		{
			name: "suffix re-cuts a long base", site: long, suffix: 3,
			want: Names{
				strings.Repeat("a", 55) + "-3", strings.Repeat("a", 55) + "-3", strings.Repeat("a", 55) + "-3",
				strings.Repeat("a", 55) + "-3-auth", strings.Repeat("a", 55) + "-3-media",
				"cairn-" + strings.Repeat("a", 28), "./" + strings.Repeat("a", 55) + "-3",
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := deriveNames(tt.site, tt.suffix)
			if !errors.Is(err, tt.err) {
				t.Fatalf("err = %v, want %v", err, tt.err)
			}
			if got != tt.want {
				t.Errorf("got %+v\nwant %+v", got, tt.want)
			}
			if err == nil && len(got.Bucket) > 63 {
				t.Errorf("bucket %q is %d characters, over R2's 63", got.Bucket, len(got.Bucket))
			}
		})
	}
}

func TestAddresses(t *testing.T) {
	tests := []struct {
		name       string
		zone, host string
		want       []string
		err        error
	}{
		{"apex gets www", "example.com", "example.com", []string{"example.com", "www.example.com"}, nil},
		{"subdomain gets no www", "example.com", "blog.example.com", []string{"blog.example.com"}, nil},
		{"outside the zone", "example.com", "other.org", nil, errHost},
		{"lookalike suffix", "example.com", "badexample.com", nil, errHost},
		{"empty", "", "", nil, errHost},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := addresses(tt.zone, tt.host)
			if !errors.Is(err, tt.err) || !reflect.DeepEqual(got, tt.want) {
				t.Errorf("got %v, %v; want %v, %v", got, err, tt.want, tt.err)
			}
		})
	}
}

func fullAnswers() Answers {
	return Answers{
		SiteName:   "Café Nord",
		OwnerEmail: "owner@example.com",
		Posture:    Decline,
		Zone:       "example.com",
		Host:       "example.com",
		Suffix:     2,
	}
}

func TestPlanValidates(t *testing.T) {
	a := fullAnswers()
	a.OwnerEmail = " "
	if _, err := Plan(a); !errors.Is(err, errNoEmail) {
		t.Errorf("empty email: err = %v", err)
	}
	a = fullAnswers()
	a.Posture = "none"
	if _, err := Plan(a); !errors.Is(err, errPosture) {
		t.Errorf("posture none: err = %v", err)
	}
}

func TestPlanGolden(t *testing.T) {
	first, err := Plan(fullAnswers())
	if err != nil {
		t.Fatal(err)
	}
	got, err := json.MarshalIndent(first, "", "  ")
	if err != nil {
		t.Fatal(err)
	}
	got = append(got, '\n')

	second, err := Plan(fullAnswers())
	if err != nil {
		t.Fatal(err)
	}
	again, _ := json.MarshalIndent(second, "", "  ")
	if string(got) != string(again)+"\n" {
		t.Error("a second call with the same answers differs")
	}

	const path = "testdata/plan.golden.json"
	if *update {
		if err := os.MkdirAll("testdata", 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, got, 0o644); err != nil {
			t.Fatal(err)
		}
		return
	}
	want, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("%v; run `go test ./internal/setup -run TestPlanGolden -update` to cut it", err)
	}
	if string(got) != strings.ReplaceAll(string(want), "\r\n", "\n") {
		t.Errorf("plan differs from %s\n--- got ---\n%s\n--- want ---\n%s", path, got, want)
	}
}
